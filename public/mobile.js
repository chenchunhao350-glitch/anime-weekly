export function mobilePanel(data,escape){
 const ready=data.status==='ready'&&data.url;
 return `<div class="mobile-connect"><span class="mobile-connect-status ${ready?'ready':''}"><i></i>${ready?'手机访问已就绪':data.status==='starting'?'正在连接':'连接尚未就绪'}</span>${ready?`<div class="mobile-qr-wrap"><img class="mobile-qr" src="/api/mobile/qr?v=${encodeURIComponent(data.url)}" alt="动漫周刊手机访问二维码" width="220" height="220"></div><h3>手机扫一扫，好动漫随时追</h3><p>用相机或浏览器扫码，也可复制网址到手机打开。<br>手机流量、其他 Wi-Fi 都可以使用。</p><a class="mobile-public-link" href="${escape(data.url)}" target="_blank" rel="noopener noreferrer">${escape(data.url)}</a><div class="mobile-connect-actions"><button class="primary-button" data-action="copy-mobile-link">复制手机网址</button><a class="mobile-qr-download" href="/api/mobile/qr" download="动漫周刊手机二维码.svg">保存二维码</a></div><div class="mobile-connect-note">${escape(data.message)}</div>`:`<div class="mobile-connect-placeholder">↗</div><h3>${data.status==='starting'?'正在生成手机网址':'先开启手机访问连接'}</h3><p>${escape(data.message)}</p><button class="primary-button" data-action="mobile-retry">重新检查连接</button><div class="mobile-connect-note">电脑上双击项目里的「开启手机访问.cmd」，连接成功后这里会自动出现二维码。网址未就绪时，请勿在手机输入 localhost。</div>`}</div>`;
}

let timer;
export async function openMobileAccess({showModal,escape,toast,install}){
 clearInterval(timer);
 showModal(`<div class="modal-inner mobile-access"><div class="modal-eyebrow">ANIME WEEKLY · ON THE GO</div><h2>把动漫，装进口袋。</h2><p>扫码打开动漫周刊，随时查看周榜与每日更新。</p><div id="mobile-connection" aria-live="polite"><p>正在检查手机访问连接…</p></div><details class="mobile-install-help"><summary>添加到手机主屏幕</summary><p>iPhone：在 Safari 打开网址，点「分享」→「添加到主屏幕」。</p><p>安卓：在 Chrome / Edge 打开网址，点菜单→「安装应用」或「添加到主屏幕」。</p><button class="primary-button" data-action="install-app">安装到当前设备</button></details></div>`);
 const target=document.querySelector('#mobile-connection'),dialog=target.closest('dialog');
 let current=null,busy=false,last='';
 async function refresh(){
  if(!target.isConnected||!dialog.open){clearInterval(timer);return;}
  if(busy)return;busy=true;
  try{
   const response=await fetch('/api/mobile-access',{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error();
   current=await response.json();
  }catch{current={status:'offline',message:'无法检查连接，请确认电脑服务正在运行，然后重试。'};}
  finally{busy=false;}
  if(!target.isConnected||!dialog.open)return;
  const next=JSON.stringify(current);if(next!==last){target.innerHTML=mobilePanel(current,escape);last=next;}
 }
 target.parentElement.addEventListener('click',async event=>{
  const action=event.target.closest('button')?.dataset.action;
  if(action==='mobile-retry'){last='';await refresh();}
  if(action==='install-app')await install();
  if(action==='copy-mobile-link'&&current?.url){
   try{await navigator.clipboard.writeText(current.url);toast('手机网址已复制');}
   catch{const link=target.querySelector('.mobile-public-link');const selection=getSelection(),range=document.createRange();range.selectNodeContents(link);selection.removeAllRanges();selection.addRange(range);toast('请长按或右键复制选中的网址');}
  }
 });
 dialog.addEventListener('close',()=>clearInterval(timer),{once:true});
 timer=setInterval(refresh,5000);await refresh();
}
