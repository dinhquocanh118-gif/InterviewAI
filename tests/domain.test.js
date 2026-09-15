import test from 'node:test';
import assert from 'node:assert/strict';
import {stats,score,localDay} from '../src/domain.js';
const make=(day,value=8)=>({completedAt:new Date(`${day}T12:00:00`).getTime(),durationSeconds:90,evaluation:{scores:{content:value,communication:value,fit:value,structure:value}}});
test('empty and pending evaluations do not produce fabricated scores',()=>{
  assert.equal(score({}),null);assert.equal(stats([]).average,'—');
  assert.equal(stats([{completedAt:Date.now(),durationSeconds:70}]).average,'—');
});
test('statistics count completed sessions, real scores and consecutive local days',()=>{
  const s=[make('2026-09-15',8),make('2026-09-14',6),make('2026-09-14',7),{startedAt:Date.now(),durationSeconds:999}];
  assert.deepEqual(stats(s,new Date('2026-09-15T22:00:00').getTime()),{count:3,average:'7.0',minutes:5,streak:2,monthly:3});
});
test('streak survives rest of today and resets after missed yesterday',()=>{
  assert.equal(stats([make('2026-09-14')],new Date('2026-09-15T15:00:00').getTime()).streak,1);
  assert.equal(stats([make('2026-09-13')],new Date('2026-09-15T15:00:00').getTime()).streak,0);
  assert.equal(localDay(new Date(2026,8,15,0,1)),'2026-09-15');
});
test('monthly free usage uses completion month and does not count previous month',()=>{
  assert.equal(stats([make('2026-08-31'),make('2026-09-01')],new Date('2026-09-15T12:00:00').getTime()).monthly,1);
});
