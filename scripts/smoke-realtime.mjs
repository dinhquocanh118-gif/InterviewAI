// Explicit live smoke: fictional profile and synthetic speech only. Uses API quota.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {app} from '../server.js';
const server=process.argv.includes('--running')?null:app.listen(0);if(server)await new Promise(r=>server.once('listening',r));
const base=server?`http://127.0.0.1:${server.address().port}`:'http://localhost:3000';
let browser;
async function post(path,body){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response;}
try{
  const speech=await post('/api/tts',{text:'Tôi có hai năm làm lập trình viên React. Trong dự án quản lý kho, tôi trực tiếp thiết kế biểu mẫu nhập hàng và kiểm tra dữ liệu. Sau thử nghiệm với mười người dùng, thời gian nhập liệu giảm hai mươi phần trăm.'});
  const encoded=Buffer.from(await speech.arrayBuffer()).toString('base64');console.log('PASS: synthetic candidate speech generated.');
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage();page.setDefaultTimeout(90000);
  await page.addInitScript(encoded=>{
    window.liveSmoke={events:[],requests:[]};
    const Original=window.RTCPeerConnection;
    window.RTCPeerConnection=class extends Original {
      createDataChannel(...args){const dc=super.createDataChannel(...args);const send=dc.send.bind(dc);dc.send=raw=>{window.liveSmoke.requests.push(JSON.parse(raw));send(raw);};dc.addEventListener('message',e=>{try{const event=JSON.parse(e.data);window.liveSmoke.events.push(event.type);if(event.type==='error')window.liveSmoke.error=event.error?.code;}catch{}});return dc;}
    };
    navigator.mediaDevices.getUserMedia=async constraints=>{
      if(constraints.video)throw new DOMException('Synthetic test has no camera','NotAllowedError');
      const context=new AudioContext();const buffer=await context.decodeAudioData(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)).buffer);
      const destination=context.createMediaStreamDestination();window.liveSmoke.play=async()=>{await context.resume();const source=context.createBufferSource();source.buffer=buffer;source.connect(destination);return new Promise(resolve=>{source.onended=resolve;source.start();});};
      return destination.stream;
    };
  },encoded);
  await page.goto(base);await page.getByRole('button',{name:'Bắt đầu phỏng vấn miễn phí',exact:true}).first().click();await page.getByRole('button',{name:'Tiếp tục không cần tài khoản',exact:true}).click();
  await page.getByLabel('Tên vị trí',{exact:true}).fill('Lập trình viên Frontend');await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Bắt đầu phỏng vấn',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('[data-push-talk]')?.disabled || document.querySelector('.error-note'));
  if(await page.locator('.error-note').count())throw new Error('Realtime UI: '+await page.locator('.error-note').allTextContents());
  assert.ok((await page.locator('.current-question').innerText()).length>10);console.log('PASS: real WebRTC connection and spoken opening question.');
  await page.locator('[data-push-talk]').focus();await page.keyboard.down('Space');await page.evaluate(()=>window.liveSmoke.play());await page.waitForTimeout(300);await page.keyboard.up('Space');
  await page.waitForFunction(()=>document.querySelector('.message.user') && !document.querySelector('[data-push-talk]')?.disabled);
  const transcript=await page.locator('.message.user p').first().innerText();assert.ok(!transcript.startsWith('[') && transcript.length>20);
  const events=await page.evaluate(()=>window.liveSmoke.events);assert.ok(events.includes('conversation.item.input_audio_transcription.completed'));assert.ok(events.filter(e=>e==='output_audio_buffer.stopped').length>=2);console.log('PASS: synthetic answer transcribed and AI follow-up audio completed.');
  const input=await page.evaluate(()=>window.liveSmoke.requests.filter(e=>e.type==='response.create').at(-1).response.input);
  assert.deepEqual(input.filter(m=>m.role==='user').map(m=>m.content[0].text),[transcript]);assert.ok(input.every(m=>m.content.every(c=>['input_text','output_text'].includes(c.type))));console.log('PASS: live AI context exactly matches the displayed transcript; no audio input in response context.');
  if(!process.argv.includes('--voice-only')){
  await page.getByRole('button',{name:'Kết thúc phỏng vấn',exact:true}).click();await page.locator('.score-circle strong').waitFor({timeout:120000});console.log('PASS: Free evaluation completed after live voice session.');
  const setup={role:'Frontend',language:'vi',jd:'Phát triển React, kiểm thử, tối ưu giao diện.'};
  const messages=[{role:'bot',text:'Giới thiệu kinh nghiệm React của bạn.'},{role:'user',text:transcript}];
  for(const plan of ['Premium','Pro']){
    const result=await (await post('/api/evaluate',{setup,transcript:messages,plan})).json();assert.ok(result.per_question[0]?.suggested_answer);assert.equal(!!result.deep_analysis,plan==='Pro');console.log(`PASS: live ${plan} report schema and detail.`);
  }
  }
}finally{await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
