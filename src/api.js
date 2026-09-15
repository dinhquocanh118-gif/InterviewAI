export async function request(path, body, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if(options.signal?.aborted)controller.abort();
  else options.signal?.addEventListener('abort',abort,{once:true});
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:controller.signal });
    if (!response.ok) {
      const data = await response.json().catch(()=>({}));
      throw new Error(data.error || 'Dịch vụ AI đang bận. Vui lòng thử lại.');
    }
    return options.blob ? response.blob() : response.json();
  } catch(error) {
    if (error.name === 'AbortError') throw new Error('Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.');
    throw error;
  } finally { clearTimeout(timer);options.signal?.removeEventListener('abort',abort); }
}
export function dataURL(blob) {
  return new Promise((resolve,reject)=> { const reader = new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(blob); });
}
