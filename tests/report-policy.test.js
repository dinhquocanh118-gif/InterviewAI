import test from 'node:test';
import assert from 'node:assert/strict';
import {reportForPlan,reportPlan} from '../src/report-policy.js';
import {evaluationSchema,validEvaluation} from '../src/evaluation-schema.js';
const full={scores:{content:0,communication:6,fit:7,structure:8},summary:'Nhận xét',strengths:['a','b','c'],areas_to_improve:['a','b','c'],next_steps:['a','b','c'],per_question:[{question:'Q',answer:'A',feedback:'F',suggested_answer:'S'}],deep_analysis:{role_alignment:['a'],evidence_gaps:['b'],practice_plan:['c']}};
test('Free strips paid details from old reports and exports, preserves zero scores',()=>{
  const free=reportForPlan(full,'Free');assert.deepEqual(free.per_question,[]);assert.equal(free.deep_analysis,undefined);assert.equal(free.strengths.length,2);assert.equal(free.next_steps.length,1);assert.equal(free.scores.content,0);assert.equal(reportPlan('unknown'),'Free');
});
test('Premium and Pro have distinct API schemas, validated responses, and visible reports',()=>{
  assert.equal(evaluationSchema('Free').properties.per_question,undefined);
  assert.ok(evaluationSchema('Premium').properties.per_question);assert.equal(evaluationSchema('Premium').properties.deep_analysis,undefined);
  assert.ok(evaluationSchema('Pro').properties.deep_analysis);assert.equal(reportForPlan(full,'Premium').deep_analysis,undefined);assert.ok(reportForPlan(full,'Pro').deep_analysis);
  assert.equal(validEvaluation({...full,per_question:undefined,deep_analysis:undefined},'Free'),true);
  assert.equal(validEvaluation({...full,per_question:[]},'Premium'),false);assert.equal(validEvaluation({...full,deep_analysis:undefined},'Pro'),false);assert.equal(validEvaluation(full,'Pro'),true);
});
