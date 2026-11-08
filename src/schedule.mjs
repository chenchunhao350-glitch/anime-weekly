import {isKnownJapanese,https,decode} from './sources.mjs';
import {todayKey,validDateKey,weekStart,addDays} from '../public/calendar.js';
import {loadPlatformCalendar} from './platform-calendars.mjs';

export const SCHEDULE_FEEDS={
  'bilibili-cn':{name:'B站国创时间表',source:'bilibili',country:'中国',type:4},
  'bilibili-jp':{name:'B站番剧时间表',source:'bilibili',country:'日本',type:1},
  'tencent':{name:'腾讯视频每日更新',source:'tencent'},
  'youku':{name:'优酷每日更新',source:'youku'},
  'iqiyi':{name:'爱奇艺追番表',source:'iqiyi'},
};
export function parseTimeline(json,country){
  const timeline=json.result?.timeline;
  if(json.code!==0||!Array.isArray(timeline))throw new Error('公开时间表暂不可用');
  const entries=new Map();
  for(const day of timeline){
    if(!Number.isFinite(day.date_ts)||day.date_ts<=0)continue;
    const date=todayKey(new Date(day.date_ts*1000));
    for(const x of day.episodes||[]){
      if(!x.title||!/^\d+$/.test(String(x.season_id)))continue;
      if(country==='日本'&&!isKnownJapanese(x.title))continue;
      const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.pub_time||'')?x.pub_time:null;
      const entry={id:`bilibili:${x.season_id}`,source:'bilibili',title:decode(x.title),country,date,time,
        timeNote:'',updateText:'',completed:false,
        cover:https(x.cover),url:`https://www.bilibili.com/bangumi/play/ss${x.season_id}`,
        episodes:decode(x.pub_index||x.delay_index||''),published:x.published===1,
        delayed:!!x.delay,delayReason:decode(x.delay_reason||''),kind:'official',tags:[]};
      entries.set(`${date}:${entry.id}:${x.episode_id||entry.episodes}`,entry);
    }
  }
  return [...entries.values()];
}
export async function loadTimeline(feed){
  if(feed.source!=='bilibili')return loadPlatformCalendar(feed);
  const url=`https://api.bilibili.com/pgc/web/timeline/v2?season_type=${feed.type}&day_before=6&day_after=6`;
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://www.bilibili.com/'},signal:AbortSignal.timeout(18000)});
  if(!r.ok)throw new Error(`时间表返回 HTTP ${r.status}`);
  return parseTimeline(await r.json(),feed.country);
}

// Only explicit weekly update statements are accepted. Episode counts,
// ranking timestamps and a synopsis mentioning weekdays are not schedules.
export function weeklyRule(text=''){
  const match=String(text).match(/每(?:周|星期)([一二三四五六日天、，,和及至到\s]+)(?:[（(][^）)]*[）)])?\s*((?:[01]?\d|2[0-3])[:：][0-5]\d)?\s*(?:点)?\s*(?:更新|播出|上线)/);
  if(!match)return null;
  const numbers={'一':0,'二':1,'三':2,'四':3,'五':4,'六':5,'日':6,'天':6};
  let days=[...match[1]].filter(x=>x in numbers).map(x=>numbers[x]);
  const range=match[1].match(/([一二三四五六日天])[至到]([一二三四五六日天])/);
  if(range){const start=numbers[range[1]],end=numbers[range[2]];days=Array.from({length:(end-start+7)%7+1},(_,i)=>(start+i)%7);}
  return {days:[...new Set(days)],time:match[2]?match[2].replace('：',':').padStart(5,'0'):null,text:match[0]};
}
export function buildSchedule(feeds,rankSources,now=new Date()){
  const today=todayKey(now),week=weekStart(today),end=addDays(week,6),items=[];
  const key=title=>String(title).normalize('NFKC').replace(/\s|[·：:！!，,。\-]/g,'').replace(/动态漫画$/,'').toLowerCase();
  const countries=new Map(),ids=new Map();
  for(const data of [...Object.values(rankSources),...Object.values(feeds)])for(const item of data.items||[]){
    if(!['中国','日本'].includes(item.country))continue;
    ids.set(item.id,item.country);const title=key(item.title);if(!countries.has(title))countries.set(title,new Set());countries.get(title).add(item.country);
  }
  for(const [id,feed] of Object.entries(feeds))for(const item of feed.items||[]){
    const matches=countries.get(key(item.title)),country=item.country||ids.get(item.id)||(matches?.size===1?[...matches][0]:null);
    if(['中国','日本'].includes(country)&&validDateKey(item.date)&&item.date>=week&&item.date<=end)items.push({...item,country,stale:!!feed.error,fetchedAt:feed.fetchedAt,feed:id});
  }
  for(const [source,data] of Object.entries(rankSources))for(const item of data.items||[]){
    if(source==='bilibili')continue;
    const rule=weeklyRule(item.episodes)||weeklyRule(item.description);
    if(!rule)continue;
    for(const day of rule.days){const date=addDays(week,day);if(!items.some(x=>x.id===item.id&&x.date===date))items.push({...item,date,time:rule.time,kind:'recurring',scheduleText:rule.text,
      published:false,delayed:false,stale:!!data.error,fetchedAt:data.fetchedAt,tags:item.tags||[]});}
  }
  const unique=new Map();for(const item of items){item.eventId=`event:${item.date}:${item.id}:${item.time||''}`;unique.set(item.eventId,item);}items.splice(0,items.length,...unique.values());
  items.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.title.localeCompare(b.title,'zh'));
  return {today,week,timezone:'Asia/Shanghai',items,
    feeds:Object.entries(SCHEDULE_FEEDS).map(([id,info])=>({id,name:info.name,fetchedAt:feeds[id]?.fetchedAt||null,error:feeds[id]?.error||null})),
    coverage:['bilibili','tencent','youku','iqiyi'].map(source=>{
      const sourceFeeds=Object.entries(SCHEDULE_FEEDS).filter(([,info])=>info.source===source).map(([id])=>feeds[id]);
      const count=items.filter(x=>x.source===source).length;
      const healthy=sourceFeeds.some(feed=>feed?.fetchedAt&&!feed.error);
      const error=sourceFeeds.some(feed=>feed?.error);
      const status=sourceFeeds.length?(error&&!healthy?'error':healthy?'connected':count?'metadata':'pending'):count?'metadata':'unsupported';
      const label={connected:'日历已接入',error:'日历读取失败',pending:'日历正在读取',metadata:'作品资料排期',unsupported:'排期暂未接入'}[status];
      return {source,count,available:healthy||count>0,status,label};
    })};
}
