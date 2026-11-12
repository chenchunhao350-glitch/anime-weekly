import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshTask} from '../src/refresh-task.mjs';

test('timers and manual refresh share pending work, respect intervals and recover after failure',async()=>{
 let time=0,calls=0,release,fail=false;
 const refresh=refreshTask(async()=>{calls++;await new Promise(r=>release=r);if(fail)throw Error('offline');},{interval:60000,now:()=>time});
 const first=refresh();assert.equal(refresh(true),first);await Promise.resolve();assert.equal(calls,1);release();await first;
 time=59999;await refresh();assert.equal(calls,1);
 time=60000;const next=refresh();await Promise.resolve();assert.equal(calls,2);release();await next;
 fail=true;const forced=refresh(true);await Promise.resolve();release();await assert.rejects(forced,/offline/);
 await refresh();assert.equal(calls,3);
 fail=false;time+=60000;const recovered=refresh();await Promise.resolve();release();await recovered;assert.equal(calls,4);
});
