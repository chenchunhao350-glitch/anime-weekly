import {ArchiveCalendar,todayKey,formatWeek,weekNumber,weekStart,addDays} from '/calendar.js';
import {countryOf,regionItems,GENRES} from '/catalog.js';
import {openMobileAccess} from '/mobile.js';
import {watchUpdates} from '/live.js';
const icons={compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',bookmark:'<path d="M6 4h12v17l-6-4-6 4V4Z"/>',archive:'<path d="M4 8h16v13H4zM3 3h18v5H3zM9 12h6"/>',smartphone:'<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4M10 5h4"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3"/>','chevron-down':'<path d="m6 9 6 6 6-6"/>','arrow-up-right':'<path d="M7 17 17 7M7 7h10v10"/>',play:'<path d="m9 5 10 7-10 7V5Z"/>',layers:'<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',radio:'<path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8"/><circle cx="12" cy="12" r="2"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5M6.1 6.2a8 8 0 0 1 13.6 4M17.9 17.8a8 8 0 0 1-13.6-4"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h.1M3 12h.1M3 18h.1"/>',sliders:'<path d="M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4"/>',x:'<path d="m6 6 12 12M6 18 18 6"/>',flame:'<path d="M12 3c2 5 5 5 5 10a5 5 0 0 1-10 0c0-2 1-4 3-6 0 3 1 4 2 4 2-1 2-4 0-8Z"/>',check:'<path d="m5 12 4 4L19 6"/>',heart:'<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 8 15 8 15S25 10 20 5Z"/>',wifi:'<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 20h.01"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.info}</svg>`;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
hydrateIcons();
const escape=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const img=url=>url?`/api/image?url=${encodeURIComponent(url)}`:'';
const names={tencent:'腾讯视频',bilibili:'哔哩哔哩',youku:'优酷',iqiyi:'爱奇艺'};
const shorts={tencent:'腾讯',bilibili:'B站',youku:'优酷',iqiyi:'爱奇艺'};
const marks={tencent:'▶',bilibili:'哔',youku:'▶',iqiyi:'iQ'};
const genreRules=[[/凡人|仙逆|仙武|诛仙|永生|炼气|一念永恒|修仙|牧神|师兄|仙王/,['修仙','玄幻']],[/斗破|斗罗|完美世界|遮天|神印|百炼|神墓|沧元|妖神|无上|万界|逆天|独步|灵武|武动|紫川/,['玄幻','热血']],[/剑来|画江湖|少年歌行|少年白马|暗河|大理寺|狐妖/,['武侠','冒险']],[/吞噬|灵笼|星辰|师士/,['科幻','热血']],[/一人之下|斩神|龙族|灵境|全职法师|镇魂街/,['奇幻','热血']],[/茶啊|非人哉|伍六七|大王饶命|有兽|有药/,['搞笑']],[/时光代理|火旺/,['悬疑']]];
let saved={};try{const value=JSON.parse(localStorage.getItem('guoman-saved')||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
let preferredView='grid';try{preferredView=localStorage.getItem('guoman-view')==='list'?'list':'grid';}catch{}
let preferredRegion='all';try{const v=localStorage.getItem('guoman-region');if(['cn','jp','all'].includes(v))preferredRegion=v;}catch{}
const state={data:null,page:'home',region:preferredRegion,platform:'all',genre:'all',query:'',sort:'rank',view:preferredView,limit:12,week:null,archiveDate:null,loading:true,heroIndex:0};
Object.assign(state,{schedule:null,scheduleLoading:false,scheduleError:'',scheduleDate:todayKey(),scheduleUnknown:false,scheduleSaved:false});
let scheduleRequest=null;
let installPrompt=null,toastTimer,requestId=0;
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function number(n){if(n==null)return '—';if(n>=1e8)return `${(n/1e8).toFixed(1)}亿`;if(n>=1e4)return `${(n/1e4).toFixed(1)}万`;return new Intl.NumberFormat('zh-CN').format(n);}
function dateText(iso,options={month:'2-digit',day:'2-digit'}){return new Date(iso).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',...options});}
function weekText(key){return formatWeek(key);}

genreRules.push([/火影|航海王|海贼|龙珠|鬼灭|咒术|黑色四叶草|一拳|死神|炎炎消防|幽游|全职猎人/,['热血','冒险']],[/柯南|冰菓|奇巧计程|侦探已经死|夏日重现/,['推理','悬疑']],[/间谍过家家|齐木|银魂|蜡笔小新|碧蓝之海|坂本日常|男子高中生的日常/,['搞笑','日常']],[/堀与宫村|薰香|正相反|阿宅的恋爱|四月是你|青春猪头|邻座|高木|五等分|女仆|好想告诉|恋爱|婚约|租借女友|更衣人偶/,['恋爱','校园']],[/夏目|葬送的芙莉莲|小林家的龙女仆|玉子市场/,['治愈','日常']],[/孤独摇滚|颂乐人偶|BanG Dream|迷途之子|轻音/,['音乐','日常']],[/排球|网球王子|蓝色监狱|灌篮|黑子的篮球|足球小将/,['运动','热血']],[/迷宫饭|魔女之旅|不灭的你|芙莉莲/,['奇幻','冒险']],[/异世界|转生|从零开始|OVERLORD|不死者|盾之勇者|慎重|这个勇者/,['异世界','奇幻']],[/刀剑|石纪元|高达|新世纪福音|命运石之门|超电磁炮/,['科幻']]);
function genres(item){const manual=genreRules.filter(([rule])=>rule.test(item.title)).flatMap(([,tags])=>tags);return [...new Set([...item.tags,...manual])];}
const regionName=()=>state.region==='jp'?'日漫':state.region==='cn'?'国漫':'动漫';
function regionLabel(item){return countryOf(item)==='日本'?'日漫':'国漫';}
function chartLabel(source){return source.chart || (source.source==='bilibili'?(countryOf(source)==='日本'?'番剧周榜':'国创周榜'):'平台热榜');}
function scopedItems(items=state.data?.items||[]){return regionItems(items,state.region);}
function allItems(){const live=state.data?.items||[];if(state.page==='schedule')return scopedItems(scheduleItems());if(state.page!=='saved')return scopedItems(live);const liveMap=new Map(live.map(x=>[x.id,x]));return scopedItems(Object.values(saved).filter(x=>x&&typeof x.title==='string'&&Array.isArray(x.platforms)).map(x=>liveMap.get(x.id)||x));}
function visibleItems(){let list=allItems().filter(item=>(state.platform==='all'||item.platforms.some(p=>p.source===state.platform))&&(state.genre==='all'||genres(item).includes(state.genre))&&(!state.query||`${item.title} ${genres(item).join(' ')}`.toLowerCase().includes(state.query.toLowerCase())));
 if(state.page==='schedule')return list.filter(x=>(state.scheduleUnknown||x.schedule.date===state.scheduleDate)&&(!state.scheduleSaved||saved[x.id])).sort((a,b)=>(a.schedule?.time||'99:99').localeCompare(b.schedule?.time||'99:99')||a.title.localeCompare(b.title,'zh'));
 if(state.sort==='rank')list.sort((a,b)=>state.platform==='all'?a.position-b.position:(a.platforms.find(p=>p.source===state.platform)?.rank??999)-(b.platforms.find(p=>p.source===state.platform)?.rank??999)||a.position-b.position);
 else if(state.sort==='rating')list.sort((a,b)=>(b.rating||0)-(a.rating||0));
 else if(state.sort==='followers')list.sort((a,b)=>(b.followers||0)-(a.followers||0));
 else list.sort((a,b)=>a.title.localeCompare(b.title,'zh'));
 return list;
}
function currentSource(item){return item.platforms.find(p=>p.source===state.platform)||item.platforms[0];}
function metric(item){const source=currentSource(item);if(source.kind)return {value:source.time||(source.completed?'已完结':'当日更新'),label:'更新时间'};if(state.platform==='all')return {value:item.index,label:'榜单指数'};if(source.metric!=null)return {value:number(source.metric),label:source.metricLabel};return {value:source.rank?`TOP ${source.rank}`:'精选',label:source.rank?'原始榜位':`${regionLabel(item)}推荐`};}
function episode(item){return currentSource(item).episodes || item.platforms.find(p=>p.episodes)?.episodes || '前往平台查看更新';}
function card(item,i){const source=currentSource(item),m=metric(item),rank=source.kind?null:state.platform==='all'?item.position:source.rank;const id=escape(item.id);return `<article class="anime-card" data-country="${escape(countryOf(item))}" style="animation-delay:${Math.min(i,11)*25}ms"><button class="poster-button" data-detail="${id}" aria-label="查看${escape(item.title)}"><div class="poster-fallback">${escape(item.title.slice(0,8))}</div>${source.cover?`<img src="${escape(img(source.cover))}" alt="${escape(item.title)}海报" loading="lazy" decoding="async">`:''}${rank?`<span class="rank-ribbon top-${rank}">${String(rank).padStart(2,'0')}</span>`:''}<span class="card-platforms">${item.platforms.slice(0,2).map(p=>`<span>${shorts[p.source]}</span>`).join('')}${item.platforms.length>2?`<span>+${item.platforms.length-2}</span>`:''}</span><span class="poster-bottom"><span>${escape(episode(item))}</span>${item.rating?`<span class="card-rating">${item.rating.toFixed(1)}<small> 分</small></span>`:''}</span></button><div class="card-body"><div class="card-title-row"><button class="card-title" data-detail="${id}" title="${escape(item.title)}">${escape(item.title)}</button><button class="save-button ${saved[item.id]?'saved':''}" data-save="${id}" aria-label="${saved[item.id]?'取消追番':'加入追番'}：${escape(item.title)}" aria-pressed="${!!saved[item.id]}">${icon(saved[item.id]?'check':'bookmark')}</button></div><div class="card-tags"><span>${regionLabel(item)}</span>${genres(item).slice(0,2).map(x=>`<span>${escape(x)}</span>`).join('')}${!genres(item).length?`<span>${countryOf(item)==='日本'?'日本动画':'国产动画'}</span>`:''}</div><div class="card-bottom"><span class="card-metric">${icon('flame')}<strong>${escape(m.value)}</strong><span class="metric-caption">${escape(m.label)}</span></span><span class="card-ranking-label">${source.kind?'每日更新':source.rankingType==='recommendation'?'平台推荐':state.platform==='bilibili'?chartLabel(source):'平台上榜'}</span></div></div></article>`;}
function emptyState(){let title,description,action;if(!state.data?.items.length&&state.page!=='saved'){title='暂时没有获取到榜单';description='平台可能暂时不可访问。稍后再刷新，已保存的追番仍可查看。';action='<button class="primary-button" data-action="refresh">重新获取榜单</button>';}else if(state.page==='saved'&&!Object.keys(saved).length){title='把喜欢的故事，留在这里';description='点击作品旁的收藏图标，建立你的专属追番片单。';action='<button class="primary-button" data-page="home">去发现好动漫</button>';}else{title=`还没有找到这部${regionName()}`;description=state.query?`没有找到「${escape(state.query)}」，试试作品名或其他关键词。`:'当前平台或题材下暂无作品，换个筛选再看看。';action='<button class="primary-button" data-action="reset-filters">查看全部作品</button>';}return `<div class="empty-state"><span class="empty-icon">${icon(state.page==='saved'?'bookmark':'search')}</span><h3>${title}</h3><p>${description}</p>${action}</div>`;}
function renderCards(){if(state.page==='schedule'){renderSchedule();return;}const list=visibleItems();$('#cards').className=`cards-grid ${state.view==='list'?'list-view':''}`;$('#cards').setAttribute('aria-busy',String(state.loading));if(state.loading&&!state.data){$('#cards').innerHTML=Array.from({length:8},()=>'<div class="skeleton"></div>').join('');return;}$('#cards').innerHTML=list.length?list.slice(0,state.limit).map(card).join(''):emptyState();$('#results-count').textContent=`共 ${list.length} 部${regionName()}`;$('#load-more').hidden=list.length<=state.limit;$('#load-more').innerHTML=`再发现 ${Math.min(12,list.length-state.limit)} 部好${regionName()} ${icon('chevron-down')}`;$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));updateBanner();}

function scheduleItems(){
 const live=state.data?.items||[];
 const platformMap=new Map(live.flatMap(item=>item.platforms.map(p=>[p.id,item])));
 const entries=state.schedule?.items||[];
 if(state.scheduleUnknown){const known=new Set(entries.map(x=>x.id));return live.filter(x=>!x.platforms.some(p=>known.has(p.id))).map(x=>({...x,schedule:null}));}
 return entries.map(entry=>{
  const match=platformMap.get(entry.id),p=match?.platforms.find(p=>p.id===entry.id);
  return {...entry,...match,id:match?.id||`schedule:${entry.id}`,detailId:entry.eventId,tags:[...new Set([...(match?.tags||[]),...(entry.tags||[])])],
   platforms:[{...p,...entry,chart:'每日更新时间表',rank:null,metric:null}],schedule:entry};
 });
}
function scheduleStatus(s){return !s?'未提供排期':s.delayed?'延期 / 调整':s.completed?'已完结':s.kind==='recurring'?'常规排期':s.kind==='calendar'?'平台排期':s.published?'已更新':'待更新';}
const WEEKDAYS=['周一','周二','周三','周四','周五','周六','周日'];
function weekdayOf(date){const day=new Date(`${date}T00:00:00Z`).getUTCDay();return Number.isFinite(day)?WEEKDAYS[(day+6)%7]:'';}
function scheduleTime(s){
 if(!s)return {main:'待更新',sub:''};
 if(s.completed)return {main:'已完结',sub:''};
 if(s.time)return {main:s.time,sub:s.timeNote||'更新'};
 if(s.delayed)return {main:'延期',sub:''};
 return {main:`${weekdayOf(s.date)}更新`,sub:''};
}
function scheduleMoment(s){
 if(!s)return '排期未提供';
 if(s.completed)return '已完结';
 if(s.time)return `${s.time} 更新${s.timeNote?` · ${s.timeNote}`:''}`;
 if(s.delayed)return '延期 / 调整';
 return `${weekdayOf(s.date)}更新`;
}
function scheduleDetailNote(s){
 if(!s)return '排期未提供';
 if(s.completed)return `${s.date} · 已完结`;
 return `${s.date} · ${scheduleMoment(s)} · ${scheduleStatus(s)}`;
}
function scheduleCard(item){
 const s=item.schedule,p=currentSource(item),id=escape(item.id),detail=escape(item.detailId||item.id),stamp=scheduleTime(s);
 const rule=s?.updateText||s?.scheduleText;
 return `<article class="anime-card schedule-card" data-source="${escape(p.source)}" data-country="${escape(countryOf(item))}"><button class="schedule-cover" data-detail="${detail}" aria-label="查看${escape(item.title)}">${p.cover?`<img src="${escape(img(p.cover))}" alt="${escape(item.title)}海报" loading="lazy">`:'<span>漫</span>'}</button><div class="schedule-card-body"><div class="schedule-card-top"><span class="schedule-time">${escape(stamp.main)}${stamp.sub?`<small>${escape(stamp.sub)}</small>`:''}</span><span class="schedule-status ${s?.delayed?'delayed':s?.completed?'completed':s?.published?'published':''}">${scheduleStatus(s)}</span></div><button class="card-title" data-detail="${detail}">${escape(item.title)}</button><p class="schedule-episode">${escape(s?.delayed?s.delayReason||'以平台最新公告为准':s?.episodes||episode(item))}</p>${rule?`<p class="schedule-rule" title="${escape(rule)}">${escape(rule)}</p>`:''}<div class="schedule-card-bottom"><span><i class="tab-dot ${p.source}-dot"></i>${shorts[p.source]} · ${regionLabel(item)}${s?.stale?' · 缓存':''}</span><button class="save-button ${saved[item.id]?'saved':''}" data-save="${id}" aria-label="${saved[item.id]?'取消追番':'加入追番'}：${escape(item.title)}" aria-pressed="${!!saved[item.id]}">${icon(saved[item.id]?'check':'bookmark')}</button></div></div></article>`;
}
function renderSchedule(){
 const today=todayKey(),week=weekStart(today),days=Array.from({length:7},(_,i)=>addDays(week,i)),labels=['周一','周二','周三','周四','周五','周六','周日'];
 if(!days.includes(state.scheduleDate))state.scheduleDate=today;
 const unknown=state.scheduleUnknown;state.scheduleUnknown=false;
 const entries=allItems().filter(x=>(state.platform==='all'||x.platforms.some(p=>p.source===state.platform))&&(!state.scheduleSaved||saved[x.id])&&(state.genre==='all'||genres(x).includes(state.genre))&&(!state.query||`${x.title} ${genres(x).join(' ')}`.toLowerCase().includes(state.query.toLowerCase())));
 state.scheduleUnknown=unknown;
 const list=visibleItems(),sources=state.schedule?.coverage||[];
 $('#schedule-content').innerHTML=`<div class="schedule-intro"><div><span class="schedule-kicker">YOUR DAILY ANIME</span><h2>追番的快乐，<span>每天准时见。</span></h2><p>本周 ${formatWeek(week)} <span>· 北京时间</span></p></div><button class="schedule-today" data-action="schedule-today">${icon('clock')}回到今天</button></div><nav class="schedule-days" aria-label="选择更新星期">${days.map((date,i)=>`<button data-schedule-date="${date}" aria-pressed="${!unknown&&date===state.scheduleDate}" class="${!unknown&&date===state.scheduleDate?'active':''} ${date===today?'today':''}"><span>${labels[i]}${date===today?'<i>今天</i>':''}</span><strong>${date.slice(5).replace('-',' / ')}</strong><small>${state.scheduleLoading?'…':entries.filter(x=>x.schedule.date===date).length+' 部'}</small></button>`).join('')}</nav><div class="schedule-options"><span>${icon('radio')}按平台公开排期整理</span><div><button data-action="schedule-saved" aria-pressed="${state.scheduleSaved}" class="${state.scheduleSaved?'active':''}">${icon('bookmark')}只看追番</button><button data-action="schedule-unknown" aria-pressed="${unknown}" class="${unknown?'active':''}">未提供排期 ↗</button></div></div><div class="schedule-coverage">${sources.map(s=>`<span class="${s.available?'available':''}"><i></i>${shorts[s.source]} · ${escape(s.label||(s.available?'已收录排期':'排期暂未接入'))}</span>`).join('')}</div>`;
 $('#list-title').innerHTML=unknown?`${icon('info')} 未提供排期`:`${icon('clock')} ${state.scheduleDate===today?'今天':labels[days.indexOf(state.scheduleDate)]}更新 <span class="live-badge">${list.length} 部</span>`;
 $('#list-description').textContent=unknown?'这些热榜作品暂未取得本周可靠排期，部分可能已完结；可前往正版平台确认。':`${state.scheduleDate.replaceAll('-','.')} · 按更新时间排列，实际播出与临时调整以平台为准。`;
 $('#cards').className='cards-grid schedule-grid';$('#cards').setAttribute('aria-busy',String(state.scheduleLoading));
 $('#cards').innerHTML=state.scheduleLoading&&!state.schedule?Array.from({length:4},()=>'<div class="skeleton schedule-skeleton"></div>').join(''):list.length?list.slice(0,state.limit).map(scheduleCard).join(''):`<div class="empty-state"><span class="empty-icon">${icon('clock')}</span><h3>${state.scheduleError?'时间表暂时无法读取':state.scheduleSaved?'这一天还没有已追番的更新':unknown?'当前筛选下没有作品':'这一天暂未收录更新'}</h3><p>${state.scheduleError?'检查网络后重试，已有的收藏仍可查看。':'试试其他星期或平台；未取得可靠排期的作品不会分配到具体日期。'}</p><button class="primary-button" data-action="${state.scheduleError?'schedule-retry':'schedule-today'}">${state.scheduleError?'重新读取':'回到今天'}</button></div>`;
 $('#results-count').textContent=`共 ${list.length} 部${regionName()}`;$('#load-more').hidden=list.length<=state.limit;$('#load-more').innerHTML=`再看 ${Math.min(12,list.length-state.limit)} 部 ${icon('chevron-down')}`;
 const failures=state.schedule?.feeds.filter(x=>x.error)||[];
 const banner=$('#status-banner');banner.hidden=false;banner.classList.toggle('warning',!navigator.onLine||!!state.scheduleError||!!failures.length);
 banner.textContent=!navigator.onLine?'当前离线，显示已缓存的排期。联网后可重新读取。':state.scheduleError?'排期读取失败，请稍后重试。':failures.length?'部分时间表暂不可用，已保留最近成功数据；日期以缓存记录为准。':'排期来自腾讯视频、哔哩哔哩、优酷和爱奇艺的官方更新日历；卡片优先显示平台公布的更新时间，只有更新日、没有钟点的会标出星期几。「平台排期」不代表已确认上线，会员抢先看以更新说明为准。';
 $('#ranking-note').innerHTML=`${state.schedule?.feeds.find(x=>x.fetchedAt)?.fetchedAt?'排期最近采集 '+dateText(state.schedule.feeds.find(x=>x.fetchedAt).fetchedAt,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})+' · ':''}每分钟自动同步，临时停更与会员更新以正版平台为准。<button data-action="schedule-retry">重新读取 ↗</button>`;
}
async function fetchSchedule({force=false,silent=false}={}){
 if(scheduleRequest)return scheduleRequest;
 const previousError=state.scheduleError;state.scheduleLoading=true;state.scheduleError='';if(!silent&&state.page==='schedule')renderCards();
 scheduleRequest=(async()=>{let changed=false;try{const r=await fetch(force?'/api/schedule/refresh':'/api/schedule',{method:force?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(45000)});const data=await r.json();if(!r.ok)throw new Error(data.error||'排期读取失败');changed=JSON.stringify(data)!==JSON.stringify(state.schedule);state.schedule=data;if(!silent&&force)toast(data.feeds.some(x=>x.error)?'已同步可用排期，部分平台暂不可用':'每日排期已同步');}catch(e){state.scheduleError=e.message;}finally{state.scheduleLoading=false;scheduleRequest=null;if(state.page==='schedule'&&(!silent||changed||state.scheduleError||previousError))renderCards();renderSyncStatus();}})();
 return scheduleRequest;
}
function updateBanner(){
 const el=$('#status-banner');let text='',warning=false;
 if(state.page==='archive')text=`正在查看 ${weekText(state.data?.week||state.week)} 的已保存榜单。存档仅包含采集当时的内容分类。`;
 if(state.platform!=='all'){
  const source=state.data?.sources.find(s=>s.id===state.platform);
  if(source){text+=`${text?' ':''}${source.name} · ${source.kind}。${source.id==='bilibili'?'国创榜与番剧榜分别为近 7 天榜单；番剧榜已过滤欧美动画和真人特摄。':source.id==='youku'?'热度榜作品与平台推荐分别标注，推荐项不标榜位。':'保留平台原始榜位，按原产地筛选国漫与日漫。'}`;if(source.error){text+=source.count?' 当前来源不可用，展示最近成功获取的数据。':' 当前来源不可用，请稍后刷新。';warning=true;}}
 }else if(state.data?.sources.some(s=>s.error)){text+=`${text?' ':''}${state.data.sources.filter(s=>s.error).map(s=>s.name).join('、')}暂时不可用；有缓存的来源显示上次数据。`;warning=true;}
 else if(state.data?.updatedAt&&Date.now()-new Date(state.data.updatedAt)>5*60000){text+='当前显示已保存的榜单，数据尚未更新。';warning=true;}
 if(!navigator.onLine){text='当前处于离线状态，展示本机缓存。联网后可刷新榜单。';warning=true;}
 el.hidden=!text;el.textContent=text;el.classList.toggle('warning',warning);
}
function renderSyncStatus(){
 const el=$('#sync-status');if(!el)return;
 const daily=state.page==='schedule',archive=state.page==='archive';
 const sources=daily?state.schedule?.feeds||[]:state.data?.sources||[];
 const times=sources.map(s=>s.fetchedAt).filter(Boolean).sort();
 const latest=times.at(-1),oldest=times[0];
 const stale=!!oldest&&Date.now()-new Date(oldest)>5*60000;
 const failed=(daily?state.scheduleError:state.syncError)||sources.some(s=>s.error);
 const text=!navigator.onLine?'当前离线 · 联网后自动同步':archive?'历史周刊 · 保留采集时的记录':failed?'部分来源待重试 · 已保留最近数据':stale?'数据较旧 · 正在等待平台同步':latest?'自动同步中':'正在连接平台';
 el.classList.toggle('warning',!navigator.onLine||!!failed||stale);el.hidden=false;
 el.innerHTML=`<span><i></i>${escape(text)}</span><small>${archive?'':`${daily?'排期每分钟':'榜单每 2 分钟'}采集${latest?' · 最近成功 '+dateText(latest,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):''}`}</small>`;
}
function renderRegionControls(){
 $$('[data-region]').forEach(b=>{const active=b.dataset.region===state.region;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('.genre-tabs').innerHTML=`<button data-genre="all" aria-pressed="${state.genre==='all'}" class="${state.genre==='all'?'active':''}">全部题材</button>${GENRES[state.region].map(g=>`<button data-genre="${g}" aria-pressed="${state.genre===g}" class="${state.genre===g?'active':''}">${g}</button>`).join('')}`;
 $('#stat-scope').textContent=`本周收录${regionName()}`;
 $('#stat-region-note').textContent=state.region==='all'?'国漫与日漫，一起发现':state.region==='jp'?'发现日本动画好故事':'只看国产好故事';
 $('.hero-decoration').innerHTML=state.region==='jp'?'日<br>漫':state.region==='cn'?'国<br>漫':'动<br>漫';
 $('#search').placeholder=`搜索你喜欢的${regionName()}…`;
 $('#search').setAttribute('aria-label',`搜索${regionName()}`);
}

function renderSavedCounts(){const n=Object.keys(saved).length;$$('.saved-count').forEach(x=>x.textContent=n);$('.mobile-saved-dot').hidden=!n;$$('.saved-count').forEach(el=>el.setAttribute('aria-label',`${n} 部追番`));}
function heroItems(){const list=scopedItems();const chosen=[list.find(x=>x.platforms.some(p=>p.source==='bilibili'&&p.rank===1)),list.find(x=>x.platforms.some(p=>p.source==='tencent'&&p.rank===1)),list.find(x=>x.platforms.some(p=>p.source==='youku'&&p.rank===1))].filter(Boolean);return [...new Map([...chosen,...list].map(x=>[x.id,x])).values()].slice(0,3);}
function renderHero(){const choices=heroItems();if(!choices.length){const hero=$('#hero');hero.querySelector('h2').textContent=`下一部好${regionName()}，等你发现`;hero.querySelector('.hero-description').textContent='当前分类还没有焦点作品，可以切换分类或稍后刷新。';hero.querySelector('.hero-background').style.backgroundImage='none';hero.querySelector('.hero-buttons').innerHTML='';hero.querySelector('.hero-meta').innerHTML='';hero.querySelector('.hero-pagination').innerHTML='';return;}state.heroIndex%=choices.length;const item=choices[state.heroIndex],s=item.platforms.find(p=>p.rank===1)||item.platforms[0];const hero=$('#hero');hero.querySelector('.hero-background').style.backgroundImage=`url("${img(s.backdrop||s.cover)}")`;hero.querySelector('h2').textContent=item.title;hero.querySelector('.hero-description').textContent=item.description || `${names[s.source]}${chartLabel(s)}第 ${s.rank} 名，看看这个被热爱着的动漫故事。`;hero.querySelector('.hero-rank').innerHTML=`<span>${String(s.rank||1).padStart(2,'0')}</span><span>${names[s.source]}<br>${chartLabel(s)}焦点</span>`;hero.querySelector('.hero-meta').innerHTML=`${item.rating?`<span><strong>★ ${item.rating.toFixed(1)}</strong> B站评分</span>`:''}<span>${countryOf(item)==='日本'?'日本动画':'国产动画'}</span><span>${escape(episode(item))}</span>`;hero.querySelector('.hero-buttons').innerHTML=`<button class="primary-button" data-detail="${escape(item.id)}">${icon('play')}探索这部${regionLabel(item)}</button><button class="secondary-button" data-save="${escape(item.id)}">${icon(saved[item.id]?'check':'bookmark')}${saved[item.id]?'已加入追番':'加入追番'}</button>`;hero.querySelector('.hero-pagination').innerHTML=choices.map((_,i)=>`<button data-hero="${i}" class="${i===state.heroIndex?'active':''}" aria-label="本周焦点第 ${i+1} 部" aria-pressed="${i===state.heroIndex}"></button>`).join('');}
function renderStats(){const d=state.data;if(!d)return;$('#stat-total').innerHTML=`${scopedItems().length} <small>部</small>`;$('#stat-sources').innerHTML=`${d.sources.filter(s=>s.count&&!s.error).length} <small>/ 4</small>`;$('#stat-time').textContent=d.updatedAt?dateText(d.updatedAt,{hour:'2-digit',minute:'2-digit',hour12:false}):'待更新';$('#stat-time').title=d.updatedAt?dateText(d.updatedAt,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';$('#source-summary').textContent=d.sources.every(s=>!s.error&&s.count)?'所有平台已连接':'查看来源状态';$$('[data-source-status]').forEach(el=>{const s=d.sources.find(s=>s.id===el.dataset.sourceStatus);el.className=s?.count&&!s.error?'live':'failed';el.title=s?.error||'连接正常';});$('#week-label').textContent=d.week?weekText(d.week):'本周榜单';}
function renderPage(){
 const savedPage=state.page==='saved',archive=state.page==='archive',daily=state.page==='schedule';
 $('#home-content').hidden=savedPage||archive||daily;
 $('#schedule-content').hidden=!daily;
 $('.week-selector').hidden=daily;
 $('.view-switch').hidden=daily;$('.sort-control').hidden=daily;
 $('#breadcrumb-page').textContent=daily?'每日更新':savedPage?'我的追番':archive?'周刊日历':'每周新发现';
 $('#page-title').innerHTML=daily?'每天都有，<span>新的期待。</span>':savedPage?'你的热爱，<span>在这里。</span>':archive?'翻开一周，<span>重逢好故事。</span>':`好${regionName()}，<span>每周见。</span>`;
 $('#page-subtitle').textContent=daily?'从周一到周日，找到今天值得等的那一集。':savedPage?'把喜欢的故事收藏起来，下一次见面更简单。':archive?'用日期记录热爱，回看每一周值得追的动漫。':'从国漫到日漫，四大平台的精彩，一站发现。';
 if(!daily)$('#ranking-note').innerHTML='综合排序参考各平台原始名次；各平台热度口径不同。<button data-action="about">了解榜单规则 ↗</button>';
 $('#list-title').innerHTML=savedPage?`${icon('bookmark')} 我的追番 <span class="live-badge">${Object.keys(saved).length} 部</span>`:archive?`<span class="heading-symbol">↗</span> ${state.data?.week?state.data.week.slice(0,4)+' 年 · 第 '+weekNumber(state.data.week)+' 周':'周刊档案'}`:'<span class="heading-symbol">↗</span> 本周人气榜 <span class="live-badge"><i></i> LIVE</span>';
 $('#list-description').textContent=savedPage?'属于你的动漫片单，下一份心动也收藏在这里。':archive&&state.data?.week?weekText(state.data.week)+' · 当周保存的动漫片单':`从平台热榜出发，发现正在被追的好${regionName()}。`;
 $$('[data-page]').forEach(button=>{const active=button.dataset.page===state.page;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 $$('[data-platform]').forEach(button=>{const active=button.dataset.platform===state.platform;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
 renderRegionControls();renderSavedCounts();renderStats();renderHero();renderCards();renderSyncStatus();
 $('#week-caption').textContent=archive?'回看的刊期':'本周刊期';
}

async function fetchData(week=null,{silent=false}={}){
 if(silent&&state.loading)return false;
 const id=++requestId;state.loading=true;if(!silent)renderCards();
 try{
  const response=await fetch(`/api/rankings${week?`?week=${encodeURIComponent(week)}`:''}`,{cache:'no-store',signal:AbortSignal.timeout(45000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'榜单获取失败');if(id!==requestId)return false;
  const changed=JSON.stringify(state.data)!==JSON.stringify(data);state.data=data;state.week=week;state.loading=false;state.syncError=false;if(!silent||changed)renderPage();else renderSyncStatus();return true;
 }catch(error){
  if(id!==requestId)return false;state.loading=false;state.syncError=true;if(!state.data)state.data={items:[],sources:[],updatedAt:null};renderPage();if(silent)return false;
  toast(error.name==='TimeoutError'?'连接超时，请稍后刷新榜单':error.message==='Failed to fetch'?'网络连接失败，请检查网络':error.message);return false;
 }
}

function itemById(id){return allItems().find(x=>x.detailId===id||x.id===id)||state.data?.items.find(x=>x.id===id)||saved[id];}
function toggleSave(id){const item=itemById(id);if(!item)return;const next={...saved};if(next[id])delete next[id];else next[id]={...item,savedAt:new Date().toISOString()};try{localStorage.setItem('guoman-saved',JSON.stringify(next));saved=next;}catch{toast('设备存储不可用，暂时无法保存追番');return;}toast(saved[id]?`已将《${item.title}》加入追番`:'已取消追番');renderSavedCounts();renderHero();renderCards();if($('#modal').open){const detail=$('#modal-content').dataset.detail;if(itemById(detail)?.id===id)showDetail(detail);}}
let modalPreviousFocus;
function showModal(html,detail=''){if(!$('#modal').open)modalPreviousFocus=document.activeElement;$('#modal').classList.toggle('calendar-dialog',html.includes('calendar-picker'));$('#modal-content').innerHTML=html;$('#modal-content').dataset.detail=detail;hydrateIcons($('#modal'));if(!$('#modal').open)$('#modal').showModal();document.body.style.overflow='hidden';$('#modal').scrollTop=0;}
function safeLink(url){try{const u=new URL(url);return u.protocol==='https:'?escape(u.href):'#';}catch{return '#';}}
function showDetail(id){const x=itemById(id);if(!x)return;const source=currentSource(x);showModal(`<div class="detail-backdrop" style="background-image:url('${escape(img(source.backdrop||source.cover))}')"><div class="detail-hero-title"><small>ANIME WEEKLY · ${regionLabel(x)}片单</small><h2>${escape(x.title)}</h2></div></div><div class="detail-body"><div class="detail-tags"><span>${countryOf(x)==='日本'?'日本 · 日本动画':'中国 · 国产动画'}</span>${genres(x).map(t=>`<span>${escape(t)}</span>`).join('')}${x.rating?`<span>★ ${x.rating} B站评分</span>`:''}</div><p>${escape(x.description||'这个故事正在被更多人看见。前往正版平台，了解剧情与最新更新。')}</p><div class="detail-actions"><span style="font-size:11px;color:#8b95ac">${escape(episode(x))}</span><button class="detail-save" data-save="${escape(x.id)}">${icon(saved[x.id]?'check':'bookmark')}${saved[x.id]?'已加入我的追番':'加入我的追番'}</button></div>${(x.schedule?.updateText||x.schedule?.scheduleText)?`<h3>更新说明</h3><p>${escape(x.schedule.updateText||x.schedule.scheduleText)}</p>`:''}<h3>在这些平台发现</h3>${x.platforms.map(p=>`<div class="source-detail"><span class="platform-logo ${p.source}">${marks[p.source]}</span><div><strong>${names[p.source]} ${p.rank?`· ${chartLabel(p)}第 ${p.rank} 名`:`· ${p.kind?'每日更新':regionLabel(p)+'推荐'}`}</strong><p>${p.metric!=null?`${escape(p.metricLabel)} ${number(p.metric)} · `:''}${p.fetchedAt?dateText(p.fetchedAt,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'已收藏'}${p.stale?' · 使用缓存':''}</p></div><a href="${safeLink(p.url)}" target="_blank" rel="noopener noreferrer">正版观看 ${icon('arrow-up-right')}</a></div>`).join('')}<p class="detail-note">${x.schedule?`${escape(scheduleDetailNote(x.schedule))}。`:x.index!=null?`综合榜单指数 ${x.index} · 各平台评分、热度互不通用。`:'来自平台每日更新时间表。'}观看、会员与播放权限以原平台为准。题材由平台标签与作品分类整理。</p></div>`,id);}
function showAbout(){const sources=state.data?.sources||[];showModal(`<div class="modal-inner"><div class="modal-eyebrow">ABOUT THE CHARTS</div><h2>把每一份热爱，认真记录。</h2><p>动漫周刊汇集四大平台的公开榜单与国漫、日漫片单，榜单每 2 分钟、排期每分钟自动同步，按北京时间的自然周（周一至周日）保存。服务运行期间会持续搜寻，手机离线时可以查看缓存。</p><h3>四个平台，各自真实的榜单</h3>${sources.map(s=>`<div class="source-detail"><span class="platform-logo ${s.id}">${marks[s.id]}</span><div><strong>${escape(s.name)} · ${escape(s.kind)}</strong><p>${s.count} 部 · ${s.error?escape(s.error):s.fetchedAt?dateText(s.fetchedAt,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'等待更新'}</p></div><a href="${safeLink(s.url)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a></div>`).join('')}<h3>综合排序是怎么来的？</h3><p>按各平台原始名次计算倒数排名分：每次上榜贡献 1 /（60 + 名次），多平台同名作品相加，再将第一名归一为 100 分。优酷推荐项每项贡献 0.35 / 100，低于正式榜单。这个「榜单指数」是本站发现排序，不代表官方热度或周播放量。仅合并名称一致的作品，不同季数分别保留。</p><h3>国漫 / 日漫，自由切换</h3><p>可以查看全部动漫，也可按国漫、日漫筛选。B站国创榜与番剧榜分别采集，番剧榜只保留已确认的日本动画；爱奇艺按地区字段筛选；腾讯与优酷结合平台分类及已确认系列识别产地。中文版日漫仍归日漫，欧美动画、未知产地作品和真人特摄不收入。题材结合平台标签与本地作品分类，可能不完整。</p><h3>你的片单属于你</h3><p>收藏保存在本机浏览器，不需要注册账号。清除浏览器数据会移除收藏；不同设备之间暂不自动同步。首次运行以前的周榜不会补造，存档从实际采集时开始。</p></div>`);}
const archiveCalendar=new ArchiveCalendar({
 root:$('#modal-content'),
 open:html=>showModal(html),
 loadWeeks:async()=>{const response=await fetch('/api/weeks',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('读取失败');return response.json();},
 onChoose:async(date,week)=>{
  $('#modal').close();state.page='archive';state.archiveDate=date;state.limit=12;resetFilters();
  await fetchData(week);window.scrollTo({top:0,behavior:'smooth'});
 },
});
async function showWeeks(){await archiveCalendar.show(state.archiveDate||state.week||todayKey());}

async function showInstall(){await openMobileAccess({showModal,escape,toast,install:async()=>{if(!installPrompt){toast('请按上方步骤添加到手机主屏幕');return;}await installPrompt.prompt();const result=await installPrompt.userChoice;installPrompt=null;if(result.outcome==='accepted')toast('已添加动漫周刊到主屏幕');}});}

async function doRefresh(){if(state.page==='schedule'){await fetchSchedule({force:true});return;}if(state.week){await fetchData(state.week);toast('已重新读取周榜存档');return;}const buttons=$$('[data-action="refresh"]');buttons.forEach(b=>{b.disabled=true;b.classList.add('loading');});try{const r=await fetch('/api/refresh',{method:'POST',signal:AbortSignal.timeout(45000)});const d=await r.json();if(!r.ok)throw new Error(d.error||'更新失败');state.data=d;renderPage();toast(d.sources.some(s=>s.error)?'已更新可用来源，部分平台暂不可用':'已同步四大平台，榜单更新完成');}catch(e){toast(e.name==='TimeoutError'?'更新仍在进行，稍后会自动显示':e.message==='Failed to fetch'?'网络不可用，请连接后再试':e.message);}finally{buttons.forEach(b=>{b.disabled=false;b.classList.remove('loading');});}}
function resetFilters(){state.platform='all';state.genre='all';state.query='';state.sort='rank';state.limit=12;$('#search').value='';$('#sort').value='rank';renderPage();}
async function changePage(page){
 if(page==='archive'){await showWeeks();return;}
 const wasArchive=!!state.week;state.page=page;state.limit=12;resetFilters();window.scrollTo({top:0,behavior:'smooth'});
 if(wasArchive){state.archiveDate=null;await fetchData();}
 if(page==='schedule'){state.scheduleDate=todayKey();state.scheduleUnknown=false;renderPage();await fetchSchedule();}
}

document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.scheduleDate){state.scheduleDate=b.dataset.scheduleDate;state.scheduleUnknown=false;state.limit=12;renderCards();}
 const action=b.dataset.action;
 if(action==='schedule-today'){state.scheduleDate=todayKey();state.scheduleUnknown=false;state.limit=12;renderCards();}
 if(action==='schedule-unknown'){state.scheduleUnknown=!state.scheduleUnknown;state.limit=12;renderCards();}
 if(action==='schedule-saved'){state.scheduleSaved=!state.scheduleSaved;state.limit=12;renderCards();}
 if(action==='schedule-retry')await fetchSchedule({force:true});
});

document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.detail){showDetail(b.dataset.detail);return;}if(b.dataset.save){toggleSave(b.dataset.save);return;}if(b.dataset.page){await changePage(b.dataset.page);return;}if(b.dataset.platform){state.platform=b.dataset.platform;state.limit=12;renderPage();if(b.closest('.source-nav'))$('.rankings-section').scrollIntoView({behavior:'smooth',block:'start'});return;}if(b.dataset.region){state.region=b.dataset.region;state.genre='all';state.limit=12;state.heroIndex=0;try{localStorage.setItem('guoman-region',state.region);}catch{}renderPage();return;}if(b.dataset.genre){state.genre=b.dataset.genre;state.limit=12;renderPage();return;}if(b.dataset.view){state.view=b.dataset.view;try{localStorage.setItem('guoman-view',state.view);}catch{}renderCards();return;}if(b.dataset.hero!=null){state.heroIndex=Number(b.dataset.hero);renderHero();return;}const action=b.dataset.action;if(action==='about')showAbout();if(action==='install')await showInstall();if(action==='weeks')await showWeeks();if(action==='close-modal')$('#modal').close();if(action==='refresh')await doRefresh();if(action==='reset-filters')resetFilters();if(action==='focus-search'){$('.topbar').classList.toggle('search-open');$('#search').focus();}});
$('#search').addEventListener('input',e=>{state.query=e.target.value.trim();state.limit=12;renderCards();});
$('#sort').addEventListener('change',e=>{state.sort=e.target.value;state.limit=12;renderCards();});
$('#load-more').addEventListener('click',()=>{state.limit+=12;renderCards();});
$('#cards').addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.remove();},true);
$('#modal').addEventListener('close',()=>{document.body.style.overflow='';modalPreviousFocus?.isConnected&&modalPreviousFocus.focus();});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('#modal').open){e.preventDefault();$('.topbar').classList.add('search-open');$('#search').focus();}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
window.addEventListener('online',()=>{toast('网络已连接');renderSyncStatus();});window.addEventListener('offline',()=>{if(state.page==='schedule')renderCards();else updateBanner();renderSyncStatus();toast('已离线，仍可浏览已缓存的片单');});
if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js').catch(()=>{});
watchUpdates(type=>{if(state.page==='archive')return;if(type==='rankings')void fetchData(null,{silent:true});if(type==='schedule'&&state.page==='schedule')void fetchSchedule({silent:true});});
renderSavedCounts();renderPage();fetchData();
