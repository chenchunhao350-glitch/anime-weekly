import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright'));}
const base=process.env.BASE_URL||'http://localhost:3000';
const ranks=await fetch(base+'/api/rankings').then(r=>r.json()),schedule=await fetch(base+'/api/schedule').then(r=>r.json());
assert.ok(ranks.sources.every(s=>s.count&&!s.error),'real rankings connect all four sources');
assert.ok(schedule.coverage.every(s=>s.available),'real calendars connect all four sources');
await fs.mkdir('output/playwright',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 // Isolate changing upstream data and stream events to this browser only.
 await context.addInitScript(()=>{
  window.EventSource=class extends EventTarget{constructor(){super();window.testStream=this;}close(){this.closed=true;}};
 });
 let rankData=structuredClone(ranks),scheduleData=structuredClone(schedule),rankCalls=0,forced=0;
 await context.route('**/api/rankings',route=>{rankCalls++;return route.fulfill({json:rankData});});
 await context.route('**/api/schedule',route=>route.fulfill({json:scheduleData}));
 await context.route('**/api/schedule/refresh',route=>{assert.equal(route.request().method(),'POST');forced++;return route.fulfill({json:scheduleData});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.anime-card').first().waitFor();
 await page.clock.install();
 const emit=async data=>page.evaluate(data=>window.testStream.dispatchEvent(new MessageEvent('sync',{data:JSON.stringify(data)})),data);
 rankData.items[0].episodes='更新至999集 · 自动同步验证';rankData.items[0].platforms.forEach(p=>p.episodes=rankData.items[0].episodes);
 await emit({rankings:100,schedule:100});
 await page.getByText('更新至999集 · 自动同步验证',{exact:true}).first().waitFor();
 assert.match(await page.locator('#sync-status').textContent(),/榜单每 2 分钟/);
 await page.getByRole('searchbox').fill(rankData.items[0].title);
 const callCount=rankCalls;
 rankData.items[0].episodes='更新至1000集 · 自动补查验证';rankData.items[0].platforms.forEach(p=>p.episodes=rankData.items[0].episodes);
 await page.clock.runFor(30000);
 await page.getByText('更新至1000集 · 自动补查验证',{exact:true}).first().waitFor();
 assert.ok(rankCalls>callCount);assert.equal(await page.getByRole('searchbox').inputValue(),rankData.items[0].title);
 await page.getByRole('searchbox').fill('');await page.locator('.main-nav [data-page="schedule"]').click();
 await page.waitForFunction(()=>document.querySelector('#cards').getAttribute('aria-busy')==='false');
 const todayItems=scheduleData.items.filter(x=>x.date===scheduleData.today);assert.ok(todayItems.length);
 todayItems[0].episodes='更新至101集 · 排期同步验证';
 await emit({rankings:100,schedule:101});
 await page.getByText('更新至101集 · 排期同步验证',{exact:true}).waitFor();
 await page.locator('[data-action="schedule-retry"]').last().click();
 await page.waitForFunction(()=>document.querySelector('#cards').getAttribute('aria-busy')==='false');assert.equal(forced,1);
 scheduleData.feeds[0].error='test platform offline';
 await emit({rankings:100,schedule:102});
 await page.waitForFunction(()=>document.querySelector('#sync-status').classList.contains('warning'));
 scheduleData.feeds[0].error=null;
 await emit({rankings:100,schedule:103});
 await page.waitForFunction(()=>!document.querySelector('#sync-status').classList.contains('warning'));
 await page.screenshot({path:'output/playwright/live-desktop.png'});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`output/playwright/live-mobile-${width}.png`});
 }
 await context.setOffline(true);await page.getByText('当前离线 · 联网后自动同步',{exact:true}).waitFor();
 await context.setOffline(false);await page.waitForFunction(()=>!document.querySelector('#sync-status').textContent.includes('当前离线'));
 assert.deepEqual(errors,[]);
 console.log('PASS: real four-platform feeds, streamed episodes, 30-second fallback, filters retained, manual POST, failures/recovery, 390/320px, offline/online.');
}finally{await browser.close();}
