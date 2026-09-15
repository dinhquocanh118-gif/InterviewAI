import React,{useState,useEffect,useRef} from 'react';
import {Button,Icon,ErrorNote,date,timer} from './ui.jsx';
import {request} from './api.js';
import {saveSession} from './storage.js';
import {score} from './domain.js';
import {reportPlan,reportForPlan,reportDescriptions} from './report-policy.js';
export default function Results({session,onSave,onNext,onDashboard}){
  const plan=reportPlan(session.reportPlan);
  const [result,setResult]=useState(()=>reportForPlan(session.evaluation,plan)),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lifecycle=useRef({alive:true,controller:null,locked:false});
  async function evaluate(){
    if(lifecycle.current.locked)return;
    lifecycle.current.locked=true;setBusy(true);setError('');const controller=new AbortController();lifecycle.current.controller=controller;
    try{
      const feedback=reportForPlan(await request('/api/evaluate',{setup:session.setup,plan,transcript:session.transcript.filter(m=>!m.pending && !m.transcriptionError)},{signal:controller.signal}),plan);
      if(!lifecycle.current.alive)return;
      const next={...session,reportPlan:plan,evaluation:feedback};await saveSession(next);
      if(lifecycle.current.alive){onSave(next);setResult(feedback);}
    }catch(e){if(lifecycle.current.alive)setError(e.message);}
    finally{lifecycle.current.locked=false;if(lifecycle.current.alive)setBusy(false);}
  }
  useEffect(()=>{lifecycle.current.alive=true;if(!session.evaluation)evaluate();return()=>{lifecycle.current.alive=false;lifecycle.current.controller?.abort();};},[]);
  function exportResult(){const blob=new Blob([JSON.stringify({...session,reportPlan:plan,evaluation:reportForPlan(result,plan)},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`InterviewAI-${plan}-${session.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <>
    <div className="page-heading row between wrap"><div><span className="eyebrow">MỖI LẦN LUYỆN, MỘT BƯỚC TIẾN</span><h1>Kết quả phỏng vấn</h1><p>{session.setup.role} · {date(session.completedAt)} · {timer(session.durationSeconds || 0)}</p></div><Button kind="secondary" onClick={onDashboard}>Về Tổng quan</Button></div>
    <div className="notice report-tier"><span className="pill">Báo cáo {plan}</span><p>{reportDescriptions[plan]}</p><small>Áp dụng gói lúc bắt đầu buổi luyện.</small></div>
    {busy && <div className="card evaluating"><div className="mini-orb"><Icon/></div><h2>AI đang xem lại buổi phỏng vấn của bạn</h2><p>Đang chuẩn bị báo cáo {plan}…</p></div>}
    <ErrorNote>{error}</ErrorNote>{!result && !busy && <div className="notice"><p>Hội thoại đã được lưu. Chưa có điểm số vì đánh giá AI chưa hoàn tất.</p><Button onClick={evaluate}>Thử đánh giá lại</Button></div>}
    {result && <>
      <div className="results-overview"><section className="overall-card"><span className="eyebrow">ĐIỂM TỔNG THỂ</span><div className="score-circle"><strong>{score({evaluation:result})}</strong><span>/ 10 điểm</span></div><p>Góp ý để luyện tập tốt hơn</p></section><section className="card result-summary"><h2>Nhìn lại buổi luyện</h2><p>{result.summary}</p><div className="rubrics">{[['content','Chất lượng câu trả lời'],['communication','Khả năng giao tiếp'],['fit','Phù hợp với vị trí'],['structure','Cấu trúc câu trả lời']].map(([key,label])=><div key={key}><div className="row between"><span>{label}</span><strong>{result.scores[key]}/10</strong></div><div className="progress-track"><span style={{width:`${result.scores[key]*10}%`}}/></div></div>)}</div><small>Đánh giá dựa trên nội dung bản chép lời, không dùng hình ảnh camera.</small></section></div>
      <div className="feedback-grid"><section className="card"><h3>Điểm mạnh của bạn</h3><ul>{result.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></section><section className="card"><h3>Cơ hội cải thiện</h3><ul>{result.areas_to_improve.map((s,i)=><li key={i}>{s}</li>)}</ul></section></div>
      <div className="section-heading"><h2>{plan==='Free'?'Báo cáo tổng quan':'Góp ý theo từng câu hỏi'}</h2><Button kind="secondary" icon="file" onClick={exportResult}>Tải kết quả</Button></div>
      {plan!=='Free' && <div className="question-results">{result.per_question.map((q,i)=><details className="card" key={i} open={i===0}><summary><span className="question-number">{String(i+1).padStart(2,'0')}</span><strong>{q.question}</strong><span>+</span></summary><div className="question-detail"><h4>Câu trả lời của bạn</h4><p className="user-answer">{q.answer}</p><h4>Nhận xét của AI</h4><p>{q.feedback}</p><div className="suggested-answer"><h4><Icon name="spark"/> Cách trả lời tốt hơn</h4><p>{q.suggested_answer}</p></div></div></details>)}</div>}
      {plan==='Pro' && result.deep_analysis && <section className="card deep-analysis"><span className="eyebrow">PHÂN TÍCH CHUYÊN SÂU · PRO</span><h2>Từ bằng chứng đến kế hoạch luyện tập</h2>{[['role_alignment','Mức phù hợp với vị trí'],['evidence_gaps','Bằng chứng cần bổ sung'],['practice_plan','Kế hoạch luyện 7 ngày']].map(([key,label])=><div key={key}><h3>{label}</h3><ul>{result.deep_analysis[key].map((s,i)=><li key={i}>{s}</li>)}</ul></div>)}</section>}
      {plan!=='Pro' && <div className="notice report-upgrade"><div><h3>{plan==='Free'?'Muốn xem góp ý từng câu?':'Muốn phân tích chuyên sâu hơn?'}</h3><p>{plan==='Free'?'Premium bổ sung nhận xét từng câu và gợi ý trả lời tốt hơn.':'Pro bổ sung đối chiếu vị trí, bằng chứng còn thiếu và kế hoạch luyện 7 ngày.'} Gói mới áp dụng cho buổi luyện tiếp theo.</p></div><Button kind="secondary" onClick={()=>{location.hash='plans';}}>Xem các gói</Button></div>}
      <section className="next-steps card"><div><span className="eyebrow">BƯỚC TIẾP THEO</span><h2>Biến góp ý thành sự tiến bộ</h2><ul>{result.next_steps.map((s,i)=><li key={i}>{s}</li>)}</ul></div><Button icon="arrow" onClick={onNext}>Luyện tiếp vị trí này</Button></section>
    </>}
    <details className="card full-transcript"><summary>Xem toàn bộ bản ghi hội thoại</summary>{session.transcript.map((m,i)=><div className={`message ${m.role}`} key={i}><strong>{m.role==='bot'?'InterviewAI':'Bạn'}</strong><p>{m.text}</p></div>)}</details>
  </>;
}
