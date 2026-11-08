import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {mobileAccess,publicHttpsUrl} from '../src/mobile-access.mjs';

test('phone links require public HTTPS and remove paths',()=>{
 for(const url of ['http://example.com','https://localhost','https://x.local','https://127.0.0.1','https://[::1]','https://user:pass@example.com','https://example.com:3000','https://example.com/?secret=x'])assert.equal(publicHttpsUrl(url),null,url);
 assert.equal(publicHttpsUrl('https://anime.example.com/app'),'https://anime.example.com/');
});
test('phone connection hides stale links, credentials and process details',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'anime-mobile-'));
 try{
  assert.equal((await mobileAccess(dir,'')).status,'offline');
  const write=s=>fs.writeFile(path.join(dir,'mobile-access.json'),JSON.stringify(s));
  const state={status:'ready',url:'https://anime.example.com/',checkedAt:new Date().toISOString(),pid:12345};
  await write(state);const ready=await mobileAccess(dir,'');assert.equal(ready.status,'ready');assert.equal(ready.pid,undefined);
  for(const checkedAt of [new Date(Date.now()-130000).toISOString(),new Date(Date.now()+130000).toISOString(),'broken']){
   await write({...state,checkedAt});const stale=await mobileAccess(dir,'');assert.equal(stale.status,'offline');assert.equal(stale.url,null);
   await write({...state,status:'starting',checkedAt});assert.equal((await mobileAccess(dir,'')).status,'offline');
  }
  await write({...state,url:'https://user:pass@example.com'});assert.equal((await mobileAccess(dir,'')).status,'offline');
  const fixed=await mobileAccess(dir,'https://anime.example.com');assert.equal(fixed.temporary,false);assert.equal(fixed.status,'ready');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
