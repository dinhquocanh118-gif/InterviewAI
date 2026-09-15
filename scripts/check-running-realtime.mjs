// Verify the actual running server, using an isolated browser and fake microphone.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
try{
  const page=await browser.newPage();page.setDefaultTimeout(60000);
  await page.addInitScript(()=>{
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=constraints=>constraints.video?Promise.reject(new DOMException('Camera disabled for verification','NotAllowedError')):original(constraints);
  });
  await page.goto('http://localhost:3000');
  await page.getByRole('button',{name:'Bắt đầu phỏng vấn miễn phí',exact:true}).first().click();
  await page.getByRole('button',{name:'Tiếp tục không cần tài khoản',exact:true}).click();
  await page.getByLabel('Tên vị trí',{exact:true}).fill('Nhân viên bán hàng');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  const negotiation=page.waitForResponse('**/api/rtc/session');
  await page.getByRole('button',{name:'Bắt đầu phỏng vấn',exact:true}).click();
  const response=await negotiation;assert.equal(response.status(),200);console.log('PASS: running localhost:3000 /api/rtc/session returns 200.');
  await page.waitForFunction(()=>document.querySelector('[data-push-talk]')?.disabled===false);
  const question=await page.locator('.current-question').innerText();assert.ok(question.length>10);console.log('PASS: AI opening audio finished and microphone answer control is enabled.');
}finally{await browser.close();}
