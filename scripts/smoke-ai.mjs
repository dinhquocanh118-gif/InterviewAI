// Runs only on explicit invocation; uses short, fictional interview content.
import assert from 'node:assert/strict';
import {app} from '../server.js';
const server=app.listen(0);
await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
async function post(path,body){
  const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new Error(`${path}: ${response.status} ${(await response.json()).error}`);
  return path==='/api/tts'?response.arrayBuffer():response.json();
}
try{
  const setup={role:'Lập trình viên Frontend',industry:'Công nghệ thông tin',level:'1–3 năm kinh nghiệm',language:'vi',duration:10,difficulty:'Vừa sức',skills:'React',experience:'Dữ liệu ứng viên giả lập để kiểm thử.'};
  const first=await post('/api/interview/turn',{setup,transcript:[]});assert.ok(first.question.length>15);console.log('PASS: live AI creates first interview question.');
  const transcript=[{role:'bot',text:first.question},{role:'user',text:'Tôi có hai năm làm React. Trong dự án quản lý kho, tôi thiết kế biểu mẫu nhập hàng và bổ sung kiểm tra dữ liệu. Sau khi đo với nhóm 10 người dùng, thời gian nhập liệu giảm khoảng 20 phần trăm. Tôi trực tiếp xây giao diện và viết kiểm thử.'}];
  const followup=await post('/api/interview/turn',{setup,transcript});assert.ok(followup.question.length>15);console.log('PASS: live AI follows up on the answer.');
  const result=await post('/api/evaluate',{setup,transcript,plan:'Premium'});assert.equal(Object.keys(result.scores).length,4);assert.ok(result.per_question[0].suggested_answer);console.log('PASS: live AI returns four scoring dimensions and per-question suggested answer.');
  const audio=await post('/api/tts',{text:'Tôi đã làm việc với React trong hai năm.'});assert.ok(audio.byteLength>1000);console.log('PASS: live speech synthesis returns audio.');
  const speech=await post('/api/stt',{audioDataUrl:'data:audio/mpeg;base64,'+Buffer.from(audio).toString('base64'),language:'vi'});assert.ok(speech.text.length>10);console.log('PASS: live transcription converts synthetic speech to text.');
}finally{await new Promise(resolve=>server.close(resolve));}
