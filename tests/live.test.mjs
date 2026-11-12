import test from 'node:test';
import assert from 'node:assert/strict';
import {watchUpdates} from '../public/live.js';

test('live changes reconnect, pause in background, recover online and retain polling fallback',()=>{
 const doc=new EventTarget(),win=new EventTarget();doc.visibilityState='visible';win.navigator={onLine:true};
 const streams=[],timers=new Map(),updates=[];let timerId=0;
 class Stream extends EventTarget{constructor(){super();streams.push(this);}close(){this.closed=true;}}
 const stop=watchUpdates(type=>updates.push(type),{EventSource:Stream,document:doc,window:win,setInterval:fn=>{timers.set(++timerId,fn);return timerId;},clearInterval:id=>timers.delete(id)});
 const sync=data=>streams.at(-1).dispatchEvent(new MessageEvent('sync',{data:JSON.stringify(data)}));
 sync({rankings:0,schedule:0});assert.deepEqual(updates.splice(0),['rankings','schedule']);
 sync({rankings:0,schedule:1});assert.deepEqual(updates.splice(0),['schedule']);
 sync({rankings:0,schedule:1});assert.deepEqual(updates,[]);
 timers.values().next().value();assert.deepEqual(updates.splice(0),['rankings','schedule']);
 doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(streams[0].closed,true);assert.equal(timers.size,0);
 doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(streams.length,2);assert.deepEqual(updates.splice(0),['rankings','schedule']);
 win.navigator.onLine=false;win.dispatchEvent(new Event('offline'));assert.equal(timers.size,0);
 win.navigator.onLine=true;win.dispatchEvent(new Event('online'));assert.equal(streams.length,3);updates.length=0;
 sync({rankings:0,schedule:0});assert.deepEqual(updates,['schedule'],'server restart resets revision and refetches');
 stop();win.dispatchEvent(new Event('online'));assert.equal(timers.size,0);assert.equal(streams.length,3);
});

test('polling survives a browser that cannot open event streams',()=>{
 const doc=new EventTarget(),win=new EventTarget();doc.visibilityState='visible';win.navigator={onLine:true};
 const updates=[];let tick,cleared=false;
 class UnavailableStream{constructor(){throw new Error('stream unavailable');}}
 const stop=watchUpdates(type=>updates.push(type),{EventSource:UnavailableStream,document:doc,window:win,setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{cleared=true;}});
 tick();assert.deepEqual(updates,['rankings','schedule']);
 stop();assert.equal(cleared,true);
});
