import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {mockAI,setup,begin,speak,evaluation,answer} from './realtime-fixture.js';

for(const plan of ['Free','Premium','Pro'])test(`${plan}: completes voice interview, report and export respect plan after reload`,async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await mockAI(page);await setup(page,plan);
  await page.getByLabel('Tải CV',{exact:true}).setInputFiles({name:'cv.txt',mimeType:'text/plain',buffer:Buffer.from('Tôi có kinh nghiệm React, JavaScript, TypeScript.')});
  await expect(page.getByText('Đã đọc nội dung và lưu CV trên thiết bị')).toBeVisible();
  const connecting=page.waitForRequest('**/api/rtc/session');await begin(page);
  expect((await connecting).postDataJSON().setup.cvText).toContain('TypeScript');
  await expect(page.locator('[data-push-talk]')).toBeEnabled();await expect(page.getByLabel('Câu trả lời của bạn')).toHaveCount(0);
  await expect(page.locator('video')).toBeVisible();
  await speak(page);await expect(page.locator('.current-question')).toContainText('khó khăn');
  await expect(page.getByRole('button',{name:'Kết thúc phỏng vấn',exact:true})).toBeEnabled();
  const scoring=page.waitForRequest('**/api/evaluate');await page.getByRole('button',{name:'Kết thúc phỏng vấn',exact:true}).click();
  const body=(await scoring).postDataJSON();expect(body.plan).toBe(plan);expect(body.transcript.filter(m=>m.role==='user').map(m=>m.text)).toEqual([answer]);
  await expect(page.locator('.score-circle strong')).toHaveText('8');await expect(page.getByText(`Báo cáo ${plan}`,{exact:true})).toBeVisible();
  await expect(page.locator('.question-results')).toHaveCount(plan==='Free'?0:1);await expect(page.locator('.deep-analysis')).toHaveCount(plan==='Pro'?1:0);
  if(plan!=='Free')await expect(page.getByText(evaluation.per_question[0].suggested_answer,{exact:true})).toBeVisible();
  if(plan==='Pro')await expect(page.getByText('Kế hoạch luyện 7 ngày',{exact:true})).toBeVisible();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Tải kết quả'}).click();
  const data=JSON.parse(await readFile(await (await downloaded).path(),'utf8'));
  expect(data.evaluation.plan).toBe(plan);expect(data.evaluation.per_question.length).toBe(plan==='Free'?0:1);expect(!!data.evaluation.deep_analysis).toBe(plan==='Pro');
  expect(await page.evaluate(()=>window.testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  await page.screenshot({path:`artifacts/report-${plan}.png`,fullPage:true});
  await page.evaluate(()=>localStorage.setItem('interviewai:subscription',JSON.stringify('Pro')));await page.reload();
  await expect(page.getByText(`Báo cáo ${plan}`,{exact:true})).toBeVisible();await expect(page.locator('.question-results')).toHaveCount(plan==='Free'?0:1);
  await page.getByRole('button',{name:'Về Tổng quan',exact:true}).click();await expect(page.locator('.stat').filter({hasText:'Buổi đã luyện'}).locator('strong')).toHaveText('1');
  await page.getByRole('button',{name:'Lịch sử phỏng vấn',exact:true}).click();await expect(page.getByRole('button',{name:'Xem kết quả',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('late transcription blocks finish; returning to an unfinished interview restores context',async({page})=>{
  await mockAI(page,{transcriptionDelay:1500});await setup(page);await begin(page);await expect(page.locator('[data-push-talk]')).toBeEnabled();
  await speak(page);await expect(page.getByText('Đang chuyển giọng nói thành văn bản…',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Kết thúc phỏng vấn',exact:true})).toBeDisabled();
  await expect(page.getByText(answer,{exact:true})).toBeVisible();await expect(page.locator('[data-push-talk]')).toBeEnabled();
  await page.getByRole('button',{name:'Lịch sử phỏng vấn',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await expect(page.locator('[data-push-talk]')).toBeEnabled();
  const restored=await page.evaluate(()=>window.rtcConnections.at(-1).restored);
  expect(restored.map(m=>m.role)).toEqual(['assistant','user','assistant']);expect(restored[1].content[0].text).toBe(answer);
});

test('connection failure and microphone denial release resources and allow retry',async({page})=>{
  await mockAI(page,{failQuestion:true});await setup(page);await begin(page);
  await expect(page.getByText('AI tạm thời không khả dụng.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Kết nối lại',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>window.testStreams.filter(s=>s.getAudioTracks().length).every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  await page.route('**/api/rtc/session',route=>route.fulfill({contentType:'application/sdp',body:'v=0'}));await page.getByRole('button',{name:'Kết nối lại',exact:true}).click();await expect(page.locator('[data-push-talk]')).toBeEnabled();
  await page.getByRole('button',{name:'Tổng quan',exact:true}).click();expect(await page.evaluate(()=>window.testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
});

test('reconnect after interrupted AI speech restores the answer and requests a complete question',async({page})=>{
  await mockAI(page);await setup(page);await begin(page);await expect(page.locator('[data-push-talk]')).toBeEnabled();
  await page.evaluate(()=>window.interruptNextResponse=true);await speak(page);await expect(page.getByRole('button',{name:'Kết nối lại',exact:true})).toBeEnabled();
  await expect(page.getByText(answer,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Kết nối lại',exact:true}).click();await expect(page.locator('[data-push-talk]')).toBeEnabled();
  expect(await page.evaluate(()=>window.rtcConnections.at(-1).restored.map(m=>m.role))).toEqual(['assistant','user']);
  expect(await page.evaluate(()=>window.rtcEvents.filter(e=>e.type==='response.create').length)).toBe(3);
});

test('camera permission is optional; microphone permission is required',async({page})=>{
  await mockAI(page,{denyCamera:true,denyMic:true});await setup(page);await begin(page);
  await expect(page.getByText('Microphone chưa được cho phép. Hãy cấp quyền rồi kết nối lại.',{exact:true})).toBeVisible();
  await expect(page.getByText('Chưa mở được camera. Bạn vẫn có thể phỏng vấn bằng micro.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Bật camera',exact:true})).toBeEnabled();
  await expect(page.locator('[data-push-talk]')).toBeDisabled();
});

test('camera toggles, pointer release sends once, focus loss cancels, navigation stops all tracks',async({page})=>{
  await mockAI(page);await setup(page);await begin(page);const button=page.locator('[data-push-talk]');await expect(button).toBeEnabled();
  await expect(page.getByRole('button',{name:'Tắt camera',exact:true})).toBeEnabled();await page.screenshot({path:'artifacts/realtime-room-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Tắt camera',exact:true}).click();expect(await page.evaluate(()=>window.testStreams.filter(s=>s.getVideoTracks().length).every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  await page.getByRole('button',{name:'Bật camera',exact:true}).click();await expect(page.getByRole('button',{name:'Tắt camera',exact:true})).toBeEnabled();
  await button.focus();await page.keyboard.down('Space');await expect(page.getByText('Đang lắng nghe',{exact:true})).toBeVisible();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('Space');
  expect(await page.evaluate(()=>window.rtcEvents.filter(e=>e.type==='input_audio_buffer.commit').length)).toBe(0);
  const box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();await expect(page.getByText(answer,{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.rtcEvents.filter(e=>e.type==='input_audio_buffer.commit').length)).toBe(1);
  await page.getByRole('button',{name:'Tổng quan',exact:true}).click();expect(await page.evaluate(()=>window.testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
});

test('evaluation failure persists transcript and retries after reload without sample scores',async({page})=>{
  await mockAI(page,{failEvaluation:true});await setup(page);await begin(page);await expect(page.locator('[data-push-talk]')).toBeEnabled();await speak(page);
  await expect(page.getByRole('button',{name:'Kết thúc phỏng vấn',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Kết thúc phỏng vấn',exact:true}).click();
  await expect(page.getByRole('button',{name:'Thử đánh giá lại'})).toBeVisible();await expect(page.locator('.score-circle')).toHaveCount(0);await page.reload();await expect(page.getByRole('button',{name:'Thử đánh giá lại'})).toBeVisible();
  await page.route('**/api/evaluate',route=>route.fulfill({json:evaluation}));await page.getByRole('button',{name:'Thử đánh giá lại'}).click();await expect(page.locator('.score-circle strong')).toHaveText('8');
});

test('late evaluation cannot recreate deleted history',async({page})=>{
  await mockAI(page);await setup(page);await begin(page);await expect(page.locator('[data-push-talk]')).toBeEnabled();await speak(page);
  let release;const gate=new Promise(resolve=>release=resolve);await page.route('**/api/evaluate',async route=>{await gate;await route.fulfill({json:evaluation}).catch(()=>{});});
  await expect(page.getByRole('button',{name:'Kết thúc phỏng vấn',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Kết thúc phỏng vấn',exact:true}).click();await expect(page.getByText('AI đang xem lại buổi phỏng vấn của bạn')).toBeVisible();
  await page.evaluate(()=>localStorage.setItem('unrelated-app','keep'));await page.getByRole('button',{name:'Cài đặt',exact:true}).first().click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Xóa toàn bộ dữ liệu',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Phỏng vấn tự tin. Nắm bắt cơ hội.'})).toBeVisible();release();
  await page.goto('/#history');await expect(page.getByText('Hành trình của bạn bắt đầu tại đây')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('unrelated-app'))).toBe('keep');
});

test('guest mock upgrade persists without real payment',async({page})=>{
  await page.goto('/#pricing');await page.getByRole('button',{name:'Chọn Premium',exact:true}).click();
  await page.getByLabel('Tên của bạn',{exact:true}).fill('Ứng viên thử nghiệm');await page.getByLabel('Email',{exact:true}).fill('demo@example.com');await page.locator('form').getByRole('button',{name:'Tạo tài khoản miễn phí'}).click();
  await expect(page.getByRole('heading',{name:'Thanh toán',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Thanh toán giả lập · 99.000 VNĐ'})).toBeDisabled();
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Thanh toán giả lập · 99.000 VNĐ'}).click();await expect(page.getByRole('heading',{name:'Thanh toán thành công'})).toBeVisible();
  await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('interviewai:subscription')))).toBe('Premium');
});

test('mobile pages and voice room fit the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mockAI(page);
  for(const route of ['home','dashboard','library','pricing','register','profile','settings','plans']){await page.goto('/#'+route);await expect(page.locator('h1,h2').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),route).toBe(true);}
  await setup(page);await begin(page);await expect(page.locator('[data-push-talk]')).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'artifacts/realtime-room-mobile.png',fullPage:true});
});
