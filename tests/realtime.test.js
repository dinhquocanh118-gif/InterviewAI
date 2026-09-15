import test from 'node:test';
import assert from 'node:assert/strict';
import {RealtimeInterview} from '../src/realtime.js';
function controller(){
  const sent=[],statuses=[];let latest=[];
  const client=new RealtimeInterview({setup:{},onMessages:m=>latest=m,onStatus:s=>statuses.push(s),onError:()=>{}});
  client.dc={readyState:'open',send:e=>sent.push(JSON.parse(e)),close(){}};
  client.track={enabled:false};client.state('ready');
  return {client,sent,statuses,messages:()=>latest};
}
test('push to talk commits once on release, clears prior silence, and keeps late transcription in order',()=>{
  const {client:c,sent,messages}=controller();
  try{
    c.start();c.start();assert.equal(c.track.enabled,true);assert.equal(sent.length,1);assert.equal(sent[0].type,'input_audio_buffer.clear');
    c.startedAt-=1000;c.stop();c.stop();assert.equal(c.track.enabled,false);assert.deepEqual(sent.map(e=>e.type),['input_audio_buffer.clear','input_audio_buffer.commit','response.create']);
    c.event({type:'input_audio_buffer.committed',item_id:'answer-1'});
    c.event({type:'response.created',response:{id:'response-1'}});c.event({type:'output_audio_buffer.started'});
    c.event({type:'response.output_audio_transcript.delta',item_id:'question-1',delta:'Câu hỏi tiếp'});
    c.event({type:'response.output_audio_transcript.done',item_id:'question-1',transcript:'Câu hỏi tiếp'});
    c.event({type:'response.done'});assert.equal(c.status,'speaking');
    c.event({type:'output_audio_buffer.stopped'});assert.equal(c.status,'ready');
    c.start();assert.equal(c.status,'ready','pending transcription blocks a new turn');
    c.event({type:'conversation.item.input_audio_transcription.completed',item_id:'answer-1',transcript:'Kinh nghiệm thực tế'});
    c.event({type:'conversation.item.input_audio_transcription.completed',item_id:'answer-1',transcript:'duplicate'});
    assert.deepEqual(messages().map(m=>[m.role,m.text]),[['user','Kinh nghiệm thực tế'],['bot','Câu hỏi tiếp']]);
    assert.equal(c.pending.size,0);
  }finally{c.close();}
});
test('short press and loss of focus cancel without creating an answer',()=>{
  const {client:c,sent}=controller();try{c.start();c.stop();assert.equal(c.messages.length,0);c.start();c.startedAt-=1000;c.stop(true);assert.equal(c.messages.length,0);assert.ok(!sent.some(e=>e.type==='input_audio_buffer.commit'));}finally{c.close();}
});
test('disconnect makes pending turns explicit and releases all microphone tracks',()=>{
  const {client:c}=controller();let stopped=0;c.stream={getTracks:()=>[{stop(){stopped++;}}]};
  c.start();c.startedAt-=1000;c.stop();c.fail('disconnected');assert.equal(stopped,1);assert.equal(c.messages[0].pending,false);assert.equal(c.messages[0].transcriptionError,true);assert.equal(c.track.enabled,false);assert.equal(c.closed,true);
});
