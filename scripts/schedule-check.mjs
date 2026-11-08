import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright'));}
const base=process.env.BASE_URL||'http://localhost:3000';
const data=await fetch(base+'/api/schedule').then(r=>r.json());
assert(data.items.length>0,'real public timetable has entries');
assert(data.coverage.every(x=>x.available&&x.count>0),'all four sources return confirmed anime schedules');
await fs.mkdir('output/playwright',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('.anime-card').first().waitFor();
 await page.locator('.main-nav [data-page="schedule"]').click();
 await page.waitForFunction(()=>document.querySelector('#cards').getAttribute('aria-busy')==='false');
 assert.equal(await page.locator('.schedule-days>button').count(),7);
 assert.equal(await page.locator('.schedule-days [aria-pressed="true"]').getAttribute('data-schedule-date'),data.today);
 assert(data.items.some(x=>x.time),'schedule exposes real clock times');
 assert.equal(await page.locator('.schedule-time',{hasText:'时间待定'}).count(),0,'no pending-time placeholders');
 const firstStamp=(await page.locator('.schedule-time').first().textContent()).trim();
 assert(firstStamp&&!/待定/.test(firstStamp),'cards always label a concrete time or weekday');
 for(const button of await page.locator('.schedule-days>button').all()){
  const date=await button.getAttribute('data-schedule-date');
  await button.click();
  const expected=data.items.filter(x=>x.date===date).length;
  assert.equal(await page.locator('.schedule-card').count(),Math.min(expected,12),date);
 }
 const date=data.items[0].date;
 await page.locator(`[data-schedule-date="${date}"]`).click();
 await page.locator('.schedule-card .save-button').first().click();
 await page.locator('[data-action="schedule-saved"]').click();
 assert.equal(await page.locator('.schedule-card').count(),1);
 await page.locator('.schedule-card .card-title').first().click();
 assert(await page.locator('.detail-note').textContent().then(t=>!t.includes('undefined')));
 assert((await page.locator('.source-detail strong').first().textContent()).includes('每日更新'));
 await page.keyboard.press('Escape');
 await page.locator('[data-action="schedule-saved"]').click();
 await page.locator('[data-region="jp"]').click();
 assert.equal(await page.locator('.schedule-card:not([data-country="日本"])').count(),0);
 await page.locator('[data-region="all"]').click();
 await page.locator('.platform-tabs [data-platform="tencent"]').click();
 assert.equal(await page.locator('.schedule-card').count(),data.items.filter(x=>x.source==='tencent'&&x.date===date).length);
 await page.locator('[data-action="schedule-unknown"]').click();
 assert((await page.locator('.schedule-card').count())>0);
 assert((await page.locator('#list-title').textContent()).includes('未提供排期'));
 await page.locator('.platform-tabs [data-platform="all"]').click();
 await page.locator('[data-action="schedule-today"]').click();
 await page.locator('#search').fill('不存在的动漫abc123');
 assert.equal(await page.locator('.schedule-card').count(),0);
 await page.locator('#search').fill('');
 assert.equal(await page.locator('.schedule-card').count(),Math.min(data.items.filter(x=>x.date===data.today).length,12));
 for(const source of ['tencent','bilibili','youku','iqiyi']){
  await page.locator(`.platform-tabs [data-platform="${source}"]`).click();
  const expected=data.items.filter(x=>x.date===data.today&&x.source===source);
  assert.equal(await page.locator('.schedule-card').count(),Math.min(expected.length,12));
  assert.equal(await page.locator(`.schedule-card:not([data-source="${source}"])`).count(),0);
  if(expected.length){
   await page.locator('.schedule-card .card-title').first().click();
   assert((await page.locator('.detail-note').textContent()).includes(data.today),'details keep the selected calendar day');
   const url=await page.locator('.source-detail>a').first().getAttribute('href');
   assert(url.includes({tencent:'v.qq.com',bilibili:'bilibili.com',youku:'youku.com',iqiyi:'iqiyi.com'}[source]),'details keep the selected platform');
   if(source==='tencent'){
    assert((await page.locator('.detail-body').textContent()).includes('更新说明'));
    await page.locator('.detail-save').click();
    assert((await page.locator('.detail-save').textContent()).includes('已加入'));
    assert(await page.evaluate(()=>!Object.keys(JSON.parse(localStorage.getItem('guoman-saved'))).some(k=>k.startsWith('event:'))),'save keys identify series rather than calendar events');
    await page.locator('.detail-save').click();
   }
   await page.keyboard.press('Escape');
  }
  await page.screenshot({path:`output/playwright/daily-${source}.png`,fullPage:true,animations:'disabled'});
  console.log(source,'today',expected.length,'correct source and date PASS');
 }
 await page.locator('.platform-tabs [data-platform="all"]').click();
 await page.screenshot({path:'output/playwright/daily-desktop.png',fullPage:true,animations:'disabled'});
 await page.locator('.main-nav [data-page="home"]').click();
 assert(await page.locator('#schedule-content').isHidden());
 assert(await page.locator('.view-switch').isVisible());
 await page.locator('.main-nav [data-page="saved"]').click();
 assert.equal(await page.locator('.anime-card').count(),1);
 console.log('Desktop: seven days match live API, filters, favorites, details, unknown schedules and navigation PASS');
 for(const width of [390,320]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await context.route('https://fonts.googleapis.com/**',route=>route.abort());
  const phone=await context.newPage();phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(base,{waitUntil:'domcontentloaded'});
  await phone.locator('.anime-card').first().waitFor();
  await phone.locator('.mobile-nav [data-page="schedule"]').click();
  await phone.waitForFunction(()=>document.querySelector('#cards').getAttribute('aria-busy')==='false');
  assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await phone.screenshot({path:`output/playwright/daily-mobile-${width}.png`,fullPage:true,animations:'disabled'});
  await phone.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await phone.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await phone.reload({waitUntil:'domcontentloaded'});
  await phone.locator('.anime-card').first().waitFor();
  await context.setOffline(true);
  await phone.reload({waitUntil:'domcontentloaded'});
  await phone.locator('.mobile-nav [data-page="schedule"]').click();
  await phone.waitForFunction(()=>document.querySelector('#cards').getAttribute('aria-busy')==='false');
  assert.equal(await phone.locator('.schedule-days>button').count(),7);
  assert((await phone.locator('#status-banner').textContent()).includes('离线'));
  assert.equal(await phone.locator('.schedule-card').count(),Math.min(data.items.filter(x=>x.date===data.today).length,12));
  await context.close();console.log(`Mobile ${width}px: daily navigation, layout, offline schedule PASS`);
 }
 const broken=await browser.newContext({serviceWorkers:'block'});
 await broken.route('https://fonts.googleapis.com/**',route=>route.abort());
 const failPage=await broken.newPage();failPage.on('pageerror',e=>errors.push(e.message));
 await failPage.route('**/api/schedule',route=>route.fulfill({status:503,json:{error:'test failure'}}));
 await failPage.goto(base,{waitUntil:'domcontentloaded'});
 await failPage.locator('.main-nav [data-page="schedule"]').click();
 await failPage.getByRole('heading',{name:'时间表暂时无法读取'}).waitFor();
 assert.equal(await failPage.locator('.schedule-card').count(),0);
 await failPage.unroute('**/api/schedule');
 await failPage.getByRole('button',{name:'重新读取',exact:true}).click();
 await failPage.waitForFunction(()=>document.querySelector('#cards').getAttribute('aria-busy')==='false');
 assert((await failPage.locator('.schedule-card').count())>0);
 await broken.close();console.log('Failure and retry: PASS');
 assert.deepEqual(errors,[]);console.log('JavaScript errors:',errors);
}finally{await browser.close();}
