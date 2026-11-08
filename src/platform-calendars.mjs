import {classifyCountry,https,decode} from './sources.mjs';
import {todayKey,weekStart,addDays,validDateKey} from '../public/calendar.js';

const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36';
const timeKey=value=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value||'')?value:null;
// Calendar payloads write clock times in several ways: "9:00", "10：00",
// "10点" or a sentence such as "10:00 SVIP更新1话". Normalise the first
// explicit clock time without inventing one when the platform only gives a day.
export function clockTime(value){
 const text=String(value??'').replace(/：/g,':');
 const match=text.match(/(?:^|[^\d])([01]?\d|2[0-3])\s*[:：]\s*([0-5]\d)(?:[^\d]|$)/) || text.match(/(?:^|[^\d])([01]?\d|2[0-3])\s*点\s*(半|[0-5]?\d)?/);
 if(!match)return null;
 const hour=Number(match[1]),minute=match[2]==='半'?30:Number(match[2]||0);
 return Number.isFinite(hour)&&Number.isFinite(minute)&&hour<24&&minute<60?`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`:null;
}
const clockNote=text=>/SVIP/.test(text)?'SVIP 抢先':/VIP|会员/.test(text)?'VIP':'';
const completeText=value=>/(?:\d+\s*[集话]\s*全|全\s*\d+\s*[集话]|已完结|全集上线)/.test(String(value||''))&&!/更新至/.test(String(value||''));
const genreTags=text=>[...new Set((String(text).match(/玄幻|修仙|热血|武侠|奇幻|搞笑|科幻|冒险|悬疑|恋爱|校园|日常|治愈|运动|音乐|推理|异世界/g)||[]))];
async function get(url,{body,json=true,referer}={}){
 const r=await fetch(url,{method:body?'POST':'GET',headers:{'User-Agent':UA,'Referer':referer||new URL(url).origin+'/',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw new Error(`日历返回 HTTP ${r.status}`);
 return json?r.json():r.text();
}
function entry(source,id,title,date,fields={}){
 return {source,id:`${source}:${id}`,title:decode(title),date,country:classifyCountry(title),time:null,timeNote:'',updateText:'',completed:false,cover:'',episodes:'',description:'',published:false,delayed:false,kind:'calendar',tags:[],...fields};
}

// The navigation supplies full YYYYMMDD dates. Never infer dates from episode
// counts, publication dates or array order.
export function tencentCalendarCard(json){return json.data?.card||json.data?.CardList?.find(x=>x.type==='channel_play_schedule');}
export function parseTencentCalendar(card,date){
 if(!card||card.type!=='channel_play_schedule'||!validDateKey(date))throw new Error('腾讯更新日历格式已变化');
 return (card.children_list?.list?.cards||[]).flatMap(x=>{
  const p=x.params||{};
  if(x.type!=='poster'||!p.title||!/^\w+$/.test(p.cid||'')||p.type_name&&p.type_name!=='动漫')return [];
  const scheduleText=p.update_notify_desc||p.sub_title||'';
  const paid=timeKey(p.pay_time),free=timeKey(p.free_time);
  // pay_time is the member slot; whether it is SVIP or VIP is spelled out in
  // update_notify_desc, so keep the badge to the reliable membership class.
  const note=paid?'VIP':free?(/免费/.test(scheduleText)?'免费':/VIP|会员/.test(scheduleText)?'VIP':''):'';
  return [entry('tencent',p.cid,p.title,date,{time:paid||free,timeNote:note,cover:https(p.image_url),
   url:`https://v.qq.com/x/cover/${p.cid}.html`,episodes:p.episode_updated||'',description:p.second_title||'',scheduleText,updateText:scheduleText,
   tags:genreTags((p.comic_main_type_name||'')+' '+scheduleText)})];
 });
}
async function loadTencentCalendar(){
 const base='https://pbaccess.video.qq.com/trpc.vector_layout.page_view.PageService/';
 const post=(method,body)=>get(base+method+'?video_appid=3000010&vversion_platform=2',{body,referer:'https://v.qq.com/'});
 const params={page_id:'100119',page_type:'channel',scene:'channel',new_mark_label_enabled:'1'};
 const page=await post('getPage',{page_params:params,page_bypass_params:{params:{platform_id:'2',caller_id:'3000010',data_mode:'default',user_mode:'default',...params},scene:'channel'},page_context:null});
 const card=tencentCalendarCard(page);
 if(!card)throw new Error('腾讯未返回每日更新模块');
 const navigation=(card.children_list?.list?.cards||[]).filter(x=>x.type==='navigation'&&/^\d{8}$/.test(x.params?.week));
 if(navigation.length!==7)throw new Error('腾讯未返回完整七天日历');
 const items=[];
 for(let start=0;start<7;start+=3){
  const days=await Promise.all(navigation.slice(start,start+3).map(async nav=>{
   const raw=nav.params.week,date=`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6)}`;
   if(nav.params.selected==='1')return parseTencentCalendar(card,date);
   const response=await post('getCard',{page_params:{page_id:'100119',page_type:'channel',new_mark_label_enabled:'1',un_mod_id:card.id,un_module_key:card.params?.un_module_key||'',week:raw},page_context:null,flip_info:card.flip_infos?.tab||{page_module_id:card.id}});
   const dayCard=tencentCalendarCard(response);
   // selected marks today's navigation entry even when getCard returns another
   // day's posters. The requested week parameter identifies this result's date.
   const dates=(dayCard?.children_list?.list?.cards||[]).filter(x=>x.type==='navigation');
   if(dates.length&&!dates.some(x=>x.params?.week===raw))throw new Error('腾讯返回的日历范围不匹配');
   return parseTencentCalendar(dayCard,date);
  }));
  items.push(...days.flat());
 }
 return items;
}

export function parseIqiyiCalendar(json,now=new Date()){
 if(json.code!==0||!Array.isArray(json.items))throw new Error('爱奇艺更新日历暂不可用');
 const module=json.items.find(x=>x.title==='追番表'||x.temp?.id===82);
 if(!Array.isArray(module?.video))throw new Error('爱奇艺未返回追番表');
 const weekdays={jmd_Mon:0,jmd_Tues:1,jmd_Wed:2,jmd_Thur:3,jmd_Fri:4,jmd_Sat:5,jmd_Sun:6};
 const week=weekStart(todayKey(now));
 return module.video.flatMap(day=>{
  if(!(day.block_id in weekdays))return [];
  const date=addDays(week,weekdays[day.block_id]);
  return (day.data||[]).flatMap(x=>{
   const title=x.display_name||x.title,tags=String(x.tag||'').split(';');
   const country=tags.some(t=>['内地','中国大陆','中国','国产'].includes(t))?'中国':tags.includes('日本')?'日本':null;
   const url=https(x.page_url),id=x.album_id||x.entity_id;
   if(!title||!country||!/^\d+$/.test(String(id))||x.isAd||x.isPpcAd||x.content_type==='TRAILER'||x.channel_id&&x.channel_id!==4||/奥特曼|假面骑士|超级战队/.test(title)||!/^https:\/\/www\.iqiyi\.com\//.test(url))return [];
   const premiere=String(x.show_time||'').trim(),time=clockTime(premiere),episodes=x.dq_updatestatus||'';
   const weekday=['周一','周二','周三','周四','周五','周六','周日'][weekdays[day.block_id]];
   const completed=!time&&completeText(episodes);
   return [entry('iqiyi',id,title,date,{country,url,cover:https(x.image_url_normal||x.image_cover||x.album_image_url_hover),episodes,
    time,timeNote:time?'上线':'',completed,updateText:completed?episodes:premiere||`每${weekday}更新`,
    description:x.description||x.desc||'',tags:genreTags(x.tag),scheduleText:'爱奇艺追番表 · '+weekday})];
  });
 });
}

function monthDayKey(value,now){
 const match=String(value||'').match(/^(\d{1,2})[.\/-](\d{1,2})$/);if(!match)return null;
 const today=todayKey(now),year=Number(today.slice(0,4));
 const candidates=[year-1,year,year+1].map(y=>`${y}-${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}`).filter(validDateKey);
 const distance=key=>Math.abs(+new Date(key+'T00:00:00Z')-new Date(today+'T00:00:00Z'));
 candidates.sort((a,b)=>distance(a)-distance(b));
 return candidates[0]&&distance(candidates[0])<=7*86400000?candidates[0]:null;
}
export function parseYoukuCalendar(html,now=new Date()){
 const raw=html.match(/window\.__INITIAL_DATA__\s*=\s*([\s\S]+?);<\/script>/)?.[1];
 if(!raw)throw new Error('优酷更新日历格式已变化');
 const data=JSON.parse(raw.replace(/("(?:[^"\\]|\\.)*")|\bundefined\b/g,(token,quoted)=>quoted||'null'));
 const components=(data.moduleList||[]).flatMap(m=>m.components||[]);
 const module=components.find(c=>c.title==='每日更新'&&Array.isArray(c.tabList));
 if(!module||!Array.isArray(module.itemList))throw new Error('优酷未返回每日更新表');
 const domesticIds=new Set(components.filter(c=>/国漫|国产/.test(c.title||'')).flatMap(c=>(c.itemList||[]).flat().map(x=>x.action_value)));
 return module.tabList.flatMap((tab,index)=>{
  const date=monthDayKey(tab.date,now);if(!date)return [];
  return (module.itemList[index]||[]).flatMap(x=>{
   if(!x.title||!/^\w+$/.test(x.action_value||'')||/奥特曼|假面骑士|超级战队/.test(x.title))return [];
   // The daily table carries the actual clock slot and membership wording for
   // every entry ("10:00 SVIP更新1话"). Keep it instead of discarding the only
   // reliable time source Youku exposes.
   const rawUpdate=String(x.reason?.text?.title||'').trim(),time=clockTime(rawUpdate),episodes=x.lbTexts||'';
   const updateText=time?rawUpdate.replace(/(\d{1,2})\s*[:：]\s*(\d{2})/,time):rawUpdate;
   return [entry('youku',x.action_value,x.title,date,{country:domesticIds.has(x.action_value)?'中国':classifyCountry(x.title),
    cover:https(x.img),url:`https://www.youku.com/show_page/id_z${x.action_value}.html`,episodes,description:x.desc||x.subtitle||'',
    time,timeNote:time?clockNote(updateText):'',completed:!time&&completeText(episodes),updateText,
    tags:genreTags((x.tags||[]).map(t=>t.text?.title||'').join(' ')),scheduleText:'优酷每日更新表 · '+date})];
  });
 });
}
export async function loadPlatformCalendar(feed){
 if(feed.source==='tencent')return loadTencentCalendar();
 if(feed.source==='iqiyi')return parseIqiyiCalendar(await get('https://mesh.if.iqiyi.com/portal/lw/v7/channel/cartoon?v=17.104.26764&width=1280&mode=page&page=1',{referer:'https://www.iqiyi.com/'}));
 if(feed.source==='youku')return parseYoukuCalendar(await get('https://www.youku.com/ku/webcomic',{json:false}));
 throw new Error('未知日历来源');
}
