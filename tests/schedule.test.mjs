import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTimeline,weeklyRule,buildSchedule} from '../src/schedule.mjs';

const day=(date,episodes)=>({date_ts:+new Date(date+'T00:00:00+08:00')/1000,episodes});
test('timeline keeps actual Shanghai dates, publication, delay and Japanese origin',()=>{
 const episode=(title,id,extra={})=>({title,season_id:id,pub_time:'23:30',pub_index:'第2话',published:0,...extra});
 const json={code:0,result:{timeline:[day('2027-01-01',[
  episode('名侦探柯南 中文配音',1,{published:1}),episode('功夫熊猫',2),episode('假面骑士',3),
  episode('间谍过家家 第三季',4,{delay:1,delay_reason:'临时调整',pub_time:'未知'}),episode('未知产地新作',5),
 ])]}};
 const items=parseTimeline(json,'日本');
 assert.equal(items.length,2);assert.equal(items[0].date,'2027-01-01');assert.equal(items[0].published,true);
 assert.equal(items[0].url,'https://www.bilibili.com/bangumi/play/ss1');assert.equal(items[1].delayed,true);
 assert.equal(items[1].time,null);assert.equal(items[1].delayReason,'临时调整');
 assert.throws(()=>parseTimeline({code:-412},'中国'),/时间表/);
});
test('only explicit weekly updates become recurring schedules',()=>{
 assert.equal(weeklyRule('更新至第120话，每周热榜第1名'),null);
 assert.equal(weeklyRule('周五偶遇，每周都有冒险'),null);
 assert.equal(weeklyRule('2026年10月30日首播'),null);
 assert.deepEqual(weeklyRule('每周三、六 10:00更新'),{days:[2,5],time:'10:00',text:'每周三、六 10:00更新'});
 assert.deepEqual(weeklyRule('每周一至五更新').days,[0,1,2,3,4]);
 assert.deepEqual(weeklyRule('每星期日 9：05播出').time,'09:05');
});
test('current week crosses years, stale entries keep their original dates and no slots are invented',()=>{
 const feeds={'bilibili-cn':{fetchedAt:'2026-12-29T00:00:00Z',error:'offline',items:[
  {id:'bilibili:1',source:'bilibili',country:'中国',date:'2026-12-29',time:'10:00',title:'国漫'},
  {id:'bilibili:2',source:'bilibili',country:'中国',date:'2026-12-22',time:'10:00',title:'上周'},
 ]}};
 const sources={tencent:{items:[{id:'tencent:1',source:'tencent',title:'有排期',episodes:'每周五 18:00更新'},{id:'tencent:2',source:'tencent',title:'只有集数',episodes:'更新至100集'}]}};
 const result=buildSchedule(feeds,sources,new Date('2026-12-31T16:30:00Z'));
 assert.equal(result.today,'2027-01-01');assert.equal(result.week,'2026-12-28');assert.equal(result.items.length,2);
 assert.equal(result.items[0].stale,true);assert.equal(result.items[1].date,'2027-01-01');assert.equal(result.items[1].kind,'recurring');
 assert.equal(result.items[1].published,false);assert.equal(result.coverage.find(x=>x.source==='iqiyi').available,false);
 assert.equal(buildSchedule(feeds,{},new Date('2027-01-12T00:00:00Z')).items.length,0);
});

test('coverage separates pending calendars, metadata schedules, source failures and an empty connected calendar',()=>{
 const now=new Date('2026-12-31T16:30:00Z');
 const empty=buildSchedule({'bilibili-cn':{items:[],fetchedAt:now.toISOString(),error:null}}, {},now);
 assert.equal(empty.coverage.find(x=>x.source==='bilibili').status,'connected');
 assert.equal(empty.coverage.find(x=>x.source==='bilibili').count,0);
 assert.equal(empty.coverage.find(x=>x.source==='tencent').status,'pending');
 assert.equal(empty.coverage.find(x=>x.source==='tencent').label,'日历正在读取');
 const failed=buildSchedule({'bilibili-cn':{items:[],error:'offline'}},{tencent:{items:[{source:'tencent',episodes:'每周五更新'}]}},now);
 assert.equal(failed.coverage.find(x=>x.source==='bilibili').status,'error');
 assert.equal(failed.coverage.find(x=>x.source==='tencent').status,'metadata');
});
