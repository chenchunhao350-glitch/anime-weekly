import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTencentCalendar,parseIqiyiCalendar,parseYoukuCalendar,clockTime} from '../src/platform-calendars.mjs';
import {buildSchedule} from '../src/schedule.mjs';

test('clockTime normalises real calendar notations without inventing a time',()=>{
 assert.equal(clockTime('9:00更新1话'),'09:00');
 assert.equal(clockTime('10：00 SVIP更新1话'),'10:00');
 assert.equal(clockTime('每周二10点更新'),'10:00');
 assert.equal(clockTime('10点半更新'),'10:30');
 assert.equal(clockTime('每天更新1集'),null);
 assert.equal(clockTime(''),null);
});
test('Tencent uses calendar day, exposes membership note and preserves the calendar-specific time',()=>{
 const card={type:'channel_play_schedule',children_list:{list:{cards:[{type:'navigation',params:{title:'今天'}},{type:'poster',params:{cid:'verified123',type_name:'动漫',title:'斗罗大陆Ⅱ绝世唐门',pay_time:'18:00',free_time:'10:00',episode_updated:'更新至177集',update_notify_desc:'VIP每周六10点，SVIP周五18点抢先看'}}]}}};
 const [item]=parseTencentCalendar(card,'2026-10-30');
 assert.equal(item.date,'2026-10-30');assert.equal(item.time,'18:00');assert.equal(item.country,'中国');
 assert.equal(item.kind,'calendar');assert.equal(item.published,false);assert(item.scheduleText.includes('SVIP'));
 assert.equal(item.timeNote,'VIP');assert.equal(item.updateText,item.scheduleText);
 assert.equal(item.url,'https://v.qq.com/x/cover/verified123.html');
 assert.throws(()=>parseTencentCalendar({},'2026-10-30'),/格式/);
});
test('iQiyi rotated weekday blocks define schedules, premiere dates and trailers do not',()=>{
 const episode=(title,tag,extra={})=>({title,display_name:title,tag,channel_id:4,album_id:123,page_url:'https://www.iqiyi.com/v_abc.html',showDate:'2020-01-01',dq_updatestatus:'更新至10集',...extra});
 const data={code:0,items:[{title:'追番表',video:[
  {title:'今天',block_id:'jmd_Fri',data:[episode('国漫新作品','内地;热血;动画',{show_time:'本周五08:55上线'}),episode('日本新作品','日本;动画',{album_id:456}),episode('欧美新作','美国;动画'),episode('广告','内地;动画',{isAd:true}),episode('假面骑士','日本;特摄'),episode('宣传片','内地;动画',{content_type:'TRAILER'})]},
  {title:'周一',block_id:'jmd_Mon',data:[episode('国漫新作品','内地;动画'),episode('已完结作品','内地;动画',{dq_updatestatus:'12集全'})]},
 ]}]};
 const result=parseIqiyiCalendar(data,new Date('2026-12-31T16:30:00Z'));
 assert.equal(result.length,4);assert.deepEqual(result.map(x=>x.date),['2027-01-01','2027-01-01','2026-12-28','2026-12-28']);
 assert.equal(result[0].time,'08:55');assert.equal(result[0].timeNote,'上线');
 assert.equal(result[1].country,'日本');assert.equal(result[1].updateText,'每周五更新');
 assert.equal(result[3].completed,true);assert.equal(result[3].time,null);assert.equal(result[3].updateText,'12集全');
 assert.throws(()=>parseIqiyiCalendar({code:0,items:[]}),/追番表/);
});
test('Youku uses explicit tab dates across years and does not assume unknown titles are domestic',()=>{
 const item=(title,id,reason)=>({title,action_value:id,img:'//img.alicdn.com/p.jpg',lbTexts:'更新至10话',reason:reason?{text:{title:reason}}:undefined});
 const data={moduleList:[{components:[{title:'每日更新',tabList:[{date:'01.01',title:'今'},{date:'12.31',title:'四'}],itemList:[[item('沧元图','cn','9:00 SVIP更新2话'),item('名侦探柯南','jp','10:00更新1话'),item('未确认新作品','unknown')],[item('沧元图','cn')]]}]}]};
 const result=parseYoukuCalendar(`<script>window.__INITIAL_DATA__ =${JSON.stringify(data)};</script>`,new Date('2027-01-01T04:00:00Z'));
 assert.equal(result.length,4);assert.deepEqual(result.map(x=>x.date),['2027-01-01','2027-01-01','2027-01-01','2026-12-31']);
 assert.equal(result[0].country,'中国');assert.equal(result[1].country,'日本');assert.equal(result[2].country,null);
 assert.equal(result[0].published,false);assert.equal(result[0].time,'09:00');assert.equal(result[0].timeNote,'SVIP 抢先');
 assert.equal(result[0].updateText,'09:00 SVIP更新2话');assert.equal(result[1].time,'10:00');assert.equal(result[2].time,null);
});
test('aggregation confirms unknown countries with verified metadata, excludes ambiguous origins and keeps each source/day identifiable',()=>{
 const now=new Date('2026-10-30T12:00:00Z');
 const sample=(source,id,title,country)=>({source,id:`${source}:${id}`,title,country,date:'2026-10-30',time:null,tags:[]});
 const feeds={iqiyi:{items:[sample('iqiyi','1','新作品 动态漫画','中国'),sample('iqiyi','2','同名','中国'),sample('iqiyi','3','同名','日本')]},youku:{items:[sample('youku','1','新作品',null),sample('youku','2','同名',null),sample('youku','3','无资料',null)]}};
 const result=buildSchedule(feeds,{},now);
 assert.equal(result.items.filter(x=>x.source==='youku').length,1);
 assert.equal(result.items.find(x=>x.source==='youku').country,'中国');
 assert.equal(new Set(result.items.map(x=>x.eventId)).size,result.items.length);
 assert(result.items.every(x=>x.eventId.includes(x.source)));
});
