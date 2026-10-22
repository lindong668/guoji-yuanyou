/**
 * PicStudio 静态资源服务
 * 负责把 /public 下的文件吐出去，补安全与 SEO 响应头。
 *
 * 新增（本次）：无后缀 URL 自动补 .html
 *   例：/tools/palette  →  /tools/palette.html （301）
 *   作用：Google 已收录过一批不带 .html 的 URL，
 *        直接放开会变成 404 并被逐步移出索引，
 *        这样可以把旧收录的权重和平转移到正式 URL。
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 统一走 https + 主域名，避免 piccalc.com 与 www 双份索引
    if (url.hostname === 'www.piccalc.com') {
      return Response.redirect('https://piccalc.com' + url.pathname + url.search, 301);
    }

    let pathname = url.pathname;

    /* ★ Adsense ads.txt 硬拦截（双保险）
     *
     * 背景：AdSense 抓取器对 Content-Type 极其严格 —— 必须是 text/plain，
     * 一旦被猜成 text/html 就会判定「ads.txt 无效」，审核卡住。
     * _headers 那条规则在部分 Workers Assets 版本下不一定生效，
     * 所以这里在 Worker 层直接接管，绕过静态资源的 MIME 猜测，
     * 无论 assets 怎么返回，AdSense 拿到的永远是正确的内容与类型。 */
    if (pathname === '/ads.txt') {
      return new Response(
        'google.com, pub-8915931557404979, DIRECT, f08c47fec0942fa0\n',
        { status: 200, headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600'
        } }
      );
    }

    /* ★ 谷歌站长验证文件硬拦截
     * 同理：直接返回固定内容 + text/html，并禁用缓存，
     * 保证 Google 每次来复查都能立刻拿到最新内容。 */
    if (pathname === '/google6474e28bb6098302.html') {
      return new Response(
        'google-site-verification: google6474e28bb6098302.html\n',
        { status: 200, headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-cache, must-revalidate'
        } }
      );
    }


    if (pathname === '/robots.txt') {
      return new Response(
        'User-agent: Mediapartners-Google\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: https://piccalc.com/sitemap.xml\n',
        { status: 200, headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600'
        } }
      );
    }

    // 形如 /tools/palette、/about 这类无扩展名路径，尝试补 .html
    //
    // ⚠️ 只对 GET/HEAD 做补后缀探测。
    // 原因：new Request(url, request) 会复用原请求的 body 流，
    // 之后再 env.ASSETS.fetch(request) 就会抛
    //   "Cannot reconstruct a Request with a used body."
    // （日志里 POST /wp-json/batch/v1 的 error 就是这么来的。）
    // 补后缀本身就是为页面导航服务的，POST 没有补的必要，直接跳过。
    const noExt = !/\.[a-zA-Z0-9]+$/.test(pathname);
    const isNav = request.method === 'GET' || request.method === 'HEAD';
    if (isNav && noExt && pathname !== '/' && !pathname.endsWith('/')) {
      // 用 clone 探测，确保原 request 的 body 完好无损
      const probe = new Request(url.origin + pathname + '.html', request.clone());
      const probeRes = await env.ASSETS.fetch(probe);
      if (probeRes.status === 200) {
        // 301 永久重定向，把旧收录权重转移到带 .html 的正式地址
        return Response.redirect(url.origin + pathname + '.html' + url.search, 301);
      }
    }

    // 目录根显式指向 index.html，避免部分版本下 /guides/ 落到兜底 404
    if (pathname === '/guides' || pathname === '/guides/') {
      const idx = await env.ASSETS.fetch(new Request(url.origin + '/guides/index.html', request.clone()));
      if (idx.status === 200) return idx;
    }

    const res = await env.ASSETS.fetch(request);

    // 404 兜底：给一个最简单的提示页，而不是空白
    if (res.status === 404) {
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>页面不存在 · PicStudio</title>' +
        '<div style="font-family:system-ui;max-width:560px;margin:15vh auto;text-align:center">' +
        '<h1 style="font-size:22px">页面不存在</h1>' +
        '<p style="color:#64748b">你访问的页面已移动或从未存在。</p>' +
        '<a href="/" style="color:#6366f1">返回 PicStudio 首页</a></div>',
        { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } }
      );
    }

    return res;
  }
};
