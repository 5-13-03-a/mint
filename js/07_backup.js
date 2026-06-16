/* js/backup.js —— 「把回忆收进口袋」备份软件（回忆手账风·纯黑白）
   真实备份：导出/导入聊天库(HomeChatDB)与接口库(HomeApiDB)为单个 .json。
   打开：点主屏「Backup」图标，或 window.HSBackup.open()。 */
(function () {
  const CSS = `
  #bkApp{position:fixed;inset:0;z-index:999999;display:none;flex-direction:column;overflow:hidden;
    font-family:"PingFang SC","PingFang TC",-apple-system,sans-serif;color:#1a1a1a;background:#fcfcfc;
    --ink:#1a1a1a;--ink2:#a8a8a8;--line:#ececec;--ease:cubic-bezier(.2,.8,.25,1);}
  #bkApp.open{display:flex;animation:bkIn .3s var(--ease) both;}
  @keyframes bkIn{from{opacity:0;}to{opacity:1;}}
  #bkApp .ln{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
  #bkApp .bk-tex{position:absolute;inset:0;pointer-events:none;z-index:0;
    background-image:repeating-linear-gradient(transparent 0 35px,#f4f4f4 35px 36px);opacity:.7;}
  #bkApp>*{position:relative;z-index:1;}

  #bkApp .bk-head{flex-shrink:0;padding:64px 28px 8px;transition: padding-top 0.3s ease;}
  body.is-fullscreen #bkApp .bk-head{padding-top:114px;}
  #bkApp .bk-head .x{position:absolute;top:60px;right:24px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink);transition: top 0.3s ease;z-index:10;}
  body.is-fullscreen #bkApp .bk-head .x{top:110px;}
  #bkApp .bk-head .eyebrow{font-size:9px;letter-spacing:4px;text-transform:uppercase;color:var(--ink2);}
  #bkApp .bk-head h1{font-size:33px;font-weight:800;letter-spacing:-.5px;margin-top:8px;line-height:1.1;}
  #bkApp .bk-head h1 .hb{font-weight:300;font-style:italic;}
  #bkApp .bk-head .pulse{margin-top:14px;color:var(--ink);}
  #bkApp .bk-head .pulse svg{width:130px;height:22px;}

  #bkApp .bk-body{flex:1;overflow-y:auto;padding:22px 24px 44px;}
  #bkApp .bk-body::-webkit-scrollbar{display:none;}

  #bkApp .polaroid{background:#fff;border:1px solid var(--line);border-radius:4px;padding:14px 14px 16px;box-shadow:0 6px 22px rgba(0,0,0,.07);margin-bottom:30px;}
  #bkApp .polaroid .frame{background:var(--ink);border-radius:2px;height:96px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
  #bkApp .polaroid .frame .heart{color:#fff;}
  #bkApp .polaroid .frame .heart svg{width:42px;height:42px;}
  #bkApp .polaroid .frame .corner{position:absolute;width:14px;height:14px;border:2px solid rgba(255,255,255,.25);}
  #bkApp .polaroid .frame .c1{top:9px;left:9px;border-right:none;border-bottom:none;}
  #bkApp .polaroid .frame .c2{bottom:9px;right:9px;border-left:none;border-top:none;}
  #bkApp .polaroid .cap{display:flex;align-items:flex-end;justify-content:space-between;padding:14px 4px 2px;}
  #bkApp .polaroid .cap .hw{font-size:15px;font-weight:700;font-style:italic;}
  #bkApp .polaroid .cap .dt{font-size:9px;color:var(--ink2);letter-spacing:1px;}
  #bkApp .polaroid .nums{display:flex;margin-top:14px;border-top:1px dashed var(--line);padding-top:14px;}
  #bkApp .polaroid .nums .it{flex:1;text-align:center;position:relative;}
  #bkApp .polaroid .nums .it+.it::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:1px;background:var(--line);}
  #bkApp .polaroid .nums .n{font-size:20px;font-weight:800;}
  #bkApp .polaroid .nums .l{font-size:8.5px;color:var(--ink2);letter-spacing:1px;margin-top:3px;}

  #bkApp .sec{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--ink2);margin:0 2px 16px;display:flex;align-items:center;gap:8px;}
  #bkApp .sec::after{content:"";flex:1;height:1px;background:var(--line);}

  #bkApp .letter{background:#fff;border:1px solid var(--line);border-radius:3px;padding:20px;margin-bottom:16px;position:relative;box-shadow:0 4px 16px rgba(0,0,0,.05);}
  #bkApp .letter .no{position:absolute;top:16px;right:18px;font-size:10px;font-weight:700;color:var(--ink2);font-style:italic;}
  #bkApp .letter .lh{display:flex;align-items:center;gap:11px;margin-bottom:8px;}
  #bkApp .letter .lh .ic{width:34px;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--ink);}
  #bkApp .letter .lh .ic svg{width:22px;height:22px;}
  #bkApp .letter .lt{font-size:16px;font-weight:700;}
  #bkApp .letter .ld{font-size:11px;color:var(--ink2);line-height:1.7;margin:4px 0 16px;}
  #bkApp .letter .btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;border-radius:2px;transition:transform .12s var(--ease);}
  #bkApp .letter .btn:active{transform:scale(.98);}
  #bkApp .letter .btn.solid{background:var(--ink);color:#fff;border:1.5px solid var(--ink);}
  #bkApp .letter .btn.ghost{background:#fff;border:1.5px solid var(--ink);color:var(--ink);}
  #bkApp .letter .btn svg{width:16px;height:16px;}
  #bkApp .letter .stub{margin-top:11px;padding-top:11px;border-top:1px dashed var(--line);font-size:9.5px;color:var(--ink2);text-align:center;letter-spacing:1px;}

  #bkApp .toast{position:absolute;left:50%;bottom:42px;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;font-size:12px;padding:11px 22px;border-radius:2px;opacity:0;transition:all .26s var(--ease);pointer-events:none;z-index:10;box-shadow:0 8px 24px rgba(0,0,0,.25);}
  #bkApp .toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

  #bkApp .foot{text-align:center;font-size:10px;color:var(--ink2);margin-top:26px;line-height:1.9;font-style:italic;}
  `;

  const HTML = `
    <div class="bk-tex"></div>
    <div class="bk-head">
      <div class="x" data-close><svg width="18" height="18" viewBox="0 0 24 24"><path class="ln" d="M6 6l12 12M18 6L6 18"/></svg></div>
      <div class="eyebrow">Keep · Every · Moment</div>
      <h1>把回忆<br><span class="hb">收进口袋</span></h1>
      <div class="pulse">
        <svg viewBox="0 0 130 22"><path class="ln" d="M0 11h28l4-7 5 14 4-7h12l3-4 4 8 3-4h10l4-6 5 12 4-6h31"/></svg>
      </div>
    </div>
    <div class="bk-body">
      <div class="polaroid">
        <div class="frame">
          <span class="corner c1"></span><span class="corner c2"></span>
          <span class="heart"><svg viewBox="0 0 24 24"><path class="ln" d="M12 20.3l-1.4-1.3C5.4 14.4 2 11.3 2 7.6 2 4.8 4.2 2.7 7 2.7c1.6 0 3.1.7 4 1.9.9-1.2 2.4-1.9 4-1.9 2.8 0 5 2.1 5 4.9 0 3.7-3.4 6.8-8.6 11.5L12 20.3z"/></svg></span>
        </div>
        <div class="cap">
          <span class="hw">our little world</span>
          <span class="dt" id="bkDate">2026.06</span>
        </div>
        <div class="nums">
          <div class="it"><div class="n" id="bkN1">0</div><div class="l">联系人</div></div>
          <div class="it"><div class="n" id="bkN2">0</div><div class="l">消息</div></div>
          <div class="it"><div class="n" id="bkN3">0</div><div class="l">接口</div></div>
        </div>
      </div>

      <div class="sec">收纳与取回</div>

      <div class="letter">
        <span class="no">No.01</span>
        <div class="lh">
          <span class="ic"><svg viewBox="0 0 24 24"><path class="ln" d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z"/><path class="ln" d="M4.5 6l7.5 6 7.5-6"/></svg></span>
          <div><div class="lt">封存回忆</div></div>
        </div>
        <div class="ld">把所有联系人、聊天记录、人设、提示词和接口设置，写进一封信，妥帖存好。</div>
        <button class="btn solid" id="bkExport"><svg viewBox="0 0 24 24"><path class="ln" d="M12 3v12M8 11l4 4 4-4"/><path class="ln" d="M4 17v2a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2"/></svg>导出备份</button>
        <div class="stub">✶ 生成一份 backup.json ✶</div>
      </div>

      <div class="letter">
        <span class="no">No.02</span>
        <div class="lh">
          <span class="ic"><svg viewBox="0 0 24 24"><path class="ln" d="M5 5.5h9l5 5v8A1.5 1.5 0 0 1 17.5 20h-12A1.5 1.5 0 0 1 4 18.5V7A1.5 1.5 0 0 1 5 5.5z"/><path class="ln" d="M14 5.5V10h5"/><path class="ln" d="M9 14.5l2 2 4-4"/></svg></span>
          <div><div class="lt">拆开重温</div></div>
        </div>
        <div class="ld">选一封从前存下的信，把里面的一切轻轻倒回来。注意：会覆盖此刻的数据。</div>
        <button class="btn ghost" id="bkImport"><svg viewBox="0 0 24 24"><path class="ln" d="M12 21V9M8 13l4-4 4 4"/><path class="ln" d="M4 7V5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 5v2"/></svg>导入备份</button>
        <input type="file" id="bkFile" accept=".json,application/json" hidden>
        <div class="stub">✶ 倒回后请重开聊天 ✶</div>
      </div>

      <div class="foot">每一句话都值得被好好收着 ♡</div>
    </div>
    <div class="toast" id="bkToast"></div>
  `;

  /* 读取整个 DB（所有 store） */
  function dumpDB(name){
    return new Promise(resolve=>{
      let r;
      try{ r=indexedDB.open(name); }catch{ resolve({stores:{}}); return; }
      r.onsuccess=e=>{
        const db=e.target.result; const stores=Array.from(db.objectStoreNames);
        if(!stores.length){ db.close(); resolve({stores:{}}); return; }
        const out={}; const tx=db.transaction(stores,'readonly'); let left=stores.length;
        stores.forEach(sn=>{
          const os=tx.objectStore(sn); const keyPath=os.keyPath;
          const gv=os.getAll(), gk=os.getAllKeys(); let vals=null, keys=null;
          const done=()=>{ if(vals!==null&&keys!==null){ out[sn]={keyPath,items:vals.map((v,i)=>({key:keys[i],value:v}))}; if(--left===0){ db.close(); resolve({stores:out}); } } };
          gv.onsuccess=()=>{ vals=gv.result; done(); }; gv.onerror=()=>{ vals=[]; done(); };
          gk.onsuccess=()=>{ keys=gk.result; done(); }; gk.onerror=()=>{ keys=[]; done(); };
        });
      };
      r.onerror=()=>resolve({stores:{}});
    });
  }
  /* 写回某个 DB（清空后写入），缺失的 store 自动跳过 */
  function restoreDB(name, dump){
    return new Promise(resolve=>{
      if(!dump||!dump.stores){ resolve(); return; }
      let r;
      try{ r=indexedDB.open(name); }catch{ resolve(); return; }
      r.onsuccess=e=>{
        const db=e.target.result; const names=Object.keys(dump.stores).filter(n=>db.objectStoreNames.contains(n));
        if(!names.length){ db.close(); resolve(); return; }
        const tx=db.transaction(names,'readwrite');
        names.forEach(sn=>{
          const os=tx.objectStore(sn); os.clear();
          (dump.stores[sn].items||[]).forEach(it=>{ try{ os.keyPath!=null ? os.put(it.value) : os.put(it.value, it.key); }catch(_){}});
        });
        tx.oncomplete=()=>{ db.close(); resolve(); };
        tx.onerror=()=>{ db.close(); resolve(); };
      };
      r.onerror=()=>resolve();
    });
  }

  function init(){
    const style=document.createElement('style'); style.textContent=CSS; document.head.appendChild(style);
    const homeRoot=document.getElementById('homeScreen');
    const root=document.createElement('div'); root.id='bkApp'; root.innerHTML=HTML;
    document.body.appendChild(root);
    const $=s=>root.querySelector(s);

    function toast(msg){ const t=$('#bkToast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._tm); t._tm=setTimeout(()=>t.classList.remove('show'),2200); }

    async function refreshStats(){
      const chat=await dumpDB('HomeChatDB');
      let contacts=0,msgs=0;
      const kv=chat.stores.kv;
      if(kv){ const g=kv.items.find(it=>it.key==='groups'); if(g && Array.isArray(g.value)){ g.value.forEach(grp=>{ (grp.members||[]).forEach(m=>{ contacts++; msgs+=(m.log||[]).length; }); }); } }
      const api=await dumpDB('HomeApiDB');
      const conns=(api.stores.conns && api.stores.conns.items.length)||0;
      $('#bkN1').textContent=contacts; $('#bkN2').textContent=msgs; $('#bkN3').textContent=conns;
      const d=new Date(); $('#bkDate').textContent=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}`;
    }

    $('#bkExport').addEventListener('click', async ()=>{
      toast('正在封存…');
      const payload={ _app:'memory-jar', _ver:1, _time:new Date().toISOString(),
        HomeChatDB: await dumpDB('HomeChatDB'), HomeApiDB: await dumpDB('HomeApiDB') };
      const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a');
      const d=new Date(); const stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      a.href=url; a.download=`backup-${stamp}.json`; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast('已经替你收好了 ♡');
    });

    const fileInput=$('#bkFile');
    $('#bkImport').addEventListener('click', ()=> fileInput.click());
    fileInput.addEventListener('change', async e=>{
      const f=e.target.files[0]; if(!f) return; e.target.value='';
      try{
        const data=JSON.parse(await f.text());
        if(data._app!=='memory-jar'){ toast('这不是备份文件'); return; }
        toast('正在拆开…');
        await restoreDB('HomeChatDB', data.HomeChatDB);
        await restoreDB('HomeApiDB', data.HomeApiDB);
        await refreshStats();
        toast('恢复完成，重开聊天看看 ♡');
      }catch(err){ toast('读取失败：'+(err.message||'文件损坏')); }
    });

    const statusBar=document.getElementById('hsStatusBar');
    function open(){ root.classList.add('open'); if(statusBar) statusBar.classList.add('hs-on-light'); refreshStats(); }
    function close(){ root.classList.remove('open'); if(statusBar) statusBar.classList.remove('hs-on-light'); }
    $('[data-close]').addEventListener('click', close);
    window.HSBackup={open,close};

    document.addEventListener('click',(e)=>{
      const tile=e.target.closest('.hs-tile'); if(!tile) return;
      if(homeRoot && homeRoot.classList.contains('edit')) return;
      const cap=tile.querySelector('.hs-tile-cap');
      if(cap && cap.textContent.trim()==='Backup') open();
    });

    console.log('[backup] 备份已就绪，点「Backup」图标或 HSBackup.open() 打开');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
