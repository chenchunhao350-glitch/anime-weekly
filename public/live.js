// SSE delivers changes; polling also covers proxies that buffer event streams.
export function watchUpdates(onUpdate,{EventSource:Stream=globalThis.EventSource,document:doc=globalThis.document,window:win=globalThis.window,setInterval:repeat=globalThis.setInterval,clearInterval:cancel=globalThis.clearInterval}={}){
 let stream=null,timer=null,stopped=false,versions={};
 function connect(){
  if(stopped||doc.visibilityState==='hidden'||win.navigator.onLine===false)return;
  if(!stream&&Stream){
   try{stream=new Stream('/api/events');}catch{}
   if(stream){
   stream.addEventListener('sync',event=>{
    try{
     const next=JSON.parse(event.data);
     for(const type of ['rankings','schedule'])if(next[type]!==versions[type]){versions[type]=next[type];onUpdate(type);}
    }catch{}
   });
   }
  }
  if(!timer)timer=repeat(()=>{if(win.navigator.onLine!==false){onUpdate('rankings');onUpdate('schedule');}},30000);
 }
 function disconnect(){stream?.close();stream=null;if(timer!==null)cancel(timer);timer=null;}
 function resume(){disconnect();if(doc.visibilityState!=='hidden'&&win.navigator.onLine!==false){onUpdate('rankings');onUpdate('schedule');connect();}}
 doc.addEventListener('visibilitychange',resume);win.addEventListener('online',resume);win.addEventListener('offline',disconnect);win.addEventListener('pagehide',disconnect);win.addEventListener('pageshow',resume);
 connect();
 return ()=>{stopped=true;disconnect();doc.removeEventListener('visibilitychange',resume);win.removeEventListener('online',resume);win.removeEventListener('offline',disconnect);win.removeEventListener('pagehide',disconnect);win.removeEventListener('pageshow',resume);};
}
