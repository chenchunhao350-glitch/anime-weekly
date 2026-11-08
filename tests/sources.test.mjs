import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBilibili,parseTencent,parseIqiyi,parseYouku,aggregate,weekKey,isKnownDomestic,isKnownJapanese} from '../src/sources.mjs';
import {regionItems,matchesRegion,GENRES} from '../public/catalog.js';

test('Tencent classifies dubbed Japanese shows by origin and excludes unclassified works',()=>{
 const items=parseTencent({data:{Results:[{ChannelID:'3',Result:{ListInfo:[{Query:'火影忍者[普通话版]',ID:'foreign',HotLevel:900},{Query:'仙逆',ID:'domestic',HotLevel:800},{Query:'全新未知作品',ID:'unknown',HotLevel:700}]}}]}});
 assert.equal(items.length,2);assert.equal(items[0].country,'日本');assert.equal(items[0].rank,1);assert.equal(items[1].title,'仙逆');assert.equal(items[1].country,'中国');assert.equal(items[1].rank,2);assert.equal(items[1].metric,800);
 assert.equal(isKnownDomestic('名侦探柯南[普通话版]'),false);
});
test('iQiyi uses country metadata to include Chinese and Japanese anime, excluding Western and live-action content',()=>{
 const block=(rank,title,country)=>`<a data-rseat-v2="${rank}" data-pb-v2="aid=${rank}" href="//www.iqiyi.com/v_${rank}.html" class="rvi__box rvi__box3"><picture id="//pic.iqiyipic.com/test.jpg"></picture><div title="${title}" class="rvi__tit1">${title}</div><div title="2026 / ${country}" class="rvi__type1">2026 / ${country} / 热血</div><p class="rvi__des2">故事 &amp; 冒险</p><span class="rvi__index__num">1234</span></a>`;
 const items=parseIqiyi(block(1,'日漫中文版','日本')+block(2,'国产新作','内地')+block(3,'欧美动画','美国')+block(4,'假面骑士','日本'));
 assert.equal(items.length,2);assert.equal(items[0].country,'日本');assert.equal(items[1].country,'中国');assert.equal(items[1].rank,2);assert.equal(items[1].title,'国产新作');assert.equal(items[1].description,'故事 & 冒险');assert.equal(items[1].metric,1234);assert.equal(items[1].cover,'https://pic.iqiyipic.com/test.jpg');
});
test('Youku keeps verified hot rankings and domestic recommendations distinct',()=>{
 const item=(title,id,rank)=>({title,action_value:id,img:'https://img.alicdn.com/p.jpg',reason:rank?{text:{title:`动漫热度榜·TOP${rank}`}}:null});
 const data={moduleList:[{components:[{title:'正在热播',itemList:[item('仙逆','one',2),item('火影忍者','foreign',1),item('未知新作','unverified',3)]},{title:'热血国漫推荐',itemList:[item('国产新故事','domestic')]}]}]};
 const items=parseYouku(`<script>window.__INITIAL_DATA__ =${JSON.stringify(data)};</script>`);
 assert.equal(items.length,3);assert.equal(items[0].country,'日本');assert.equal(items[0].rank,1);assert.equal(items[1].rank,2);assert.equal(items[1].rankingType,'rank');assert.equal(items[2].rank,null);assert.equal(items[2].rankingType,'recommendation');
});
test('Bilibili rejects failed responses and preserves cumulative metric meaning',()=>{
 assert.throws(()=>parseBilibili({code:-412}),/响应格式/);
 const [item]=parseBilibili({code:0,data:{list:[{season_id:1,title:'凡人修仙传',rank:1,rating:'9.7分',stat:{view:10000,follow:500},new_ep:{index_show:'更新至第10话'}}]}});
 assert.equal(item.rating,9.7);assert.equal(item.metricLabel,'追番');assert.equal(item.metric,500);assert.equal(item.views,10000);
});
test('aggregation combines same names but preserves different seasons and stale source metadata',()=>{
 const item=(title,source,rank)=>({id:source+title,title,source,rank,tags:[],rankingType:'rank',rating:null});
 const result=aggregate({bilibili:{items:[item('剑来 第一季','bilibili',1),item('剑来 第二季','bilibili',2)],fetchedAt:'2026-10-28T00:00:00Z'},tencent:{items:[item('剑来第一季','tencent',2)],error:'offline',fetchedAt:'2026-10-27T00:00:00Z'}});
 assert.equal(result.length,2);assert.equal(result[0].platforms.length,2);assert.equal(result[0].index,100);assert.equal(result[0].platforms.find(x=>x.source==='tencent').stale,true);
});
test('weekly archive boundary follows Monday in Asia/Shanghai, including year rollover',()=>{
 assert.equal(weekKey(new Date('2026-10-25T15:59:59Z')),'2026-10-19');
 assert.equal(weekKey(new Date('2026-10-25T16:00:00Z')),'2026-10-26');
 assert.equal(weekKey(new Date('2027-01-01T04:00:00Z')),'2026-12-28');
});

test('Bilibili imported chart filters Western animation and tokusatsu without renumbering Japanese anime',()=>{
 const titles=['少年骇客 第四季','功夫熊猫：神龙骑士','名侦探柯南（中配）','假面骑士ZZZ','神奇数字马戏团','间谍过家家 第三季'];
 const items=parseBilibili({code:0,data:{list:titles.map((title,i)=>({title,rank:i+1,season_id:i}))}},'日本');
 assert.deepEqual(items.map(x=>x.rank),[3,6]);assert(items.every(x=>x.country==='日本'&&x.chart==='番剧周榜'));
 assert.equal(isKnownJapanese('仙王的日常生活'),false);assert.equal(isKnownJapanese('日常'),true);
});

test('Youku preserves Japanese-specific ranking and separates unranked genre recommendations',()=>{
 const data={moduleList:[{components:[{title:'正在热播',itemList:[{title:'日番新作',action_value:'new',reason:{text:{title:'日番热度榜·TOP5'}}}]},{title:'校园恋爱番',itemList:[{title:'堀与宫村',action_value:'horimiya'},{title:'未确认产地作品',action_value:'unknown'}]}]}]};
 const items=parseYouku(`<script>window.__INITIAL_DATA__ =${JSON.stringify(data)};</script>`);
 assert.equal(items.length,2);assert.equal(items[0].chart,'日番热度榜');assert.equal(items[0].rank,5);assert.equal(items[0].country,'日本');assert.equal(items[1].rank,null);assert.equal(items[1].rankingType,'recommendation');assert.deepEqual(items[1].tags,['校园','恋爱']);
});

test('country filtering ranks each region from one without mutating source ranks or old saved IDs',()=>{
 const raw=aggregate({bilibili:{items:[{title:'同名作品',country:'中国',rank:1,tags:[],source:'bilibili'},{title:'同名作品',country:'日本',rank:2,tags:[],source:'bilibili'}]}});
 assert.equal(raw.length,2);assert.equal(raw.find(x=>x.country==='中国').id,'同名作品');assert.equal(raw.find(x=>x.country==='日本').id,'jp:同名作品');
 const jp=regionItems(raw,'jp');assert.equal(jp.length,1);assert.equal(jp[0].position,1);assert.equal(jp[0].index,100);assert.equal(jp[0].platforms[0].rank,2);assert.equal(raw.find(x=>x.country==='日本').position,2);
 assert.equal(matchesRegion({title:'旧收藏'},'cn'),true);assert.equal(matchesRegion({country:'日本'},'cn'),false);assert.equal(regionItems(raw,'all').length,2);assert(GENRES.jp.includes('恋爱')&&GENRES.jp.includes('异世界'));
});
