export const reportPlan = value => ['Premium','Pro'].includes(value) ? value : 'Free';
export const reportDescriptions = {
  Free:'Điểm tổng quan, điểm mạnh, điểm cần cải thiện và một bước luyện tiếp.',
  Premium:'Đánh giá chi tiết từng câu, gợi ý trả lời và các bước cải thiện.',
  Pro:'Toàn bộ Premium, đối chiếu yêu cầu vị trí, khoảng trống bằng chứng và kế hoạch luyện 7 ngày.'
};
// Used both by the API and by cached reports/exports, including legacy reports.
export function reportForPlan(result, value) {
  if (!result) return null;
  const plan=reportPlan(value), limit=plan==='Free'?2:undefined;
  const output={plan,scores:result.scores,summary:result.summary,
    strengths:(result.strengths || []).slice(0,limit),areas_to_improve:(result.areas_to_improve || []).slice(0,limit),
    next_steps:(result.next_steps || []).slice(0,plan==='Free'?1:undefined),
    per_question:plan==='Free'?[]:(result.per_question || []).map(({question,answer,feedback,suggested_answer})=>({question,answer,feedback,suggested_answer}))};
  if(plan==='Pro' && result.deep_analysis) output.deep_analysis=result.deep_analysis;
  return output;
}
