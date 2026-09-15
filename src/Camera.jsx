import React,{useEffect,useRef,useState} from 'react';
import {Button} from './ui.jsx';
export default function Camera(){
  const video=useRef(null),life=useRef({alive:true,generation:0});
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[note,setNote]=useState(''),[movement,setMovement]=useState('Đang khởi động…');
  function stop(){const r=life.current;r.generation++;r.stream?.getTracks().forEach(t=>t.stop());r.stream=null;clearInterval(r.interval);r.detector?.close();r.detector=null;if(video.current)video.current.srcObject=null;}
  async function start(){
    const r=life.current;const generation=++r.generation;setBusy(true);setNote('');setMovement('Đang khởi động…');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
      if(!r.alive || generation!==r.generation){stream.getTracks().forEach(t=>t.stop());return;}
      r.stream=stream;setEnabled(true);video.current.srcObject=stream;await video.current.play();
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
  return <section className="card candidate-camera"><div className="row between"><h3>Camera của bạn</h3><Button kind="secondary" disabled={busy} onClick={()=>{if(enabled){stop();setEnabled(false);}else start();}}>{busy?'Đang mở…':enabled?'Tắt camera':'Bật camera'}</Button></div><div className="camera-frame"><video ref={video} autoPlay muted playsInline aria-label="Hình ảnh camera của bạn"/>{!enabled && <span>Camera đang tắt</span>}</div>{note && <p className="tiny" role="status">{note}</p>}{enabled && <p className="tiny">Chuyển động khuôn mặt: {movement}</p>}<small>Camera chỉ hiển thị và xử lý trên thiết bị, không ghi hình. Tín hiệu chuyển động không dùng để chấm điểm.</small></section>;
}
