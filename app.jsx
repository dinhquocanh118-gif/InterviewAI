import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Brand,Button,Icon,Empty,ErrorNote} from './src/ui.jsx';
import {readSetting,writeSetting,listSessions,saveSession,getCV,clearData} from './src/storage.js';
import {defaultSetup,plans,stats} from './src/domain.js';
import Interview from './src/Interview.jsx';
import {Home,Pricing,Auth,Checkout} from './src/Public.jsx';
import {PageHeading,Dashboard,Library,History,Setup,Profile,Results,Settings} from './src/Pages.jsx';
const navItems=[['dashboard','grid','Tổng quan'],['library','book','Thư viện phỏng vấn'],['history','clock','Lịch sử phỏng vấn'],['profile','user','Hồ sơ'],['settings','settings','Cài đặt'],['plans','spark','Gói dịch vụ']];
const pages={home:'Trang chủ',dashboard:'Tổng quan',library:'Thư viện phỏng vấn',history:'Lịch sử phỏng vấn',profile:'Hồ sơ',settings:'Cài đặt',plans:'Gói dịch vụ',setup:'Buổi phỏng vấn mới',room:'Phòng phỏng vấn AI',results:'Kết quả',pricing:'Bảng giá',login:'Đăng nhập',register:'Tạo tài khoản',checkout:'Thanh toán',success:'Nâng cấp thành công'};
const currentRoute=()=>location.hash.slice(1).split('?')[0] || 'home';
const guestMessage='Bạn đang sử dụng InterviewAI với tư cách khách. Dữ liệu của bạn chỉ được lưu trên thiết bị này. Hãy tạo tài khoản để đồng bộ tiến trình trên nhiều thiết bị.';
function App(){
  const [route,setRoute]=useState(currentRoute);
  const [account,setAccount]=useState(()=>readSetting('account',null));
  const [profile,setProfile]=useState(()=>readSetting('profile',{name:'',email:'',skills:'',experience:''}));
  const [subscription,setSubscription]=useState(()=>readSetting('subscription','Free'));
  const [pendingPlan,setPendingPlan]=useState(()=>readSetting('pendingPlan','Premium'));
  const [sessions,setSessions]=useState([]),[cv,setCV]=useState(null),[loaded,setLoaded]=useState(false);
  const [storageError,setStorageError]=useState(''),[toast,setToast]=useState('');
  const [setup,setSetup]=useState(()=>({...defaultSetup,...readSetting('recentSetup',{})}));
  const [activeId,setActiveId]=useState(()=>readSetting('activeSession',null));
  useEffect(()=>{
    const onHash=()=>{setRoute(pages[currentRoute()]?currentRoute():'home');window.scrollTo(0,0);};
    window.addEventListener('hashchange',onHash);
    Promise.all([listSessions(),getCV()]).then(([history,file])=>{setSessions(history);setCV(file || null);}).catch(()=>setStorageError('Không truy cập được bộ nhớ trình duyệt. Hãy cho phép lưu dữ liệu để giữ lịch sử và CV.')).finally(()=>setLoaded(true));
    return()=>window.removeEventListener('hashchange',onHash);
  },[]);
  useEffect(()=>{if(toast){const timeout=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timeout);}},[toast]);
  useEffect(()=>{document.title=`${pages[route] || 'Trang chủ'} · InterviewAI`;},[route]);
  function persist(key,value){try{writeSetting(key,value);return true;}catch{setStorageError('Không lưu được cài đặt. Bộ nhớ thiết bị có thể đầy hoặc bị chặn.');return false;}}
  function go(next){location.hash=next;setRoute(next);window.scrollTo(0,0);}
  function updateSession(session){setSessions(previous=>[session,...previous.filter(s=>s.id!==session.id)].sort((a,b)=>b.startedAt-a.startedAt));}
  function selectSession(session){setActiveId(session.id);persist('activeSession',session.id);go(session.completedAt?'results':'room');}
  function startSetup(preset){setSetup({...defaultSetup,...(preset || readSetting('recentSetup',{})),skills:preset?.skills || profile.skills || '',experience:preset?.experience || profile.experience || ''});go('setup');}
  function choosePlan(name){if(name==='Free'){startSetup();return;}setPendingPlan(name);persist('pendingPlan',name);persist('afterAuth','checkout');go(account?'checkout':'register');}
  function authenticate(details){const next={name:details.name,email:details.email,prototype:true};if(!persist('account',next))return;setAccount(next);const p={...profile,name:details.name,email:details.email};persist('profile',p);setProfile(p);const target=readSetting('afterAuth','dashboard');persist('afterAuth','dashboard');if(target==='setup')startSetup();else go(target==='checkout'?'checkout':'dashboard');}
  function openAuth(){persist('afterAuth','dashboard');go('register');}
  async function reset(){if(!window.confirm('Xóa toàn bộ dữ liệu InterviewAI trên thiết bị này? Hành động này không thể hoàn tác.'))return;try{await clearData();setSessions([]);setCV(null);setProfile({name:'',email:'',skills:'',experience:''});setAccount(null);setSubscription('Free');setActiveId(null);setPendingPlan('Premium');setSetup(defaultSetup);setStorageError('');go('home');setToast('Đã xóa toàn bộ dữ liệu InterviewAI.');}catch{setStorageError('Chưa xóa hết dữ liệu. Hãy thử lại.');}}
  const active=sessions.find(s=>s.id===activeId),metrics=stats(sessions);
  const isPublic=['home','pricing','login','register'].includes(route);
  const memberName=account?.name || profile.name || 'bạn';
  const entry=()=>{if(account){startSetup();return;}persist('afterAuth','setup');go('login');};
  const authNav=target=>{persist('afterAuth','dashboard');go(target);};
  function content(){
    if(!loaded && !isPublic)return <Empty title="Đang tải dữ liệu trên thiết bị…"/>;
    switch(route){
      case 'home':return <Home entry={entry} go={go} choosePlan={choosePlan}/>;
      case 'pricing':return <div className="public-section"><Pricing choosePlan={choosePlan}/></div>;
      case 'login':case 'register':return <Auth mode={route} account={account} onAuth={authenticate} onGuest={()=>{persist('afterAuth','dashboard');startSetup();}} onSwitch={()=>go(route==='login'?'register':'login')}/>;
      case 'dashboard':return <Dashboard memberName={memberName} sessions={sessions} setup={setup} startSetup={startSetup} go={go} selectSession={selectSession}/>;
      case 'library':return <Library startSetup={startSetup}/>;
      case 'history':return <><PageHeading eyebrow="NHÌN LẠI ĐỂ TIẾN XA HƠN" title="Lịch sử phỏng vấn" text="Mọi câu trả lời, nhận xét và bước tiến của bạn trên thiết bị này."/><History sessions={sessions} onSelect={selectSession} onStart={()=>startSetup()}/></>;
      case 'setup':return <Setup setup={setup} setSetup={setSetup} cv={cv} setCV={setCV} onCancel={()=>go('library')} onStart={async()=>{
        if(subscription==='Free' && metrics.monthly>=3){go('plans');setToast('Bạn đã dùng 3 buổi miễn phí trong tháng. Chọn gói để luyện tiếp.');return;}
        const session={id:crypto.randomUUID(),startedAt:Date.now(),reportPlan:subscription,transcript:[],durationSeconds:0,setup:{...setup,cvText:cv?.text || '',cvName:cv?.name || ''}};
        await saveSession(session);updateSession(session);setActiveId(session.id);persist('activeSession',session.id);persist('recentSetup',setup);go('room');
      }}/>;
      case 'room':return active && !active.completedAt?<Interview key={active.id} session={active} onSave={updateSession} onFinish={s=>{updateSession(s);go('results');}}/>:<Empty title="Chưa có buổi phỏng vấn đang diễn ra" action={<Button onClick={()=>startSetup()}>Tạo buổi phỏng vấn</Button>}/>;
      case 'results':return active?.completedAt?<Results key={active.id} session={active} onSave={updateSession} onNext={()=>startSetup(active.setup)} onDashboard={()=>go('dashboard')}/>:<Empty title="Chưa có kết quả" action={<Button onClick={()=>go('history')}>Xem lịch sử phỏng vấn</Button>}>Hoàn thành một buổi luyện để nhận đánh giá cá nhân hóa.</Empty>;
      case 'profile':return <Profile profile={profile} cv={cv} setCV={setCV} onSave={p=>{if(persist('profile',p)){setProfile(p);setToast('Đã lưu hồ sơ trên thiết bị này.');}}}/>;
      case 'settings':return <Settings account={account} onAuth={openAuth} onReset={reset}/>;
      case 'plans':return <><PageHeading title="Đầu tư cho cơ hội tiếp theo" text="Chọn gói phù hợp với hành trình luyện tập của bạn."/><div className="notice row between wrap"><span>Gói hiện tại: <strong>{subscription}</strong>{subscription!=='Free'?' · Mô phỏng':` · ${metrics.monthly}/3 buổi trong tháng`}</span><span>Dữ liệu được lưu trên thiết bị này</span></div><Pricing choosePlan={choosePlan} current={subscription} compact/></>;
      case 'checkout':return account?<Checkout plan={plans.find(p=>p.name===pendingPlan) || plans[1]} account={account} onBack={()=>go('plans')} onSuccess={()=>{if(persist('subscription',pendingPlan)){setSubscription(pendingPlan);go('success');}}}/>:<Auth mode="register" account={account} onAuth={details=>{persist('afterAuth','checkout');authenticate(details);}} onGuest={()=>startSetup()} onSwitch={()=>{persist('afterAuth','checkout');go('login');}}/>;
      case 'success':return <div className="success card"><span className="success-icon"><Icon name="check" size={45}/></span><span className="pill">THANH TOÁN GIẢ LẬP</span><h1>Thanh toán thành công</h1><p>Chào mừng bạn đến với InterviewAI {subscription}.</p><p className="muted">Gói mô phỏng đã được cập nhật trên thiết bị này.<br/>Không có khoản tiền nào bị trừ.</p><Button icon="arrow" onClick={()=>go('dashboard')}>Về Tổng quan</Button></div>;
      default:return <Home entry={entry} go={go} choosePlan={choosePlan}/>;
    }
  }
  function section(id){go('home');setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}),50);}
  return <>{isPublic?<><header className="public-header"><Brand onClick={()=>go('home')}/><nav><button onClick={()=>section('features')}>Tính năng</button><button onClick={()=>section('how')}>Cách hoạt động</button><button onClick={()=>go('pricing')}>Bảng giá</button></nav><div className="row"><button className="text-button" onClick={()=>account?go('dashboard'):authNav('login')}>{account?'Tổng quan':'Đăng nhập'}</button><Button onClick={entry}>Dùng thử miễn phí <Icon name="arrow" size={16}/></Button></div></header><main><ErrorNote>{storageError}</ErrorNote>{content()}</main><footer className="public-footer"><Brand onClick={()=>go('home')}/><p>Luyện tập hôm nay. Tự tin ngày mai.</p><span>© {new Date().getFullYear()} InterviewAI · Bản thử nghiệm</span></footer></>:<div className="app-shell"><aside className="sidebar"><Brand onClick={()=>go('home')}/><span className="nav-label">KHÔNG GIAN LUYỆN TẬP</span><nav>{navItems.map(([key,icon,label])=><button key={key} className={route===key?'active':''} onClick={()=>go(key)}><Icon name={icon}/>{label}{route===key && <span className="nav-dot"/>}</button>)}</nav><div className="sidebar-bottom"><div className="upgrade-card"><span className="tile"><Icon name="spark"/></span><h3>Mở khóa tiềm năng</h3><p>Luyện nhiều hơn.<br/>Sẵn sàng hơn với Premium.</p><Button onClick={()=>go('plans')}>Khám phá các gói <Icon name="arrow" size={16}/></Button></div><button className="sidebar-account" onClick={()=>go('profile')}><span className="avatar">{memberName==='bạn'?'K':memberName.charAt(0).toUpperCase()}</span><span><strong>{account?.name || 'Người dùng khách'}</strong><small>Gói {subscription}{subscription!=='Free'?' · Mô phỏng':''}</small></span><Icon name="settings" size={17}/></button></div></aside><div className="app-body"><header className="app-header"><div className="breadcrumb">Không gian của bạn <span>/</span> <strong>{pages[route]}</strong></div><div className="row"><span className="device-label"><i/> Lưu trên thiết bị</span><button className="icon-button" aria-label="Cài đặt" onClick={()=>go('settings')}><Icon name="settings"/></button></div></header><main className="app-main">{!account && route!=='room' && <div className="guest-banner"><Icon name="lock"/><div><p>{guestMessage}</p><small>Đồng bộ nhiều thiết bị sẽ có trong phiên bản chính thức.</small></div><button className="text-button" onClick={openAuth}>Tạo tài khoản miễn phí <Icon name="arrow" size={16}/></button></div>}<ErrorNote>{storageError}</ErrorNote>{content()}</main></div></div>}{toast && <div className="toast" role="status"><Icon name="check"/>{toast}</div>}</>;
}
createRoot(document.getElementById('root')).render(<App/>);

