import React,{useEffect,useRef,useState} from 'react';
import {Button} from './ui.jsx';
import {RoomScene,SpeakingIndicator,VoiceWave} from './VirtualStudio.jsx';
export default function Camera({meter={level:0},listening=false,pace=''}){
  const canvas=useRef(null);
  const [background,setBackground]=useState('interview'),[backgroundStatus,setBackgroundStatus]=useState('off'),[backgroundRetry,setBackgroundRetry]=useState(0);
  const video=useRef(null),life=useRef({alive:true,generation:0});
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[movement,setMovement]=useState('Đang khởi động…');
  function stop(){const r=life.current;r.generation++;r.stream?.getTracks().forEach(t=>t.stop());r.stream=null;clearInterval(r.interval);r.detector?.close();r.detector=null;if(video.current)video.current.srcObject=null;}
  async function start(){
    const r=life.current;const generation=++r.generation;setBusy(true);setNote('');setMovement('Đang khởi động…');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
      if(!r.alive || generation!==r.generation){stream.getTracks().forEach(t=>t.stop());return;}
      r.stream=stream;setEnabled(true);video.current.srcObject=stream;await video.current.play();
      if(!r.alive || generation!==r.generation)return;
      setBusy(false);
      try{
        const {FaceLandmarker,FilesetResolver}=await import('@mediapipe/tasks-vision');
        const fileset=await FilesetResolver.forVisionTasks('/assets/vision/wasm');
        if(!r.alive || generation!==r.generation)return;
        const detector=await FaceLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:'/assets/vision/face_landmarker.task'},runningMode:'VIDEO',outputFaceBlendshapes:true,numFaces:1});
        if(!r.alive || generation!==r.generation){detector.close();return;}r.detector=detector;
        r.interval=setInterval(()=>{
          if(!video.current?.videoWidth)return;
          try{const results=detector.detectForVideo(video.current,performance.now());const categories=results.faceBlendshapes?.[0]?.categories || [];const top=categories.filter(c=>c.categoryName!=='_neutral').sort((a,b)=>b.score-a.score)[0];setMovement(top?`${top.categoryName} · ${Math.round(top.score*100)}%`:'Chưa thấy khuôn mặt');}catch{setMovement('Chưa đọc được chuyển động');}
        },1000);
      }catch{if(r.alive&&generation===r.generation)setMovement('Phân tích chuyển động chưa khả dụng');}
    }catch{if(r.alive&&generation===r.generation){stop();setEnabled(false);setNote('Chưa mở được camera. Bạn vẫn có thể phỏng vấn bằng micro.');}}
    finally{if(r.alive&&generation===r.generation)setBusy(false);else if(r.alive&&!r.stream)setBusy(false);}
  }
  useEffect(()=>{life.current.alive=true;start();return()=>{life.current.alive=false;stop();};},[]);
  useEffect(()=>{
    if(!enabled||background==='none'){setBackgroundStatus('off');return;}
    let disposed=false,segmenter,interval;
    setBackgroundStatus('loading');
    async function load(){
      try{
        const {ImageSegmenter,FilesetResolver}=await import('@mediapipe/tasks-vision');
        const fileset=await FilesetResolver.forVisionTasks('/assets/vision/wasm');
        if(disposed)return;
        const model=await ImageSegmenter.createFromOptions(fileset,{baseOptions:{modelAssetPath:'/assets/vision/selfie_segmenter.tflite'},runningMode:'VIDEO',outputConfidenceMasks:true,outputCategoryMask:false});
        if(disposed){model.close();return;}segmenter=model;
        const maskCanvas=document.createElement('canvas'),maskContext=maskCanvas.getContext('2d');
        const input=document.createElement('canvas');input.width=640;input.height=360;const inputContext=input.getContext('2d');
        let lastTime=-1;
        interval=setInterval(()=>{
          const v=video.current,out=canvas.current;
          if(disposed||!v?.videoWidth||!out||v.currentTime===lastTime||document.hidden)return;
          lastTime=v.currentTime;
          try{
            // Snapshot once so the mask and foreground use exactly the same frame.
            inputContext.drawImage(v,0,0,640,360);
            segmenter.segmentForVideo(input,performance.now(),result=>{
              const mask=result.confidenceMasks[0],values=mask.getAsFloat32Array();
              maskCanvas.width=mask.width;maskCanvas.height=mask.height;
              const pixels=maskContext.createImageData(mask.width,mask.height);
              for(let i=0;i<values.length;i++)pixels.data[i*4+3]=Math.round(Math.max(0,Math.min(1,(values[i]-.25)/.5))*255);
              maskContext.putImageData(pixels,0,0);
              const ctx=out.getContext('2d');ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,640,360);ctx.drawImage(input,0,0);
              ctx.globalCompositeOperation='destination-in';ctx.drawImage(maskCanvas,0,0,640,360);ctx.globalCompositeOperation='source-over';
            });
            setBackgroundStatus('ready');
          }catch{clearInterval(interval);segmenter?.close();segmenter=null;setBackgroundStatus('error');}
        },100);
      }catch{if(!disposed)setBackgroundStatus('error');}
    }
    load();return()=>{disposed=true;clearInterval(interval);segmenter?.close();};
  },[enabled,background,backgroundRetry]);
  const composite=enabled&&background!=='none'&&backgroundStatus==='ready';
  const voiceLevel=listening?Math.max(0,Math.min(1,meter.level)):0;
  const voiceStrength=Math.sqrt(voiceLevel);
  return <section className="card candidate-camera"><div className="row between"><h3>Camera của bạn</h3><Button kind="secondary" disabled={busy} onClick={()=>{if(enabled){stop();setEnabled(false);}else start();}}>{busy?'Đang mở…':enabled?'Tắt camera':'Bật camera'}</Button></div>
    <div className={`camera-frame ${composite?'composited':''} ${voiceLevel>.04?'voice-active':''}`} style={{'--voice-glow':`${4+voiceStrength*18}px`,'--voice-strength':voiceStrength,'--voice-depth':`${18+voiceStrength*34}px`}}>
      {composite&&<RoomScene kind={background}/>}<video ref={video} autoPlay muted playsInline aria-label="Hình ảnh camera của bạn"/><canvas ref={canvas} width="640" height="360" aria-label="Camera đã tách nền"/>{!enabled && <span>Camera đang tắt</span>}
      <div className="camera-voice-glow" aria-hidden="true"/>
      <div className={`camera-voice-wave ${listening?'is-listening':''}`} aria-hidden="true"><VoiceWave level={voiceLevel}/></div>
      {enabled&&<span className="camera-label">Bạn · {listening?'Đang trả lời':'Sẵn sàng'}</span>}
    </div>
    <fieldset className="background-picker"><legend>Nền phỏng vấn</legend>{[['none','Nền thật'],['interview','Phỏng vấn'],['office','Văn phòng'],['meeting','Phòng họp']].map(([value,label])=><button key={value} type="button" aria-pressed={background===value} onClick={()=>{setBackground(value);if(backgroundStatus==='error')setBackgroundRetry(n=>n+1);}}>{value==='none'?<div className="original-background" aria-hidden="true"/>:<RoomScene kind={value}/>}<span>{label}</span></button>)}</fieldset>
    {enabled&&background!=='none'&&<p className="tiny" role="status">{backgroundStatus==='ready'?'Đã bật tách nền trên thiết bị.':backgroundStatus==='error'?'Chưa tách được nền. Đang hiển thị camera gốc; chọn lại nền để thử lại.':'Đang tải bộ tách nền…'}</p>}
    <SpeakingIndicator meter={meter} listening={listening} pace={pace}/>
    {note && <p className="tiny" role="status">{note}</p>}{enabled && <p className="tiny">Chuyển động khuôn mặt: {movement}</p>}<small>Camera chỉ hiển thị và xử lý trên thiết bị, không ghi hình. Tín hiệu chuyển động không dùng để chấm điểm.</small></section>;
}
