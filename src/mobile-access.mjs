import fs from 'node:fs/promises';
import path from 'node:path';

export function publicHttpsUrl(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)return null;
  const host=url.hostname.toLowerCase();
  if(!host.includes('.')||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||/^\d[\d.]*$/.test(host)||host.includes(':'))return null;
  return url.origin+'/';
 }catch{return null;}
}
export async function mobileAccess(dataDir,configuredUrl=process.env.PUBLIC_URL){
 const configured=publicHttpsUrl(configuredUrl);
 if(configured)return {status:'ready',url:configured,temporary:false,message:'手机扫码即可打开，不需要连接同一 Wi-Fi。'};
 try{
  const saved=JSON.parse(await fs.readFile(path.join(dataDir,'mobile-access.json'),'utf8'));
  const url=publicHttpsUrl(saved.url);
  const age=Date.now()-new Date(saved.checkedAt).getTime();
  const fresh=age>=0&&age<120000;
  if(saved.status==='ready'&&url&&fresh)return {status:'ready',url,temporary:true,message:'手机扫码或打开链接即可使用，支持手机流量。电脑和连接服务需保持运行；重新连接后网址会变化。'};
  const starting=saved.status==='starting'&&fresh;
  return {status:starting?'starting':'offline',url:null,temporary:true,message:starting?'正在建立手机访问连接，请稍候…':'手机访问连接已断开，请在电脑上重新开启。'};
 }catch{return {status:'offline',url:null,temporary:true,message:'手机访问连接尚未开启，请先在电脑上双击「开启手机访问」。'};}
}
