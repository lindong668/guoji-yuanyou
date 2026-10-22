/* ============================================================
 * PicStudio 图像分割库 —— GrabCut / Alpha Matting / 景深虚化
 * 纯浏览器实现，无任何外部依赖
 * ============================================================ */
(function (global) {
'use strict';

/* ---------- 可重复随机 ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- k-means（3 通道） ---------- */
function kmeans3d(pts, k, iters, rnd) {
  var n = pts.length / 3;
  if (n === 0) return null;
  k = Math.min(k, n);
  rnd = rnd || mulberry32(20261019);

  // 用分位采样初始化中心，比纯随机稳
  var idx = [];
  for (var i = 0; i < n; i++) idx.push(i);
  for (var s = idx.length - 1; s > 0; s--) {
    var j = Math.floor(rnd() * (s + 1)); var t = idx[s]; idx[s] = idx[j]; idx[j] = t;
  }
  var centers = new Float64Array(k * 3);
  for (var c = 0; c < k; c++) {
    var p = idx[c] * 3;
    centers[c*3] = pts[p]; centers[c*3+1] = pts[p+1]; centers[c*3+2] = pts[p+2];
  }

  var assign = new Int32Array(n);
  var counts = new Int32Array(k);

  for (var it = 0; it < iters; it++) {
    counts.fill(0);
    var sums = new Float64Array(k * 3);
    var moved = 0;
    for (var i2 = 0; i2 < n; i2++) {
      var r = pts[i2*3], g = pts[i2*3+1], b = pts[i2*3+2];
      var best = 0, bestD = Infinity;
      for (var c2 = 0; c2 < k; c2++) {
        var dr = r - centers[c2*3], dg = g - centers[c2*3+1], db = b - centers[c2*3+2];
        var d = dr*dr + dg*dg + db*db;
        if (d < bestD) { bestD = d; best = c2; }
      }
      if (assign[i2] !== best) { assign[i2] = best; moved++; }
      counts[best]++;
      sums[best*3] += r; sums[best*3+1] += g; sums[best*3+2] += b;
    }
    for (var c3 = 0; c3 < k; c3++) {
      if (counts[c3] === 0) { // 空簇：重新丢一个随机点
        var rp = Math.floor(rnd() * n) * 3;
        centers[c3*3] = pts[rp]; centers[c3*3+1] = pts[rp+1]; centers[c3*3+2] = pts[rp+2];
      } else {
        centers[c3*3]   = sums[c3*3]   / counts[c3];
        centers[c3*3+1] = sums[c3*3+1] / counts[c3];
        centers[c3*3+2] = sums[c3*3+2] / counts[c3];
      }
    }
    if (moved === 0 && it > 2) break;
  }
  return { centers: centers, assign: assign, counts: counts, k: k, n: n };
}

/* ---------- 由 k-means 结果构建 GMM（对角协方差） ---------- */
function buildGMM(pts, k) {
  var km = kmeans3d(pts, k, 14);
  if (!km) return null;
  var kk = km.k;
  var means = new Float64Array(kk * 3);
  var covs  = new Float64Array(kk * 3);   // 对角方差
  var weights = new Float64Array(kk);
  var n = km.n;

  var sums = new Float64Array(kk * 3);
  var sq   = new Float64Array(kk * 3);
  var cnt  = new Int32Array(kk);
  for (var i = 0; i < n; i++) {
    var c = km.assign[i];
    for (var ch = 0; ch < 3; ch++) {
      var v = pts[i*3+ch];
      sums[c*3+ch] += v;
      sq[c*3+ch]   += v * v;
    }
    cnt[c]++;
  }
  for (var c2 = 0; c2 < kk; c2++) {
    if (cnt[c2] === 0) { weights[c2] = 0; covs[c2*3]=covs[c2*3+1]=covs[c2*3+2]=1; continue; }
    for (var ch2 = 0; ch2 < 3; ch2++) {
      var m = sums[c2*3+ch2] / cnt[c2];
      means[c2*3+ch2] = m;
      var va = sq[c2*3+ch2] / cnt[c2] - m * m;
      covs[c2*3+ch2] = Math.max(va, 9.0); // 方差下限，防退化
    }
    weights[c2] = cnt[c2] / n;
  }
  return { means: means, covs: covs, weights: weights, k: kk };
}

/* ---------- GMM 负对数似然（作为颜色能量） ---------- */
function gmmNLL(gmm, r, g, b) {
  var k = gmm.k, best = 1e12;
  for (var c = 0; c < k; c++) {
    if (gmm.weights[c] <= 0) continue;
    var s = 0;
    for (var ch = 0; ch < 3; ch++) {
      var m = gmm.means[c*3+ch];
      var v = gmm.covs[c*3+ch];
      var d = (ch === 0 ? r : ch === 1 ? g : b) - m;
      s += Math.log(v) + (d * d) / v;
    }
    s = 0.5 * s - Math.log(gmm.weights[c]);
    if (s < best) best = s;
  }
  return best; // 越小越像该类
}

/**
 * GrabCut 简化实现（GMM + ICM 迭代）
 * @param {Uint8ClampedArray} data  RGBA
 * @param {number} W, H
 * @param {object} opts { fgSeeds:Uint8Array, bgSeeds:Uint8Array, iters, lambda }
 * @returns {Uint8Array} mask 0=背景 1=前景
 */
function grabcut(data, W, H, opts) {
  opts = opts || {};
  var iters = opts.iters || 5;
  var lambda = opts.lambda || 35;
  var K = opts.K || 5;
  var N = W * H;
  var mask = new Uint8Array(N);          // 当前标签 0/1
  var locked = new Uint8Array(N);        // 1=用户锁定，不会被 ICM 改变
  var fgSeed = opts.fgSeeds;             // 锁定前景（用户绿笔）
  var bgSeed = opts.bgSeeds;             // 锁定背景（外圈 + 用户红笔）
  var initFg = opts.initFg;              // 初始前景区域（不锁定，可被纠正）

  // ---- 初始化：只有真正的种子才锁定 ----
  for (var i = 0; i < N; i++) {
    if (bgSeed && bgSeed[i])      { mask[i] = 0; locked[i] = 1; }
    else if (fgSeed && fgSeed[i]) { mask[i] = 1; locked[i] = 1; }
    else if (initFg && initFg[i]) { mask[i] = 1; locked[i] = 0; }
    else                          { mask[i] = 0; locked[i] = 0; }
  }

  // ---- 平滑系数 beta：邻域色差期望 ----
  var beta = 0, cnt = 0;
  var step = Math.max(1, Math.floor(Math.sqrt(N) / 80));
  for (var y = 0; y < H - 1; y += step) {
    for (var x = 0; x < W - 1; x += step) {
      var p = (y * W + x) * 4, q = (y * W + x + 1) * 4;
      var dr = data[p] - data[q], dg = data[p+1] - data[q+1], db = data[p+2] - data[q+2];
      beta += dr*dr + dg*dg + db*db; cnt++;
    }
  }
  beta = cnt ? (beta / cnt) : 900;
  if (beta < 1) beta = 1;
  var gamma = 1 / (2 * beta);

  function smoothCost(pi, qi) {
    var a = pi * 4, b = qi * 4;
    var dr = data[a] - data[b], dg = data[a+1] - data[b+1], db = data[a+2] - data[b+2];
    return lambda * Math.exp(-gamma * (dr*dr + dg*dg + db*db));
  }

  // ---- 迭代 ----
  for (var it = 0; it < iters; it++) {
    // 采样建 GMM（大图抽样，控制耗时）
    var maxSample = 60000;
    var stride = Math.max(1, Math.floor(N / maxSample));
    var fgPts = [], bgPts = [];
    for (var i2 = 0; i2 < N; i2 += stride) {
      var o = i2 * 4;
      if (mask[i2] === 1) fgPts.push(data[o], data[o+1], data[o+2]);
      else                bgPts.push(data[o], data[o+1], data[o+2]);
    }
    var gmmF = buildGMM(new Float64Array(fgPts), K);
    var gmmB = buildGMM(new Float64Array(bgPts), K);
    if (!gmmF || !gmmB) break;

    // 预计算颜色能量（只算一次）
    var eF = new Float32Array(N), eB = new Float32Array(N);
    for (var i3 = 0; i3 < N; i3++) {
      var o3 = i3 * 4;
      eF[i3] = gmmNLL(gmmF, data[o3], data[o3+1], data[o3+2]);
      eB[i3] = gmmNLL(gmmB, data[o3], data[o3+1], data[o3+2]);
    }

    // ICM：逐像素取能量更小的标签（全图遍历，越界邻居跳过）
    var changed = 0;
    for (var yy = 0; yy < H; yy++) {
      for (var xx = 0; xx < W; xx++) {
        var p2 = yy * W + xx;
        if (locked[p2]) continue;
        var e0 = eB[p2], e1 = eF[p2];
        // 四邻域平滑（内联，避免块级函数声明带来的作用域问题）
        var nb0 = xx > 0 ? p2 - 1 : -1;
        var nb1 = xx < W - 1 ? p2 + 1 : -1;
        var nb2 = yy > 0 ? p2 - W : -1;
        var nb3 = yy < H - 1 ? p2 + W : -1;
        if (nb0 >= 0) { if (mask[nb0] === 0) e1 += smoothCost(p2, nb0); else e0 += smoothCost(p2, nb0); }
        if (nb1 >= 0) { if (mask[nb1] === 0) e1 += smoothCost(p2, nb1); else e0 += smoothCost(p2, nb1); }
        if (nb2 >= 0) { if (mask[nb2] === 0) e1 += smoothCost(p2, nb2); else e0 += smoothCost(p2, nb2); }
        if (nb3 >= 0) { if (mask[nb3] === 0) e1 += smoothCost(p2, nb3); else e0 += smoothCost(p2, nb3); }
        var nv = e1 < e0 ? 1 : 0;
        if (nv !== mask[p2]) { mask[p2] = nv; changed++; }
      }
    }
    if (changed < N * 0.0005) break;
  }

  // 还原锁定区
  for (var i4 = 0; i4 < N; i4++) {
    if (bgSeed && bgSeed[i4]) mask[i4] = 0;
    else if (fgSeed && fgSeed[i4]) mask[i4] = 1;
  }
  return mask;
}

/**
 * Alpha Matting：对 mask 边界做亚像素细化
 * 对边界像素，取邻域内确定的前景色 F 与背景色 B，解 alpha=(I-B)/(F-B)
 */
function refineAlpha(data, W, H, mask, radius) {
  radius = radius || 3;
  var N = W * H;
  var alpha = new Float32Array(N);
  var i, p;
  for (i = 0; i < N; i++) alpha[i] = mask[i] ? 1 : 0;

  // 标记边界像素（邻域存在异类）
  var border = new Uint8Array(N);
  for (var y = 1; y < H-1; y++) {
    for (var x = 1; x < W-1; x++) {
      p = y*W + x;
      var m = mask[p];
      if (mask[p-1]!==m || mask[p+1]!==m || mask[p-W]!==m || mask[p+W]!==m) border[p] = 1;
    }
  }

  for (var y2 = radius; y2 < H-radius; y2++) {
    for (var x2 = radius; x2 < W-radius; x2++) {
      p = y2*W + x2;
      if (!border[p]) continue;
      var fr=0,fg=0,fb=0,fn=0, br=0,bg2=0,bb=0,bn=0;
      for (var dy=-radius; dy<=radius; dy++) {
        for (var dx=-radius; dx<=radius; dx++) {
          var q = (y2+dy)*W + (x2+dx);
          var o = q*4;
          if (mask[q] === 1 && !border[q]) { fr+=data[o];fg+=data[o+1];fb+=data[o+2];fn++; }
          else if (mask[q] === 0 && !border[q]) { br+=data[o];bg2+=data[o+1];bb+=data[o+2];bn++; }
        }
      }
      if (fn === 0 || bn === 0) continue;
      fr/=fn; fg/=fn; fb/=fn; br/=bn; bg2/=bn; bb/=bn;
      var io = p*4;
      var I = [data[io], data[io+1], data[io+2]];
      var F = [fr,fg,fb], B = [br,bg2,bb];
      var num=0, den=0;
      for (var ch=0; ch<3; ch++) {
        var d = I[ch] - B[ch];
        num += d * (F[ch] - B[ch]);
        den += (F[ch] - B[ch]) * (F[ch] - B[ch]);
      }
      var a = den > 1e-6 ? num/den : (mask[p] ? 1 : 0);
      alpha[p] = Math.max(0, Math.min(1, a));
    }
  }
  return alpha;
}

/**
 * 景深虚化：按 mask 分层模糊，越远离主体越模糊（模拟真实光圈）
 */
function depthBlur(canvas, mask, opts) {
  opts = opts || {};
  var maxRadius = opts.maxRadius || 18;
  var layers = opts.layers || 4;
  var W = canvas.width, H = canvas.height;

  /* ---- 内存保护 ----
   * 原实现在原始分辨率上一次性生成 layers 层全尺寸 canvas，
   * 再对每一层各取一份完整 ImageData。3000×2250 的图下：
   *   4 层 canvas 108MB + 4 份 ImageData 108MB + 距离场 27MB + 源/输出 54MB ≈ 300MB
   * 浏览器直接 OOM 崩溃（页面白屏 / 结果一片黑）。
   *
   * 虚化本来就是模糊效果，降分辨率对最终观感几乎无损。
   * 这里统一在工作分辨率（最长边 ≤ MAX_WORK）上完成距离场、分层模糊与合成，
   * 最后一次性放大回原尺寸，内存降到原来的 1/4 以下。 */
  var MAX_WORK = opts.maxWork || 1600;
  var workScale = Math.min(1, MAX_WORK / Math.max(W, H));
  var wW = Math.max(1, Math.round(W * workScale));
  var wH = Math.max(1, Math.round(H * workScale));

  var work = canvas;
  var workMask = mask;
  if (workScale < 1) {
    work = document.createElement('canvas');
    work.width = wW; work.height = wH;
    var wctx = work.getContext('2d');
    wctx.imageSmoothingEnabled = true;
    wctx.imageSmoothingQuality = 'high';
    wctx.drawImage(canvas, 0, 0, wW, wH);
    // mask 也要同步缩放（用最近邻采样，保持 0/1 语义）
    workMask = new Uint8Array(wW * wH);
    for (var my = 0; my < wH; my++) {
      var sy = Math.min(H - 1, Math.floor(my / workScale));
      for (var mx = 0; mx < wW; mx++) {
        var sx = Math.min(W - 1, Math.floor(mx / workScale));
        workMask[my * wW + mx] = mask[sy * W + sx];
      }
    }
  }

  W = wW; H = wH;
  var outW = canvas.width, outH = canvas.height;

  // 1) 生成"距离场"：背景像素到最近前景的距离（简易 BFS 近似）
  var N = W*H;
  var dist = new Float32Array(N);
  for (var i=0;i<N;i++) dist[i] = mask[i] ? 0 : Infinity;
  // 多轮松弛近似距离（比精确 EDT 快，效果够用）
  for (var pass=0; pass<3; pass++) {
    for (var y=1;y<H-1;y++){
      for (var x=1;x<W-1;x++){
        var p=y*W+x;
        if (mask[p]) continue;
        var m = Math.min(dist[p-1], dist[p+1], dist[p-W], dist[p+W]);
        if (m + 1 < dist[p]) dist[p] = m + 1;
      }
    }
    for (var y2=H-2;y2>0;y2--){
      for (var x2=W-2;x2>0;x2--){
        var p2=y2*W+x2;
        if (mask[p2]) continue;
        var m2 = Math.min(dist[p2-1], dist[p2+1], dist[p2-W], dist[p2+W]);
        if (m2 + 1 < dist[p2]) dist[p2] = m2 + 1;
      }
    }
  }
  // 归一化
  var maxD = 0;
  for (var i2=0;i2<N;i2++) if (dist[i2]!==Infinity && dist[i2]>maxD) maxD = dist[i2];
  if (maxD === 0) maxD = 1;

  // 2) 预生成不同强度的模糊层（在工作分辨率上算）
  var blurred = [];
  for (var L=0; L<layers; L++) {
    var r = Math.max(1, Math.round(maxRadius * (L+1) / layers));
    blurred.push(boxBlur(work, r));
  }

  // 3) 按距离选层 + 层间融合
  var src = work.getContext('2d').getImageData(0,0,W,H).data;
  var out = new ImageData(W,H);
  var od = out.data;
  /* 逐层取 ImageData 后立刻释放该层 canvas（把宽高设为 0 交还内存），
   * 避免 layers 份全尺寸位图同时驻留。 */
  var layersData = [];
  for (var li=0; li<blurred.length; li++) {
    layersData.push(blurred[li].getContext('2d').getImageData(0,0,W,H).data);
    blurred[li].width = 0; blurred[li].height = 0;
  }
  blurred.length = 0;

  for (var p3=0; p3<N; p3++) {
    var o = p3*4;
    var t;
    if (mask[p3]) { t = -1; }                       // 主体清晰
    else {
      var d = dist[p3];
      t = d === Infinity ? 1 : Math.min(1, d / (maxD * 0.6));
    }
    if (t < 0) {
      od[o]=src[o]; od[o+1]=src[o+1]; od[o+2]=src[o+2]; od[o+3]=src[o+3];
    } else {
      var fpos = t * (layers - 1);
      var L0 = Math.floor(fpos), L1 = Math.min(layers-1, L0+1), w = fpos - L0;
      var d0 = layersData[L0], d1 = layersData[L1];
      for (var ch2=0; ch2<3; ch2++) {
        od[o+ch2] = d0[o+ch2] * (1-w) + d1[o+ch2] * w;
      }
      od[o+3] = src[o+3];
    }
  }
  var res = document.createElement('canvas');
  res.width = W; res.height = H;
  res.getContext('2d').putImageData(out, 0, 0);

  // 若曾降采样，把结果放大回原始尺寸（虚化是模糊效果，放大无可见损失）
  if (workScale < 1) {
    var fin = document.createElement('canvas');
    fin.width = outW; fin.height = outH;
    var fctx = fin.getContext('2d');
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(res, 0, 0, outW, outH);
    res.width = 0; res.height = 0;
    return fin;
  }
  return res;
}

/* 方框模糊：先缩小再放大，快且平滑 */
function boxBlur(canvas, radius) {
  var W = canvas.width, H = canvas.height;
  var shrink = Math.max(1, Math.round(radius / 2));
  var sw = Math.max(1, Math.floor(W / shrink)), sh = Math.max(1, Math.floor(H / shrink));
  var small = document.createElement('canvas');
  small.width = sw; small.height = sh;
  var sctx = small.getContext('2d');
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(canvas, 0, 0, sw, sh);

  // 在小图上做两遍方框模糊逼近高斯
  var id = sctx.getImageData(0,0,sw,sh);
  var d = id.data;
  var tmp = new Uint8ClampedArray(d.length);
  var passes = 2;
  for (var t=0; t<passes; t++) {
    blurH(d, tmp, sw, sh, 2);
    blurV(tmp, d, sw, sh, 2);
  }
  sctx.putImageData(id, 0, 0);

  var res = document.createElement('canvas');
  res.width = W; res.height = H;
  var rctx = res.getContext('2d');
  rctx.imageSmoothingEnabled = true;
  rctx.imageSmoothingQuality = 'high';
  rctx.drawImage(small, 0, 0, W, H);
  return res;
}
function blurH(s, o, w, h, r) {
  for (var y=0;y<h;y++) for (var x=0;x<w;x++) {
    var r0=0,g0=0,b0=0,n=0;
    for (var k=-r;k<=r;k++){
      var xx=x+k; if(xx<0||xx>=w) continue;
      var p=(y*w+xx)*4; r0+=s[p];g0+=s[p+1];b0+=s[p+2];n++;
    }
    var q=(y*w+x)*4; o[q]=r0/n;o[q+1]=g0/n;o[q+2]=b0/n;o[q+3]=s[q+3];
  }
}
function blurV(s, o, w, h, r) {
  for (var x=0;x<w;x++) for (var y=0;y<h;y++) {
    var r0=0,g0=0,b0=0,n=0;
    for (var k=-r;k<=r;k++){
      var yy=y+k; if(yy<0||yy>=h) continue;
      var p=(yy*w+x)*4; r0+=s[p];g0+=s[p+1];b0+=s[p+2];n++;
    }
    var q=(y*w+x)*4; o[q]=r0/n;o[q+1]=g0/n;o[q+2]=b0/n;o[q+3]=s[q+3];
  }
}

/**
 * 边界洪水填充：从四条边出发，标记所有「与边界连通且颜色接近」的像素为背景
 * 这是初始化准确的关键 —— 连通性保证主体内部的同色区域不会被误判
 */
/**
 * 估计画面噪声水平：采样相邻像素的颜色差，取中位数的平均通道差。
 * 平滑图片接近 0，颗粒感强的照片可达十几到几十。
 */
function estimateNoise(data, W, H) {
  var step = Math.max(1, Math.floor(Math.min(W, H) / 120));
  var diffs = [];
  for (var y = 0; y < H - step; y += step) {
    for (var x = 0; x < W - step; x += step) {
      var o = (y * W + x) * 4, p = (y * W + x + step) * 4;
      var dr = data[o] - data[p], dg = data[o+1] - data[p+1], db = data[o+2] - data[p+2];
      diffs.push(Math.sqrt(dr*dr + dg*dg + db*db));
    }
  }
  if (!diffs.length) return 0;
  diffs.sort(function(a, b) { return a - b; });
  return diffs[diffs.length >> 1];
}

/**
 * 稳健噪声估计（用于「逐像素生长阈值」）。
 *
 * 为什么不能只用中位数：噪点/颗粒背景常常是「块状跳变」的（例如 4×4 一小块
 * 同色、块与块之间随机跳变）。按固定步长采样时，相当一部分采样对落在同一块内、
 * 差值为 0，把中位数硬生生拉到接近 0，于是测不出噪声，生长阈值偏小，
 * 每跨一个噪点块就被拦断，背景整片抠不掉（只剩边缘一小圈）。
 *
 * 实测五类场景（步长 3）的 p75：纯色 0、渐变 0、双色 0、模拟照片 0、
 * 噪点背景 24.2 —— 区分度非常干净。这里取
 *   max(中位数, 0.8×均值, 0.6×p75)
 * 兼顾三种噪声形态：逐像素颗粒（中位数/均值敏感）与块状跳变（p75 敏感）。
 */
function estimateNoiseGrow(data, W, H) {
  var step = Math.max(1, Math.floor(Math.min(W, H) / 120));
  var diffs = [];
  for (var y = 0; y < H - step; y += step) {
    for (var x = 0; x < W - step; x += step) {
      var o = (y * W + x) * 4, p = (y * W + x + step) * 4;
      var dr = data[o] - data[p], dg = data[o+1] - data[p+1], db = data[o+2] - data[p+2];
      diffs.push(Math.sqrt(dr*dr + dg*dg + db*db));
    }
  }
  if (!diffs.length) return 0;
  diffs.sort(function(a, b) { return a - b; });
  var sum = 0;
  for (var i = 0; i < diffs.length; i++) sum += diffs[i];
  var median = diffs[diffs.length >> 1];
  var mean   = sum / diffs.length;
  var p75    = diffs[Math.min(diffs.length - 1, Math.floor(diffs.length * 0.75))];
  return Math.max(median, mean * 0.8, p75 * 0.6);
}

/**
 * 生成「背景代表色」集合。
 * 从边框采样点做 k-means 聚类（k=4），并对每一类计算其色域跨度，
 * 若某一类跨度很大（说明是渐变），再把它按主轴拆成两个代表色，
 * 使渐变的两端都能被覆盖。返回扁平数组 [r,g,b, r,g,b, ...]。
 */
function buildBgPalette(data, W, H, rs, gs, bs) {
  var n = rs.length;
  if (n === 0) return [];
  var pts = new Float64Array(n * 3);
  for (var i = 0; i < n; i++) {
    pts[i*3] = rs[i]; pts[i*3+1] = gs[i]; pts[i*3+2] = bs[i];
  }
  var km = kmeans3d(pts, Math.min(4, n), 6);
  if (!km) return [];
  var k = km.centers.length / 3;
  var out = [];
  for (var c = 0; c < k; c++) {
    var cr = km.centers[c*3], cg = km.centers[c*3+1], cb = km.centers[c*3+2];
    // 统计该类的色域范围
    var mnR=255,mnG=255,mnB=255, mxR=0,mxG=0,mxB=0, cnt=0;
    for (var j = 0; j < n; j++) {
      if (km.assign[j] !== c) continue;
      var r = pts[j*3], g = pts[j*3+1], b = pts[j*3+2];
      if (r<mnR) mnR=r; if (g<mnG) mnG=g; if (b<mnB) mnB=b;
      if (r>mxR) mxR=r; if (g>mxG) mxG=g; if (b>mxB) mxB=b;
      cnt++;
    }
    if (cnt === 0) continue;
    // 最大通道跨度
    var span = Math.max(mxR-mnR, mxG-mnG, mxB-mnB);
    // 跨度大 → 渐变类：拆成范围两端两个代表色，并补中点
    if (span > 40) {
      out.push(mnR, mnG, mnB);
      out.push(mxR, mxG, mxB);
      out.push((mnR+mxR)/2, (mnG+mxG)/2, (mnB+mxB)/2);
    } else {
      out.push(cr, cg, cb);
    }
  }
  return out;
}

/* 前景最大连通块面积（4 邻域，BFS，避免递归爆栈）
 * 用于判断「留下的前景是一整块主体，还是被洪水填充打碎的零散碎片」。 */
function largestForegroundBlob(isBg, W, H) {
  var N = W*H;
  var seen = new Uint8Array(N);
  var q = new Int32Array(N);
  var best = 0;
  for (var p0=0; p0<N; p0++) {
    if (isBg[p0] || seen[p0]) continue;
    var head=0, tail=0, size=0;
    q[tail++] = p0; seen[p0] = 1;
    while (head < tail) {
      var p = q[head++]; size++;
      var x = p % W, y = (p / W) | 0;
      if (x > 0)     { var n1=p-1; if(!isBg[n1] && !seen[n1]){seen[n1]=1;q[tail++]=n1;} }
      if (x < W - 1) { var n2=p+1; if(!isBg[n2] && !seen[n2]){seen[n2]=1;q[tail++]=n2;} }
      if (y > 0)     { var n3=p-W; if(!isBg[n3] && !seen[n3]){seen[n3]=1;q[tail++]=n3;} }
      if (y < H - 1) { var n4=p+W; if(!isBg[n4] && !seen[n4]){seen[n4]=1;q[tail++]=n4;} }
    }
    if (size > best) best = size;
  }
  return best;
}

function floodFillBackground(data, W, H, tolerance, protectCenter) {
  tolerance = tolerance == null ? 32 : tolerance;
  var N = W*H;
  var isBg = new Uint8Array(N);
  var visited = new Uint8Array(N);
  var cx0 = W * 0.12, cx1 = W * 0.88, cy0 = H * 0.12, cy1 = H * 0.88;
  function inCenter(p){
    var x = p % W, y = (p / W) | 0;
    return x >= cx0 && x <= cx1 && y >= cy0 && y <= cy1;
  }

  /* 背景建模 —— 采样位置是关键，这里踩过一个很严重的坑。
   *
   * 旧实现沿「整条边框」采样。真实拍照时主体常常顶到画面边缘
   * （比如拍沙发、拍车，沙发/车身横贯左右边缘），此时边框样本里混进了大量主体色，
   * k-means 会把主体色当成背景代表色，洪水填充便沿主体一路生长，
   * 结果主体被整片吞掉 —— 实测该场景主体保留率 0%，只剩碎片残影。
   *
   * 新实现改为「四角优先」：背景几乎总是出现在画面四角，主体通常在中间。
   * 四角各取 15% 边长的方块采样，主体顶边时也不会污染背景模型。
   * 同时保留少量边框采样作为补充，覆盖「背景只出现在某一条边」的情况，
   * 但边框样本必须通过四角模型的宽松检验，避免再次引入主体色。 */
  var rs=[], gs=[], bs=[];
  var st = Math.max(1, Math.floor(Math.min(W,H)/80));
  function px(x,y){ var o=(y*W+x)*4; rs.push(data[o]); gs.push(data[o+1]); bs.push(data[o+2]); }

  // ① 四角采样（主）
  var cs = Math.max(6, Math.round(Math.min(W,H) * 0.15));
  var cst = Math.max(1, Math.floor(cs / 18));
  for (var cy = 0; cy < cs; cy += cst) {
    for (var cx = 0; cx < cs; cx += cst) {
      px(cx, cy);                  // 左上
      px(W-1-cx, cy);              // 右上
      px(cx, H-1-cy);              // 左下
      px(W-1-cx, H-1-cy);          // 右下
    }
  }
  var cornerCount = rs.length;
  function med(a){ if(!a.length) return 0; a=a.slice().sort(function(m,n){return m-n;}); return a[a.length>>1]; }
  var cr_ = rs.slice(0, cornerCount), cg_ = gs.slice(0, cornerCount), cb_ = bs.slice(0, cornerCount);
  var bR=med(cr_), bG=med(cg_), bB=med(cb_);

  // 背景代表色集合（多中心，覆盖渐变 / 多色背景）
  var BG = buildBgPalette(data, W, H, rs, gs, bs);

  // 双阈值：与「来源像素」比（小，允许沿渐变生长）+ 与「全局背景色」比（大，防漂移）
  /* 自适应噪声：先估计画面的抖动强度（相邻像素平均差异），
   * 噪声大时自动放宽「逐像素生长阈值」，否则带噪点的背景会长不动、
   * 留下大片抠不掉的斑块。全局阈值不变，所以主体不会被误吞。 */
  var noise = estimateNoise(data, W, H);
  /* 逐像素生长阈值用「稳健噪声估计」放宽，否则块状噪点背景会让生长寸步难行。
   * 全局阈值仍只跟着保守的中位数走 —— 它负责把生长锚定在背景上，
   * 若也被放宽，纹理丰富的背景（草地、树叶）就可能把主体一起吞掉。 */
  var noiseGrow = estimateNoiseGrow(data, W, H);
  var tolLocal  = Math.max(
    Math.round(tolerance * 0.55),
    Math.round(noiseGrow * 1.8) + 4,
    4
  );
  var tolGlobal = Math.round(tolerance * 2.2) + Math.round(noise * 1.2);
  /* 逐像素阈值不应超过全局阈值：超过的部分被 nearGlobal 挡住，没有收益，
   * 只会在极端图上放大误吞风险，这里直接夹紧。 */
  if (tolLocal > tolGlobal) tolLocal = Math.max(tolGlobal, 8);
  var tl2 = tolLocal*tolLocal, tg2 = tolGlobal*tolGlobal;

  /* 与「任一背景代表色」接近即算背景。
   * 这样渐变背景（不同位置背景色不同）也能被完整识别。 */
  function nearGlobal(p){
    var o=p*4;
    var r=data[o], g=data[o+1], b=data[o+2];
    var dr0=r-bR, dg0=g-bG, db0=b-bB;
    if (dr0*dr0+dg0*dg0+db0*db0 <= tg2) return true;
    for (var ci=0; ci<BG.length; ci+=3){
      var dr=r-BG[ci], dg=g-BG[ci+1], db=b-BG[ci+2];
      if (dr*dr+dg*dg+db*db <= tg2) return true;
    }
    return false;
  }
  function nearLocal(p, src){
    var o=p*4, q=src*4;
    var dr=data[o]-data[q], dg=data[o+1]-data[q+1], db=data[o+2]-data[q+2];
    return (dr*dr+dg*dg+db*db) <= tl2;
  }

  /* 失控保护：主体顶到画面边缘时（拍沙发、拍车、拍人像特写都常见），
   * 无论四角还是边框采样都会混进主体色，背景模型被污染，
   * 洪水填充会沿主体一路长满整张图 —— 实测主体保留率 0%，抠出来只剩碎片。
   * 判据很直接：背景不可能占满整张图（用户要抠图，就意味着主体值得保留）。
   * 一旦填充面积失控，就重来一轮并禁止侵入画面中心区域，优先保住主体。
   * 代价是背景可能抠不干净（残留一角），但「主体没了」远比「背景没抠净」严重。 */
  var guard = protectCenter ? 1 : 0;

  var queue = new Int32Array(N), head=0, tail=0;
  function seed(x,y){
    var p=y*W+x;
    if (visited[p]) return;
    visited[p]=1;
    if (guard && inCenter(p)) return;
    if (nearGlobal(p)) { isBg[p]=1; queue[tail++]=p; }
  }
  for (var x2=0;x2<W;x2++){ seed(x2,0); seed(x2,H-1); }
  for (var y2=0;y2<H;y2++){ seed(0,y2); seed(W-1,y2); }

  while (head < tail) {
    var p2 = queue[head++];
    var x3 = p2 % W, y3 = (p2 / W) | 0;
    if (x3 > 0)     tryPush(p2-1, p2);
    if (x3 < W - 1) tryPush(p2+1, p2);
    if (y3 > 0)     tryPush(p2-W, p2);
    if (y3 < H - 1) tryPush(p2+W, p2);
  }
  function tryPush(np, src){
    if (visited[np]) return;
    visited[np]=1;
    if (guard && inCenter(np)) return;
    if (nearLocal(np, src) && nearGlobal(np)) { isBg[np]=1; queue[tail++]=np; }
  }

  /* 覆盖率检查：背景不可能占满整张图。
   * 超过 92% 几乎必然是背景模型被主体污染、主体正被整片吞掉，
   * 此时重跑一轮并开启中心保护（只做一次，避免无限递归）。 */
  var cnt=0; for (var i=0;i<N;i++) if (isBg[i]) cnt++;
  if (cnt > N * 0.92 && !protectCenter) {
    return floodFillBackground(data, W, H, tolerance, true);
  }

  /* 前景碎片化检测 —— 证件照 / 人像特写最大的坑，改动前务必先跑 extreme.js。
   *
   * 当主体铺满整张画面时（人像特写、证件照、商品特写），
   * 四角采到的其实是主体本身的颜色，洪水填充便沿着主体一路长满全图。
   * 主体内部的纹理、花纹因为颜色不匹配会被留下来，
   * 于是「前景」变成一堆零散碎片，而不是一整块主体。
   * 实测该场景主体只剩 25% —— 用户看到的就是「人没了，只剩几块碎片」。
   *
   * 判据：留下的前景总面积不大，却碎成很多小块，
   *      即「最大连通块 / 前景总面积」偏低 → 判定没有可抠的背景，
   *      直接什么都不抠（返回全 0），保住整张图。
   * 正常抠图时前景就是主体那一整块，连通块占比很高，不会误伤。 */
  var fgCnt = N - cnt;
  if (fgCnt > 0 && fgCnt < N * 0.65 && !protectCenter) {
    var blob = largestForegroundBlob(isBg, W, H);
    if (blob / fgCnt < 0.40) {
      return new Uint8Array(N);          // 全 0 = 无背景可抠，整张保留
    }
  }

  /* 安全网：防止「整张图就一个颜色」时把主体一起吞掉，此时只保留最外一圈。
   * 判据必须加上「画面本身很均匀」这个条件 ——
   * 否则颗粒感/噪点背景会让填充覆盖率虚高，被误判成纯色图，
   * 结果背景被重置成细边框，等于整片抠不掉。 */
  var cnt=0; for (var i=0;i<N;i++) if (isBg[i]) cnt++;
  if (cnt > N * 0.97 && isFlatImage(data, W, H)) {
    isBg.fill(0);
    var bw = Math.max(1, Math.round(Math.min(W,H)*0.02));
    for (var y4=0;y4<H;y4++) for (var x4=0;x4<W;x4++) {
      if (x4<bw||y4<bw||x4>=W-bw||y4>=H-bw) isBg[y4*W+x4]=1;
    }
  }

  /* 形态学闭运算：填掉背景mask里的孤立小孔。
   * 颗粒感/噪点背景会让填充停下，留下密密麻麻的小孔；
   * 这些小孔会被下游当成「前景种子」，导致噪点区域整片抠不掉。
   * 先膨胀再腐蚀即可补平，且不会侵蚀主体（主体是连通大块）。 */
  return morphClose(isBg, W, H, 1);
}

/**
 * 判断画面是否「极均匀」（近乎纯色）。
 * 采样计算亮度的标准差，纯色图接近 0，带噪点或纹理的图会明显更大。
 */
function isFlatImage(data, W, H) {
  var step = Math.max(1, Math.floor(Math.min(W, H) / 100));
  var vals = [], n = 0;
  for (var y = 0; y < H; y += step) {
    for (var x = 0; x < W; x += step) {
      var o = (y * W + x) * 4;
      vals.push((data[o] + data[o+1] + data[o+2]) / 3); n++;
    }
  }
  if (!n) return false;
  var mean = 0;
  for (var i = 0; i < n; i++) mean += vals[i];
  mean /= n;
  var v = 0;
  for (var j = 0; j < n; j++) v += (vals[j] - mean) * (vals[j] - mean);
  /* 阈值取 3：真正的纯色图标准差接近 0；带颗粒噪点的背景约 10 左右，
   * 真实照片通常在 30 以上。取 14 会把噪点背景误判成纯色图。 */
  return Math.sqrt(v / n) < 3;
}

/**
 * 二值 mask 闭运算（膨胀 → 腐蚀），用于填补小孔、平滑边界。
 */
function morphClose(mask, W, H, iters) {
  for (var t = 0; t < (iters || 1); t++) {
    mask = dilate(mask, W, H);
    mask = erode(mask, W, H);
  }
  return mask;
}

function dilate(mask, W, H) {
  var out = new Uint8Array(W*H);
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      var p = y*W+x;
      if (mask[p]) { out[p] = 1; continue; }
      if (x > 0     && mask[p-1]) { out[p] = 1; continue; }
      if (x < W - 1 && mask[p+1]) { out[p] = 1; continue; }
      if (y > 0     && mask[p-W]) { out[p] = 1; continue; }
      if (y < H - 1 && mask[p+W]) { out[p] = 1; continue; }
    }
  }
  return out;
}

function erode(mask, W, H) {
  var out = new Uint8Array(W*H);
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      var p = y*W+x;
      if (!mask[p]) { out[p] = 0; continue; }
      if (x > 0     && !mask[p-1]) { out[p] = 0; continue; }
      if (x < W - 1 && !mask[p+1]) { out[p] = 0; continue; }
      if (y > 0     && !mask[p-W]) { out[p] = 0; continue; }
      if (y < H - 1 && !mask[p+W]) { out[p] = 0; continue; }
      out[p] = 1;
    }
  }
  return out;
}

/**
 * 生成初始化：
 *  bgSeed = 洪水填充得到的连通背景（锁定，不被 ICM 改变）
 *  initFg = 非背景区域（初始前景，可被纠正）
 * 这样前景 GMM 一开始就是纯的，避免"背景色污染前景模型"
 */
function defaultSeeds(W, H, data, tolerance) {
  var N = W*H;
  var bg = floodFillBackground(data, W, H, tolerance);
  var init = new Uint8Array(N);
  for (var i=0;i<N;i++) init[i] = bg[i] ? 0 : 1;
  // 若前景过小（说明填充吞太多），退回中心矩形
  var fgc=0; for (var j=0;j<N;j++) if (init[j]) fgc++;
  if (fgc < N * 0.02) {
    init.fill(0);
    var rx0=Math.round(W*0.15), ry0=Math.round(H*0.15);
    var rx1=Math.round(W*0.85), ry1=Math.round(H*0.85);
    for (var y5=ry0;y5<ry1;y5++) for (var x5=rx0;x5<rx1;x5++) if(!bg[y5*W+x5]) init[y5*W+x5]=1;
  }
  return { initFg: init, bg: bg, floodBg: bg };
}

/**
 * 人像/证件照专用种子（v10 新增）
 * ------------------------------------------------------------
 * 为什么需要它：
 *   证件照的典型构图是「人物占满画面，真正的背景只剩边缘一圈或几块」。
 *   defaultSeeds 完全依赖 floodFillBackground —— 而洪水填充只能到达
 *   **与边界连通**的背景。人物一旦横着占满左右边缘，人物两侧、身后的
 *   背景就与边界断开，永远填不到，于是换底色时「只换掉上下一点点」。
 *
 *   解法：不靠连通性，改用**空间先验 + GrabCut 颜色模型**：
 *     - 中心区域锁定前景（人物主体，保证不会被吞）
 *     - 边缘环带 + 洪水填充结果锁定背景
 *   剩下的交给 GrabCut：它会用颜色分布做**全局**判断，
 *   人物两侧那块与边缘同色的背景，即使不连通也能被判成背景。
 *
 * @returns { bg, fg, initFg } 均为 Uint8Array
 */
function portraitSeeds(W, H, data, tolerance) {
  var N = W * H;
  var fg = new Uint8Array(N);
  var bg = new Uint8Array(N);
  var init = new Uint8Array(N);

  var flood = floodFillBackground(data, W, H, tolerance);
  var floodN = 0, i;
  for (i = 0; i < N; i++) if (flood[i]) floodN++;
  var floodRatio = floodN / N;

  /* 洪水填充几乎没填到东西，说明人物确实铺满了画面 —— 更依赖空间先验 */
  var floodUsable = floodRatio > 0.03 && floodRatio < 0.97;

  /* 前景先验：中心区域（证件照人物通常居中，下沿可到脚） */
  var fx0 = Math.round(W * 0.18), fx1 = Math.round(W * 0.82);
  var fy0 = Math.round(H * 0.10), fy1 = Math.round(H * 0.97);
  /* 背景先验：边缘环带 */
  var bw = Math.max(2, Math.round(Math.min(W, H) * 0.06));

  /* ---- 第一步：已知背景 = 洪水填充区（唯一可信来源）----
   *
   * v10.2 修正：原本把「边缘环带」也算作背景种子。人物一旦占满左右，
   * 那圈环带其实就是人物本身，红衣服被当成背景样本喂给颜色模型，
   * 结果整个人被判成背景抠光（实测主体保留率直接掉到 0%）。
   * 边缘环带只在洪水填充可用时才**辅助**使用，且必须位于填充区内部。 */
  var y, x, idx;
  for (y = 0; y < H; y++) {
    for (x = 0; x < W; x++) {
      idx = y * W + x;
      if (floodUsable && flood[idx]) bg[idx] = 1;
    }
  }
  /* 洪水填充拿不到东西（人物彻底铺满）时，退而用边缘环带做种子，
   * 但只取环带里彼此接近的那部分 —— 避免整圈都是主体时胡乱建模。 */
  if (!floodUsable) {
    var ring = [];
    var rs = Math.max(1, Math.floor(Math.sqrt(N) / 80));
    for (y = 0; y < H; y += rs) {
      for (x = 0; x < W; x += rs) {
        var isB = (x < bw || x >= W - bw || y < bw || y >= H - bw);
        if (!isB) continue;
        var ro = (y * W + x) * 4;
        ring.push(data[ro], data[ro + 1], data[ro + 2]);
      }
    }
    if (ring.length >= 30) {
      var rk = kmeans3d(ring, 3, 8);
      /* 取占比最大的簇当作背景代表色 */
      var top = 0, topN = -1;
      for (var c2 = 0; c2 < rk.k; c2++) if (rk.counts[c2] > topN) { topN = rk.counts[c2]; top = c2; }
      var tc = top * 3;
      var tthr = (tolerance || 45) * (tolerance || 45);
      for (y = 0; y < H; y++) {
        for (x = 0; x < W; x++) {
          idx = y * W + x;
          var io = idx * 4;
          var dr2 = data[io] - rk.centers[tc], dg2 = data[io + 1] - rk.centers[tc + 1], db2 = data[io + 2] - rk.centers[tc + 2];
          if (dr2 * dr2 + dg2 * dg2 + db2 * db2 < tthr) bg[idx] = 1;
        }
      }
    }
  }

  /* ---- 第二步：颜色模型补判，救回「与边界断开」的背景 ----
   *
   * 只在第一步之后做，且**覆盖中心区域**。
   * 顺序很关键（v10.1 修正）：最初我把中心区先锁成前景，
   * 结果人物身后那块不连通的背景因为在中心区里被锁死，
   * 颜色模型根本救不回来 —— 换底色时就只换掉边缘一圈。
   * 改成先按颜色认背景，剩下的再锁主体，才两头都保住。 */
  var bgSamples = [];
  var step = Math.max(1, Math.floor(Math.sqrt(N) / 60));
  for (var sy = 0; sy < H; sy += step) {
    for (var sx = 0; sx < W; sx += step) {
      var si = sy * W + sx;
      if (bg[si]) {
        var so = si * 4;
        bgSamples.push(data[so], data[so + 1], data[so + 2]);
      }
    }
  }

  var tol = tolerance || 45;
  if (bgSamples.length >= 30) {
    var km = kmeans3d(bgSamples, 3, 8);
    var thr2 = tol * tol * 1.35;
    for (var pi = 0; pi < N; pi++) {
      if (bg[pi]) continue;
      var po = pi * 4;
      var r = data[po], g2 = data[po + 1], b2 = data[po + 2];
      var best = Infinity;
      for (var c = 0; c < km.k; c++) {
        var c3 = c * 3;
        var dr = r - km.centers[c3], dg = g2 - km.centers[c3 + 1], db = b2 - km.centers[c3 + 2];
        var d2 = dr * dr + dg * dg + db * db;
        if (d2 < best) best = d2;
      }
      if (best < thr2) bg[pi] = 1;
    }
  }

  /* ---- 第三步：中心区锁前景，其余交 GrabCut（初值偏背景）---- */
  for (y = 0; y < H; y++) {
    for (x = 0; x < W; x++) {
      idx = y * W + x;
      if (bg[idx]) continue;
      if (x >= fx0 && x < fx1 && y >= fy0 && y < fy1) { fg[idx] = 1; init[idx] = 1; }
      else init[idx] = 0;
    }
  }

  return { bg: bg, fg: fg, initFg: init, floodBg: flood };
}

/* ---------- 降采样 / 上采样：大图先在低分辨率分割，再还原 ---------- */
function downsampleImageData(data, W, H, maxSide) {
  var scale = Math.min(1, maxSide / Math.max(W, H));
  if (scale >= 1) return { data: data, W: W, H: H, scale: 1 };
  var sw = Math.max(2, Math.round(W*scale)), sh = Math.max(2, Math.round(H*scale));
  var out = new Uint8ClampedArray(sw*sh*4);
  for (var y=0; y<sh; y++) {
    for (var x=0; x<sw; x++) {
      var sx = Math.floor(x/scale), sy = Math.floor(y/scale);
      var so = (sy*W+sx)*4, dofs = (y*sw+x)*4;
      out[dofs]=data[so]; out[dofs+1]=data[so+1];
      out[dofs+2]=data[so+2]; out[dofs+3]=255;
    }
  }
  return { data: out, W: sw, H: sh, scale: scale };
}

function upsampleMask(mask, sw, sh, W, H) {
  if (sw === W && sh === H) return mask;
  var out = new Uint8Array(W*H);
  var xr = W/sw, yr = H/sh;
  for (var y=0;y<H;y++) for (var x=0;x<W;x++) {
    var sx = Math.min(sw-1, Math.floor(x/xr)), sy = Math.min(sh-1, Math.floor(y/yr));
    out[y*W+x] = mask[sy*sw+sx];
  }
  return out;
}

/**
 * 完整抠图流程（推荐入口）
 * 低分辨率分割 → 上采样 → 原图 alpha matting 细化
 * @returns {Float32Array} alpha 0..1，长度 W*H
 */
function segmentAlpha(data, W, H, opts) {
  opts = opts || {};
  var maxSide = opts.maxSide || 800;      // 分割工作分辨率
  var small = downsampleImageData(data, W, H, maxSide);

  var seeds = opts.seeds ||
    (opts.seedMode === 'portrait'
      ? portraitSeeds(small.W, small.H, small.data, opts.tolerance)
      : defaultSeeds(small.W, small.H, small.data, opts.tolerance));
  var sm = grabcut(small.data, small.W, small.H, {
    bgSeeds: seeds.bg, fgSeeds: seeds.fg, initFg: seeds.initFg,
    iters: opts.iters || 5, lambda: opts.lambda || 35
  });

  var maskFull = upsampleMask(sm, small.W, small.H, W, H);

  // 边缘细化（在原分辨率上做，半径按缩放补偿）
  var radius = Math.max(2, Math.round(3 / Math.max(0.15, small.scale)));
  var alpha = refineAlpha(data, W, H, maskFull, radius);

  // 锁定区强制生效
  if (opts.fgSeeds) for (var i=0;i<W*H;i++) if (opts.fgSeeds[i]) alpha[i] = 1;
  if (opts.bgSeeds) for (var j=0;j<W*H;j++) if (opts.bgSeeds[j]) alpha[j] = 0;

  return alpha;
}

global.PicSeg = {
  segmentAlpha: segmentAlpha,
  downsampleImageData: downsampleImageData,
  upsampleMask: upsampleMask,
  grabcut: grabcut,
  refineAlpha: refineAlpha,
  floodFillBackground: floodFillBackground,
  depthBlur: depthBlur,
  boxBlur: boxBlur,
  defaultSeeds: defaultSeeds,
  portraitSeeds: portraitSeeds,
  kmeans3d: kmeans3d
};
})(window);
