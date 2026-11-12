const CACHE='guoman-v11';
const SHELL=['/','/styles.css','/refinements.css','/app.js','/calendar.js','/catalog.js','/mobile.js','/live.js','/icon.svg','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('guoman-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/api/events'||url.pathname==='/api/network'||url.pathname.startsWith('/api/mobile'))return;
 const isData=url.pathname==='/api/rankings'||url.pathname==='/api/weeks'||url.pathname==='/api/schedule';
 if(isData){event.respondWith((async()=>{try{const r=await fetch(event.request);if(r.ok){const cache=await caches.open(CACHE);await cache.put(event.request,r.clone());return r;}return await caches.match(event.request)||r;}catch{return await caches.match(event.request)||new Response(JSON.stringify({error:'当前离线，这份榜单还没有缓存'}),{status:503,headers:{'Content-Type':'application/json'}});}})());return;}
 event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;try{const r=await fetch(event.request);if(r.ok&&(url.pathname==='/api/image'||SHELL.includes(url.pathname))){const cache=await caches.open(CACHE);await cache.put(event.request,r.clone());if(url.pathname==='/api/image'){const keys=await cache.keys();const pictures=keys.filter(k=>new URL(k.url).pathname==='/api/image');if(pictures.length>80)await cache.delete(pictures[0]);}}return r;}catch{if(event.request.mode==='navigate')return await caches.match('/');return Response.error();}})());
});
