export const answer='Tôi xây dựng giao diện React cho dự án quản lý kho, giảm 20% thời gian nhập liệu sau khi thử nghiệm với 10 người dùng.';
export const evaluation={scores:{content:8,communication:7,fit:8,structure:9},summary:'Câu trả lời có dự án cụ thể và kết quả đo lường được.',strengths:['Nêu được kết quả định lượng.','Có kinh nghiệm thực tế.','Hiểu người dùng.'],areas_to_improve:['Mô tả rõ vai trò cá nhân.'],next_steps:['Luyện cách trình bày tình huống khó.','Bổ sung bằng chứng.'],per_question:[{question:'Hãy giới thiệu kinh nghiệm của bạn.',answer,feedback:'Nội dung cụ thể, cần làm rõ phần bạn trực tiếp phụ trách.',suggested_answer:'Tôi phụ trách [vai trò thực tế] trong dự án quản lý kho. Kết quả giảm 20% thời gian nhập liệu.'}],deep_analysis:{role_alignment:['Kinh nghiệm React phù hợp vị trí Frontend.'],evidence_gaps:['Chưa nêu phương pháp đo thời gian nhập liệu.'],practice_plan:['Ngày 1: Viết lại bối cảnh dự án.','Ngày 2: Mô tả vai trò cá nhân.','Ngày 3: Kiểm tra số liệu.','Ngày 4: Luyện câu hỏi kỹ thuật.','Ngày 5: Luyện câu hỏi hành vi.','Ngày 6: Ghi âm và tự kiểm tra.','Ngày 7: Phỏng vấn lại và đối chiếu bằng chứng.']}};
export async function mockAI(page,{failEvaluation=false,failQuestion=false,transcriptionDelay=40,denyCamera=false,denyMic=false}={}){
  await page.addInitScript(({answer,transcriptionDelay,denyCamera,denyMic})=>{
    window.rtcEvents=[];window.rtcConnections=[];window.testStreams=[];
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=async constraints=>{
      if((constraints.video&&denyCamera)||(constraints.audio&&denyMic))throw new DOMException('denied','NotAllowedError');
      const stream=await original(constraints);window.testStreams.push(stream);return stream;
    };
    window.RTCPeerConnection=class{
      constructor(){window.rtcConnections.push(this);this.restored=[];this.turn=0;this.connectionState='new';}
      addTrack(track){this.track=track;}
      createDataChannel(){
        this.dc={readyState:'connecting',send:raw=>{
          const event=JSON.parse(raw);window.rtcEvents.push(event);
          if(event.type==='conversation.item.create')this.restored.push(event.item);
          if(event.type==='input_audio_buffer.commit'){
            this.turn++;const item_id=`input-${this.turn}`;
            this.emit({type:'input_audio_buffer.committed',item_id});
            setTimeout(()=>this.emit({type:'conversation.item.input_audio_transcription.completed',item_id,transcript:answer}),transcriptionDelay);
          }
          if(event.type==='response.create'){
            const id=`bot-${this.turn}`,question=this.turn?'Bạn đã xử lý khó khăn trong dự án đó như thế nào?':'Hãy giới thiệu kinh nghiệm của bạn.';
            this.emit({type:'response.created',response:{id:`response-${this.turn}`}});
            this.emit({type:'output_audio_buffer.started'});
            this.emit({type:'response.output_audio_transcript.delta',item_id:id,delta:question.slice(0,10)});
            if(window.interruptNextResponse){window.interruptNextResponse=false;setTimeout(()=>{this.connectionState='failed';this.onconnectionstatechange?.();},transcriptionDelay+50);return;}
            this.emit({type:'response.output_audio_transcript.done',item_id:id,transcript:question});
            this.emit({type:'response.done',response:{status:'completed'}});
            setTimeout(()=>this.emit({type:'output_audio_buffer.stopped'}),80);
          }
        },close:()=>{this.dc.readyState='closed';}};return this.dc;
      }
      emit(event){if(!this.closed)this.dc.onmessage?.({data:JSON.stringify(event)});}
      async createOffer(){return {sdp:'v=0\r\nmock offer',type:'offer'};}
      async setLocalDescription(){}
      async setRemoteDescription(){this.connectionState='connected';this.dc.readyState='open';setTimeout(()=>this.dc.onopen?.(),0);}
      close(){this.closed=true;this.connectionState='closed';}
    };
  },{answer,transcriptionDelay,denyCamera,denyMic});
  await page.route('**/api/rtc/session',route=>route.fulfill(failQuestion?{status:502,json:{error:'AI tạm thời không khả dụng.'}}:{contentType:'application/sdp',body:'v=0\r\nmock answer'}));
  await page.route('**/api/evaluate',route=>route.fulfill(failEvaluation?{status:502,json:{error:'Đánh giá đang bận. Vui lòng thử lại.'}}:{json:evaluation}));
}
export async function setup(page,plan='Free'){
  await page.goto('/');
  if(plan!=='Free')await page.evaluate(plan=>localStorage.setItem('interviewai:subscription',JSON.stringify(plan)),plan);
  if(plan!=='Free')await page.reload();
  await page.getByRole('button',{name:'Bắt đầu phỏng vấn miễn phí',exact:true}).first().click();
  await page.getByRole('button',{name:'Tiếp tục không cần tài khoản',exact:true}).click();
  await page.getByLabel('Tên vị trí',{exact:true}).fill('Lập trình viên Frontend');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
}
export async function begin(page){await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Bắt đầu phỏng vấn',exact:true}).click();}
export async function speak(page){
  const button=page.locator('[data-push-talk]');await button.waitFor();
  await button.focus();await page.keyboard.down('Space');
  // Hold long enough to exceed the deliberate short-press guard.
  await page.waitForTimeout(350);await page.keyboard.up('Space');
}
