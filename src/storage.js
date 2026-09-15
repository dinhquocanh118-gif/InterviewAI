const PREFIX = 'interviewai:';
let database;
export function readSetting(key, fallback) {
  try { const value = localStorage.getItem(PREFIX + key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
export function writeSetting(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}
function openDB() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('InterviewAI', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('sessions', { keyPath: 'id' });
      request.result.createObjectStore('files', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(request.error); };
  });
  return database;
}
async function transaction(store, mode, operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = operation(tx.objectStore(store));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Không thể lưu dữ liệu.'));
  });
}
export const saveSession = session => transaction('sessions', 'readwrite', store => store.put(session));
export const listSessions = async () => (await transaction('sessions', 'readonly', store => store.getAll())).sort((a,b) => b.startedAt - a.startedAt);
export const saveCV = file => transaction('files', 'readwrite', store => store.put(file));
export const getCV = () => transaction('files', 'readonly', store => store.get('cv'));
export const removeCV = () => transaction('files', 'readwrite', store => store.delete('cv'));
export async function clearData() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['sessions', 'files'], 'readwrite');
    tx.objectStore('sessions').clear(); tx.objectStore('files').clear();
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
  Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).forEach(key => localStorage.removeItem(key));
}
