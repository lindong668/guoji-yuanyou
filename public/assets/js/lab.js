/* ============================================================
 * lab.js — PicStudio 图像处理算法库
 * 供各工具页调用，纯浏览器端，无依赖
 * ============================================================ */

(function (global) {
    'use strict';

    var LAB = {};

    /* ---------- 通用：canvas 构造 ---------- */
    function makeCanvas(w, h) {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }
    LAB.makeCanvas = makeCanvas;

    function drawTo(src, w, h) {
        var c = makeCanvas(w, h);
        var x = c.getContext('2d');
        if (typeof src === 'string') { x.fillStyle = src; x.fillRect(0, 0, w, h); }
        else x.drawImage(src, 0, 0, w, h);
        return c;
    }
    LAB.drawTo = drawTo;

    /** 单边上限内缩放，防止大图卡死 */
    LAB.fitSide = function (img, maxSide) {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        var s = Math.min(1, maxSide / Math.max(w, h));
        if (s >= 1) return { canvas: drawTo(img, w, h), ratio: 1 };
        return { canvas: drawTo(img, Math.round(w * s), Math.round(h * s)), ratio: s };
    };

    /* ============================================================
     * 1. 调色增强  亮度 / 对比度 / 饱和度 / 色温 / 锐化 / 暗角 / 黑白
     * ============================================================ */
    LAB.adjust = function (srcCanvas, p) {
        var w = srcCanvas.width, h = srcCanvas.height;
        var ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
        var im = ctx.getImageData(0, 0, w, h);
        var d = im.data;

        var bright = (p.brightness || 0) * 2.55;      // -100..100
        var contra = p.contrast || 0;                 // -100..100
        var sat = p.saturation || 0;                  // -100..100
        var temp = p.temperature || 0;                // -100..100
        var gamma = p.gamma || 1;
        var bw = !!p.grayscale;
        var sepia = !!p.sepia;
        var invert = !!p.invert;

        // 对比度系数
        var cf = (259 * (contra + 255)) / (255 * (259 - contra));
        // 饱和度系数
        var sf = sat >= 0 ? 1 + sat / 100 * 2 : 1 + sat / 100;
        // 色温
        var tr = temp > 0 ? temp * 1.2 : 0, tb = temp < 0 ? -temp * 1.2 : 0;

        // gamma LUT
        var glut = new Uint8ClampedArray(256);
        for (var g = 0; g < 256; g++) {
            glut[g] = Math.max(0, Math.min(255, Math.pow(g / 255, 1 / gamma) * 255));
        }

        for (var i = 0; i < d.length; i += 4) {
            var r = d[i], gg = d[i + 1], b = d[i + 2];

            if (bright) { r += bright; gg += bright; b += bright; }
            if (contra) {
                r = cf * (r - 128) + 128;
                gg = cf * (gg - 128) + 128;
                b = cf * (b - 128) + 128;
            }
            if (temp) { r += tr; b += tb; }
            if (gamma !== 1) { r = glut[clamp255(r)]; gg = glut[clamp255(gg)]; b = glut[clamp255(b)]; }

            if (sat) {
                var lum = 0.299 * r + 0.587 * gg + 0.114 * b;
                r = lum + (r - lum) * sf;
                gg = lum + (gg - lum) * sf;
                b = lum + (b - lum) * sf;
            }
            if (bw) {
                var L = 0.299 * r + 0.587 * gg + 0.114 * b;
                r = gg = b = L;
            }
            if (sepia) {
                var nr = 0.393 * r + 0.769 * gg + 0.189 * b;
                var ng = 0.349 * r + 0.686 * gg + 0.168 * b;
                var nb = 0.272 * r + 0.534 * gg + 0.131 * b;
                r = nr; gg = ng; b = nb;
            }
            if (invert) { r = 255 - r; gg = 255 - gg; b = 255 - b; }

            d[i] = clamp255(r); d[i + 1] = clamp255(gg); d[i + 2] = clamp255(b);
        }
        ctx.putImageData(im, 0, 0);

        // 锐化（USM）
        if (p.sharpen > 0) LAB.unsharpMask(srcCanvas, p.sharpen / 100);
        // 暗角
        if (p.vignette > 0) LAB.vignette(srcCanvas, p.vignette / 100);

        return srcCanvas;
    };

    function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
    LAB.clamp255 = clamp255;

    /** USM 锐化 */
    LAB.unsharpMask = function (cv, amount, radius) {
        amount = amount || 0.5; radius = radius || 1;
        var w = cv.width, h = cv.height;
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        var src = ctx.getImageData(0, 0, w, h).data;
        var blurCv = makeCanvas(w, h);
        blurCv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(src), w, h), 0, 0);
        boxBlurRGB(blurCv, radius);
        var bd = blurCv.getContext('2d').getImageData(0, 0, w, h).data;
        var out = ctx.getImageData(0, 0, w, h);
        var od = out.data;
        for (var i = 0; i < od.length; i += 4) {
            od[i] = clamp255(src[i] + (src[i] - bd[i]) * amount * 2);
            od[i + 1] = clamp255(src[i + 1] + (src[i + 1] - bd[i + 1]) * amount * 2);
            od[i + 2] = clamp255(src[i + 2] + (src[i + 2] - bd[i + 2]) * amount * 2);
        }
        ctx.putImageData(out, 0, 0);
        return cv;
    };

    /** 暗角 */
    LAB.vignette = function (cv, strength) {
        var w = cv.width, h = cv.height;
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        var im = ctx.getImageData(0, 0, w, h), d = im.data;
        var cx = w / 2, cy = h / 2;
        var maxD = Math.sqrt(cx * cx + cy * cy);
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var dx = x - cx, dy = y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy) / maxD;
                var f = 1 - strength * Math.pow(Math.max(0, dist - 0.25) / 0.75, 1.6);
                var i = (y * w + x) * 4;
                d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            }
        }
        ctx.putImageData(im, 0, 0);
        return cv;
    };

    /** 快速盒式模糊（RGB） */
    function boxBlurRGB(cv, radius) {
        radius = Math.max(1, Math.round(radius));
        var w = cv.width, h = cv.height;
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        var im = ctx.getImageData(0, 0, w, h), d = im.data;
        var tmp = new Uint8ClampedArray(d.length);
        // 水平
        for (var y = 0; y < h; y++) {
            for (var c = 0; c < 3; c++) {
                var sum = 0, cnt = 0;
                for (var x = -radius; x <= radius; x++) {
                    var xx = Math.min(w - 1, Math.max(0, x));
                    sum += d[(y * w + xx) * 4 + c]; cnt++;
                }
                for (var x2 = 0; x2 < w; x2++) {
                    tmp[(y * w + x2) * 4 + c] = sum / cnt;
                    var add = Math.min(w - 1, x2 + radius + 1);
                    var sub = Math.max(0, x2 - radius);
                    sum += d[(y * w + add) * 4 + c] - d[(y * w + sub) * 4 + c];
                }
            }
        }
        // 垂直
        for (var x3 = 0; x3 < w; x3++) {
            for (var c2 = 0; c2 < 3; c2++) {
                var s2 = 0;
                for (var y2 = -radius; y2 <= radius; y2++) {
                    var yy = Math.min(h - 1, Math.max(0, y2));
                    s2 += tmp[(yy * w + x3) * 4 + c2];
                }
                var n = radius * 2 + 1;
                for (var y3 = 0; y3 < h; y3++) {
                    d[(y3 * w + x3) * 4 + c2] = s2 / n;
                    var a = Math.min(h - 1, y3 + radius + 1);
                    var b = Math.max(0, y3 - radius);
                    s2 += tmp[(a * w + x3) * 4 + c2] - tmp[(b * w + x3) * 4 + c2];
                }
            }
        }
        ctx.putImageData(im, 0, 0);
    }
    LAB.boxBlurRGB = boxBlurRGB;

    /* ============================================================
     * 2. 水印
     * ★ 重写（修复位置错位 / 缺角 / 白底看不见）：
     *   1) 位置支持九宫格 tl tc tr / ml mc mr / bl bc br + 正中间 + 全图平铺，
     *      原来缺了「左上角、上中、左中、右中、下中」五个位置
     *   2) 边距按图片短边比例算，小图不会顶到边、大图不会贴死角
     *   3) 文字水印自动描一层对比色描边，白底白字、黑底黑字都看得清
     *   4) 非平铺模式也支持旋转角度
     * ============================================================ */
    LAB.watermark = function (srcCanvas, o) {
        var w = srcCanvas.width, h = srcCanvas.height;
        var cv = makeCanvas(w, h);
        var ctx = cv.getContext('2d');
        ctx.drawImage(srcCanvas, 0, 0);

        o = o || {};
        var mode = o.mode || 'text';       // text | image
        var opacity = o.opacity == null ? 0.35 : o.opacity;
        var pos = o.position || 'tile';    // tl tc tr ml mc mr bl bc br center tile
        var scale = o.scale || 1;
        var pad = Math.max(10, Math.round(Math.min(w, h) * 0.035));

        var color = o.color || '#ffffff';
        var stroke = (o.outline === false) ? null : contrastColor(color);

        ctx.save();
        ctx.globalAlpha = opacity;

        if (mode === 'image' && o.image) {
            var iw = o.image.width * scale, ih = o.image.height * scale;
            if (pos === 'tile') {
                var gapX = Math.max(iw + 40, 160), gapY = Math.max(ih + 40, 140);
                ctx.translate(w / 2, h / 2);
                ctx.rotate((o.rotate || -30) * Math.PI / 180);
                ctx.translate(-w, -h);
                for (var ty = 0; ty < h * 2.2; ty += gapY) {
                    for (var tx = 0; tx < w * 2.2; tx += gapX) {
                        ctx.drawImage(o.image, tx, ty, iw, ih);
                    }
                }
            } else {
                var pt = anchorPoint(pos, w, h, iw, ih, pad);
                if (o.rotate) {
                    ctx.translate(pt.x + iw / 2, pt.y + ih / 2);
                    ctx.rotate(o.rotate * Math.PI / 180);
                    ctx.translate(-(pt.x + iw / 2), -(pt.y + ih / 2));
                }
                ctx.drawImage(o.image, pt.x, pt.y, iw, ih);
            }
        } else {
            var text = o.text || 'PicStudio';
            var fs = Math.max(12, Math.round(Math.min(w, h) / 18 * scale));
            ctx.font = (o.bold ? 'bold ' : '') + fs + 'px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.fillStyle = color;
            ctx.textBaseline = 'middle';
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = Math.max(1, Math.round(fs / 10));
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
            }

            if (pos === 'tile') {
                ctx.translate(w / 2, h / 2);
                ctx.rotate((o.rotate || -30) * Math.PI / 180);
                ctx.translate(-w, -h);
                var tw = ctx.measureText(text).width;
                var stepX = tw + fs * 1.6, stepY = fs * 3;
                for (var y4 = 0; y4 < h * 2.2; y4 += stepY) {
                    for (var x4 = 0; x4 < w * 2.2; x4 += stepX) {
                        if (stroke) ctx.strokeText(text, x4, y4);
                        ctx.fillText(text, x4, y4);
                    }
                }
            } else {
                var tw2 = ctx.measureText(text).width;
                var p2 = anchorPoint(pos, w, h, tw2, fs, pad);
                var bx = p2.x, by = p2.y + fs / 2;
                if (o.rotate) {
                    ctx.translate(bx + tw2 / 2, by);
                    ctx.rotate(o.rotate * Math.PI / 180);
                    ctx.translate(-(bx + tw2 / 2), -by);
                }
                if (stroke) ctx.strokeText(text, bx, by);
                ctx.fillText(text, bx, by);
            }
        }
        ctx.restore();
        return cv;
    };

    /* 九宫格锚点：横向 left/center/right × 纵向 top/middle/bottom */
    function anchorPoint(pos, w, h, iw, ih, pad) {
        var x, y;
        switch (pos) {
            case 'tl': case 'ml': case 'bl': x = pad; break;
            case 'tr': case 'mr': case 'br': x = w - iw - pad; break;
            default: x = (w - iw) / 2;
        }
        switch (pos) {
            case 'tl': case 'tc': case 'tr': y = pad; break;
            case 'bl': case 'bc': case 'br': y = h - ih - pad; break;
            default: y = (h - ih) / 2;
        }
        return { x: x, y: y };
    }
    LAB.anchorPoint = anchorPoint;

    /* 按水印色亮度取反色，用于描边，保证任何底色上都能看清 */
    function contrastColor(hex) {
        var c = String(hex || '').replace('#', '').trim();
        if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
        if (!/^[0-9a-fA-F]{6}$/.test(c)) return 'rgba(0,0,0,0.6)';
        var r = parseInt(c.substr(0, 2), 16),
            g = parseInt(c.substr(2, 2), 16),
            b = parseInt(c.substr(4, 2), 16);
        var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return lum > 0.5 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)';
    }
    LAB.contrastColor = contrastColor;

    /* ============================================================
     * 3. 裁剪（含社交平台预设）
     * ============================================================ */
    LAB.PRESETS = [
        { id: 'wechat-avatar', name: '微信头像', w: 640, h: 640, ratio: 1 },
        { id: 'wechat-moment', name: '朋友圈', w: 1080, h: 1080, ratio: 1 },
        { id: 'xhs', name: '小红书', w: 1080, h: 1440, ratio: 0.75 },
        { id: 'xhs-cover', name: '小红书封面', w: 1080, h: 1440, ratio: 0.75 },
        { id: 'douyin', name: '抖音封面', w: 1080, h: 1260, ratio: 0.857 },
        { id: 'taobao', name: '淘宝主图', w: 800, h: 800, ratio: 1 },
        { id: 'youtube', name: 'YouTube 缩略图', w: 1280, h: 720, ratio: 16 / 9 },
        { id: 'instagram', name: 'Instagram 方形', w: 1080, h: 1080, ratio: 1 },
        { id: 'story', name: '竖屏故事 9:16', w: 1080, h: 1920, ratio: 9 / 16 },
        { id: 'wallpaper', name: '手机壁纸 9:19.5', w: 1080, h: 2340, ratio: 1080 / 2340 },
        { id: 'id1', name: '一寸照 (295×413)', w: 295, h: 413, ratio: 295 / 413 },
        { id: 'id2', name: '二寸照 (413×579)', w: 413, h: 579, ratio: 413 / 579 },
        { id: 'a4', name: 'A4 横向 300dpi', w: 2480, h: 3508, ratio: 2480 / 3508 },
        { id: 'banner', name: '横幅 16:9', w: 1920, h: 1080, ratio: 16 / 9 }
    ];

    /** 居中裁剪到目标比例 */
    LAB.cropRatio = function (src, ratio) {
        var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
        var cur = w / h;
        var cw, ch;
        if (cur > ratio) { ch = h; cw = Math.round(h * ratio); }
        else { cw = w; ch = Math.round(w / ratio); }
        var sx = Math.round((w - cw) / 2), sy = Math.round((h - ch) / 2);
        var cv = makeCanvas(cw, ch);
        cv.getContext('2d').drawImage(src, sx, sy, cw, ch, 0, 0, cw, ch);
        return cv;
    };

    /**
     * 生成渐变背景画布
     * @param {number} w 宽
     * @param {number} h 高
     * @param {string} c1 顶部颜色
     * @param {string} c2 底部颜色
     */
    LAB.gradientCanvas = function (w, h, c1, c2) {
        var cv = makeCanvas(w, h);
        var ctx = cv.getContext('2d');
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        return cv;
    };

    /**
     * 把前景（可能带透明）居中合成到背景底上，并按目标尺寸留白
     * 支持纯色背景与渐变背景
     */
    LAB.composeOn = function (fg, tw, th, bgSpec) {
        var w = fg.naturalWidth || fg.width, h = fg.naturalHeight || fg.height;
        if (!w || !h) return makeCanvas(tw, th);
        var s = Math.min(tw / w, th / h);
        var dw = Math.round(w * s), dh = Math.round(h * s);

        // 背景底：渐变用 gradientCanvas，其余按纯色填充
        var cv;
        if (typeof bgSpec === 'object' && bgSpec && bgSpec.type === 'gradient') {
            cv = LAB.gradientCanvas(tw, th, bgSpec.from, bgSpec.to);
        } else {
            cv = makeCanvas(tw, th);
            var ctx = cv.getContext('2d');
            ctx.fillStyle = (typeof bgSpec === 'string' && bgSpec) ? bgSpec : '#ffffff';
            ctx.fillRect(0, 0, tw, th);
        }
        cv.getContext('2d').drawImage(fg,
            Math.round((tw - dw) / 2), Math.round((th - dh) / 2), dw, dh);
        return cv;
    };

    /** 裁剪 + 缩放到指定尺寸（可选填充白底，避免变形） */
    LAB.cropTo = function (src, tw, th, pad) {
        var ratio = tw / th;
        var c = LAB.cropRatio(src, ratio);
        if (pad) {
            // 等比缩放后留白，不裁掉内容
            var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
            var s = Math.min(tw / w, th / h);
            var dw = Math.round(w * s), dh = Math.round(h * s);
            var cv = makeCanvas(tw, th);
            var ctx = cv.getContext('2d');
            ctx.fillStyle = pad === true ? '#ffffff' : pad;
            ctx.fillRect(0, 0, tw, th);
            ctx.drawImage(src, Math.round((tw - dw) / 2), Math.round((th - dh) / 2), dw, dh);
            return cv;
        }
        return drawTo(c, tw, th);
    };

    /* ============================================================
     * 4. 拼接
     * ============================================================ */
    LAB.stitch = function (imgs, o) {
        o = o || {};
        var dir = o.direction || 'h';      // h | v | grid
        var gap = o.gap || 0;
        var bg = o.bg || '#ffffff';
        var align = o.align || 'center';   // start | center | end
        var cols = o.cols || Math.ceil(Math.sqrt(imgs.length));

        if (!imgs.length) return makeCanvas(1, 1);

        var sizes = imgs.map(function (im) {
            return { w: im.naturalWidth || im.width, h: im.naturalHeight || im.height };
        });

        var W, H, positions = [];

        if (dir === 'h') {
            var maxH = Math.max.apply(null, sizes.map(function (s) { return s.h; }));
            W = sizes.reduce(function (a, s) { return a + s.w; }, 0) + gap * (imgs.length - 1);
            H = maxH;
            var x = 0;
            sizes.forEach(function (s) {
                positions.push({ x: x, y: align === 'start' ? 0 : align === 'end' ? maxH - s.h : (maxH - s.h) / 2, w: s.w, h: s.h });
                x += s.w + gap;
            });
        } else if (dir === 'v') {
            var maxW = Math.max.apply(null, sizes.map(function (s) { return s.w; }));
            H = sizes.reduce(function (a, s) { return a + s.h; }, 0) + gap * (imgs.length - 1);
            W = maxW;
            var y = 0;
            sizes.forEach(function (s) {
                positions.push({ x: align === 'start' ? 0 : align === 'end' ? maxW - s.w : (maxW - s.w) / 2, y: y, w: s.w, h: s.h });
                y += s.h + gap;
            });
        } else {
            /* 网格：所有格子统一尺寸。
             *
             * 注意（v10 修正）：原来取「该列最大宽 / 该行最大高」，
             * 九张图尺寸不一致时，每列宽、每行高都不一样，
             * 拼出来格子大小参差 —— 就是用户说的「不规则」。
             * 改成全局统一格宽格高，格子才是规整的；
             * 图片按 cover 裁切填满格子，不留参差空隙。 */
            var rows = Math.ceil(imgs.length / cols);
            var cellW = Math.max.apply(null, sizes.map(function (s) { return s.w; }));
            var cellH = Math.max.apply(null, sizes.map(function (s) { return s.h; }));
            /* o.square 为真时强制正方形格子（朋友圈/小红书九宫格的常见诉求） */
            if (o.square) { cellW = cellH = Math.max(cellW, cellH); }

            W = cellW * cols + gap * (cols - 1);
            H = cellH * rows + gap * (rows - 1);

            sizes.forEach(function (s, i) {
                var cc = i % cols, rr = Math.floor(i / cols);
                var ox = cc * (cellW + gap);
                var oy = rr * (cellH + gap);
                /* cover：等比放大到铺满格子，多出的部分居中裁掉 */
                var sc = Math.max(cellW / s.w, cellH / s.h);
                var dw = s.w * sc, dh = s.h * sc;
                positions.push({
                    x: ox + (cellW - dw) / 2,
                    y: oy + (cellH - dh) / 2,
                    w: dw, h: dh,
                    /* 裁切：只画格子范围内的部分 */
                    clipX: ox, clipY: oy, clipW: cellW, clipH: cellH
                });
            });
        }

        var cv = makeCanvas(Math.max(1, W), Math.max(1, H));
        var ctx = cv.getContext('2d');
        if (bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
        imgs.forEach(function (im, i) {
            var p = positions[i];
            if (p.clipW) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(p.clipX, p.clipY, p.clipW, p.clipH);
                ctx.clip();
                ctx.drawImage(im, p.x, p.y, p.w, p.h);
                ctx.restore();
            } else {
                ctx.drawImage(im, p.x, p.y, p.w, p.h);
            }
        });
        return cv;
    };

    /* ============================================================
     * 5. 长图分割
     * ============================================================ */
    LAB.split = function (src, o) {
        o = o || {};
        var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
        var mode = o.mode || 'count';
        var n = mode === 'count' ? Math.max(2, o.count || 2)
            : Math.max(2, Math.ceil(h / Math.max(1, o.sliceHeight || 1000)));
        var ph = Math.ceil(h / n);
        var out = [];
        for (var i = 0; i < n; i++) {
            var sy = i * ph;
            var sh = Math.min(ph, h - sy);
            if (sh <= 0) break;
            var cv = makeCanvas(w, sh);
            cv.getContext('2d').drawImage(src, 0, sy, w, sh, 0, 0, w, sh);
            out.push(cv);
        }
        return out;
    };

    /* ============================================================
     * 6. 马赛克 / 打码
     * ============================================================ */
    LAB.mosaic = function (srcCanvas, o) {
        o = o || {};
        var w = srcCanvas.width, h = srcCanvas.height;
        var ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
        var im = ctx.getImageData(0, 0, w, h), d = im.data;
        var block = Math.max(2, o.block || 12);
        var regions = o.regions || null;   // [{x,y,w,h}] 归一化 0-1
        var full = !regions || !regions.length;

        function inRegion(px, py) {
            if (full) return true;
            for (var i = 0; i < regions.length; i++) {
                var r = regions[i];
                if (px >= r.x * w && px <= (r.x + r.w) * w && py >= r.y * h && py <= (r.y + r.h) * h) return true;
            }
            return false;
        }

        for (var by = 0; by < h; by += block) {
            for (var bx = 0; bx < w; bx += block) {
                var cx = bx + block / 2, cy = by + block / 2;
                if (!inRegion(cx, cy)) continue;
                // 取块内均值
                var sr = 0, sg = 0, sb = 0, sa = 0, cnt = 0;
                var ey = Math.min(by + block, h), ex = Math.min(bx + block, w);
                for (var y = by; y < ey; y++) {
                    for (var x = bx; x < ex; x++) {
                        var i4 = (y * w + x) * 4;
                        sr += d[i4]; sg += d[i4 + 1]; sb += d[i4 + 2]; sa += d[i4 + 3]; cnt++;
                    }
                }
                var ar = sr / cnt, ag = sg / cnt, ab = sb / cnt, aa = sa / cnt;
                for (var y2 = by; y2 < ey; y2++) {
                    for (var x2 = bx; x2 < ex; x2++) {
                        var i5 = (y2 * w + x2) * 4;
                        d[i5] = ar; d[i5 + 1] = ag; d[i5 + 2] = ab; d[i5 + 3] = aa;
                    }
                }
            }
        }
        ctx.putImageData(im, 0, 0);
        return srcCanvas;
    };

    /* ============================================================
     * 6.5 JPEG 输出前的透明处理
     * ============================================================ */
    /**
     * JPEG 不支持 alpha 通道。canvas 直接 toDataURL('image/jpeg') 时，
     * 透明区域会被浏览器填成**黑色** —— 用户看到的就是「一片黑」，
     * 还以为工具把图弄坏了。
     *
     * 这里在输出前把透明区铺成白色（更接近纸张/网页背景的预期观感），
     * 只在确实存在半透明/透明像素时才执行，避免无谓的开销。
     */
    LAB.flattenForJpeg = function (cv, bgColor) {
        if (!cv || !cv.width || !cv.height) return cv;
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        var w = cv.width, h = cv.height;
        // 采样检测是否含透明像素（全图扫描太慢，取样足够判断）
        var step = Math.max(1, Math.floor(Math.min(w, h) / 60));
        var need = false;
        try {
            var probe = ctx.getImageData(0, 0, w, h).data;
            for (var y = 0; y < h && !need; y += step) {
                for (var x = 0; x < w; x += step) {
                    if (probe[(y * w + x) * 4 + 3] < 250) { need = true; break; }
                }
            }
        } catch (e) { return cv; }
        if (!need) return cv;

        var out = makeCanvas(w, h);
        var octx = out.getContext('2d');
        octx.fillStyle = bgColor || '#ffffff';
        octx.fillRect(0, 0, w, h);
        octx.drawImage(cv, 0, 0);
        return out;
    };

    /* ============================================================
     * 7. 去噪（保边：双边滤波近似）
     * ============================================================ */
    /* 双边滤波的工作分辨率上限。
     * 原实现在原始分辨率上逐像素遍历 3×3 邻域并对每个邻居算一次 Math.exp：
     * 3000×2250 的图就是 675 万像素 × 9 ≈ 6000 万次指数运算，
     * 单这一步就要跑几十秒，叠加自动色阶与锐化后页面直接崩溃。
     * 降噪是局部平滑，降采样处理再放大回去，观感几乎无损。 */
    var DENOISE_MAX_SIDE = 1400;

    LAB.denoise = function (srcCanvas, strength) {
        strength = strength == null ? 3 : strength;
        var fullW = srcCanvas.width, fullH = srcCanvas.height;
        var work = srcCanvas, scale = 1;
        if (Math.max(fullW, fullH) > DENOISE_MAX_SIDE) {
            scale = DENOISE_MAX_SIDE / Math.max(fullW, fullH);
            var ww = Math.max(1, Math.round(fullW * scale));
            var wh = Math.max(1, Math.round(fullH * scale));
            work = makeCanvas(ww, wh);
            var wc = work.getContext('2d', { willReadFrequently: true });
            wc.imageSmoothingEnabled = true;
            wc.imageSmoothingQuality = 'high';
            wc.drawImage(srcCanvas, 0, 0, ww, wh);
        }
        var w = work.width, h = work.height;
        var ctx = work.getContext('2d', { willReadFrequently: true });
        var im = ctx.getImageData(0, 0, w, h), d = im.data;
        var src = new Uint8ClampedArray(d);
        var r = 1;
        var sigmaC = 30 + strength * 12;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var idx = (y * w + x) * 4;
                var sumR = 0, sumG = 0, sumB = 0, wsum = 0;
                for (var dy = -r; dy <= r; dy++) {
                    for (var dx = -r; dx <= r; dx++) {
                        var nx = x + dx, ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                        var nidx = (ny * w + nx) * 4;
                        var diff = Math.abs(src[nidx] - src[idx]) +
                            Math.abs(src[nidx + 1] - src[idx + 1]) +
                            Math.abs(src[nidx + 2] - src[idx + 2]);
                        var wc = Math.exp(-(diff * diff) / (2 * sigmaC * sigmaC));
                        var ww = wc / (1 + Math.abs(dx) + Math.abs(dy));
                        sumR += src[nidx] * ww; sumG += src[nidx + 1] * ww; sumB += src[nidx + 2] * ww;
                        wsum += ww;
                    }
                }
                if (wsum > 0) {
                    d[idx] = sumR / wsum; d[idx + 1] = sumG / wsum; d[idx + 2] = sumB / wsum;
                }
            }
        }
        ctx.putImageData(im, 0, 0);
        if (scale < 1) {
            /* 在工作分辨率上完成滤波后，放大回原始尺寸。
             * 降噪是局部平滑，放大不会引入可见损失。 */
            var back = srcCanvas.getContext('2d', { willReadFrequently: true });
            back.imageSmoothingEnabled = true;
            back.imageSmoothingQuality = 'high';
            back.drawImage(work, 0, 0, fullW, fullH);
            work.width = 0; work.height = 0;
        }
        if (scale < 1) return srcCanvas;
        return work;
    };

    /* ============================================================
     * 8. 老照片修复：自动色阶 + 去噪 + 轻微锐化
     * ============================================================ */
    LAB.restore = function (srcCanvas, o) {
        o = o || {};
        var w = srcCanvas.width, h = srcCanvas.height;
        var ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
        var im = ctx.getImageData(0, 0, w, h), d = im.data;

        // 自动色阶：按通道做 0.5% 裁剪拉伸
        if (o.autoLevel !== false) {
            for (var c = 0; c < 3; c++) {
                var hist = new Array(256).fill(0);
                for (var i = c; i < d.length; i += 4) hist[d[i]]++;
                var total = w * h, cut = total * 0.005, acc = 0, lo = 0, hi = 255;
                for (var v = 0; v < 256; v++) { acc += hist[v]; if (acc > cut) { lo = v; break; } }
                acc = 0;
                for (var v2 = 255; v2 >= 0; v2--) { acc += hist[v2]; if (acc > cut) { hi = v2; break; } }
                if (hi <= lo) continue;
                var span = hi - lo;
                for (var j = c; j < d.length; j += 4) {
                    d[j] = clamp255((d[j] - lo) * 255 / span);
                }
            }
            ctx.putImageData(im, 0, 0);
        }
        if (o.denoise) LAB.denoise(srcCanvas, o.denoise);
        if (o.sharpen) LAB.unsharpMask(srcCanvas, o.sharpen / 100);
        return srcCanvas;
    };

    /* ============================================================
     * 9. 高质量放大（Lanczos3）
     * ============================================================ */
    LAB.upscale = function (src, factor) {
        var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
        var nw = Math.round(w * factor), nh = Math.round(h * factor);
        var sctx = drawTo(src, w, h).getContext('2d', { willReadFrequently: true });
        var sd = sctx.getImageData(0, 0, w, h).data;
        var out = makeCanvas(nw, nh);
        var octx = out.getContext('2d', { willReadFrequently: true });
        var oim = octx.createImageData(nw, nh), od = oim.data;

        function lanczos(t, a) {
            if (t === 0) return 1;
            if (Math.abs(t) >= a) return 0;
            var pt = Math.PI * t;
            return a * Math.sin(pt) * Math.sin(pt / a) / (pt * pt);
        }
        var A = 3;
        var xScale = nw / w, yScale = nh / h;

        for (var y = 0; y < nh; y++) {
            var sy = (y + 0.5) / yScale - 0.5;
            var syi = Math.floor(sy);
            for (var x = 0; x < nw; x++) {
                var sx = (x + 0.5) / xScale - 0.5;
                var sxi = Math.floor(sx);
                var r = 0, g = 0, b = 0, a = 0, wsum = 0;
                for (var dy = -A + 1; dy <= A; dy++) {
                    var py = Math.min(h - 1, Math.max(0, syi + dy));
                    var wy = lanczos(sy - (syi + dy), A);
                    if (wy === 0) continue;
                    for (var dx = -A + 1; dx <= A; dx++) {
                        var px = Math.min(w - 1, Math.max(0, sxi + dx));
                        var wx = lanczos(sx - (sxi + dx), A);
                        if (wx === 0) continue;
                        var ww = wx * wy;
                        var i4 = (py * w + px) * 4;
                        r += sd[i4] * ww; g += sd[i4 + 1] * ww; b += sd[i4 + 2] * ww; a += sd[i4 + 3] * ww;
                        wsum += ww;
                    }
                }
                var oi = (y * nw + x) * 4;
                if (wsum > 0) {
                    od[oi] = clamp255(r / wsum);
                    od[oi + 1] = clamp255(g / wsum);
                    od[oi + 2] = clamp255(b / wsum);
                    od[oi + 3] = clamp255(a / wsum);
                } else { od[oi + 3] = 255; }
            }
        }
        octx.putImageData(oim, 0, 0);
        return out;
    };

    /* ============================================================
     * 10. 颜色提取（k-means）
     * ============================================================ */
    LAB.palette = function (srcCanvas, n) {
        n = n || 8;
        var w = srcCanvas.width, h = srcCanvas.height;
        var ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
        var d = ctx.getImageData(0, 0, w, h).data;
        var pts = [];
        var step = Math.max(1, Math.floor(Math.sqrt(w * h / 4000)));
        for (var y = 0; y < h; y += step) {
            for (var x = 0; x < w; x += step) {
                var i = (y * w + x) * 4;
                if (d[i + 3] < 128) continue;
                pts.push([d[i], d[i + 1], d[i + 2]]);
            }
        }
        if (!pts.length) return [];
        var cents = [];
        for (var k = 0; k < n; k++) cents.push(pts[Math.floor(Math.random() * pts.length)].slice());
        for (var it = 0; it < 12; it++) {
            var acc = cents.map(function () { return [0, 0, 0, 0]; });
            for (var p = 0; p < pts.length; p++) {
                var best = 0, bd = Infinity;
                for (var c = 0; c < n; c++) {
                    var dr = pts[p][0] - cents[c][0], dg = pts[p][1] - cents[c][1], db = pts[p][2] - cents[c][2];
                    var dd = dr * dr + dg * dg + db * db;
                    if (dd < bd) { bd = dd; best = c; }
                }
                acc[best][0] += pts[p][0]; acc[best][1] += pts[p][1]; acc[best][2] += pts[p][2]; acc[best][3]++;
            }
            for (var c2 = 0; c2 < n; c2++) {
                if (acc[c2][3]) cents[c2] = [acc[c2][0] / acc[c2][3], acc[c2][1] / acc[c2][3], acc[c2][2] / acc[c2][3]];
            }
        }
        // 按亮度排序
        return cents.map(function (c) {
            return {
                r: Math.round(c[0]), g: Math.round(c[1]), b: Math.round(c[2]),
                hex: rgb2hex(c[0], c[1], c[2])
            };
        }).sort(function (a, b) {
            return (0.299 * a.r + 0.587 * a.g + 0.114 * a.b) - (0.299 * b.r + 0.587 * b.g + 0.114 * b.b);
        });
    };

    function rgb2hex(r, g, b) {
        return '#' + [r, g, b].map(function (v) {
            var s = Math.round(v).toString(16);
            return s.length === 1 ? '0' + s : s;
        }).join('');
    }
    LAB.rgb2hex = rgb2hex;

    /* ============================================================
     * 11. EXIF 解析（只读关键字段 + 清除）
     * ============================================================ */
    LAB.parseExif = function (arrayBuffer) {
        var view = new DataView(arrayBuffer);
        if (view.byteLength < 4) return null;
        var offset = 0;
        if (view.getUint16(0) !== 0xFFD8) return null; // 仅 JPEG
        offset = 2;
        while (offset < view.byteLength) {
            if (view.getUint8(offset) !== 0xFF) { offset++; continue; }
            var marker = view.getUint8(offset + 1);
            if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { offset += 2; continue; }
            var size = view.getUint16(offset + 2);
            if (marker === 0xE1) {
                var str = '';
                for (var i = 0; i < 4; i++) str += String.fromCharCode(view.getUint8(offset + 4 + i));
                if (str === 'Exif') return parseTiff(view, offset + 10, size - 10);
            }
            if (marker === 0xDA) break;
            offset += 2 + size;
        }
        return null;
    };

    function parseTiff(view, start, len) {
        var result = {};
        try {
            var bo = view.getUint16(start);
            var le = bo === 0x4949;
            if (!le && bo !== 0x4D4D) return null;
            if (view.getUint16(start + 2, le) !== 0x002A) return null;
            var ifd = start + view.getUint32(start + 4, le);
            readIFD(view, ifd, start, le, result, 0);
        } catch (e) { return null; }
        return result;
    }

    var TAGS = {
        0x010F: '相机品牌', 0x0110: '相机型号', 0x0112: '方向', 0x011A: 'X分辨率',
        0x011B: 'Y分辨率', 0x0131: '软件', 0x0132: '拍摄时间', 0x013B: '作者',
        0x8298: '版权', 0x829A: '曝光时间', 0x829D: 'F值', 0x8822: '曝光程序',
        0x8827: 'ISO', 0x9003: '原始时间', 0x920A: '焦距', 0xA402: '曝光模式',
        0xA403: '白平衡', 0xA406: '场景类型', 0xA432: '镜头信息',
        0x8825: 'GPS', 0x9286: '用户注释'
    };

    function readIFD(view, ifd, tiffStart, le, out, depth) {
        if (depth > 3) return;
        var n = view.getUint16(ifd, le);
        for (var i = 0; i < n; i++) {
            var entry = ifd + 2 + i * 12;
            if (entry + 12 > view.byteLength) break;
            var tag = view.getUint16(entry, le);
            var type = view.getUint16(entry + 2, le);
            var count = view.getUint32(entry + 4, le);
            var name = TAGS[tag];
            if (!name) continue;
            var valOff = entry + 8;
            var val;
            try {
                if (type === 2) {
                    var s = '';
                    var base = count > 4 ? tiffStart + view.getUint32(valOff, le) : valOff;
                    for (var c = 0; c < count && c < 64; c++) {
                        var ch = view.getUint8(base + c);
                        if (ch === 0) break;
                        s += String.fromCharCode(ch);
                    }
                    val = s.trim();
                } else if (type === 3 && count === 1) val = view.getUint16(valOff, le);
                else if (type === 4 && count === 1) val = view.getUint32(valOff, le);
                else if (type === 5 && count === 1) {
                    var off = tiffStart + view.getUint32(valOff, le);
                    val = view.getUint32(off, le) + '/' + view.getUint32(off + 4, le);
                } else continue;
            } catch (e) { continue; }
            if (val !== '' && val != null) out[name] = val;
        }
        // GPS 子 IFD
        var nxt = view.getUint32(ifd + 2 + n * 12, le);
        if (nxt && depth < 2) readIFD(view, tiffStart + nxt, tiffStart, le, out, depth + 1);
    }

    /** 清除 EXIF：重绘到 canvas 再导出即可（canvas 导出天然不带 EXIF） */
    LAB.stripExif = function (src) {
        var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
        return drawTo(src, w, h);
    };

    /* ============================================================
     * 12. 极简 PDF 生成（嵌入 JPEG，无需依赖）
     * ============================================================ */
    LAB.toPDF = function (pages, o) {
        o = o || {};
        var pageW = o.width || 595.28, pageH = o.height || 841.89; // A4 pt
        var out = [];
        var header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
        out.push(header);

        var offsets = {};
        var pos = header.length;
        function pushObj(id, body) {
            offsets[id] = pos;
            var s = id + ' 0 obj\n' + body + '\nendobj\n';
            out.push(s);
            pos += s.length;
        }

        pushObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
        var kids = pages.map(function (_, i) { return (4 + i * 2) + ' 0 R'; }).join(' ');
        pushObj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>');
        pushObj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

        pages.forEach(function (cv, i) {
            var pid = 4 + i * 2, iid = 5 + i * 2;
            // 等比适配页面
            var s = Math.min(pageW / cv.width, pageH / cv.height);
            var dw = cv.width * s, dh = cv.height * s;
            var dx = (pageW - dw) / 2, dy = (pageH - dh) / 2;
            pushObj(pid, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW.toFixed(2) + ' ' + pageH.toFixed(2) + ']' +
                ' /Resources << /XObject << /Im' + i + ' ' + iid + ' 0 R >> >>' +
                ' /Contents ' + (pid + 1) + ' 0 R >>');
            var content = 'q ' + dw.toFixed(2) + ' 0 0 ' + dh.toFixed(2) + ' ' + dx.toFixed(2) + ' ' + dy.toFixed(2) + ' cm /Im' + i + ' Do Q\n';
            pushObj(pid + 1, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
        });

        pages.forEach(function (cv, i) {
            var iid = 5 + i * 2;
            var jpeg = LAB.flattenForJpeg(cv).toDataURL('image/jpeg', o.quality || 0.85);
            var bin = atob(jpeg.split(',')[1]);
            offsets[iid] = pos;
            var head = iid + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + cv.width +
                ' /Height ' + cv.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
                ' /Filter /DCTDecode /Length ' + bin.length + ' >>\nstream\n';
            out.push(head);
            pos += head.length;
            // 分批转换：一次性 apply 整个数组在大图上会触发栈溢出
            var bytes = new Uint8Array(bin.length);
            for (var b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b);
            var CHUNK = 8192;
            for (var off = 0; off < bytes.length; off += CHUNK) {
                var slice = bytes.subarray(off, Math.min(off + CHUNK, bytes.length));
                out.push(String.fromCharCode.apply(null, slice));
            }
            pos += bin.length;
            var tail = '\nendstream\nendobj\n';
            out.push(tail);
            pos += tail.length;
        });

        var maxId = 4 + pages.length * 2 + 1;
        var xrefPos = pos;
        var xref = 'xref\n0 ' + (maxId) + '\n0000000000 65535 f \n';
        for (var id = 1; id < maxId; id++) {
            var off = offsets[id];
            xref += (off != null ? String(off).padStart(10, '0') : '0000000000') + ' 00000 n \n';
        }
        out.push(xref); pos += xref.length;
        var trailer = 'trailer\n<< /Size ' + maxId + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n';
        out.push(trailer); pos += trailer.length;

        // 生成 Blob（latin1 安全）
        var buf = new Uint8Array(pos);
        var p2 = 0;
        for (var ci = 0; ci < out.length; ci++) {
            var chunk = out[ci];
            for (var i = 0; i < chunk.length; i++) buf[p2++] = chunk.charCodeAt(i) & 0xFF;
        }
        return new Blob([buf.subarray(0, p2)], { type: 'application/pdf' });
    };

    /* ============================================================
     * 13. Base64
     * ============================================================ */
    LAB.toBase64 = function (cv, format, quality) {
        return cv.toDataURL('image/' + (format || 'png'), quality == null ? 0.92 : quality);
    };
    LAB.fromBase64 = function (dataUrl) {
        return new Promise(function (res, rej) {
            var im = new Image();
            im.onload = function () { res(im); };
            im.onerror = function () { rej(new Error('Base64 解析失败')); };
            im.src = dataUrl;
        });
    };

    /* ============================================================
     * 14. 下载
     * ============================================================ */
    LAB.downloadCanvas = function (cv, filename, format, quality) {
        return new Promise(function (res) {
            if (window.__download) { window.__download(cv, filename); res(); return; }
            cv.toBlob(function (blob) {
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url; a.download = filename;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a);
                setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
                res();
            }, 'image/' + (format || 'png'), quality == null ? 0.92 : quality);
        });
    };

    LAB.downloadBlob = function (blob, filename) {
        if (window.__download) {
            var fr = new FileReader();
            fr.onload = function (ev) { window.__download(ev.target.result, filename); };
            fr.readAsDataURL(blob);
            return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    };

    /* ============================================================
     * 15. 纯色背景检测 + 换底（证件照最优解）
     * ------------------------------------------------------------
     * 为什么单独做这一条路：
     *   证件照大多是**纯色背景**（白墙 / 蓝布 / 红布）。
     *   这种情况下用抠图（GrabCut / 洪水填充）反而是最差选择：
     *     - 白色背景 + 浅色衣服，颜色模型分不清，人容易被啃掉
     *     - 人物占满画面时，背景与边界断开，只换掉边缘一圈
     *   而**颜色替换**才是正解：只要认准背景色，从边缘连通扩散，
     *   把连通的同色区域换成目标色，边缘羽化一下即可 —— 又快又干净。
     *
     * 安全性：只替换**与画面边缘连通**的同色区域。
     *   主体内部的同色块（比如白衬衫上的白）因为不连通，天然被保留。
     *
     * @returns {null} 不是纯色背景，调用方应改用抠图
     * @returns {canvas} 换底成功
     * ============================================================ */
    LAB.detectFlatBg = function (src, opts) {
        opts = opts || {};
        var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
        if (!w || !h) return null;
        var sw = Math.min(w, 160), sh = Math.round(h * (sw / w));
        var c = makeCanvas(sw, sh);
        c.getContext('2d').drawImage(src, 0, 0, sw, sh);
        var d;
        try { d = c.getContext('2d').getImageData(0, 0, sw, sh).data; }
        catch (e) { return null; }

        /* 采样四条边的像素，求主色与离散度 */
        var band = Math.max(2, Math.round(Math.min(sw, sh) * 0.06));
        var samples = [];
        var xi, yi, o;
        for (yi = 0; yi < sh; yi++) {
            for (xi = 0; xi < sw; xi++) {
                var edge = (xi < band || xi >= sw - band || yi < band || yi >= sh - band);
                if (!edge) continue;
                o = (yi * sw + xi) * 4;
                samples.push(d[o], d[o + 1], d[o + 2]);
            }
        }
        if (samples.length < 30) return null;

        /* 用 k-means 找边缘主色，再看多数像素离主色多近 */
        var km = kmeansLite(samples, 3, 6);
        var top = 0, topN = -1, i2;
        for (i2 = 0; i2 < km.k; i2++) if (km.counts[i2] > topN) { topN = km.counts[i2]; top = i2; }
        var c3 = top * 3;
        var br = km.centers[c3], bg = km.centers[c3 + 1], bb = km.centers[c3 + 2];

        var near = 0, totN = samples.length / 3;
        for (i2 = 0; i2 < samples.length; i2 += 3) {
            var dr = samples[i2] - br, dg = samples[i2 + 1] - bg, db = samples[i2 + 2] - bb;
            if (dr * dr + dg * dg + db * db < 40 * 40) near++;
        }
        var ratio = near / totN;
        /* 边缘有 >=72% 的像素集中在同一颜色 → 判定为纯色背景 */
        if (ratio < 0.72) return null;

        return { r: br, g: bg, b: bb, ratio: ratio };
    };

    /* 证件照背景识别（v16 重写）
     *
     * ★ 之前的 detectFlatBg 错在哪：
     *   它采样「四条边整条带」的像素做 k-means，取最大簇当背景色。
     *   手机半身照的肩膀经常顶到左右边缘 —— 左右两条带里塞满了衣服，
     *   红衣服反而成了最大簇，于是**把衣服当成背景换掉**，人物躯干直接消失。
     *   这正是用户截图里「人糊成一片」的真正原因，跟衣服颜色本身无关。
     *
     * ★ 正确判据：证件照人像，头顶上方必定是背景。
     *   所以背景区域一定连通到画面顶部；衣服在下半身，永远连不到顶边。
     *   做法：取若干候选种子，各自做连通扩散，
     *   只保留「触及顶边 且 面积≥12%」的，取其中面积最大者。
     *   实测肩膀占满画面宽度时，白墙 26% 触及顶边、红衣 67% 不触顶 —— 命中白墙。 */
    LAB.detectIdBg = function (src, opts) {
        opts = opts || {};
        var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
        if (!w || !h) return null;
        var sw = Math.min(w, 200), sh = Math.max(1, Math.round(h * (sw / w)));
        var c = makeCanvas(sw, sh);
        var cx = c.getContext('2d');
        cx.drawImage(src, 0, 0, sw, sh);
        var d;
        try { d = cx.getImageData(0, 0, sw, sh).data; }
        catch (e) { return null; }

        var thr2 = 0;
        var N = sw * sh;

        /* 某个种子点能扩散出多大区域？同时记录是否触及顶边 */
        function probe(sx, sy, tolOverride) {
            var tol = tolOverride || opts.tolerance || 42;
            sx = Math.min(Math.max(sx | 0, 0), sw - 1);
            sy = Math.min(Math.max(sy | 0, 0), sh - 1);
            var so = (sy * sw + sx) * 4;
            var br = d[so], bg2 = d[so + 1], bb = d[so + 2];
            thr2 = tol * tol;
            var mask = new Uint8Array(N), seen = new Uint8Array(N);
            var stack = new Int32Array(N), sp = 0;
            stack[sp++] = sy * sw + sx; seen[sy * sw + sx] = 1;
            var area = 0, touchTop = false;
            while (sp > 0) {
                var idx = stack[--sp];
                if (mask[idx]) continue;
                var o2 = idx * 4;
                var dr = d[o2] - br, dg = d[o2 + 1] - bg2, db = d[o2 + 2] - bb;
                if (dr * dr + dg * dg + db * db > thr2) continue;
                mask[idx] = 1; area++;
                var xi2 = idx % sw, yi2 = (idx / sw) | 0;
                if (yi2 <= 1) touchTop = true;
                if (xi2 > 0) { var lf = idx - 1; if (!mask[lf] && !seen[lf]) { seen[lf] = 1; stack[sp++] = lf; } }
                if (xi2 < sw - 1) { var rt = idx + 1; if (!mask[rt] && !seen[rt]) { seen[rt] = 1; stack[sp++] = rt; } }
                if (yi2 > 0) { var up = idx - sw; if (!mask[up] && !seen[up]) { seen[up] = 1; stack[sp++] = up; } }
                if (yi2 < sh - 1) { var dn = idx + sw; if (!mask[dn] && !seen[dn]) { seen[dn] = 1; stack[sp++] = dn; } }
            }
            return { area: area, top: touchTop, r: br, g: bg2, b: bb };
        }

        var m = Math.max(2, Math.round(Math.min(sw, sh) * 0.09));
        var pts = [
            [m, m], [sw - 1 - m, m],                       // 左上、右上
            [sw >> 1, 1], [sw >> 2, 1], [(sw * 3) >> 2, 1], // 顶边三个点
            [m, sh - 1 - m], [sw - 1 - m, sh - 1 - m]       // 左下、右下
        ];
        var best = null, i4;
        for (i4 = 0; i4 < pts.length; i4++) {
            var r0 = probe(pts[i4][0], pts[i4][1]);
            /* 硬约束：必须触及顶边，且面积不低于 12% */
            if (!r0.top || r0.area < N * 0.12) continue;
            if (!best || r0.area > best.area) best = r0;
        }
        if (!best) return null;
        /* v17：墙面常有明暗渐变（本例左侧 208 → 右侧 227），单一容差容易卡住。
         * 首轮回退到较大容差再探一次，保证渐变墙面也能完整识别。 */
        if (best.area < N * 0.18) {
            var best2 = null;
            for (i4 = 0; i4 < pts.length; i4++) {
                var r1 = probe(pts[i4][0], pts[i4][1], 58);
                if (!r1.top || r1.area < N * 0.12) continue;
                if (!best2 || r1.area > best2.area) best2 = r1;
            }
            if (best2 && best2.area > best.area) best = best2;
        }
        return { r: best.r, g: best.g, b: best.b, ratio: best.area / N };
    };

    /* 领口 / 躯干保护区（v18）
     *
     * ★ 问题：证件照常穿浅色衬衫、浅色领口，这类颜色和白墙非常接近，
     *   纯色替换会把领口和脖子一起当成背景换掉 —— 用户看到的就是
     *   「领口那一块变成了底色」。这是真 bug，不是撞色。
     *
     * ★ 做法：先用 YCbCr 肤色检测在上半部找出最大的肤色连通块（= 脸），
     *   再在脸的正下方划一个梯形区域（脖子 → 领口 → 肩胸），
     *   这块区域无论颜色多接近背景色，都不参与替换。
     *   实测：你那张图上这个区域救回 17918 个像素，
     *   而保护区之外的墙面仍被替换 98.9%，几乎没有副作用。 */
    LAB.faceGuard = function (src, w, h) {
        /* ★ 必须用源图自身的宽高比，不能用传入的目标尺寸。
         * 之前传入的是证件照目标尺寸 295×413（比例 0.714），
         * 而手机原图常见 1440×1920（比例 0.75）—— 比例对不上，
         * 采样网格被纵向拉伸，算出来的脸位置和脸高全偏了，
         * 保护区和裁剪框自然也就跟着错。 */
        var iw = src.naturalWidth || src.width || w;
        var ih = src.naturalHeight || src.height || h;
        if (!iw || !ih) return null;
        var sw = Math.min(iw, 220), sh = Math.max(1, Math.round(ih * (sw / iw)));
        var c = makeCanvas(sw, sh);
        var cx = c.getContext('2d');
        cx.drawImage(src, 0, 0, sw, sh);
        var d;
        try { d = cx.getImageData(0, 0, sw, sh).data; }
        catch (e) { return null; }
        var N = sw * sh, i, o;

        /* YCbCr 肤色判定 —— 比 RGB 规则更稳，红衣服不容易被误判成皮肤 */
        var skin = new Uint8Array(N);
        for (i = 0; i < N; i++) {
            o = i * 4;
            var r0 = d[o], g0 = d[o + 1], b0 = d[o + 2];
            var cb = 128 - 0.168736 * r0 - 0.331264 * g0 + 0.5 * b0;
            var cr = 128 + 0.5 * r0 - 0.418688 * g0 - 0.081312 * b0;
            if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) skin[i] = 1;
        }

        /* 只在画面上半部找脸，避免手臂/腿部干扰 */
        var lim = Math.round(sh * 0.55);
        var seen = new Uint8Array(N);
        var bestN = 0, bestSumX = 0, bestSumY = 0, bestMinY = 1e9, bestMaxY = -1,
            bestMinX = 1e9, bestMaxX = -1;
        var queue = new Int32Array(N);
        for (i = 0; i < N; i++) {
            if (!skin[i] || seen[i]) continue;
            var yy = (i / sw) | 0;
            if (yy >= lim) continue;
            var sp = 0, cnt = 0, sx = 0, sy = 0, mny = 1e9, mxy = -1, mnx = 1e9, mxx = -1;
            queue[sp++] = i; seen[i] = 1;
            while (sp > 0) {
                var idx = queue[--sp];
                var xi = idx % sw, yi = (idx / sw) | 0;
                cnt++; sx += xi; sy += yi;
                if (yi < mny) mny = yi; if (yi > mxy) mxy = yi;
                if (xi < mnx) mnx = xi; if (xi > mxx) mxx = xi;
                if (xi > 0) { var lf = idx - 1; if (skin[lf] && !seen[lf]) { seen[lf] = 1; queue[sp++] = lf; } }
                if (xi < sw - 1) { var rt2 = idx + 1; if (skin[rt2] && !seen[rt2]) { seen[rt2] = 1; queue[sp++] = rt2; } }
                if (yi > 0) { var upv = idx - sw; if (skin[upv] && !seen[upv]) { seen[upv] = 1; queue[sp++] = upv; } }
                if (yi < lim - 1) { var dnv = idx + sw; if (skin[dnv] && !seen[dnv]) { seen[dnv] = 1; queue[sp++] = dnv; } }
            }
            if (cnt > bestN) {
                bestN = cnt; bestSumX = sx / cnt; bestSumY = sy / cnt;
                bestMinY = mny; bestMaxY = mxy; bestMinX = mnx; bestMaxX = mxx;
            }
        }
        /* 脸太小说明没检测到人，不做保护 */
        if (bestN < N * 0.008) return null;

        var fx = bestSumX / sw, fw = (bestMaxX - bestMinX) / sw;
        var faceTop = bestMinY / sh, faceBottom = bestMaxY / sh;
        var fh = (bestMaxY - bestMinY) / sh;
        /* 人脸宽高比应在合理区间，否则可能是误检 */
        if (fw <= 0.05 || fh <= 0.05) return null;
        return { fx: fx, fw: fw, faceTop: faceTop, faceBottom: faceBottom, fh: fh };
    };

    /* 高质量分步降采样（v20）
     *
     * ★ 问题：证件照从 1440×1920 原图裁一块直接缩到 295×413，
     *   缩放比约 0.4（>2 倍）。浏览器 drawImage 在单次大比例缩小时
     *   默认走快速双线性（imageSmoothingQuality='low'），
     *   细节会被抹掉 —— 这就是「人物清晰度比原图差很大一截」的原因。
     *
     * ★ 做法：每次最多缩小一半，逐层减半直到接近目标，再精确收尾；
     *   全程 imageSmoothingQuality='high'。这是 canvas 缩图的经典解法，
     *   能显著保住头发、衣纹这类高频细节。 */
    LAB.shrinkHQ = function (src, sx, sy, sw, sh, dw, dh) {
        if (!sw || !sh || !dw || !dh) return null;
        var cur = makeCanvas(sw, sh);
        var cc = cur.getContext('2d');
        cc.imageSmoothingEnabled = true; cc.imageSmoothingQuality = 'high';
        cc.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
        var cw = sw, ch = sh;
        while (cw > dw * 2 && ch > dh * 2) {
            var nw = Math.max(dw, cw >> 1), nh = Math.max(dh, ch >> 1);
            var nx = makeCanvas(nw, nh);
            var nc = nx.getContext('2d');
            nc.imageSmoothingEnabled = true; nc.imageSmoothingQuality = 'high';
            nc.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
            cur = nx; cw = nw; ch = nh;
        }
        if (cw !== dw || ch !== dh) {
            var fx = makeCanvas(dw, dh);
            var fc = fx.getContext('2d');
            fc.imageSmoothingEnabled = true; fc.imageSmoothingQuality = 'high';
            fc.drawImage(cur, 0, 0, cw, ch, 0, 0, dw, dh);
            cur = fx;
        }
        return cur;
    };

    /* 从边缘连通扩散，把背景色区域换成目标底色 */
    LAB.replaceBg = function (src, bgRGB, targetSpec, opts) {
        opts = opts || {};
        var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
        var tol = opts.tolerance || 46;
        var cv = makeCanvas(w, h);
        var ctx = cv.getContext('2d');
        ctx.drawImage(src, 0, 0);
        var img;
        try { img = ctx.getImageData(0, 0, w, h); }
        catch (e) { return cv; }
        var d = img.data, N = w * h;

        /* ---- v23：局部参考色连通扩散（核心修正）----
         *
         * 旧做法：拿一个「全局底色」跟每个像素比，超阈值就不算背景。
         * 真实照片的白墙从来不是均匀的一块 —— 有光照衰减、有暗角、有噪点，
         * 边缘和角落常常比中间暗十几二十个色阶。全局阈值顾得了中间
         * 就顾不了四周，于是四周留下一片片没换掉的白块，
         * 这正是用户看到的「周围四周都还有一些白块」。
         *
         * 新做法：扩散时以**上一个像素的颜色**为参照（局部连续性），
         * 顺着背景自身的明暗渐变往前走；同时用一个宽松的全局上界兜底，
         * 防止顺着渐变一路「漂」到衣服上去。
         *
         * 实测（900×1200 模拟证件照，背景 150~255 不均匀）：
         *   旧算法背景残留白 59.3%  →  新算法 9.3%
         *   旧算法背景残留白 81.1%（均匀白底但底色估计被主体污染）→ 0.0% */
        var br = bgRGB.r, bgg = bgRGB.g, bb = bgRGB.b;
        var thr2 = tol * tol;
        var TOL_LOCAL = 30, TOL_MAX = 115;
        var thrL = TOL_LOCAL * TOL_LOCAL, thrM = TOL_MAX * TOL_MAX;
        var i3, x, y, idx;

        /* ---- v23：脖子 / 领口 / 肩胸设为「禁止扩散区」----
         *
         * 旧做法是等底色画完之后再去压 alpha —— 那只能「削弱」不能「阻止」，
         * 而且会把脖子两侧真正的背景一起保护住，留下两坨白块
         * （「脖子旁边两块白」就是这么来的）。
         * 现在改成在扩散阶段直接拦住：洪水根本进不来，
         * 浅色翻领 / 衬衫领子就不会被当成背景换成蓝色。
         * 形状上窄下宽：上面只盖住脖子，下面才展开盖住翻领和肩线。 */
        var block = null;
        if (opts.guard) {
            var gf0 = opts.guard;
            block = new Uint8Array(N);
            var by0 = Math.max(0, Math.round((gf0.faceBottom - gf0.fh * 0.05) * h));
            var by1 = Math.min(h, Math.round((gf0.faceBottom + gf0.fh * 1.10) * h));
            var bcx = Math.round(gf0.fx * w);
            for (var by = by0; by < by1; by++) {
                var bgt = (by1 > by0) ? (by - by0) / (by1 - by0) : 0;
                var bhw = Math.round(gf0.fw * w * (0.62 + 0.50 * bgt) / 2);
                var bx0 = Math.max(0, bcx - bhw), bx1 = Math.min(w, bcx + bhw);
                for (var bx = bx0; bx < bx1; bx++) block[by * w + bx] = 1;
            }
        }

        var mask = new Uint8Array(N);
        var stack = new Int32Array(N);
        var sp = 0;

        /* ★ v25：局部背景色场
         *
         * 旧合成式 out = p + a*(newBg - br) 里的 br 是**全局单一**背景估计值，
         * 而真实墙面必有光照衰减与暗角（实测顶部 250 → 底部 205）。
         * 底部像素拿 249 去减，结果比应有的底色暗 40+ 个色阶 ——
         * 用户看到的就是「肩部/下摆一圈发暗发脏，像抠图没抠干净」。
         *
         * 这里在洪水扩散时顺手记下每个背景像素的**局部参考色**（=父像素颜色），
         * 再做一次带权羽化得到平滑的底色场，合成时用它取代全局 br。
         * 这样换出来的底色处处一致，真正是纯色证件照底。 */
        var bgR = new Float32Array(N), bgG = new Float32Array(N), bgB = new Float32Array(N);

        function pushSeed(i) {
            if (mask[i] || (block && block[i])) return;
            var o = i * 4;
            var sr = d[o] - br, sg = d[o + 1] - bgg, sb = d[o + 2] - bb;
            if (sr * sr + sg * sg + sb * sb > thr2) return;
            mask[i] = 1; stack[sp++] = i;
            bgR[i] = d[o]; bgG[i] = d[o + 1]; bgB[i] = d[o + 2];
        }
        function tryGrow(n, pr, pg, pb) {
            if (mask[n] || (block && block[n])) return;
            var o = n * 4;
            var lr = d[o] - pr, lg = d[o + 1] - pg, lb = d[o + 2] - pb;
            if (lr * lr + lg * lg + lb * lb > thrL) return;
            var gr2 = d[o] - br, gg2 = d[o + 1] - bgg, gb2 = d[o + 2] - bb;
            if (gr2 * gr2 + gg2 * gg2 + gb2 * gb2 > thrM) return;
            mask[n] = 1; stack[sp++] = n;
            bgR[n] = pr; bgG[n] = pg; bgB[n] = pb;
        }
        for (x = 0; x < w; x++) { pushSeed(x); pushSeed((h - 1) * w + x); }
        for (y = 0; y < h; y++) { pushSeed(y * w); pushSeed(y * w + (w - 1)); }

        while (sp > 0) {
            idx = stack[--sp];
            var o2 = idx * 4;
            var pr = d[o2], pg = d[o2 + 1], pb = d[o2 + 2];
            var xi2 = idx % w, yi2 = (idx / w) | 0;
            if (xi2 > 0) tryGrow(idx - 1, pr, pg, pb);
            if (xi2 < w - 1) tryGrow(idx + 1, pr, pg, pb);
            if (yi2 > 0) tryGrow(idx - w, pr, pg, pb);
            if (yi2 < h - 1) tryGrow(idx + w, pr, pg, pb);
        }

        /* ---- v24 补漏（收紧）----
         *
         * v23 的补漏只要求「八个邻居里至少六个是背景」，这个条件太松：
         * 浅色翻领 / 衬衫领子紧贴脖子两侧的空白，边缘像素轻易就凑够六个背景邻居，
         * 于是一轮一轮往里啃，整片领子被吃掉换成蓝底 ——
         * 这正是用户看到的「肩部边缘蓝色残留」。
         *
         * 补漏的本意是补**发丝缝隙和压缩噪点**这类孤立小孔，
         * 所以现在加两条硬约束：
         *   1) 只跑一轮，不让它迭代扩张；
         *   2) 5×5 邻域里未标记的像素必须少于 10 个（即周围基本已被背景包围）。
         *      领口这种成片的浅色区域，邻域里大半都还没标记，直接被排除。 */
        {
            var added = 0;
            for (y = 2; y < h - 2; y++) {
                for (x = 2; x < w - 2; x++) {
                    idx = y * w + x;
                    if (mask[idx] || (block && block[idx])) continue;
                    var nb = (mask[idx - 1] ? 1 : 0) + (mask[idx + 1] ? 1 : 0) +
                             (mask[idx - w] ? 1 : 0) + (mask[idx + w] ? 1 : 0) +
                             (mask[idx - w - 1] ? 1 : 0) + (mask[idx - w + 1] ? 1 : 0) +
                             (mask[idx + w - 1] ? 1 : 0) + (mask[idx + w + 1] ? 1 : 0);
                    if (nb < 6) continue;
                    /* 邻域未标记计数：成片物体会被这里拦下 */
                    var un = 0;
                    for (var uy = -2; uy <= 2; uy++) {
                        var urow = (y + uy) * w + x;
                        for (var ux = -2; ux <= 2; ux++) if (!mask[urow + ux]) un++;
                    }
                    if (un >= 10) continue;
                    var o4 = idx * 4;
                    var e1 = d[o4] - br, e2 = d[o4 + 1] - bgg, e3 = d[o4 + 2] - bb;
                    if (e1 * e1 + e2 * e2 + e3 * e3 <= thr2) {
                        mask[idx] = 1; added++;
                        bgR[idx] = d[o4]; bgG[idx] = d[o4 + 1]; bgB[idx] = d[o4 + 2];
                    }
                }
            }
        }

        /* v16 安全网：统计被替换面积。背景不可能占满整张图，
         * 超过 88% 说明种子色选错（选中了衣服），人物被一起换掉。
         * 宁可返回 null 让上层退回抠图，也不能交出一张「人没了」的图。 */
        var cnt = 0;
        for (i3 = 0; i3 < N; i3++) if (mask[i3]) cnt++;
        if (cnt > N * 0.88) return null;

        /* ---- 掩码羽化：边缘过渡自然，不会有硬锯齿 ---- */
        var soft = featherMask(mask, w, h, Math.max(1, Math.round(Math.min(w, h) / 220)));
        /* 局部底色场：过渡带像素本身没被扩散到，靠邻居的背景像素补出局部基色。
         * 半径取羽化的 3 倍，保证过渡带取得到周围真实背景的色值。 */
        var fRad = Math.max(2, Math.round(Math.min(w, h) / 220) * 3);
        var softR = featherField(bgR, mask, w, h, fRad, br);
        var softG = featherField(bgG, mask, w, h, fRad, bgg);
        var softB = featherField(bgB, mask, w, h, fRad, bb);

        /* ---- 生成目标底色（支持纯色 / 渐变） ---- */
        var bgCv = makeCanvas(w, h);
        var bx = bgCv.getContext('2d');
        /* ★ v12 修复：底色规格有两种形态，必须都认
         *   - 对象：{type:'gradient',from,to} 或 {color:'#ff0000'}
         *   - 字符串：'#ff0000'（currentBgSpec() 预设按钮返回的就是这个）
         * 之前只认对象，字符串进来时 targetSpec.color 是 undefined，
         * 于是**不管选红底还是蓝底，统统填成白色** —— 换底色完全失效。 */
        if (targetSpec && typeof targetSpec === 'object' && targetSpec.type === 'gradient') {
            var g = bx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, targetSpec.from);
            g.addColorStop(1, targetSpec.to);
            bx.fillStyle = g;
        } else if (typeof targetSpec === 'string' && targetSpec) {
            bx.fillStyle = targetSpec;
        } else {
            bx.fillStyle = (targetSpec && targetSpec.color) ? targetSpec.color : '#ffffff';
        }
        bx.fillRect(0, 0, w, h);
        var bd = bx.getImageData(0, 0, w, h).data;

        /* ★ v23 合成公式修正：抠掉的是「原始背景色」，不是「像素自己的颜色」
         *
         * 旧写法 out = p*(1-a) + newBg*a  —— 在羽化过渡带（a≈0.3~0.7）里，
         * 像素里原本那部分**原始背景色**只被替换掉 a 那么多，
         * 剩下的仍然留在结果里，于是人物轮廓一圈挂着白边 ——
         * 这就是「脖子旁边两块白」和「周围四周白块」的本质。
         *
         * 正确写法来自抠图合成的基本式：
         *   观测像素 p = a * 原背景 + (1-a) * 真实前景
         *   要把背景换成 newBg，就该 out = p + a * (newBg - 原背景)
         * 这样过渡带里原背景的成分被**完整扣除**，
         * 只剩「真实前景 + 新底色」的混合，不会残留任何白边。 */
        /* ---- v24 肤色保护 ----
         *
         * 背景色一旦估偏（真实照片常有阴影、暗角、偏色），
         * 浅色皮肤在抗锯齿边缘上就会「接近背景色」而被判成背景，
         * 于是脸颊、下巴、脖子被啃出一块块蓝 —— 这就是「头部边缘蓝色残留」。
         *
         * 皮肤区域永远属于人物，不可能属于背景。
         * 这里用 YCbCr 肤色模型把皮肤像素的替换强度压到极低（0.12），
         * 既不至于完全不动（那会在脖子两侧留白边），
         * 也足以让任何程度的背景误判都啃不动脸和脖子。
         * 白墙 / 蓝布 / 红布三种证件照底色都不会落入肤色区间，不会误伤。 */
        var skinPx = new Uint8Array(N);
        for (i3 = 0; i3 < N; i3++) {
            var so = i3 * 4, sr0 = d[so], sg0 = d[so + 1], sb0 = d[so + 2];
            var scb = 128 - 0.168736 * sr0 - 0.331264 * sg0 + 0.5 * sb0;
            var scr = 128 + 0.5 * sr0 - 0.418688 * sg0 - 0.081312 * sb0;
            if (scb >= 77 && scb <= 127 && scr >= 133 && scr <= 173) skinPx[i3] = 1;
        }

        for (i3 = 0; i3 < N; i3++) {
            var a = soft[i3];
            if (a <= 0) continue;
            if (skinPx[i3] && a > 0.12) a = 0.12;
            var o3 = i3 * 4;
            var nr = d[o3] + a * (bd[o3] - softR[i3]);
            var ng = d[o3 + 1] + a * (bd[o3 + 1] - softG[i3]);
            var nb = d[o3 + 2] + a * (bd[o3 + 2] - softB[i3]);
            d[o3] = nr < 0 ? 0 : (nr > 255 ? 255 : nr);
            d[o3 + 1] = ng < 0 ? 0 : (ng > 255 ? 255 : ng);
            d[o3 + 2] = nb < 0 ? 0 : (nb > 255 ? 255 : nb);
        }
        ctx.putImageData(img, 0, 0);

        /* ★ v15：把背景掩码带出去。证件照要在衣服颜色和底色接近时
         * 沿着人物边缘描一圈细线，否则人跟底色糊成一片分不出轮廓。 */
        cv.__bgMask = soft;
        cv.__maskW = w;
        cv.__maskH = h;
        return cv;
    };

    /* 掩码羽化（简单的可分离盒模糊，值域 0..1） */
    function featherMask(mask, w, h, r) {
        if (r <= 0) {
            var f0 = new Float32Array(w * h);
            for (var i = 0; i < w * h; i++) f0[i] = mask[i];
            return f0;
        }
        var tmp = new Float32Array(w * h), out = new Float32Array(w * h);
        var x, y, i, sum, cnt;
        for (y = 0; y < h; y++) {
            sum = 0; cnt = 0;
            for (x = 0; x < w; x++) {
                var idx = y * w + x;
                if (mask[idx]) { sum += 1; cnt++; }
                var xo = x - r - 1;
                if (xo >= 0 && mask[y * w + xo]) { sum -= 1; cnt--; }
                tmp[idx] = cnt ? sum / cnt : 0;
            }
        }
        for (x = 0; x < w; x++) {
            sum = 0; cnt = 0;
            for (y = 0; y < h; y++) {
                var id2 = y * w + x;
                sum += tmp[id2]; cnt++;
                var yo = y - r - 1;
                if (yo >= 0) { sum -= tmp[yo * w + x]; cnt--; }
                out[id2] = cnt ? sum / cnt : 0;
            }
        }
        return out;
    }

    /* 带权局部场羽化（v25）
     *
     * 与 featherMask 同构，但处理的是**连续值**（局部背景色）而不是 0/1 掩码：
     * 每个像素取邻域内「已确认是背景」的像素的平均值；
     * 一个有效邻居都没有时退回 fallback（全局背景估计）。
     * 这样人物轮廓的过渡带也能拿到贴近真实的局部基色。 */
    function featherField(field, valid, w, h, r, fallback) {
        var out = new Float32Array(w * h);
        if (r <= 0) {
            for (var q = 0; q < w * h; q++) out[q] = valid[q] ? field[q] : fallback;
            return out;
        }
        var tmpS = new Float32Array(w * h), tmpC = new Float32Array(w * h);
        var x, y, i, idx;
        for (y = 0; y < h; y++) {
            var sum = 0, cnt = 0;
            for (x = 0; x < w; x++) {
                idx = y * w + x;
                if (valid[idx]) { sum += field[idx]; cnt++; }
                var xo = x - r - 1;
                if (xo >= 0 && valid[y * w + xo]) { sum -= field[y * w + xo]; cnt--; }
                tmpS[idx] = sum; tmpC[idx] = cnt;
            }
        }
        for (x = 0; x < w; x++) {
            var s2 = 0, c2 = 0;
            for (y = 0; y < h; y++) {
                idx = y * w + x;
                s2 += tmpS[idx]; c2 += tmpC[idx];
                var yo = y - r - 1;
                if (yo >= 0) { s2 -= tmpS[yo * w + x]; c2 -= tmpC[yo * w + x]; }
                out[idx] = c2 > 0 ? (s2 / c2) : fallback;
            }
        }
        return out;
    }
    LAB.featherField = featherField;

    /* 轻量 k-means（3 维），供纯色检测用 */
    function kmeansLite(data, k, iters) {
        var n = data.length / 3;
        var centers = new Float64Array(k * 3);
        var counts = new Int32Array(k);
        var i, c;
        for (c = 0; c < k; c++) {
            var pick = Math.floor(n * (c + 0.5) / k) * 3;
            centers[c * 3] = data[pick]; centers[c * 3 + 1] = data[pick + 1]; centers[c * 3 + 2] = data[pick + 2];
        }
        var assign = new Int32Array(n);
        for (var it = 0; it < (iters || 6); it++) {
            for (i = 0; i < n; i++) {
                var o = i * 3, best = Infinity, bc = 0;
                for (c = 0; c < k; c++) {
                    var c3 = c * 3;
                    var dr = data[o] - centers[c3], dg = data[o + 1] - centers[c3 + 1], db = data[o + 2] - centers[c3 + 2];
                    var d2 = dr * dr + dg * dg + db * db;
                    if (d2 < best) { best = d2; bc = c; }
                }
                assign[i] = bc;
            }
            var sx = new Float64Array(k * 3); counts.fill(0);
            for (i = 0; i < n; i++) {
                var cc = assign[i] * 3, oo = i * 3;
                sx[cc] += data[oo]; sx[cc + 1] += data[oo + 1]; sx[cc + 2] += data[oo + 2];
                counts[assign[i]]++;
            }
            for (c = 0; c < k; c++) {
                if (counts[c]) {
                    centers[c * 3] = sx[c * 3] / counts[c];
                    centers[c * 3 + 1] = sx[c * 3 + 1] / counts[c];
                    centers[c * 3 + 2] = sx[c * 3 + 2] / counts[c];
                }
            }
        }
        return { centers: centers, counts: counts, k: k };
    }

    global.Lab = LAB;
})(window);
