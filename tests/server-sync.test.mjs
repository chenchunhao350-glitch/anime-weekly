import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';

test('server publishes fresh episodes, bypasses refresh caches and retains last successful data on failure', {timeout:20000},async()=>{
 const root=fileURLToPath(new URL('..',import.meta.url)),dir=await fs.mkdtemp(path.join(os.tmpdir(),'anime-sync-'));
 let child,reader;const abort=new AbortController();
 try{
  await fs.mkdir(path.join(dir,'src'));await fs.mkdir(path.join(dir,'public'));await fs.mkdir(path.join(dir,'data'));
  await fs.writeFile(path.join(dir,'package.json'),' {"type":"module"}');
  await fs.copyFile(path.join(root,'server.mjs'),path.join(dir,'server.mjs'));
  for(const name of (await fs.readdir(path.join(root,'src'))).filter(x=>x.endsWith('.mjs')))await fs.copyFile(path.join(root,'src',name),path.join(dir,'src',name));
  await fs.copyFile(path.join(root,'public/calendar.js'),path.join(dir,'public/calendar.js'));
  await fs.appendFile(path.join(dir,'src/sources.mjs'),`
   let calls=0;
   for(const id of Object.keys(loaders))loaders[id]=async()=>{
    const fs=await import('node:fs/promises');
    if(await fs.access('fail-ranks').then(()=>true,()=>false))throw Error('platform unavailable');
    return [{id:id+':1',source:id,title:'测试动漫',country:'中国',rank:1,tags:[],episodes:'更新至'+(++calls)+'集'}];
   };
  `);
  await fs.appendFile(path.join(dir,'src/schedule.mjs'),`
   let episodes=0;
   loadTimeline=async feed=>{
    const fs=await import('node:fs/promises');
    if(await fs.access('fail-calendar').then(()=>true,()=>false))throw Error('calendar unavailable');
    return [{id:feed.source+':1',source:feed.source,title:'测试动漫',country:'中国',date:todayKey(),time:'10:00',tags:[],episodes:'更新至'+(++episodes)+'集',kind:'official',published:true}];
   };
  `);
  child=spawn(process.execPath,['server.mjs'],{cwd:dir,windowsHide:true,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  const base=await new Promise((resolve,reject)=>{
   let logs='';child.once('error',reject);child.once('exit',code=>reject(Error('server exited '+code+' '+logs)));
   child.stdout.on('data',chunk=>{logs+=chunk;const match=logs.match(/http:\/\/localhost:(\d+)/);if(match)resolve('http://127.0.0.1:'+match[1]);});
  });
  const read=async(url,options)=>{const r=await fetch(base+url,options);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');return r.json();};
  const before=await read('/api/rankings'),schedule=await read('/api/schedule');
  assert.equal(before.refreshIntervalSeconds,120);assert.equal(schedule.refreshIntervalSeconds,60);
  const stream=await fetch(base+'/api/events',{signal:abort.signal});assert.match(stream.headers.get('content-type'),/text\/event-stream/);
  reader=stream.body.getReader();const first=new TextDecoder().decode((await reader.read()).value);assert.match(first,/event: sync/);
  const rankRefresh=await read('/api/refresh',{method:'POST'});
  assert.notEqual(rankRefresh.items[0].episodes,before.items[0].episodes);
  assert.match(new TextDecoder().decode((await reader.read()).value),/event: sync/);
  assert.equal((await fetch(base+'/api/refresh',{method:'POST'})).status,429);
  assert.equal((await fetch(base+'/api/schedule/refresh',{method:'POST',headers:{Origin:'https://other.example'}})).status,403);
  await fs.writeFile(path.join(dir,'fail-calendar'),'1');
  const failed=await read('/api/schedule/refresh',{method:'POST'});
  assert.deepEqual(failed.items.map(x=>x.episodes),schedule.items.map(x=>x.episodes));
  assert.deepEqual(failed.feeds.map(x=>x.fetchedAt),schedule.feeds.map(x=>x.fetchedAt));
  assert.ok(failed.feeds.every(x=>x.error));assert.ok(failed.items.every(x=>x.stale));
  assert.equal((await fetch(base+'/api/schedule/refresh',{method:'POST'})).status,429);
  await fs.writeFile(path.join(dir,'fail-ranks'),'1');
  // Restart permits an immediate scheduled retry, retaining the same data directory.
  const ended=once(child,'exit');child.kill();await ended;reader.cancel().catch(()=>{});abort.abort();
  child=spawn(process.execPath,['server.mjs'],{cwd:dir,windowsHide:true,env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  const restarted=await new Promise(resolve=>child.stdout.on('data',data=>{const match=String(data).match(/http:\/\/localhost:(\d+)/);if(match)resolve('http://127.0.0.1:'+match[1]);}));
  const cached=await fetch(restarted+'/api/rankings').then(r=>r.json());
  assert.equal(cached.updatedAt,rankRefresh.updatedAt);assert.ok(cached.sources.every(x=>x.error));
  assert.deepEqual(cached.items.map(x=>x.episodes),rankRefresh.items.map(x=>x.episodes));
 }finally{
  reader?.cancel().catch(()=>{});abort.abort();
  if(child&&child.exitCode===null){const ended=once(child,'exit');child.kill();await ended;}
  await fs.rm(dir,{recursive:true,force:true});
 }
});
