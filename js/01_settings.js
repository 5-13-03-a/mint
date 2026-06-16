// ==========================================
// 全新高端画廊设置界面引擎 (独立封装)
// ==========================================

const SettingsViewHTML = `
  <div class="set-scroll-area">
    <!-- 光晕艺术背景与线框五角星 (SVG) -->
    <div class="set-aura-layer">
      <svg class="set-star-deco set-star-1" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon></svg>
      <svg class="set-star-deco set-star-2" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon></svg>
      <svg class="set-star-deco set-star-3" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon></svg>

      <div class="set-aura set-aura-pink"></div>
      <div class="set-aura set-aura-blue"></div>
      <div class="set-aura set-aura-yellow"></div>
    </div>

    <div class="set-header">
      <div class="set-back-btn" onclick="closeSettingsView()"><i class="fa-solid fa-arrow-left"></i></div>
      <div class="set-header-tag">Configuration</div>
      <h1>Sense & Style</h1>
      <div class="set-header-deco-block"></div>
      <div class="set-user-avatar" id="setMainAvatar" onclick="document.getElementById('setAvatarUpload').click()" style="background-image: url('https://i.postimg.cc/tTQDHN30/image-download-1772630329906.jpg');"></div>
      <input type="file" id="setAvatarUpload" accept="image/*" style="display: none;" onchange="handleSetAvatarUpload(event)">
    </div>

    <div class="set-gallery-container" id="setGalleryContainer">
      <div class="set-exhibit">
        <div class="set-exhibit-tab" onclick="toggleSetExhibit(this)">
          <span class="set-exhibit-num">01</span>
          <div class="set-exhibit-titles">
            <span class="set-zh">手机壁纸</span>
            <span class="set-en">Wallpaper Gallery</span>
          </div>
          <div class="set-cross-btn"></div>
        </div>
        <div class="set-exhibit-content-wrap">
        <div class="set-exhibit-inner">
          <div style="display:flex; justify-content:flex-end; margin-bottom: 12px;">
            <div class="set-ghost-btn" onclick="resetWallpaper()"><i class="fa-solid fa-rotate-left"></i> 恢复默认</div>
          </div>
          <div class="set-polaroid-deck">
          <!-- 第一张：点击自己上传的样式 -->
          <div class="set-polaroid active set-upload-card" onclick="triggerSetUpload(this)">
            <div class="set-tape"></div>
            <div class="set-polaroid-img">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <div class="set-polaroid-tag">Upload</div>
          </div>
            
            <div class="set-polaroid" data-wp="https://images.unsplash.com/photo-1549405607-bbbc4fb34be0?auto=format&fit=crop&q=80&w=400" onclick="activateSetPolaroid(this)">
              <div class="set-tape"></div>
              <div class="set-polaroid-img" style="background-image: url('https://images.unsplash.com/photo-1549405607-bbbc4fb34be0?auto=format&fit=crop&q=80&w=400');"></div>
              <div class="set-polaroid-tag">Dawn</div>
            </div>
            <div class="set-polaroid" data-wp="https://images.unsplash.com/photo-1620121478247-ec786f9be423?auto=format&fit=crop&q=80&w=400" onclick="activateSetPolaroid(this)">
              <div class="set-tape"></div>
              <div class="set-polaroid-img" style="background-image: url('https://images.unsplash.com/photo-1620121478247-ec786f9be423?auto=format&fit=crop&q=80&w=400');"></div>
              <div class="set-polaroid-tag">Glow</div>
            </div>
          </div>
          
          <input type="file" id="customWpUpload" accept="image/*" style="display: none;" onchange="handleWpUpload(event)">

        </div>
      </div>
      </div>

      <div class="set-exhibit">
        <div class="set-exhibit-tab" onclick="toggleSetExhibit(this)">
          <span class="set-exhibit-num">02</span>
          <div class="set-exhibit-titles">
            <span class="set-zh">桌面图标</span>
            <span class="set-en">App Icons</span>
          </div>
          <div class="set-cross-btn"></div>
        </div>
        <div class="set-exhibit-content-wrap">
          <div class="set-exhibit-inner" id="setIconExhibitInner">
            
            <!-- 导航视图：左右选择 -->
            <div class="set-icon-nav-view" id="setIconNavView">
              <div class="set-icon-nav-item" onclick="openIconSizeView()">
                <div class="set-icon-nav-btn"><i class="fa-solid fa-sliders"></i></div>
                <span>形态调整</span>
              </div>
              <div class="set-icon-nav-item" onclick="openIconThemeModal()">
                <div class="set-icon-nav-btn"><i class="fa-solid fa-palette"></i></div>
                <span>更换图标</span>
              </div>
            </div>

            <!-- 形态调整视图 -->
            <div class="set-icon-size-view" id="setIconSizeView" style="display: none;">
              <div class="set-sub-header" onclick="backToIconNav()">
                <i class="fa-solid fa-chevron-left"></i> 返回
              </div>

              <div class="set-art-stage">
            <div class="set-app-icon-preview" id="setAppPreview">
              <div class="set-app-icon-inner"></div>
            </div>
          </div>

          <div class="set-slider-container">
            <div class="set-slider-info"><span>图标大小</span><span class="set-slider-val" id="setSizeVal">46px</span></div>
            <input type="range" class="set-modern-slider" id="setSizeSlider" min="30" max="80" value="46">
          </div>

          <div class="set-slider-container">
            <div class="set-slider-info"><span>图标圆角</span><span class="set-slider-val" id="setRadiusVal">12px</span></div>
            <input type="range" class="set-modern-slider" id="setRadiusSlider" min="0" max="40" value="12">
          </div>
          
          <div class="set-action-btns">
            <div class="set-square-btn" onclick="resetAppIconSettings()">恢复默认</div>
            <div class="set-square-btn primary" onclick="saveAppIconSettings()">保存</div>
          </div>
        </div>

      </div>
    </div>
  </div>

      <div class="set-exhibit">
        <div class="set-exhibit-tab" onclick="toggleSetExhibit(this)">
          <span class="set-exhibit-num">03</span>
          <div class="set-exhibit-titles">
            <span class="set-zh">显示设置</span>
            <span class="set-en">Display Control</span>
          </div>
          <div class="set-cross-btn"></div>
        </div>
        <div class="set-exhibit-content-wrap">
          <div class="set-exhibit-inner">
            
            <div class="set-control-row">
              <div class="set-control-text">
                <span class="set-c-tit">全屏模式隐藏边框</span>
                <span class="set-c-sub">剥离设备边缘，达到极简沉浸</span>
              </div>
              <div class="set-bubble-toggle" id="set-fullscreen-toggle" onclick="toggleSettingsFullscreen(this)"></div>
            </div>
            
            <div class="set-control-row">
              <div class="set-control-text">
                <span class="set-c-tit">顶部状态栏和灵动岛</span>
                <span class="set-c-sub">管理时间与电池等通知的展示</span>
              </div>
              <div class="set-bubble-toggle active" id="set-island-toggle" onclick="toggleIslandPref(this)"></div>
            </div>

          </div>
        </div>
      </div>

    </div>

    <!-- 字体设置视图 (默认隐藏) -->
    <div class="set-gallery-container" id="setFontContainer" style="display: none;">
      
      <div class="set-exhibit">
        <div class="set-exhibit-tab" onclick="toggleSetExhibit(this)">
          <span class="set-exhibit-num">01</span>
          <div class="set-exhibit-titles">
            <span class="set-zh">排版字号</span>
            <span class="set-en">Typography Size</span>
          </div>
          <div class="set-cross-btn"></div>
        </div>
        <div class="set-exhibit-content-wrap">
          <div class="set-exhibit-inner">
            <div class="set-slider-container">
              <div class="set-slider-info">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span>全局基础字号</span>
                  <div onclick="resetFontSize()" style="width: 22px; height: 22px; border-radius: 50%; background: #1C1D24; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; transition: 0.2s;" onmousedown="this.style.transform='scale(0.85)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
                    <i class="fa-solid fa-rotate-left"></i>
                  </div>
                </div>
                <span class="set-slider-val" id="setGlobalFontSizeVal">14px</span>
              </div>
              <input type="range" class="set-modern-slider" id="setGlobalFontSizeSlider" min="10" max="24" value="14">
            </div>
          </div>
        </div>
      </div>

      <div class="set-exhibit">
        <div class="set-exhibit-tab" onclick="toggleSetExhibit(this)">
          <span class="set-exhibit-num">02</span>
          <div class="set-exhibit-titles">
            <span class="set-zh">自定义字体</span>
            <span class="set-en">Custom Font</span>
          </div>
          <div class="set-cross-btn"></div>
        </div>
        <div class="set-exhibit-content-wrap">
          <div class="set-exhibit-inner">
            
            <div class="set-alert-banner">
               <i class="fa-solid fa-triangle-exclamation"></i>
               <span>提示：TTF 导入重启可能会失效，建议优先使用网络 URL 链接导入。</span>
            </div>

            <div class="set-font-url-group">
              <input type="text" id="fontUrlInput" placeholder="输入网络字体资源 URL (https://...)">
              <button onclick="importFontFromUrl()"><i class="fa-solid fa-download"></i></button>
            </div>
            
            <div class="set-font-divider"><span>或者</span></div>
            
            <div class="set-font-upload-btn" onclick="document.getElementById('customFontUpload').click()">
              <i class="fa-solid fa-folder-open text-[16px]"></i>
              <span id="uploadFontText">浏览设备 TTF/OTF 文件</span>
              <input type="file" id="customFontUpload" accept=".ttf,.otf,.woff" style="display: none;" onchange="handleFontUpload(event)">
            </div>

            <div class="set-action-btns" style="margin-top: 20px;">
              <div class="set-square-btn" onclick="resetGlobalFont()">系统默认</div>
              <div class="set-square-btn primary" onclick="saveFontAsPreset()">存为预设库</div>
            </div>

            <div class="set-preset-title" style="margin-top:24px;">已存预设 (Presets)</div>
            <!-- 预设列表容器 -->
            <div id="fontPresetList" style="margin-bottom: 10px;"></div>
          </div>
        </div>
      </div>

    </div>

  </div>

  <div class="set-dock-container">
    <div class="set-dock-btn active" onclick="switchSetDock(this)"><i class="fa-solid fa-wand-magic-sparkles"></i><div class="set-dock-indicator"></div></div>
    <div class="set-dock-btn" onclick="switchSetDock(this)"><i class="fa-solid fa-shapes"></i><div class="set-dock-indicator"></div></div>
    <div class="set-dock-btn" onclick="switchSetDock(this)"><i class="fa-solid fa-fingerprint"></i><div class="set-dock-indicator"></div></div>
  </div>

  <!-- 纯黑通知胶囊 -->
  <div id="set-toast" class="set-toast">已保存</div>

  <!-- 更换图标居中弹窗 (单应用上传) -->
  <div id="setIconThemeModal" class="set-modal-overlay center-modal" onclick="closeIconThemeModal()">
    <div class="set-modal-content center-content" onclick="event.stopPropagation()">
      <div class="set-modal-header">
        <h3>自定义图标</h3>
        <i class="fa-solid fa-xmark" onclick="closeIconThemeModal()"></i>
      </div>
      <div class="set-modal-body">
         <p style="font-size: 12px; color: #8E93A6; margin-bottom: 16px; margin-top: -10px;">点击对应应用上传，单项独立复原</p>
         <div class="set-app-grid">
           
           <div class="set-app-box">
             <div class="set-app-item" onclick="triggerAppIconUpload('calendar')">
               <div class="set-app-item-icon" id="preview-icon-calendar"><i class="fa-solid fa-calendar"></i></div>
               <span>日历</span>
             </div>
             <div class="set-app-reset-wrap" onclick="resetSingleAppIcon('calendar')">清空</div>
           </div>

           <div class="set-app-box">
             <div class="set-app-item" onclick="triggerAppIconUpload('photos')">
               <div class="set-app-item-icon" id="preview-icon-photos"><i class="fa-solid fa-image"></i></div>
               <span>照片</span>
             </div>
             <div class="set-app-reset-wrap" onclick="resetSingleAppIcon('photos')">清空</div>
           </div>

           <div class="set-app-box">
             <div class="set-app-item" onclick="triggerAppIconUpload('camera')">
               <div class="set-app-item-icon" id="preview-icon-camera"><i class="fa-solid fa-camera"></i></div>
               <span>相机</span>
             </div>
             <div class="set-app-reset-wrap" onclick="resetSingleAppIcon('camera')">清空</div>
           </div>

           <div class="set-app-box">
             <div class="set-app-item" onclick="triggerAppIconUpload('notes')">
               <div class="set-app-item-icon" id="preview-icon-notes"><i class="fa-solid fa-note-sticky"></i></div>
               <span>备忘录</span>
             </div>
             <div class="set-app-reset-wrap" onclick="resetSingleAppIcon('notes')">清空</div>
           </div>

           <div class="set-app-box">
             <div class="set-app-item" onclick="triggerAppIconUpload('maps')">
               <div class="set-app-item-icon" id="preview-icon-maps"><i class="fa-solid fa-map"></i></div>
               <span>地图</span>
             </div>
             <div class="set-app-reset-wrap" onclick="resetSingleAppIcon('maps')">清空</div>
           </div>

           <div class="set-app-box">
             <div class="set-app-item" onclick="triggerAppIconUpload('calc')">
               <div class="set-app-item-icon" id="preview-icon-calc"><i class="fa-solid fa-calculator"></i></div>
               <span>计算器</span>
             </div>
             <div class="set-app-reset-wrap" onclick="resetSingleAppIcon('calc')">清空</div>
           </div>

           <div class="set-app-box">
             <div class="set-app-item" onclick="triggerAppIconUpload('safari')">
               <div class="set-app-item-icon" id="preview-icon-safari"><i class="fa-solid fa-compass"></i></div>
               <span>Safari</span>
             </div>
             <div class="set-app-reset-wrap" onclick="resetSingleAppIcon('safari')">清空</div>
           </div>

           <div class="set-app-box">
             <div class="set-app-item" onclick="triggerAppIconUpload('contacts')">
               <div class="set-app-item-icon" id="preview-icon-contacts"><i class="fa-solid fa-address-book"></i></div>
               <span>通讯录</span>
             </div>
             <div class="set-app-reset-wrap" onclick="resetSingleAppIcon('contacts')">清空</div>
           </div>

         </div>
         <input type="file" id="customAppIconUpload" accept="image/*" style="display: none;" onchange="handleAppIconUpload(event)">
      </div>
      <div class="set-action-btns">
        <div class="set-square-btn" onclick="resetIconTheme()">全部默认</div>
        <div class="set-square-btn primary" onclick="saveIconTheme()">保存展示</div>
      </div>
    </div>
  </div>
`;

const SettingsCSS = `
  #settings-view-overlay {
    position: fixed; inset: 0; z-index: 99999;
    background-color: #FAFAFC;
    color: #1C1D24;
    font-family: -apple-system, BlinkMacSystemFont, "Playfair Display", "Helvetica Neue", sans-serif;
    overflow: hidden;
    opacity: 0; transform: scale(1.03); pointer-events: none;
    transition: opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .set-scroll-area {
    position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;
  }
  #settings-view-overlay.active { opacity: 1; transform: scale(1); pointer-events: auto; }

  /* 动态字号缩放核心逻辑 */
  :root { --font-scale: 1; }
  .app-name { font-size: calc(10px * var(--font-scale)) !important; }
  .time-info { font-size: calc(11px * var(--font-scale)) !important; }
  .info-row-1, .info-row-2 { font-size: calc(11px * var(--font-scale)) !important; }
  .info-row-3 { font-size: calc(9px * var(--font-scale)) !important; }
  .m-bubble { font-size: calc(10px * var(--font-scale)) !important; }
  .polaroid-text { font-size: calc(9px * var(--font-scale)) !important; }
  .widget-long p { font-size: calc(13px * var(--font-scale)) !important; }
  .widget-long p:nth-child(2) { font-size: calc(11px * var(--font-scale)) !important; }
  [style*="font-size: 11px"] { font-size: calc(11px * var(--font-scale)) !important; }
  [style*="font-size: 24px"] { font-size: calc(24px * var(--font-scale)) !important; }
  [style*="font-size: 13px"] { font-size: calc(13px * var(--font-scale)) !important; }
  [style*="font-size: 10px"] { font-size: calc(10px * var(--font-scale)) !important; }

  .set-aura-layer { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .set-aura { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.7; mix-blend-mode: multiply; }
  .set-aura-pink { width: 60vw; height: 60vw; background: rgba(255, 143, 171, 0.4); top: -10%; left: -20%; animation: setDrift 15s infinite alternate ease-in-out; }
  .set-aura-blue { width: 50vw; height: 50vw; background: rgba(144, 164, 255, 0.4); bottom: 10%; right: -15%; animation: setDrift 20s infinite alternate-reverse ease-in-out; }
  .set-aura-yellow { width: 40vw; height: 40vw; background: rgba(255, 218, 119, 0.4); top: 30%; right: 20%; animation: setDrift 18s infinite alternate ease-in-out; }
  @keyframes setDrift { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(15vw, 15vh) scale(1.1); } }

  .set-star-deco { position: absolute; stroke: rgba(144, 164, 255, 0.6); stroke-width: 1.5; fill: none; z-index: 0; pointer-events: none; }
  .set-star-1 { width: 28px; top: 120px; right: -8px; transform: rotate(15deg); opacity: 0.5; }
  .set-star-2 { width: 18px; top: 300px; left: 10px; transform: rotate(-20deg); stroke: rgba(255, 143, 171, 0.6); opacity: 0.6;}
  .set-star-3 { width: 34px; bottom: 180px; right: 20px; transform: rotate(35deg); stroke: rgba(255, 218, 119, 0.6); opacity: 0.4;}

  .set-header { padding: 138px 24px 50px; display: flex; flex-direction: column; position: relative; z-index: 10; transition: padding-top 0.3s ease; }
  body.is-fullscreen .set-header { padding-top: 180px; }
  .set-back-btn { position: absolute; top: 60px; left: 24px; width: 48px; height: 48px; border-radius: 50%; background: #fff; border: 1px solid rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 20px 40px rgba(144, 164, 255, 0.08); transition: transform 0.2s; z-index: 20; }
  .set-back-btn:active { transform: scale(0.85); }
  .set-back-btn i { font-size: 16px; color: #1C1D24; }
  .set-header-tag { font-family: -apple-system, sans-serif; font-size: 10px; font-weight: 800; letter-spacing: 4px; color: #8E93A6; text-transform: uppercase; margin-bottom: 12px; }
  .set-header h1 { font-size: 38px; font-weight: 400; font-style: italic; letter-spacing: -1px; line-height: 1.1; margin-bottom: 4px; margin-top: 0;}
  .set-header-deco-block { width: 32px; height: 6px; background-color: #1C1D24; border-radius: 3px; margin-top: 6px; }
  .set-user-avatar { position: absolute; right: 24px; bottom: 55px; width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 6px 16px rgba(0,0,0,0.1); background-size: cover; background-position: center; cursor: pointer; transition: transform 0.2s; }
  .set-user-avatar:active { transform: scale(0.95); }

  .set-gallery-container { padding: 0 18px 140px; display: flex; flex-direction: column; gap: 16px; position: relative; z-index: 5; }
  .set-exhibit { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(40px); border: 2px solid #ffffff; border-radius: 20px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03); overflow: hidden; transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); position: relative; }
  
  .set-exhibit::before { content: ''; position: absolute; bottom: -15px; right: -15px; width: 80px; height: 80px; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="%231C1D24" fill-opacity="0.12"/></pattern></defs><polygon points="50,5 61,35 95,35 68,54 78,85 50,65 22,85 32,54 5,35 39,35" fill="url(%23dots)"/></svg>'); background-repeat: no-repeat; background-size: contain; z-index: 0; pointer-events: none; transform: rotate(-10deg); }
  .set-exhibit::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: linear-gradient(to left, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0) 50%); z-index: 0; pointer-events: none; }
  
  .set-exhibit.active { box-shadow: 0 20px 50px rgba(144, 164, 255, 0.08); background: #ffffff; }
  .set-exhibit-tab, .set-exhibit-content-wrap { position: relative; z-index: 1; }
  .set-exhibit-tab { padding: 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; user-select: none; }
  .set-exhibit-num { font-size: 11px; font-weight: 700; font-family: -apple-system, sans-serif; color: #8E93A6; letter-spacing: 1px; writing-mode: vertical-rl; transform: rotate(180deg); }
  .set-exhibit-titles { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .set-exhibit-titles .set-zh { font-size: 15px; font-weight: 600; font-family: -apple-system, sans-serif; letter-spacing: -0.2px; }
  .set-exhibit-titles .set-en { font-size: 10px; font-style: italic; color: #b5b8c4; font-family: "Playfair Display", serif;}
  .set-cross-btn { width: 24px; height: 24px; position: relative; display: flex; align-items: center; justify-content: center; }
  .set-cross-btn::before, .set-cross-btn::after { content: ''; position: absolute; background: #1C1D24; transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); border-radius: 2px; }
  .set-cross-btn::before { width: 14px; height: 2px; }
  .set-cross-btn::after { width: 2px; height: 14px; }
  .set-exhibit.active .set-cross-btn::after { transform: scaleY(0); }
  .set-exhibit.active .set-cross-btn::before { background: #FF8FAB; }

  .set-exhibit-content-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .set-exhibit.active .set-exhibit-content-wrap { grid-template-rows: 1fr; }
  .set-exhibit-inner { overflow: hidden; padding: 0 20px; opacity: 0; transform: translateY(10px) scale(0.99); transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .set-exhibit.active .set-exhibit-inner { padding: 0 20px 24px; opacity: 1; transform: translateY(0) scale(1); }

  .set-polaroid-deck { display: flex; gap: 20px; overflow-x: auto; padding: 10px 5px 30px; scrollbar-width: none; }
  .set-polaroid-deck::-webkit-scrollbar { display: none; }
  .set-polaroid { flex-shrink: 0; width: 110px; background: #fff; padding: 6px 6px 24px; border-radius: 4px; box-shadow: 0 15px 35px rgba(0,0,0,0.06), 0 3px 10px rgba(0,0,0,0.03); position: relative; cursor: pointer; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); border: 1px solid rgba(0,0,0,0.02); }
  .set-polaroid:nth-child(even) { transform: rotate(4deg) translateY(4px); }
  .set-polaroid:nth-child(odd) { transform: rotate(-3deg); }
  .set-polaroid.active { transform: rotate(0deg) scale(1.1) translateY(-6px); z-index: 10; border: 1px solid rgba(144, 164, 255, 0.4); box-shadow: 0 15px 30px rgba(144, 164, 255, 0.15); }
  .set-polaroid-img { width: 100%; aspect-ratio: 3/4; background-size: cover; background-position: center; background-color: #f7f7f9; }
  .set-polaroid.set-upload-card .set-polaroid-img { display: flex; align-items: center; justify-content: center; border: 1.5px dashed rgba(0,0,0,0.15); background: rgba(0,0,0,0.01); }
  .set-polaroid.set-upload-card .set-polaroid-img i { font-size: 20px; color: rgba(0,0,0,0.2); transition: 0.3s; }
  .set-polaroid.set-upload-card:active .set-polaroid-img i { transform: scale(0.9); }
  .set-polaroid-tag { position: absolute; bottom: 4px; left: 0; width: 100%; text-align: center; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 500; color: #8E93A6; }
  .set-tape { position: absolute; top: -6px; left: 50%; transform: translateX(-50%) rotate(-4deg); width: 36px; height: 12px; background: rgba(255,255,255,0.6); box-shadow: 0 1px 2px rgba(0,0,0,0.08); backdrop-filter: blur(4px); border-left: 1px dashed rgba(0,0,0,0.1); border-right: 1px dashed rgba(0,0,0,0.1); z-index: 2; }

  /* 桌面图标导航视图（缩小按钮加虚线并含滑入动画） */
  @keyframes slideNavUp { 0% {opacity:0; transform: translateY(15px) scale(0.9);} 100%{opacity:1; transform: translateY(0) scale(1);} }
  .set-icon-nav-view { display: flex; justify-content: center; gap: 40px; padding: 20px 0 10px; transition: opacity 0.3s; }
  .set-icon-nav-item { display: flex; flex-direction: column; align-items: center; gap: 12px; cursor: pointer; animation: slideNavUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; }
  .set-icon-nav-item:nth-child(2) { animation-delay: 0.1s; }
  .set-icon-nav-btn { position: relative; width: 48px; height: 48px; background: #1C1D24; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 8px 16px rgba(0,0,0,0.15); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .set-icon-nav-btn::before { content: ''; position: absolute; inset: -5px; border: 1.5px dashed rgba(28,29,36,0.3); border-radius: 50%; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .set-icon-nav-item:hover .set-icon-nav-btn::before { transform: rotate(90deg); border-color: rgba(28,29,36,0.6); }
  .set-icon-nav-item:active .set-icon-nav-btn { transform: scale(0.9); }
  .set-icon-nav-item span { font-size: 13px; font-weight: 600; color: #1C1D24; }

  /* 返回头部与动画 */
  .set-icon-size-view { transform: translateX(20px); opacity: 0; transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .set-icon-size-view.show { transform: translateX(0); opacity: 1; }
  .set-sub-header { font-size: 13px; font-weight: 600; color: #8E93A6; margin-bottom: 16px; cursor: pointer; display: flex; align-items: center; gap: 6px; width: fit-content; }
  .set-sub-header:active { opacity: 0.7; }

  /* 预览波点背景 */
  .set-art-stage { height: 160px; width: 100%; border-radius: 16px; background-color: #FAFAFC; background-image: radial-gradient(circle, #D5D5D8 1.5px, transparent 1.5px); background-size: 12px 12px; background-position: center; display: flex; align-items: center; justify-content: center; position: relative; border: 1px solid rgba(0,0,0,0.03); margin-bottom: 20px; overflow: hidden; }
  .set-app-icon-preview { width: 70px; height: 70px; background: linear-gradient(135deg, #ffffff 0%, #f3f3f5 100%); box-shadow: 0 12px 24px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1); transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; border-radius: 18px;}
  .set-app-icon-inner { width: 60%; height: 60%; background: linear-gradient(135deg, #FF8FAB 0%, #90A4FF 100%); border-radius: 50%; box-shadow: inset 0 2px 5px rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; }
  .set-app-icon-inner::after { content: ''; width: 40%; height: 40%; background: #fff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

  /* 全新高级滑块设计 (专业几何风) */
  .set-slider-container { margin-bottom: 24px; padding: 0 4px; }
  .set-slider-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-family: -apple-system, sans-serif; font-size: 13px; font-weight: 600; color: #1C1D24; text-transform: uppercase; letter-spacing: 0.5px; }
  .set-slider-val { background: transparent; padding: 0; border-radius: 0; font-size: 13px; font-weight: 700; color: #1C1D24; }
  .set-modern-slider { -webkit-appearance: none; width: 100%; background: transparent; padding: 10px 0; margin: 0; outline: none; }
  .set-modern-slider::-webkit-slider-runnable-track { width: 100%; height: 2px; background: #1C1D24; border-radius: 0; }
  .set-modern-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 24px; width: 8px; background: #1C1D24; border: 1px solid #fff; border-radius: 0; margin-top: -11px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .set-modern-slider::-webkit-slider-thumb:active { transform: scale(1.2); background: #90A4FF; border-color: #1C1D24; }

  /* 自定义字体专用美化 */
  .set-alert-banner { background: rgba(255, 143, 171, 0.08); border-left: 3px solid #FF8FAB; color: #D15A7C; padding: 12px 14px; border-radius: 0; font-size: 11px; display: flex; gap: 10px; align-items: center; margin-bottom: 20px; font-weight: 600; line-height: 1.5; }
  .set-font-url-group { display: flex; gap: 8px; }
  .set-font-url-group input { flex: 1; border: 1.5px solid transparent; background: rgba(0,0,0,0.03); border-radius: 0; padding: 0 16px; font-size: 12px; font-family: inherit; color: #1C1D24; outline: none; transition: 0.3s; height: 46px; }
  .set-font-url-group input:focus { border-color: rgba(144, 164, 255, 0.5); background: #fff; box-shadow: 0 4px 12px rgba(144, 164, 255, 0.1); }
  .set-font-url-group button { width: 46px; height: 46px; border: none; background: #1C1D24; color: #fff; border-radius: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); font-size: 15px; }
  .set-font-url-group button:active { transform: scale(0.9); }
  .set-font-divider { display: flex; align-items: center; text-align: center; margin: 16px 0; color: #8E93A6; font-size: 10px; font-weight: 800; letter-spacing: 2px; }
  .set-font-divider::before, .set-font-divider::after { content: ''; flex: 1; border-bottom: 1px dashed rgba(0,0,0,0.08); }
  .set-font-divider span { padding: 0 16px; opacity: 0.6; }
  .set-font-upload-btn { background: rgba(144, 164, 255, 0.05); color: #90A4FF; padding: 14px; border-radius: 0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; border: 1.5px dashed rgba(144, 164, 255, 0.3); }
  .set-font-upload-btn:active { background: rgba(144, 164, 255, 0.1); transform: scale(0.98); }
  .set-preset-title { font-size: 12px; font-weight: 800; color: #8E93A6; border-bottom: 1px solid rgba(0,0,0,0.04); padding-bottom: 8px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;}

  /* 按钮质感优化 (纯方角尖锐设计) */
  .set-action-btns { display: flex; gap: 12px; margin-top: 24px; }
  .set-square-btn { flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 2px 4px rgba(0,0,0,0.02); font-size: 13px; font-weight: 600; color: #1C1D24; cursor: pointer; transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); border-radius: 0; }
  .set-square-btn:active { transform: scale(0.96); background: #f9f9f9; }
  .set-square-btn.primary { background: #1C1D24; color: #fff; border-color: #1C1D24; box-shadow: 0 4px 12px rgba(28,29,36,0.2); }
  .set-square-btn.primary:active { background: #2c2d36; }

  /* 幽灵按钮 (用于壁纸恢复默认) */
  .set-ghost-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; background: rgba(0,0,0,0.04); color: #8E93A6; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
  .set-ghost-btn:active { transform: scale(0.95); background: rgba(0,0,0,0.08); }

  /* 通知变纯方 (纵向缩短) */
  .set-toast { position: fixed; bottom: 110px; left: 50%; transform: translateX(-50%) translateY(20px); background: #1C1D24; color: #fff; padding: 8px 28px; border-radius: 0; font-size: 13px; font-weight: 600; z-index: 999999; opacity: 0; pointer-events: none; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
  .set-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  /* 字体预设列表样式 (纯方角) */
  .set-preset-item { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 12px 14px; border-radius: 0; font-size: 13px; color: #1C1D24; font-weight: 600; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 8px;}
  .set-preset-actions { display: flex; gap: 6px; }
  .set-preset-btn { cursor: pointer; padding: 6px 12px; border-radius: 0; background: rgba(0,0,0,0.04); transition: 0.2s; font-weight: 600; font-size: 11px;}
  .set-preset-btn:active { transform: scale(0.9); background: rgba(0,0,0,0.08); }
  .set-preset-btn.apply { color: #fff; background: #1C1D24; }
  .set-preset-btn.apply:active { background: #333; }
  .set-preset-btn.del { color: #D15A7C; }

  /* 居中弹窗及单应用上传区域 */
  .set-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.2); backdrop-filter: blur(8px); z-index: 999999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; padding: 20px; }
  .set-modal-overlay.active { opacity: 1; pointer-events: auto; }
  .set-modal-content { width: 100%; max-width: 320px; background: #fff; border-radius: 0; padding: 24px; transform: scale(0.95); opacity: 0; transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
  .set-modal-overlay.active .set-modal-content { transform: scale(1); opacity: 1; }
  .set-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .set-modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; color: #1C1D24; }
  .set-modal-header i { font-size: 20px; color: #8E93A6; cursor: pointer; }
  .set-upload-area { border: 1.5px dashed rgba(144, 164, 255, 0.4); border-radius: 12px; padding: 16px 10px; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #90A4FF; cursor: pointer; transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); background: rgba(144, 164, 255, 0.05); font-weight: 600; }
  .set-upload-area:active { background: rgba(144, 164, 255, 0.1); transform: scale(0.98); }
  
  .set-app-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px 12px; margin-bottom: 10px; }
  .set-app-box { position: relative; display: flex; flex-direction: column; align-items: center; }
  .set-app-item { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; width: 100%; }
  .set-app-item:active { opacity: 0.7; }
  .set-app-item-icon { width: 46px; height: 46px; border-radius: 12px; background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .set-app-item-icon img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .set-app-item-icon i { font-size: 20px; color: #8E93A6; }
  .set-app-item span { font-size: 10px; color: #1C1D24; font-weight: 600; margin-bottom: 2px;}
  .set-app-reset-wrap { padding: 3px 8px; border-radius: 6px; background: rgba(0,0,0,0.03); color: #8E93A6; font-size: 9px; cursor: pointer; transition: 0.2s; margin-top: 4px; font-weight: 600; border: 1px solid rgba(0,0,0,0.02);}
  .set-app-reset-wrap:active { background: rgba(0,0,0,0.08); transform: scale(0.9); }

  .set-bubble-toggle { width: 46px; height: 24px; background: rgba(0,0,0,0.06); border-radius: 20px; cursor: pointer; position: relative; transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); border: 1px solid rgba(0,0,0,0.02); }
  .set-bubble-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
  .set-bubble-toggle.active { background: #1C1D24; }
  .set-bubble-toggle.active::after { transform: translateX(22px); box-shadow: 0 2px 6px rgba(255,255,255,0.2); }

  .set-control-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.02); }
  .set-control-row:last-child { border-bottom: none; }
  .set-control-text .set-c-tit { display: block; font-size: 14px; font-weight: 500; font-family: -apple-system, sans-serif; margin-bottom: 4px; color: #1C1D24;}
  .set-control-text .set-c-sub { font-size: 11px; color: #8E93A6; font-family: -apple-system, sans-serif; }

  .set-dock-container { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(40px) saturate(200%); -webkit-backdrop-filter: blur(40px) saturate(200%); border: 1px solid rgba(255, 255, 255, 0.9); padding: 10px 20px; border-radius: 50px; display: flex; gap: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); z-index: 100; }
  .set-dock-btn { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; font-size: 18px; color: #8E93A6; cursor: pointer; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); border: 1.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
  .set-dock-indicator { position: absolute; width: 6px; height: 6px; background: #1C1D24; border-radius: 50%; bottom: -8px; left: 50%; margin-left: -3px; transform: scale(0); transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .set-dock-btn.active { color: #1C1D24; transform: translateY(-4px); background: #ffffff; box-shadow: 0 10px 20px rgba(0,0,0,0.06); }
  .set-dock-btn.active .set-dock-indicator { transform: scale(1); }
`;

function initSettingsEngine() {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = SettingsCSS;
  document.head.appendChild(styleEl);

  const viewOverlay = document.createElement('div');
  viewOverlay.id = 'settings-view-overlay';
  viewOverlay.innerHTML = SettingsViewHTML;
  document.body.appendChild(viewOverlay);

  // 初始化设置项联动效果
  const appPreview = document.getElementById('setAppPreview');
  const sizeSlider = document.getElementById('setSizeSlider');
  const radiusSlider = document.getElementById('setRadiusSlider');
  const sizeVal = document.getElementById('setSizeVal');
  const radiusVal = document.getElementById('setRadiusVal');

  sizeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    appPreview.style.width = `${val}px`;
    appPreview.style.height = `${val}px`;
    sizeVal.innerText = `${val}px`;
  });

  radiusSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    if(val >= 50) {
      appPreview.style.borderRadius = `50%`;
      radiusVal.innerText = `圆`;
    } else {
      appPreview.style.borderRadius = `${val}px`;
      radiusVal.innerText = `${val}px`;
    }
  });

  // 恢复全屏开关 UI 状态
  LocalDB.getItem('user_fullscreen_pref').then(isFullscreenPref => {
    const fsToggle = document.getElementById('set-fullscreen-toggle');
    if (isFullscreenPref === true && fsToggle) {
      fsToggle.classList.add('active');
    }
  });

  // 恢复灵动岛开关 UI 状态
  LocalDB.getItem('user_island_pref').then(isIslandPref => {
    const islandToggle = document.getElementById('set-island-toggle');
    if (isIslandPref === false) {
      if (islandToggle) islandToggle.classList.remove('active');
      document.body.classList.add('hide-island');
    } else {
      if (islandToggle) islandToggle.classList.add('active');
      document.body.classList.remove('hide-island');
    }
  });

  // 恢复桌面图标设置
  LocalDB.getItem('user_app_icon_pref').then(pref => {
    const size = pref ? pref.size : 46;
    const radius = pref ? pref.radius : 12;
    
    applyAppIconStyle(size, radius);

    if(sizeSlider && radiusSlider) {
      sizeSlider.value = size;
      radiusSlider.value = radius;
      
      appPreview.style.width = `${size}px`;
      appPreview.style.height = `${size}px`;
      sizeVal.innerText = `${size}px`;

      if(radius >= 50) {
        appPreview.style.borderRadius = '50%';
        radiusVal.innerText = '圆';
      } else {
        appPreview.style.borderRadius = `${radius}px`;
        radiusVal.innerText = `${radius}px`;
      }
    }
  });
}

function openSettingsView() {
  document.getElementById('settings-view-overlay').classList.add('active');
}

function closeSettingsView() {
  document.getElementById('settings-view-overlay').classList.remove('active');
}

function toggleSetExhibit(tabEl) {
  const exhibit = tabEl.parentElement;
  document.querySelectorAll('.set-exhibit').forEach(ex => {
    if (ex !== exhibit) ex.classList.remove('active');
  });
  exhibit.classList.toggle('active');
}

function activateSetPolaroid(el) {
  document.querySelectorAll('.set-polaroid').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const wpUrl = el.getAttribute('data-wp');
  if(wpUrl) {
    applyWallpaper(wpUrl);
    LocalDB.setItem('user_wallpaper', wpUrl);
  }
}

function triggerSetUpload(el) {
  document.querySelectorAll('.set-polaroid').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('customWpUpload').click();
}

function handleWpUpload(e) {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const base64 = event.target.result;
      applyWallpaper(base64);
      LocalDB.setItem('user_wallpaper', base64);
      showSetToast('自定义壁纸已应用');
    };
    reader.readAsDataURL(file);
  }
  e.target.value = '';
}

function applyWallpaper(url) {
  const wpLayer = document.getElementById('global-wallpaper');
  if(wpLayer) {
    wpLayer.style.backgroundImage = `url('${url}')`;
    wpLayer.style.display = 'block';
    document.body.classList.add('has-custom-wp');
  }
}

function resetWallpaper() {
  const wpLayer = document.getElementById('global-wallpaper');
  if(wpLayer) {
    wpLayer.style.display = 'none';
    wpLayer.style.backgroundImage = 'none';
    document.body.classList.remove('has-custom-wp');
  }
  LocalDB.setItem('user_wallpaper', null);
  document.querySelectorAll('.set-polaroid').forEach(p => p.classList.remove('active'));
  showSetToast('已恢复默认壁纸');
}

// 初始化时加载壁纸
document.addEventListener("DOMContentLoaded", () => {
  LocalDB.getItem('user_wallpaper').then(wp => {
    if(wp) applyWallpaper(wp);
  });
});

function switchSetDock(el) {
  const btns = Array.from(document.querySelectorAll('.set-dock-btn'));
  btns.forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  
  const index = btns.indexOf(el);
  const gallery = document.getElementById('setGalleryContainer');
  const fontView = document.getElementById('setFontContainer');
  
  if (index === 0) {
      gallery.style.display = 'flex';
      if(fontView) fontView.style.display = 'none';
  } else if (index === 1) {
      gallery.style.display = 'none';
      if(fontView) fontView.style.display = 'flex';
  } else {
      gallery.style.display = 'none';
      if(fontView) fontView.style.display = 'none';
  }
}

let currentCustomFont = null;

function handleFontUpload(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    const base64 = event.target.result;
    const fontName = 'CustomFont_' + Date.now();
    applyGlobalFont(fontName, base64);
    currentCustomFont = { name: fontName, url: base64, type: 'base64' };
    LocalDB.setItem('user_custom_font', currentCustomFont);
    document.getElementById('uploadFontText').innerText = `已选择: ${file.name}`;
    showSetToast('字体已应用');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function importFontFromUrl() {
  const url = document.getElementById('fontUrlInput').value.trim();
  if(!url) return showSetToast('请输入有效的 URL');
  const fontName = 'CustomFont_' + Date.now();
  applyGlobalFont(fontName, url);
  currentCustomFont = { name: fontName, url: url, type: 'url' };
  LocalDB.setItem('user_custom_font', currentCustomFont);
  showSetToast('网络字体已应用');
}

function applyGlobalFont(name, url) {
  const fontFace = new FontFace(name, `url(${url})`);
  fontFace.load().then(loadedFace => {
    document.fonts.add(loadedFace);
    document.body.style.fontFamily = `"${name}", -apple-system, BlinkMacSystemFont, "Playfair Display", "Helvetica Neue", sans-serif`;
  }).catch(err => {
    console.error(err);
    showSetToast('字体加载失败，可能跨域或格式错误');
  });
}

function renderFontPresets() {
  LocalDB.getItem('user_font_presets').then(presets => {
    const list = document.getElementById('fontPresetList');
    if(!list) return;
    list.innerHTML = '';
    if(!presets || presets.length === 0) return;
    
    presets.forEach((p, index) => {
      const el = document.createElement('div');
      el.className = 'set-preset-item';
      el.innerHTML = `
        <span>${p.presetName} <span style="color:#8E93A6; font-size:10px;">${p.type === 'url' ? '(URL)' : '(TTF)'}</span></span>
        <div class="set-preset-actions">
          <div class="set-preset-btn apply" onclick="applyFontPreset(${index})">应用</div>
          <div class="set-preset-btn del" onclick="deleteFontPreset(${index})"><i class="fa-solid fa-trash"></i></div>
        </div>
      `;
      list.appendChild(el);
    });
  });
}

function applyFontPreset(index) {
  LocalDB.getItem('user_font_presets').then(presets => {
    if(presets && presets[index]) {
      const p = presets[index];
      applyGlobalFont(p.name, p.url);
      currentCustomFont = p;
      LocalDB.setItem('user_custom_font', p);
      showSetToast('预设字体已应用');
    }
  });
}

function deleteFontPreset(index) {
  LocalDB.getItem('user_font_presets').then(presets => {
    if(presets && presets[index]) {
      presets.splice(index, 1);
      LocalDB.setItem('user_font_presets', presets).then(() => {
        renderFontPresets();
        showSetToast('预设已删除');
      });
    }
  });
}

function saveFontAsPreset() {
  if(!currentCustomFont) return showSetToast('当前没有自定义字体');
  const presetName = prompt('是否将当前字体存为预设？请输入预设名称：', '我的字体');
  if(presetName) {
    LocalDB.getItem('user_font_presets').then(presets => {
      const list = presets || [];
      list.push({ presetName, ...currentCustomFont });
      LocalDB.setItem('user_font_presets', list).then(() => {
        showSetToast('预设已保存');
        renderFontPresets();
      });
    });
  }
}

function resetGlobalFont() {
  document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Playfair Display", "Helvetica Neue", sans-serif';
  currentCustomFont = null;
  LocalDB.setItem('user_custom_font', null);
  document.getElementById('uploadFontText').innerText = '点击上传 TTF/OTF 文件';
  document.getElementById('fontUrlInput').value = '';
  showSetToast('已恢复默认字体');
}

// 初始化字体与字号
document.addEventListener("DOMContentLoaded", () => {
  LocalDB.getItem('user_custom_font').then(font => {
    if(font) {
      currentCustomFont = font;
      applyGlobalFont(font.name, font.url);
    }
  });

  LocalDB.getItem('user_global_font_size').then(size => {
    if(size) {
      document.documentElement.style.setProperty('--font-scale', size / 14);
      const slider = document.getElementById('setGlobalFontSizeSlider');
      if(slider) {
        slider.value = size;
        document.getElementById('setGlobalFontSizeVal').innerText = size + 'px';
      }
    }
  });

  // 绑定字号滑块事件
  setTimeout(() => {
    const fontSizeSlider = document.getElementById('setGlobalFontSizeSlider');
    if(fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('setGlobalFontSizeVal').innerText = val + 'px';
        document.documentElement.style.setProperty('--font-scale', val / 14);
      });
      fontSizeSlider.addEventListener('change', (e) => {
         LocalDB.setItem('user_global_font_size', e.target.value);
      });
    }
  }, 500);

  // 渲染字体预设
  setTimeout(renderFontPresets, 500);

  // 初始化加载设置页大头像
  LocalDB.getItem('user_widget_imgs').then(data => {
    if(data && data['main-avatar']) {
      const setAvatar = document.getElementById('setMainAvatar');
      if(setAvatar) setAvatar.style.backgroundImage = `url('${data['main-avatar']}')`;
    }
  });
});

function handleSetAvatarUpload(e) {
  const file = e.target.files[0];
  if(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const base64 = event.target.result;
      document.getElementById('setMainAvatar').style.backgroundImage = `url('${base64}')`;
      
      // 同步到组件数据库
      LocalDB.getItem('user_widget_imgs').then(data => {
        const imgs = data || {};
        imgs['main-avatar'] = base64;
        LocalDB.setItem('user_widget_imgs', imgs);
      });

      // 同步主界面头像
      const mainAvatar = document.querySelector('.user-widget .avatar');
      if (mainAvatar) {
        mainAvatar.style.backgroundImage = `url('${base64}')`;
      }
      showSetToast('头像已更新');
    };
    reader.readAsDataURL(file);
  }
  e.target.value = '';
}

function resetFontSize() {
  const defaultSize = 14;
  const slider = document.getElementById('setGlobalFontSizeSlider');
  if(slider) slider.value = defaultSize;
  document.getElementById('setGlobalFontSizeVal').innerText = defaultSize + 'px';
  document.documentElement.style.setProperty('--font-scale', 1);
  LocalDB.setItem('user_global_font_size', defaultSize);
  showSetToast('字号已恢复默认');
}

async function toggleSettingsFullscreen(el) {
  const isCurrentlyFullscreen = !!document.fullscreenElement;
  if (!isCurrentlyFullscreen) {
    await document.documentElement.requestFullscreen().catch(err => console.log(err));
    el.classList.add('active');
    LocalDB.setItem('user_fullscreen_pref', true);
  } else {
    await document.exitFullscreen();
    el.classList.remove('active');
    LocalDB.setItem('user_fullscreen_pref', false);
  }
}

function toggleIslandPref(el) {
  const isActive = el.classList.contains('active');
  if (isActive) {
    el.classList.remove('active');
    document.body.classList.add('hide-island');
    LocalDB.setItem('user_island_pref', false);
  } else {
    el.classList.add('active');
    document.body.classList.remove('hide-island');
    LocalDB.setItem('user_island_pref', true);
  }
}

document.addEventListener('fullscreenchange', () => {
  const toggle = document.getElementById('set-fullscreen-toggle');
  if (toggle) {
    if (document.fullscreenElement) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }
});

function showSetToast(msg) {
  const toast = document.getElementById('set-toast');
  if(!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

function openIconSizeView() {
  document.getElementById('setIconNavView').style.display = 'none';
  const sizeView = document.getElementById('setIconSizeView');
  sizeView.style.display = 'block';
  // 强制回流以触发 transition
  void sizeView.offsetWidth;
  sizeView.classList.add('show');
}

function backToIconNav() {
  const sizeView = document.getElementById('setIconSizeView');
  sizeView.classList.remove('show');
  setTimeout(() => {
      sizeView.style.display = 'none';
      document.getElementById('setIconNavView').style.display = 'flex';
  }, 300);
}

let currentUploadAppId = null;
let tempCustomIcons = {};

function openIconThemeModal() {
  document.getElementById('setIconThemeModal').classList.add('active');
  // 读取已有的自定义图标并回显
  LocalDB.getItem('user_custom_icons').then(icons => {
    if(icons) {
      tempCustomIcons = { ...icons };
      Object.keys(icons).forEach(id => {
        const iconBox = document.getElementById('preview-icon-' + id);
        if(iconBox && icons[id]) {
          iconBox.innerHTML = `<img src="${icons[id]}" alt="">`;
        }
      });
    }
  });
}

function closeIconThemeModal() {
  document.getElementById('setIconThemeModal').classList.remove('active');
}

function triggerAppIconUpload(appId) {
  currentUploadAppId = appId;
  document.getElementById('customAppIconUpload').click();
}

function handleAppIconUpload(e) {
  const file = e.target.files[0];
  if(file && currentUploadAppId) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const base64 = event.target.result;
      tempCustomIcons[currentUploadAppId] = base64;
      const iconBox = document.getElementById('preview-icon-' + currentUploadAppId);
      if(iconBox) {
        iconBox.innerHTML = `<img src="${base64}" alt="">`;
      }
    };
    reader.readAsDataURL(file);
  }
  e.target.value = ''; // 清空以允许重复选择
}

function saveIconTheme() {
  LocalDB.setItem('user_custom_icons', tempCustomIcons).then(() => {
    closeIconThemeModal();
    showSetToast('图标已更换');
    syncMainUIAppIcons(tempCustomIcons);
  });
}

function resetSingleAppIcon(appId) {
  if (tempCustomIcons[appId]) {
    delete tempCustomIcons[appId];
  }
  const iconMap = {
    'calendar': 'fa-calendar', 'photos': 'fa-image', 'camera': 'fa-camera', 'notes': 'fa-note-sticky',
    'maps': 'fa-map', 'calc': 'fa-calculator', 'safari': 'fa-compass', 'contacts': 'fa-address-book'
  };
  const iconBox = document.getElementById('preview-icon-' + appId);
  if(iconBox) {
    iconBox.innerHTML = `<i class="fa-solid ${iconMap[appId]}"></i>`;
  }
}

function resetIconTheme() {
  tempCustomIcons = {};
  LocalDB.setItem('user_custom_icons', tempCustomIcons).then(() => {
    const iconMap = {
      'calendar': 'fa-calendar', 'photos': 'fa-image', 'camera': 'fa-camera', 'notes': 'fa-note-sticky',
      'maps': 'fa-map', 'calc': 'fa-calculator', 'safari': 'fa-compass', 'contacts': 'fa-address-book'
    };
    Object.keys(iconMap).forEach(id => {
      const iconBox = document.getElementById('preview-icon-' + id);
      if(iconBox) {
        iconBox.innerHTML = `<i class="fa-solid ${iconMap[id]}"></i>`;
      }
    });
    closeIconThemeModal();
    showSetToast('已恢复默认图标');
    syncMainUIAppIcons(tempCustomIcons);
  });
}

// 核心逻辑：真正同步图标至第一页主页面
function syncMainUIAppIcons(customIcons) {
  const nameToKey = { 
    '日历': 'calendar', '照片': 'photos', '相机': 'camera', '备忘录': 'notes', 
    '地图': 'maps', '计算器': 'calc', 'Safari': 'safari', '通讯录': 'contacts' 
  };
  
  document.querySelectorAll('.app').forEach(app => {
    const nameEl = app.querySelector('.app-name');
    const iconEl = app.querySelector('.app-icon');
    if(nameEl && iconEl) {
      const nameText = nameEl.innerText.trim();
      const key = nameToKey[nameText];
      if(!key) return;

      if(!iconEl.hasAttribute('data-def-html')) {
        iconEl.setAttribute('data-def-html', iconEl.innerHTML);
        iconEl.setAttribute('data-def-bg', iconEl.style.background);
      }

      if(customIcons && customIcons[key]) {
        iconEl.innerHTML = `<img src="${customIcons[key]}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;position:relative;z-index:10;">`;
        iconEl.style.background = 'transparent';
      } else {
        iconEl.innerHTML = iconEl.getAttribute('data-def-html');
        iconEl.style.background = iconEl.getAttribute('data-def-bg');
      }
    }
  });
}

// 初始化时执行一次同步加载真实图标
document.addEventListener("DOMContentLoaded", () => {
  LocalDB.getItem('user_custom_icons').then(icons => {
    if(icons) {
      tempCustomIcons = { ...icons };
      syncMainUIAppIcons(icons);
    }
  });
});

function applyAppIconStyle(size, radius) {
  let styleEl = document.getElementById('dynamic-app-icon-style');
  if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-app-icon-style';
      document.head.appendChild(styleEl);
  }
  const dockSize = parseInt(size) + 2;
  styleEl.innerHTML = `
      .app-icon { width: ${size}px !important; height: ${size}px !important; border-radius: ${radius}px !important; }
      .dock .app-icon { width: ${dockSize}px !important; height: ${dockSize}px !important; border-radius: ${radius}px !important; }
  `;
}

function saveAppIconSettings() {
  const size = document.getElementById('setSizeSlider').value;
  const radius = document.getElementById('setRadiusSlider').value;
  applyAppIconStyle(size, radius);
  LocalDB.setItem('user_app_icon_pref', { size: parseInt(size), radius: parseInt(radius) });
  
  showSetToast('已保存');
}

function resetAppIconSettings() {
  const defaultSize = 46;
  const defaultRadius = 12;
  
  const sizeSlider = document.getElementById('setSizeSlider');
  const radiusSlider = document.getElementById('setRadiusSlider');
  sizeSlider.value = defaultSize;
  radiusSlider.value = defaultRadius;
  
  sizeSlider.dispatchEvent(new Event('input'));
  radiusSlider.dispatchEvent(new Event('input'));

  applyAppIconStyle(defaultSize, defaultRadius);
  LocalDB.setItem('user_app_icon_pref', { size: defaultSize, radius: defaultRadius });
  
  showSetToast('已恢复默认');
}

// 自动注入DOM
document.addEventListener("DOMContentLoaded", initSettingsEngine);
