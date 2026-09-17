// Vietnamese whitespace units are usually syllables; English units are words.
// Use separate approximate thresholds and avoid feedback for short/incomplete turns.
export function paceHint(message,language){
  if(!message || message.pending || message.transcriptionError || message.speechDurationSeconds<4 || !Number.isFinite(message.speechDurationSeconds))return '';
  const units=message.text.trim().split(/\s+/u).length,rate=units/message.speechDurationSeconds*60;
  return rate>(language==='en'?180:270)?'Lượt vừa rồi hơi nhanh. Thử ngắt nhịp giữa các ý.':'';
}
