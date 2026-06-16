// ==========================================
// 全局组件图片上传与文案编辑引擎
// ==========================================

const CustomEngineHTML = `
  <!-- 组件图片上传弹窗 -->
  <div id="widgetImgModal" class="set-modal-overlay center-modal" onclick="closeWidgetImgModal()">
    <div class="set-modal-content center-content" onclick="event.stopPropagation()">
      <div class="set-modal-header">
        <h3>更换组件图片</h3>
        <i class="fa-solid fa-xmark" onclick="closeWidgetImgModal()"></i>
      </div>
      <div class="set-modal-body">
         <!-- 动态组件等比真实预览 -->
         <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom: 24px; width: 100%;">
           <div id="targetImgPreviewBox" style="background-size: cover; background-position: center; box-shadow: 0 8px 24px rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.05); transition: background-image 0.3s; margin-bottom: 12px;"></div>
           <span style="font-size: 10px; font-weight: 700; color: #8E93A6; letter-spacing: 1px;">ORIGINAL WIDGET</span>
         </div>

         <div class="set-upload-area" onclick="document.getElementById('widgetImgUploadInput').click()">
           <i class="fa-solid fa-cloud-arrow-up text-[24px]"></i>
           <span id="widgetUploadText">Upload Photo</span>
           <input type="file" id="widgetImgUploadInput" accept="image/*" style="display: none;" onchange="handleWidgetImgUpload(event)">
         </div>
      </div>
      <div class="set-action-btns">
        <div class="set-square-btn" onclick="resetWidgetImg()">恢复默认</div>
        <div class="set-square-btn primary" onclick="saveWidgetImg()">保存</div>
      </div>
    </div>
  </div>

  <!-- 悬浮文本恢复默认按钮 -->
  <div id="textResetBtn" style="display:none; position:absolute; width:22px; height:22px; background:#1C1D24; color:#fff; border-radius:50%; align-items:center; justify-content:center; font-size:10px; cursor:pointer; z-index:99999; box-shadow:0 2px 8px rgba(0,0,0,0.2); transition: transform 0.2s;">
    <i class="fa-solid fa-rotate-left"></i>
  </div>
`;

const CustomEngineCSS = `
  [contenteditable="true"] {
    outline: none;
    transition: color 0.3s, opacity 0.3s;
  }
  [contenteditable="true"]:focus {
    color: #90A4FF !important;
    opacity: 0.8;
  }
  .is-edited {
    color: #FF8FAB !important;
  }
  #textResetBtn:active { transform: scale(0.85); }
`;

function initCustomEngine() {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = CustomEngineCSS;
    document.head.appendChild(styleEl);

    const container = document.createElement('div');
    container.innerHTML = CustomEngineHTML;
    document.body.appendChild(container);

    loadCustomData();
    initTextEditorLogic();
}

// ================= 组件图片上传逻辑 =================
let currentWidgetImgId = null;
let currentWidgetImgEl = null;
let tempWidgetImgBase64 = null;
let customWidgetImgs = {};

window.openWidgetImgModal = function(id, el) {
    currentWidgetImgId = id;
    currentWidgetImgEl = el;
    tempWidgetImgBase64 = null;
    
    // 动态读取原组件尺寸与圆角进行等比预览
    const previewBox = document.getElementById('targetImgPreviewBox');
    if(previewBox) {
        const compStyle = window.getComputedStyle(el);
        const w = parseFloat(compStyle.width);
        const h = parseFloat(compStyle.height);
        const radius = compStyle.borderRadius;
        
        let scale = 1;
        if (w > 200 || h > 120) {
            scale = Math.min(200 / w, 120 / h);
        }
        
        // 保证预览框不会太小
        const finalW = Math.max(w * scale, 60);
        const finalH = Math.max(h * scale, 60);
        
        previewBox.style.width = finalW + 'px';
        previewBox.style.height = finalH + 'px';
        
        // 如果原组件是正圆，等比缩小后也应保持正圆
        if(radius === '50%' || parseFloat(radius) > Math.min(w,h)/2) {
            previewBox.style.borderRadius = '50%';
        } else {
            previewBox.style.borderRadius = (parseFloat(radius) * scale) + 'px';
        }
        
        previewBox.style.backgroundImage = el.style.backgroundImage;
    }
    
    document.getElementById('widgetUploadText').innerText = 'Upload Photo';
    document.getElementById('widgetImgModal').classList.add('active');
}

window.closeWidgetImgModal = function() {
    document.getElementById('widgetImgModal').classList.remove('active');
}

window.handleWidgetImgUpload = function(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            tempWidgetImgBase64 = event.target.result;
            document.getElementById('widgetUploadText').innerText = `已选择: ${file.name}`;
            
            // 实时在预览框中显示新图片
            const previewBox = document.getElementById('targetImgPreviewBox');
            if(previewBox) {
                previewBox.style.backgroundImage = `url('${tempWidgetImgBase64}')`;
            }
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
}

window.saveWidgetImg = function() {
    if(tempWidgetImgBase64 && currentWidgetImgEl && currentWidgetImgId) {
        // 保存原始 URL 以备恢复
        if(!currentWidgetImgEl.hasAttribute('data-orig-bg')) {
            currentWidgetImgEl.setAttribute('data-orig-bg', currentWidgetImgEl.style.backgroundImage);
        }
        currentWidgetImgEl.style.backgroundImage = `url('${tempWidgetImgBase64}')`;
        customWidgetImgs[currentWidgetImgId] = tempWidgetImgBase64;
        LocalDB.setItem('user_widget_imgs', customWidgetImgs);
        if(typeof showSetToast === 'function') showSetToast('组件图片已更换');
    }
    closeWidgetImgModal();
}

window.resetWidgetImg = function() {
    if(currentWidgetImgEl && currentWidgetImgId) {
        if(customWidgetImgs[currentWidgetImgId]) {
            delete customWidgetImgs[currentWidgetImgId];
            LocalDB.setItem('user_widget_imgs', customWidgetImgs);
        }
        if(currentWidgetImgEl.hasAttribute('data-orig-bg')) {
            currentWidgetImgEl.style.backgroundImage = currentWidgetImgEl.getAttribute('data-orig-bg');
        }
        if(typeof showSetToast === 'function') showSetToast('已恢复默认图片');
    }
    closeWidgetImgModal();
}

// ================= 文本编辑逻辑 =================
let customTexts = {};
let currentEditEl = null;
let textSaveTimer = null;

function initTextEditorLogic() {
    const resetBtn = document.getElementById('textResetBtn');

    document.addEventListener('focusin', (e) => {
        if(e.target.hasAttribute('contenteditable')) {
            currentEditEl = e.target;
            if(!currentEditEl.hasAttribute('data-orig-text')) {
                currentEditEl.setAttribute('data-orig-text', currentEditEl.innerText.trim());
            }
            positionResetBtn(currentEditEl);
        }
    });

    document.addEventListener('input', (e) => {
        if(e.target.hasAttribute('contenteditable')) {
            const el = e.target;
            
            // 修改时变色，维持一秒后恢复
            el.classList.add('is-edited');
            clearTimeout(el.colorTimer);
            el.colorTimer = setTimeout(() => {
                el.classList.remove('is-edited');
            }, 1000);

            positionResetBtn(el);
            
            // 实时防抖保存，防止未失去焦点直接刷新导致丢失
            clearTimeout(textSaveTimer);
            textSaveTimer = setTimeout(saveAllTexts, 500);
        }
    });

    document.addEventListener('focusout', (e) => {
        if(e.target.hasAttribute('contenteditable')) {
            setTimeout(() => {
                if(document.activeElement !== e.target && document.activeElement !== resetBtn) {
                    resetBtn.style.display = 'none';
                    saveAllTexts();
                }
            }, 150);
        }
    });

    // 必须用 mousedown 防止 blur 提前触发隐藏
    resetBtn.addEventListener('mousedown', (e) => {
        e.preventDefault(); 
        if(currentEditEl) {
            currentEditEl.innerText = currentEditEl.getAttribute('data-orig-text');
            currentEditEl.classList.remove('is-edited');
            saveAllTexts();
            positionResetBtn(currentEditEl);
            if(typeof showSetToast === 'function') showSetToast('已恢复默认文案');
        }
    });
}

function positionResetBtn(el) {
    const resetBtn = document.getElementById('textResetBtn');
    const rect = el.getBoundingClientRect();
    resetBtn.style.display = 'flex';
    resetBtn.style.top = (rect.top + window.scrollY + rect.height/2 - 11) + 'px';
    resetBtn.style.left = (rect.right + window.scrollX + 8) + 'px';
}

function saveAllTexts() {
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        const id = el.getAttribute('data-edit-id');
        const orig = el.getAttribute('data-orig-text');
        if(id && orig !== null) {
            const current = el.innerText.trim();
            if(current !== orig) {
                customTexts[id] = current;
            } else if(customTexts[id]) {
                delete customTexts[id];
            }
        }
    });
    LocalDB.setItem('user_custom_texts', customTexts);
}

// ================= 初始化数据加载 =================
function loadCustomData() {
    LocalDB.getItem('user_widget_imgs').then(data => {
        if(data) {
            customWidgetImgs = data;
            Object.keys(data).forEach(id => {
                const el = document.querySelector(`[data-img-id="${id}"]`);
                if(el) {
                    if(!el.hasAttribute('data-orig-bg')) {
                        el.setAttribute('data-orig-bg', el.style.backgroundImage);
                    }
                    el.style.backgroundImage = `url('${data[id]}')`;
                }
            });
        }
    });

    LocalDB.getItem('user_custom_texts').then(data => {
        if(data) {
            customTexts = data;
            Object.keys(data).forEach(id => {
                const el = document.querySelector(`[data-edit-id="${id}"]`);
                if(el) {
                    if(!el.hasAttribute('data-orig-text')) {
                        el.setAttribute('data-orig-text', el.innerText.trim());
                    }
                    el.innerText = data[id];
                }
            });
        }
    });
}

document.addEventListener("DOMContentLoaded", initCustomEngine);
