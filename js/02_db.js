// ==========================================
// 数据库与全屏状态初始化引擎
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    // 读取全屏偏好
    const isFullscreenPref = await LocalDB.getItem('user_fullscreen_pref');
    const fsOverlay = document.getElementById('fs-overlay');
    
    if (isFullscreenPref === true) {
        // 用户偏好全屏，保留遮罩等待用户点击触发
        if (fsOverlay) {
            fsOverlay.style.display = 'block';
            fsOverlay.onclick = () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => console.log(err));
                }
                fsOverlay.style.display = 'none';
            };
        }
    } else {
        // 用户偏好非全屏，直接隐藏遮罩
        if (fsOverlay) {
            fsOverlay.style.display = 'none';
        }
    }
});
