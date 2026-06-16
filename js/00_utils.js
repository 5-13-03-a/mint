// ==========================================
// 新增：iOS Standalone (全屏) 模式检测与防缩放
// ==========================================
function initStandaloneMode() {
    // 1. 检测是否在添加到主屏幕的全屏模式下运行
    const isIosStandalone = window.navigator.standalone === true;
    const isMatchMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // 新增：检测是否为安卓设备
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isIosStandalone || isMatchMediaStandalone) {
        // 给 body 添加 class，方便 CSS 单独做刘海屏适配
        document.body.classList.add('ios-standalone');
        console.log("✅ 当前运行在 Standalone 全屏模式");
    } else {
        console.log("⚠️ 当前运行在普通浏览器模式，请添加到主屏幕体验全屏");
    }
    
    // 如果是安卓设备，添加专用标识类名
    if (isAndroid) {
        document.body.classList.add('is-android');
    }

    // 2. 彻底禁止双指缩放 (Pinch-to-zoom)
    document.addEventListener('touchmove', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
}

         // 立即执行检测
initStandaloneMode();

// ================= 通用强健 JSON 解析器 =================
function robustParseJSON(rawStr, isArray = true) {
    let cleaned = rawStr
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // 清除零宽字符
        .trim();
    // 第1层：直接解析
    try { return JSON.parse(cleaned); } catch(e) {}
    // 第2层：提取首个完整数组或对象
    const s = isArray ? '[' : '{';
    const e2 = isArray ? ']' : '}';
    let si = cleaned.indexOf(s);
    let ei = cleaned.lastIndexOf(e2);
    if (si !== -1 && ei > si) {
        let sub = cleaned.substring(si, ei + 1);
        try { return JSON.parse(sub); } catch(e) {}
        // 第3层：修复常见语法错误后再解析
        let fixed = sub
            .replace(/,\s*([}\]])/g, '$1')           // 移除尾随逗号
            .replace(/([^\\])\\([^"\\/bfnrtu])/g, '$1$2') // 修复非法转义
            .replace(/\t/g, ' ')                       // tab转空格
            .replace(/\r?\n/g, ' ');                   // 换行转空格
        try { return JSON.parse(fixed); } catch(e) {}
    }
    return null;
}

// ==========================================
// 新增：修复 iOS 键盘收起后视口不回弹导致的布局错位
// ==========================================
document.addEventListener('focusout', function(e) {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        // 强制系统在键盘收起后滚动回到顶部，修复视口偏移
        window.scrollTo(0, 0);
        // 针对 PWA 模式下的特殊补丁：轻微触发重绘
        setTimeout(() => {
            document.body.style.height = '100.1%';
            setTimeout(() => { document.body.style.height = '100%'; }, 10);
        }, 100);
    }
});

// ======= 强大的本地存储引擎（原生 IndexedDB 版）=======

const LocalDB = (() => {
  const DB_NAME = 'SoapOS__DB';
  const STORE_NAME = 'kv';
  const DB_VERSION = 1;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function setItem(key, val) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(val, key);
        req.onsuccess = () => resolve(true);
        req.onerror = e => {
          console.error(`[Storage Error] Key: ${key}`, e);
          resolve(false);
        };
        tx.oncomplete = () => db.close();
      });
    } catch (e) {
      console.error(`[Storage Error] Key: ${key}`, e);
      return false;
    }
  }

  async function getItem(key) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = e => resolve(e.target.result ?? null);
        req.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
      });
    } catch {
      return null;
    }
  }

  return { setItem, getItem };
})();

// ================= 全局 AI 通知栏管理引擎 =================
const NotifManager = {
    activeStreams: {}, // 存储每个联系人的打字状态和 AbortController

    show(contactId, name, avatar, text, isFinal = false, isNewBubble = false) {
        const container = document.getElementById('global-ai-notif-container');
        if (!container) return;

        let card = document.getElementById('notif-card-' + contactId);
        
        // 🚀 核心修复：只要是新气泡（包括最后一条），都必须播放强烈的“重新弹出”动效，明确提醒用户内容变了！
        if (card && isNewBubble) {
            card.style.transition = 'none';
            card.style.transform = 'translateY(-15px) scale(0.98)';
            card.style.opacity = '0.7';
            void card.offsetWidth; // 触发重绘
            card.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.transform = 'translateY(0) scale(1)';
            card.style.opacity = '1';
        }

        if (card) {
            const textEl = card.querySelector('.ai-notif-text');
            
            card.classList.remove('update-pop');
            void card.offsetWidth;
            card.classList.add('update-pop');
            
            textEl.innerText = text;
            
            if (isFinal) this.markFinished(contactId);
        } else {
            // 新建逻辑
            card = document.createElement('div');
            card.className = 'ai-stream-notif';
            card.id = 'notif-card-' + contactId;
            card.innerHTML = `
                <div class="ai-notif-polkadot"></div>
                <div class="ai-notif-glow"></div>
                <div class="ai-notif-avatar">${renderAvatarHTML(avatar, 'bot')}</div>
                <div class="ai-notif-content">
                    <div class="ai-notif-header"><div class="ai-notif-pulse active"></div><div class="ai-notif-name">${name} · WRITING</div></div>
                    <div class="ai-notif-text">${text}</div>
                </div>
                <div class="ai-notif-stop-btn" onclick="NotifManager.stop('${contactId}', event)"><i class="fa-solid fa-stop text-[12px]"></i></div>
            `;
            // 点击跳回聊天室
            card.onclick = (e) => {
                if (!e.target.closest('.ai-notif-stop-btn')) {
                    closeChatMenu();
                    // 强制刷新 App 激活状态
                    document.getElementById('app-messages').classList.add('active');
                    // 进入指定联系人
                    openChat(contactId);
                    this.close(contactId);
                }
            };
            container.appendChild(card);
        }
        
                // 如果是最后一段，3秒后自动消失
        if (isFinal) {
            clearTimeout(this.activeStreams[contactId]?.closeTimer);
            this.activeStreams[contactId].closeTimer = setTimeout(() => this.close(contactId), 3000);
        }
    },

    markFinished(contactId) {
        const card = document.getElementById('notif-card-' + contactId);
        if (!card) return;
        card.querySelector('.ai-notif-pulse').classList.remove('active');
        card.querySelector('.ai-notif-name').innerText = card.querySelector('.ai-notif-name').innerText.replace('WRITING', 'SENT');
        const btn = card.querySelector('.ai-notif-stop-btn');
        btn.innerHTML = '<i class="fa-solid fa-check text-[12px]"></i>';
        btn.style.background = 'transparent'; btn.style.color = '#8E8E93';
    },

    stop(contactId, event) {
        if (event) event.stopPropagation();
        if (this.activeStreams[contactId] && this.activeStreams[contactId].controller) {
            this.activeStreams[contactId].controller.abort();
            const card = document.getElementById('notif-card-' + contactId);
            if (card) {
                card.querySelector('.ai-notif-text').innerText += ' [已中断]';
                card.querySelector('.ai-notif-text').style.color = '#8E8E93';
                this.markFinished(contactId);
                setTimeout(() => this.close(contactId), 2000);
            }
        }
    },

    close(contactId) {
        const card = document.getElementById('notif-card-' + contactId);
        if (card) {
            card.classList.add('fade-out');
            setTimeout(() => { if (card.parentNode) card.remove(); delete this.activeStreams[contactId]; }, 400);
        }
    }
};

         // 🚀 全新：防抖保存引擎（解决线下模式卡顿的核心）
         // 原理：无论你一秒内调用多少次 saveData，它都会等待操作停下后只存一次，不阻塞 AI 出字。
         let saveTimer = null;
         function debouncedSave() {
             clearTimeout(saveTimer);
             saveTimer = setTimeout(async () => {
                 console.log("💾 正在后台静默同步数据...");
                 const tasks = [
                     LocalDB.setItem('soap_contacts_v28', JSON.stringify(contacts)),
                     LocalDB.setItem('soap_masks_v28', JSON.stringify(masks)),
                     LocalDB.setItem('soap_global_v28', JSON.stringify(gConfig)),
                     LocalDB.setItem('soap_widget_v28', JSON.stringify(wgData)),
                     LocalDB.setItem('soap_art_widget_v1', JSON.stringify(artWidgetData)),
                     LocalDB.setItem('soap_worldbooks_v28', JSON.stringify(worldbooks)),
                     LocalDB.setItem('soap_wb_categories_v1', JSON.stringify(wbCategories)),
                     LocalDB.setItem('soap_phonelogs_v28', JSON.stringify(phoneLogs))
                 ];
                 await Promise.all(tasks);
             }, 1000); // 延迟1秒保存，给 AI 腾出 CPU 资源
         }
         
         // ====== 单文件 PWA 动态安装引擎 ======
function initSingleFilePWA() {
    // 1. 动态生成 manifest (让浏览器认为这是一个独立APP)
    const manifest = {
        name: "SOAP OS",
        short_name: "SOAP",
        start_url: window.location.href.split('?')[0],
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [{
            src: "https://nos.netease.com/ysf/547542b6a49930315c352e6a326bb876.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
        }]
    };
    const manifestStr = JSON.stringify(manifest);
    const manifestURL = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(manifestStr);

    // 先找已有的，没有就动态创建
    let linkEl = document.getElementById('pwa-manifest-link');
    if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.rel = 'manifest';
        linkEl.id = 'pwa-manifest-link';
        document.head.appendChild(linkEl);
    }
    linkEl.href = manifestURL;

    // 2. 动态生成并注册虚拟 Service Worker (触发安装提示的必要条件)
    if ('serviceWorker' in navigator) {
        const swCode = `self.addEventListener('install', (e) => self.skipWaiting()); self.addEventListener('activate', (e) => self.clients.claim()); self.addEventListener('fetch', (e) => {});`;
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl).catch(err => console.log('PWA 挂载失败', err));
    }
}

// ==========================================
// 主界面提取的 JS 脚本
// ==========================================
  // 监听全屏状态，自动添加/移除下推类名
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
  });

  const themeSwitcher = document.getElementById('themeSwitcher');
  const themeDots = document.querySelectorAll('.theme-dot');
  
  themeDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.setAttribute('data-theme', dot.dataset.t);
      themeDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });

  // --- 新增：全局禁止长按复制与呼出菜单 ---
  if (!document.getElementById('anti-callout-style')) {
    const style = document.createElement('style');
    style.id = 'anti-callout-style';
    style.innerHTML = `
      * { -webkit-touch-callout: none !important; -webkit-user-select: none !important; user-select: none !important; }
      input, textarea { -webkit-touch-callout: default !important; -webkit-user-select: auto !important; user-select: auto !important; }
    `;
    document.head.appendChild(style);
  }

  // 全局禁用右键菜单（防止长按弹出系统菜单截断事件）
  document.addEventListener('contextmenu', (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.preventDefault();
      }
  });

  // --- 新增：长按桌面空白处显示主题切换器 ---
  let desktopPressTimer = null;
  let deskStartX = 0, deskStartY = 0;

  document.addEventListener('touchstart', (e) => {
      if(desktopPressTimer) clearTimeout(desktopPressTimer);
      
      // 【拦截补丁 1】如果当前触摸点不在纯桌面层 (如滑动面板 #pager 内) 或者直接就在背景 body 上，就直接拦截（防止弹窗覆盖下依然触发）
      if (!e.target.closest('#pager') && !e.target.closest('.status-bar') && e.target !== document.body && e.target.id !== 'app-root') {
          return;
      }

      // 【拦截补丁 2】严格检测：如果当前有任何 App 级全屏窗口或设置页面处于打开状态，强行禁止呼出切换器
      if (document.querySelector('.app-window.active') || document.querySelector('#settings-view-overlay.active')) {
          return;
      }

      // 避免与桌面上的具体实体组件自身发生冲突
      if (e.target.closest('.app') || e.target.closest('.widget-base') || e.target.closest('.polaroid-wrapper') || e.target.closest('.music-wrapper') || e.target.closest('.theme-switcher') || e.target.closest('.dock')) {
          return;
      }

      deskStartX = e.touches[0].clientX;
      deskStartY = e.touches[0].clientY;
      
      desktopPressTimer = setTimeout(() => {
          const ts = document.getElementById('themeSwitcher');
          if(ts) {
              ts.classList.add('show');
              if(navigator.vibrate) navigator.vibrate(50);
          }
      }, 500);
  }, {passive: false});

  document.addEventListener('touchmove', (e) => {
      if(desktopPressTimer) {
          const dx = Math.abs(e.touches[0].clientX - deskStartX);
          const dy = Math.abs(e.touches[0].clientY - deskStartY);
          if(dx > 10 || dy > 10) clearTimeout(desktopPressTimer);
      }
  }, {passive: false});

  const cancelPress = () => { if(desktopPressTimer) clearTimeout(desktopPressTimer); };
  document.addEventListener('touchend', cancelPress, {passive: true});
  document.addEventListener('touchcancel', cancelPress, {passive: true});

  // 专属关闭按钮事件（点击叉号才会消失）
  const themeCloseBtn = document.getElementById('themeCloseBtn');
  if (themeCloseBtn) {
      themeCloseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const ts = document.getElementById('themeSwitcher');
          if (ts) {
              ts.classList.remove('show');
          }
      });
  }

  // --- 新增：App 长按拖拽交换位置 ---
  let dragApp = null;
  let ghostApp = null;
  let appPressTimer = null;
  let isDragging = false;
  let startX, startY;

  document.addEventListener('touchstart', (e) => {
      const app = e.target.closest('.app');
      if (!app || app.closest('#settings-view-overlay')) return;
      
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;

      appPressTimer = setTimeout(() => {
          isDragging = true;
          dragApp = app;
          dragApp.classList.add('dragging');
          
          if(navigator.vibrate) navigator.vibrate(50);

          ghostApp = dragApp.cloneNode(true);
          ghostApp.classList.add('app-ghost');
          ghostApp.classList.remove('dragging');
          document.body.appendChild(ghostApp);
          
          const rect = dragApp.getBoundingClientRect();
          ghostApp.style.left = rect.left + 'px';
          ghostApp.style.top = rect.top + 'px';
          ghostApp.style.width = rect.width + 'px';
          ghostApp.style.height = rect.height + 'px';
          
      }, 500);
  }, {passive: false});

  document.addEventListener('touchmove', (e) => {
      if (!isDragging) {
          if (appPressTimer) {
              const touch = e.touches[0];
              if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10) {
                  clearTimeout(appPressTimer);
              }
          }
          return;
      }
      e.preventDefault();
      const touch = e.touches[0];
      if (ghostApp) {
          ghostApp.style.left = (touch.clientX - ghostApp.offsetWidth / 2) + 'px';
          ghostApp.style.top = (touch.clientY - ghostApp.offsetHeight / 2) + 'px';
      }
  }, {passive: false});

  document.addEventListener('touchend', (e) => {
      clearTimeout(appPressTimer);
      if (!isDragging) return;
      
      const touch = e.changedTouches[0];
      ghostApp.style.display = 'none';
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      ghostApp.style.display = 'block';

      const targetApp = targetEl ? targetEl.closest('.app') : null;
      
      if (targetApp && targetApp !== dragApp && !targetApp.closest('#settings-view-overlay')) {
          const parent1 = dragApp.parentNode;
          const sibling1 = dragApp.nextSibling === targetApp ? dragApp : dragApp.nextSibling;
          targetApp.parentNode.insertBefore(dragApp, targetApp);
          parent1.insertBefore(targetApp, sibling1);
      }

      dragApp.classList.remove('dragging');
      if (ghostApp) ghostApp.remove();
      
      isDragging = false;
      dragApp = null;
      ghostApp = null;
  });

  // 分页点联动
  const pager = document.getElementById('pager');
  const dots = document.querySelectorAll('.page-dots .dot');
  pager.addEventListener('scroll', () => {
    const i = Math.round(pager.scrollLeft / pager.clientWidth);
    dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
  });

  // 真实时间与跳动动画逻辑
  function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    
    const timeStr = `${hours}:${minutes}`;
    const dateStr = `${month}-${date}`;

    const statusTime = document.getElementById('status-time');
    const widgetTime = document.getElementById('widget-time');
    const widgetDate = document.getElementById('widget-date');

    if (statusTime) statusTime.textContent = timeStr;
    if (widgetDate) widgetDate.textContent = dateStr;
    
    if (widgetTime && widgetTime.textContent !== timeStr) {
      widgetTime.textContent = timeStr;
      // 触发跳动动画
      widgetTime.classList.remove('time-jump');
      void widgetTime.offsetWidth; // 触发重绘
      widgetTime.classList.add('time-jump');
    }
  }

  // 初始更新并设置定时器
  updateTime();
  setInterval(updateTime, 1000); // 每秒检查一次，但只有分钟变化时才会跳动

  // 随机让日期也跳动一下 (几秒跳一个，低频率)
  setInterval(() => {
    const widgetDate = document.getElementById('widget-date');
    if (widgetDate && Math.random() > 0.7) { // 30%概率跳动
      widgetDate.classList.remove('time-jump');
      void widgetDate.offsetWidth;
      widgetDate.classList.add('time-jump');
    }
  }, 5000); // 每5秒判定一次
