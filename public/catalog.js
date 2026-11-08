export function countryOf(item) { return item.country || '中国'; }
export function matchesRegion(item,region) { return region==='all' || countryOf(item)===(region==='jp'?'日本':'中国'); }
export function regionItems(items,region) {
  const selected=items.filter(item=>matchesRegion(item,region)).sort((a,b)=>(b.score??0)-(a.score??0)||a.position-b.position);
  const max=selected[0]?.score;
  return selected.map((item,i)=>({...item,position:i+1,index:max?Math.round(item.score/max*1000)/10:item.index}));
}
export const GENRES={
  cn:['玄幻','修仙','热血','武侠','科幻','搞笑','悬疑'],
  jp:['热血','冒险','恋爱','校园','日常','治愈','运动','音乐','推理','异世界','奇幻','科幻','搞笑'],
  all:['玄幻','修仙','热血','武侠','冒险','恋爱','校园','日常','治愈','运动','音乐','悬疑','推理','异世界','科幻','搞笑'],
};
