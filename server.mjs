import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {SOURCE_INFO,loaders,aggregate,weekKey} from './src/sources.mjs';
import {SCHEDULE_FEEDS,loadTimeline,buildSchedule} from './src/schedule.mjs';
import {mobileAccess} from './src/mobile-access.mjs';
import {qrSvg} from './src/qr.mjs';
import {refreshTask} from './src/refresh-task.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=path.join(root,'data');
await fs.mkdir(dataDir,{recursive:true});
const CACHE=path.join(dataDir,'current.json');
const RANK_INTERVAL=120000,SCHEDULE_INTERVAL=60000;
const DATA_VERSION=2;
let state={sources:{},updatedAt:null}, lastManual=0,lastScheduleManual=0;
try {state=JSON.parse(await fs.readFile(CACHE,'utf8'));}catch{}
const imageCache=new Map();
const SCHEDULE_CACHE=path.join(dataDir,'schedule.json');
let scheduleFeeds={};
try{scheduleFeeds=JSON.parse(await fs.readFile(SCHEDULE_CACHE,'utf8'));}catch{}
const clients=new Set();
let revision={rankings:0,schedule:0};
function publish(type){revision[type]++;for(const res of clients){if(res.writableLength>65536){res.destroy();clients.delete(res);}else res.write(`event: sync\ndata: ${JSON.stringify(revision)}\n\n`);}}
const refreshSchedule=refreshTask(async()=>{
    await Promise.all(Object.entries(SCHEDULE_FEEDS).map(async([id,feed])=>{
      try{scheduleFeeds[id]={items:await loadTimeline(feed),fetchedAt:new Date().toISOString(),error:null};}
      catch(e){scheduleFeeds[id]={...(scheduleFeeds[id]||{items:[],fetchedAt:null}),error:e.message};}
    }));
    await atomicWrite(SCHEDULE_CACHE,scheduleFeeds);
    publish('schedule');
},{interval:SCHEDULE_INTERVAL});
async function atomicWrite(filename,value){const temp=filename+'.tmp';await fs.writeFile(temp,JSON.stringify(value));await fs.rename(temp,filename);}
function payload(snapshot=state){return { updatedAt:snapshot.updatedAt, week:snapshot.week || weekKey(), refreshIntervalSeconds:RANK_INTERVAL/1000, sources:Object.entries(SOURCE_INFO).map(([id,info])=>({id,...info,count:snapshot.sources[id]?.items?.length || 0,fetchedAt:snapshot.sources[id]?.fetchedAt || null,error:snapshot.sources[id]?.error || null})), items:aggregate(snapshot.sources) };}
function schedulePayload(){return {...buildSchedule(scheduleFeeds,state.sources),refreshIntervalSeconds:SCHEDULE_INTERVAL/1000};}
const refresh=refreshTask(async()=>{
    const results=await Promise.allSettled(Object.entries(loaders).map(async([id,load])=>{
      try {const items=await load();if(!items.length)throw new Error('来源未返回可确认地区的动漫');return [id,{items,fetchedAt:new Date().toISOString(),error:null}];}
      catch(e){return [id,{...(state.sources[id] || {items:[],fetchedAt:null}),error:e.message}];}
    }));
    for(const result of results)if(result.status==='fulfilled')state.sources[result.value[0]]=result.value[1];
    const successes=Object.values(state.sources).map(s=>s.fetchedAt).filter(Boolean).sort();
    state.updatedAt=successes.at(-1)||null;state.week=weekKey();state.version=DATA_VERSION;
    await atomicWrite(CACHE,state);
    if(Object.values(state.sources).some(s=>s.items.length))await atomicWrite(path.join(dataDir,`week-${state.week}.json`),state);
    publish('rankings');
    console.log('榜单更新',state.updatedAt,Object.entries(state.sources).map(([id,s])=>`${id}: ${s.items.length}${s.error?' (cached/error)':''}`).join(' | '));
},{interval:RANK_INTERVAL});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
const allowedImageHosts=['hdslb.com','qpic.cn','iqiyipic.com','alicdn.com','ykimg.com'];
function validImageUrl(url){return url.protocol==='https:' && !url.username && !url.password && (!url.port || url.port==='443') && allowedImageHosts.some(h=>url.hostname===h || url.hostname.endsWith('.'+h));}
async function serveImage(res,url){
  const remote=new URL(url.searchParams.get('url') || 'invalid:');
  if(!validImageUrl(remote)){res.writeHead(400);return res.end();}
  let cached=imageCache.get(remote.href);
  if(!cached){
    let destination=remote;
    let response;
    for(let i=0;i<4;i++){
      response=await fetch(destination,{redirect:'manual',headers:{'Referer':destination.origin+'/','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(12000)});
      if(![301,302,303,307,308].includes(response.status))break;
      destination=new URL(response.headers.get('location'),destination);
      if(!validImageUrl(destination))throw new Error('不允许的图片重定向');
    }
    if(!response.ok || !response.headers.get('content-type')?.startsWith('image/') || response.headers.get('content-type')?.includes('svg'))throw new Error('图片不可用');
    const chunks=[];let length=0;
    for await(const chunk of response.body){length+=chunk.length;if(length>8*1024*1024)throw new Error('图片过大');chunks.push(chunk);}
    cached={body:Buffer.concat(chunks),type:response.headers.get('content-type')};
    if(imageCache.size>=50)imageCache.delete(imageCache.keys().next().value);
    imageCache.set(remote.href,cached);
  }
  res.writeHead(200,{'Content-Type':cached.type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'});res.end(cached.body);
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  if(url.pathname==='/api/events'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(`retry: 3000\nevent: sync\ndata: ${JSON.stringify(revision)}\n\n`);clients.add(res);
    const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),20000);
    res.on('close',()=>{clearInterval(heartbeat);clients.delete(res);});return;
  }
  if((url.pathname==='/api/mobile-access'||url.pathname==='/api/mobile/qr')&&req.method==='GET'){
    const access=await mobileAccess(dataDir);
    if(url.pathname==='/api/mobile-access')return json(res,access);
    if(access.status!=='ready')return json(res,{error:'手机访问连接尚未就绪'},503);
    res.writeHead(200,{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'no-store'});return res.end(qrSvg(access.url));
  }
  if(url.pathname==='/api/schedule'&&req.method==='GET'){
    await refreshSchedule();
    return json(res,schedulePayload());
  }
  if(url.pathname==='/api/schedule/refresh'&&req.method==='POST'){
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return json(res,{error:'不允许跨站刷新'},403);
    if(Date.now()-lastScheduleManual<60000)return json(res,{error:'刚刚更新过，请一分钟后再试'},429);
    lastScheduleManual=Date.now();await refreshSchedule(true);return json(res,schedulePayload());
  }
  if(url.pathname==='/api/rankings' && req.method==='GET'){
    const week=url.searchParams.get('week');
    if(week && week!==weekKey()){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(week))return json(res,{error:'无效的周次'},400);
      try{return json(res,payload(JSON.parse(await fs.readFile(path.join(dataDir,`week-${week}.json`),'utf8'))));}catch{return json(res,{error:'这一周还没有存档'},404);}
    }
    await refresh(state.week!==weekKey());
    return json(res,payload());
  }
  if(url.pathname==='/api/weeks')return json(res,{weeks:(await fs.readdir(dataDir)).filter(x=>/^week-\d{4}-\d{2}-\d{2}\.json$/.test(x)).map(x=>x.slice(5,-5)).sort().reverse()});
  if(url.pathname==='/api/refresh' && req.method==='POST'){
    if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)return json(res,{error:'不允许跨站刷新'},403);
    if(Date.now()-lastManual<60_000)return json(res,{error:'刚刚更新过，请一分钟后再试'},429);
    lastManual=Date.now();await refresh(true);return json(res,payload());
  }
  if(url.pathname==='/api/image' && req.method==='GET')return await serveImage(res,url);
  if(url.pathname==='/api/network'){
    if(!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host||''))return json(res,{addresses:[]});
    if(req.socket.remoteAddress&&!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return json(res,{addresses:[]});
    const addresses=Object.values(os.networkInterfaces()).flat().filter(x=>x.family==='IPv4'&&!x.internal).map(x=>`http://${x.address}:${server.address().port}`);
    return json(res,{addresses});
  }
  if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405);return res.end();}
  const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const file=path.resolve(root,'public','.'+requested);
  if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);return res.end();}
  try{const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':['.html','.js','.css','.webmanifest'].includes(path.extname(file))?'no-cache':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404);res.end('Not found');}
 }catch(e){if(!res.headersSent)json(res,{error:'请求暂时失败，请稍后重试'},502);else res.end();console.error(e.message);}
});
const port=Number(process.env.PORT || 3000);
server.listen(port,'0.0.0.0',()=>console.log(`动漫周刊 http://localhost:${server.address().port}`));
refreshSchedule().catch(console.error);
refresh().catch(console.error);
setInterval(()=>{refresh(state.week!==weekKey()).catch(console.error);refreshSchedule().catch(console.error);},10000).unref();
