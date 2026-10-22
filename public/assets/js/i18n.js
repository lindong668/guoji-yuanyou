/* ============================================================
 * PicStudio i18n — EN / ZH
 *
 * 设计要点：
 *  1. 默认语言永远是英文（不读浏览器语言、不看访客地区）
 *  2. 只有 en / zh 两项，其他值一律回落 en
 *  3. localStorage 记住选择，全站共用同一个 key
 *  4. 两套机制并存：
 *       data-i18n="key"          纯文本/属性替换（交互控件用这个，避免重复 id）
 *       data-lang-block="en|zh"  整块 HTML 双份（静态正文用这个）
 * ============================================================ */
(function () {
  'use strict';

  var KEY = 'ps_lang';
  var SUPPORTED = ['en', 'zh'];

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return SUPPORTED.indexOf(v) !== -1 ? v : 'en';
    } catch (e) { return 'en'; }
  }

  var lang = read();

  function dict(l) {
    return (window.PS_I18N && window.PS_I18N[l]) || {};
  }

  function t(k) {
    var d = dict(lang);
    var e = dict('en');
    if (d[k] != null) return d[k];
    if (e[k] != null) return e[k];
    return '';
  }

  function apply() {
    var h = document.documentElement;
    h.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    h.setAttribute('data-lang', lang);

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var k = el.getAttribute('data-i18n');
      var v = t(k);
      if (!v) continue;
      var attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, v);
      else el.textContent = v;
    }

    var btns = document.querySelectorAll('[data-lang-toggle]');
    for (var j = 0; j < btns.length; j++) {
      btns[j].textContent = lang === 'en' ? '中文' : 'EN';
      var ti = btns[j].getAttribute('title');
      if (ti) { /* keep */ }
    }
  }

  function set(l) {
    lang = SUPPORTED.indexOf(l) !== -1 ? l : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    apply();
  }

  window.PSLang = { get: function () { return lang; }, set: set, t: t, apply: apply };

  // 尽早执行一次，避免首屏闪烁
  apply();

  document.addEventListener('DOMContentLoaded', function () {
    apply();
    var btns = document.querySelectorAll('[data-lang-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        set(lang === 'en' ? 'zh' : 'en');
      });
    }
    // 动态生成的文案（JS 里 set 的）在语言切换后重新触发一次自定义事件
    window.dispatchEvent(new CustomEvent('ps:langchange', { detail: { lang: lang } }));
  });
})();
