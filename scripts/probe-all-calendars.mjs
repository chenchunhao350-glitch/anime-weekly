import fs from 'node:fs/promises';
import {SCHEDULE_FEEDS,loadTimeline,buildSchedule} from '../src/schedule.mjs';
await fs.mkdir('output/research',{recursive:true});
const ranks=JSON.parse(await fs.readFile('data/current.json','utf8')).sources;
const feeds={};
await Promise.all(Object.entries(SCHEDULE_FEEDS).map(async([id,feed])=>{
 try{const items=await loadTimeline(feed);feeds[id]={items,fetchedAt:new Date().toISOString(),error:null};console.log(id,'raw',items.length);}
 catch(e){feeds[id]={items:[],error:e.message};console.log(id,'ERROR',e.message);}
}));
await fs.writeFile('output/research/all-calendars.json',JSON.stringify(feeds));
const result=buildSchedule(feeds,ranks);
console.log(JSON.stringify({week:result.week,today:result.today,coverage:result.coverage,todayItems:result.items.filter(x=>x.date===result.today).map(x=>({title:x.title,source:x.source,time:x.time,country:x.country}))},null,2));
if(result.coverage.some(x=>!x.available||!x.count))process.exitCode=1;
