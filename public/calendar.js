const DAY=86400000;
export const MIN_YEAR=2000, MAX_YEAR=2100;
const pad=n=>String(n).padStart(2,'0');
function keyOf(date){return `${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;}
export function validDateKey(key){
  if(typeof key!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(key))return false;
  const date=new Date(`${key}T00:00:00Z`);
  return Number.isFinite(+date)&&keyOf(date)===key;
}
export function todayKey(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const read=type=>parts.find(p=>p.type===type).value;
  return `${read('year')}-${read('month')}-${read('day')}`;
}
export function addDays(key,days){if(!validDateKey(key))throw new Error('无效日期');return keyOf(new Date(+new Date(`${key}T00:00:00Z`)+days*DAY));}
export function weekStart(key){const date=new Date(`${key}T00:00:00Z`);if(!validDateKey(key))throw new Error('无效日期');return addDays(key,-(date.getUTCDay()+6)%7);}
export function weekNumber(key){
  const date=new Date(`${weekStart(key)}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+3);
  return Math.ceil(((date-Date.UTC(date.getUTCFullYear(),0,1))/DAY+1)/7);
}
export function formatWeek(key){const end=addDays(weekStart(key),6),start=weekStart(key);return `${start.replaceAll('-','.')} — ${start.slice(0,4)===end.slice(0,4)?end.slice(5).replace('-','.'):end.replaceAll('-','.')}`;}
export function monthCells(year,month){
  const first=`${year}-${pad(month)}-01`,start=weekStart(first);
  return Array.from({length:42},(_,i)=>{const key=addDays(start,i);return {key,day:Number(key.slice(8)),inMonth:Number(key.slice(5,7))===month};});
}
const glyph={left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>'};
const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${glyph[name]}</svg>`;
const dateLabel=key=>`${Number(key.slice(0,4))}年${Number(key.slice(5,7))}月${Number(key.slice(8))}日`;
export class ArchiveCalendar {
  constructor({root,open,onChoose,loadWeeks}){
    Object.assign(this,{root,open,onChoose,loadWeeks});this.weeks=[];this.loading=false;this.error=false;
    root.addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button||!root.querySelector('.calendar-picker'))return;
      if(button.dataset.calDate){this.select(button.dataset.calDate);return;}
      const action=button.dataset.calAction;
      if(action==='prev')this.shift(-1);
      if(action==='next')this.shift(1);
      if(action==='today')this.select(todayKey());
      if(action==='retry')this.show(this.selected || todayKey());
      if(action==='apply'&&this.available())this.onChoose(this.selected,weekStart(this.selected));
    });
    root.addEventListener('change',e=>{
      if(e.target.id==='calendar-year')this.changeView(Number(e.target.value),this.month);
      if(e.target.id==='calendar-month')this.changeView(this.year,Number(e.target.value));
      if(e.target.id==='calendar-date'&&validDateKey(e.target.value))this.select(e.target.value);
    });
    root.addEventListener('keydown',e=>{
      const date=e.target.closest('[data-cal-date]')?.dataset.calDate;
      if(!date)return;
      const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
      if(offset){e.preventDefault();const next=addDays(date,offset);if(Number(next.slice(0,4))>=MIN_YEAR&&Number(next.slice(0,4))<=MAX_YEAR){this.select(next);root.querySelector(`[data-cal-date="${next}"]`)?.focus();}}
    });
  }
  async show(date=todayKey()){
    this.selected=validDateKey(date)?date:todayKey();this.year=Number(this.selected.slice(0,4));this.month=Number(this.selected.slice(5,7));this.loading=true;this.error=false;
    this.open(this.html());
    try{const data=await this.loadWeeks();this.weeks=(data.weeks||[]).filter(key=>validDateKey(key)&&weekStart(key)===key).sort().reverse();}
    catch{this.error=true;}
    this.loading=false;if(this.root.querySelector('.calendar-picker'))this.render();
  }
  select(key){if(!validDateKey(key))return;const year=Number(key.slice(0,4));if(year<MIN_YEAR||year>MAX_YEAR)return;this.selected=key;this.year=year;this.month=Number(key.slice(5,7));this.render();}
  changeView(year,month){this.year=year;this.month=month;this.selected=null;this.render();}
  shift(offset){const date=new Date(Date.UTC(this.year,this.month-1+offset,1));const year=date.getUTCFullYear();if(year>=MIN_YEAR&&year<=MAX_YEAR)this.changeView(year,date.getUTCMonth()+1);}
  available(){return !!this.selected&&!this.loading&&!this.error&&this.weeks.includes(weekStart(this.selected));}
  render(){const focused=this.root.contains(document.activeElement)?document.activeElement.id:'';this.root.innerHTML=this.html();if(focused)this.root.querySelector(`#${focused}`)?.focus({preventScroll:true});}
  html(){
    const today=todayKey(),selectedWeek=this.selected?weekStart(this.selected):null,available=this.available();
    const years=Array.from({length:MAX_YEAR-MIN_YEAR+1},(_,i)=>MIN_YEAR+i);
    const days=monthCells(this.year,this.month);
    const previewTitle=this.loading?'正在读取周刊档案…':this.error?'暂时无法读取档案':!this.selected?'挑一个日期，遇见一周好故事':available?`第 ${String(weekNumber(this.selected)).padStart(2,'0')} 周 · 已收录`:'这一周还没有榜单';
    const previewDescription=this.error?'检查网络连接后，再试一次。':!this.selected?'先选择日期，系统会找到它所在的周榜。':available?'已找到这一周的榜单，可以查看当时的动漫片单。':this.selected>today?'未来的好故事还在路上，先看看已有的周刊吧。':'周榜从首次采集开始保存，有圆点的日期代表已有记录。';
    return `<section class="calendar-picker" aria-label="榜单日期选择"><div class="calendar-heading"><span class="calendar-kicker">THE WEEKLY ARCHIVE</span><h2>翻开一周，<span>遇见好故事。</span></h2><p>选择年份与日期，回看那一周的动漫热榜。</p></div><div class="calendar-layout"><div class="calendar-main"><div class="calendar-toolbar"><div class="calendar-selects"><label><span class="sr-only">年份</span><select id="calendar-year" aria-label="年份">${years.map(y=>`<option value="${y}" ${y===this.year?'selected':''}>${y} 年</option>`).join('')}</select></label><label><span class="sr-only">月份</span><select id="calendar-month" aria-label="月份">${Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}" ${m===this.month?'selected':''}>${m} 月</option>`).join('')}</select></label></div><div class="calendar-arrows"><button data-cal-action="prev" aria-label="上个月" ${this.year===MIN_YEAR&&this.month===1?'disabled':''}>${svg('left')}</button><button data-cal-action="today">今天</button><button data-cal-action="next" aria-label="下个月" ${this.year===MAX_YEAR&&this.month===12?'disabled':''}>${svg('right')}</button></div></div><div class="calendar-weekdays" aria-hidden="true">${['一','二','三','四','五','六','日'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid" role="group" aria-label="${this.year}年${this.month}月日期">${days.map(d=>{const known=this.weeks.includes(weekStart(d.key)),chosen=d.key===this.selected,inWeek=selectedWeek&&weekStart(d.key)===selectedWeek;return `<button type="button" data-cal-date="${d.key}" class="calendar-day ${d.inMonth?'':'other-month'} ${chosen?'selected':''} ${inWeek?'in-week':''} ${known?'has-archive':''} ${d.key===today?'is-today':''}" aria-label="${dateLabel(d.key)}，${known?'有周榜':'暂无周榜'}" aria-pressed="${chosen}" ${Number(d.key.slice(0,4))<MIN_YEAR||Number(d.key.slice(0,4))>MAX_YEAR?'disabled':''}><span>${d.day}</span><i></i></button>`;}).join('')}</div><div class="calendar-legend"><span><i></i>有榜单记录</span><span>按北京时间 · 周一至周日</span></div><label class="calendar-direct"><span>${svg('calendar')}直接选择日期</span><input id="calendar-date" type="date" min="${MIN_YEAR}-01-01" max="${MAX_YEAR}-12-31" value="${this.selected || ''}" aria-label="直接选择日期"></label></div><aside class="calendar-preview"><div class="calendar-preview-icon">${svg('calendar')}</div><span class="calendar-preview-label">${this.selected?dateLabel(this.selected):'你的动漫时光机'}</span><h3>${previewTitle}</h3><p class="calendar-range">${selectedWeek?formatWeek(selectedWeek):'每一周，都值得被记住。'}</p><p class="calendar-description" role="status">${previewDescription}</p>${this.error?'<button class="calendar-retry" data-cal-action="retry">重新读取档案 ↗</button>':''}<button class="calendar-apply" data-cal-action="apply" ${available?'':'disabled'}>查看这一周 ${svg('arrow')}</button><div class="calendar-recent"><span>最近收录 <small>${this.loading?'…':this.weeks.length+' 期'}</small></span>${this.weeks.slice(0,3).map(w=>`<button data-cal-date="${w}"><span>${w.replaceAll('-','.')}</span><small>第 ${weekNumber(w)} 周 ↗</small></button>`).join('')}${!this.loading&&!this.weeks.length&&!this.error?'<p>第一期周刊正在路上。</p>':''}</div></aside></div></section>`;
  }
}
