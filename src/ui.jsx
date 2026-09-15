import React from 'react';
const paths = {
  spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3',
  grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  book:'M12 5v16M3 3l9 2 9-2v16l-9 2-9-2V3',
  clock:'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  user:'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  arrow:'M4 12h16m-6-6 6 6-6 6', plus:'M12 5v14M5 12h14',check:'m5 12 4 4L19 6',
  mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5M5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8',
  chart:'M4 3v17h17M8 15l4-5 4 2 5-7', box:'m3 7 9-4 9 4v10l-9 4-9-4V7m0 0 9 4 9-4m-9 4v10',
  code:'m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16',briefcase:'M3 7h18v13H3V7m5 0V3h8v4M3 12l9 3 9-3',
  globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
  lock:'M5 10h14v11H5V10m3 0V6a4 4 0 0 1 8 0v4', upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  file:'M6 3h8l5 5v13H6V3m8 0v5h5M9 12h7m-7 4h7',play:'m8 4 12 8-12 8V4',
  volume:'m11 4-6 5H2v6h3l6 5V4m4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14', flame:'M12 2c2 6 7 8 7 13a7 7 0 1 1-14 0c0-4 3-6 3-8 1 2 2 3 2 4 2-3 3-5 2-9',
  medal:'m8 3 4 5 4-5M6 3h12M18 15a6 6 0 1 1-12 0 6 6 0 0 1 12 0', search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', close:'m6 6 12 12M6 18 18 6', logout:'M9 3H3v18h6M9 12h12m-5-5 5 5-5 5'
};
export function Icon({name='spark',size=20,...props}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.spark}/></svg>; }
export function Brand({onClick}) { return <button className="brand" onClick={onClick} aria-label="InterviewAI — Trang chủ"><span className="brand-mark"><Icon name="spark" size={22}/></span>Interview<span>AI</span></button>; }
export function Button({children,kind='primary',icon,...props}) { return <button className={`button ${kind}`} {...props}>{icon && <Icon name={icon}/>} {children}</button>; }
export function Field({label,children,hint}) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Empty({icon='book',title,children,action}) { return <div className="empty"><span className="tile purple"><Icon name={icon} size={26}/></span><h3>{title}</h3><p>{children}</p>{action}</div>; }
export function ErrorNote({children}) { return children ? <div className="error-note" role="alert">{children}</div> : null; }
export const date = time => new Date(time).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
export const timer = seconds => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
