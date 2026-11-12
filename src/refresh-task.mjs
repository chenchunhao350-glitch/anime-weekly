// Share in-flight work and enforce a minimum interval across timers and requests.
export function refreshTask(run,{interval,now=Date.now}={}){
 let pending=null,lastAttempt=null;
 return function refresh(force=false){
  if(pending)return pending;
  if(!force&&lastAttempt!==null&&now()-lastAttempt<interval)return Promise.resolve();
  lastAttempt=now();
  pending=Promise.resolve().then(run).finally(()=>{pending=null;});
  return pending;
 };
}
