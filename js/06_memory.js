/* js/memory.js —— 记忆库（黑白手账风），点主屏「Memory」图标打开。
   联系人共用聊天库 HomeChatDB；记忆存 kv 表 mem_联系人id；总结元数据 memmeta_联系人id。
   记忆同时带「等级」(核心/深刻/日常/琐碎·克莱因蓝)与「长期/短期」标注。
   支持手动/自动总结：调用 AI 按维护规则把对话整理成记忆。 */
(function () {
  const DA = 'https://i.postimg.cc/Bnzxxky1/IMG-20260612-225035.jpg';

  /* 黑白灰按等级变浅 */
  const LEVELS = [
    { id:'core',  name:'核心', color:'#1a1a1a' },
    { id:'deep',  name:'深刻', color:'#555555' },
    { id:'daily', name:'日常', color:'#8c8c8c' },
    { id:'tiny',  name:'琐碎', color:'#c2c2c2' },
  ];
  const lvOf = id => LEVELS.find(l=>l.id===id) || LEVELS[2];
  const LV_ORDER = { core:0, deep:1, daily:2, tiny:3 };
  const NAME2LV = { '核心':'core','深刻':'deep','日常':'daily','琐碎':'tiny' };

  /* 总结维护规则提示词 */
  const SUMMARY_PROMPT = (name)=>`你现在是一个记忆总结机器人。禁止以任何角色人设的视角看待，只以「总结者」的身份工作。
下面是 USER 与 CHAR 的一段对话记录，请把它整理成记忆条目。
其中「USER」指代我，「CHAR」指代「${name}」。整理记忆时统一用 CHAR 指代对方、USER 指代我。

【记忆区维护规则】
1. 把这一轮发生的事件整理成记忆，按重要程度从高到低排列；每个事件必须包含起因、经过（结果可自行判断补全）。
2. 每条记忆必须以 [年月日 精确时间] 作前缀，并写明事件大约从几点到几点。
3. 已经总结过的长期记忆永久保留，禁止删除、删减、省略任何一条。
4. 遇到重大剧情点（关键决定、事件转折）时，单独标为「核心」级别，不受数量限制。

【记忆等级划分】
- 核心：重大转折、关键决定、深刻影响关系走向的事。
- 深刻：情感浓度高、值得长期记住的事。
- 日常：日常互动、习惯、偏好。
- 琐碎：细枝末节的小事。

【长期 / 短期】（两者必须同时标注）
- 长期：需要永久保留、影响后续的记忆。
- 短期：当前这一轮的即时事件，时效性强。

请只输出 JSON 数组，不要任何额外说明或代码块标记，每条形如：
{"term":"长期","level":"核心","text":"[2026年6月12日 14:00-15:30] 起因…经过…结果…"}`;

  /* 共用聊天库 IndexedDB */
  const CDB='HomeChatDB', CKV='kv';
  let _cdb=null;
  function cdbOpen(){
    return new Promise((res,rej)=>{
      if(_cdb){res(_cdb);return;}
      const r=indexedDB.open(CDB,1);
      r.onupgradeneeded=e=>{ const d=e.target.result; if(!d.objectStoreNames.contains(CKV)) d.createObjectStore(CKV); };
      r.onsuccess=e=>{_cdb=e.target.result;res(_cdb);};
      r.onerror=e=>rej(e.target.error);
    });
  }
  async function cdbGet(k){ try{const db=await cdbOpen();return await new Promise(res=>{const tx=db.transaction(CKV,'readonly');const q=tx.objectStore(CKV).get(k);q.onsuccess=()=>res(q.result??null);q.onerror=()=>res(null);});}catch{return null;} }
  async function cdbSet(k,v){ try{const db=await cdbOpen();return await new Promise((res,rej)=>{const tx=db.transaction(CKV,'readwrite');tx.objectStore(CKV).put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}catch(e){console.warn('[memory] 保存失败',e);} }

  /* 接口库（与 9.api.js 共用） */
  function apiDbAll(){ return new Promise(resolve=>{ try{ const r=indexedDB.open('HomeApiDB',1); r.onsuccess=e=>{ const db=e.target.result; if(!db.objectStoreNames.contains('conns')){ resolve([]); db.close(); return; } const tx=db.transaction('conns','readonly'); const q=tx.objectStore('conns').getAll(); q.onsuccess=()=>resolve(q.result||[]); q.onerror=()=>resolve([]); tx.oncomplete=()=>db.close(); }; r.onerror=()=>resolve([]); }catch{ resolve([]); } }); }
  async function getActiveConn(){ const all=await apiDbAll(); return all.find(c=>c.active)||all[0]||null; }
  async function callChat(conn, messages){
    const url=conn.base.replace(/\/+$/,'')+'/chat/completions';
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(conn.key?{'Authorization':'Bearer '+conn.key}:{})},body:JSON.stringify({model:conn.model,temperature:0.4,messages})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data=await res.json();
    return (data.choices&&data.choices[0]&&(data.choices[0].message?.content??data.choices[0].text))||'';
  }

  /* 取某联系人的对话消息（仅 me/you 文本，按顺序） */
  async function getLog(id){
    const groups=await cdbGet('groups'); if(!Array.isArray(groups)) return {name:'ta',list:[]};
    let m=null; groups.forEach(g=>(g.members||[]).forEach(x=>{ if(x.id===id) m=x; }));
    if(!m) return {name:'ta',list:[]};
    const list=(m.log||[]).filter(x=>!x.t && !x.typing && (x.v||'').trim());
    return { name:(m.note||m.nm||'ta'), list };
  }
  function fmtTs(ts){
    if(!ts) return '';
    const d=new Date(ts);
    const wd=['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${wd} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  const memKey=id=>'mem_'+id;
  const metaKey=id=>'memmeta_'+id;

  /* 总结提示词：默认锁定只读，可新增自定义并启用（全局，不分联系人） */
  const SUMSEL_KEY='sumPromptSel', SUMLIST_KEY='sumPrompts';
  async function getSumPrompts(){ const v=await cdbGet(SUMLIST_KEY); return Array.isArray(v)?v:[]; }
  async function setSumPrompts(a){ await cdbSet(SUMLIST_KEY, a); }
  async function getSumSel(){ return (await cdbGet(SUMSEL_KEY))||'locked'; }
  async function setSumSel(id){ await cdbSet(SUMSEL_KEY, id); }
  async function getSummaryPromptContent(name){
    const sel=await getSumSel();
    if(sel!=='locked'){ const arr=await getSumPrompts(); const p=arr.find(x=>x.id===sel); if(p) return p.content; }
    return SUMMARY_PROMPT(name);
  }

  /* 给系统提示词用：按等级排序的记忆文本 */
  async function getForPrompt(id){
    const v=await cdbGet(memKey(id));
    if(!Array.isArray(v)||!v.length) return '';
    const sorted=[...v].sort((a,b)=>(LV_ORDER[a.lv]??9)-(LV_ORDER[b.lv]??9));
    return sorted.map(m=>{ const term=m.term==='short'?'短期':'长期'; return `[${term}·${lvOf(m.lv).name}] ${m.text}`; }).join('\n');
  }

  /* 核心：总结一段对话为记忆 */
  async function summarize(id, fromIdx, toIdx){
    const conn=await getActiveConn();
    if(!conn||!conn.base) throw new Error('未启用接口');
    const {name,list}=await getLog(id);
    if(!list.length) throw new Error('没有可总结的对话');
    const from=Math.max(1, fromIdx||1), to=Math.min(list.length, toIdx||list.length);
    if(from>to) throw new Error('范围无效');
    const transcript=list.slice(from-1,to).map(x=>{
      const t=fmtTs(x.ts); const who=x.s==='me'?'USER':'CHAR';
      return (t?`[${t}] `:'')+who+'：'+x.v;
    }).join('\n');
    // 纯按范围总结这段对话，不掺入已有记忆（误删后可重新选范围再总结调回）
    const sysContent=await getSummaryPromptContent(name);
    const reply=await callChat(conn, [
      {role:'system',content:sysContent},
      {role:'user',content:'对话记录（每条带精确时间，USER=我，CHAR='+name+'）：\n'+transcript}
    ]);
    // 解析 JSON
    let arr=[];
    try{ const mt=reply.match(/\[[\s\S]*\]/); arr=JSON.parse(mt?mt[0]:reply); }catch{ arr=[]; }
    const d=new Date(); const date=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
    const exist=(await cdbGet(memKey(id)))||[];
    let added=0;
    (Array.isArray(arr)?arr:[]).forEach(it=>{
      const text=(it&&it.text||'').trim(); if(!text) return;
      const lv=NAME2LV[it.level]||'daily';
      const term=(it.term==='短期'||it.term==='short')?'short':'long';
      exist.unshift({ id:Date.now()+Math.floor(Math.random()*999), lv, term, text, date }); added++;
    });
    await cdbSet(memKey(id), exist);
    // 进度用"已总结到的最新时间戳"记录，删消息也能自动同步
    let maxTs=0;
    list.slice(from-1,to).forEach(x=>{ if(x.ts && x.ts>maxTs) maxTs=x.ts; });
    const meta=(await cdbGet(metaKey(id)))||{summedTs:0,autoEvery:0};
    meta.summedTs=Math.max(meta.summedTs||0, maxTs); await cdbSet(metaKey(id), meta);
    return { added, to, total:list.length };
  }

  async function getMeta(id){ const m=(await cdbGet(metaKey(id)))||{}; return { summedTs:m.summedTs||0, autoEvery:m.autoEvery||0, ackCount:m.ackCount||0 }; }
  async function setMeta(id,meta){ await cdbSet(metaKey(id), meta); }
  /* 按时间戳判定已/未总结：删消息后自动同步，恒准 */
  function splitSummed(list, summedTs){
    const summed=list.filter(x=> x.ts && summedTs && x.ts<=summedTs).length;
    return { summed, unsummed: list.length-summed };
  }

  /* 顶栏下方提醒胶囊 */
  const SPIN_SVG='<span class="sp-spin"><svg viewBox="0 0 24 24"><path class="ln" style="stroke:#002fa7" d="M12 4a8 8 0 1 1-8 8"/></svg></span>';
  const STAR_SVG='<span class="sp-spin" style="animation:none"><svg viewBox="0 0 24 24"><path class="ln" style="stroke:#002fa7" d="M12 4.5l1.8 4 4.2.4-3.2 2.8 1 4.1L12 13.7 8.2 15.8l1-4.1L6 8.9l4.2-.4z"/></svg></span>';
  function busyPill(show){ const p=document.getElementById('caSumPill'); if(!p)return; p.onclick=null; p.style.cursor='default'; p.innerHTML=`<span class="sp-tap">${SPIN_SVG}<span class="sp-t">记忆整理中…</span></span>`; p.classList.toggle('show',!!show); }
  /* 达到阈值：弹出"要不要总结"提醒，不点不消失，点了才总结那一段 */
  function askPill(id, unsummed){
    const p=document.getElementById('caSumPill'); if(!p)return;
    p.style.cursor='default';
    p.innerHTML=`<span class="sp-tap">${STAR_SVG}<span><span class="sp-t">${unsummed} 条待整理</span> <span class="sp-s">点我调取</span></span></span><span class="sp-x"><svg viewBox="0 0 24 24"><path class="ln" style="stroke:#888" d="M7 7l10 10M17 7L7 17"/></svg></span>`;
    p.classList.add('show');
    // 左侧文字区：点击调取总结
    p.querySelector('.sp-tap').onclick=async ()=>{
      const tap=p.querySelector('.sp-tap'); if(tap) tap.onclick=null;
      const meta=await getMeta(id); const {list}=await getLog(id);
      const { summed }=splitSummed(list, meta.summedTs);
      const from=summed+1;
      const to=list.length;   // 调取时把攒着的未总结全部包进去
      busyPill(true);
      try{
        await summarize(id, from, to);   // summedTs 推进，已总结数增加
        const m2=await getMeta(id); m2.ackCount=0; await setMeta(id, m2); // 整理过，提醒基准归零
      }catch(e){ console.warn('[memory] 调取失败',e); }
      busyPill(false);
      if(window.HSMemory && window.HSMemory._refresh) window.HSMemory._refresh(id);
      const p2=document.getElementById('caSumPill'); if(p2) p2.classList.remove('show');
    };
    // 右侧叉号：这次不调取，消息攒着；抬高提醒基准，攒够下一批再提醒
    p.querySelector('.sp-x').onclick=async (e)=>{
      e.stopPropagation();
      const meta=await getMeta(id); const {list}=await getLog(id);
      const { unsummed:u }=splitSummed(list, meta.summedTs);
      meta.ackCount=u;                       // 提醒基准抬到当前未总结数（不动 summedTs，消息全留着）
      await setMeta(id, meta);
      p.innerHTML=`<span class="sp-tap">${STAR_SVG}<span><span class="sp-t">先攒着</span> <span class="sp-s">还有 ${u} 条没整理</span></span></span>`;
      p.style.cursor='default';
      setTimeout(()=>{ p.classList.remove('show'); }, 1800);
    };
  }
  async function maybeAutoSummarize(id){
    try{
      const meta=await getMeta(id); if(!meta.autoEvery||meta.autoEvery<1) return;
      const {list}=await getLog(id);
      const { unsummed }=splitSummed(list, meta.summedTs);   // 实时数未总结条数，删消息自动同步
      const ack=meta.ackCount||0;
      // 未总结数 ≥ 提醒基准 + 一个阈值 才提醒（点叉后基准抬高，攒够下一批再提醒）
      if(unsummed >= ack + meta.autoEvery){
        const p=document.getElementById('caSumPill');
        if(p && p.classList.contains('show')){ // 已在提醒，只更新条数文本不重弹
          if(!p.querySelector('.sp-spin')||p.innerHTML.indexOf('整理中')<0) askPill(id, unsummed);
          return;
        }
        askPill(id, unsummed);
      }
    }catch(e){ console.warn('[memory] 提醒失败',e); }
  }

  const CSS = `
  #mmApp{position:fixed;inset:0;z-index:999999;display:none;flex-direction:column;overflow:hidden;
    font-family:"PingFang SC","PingFang TC",-apple-system,sans-serif;color:#1a1a1a;background:#fcfcfc;
    --ink:#1a1a1a;--ink2:#a8a8a8;--line:#ececec;--ease:cubic-bezier(.2,.8,.25,1);}
  #mmApp.open{display:flex;animation:mmFade .3s var(--ease) both;}
  @keyframes mmFade{from{opacity:0;}to{opacity:1;}}
  #mmApp .ln{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
  #mmApp .mm-tex{position:absolute;inset:0;pointer-events:none;z-index:0;background-image:repeating-linear-gradient(transparent 0 35px,#f4f4f4 35px 36px);opacity:.6;}
  #mmApp>*{position:relative;z-index:1;}

  #mmApp .mm-head{flex-shrink:0;padding:60px 24px 6px;transition: padding-top 0.3s ease;}
  body.is-fullscreen #mmApp .mm-head{padding-top:110px;}
  #mmApp .mm-head .acts{position:absolute;top:56px;right:20px;display:flex;gap:8px;transition: top 0.3s ease;z-index:10;}
  body.is-fullscreen #mmApp .mm-head .acts{top:106px;}
  #mmApp .mm-head .acts span{width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:50%;}
  #mmApp .mm-head .acts .sum{border:1.5px solid var(--ink);font-size:10px;font-weight:700;width:auto;padding:0 12px;}
  #mmApp .mm-head .eyebrow{font-size:9px;letter-spacing:4px;text-transform:uppercase;color:var(--ink2);}
  #mmApp .mm-head h1{font-size:29px;font-weight:800;letter-spacing:-.5px;margin-top:7px;}

  #mmApp .mm-people{flex-shrink:0;display:flex;gap:14px;padding:18px 24px 14px;overflow-x:auto;}
  #mmApp .mm-people::-webkit-scrollbar{display:none;}
  #mmApp .mm-person{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;}
  #mmApp .mm-person .av{width:54px;height:54px;border-radius:0;background:#eee center/cover;position:relative;border:2px solid transparent;transition:.18s ease;}
  #mmApp .mm-person.on .av{border-color:var(--ink);}
  #mmApp .mm-person .av .dash{position:absolute;inset:-5px;border:1.5px dashed transparent;border-radius:0;transition:.18s;}
  #mmApp .mm-person.on .av .dash{border-color:#cfcfcf;}
  #mmApp .mm-person .nm{font-size:10px;color:var(--ink2);max-width:56px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #mmApp .mm-person.on .nm{color:var(--ink);font-weight:600;}

  #mmApp .mm-levels{flex-shrink:0;display:flex;gap:7px;padding:4px 24px 14px;overflow-x:auto;}
  #mmApp .mm-levels::-webkit-scrollbar{display:none;}
  #mmApp .mm-lv{flex:0 0 auto;padding:6px 14px;border:1.5px solid var(--line);border-radius:0;font-size:11px;color:var(--ink2);cursor:pointer;display:flex;align-items:center;gap:5px;transition:.18s;}
  #mmApp .mm-lv .pip{width:7px;height:7px;border-radius:50%;}
  #mmApp .mm-lv.on{background:var(--ink);color:#fff;border-color:var(--ink);}

  #mmApp .mm-body{flex:1;overflow-y:auto;padding:4px 24px 40px;}
  #mmApp .mm-body::-webkit-scrollbar{display:none;}
  #mmApp .mm-count{font-size:10px;color:var(--ink2);letter-spacing:1px;margin:2px 2px 14px;line-height:1.6;}

  #mmApp .mem{background:#fff;border:1px solid var(--line);border-radius:4px;padding:15px 16px 13px;margin-bottom:13px;position:relative;box-shadow:0 4px 14px rgba(0,0,0,.05);}
  #mmApp .mem .pin{position:absolute;left:18px;top:-7px;width:2px;height:14px;background:var(--ink);opacity:.18;}
  #mmApp .mem .mtop{display:flex;align-items:center;gap:7px;margin-bottom:9px;}
  #mmApp .mem .mtag{font-size:9px;font-weight:700;letter-spacing:1px;padding:3px 9px;border-radius:3px;color:#fff;}
  #mmApp .mem .mterm{font-size:8.5px;font-weight:700;letter-spacing:1px;padding:2px 7px;border-radius:3px;border:1px solid var(--ink2);color:var(--ink2);}
  #mmApp .mem .mdate{font-size:9px;color:var(--ink2);letter-spacing:1px;}
  #mmApp .mem .mtools{margin-left:auto;display:flex;gap:12px;}
  #mmApp .mem .mtools span{cursor:pointer;color:var(--ink2);display:flex;}
  #mmApp .mem .mtools span:active{color:var(--ink);}
  #mmApp .mem .mtools svg{width:15px;height:15px;}
  #mmApp .mem .mtext{font-size:13px;line-height:1.65;color:#333;white-space:pre-wrap;word-break:break-word;}

  #mmApp .mm-empty{text-align:center;color:var(--ink2);font-size:12px;padding:50px 0;line-height:1.9;}

  #mmApp .mm-fab{position:absolute;right:22px;bottom:30px;width:54px;height:54px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.3);z-index:20;transition:transform .15s var(--ease);}
  #mmApp .mm-fab:active{transform:scale(.9);}
  #mmApp .mm-fab svg{width:26px;height:26px;}

  /* 弹窗：屏幕居中 · 半透明灰玻璃 + 双层极细边框 */
  #mmApp .mm-modal{position:absolute;inset:0;z-index:40;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(40,40,44,.4);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}
  #mmApp .mm-modal.show{display:flex;}
  #mmApp .mm-sheet{width:100%;max-width:340px;border-radius:20px;padding:22px;animation:mmPop .26s var(--ease);
    background:rgba(245,245,247,.72);backdrop-filter:saturate(160%) blur(22px);-webkit-backdrop-filter:saturate(160%) blur(22px);
    border:1px solid rgba(255,255,255,.55);box-shadow:0 20px 50px rgba(0,0,0,.28), inset 0 0 0 1px rgba(0,0,0,.06);color:#1a1a1a;}
  @keyframes mmPop{from{opacity:0;transform:scale(.92);}to{opacity:1;transform:none;}}
  #mmApp .mm-sheet .st{font-size:16px;font-weight:800;margin-bottom:4px;}
  #mmApp .mm-sheet .ss{font-size:10px;color:#777;letter-spacing:1px;margin-bottom:16px;line-height:1.6;}
  #mmApp .mm-sheet .lbl{font-size:10px;color:#777;letter-spacing:1px;margin-bottom:8px;}
  #mmApp .mm-pick{display:flex;gap:7px;margin-bottom:16px;flex-wrap:wrap;}
  #mmApp .mm-pick b{font-size:11px;font-weight:500;padding:7px 13px;border-radius:0;border:1.5px solid rgba(0,0,0,.12);color:#777;cursor:pointer;display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.4);}
  #mmApp .mm-pick b .pip{width:7px;height:7px;border-radius:50%;}
  #mmApp .mm-pick b.on{border-color:#1a1a1a;color:#1a1a1a;font-weight:700;}
  #mmApp .mm-ta{width:100%;min-height:110px;max-height:36vh;border:1.5px solid rgba(0,0,0,.12);border-radius:12px;padding:13px;font-size:13px;line-height:1.7;font-family:inherit;outline:none;resize:none;color:#1a1a1a;background:rgba(255,255,255,.5);}
  #mmApp .mm-ta:focus{border-color:#1a1a1a;}
  #mmApp .mm-num{width:100%;padding:11px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:11px;font-size:13px;font-family:inherit;outline:none;color:#1a1a1a;background:rgba(255,255,255,.5);}
  #mmApp .mm-num:focus{border-color:#1a1a1a;}
  #mmApp .mm-row2{display:flex;gap:10px;margin-bottom:16px;}
  #mmApp .mm-row2 .col{flex:1;}
  #mmApp .mm-row2 .col .cl{font-size:9px;color:#999;margin-bottom:5px;}
  #mmApp .mm-note{font-size:10.5px;color:#666;line-height:1.7;background:rgba(255,255,255,.45);border-radius:10px;padding:11px 12px;margin-bottom:14px;}
  #mmApp .mm-note b{color:#1a1a1a;}
  #mmApp .mm-acts{display:flex;gap:10px;margin-top:4px;}
  #mmApp .mm-acts button{flex:1;padding:13px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}
  #mmApp .mm-acts .g{background:rgba(255,255,255,.5);border:1.5px solid #1a1a1a;color:#1a1a1a;}
  #mmApp .mm-acts .s{background:#1a1a1a;border:1.5px solid #1a1a1a;color:#fff;}
  /* 总结弹窗（精致版） */
  #mmApp .mm-sheet.sum{max-width:330px;padding:20px;}
  #mmApp .sum-hd{display:flex;align-items:center;gap:13px;margin-bottom:16px;}
  #mmApp .sum-hd .sum-ic{width:42px;height:42px;flex-shrink:0;border-radius:13px;background:#1a1a1a;color:#fff;display:flex;align-items:center;justify-content:center;}
  #mmApp .sum-hd .sum-ic svg{width:22px;height:22px;}
  #mmApp .sum-hd .st{font-size:16px;font-weight:800;}
  #mmApp .sum-hd .ss{font-size:10px;color:#777;margin-top:3px;}
  #mmApp .sum-prog{font-size:11px;color:#555;line-height:1.7;background:rgba(0,47,167,.06);border:1px solid rgba(0,47,167,.15);border-radius:11px;padding:11px 13px;margin-bottom:16px;}
  #mmApp .sum-prog b{color:#002fa7;font-weight:800;}
  #mmApp .sum-card{background:rgba(255,255,255,.55);border:1px solid rgba(0,0,0,.07);border-radius:14px;padding:15px;margin-bottom:13px;}
  #mmApp .sum-card-t{font-size:13px;font-weight:700;display:flex;align-items:center;gap:7px;}
  #mmApp .sum-card-t .dot{width:6px;height:6px;border-radius:50%;background:#002fa7;}
  #mmApp .sum-card-d{font-size:10px;color:#999;margin:5px 0 13px;line-height:1.5;}
  #mmApp .sum-range{display:flex;align-items:center;gap:8px;margin-bottom:13px;}
  #mmApp .sum-range .rg{flex:1;display:flex;align-items:center;gap:6px;background:#fff;border:1.5px solid rgba(0,0,0,.1);border-radius:10px;padding:0 10px;}
  #mmApp .sum-range .rg:focus-within{border-color:#1a1a1a;}
  #mmApp .sum-range .rl{font-size:10px;color:#999;flex-shrink:0;}
  #mmApp .sum-range .mm-num{border:none;background:none;padding:10px 0;width:100%;font-size:14px;font-weight:700;text-align:center;outline:none;color:#1a1a1a;}
  #mmApp .sum-arrow{flex-shrink:0;color:#bbb;display:flex;}
  #mmApp .sum-arrow svg{width:18px;height:18px;}
  #mmApp .sum-auto{display:flex;align-items:center;gap:9px;}
  #mmApp .sum-auto .mm-num{width:70px;background:#fff;border:1.5px solid rgba(0,0,0,.1);border-radius:10px;padding:10px;font-size:14px;font-weight:700;text-align:center;outline:none;color:#1a1a1a;}
  #mmApp .sum-auto .mm-num:focus{border-color:#1a1a1a;}
  #mmApp .sum-auto .rl{font-size:10px;color:#999;}
  #mmApp .sum-btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:11px;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;border:none;transition:transform .12s var(--ease);}
  #mmApp .sum-btn:active{transform:scale(.97);}
  #mmApp .sum-btn svg{width:15px;height:15px;}
  #mmApp .sum-btn.solid{background:#1a1a1a;color:#fff;}
  #mmApp .sum-btn.ghost{background:#fff;border:1.5px solid #1a1a1a;color:#1a1a1a;margin-left:auto;width:auto;padding:10px 18px;}
  #mmApp .sum-auto .sum-btn.ghost{margin-left:auto;}
  #mmApp .sum-close{width:100%;padding:13px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;background:rgba(0,0,0,.04);border:1px solid rgba(0,0,0,.08);color:#555;margin-top:4px;}
  /* 总结弹窗：回形针 + 后面斜露的卡片 */
  #mmApp .mm-sheet.sum{position:relative;overflow:visible;}
  #mmApp .clip-zone{position:absolute;top:-26px;right:20px;width:104px;height:46px;cursor:pointer;z-index:3;}
  #mmApp .clip-zone:active{transform:translateY(1px);}
  #mmApp .clip-card{position:absolute;right:0;top:6px;transform:rotate(7deg);transform-origin:bottom right;
    background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:8px 8px 0 0;box-shadow:0 -3px 12px rgba(0,0,0,.1);
    padding:8px 13px 16px;display:flex;flex-direction:column;gap:2px;transition:transform .2s var(--ease);}
  #mmApp .clip-zone:active .clip-card{transform:rotate(3deg);}
  #mmApp .clip-card .cc-t{font-size:11px;font-weight:800;color:#1a1a1a;}
  #mmApp .clip-card .cc-s{font-size:8.5px;color:#9a9aa0;letter-spacing:.5px;}
  #mmApp .clip-pin{position:absolute;left:14px;top:-8px;width:22px;height:50px;transform:rotate(-12deg);filter:drop-shadow(0 2px 3px rgba(0,0,0,.18));}

  #mmApp .pp-it{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.55);border:1px solid rgba(0,0,0,.07);border-radius:12px;padding:11px 13px;margin-bottom:9px;}
  #mmApp .pp-it .pp-nm{flex:1;font-size:12.5px;font-weight:600;color:#1a1a1a;cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  #mmApp .pp-it .pp-nm .lk{font-size:9px;color:#999;font-weight:400;}
  #mmApp .pp-it .pp-op{font-size:10.5px;color:#888;cursor:pointer;flex-shrink:0;}
  #mmApp .pp-it .pp-op.del{color:#c0564e;}
  #mmApp .pp-it .pp-ck{width:18px;height:18px;border-radius:50%;border:1.5px solid #ccc;flex-shrink:0;position:relative;cursor:pointer;}
  #mmApp .pp-it.on .pp-ck{background:#002fa7;border-color:#002fa7;}
  #mmApp .pp-it.on .pp-ck::after{content:"";position:absolute;left:5px;top:2px;width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);}
  #mmApp .mm-pe-name{width:100%;padding:11px 12px;border:1.5px solid rgba(0,0,0,.12);border-radius:11px;font-size:13px;font-family:inherit;outline:none;color:#1a1a1a;background:rgba(255,255,255,.5);}
  #mmApp .mm-pe-name:focus{border-color:#1a1a1a;}
  #mmApp .mm-toast{position:absolute;left:50%;bottom:40px;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;font-size:12px;padding:11px 22px;border-radius:2px;opacity:0;transition:all .26s var(--ease);pointer-events:none;z-index:60;box-shadow:0 8px 24px rgba(0,0,0,.25);}
  #mmApp .mm-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
  `;

  const HTML = `
    <div class="mm-tex"></div>
    <div class="mm-head">
      <div class="acts">
        <span class="sum" data-sum>总结</span>
        <span data-close><svg width="18" height="18" viewBox="0 0 24 24"><path class="ln" d="M6 6l12 12M18 6L6 18"/></svg></span>
      </div>
      <div class="eyebrow">Memory</div>
      <h1>记忆</h1>
    </div>
    <div class="mm-people" id="mmPeople"></div>
    <div class="mm-levels" id="mmLevels"></div>
    <div class="mm-body">
      <div class="mm-count" id="mmCount"></div>
      <div id="mmList"></div>
    </div>
    <div class="mm-fab" id="mmFab"><svg viewBox="0 0 24 24"><path class="ln" d="M12 5v14M5 12h14"/></svg></div>

    <!-- 添加/编辑弹窗 -->
    <div class="mm-modal" id="mmModal">
      <div class="mm-sheet">
        <div class="st" id="mmSheetTitle">添加记忆</div>
        <div class="ss" id="mmSheetSub"></div>
        <div class="lbl">等级</div>
        <div class="mm-pick" id="mmPick"></div>
        <div class="lbl">长期 / 短期</div>
        <div class="mm-pick" id="mmTermPick"></div>
        <div class="lbl">内容</div>
        <textarea class="mm-ta" id="mmTa" placeholder="记下一段关于 ta 的记忆…"></textarea>
        <div class="mm-acts"><button class="g" id="mmCancel">取消</button><button class="s" id="mmSave">保存</button></div>
      </div>
    </div>

    <!-- 总结弹窗 -->
    <div class="mm-modal" id="mmSumModal">
      <div class="mm-sheet sum">
        <div class="sum-hd">
          <div class="sum-ic"><svg viewBox="0 0 24 24"><path class="ln" d="M5 4.5h14M5 4.5v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-12"/><path class="ln" d="M9 9h6M9 12.5h4"/><path class="ln" d="M12 18.5v2.5M9.5 21h5"/></svg></div>
          <div><div class="st">总结记忆</div><div class="ss" id="mmSumSub"></div></div>
        </div>
        <div class="sum-prog" id="mmSumNote"></div>

        <div class="sum-card">
          <div class="sum-card-t"><span class="dot"></span>手动总结</div>
          <div class="sum-card-d">选择要整理的对话范围，AI 会写成记忆</div>
          <div class="sum-range">
            <div class="rg"><span class="rl">从第</span><input class="mm-num" id="mmSumFrom" type="number" min="1"><span class="rl">条</span></div>
            <span class="sum-arrow"><svg viewBox="0 0 24 24"><path class="ln" d="M5 12h13M12 6l6 6-6 6"/></svg></span>
            <div class="rg"><span class="rl">第</span><input class="mm-num" id="mmSumTo" type="number" min="1"><span class="rl">条</span></div>
          </div>
          <button class="sum-btn solid" id="mmSumRun"><svg viewBox="0 0 24 24"><path class="ln" d="M12 4.5l1.8 4 4.2.4-3.2 2.8 1 4.1L12 13.7 8.2 15.8l1-4.1L6 8.9l4.2-.4z"/></svg>立即总结这一段</button>
        </div>

        <div class="sum-card">
          <div class="sum-card-t"><span class="dot"></span>提醒调取</div>
          <div class="sum-card-d">攒够设定条数就在聊天顶栏提醒你调取（0 = 关闭）</div>
          <div class="sum-auto">
            <input class="mm-num" id="mmSumAuto" type="number" min="0">
            <span class="rl">条 / 次</span>
            <button class="sum-btn ghost" id="mmSumSaveAuto">保存</button>
          </div>
        </div>

        <button class="sum-close" id="mmSumClose">完成</button>

        <!-- 回形针入口：点这里翻到管理提示词 -->
        <div class="clip-zone" id="mmPromptManage">
          <div class="clip-card"><span class="cc-t">提示词</span><span class="cc-s">点开管理 →</span></div>
          <svg class="clip-pin" viewBox="0 0 40 90"><path d="M20 14 L20 64 a8 8 0 0 0 16 0 L36 24 a13 13 0 0 0 -26 0 L10 66 a18 18 0 0 0 36 0" fill="none" stroke="#9a9aa0" stroke-width="3.4" stroke-linecap="round" transform="translate(-3 0)"/></svg>
        </div>
      </div>
    </div>

    <!-- 总结提示词管理 -->
    <div class="mm-modal" id="mmPromptModal">
      <div class="mm-sheet">
        <div class="st">总结提示词</div>
        <div class="ss">选一个启用 · 默认锁定不可修改</div>
        <div id="mmPromptList"></div>
        <div class="mm-acts"><button class="g" id="mmPromptClose">关闭</button><button class="s" id="mmPromptAdd">＋ 新增</button></div>
      </div>
    </div>

    <!-- 总结提示词编辑 -->
    <div class="mm-modal" id="mmPEModal">
      <div class="mm-sheet">
        <div class="st" id="mmPETitle">新增提示词</div>
        <div class="ss" id="mmPESub"></div>
        <input class="mm-pe-name" id="mmPEName" placeholder="名字">
        <textarea class="mm-ta" id="mmPEContent" placeholder="粘贴总结提示词内容…" style="margin-top:10px;min-height:160px;"></textarea>
        <div class="mm-acts"><button class="g" id="mmPECancel">取消</button><button class="s" id="mmPESave">保存</button></div>
      </div>
    </div>

    <div class="mm-toast" id="mmToast"></div>
  `;

  function init(){
    const style=document.createElement('style'); style.textContent=CSS; document.head.appendChild(style);
    const root=document.createElement('div'); root.id='mmApp'; root.innerHTML=HTML;
    document.body.appendChild(root);
    const $=s=>root.querySelector(s);
    const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    function toast(m){ const t=$('#mmToast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._tm); t._tm=setTimeout(()=>t.classList.remove('show'),2400); }

    let people=[], memMap={}, curId=null, curLevel='all', editing=null, pickLv='daily', pickTerm='long';

    async function loadPeople(){
      const groups=await cdbGet('groups'); people=[];
      if(Array.isArray(groups)) groups.forEach(g=>(g.members||[]).forEach(m=>people.push({ id:m.id, nm:(m.note||m.nm||'未命名'), av:m.avaImg||DA })));
    }
    async function loadMems(id){ const v=await cdbGet(memKey(id)); memMap[id]=Array.isArray(v)?v:[]; return memMap[id]; }
    function saveMems(id){ cdbSet(memKey(id), memMap[id]||[]); }

    function renderPeople(){
      if(!people.length){ $('#mmPeople').innerHTML=`<div style="font-size:11px;color:var(--ink2);padding:8px 2px;">还没有联系人，先去聊天软件添加</div>`; return; }
      $('#mmPeople').innerHTML=people.map(p=>`
        <div class="mm-person ${p.id===curId?'on':''}" data-id="${p.id}">
          <div class="av" style="background-image:url('${p.av}')"><span class="dash"></span></div>
          <span class="nm">${esc(p.nm)}</span>
        </div>`).join('');
      root.querySelectorAll('.mm-person').forEach(el=>el.addEventListener('click', async ()=>{
        curId=isNaN(+el.dataset.id)?el.dataset.id:+el.dataset.id; curLevel='all'; await loadMems(curId); renderAll();
      }));
    }
    function renderLevels(){
      let h=`<div class="mm-lv ${curLevel==='all'?'on':''}" data-lv="all">全部</div>`;
      h+=LEVELS.map(l=>`<div class="mm-lv ${curLevel===l.id?'on':''}" data-lv="${l.id}"><span class="pip" style="background:${l.color}"></span>${l.name}</div>`).join('');
      $('#mmLevels').innerHTML=h;
      root.querySelectorAll('.mm-lv').forEach(el=>el.addEventListener('click',()=>{ curLevel=el.dataset.lv; renderList(); }));
    }
    function curMems(){ return memMap[curId]||[]; }
    function visibleMems(){ const all=curMems(); return curLevel==='all'?all:all.filter(m=>m.lv===curLevel); }
    async function renderList(){
      renderLevels();
      const cur=people.find(p=>p.id===curId);
      if(!cur){ $('#mmCount').textContent=''; $('#mmList').innerHTML=`<div class="mm-empty">选一个联系人看看 ta 的记忆</div>`; return; }
      const meta=await getMeta(curId); const {list}=await getLog(curId);
      const { summed, unsummed }=splitSummed(list, meta.summedTs);
      $('#mmCount').innerHTML=`${esc(cur.nm)} · 共 ${curMems().length} 段记忆<br>对话共 ${list.length} 条 · 已总结 ${summed} 条 · 未总结 ${unsummed} 条${meta.autoEvery?` · 每满 ${meta.autoEvery} 条提醒调取`:''}`;
      const mems=visibleMems();
      if(!mems.length){ $('#mmList').innerHTML=`<div class="mm-empty">这里还空着<br>点右下角 ＋ 记下第一段</div>`; return; }
      $('#mmList').innerHTML=mems.map(m=>{ const l=lvOf(m.lv); const term=m.term==='short'?'短期':'长期';
        return `<div class="mem" data-id="${m.id}">
          <span class="pin"></span>
          <div class="mtop">
            <span class="mtag" style="background:${l.color}">${l.name}</span>
            <span class="mterm">${term}</span>
            <span class="mdate">${m.date||''}</span>
            <span class="mtools">
              <span data-act="edit"><svg viewBox="0 0 24 24"><path class="ln" d="M12 20h9"/><path class="ln" d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg></span>
              <span data-act="del"><svg viewBox="0 0 24 24"><path class="ln" d="M5 6h14M9 6V4.5h6V6M7 6l.8 13a1.5 1.5 0 001.5 1.4h5.4a1.5 1.5 0 001.5-1.4L17 6"/></svg></span>
            </span>
          </div>
          <div class="mtext">${esc(m.text)}</div>
        </div>`;
      }).join('');
      root.querySelectorAll('.mem').forEach(el=>{
        const m=curMems().find(x=>x.id==el.dataset.id);
        el.querySelector('[data-act="del"]').addEventListener('click',()=>{ memMap[curId]=curMems().filter(x=>x!==m); saveMems(curId); renderList(); });
        el.querySelector('[data-act="edit"]').addEventListener('click',()=>openModal(m));
      });
    }
    function renderAll(){ renderPeople(); renderList(); }

    function renderPick(){
      $('#mmPick').innerHTML=LEVELS.map(l=>`<b data-lv="${l.id}" class="${l.id===pickLv?'on':''}"><span class="pip" style="background:${l.color}"></span>${l.name}</b>`).join('');
      root.querySelectorAll('#mmPick b').forEach(b=>b.addEventListener('click',()=>{ pickLv=b.dataset.lv; renderPick(); }));
      $('#mmTermPick').innerHTML=[['long','长期'],['short','短期']].map(([v,n])=>`<b data-term="${v}" class="${v===pickTerm?'on':''}">${n}</b>`).join('');
      root.querySelectorAll('#mmTermPick b').forEach(b=>b.addEventListener('click',()=>{ pickTerm=b.dataset.term; renderPick(); }));
    }
    function openModal(mem){
      const cur=people.find(p=>p.id===curId); if(!cur) return;
      editing=mem||null; pickLv=mem?mem.lv:'daily'; pickTerm=mem?(mem.term||'long'):'long';
      $('#mmSheetTitle').textContent=mem?'编辑记忆':'添加记忆';
      $('#mmSheetSub').textContent=`为 ${cur.nm} ${mem?'修改这一段':'记下一段'}`;
      $('#mmTa').value=mem?mem.text:'';
      renderPick(); $('#mmModal').classList.add('show'); setTimeout(()=>$('#mmTa').focus(),100);
    }
    $('#mmFab').addEventListener('click',()=>{ if(curId!=null) openModal(null); });
    $('#mmCancel').addEventListener('click',()=>$('#mmModal').classList.remove('show'));
    $('#mmModal').addEventListener('click',e=>{ if(e.target===$('#mmModal')) $('#mmModal').classList.remove('show'); });
    $('#mmSave').addEventListener('click',()=>{
      const text=$('#mmTa').value.trim(); if(!text){ $('#mmTa').focus(); return; }
      const d=new Date(); const date=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
      memMap[curId]=memMap[curId]||[];
      if(editing){ editing.text=text; editing.lv=pickLv; editing.term=pickTerm; } else { memMap[curId].unshift({id:Date.now(),lv:pickLv,term:pickTerm,text,date}); }
      saveMems(curId); $('#mmModal').classList.remove('show'); renderList();
    });

    /* 总结弹窗 */
    async function openSum(){
      const cur=people.find(p=>p.id===curId); if(!cur){ toast('先选一个联系人'); return; }
      const meta=await getMeta(curId); const {list}=await getLog(curId);
      const { summed }=splitSummed(list, meta.summedTs);
      $('#mmSumSub').textContent=`整理 ${cur.nm} 的对话为长期/短期记忆`;
      $('#mmSumNote').innerHTML=`当前共 <b>${list.length}</b> 条对话 · 已总结 <b>${summed}</b> 条`;
      $('#mmSumFrom').value=summed+1;
      $('#mmSumTo').value=list.length;
      $('#mmSumAuto').value=meta.autoEvery||0;
      $('#mmSumModal').classList.add('show');
    }
    $('[data-sum]').addEventListener('click', openSum);
    $('#mmSumClose').addEventListener('click',()=>$('#mmSumModal').classList.remove('show'));
    $('#mmSumModal').addEventListener('click',e=>{ if(e.target===$('#mmSumModal')) $('#mmSumModal').classList.remove('show'); });
    $('#mmSumRun').addEventListener('click', async ()=>{
      const from=parseInt($('#mmSumFrom').value)||1, to=parseInt($('#mmSumTo').value)||1;
      toast('总结中…请稍候');
      busyPill(true);
      try{ const r=await summarize(curId, from, to); await loadMems(curId); renderList(); openSum(); toast(`已总结 ${r.added} 条记忆`); }
      catch(e){ toast('总结失败：'+(e.message||e)); }
      finally{ busyPill(false); }
    });
    $('#mmSumSaveAuto').addEventListener('click', async ()=>{
      const n=parseInt($('#mmSumAuto').value)||0;
      const meta=await getMeta(curId); meta.autoEvery=n; await setMeta(curId, meta);
      renderList(); toast(n?`已设置每攒满 ${n} 条提醒调取`:'已关闭提醒调取');
    });

    /* 总结提示词管理 */
    async function renderSumPrompts(){
      const sel=await getSumSel(); const arr=await getSumPrompts();
      let h=`<div class="pp-it ${sel==='locked'?'on':''}">
        <span class="pp-nm" data-view="locked">默认提示词 <span class="lk">· 锁定·点开查看</span></span>
        <span class="pp-ck" data-sel="locked"></span></div>`;
      h+=arr.map(p=>`<div class="pp-it ${sel===p.id?'on':''}">
        <span class="pp-nm" data-edit="${p.id}">${esc(p.name)}</span>
        <span class="pp-op" data-edit="${p.id}">改</span>
        <span class="pp-op del" data-del="${p.id}">删</span>
        <span class="pp-ck" data-sel="${p.id}"></span></div>`).join('');
      $('#mmPromptList').innerHTML=h;
    }
    $('#mmPromptManage').addEventListener('click', async ()=>{ await renderSumPrompts(); $('#mmPromptModal').classList.add('show'); });
    $('#mmPromptClose').addEventListener('click', ()=>$('#mmPromptModal').classList.remove('show'));
    $('#mmPromptModal').addEventListener('click', e=>{ if(e.target===$('#mmPromptModal')) $('#mmPromptModal').classList.remove('show'); });
    $('#mmPromptList').addEventListener('click', async e=>{
      const selBtn=e.target.closest('[data-sel]');
      if(selBtn){ await setSumSel(selBtn.dataset.sel); await renderSumPrompts(); toast('已切换总结提示词'); return; }
      const del=e.target.closest('[data-del]');
      if(del){ const arr=(await getSumPrompts()).filter(x=>x.id!==del.dataset.del); await setSumPrompts(arr); if((await getSumSel())===del.dataset.del) await setSumSel('locked'); await renderSumPrompts(); return; }
      const view=e.target.closest('[data-view]');
      if(view){ openPE('locked'); return; }
      const edit=e.target.closest('[data-edit]');
      if(edit){ openPE(edit.dataset.edit); return; }
    });
    let _peId=null;
    async function openPE(id){
      _peId=id||null;
      if(id==='locked'){
        $('#mmPETitle').textContent='默认提示词（只读）';
        $('#mmPESub').textContent='默认提示词已锁定，仅供查看，不能修改';
        $('#mmPEName').value='默认提示词'; $('#mmPEName').readOnly=true;
        $('#mmPEContent').value=SUMMARY_PROMPT('CHAR'); $('#mmPEContent').readOnly=true;
        $('#mmPESave').style.display='none';
      }else{
        const arr=await getSumPrompts(); const p=arr.find(x=>x.id===id);
        $('#mmPETitle').textContent=p?'编辑提示词':'新增提示词';
        $('#mmPESub').textContent='启用后总结时用它替换默认（可写 CHAR / USER 指代双方）';
        $('#mmPEName').value=p?p.name:''; $('#mmPEName').readOnly=false;
        $('#mmPEContent').value=p?p.content:''; $('#mmPEContent').readOnly=false;
        $('#mmPESave').style.display='';
      }
      $('#mmPEModal').classList.add('show');
    }
    $('#mmPromptAdd').addEventListener('click', ()=>openPE(null));
    $('#mmPECancel').addEventListener('click', ()=>$('#mmPEModal').classList.remove('show'));
    $('#mmPEModal').addEventListener('click', e=>{ if(e.target===$('#mmPEModal')) $('#mmPEModal').classList.remove('show'); });
    $('#mmPESave').addEventListener('click', async ()=>{
      const name=$('#mmPEName').value.trim(); const content=$('#mmPEContent').value;
      if(!name){ $('#mmPEName').focus(); return; }
      const arr=await getSumPrompts();
      if(_peId){ const p=arr.find(x=>x.id===_peId); if(p){ p.name=name; p.content=content; } await setSumPrompts(arr); }
      else { const id='sp_'+Date.now().toString(36); arr.push({id,name,content}); await setSumPrompts(arr); await setSumSel(id); }
      $('#mmPEModal').classList.remove('show'); await renderSumPrompts();
    });

    const statusBar=document.getElementById('hsStatusBar');
    async function open(){ root.classList.add('open'); if(statusBar) statusBar.classList.add('hs-on-light'); await loadPeople(); if(people.length && curId==null){ curId=people[0].id; await loadMems(curId); } renderAll(); }
    function close(){ root.classList.remove('open'); if(statusBar) statusBar.classList.remove('hs-on-light'); }
    $('[data-close]').addEventListener('click', close);

    window.HSMemory={ open, close, getForPrompt, summarize, getMeta, setMeta, maybeAutoSummarize,
      _refresh:(id)=>{ if(root.classList.contains('open') && id===curId){ loadMems(id).then(renderList); } } };

    const homeRoot=document.getElementById('homeScreen');
    document.addEventListener('click',(e)=>{
      const tile=e.target.closest('.hs-tile'); if(!tile) return;
      if(homeRoot && homeRoot.classList.contains('edit')) return;
      const cap=tile.querySelector('.hs-tile-cap');
      if(cap && cap.textContent.trim()==='Memory') open();
    });

    console.log('[memory] 记忆库已就绪');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
