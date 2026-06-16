/* js/components/9.api.js —— 全屏「API 小本本」手账风（样式+结构+逻辑全内置）
   功能：增删连接、真实拉取模型、本地存储、双主题切换。
   打开：点主屏「API」图标，或 window.HSApi.open()。
   注意：拉取模型会向你填写的接口地址发送密钥（Bearer），仅发往你自己配置的地址。 */
(function () {
  const CSS = `
  .hs-api { position:fixed; inset:0; z-index:999999; display:none; flex-direction:column; overflow:hidden;
    font-family:"PingFang SC","PingFang TC",-apple-system,sans-serif; transition:background .35s ease,color .35s ease;
    --ease:cubic-bezier(.2,.8,.25,1);
    --ink:#5c6066; --ink2:#9aa0a6; --bg:#fbfcfd; --dot:rgba(150,160,175,.08);
    --tape:rgba(198,212,224,.5); --tape2:rgba(204,216,226,.55);
    --note:#fcfbf2; --note-bd:#f0eee2; --note-clip:rgba(200,222,210,.5);
    --dot-live:#88c39c; --dot-ring:rgba(136,195,156,.25);
    --card-bd:#dde2e8; --ic-bg:#f2f4f7; --ic-bd:#e7eaef;
    --pin-bg:#f2f4f7; --pin-live-bg:#dcefe3; --pin-live-tx:#5a9070;
    --ic-live-bg:#e6f3ec; --ic-live-bd:#cce4d5;
    --line-dot:#d3d9e0; --line-focus:#a8c6b4; --del:#bd8a82;
    --sheet:#eef4fb; --sheet-bd:#d6e4f2; --svg-gray:0;
    color:var(--ink); background:var(--bg);
    background-image:radial-gradient(circle, var(--dot) 1px, transparent 1.4px); background-size:18px 18px; }
  .hs-api.hs-open { display:flex; animation:hs-api-in .28s var(--ease) both; }
  .hs-api.hs-closing { animation:hs-api-out .22s var(--ease) both; }
  @keyframes hs-api-in { from{opacity:0; transform:scale(.96);} to{opacity:1; transform:scale(1);} }
  @keyframes hs-api-out { from{opacity:1; transform:scale(1);} to{opacity:0; transform:scale(.97);} }
  .hs-api.mono {
    --ink:#3a3a3c; --ink2:#9a9a9e; --bg:#fcfcfc; --dot:rgba(0,0,0,.05);
    --tape:rgba(0,0,0,.08); --tape2:rgba(0,0,0,.07);
    --note:#f4f4f4; --note-bd:#ebebeb; --note-clip:rgba(0,0,0,.07);
    --dot-live:#4a4a4c; --dot-ring:rgba(0,0,0,.06);
    --card-bd:#dcdcdc; --ic-bg:#f0f0f0; --ic-bd:#e6e6e6;
    --pin-bg:#f0f0f0; --pin-live-bg:#3a3a3c; --pin-live-tx:#fff;
    --ic-live-bg:#e4e4e4; --ic-live-bd:#d4d4d4;
    --line-dot:#cfcfcf; --line-focus:#7a7a7c; --del:#9a9a9e;
    --sheet:#f0f0f0; --sheet-bd:#dcdcdc; --svg-gray:1; }

  .hs-api .head { flex-shrink:0; position:relative; padding:106px 24px 8px; transition: padding-top 0.3s ease; }
  body.is-fullscreen .hs-api .head { padding-top: 156px; }
  .hs-api .tape { position:absolute; top:100px; left:50%; transform:translateX(-50%) rotate(-2.5deg); width:120px; height:26px; background:var(--tape); box-shadow:0 1px 3px rgba(0,0,0,.05); transition: top 0.3s ease; z-index: 5; }
  body.is-fullscreen .hs-api .tape { top: 150px; }
  .hs-api .tape::after { content:""; position:absolute; inset:0; background:repeating-linear-gradient(90deg, transparent 0 6px, rgba(255,255,255,.4) 6px 7px); }
  .hs-api h1 { font-size:27px; font-weight:800; transform:rotate(-1deg); }
  .hs-api .sub { font-size:11px; color:var(--ink2); margin-top:4px; transform:rotate(-1deg); }
  .hs-api .ctrl { position:absolute; top:104px; right:20px; display:flex; align-items:center; gap:8px; transition: top 0.3s ease; z-index: 10; }
  body.is-fullscreen .hs-api .ctrl { top: 154px; }
  .hs-api .theme-sw { display:flex; gap:4px; padding:3px; border-radius:11px; background:rgba(0,0,0,.05); transform:rotate(4deg); }
  .hs-api .theme-sw button { width:22px; height:22px; border-radius:8px; border:1.5px solid transparent; cursor:pointer; padding:0; }
  .hs-api .b-soft { background:linear-gradient(135deg,#cfe3d6,#cdd8e6,#f0e8d2); }
  .hs-api .b-mono { background:linear-gradient(135deg,#3a3a3c,#cfcfcf); }
  .hs-api:not(.mono) .b-soft { border-color:var(--ink); }
  .hs-api.mono .b-mono { border-color:var(--ink); }
  .hs-api .x { width:34px; height:34px; border:2px solid var(--ink); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; cursor:pointer; transform:rotate(6deg); background:#fff; color:var(--ink); }

  .hs-api .now { margin:14px 22px 4px; position:relative; }
  .hs-api .now .note { background:var(--note); padding:14px 16px; border-radius:3px; box-shadow:1px 2px 8px rgba(0,0,0,.08); transform:rotate(-1.2deg); position:relative; border:1px solid var(--note-bd); transition:background .35s ease; }
  .hs-api .now .note::before { content:""; position:absolute; top:-9px; left:50%; transform:translateX(-50%) rotate(3deg); width:70px; height:20px; background:var(--note-clip); box-shadow:0 1px 2px rgba(0,0,0,.05); }
  .hs-api .now .row { display:flex; align-items:center; gap:8px; }
  .hs-api .now .dot { width:9px; height:9px; border-radius:50%; background:var(--dot-live); flex-shrink:0; box-shadow:0 0 0 3px var(--dot-ring); }
  .hs-api .now .t { font-size:13px; font-weight:700; }
  .hs-api .now .s { font-size:11px; color:var(--ink2); margin-top:4px; }
  .hs-api .now .heart { position:absolute; right:-4px; bottom:-8px; font-size:18px; transform:rotate(12deg); }

  .hs-api .scroll { flex:1; overflow-y:auto; padding:18px 22px 26px; }
  .hs-api .scroll::-webkit-scrollbar { display:none; }
  .hs-api .label { font-size:12px; font-weight:700; margin:8px 4px 16px; display:flex; align-items:center; gap:8px; transform:rotate(-.6deg); }
  .hs-api .label .add { margin-left:auto; font-size:11px; font-weight:600; border:1.5px dashed var(--ink2); border-radius:10px; padding:4px 11px; cursor:pointer; background:#fff; transform:rotate(1.5deg); color:var(--ink); }

  .hs-api .conn { position:relative; background:#fff; border-radius:5px; margin-bottom:18px; padding:2px; box-shadow:1px 2px 10px rgba(0,0,0,.08); }
  .hs-api .conn:nth-child(odd) { transform:rotate(-.8deg); }
  .hs-api .conn:nth-child(even) { transform:rotate(.7deg); }
  .hs-api .conn.open { z-index:50; }
  .hs-api .conn .inner { border:1.5px dashed var(--card-bd); border-radius:4px; }
  .hs-api .conn .tape2 { position:absolute; top:-8px; left:18px; width:54px; height:18px; background:var(--tape2); transform:rotate(-6deg); box-shadow:0 1px 2px rgba(0,0,0,.05); z-index:2; }
  .hs-api .conn .hd { display:flex; align-items:center; gap:12px; padding:14px 14px; cursor:pointer; }
  .hs-api .badge-ic { width:40px; height:40px; flex-shrink:0; border-radius:50%; background:var(--ic-bg); display:flex; align-items:center; justify-content:center; border:1.5px solid var(--ic-bd); }
  .hs-api .badge-ic svg { width:22px; height:22px; filter:grayscale(var(--svg-gray)); transition:filter .35s ease; }
  .hs-api .badge-ic .paw { font-size:20px; filter:grayscale(1); }
  .hs-api .conn .nm { display:flex; flex-direction:column; min-width:0; }
  .hs-api .conn .nm .t { font-size:15px; font-weight:700; }
  .hs-api .conn .nm .u { font-size:10.5px; color:var(--ink2); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:170px; }
  .hs-api .conn .pin { margin-left:auto; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; background:var(--pin-bg); color:var(--ink2); flex-shrink:0; cursor:pointer; }
  .hs-api .conn.live .pin { background:var(--pin-live-bg); color:var(--pin-live-tx); }
  .hs-api .conn.live .badge-ic { background:var(--ic-live-bg); border-color:var(--ic-live-bd); }

  .hs-api .conn .bd { display:none; padding:0 16px 18px; }
  .hs-api .conn.open .bd { display:block; animation:hs-bd-in .32s var(--ease) both; }
  @keyframes hs-bd-in { from{opacity:0; max-height:0; transform:translateY(-10px) scale(.96);} to{opacity:1; max-height:600px; transform:translateY(0) scale(1);} }
  .hs-api .conn { transition: transform .3s var(--ease), box-shadow .3s ease, opacity .3s ease, margin .3s ease; }
  .hs-api .conn:active { transform:scale(.97) !important; box-shadow:0 1px 4px rgba(0,0,0,.1) !important; }
  .hs-api .conn.open { transform:rotate(0deg) !important; box-shadow:2px 4px 18px rgba(0,0,0,.12); }
  .hs-api .conn.hs-adding { animation:hs-card-add .4s var(--ease) both; }
  @keyframes hs-card-add { from{opacity:0; transform:translateY(20px) scale(.9) rotate(0deg);} to{opacity:1; transform:translateY(0) scale(1);} }
  .hs-api .conn.hs-removing { animation:hs-card-rm .3s ease both; pointer-events:none; }
  @keyframes hs-card-rm { to{opacity:0; transform:translateX(-30px) scale(.9); max-height:0; margin-bottom:0; padding:0;} }
  .hs-api .pin { transition: background .25s ease, color .25s ease, transform .2s var(--ease); }
  .hs-api .pin:active { transform:scale(.88); }
  .hs-api .x { transition: transform .2s var(--ease), background .2s ease; }
  .hs-api .x:active { transform:rotate(6deg) scale(.82); background:#f0f0f0; }
  .hs-api .add { transition: transform .2s var(--ease), border-color .2s ease; }
  .hs-api .add:active { transform:rotate(1.5deg) scale(.9); }
  .hs-api .acts button { transition: transform .2s var(--ease), opacity .2s ease; }
  .hs-api .acts button:active { transform:scale(.9) !important; opacity:.7; }
  .hs-api .model-wrap.open .model-sheet { animation:hs-sheet-in .28s var(--ease) both; }
  @keyframes hs-sheet-in { from{opacity:0; transform:rotate(-.6deg) translateY(-8px) scale(.94);} to{opacity:1; transform:rotate(-.6deg) translateY(0) scale(1);} }
  .hs-api .hd { transition: background .2s ease; }
  .hs-api .hd:active { background:rgba(0,0,0,.03); }
  .hs-api .f { margin-top:14px; }
  .hs-api .f label { display:block; font-size:10px; color:var(--ink2); margin-bottom:6px; }
  .hs-api .f label::before { content:"✎ "; }
  .hs-api .f input { width:100%; padding:10px 12px; border:none; border-bottom:1.5px dotted var(--line-dot); font-size:13px; background:transparent; color:var(--ink); font-family:inherit; outline:none; }
  .hs-api .f input:focus { border-bottom-color:var(--line-focus); }
  .hs-api .r2 { display:flex; gap:14px; }
  .hs-api .r2 .f { flex:1; min-width:0; }

  .hs-api .model-wrap { position:relative; }
  .hs-api .model-pick { width:100%; padding:10px 12px; border:none; border-bottom:1.5px dotted var(--line-dot); font-size:13px; color:var(--ink); background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-family:inherit; }
  .hs-api .model-pick .cur { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .hs-api .model-pick .cur.empty { color:var(--ink2); font-weight:400; }
  .hs-api .model-pick .caret { font-size:10px; color:var(--ink2); transition:transform .2s ease; flex-shrink:0; margin-left:6px; }
  .hs-api .model-wrap.open .caret { transform:rotate(180deg); }
  .hs-api .model-sheet { display:none; position:absolute; top:calc(100% + 8px); left:-4px; right:-4px; z-index:100; padding:10px; background:var(--sheet); border:1.5px dashed var(--sheet-bd); border-radius:10px; transform:rotate(-.6deg); box-shadow:0 8px 22px rgba(0,0,0,.16); }
  .hs-api .model-wrap.open .model-sheet { display:block; animation:hs-fade .2s var(--ease); }
  .hs-api .model-sheet::before { content:""; position:absolute; top:-8px; right:20px; width:46px; height:16px; background:var(--tape2); transform:rotate(5deg); box-shadow:0 1px 2px rgba(0,0,0,.05); }
  .hs-api .model-sheet .sh-title { font-size:10px; color:var(--ink2); margin:2px 2px 8px; }
  .hs-api .model-sheet .sh-title::before { content:"✦ "; }
  .hs-api .model-list { max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; padding-right:2px; }
  .hs-api .model-list::-webkit-scrollbar { width:4px; }
  .hs-api .model-list::-webkit-scrollbar-thumb { background:var(--line-dot); border-radius:2px; }
  .hs-api .model-list .empty-tip { font-size:11px; color:var(--ink2); text-align:center; padding:14px 8px; line-height:1.7; }
  .hs-api .model-list button { text-align:left; padding:9px 12px; border:1.5px solid transparent; border-radius:8px; background:#fff; color:var(--ink); font-size:12.5px; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
  .hs-api .model-list button .tick { margin-left:auto; opacity:0; font-size:12px; }
  .hs-api .model-list button.on { border-color:var(--ink); font-weight:600; }
  .hs-api .model-list button.on .tick { opacity:1; }

  .hs-api .acts { display:flex; gap:10px; margin-top:18px; align-items:center; }
  .hs-api .acts button { font-family:inherit; cursor:pointer; }
  .hs-api .acts .pull { flex:1; padding:10px; border:1.5px solid var(--ink); border-radius:12px; background:#fff; font-size:12px; font-weight:600; color:var(--ink); transform:rotate(-1deg); }
  .hs-api .acts .save { flex:1; padding:10px; border:none; border-radius:12px; background:var(--ink); color:#fff; font-size:12px; font-weight:700; transform:rotate(1deg); }
  .hs-api .acts .del { font-size:11px; color:var(--del); background:none; border:none; text-decoration:underline dotted; }

  .hs-api .foot { text-align:center; font-size:11px; color:var(--ink2); margin-top:24px; line-height:2; transform:rotate(-.5deg); }
  .hs-api .homebar { flex-shrink:0; height:22px; display:flex; align-items:center; justify-content:center; }
  .hs-api .homebar::after { content:""; width:120px; height:5px; border-radius:3px; background:var(--ink); opacity:.25; }

  .hs-model-modal { position:fixed; inset:0; z-index:9999999; display:flex; align-items:flex-end; justify-content:center; }
  .hs-model-modal .mm-mask { position:absolute; inset:0; background:rgba(0,0,0,.35); animation:hs-mm-mask-in .2s ease both; }
  @keyframes hs-mm-mask-in { from{opacity:0;} to{opacity:1;} }
  .hs-model-modal .mm-sheet { position:relative; width:100%; max-width:400px; max-height:65vh; background:var(--bg); border-radius:18px 18px 0 0; padding:20px 16px 30px; display:flex; flex-direction:column; animation:hs-mm-up .3s var(--ease) both; box-shadow:0 -4px 30px rgba(0,0,0,.15); }
  @keyframes hs-mm-up { from{transform:translateY(100%);} to{transform:translateY(0);} }
  .hs-model-modal.closing .mm-mask { animation:hs-mm-mask-out .2s ease both; }
  .hs-model-modal.closing .mm-sheet { animation:hs-mm-down .25s ease both; }
  @keyframes hs-mm-mask-out { to{opacity:0;} }
  @keyframes hs-mm-down { to{transform:translateY(100%);} }
  .hs-model-modal .mm-bar { width:36px; height:4px; border-radius:2px; background:var(--line-dot); margin:0 auto 16px; flex-shrink:0; }
  .hs-model-modal .mm-title { font-size:15px; font-weight:700; margin-bottom:14px; color:var(--ink); }
  .hs-model-modal .mm-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px; }
  .hs-model-modal .mm-list::-webkit-scrollbar { width:3px; }
  .hs-model-modal .mm-list::-webkit-scrollbar-thumb { background:var(--line-dot); border-radius:2px; }
  .hs-model-modal .mm-list .mm-item { text-align:left; padding:12px 14px; border:1.5px solid transparent; border-radius:10px; background:#fff; color:var(--ink); font-size:13px; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; box-shadow:0 1px 4px rgba(0,0,0,.05); transition:border-color .15s ease, transform .15s ease; }
  .hs-model-modal .mm-list .mm-item:active { transform:scale(.97); }
  .hs-model-modal .mm-list .mm-item.on { border-color:var(--ink); font-weight:600; }
  .hs-model-modal .mm-list .mm-item .mm-tick { margin-left:auto; opacity:0; font-size:13px; }
  .hs-model-modal .mm-list .mm-item.on .mm-tick { opacity:1; }
  .hs-model-modal .mm-empty { font-size:12px; color:var(--ink2); text-align:center; padding:30px 10px; line-height:1.8; }
  `;

  /* 图标池 */
  const ICONS = {
    pawGray: '<span class="paw">🐾</span>',
    pawBlue: '<svg viewBox="0 0 24 24"><ellipse cx="7" cy="9" rx="1.6" ry="2.1" fill="#8fb8e8"/><ellipse cx="11" cy="7" rx="1.6" ry="2.1" fill="#8fb8e8"/><ellipse cx="15" cy="7.2" rx="1.6" ry="2.1" fill="#8fb8e8"/><ellipse cx="18.4" cy="9.4" rx="1.5" ry="2" fill="#8fb8e8"/><path d="M12.5 11c-2.6 0-4.6 1.9-4.6 4 0 1.7 1.4 2.7 3.2 2.7.9 0 1.4-.3 1.4-.3s.5.3 1.4.3c1.8 0 3.2-1 3.2-2.7 0-2.1-2-4-4.6-4z" fill="#aacdf0"/><circle cx="10.5" cy="14.5" r=".5" fill="#fff"/></svg>',
    flower: '<svg viewBox="0 0 24 24"><circle cx="12" cy="6.5" r="3" fill="#8fb8e8"/><circle cx="17" cy="10" r="3" fill="#8fb8e8"/><circle cx="15" cy="15.5" r="3" fill="#8fb8e8"/><circle cx="9" cy="15.5" r="3" fill="#8fb8e8"/><circle cx="7" cy="10" r="3" fill="#8fb8e8"/><circle cx="12" cy="11" r="3.2" fill="#cfe3f7"/></svg>',
    wrench: '<svg viewBox="0 0 24 24"><path d="M14.5 5.5a4 4 0 0 0-5 5l-4.2 4.2a1.8 1.8 0 1 0 2.5 2.5l4.2-4.2a4 4 0 0 0 5-5l-2.3 2.3-2.5-.3-.3-2.5z" fill="#9ec3e6" stroke="#6a9bc4" stroke-width="1.1" stroke-linejoin="round"/></svg>'
  };
  const ICON_POOL = ['pawBlue', 'flower', 'wrench'];

  /* IndexedDB */
  const DB = 'HomeApiDB', STORE = 'conns';
  function dbOpen() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = e => { const d = e.target.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = e => res(e.target.result);
      r.onerror = e => rej(e.target.error);
    });
  }
  async function dbAll() {
    const db = await dbOpen();
    return new Promise(res => { const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); tx.oncomplete = () => db.close(); });
  }
  async function dbPut(o) { const db = await dbOpen(); return new Promise(res => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(o); tx.oncomplete = () => { db.close(); res(); }; }); }
  async function dbDel(id) { const db = await dbOpen(); return new Promise(res => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id); tx.oncomplete = () => { db.close(); res(); }; }); }

  /* 拉取模型 */
  async function fetchModels(base, key) {
    const url = base.replace(/\/+$/, '') + '/models';
    const res = await fetch(url, { headers: key ? { 'Authorization': 'Bearer ' + key } : {} });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const arr = data.data || data.models || (Array.isArray(data) ? data : []);
    const list = arr.map(m => (typeof m === 'string' ? m : (m.id || m.name))).filter(Boolean);
    if (!list.length) throw new Error('空列表');
    return list;
  }

  const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const uid = () => 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const state = { conns: [], openId: null, modelOpenId: null };

  function init() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const homeRoot = document.getElementById('homeScreen');
    const root = document.createElement('div');
    root.className = 'hs-api';
    root.id = 'hsApi';
    root.innerHTML = `
      <div class="head">
        <span class="tape"></span>
        <h1>API设置</h1>
        <div class="sub">⋆｡˚ 내일도 별이 있을까? ˚｡⋆</div>
        <div class="ctrl">
          <div class="theme-sw"><button class="b-soft" data-theme="soft"></button><button class="b-mono" data-theme="mono"></button></div>
          <button class="x" type="button">✕</button>
        </div>
      </div>
      <div class="now" id="hsApiNow"></div>
      <div class="scroll"><div id="hsApiList"></div>
        <div class="foot">♡ 🦷 ♡<br>made with MINT</div>
      </div>
      <div class="homebar"></div>`;
    (homeRoot || document.body).appendChild(root);

    const nowEl = root.querySelector('#hsApiNow');
    const listEl = root.querySelector('#hsApiList');

    function syncInputs() {
      if (!state.openId) return;
      const card = listEl.querySelector('.conn.open');
      if (!card) return;
      const c = state.conns.find(x => x.id === state.openId);
      if (!c) return;
      const g = sel => card.querySelector(sel);
      c.name = g('[data-fn="name"]').value.trim() || '未命名';
      c.base = g('[data-fn="base"]').value.trim();
      c.key = g('[data-fn="key"]').value;
      c.temp = g('[data-fn="temp"]').value.trim();
    }

    function modelSheet(c) {
      const items = (c.models && c.models.length)
        ? c.models.map(m => `<button data-model="${esc(m)}" class="${m === c.model ? 'on' : ''}">${esc(m)}<span class="tick">✓</span></button>`).join('')
        : `<div class="empty-tip">还没有模型<br>点下面「拉取模型」获取 ！</div>`;
      return `<div class="model-sheet"><div class="sh-title">挑一个模型贴上去</div><div class="model-list">${items}</div></div>`;
    }

    function renderNow() {
      const a = state.conns.find(c => c.active);
      if (!a) { nowEl.innerHTML = `<div class="note"><div class="row"><span class="t">还没有在用的接口</span></div><div class="s">点下面任意卡片的标签设为「启用」𖧦</div><span class="heart">🤍</span></div>`; return; }
      nowEl.innerHTML = `<div class="note"><div class="row"><span class="dot"></span><span class="t">现在用 · ${esc(a.name)}</span></div><div class="s">${a.model ? esc(a.model) + ' · 已选好' : '还没选模型哦'} ♪♫</div><span class="heart">🤍</span></div>`;
    }

    function renderList() {
      if (!state.conns.length) {
        listEl.innerHTML = `<div class="label"><span>⚝</span>我的接口<span class="add" data-add>＋ 添加</span></div><div class="foot" style="margin-top:30px;">空的。<br>点「添加」加一个接口吧 ✎</div>`;
        return;
      }
      const cards = state.conns.map(c => {
        const open = c.id === state.openId;
        const mOpen = c.id === state.modelOpenId;
        return `<div class="conn ${c.active ? 'live' : ''} ${open ? 'open' : ''}" data-id="${c.id}">
          <span class="tape2"></span>
          <div class="inner">
            <div class="hd">
              <div class="badge-ic">${ICONS[c.icon] || ICONS.pawBlue}</div>
              <div class="nm"><span class="t">${esc(c.name)}</span><span class="u">${esc(c.base) || '未填地址'}</span></div>
              <span class="pin">${c.active ? '启用' : '备用'}</span>
            </div>
            <div class="bd">
              <div class="f"><label>名字</label><input data-fn="name" value="${esc(c.name)}"></div>
              <div class="f"><label>接口地址</label><input data-fn="base" value="${esc(c.base)}" placeholder="https://api.example.com/v1"></div>
              <div class="f"><label>密钥</label><input data-fn="key" type="password" value="${esc(c.key)}" placeholder="sk-..."></div>
              <div class="r2">
                <div class="f"><label>模型</label>
                  <div class="model-wrap ${mOpen ? 'open' : ''}">
                    <div class="model-pick"><span class="cur ${c.model ? '' : 'empty'}">${c.model ? esc(c.model) : '未拉取'}</span><span class="caret">▼</span></div>
                    ${modelSheet(c)}
                  </div>
                </div>
                <div class="f"><label>温度</label><input data-fn="temp" value="${esc(c.temp || '0.8')}"></div>
              </div>
              <div class="acts">
                <button class="del" type="button">撕掉</button>
                <button class="pull" type="button">拉取模型</button>
                <button class="save" type="button">保存</button>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');
      listEl.innerHTML = `<div class="label"><span>★</span>我的接口<span class="add" data-add>＋ 添加</span></div>${cards}`;
    }

    function renderAll() { renderNow(); renderList(); }

    /* 模型选择弹窗 */
    function openModelModal(c, cardEl) {
      var existing = document.querySelector('.hs-model-modal');
      if (existing) existing.remove();

      var hasModels = c.models && c.models.length;
      var itemsHtml = '';
      if (hasModels) {
        c.models.forEach(function(m) {
          var isOn = m === c.model ? 'on' : '';
          itemsHtml += '<button class="mm-item ' + isOn + '" data-mm-model="' + esc(m) + '">' + esc(m) + '<span class="mm-tick">✓</span></button>';
        });
      } else {
        itemsHtml = '<div class="mm-empty">还没有模型哦<br>先点「拉取模型」获取列表</div>';
      }

      var modal = document.createElement('div');
      modal.className = 'hs-model-modal';
      modal.innerHTML = '<div class="mm-mask"></div><div class="mm-sheet"><div class="mm-bar"></div><div class="mm-title">选择模型</div><div class="mm-list">' + itemsHtml + '</div></div>';
      document.body.appendChild(modal);

      function closeModal() {
        modal.classList.add('closing');
        setTimeout(function() { modal.remove(); }, 260);
      }

      modal.querySelector('.mm-mask').addEventListener('click', closeModal);
      modal.querySelector('.mm-bar').addEventListener('click', closeModal);

      modal.querySelector('.mm-list').addEventListener('click', function(ev) {
        var item = ev.target.closest('[data-mm-model]');
        if (!item) return;
        c.model = item.getAttribute('data-mm-model');
        modal.querySelectorAll('.mm-item').forEach(function(b) { b.classList.remove('on'); });
        item.classList.add('on');
        var curSpan = cardEl.querySelector('.model-pick .cur');
        if (curSpan) { curSpan.textContent = c.model; curSpan.classList.remove('empty'); }
        dbPut(c).then(function() { renderNow(); });
        setTimeout(closeModal, 200);
      });
    }

    /* 事件委托 */
    function handleClick(e) {
      var t = e.target;
      while (t && t !== root && !(t instanceof HTMLElement)) { t = t.parentElement; }
      if (!t || t === root) return;
      console.log('[API面板-click]', t.className);

      if (t.closest('.x')) { console.log('>>关闭'); apiClose(); return; }
      if (t.closest('.b-soft')) { root.classList.remove('mono'); return; }
      if (t.closest('.b-mono')) { root.classList.add('mono'); return; }
      if (t.closest('.add')) {
        console.log('>>添加');
        syncInputs();
        var icon = ICON_POOL[state.conns.length % ICON_POOL.length];
        var nc = { id: uid(), name: '新接口', base: '', key: '', model: '', temp: '0.8', models: [], icon: icon, active: false };
        state.conns.push(nc); state.openId = nc.id; state.modelOpenId = null;
        dbPut(nc).then(function() {
          renderAll();
          var newCard = listEl.querySelector('.conn[data-id="' + nc.id + '"]');
          if (newCard) { newCard.classList.add('hs-adding'); setTimeout(function() { newCard.classList.remove('hs-adding'); }, 450); }
        });
        return;
      }

      var card = t.closest('.conn');
      if (!card) { console.log('>>无card'); return; }
      var id = card.getAttribute('data-id');
      var c = state.conns.find(function(x) { return x.id === id; });
      if (!c) { console.log('>>无数据 id=' + id); return; }
      console.log('>>card id=' + id);

      if (t.closest('.pin')) {
        console.log('>>pin');
        var wasActive = c.active;
        state.conns.forEach(function(x) { x.active = false; });
        c.active = !wasActive;
        Promise.all(state.conns.map(dbPut)).then(function() { renderAll(); });
        return;
      }
      if (t.closest('.del')) {
        console.log('>>del');
        var cardEl = t.closest('.conn');
        if (cardEl) {
          cardEl.classList.add('hs-removing');
          setTimeout(function() {
            state.conns = state.conns.filter(function(x) { return x.id !== id; });
            if (state.openId === id) state.openId = null;
            dbDel(id).then(function() { renderAll(); });
          }, 300);
        }
        return;
      }
      if (t.closest('.save')) {
        console.log('>>save');
        syncInputs();
        dbPut(c).then(function() {
          var btn = t.closest('.save');
          if (btn) { var o = btn.textContent; btn.textContent = '✓ 记好了'; setTimeout(function() { btn.textContent = o; }, 1200); }
          renderNow();
        });
        return;
      }
      if (t.closest('.pull')) {
        console.log('>>pull');
        syncInputs();
        var btn = t.closest('.pull');
        if (!c.base) { btn.textContent = '先填地址!'; setTimeout(function() { btn.textContent = '拉取模型'; }, 1500); return; }
        btn.textContent = '拉取中…';
        fetchModels(c.base, c.key).then(function(list) {
          c.models = list;
          if (list.indexOf(c.model) === -1) c.model = '';
          state.modelOpenId = id;
          return dbPut(c);
        }).then(function() {
          renderList();
        }).catch(function(err) {
          btn.textContent = '✗ ' + (err.message || '失败');
          setTimeout(function() { btn.textContent = '拉取模型'; }, 2200);
        });
        return;
      }
      var mBtn = t.closest('[data-model]');
      if (mBtn) {
        console.log('>>model选择');
        c.model = mBtn.getAttribute('data-model');
        var allBtns = mBtn.parentElement.querySelectorAll('button');
        allBtns.forEach(function(b) { b.classList.remove('on'); });
        mBtn.classList.add('on');
        var curSpan = card.querySelector('.model-pick .cur');
        if (curSpan) { curSpan.textContent = c.model; curSpan.classList.remove('empty'); }
        dbPut(c).then(function() { renderNow(); });
        return;
      }
      if (t.closest('.model-pick')) {
        console.log('>>model-pick');
        openModelModal(c, card);
        return;
      }
      if (t.closest('.hd')) {
        console.log('>>展开/收起 ' + id);
        state.openId = (state.openId === id) ? null : id;
        state.modelOpenId = null;
        renderList(); return;
      }
    }
    root.addEventListener('click', handleClick);

    /* 打开 / 关闭 */
    const statusBar = document.getElementById('hsStatusBar');
    function apiOpen() { root.classList.add('hs-open'); if (statusBar) statusBar.classList.add('hs-on-light'); renderAll(); }
    function apiClose() {
      root.classList.add('hs-closing');
      setTimeout(function() {
        root.classList.remove('hs-open', 'hs-closing');
        if (statusBar) statusBar.classList.remove('hs-on-light');
      }, 220);
    }
    window.HSApi = { open: apiOpen, close: apiClose };

    /* 点主屏「API」图标打开 */
    document.addEventListener('click', (e) => {
      const tile = e.target.closest('.hs-tile');
      if (!tile) return;
      if (homeRoot && homeRoot.classList.contains('edit')) return;
      const cap = tile.querySelector('.hs-tile-cap');
      if (cap && cap.textContent.trim() === 'API') apiOpen();
    });

    /* 载入存档 */
    dbAll().then(list => {
      state.conns = list.sort((a, b) => (a.id > b.id ? 1 : -1));
      state.openId = null;
      renderAll();
    });

    console.log('[home-api] API 已就绪，点「API」图标或 HSApi.open() 打开');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
