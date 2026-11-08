import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {publicHttpsUrl} from '../src/mobile-access.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=path.join(root,'data'),statePath=path.join(dataDir,'mobile-access.json');
await fs.mkdir(dataDir,{recursive:true});
let url=null,tunnel=null,ownedServer=null,stopping=false,checking=false,interval;
let saves=Promise.resolve();
async function save(status){
 saves=saves.catch(()=>{}).then(async()=>{const temp=statePath+'.tmp';await fs.writeFile(temp,JSON.stringify({status,url,checkedAt:new Date().toISOString(),pid:process.pid}));await fs.rename(temp,statePath);});return saves;
}
process.on('uncaughtException',async e=>{console.error(e.message);await stop();process.exit(1);});
process.on('unhandledRejection',async e=>{console.error(e);await stop();process.exit(1);});
try{
 const old=JSON.parse(await fs.readFile(statePath,'utf8'));
    if(old.pid&&old.status!=='offline'&&Date.now()-new Date(old.checkedAt).getTime()<120000){
  try{process.kill(old.pid,0);console.log('手机访问连接已在运行：',old.url||'正在连接');process.exit(0);}catch{}
 }
}catch{}
const localUrl='http://127.0.0.1:3000';
async function localReady(){try{const r=await fetch(localUrl+'/manifest.webmanifest',{signal:AbortSignal.timeout(2500)});return r.ok&&(await r.json()).short_name==='动漫周刊';}catch{return false;}}
if(!await localReady()){
 ownedServer=spawn(process.execPath,['server.mjs'],{cwd:root,windowsHide:true,stdio:'inherit'});
 ownedServer.on('error',e=>{console.error(e.message);});
 for(let i=0;i<30&&!await localReady();i++)await new Promise(r=>setTimeout(r,500));
 if(!await localReady())throw new Error('动漫周刊未能启动，请检查 3000 端口');
}
const executable=path.join(root,'tools','cloudflared.exe');
try{await fs.access(executable);}catch{throw new Error('缺少 tools/cloudflared.exe，请先下载官方 Cloudflare Tunnel 客户端。');}
await save('starting');
console.log('正在创建手机 HTTPS 访问网址…');
tunnel=spawn(executable,['tunnel','--url',localUrl,'--protocol','http2','--edge-ip-version','4','--retries','10','--no-autoupdate'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
let log='';
function consume(chunk){
 const line=chunk.toString();process.stdout.write(line);log=(log+line).slice(-8000);
 const found=log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
 if(found&&!url){url=publicHttpsUrl(found[0]);console.log('\n已生成网址，正在确认可访问：',url);void check();}
}
tunnel.stdout.on('data',consume);tunnel.stderr.on('data',consume);
async function check(){
 if(!url||stopping||checking)return;checking=true;
 try{
  await verifyPublic(url);
  if(!stopping){await save('ready');console.log('手机访问正常：',url);}
 }catch{if(!stopping)await save('starting');}finally{checking=false;}
}
async function verifyPublic(origin){
 try{
  const r=await fetch(origin+'manifest.webmanifest',{signal:AbortSignal.timeout(10000)});
  if(!r.ok||(await r.json()).short_name!=='动漫周刊')throw new Error('连接尚未就绪');
 }catch(error){
  if(process.platform!=='win32')throw error;
  // Windows may use a system proxy while Node's fetch uses direct DNS/network.
  const command="$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $r=Invoke-WebRequest -UseBasicParsing -Uri $env:ANIME_MOBILE_HEALTH_URL -TimeoutSec 15; $text=[Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()); $d=$text | ConvertFrom-Json; if($d.short_name -ne $env:ANIME_MOBILE_HEALTH_NAME){exit 1}; Write-Output 'verified'";
  const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-Command',command],{windowsHide:true,timeout:20000,env:{...process.env,ANIME_MOBILE_HEALTH_URL:origin+'manifest.webmanifest',ANIME_MOBILE_HEALTH_NAME:'动漫周刊'}});
  if(!stdout.includes('verified'))throw error;
 }
}
interval=setInterval(()=>{if(url)void check();else void save('starting');},30000);
async function stop(){if(stopping)return;stopping=true;clearInterval(interval);await save('offline').catch(()=>{});tunnel?.kill();ownedServer?.kill();}
tunnel.on('error',async e=>{console.error(e.message);await stop();process.exitCode=1;});
tunnel.on('exit',async()=>{await stop();});
process.on('SIGINT',async()=>{await stop();process.exit();});
process.on('SIGTERM',async()=>{await stop();process.exit();});
