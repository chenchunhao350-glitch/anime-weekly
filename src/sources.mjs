export const SOURCE_INFO = {
  bilibili: { name: '哔哩哔哩', short: 'B站', kind: '国创 / 番剧周榜', url: 'https://www.bilibili.com/v/popular/rank/guochan', color: '#ec78a0' },
  tencent: { name: '腾讯视频', short: '腾讯', kind: '动漫热搜榜', url: 'https://v.qq.com/biu/ranks/?t=hotsearch&channel=3', color: '#25b899' },
  youku: { name: '优酷', short: '优酷', kind: '热度 / 国漫与日漫推荐', url: 'https://www.youku.com/ku/webcomic', color: '#25a6ed' },
  iqiyi: { name: '爱奇艺', short: '爱奇艺', kind: '动漫实时热度榜', url: 'https://www.iqiyi.com/ranks1/4/0', color: '#70b933' },
};

// Public rankings without country fields use verified series lists. Dubbed
// editions retain the original production country; unknown series are excluded.
const DOMESTIC = ['凡人修仙传','牧神记','仙逆','灵境行者','斗破苍穹','完美世界','剑来','斗罗大陆','吞噬星空','斩神','遮天','诛仙','茶啊二中','神印王座','一念永恒','大理寺日志','大王饶命','一人之下','狐妖小红娘','画江湖','火旺','龙族','妖神记','武动乾坤','魔道祖师','全职法师','全职高手','我真没想重生啊','沧元图','师兄啊师兄','神墓','百炼成神','仙武传','万界独尊','独步逍遥','逆天至尊','无上神帝','炼气十万年','灵武大陆','宗门里除了我都是卧底','逆天邪神','念无双','九天玄帝诀','少年歌行','少年白马醉春风','暗河传','眷思量','时光代理人','雾山五行','灵笼','镇魂街','紫川','元龙','伍六七','凸变英雄','中国奇谭','罗小黑','长安三万里','哪吒','白蛇','深海','雄狮少年','新神榜','我是大神仙','星辰变','星辰变','永生','仙王的日常生活','天官赐福','有兽焉','非人哉','有药','天宝伏妖录','七界第一仙','真武巅峰','师士传说','万古神话','独步万古','万古最强宗','炼体十万层','仙帝归来','恶魔法则','天相','山海经密码','万相之王'];
export function isKnownDomestic(title) { return DOMESTIC.some(name => title.replace(/\s/g, '').includes(name)); }
const JAPANESE = ['名侦探柯南','火影忍者','航海王','海贼王','蜡笔小新','银魂','黑色四叶草','咒术回战','间谍过家家','致不灭的你','JOJO的奇妙冒险','犬夜叉','葬送的芙莉莲','家庭教师HITMANREBORN','新世纪福音战士','城下町的蒲公英','百变小樱','魔卡少女樱','齐木楠雄','迷宫饭','坂本日常','鬼灭之刃','我独自升级','不时用俄语小声说真心话的邻桌艾莉同学','奇幻世界舅舅','碧蓝之海','越狱兔','逃亡兔','电器街的漫画店','某科学的超电磁炮','某科学的未元物质','魔法禁书目录','斩服少女','游戏王','孤独摇滚','网球王子','笨女孩','幽游白书','夏日重现','颂乐人偶','BanGDream','薰香花朵凛然绽放','正相反的你与我','迷途之子','魔女之旅','甘城光辉游乐园','宇崎学妹','刀剑神域','石纪元','排球少年','魔法少女小圆','阿宅的恋爱真难','拜托了！双子星','城市猎人','堀与宫村','宝石之国','从零开始的异世界生活','散华礼弥','中间管理录利根川','这个勇者明明超强却过分慎重','夏目友人帐','一拳超人','死神','境界触发者','妖精的尾巴','蓝色监狱','灌篮高手','轻音少女','四月是你的谎言','CLANNAD','凉宫春日','青春猪头少年','欢迎来到实力至上主义的教室','关于我转生变成史莱姆','无职转生','命运石之门','进击的巨人','钢之炼金术师','龙珠','哆啦A梦','数码宝贝','宝可梦','精灵宝可梦','美少女战士','樱桃小丸子','圣斗士星矢','足球小将','高达','机动战士','冰菓','奇巧计程车','约定的梦幻岛','青之驱魔师','食戟之灵','文豪野犬','怪兽8号','胆大党','炎炎消防队','香格里拉·开拓异境','莉可丽丝','青春之旅','好想告诉你','会长是女仆','邻座的怪同学','月刊少女野崎君','擅长捉弄的高木同学','元气少女缘结神','赤发白雪姬','古见同学有交流障碍症','小林家的龙女仆','中二病也要谈恋爱','玉子市场','干物妹','男子高中生的日常','日常','幸运星','死神少爷与黑女仆','侦探已经死了','黑执事','黑子的篮球','暗杀教室','OVERLORD','不死者之王','转生成为魔剑','盾之勇者成名录','转生成为了只有乙女游戏破灭Flag的邪恶大小姐','杜鹃的婚约','租借女友','更衣人偶坠入爱河','五等分的新娘','女神的露天咖啡厅','地缚少年花子君','乱马','乱马1/2'];
const titleKey = title => title.normalize('NFKC').replace(/\s/g,'').toLowerCase();
export function isKnownJapanese(title) {
  const key=titleKey(title);
  return JAPANESE.some(name=>{
    const pattern=titleKey(name);
    // Avoid admitting unrelated works whose title happens to contain "日常".
    return name==='日常' ? /^(?:日常)(?:$|[（(第])/u.test(key) : key.includes(pattern);
  });
}
export function classifyCountry(title) { return isKnownDomestic(title) ? '中国' : isKnownJapanese(title) ? '日本' : null; }
export const https = value => typeof value === 'string' ? value.replace(/^http:/, 'https:').replace(/^\/\//, 'https://') : '';
export function decode(value = '') { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_,n)=>String.fromCodePoint(Number(n))).trim(); }
function tagText(html, className) { return decode(html.match(new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^\"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`))?.[1]?.replace(/<[^>]+>/g, '') || ''); }
function genres(text) { return [...new Set((text.match(/玄幻|修仙|热血|武侠|奇幻|搞笑|科幻|冒险|悬疑|恋爱|穿越|神魔|动作|校园|日常|治愈|运动|音乐|推理|异世界/g) || []))].slice(0,3); }
function base(source, id, title) { return { source, id: `${source}:${id}`, title: decode(title), country: '中国', tags: [], rating: null, views: null, followers: null, description: '', episodes: '', cover: '', backdrop: '', rank: null, metric: null, metricLabel: '', rankingType: 'rank' }; }

export function parseBilibili(json, country='中国') {
  if (json.code !== 0 || !Array.isArray(json.data?.list)) throw new Error('B站周榜响应格式已变化');
  // The imported-animation chart also contains Western animation and live-action
  // tokusatsu. A Japanese anime list is deliberately narrower than that chart.
  return json.data.list.flatMap((x,i) => country==='日本'&&!isKnownJapanese(x.title) ? [] : [{ ...base('bilibili',x.season_id,x.title), country, chart:country==='日本'?'番剧周榜':'国创周榜', rank: x.rank || i+1, cover: https(x.cover), backdrop: https(x.ss_horizontal_cover || x.new_ep?.cover), episodes: x.new_ep?.index_show || x.desc || '', rating: parseFloat(x.rating) || null, views: x.stat?.view ?? null, followers: x.stat?.follow ?? null, url: https(x.url), metric: x.stat?.follow ?? null, metricLabel: '追番', tags: genres(x.title) }]);
}
export function parseTencent(json) {
  const channel = (json.data?.Results || json.Results || []).find(x=>String(x.ChannelID)==='3');
  if (!channel?.Result?.ListInfo?.length) throw new Error('腾讯动漫榜暂不可用');
  return channel.Result.ListInfo.flatMap((x,i) => !classifyCountry(x.Query) || !/^[a-zA-Z0-9]+$/.test(x.ID || '') ? [] : [{ ...base('tencent',x.ID,x.Query), country:classifyCountry(x.Query), rank: i+1, cover: https(x.HzImgURL), backdrop: https(x.HzImgURL), description: x.SecondTitle || '', url: `https://v.qq.com/x/cover/${x.ID}.html`, metric: x.HotLevel, metricLabel: '热搜值', tags: genres(x.SecondTitle + x.Query) }]);
}
export function parseIqiyi(html) {
  const blocks = [...html.matchAll(/<a\b[^>]*class="[^"]*\brvi__box\b[^\"]*"[^>]*>[\s\S]*?<\/a>/g)];
  return blocks.flatMap(([block]) => {
    const type = tagText(block, 'rvi__type1');
    const region = type.split('/')[1]?.trim();
    const country = /^(?:内地|中国大陆|中国|国产)$/.test(region || '') ? '中国' : region==='日本' ? '日本' : null;
    if (!country) return [];
    const title = decode(block.match(/<div\b[^>]*title="([^"]+)"[^>]*class="rvi__tit1"/)?.[1] || '');
    const url = https(block.match(/href="([^"]+)"/)?.[1]);
    if (!title || !/^https:\/\/www\.iqiyi\.com\//.test(url)) return [];
    const cover = https(block.match(/<picture[^>]*id="([^"]+)"/)?.[1] || block.match(/<img[^>]*(?:src|data-src)="([^"]+\.(?:jpg|png|webp)[^"]*)"/)?.[1]);
    if (country==='日本' && /奥特曼|假面骑士|超级战队/.test(title)) return [];
    return [{ ...base('iqiyi',block.match(/aid=(\d+)/)?.[1] || title,title), country, rank: Number(block.match(/data-rseat-v2="(\d+)"/)?.[1]) || null, cover, backdrop: cover, url, description: tagText(block,'rvi__des2'), episodes: tagText(block,'rvi__update'), tags: genres(type), metric: Number(tagText(block,'rvi__index__num')) || null, metricLabel: '实时热度' }];
  });
}
export function parseYouku(html) {
  const raw = html.match(/window\.__INITIAL_DATA__\s*=\s*([\s\S]+?);<\/script>/)?.[1];
  if (!raw) throw new Error('优酷频道格式已变化');
  // Parse data only. Never execute scripts received from a remote page.
  const json = JSON.parse(raw.replace(/("(?:[^"\\]|\\.)*")|\bundefined\b/g, (token, quoted) => quoted || 'null'));
  const components=(json.moduleList || []).flatMap(m=>m.components || []);
  const confirmedDomesticIds=new Set(components.filter(c=>/国漫|国产/.test(c.title || '')).flatMap(c=>(c.itemList || []).flat().map(x=>x.action_value)));
  const items = new Map();
  for (const component of components) {
    const domesticSection = /国漫|国产/.test(component.title || '');
    for (const x of (component.itemList || []).flat()) {
      if (!x.title || !x.action_value || /即将上线/.test(component.title || '')) continue;
      const reason = x.reason?.text?.title || '';
      const country=domesticSection || confirmedDomesticIds.has(x.action_value) ? '中国' : /^日番热度榜/.test(reason) || /日漫|日番|日本/.test(component.title || '') ? '日本' : classifyCountry(x.title);
      if (!country || /奥特曼|假面骑士|超级战队/.test(x.title)) continue;
      const rank = reason.match(/^(动漫|日番)热度榜·TOP(\d+)$/);
      if (country==='中国' && !domesticSection && !rank) continue;
      const id = x.action_value;
      const prev = items.get(id);
      if (prev?.rank && !rank) continue;
      items.set(id, { ...base('youku',id,x.title), country, chart:rank ? `${rank[1]}热度榜` : country==='日本'?'日漫推荐':'国漫推荐', cover: https(x.img), backdrop: https(x.hImg || x.img), url: `https://www.youku.com/show_page/id_z${encodeURIComponent(id)}.html`, description: x.desc || x.subtitle || '', episodes: x.lbTexts || '', tags: genres((x.tags || []).map(t=>t.text?.title || '').join(' ')+' '+(component.title || '')), rank: rank ? Number(rank[2]) : null, rankingType: rank ? 'rank' : 'recommendation', metricLabel: rank ? '热度榜' : country==='日本'?'日漫推荐':'国漫推荐' });
    }
  }
  return [...items.values()].sort((a,b)=>(a.rank ?? 999)-(b.rank ?? 999));
}

async function get(url, json = false) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': json ? 'application/json' : 'text/html', 'Referer': new URL(url).origin + '/' }, signal: AbortSignal.timeout(18000) });
  if (!r.ok) throw new Error(`来源返回 HTTP ${r.status}`);
  return json ? r.json() : r.text();
}
export const loaders = {
  bilibili: async () => (await Promise.all([
    get('https://api.bilibili.com/pgc/season/rank/web/list?day=7&season_type=4', true).then(d=>parseBilibili(d)),
    get('https://api.bilibili.com/pgc/season/rank/web/list?day=7&season_type=1', true).then(d=>parseBilibili(d,'日本')),
  ])).flat(),
  tencent: async () => parseTencent(await get('https://pbaccess.video.qq.com/trpc.tencentvideohotlistdata.hotlistdata.DoSearchHotListHttp/getSearchHotListHttp?ChannelID=3&PageSize=50&PageNum=0&SceneID=2', true)),
  iqiyi: async () => parseIqiyi(await get(SOURCE_INFO.iqiyi.url)),
  youku: async () => parseYouku(await get(SOURCE_INFO.youku.url)),
};

export function weekKey(date = new Date()) {
  const day = new Date(date.toLocaleString('en-US', {timeZone:'Asia/Shanghai'}));
  day.setDate(day.getDate() - (day.getDay()+6)%7);
  return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
}
const normalize = title => title.normalize('NFKC').replace(/[\s·：:！!，,。\-]/g,'').toLowerCase();
export function aggregate(sources) {
  const entries = new Map();
  for (const [source,data] of Object.entries(sources)) for (const item of data.items || []) {
    const key = (item.country==='日本' ? 'jp:' : '') + normalize(item.title);
    const score = item.rank ? 1/(60+item.rank) : 0.35/100;
    if (!entries.has(key)) entries.set(key,{ ...item, id: key, platforms: [], score: 0 });
    const entry = entries.get(key);
    entry.platforms.push({...item, source, fetchedAt:data.fetchedAt, stale:!!data.error});
    entry.score += score;
    entry.tags = [...new Set([...entry.tags,...item.tags])];
    if (!entry.description && item.description) entry.description = item.description;
    if (item.rating && (!entry.rating || item.rating > entry.rating)) entry.rating = item.rating;
    if (item.followers) entry.followers = Math.max(entry.followers || 0,item.followers);
  }
  const list = [...entries.values()].sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title,'zh'));
  const max = list[0]?.score || 1;
  return list.map((x,i)=>({...x, position:i+1, index:Math.round(x.score/max*1000)/10}));
}
