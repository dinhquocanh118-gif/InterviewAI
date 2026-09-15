import React,{useState,useEffect,useRef} from 'react';
import {Button,Icon,ErrorNote,timer} from './ui.jsx';
import {request,dataURL} from './api.js';
import {saveSession} from './storage.js';

export default function Interview({session,onFinish,onSave}) {
  const [messages,setMessages]=useState(session.transcript || []);
  const [status,setStatus]=useState('ready');
  const [draft,setDraft]=useState('');
  const [error,setError]=useState('');
  const [audioNote,setAudioNote]=useState('');
  const [muted,setMuted]=useState(false);
  const [elapsed,setElapsed]=useState(session.durationSeconds || 0);
  const [recordSeconds,setRecordSeconds]=useState(0);
  const [needsQuestion,setNeedsQuestion]=useState(!messages.length || messages.at(-1)?.role==='user');
  const ref=useRef({alive:true,session,messages,elapsed:session.durationSeconds || 0,recorder:null,stream:null,speaker:null,url:null,controller:null,muted:false,lock:false});
  ref.current.elapsed=elapsed;
  const transcriptEnd=useRef(null);
  const duration=Number(session.setup.duration)*60;
  const answerCount=messages.filter(m=>m.role==='user').length;
  useEffect(()=> { const interval=setInterval(()=>setElapsed(v=>v+1),1000); return ()=>clearInterval(interval); },[]);
  useEffect(()=> { if(status!=='listening') return; const interval=setInterval(()=>setRecordSeconds(v=>v+1),1000); return ()=>clearInterval(interval); },[status]);
  useEffect(()=> { if(recordSeconds>=120 && ref.current.recorder?.state==='recording') stopRecording(); },[recordSeconds]);
  useEffect(()=> { transcriptEnd.current?.scrollIntoView({block:'nearest',behavior:'smooth'}); },[messages]);
  useEffect(()=> {
    ref.current.alive=true;
    if(!ref.current.messages.length || ref.current.messages.at(-1)?.role==='user') askQuestion();
    const warn=e=>{e.preventDefault();e.returnValue='';}; window.addEventListener('beforeunload',warn);
    return ()=> {
      const r=ref.current; r.alive=false; r.controller?.abort();
      if(r.recorder){r.recorder.onstop=null;if(r.recorder.state==='recording')r.recorder.stop();}
      r.stream?.getTracks().forEach(t=>t.stop()); stopAudio(); window.removeEventListener('beforeunload',warn);
    };
  },[]);
  function stopAudio() { const r=ref.current; if(r.speaker){r.speaker.onended=null;r.speaker.pause();r.speaker=null;} if(r.url){URL.revokeObjectURL(r.url);r.url=null;} }
  async function persist(nextMessages,updates={}) {
    const next={...ref.current.session,transcript:nextMessages,durationSeconds:ref.current.elapsed,...updates};
    await saveSession(next); ref.current.session=next; onSave(next); return next;
  }
  async function speak(question) {
    if(!ref.current.alive) return;
    if(ref.current.muted){setStatus('ready');return;}
    setStatus('thinking');
    setAudioNote('');
    try {
      const blob=await request('/api/tts',{text:question},{blob:true,signal:ref.current.controller?.signal});
      if(!ref.current.alive)return;
      if(ref.current.muted){setStatus('ready');return;}
      stopAudio(); const url=URL.createObjectURL(blob); const audio=new Audio(url);
      ref.current.url=url;ref.current.speaker=audio;
      audio.onended=()=>{stopAudio();if(ref.current.alive)setStatus('ready');};
      audio.onerror=()=>{stopAudio();if(ref.current.alive){setStatus('ready');setAudioNote('Không phát được âm thanh. Bạn có thể đọc câu hỏi bên dưới.');}};
      setStatus('speaking'); await audio.play();
    }catch { if(ref.current.alive){stopAudio();setStatus('ready');setAudioNote('Chưa phát được giọng AI. Bạn vẫn có thể đọc câu hỏi và trả lời.');} }
  }
  async function askQuestion() {
    if(ref.current.lock)return;ref.current.lock=true;setStatus('thinking');setError('');
    ref.current.controller=new AbortController();
    try {
      const {question}=await request('/api/interview/turn',{setup:session.setup,transcript:ref.current.messages},{signal:ref.current.controller.signal});
      if(!ref.current.alive)return;
      const next=[...ref.current.messages,{role:'bot',text:question,at:Date.now()}];
      await persist(next); if(!ref.current.alive)return;
      ref.current.messages=next;setMessages(next);setNeedsQuestion(false);
      await speak(question);
    }catch(e){if(ref.current.alive){setError(e.message);setStatus('ready');setNeedsQuestion(true);}}
    finally{ref.current.lock=false;}
  }
  async function submit(event) {
    event.preventDefault();if(!draft.trim() || ref.current.lock)return;
    ref.current.lock=true;setError('');
    try{
      const next=[...ref.current.messages,{role:'user',text:draft.trim(),at:Date.now()}];
      await persist(next);ref.current.messages=next;setMessages(next);setDraft('');setNeedsQuestion(true);
    }catch(e){setError('Chưa lưu được câu trả lời trên thiết bị. '+e.message);return;}
    finally{ref.current.lock=false;}
    await askQuestion();
  }
  async function startRecording() {
    if(ref.current.lock)return;ref.current.lock=true;setError('');setStatus('connecting');
    try {
      if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)throw new Error('Trình duyệt chưa hỗ trợ ghi âm. Hãy nhập câu trả lời hoặc mở trang qua localhost / HTTPS.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      if(!ref.current.alive){stream.getTracks().forEach(t=>t.stop());return;}
      ref.current.stream=stream;
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);ref.current.recorder=recorder;
      const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());if(!ref.current.alive)return;
        setStatus('thinking');
        try{
          const blob=new Blob(chunks,{type:recorder.mimeType});
          if(blob.size<100)throw new Error('Bản ghi quá ngắn. Hãy ghi âm lại.');
          ref.current.controller=new AbortController();
          const result=await request('/api/stt',{audioDataUrl:await dataURL(blob),language:session.setup.language},{signal:ref.current.controller.signal});
          if(ref.current.alive){if(!result.text?.trim())throw new Error('Chưa nhận diện được lời nói. Hãy thử lại hoặc nhập câu trả lời.');setDraft(v=>v+(v?' ':'')+result.text);}
        }catch(e){if(ref.current.alive)setError(e.message);}
        finally{ref.current.lock=false;if(ref.current.alive)setStatus('ready');}
      };
      recorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());ref.current.lock=false;setStatus('ready');setError('Ghi âm bị gián đoạn. Vui lòng thử lại.');};
      recorder.start();setRecordSeconds(0);setStatus('listening');
    }catch(e){ref.current.lock=false;ref.current.stream?.getTracks().forEach(t=>t.stop());setStatus('ready');setError(e.name==='NotAllowedError'?'Microphone chưa được cho phép. Hãy cấp quyền trong trình duyệt hoặc nhập câu trả lời.':e.message);}
  }
  function stopRecording(){if(ref.current.recorder?.state==='recording')ref.current.recorder.stop();}
  function toggleSound(){const next=!muted;ref.current.muted=next;setMuted(next);if(next){stopAudio();if(status==='speaking')setStatus('ready');}}
  async function finish(){
    if(ref.current.lock || !answerCount)return;
    if(draft.trim() && !window.confirm('Câu trả lời đang soạn chưa được gửi. Kết thúc mà không gửi phần này?'))return;
    ref.current.lock=true;stopAudio();setStatus('thinking');
    try{const next=await persist(ref.current.messages,{completedAt:Date.now()});onFinish(next);}
    catch(e){setError('Chưa lưu được buổi phỏng vấn. '+e.message);setStatus('ready');ref.current.lock=false;}
  }
  const busy=['thinking','connecting','speaking'].includes(status);
  const question=[...messages].reverse().find(m=>m.role==='bot')?.text;
  return <div className="room">
    <div className="room-top"><div><span className="eyebrow">BUỔI PHỎNG VẤN CỦA BẠN</span><h2>{session.setup.role}</h2><p>{session.setup.industry} · {session.setup.language==='en'?'Tiếng Anh':'Tiếng Việt'} · {session.setup.difficulty}</p></div><span className="time"><Icon name="clock"/> {timer(elapsed)} / {timer(duration)}</span></div>
    <div className="progress-track"><span style={{width:`${Math.min(100,elapsed/duration*100)}%`}}/></div>
    {elapsed>=duration && <div className="notice">Đã đạt thời lượng dự kiến. Bạn có thể hoàn thiện câu trả lời rồi kết thúc buổi luyện.</div>}
    <div className="room-grid"><section className="interviewer card">
      <div className="row between"><span className="pill">Người phỏng vấn AI</span><button className="icon-button" onClick={toggleSound} aria-label={muted?'Bật giọng AI':'Tắt giọng AI'}><Icon name="volume"/>{muted && <span>×</span>}</button></div>
      <div className={`ai-orb ${status}`}><Icon size={56}/></div>
      <div className={`live-status ${status}`} aria-live="polite"><i/>{({ready:'Sẵn sàng nghe bạn',thinking:'AI đang suy nghĩ',speaking:'AI đang nói',listening:'Đang lắng nghe',connecting:'Đang mở microphone'})[status]}</div>
      <p className="tiny">Giọng nói được tạo bởi AI</p>
      <h3 className="current-question">{question || 'Đang chuẩn bị câu hỏi đầu tiên dành cho bạn…'}</h3>
      <p className="muted">Hít thở sâu. Hãy trả lời như trong một buổi trò chuyện.</p>
      {audioNote && <p className="tiny">{audioNote}</p>}
      <ErrorNote>{error}</ErrorNote>
      {needsQuestion && status==='ready' && <Button kind="secondary" onClick={askQuestion}>Thử lấy câu hỏi AI</Button>}
      <form onSubmit={submit} className="answer-form">
        <label htmlFor="answer">Câu trả lời của bạn</label><textarea id="answer" rows={3} maxLength={10000} placeholder="Nhập câu trả lời hoặc sử dụng microphone…" value={draft} onChange={e=>setDraft(e.target.value)} disabled={busy || status==='listening'}/>
        <small>Văn bản ghi âm sẽ xuất hiện ở đây để bạn kiểm tra trước khi gửi.</small>
        <div className="row wrap between"><Button type="button" kind={status==='listening'?'danger':'secondary'} icon="mic" onClick={status==='listening'?stopRecording:startRecording} disabled={busy || needsQuestion}>{status==='listening'?`Tắt mic · ${timer(recordSeconds)}`:'Bật mic để trả lời'}</Button><Button icon="arrow" disabled={busy || status==='listening' || needsQuestion || !draft.trim()}>Gửi câu trả lời</Button></div>
      </form>
    </section><aside className="card transcript-panel"><div className="row between"><h3>Bản ghi hội thoại</h3><span className="pill">{answerCount} câu trả lời</span></div><div className="transcript">{!messages.length && <p className="muted">Hội thoại sẽ xuất hiện tại đây.</p>}{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><strong>{m.role==='bot'?'InterviewAI':'Bạn'}</strong><p>{m.text}</p></div>)}<div ref={transcriptEnd}/></div><Button kind="danger-soft" onClick={finish} disabled={busy || status==='listening' || !answerCount}>Kết thúc phỏng vấn</Button><small>Buổi luyện được lưu trên thiết bị này.</small></aside></div>
  </div>;
}
