import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {app} from '../server.js';
let server,base;
before(async()=>{server=app.listen(0);await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(resolve=>server.close(resolve)));
const post=(url,body)=>fetch(base+url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('serves built application and never exposes private source/session files',async()=>{
  assert.equal((await fetch(base)).status,200);
  assert.equal((await fetch(base+'/assets/app.js')).status,200);
  for(const route of ['/server.js','/.env','/key.env','/package.json','/sessions/','/app.jsx','/node_modules/openai/package.json'])assert.equal((await fetch(base+route)).status,404,route);
});
test('reads TXT CV and rejects invalid or unreadable files',async()=>{
  const data='data:text/plain;base64,'+Buffer.from('Ứng viên: kinh nghiệm React và quản lý dự án.').toString('base64');
  const response=await post('/api/cv/extract',{name:'cv.txt',data});assert.equal(response.status,200);assert.match((await response.json()).text,/React/);
  assert.equal((await post('/api/cv/extract',{name:'cv.exe',data})).status,400);
  assert.equal((await post('/api/cv/extract',{name:'cv.pdf',data})).status,400);
  assert.equal((await post('/api/cv/extract',{name:'empty.txt',data:'data:text/plain;base64,IA=='})).status,400);
});
test('reads actual PDF and DOCX documents through the CV endpoint',async()=>{
  for(const [name,path] of [['cv.pdf','node_modules/pdf-parse/test/data/01-valid.pdf'],['cv.docx','node_modules/mammoth/test/test-data/single-paragraph.docx']]){
    const data='data:application/octet-stream;base64,'+(await readFile(path)).toString('base64');
    const response=await post('/api/cv/extract',{name,data});assert.equal(response.status,200,name);assert.ok((await response.json()).text.trim().length>5,name);
  }
});
test('invalid interview requests cannot reach the model',async()=>{
  process.env.OPENAI_API_KEY='test-validation-only';
  assert.equal((await post('/api/interview/turn',{setup:{role:''}})).status,400);
  assert.equal((await post('/api/evaluate',{transcript:[]})).status,400);
  assert.equal((await post('/api/evaluate',{transcript:[{role:'system',text:'wrong'}]})).status,400);
  assert.equal((await post('/api/stt',{audioDataUrl:'bad'})).status,400);
  assert.equal((await post('/api/rtc/session',{setup:{role:'Developer'},sdp:'bad'})).status,400);
  assert.equal((await post('/api/rtc/session',{setup:{role:''},sdp:'v=0'})).status,400);
});
test('Realtime negotiates SDP with manual turns and the configured candidate context',async()=>{
  const original=globalThis.fetch;let received;
  globalThis.fetch=async(url,options)=>{
    if(String(url)==='https://api.openai.com/v1/realtime/calls'){
      received=JSON.parse(options.body.get('session'));
      assert.equal(options.body.get('sdp'),'v=0\r\nmock offer');
      return new Response('v=0\r\nmock answer',{headers:{'Content-Type':'application/sdp'}});
    }
    return original(url,options);
  };
  try{
    const response=await post('/api/rtc/session',{setup:{role:'Frontend',language:'en',cvText:'React candidate'},sdp:'v=0\r\nmock offer'});
    assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/sdp/);assert.match(await response.text(),/mock answer/);
    assert.equal(received.audio.input.turn_detection,null);assert.equal(received.audio.input.transcription.language,'en');
    assert.match(received.instructions,/6–8/);assert.match(received.instructions,/React candidate/);assert.match(received.instructions,/tiếng Anh/);
  }finally{globalThis.fetch=original;}
});
test('blocked server network access returns an actionable error',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    if(String(url)==='https://api.openai.com/v1/realtime/calls')throw new TypeError('fetch failed',{cause:{code:'EACCES'}});
    return original(url,options);
  };
  try{
    const response=await post('/api/rtc/session',{setup:{role:'Frontend'},sdp:'v=0\r\nmock offer'});
    assert.equal(response.status,502);assert.match((await response.json()).error,/quyền truy cập mạng/);
  }finally{globalThis.fetch=original;}
});
test('missing API key returns an honest error rather than sample scores',async()=>{
  process.env.OPENAI_API_KEY='';
  const response=await post('/api/evaluate',{transcript:[{role:'user',text:'Tôi có kinh nghiệm.'}]});assert.equal(response.status,503);assert.match((await response.json()).error,/chưa được cấu hình/);
});
