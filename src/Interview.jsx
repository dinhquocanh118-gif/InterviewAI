import React,{useState,useEffect,useRef} from 'react';
import {Button,Icon,ErrorNote,timer} from './ui.jsx';
import {saveSession} from './storage.js';
import {RealtimeInterview} from './realtime.js';
import Camera from './Camera.jsx';

export default function Interview({session,onFinish,onSave}){
  const [messages,setMessages]=useState(session.transcript || []),[status,setStatus]=useState('connecting');
  const [elapsed,setElapsed]=useState(session.durationSeconds || 0),[recordSeconds,setRecordSeconds]=useState(0);
  const [error,setError]=useState(''),[saveError,setSaveError]=useState(''),[muted,setMuted]=useState(false),[audioBlocked,setAudioBlocked]=useState(false),[finishing,setFinishing]=useState(false);
  const state=useRef({alive:true,session,messages:session.transcript || [],elapsed:session.durationSeconds || 0,queue:Promise.resolve()});
  const engine=useRef(null),end=useRef(null);state.current.elapsed=elapsed;
  function persist(nextMessages,updates={}){
    const r=state.current;
    // Serialize writes so late transcription cannot overwrite newer messages.
    r.queue=r.queue.catch(()=>{}).then(async()=>{
      if(!r.alive)return;
      const next={...r.session,transcript:nextMessages,durationSeconds:r.elapsed,...updates};
      await saveSession(next);r.session=next;
      if(r.alive){setSaveError('');onSave(next);}return next;
    });
    r.queue.catch(()=>{if(r.alive)setSaveError('Chưa lưu được hội thoại trên thiết bị. Hãy thử lưu lại trước khi rời phòng.');});return r.queue;
  }
  function connect(){
    engine.current?.close();setError('');setAudioBlocked(false);
    const client=new RealtimeInterview({setup:session.setup,messages:state.current.messages,
      onMessages:next=>{if(!state.current.alive)return;state.current.messages=next;setMessages(next);persist(next);},
      onStatus:next=>{if(state.current.alive)setStatus(next);},onError:message=>{if(state.current.alive)setError(message);},
      onAudioBlocked:()=>{if(state.current.alive)setAudioBlocked(true);}});
    engine.current=client;client.setMuted(muted);state.current.messages=client.messages;setMessages(client.messages);client.connect();
  }
  useEffect(()=>{
    state.current.alive=true;connect();
    const interval=setInterval(()=>setElapsed(v=>v+1),1000),saveInterval=setInterval(()=>persist(state.current.messages),10000);
    const editable=target=>target?.closest?.('input,textarea,select,[contenteditable="true"],button:not([data-push-talk])');
    const down=e=>{if(e.code==='Space' && !e.repeat && !editable(e.target)){e.preventDefault();engine.current?.start();}};
    const up=e=>{if(e.code==='Space' && engine.current?.status==='listening'){e.preventDefault();engine.current.stop();}};
    const cancel=()=>engine.current?.stop(true),hidden=()=>{if(document.hidden)cancel();},warn=e=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',cancel);window.addEventListener('beforeunload',warn);document.addEventListener('visibilitychange',hidden);
    return()=>{state.current.alive=false;engine.current?.close();clearInterval(interval);clearInterval(saveInterval);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',cancel);window.removeEventListener('beforeunload',warn);document.removeEventListener('visibilitychange',hidden);};
  },[]);
  useEffect(()=>{if(status!=='listening'){setRecordSeconds(0);return;}const id=setInterval(()=>setRecordSeconds(Math.floor((Date.now()-engine.current.startedAt)/1000)),100);return()=>clearInterval(id);},[status]);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[messages]);
  async function finish(){
    if(finishing || engine.current?.status==='listening' || messages.some(m=>m.pending))return;
    setFinishing(true);engine.current?.close();
    try{const next=await persist(state.current.messages,{completedAt:Date.now()});if(next && state.current.alive)onFinish(next);}
    catch{if(state.current.alive){setFinishing(false);setStatus('offline');}}
  }
  const answers=messages.filter(m=>m.role==='user' && !m.pending && !m.transcriptionError).length;
  const pending=messages.some(m=>m.pending),duration=Number(session.setup.duration)*60;
  const question=[...messages].reverse().find(m=>m.role==='bot' && !m.transcriptionError)?.text;
  return <div className="room">
    <div className="room-top"><div><span className="eyebrow">BUỔI PHỎNG VẤN CỦA BẠN</span><h2>{session.setup.role}</h2><p>{session.setup.industry} · {session.setup.language==='en'?'Tiếng Anh':'Tiếng Việt'} · {session.setup.difficulty}</p></div><span className="time"><Icon name="clock"/>{timer(elapsed)} / {timer(duration)}</span></div>
    <div className="progress-track"><span style={{width:`${Math.min(100,elapsed/duration*100)}%`}}/></div>
    {elapsed>=duration && <div className="notice">Đã đạt thời lượng dự kiến. Bạn có thể hoàn thiện câu trả lời rồi kết thúc buổi luyện.</div>}
    <ErrorNote>{saveError}</ErrorNote>{saveError && <Button kind="secondary" onClick={()=>persist(state.current.messages).catch(()=>{})}>Thử lưu hội thoại</Button>}
    <div className="room-grid realtime-room"><section className="interviewer card">
      <div className="row between"><span className="pill">Phỏng vấn trực tiếp với AI</span><button className="icon-button" aria-label={muted?'Bật giọng AI':'Tắt giọng AI'} onClick={()=>{engine.current?.setMuted(!muted);setMuted(!muted);}}><Icon name="volume"/>{muted && '×'}</button></div>
      <div className={`ai-orb ${status}`}><Icon size={56}/></div><div className={`live-status ${status}`} aria-live="polite"><i/>{({offline:'Chưa kết nối',connecting:'Đang kết nối micro và AI',thinking:'AI đang suy nghĩ',speaking:'AI đang nói',ready:'Sẵn sàng nghe bạn',listening:'Đang lắng nghe'})[status]}</div>
      <p className="tiny">Giọng nói được tạo bởi AI</p><h3 className="current-question">{question || 'AI sẽ chào và đặt câu hỏi khi kết nối hoàn tất.'}</h3><ErrorNote>{error}</ErrorNote>
      {status==='offline' && <Button kind="secondary" onClick={connect} disabled={finishing}>Kết nối lại</Button>}
      {audioBlocked && <Button kind="secondary" onClick={async()=>{try{await engine.current.audio.play();setAudioBlocked(false);}catch{setError('Trình duyệt chưa cho phát âm thanh. Hãy kiểm tra quyền âm thanh.');}}}>Phát giọng AI</Button>}
      <div className="push-talk-controls"><Button data-push-talk="true" kind={status==='listening'?'danger':'primary'} icon="mic" disabled={finishing || !['ready','listening'].includes(status) || (pending && status!=='listening')}
        onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);engine.current?.start();}}
        onPointerUp={()=>engine.current?.stop()} onPointerCancel={()=>engine.current?.stop(true)} onLostPointerCapture={()=>engine.current?.stop(true)}
        onKeyDown={e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();engine.current?.start();}}} onKeyUp={e=>{if(e.key==='Enter'){e.preventDefault();engine.current?.stop();}}}>
        {status==='listening'?`Đang ghi ${timer(recordSeconds)} · Thả để gửi`:'Giữ Space hoặc giữ nút để nói'}</Button>
        <p className="muted">Giữ để trả lời, thả để AI nghe và hỏi tiếp. Mỗi lần nói tối đa 2 phút.</p><small>Khoảng 6–8 câu chính, có câu hỏi đào sâu theo câu trả lời của bạn.</small>
      </div>
    </section><aside className="room-side"><Camera/><section className="card transcript-panel"><div className="row between"><h3>Bản ghi hội thoại</h3><span className="pill">{answers} câu trả lời</span></div><div className="transcript">{messages.map((m,i)=><div key={m.id || i} className={`message ${m.role}`}><strong>{m.role==='bot'?'InterviewAI':'Bạn'}</strong><p>{m.text}</p>{m.transcriptionError && <small>Lượt thiếu nội dung không được chấm.</small>}</div>)}<div ref={end}/></div>
      <Button kind="danger-soft" onClick={finish} disabled={finishing || pending || !answers || ['connecting','thinking','speaking','listening'].includes(status)}>{finishing?'Đang lưu buổi luyện…':'Kết thúc phỏng vấn'}</Button><small>{pending?'Đang chờ hoàn tất bản ghi hội thoại…':'Buổi luyện được lưu trên thiết bị này.'}</small></section></aside></div>
  </div>;
}
