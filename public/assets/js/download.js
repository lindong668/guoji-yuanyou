/* ============================================================
 * download.js —— 全站统一下载（重点解决 iPhone 下载不了）
 * ------------------------------------------------------------
 * 为什么原来的下载在 iPhone 上没反应：
 *   代码用的是 a.download + a.click()。iOS Safari **不支持 download 属性**
 *   （iOS 13 之前完全忽略，之后对 blob: 也经常失败），
 *   点了之后要么毫无反应，要么直接把图片在新页面打开——用户就以为下载坏了。
 *   桌面 Chrome / Edge / Firefox / Android 都没这个问题，
 *   所以「电脑端正常、手机下载不了」是必然现象，不是偶发。
 *
 * 修法：按能力分流
 *   ① 支持 download 属性 → 照旧静默下载（体验最好）
 *   ② 不支持（iOS Safari）→ 弹出保存面板，展示图片让**长按保存到相册**
 *      这是 iOS 上唯一 100% 可行的通用方案。
 *
 * 用法：window.__download(canvasOrDataUrl, '文件名.png')
 * ============================================================ */
(function () {
    'use strict';

    /* 是否支持 a[download] —— Android / 桌面为 true，iOS Safari 为 false */
    var supportsDownload = ('download' in document.createElement('a')) &&
        !/iP(hone|ad|od)/.test(navigator.userAgent);
    /* iOS 13+ 声称支持，但对 blob/dataURL 仍不稳定，这里一律走保存面板更保险 */

    var panel = null;

    function buildPanel() {
        if (panel) return panel;
        panel = document.createElement('div');
        panel.id = '__dlPanel';
        panel.style.cssText = 'position:fixed;inset:0;z-index:99999;display:none;' +
            'align-items:center;justify-content:center;background:rgba(2,6,23,.92);padding:20px';
        panel.innerHTML =
            '<div style="max-width:100%;max-height:100%;overflow:auto;text-align:center">' +
            '<div style="color:#f1f5f9;font-size:1rem;font-weight:600;margin-bottom:10px;line-height:1.6">' +
            '长按下方图片 → 选择「存储到照片」</div>' +
            '<div style="color:#94a3b8;font-size:.82rem;margin-bottom:14px;line-height:1.6">' +
            'iPhone 的浏览器不支持直接下载文件，用长按保存即可</div>' +
            '<img id="__dlImg" style="max-width:100%;max-height:62vh;border-radius:10px;' +
            'box-shadow:0 8px 30px rgba(0,0,0,.5);display:block;margin:0 auto">' +
            '<button id="__dlClose" style="margin-top:18px;padding:10px 26px;border-radius:8px;' +
            'border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-size:.9rem">关闭</button>' +
            '</div>';
        document.body.appendChild(panel);
        panel.querySelector('#__dlClose').onclick = function () { panel.style.display = 'none'; };
        panel.addEventListener('click', function (e) { if (e.target === panel) panel.style.display = 'none'; });
        return panel;
    }

    function toDataURL(src) {
        if (typeof src === 'string') return src;
        try { return src.toDataURL('image/png'); } catch (e) { return null; }
    }

    window.__download = function (src, filename) {
        var url = toDataURL(src);
        if (!url) { alert('生成图片失败，请重试'); return; }
        filename = filename || 'picstudio.png';

        if (supportsDownload) {
            var a = document.createElement('a');
            a.download = filename;
            a.href = url;
            /* 部分浏览器要求元素在文档内才触发 */
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 100);
            return;
        }

        /* iOS：弹出长按保存面板 */
        var p = buildPanel();
        var img = p.querySelector('#__dlImg');
        img.src = url;
        p.style.display = 'flex';
    };

    /* 供页面判断当前是否走 iOS 保存模式（可用于提示文案） */
    window.__dlNeedsLongPress = function () { return !supportsDownload; };
})();
