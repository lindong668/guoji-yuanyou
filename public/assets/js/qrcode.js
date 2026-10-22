/* ============================================================
 * qrcode.js — 二维码生成（纯实现，无外部依赖）
 * 支持版本 1-20，纠错 L/M/Q/H，数字/字母数字/字节(UTF-8) 模式
 * ============================================================ */

(function (global) {
    'use strict';

    /* ---------- GF(256) ---------- */
    var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    (function () {
        var x = 1;
        for (var i = 0; i < 255; i++) {
            EXP[i] = x; LOG[x] = i;
            x <<= 1;
            if (x & 0x100) x ^= 0x11D;
        }
        for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
    })();

    function gmul(a, b) {
        if (a === 0 || b === 0) return 0;
        return EXP[LOG[a] + LOG[b]];
    }

    /** 生成多项式 */
    function genPoly(deg) {
        var p = [1];
        for (var d = 0; d < deg; d++) {
            var np = new Array(p.length + 1).fill(0);
            for (var i = 0; i < p.length; i++) {
                np[i] ^= gmul(p[i], 1);
                np[i + 1] ^= gmul(p[i], EXP[d]);
            }
            p = np;
        }
        return p;
    }

    /** RS 编码 */
    function rsEncode(data, ecLen) {
        var gen = genPoly(ecLen);
        var res = data.concat(new Array(ecLen).fill(0));
        for (var i = 0; i < data.length; i++) {
            var coef = res[i];
            if (coef === 0) continue;
            for (var j = 0; j < gen.length; j++) {
                res[i + j] ^= gmul(gen[j], coef);
            }
        }
        return res.slice(data.length);
    }

    /* ---------- 版本参数表 ----------
     * [ecPerBlock, blocksG1, dataPerBlockG1, blocksG2, dataPerBlockG2]
     * 顺序：L, M, Q, H
     */
    var EC_TABLE = {
        1: [26, [[7, 1, 19, 0, 0], [10, 1, 16, 0, 0], [13, 1, 13, 0, 0], [17, 1, 9, 0, 0]]],
        2: [44, [[10, 1, 34, 0, 0], [16, 1, 28, 0, 0], [22, 1, 22, 0, 0], [28, 1, 16, 0, 0]]],
        3: [70, [[15, 1, 55, 0, 0], [26, 1, 44, 0, 0], [18, 2, 17, 0, 0], [22, 2, 13, 0, 0]]],
        4: [100, [[20, 1, 80, 0, 0], [18, 2, 32, 0, 0], [26, 2, 24, 0, 0], [16, 4, 9, 0, 0]]],
        5: [134, [[26, 1, 108, 0, 0], [24, 2, 43, 0, 0], [18, 2, 15, 2, 16], [22, 2, 11, 2, 12]]],
        6: [172, [[18, 2, 68, 0, 0], [16, 4, 27, 0, 0], [24, 4, 19, 0, 0], [28, 4, 15, 0, 0]]],
        7: [196, [[20, 2, 78, 0, 0], [18, 4, 31, 0, 0], [18, 2, 14, 4, 15], [26, 4, 13, 1, 14]]],
        8: [242, [[24, 2, 97, 0, 0], [22, 2, 38, 2, 39], [22, 4, 18, 2, 19], [26, 4, 14, 2, 15]]],
        9: [292, [[30, 2, 116, 0, 0], [22, 3, 36, 2, 37], [20, 4, 16, 4, 17], [24, 4, 12, 4, 13]]],
        10: [346, [[18, 2, 68, 2, 69], [26, 4, 43, 1, 44], [24, 6, 19, 2, 20], [28, 6, 15, 2, 16]]],
        11: [404, [[20, 4, 81, 0, 0], [30, 1, 50, 4, 51], [28, 4, 22, 4, 23], [24, 3, 12, 8, 13]]],
        12: [466, [[24, 2, 92, 2, 93], [22, 6, 36, 2, 37], [26, 4, 20, 6, 21], [28, 7, 14, 4, 15]]],
        13: [532, [[26, 4, 107, 0, 0], [22, 8, 37, 1, 38], [24, 8, 20, 4, 21], [22, 12, 11, 4, 12]]],
        14: [581, [[30, 3, 115, 1, 116], [24, 4, 40, 5, 41], [20, 11, 16, 5, 17], [24, 11, 12, 5, 13]]],
        15: [655, [[22, 5, 87, 1, 88], [24, 5, 41, 5, 42], [30, 5, 24, 7, 25], [24, 11, 12, 7, 13]]],
        16: [733, [[24, 5, 98, 1, 99], [28, 7, 45, 3, 46], [24, 15, 19, 2, 20], [30, 3, 15, 13, 16]]],
        17: [815, [[28, 1, 107, 5, 108], [28, 10, 46, 1, 47], [28, 1, 22, 15, 23], [28, 2, 14, 17, 15]]],
        18: [901, [[30, 5, 120, 1, 121], [26, 9, 43, 4, 44], [28, 17, 22, 1, 23], [28, 2, 14, 19, 15]]],
        19: [991, [[28, 3, 113, 4, 114], [26, 3, 44, 11, 45], [26, 17, 21, 4, 22], [26, 9, 13, 16, 14]]],
        20: [1085, [[28, 3, 107, 5, 108], [26, 3, 41, 13, 42], [30, 15, 24, 5, 25], [28, 15, 15, 10, 16]]]
    };

    var ALIGN = {
        1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
        7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
        11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66],
        15: [6, 26, 48, 70], 16: [6, 26, 50, 74], 17: [6, 30, 54, 78],
        18: [6, 30, 56, 82], 19: [6, 30, 58, 86], 20: [6, 34, 62, 90]
    };

    var EC_LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 };

    /* ---------- 数据编码 ---------- */
    var ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

    function isDigits(s) { return /^[0-9]+$/.test(s); }
    function isAlnum(s) {
        for (var i = 0; i < s.length; i++) if (ALNUM.indexOf(s[i]) < 0) return false;
        return true;
    }
    function utf8Bytes(s) {
        var out = [];
        var enc = encodeURIComponent(s);
        for (var i = 0; i < enc.length; i++) {
            if (enc[i] === '%') { out.push(parseInt(enc.substr(i + 1, 2), 16)); i += 2; }
            else out.push(enc.charCodeAt(i));
        }
        return out;
    }

    function charCountBits(mode, ver) {
        if (ver < 10) return mode === 1 ? 10 : mode === 2 ? 9 : 8;
        return mode === 1 ? 12 : mode === 2 ? 11 : 16;
    }

    /** 选择最优模式并编码为 bit 数组 */
    function encodeData(text, mode) {
        var bytes, modeInd, bits = [];
        if (mode === 'numeric' && isDigits(text)) {
            modeInd = 1;
            pushBits(bits, 1, 4);
            var ver = 1; // 占位，稍后修正
            var s = text;
            var nb = [];
            for (var i = 0; i < s.length; i += 3) {
                var chunk = s.substr(i, 3);
                var n = parseInt(chunk, 10);
                var len = chunk.length;
                pushBits(nb, n, len === 3 ? 10 : len === 2 ? 7 : 4);
            }
            return { mode: 1, bits: nb, count: s.length };
        }
        if (mode === 'alnum' && isAlnum(text)) {
            modeInd = 2;
            var nb2 = [];
            for (var j = 0; j < text.length; j += 2) {
                if (j + 1 < text.length) {
                    var v = ALNUM.indexOf(text[j]) * 45 + ALNUM.indexOf(text[j + 1]);
                    pushBits(nb2, v, 11);
                } else pushBits(nb2, ALNUM.indexOf(text[j]), 6);
            }
            return { mode: 2, bits: nb2, count: text.length };
        }
        bytes = utf8Bytes(text);
        var nb3 = [];
        for (var k = 0; k < bytes.length; k++) pushBits(nb3, bytes[k], 8);
        return { mode: 4, bits: nb3, count: bytes.length };
    }

    function pushBits(arr, val, len) {
        for (var i = len - 1; i >= 0; i--) arr.push((val >>> i) & 1);
    }

    function bitsToBytes(bits) {
        var out = [];
        for (var i = 0; i < bits.length; i += 8) {
            var b = 0;
            for (var j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
            out.push(b);
        }
        return out;
    }

    /* ---------- 矩阵构建 ---------- */
    function buildMatrix(ver, ecLevel) {
        var size = ver * 4 + 17;
        var m = [], isFunc = [];
        for (var i = 0; i < size; i++) {
            m.push(new Array(size).fill(null));
            isFunc.push(new Array(size).fill(false));
        }
        return { size: size, m: m, isFunc: isFunc };
    }

    function placeFinder(m, isF, r, c) {
        for (var dr = -1; dr <= 7; dr++) {
            for (var dc = -1; dc <= 7; dc++) {
                var rr = r + dr, cc = c + dc;
                if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
                var on = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
                    (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6)) ||
                    (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
                if (m[rr][cc] === null) m[rr][cc] = on ? 1 : 0;
                isF[rr][cc] = true;   // 定位图案与分隔符均为功能区域
            }
        }
    }

    function placeAlign(m, isF, ver) {
        var pos = ALIGN[ver];
        if (!pos.length) return;
        for (var a = 0; a < pos.length; a++) {
            for (var b = 0; b < pos.length; b++) {
                var r = pos[a], c = pos[b];
                // 跳过与定位图案重叠
                if ((r <= 8 && c <= 8) || (r <= 8 && c >= m.length - 9) || (r >= m.length - 9 && c <= 8)) continue;
                for (var dr = -2; dr <= 2; dr++) {
                    for (var dc = -2; dc <= 2; dc++) {
                        var on = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
                        if (m[r + dr][c + dc] === null) m[r + dr][c + dc] = on ? 1 : 0;
                        isF[r + dr][c + dc] = true;
                    }
                }
            }
        }
    }

    function placeTiming(m, isF) {
        for (var i = 8; i < m.length - 8; i++) {
            if (m[6][i] === null) m[6][i] = i % 2 === 0 ? 1 : 0;
            if (m[i][6] === null) m[i][6] = i % 2 === 0 ? 1 : 0;
            isF[6][i] = true; isF[i][6] = true;
        }
    }

    function reserveFormat(m, isF) {
        var size = m.length, i;
        for (i = 0; i <= 8; i++) {
            if (m[8][i] === null) m[8][i] = 0;
            if (m[i][8] === null) m[i][8] = 0;
            isF[8][i] = true; isF[i][8] = true;
        }
        // 右侧与下方各 8 个（size-1 .. size-8）。
        // 注意必须是 i < 8：size-9 位置的 (8,size-9) 与 (size-9,8) 属于数据区，
        // 误标为功能位会使整条数据流偏移 1 bit，导致无法扫描。
        for (i = 0; i < 8; i++) {
            if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = 0;
            if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = 0;
            isF[8][size - 1 - i] = true; isF[size - 1 - i][8] = true;
        }
    }

    function placeVersion(m, isF, ver) {
        if (ver < 7) return;
        var bits = bchVersion(ver);
        var size = m.length;
        for (var i = 0; i < 18; i++) {
            var b = (bits >>> i) & 1;
            var r1 = Math.floor(i / 3), c1 = size - 11 + (i % 3);
            m[r1][c1] = b; isF[r1][c1] = true;
            var r2 = size - 11 + (i % 3), c2 = Math.floor(i / 3);
            m[r2][c2] = b; isF[r2][c2] = true;
        }
    }

    function bchVersion(ver) {
        var d = ver << 12, g = 0x1F25;
        for (var i = 0; i < 6; i++) {
            if ((d ^ (g >> 6)) & 1) { /* noop */ }
        }
        // 标准 BCH(18,6)
        var rem = ver;
        for (var k = 0; k < 12; k++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
        return (ver << 12) | rem;
    }

    function placeData(m, isF, dataBits) {
        var size = m.length;
        var idx = 0, dir = -1, row = size - 1;
        var total = dataBits.length;
        for (var col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--; // 跳过定时列
            for (var k = 0; k < size; k++) {
                for (var c2 = 0; c2 < 2; c2++) {
                    var cc = col - c2;
                    if (isF[row][cc]) continue;
                    var bit = idx < total ? dataBits[idx++] : 0;
                    m[row][cc] = bit;
                }
                row += dir;
                if (row < 0 || row >= size) { dir = -dir; row += dir; break; }
            }
        }
    }

    function maskFn(id, r, c) {
        switch (id) {
            case 0: return (r + c) % 2 === 0;
            case 1: return r % 2 === 0;
            case 2: return c % 3 === 0;
            case 3: return (r + c) % 3 === 0;
            case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
            case 5: return (r * c) % 2 + (r * c) % 3 === 0;
            case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
            case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
        }
        return false;
    }

    function applyMask(m, isF, id) {
        var out = m.map(function (row) { return row.slice(); });
        for (var r = 0; r < out.length; r++) {
            for (var c = 0; c < out.length; c++) {
                if (isF[r][c]) continue;          // 功能图案不参与掩码
                if (maskFn(id, r, c)) out[r][c] ^= 1;
            }
        }
        return out;
    }

    /** 取行/列的取值器（避免闭包捕获循环变量） */
    function makeRowGetter(m, r) {
        return function (k) { return m[r][k]; };
    }
    function makeColGetter(m, c) {
        return function (k) { return m[k][c]; };
    }

    function penalty(m) {
        var size = m.length, p = 0, i, j;
        // 规则1：连续5个以上同色
        // 注意：内部必须用独立变量 q，不能复用外层 i，否则会污染循环
        function scanLine(get) {
            var pen = 0, run = 1, prev = get(0);
            for (var q = 1; q < size; q++) {
                var v = get(q);
                if (v === prev) run++;
                else { if (run >= 5) pen += run - 2; run = 1; prev = v; }
            }
            if (run >= 5) pen += run - 2;
            return pen;
        }
        for (i = 0; i < size; i++) {
            p += scanLine(makeRowGetter(m, i, size));
            p += scanLine(makeColGetter(m, i, size));
        }
        // 规则2：2x2 同色块
        for (i = 0; i < size - 1; i++) {
            for (j = 0; j < size - 1; j++) {
                var v = m[i][j];
                if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) p += 3;
            }
        }
        // 规则3：1:1:3:1:1 模式
        var pat1 = [1, 0, 1, 1, 1, 0, 1], pat2 = [0, 0, 0, 0];
        for (i = 0; i < size; i++) {
            for (j = 0; j <= size - 11; j++) {
                var match = true;
                for (var k = 0; k < 11; k++) {
                    var expect = k < 7 ? pat1[k] : pat2[k - 7];
                    if (m[i][j + k] !== expect) { match = false; break; }
                }
                if (match) p += 40;
                match = true;
                for (var k2 = 0; k2 < 11; k2++) {
                    var e2 = k2 < 7 ? pat1[k2] : pat2[k2 - 7];
                    if (m[j + k2][i] !== e2) { match = false; break; }
                }
                if (match) p += 40;
            }
        }
        // 规则4：黑白比例
        var dark = 0;
        for (i = 0; i < size; i++) for (j = 0; j < size; j++) if (m[i][j]) dark++;
        var ratio = dark * 100 / (size * size);
        p += Math.floor(Math.abs(ratio - 50) / 5) * 10;
        return p;
    }

    function placeFormat(m, ecLevel, maskId) {
        var data = (EC_LEVEL_BITS[ecLevel] << 3) | maskId;
        var rem = data;
        for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        var bits = ((data << 10) | rem) ^ 0x5412;
        var size = m.length;
        // 第一组
        for (var k = 0; k < 15; k++) {
            var b = (bits >>> k) & 1;
            if (k < 6) m[k][8] = b;
            else if (k === 6) m[7][8] = b;
            else if (k === 7) m[8][8] = b;
            else if (k === 8) m[8][7] = b;
            else m[8][14 - k] = b;
        }
        // 第二组
        for (var k2 = 0; k2 < 15; k2++) {
            var b2 = (bits >>> k2) & 1;
            if (k2 < 8) m[8][size - 1 - k2] = b2;
            else m[size - 15 + k2][8] = b2;
        }
        m[size - 8][8] = 1; // dark module
    }

    /* ---------- 主入口 ---------- */
    function generate(text, opts) {
        opts = opts || {};
        var ecLevel = opts.ecLevel || 'M';
        var ecIdx = { L: 0, M: 1, Q: 2, H: 3 }[ecLevel];
        var mode = opts.mode || 'auto';

        if (!text) throw new Error('内容不能为空');

        // 选版本
        var chosen = null;
        for (var ver = 1; ver <= 20; ver++) {
            var spec = EC_TABLE[ver];
            var ec = spec[1][ecIdx];
            var totalData = ec[1] * ec[2] + ec[3] * ec[4];
            var enc;
            if (mode === 'numeric' && isDigits(text)) enc = { mode: 1, count: text.length };
            else if (mode === 'alnum' && isAlnum(text)) enc = { mode: 2, count: text.length };
            else enc = { mode: 4, count: utf8Bytes(text).length };

            var needBits = 4 + charCountBits(enc.mode, ver) + (enc.mode === 1
                ? Math.floor(enc.count / 3) * 10 + [0, 4, 7][enc.count % 3]
                : enc.mode === 2
                    ? Math.floor(enc.count / 2) * 11 + (enc.count % 2) * 6
                    : enc.count * 8);
            if (needBits <= totalData * 8) { chosen = { ver: ver, ec: ec, enc: enc, totalData: totalData }; break; }
        }
        if (!chosen) throw new Error('内容过长，超出二维码容量（请缩短文本或降低纠错等级）');

        var enc = encodeData(text, mode);
        // 重新按选定版本编码
        var bitArr = [];
        pushBits(bitArr, enc.mode, 4);
        pushBits(bitArr, enc.count, charCountBits(enc.mode, chosen.ver));
        bitArr = bitArr.concat(enc.bits);

        // 终止符 + 补齐
        var capBits = chosen.totalData * 8;
        var term = Math.min(4, capBits - bitArr.length);
        for (var t = 0; t < term; t++) bitArr.push(0);
        while (bitArr.length % 8 !== 0) bitArr.push(0);
        var dataBytes = bitsToBytes(bitArr);
        var padBytes = [0xEC, 0x11];
        var pi = 0;
        while (dataBytes.length < chosen.totalData) dataBytes.push(padBytes[pi++ % 2]);

        // 分块 + RS
        var ecSpec = chosen.ec;
        var blocks = [];
        var offset = 0;
        for (var g = 0; g < ecSpec[1]; g++) {
            blocks.push({ data: dataBytes.slice(offset, offset + ecSpec[2]), ecLen: ecSpec[0] });
            offset += ecSpec[2];
        }
        for (var g2 = 0; g2 < ecSpec[3]; g2++) {
            blocks.push({ data: dataBytes.slice(offset, offset + ecSpec[4]), ecLen: ecSpec[0] });
            offset += ecSpec[4];
        }
        blocks.forEach(function (b) { b.ec = rsEncode(b.data, b.ecLen); });

        // 交织
        var finalBytes = [];
        var maxData = Math.max.apply(null, blocks.map(function (b) { return b.data.length; }));
        for (var i2 = 0; i2 < maxData; i2++) {
            blocks.forEach(function (b) { if (i2 < b.data.length) finalBytes.push(b.data[i2]); });
        }
        var maxEc = Math.max.apply(null, blocks.map(function (b) { return b.ec.length; }));
        for (var i3 = 0; i3 < maxEc; i3++) {
            blocks.forEach(function (b) { if (i3 < b.ec.length) finalBytes.push(b.ec[i3]); });
        }
        var finalBits = [];
        finalBytes.forEach(function (b) { pushBits(finalBits, b, 8); });

        // 矩阵
        var mm = buildMatrix(chosen.ver, ecLevel);
        var isF = mm.isFunc;
        placeFinder(mm.m, isF, 0, 0);
        placeFinder(mm.m, isF, 0, mm.size - 7);
        placeFinder(mm.m, isF, mm.size - 7, 0);
        placeAlign(mm.m, isF, chosen.ver);
        placeTiming(mm.m, isF);
        reserveFormat(mm.m, isF);
        placeVersion(mm.m, isF, chosen.ver);
        placeData(mm.m, isF, finalBits);

        // 选掩码：8 种各算惩罚分，取最低
        var best = null, bestPen = Infinity, bestMask = 0;
        for (var mid = 0; mid < 8; mid++) {
            var cand = applyMask(mm.m, isF, mid);
            placeFormat(cand, ecLevel, mid);
            var pen = penalty(cand);
            if (pen < bestPen) { bestPen = pen; best = cand; bestMask = mid; }
        }

        return {
            modules: best,
            size: mm.size,
            version: chosen.ver,
            ecLevel: ecLevel,
            mask: bestMask
        };
    }

    /* ---------- 渲染到 canvas ---------- */
    function render(canvas, qr, opts) {
        opts = opts || {};
        var size = qr.size;
        var margin = opts.margin == null ? 4 : opts.margin;
        var scale = opts.scale || 8;
        var total = size + margin * 2;
        var px = total * scale;
        canvas.width = px; canvas.height = px;
        var ctx = canvas.getContext('2d');

        // 背景
        ctx.fillStyle = opts.background || '#ffffff';
        ctx.fillRect(0, 0, px, px);

        var fg = opts.foreground || '#000000';
        var shape = opts.shape || 'square';   // square | dot | rounded

        ctx.fillStyle = fg;
        for (var r = 0; r < size; r++) {
            for (var c = 0; c < size; c++) {
                if (!qr.modules[r][c]) continue;
                var x = (c + margin) * scale, y = (r + margin) * scale;
                if (shape === 'dot') {
                    ctx.beginPath();
                    ctx.arc(x + scale / 2, y + scale / 2, scale * 0.42, 0, Math.PI * 2);
                    ctx.fill();
                } else if (shape === 'rounded') {
                    roundRect(ctx, x, y, scale, scale, scale * 0.3);
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, scale + 0.5, scale + 0.5);
                }
            }
        }

        // 中心 Logo
        if (opts.logo) {
            var lw = px * (opts.logoSize || 0.2);
            var lx = (px - lw) / 2, ly = (px - lw) / 2;
            var pad = lw * 0.08;
            ctx.fillStyle = opts.background || '#ffffff';
            roundRect(ctx, lx - pad, ly - pad, lw + pad * 2, lw + pad * 2, lw * 0.12);
            ctx.fill();
            ctx.drawImage(opts.logo, lx, ly, lw, lw);
        }
        return canvas;
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /* ---------- 常见内容模板 ---------- */
    var TEMPLATES = {
        text: function (v) { return v; },
        url: function (v) {
            if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
            return v;
        },
        wifi: function (v) {
            var p = v || {};
            var esc = function (s) { return String(s).replace(/([\\;,:"])/g, '\\$1'); };
            return 'WIFI:T:' + (p.auth || 'WPA') + ';S:' + esc(p.ssid || '') +
                ';P:' + esc(p.pass || '') + ';H:' + (p.hidden ? 'true' : 'false') + ';;';
        },
        vcard: function (v) {
            var p = v || {};
            return 'BEGIN:VCARD\nVERSION:3.0\nN:' + (p.last || '') + ';' + (p.first || '') +
                '\nFN:' + (p.first || '') + ' ' + (p.last || '') +
                (p.org ? '\nORG:' + p.org : '') +
                (p.title ? '\nTITLE:' + p.title : '') +
                (p.tel ? '\nTEL:' + p.tel : '') +
                (p.email ? '\nEMAIL:' + p.email : '') +
                (p.url ? '\nURL:' + p.url : '') +
                '\nEND:VCARD';
        },
        email: function (v) {
            var p = v || {};
            return 'mailto:' + (p.to || '') + (p.subject ? '?subject=' + encodeURIComponent(p.subject) : '') +
                (p.body ? (p.subject ? '&' : '?') + 'body=' + encodeURIComponent(p.body) : '');
        },
        sms: function (v) {
            var p = v || {};
            return 'SMSTO:' + (p.to || '') + ':' + (p.body || '');
        },
        tel: function (v) { return 'tel:' + v; },
        geo: function (v) {
            var p = v || {};
            return 'geo:' + (p.lat || 0) + ',' + (p.lng || 0);
        },
        event: function (v) {
            var p = v || {};
            function d(s) { return (s || '').replace(/[-:]/g, ''); }
            return 'BEGIN:VEVENT\nSUMMARY:' + (p.title || '') +
                '\nDTSTART:' + d(p.start) + '\nDTEND:' + d(p.end) +
                (p.location ? '\nLOCATION:' + p.location : '') +
                (p.desc ? '\nDESCRIPTION:' + p.desc : '') + '\nEND:VEVENT';
        },
        upi: function (v) {
            var p = v || {};
            return 'upi://pay?pa=' + encodeURIComponent(p.pa || '') +
                '&pn=' + encodeURIComponent(p.pn || '') +
                (p.am ? '&am=' + p.am : '') + (p.tn ? '&tn=' + encodeURIComponent(p.tn) : '');
        }
    };

    global.QRCode = {
        generate: generate,
        render: render,
        templates: TEMPLATES,
        roundRect: roundRect
    };
})(window);
