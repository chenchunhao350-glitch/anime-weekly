// Fixed QR Model 2 version 5, error correction L, byte mode, mask 0.
// One block: 108 data codewords + 26 Reed-Solomon codewords, up to 106 UTF-8 bytes.
export function qrMatrix(value){
 const bytes=new TextEncoder().encode(value);
 if(bytes.length>106)throw new Error('二维码网址过长');
 const bits=[];
 const append=(n,len)=>{for(let i=len-1;i>=0;i--)bits.push((n>>>i)&1);};
 append(4,4);append(bytes.length,8);for(const b of bytes)append(b,8);
 append(0,Math.min(4,864-bits.length));while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((v,b)=>(v<<1)|b,0));
 for(let pad=0;data.length<108;pad++)data.push(pad%2?0x11:0xec);
 const multiply=(a,b)=>{let result=0;for(let i=7;i>=0;i--){result=(result<<1)^((result>>>7)*0x11d);result^=((b>>>i)&1)*a;}return result;};
 const divisor=Array(26).fill(0);divisor[25]=1;let root=1;
 for(let i=0;i<26;i++){
  for(let j=0;j<26;j++){divisor[j]=multiply(divisor[j],root);if(j+1<26)divisor[j]^=divisor[j+1];}
  root=multiply(root,2);
 }
 const ecc=Array(26).fill(0);
 for(const b of data){const factor=b^ecc.shift();ecc.push(0);for(let j=0;j<26;j++)ecc[j]^=multiply(divisor[j],factor);}
 const codewords=[...data,...ecc],size=37;
 const modules=Array.from({length:size},()=>Array(size).fill(false)),fixed=modules.map(r=>r.slice());
 const set=(x,y,dark)=>{if(x>=0&&x<size&&y>=0&&y<size){modules[y][x]=!!dark;fixed[y][x]=true;}};
 for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
 for(const [cx,cy] of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
  const dist=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,dist!==2&&dist!==4);
 }
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(30+dx,30+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
 const format=0x77c4,bit=i=>((format>>>i)&1)!==0;
 for(let i=0;i<=5;i++)set(8,i,bit(i));set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));
 for(let i=9;i<15;i++)set(14-i,8,bit(i));
 for(let i=0;i<8;i++)set(size-1-i,8,bit(i));
 for(let i=8;i<15;i++)set(8,size-15+i,bit(i));set(8,size-8,true);
 let index=0;
 for(let right=size-1;right>=1;right-=2){
  if(right===6)right=5;
  for(let vertical=0;vertical<size;vertical++){
   const up=((right+1)&2)===0,y=up?size-1-vertical:vertical;
   for(let j=0;j<2;j++){const x=right-j;if(fixed[y][x])continue;
    const dark=index<codewords.length*8?((codewords[index>>>3]>>>(7-(index&7)))&1)!==0:false;
    modules[y][x]=dark!==((x+y)%2===0);index++;
   }
  }
 }
 return modules;
}
export function qrSvg(value){
 const matrix=qrMatrix(value),border=4,size=matrix.length+border*2;
 const path=matrix.flatMap((row,y)=>row.flatMap((dark,x)=>dark?[`M${x+border},${y+border}h1v1h-1z`]:[])).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="360" height="360" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`;
}
