export const library = [
  { id:'logistics', category:'Logistics', industry:'Logistics', role:'Chuyên viên xuất nhập khẩu', icon:'box', color:'mint', description:'Xử lý chứng từ, vận hành chuỗi cung ứng và những tình huống thực tế.', skills:'Incoterms, quản lý vận tải, xử lý chứng từ', level:'1–3 năm kinh nghiệm' },
  { id:'marketing', category:'Marketing', industry:'Marketing', role:'Chuyên viên Marketing', icon:'spark', color:'peach', description:'Từ ý tưởng chiến dịch đến đo lường hiệu quả và thấu hiểu khách hàng.', skills:'Lập kế hoạch chiến dịch, phân tích dữ liệu, sáng tạo nội dung', level:'1–3 năm kinh nghiệm' },
  { id:'finance', category:'Finance', industry:'Tài chính', role:'Chuyên viên phân tích tài chính', icon:'chart', color:'blue', description:'Rèn tư duy phân tích, đọc báo cáo và đánh giá cơ hội kinh doanh.', skills:'Phân tích tài chính, Excel, lập ngân sách', level:'1–3 năm kinh nghiệm' },
  { id:'it', category:'IT', industry:'Công nghệ thông tin', role:'Lập trình viên Frontend', icon:'code', color:'purple', description:'Kiến thức kỹ thuật, giải quyết vấn đề và cách kể về dự án của bạn.', skills:'React, JavaScript, làm việc nhóm', level:'1–3 năm kinh nghiệm' },
  { id:'business', category:'Business', industry:'Kinh doanh', role:'Quản trị viên tập sự', icon:'briefcase', color:'yellow', description:'Thể hiện tiềm năng lãnh đạo, tư duy kinh doanh và khả năng thích nghi.', skills:'Tư duy phản biện, lãnh đạo, giải quyết tình huống', level:'Mới tốt nghiệp' },
  { id:'english', category:'Business', industry:'Kinh doanh', role:'Phỏng vấn bằng tiếng Anh', icon:'globe', color:'pink', description:'Luyện diễn đạt tự nhiên và tự tin trả lời nhà tuyển dụng quốc tế.', skills:'Giao tiếp, thuyết trình, làm việc nhóm', language:'en', level:'Mới tốt nghiệp' },
];
export const defaultSetup = { role:'', industry:'Công nghệ thông tin', level:'Mới tốt nghiệp', jd:'', skills:'', experience:'', language:'vi', duration:15, difficulty:'Vừa sức' };
export const plans = [
  {name:'Free', price:'0', description:'Bước khởi đầu tự tin hơn.', features:['3 buổi phỏng vấn / tháng','Điểm tổng quan và góp ý cơ bản','1 bước luyện tiếp','Lịch sử trên thiết bị']},
  {name:'Premium', price:'99.000', description:'Luyện tập đều đặn. Tiến bộ mỗi ngày.', features:['Phỏng vấn không giới hạn','Góp ý chi tiết từng câu hỏi','Gợi ý câu trả lời tốt hơn','Các bước cải thiện ưu tiên']},
  {name:'Pro', price:'199.000', description:'Sẵn sàng cho mục tiêu lớn hơn.', features:['Toàn bộ tính năng Premium','Đối chiếu năng lực với vị trí và JD','Phân tích bằng chứng còn thiếu','Kế hoạch luyện tập 7 ngày']},
];
export function score(session) {
  const values = Object.values(session?.evaluation?.scores || {}).filter(Number.isFinite);
  return values.length ? Math.round(values.reduce((a,b)=>a+b,0) / values.length * 10) / 10 : null;
}
export function localDay(time) {
  const d = new Date(time); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function stats(sessions, now = Date.now()) {
  const completed = sessions.filter(s => s.completedAt);
  const scores = completed.map(score).filter(Number.isFinite);
  const days = new Set(completed.map(s => localDay(s.completedAt)));
  const cursor = new Date(now); cursor.setHours(12,0,0,0);
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate()-1);
  let streak = 0;
  while (days.has(localDay(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
  return { count:completed.length, average:scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '—', minutes:Math.round(completed.reduce((n,s)=>n+(s.durationSeconds || 0),0)/60), streak,
    monthly:completed.filter(s => localDay(s.completedAt).slice(0,7) === localDay(now).slice(0,7)).length };
}
