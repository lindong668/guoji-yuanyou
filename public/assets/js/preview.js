/* ============================================================
 * preview.js —— 图片预览健壮化（独立，不依赖任何库）
 * ------------------------------------------------------------
 * 为什么需要它：
 *   <img> 直接加载原图 blob URL 时，手机端（尤其 iOS 无痕模式）
 *   常因内存上限解码失败，露出底层棋盘格 —— 深色主题下看着就是「一片黑」。
 *
 * 关键认知（v10 修正，务必保留）：
 *   预览失败 ≠ 图片有问题。同样的文件在「处理流程」里往往能正常出图，
 *   因为处理走的是降采样后的 canvas。差别就在**预览没有降采样**：
 *   一张 1170×2532 的手机照片，原图解码约需 11.8MB 内存，
 *   降采样到 1200 后约 2.7MB，手机浏览器就能稳稳拿下。
 *   所以正确的修法不是「提示用户换格式」，而是**预览前先缩图**。
 *
 * 用法：window.__setPreview(imgEl, file, onOk, onFail)
 * ============================================================ */
(function () {
    'use strict';

    /* 预览最大边长。原图直接给 <img> 在手机上很容易解码失败，
     * 统一缩到这个尺寸再显示：既省内存，视觉上也看不出差别。 */
    var PREVIEW_MAX = 1200;
    /* 超过多少像素才需要缩图（小图缩了反而多一次编码开销） */
    var SHRINK_THRESHOLD = 1200 * 1200;

    /* 把任意可绘制源缩到 PREVIEW_MAX，返回 blob URL。
     * 失败时回调 null，由调用方决定退回原图。 */
    function shrinkToURL(src, sw, sh, cb) {
        try {
            var sc = Math.min(1, PREVIEW_MAX / Math.max(sw, sh));
            var c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(sw * sc));
            c.height = Math.max(1, Math.round(sh * sc));
            c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
            if (!c.toBlob) { cb(null); return; }
            c.toBlob(function (blob) {
                if (!blob) { cb(null); return; }
                try { cb(URL.createObjectURL(blob)); } catch (e) { cb(null); }
            }, 'image/jpeg', 0.9);
        } catch (e) { cb(null); }
    }

    window.__setPreview = function (imgEl, file, onOk, onFail) {
        if (!imgEl || !file) return;
        var steps = [];
        var settled = false;

        /* 记下最近一次文件：全局兜底重试时要用到 */
        window.__lastPreviewFile = file;

        function finish(ok, url, how) {
            if (settled) return; settled = true;
            if (ok) { if (onOk) onOk(url, how); }
            else { if (onFail) onFail(steps); }
        }
        function note(t) { steps.push(t); }

        /* 统一出口：先缩图再显示；缩图失败就退回原 URL */
        function deliver(okUrl, probe, how) {
            var sw = probe.naturalWidth || probe.width;
            var sh = probe.naturalHeight || probe.height;
            if (sw * sh > SHRINK_THRESHOLD && sw > 0 && sh > 0) {
                shrinkToURL(probe, sw, sh, function (smallUrl) {
                    /* 缩图成功用缩图，失败就用原 URL —— 电脑端原图本来就够用 */
                    imgEl.src = smallUrl || okUrl;
                    note((smallUrl ? '缩图成功' : '缩图失败退回原图') + ':' + how);
                    finish(true, imgEl.src, how);
                });
            } else {
                imgEl.src = okUrl; note('小图直出:' + how);
                finish(true, okUrl, how);
            }
        }

        /* --- 方式1: objectURL --- */
        function tryObjectURL() {
            var url;
            try { url = URL.createObjectURL(file); }
            catch (e) { note('objectURL创建失败:' + e.message); return tryBitmap(); }
            var im = new Image();
            var t = setTimeout(function () {
                note('objectURL超时8s'); tryBitmap();
            }, 8000);
            im.onload = function () {
                clearTimeout(t);
                if (im.naturalWidth > 0 && im.naturalHeight > 0) {
                    note('objectURL解码成功');
                    deliver(url, im, 'objectURL');
                } else { note('objectURL解码尺寸为0'); tryBitmap(); }
            };
            im.onerror = function () { clearTimeout(t); note('objectURL onerror'); tryBitmap(); };
            im.src = url;
        }

        /* --- 方式2: createImageBitmap 降采样 --- */
        function tryBitmap() {
            if (typeof createImageBitmap !== 'function') { note('无createImageBitmap'); return tryDataURL(); }
            var t = setTimeout(function () { note('bitmap超时10s'); tryDataURL(); }, 10000);
            createImageBitmap(file).then(function (bm) {
                clearTimeout(t);
                try {
                    var sc = Math.min(1, PREVIEW_MAX / Math.max(bm.width, bm.height));
                    var c = document.createElement('canvas');
                    c.width = Math.max(1, Math.round(bm.width * sc));
                    c.height = Math.max(1, Math.round(bm.height * sc));
                    c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
                    if (!c.toBlob) { note('无toBlob'); return tryDataURL(); }
                    c.toBlob(function (blob) {
                        if (!blob) { note('bitmap转blob失败'); return tryDataURL(); }
                        var u = URL.createObjectURL(blob);
                        imgEl.src = u; note('bitmap缩图成功');
                        finish(true, u, 'bitmap');
                    }, 'image/jpeg', 0.9);
                } catch (e) { note('bitmap异常:' + e.message); tryDataURL(); }
            }).catch(function (e) { clearTimeout(t); note('bitmap失败:' + e.message); tryDataURL(); });
        }

        /* --- 方式3: dataURL（慢但兼容性最好） --- */
        function tryDataURL() {
            var r = new FileReader();
            r.onload = function (ev) {
                var im = new Image();
                im.onload = function () {
                    if (im.naturalWidth > 0) {
                        imgEl.src = ev.target.result; note('dataURL成功');
                        finish(true, ev.target.result, 'dataURL');
                    } else { note('dataURL尺寸为0'); finish(false); }
                };
                im.onerror = function () { note('dataURL onerror'); finish(false); };
                im.src = ev.target.result;
            };
            r.onerror = function () { note('readAsDataURL失败'); finish(false); };
            r.readAsDataURL(file);
        }

        tryObjectURL();
    };

    /* 移除某张图上的预览失败提示 */
    /* 记录「这张图被真正写过 src」，用于区分占位态与真失败 */
    function markHadSrc(img) {
        try {
            var v = img.getAttribute('src');
            if (v && v.replace(/\s/g, '')) img.__pvHadSrc = true;
        } catch (e) {}
    }

    window.__clearPreviewMsg = function (imgEl) {
        var scope = imgEl ? imgEl.parentElement : document;
        if (!scope) return;
        var ms = scope.querySelectorAll('.__pvmsg');
        for (var i = 0; i < ms.length; i++) { if (ms[i].parentElement) ms[i].parentElement.removeChild(ms[i]); }
    };

    /* 提示条样式：v11 改为**中性灰蓝**而非刺眼红
     *
     * 用户实测反馈：预览失败时处理功能其实照样能用，
     * 但满屏红字让人以为工具坏了 —— 红字本身制造了假故障。
     * 预览只是「看」，不是「处理」，不该用错误级别告警。
     * 这里降级为温和提示，并明确告诉用户处理不受影响。 */
    function showMsg(t, text, tone) {
        var box = t.parentElement; if (!box) return;
        var old = box.querySelector('.__pvmsg'); if (old) old.remove();
        var d = document.createElement('div');
        d.className = '__pvmsg';
        var bg = (tone === 'warn') ? '#7f1d1d' : 'rgba(51,65,85,0.94)';
        var fg = (tone === 'warn') ? '#fee2e2' : '#cbd5e1';
        var bd = (tone === 'warn') ? '#b91c1c' : '#475569';
        d.style.cssText = 'position:absolute;left:8px;right:8px;top:50%;transform:translateY(-50%);' +
            'background:' + bg + ';color:' + fg + ';padding:10px 12px;border-radius:8px;font-size:12px;' +
            'line-height:1.6;text-align:center;z-index:5;border:1px solid ' + bd;
        d.textContent = text;
        if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
        box.appendChild(d);
    }

    /* 预览一旦真的加载成功，就把之前的红字提示撤掉。
     *
     * v10.3 修正：缩图重试往往能救回预览，但红字是在失败那一刻就弹出的，
     * 重试成功后没人管它 —— 结果图片明明显示出来了，红字还挂在那儿，
     * 用户自然以为功能坏了。这里补上「成功即撤除」。 */
    function onImgOK(t) {
        if (t.naturalWidth > 0) {
            markHadSrc(t);
            if (t.dataset) { delete t.dataset.__pvFail; delete t.dataset.__pvBusy; }
            window.__clearPreviewMsg(t);
        }
    }

    window.addEventListener('load', function (e) {
        var t = e.target;
        if (!(t && t.tagName === 'IMG' && t.id && /Preview|preview/.test(t.id))) return;
        onImgOK(t);
    }, true);

    /* ★ v13 兜底轮询：只要图片真的显示出来了，提示就必须消失
     *
     * 只靠 load 事件不够稳 —— 若提示是在图片加载成功后才弹出来的
     * （比如兜底重试的延时报错），load 已经过去，没人再管提示，
     * 结果就是"图在、提示也在"这种最让人崩溃的假故障。
     * 这里在前 12 秒内每 500ms 复查一次：图显示了就立刻撤掉提示。 */
    (function sweep() {
        var n = 0;
        var timer = setInterval(function () {
            n++;
            try {
                var imgs = document.querySelectorAll('img[id]');
                for (var i = 0; i < imgs.length; i++) {
                    var im = imgs[i];
                    if (!/Preview|preview/.test(im.id)) continue;
                    if (im.naturalWidth > 0) {
                        markHadSrc(im);
                        var box = im.parentElement;
                        if (box && box.querySelector('.__pvmsg')) window.__clearPreviewMsg(im);
                    }
                }
            } catch (e) {}
            if (n > 24) clearInterval(timer);
        }, 500);
    })();

    /* 全局兜底：任何页面的预览 <img> 加载失败都不再静默留黑格。
     *
     * v10 关键改动：失败后**先用缩图重试用一次再报错**。
     * 之前一失败就弹红字，而实际处理流程往往能正常出图
     * —— 那说明文件本身没问题，只是原图太大解码被拒，缩图就能救回来。
     * 直接报错等于冤枉了用户的照片，还让他以为工具坏了。 */
    window.addEventListener('error', function (e) {
        var t = e.target;
        if (!(t && t.tagName === 'IMG' && t.id && /Preview|preview/.test(t.id))) return;
        if (t.dataset && t.dataset.__pvFail) return;

        /* ★ v12 关键修复：空 src 是「还没选图」的占位状态，不是失败
         *
         * 24 个工具页的预览框初始都写着 <img id="...Preview" src="">。
         * 浏览器会把空 src 解析成当前页面地址，拿 HTML 当图片加载 →
         * 触发 error 事件 → 于是页面**刚打开、用户一张图都没选**就弹出红字。
         * 这是纯误报，而且是最伤用户体验的那种：什么都没干就被判失败。
         * 这里直接放行，不做任何处理。 */
        var rawSrc = t.getAttribute('src');
        if (!rawSrc || !rawSrc.replace(/\s/g, '')) {
            window.__clearPreviewMsg(t);
            return;
        }

        /* ★ v13：结果区还没点处理，本来就没图，不该报警
         *
         * 用户截图场景：原图显示了，下方"处理结果"区是空棋盘格 + 同样提示。
         * 结果区空着是因为**还没点处理**，这是正常状态，不是失败。
         * 这类误报最伤体验 —— 什么都没做就被判失败。
         * 判据：id 含 processed/result/out 且从未被写入过有效 src。 */
        var idl = (t.id || '').toLowerCase();
        var isResult = /processed|result|output|out/.test(idl);
        if (isResult && !t.__pvHadSrc) {
            window.__clearPreviewMsg(t);
            return;
        }

        var file = window.__lastPreviewFile;

        /* 拿不到 file 时，直接从页面的 file input 里取（v11 修正）
         *
         * 有些页面用自己的上传逻辑，没走 __setPreview，
         * __lastPreviewFile 就是空的 —— 于是兜底重试无从下手，
         * 只能干报一句「请换一张图片试试」，用户看着像功能坏了。
         * 这里补上从 input.files 直接取，兜底重试才能真正生效。 */
        if (!file) {
            try {
                var ins = document.querySelectorAll('input[type=file]');
                for (var ii = 0; ii < ins.length; ii++) {
                    if (ins[ii].files && ins[ii].files[0]) { file = ins[ii].files[0]; break; }
                }
            } catch (e) { file = null; }
        }

        /* 延迟复查再报错：缩图重试是异步的，很可能此刻已经救回来了。
         * 立刻弹红字会造成「图已显示、提示仍在」的假故障。 */
        setTimeout(function () {
            if (t.naturalWidth > 0) { window.__clearPreviewMsg(t); if (t.dataset) delete t.dataset.__pvFail; return; }
            if (document.body.contains(t) === false) return;
            realFail();
        }, 1200);
        return;

        function realFail() {
        if (!file) { if (t.dataset) t.dataset.__pvFail = '1'; showMsg(t, '预览未显示（图片较大或格式特殊），不影响下方处理功能，可直接点处理。'); return; }

        /* 已经显示过本次的重试标记就别重复来 */
        if (t.dataset) t.dataset.__pvBusy = '1';

        var r = new FileReader();
        r.onload = function (ev) {
            var probe = new Image();
            probe.onload = function () {
                if (probe.naturalWidth > 0) {
                    /* 缩图后重试显示 */
                    var sc = Math.min(1, 1200 / Math.max(probe.naturalWidth, probe.naturalHeight));
                    try {
                        var c = document.createElement('canvas');
                        c.width = Math.max(1, Math.round(probe.naturalWidth * sc));
                        c.height = Math.max(1, Math.round(probe.naturalHeight * sc));
                        c.getContext('2d').drawImage(probe, 0, 0, c.width, c.height);
                        c.toBlob(function (blob) {
                            if (blob) {
                                t.src = URL.createObjectURL(blob);
                                window.__clearPreviewMsg(t);
                                if (t.dataset) { delete t.dataset.__pvBusy; }
                                return;
                            }
                            if (t.dataset) t.dataset.__pvFail = '1';
                            showMsg(t, '预览未显示：该格式可能不受支持（如 HEIC）。处理功能可能同样受限，建议导出为 JPG。', 'warn');
                        }, 'image/jpeg', 0.9);
                    } catch (err) {
                        if (t.dataset) t.dataset.__pvFail = '1';
                        showMsg(t, '预览未显示，不影响下方处理功能，可直接点处理。');
                    }
                } else {
                    if (t.dataset) t.dataset.__pvFail = '1';
                    showMsg(t, '预览未显示：该格式可能不受支持（如 HEIC）。建议导出为 JPG 后再试。', 'warn');
                }
            };
            probe.onerror = function () {
                if (t.dataset) t.dataset.__pvFail = '1';
                showMsg(t, '预览未显示：该格式可能不受支持（如 HEIC）。建议导出为 JPG 后再试。', 'warn');
            };
            probe.src = ev.target.result;
        };
        r.onerror = function () {
            if (t.dataset) t.dataset.__pvFail = '1';
            showMsg(t, '预览未显示，不影响下方处理功能，可直接点处理。');
        };
        r.readAsDataURL(file);
        }
    }, true);
})();
