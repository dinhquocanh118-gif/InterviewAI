import React,{useEffect,useState} from 'react';

const roomImages={
  hr:'/assets/backgrounds/hr.jpg',
  interview:'/assets/backgrounds/user-interview.png',
  office:'/assets/backgrounds/user-office.png',
  meeting:'/assets/backgrounds/user-meeting.png',
};

export function RoomScene({kind='interview'}){
  return <img className="room-scene" src={roomImages[kind]||roomImages.interview} alt="" aria-hidden="true" draggable="false"/>;
}

export function VirtualHR({speaking,muted}){
  return <div className={`hr-stage ${speaking&&!muted?'is-speaking':''}`} role="img" aria-label={`Nhân vật HR ảo 2D${speaking&&!muted?' đang nói':''}`}>
    <RoomScene kind="hr"/><div className="hr-aura"/>
    <svg className="hr-avatar" viewBox="0 0 320 330" aria-hidden="true">
      <ellipse cx="160" cy="321" rx="111" ry="9" fill="#45385e" opacity=".12"/>
      <g className="hr-body"><path d="M62 326L72 258Q84 220 137 217H183Q236 220 248 258L258 326" fill="#514567"/>
      <path d="M133 219L160 282L188 219" fill="#faf5ef"/><path d="M132 219L114 252L146 270L160 314L134 229M189 219L205 253L175 273L160 314" fill="#716080"/>
      <path d="M140 185V224Q160 246 180 224V185" fill="#deb091"/>
      <g className="hr-head"><path d="M98 174Q76 59 144 47Q223 24 228 123L218 215L191 224L126 220L96 221Z" fill="#40323d"/>
      <ellipse cx="160" cy="137" rx="57" ry="73" fill="#f0c5a4"/>
      <path d="M101 133Q90 68 143 56Q214 37 221 126Q185 111 171 81Q144 119 101 133" fill="#493742"/>
      <path d="M123 134Q135 129 144 134M176 134Q187 129 197 134" fill="none" stroke="#654c49" strokeWidth="3" strokeLinecap="round"/>
      <g className="hr-eyes"><ellipse cx="135" cy="145" rx="4" ry="5" fill="#3e3541"/><ellipse cx="187" cy="145" rx="4" ry="5" fill="#3e3541"/></g>
      <path d="M159 147L155 166H163" fill="none" stroke="#cd977d" strokeWidth="2" strokeLinecap="round"/>
      <ellipse className="hr-mouth" cx="160" cy="183" rx="12" ry="3" fill="#9c5260"/>
      <circle cx="111" cy="169" r="4" fill="#eccea1"/><circle cx="209" cy="169" r="4" fill="#eccea1"/></g>
      <rect x="198" y="269" width="26" height="18" rx="3" fill="#d9cce7"/><path d="M203 275H219M203 280H214" stroke="#867298" strokeWidth="2"/></g>
    </svg><span className="hr-name">Linh <i/> Virtual HR</span><span className="studio-badge">AI INTERVIEW STUDIO</span>
  </div>;
}

export function useSpeakingMeter(stream,listening){
  const [meter,setMeter]=useState({level:0,hint:'',available:false});
  useEffect(()=>{
    setMeter({level:0,hint:'',available:false});
    if(!stream||!listening)return;
    let context,source,interval,disposed=false;
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      context=new AudioContext();source=context.createMediaStreamSource(stream);
      const analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);
      const samples=new Float32Array(analyser.fftSize);let lastVoice=performance.now(),quietSince=0;
      context.resume().catch(()=>{});
      interval=setInterval(()=>{
        if(disposed)return;
        if(context.state!=='running'){setMeter({level:0,hint:'Chưa đo được âm lượng micro.',available:false});return;}
        analyser.getFloatTimeDomainData(samples);
        const rms=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length),now=performance.now();
        if(rms>.008)lastVoice=now;
        if(rms>.002&&rms<.025){if(!quietSince)quietSince=now;}else quietSince=0;
        const hint=now-lastVoice>4500?'Bạn có thể tiếp tục khi sẵn sàng.':quietSince&&now-quietSince>2200?'Thử nói rõ hơn hoặc đưa micro gần hơn.':'';
        setMeter({level:Math.min(1,rms*9),hint,available:true});
      },80);
    }catch{setMeter({level:0,hint:'Thiết bị chưa hỗ trợ đo âm lượng.',available:false});}
    return()=>{disposed=true;clearInterval(interval);source?.disconnect();context?.close().catch(()=>{});};
  },[stream,listening]);
  return meter;
}

export function VoiceWave({level=0}){
  const strength=Math.sqrt(Math.max(0,Math.min(1,level)));
  return <div className="voice-wave" aria-hidden="true">{Array.from({length:25},(_,i)=><i key={i} style={{height:`${4+strength*36*(.3+.7*Math.abs(Math.sin(i*1.8)))}px`}}/>)}</div>;
}

export function SpeakingIndicator({meter,listening,pace}){
  const hint=listening?meter.hint:pace;
  return <div className={`speaking-indicator ${hint?'has-hint':''}`}>
    <div className="row between"><span>{listening?'Micro đang nghe':'AR · Nhịp nói'}</span><VoiceWave level={listening?meter.level:0}/></div>
    <p role="status">{hint||(listening?'Cứ thoải mái trình bày ý của bạn.':'Giữ nút nói để bật phản hồi trực tiếp.')}</p>
    <small>Tín hiệu tham khảo, không dùng để chấm điểm. Tốc độ được ước lượng sau mỗi lượt.</small>
  </div>;
}
