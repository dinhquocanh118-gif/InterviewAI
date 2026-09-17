// One controller per mounted interview; media and event lifetime never outlive it.
export class RealtimeInterview {
  constructor({setup,messages=[],onMessages,onStatus,onError,onAudioBlocked,onStream}) {
    Object.assign(this,{setup,onMessages,onStatus,onError,onAudioBlocked,onStream});
    this.messages=messages.map(m=>m.pending?{...m,pending:false,transcriptionError:true,text:m.role==='user'?'[Lượt nói trước bị gián đoạn, chưa có bản chép lời]':m.text || '[Câu hỏi bị gián đoạn]'}:m);
    this.pending=new Map();this.unbound=[];this.items=new Map();this.seen=new Set();this.timers=new Set();this.status='offline';
  }
  state(status){this.status=status;if(!this.closed)this.onStatus(status);}
  publish(){if(!this.closed)this.onMessages([...this.messages]);}
  later(fn,ms){const id=setTimeout(()=>{this.timers.delete(id);if(!this.closed)fn();},ms);this.timers.add(id);return id;}
  send(event){if(this.dc?.readyState!=='open')throw new Error('Kết nối đã đóng. Hãy kết nối lại.');this.dc.send(JSON.stringify(event));}
  async connect(){
    this.state('connecting');this.controller=new AbortController();
    try {
      if(!navigator.mediaDevices?.getUserMedia || !globalThis.RTCPeerConnection)throw new Error('Cần trình duyệt hỗ trợ microphone và WebRTC qua HTTPS hoặc localhost.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      if(this.closed){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.track=stream.getAudioTracks()[0];this.track.enabled=false;
      this.onStream?.(stream);
      this.pc=new RTCPeerConnection();this.audio=new Audio();this.audio.autoplay=true;this.audio.muted=!!this.muted;
      this.pc.ontrack=e=>{this.audio.srcObject=e.streams[0];this.audio.play().catch(()=>this.onAudioBlocked?.());};
      this.pc.addTrack(this.track,stream);
      this.dc=this.pc.createDataChannel('oai-events');
      this.dc.onmessage=e=>{if(this.closed)return;try{this.event(JSON.parse(e.data));}catch{this.fail('Không xử lý được phản hồi Realtime. Hãy kết nối lại.');}};
      this.dc.onopen=()=>{
        if(this.closed)return;
        clearTimeout(this.connectTimer);
        // Restore actual conversation items so a resumed session retains context.
        const history=this.messages.filter(m=>!m.pending && !m.transcriptionError && m.text?.trim());
        for(const m of history)this.send({type:'conversation.item.create',item:{type:'message',role:m.role==='bot'?'assistant':'user',content:[{type:m.role==='bot'?'output_text':'input_text',text:m.text}]}});
        if(history.at(-1)?.role==='bot'){this.state('ready');}
        else {this.state('thinking');this.send({type:'response.create'});this.armResponseTimeout();}
      };
      this.dc.onclose=()=>{if(!this.closed)this.fail('Phiên giọng nói đã ngắt. Hội thoại được giữ để kết nối lại.');};
      this.pc.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(this.pc.connectionState))this.fail('Mất kết nối giọng nói. Hãy kết nối lại.');};
      this.connectTimer=this.later(()=>this.fail('Kết nối quá lâu. Hãy kiểm tra mạng và thử lại.'),30000);
      const offer=await this.pc.createOffer();await this.pc.setLocalDescription(offer);
      const response=await fetch('/api/rtc/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:offer.sdp,setup:this.setup}),signal:this.controller.signal});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error || 'Chưa kết nối được AI Realtime.');}
      const sdp=await response.text();if(!this.closed)await this.pc.setRemoteDescription({type:'answer',sdp});
    }catch(e){if(!this.closed)this.fail(e.name==='NotAllowedError'?'Microphone chưa được cho phép. Hãy cấp quyền rồi kết nối lại.':e.message);}
  }
  armResponseTimeout(){clearTimeout(this.responseTimer);this.responseTimer=this.later(()=>this.fail('AI phản hồi quá lâu. Hội thoại được giữ để kết nối lại.'),90000);}
  fail(message){if(this.closed)return;this.messages=this.messages.map(m=>m.pending?{...m,pending:false,transcriptionError:true,text:m.role==='user'?'[Lượt nói bị gián đoạn — chưa có bản chép lời]':m.text || '[Câu hỏi bị gián đoạn]'}:m);this.publish();this.onError(message);this.close();this.onStatus('offline');}
  event(e){
    if(e.type==='error'){this.fail('Phiên Realtime gặp lỗi. Hãy kết nối lại để tiếp tục.');return;}
    if(e.type==='response.created'){this.responseId=e.response?.id || crypto.randomUUID();this.botId=null;this.playing=false;this.state('thinking');this.armResponseTimeout();}
    if(e.type==='output_audio_buffer.started'){this.playing=true;this.state('speaking');}
    if(e.type==='response.output_audio_transcript.delta'){
      if(!this.botId){this.botId=e.item_id || this.responseId || crypto.randomUUID();this.messages.push({id:this.botId,role:'bot',text:'',at:Date.now(),pending:true});}
      this.messages=this.messages.map(m=>m.id===this.botId?{...m,text:m.text+(e.delta || '')}:m);this.publish();
    }
    if(['response.output_audio_transcript.done','response.output_text.done'].includes(e.type)){
      const id=e.item_id || this.botId || this.responseId;const content=e.transcript || e.text || '';
      if(content && !this.seen.has(id)){
        this.seen.add(id);const existing=this.messages.some(m=>m.id===id || m.id===this.botId);
        if(existing)this.messages=this.messages.map(m=>m.id===id || m.id===this.botId?{...m,id,text:content,pending:false}:m);
        else this.messages.push({id,role:'bot',text:content,at:Date.now()});this.publish();
      }
    }
    if(e.type==='input_audio_buffer.committed'){const id=this.unbound.shift();if(id)this.items.set(e.item_id,id);}
    if(['conversation.item.input_audio_transcription.completed','conversation.item.input_audio_transcription.failed'].includes(e.type)){
      const id=this.items.get(e.item_id);if(!id || !this.pending.has(id))return;
      clearTimeout(this.pending.get(id));this.pending.delete(id);
      const content=(e.transcript || '').trim();
      this.messages=this.messages.map(m=>m.id===id?{...m,text:content || '[Không nhận diện được lời nói — lượt này không được chấm]',pending:false,transcriptionError:!content}:m);
      this.publish();if(!content)this.onError('Một lượt nói chưa được nhận diện. Hãy nói lại; lượt thiếu nội dung sẽ không được chấm.');
    }
    if(e.type==='response.done'){
      if(e.response?.status==='failed'){this.fail('AI chưa trả lời được. Hãy kết nối lại.');return;}
      if(!this.playing){clearTimeout(this.responseTimer);this.state('ready');}
    }
    if(['output_audio_buffer.stopped','output_audio_buffer.cleared'].includes(e.type)){this.playing=false;clearTimeout(this.responseTimer);this.state('ready');}
  }
  start(){
    if(this.closed || this.status!=='ready' || this.pending.size)return;
    try{this.send({type:'input_audio_buffer.clear'});this.track.enabled=true;this.startedAt=Date.now();this.state('listening');this.recordTimer=this.later(()=>this.stop(),120000);}catch(e){this.fail(e.message);}
  }
  stop(cancel=false){
    if(this.closed || this.status!=='listening')return;
    this.track.enabled=false;clearTimeout(this.recordTimer);
    try{
      if(cancel || Date.now()-this.startedAt<250){this.send({type:'input_audio_buffer.clear'});this.state('ready');return;}
      const id=crypto.randomUUID();this.unbound.push(id);
      this.messages.push({id,role:'user',text:'Đang chuyển giọng nói thành văn bản…',pending:true,at:Date.now(),speechDurationSeconds:(Date.now()-this.startedAt)/1000});
      this.pending.set(id,this.later(()=>{
        this.pending.delete(id);this.messages=this.messages.map(m=>m.id===id?{...m,pending:false,transcriptionError:true,text:'[Không nhận được bản chép lời — lượt này không được chấm]'}:m);this.publish();
        this.onError('Chưa nhận được bản chép lời của một lượt nói. Hãy nói lại để có đủ nội dung đánh giá.');
      },20000));
      this.publish();this.state('thinking');this.send({type:'input_audio_buffer.commit'});this.send({type:'response.create'});this.armResponseTimeout();
    }catch(e){this.fail(e.message);}
  }
  setMuted(value){this.muted=value;if(this.audio)this.audio.muted=value;}
  close(){
    this.closed=true;this.controller?.abort();for(const id of this.timers)clearTimeout(id);this.timers.clear();
    if(this.track)this.track.enabled=false;this.stream?.getTracks().forEach(t=>t.stop());
    this.onStream?.(null);
    if(this.dc){this.dc.onmessage=this.dc.onopen=this.dc.onclose=null;this.dc.close();}
    if(this.pc){this.pc.ontrack=this.pc.onconnectionstatechange=null;this.pc.close();}
    if(this.audio){this.audio.pause();this.audio.srcObject=null;}
  }
}
