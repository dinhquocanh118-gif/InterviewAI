import {test,expect} from '@playwright/test';
import {mockAI,setup,begin} from './realtime-fixture.js';

test('virtual backgrounds render locally and release camera when disabled',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockAI(page);await setup(page);await begin(page);
  await expect(page.locator('[data-push-talk]')).toBeEnabled();
  await expect(page.getByRole('img',{name:'Nhân vật HR ảo 2D',exact:true})).toBeVisible();
  await expect(page.locator('.hr-stage .room-scene')).toHaveAttribute('src','/assets/backgrounds/hr.jpg');
  await expect(page.getByRole('button',{name:'Phỏng vấn',exact:true})).toHaveAttribute('aria-pressed','true');
  for(const label of ['Phỏng vấn','Văn phòng','Phòng họp']){
    await page.getByRole('button',{name:label,exact:true}).click();
    await expect(page.getByText('Đã bật tách nền trên thiết bị.',{exact:true})).toBeVisible({timeout:30000});
    await expect(page.locator('.camera-frame')).toHaveClass(/composited/);
    await expect(page.getByLabel('Camera đã tách nền')).toBeVisible();
    expect(await page.locator('.camera-frame .room-scene').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  }
  await page.screenshot({path:'artifacts/virtual-studio-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Nền thật',exact:true}).click();
  await expect(page.locator('.camera-frame')).not.toHaveClass(/composited/);
  await page.getByRole('button',{name:'Tắt camera',exact:true}).click();
  expect(await page.evaluate(()=>window.testStreams.filter(s=>s.getVideoTracks().length).every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
  expect(errors).toEqual([]);
});

for(const viewport of [{width:1440,height:900},{width:1366,height:768},{width:390,height:844}]){
  test(`holding Space and receiving transcripts do not scroll the page at ${viewport.width}`,async({page})=>{
    await page.setViewportSize(viewport);
    await mockAI(page);await setup(page);await begin(page);
    await expect(page.locator('[data-push-talk]')).toBeEnabled();
    await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
    const initial=await page.evaluate(()=>window.scrollY);
    await page.keyboard.down('Space');
    for(let i=0;i<8;i++)await page.keyboard.down('Space');
    await expect(page.locator('.live-status')).toContainText('Đang lắng nghe');
    await page.waitForTimeout(400);
    expect(await page.evaluate(()=>window.scrollY)).toBe(initial);
    await page.keyboard.up('Space');
    await expect(page.locator('.message.user')).toHaveCount(1);
    await expect(page.locator('.message.bot')).toHaveCount(2);
    await page.evaluate(()=>{
      const connection=window.rtcConnections.at(-1);
      for(let i=0;i<12;i++){
        connection.emit({type:'response.created',response:{id:`response-long-${i}`}});
        connection.emit({type:'response.output_audio_transcript.done',item_id:`long-${i}`,transcript:'Câu hỏi phỏng vấn mở rộng. '.repeat(30)});
        connection.emit({type:'response.done',response:{status:'completed'}});
      }
    });
    await expect(page.locator('.message.bot')).toHaveCount(14);
    await page.waitForTimeout(300);
    expect(await page.evaluate(()=>window.scrollY)).toBe(initial);
    expect(await page.locator('.transcript').evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight)).toBeLessThan(2);
    if(viewport.width>900){
      await expect(page.locator('.hr-stage')).toBeInViewport({ratio:1});
      await expect(page.locator('.camera-frame')).toBeInViewport({ratio:1});
    }
    await page.screenshot({path:`artifacts/interview-backgrounds-${viewport.width}.png`,fullPage:true});
  });
}

test('background failure falls back; HR animation follows playback and mute',async({page})=>{
  await mockAI(page);await page.route('**/selfie_segmenter.tflite',route=>route.abort());
  await setup(page);await begin(page);await expect(page.locator('[data-push-talk]')).toBeEnabled();
  await page.getByRole('button',{name:'Văn phòng',exact:true}).click();
  await expect(page.getByText(/Chưa tách được nền/)).toBeVisible({timeout:30000});
  await expect(page.locator('.camera-frame')).not.toHaveClass(/composited/);
  await page.evaluate(()=>window.rtcConnections.at(-1).emit({type:'output_audio_buffer.started'}));
  await expect(page.locator('.hr-stage')).toHaveClass(/is-speaking/);
  await page.getByRole('button',{name:'Tắt giọng AI',exact:true}).click();
  await expect(page.locator('.hr-stage')).not.toHaveClass(/is-speaking/);
  await page.getByRole('button',{name:'Bật giọng AI',exact:true}).click();
  await expect(page.locator('.hr-stage')).toHaveClass(/is-speaking/);
  await page.evaluate(()=>window.rtcConnections.at(-1).emit({type:'output_audio_buffer.stopped'}));
  await expect(page.locator('.hr-stage')).not.toHaveClass(/is-speaking/);
});

test('AR gives a gentle silence cue only while holding the microphone',async({page})=>{
  await mockAI(page);await setup(page);await begin(page);await expect(page.locator('[data-push-talk]')).toBeEnabled();
  // Replace microphone analysis with a silent sample buffer, preserving real device lifecycle.
  await page.evaluate(()=>{window.testMicLevel=.01;AnalyserNode.prototype.getFloatTimeDomainData=function(buffer){buffer.fill(window.testMicLevel);};});
  await page.locator('[data-push-talk]').focus();await page.keyboard.down('Space');
  await expect(page.getByText('Thử nói rõ hơn hoặc đưa micro gần hơn.',{exact:true})).toBeVisible({timeout:8000});
  await page.evaluate(()=>{window.testMicLevel=.1;});
  await expect(page.locator('.camera-frame')).toHaveClass(/voice-active/);
  await page.evaluate(()=>{window.testMicLevel=0;});
  await expect(page.getByText('Bạn có thể tiếp tục khi sẵn sàng.',{exact:true})).toBeVisible({timeout:12000});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('Space');
  await expect(page.getByText('Bạn có thể tiếp tục khi sẵn sàng.',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Tổng quan',exact:true}).click();
  expect(await page.evaluate(()=>window.testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
});
