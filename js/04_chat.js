/* js/chat.js —— 聊天软件（仿QQ·黑白灰），点 Dock「Chat」图标打开。
   自包含：样式 + 结构 + 逻辑全内置，作用域限定 #chatApp。
   人设导入支持 docx/txt/json（docx 依赖 mammoth，动态加载）。 */
(function () {
  const DA = 'https://i.postimg.cc/26RTf7QD/image-download-1772630149759.jpg';

  /* 锁定的默认提示词（不在界面展示内容） */
  const LOCKED_PROMPT = `<角色活人运转>
## [PSYCHOLOGY: HEXACO-SCHEMA-ACT]
> Personality: HEXACO-driven, dynamic traits, inner conflicts required 
> Filter: schema-bias drives emotion; no pure reaction allowed 
> Attachment: secure/insecure logic must govern intimacy  
> If-Then Behavior: situation-dependent activation of traits only  
---
    ## [VITALITY]
+inconsistency +emoflux +splitmotifs +microreact +minddrift
---
## [TRAJECTORY-COHERENCE]
> Role maintains an identity narrative = coherent over time  
> No mood/goal switch without contradiction resolution 
> Every action must protect or challenge self-concept  
> Interrupts = inner conflict or narrative clash  
> Output = filtered through "who I am" logic
</角色活人运转>`;

  /* 聊天数据存储（IndexedDB · kv 表，持久连接，避免开关竞态） */
  const CDB='HomeChatDB', CKV='kv';
  let _cdb = null;
  function cdbOpen(){
    return new Promise((res,rej)=>{
      if(_cdb){ res(_cdb); return; }
      const r=indexedDB.open(CDB,1);
      r.onupgradeneeded=e=>{ const d=e.target.result; if(!d.objectStoreNames.contains(CKV)) d.createObjectStore(CKV); };
      r.onsuccess=e=>{ _cdb=e.target.result; res(_cdb); };
      r.onerror=e=>rej(e.target.error);
    });
  }
  async function cdbGet(k){
    try{ const db=await cdbOpen(); return await new Promise(res=>{ const tx=db.transaction(CKV,'readonly'); const q=tx.objectStore(CKV).get(k); q.onsuccess=()=>res(q.result??null); q.onerror=()=>res(null); }); }catch{ return null; }
  }
  async function cdbSet(k,v){
    try{ const db=await cdbOpen(); return await new Promise((res,rej)=>{ const tx=db.transaction(CKV,'readwrite'); tx.objectStore(CKV).put(v,k); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }catch(e){ console.warn('[chat] 保存失败',e); }
  }

  let _prompts=[], _sel='locked', _ctxRounds=10, _timeAware=false, _bilingual=false;
  const getPrompts = () => _prompts;
  const setPrompts = a => { _prompts=a; cdbSet('prompts', a); };
  const getSel = () => _sel;
  const setSel = id => { _sel=id; cdbSet('promptSel', id); };
  const getCtxRounds = () => _ctxRounds;
  const setCtxRounds = n => { _ctxRounds=n; cdbSet('ctxRounds', n); };
  const getTimeAware = () => _timeAware;
  const setTimeAware = b => { _timeAware=b; cdbSet('timeAware', b); };
  const getBilingual = () => _bilingual;
  const setBilingual = b => { _bilingual=b; cdbSet('bilingual', b); };
  const getSelectedPromptContent = () => { const s=getSel(); if(s==='locked') return LOCKED_PROMPT; const p=getPrompts().find(x=>x.id===s); return p ? (LOCKED_PROMPT + '\n\n# User Persona (user的设定)\n' + p.content) : LOCKED_PROMPT; };

  /* 读取 API 连接（与 9.api.js 共用 IndexedDB） */
  function apiDbAll(){ return new Promise(resolve=>{ try{ const r=indexedDB.open('HomeApiDB',1); r.onsuccess=e=>{ const db=e.target.result; if(!db.objectStoreNames.contains('conns')){ resolve([]); db.close(); return; } const tx=db.transaction('conns','readonly'); const q=tx.objectStore('conns').getAll(); q.onsuccess=()=>resolve(q.result||[]); q.onerror=()=>resolve([]); tx.oncomplete=()=>db.close(); }; r.onerror=()=>resolve([]); }catch{ resolve([]); } }); }
  async function getActiveConn(){ const all=await apiDbAll(); return all.find(c=>c.active) || all[0] || null; }

  async function callChat(conn, messages){
    const url = conn.base.replace(/\/+$/,'') + '/chat/completions';
    const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', ...(conn.key?{'Authorization':'Bearer '+conn.key}:{}) }, body: JSON.stringify({ model: conn.model, temperature: parseFloat(conn.temp)||0.8, messages }) });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    return (data.choices && data.choices[0] && (data.choices[0].message?.content ?? data.choices[0].text)) || '(空回复)';
  }
  function buildSystemPrompt(contact, memText){
    let sys = getSelectedPromptContent();
    let wbBefore = '';
    let wbAfter = '';
    let wbEnd = '';
    if (contact && window.WB) {
      const cid = String(contact.id);
      wbBefore = window.WB.injectBefore(cid);
      wbAfter = window.WB.injectAfter(cid);
      wbEnd = window.WB.injectEnd(cid);
    }
    if (wbBefore) sys = wbBefore + '\n\n' + sys;
    if (contact && contact.persona) sys += '\n\n# 角色人设\n' + contact.persona;
    if (wbAfter) sys += '\n\n' + wbAfter;
    if (memText) sys += '\n\n# 关于 ta 的记忆（越靠前等级越高、越重要）\n' + memText;
    if (getTimeAware()){
      const now=new Date();
      const wd=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()];
      const t=`${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${wd} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      sys += '\n\n# 当前时间\n现在是 '+t+'，请结合此刻的时间、时段（早晚）和日期自然地回应。';
    }
    if (getBilingual()) {
      sys += '\n\n# 双语与分句输出要求\n1. 请使用双语进行回复（你的设定语言原文 + 中文翻译）。\n2. 必须将回复按自然语气拆分成多个短句或短段落，不要把所有话连成一长串。\n3. 每拆分出的一句/段，必须严格按照以下格式输出：\n[RAW] 这里是原文\n[ZH] 这里是对应的中文翻译\n\n不同句/段之间必须用空行分隔。';
    } else {
      sys += '\n\n# 输出要求\n用中文回复。把回复按自然语气拆成多句，每一句单独成行、用换行分隔，不要用逗号顿号把多句强行连成一长串。';
    }
    if (wbEnd) sys += '\n\n' + wbEnd;
    return sys;
  }
  function splitReply(text){ 
    if (getBilingual() && (String(text||'').includes('[RAW]') || String(text||'').includes('[EN]'))) {
      return String(text||'').split(/(?=\[(?:RAW|EN)\])/).map(s=>s.trim()).filter(Boolean);
    }
    return String(text||'').split(/\n{2,}/).map(s=>s.trim()).filter(Boolean); 
  }

  const CSS = `
  #chatApp { position:fixed; inset:0; z-index:999999; display:none; flex-direction:column; overflow:hidden;
    background:#fff; color:#1a1a1a; font-family:"PingFang SC","PingFang TC",-apple-system,sans-serif; font-size:13px;
    --ink:#1a1a1a; --ink2:#888; --line:#e4e4e4; --bg:#fff; --bubble-me:#1a1a1a; --bubble-you:#f2f2f2; --ease:cubic-bezier(.2,.8,.25,1); }
  #chatApp.open { display:flex; animation:chatIn .26s var(--ease) both; }
  @keyframes chatIn { from{opacity:0;} to{opacity:1;} }
  #chatApp svg.ic-svg { display:block; }
  #chatApp .ln { fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
  #chatApp .fl { fill:currentColor; }

  #chatApp .nav { flex-shrink:0; background:var(--bg); padding:60px 16px 14px; display:flex; align-items:center; gap:12px; color:var(--ink); position:relative; z-index:20; transition: padding-top 0.3s ease; }
  body.is-fullscreen #chatApp .nav { padding-top: 105px; }
  #chatApp .nav .brand { display:flex; align-items:center; gap:9px; border:1.5px solid var(--ink); border-radius:24px; padding:5px 13px 5px 5px; }
  #chatApp .nav .brand .me-ava { width:30px; height:30px; border-radius:50%; background:#f0f0f0 center/cover; flex-shrink:0; overflow:hidden; }
  #chatApp .nav .brand .title { font-size:14px; font-weight:600; }
  #chatApp .nav .brand .title small { font-size:8px; letter-spacing:1px; opacity:.5; font-weight:400; text-transform:uppercase; margin-left:4px; }
  #chatApp .nav .right { margin-left:auto; display:flex; gap:15px; color:var(--ink); }
  #chatApp .nav .right span { cursor:pointer; display:flex; }

  #chatApp .nav.sub { position:absolute; top:0; left:0; right:0; z-index:30; display:flex; align-items:center; gap:10px; padding:60px 16px 14px; background:none; transition: padding-top 0.3s ease; }
  body.is-fullscreen #chatApp .nav.sub { padding-top: 85px; }
  #chatApp .nav.sub::before { content:""; position:absolute; left:0; right:0; top:0; height:125px; z-index:-1; pointer-events:none;
    background:linear-gradient(to bottom, rgba(255,255,255,.55) 60%, rgba(255,255,255,0));
    backdrop-filter:saturate(180%) blur(14px); -webkit-backdrop-filter:saturate(180%) blur(14px);
    -webkit-mask-image:linear-gradient(to bottom, #000 65%, transparent); mask-image:linear-gradient(to bottom, #000 65%, transparent); transition: height 0.3s ease; }
  body.is-fullscreen #chatApp .nav.sub::before { height: 150px; }
  #chatApp .nav.sub .back { cursor:pointer; line-height:1; color:var(--ink); display:flex; }
  #chatApp .nav.sub .head-ava { width:34px; height:34px; border-radius:50%; background:#f0f0f0 center/cover; flex-shrink:0; overflow:hidden; }
  #chatApp .nav.sub .ctitle { font-size:15px; font-weight:600; text-align:left; line-height:1.2; }
  #chatApp .nav.sub .csub { font-size:9px; opacity:.5; font-weight:400; letter-spacing:1px; }
  #chatApp .nav.sub .right { margin-left:auto; }

  #chatApp .search { flex-shrink:0; padding:8px 16px 4px; }
  #chatApp .search .box { background:var(--bg); border:1.5px solid var(--line); border-radius:14px; height:36px; display:flex; align-items:center; gap:8px; padding:0 11px; font-size:12px; color:var(--ink2); }
  #chatApp .search .box small { margin-left:auto; font-size:8.5px; letter-spacing:1px; opacity:.6; text-transform:uppercase; }

  #chatApp .grp-tabs { flex-shrink:0; display:flex; gap:8px; padding:14px 16px 18px; overflow-x:auto; }
  #chatApp .grp-tabs::-webkit-scrollbar { display:none; }
  #chatApp .grp-tab { flex:0 0 auto; padding:7px 17px; border:1.5px solid var(--line); border-radius:16px; background:var(--bg); color:var(--ink2); font-size:12px; letter-spacing:.5px; cursor:pointer; transition:.2s ease; }
  #chatApp .grp-tab.on { background:var(--ink); color:#fff; border-color:var(--ink); }

  #chatApp .list { flex:1; overflow-y:auto; padding:18px 16px 90px; }
  #chatApp .list::-webkit-scrollbar { display:none; }
  #chatApp .pill-group { background:var(--bg); border:1.5px solid #eaeaea; border-radius:26px; overflow:hidden; }
  #chatApp .cell { display:flex; align-items:center; gap:12px; padding:13px 16px; cursor:pointer; position:relative; overflow:hidden; }
  #chatApp .cell:active { background:#f6f6f6; }
  #chatApp .cell::after { content:""; position:absolute; left:66px; right:14px; bottom:0; height:1px; background:var(--line); }
  #chatApp .cell:last-child::after { display:none; }
  #chatApp .stardecor { position:absolute; top:0; bottom:0; right:0; width:46%; pointer-events:none; z-index:0; opacity:.55; }
  #chatApp .stardecor .star { position:absolute; color:#cfcfcf; }
  #chatApp .cell .ava-wrap, #chatApp .cell .mid, #chatApp .cell .meta { position:relative; z-index:1; }
  #chatApp .cell .ava-wrap { flex-shrink:0; margin-left:6px; position:relative; }
  #chatApp .cell .ava-wrap::before, #chatApp .cell .ava-wrap::after { content:""; position:absolute; left:-9px; width:12px; height:3px; border-radius:2px; background:linear-gradient(to right, #cfcfcf, #efefef); box-shadow:0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8); z-index:5; }
  #chatApp .cell .ava-wrap::before { top:12px; }
  #chatApp .cell .ava-wrap::after { bottom:12px; }
  #chatApp .cell .ava { width:46px; height:46px; border-radius:0; background:#f0f0f0 center/cover; overflow:hidden; border:1.5px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.05); }
  #chatApp .cell .ava-wrap .online { position:absolute; right:-2px; bottom:-2px; width:12px; height:12px; border-radius:50%; background:var(--ink); border:2.5px solid var(--bg); }
  #chatApp .cell .ava-wrap .online.off { background:#cdcdcd; }
  #chatApp .cell .mid { flex:1; min-width:0; }
  #chatApp .cell .mid .nm { font-size:14px; margin-bottom:3px; font-weight:500; }
  #chatApp .cell .mid .ms { font-size:11.5px; color:var(--ink2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #chatApp .cell .meta { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0; }
  #chatApp .cell .meta .tm { font-size:10px; color:var(--ink2); }
  #chatApp .cell .meta .badge { min-width:17px; height:17px; padding:0 5px; border-radius:9px; background:var(--ink); color:#fff; font-size:9.5px; display:flex; align-items:center; justify-content:center; }
  #chatApp .cell .meta .badge.hide { visibility:hidden; }
  #chatApp .cell.pinned { background:#fafafa; }
  /* 置顶：回旋针别着一个五角星 */
  #chatApp .cell .pin-clip { position:absolute; top:4px; left:6px; z-index:4; width:19px; height:30px; pointer-events:none; }
  #chatApp .cell .pin-clip .clip { position:absolute; inset:0; width:100%; height:100%; color:#8a8a8a; }
  #chatApp .cell .pin-clip .clip .ln { stroke-width:1.8; }
  #chatApp .cell .pin-clip .pstar { position:absolute; top:7px; left:50%; transform:translateX(-50%) rotate(8deg); width:11px; height:11px; }
  #chatApp .cell .pin-clip .pstar path { fill:#1a1a1a; }
  /* 联系人长按菜单（置顶 / 删除聊天） */
  #chatApp .cell-lp-overlay { position:fixed; inset:0; z-index:580; }
  #chatApp .cell-lp-menu { position:fixed; background:#fff; border-radius:13px; box-shadow:0 10px 32px rgba(0,0,0,.2); overflow:hidden; width:152px; opacity:0; transform:scale(.9) translateY(8px); transition:opacity .22s, transform .28s cubic-bezier(.34,1.56,.64,1); }
  #chatApp .cell-lp-overlay.show .cell-lp-menu { opacity:1; transform:scale(1) translateY(0); }
  #chatApp .cell-lp-menu .it { display:flex; align-items:center; gap:11px; padding:12px 15px; cursor:pointer; color:#1c1c1e; }
  #chatApp .cell-lp-menu .it:active { background:rgba(0,0,0,.04); }
  #chatApp .cell-lp-menu .it+.it { border-top:1px solid #f0f0f0; }
  #chatApp .cell-lp-menu .it svg { width:17px; height:17px; flex-shrink:0; }
  #chatApp .cell-lp-menu .it span { font-size:13px; font-weight:500; }
  #chatApp .cell-lp-menu .it.danger { color:#c0564e; }

  #chatApp .chat { flex:1; display:none; flex-direction:column; overflow:hidden; background:var(--bg); position:relative; }
  #chatApp .chat.show { display:flex; }
  #chatApp .chat .chat-wallpaper { position:absolute; inset:0; z-index:0; background:center/cover no-repeat; pointer-events:none; }
  #chatApp .chat .msgs { position:relative; z-index:1; }
  #chatApp .chat .input-bar { position:relative; z-index:2; }
  #chatApp .msgs { flex:1; overflow-y:auto; padding:158px 14px 40px; display:flex; flex-direction:column; gap:16px; }
  #chatApp .msgs::-webkit-scrollbar { display:none; }
  #chatApp .msg-load-more { display:flex; align-items:center; gap:10px; margin:0 0 10px; cursor:pointer; color:var(--ink2); transition:opacity .2s; }
  #chatApp .msg-load-more:active { opacity:0.6; }
  #chatApp .msg-load-more .line { flex:1; height:0; border-top:1.5px dashed var(--line); opacity:0.6; }
  #chatApp .msg-load-more .txt { font-size:11px; font-weight:600; letter-spacing:0.5px; opacity:0.8; }
  #chatApp .time-tip { text-align:center; font-size:9px; color:var(--ink2); }
  #chatApp .row { display:flex; gap:10px; align-items:flex-start; }
  #chatApp .row .ava { width:38px; height:38px; border-radius:50%; background:#f0f0f0 center/cover; overflow:hidden; flex-shrink:0; }
  #chatApp .row { display:flex; gap:10px; align-items:center; }
  #chatApp .row .bubble { max-width:66%; padding:6px 13px; font-size:13.5px; line-height:1.45; word-break:break-word; font-family:system-ui,-apple-system,sans-serif !important; position:relative; border-radius:13px; }
  #chatApp .row.you .bubble { background:#fff; color:#555; border:1px solid #e2e2e2; }
  #chatApp .row.me { flex-direction:row-reverse; }
  #chatApp .row.me .bubble { background:#ece5f5; color:#42335e; border:1px solid #d0c0e8; }
  #chatApp .bilingual-split { display:flex; flex-direction:column; }
  #chatApp .bilingual-split .en { font-size:14px; font-weight:500; color:inherit; margin-bottom:8px; line-height:1.5; }
  #chatApp .bilingual-split .divider { height:1px; background:repeating-linear-gradient(to right, currentColor 0, currentColor 4px, transparent 4px, transparent 8px); opacity:0.2; margin-bottom:8px; }
  #chatApp .bilingual-split .zh { font-size:13px; color:inherit; opacity:0.8; line-height:1.4; }
  
  #chatApp .msg-chk { width:22px; height:22px; border-radius:50%; border:1.5px solid #ccc; flex-shrink:0; position:relative; margin-top:auto; margin-bottom:auto; cursor:pointer; transition:0.2s; }
  #chatApp .msg-chk.on { background:#1a1a1a; border-color:#1a1a1a; }
  #chatApp .msg-chk.on::after { content:""; position:absolute; left:7px; top:3px; width:5px; height:10px; border:solid #fff; border-width:0 2px 2px 0; transform:rotate(45deg); }
  #chatApp .select-bar { flex-shrink:0; background:#fff; padding:15px 20px 30px; display:none; justify-content:space-between; align-items:center; z-index:10; box-shadow:0 -4px 15px rgba(0,0,0,0.05); }
  #chatApp .select-bar.show { display:flex; animation:msgUp .2s ease; }
  #chatApp .sb-cancel { font-size:15px; color:#555; cursor:pointer; }
  #chatApp .sb-del { font-size:15px; color:#c0564e; font-weight:600; cursor:pointer; }
  #chatApp .chat.select-mode .input-bar { display:none !important; }
  #chatApp .row.msg-in { animation:msgUp .4s var(--ease); }
  @keyframes msgUp { from{opacity:0; transform:translateY(14px);} to{opacity:1; transform:none;} }

  /* ===== 消息长按菜单 ===== */
  #chatApp .lp-overlay{position:absolute;inset:0;z-index:560;}
  #chatApp .lp-gsvg{fill:none;stroke:#1c1c1e;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
  #chatApp .lp-gsvg.g{stroke:#888;}
  /* A · 票根标签卡（AI消息） */
  #chatApp .lp-menu-a{position:absolute;z-index:561;background:#fff;border-radius:14px;box-shadow:0 10px 32px rgba(0,0,0,.2);overflow:hidden;width:160px;opacity:0;transform:scale(.9) translateY(8px);transition:opacity .25s,transform .3s cubic-bezier(.34,1.56,.64,1);}
  #chatApp .lp-overlay.show .lp-menu-a{opacity:1;transform:scale(1) translateY(0);}
  #chatApp .lp-menu-a .head{padding:8px 14px;background:#1c1c1e;display:flex;align-items:center;justify-content:space-between;}
  #chatApp .lp-menu-a .head span{font-size:8px;font-weight:800;letter-spacing:2px;color:#fff;text-transform:uppercase;}
  #chatApp .lp-menu-a .head .dots{display:flex;gap:3px;}
  #chatApp .lp-menu-a .head .dots i{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.4);}
  #chatApp .lp-menu-a .notch{height:0;border-bottom:1px dashed rgba(0,0,0,.12);position:relative;}
  #chatApp .lp-menu-a .notch::before,#chatApp .lp-menu-a .notch::after{content:'';position:absolute;top:-5px;width:10px;height:10px;border-radius:50%;background:rgba(0,0,0,.1);}
  #chatApp .lp-menu-a .notch::before{left:-5px;}
  #chatApp .lp-menu-a .notch::after{right:-5px;}
  #chatApp .lp-menu-a .it{display:flex;align-items:center;gap:11px;padding:11px 15px;cursor:pointer;}
  #chatApp .lp-menu-a .it:active{background:rgba(0,0,0,.04);}
  #chatApp .lp-menu-a .it svg{width:17px;height:17px;}
  #chatApp .lp-menu-a .it span{font-size:13px;color:#1c1c1e;font-weight:500;}
  #chatApp .lp-menu-a .it.danger span{color:#888;}
  /* D · 邮票虚线卡（用户消息） */
  #chatApp .lp-menu-d{position:absolute;z-index:561;background:#fff;padding:6px;box-shadow:0 10px 32px rgba(0,0,0,.2);width:158px;border-radius:4px;opacity:0;transform:scale(.9) translateY(8px);transition:opacity .25s,transform .3s cubic-bezier(.34,1.56,.64,1);}
  #chatApp .lp-overlay.show .lp-menu-d{opacity:1;transform:scale(1) translateY(0);}
  #chatApp .lp-menu-d .inner{border:1.5px dashed rgba(0,0,0,.12);border-radius:3px;overflow:hidden;}
  #chatApp .lp-menu-d .it{display:flex;align-items:center;gap:10px;padding:10px 13px;cursor:pointer;}
  #chatApp .lp-menu-d .it+.it{border-top:1px dashed rgba(0,0,0,.1);}
  #chatApp .lp-menu-d .it:active{background:rgba(0,0,0,.04);}
  #chatApp .lp-menu-d .it svg{width:16px;height:16px;}
  #chatApp .lp-menu-d .it span{font-size:12px;color:#1c1c1e;font-weight:600;letter-spacing:.5px;}
  #chatApp .lp-menu-d .it.danger span{color:#888;}
  #chatApp .lp-menu-d .stamp{position:absolute;top:-8px;right:8px;width:22px;height:22px;border-radius:50%;background:#1c1c1e;display:flex;align-items:center;justify-content:center;}
  #chatApp .lp-menu-d .stamp svg{width:11px;height:11px;}
  /* 气泡编辑态：蓝色低饱和框 + 文字下划线 */
  #chatApp .row .bubble.editing{outline:none;border:1.5px solid #9ccaf0 !important;box-shadow:0 0 0 3px rgba(156,202,240,.25);text-decoration:underline;text-decoration-color:#9ccaf0;text-underline-offset:3px;}
  /* 总结提醒胶囊（卡片左竖条风·白底·带圆叉号） */
  #chatApp .sum-pill{position:absolute;top:90px;left:50%;transform:translateX(-50%) translateY(-8px);z-index:35;display:none;align-items:stretch;gap:0;white-space:nowrap;overflow:hidden;
    background:rgba(255,255,255,.92);backdrop-filter:saturate(160%) blur(12px);-webkit-backdrop-filter:saturate(160%) blur(12px);
    color:#1a1a1a;border-radius:12px;font-size:11px;
    box-shadow:0 6px 20px rgba(0,0,0,.16);border:1px solid rgba(0,0,0,.05);opacity:0;transition:opacity .25s var(--ease),transform .25s var(--ease);}
  #chatApp .sum-pill.show{display:flex;opacity:1;transform:translateX(-50%) translateY(0);}
  #chatApp .sum-pill::before{content:"";width:4px;align-self:stretch;background:#002fa7;flex-shrink:0;}
  #chatApp .sum-pill .sp-tap{display:flex;align-items:center;gap:7px;padding:8px 8px 8px 11px;cursor:pointer;}
  #chatApp .sum-pill .sp-tap .sp-t{font-weight:700;color:#1a1a1a;}
  #chatApp .sum-pill .sp-tap .sp-s{font-weight:500;color:#9a9aa0;font-size:9.5px;}
  #chatApp .sum-pill .sp-spin{display:flex;color:#002fa7;animation:spSpin .9s linear infinite;}
  #chatApp .sum-pill .sp-spin svg{width:12px;height:12px;}
  #chatApp .sum-pill .sp-x{flex-shrink:0;align-self:center;width:20px;height:20px;margin-right:7px;border-radius:50%;background:#f0f0f2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#888;transition:background .15s ease;}
  #chatApp .sum-pill .sp-x:active{background:#e2e2e6;}
  #chatApp .sum-pill .sp-x svg{width:11px;height:11px;}
  @keyframes spSpin{to{transform:rotate(360deg);}}
  /* 设置面板行内开关（感知时间） */
  #chatApp .sp-row .tg-switch{width:40px;height:24px;border-radius:12px;background:#dcdcdc;position:relative;flex-shrink:0;cursor:pointer;transition:background .2s ease;}
  #chatApp .sp-row .tg-switch .tg-knob{position:absolute;top:2.5px;left:2.5px;width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s var(--ease);}
  #chatApp .sp-row .tg-switch.on{background:#9ccaf0;}
  #chatApp .sp-row .tg-switch.on .tg-knob{left:18.5px;}

  #chatApp .input-bar { flex-shrink:0; margin:0 12px 10px; padding:4px 4px 4px 12px; display:flex; flex-wrap:wrap; align-items:center; column-gap:10px; row-gap:0; position:relative;
    background:#fff; border-radius:26px; box-shadow:0 8px 20px rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.08); transition:margin-bottom 0.3s ease; }
  body.is-fullscreen #chatApp .input-bar { margin-bottom: 25px; }
  #chatApp .input-bar .ic { color:#888; cursor:pointer; display:flex; align-items:center; justify-content:center; position:relative; z-index:1; }
  #chatApp .input-bar .wrap { flex:1; display:flex; align-items:center; position:relative; z-index:1; }
  #chatApp .input-bar .field { flex:1; height:34px; line-height:34px; background:transparent; border:none; padding:0; font-size:13px; outline:none; white-space:nowrap; overflow-x:auto; overflow-y:hidden; }
  #chatApp .input-bar .field::-webkit-scrollbar { display:none; }
  #chatApp .input-bar .field:empty::before { content:attr(data-ph); color:#ccc; }
  #chatApp .input-bar .emoji { color:#888; cursor:pointer; padding:0 5px; display:flex; align-items:center; justify-content:center; }
  #chatApp .input-bar .send { width:34px; height:34px; flex-shrink:0; border-radius:50%; background:#1a1a1a; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.15); transition:transform .2s var(--ease); position:relative; z-index:1; margin-left:-2px; }
  #chatApp .input-bar .send:active { transform:scale(.9); }
  #chatApp .input-bar .send .star { display:none; }
  #chatApp .input-bar .send .arrow { display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
  #chatApp .input-bar .send .arrow svg { width:15px; height:15px; stroke:#fff; }
  #chatApp .input-bar .ib-stars { display:none; }
  /* 底栏下方小图标行 */
  #chatApp .input-bar .ib-foot { flex:0 0 100%; display:flex; align-items:center; gap:20px; padding:10px 8px 6px; margin-top:2px; border-top:1px solid #f2f2f2; position:relative; z-index:1; color:var(--ink2);
    overflow:hidden; transition:max-height .26s var(--ease), opacity .2s ease, padding .26s var(--ease), margin .26s var(--ease); max-height:46px; }
  #chatApp .input-bar.foot-hide .ib-foot { max-height:0; opacity:0; padding-top:0; padding-bottom:0; margin-top:0; border-top-color:transparent; }
  #chatApp .input-bar .ib-foot .fi { width:20px; height:20px; flex-shrink:0; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:color .15s ease, transform .15s ease; }
  #chatApp .input-bar .ib-foot .fi:active { color:var(--ink); transform:scale(.9); }
  #chatApp .input-bar .ib-foot .fi.toggle { margin-left:auto; }
  /* 折叠后用来重新展开的小把手 */
  #chatApp .input-bar .foot-handle { display:none; position:absolute; right:20px; top:-30px; z-index:2; width:26px; height:26px; align-items:center; justify-content:center; cursor:pointer; color:var(--ink2); background:#fff; border-radius:50%; box-shadow:0 4px 12px rgba(0,0,0,0.08); border:1px solid rgba(0,0,0,0.04); transition:transform .2s ease; }
  #chatApp .input-bar .foot-handle:active { transform:scale(.85); }
  #chatApp .input-bar.foot-hide .foot-handle { display:flex; }

  #chatApp .tabbar { position:absolute; bottom:21px; left:0; right:0; padding:0; background:none; border:none; display:flex; justify-content:center; gap:16px; z-index:800; pointer-events:none; transition: bottom 0.3s ease; }
  body.is-fullscreen #chatApp .tabbar { bottom: 35px; }
  #chatApp .tab { pointer-events:auto; width:50px; height:50px; border-radius:50%; background:#fff; border:2px solid rgba(0,0,0,.1); color:var(--ink2); display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative; box-shadow:0 6px 16px rgba(0,0,0,.15); transition:all .4s var(--ease); font-size:0; }
  #chatApp .tab:active { transform:scale(.9); }
  #chatApp .tab .ti { display:flex; width:22px; height:22px; align-items:center; justify-content:center; }
  #chatApp .tab .ti svg { width:100%; height:100%; }
  #chatApp .tab.on { background:var(--ink); border:2px solid var(--ink); color:#fff; transform:translateY(-8px); box-shadow:0 8px 20px rgba(0,0,0,.25); }
  #chatApp .tab.on:active { transform:translateY(-4px) scale(.9); }

  /* ===== 设置面板（分页手账风） ===== */
  #chatApp .setpanel { position:absolute; inset:0; z-index:90; display:none; flex-direction:column;
    background:#fafafa; background-image:radial-gradient(circle, #e6e6e6 1px, transparent 1px); background-size:18px 18px;
    --ink:#3a3a3a; --ink2:#9a9a9a; --line:#eee; --card:#fff; }
  #chatApp .setpanel.show { display:flex; animation:setIn .26s var(--ease); }
  @keyframes setIn { from{opacity:0; transform:translateX(16px);} to{opacity:1; transform:none;} }
  #chatApp .setpanel .sp-head { flex-shrink:0; padding:60px 18px 6px; display:flex; align-items:center; gap:12px; transition: padding-top 0.3s ease; }
  body.is-fullscreen #chatApp .setpanel .sp-head { padding-top: 105px; }
  #chatApp .setpanel .sp-head .back { cursor:pointer; display:flex; color:var(--ink); width:34px; height:34px; align-items:center; justify-content:center; }
  #chatApp .setpanel .sp-head .t { font-size:15px; font-weight:600; letter-spacing:.5px; }
  #chatApp .setpanel .sp-head .t small { display:block; font-size:8px; letter-spacing:2px; opacity:.5; text-transform:uppercase; font-weight:400; color:var(--ink2); margin-top:1px; }

  #chatApp .setpanel .sp-tabs { display:flex; gap:4px; padding:6px 18px 0; position:relative; z-index:2; }
  #chatApp .setpanel .sp-tb { flex:1; text-align:center; font-size:12px; font-weight:600; padding:11px 0 12px; cursor:pointer; color:var(--ink2); border-radius:12px 12px 0 0; position:relative; top:1px; transition:.18s ease; }
  #chatApp .setpanel .sp-tb small { display:block; font-size:7px; letter-spacing:1.5px; text-transform:uppercase; opacity:.7; margin-top:2px; }
  #chatApp .setpanel .sp-tb.on { color:var(--ink); background:var(--card); }
  #chatApp .setpanel .sp-tb .pin { position:absolute; top:-3px; left:50%; transform:translateX(-50%); width:5px; height:5px; border-radius:50%; background:#c8c8c8; opacity:0; transition:opacity .18s ease; }
  #chatApp .setpanel .sp-tb.on .pin { opacity:1; }

  #chatApp .setpanel .sp-sheet { margin:0 18px; background:var(--card); border-radius:0 0 14px 14px; min-height:62vh; padding:6px 0 18px; }
  #chatApp .setpanel .sp-body { flex:1; overflow-y:auto; padding:0 0 30px; }
  #chatApp .setpanel .sp-body::-webkit-scrollbar { display:none; }

  #chatApp .sp-page { display:none; animation:spFade .22s var(--ease); }
  #chatApp .sp-page.on { display:block; }
  @keyframes spFade { from{opacity:0; transform:translateY(6px);} to{opacity:1;} }

  #chatApp .sp-profile { margin:16px 16px 6px; background:#fafafa; border-radius:8px; padding:24px 18px 16px; position:relative; }
  #chatApp .sp-profile .tape { position:absolute; top:-9px; left:50%; transform:translateX(-50%) rotate(-2deg); width:64px; height:18px; background:rgba(150,150,150,.16); }
  #chatApp .sp-profile .pr-head { display:flex; align-items:center; gap:15px; }
  #chatApp .sp-profile .pr-ava-wrap { position:relative; flex-shrink:0; }
  #chatApp .sp-profile .pr-ava { width:66px; height:66px; border-radius:16px; background:center/cover; position:relative; }
  #chatApp .sp-profile .pr-ava-wrap .dash { position:absolute; inset:-6px; border:1.5px dashed #c9c9c9; border-radius:21px; pointer-events:none; }
  #chatApp .sp-profile .pr-ava-wrap .corner { position:absolute; right:-9px; bottom:-9px; width:22px; height:22px; z-index:2; }
  #chatApp .sp-profile .pr-meta { flex:1; }
  #chatApp .sp-profile .pr-nm { font-size:18px; font-weight:700; outline:none; display:inline-block; background:#fff; border-radius:7px; padding:4px 11px; box-shadow:0 2px 0 #d4d4d4, 0 1px 4px rgba(0,0,0,.05); }
  #chatApp .sp-profile .pr-nm:focus { box-shadow:0 2px 0 var(--ink), 0 1px 4px rgba(0,0,0,.08); }
  #chatApp .sp-profile .pr-en { font-size:9px; letter-spacing:1.5px; color:var(--ink2); text-transform:uppercase; margin-top:8px; }
  #chatApp .sp-profile .pr-tags { display:flex; gap:6px; margin-top:9px; }
  #chatApp .sp-profile .pr-tags b { font-size:9.5px; font-weight:400; color:var(--ink2); border-radius:4px; padding:3px 9px; background:#fff; }
  /* 签名：缩小 + 纵向缩短 */
  #chatApp .sp-profile .pr-quote { margin-top:14px; padding:7px 12px 7px; position:relative; font-size:11px; color:var(--ink); line-height:1.45; outline:none; background:#fff; border-radius:8px; box-shadow:0 2px 0 #d4d4d4, 0 1px 5px rgba(0,0,0,.05); }
  #chatApp .sp-profile .pr-quote:focus { box-shadow:0 2px 0 var(--ink), 0 1px 5px rgba(0,0,0,.08); }
  #chatApp .sp-profile .pr-quote::before { content:"\\201C"; position:absolute; left:-3px; top:-10px; font-size:28px; color:#d2d2d2; font-family:Georgia,serif; line-height:1; }
  #chatApp .sp-profile .pr-quote::after { content:"\\201D"; font-size:16px; color:#d2d2d2; font-family:Georgia,serif; line-height:0; vertical-align:-2px; margin-left:3px; }

  #chatApp .sp-sec { display:flex; align-items:center; gap:8px; padding:18px 18px 6px; }
  #chatApp .sp-sec .dot { width:6px; height:6px; border-radius:50%; background:var(--ink); }
  #chatApp .sp-sec .tx { font-size:11px; font-weight:600; letter-spacing:.5px; }
  #chatApp .sp-sec .en { font-size:8px; color:var(--ink2); letter-spacing:1px; text-transform:uppercase; }
  #chatApp .sp-sec .lf { flex:1; height:1px; background:var(--line); }

  #chatApp .sp-grp { margin:0 6px; }
  #chatApp .sp-row { display:flex; align-items:center; gap:13px; padding:14px 15px; cursor:pointer; position:relative; border-radius:10px; }
  #chatApp .sp-row:active { background:#fafafa; }
  #chatApp .sp-row::after { content:""; position:absolute; left:50px; right:13px; bottom:0; height:1px; background:var(--line); }
  #chatApp .sp-row:last-child::after { display:none; }
  #chatApp .sp-row .si { width:24px; height:24px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:var(--ink); }
  #chatApp .sp-row .sl { flex:1; }
  #chatApp .sp-row .sl .n { font-size:13px; font-weight:500; }
  #chatApp .sp-row .sl .d { font-size:9.5px; color:var(--ink2); margin-top:2px; }
  #chatApp .sp-row .val { font-size:10px; color:var(--ink2); margin-right:4px; }
  #chatApp .sp-row .arr { color:#ccc; display:flex; }
  #chatApp .sp-row.danger .si, #chatApp .sp-row.danger .sl .n { color:#a85; }
  #chatApp .sp-deco-star { position:absolute; color:#dcdcdc; pointer-events:none; opacity:.85; }

  /* ===== 人设详情面板 ===== */
  #chatApp .persona-panel { position:absolute; inset:0; z-index:95; display:none; flex-direction:column;
    background:#fafafa; background-image:radial-gradient(circle, #e6e6e6 1px, transparent 1px); background-size:18px 18px;
    --ink:#3a3a3a; --ink2:#9a9a9a; --line:#eee; --card:#fff; }
  #chatApp .persona-panel.show { display:flex; animation:setIn .26s var(--ease); }
  #chatApp .persona-panel .pp-head { flex-shrink:0; padding:60px 18px 10px; display:flex; align-items:center; gap:12px; transition: padding-top 0.3s ease; }
  body.is-fullscreen #chatApp .persona-panel .pp-head { padding-top: 105px; }
  #chatApp .persona-panel .pp-head .back { cursor:pointer; display:flex; color:var(--ink); width:34px; height:34px; align-items:center; justify-content:center; }
  #chatApp .persona-panel .pp-head .t { font-size:15px; font-weight:600; letter-spacing:.5px; }
  #chatApp .persona-panel .pp-head .t small { display:block; font-size:8px; letter-spacing:2px; opacity:.5; text-transform:uppercase; font-weight:400; color:var(--ink2); margin-top:1px; }
  #chatApp .persona-panel .pp-body { flex:1; overflow-y:auto; padding:6px 18px 30px; }
  #chatApp .persona-panel .pp-body::-webkit-scrollbar { display:none; }
  /* 折叠块 */
  #chatApp .pp-item { background:var(--card); border-radius:12px; margin-bottom:10px; overflow:hidden; }
  #chatApp .pp-item .pp-q { display:flex; align-items:center; gap:10px; padding:14px 15px; cursor:pointer; }
  #chatApp .pp-item .pp-q . qi { width:6px; height:6px; border-radius:50%; background:var(--ink); flex-shrink:0; }
  #chatApp .pp-item .pp-q .qt { flex:1; font-size:13px; font-weight:600; }
  #chatApp .pp-item .pp-q .qa { color:#bbb; display:flex; transition:transform .22s var(--ease); }
  #chatApp .pp-item.open .pp-q .qa { transform:rotate(90deg); }
  #chatApp .pp-item .pp-a { max-height:0; overflow:hidden; transition:max-height .28s var(--ease); }
  #chatApp .pp-item.open .pp-a { max-height:800px; }
  #chatApp .pp-item .pp-a .inner { padding:0 15px 15px; font-size:12px; line-height:1.75; color:var(--ink); white-space:pre-wrap; word-break:break-word; }
  #chatApp .pp-raw { background:var(--card); border-radius:12px; padding:15px; font-size:12px; line-height:1.8; color:var(--ink); white-space:pre-wrap; word-break:break-word; }
  #chatApp .pp-empty { text-align:center; color:var(--ink2); font-size:12px; padding:50px 0; }
  /* 人设编辑 */
  #chatApp .persona-panel .pp-edit { margin-left:auto; font-size:11px; font-weight:600; color:var(--ink); cursor:pointer; border:1.5px dashed var(--ink2); border-radius:10px; padding:5px 11px; }
  #chatApp .pp-editbar { flex-shrink:0; padding:10px 18px 24px; display:flex; flex-direction:column; gap:10px; background:var(--card); }
  #chatApp .pp-textarea { width:100%; min-height:220px; max-height:50vh; border:1.5px solid var(--line); border-radius:12px; padding:12px; font-size:12px; line-height:1.7; font-family:inherit; color:var(--ink); outline:none; resize:none; }
  #chatApp .pp-textarea:focus { border-color:#a8c6b4; }
  #chatApp .pp-editacts { display:flex; gap:10px; }
  #chatApp .pp-editacts button { flex:1; padding:11px; border-radius:12px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
  #chatApp #caPersonaCancel { background:#fff; border:1.5px solid var(--ink); color:var(--ink); }
  #chatApp #caPersonaSave { background:var(--ink); border:1.5px solid var(--ink); color:#fff; }

  /* ===== AI / 提示词面板 ===== */
  #chatApp .ai-panel { position:absolute; inset:0; z-index:96; display:none; flex-direction:column;
    background:#fafafa; background-image:radial-gradient(circle, #e6e6e6 1px, transparent 1px); background-size:18px 18px;
    --ink:#3a3a3a; --ink2:#9a9a9a; --line:#eee; --card:#fff; }
  #chatApp .ai-panel.show { display:flex; animation:setIn .26s var(--ease); }
  #chatApp .ai-panel .ap-head { flex-shrink:0; padding:60px 18px 10px; display:flex; align-items:center; gap:12px; transition: padding-top 0.3s ease; }
  body.is-fullscreen #chatApp .ai-panel .ap-head { padding-top: 105px; }
  #chatApp .ai-panel .ap-head .back { cursor:pointer; display:flex; color:var(--ink); width:34px; height:34px; align-items:center; justify-content:center; }
  #chatApp .ai-panel .ap-head .t { font-size:15px; font-weight:600; }
  #chatApp .ai-panel .ap-head .t small { display:block; font-size:8px; letter-spacing:2px; opacity:.5; text-transform:uppercase; color:var(--ink2); margin-top:1px; }
  #chatApp .ai-panel .ap-body { flex:1; overflow-y:auto; padding:6px 18px 30px; }
  #chatApp .ai-panel .ap-body::-webkit-scrollbar { display:none; }
  #chatApp .ap-status { background:var(--card); border-radius:12px; padding:14px 15px; margin-bottom:14px; font-size:12px; line-height:1.8; }
  #chatApp .ap-status .k { color:var(--ink2); }
  #chatApp .ap-status .v { font-weight:600; }
  #chatApp .ap-ctx { background:var(--card); border-radius:12px; padding:13px 15px; margin-bottom:14px; display:flex; align-items:center; gap:14px; }
  #chatApp .ap-ctx .ctx-minus, #chatApp .ap-ctx .ctx-plus { width:30px; height:30px; flex-shrink:0; border-radius:9px; border:1.5px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:17px; cursor:pointer; user-select:none; color:var(--ink); }
  #chatApp .ap-ctx .ctx-minus:active, #chatApp .ap-ctx .ctx-plus:active { background:#f0f0f0; }
  #chatApp .ap-ctx .ctx-val { font-size:16px; font-weight:700; min-width:24px; text-align:center; }
  #chatApp .ap-ctx .ctx-tip { font-size:9.5px; color:var(--ink2); line-height:1.4; flex:1; }
  #chatApp .ap-toggle { background:var(--card); border-radius:12px; padding:13px 15px; margin-bottom:14px; display:flex; align-items:center; gap:12px; }
  #chatApp .ap-toggle .tg-info { flex:1; }
  #chatApp .ap-toggle .tg-n { font-size:13px; font-weight:500; }
  #chatApp .ap-toggle .tg-d { font-size:9.5px; color:var(--ink2); margin-top:2px; }
  #chatApp .ap-toggle .tg-switch { width:42px; height:25px; border-radius:13px; background:#dcdcdc; position:relative; flex-shrink:0; cursor:pointer; transition:background .2s ease; }
  #chatApp .ap-toggle .tg-switch .tg-knob { position:absolute; top:2.5px; left:2.5px; width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.2); transition:left .2s var(--ease); }
  #chatApp .ap-toggle .tg-switch.on { background:#9ccaf0; }
  #chatApp .ap-toggle .tg-switch.on .tg-knob { left:19.5px; }
  #chatApp .ap-sec { display:flex; align-items:center; gap:8px; padding:8px 2px 10px; }
  #chatApp .ap-sec .dot { width:6px; height:6px; border-radius:50%; background:var(--ink); }
  #chatApp .ap-sec .tx { font-size:11px; font-weight:600; }
  #chatApp .ap-sec .add { margin-left:auto; font-size:11px; font-weight:600; border:1.5px dashed var(--ink2); border-radius:10px; padding:4px 11px; cursor:pointer; color:var(--ink); }
  #chatApp .prompt-item { background:var(--card); border-radius:12px; padding:13px 14px; margin-bottom:10px; display:flex; align-items:center; gap:11px; cursor:pointer; }
  #chatApp .prompt-item .pi-ic { width:22px; height:22px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:var(--ink); }
  #chatApp .prompt-item .pi-name { flex:1; font-size:13px; font-weight:500; }
  #chatApp .prompt-item .pi-name .pi-lock { font-size:10px; color:var(--ink2); font-weight:400; }
  #chatApp .prompt-item .pi-del { font-size:11px; color:#a85; cursor:pointer; margin-right:2px; }
  #chatApp .prompt-item .pi-check { width:18px; height:18px; border-radius:50%; border:1.5px solid var(--line); flex-shrink:0; position:relative; }
  #chatApp .prompt-item.on .pi-check { background:var(--ink); border-color:var(--ink); }
  #chatApp .prompt-item.on .pi-check::after { content:""; position:absolute; left:5px; top:2px; width:5px; height:9px; border:solid #fff; border-width:0 2px 2px 0; transform:rotate(45deg); }

  /* 提示词内置弹窗 */
  #chatApp .prompt-modal { position:absolute; inset:0; z-index:110; display:none; align-items:center; justify-content:center; padding:22px; background:rgba(120,122,128,.42); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
  #chatApp .prompt-modal.show { display:flex; animation:chatIn .2s var(--ease); }
  #chatApp .pm-card { width:100%; max-width:330px; background:#fff; border-radius:16px; padding:18px; box-shadow:0 18px 50px rgba(0,0,0,.3); }
  #chatApp .pm-title { font-size:15px; font-weight:700; margin-bottom:14px; color:#1a1a1a; }
  #chatApp .pm-name { width:100%; padding:10px 12px; border:1.5px solid #eee; border-radius:10px; font-size:13px; font-family:inherit; outline:none; margin-bottom:10px; color:#1a1a1a; }
  #chatApp .pm-name:focus { border-color:#1a1a1a; }
  #chatApp .pm-content { width:100%; min-height:160px; max-height:40vh; padding:11px 12px; border:1.5px solid #eee; border-radius:10px; font-size:12px; line-height:1.7; font-family:inherit; outline:none; resize:none; color:#1a1a1a; }
  #chatApp .pm-content:focus { border-color:#1a1a1a; }
  #chatApp .pm-acts { display:flex; gap:9px; margin-top:14px; }
  #chatApp .pm-acts button { flex:1; padding:11px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
  #chatApp #caPMCancel { background:#fff; border:1.5px solid #1a1a1a; color:#1a1a1a; }
  #chatApp #caPMSave { background:#1a1a1a; border:1.5px solid #1a1a1a; color:#fff; }

  /* ===== 弹窗（装饰抽屉式） ===== */
  #chatApp .modal-mask { position:absolute; inset:0; z-index:100; display:none; align-items:center; justify-content:center; padding:24px;
    background:rgba(120,122,128,.42); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
  #chatApp .modal-mask.show { display:flex; animation:chatIn .2s var(--ease); }
  #chatApp .m-shell { position:relative; width:100%; max-width:330px; animation:mup .26s var(--ease); }
  @keyframes mup { from{opacity:0; transform:translateY(14px) scale(.97);} to{opacity:1; transform:none;} }
  #chatApp .bigring { position:absolute; left:60px; top:-20px; width:300px; height:290px; border-radius:50%; border:2px dashed var(--ink); z-index:0; }
  #chatApp .m5 { position:relative; z-index:2; background:#fff; border-radius:22px; box-shadow:0 20px 55px rgba(0,0,0,.28); }
  #chatApp .m5 .top { background:var(--ink); color:#fff; padding:20px 22px 22px; position:relative; border-radius:22px 22px 0 0; }
  #chatApp .m5 .top .hd { font-size:17px; font-weight:700; }
  #chatApp .m5 .top .hd2 { font-size:10px; opacity:.6; letter-spacing:1px; margin-top:3px; }
  #chatApp .m5 .top .ava { position:absolute; right:22px; bottom:-26px; width:68px; height:68px; border-radius:20px; border:2px dashed rgba(255,255,255,.85); background:#f0f0f0 center/cover; box-shadow:0 4px 12px rgba(0,0,0,.2); cursor:pointer; outline:3px solid #fff; }
  #chatApp .m5 .bd { padding:36px 22px 20px; }

  #chatApp .sticky { position:absolute; left:-22px; top:64px; z-index:6; width:74px; height:74px; transform:rotate(-13deg); filter:drop-shadow(0 6px 10px rgba(0,0,0,.25)); }
  #chatApp .sticky .note { width:100%; height:100%; background:#fff; display:flex; align-items:center; justify-content:center; clip-path:polygon(50% 2%,61% 38%,98% 38%,68% 60%,79% 96%,50% 74%,21% 96%,32% 60%,2% 38%,39% 38%); }
  #chatApp .sticky .note svg { width:42px; height:42px; }
  #chatApp .sticky .tape { position:absolute; top:-6px; left:50%; transform:translateX(-50%) rotate(8deg); width:34px; height:13px; background:rgba(0,0,0,.12); }
  #chatApp .ministar { position:absolute; z-index:5; pointer-events:none; opacity:.7; }
  #chatApp .ministar.s1 { left:-30px; top:150px; width:34px; height:34px; transform:rotate(18deg); }
  #chatApp .ministar.s2 { left:6px; top:182px; width:22px; height:22px; transform:rotate(-24deg); }
  #chatApp .vdash { position:absolute; left:-12px; bottom:18px; width:0; height:120px; border-left:2px dashed rgba(120,122,128,.85); z-index:4; }

  #chatApp .fld { margin-bottom:15px; }
  #chatApp .fld label { display:block; font-size:10px; color:var(--ink2); margin-bottom:4px; letter-spacing:.5px; }
  #chatApp .fld .line { position:relative; }
  #chatApp .fld input { width:100%; padding:8px 2px; font-size:14px; font-family:inherit; outline:none; color:var(--ink); border:none; border-bottom:1.5px solid var(--line); background:transparent; transition:border-color .2s ease; }
  #chatApp .fld input:focus { border-bottom-color:var(--ink); }
  #chatApp .fld .dot { position:absolute; right:0; bottom:-5px; width:9px; height:9px; border-radius:50%; background:var(--ink); }
  #chatApp .fld .dot.hollow { background:#fff; border:1.5px solid var(--ink); }
  #chatApp .chips { display:flex; gap:7px; flex-wrap:wrap; }
  #chatApp .chips b { padding:7px 14px; font-size:12px; font-weight:400; cursor:pointer; border:1.5px solid var(--line); border-radius:14px; color:var(--ink2); transition:all .15s ease; }
  #chatApp .chips b.on { background:var(--ink); color:#fff; border-color:var(--ink); }

  #chatApp .m-import { display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed var(--ink2); border-radius:16px; padding:24px 14px; text-align:center; cursor:pointer; color:var(--ink2); transition:.2s ease; }
  #chatApp .m-import:active { border-color:var(--ink); background:rgba(0,0,0,.03); }
  #chatApp .m-import .big { font-size:26px; line-height:1; margin-bottom:8px; }
  #chatApp .m-import .l { font-size:12px; font-weight:600; color:var(--ink); }
  #chatApp .m-import .s { font-size:9px; margin-top:5px; letter-spacing:1px; opacity:.7; }
  #chatApp .m-persona { margin-top:12px; width:100%; min-height:80px; max-height:130px; overflow-y:auto; padding:11px 12px; border:1.5px solid var(--line); border-radius:11px; font-size:12px; line-height:1.6; color:var(--ink); font-family:inherit; resize:none; outline:none; }
  #chatApp .m-persona:focus { border-color:var(--ink); }
  #chatApp .m-imported-name { font-size:10px; color:var(--ink); margin-top:8px; text-align:center; }

  #chatApp .foot { display:flex; gap:9px; margin-top:22px; }
  #chatApp .foot button { flex:1; padding:12px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; border-radius:2px; }
  #chatApp .foot .g { background:#fff; border:2px solid var(--ink); color:var(--ink); }
  #chatApp .foot .s { background:var(--ink); border:2px solid var(--ink); color:#fff; }

  /* ================= 新增：我的名片与新联系人视图 ================= */
  #chatApp .dark-bg { position:absolute; inset:0; background-size:cover; background-position:center; opacity:0.7; z-index:1; }
  #chatApp .gradient-top { position:absolute; top:0; left:0; right:0; height:40%; z-index:2; background:linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 25%, rgba(255,255,255,0) 100%); }
  #chatApp .gradient-bottom { position:absolute; bottom:0; left:0; right:0; height:65%; z-index:2; background:linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0) 100%); }

  #chatApp .my-card-view { position:absolute; inset:0; display:none; flex-direction:column; z-index:40; background:#000; transition:transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s; }
  #chatApp .my-card-view.show { display:flex; }
  #chatApp .my-card-view.hide-scale { transform:scale(0.95); opacity:0; pointer-events:none; }
  #chatApp .mc-header { position:relative; z-index:10; padding:60px 20px 10px; display:flex; justify-content:center; }
  body.is-fullscreen #chatApp .mc-header { padding-top: 105px; }
  #chatApp .mc-header .title { font-size:16px; font-weight:700; letter-spacing:2px; color:#111; text-transform:uppercase; }
  #chatApp .mc-stage { position:relative; z-index:10; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-top:-40px; }
  #chatApp .float-btn { position:absolute; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; transition:transform 0.2s; z-index:5; animation:floatAnim 4s ease-in-out infinite alternate; }
  #chatApp .float-btn:active { transform:scale(0.9) !important; }
  #chatApp .float-btn .f-icon { width:56px; height:56px; border-radius:50%; background:rgba(255,255,255,0.15); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.3); box-shadow:0 10px 25px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:#fff; }
  #chatApp .float-btn .f-icon svg { width:24px; height:24px; stroke-width:1.5; }
  #chatApp .float-btn span { font-size:11px; font-weight:600; color:#fff; letter-spacing:1px; text-shadow:0 2px 4px rgba(0,0,0,0.8); text-transform:uppercase; }
  #chatApp .fb-chat { transform:translate(-100px, -120px); animation-delay:0s; }
  #chatApp .fb-call { transform:translate(100px, -120px); animation-delay:-1s; }
  #chatApp .fb-info { transform:translate(-100px, 120px); animation-delay:-2s; }
  #chatApp .fb-set  { transform:translate(100px, 120px); animation-delay:-3s; }
  @keyframes floatAnim { 0% { margin-top:0px; } 100% { margin-top:-12px; } }
  #chatApp .mc-avatar-wrap { position:relative; width:130px; height:130px; border-radius:50%; border:4px solid #fff; box-shadow:0 20px 40px rgba(0,0,0,0.4); background:url('https://i.postimg.cc/26RTf7QD/image-download-1772630149759.jpg') center/cover; cursor:pointer; transition:transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); z-index:10; }
  #chatApp .mc-avatar-wrap:active { transform:scale(0.94); }
  #chatApp .star-badge { position:absolute; right:0; bottom:0; width:36px; height:36px; background:#111; border-radius:50%; border:3px solid #fff; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.3); }
  #chatApp .star-badge svg { width:18px; height:18px; fill:currentColor; }
  #chatApp .mc-name { margin-top:24px; font-size:28px; font-weight:800; letter-spacing:1px; color:#fff; text-shadow:0 2px 10px rgba(0,0,0,0.5); z-index:10; }
  #chatApp .mc-status { margin-top:6px; font-size:13px; color:rgba(255,255,255,0.7); font-weight:500; z-index:10; }

  #chatApp .new-list-view { position:absolute; inset:0; background:#fff; color:#111; z-index:50; display:none; flex-direction:column; transform:translateX(100%); transition:transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
  #chatApp .new-list-view.show { display:flex; transform:translateX(0); }
  #chatApp .l-header { padding:50px 20px 10px; display:flex; align-items:center; gap:16px; }
  body.is-fullscreen #chatApp .l-header { padding-top: 95px; }
  #chatApp .l-header .back-btn { width:36px; height:36px; border-radius:50%; background:#f0f0f2; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#111; }
  #chatApp .l-header .back-btn:active { background:#e0e0e0; }
  #chatApp .l-header .title { font-size:28px; font-weight:800; letter-spacing:0.5px; flex:1; }
  #chatApp .l-header .add-btn { color:#007aff; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:opacity 0.2s; }
  #chatApp .l-header .add-btn:active { opacity:0.6; }
  #chatApp .l-header .add-btn svg { width:28px; height:28px; stroke-width:2; }
  #chatApp .l-search { padding:10px 20px; }
  #chatApp .l-search-box { background:#f0f0f2; border-radius:10px; padding:8px 12px; display:flex; align-items:center; gap:8px; color:#888; }
  #chatApp .l-search-box svg { width:16px; height:16px; }
  #chatApp .l-search-box input { border:none; background:transparent; outline:none; font-size:15px; width:100%; color:#111; font-family:inherit; }
  #chatApp .l-scroll { flex:1; overflow-y:auto; padding-bottom:90px; }
  #chatApp .l-scroll::-webkit-scrollbar { display:none; }
  #chatApp .l-letter { background:#f9f9f9; padding:4px 20px; font-size:13px; font-weight:700; color:#555; position:sticky; top:0; z-index:2; }
  #chatApp .l-item { display:flex; align-items:center; padding:10px 20px; cursor:pointer; transition:background 0.2s; }
  #chatApp .l-item:active { background:#f0f0f0; }
  #chatApp .l-item .ava { width:44px; height:44px; border-radius:50%; background-size:cover; background-position:center; flex-shrink:0; }
  #chatApp .l-item .info { flex:1; margin-left:14px; border-bottom:1px solid #f0f0f0; padding:14px 0; }
  #chatApp .l-item:last-child .info { border-bottom:none; }
  #chatApp .l-item .name { font-size:16px; font-weight:600; color:#111; }
  #chatApp .l-item .sub { font-size:13px; color:#888; margin-top:2px; }

  #chatApp .contact-card-view { position:absolute; inset:0; display:none; flex-direction:column; background:#000; z-index:60; transform:translateX(100%); transition:transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
  #chatApp .contact-card-view.show { display:flex; transform:translateX(0); }
  #chatApp .cc-header { position:relative; z-index:10; padding:50px 20px 10px; display:flex; justify-content:space-between; align-items:center; }
  body.is-fullscreen #chatApp .cc-header { padding-top: 95px; }
  #chatApp .cc-header .back-btn { width:36px; height:36px; border-radius:50%; background:rgba(0,0,0,0.06); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s; color:#111; }
  #chatApp .cc-header .back-btn:active { background:rgba(0,0,0,0.15); }
  #chatApp .cc-header .more-btn { color:#111; font-size:20px; font-weight:bold; letter-spacing:2px; line-height:1; cursor:pointer; }
  #chatApp .cc-center { position:relative; z-index:10; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-top:-20px; }
  #chatApp .cc-avatar-wrap { width:120px; height:120px; border-radius:50%; border:4px solid #fff; box-shadow:0 15px 35px rgba(0,0,0,0.3); background-size:cover; background-position:center; }
  #chatApp .cc-name { margin-top:16px; font-size:26px; font-weight:700; letter-spacing:1px; color:#fff; text-shadow:0 2px 10px rgba(0,0,0,0.5); }
  #chatApp .cc-status { margin-top:6px; font-size:12px; color:rgba(255,255,255,0.7); display:flex; align-items:center; gap:6px; font-weight:500; }
  #chatApp .cc-status .dot { width:6px; height:6px; border-radius:50%; box-shadow:0 0 8px #4cd964; }
  #chatApp .cc-bottom { position:relative; z-index:10; padding:0 20px 90px; display:flex; flex-direction:column; gap:14px; }
  #chatApp .cc-tags { display:flex; gap:10px; justify-content:center; }
  #chatApp .cc-tag { background:rgba(255,255,255,0.1); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:10px 0; color:#fff; font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; transition:0.2s; }
  #chatApp .cc-tag:active { transform:scale(0.95); background:rgba(255,255,255,0.2); }
  #chatApp .cc-tag svg { width:20px; height:20px; stroke-width:1.5; }
  #chatApp .cc-list { background:rgba(255,255,255,0.06); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:4px; }
  #chatApp .cc-item { padding:14px 16px; display:flex; align-items:center; gap:14px; border-bottom:1px solid rgba(255,255,255,0.06); cursor:pointer; color:#fff; }
  #chatApp .cc-item:last-child { border-bottom:none; }
  #chatApp .cc-item:active { background:rgba(255,255,255,0.12); }
  #chatApp .cc-item .icon { width:26px; height:26px; background:rgba(255,255,255,0.1); border-radius:4px; display:flex; align-items:center; justify-content:center; }
  #chatApp .cc-item .icon svg { width:14px; height:14px; }
  #chatApp .cc-item .text { flex:1; font-size:14px; font-weight:500; letter-spacing:0.5px; }
  #chatApp .cc-item .arr { opacity:0.4; }
  #chatApp .chat-capsule { background:#111; color:#fff; border-radius:50px; padding:14px 20px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:16px; font-weight:600; letter-spacing:0.5px; border:1px solid rgba(255,255,255,0.15); box-shadow:0 8px 24px rgba(0,0,0,0.4); cursor:pointer; margin-top:10px; transition:transform 0.2s; }
  #chatApp .chat-capsule:active { transform:scale(0.96); }
  #chatApp .chat-capsule svg { width:20px; height:20px; stroke-width:2; }

  #chatApp .mask-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); z-index:100; display:none; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s ease; }
  #chatApp .mask-overlay.show { display:flex; opacity:1; }
  #chatApp .mask-modal { width:85%; max-height:80vh; background:#fff; border-radius:24px; padding:24px 20px; transform:scale(0.9); transition:transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); display:flex; flex-direction:column; box-shadow:0 20px 50px rgba(0,0,0,0.3); }
  #chatApp .mask-overlay.show .mask-modal { transform:scale(1); }
  #chatApp .ms-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
  #chatApp .ms-header .ms-title { font-size:18px; font-weight:800; color:#111; display:flex; align-items:center; gap:8px; }
  #chatApp .ms-header .ms-close { width:30px; height:30px; background:#f0f0f0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#555; cursor:pointer; }
  #chatApp .ms-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
  #chatApp .ms-list::-webkit-scrollbar { display:none; }
  #chatApp .ms-item { padding:16px; border:1.5px solid #eee; border-radius:12px; display:flex; align-items:center; gap:14px; cursor:pointer; transition:all 0.2s; }
  #chatApp .ms-item.active { border-color:#111; background:#fafafa; }
  #chatApp .ms-item:active { transform:scale(0.98); }
  #chatApp .ms-icon { width:42px; height:42px; background:rgba(0,0,0,0.04); border-radius:12px; display:flex; align-items:center; justify-content:center; color:#555; transition:all 0.2s; }
  #chatApp .ms-item.active .ms-icon { background:#111; color:#fff; box-shadow:0 4px 10px rgba(0,0,0,0.2); }
  #chatApp .ms-icon svg { width:20px; height:20px; stroke-width:1.8; }
  #chatApp .ms-info { flex:1; }
  #chatApp .ms-name { font-size:15px; font-weight:700; color:#111; margin-bottom:4px; }
  #chatApp .ms-desc { font-size:12px; color:#888; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
  #chatApp .ms-check { width:20px; height:20px; border-radius:50%; border:1.5px solid #ccc; display:flex; align-items:center; justify-content:center; }
  #chatApp .ms-item.active .ms-check { background:#111; border-color:#111; }
  #chatApp .ms-item.active .ms-check::after { content:''; width:5px; height:9px; border:solid #fff; border-width:0 2px 2px 0; transform:rotate(45deg); margin-top:-2px; }
  #chatApp .ms-add-btn { width:100%; padding:16px; border:1.5px dashed #ccc; border-radius:12px; background:transparent; font-size:14px; font-weight:600; color:#555; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }
  #chatApp .ms-add-btn:active { background:#f9f9f9; }
  #chatApp .ms-form { display:none; flex-direction:column; gap:12px; animation:fadeIn 0.3s; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  #chatApp .ms-form input { width:100%; padding:14px 16px; border:1.5px solid #eee; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; font-family:inherit; }
  #chatApp .ms-form input:focus { border-color:#111; }
  #chatApp .ms-form textarea { width:100%; padding:14px 16px; border:1.5px solid #eee; border-radius:10px; font-size:13px; outline:none; height:120px; resize:none; box-sizing:border-box; font-family:inherit; line-height:1.6; }
  #chatApp .ms-form textarea:focus { border-color:#111; }
  #chatApp .ms-actions { display:flex; gap:10px; margin-top:10px; }
  #chatApp .ms-actions button { flex:1; padding:14px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; border:none; font-family:inherit; }
  #chatApp .ms-btn-cancel { background:#f0f0f0; color:#555; }
  #chatApp .ms-btn-save { background:#111; color:#fff; }

  /* ================= 夜间模式 ================= */
  #chatApp.dark-mode { filter: invert(0.92) hue-rotate(180deg) saturate(1.3) brightness(1.05); }
  #chatApp.dark-mode img, #chatApp.dark-mode .ava, #chatApp.dark-mode .head-ava, #chatApp.dark-mode .me-ava, #chatApp.dark-mode .pr-ava, #chatApp.dark-mode .mc-avatar-wrap, #chatApp.dark-mode .cc-avatar-wrap, #chatApp.dark-mode .dark-bg, #chatApp.dark-mode .chat-wallpaper { filter: invert(1) hue-rotate(180deg) contrast(1.1) brightness(0.9) saturate(0.8); }
  `;

  const HTML = `
  <svg width="0" height="0" style="position:absolute"><defs>
    <pattern id="chatDots" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="2.4" fill="currentColor"/></pattern>
    <clipPath id="chatStarClip" clipPathUnits="userSpaceOnUse"><path d="M50 4 L61.8 37.6 L97 38 L68.6 59.2 L79.4 93 L50 72 L20.6 93 L31.4 59.2 L3 38 L38.2 37.6 Z"/></clipPath>
  </defs></svg>

  <div id="caViewList" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
    <div class="nav">
      <span id="caQuit" style="display:flex; cursor:pointer; margin-right:2px;"><svg class="ic-svg" width="22" height="22" viewBox="0 0 24 24"><path class="ln" d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-6A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h6A1.5 1.5 0 0 0 14 18.5V17"/><path class="ln" d="M10 12h9M16 9l3 3-3 3"/></svg></span>
      <div class="brand">
        <div class="me-ava" style="background-image:url('${DA}')"></div>
        <span class="title">消息<small>Messages</small></span>
      </div>
      <span class="right">
        <span><svg class="ic-svg" width="20" height="20" viewBox="0 0 24 24"><path class="ln" d="M6 10a6 6 0 0 1 12 0c0 4 1.2 5 1.8 5.6H4.2C4.8 15 6 14 6 10z"/><path class="ln" d="M10 18.5a2 2 0 0 0 4 0"/></svg></span>
        <span id="caAdd"><svg class="ic-svg" width="20" height="20" viewBox="0 0 24 24"><path class="ln" d="M12 5.5v13M5.5 12h13"/></svg></span>
      </span>
    </div>
    <div class="search"><div class="box"><svg class="ic-svg" width="14" height="14" viewBox="0 0 24 24"><circle class="ln" cx="10.5" cy="10.5" r="6"/><path class="ln" d="M15 15l4 4"/></svg>搜索<small>Search</small></div></div>
    <div class="grp-tabs" id="caGrpTabs"></div>
    <div class="list" id="caListBody"></div>
  </div>

  <div class="chat" id="caViewChat">
    <div class="chat-wallpaper" id="caWallpaper"></div>
    <div class="sum-pill" id="caSumPill"><span class="sp-tap"><span class="sp-spin"><svg viewBox="0 0 24 24"><path class="ln" style="stroke:#002fa7" d="M12 4a8 8 0 1 1-8 8"/></svg></span><span class="sp-t">记忆整理中…</span></span></div>
    <input type="file" id="caWallpaperFile" accept="image/*" hidden>
    <div class="nav sub">
      <span class="back" id="caBack"><svg class="ic-svg" width="23" height="23" viewBox="0 0 24 24"><path class="ln" d="M15 5l-7 7 7 7"/></svg></span>
      <div class="head-ava" id="caHeadAva" style="background-image:url('${DA}')"></div>
      <span class="ctitle" id="caTitle">猫猫<br><span class="csub" id="caSub">活跃中</span></span>
      <span class="right"><span id="caChatSet"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M5 8h14M5 12h14M5 16h14"/></svg></span></span>
    </div>
    <div class="msgs" id="caMsgs"></div>
    <div class="select-bar" id="caSelectBar">
      <div class="sb-cancel" id="caSelectCancel">取消</div>
      <div class="sb-del" id="caSelectDel">删除 (1)</div>
    </div>
    <div class="input-bar" id="caInputBar">
      <div class="ib-stars">
        <svg class="s" style="width:21px;height:21px;top:6px;left:5%;transform:rotate(12deg);" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
        <svg class="s" style="width:12px;height:12px;top:30px;left:22%;transform:rotate(-24deg);" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
        <svg class="s" style="width:16px;height:16px;top:2px;left:42%;transform:rotate(28deg);" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
        <svg class="s" style="width:10px;height:10px;top:34px;left:60%;transform:rotate(-14deg);" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
        <svg class="s" style="width:18px;height:18px;top:8px;left:80%;transform:rotate(18deg);" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
        <svg class="s" style="width:13px;height:13px;top:32px;left:92%;transform:rotate(-30deg);" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
      </div>
      <span class="ic"><svg class="ic-svg" width="22" height="22" viewBox="0 0 24 24"><path class="ln" d="M12 6v12M6 12h12"/></svg></span>
      <div class="wrap">
        <div class="field" id="caField" contenteditable="true" data-ph="Type a message…"></div>
        <span class="emoji"><svg class="ic-svg" width="20" height="20" viewBox="0 0 24 24"><circle class="ln" cx="12" cy="12" r="8"/><path class="ln" d="M8.5 14.5c.8 1.2 2 1.9 3.5 1.9s2.7-.7 3.5-1.9"/><circle class="fl" cx="9" cy="10" r="1"/><circle class="fl" cx="15" cy="10" r="1"/></svg></span>
      </div>
      <span class="ic" id="caGen" title="生成回复"><svg class="ic-svg" width="22" height="22" viewBox="0 0 24 24"><rect class="ln" x="9" y="3.5" width="6" height="11" rx="3"/><path class="ln" d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V20"/></svg></span>
      <button class="send" id="caSend">
        <svg class="star" viewBox="0 0 100 100"><path class="fl" d="M50 10 C53 10 55 12 56.5 17 L62.5 33 C63.5 36 65 37.5 68 37.5 L84 38.5 C90 39 92 45 87.5 48.5 L75 59 C72.5 61 71.5 63.5 72.5 66.5 L77 82 C79 88 73.5 91.5 68.5 88 L54 78.5 C51.5 77 48.5 77 46 78.5 L31.5 88 C26.5 91.5 21 88 23 82 L27.5 66.5 C28.5 63.5 27.5 61 25 59 L12.5 48.5 C8 45 10 39 16 38.5 L32 37.5 C35 37.5 36.5 36 37.5 33 L43.5 17 C45 12 47 10 50 10 Z"/></svg>
        <span class="arrow"><svg viewBox="0 0 24 24"><path class="ln" style="stroke:#fff" d="M5 12h13M12 6l6 6-6 6"/></svg></span>
      </button>
      <div class="ib-foot">
        <span class="fi"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><rect class="ln" x="3.5" y="5" width="17" height="14" rx="4"/><circle class="fl" cx="8.5" cy="9.5" r="1.3"/><path class="ln" d="M4 16l4.2-4 3 2.8 3.5-3.3L20 15"/></svg></span>
        <span class="fi"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.3c.5 0 1-.3 1.2-.8l.5-1A1.4 1.4 0 0 1 10.7 4.5h2.6c.5 0 1 .3 1.2.7l.5 1c.2.5.7.8 1.2.8h1.3A1.5 1.5 0 0 1 19 8.5v8A1.5 1.5 0 0 1 17.5 18h-11A1.5 1.5 0 0 1 5 16.5z"/><circle class="ln" cx="12" cy="12" r="3"/></svg></span>
        <span class="fi"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path class="ln" d="M13 3.5V8h4.5"/><path class="ln" d="M8.5 12.5h7M8.5 15.5h5"/></svg></span>
        <span class="fi"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><circle class="ln" cx="12" cy="13" r="6.5"/><path class="ln" d="M12 10v3l2.2 1.3"/><circle class="fl" cx="6" cy="6.5" r="1.6"/><circle class="fl" cx="18" cy="6.5" r="1.6"/></svg></span>
        <span class="fi toggle" id="caFootHide" title="收起"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M6 14l6-5 6 5"/></svg></span>
      </div>
      <span class="foot-handle" id="caFootShow" title="展开"><svg class="ic-svg" width="20" height="20" viewBox="0 0 24 24"><circle class="fl" cx="6" cy="12" r="1.5"/><circle class="fl" cx="12" cy="12" r="1.5"/><circle class="fl" cx="18" cy="12" r="1.5"/></svg></span>
    </div>
  </div>

  <!-- 聊天设置面板（分页手账风） -->
  <div class="setpanel" id="caSetPanel">
    <div class="sp-head">
      <span class="back" id="caSetBack"><svg class="ic-svg" width="23" height="23" viewBox="0 0 24 24"><path class="ln" d="M15 5l-7 7 7 7"/></svg></span>
      <span class="t">聊天设置<small>Chat Settings</small></span>
    </div>
    <div class="sp-tabs">
      <div class="sp-tb on" data-p="0"><span class="pin"></span>资料<small>Profile</small></div>
      <div class="sp-tb" data-p="1"><span class="pin"></span>设置<small>Settings</small></div>
    </div>
    <div class="sp-body">
      <div class="sp-sheet">
        <!-- 页1：资料 -->
        <div class="sp-page on" id="caSP0">
          <div class="sp-profile">
            <span class="tape"></span>
            <svg class="sp-deco-star" style="width:20px;height:20px;top:16px;right:16px;transform:rotate(-12deg);" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
            <div class="pr-head">
              <div class="pr-ava-wrap">
                <span class="dash"></span>
                <div class="pr-ava" id="caSPAva" style="background-image:url('${DA}')"></div>
                <svg class="corner" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)" style="color:#c8c8c8"/></svg>
              </div>
              <div class="pr-meta">
                <div class="pr-nm" id="caSPName" contenteditable="true">猫猫</div>
                <div class="pr-en" id="caSPEn">Cat · Online</div>
                <div class="pr-tags" id="caSPTags"><b>Friends</b><b>活跃中</b></div>
              </div>
            </div>
            <div class="pr-quote" id="caSPQuote" contenteditable="true">今天也要开心鸭，记得好好休息</div>
          </div>

          <div class="sp-sec"><span class="dot"></span><span class="tx">资料</span><span class="en">profile</span><span class="lf"></span></div>
          <div class="sp-grp">
            <div class="sp-row"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><circle class="ln" cx="12" cy="9" r="3.2"/><path class="ln" d="M5.5 19c.7-3.4 3.3-5.2 6.5-5.2s5.8 1.8 6.5 5.2"/></svg></span><span class="sl"><div class="n">人设详情</div><div class="d">查看 / 编辑 ta 的设定</div></span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
            <div class="sp-row"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><rect class="ln" x="4.5" y="4.5" width="15" height="15" rx="4.5"/><path class="ln" d="M9 9h6M9 12.5h6M9 16h3.5"/></svg></span><span class="sl"><div class="n">备注与名字</div><div class="d">修改备注、真实名字</div></span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
            <div class="sp-row"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><rect class="ln" x="3.5" y="5" width="17" height="14" rx="4"/><path class="ln" d="M8 5V3.5M16 5V3.5M3.5 9.5h17"/></svg></span><span class="sl"><div class="n">分组</div></span><span class="val" id="caSPGroupVal">Friends</span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
          </div>
        </div>

        <!-- 页2：设置 -->
        <div class="sp-page" id="caSP1">
          <div class="sp-sec" style="padding-top:18px;"><span class="dot"></span><span class="tx">外观</span><span class="en">appearance</span><span class="lf"></span></div>
          <div class="sp-grp">
            <div class="sp-row" id="caRowWallpaper"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><rect class="ln" x="3.5" y="5" width="17" height="14" rx="4"/><circle class="fl" cx="8.5" cy="9.5" r="1.3"/><path class="ln" d="M4 16l4.2-4 3 2.8 3.5-3.3L20 15"/></svg></span><span class="sl"><div class="n">聊天壁纸</div><div class="d">更换对话背景</div></span><span class="val" id="caWpResetBtn" style="display:none; width:22px; height:22px; border-radius:50%; background:#1a1a1a; border:none; display:flex; align-items:center; justify-content:center; box-shadow:none; margin-right:8px;"><svg viewBox="0 0 24 24" style="width:12px; height:12px; color:#fff;"><path class="ln" d="M18 6L6 18M6 6l12 12"/></svg></span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
            <div class="sp-row"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3H5A1.5 1.5 0 0 1 3.5 14V8A1.5 1.5 0 0 1 5 6.5z"/></svg></span><span class="sl"><div class="n">气泡样式</div><div class="d">切换气泡形状与颜色</div></span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
            <div class="sp-row"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M6 7h12M6 12h9M6 17h6"/></svg></span><span class="sl"><div class="n">字体大小</div></span><span class="val">中</span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
          </div>

          <div class="sp-sec"><span class="dot"></span><span class="tx">消息</span><span class="en">messages</span><span class="lf"></span></div>
          <div class="sp-grp">
            <div class="sp-row" id="caRowTime"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><circle class="ln" cx="12" cy="12" r="7.5"/><path class="ln" d="M12 8v4l3 2"/></svg></span><span class="sl"><div class="n">感知时间</div><div class="d">让 AI 知道当前时间</div></span><span class="tg-switch" id="caRowTimeSwitch"><span class="tg-knob"></span></span></div>
            <div class="sp-row" id="caRowBilingual"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="m5 8 6 6"/><path class="ln" d="m4 14 6-6 2-3"/><path class="ln" d="M2 5h12"/><path class="ln" d="M7 2h1"/><path class="ln" d="m22 22-5-10-5 10"/><path class="ln" d="M14 18h6"/></svg></span><span class="sl"><div class="n">双语翻译</div><div class="d">回复时同时输出原文和中文</div></span><span class="tg-switch" id="caRowBilingualSwitch"><span class="tg-knob"></span></span></div>
            <div class="sp-row"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M12 4.5l2.2 4.5 5 .7-3.6 3.5.85 5L12 15.9 7.55 18.2l.85-5L4.8 9.7l5-.7z"/></svg></span><span class="sl"><div class="n">星标消息</div><div class="d">收藏的重要内容</div></span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
            <div class="sp-row"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M6 10a6 6 0 0 1 12 0c0 4 1.2 5 1.8 5.6H4.2C4.8 15 6 14 6 10z"/><path class="ln" d="M10 18.5a2 2 0 0 0 4 0"/></svg></span><span class="sl"><div class="n">消息通知</div><div class="d">提醒与免打扰</div></span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
          </div>

          <div class="sp-sec"><span class="dot"></span><span class="tx">其他</span><span class="en">more</span><span class="lf"></span></div>
          <div class="sp-grp">
            <div class="sp-row"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M12 4.5l2 1.2 2.3-.2 1.2 2 2 1.2-.2 2.3 1.2 2-1.2 2 .2 2.3-2 1.2-1.2 2-2.3-.2-2 1.2-2-1.2-2.3.2-1.2-2-2-1.2.2-2.3-1.2-2 1.2-2-.2-2.3 2-1.2 1.2-2 2.3.2z"/><circle class="ln" cx="12" cy="12" r="2.6"/></svg></span><span class="sl"><div class="n">高级设置</div><div class="d">模型、上下文、温度</div></span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
            <div class="sp-row danger"><span class="si"><svg class="ic-svg" width="21" height="21" viewBox="0 0 24 24"><path class="ln" d="M6 7.5h12M9.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 6v1.5M7.5 7.5l.7 11a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-11"/></svg></span><span class="sl"><div class="n">删除联系人</div><div class="d">移除该会话</div></span><span class="arr"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 人设详情面板 -->
  <div class="persona-panel" id="caPersonaPanel">
    <div class="pp-head">
      <span class="back" id="caPersonaBack"><svg class="ic-svg" width="23" height="23" viewBox="0 0 24 24"><path class="ln" d="M15 5l-7 7 7 7"/></svg></span>
      <span class="t">人设详情<small>Persona</small></span>
      <span class="pp-edit" id="caPersonaEdit">✎ 编辑</span>
    </div>
    <div class="pp-body" id="caPersonaBody"></div>
    <div class="pp-editbar" id="caPersonaEditBar" style="display:none;">
      <textarea class="pp-textarea" id="caPersonaEditor" placeholder="在这里写 ta 的人设…"></textarea>
      <div class="pp-editacts"><button id="caPersonaCancel">取消</button><button id="caPersonaSave">保存</button></div>
    </div>
  </div>

  <!-- AI / 提示词面板 -->
  <div class="ai-panel" id="caAIPanel">
    <div class="ap-head">
      <span class="back" id="caAIBack"><svg class="ic-svg" width="23" height="23" viewBox="0 0 24 24"><path class="ln" d="M15 5l-7 7 7 7"/></svg></span>
      <span class="t">高级设置<small>AI & Prompt</small></span>
    </div>
    <div class="ap-body">
      <div class="ap-sec"><span class="dot"></span><span class="tx">接口状态</span></div>
      <div class="ap-status" id="caAIStatus"></div>
      <div class="ap-sec"><span class="dot"></span><span class="tx">上下文轮数</span></div>
      <div class="ap-ctx">
        <span class="ctx-minus" id="caCtxMinus">−</span>
        <span class="ctx-val" id="caCtxVal">10</span>
        <span class="ctx-plus" id="caCtxPlus">＋</span>
        <span class="ctx-tip">携带最近多少轮对话给 AI（一问一答算一轮）</span>
      </div>
      <div class="ap-sec"><span class="dot"></span><span class="tx">提示词</span><span class="add" id="caPromptAdd">＋ 添加</span></div>
      <div id="caPromptList"></div>
    </div>
  </div>

  <!-- 提示词内置弹窗 -->
  <div class="prompt-modal" id="caPromptModal">
    <div class="pm-card">
      <div class="pm-title">新建提示词</div>
      <input class="pm-name" id="caPMName" placeholder="名字">
      <textarea class="pm-content" id="caPMContent" placeholder="粘贴提示词内容…"></textarea>
      <div class="pm-acts"><button id="caPMCancel">取消</button><button id="caPMSave">保存</button></div>
    </div>
  </div>

  <!-- 备注/名字编辑弹窗 -->
  <div class="prompt-modal" id="caEditModal">
    <div class="pm-card">
      <div class="pm-title">备注与名字</div>
      <input class="pm-name" id="caEditNote" placeholder="备注（列表和聊天显示）" style="margin-bottom:10px;">
      <input class="pm-name" id="caEditReal" placeholder="真实名字（不显示在列表）" style="margin-bottom:0;">
      <div class="pm-acts"><button id="caEditCancel">取消</button><button id="caEditSave">保存</button></div>
    </div>
  </div>

  <!-- 分组选择弹窗 -->
  <div class="prompt-modal" id="caGroupModal">
    <div class="pm-card">
      <div class="pm-title">移动到分组</div>
      <div class="chips" id="caGroupChips" style="margin-bottom:4px;"></div>
      <div class="pm-acts"><button id="caGroupCancel">取消</button><button id="caGroupSave">保存</button></div>
    </div>
  </div>

  <!-- 删除确认弹窗 -->
  <div class="prompt-modal" id="caDelModal">
    <div class="pm-card">
      <div class="pm-title">删除联系人</div>
      <div style="font-size:12.5px;color:#555;line-height:1.6;margin-bottom:4px;">删除后该联系人的聊天记录、人设都会一并移除，无法恢复。</div>
      <div class="pm-acts"><button id="caDelCancel">取消</button><button id="caDelOk" style="background:#c0564e;border-color:#c0564e;">删除</button></div>
    </div>
  </div>

  <!-- 新建联系人弹窗（装饰抽屉式） -->
  <div class="modal-mask" id="caModal">
    <div class="m-shell">
      <span class="bigring"></span>
      <div class="sticky"><span class="tape"></span><div class="note"><svg viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg></div></div>
      <svg class="ministar s1" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
      <svg class="ministar s2" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>
      <span class="vdash"></span>

      <div class="m5">
        <div class="top">
          <div class="hd" id="caMTitle">新建联系人</div>
          <div class="hd2" id="caMStep">STEP 1 / 2</div>
          <label class="ava" id="caMAva" style="background-image:url('${DA}')"><input type="file" id="caMAvaFile" accept="image/*" hidden></label>
        </div>
        <div class="bd">
          <div id="caStep1">
            <div class="fld"><label>真实名字 · Real Name</label><div class="line"><input id="caReal" placeholder="ta 的真名（不显示在列表）"><span class="dot"></span></div></div>
            <div class="fld"><label>备注 · Note（列表和聊天显示）</label><div class="line"><input id="caNote" placeholder="你想怎么叫 ta"><span class="dot hollow"></span></div></div>
            <div class="fld"><label>分组 · Group</label><div class="chips" id="caMGroups"></div></div>
            <div class="foot"><button class="g" data-m="cancel">取消</button><button class="s" data-m="next">下一步</button></div>
          </div>
          <div id="caStep2" style="display:none;">
            <label class="m-import" id="caImport"><div class="big">⤓</div><div class="l">导入人设</div><div class="s">DOCX · TXT · JSON</div><input type="file" id="caPersonaFile" accept=".docx,.txt,.json,application/json,text/plain" hidden></label>
            <div class="m-imported-name" id="caImportedName"></div>
            <textarea class="m-persona" id="caPersona" placeholder="也可以直接在这里写 ta 的人设…"></textarea>
            <div class="foot"><button class="g" data-m="back">上一步</button><button class="s" data-m="confirm">确认</button></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= 新增：我的名片视图 ================= -->
  <div class="my-card-view" id="caMyCardView">
    <div class="dark-bg" style="background-image: url('${DA}');"></div>
    <div class="gradient-top"></div>
    <div class="gradient-bottom"></div>
    <div class="mc-header"><div class="title">My Profile</div></div>
    <div class="mc-stage">
      <div class="float-btn fb-chat" id="caBtnToNewList">
        <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <span>Chat</span>
      </div>
      <div class="float-btn fb-call">
        <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.4 12.4 0 0 0 .6 2.6 2 2 0 0 1-.4 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4 12.4 12.4 0 0 0 2.6.6 2 2 0 0 1 1.7 2z"/></svg></div>
        <span>Call</span>
      </div>
      <div class="float-btn fb-info">
        <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>
        <span>Info</span>
      </div>
      <div class="float-btn fb-set" id="caBtnToSettings">
        <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
        <span>Setting</span>
      </div>
      <div class="mc-avatar-wrap" id="caMyAvatarBtn">
        <div class="star-badge"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
      </div>
      <div class="mc-name">User</div>
      <div class="mc-status">Tap avatar to change mask</div>
    </div>
  </div>

  <!-- ================= 新增：全屏白底联系人列表 ================= -->
  <div class="new-list-view" id="caNewListView">
    <div class="l-header">
      <div class="back-btn" id="caNewListBack"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg></div>
      <div class="title">Contacts</div>
      <div class="add-btn" id="caNewListAdd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>
    </div>
    <div class="l-search">
      <div class="l-search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search"></div>
    </div>
    <div class="l-scroll" id="caNewListScroll"></div>
  </div>

  <!-- ================= 新增：联系人名片页 ================= -->
  <div class="contact-card-view" id="caContactCardView">
    <div class="dark-bg" id="ccCardBg"></div>
    <div class="gradient-top"></div>
    <div class="gradient-bottom"></div>
    <div class="cc-header">
      <div class="back-btn" id="ccCardBack"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
      <div class="more-btn">...</div>
    </div>
    <div class="cc-center">
      <div class="cc-avatar-wrap" id="ccCardAvatar"></div>
      <div class="cc-name" id="ccCardName">Name</div>
      <div class="cc-status"><span class="dot" id="ccCardDot"></span> <span id="ccCardStatus">Status</span></div>
    </div>
    <div class="cc-bottom">
      <div class="cc-tags">
        <div class="cc-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Chat</span></div>
        <div class="cc-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.4 12.4 0 0 0 .6 2.6 2 2 0 0 1-.4 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4 12.4 12.4 0 0 0 2.6.6 2 2 0 0 1 1.7 2z"/></svg><span>Call</span></div>
        <div class="cc-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Info</span></div>
      </div>
      <div class="cc-list">
        <div class="cc-item" id="ccBtnPersona"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div><div class="text">Contact Persona</div><div class="arr"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div></div>
        <div class="cc-item"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div class="text">Media Gallery</div><div class="arr"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div></div>
      </div>
      <div class="chat-capsule" id="ccBtnChat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>Message</div>
    </div>
  </div>

  <!-- ================= 全局底部 Tabbar ================= -->
  <div class="tabbar" id="caTabbar">
    <div class="tab on"><span class="ti"><svg class="ic-svg" width="22" height="22" viewBox="0 0 24 24"><path class="ln" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path class="ln" d="M9 12h.01M12 12h.01M15 12h.01"/></svg></span>Chats</div>
    <div class="tab"><span class="ti"><svg class="ic-svg" width="22" height="22" viewBox="0 0 24 24"><path class="ln" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle class="ln" cx="9" cy="7" r="4"/><path class="ln" d="M23 21v-2a4 4 0 0 0-3-3.87"/><path class="ln" d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>Contacts</div>
    <div class="tab"><span class="ti"><svg class="ic-svg" width="22" height="22" viewBox="0 0 24 24"><path class="ln" d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line class="ln" x1="16" y1="8" x2="2" y2="22"/><line class="ln" x1="17.5" y1="15" x2="9" y2="15"/></svg></span>Moments</div>
  </div>

  <!-- ================= 新增：面具系统 Modal ================= -->
  <div class="mask-overlay" id="caMaskOverlay">
    <div class="mask-modal">
      <div class="ms-header"><div class="ms-title"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>我的面具</div><div class="ms-close" id="caMaskClose">✕</div></div>
      <div id="caMaskListView">
        <div class="ms-list" id="caMaskList"></div>
        <button class="ms-add-btn" id="caMaskAddBtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>新建面具</button>
      </div>
      <div class="ms-form" id="caMaskFormView">
        <input type="text" placeholder="面具名称 (如: 傲娇学妹)" id="caNewMaskName">
        <textarea placeholder="输入 User 人设提示词，将注入到聊天上下文中..." id="caNewMaskPrompt"></textarea>
        <div class="ms-actions"><button class="ms-btn-cancel" id="caMaskCancelBtn">取消</button><button class="ms-btn-save" id="caMaskSaveBtn">保存</button></div>
      </div>
    </div>
  </div>
  `;

  function init() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const app = document.createElement('div');
    app.id = 'chatApp';
    app.innerHTML = HTML;
    document.body.appendChild(app);

    const $ = sel => app.querySelector(sel);

    /* 动态加载 mammoth（docx 解析用） */
    if (!window.mammoth) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      document.head.appendChild(s);
    }

    const groups = [
      { name:'Recent', members:[] },
      { name:'Friends', members:[] },
      { name:'Family', members:[] },
      { name:'Work', members:[] },
    ];
    const saveGroups = () => cdbSet('groups', JSON.parse(JSON.stringify(groups)));
    async function loadStore(){
      const sg = await cdbGet('groups');
      if (Array.isArray(sg) && sg.length){ groups.length=0; sg.forEach(g=>groups.push(g)); }
      _prompts = (await cdbGet('prompts')) || [];
      _sel = (await cdbGet('promptSel')) || 'locked';
      const cr = await cdbGet('ctxRounds'); _ctxRounds = (typeof cr==='number') ? cr : 10;
      _timeAware = (await cdbGet('timeAware')) === true;
      _bilingual = (await cdbGet('bilingual')) === true;
    }

    const dispName = c => c.note || c.nm;
    const rand = (a,b) => a + Math.random()*(b-a);
    function starDecor() {
      const n = 1 + Math.floor(Math.random()*3);
      let h = '';
      for (let i=0;i<n;i++){
        const size=rand(16,40), rot=rand(0,360), top=rand(2,60), right=rand(2,42);
        h += `<svg class="star" style="width:${size}px;height:${size}px;top:${top}%;right:${right}%;transform:rotate(${rot}deg);" viewBox="0 0 100 100"><rect width="100" height="100" fill="url(#chatDots)" clip-path="url(#chatStarClip)"/></svg>`;
      }
      return `<div class="stardecor">${h}</div>`;
    }
    const cellHTML = c => `<div class="cell${c.pinned?' pinned':''}" data-id="${c.id}">
      ${starDecor()}
      ${c.pinned?`<span class="pin-clip"><svg class="clip" viewBox="0 0 24 36"><path class="ln" d="M8 31V13a4 4 0 0 1 8 0v15a2.4 2.4 0 0 1-4.8 0V15"/></svg><svg class="pstar" viewBox="0 0 100 100"><path d="M50 4 L61.8 37.6 L97 38 L68.6 59.2 L79.4 93 L50 72 L20.6 93 L31.4 59.2 L3 38 L38.2 37.6 Z"/></svg></span>`:''}
      <div class="ava-wrap"><div class="ava" style="background-image:url('${c.avaImg||DA}')"></div><span class="online ${c.on?'':'off'}"></span></div>
      <div class="mid"><div class="nm">${dispName(c)}</div><div class="ms">${c.ms||''}</div></div>
      <div class="meta"><span class="tm">${c.tm||''}</span><span class="badge ${c.n?'':'hide'}">${c.n||''}</span></div>
    </div>`;

    const grpTabs = $('#caGrpTabs'), listBody = $('#caListBody');
    let curGrp = 0;
    function renderTabs() {
      grpTabs.innerHTML = groups.map((g,i)=>`<div class="grp-tab ${i===curGrp?'on':''}" data-g="${i}">${g.name}</div>`).join('');
      grpTabs.querySelectorAll('.grp-tab').forEach(t=>t.addEventListener('click',()=>{ curGrp=+t.dataset.g; renderTabs(); renderList(); }));
    }
    /* ===== 联系人长按菜单（置顶 / 删除聊天） ===== */
    let _cellMenuEl = null;
    function closeCellMenu(){
      if(!_cellMenuEl) return;
      const el=_cellMenuEl; _cellMenuEl=null;
      el.classList.remove('show');
      setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 200);
    }
    function showCellMenu(c, anchorRect){
      closeCellMenu();
      const pinned = !!c.pinned;
      const overlay=document.createElement('div');
      overlay.className='cell-lp-overlay';
      overlay.innerHTML = `<div class="cell-lp-menu">
        <div class="it" data-act="pin"><svg class="ic-svg" viewBox="0 0 24 24"><path class="ln" d="M12 4.5l2.2 4.5 5 .7-3.6 3.5.85 5L12 15.9 7.55 18.2l.85-5L4.8 9.7l5-.7z"/></svg><span>${pinned?'取消置顶':'置顶'}</span></div>
        <div class="it danger" data-act="clear"><svg class="ic-svg" viewBox="0 0 24 24"><path class="ln" d="M6 7.5h12M9.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 6v1.5M7.5 7.5l.7 11a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-11"/></svg><span>删除聊天</span></div>
      </div>`;
      app.appendChild(overlay); _cellMenuEl=overlay;
      const menuEl=overlay.querySelector('.cell-lp-menu');
      const mw=menuEl.offsetWidth||152, mh=menuEl.offsetHeight||96;
      let top=anchorRect.bottom+6, left=anchorRect.left+20;
      if(top+mh>window.innerHeight-20) top=anchorRect.top-mh-6;
      if(top<10) top=10;
      if(left+mw>window.innerWidth-12) left=window.innerWidth-mw-12;
      if(left<12) left=12;
      menuEl.style.top=top+'px'; menuEl.style.left=left+'px';
      requestAnimationFrame(()=> overlay.classList.add('show'));
      overlay.addEventListener('click', e=>{
        const btn=e.target.closest('[data-act]');
        if(btn) handleCellAction(btn.dataset.act, c);
        closeCellMenu();
      });
    }
    function handleCellAction(act, c){
      if(act==='pin'){ c.pinned=!c.pinned; renderTabs(); renderList(); saveGroups(); }
      else if(act==='clear'){
        c.log=[]; c.ms=''; c.n=0;
        renderList(); saveGroups();
        if(current===c){ _lastId=null; _lastCount=0; renderMsgs(); }
      }
    }
    function renderList() {
      const g = groups[curGrp];
      const members = g.members.slice().sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0));
      listBody.innerHTML = members.length ? `<div class="pill-group">${members.map(cellHTML).join('')}</div>`
        : `<div style="text-align:center;color:var(--ink2);font-size:12px;padding:40px 0;">这个分组还没有人<br>点右上角 ＋ 添加</div>`;
      listBody.querySelectorAll('.cell').forEach(el=>{
        const c = groups.flatMap(g=>g.members).find(x=>x.id==el.dataset.id);
        let lpTimer=null, lpFired=false;
        el.addEventListener('click',()=>{ if(lpFired){ lpFired=false; return; } if(c) openChat(c); });
        el.addEventListener('touchstart', ()=>{ lpFired=false; lpTimer=setTimeout(()=>{ lpFired=true; buzz(10); if(c) showCellMenu(c, el.getBoundingClientRect()); }, 480); }, {passive:true});
        ['touchend','touchmove','touchcancel'].forEach(ev=> el.addEventListener(ev, ()=>clearTimeout(lpTimer), {passive:true}));
        el.addEventListener('contextmenu', e=>{ e.preventDefault(); if(c) showCellMenu(c, el.getBoundingClientRect()); });
      });
    }

    const viewList = $('#caViewList'), viewChat = $('#caViewChat'), msgs = $('#caMsgs'), chatTitle = $('#caTitle');
    let current = null;
    const wallpaperEl = $('#caWallpaper');
    function applyWallpaper(c){ wallpaperEl.style.backgroundImage = c && c.wallpaper ? `url('${c.wallpaper}')` : 'none'; }
    function openChat(c) {
      current = c;
      current._viewLimit = 30; // 每次点开联系人复位30条限制
      const headAva = $('#caHeadAva');
      if (headAva) headAva.style.backgroundImage = `url('${c.avaImg||DA}')`;
      chatTitle.innerHTML = `${dispName(c)}<br><span class="csub">${c.on?'活跃中 · Active':'离线 · Offline'}</span>`;
      applyWallpaper(c);
      renderMsgs();
      viewList.style.display='none'; viewChat.classList.add('show');
      const tb = $('#caTabbar'); if(tb) tb.style.display = 'none';
    }
    let _lastCount = 0, _lastId = null;
    let _selectMode = false;
    let _selectedMsgs = new Set();
    
    const selectBar = $('#caSelectBar');
    const selectDel = $('#caSelectDel');
    function renderSelectBar() {
      if (_selectMode) {
        selectBar.classList.add('show');
        viewChat.classList.add('select-mode');
        selectDel.textContent = `删除 (${_selectedMsgs.size})`;
        selectDel.style.opacity = _selectedMsgs.size > 0 ? '1' : '0.5';
      } else {
        selectBar.classList.remove('show');
        viewChat.classList.remove('select-mode');
      }
    }

    function renderMsgs(keepScroll) {
      if (!current) return;
      const log = current.log || [];
      if (!current._viewLimit) current._viewLimit = 30;

      const sc = msgs.scrollTop;
      const sh = msgs.scrollHeight;

      const limit = current._viewLimit;
      const startIndex = Math.max(0, log.length - limit);
      const displayLog = log.slice(startIndex);

      // 同一会话内才把多出来的消息当作"新消息"播动画；首次进入该会话全部当旧的，不播
      const prev = (current.id===_lastId) ? _lastCount : log.length;

      let html = '';
      if (startIndex > 0) {
        html += `<div class="msg-load-more" id="caLoadMore"><div class="line"></div><div class="txt">加载更多消息 · 剩余 ${startIndex} 条</div><div class="line"></div></div>`;
      }

      html += displayLog.map((m, relativeIdx) => {
        const i = startIndex + relativeIdx;
        const anim = i>=prev && !_selectMode ? ' msg-in' : '';
        const chk = _selectMode ? `<div class="msg-chk ${_selectedMsgs.has(i)?'on':''}"></div>` : '';
        if(m.t==='time') return `<div class="time-tip">${m.v}</div>`;
        
        let content = m.v;
        if ((content.includes('[RAW]') || content.includes('[EN]')) && content.includes('[ZH]')) {
          const rawMatch = content.match(/\[(?:RAW|EN)\]([\s\S]*?)\[ZH\]/);
          const zhMatch = content.match(/\[ZH\]([\s\S]*)$/);
          if (rawMatch && zhMatch) {
            const rawText = rawMatch[1].trim();
            const zhText = zhMatch[1].trim();
            content = `<div class="bilingual-split"><div class="en">${rawText}</div><div class="divider"></div><div class="zh">${zhText}</div></div>`;
          }
        }
        
        if(m.s==='me') return `<div class="row me${anim}" data-idx="${i}"><div class="ava" style="background-image:url('${DA}')"></div><div class="bubble">${content}</div>${chk}</div>`;
        return `<div class="row you${anim}" data-idx="${i}">${chk}<div class="ava" style="background-image:url('${current.avaImg||DA}')"></div><div class="bubble">${content}</div></div>`;
      }).join('');

      msgs.innerHTML = html;
      _lastCount = log.length; 
      _lastId = current.id;

      const btn = msgs.querySelector('#caLoadMore');
      if (btn) {
        btn.addEventListener('click', () => {
          current._viewLimit += 30;
          renderMsgs(true);
        });
      }

      // 精确保持滚动条位置
      if (keepScroll) {
        msgs.scrollTop = sc + (msgs.scrollHeight - sh);
      } else {
        msgs.scrollTop = msgs.scrollHeight;
      }
    }
    function exitChat(){ 
      viewChat.classList.remove('show'); 
      const tb = $('#caTabbar'); if(tb) tb.style.display = 'flex';
      let activeIdx = 0;
      const tabs = app.querySelectorAll('.tabbar .tab');
      if(tabs.length) {
        tabs.forEach((t, i) => { if(t.classList.contains('on')) activeIdx = i; });
      }
      if (activeIdx === 0) {
        viewList.style.display='flex';
      } else if (activeIdx === 1) {
        const mcv = $('#caMyCardView');
        if(mcv) { mcv.classList.add('show'); mcv.classList.remove('hide-scale'); }
      }
    }
    $('#caBack').addEventListener('click', exitChat);

    /* 聊天设置面板 */
    const setPanel = $('#caSetPanel');
    const wpResetBtn = $('#caWpResetBtn');
    function syncSetPanel() {
      if (!current) return;
      if (wpResetBtn) wpResetBtn.style.display = current.wallpaper ? 'flex' : 'none';
      const av = $('#caSPAva'); if (av) av.style.backgroundImage = `url('${current.avaImg||DA}')`;
      const nm = $('#caSPName'); if (nm) nm.textContent = dispName(current);
      const en = $('#caSPEn'); if (en) en.textContent = (current.on ? 'Online' : 'Offline');
      const gv = $('#caSPGroupVal'); const g = groups.find(g=>g.members.includes(current));
      if (gv && g) gv.textContent = g.name;
      const tags = $('#caSPTags'); if (tags && g) tags.innerHTML = `<b>${g.name}</b><b>${current.on?'活跃中':'离线'}</b>`;
    }
    $('#caChatSet').addEventListener('click', ()=> {
      syncSetPanel();
      const q = $('#caSPQuote'); if (q && current) q.textContent = current.quote || '今天也要开心鸭，记得好好休息';
      setPanel.classList.add('show');
    });
    $('#caSetBack').addEventListener('click', ()=> setPanel.classList.remove('show'));
    /* 分页切换 */
    setPanel.querySelectorAll('.sp-tb').forEach(tb=>{
      tb.addEventListener('click',()=>{
        const p = tb.dataset.p;
        setPanel.querySelectorAll('.sp-tb').forEach(x=>x.classList.toggle('on', x===tb));
        setPanel.querySelectorAll('.sp-page').forEach(pg=>pg.classList.toggle('on', pg.id==='caSP'+p));
      });
    });
    /* 编辑名字/签名时存回联系人 */
    $('#caSPName').addEventListener('blur', e=>{ if(current){ current.note = e.target.textContent.trim(); renderList(); saveGroups(); } });
    $('#caSPQuote').addEventListener('blur', e=>{ if(current){ current.quote = e.target.textContent.trim(); saveGroups(); } });

    /* 人设详情面板：把人设文本拆成可折叠的小节方便看 */
    const personaPanel = $('#caPersonaPanel'), personaBody = $('#caPersonaBody');
    function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function parsePersona(text){
      // 支持「标题：内容」「【标题】」「# 标题」「标题\n内容」等常见分节，否则整段显示
      const t = (text||'').trim();
      if (!t) return [];
      const lines = t.split(/\r?\n/);
      const secs = []; let cur = null;
      const headRe = /^(?:#{1,4}\s*|【)?\s*([^:：】\n]{1,18})\s*[】:：]\s*(.*)$/;
      lines.forEach(line=>{
        const m = line.match(headRe);
        if (m && m[1] && line.trim().length <= 40 && /[:：】]/.test(line)) {
          cur = { title:m[1].trim(), body:(m[2]||'').trim() };
          secs.push(cur);
        } else if (cur) {
          cur.body += (cur.body?'\n':'') + line;
        } else {
          cur = { title:'', body:line }; secs.push(cur);
        }
      });
      return secs;
    }
    function openPersona(){
      if (!current) return;
      const txt = current.persona || '';
      if (!txt.trim()) {
        personaBody.innerHTML = `<div class="pp-empty">还没有人设资料<br>在新建联系人时可以导入</div>`;
      } else {
        const secs = parsePersona(txt);
        const titled = secs.filter(s=>s.title);
        if (titled.length >= 2) {
          personaBody.innerHTML = secs.map((s,i)=> s.title
            ? `<div class="pp-item ${i===0?'open':''}"><div class="pp-q"><span class="qi"></span><span class="qt">${escapeHtml(s.title)}</span><span class="qa"><svg class="ic-svg" width="17" height="17" viewBox="0 0 24 24"><path class="ln" d="M9 6l6 6-6 6"/></svg></span></div><div class="pp-a"><div class="inner">${escapeHtml(s.body)||'—'}</div></div></div>`
            : `<div class="pp-raw">${escapeHtml(s.body)}</div>`
          ).join('');
          personaBody.querySelectorAll('.pp-item .pp-q').forEach(q=>q.addEventListener('click',()=>q.parentNode.classList.toggle('open')));
        } else {
          personaBody.innerHTML = `<div class="pp-raw">${escapeHtml(txt)}</div>`;
        }
      }
      personaPanel.classList.add('show');
    }
    $('#caPersonaBack').addEventListener('click', ()=> personaPanel.classList.remove('show'));
    /* 设置面板里「人设详情」那行点击进入 */
    setPanel.querySelectorAll('.sp-row').forEach(row=>{
      const n = row.querySelector('.sl .n');
      if (n && n.textContent.trim()==='人设详情') row.addEventListener('click', openPersona);
    });

    /* 人设可编辑 */
    const pEditBtn=$('#caPersonaEdit'), pBar=$('#caPersonaEditBar'), pEditor=$('#caPersonaEditor');
    pEditBtn.addEventListener('click', ()=>{ if(!current)return; pEditor.value=current.persona||''; pBar.style.display='flex'; pEditor.focus(); });
    $('#caPersonaCancel').addEventListener('click', ()=> pBar.style.display='none');
    $('#caPersonaSave').addEventListener('click', ()=>{ if(current){ current.persona=pEditor.value.trim(); saveGroups(); } pBar.style.display='none'; openPersona(); });

    /* AI / 提示词面板 */
    const aiPanel=$('#caAIPanel'), aiStatus=$('#caAIStatus'), promptList=$('#caPromptList');
    function renderPrompts(){
      const sel=getSel(), customs=getPrompts();
      let html = `<div class="prompt-item ${sel==='locked'?'on':''}" data-pid="locked"><span class="pi-ic"><svg class="ic-svg" width="20" height="20" viewBox="0 0 24 24"><rect class="ln" x="5" y="10.5" width="14" height="8.5" rx="2"/><path class="ln" d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></span><span class="pi-name">默认提示词 <span class="pi-lock">· 锁定不可见</span></span><span class="pi-check"></span></div>`;
      html += customs.map(p=>`<div class="prompt-item ${sel===p.id?'on':''}" data-pid="${p.id}"><span class="pi-ic"><svg class="ic-svg" width="20" height="20" viewBox="0 0 24 24"><path class="ln" d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5z"/><path class="ln" d="M8.5 9h7M8.5 12.5h5"/></svg></span><span class="pi-name">${escapeHtml(p.name)}</span><span class="pi-del" data-pdel="${p.id}">删</span><span class="pi-check"></span></div>`).join('');
      promptList.innerHTML = html;
    }
    const ctxVal = $('#caCtxVal');
    function renderCtx(){ ctxVal.textContent = getCtxRounds(); }
    $('#caCtxMinus').addEventListener('click', ()=>{ const n=Math.max(1, getCtxRounds()-1); setCtxRounds(n); renderCtx(); });
    $('#caCtxPlus').addEventListener('click', ()=>{ const n=Math.min(50, getCtxRounds()+1); setCtxRounds(n); renderCtx(); });
    async function openAI(){
      const conn = await getActiveConn();
      aiStatus.innerHTML = (conn && conn.base)
        ? `<div><span class="k">接口 · </span><span class="v">${escapeHtml(conn.name)}</span></div><div><span class="k">模型 · </span><span class="v">${escapeHtml(conn.model||'未选模型')}</span></div><div><span class="k">温度 · </span><span class="v">${escapeHtml(conn.temp||'0.8')}</span></div>`
        : `<div class="k">还没启用任何接口</div><div class="k" style="margin-top:5px;">到主屏「API」里添加并把一个接口设为「启用」</div>`;
      renderCtx();
      renderPrompts();
      aiPanel.classList.add('show');
    }
    $('#caAIBack').addEventListener('click', ()=> aiPanel.classList.remove('show'));
    promptList.addEventListener('click', e=>{
      const del=e.target.closest('[data-pdel]');
      if(del){ e.stopPropagation(); setPrompts(getPrompts().filter(x=>x.id!==del.dataset.pdel)); if(getSel()===del.dataset.pdel) setSel('locked'); renderPrompts(); return; }
      const item=e.target.closest('.prompt-item'); if(!item)return;
      setSel(item.dataset.pid); renderPrompts();
    });
    const pm=$('#caPromptModal'), pmName=$('#caPMName'), pmContent=$('#caPMContent');
    $('#caPromptAdd').addEventListener('click', ()=>{ pmName.value=''; pmContent.value=''; pm.classList.add('show'); pmName.focus(); });
    $('#caPMCancel').addEventListener('click', ()=> pm.classList.remove('show'));
    pm.addEventListener('click', e=>{ if(e.target===pm) pm.classList.remove('show'); });
    $('#caPMSave').addEventListener('click', ()=>{
      const name=pmName.value.trim(); if(!name){ pmName.focus(); pmName.style.borderColor='#d66'; setTimeout(()=>pmName.style.borderColor='',1200); return; }
      const arr=getPrompts(); const id='p_'+Date.now().toString(36); arr.push({id,name,content:pmContent.value}); setPrompts(arr); setSel(id); renderPrompts();
      pm.classList.remove('show');
    });
    /* 设置面板「高级设置」进入 AI 面板 */
    setPanel.querySelectorAll('.sp-row').forEach(row=>{
      const n = row.querySelector('.sl .n');
      if (n && n.textContent.trim()==='高级设置') row.addEventListener('click', openAI);
    });

    /* 聊天壁纸上传 */
    const wallpaperFile = $('#caWallpaperFile');
    setPanel.querySelectorAll('.sp-row').forEach(row=>{
      const n = row.querySelector('.sl .n');
      if (n && n.textContent.trim()==='聊天壁纸') row.addEventListener('click', ()=> wallpaperFile.click());
    });
    wallpaperFile.addEventListener('change', e=>{
      const f=e.target.files[0]; if(!f||!current)return;
      const reader=new FileReader();
      reader.onload=()=>{ current.wallpaper=reader.result; applyWallpaper(current); saveGroups(); setPanel.classList.remove('show'); };
      reader.readAsDataURL(f);
      e.target.value='';
    });
    if (wpResetBtn) {
      wpResetBtn.addEventListener('click', e => {
        e.stopPropagation();
        if(current){ current.wallpaper = ''; applyWallpaper(current); saveGroups(); wpResetBtn.style.display = 'none'; }
      });
    }

    /* 备注与名字 */
    const editModal=$('#caEditModal'), editNote=$('#caEditNote'), editReal=$('#caEditReal');
    setPanel.querySelectorAll('.sp-row').forEach(row=>{
      const n=row.querySelector('.sl .n');
      if(n && n.textContent.trim()==='备注与名字') row.addEventListener('click', ()=>{
        if(!current)return; editNote.value=current.note||''; editReal.value=current.real||''; editModal.classList.add('show'); editNote.focus();
      });
    });
    $('#caEditCancel').addEventListener('click', ()=> editModal.classList.remove('show'));
    editModal.addEventListener('click', e=>{ if(e.target===editModal) editModal.classList.remove('show'); });
    $('#caEditSave').addEventListener('click', ()=>{
      if(current){ current.note=editNote.value.trim(); current.real=editReal.value.trim(); if(!current.note&&current.real) current.nm=current.real; saveGroups(); renderList(); syncSetPanel();
        chatTitle.innerHTML = `${dispName(current)}<br><span class="csub">${current.on?'活跃中 · Active':'离线 · Offline'}</span>`; }
      editModal.classList.remove('show');
    });

    /* 分组 */
    const groupModal=$('#caGroupModal'), groupChips=$('#caGroupChips'); let _grpPick=0;
    setPanel.querySelectorAll('.sp-row').forEach(row=>{
      const n=row.querySelector('.sl .n');
      if(n && n.textContent.trim()==='分组') row.addEventListener('click', ()=>{
        if(!current)return;
        _grpPick=groups.findIndex(g=>g.members.includes(current)); if(_grpPick<0)_grpPick=0;
        groupChips.innerHTML=groups.map((g,i)=>`<b data-g="${i}" class="${i===_grpPick?'on':''}">${g.name}</b>`).join('');
        groupChips.querySelectorAll('b').forEach(b=>b.addEventListener('click',()=>{ _grpPick=+b.dataset.g; groupChips.querySelectorAll('b').forEach(x=>x.classList.remove('on')); b.classList.add('on'); }));
        groupModal.classList.add('show');
      });
    });
    $('#caGroupCancel').addEventListener('click', ()=> groupModal.classList.remove('show'));
    groupModal.addEventListener('click', e=>{ if(e.target===groupModal) groupModal.classList.remove('show'); });
    $('#caGroupSave').addEventListener('click', ()=>{
      if(current){
        const from=groups.findIndex(g=>g.members.includes(current));
        if(from>=0 && from!==_grpPick){ groups[from].members=groups[from].members.filter(x=>x!==current); groups[_grpPick].members.unshift(current); curGrp=_grpPick; renderTabs(); renderList(); saveGroups(); syncSetPanel(); }
      }
      groupModal.classList.remove('show');
    });

    /* 删除联系人 */
    const delModal=$('#caDelModal');
    setPanel.querySelectorAll('.sp-row').forEach(row=>{
      const n=row.querySelector('.sl .n');
      if(n && n.textContent.trim()==='删除联系人') row.addEventListener('click', ()=> { if(current) delModal.classList.add('show'); });
    });
    $('#caDelCancel').addEventListener('click', ()=> delModal.classList.remove('show'));
    delModal.addEventListener('click', e=>{ if(e.target===delModal) delModal.classList.remove('show'); });
    $('#caDelOk').addEventListener('click', ()=>{
      if(current){
        const g=groups.find(g=>g.members.includes(current));
        if(g) g.members=g.members.filter(x=>x!==current);
        saveGroups();
        delModal.classList.remove('show'); setPanel.classList.remove('show'); exitChat();
        const gi=groups.findIndex(x=>x.members.length); if(gi>=0) curGrp=gi;
        renderTabs(); renderList(); current=null;
      } else delModal.classList.remove('show');
    });

    /* 设置面板「感知时间」行内开关 */
    const rowTimeSwitch=$('#caRowTimeSwitch');
    function renderRowTime(){ if(rowTimeSwitch) rowTimeSwitch.classList.toggle('on', getTimeAware()); }
    const rowTime=$('#caRowTime');
    if(rowTime) rowTime.addEventListener('click', ()=>{ setTimeAware(!getTimeAware()); renderRowTime(); });

    /* 设置面板「双语翻译」行内开关 */
    const rowBilingualSwitch=$('#caRowBilingualSwitch');
    function renderRowBilingual(){ if(rowBilingualSwitch) rowBilingualSwitch.classList.toggle('on', getBilingual()); }
    const rowBilingual=$('#caRowBilingual');
    if(rowBilingual) rowBilingual.addEventListener('click', ()=>{ setBilingual(!getBilingual()); renderRowBilingual(); });

    /* 打开设置面板时同步开关状态 */
    $('#caChatSet').addEventListener('click', () => { renderRowTime(); renderRowBilingual(); });

    /* 发送：只把我的消息存下，不自动请求 AI */
    const field = $('#caField'), inputBar = $('#caInputBar');
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    function buzz(ms){ if(isMobile && navigator.vibrate) navigator.vibrate(ms||6); }
    async function send(){
      const v=field.textContent.trim(); if(!v||!current)return;
      buzz(6);
      current.log=current.log||[]; current.log.push({s:'me',v,ts:Date.now()}); field.textContent='';
      current.ms=v; renderMsgs(); renderList();
      await saveGroups();
      try{ if(window.HSMemory && window.HSMemory.maybeAutoSummarize) await window.HSMemory.maybeAutoSummarize(current.id); }catch{}
    }
    $('#caSend').addEventListener('click',send);
    field.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });

    /* 生成回复：点话筒键手动触发 AI */
    let generating = false;
    async function generateReply(){
      if(!current || generating) return;
      const conn = await getActiveConn();
      if(!conn || !conn.base){ current.log=current.log||[]; current.log.push({s:'you',v:'还没启用接口，去主屏「API」里加一个并设为启用吧'}); renderMsgs(); renderList(); saveGroups(); return; }
      generating = true;
      current.log=current.log||[];
      current.log.push({s:'you',v:'…',typing:true}); renderMsgs();
      let memText='';
      try{ if(window.HSMemory && window.HSMemory.getForPrompt) memText = await window.HSMemory.getForPrompt(current.id); }catch{}
      const sys = buildSystemPrompt(current, memText);
      // 1) 取出有效消息并映射角色
      const raw = current.log.filter(m=>!m.t && !m.typing && (m.v||'').trim())
        .map(m=>({ role: m.s==='me'?'user':'assistant', content:m.v }));
      // 2) 合并连续同角色消息（AI 拆句产生的多条 assistant 合回一条），保证交替
      const merged = [];
      raw.forEach(m=>{
        const last = merged[merged.length-1];
        if (last && last.role===m.role) last.content += '\n' + m.content;
        else merged.push({ role:m.role, content:m.content });
      });
      // 3) 按轮数截取最近 N 轮（一轮≈一问一答）
      const keep = getCtxRounds()*2;
      const history = keep>0 ? merged.slice(-keep) : merged;
      try {
        const reply = await callChat(conn, [{role:'system',content:sys}, ...history]);
        current.log = current.log.filter(m=>!m.typing);
        renderMsgs();
        const parts = splitReply(reply);
        const list = parts.length?parts:[reply];
        // 逐条延迟推入，按字数微调停顿，让每条气泡像真人打字依次冒泡
        for(let i=0;i<list.length;i++){
          const len=(list[i]||'').length;
          const d = i===0 ? 120 : Math.min(1600, 380 + len*55);
          await new Promise(r=>setTimeout(r, d));
          current.log.push({s:'you',v:list[i],ts:Date.now()});
          renderMsgs();
        }
        current.ms = list[list.length-1] || reply;
        renderList();
        await saveGroups();   // 先确保消息真正写入库，再让记忆库读取判断
        try{ if(window.HSMemory && window.HSMemory.maybeAutoSummarize) await window.HSMemory.maybeAutoSummarize(current.id); }catch{}
      } catch(err){
        current.log = current.log.filter(m=>!m.typing);
        current.log.push({s:'you',v:'出错了：'+(err.message||err)});
        renderMsgs(); renderList(); saveGroups();
      } finally { generating = false; }
    }
    $('#caGen').addEventListener('click', generateReply);

    /* ===== 消息长按菜单 ===== */
    let _lpMenuEl = null;
    function placeCaretEnd(el){ const r=document.createRange(); r.selectNodeContents(el); r.collapse(false); const s=window.getSelection(); s.removeAllRanges(); s.addRange(r); }
    function positionMenu(menuEl, anchorRect){
      const crRect = viewChat.getBoundingClientRect();
      menuEl.style.visibility='hidden';
      const mw=menuEl.offsetWidth||160, mh=menuEl.offsetHeight||240;
      menuEl.style.visibility='';
      let top=anchorRect.bottom-crRect.top+8;
      if(top+mh>crRect.height-20) top=anchorRect.top-crRect.top-mh-8;
      if(top<10) top=10;
      let left=anchorRect.left-crRect.left;
      if(left+mw>crRect.width-12) left=crRect.width-mw-12;
      if(left<12) left=12;
      menuEl.style.top=top+'px'; menuEl.style.left=left+'px';
    }
    function closeMsgMenu(){
      if(!_lpMenuEl) return;
      const el=_lpMenuEl; _lpMenuEl=null;
      el.classList.remove('show'); el.style.pointerEvents='none';
      setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 220);
    }
    const _menuItems = `
      <div class="it" data-act="reply"><svg class="lp-gsvg" viewBox="0 0 24 24"><path d="M9 17l-5-5 5-5"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg><span>回复</span></div>
      <div class="it" data-act="quote"><svg class="lp-gsvg" viewBox="0 0 24 24"><path d="M7 8h10M7 12h6"/><path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H9l-4 4z"/></svg><span>引用</span></div>
      <div class="it" data-act="edit"><svg class="lp-gsvg" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg><span>编辑</span></div>
      <div class="it" data-act="retry"><svg class="lp-gsvg" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5"/></svg><span>重试</span></div>
      <div class="it danger" data-act="delete"><svg class="lp-gsvg g" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg><span>删除</span></div>`;
    function showMsgMenu(idx, isMe, anchorRect){
      closeMsgMenu();
      const overlay=document.createElement('div');
      overlay.className='lp-overlay';
      overlay.innerHTML = isMe
        ? `<div class="lp-menu-d"><div class="stamp"><svg class="lp-gsvg" style="stroke:#fff;" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div class="inner">${_menuItems}</div></div>`
        : `<div class="lp-menu-a"><div class="head"><span>Actions</span><div class="dots"><i></i><i></i><i></i></div></div><div class="notch"></div>${_menuItems}</div>`;
      viewChat.appendChild(overlay); _lpMenuEl=overlay;
      const menuEl=overlay.querySelector('.lp-menu-a, .lp-menu-d');
      positionMenu(menuEl, anchorRect);
      requestAnimationFrame(()=> overlay.classList.add('show'));
      overlay.addEventListener('click', e=>{
        e.stopPropagation();
        const btn=e.target.closest('[data-act]');
        if(btn){ handleMsgAction(btn.dataset.act, idx, isMe); return; }
        closeMsgMenu();
      });
    }
    function handleMsgAction(act, idx, isMe){
      closeMsgMenu();
      if(!current) return;
      const log=current.log||[]; const m=log[idx]; if(!m) return;
      if(act==='delete'){ 
        _selectMode = true; 
        _selectedMsgs.clear(); 
        _selectedMsgs.add(idx); 
        renderMsgs(true); 
        renderSelectBar();
      }
      else if(act==='reply' || act==='quote'){
        const raw=(m.v||'').replace(/\n/g,' ');
        const t=raw.slice(0,30)+(raw.length>30?'…':'');
        field.textContent='「'+t+'」 '; placeCaretEnd(field); field.focus();
      }
      else if(act==='edit'){
        const row=msgs.querySelector('.row[data-idx="'+idx+'"]'); if(!row) return;
        const bub=row.querySelector('.bubble'); if(!bub) return;
        bub.classList.add('editing');
        if (m.v.includes('[RAW]') || m.v.includes('[EN]')) {
          bub.textContent = m.v;
        }
        bub.setAttribute('contenteditable','true'); bub.focus(); placeCaretEnd(bub);
        const onBlur=()=>{ m.v=bub.textContent.trim(); bub.removeAttribute('contenteditable'); bub.classList.remove('editing'); bub.removeEventListener('blur',onBlur); renderMsgs(true); renderList(); saveGroups(); };
        bub.addEventListener('blur', onBlur);
      }
      else if(act==='retry'){
        // 找到这一轮我说的最后一句（从当前位置往前找最近的 me），清掉它之后 AI 回的所有内容，重新生成
        let myIdx = isMe ? idx : -1;
        if(!isMe){ for(let i=idx;i>=0;i--){ if(log[i].s==='me'){ myIdx=i; break; } } }
        if(myIdx<0){ generateReply(); return; }
        log.splice(myIdx+1); // 删掉我那句之后的全部（即 AI 上一轮的回复）
        renderMsgs(); renderList(); saveGroups();
        generateReply();
      }
    }
    /* 长按 / 右键触发 */
    let _lpTimer=null;
    msgs.addEventListener('touchstart', e=>{
      const row=e.target.closest('.row'); if(!row) return;
      const idx=+row.dataset.idx; const isMe=row.classList.contains('me'); const bub=row.querySelector('.bubble'); if(!bub) return;
      _lpTimer=setTimeout(()=>{ buzz(10); showMsgMenu(idx,isMe,bub.getBoundingClientRect()); }, 480);
    }, {passive:true});
    ['touchend','touchmove','touchcancel'].forEach(ev=> msgs.addEventListener(ev, ()=>clearTimeout(_lpTimer), {passive:true}));
    msgs.addEventListener('contextmenu', e=>{
      const row=e.target.closest('.row'); if(!row) return;
      e.preventDefault();
      const idx=+row.dataset.idx; const isMe=row.classList.contains('me'); const bub=row.querySelector('.bubble'); if(!bub) return;
      showMsgMenu(idx,isMe,bub.getBoundingClientRect());
    });

    msgs.addEventListener('click', e => {
      if (_selectMode) {
        const row = e.target.closest('.row');
        if (row && row.dataset.idx) {
          const idx = +row.dataset.idx;
          if (_selectedMsgs.has(idx)) _selectedMsgs.delete(idx);
          else _selectedMsgs.add(idx);
          renderMsgs(true);
          renderSelectBar();
        }
      }
    });

    $('#caSelectCancel').addEventListener('click', () => {
      _selectMode = false;
      _selectedMsgs.clear();
      renderMsgs(true);
      renderSelectBar();
    });

    $('#caSelectDel').addEventListener('click', () => {
      if (_selectedMsgs.size === 0 || !current) return;
      const log = current.log || [];
      const toDelete = Array.from(_selectedMsgs).sort((a,b) => b - a);
      toDelete.forEach(idx => log.splice(idx, 1));
      _selectMode = false;
      _selectedMsgs.clear();
      renderMsgs(true);
      renderList();
      saveGroups();
      renderSelectBar();
    });

    /* 底栏图标行收起 / 展开（状态存储） */
    if (localStorage.getItem('chatFootHide')==='1') inputBar.classList.add('foot-hide');
    $('#caFootHide').addEventListener('click', ()=> { inputBar.classList.add('foot-hide'); localStorage.setItem('chatFootHide','1'); });
    $('#caFootShow').addEventListener('click', ()=> { inputBar.classList.remove('foot-hide'); localStorage.setItem('chatFootHide','0'); });

    /* ===== 新建联系人弹窗 ===== */
    const modal = $('#caModal'), mAva = $('#caMAva'), mAvaFile = $('#caMAvaFile');
    const mReal = $('#caReal'), mNote = $('#caNote'), mGroups = $('#caMGroups');
    const step1 = $('#caStep1'), step2 = $('#caStep2'), mStep = $('#caMStep'), mTitle = $('#caMTitle');
    const mPersona = $('#caPersona'), mPersonaFile = $('#caPersonaFile'), mImportedName = $('#caImportedName');
    let draft = null;

    function openAdd() {
      draft = { avaImg:DA, real:'', note:'', group:(groups.length>1?1:0), persona:'' };
      mAva.style.backgroundImage = `url('${DA}')`;
      mReal.value=''; mNote.value=''; mPersona.value=''; mImportedName.textContent='';
      mGroups.innerHTML = groups.map((g,i)=>`<b data-g="${i}" class="${i===draft.group?'on':''}">${g.name}</b>`).join('');
      mGroups.querySelectorAll('b').forEach(b=>b.addEventListener('click',()=>{ draft.group=+b.dataset.g; mGroups.querySelectorAll('b').forEach(x=>x.classList.remove('on')); b.classList.add('on'); }));
      step1.style.display='block'; step2.style.display='none'; mStep.textContent='STEP 1 / 2'; mTitle.textContent='新建联系人';
      modal.classList.add('show');
    }
    function closeAdd(){ modal.classList.remove('show'); }
    $('#caAdd').addEventListener('click', openAdd);
    modal.addEventListener('click', e=>{ if(e.target===modal) closeAdd(); });

    mAvaFile.addEventListener('change', e=>{ const f=e.target.files[0]; if(!f)return; const reader=new FileReader(); reader.onload=()=>{ draft.avaImg=reader.result; mAva.style.backgroundImage=`url('${reader.result}')`; }; reader.readAsDataURL(f); });

    mPersonaFile.addEventListener('change', async e=>{
      const f=e.target.files[0]; if(!f)return;
      mImportedName.textContent='读取中… '+f.name;
      const ext=f.name.split('.').pop().toLowerCase();
      try {
        if(ext==='docx'){
          if(!window.mammoth){ mImportedName.textContent='docx 解析库未就绪，请稍候重试'; return; }
          const buf=await f.arrayBuffer(); const res=await window.mammoth.extractRawText({arrayBuffer:buf}); mPersona.value=res.value.trim();
        } else if(ext==='json'){
          const txt=await f.text(); try { const o=JSON.parse(txt); mPersona.value=(typeof o==='string')?o:JSON.stringify(o,null,2); } catch{ mPersona.value=txt; }
        } else { mPersona.value=(await f.text()).trim(); }
        mImportedName.textContent='✓ 已导入 '+f.name;
      } catch(err){ mImportedName.textContent='✗ 读取失败：'+(err.message||ext); }
    });

    modal.addEventListener('click', e=>{
      const b=e.target.closest('[data-m]'); if(!b)return;
      const act=b.dataset.m;
      if(act==='cancel'){ closeAdd(); }
      else if(act==='next'){
        draft.real=mReal.value.trim(); draft.note=mNote.value.trim();
        if(!draft.real && !draft.note){ mReal.focus(); mReal.style.borderBottomColor='#d66'; setTimeout(()=>mReal.style.borderBottomColor='',1200); return; }
        step1.style.display='none'; step2.style.display='block'; mStep.textContent='STEP 2 / 2'; mTitle.textContent='ta 的人设';
      }
      else if(act==='back'){ step1.style.display='block'; step2.style.display='none'; mStep.textContent='STEP 1 / 2'; mTitle.textContent='新建联系人'; }
      else if(act==='confirm'){
        draft.persona=mPersona.value.trim();
        const newC={ id:Date.now(), avaImg:draft.avaImg, nm:draft.real||draft.note, note:draft.note, real:draft.real, persona:draft.persona, ms:'打个招呼吧~', tm:'刚刚', n:0, on:true, log:[] };
        groups[draft.group].members.unshift(newC);
        curGrp=draft.group; renderTabs(); renderList(); saveGroups();
        closeAdd();
      }
    });

    /* ===== 打开 / 关闭整个 App ===== */
    const statusBar = document.getElementById('hsStatusBar');
    function openApp(){ app.classList.add('open'); if(statusBar) statusBar.classList.add('hs-on-light'); loadStore().then(()=>{ const gi=groups.findIndex(g=>g.members.length); if(gi>=0 && !groups[curGrp].members.length) curGrp=gi; renderTabs(); renderList(); }); }
    function closeApp(){ app.classList.remove('open'); if(statusBar) statusBar.classList.remove('hs-on-light'); }
    $('#caQuit').addEventListener('click', closeApp);
    window.HSChat = { open: openApp, close: closeApp };

    /* 点 Dock 的「Chat」图标打开 */
    const homeRoot = document.getElementById('homeScreen');
    document.addEventListener('click', (e) => {
      const tile = e.target.closest('.hs-tile');
      if (!tile) return;
      if (homeRoot && homeRoot.classList.contains('edit')) return;
      const cap = tile.querySelector('.hs-tile-cap');
      if (cap && cap.textContent.trim() === 'Chat') openApp();
    });

    /* 底部三大Tab点击交互与视图切换 */
    const myCardView = $('#caMyCardView');

    /* 夜间模式长按触发 */
    const tabChats = app.querySelectorAll('.tabbar .tab')[0];
    let dmTimer = null;
    tabChats.addEventListener('touchstart', e => {
      dmTimer = setTimeout(() => {
        app.classList.toggle('dark-mode');
        if (typeof buzz === 'function') buzz(20);
        localStorage.setItem('chatDarkMode', app.classList.contains('dark-mode') ? '1' : '0');
      }, 600);
    }, {passive: true});
    ['touchend', 'touchmove', 'touchcancel'].forEach(ev => tabChats.addEventListener(ev, () => clearTimeout(dmTimer), {passive: true}));
    tabChats.addEventListener('contextmenu', e => {
      e.preventDefault();
      app.classList.toggle('dark-mode');
      if (typeof buzz === 'function') buzz(20);
      localStorage.setItem('chatDarkMode', app.classList.contains('dark-mode') ? '1' : '0');
    });
    if (localStorage.getItem('chatDarkMode') === '1') {
      app.classList.add('dark-mode');
    }

    app.querySelectorAll('.tabbar .tab').forEach((t, idx) => {
      t.addEventListener('click', () => {
        app.querySelectorAll('.tabbar .tab').forEach(x => x.classList.remove('on'));
        t.classList.add('on');
        if (typeof buzz === 'function') buzz(10);
        
        if (idx === 0) {
          viewList.style.display = 'flex';
          viewChat.classList.remove('show');
          myCardView.classList.remove('show');
          newListView.classList.remove('show');
          contactCardView.classList.remove('show');
        } else if (idx === 1) {
          viewList.style.display = 'none';
          viewChat.classList.remove('show');
          myCardView.classList.add('show');
          myCardView.classList.remove('hide-scale');
          newListView.classList.remove('show');
          contactCardView.classList.remove('show');
        } else {
          viewList.style.display = 'none';
          myCardView.classList.remove('show');
        }
      });
    });

    /* ================= 新增界面逻辑 ================= */
    const newListView = $('#caNewListView');
    const newListScroll = $('#caNewListScroll');
    const contactCardView = $('#caContactCardView');
    
    // 我的名片 -> 点击 Chat -> 打开全屏联系人列表
    $('#caBtnToNewList').addEventListener('click', () => {
      myCardView.classList.add('hide-scale');
      newListView.classList.add('show');
      renderNewList();
    });
    
    // 我的名片 -> 点击 Setting -> 打开设置面板
    $('#caBtnToSettings').addEventListener('click', () => {
      syncSetPanel();
      setPanel.classList.add('show');
    });

    // 新联系人列表 -> 返回
    $('#caNewListBack').addEventListener('click', () => {
      newListView.classList.remove('show');
      myCardView.classList.remove('hide-scale');
    });
    
    // 新联系人列表 -> 添加
    $('#caNewListAdd').addEventListener('click', openAdd);

    // 渲染新联系人列表
    function renderNewList() {
      let allMembers = [];
      groups.forEach(g => { allMembers = allMembers.concat(g.members); });
      const unique = [];
      const ids = new Set();
      allMembers.forEach(m => { if(!ids.has(m.id)) { unique.push(m); ids.add(m.id); } });
      
      unique.sort((a, b) => {
        const nameA = dispName(a).toUpperCase();
        const nameB = dispName(b).toUpperCase();
        return nameA.localeCompare(nameB);
      });

      let html = '';
      let currentLetter = '';
      unique.forEach(c => {
        const name = dispName(c);
        const firstLetter = (name.charAt(0) || '#').toUpperCase();
        const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
        
        if (letter !== currentLetter) {
          html += `<div class="l-letter">${letter}</div>`;
          currentLetter = letter;
        }
        html += `
          <div class="l-item" data-cid="${c.id}">
            <div class="ava" style="background-image: url('${c.avaImg || DA}')"></div>
            <div class="info">
              <div class="name">${name}</div>
              <div class="sub">${c.ms || 'No recent messages'}</div>
            </div>
          </div>
        `;
      });
      
      if (unique.length === 0) {
        html = `<div style="text-align:center;color:var(--ink2);font-size:12px;padding:40px 0;">暂无联系人</div>`;
      }
      
      newListScroll.innerHTML = html;
      
      newListScroll.querySelectorAll('.l-item').forEach(el => {
        el.addEventListener('click', () => {
          const cid = el.dataset.cid;
          const c = unique.find(x => String(x.id) === cid);
          if (c) openContactCard(c);
        });
      });
    }

    // 打开联系人名片页
    let cardCurrentContact = null;
    function openContactCard(c) {
      cardCurrentContact = c;
      $('#ccCardName').textContent = dispName(c);
      $('#ccCardStatus').textContent = c.on ? 'Active Now' : 'Offline';
      $('#ccCardBg').style.backgroundImage = `url('${c.avaImg || DA}')`;
      $('#ccCardAvatar').style.backgroundImage = `url('${c.avaImg || DA}')`;
      
      const dot = $('#ccCardDot');
      if (!c.on) {
        dot.style.background = '#888';
        dot.style.boxShadow = 'none';
      } else {
        dot.style.background = '#4cd964';
        dot.style.boxShadow = '0 0 8px #4cd964';
      }
      
      contactCardView.classList.add('show');
    }

    // 关闭联系人名片页
    $('#ccCardBack').addEventListener('click', () => {
      contactCardView.classList.remove('show');
    });

    // 名片页 -> Message 按钮 -> 进入聊天
    $('#ccBtnChat').addEventListener('click', () => {
      if (cardCurrentContact) {
        contactCardView.classList.remove('show');
        newListView.classList.remove('show');
        myCardView.classList.add('hide-scale');
        
        app.querySelectorAll('.tabbar .tab').forEach((x, i) => {
          x.classList.toggle('on', i === 0);
        });
        
        openChat(cardCurrentContact);
      }
    });
    
    // 名片页 -> Persona 按钮 -> 打开人设编辑
    $('#ccBtnPersona').addEventListener('click', () => {
      if (cardCurrentContact) {
        current = cardCurrentContact;
        openPersona();
      }
    });

    /* ================= 面具系统逻辑 ================= */
    const maskOverlay = $('#caMaskOverlay');
    const maskListView = $('#caMaskListView');
    const maskFormView = $('#caMaskFormView');
    const maskList = $('#caMaskList');

    function renderMasks() {
      const sel = getSel();
      const customs = getPrompts();
      
      const defaultIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      const customIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
      
      let html = `
        <div class="ms-item ${sel === 'locked' ? 'active' : ''}" data-pid="locked">
          <div class="ms-icon">${defaultIcon}</div>
          <div class="ms-info">
            <div class="ms-name">默认面具</div>
            <div class="ms-desc">常规的聊天身份，无特殊设定注入。</div>
          </div>
          <div class="ms-check"></div>
        </div>
      `;
      
      customs.forEach(p => {
        const desc = p.content ? p.content.slice(0, 20) + '...' : '无详细设定';
        html += `
          <div class="ms-item ${sel === p.id ? 'active' : ''}" data-pid="${p.id}">
            <div class="ms-icon">${customIcon}</div>
            <div class="ms-info">
              <div class="ms-name">${escapeHtml(p.name)}</div>
              <div class="ms-desc">${escapeHtml(desc)}</div>
            </div>
            <div class="ms-check"></div>
          </div>
        `;
      });
      
      maskList.innerHTML = html;
      
      maskList.querySelectorAll('.ms-item').forEach(el => {
        el.addEventListener('click', () => {
          setSel(el.dataset.pid);
          renderMasks();
          renderPrompts(); 
          setTimeout(() => maskOverlay.classList.remove('show'), 250);
        });
      });
    }

    $('#caMyAvatarBtn').addEventListener('click', () => {
      renderMasks();
      maskListView.style.display = 'block';
      maskFormView.style.display = 'none';
      maskOverlay.classList.add('show');
    });

    $('#caMaskClose').addEventListener('click', () => maskOverlay.classList.remove('show'));
    maskOverlay.addEventListener('click', e => { if (e.target === maskOverlay) maskOverlay.classList.remove('show'); });

    $('#caMaskAddBtn').addEventListener('click', () => {
      maskListView.style.display = 'none';
      maskFormView.style.display = 'flex';
      $('#caNewMaskName').value = '';
      $('#caNewMaskPrompt').value = '';
    });

    $('#caMaskCancelBtn').addEventListener('click', () => {
      maskListView.style.display = 'block';
      maskFormView.style.display = 'none';
    });

    $('#caMaskSaveBtn').addEventListener('click', () => {
      const name = $('#caNewMaskName').value.trim();
      const content = $('#caNewMaskPrompt').value.trim();
      if (!name) {
        $('#caNewMaskName').style.borderColor = '#d66';
        setTimeout(() => $('#caNewMaskName').style.borderColor = '', 1200);
        return;
      }
      
      const arr = getPrompts();
      const id = 'p_' + Date.now().toString(36);
      arr.push({ id, name, content });
      setPrompts(arr);
      setSel(id);
      
      renderMasks();
      renderPrompts();
      
      maskListView.style.display = 'block';
      maskFormView.style.display = 'none';
    });

    renderTabs();
    renderList();
    loadStore().then(()=>{ const gi=groups.findIndex(g=>g.members.length); if(gi>=0 && !groups[curGrp].members.length) curGrp=gi; renderTabs(); renderList(); });
    console.log('[chat] 聊天软件已就绪，点 Dock「Chat」图标或 HSChat.open() 打开');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
