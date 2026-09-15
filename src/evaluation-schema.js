import {reportPlan} from './report-policy.js';
const strings={type:'array',items:{type:'string'}};
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const sentence={type:'string'};
export const scoreKeys=['content','communication','fit','structure'];
export function evaluationSchema(value){
  const plan=reportPlan(value);
  const properties={scores:object(Object.fromEntries(scoreKeys.map(k=>[k,{type:'number',minimum:0,maximum:10}]))),summary:sentence,strengths:strings,areas_to_improve:strings,next_steps:strings};
  if(plan!=='Free')properties.per_question={type:'array',items:object({question:sentence,answer:sentence,feedback:sentence,suggested_answer:sentence})};
  if(plan==='Pro')properties.deep_analysis=object({role_alignment:strings,evidence_gaps:strings,practice_plan:strings});
  return object(properties);
}
export const evaluationDetail=value=>({
  Free:'Báo cáo ngắn: tóm tắt 50–80 từ, tối đa 2 điểm mạnh, 2 điểm cần cải thiện, 1 bước luyện tiếp. Không phân tích từng câu.',
  Premium:'Tóm tắt 100–150 từ. Mỗi câu đã trả lời có nhận xét cụ thể 50–100 từ và một cách trả lời tốt hơn. Đưa ra 3 bước luyện tiếp ưu tiên.',
  Pro:'Báo cáo chuyên sâu: từng câu có nhận xét 100–150 từ về bằng chứng, cấu trúc STAR, tính nhất quán và mức phù hợp yêu cầu ngành/vị trí; gợi ý trả lời tốt hơn. Thêm deep_analysis: role_alignment đối chiếu năng lực với JD/hồ sơ, evidence_gaps chỉ ra bằng chứng còn thiếu, practice_plan gồm 7 mục cho ngày 1–7 với bài tập và tiêu chí tự kiểm tra. Nếu thiếu JD/CV hoặc dữ liệu, nói rõ giới hạn, không suy diễn. Chỉ so sánh các câu trong buổi hiện tại, không bịa tiến bộ từ buổi khác.'
})[reportPlan(value)];
export function validEvaluation(value,plan){
  if(!value?.scores || !scoreKeys.every(k=>Number.isFinite(value.scores[k]) && value.scores[k]>=0 && value.scores[k]<=10) || typeof value.summary!=='string')return false;
  if(!['strengths','areas_to_improve','next_steps'].every(k=>Array.isArray(value[k]) && value[k].every(s=>typeof s==='string')))return false;
  if(reportPlan(plan)!=='Free' && (!Array.isArray(value.per_question) || !value.per_question.length || !value.per_question.every(q=>['question','answer','feedback','suggested_answer'].every(k=>typeof q[k]==='string'))))return false;
  if(reportPlan(plan)==='Pro' && !['role_alignment','evidence_gaps','practice_plan'].every(k=>Array.isArray(value.deep_analysis?.[k]) && value.deep_analysis[k].length && value.deep_analysis[k].every(s=>typeof s==='string')))return false;
  return true;
}
