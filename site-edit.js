/*
 * Solyn Global · site-edit.js
 * Past de wijzigingen uit de beheerpagina (beheer.html) toe op de website.
 * - Normaal: leest window.SITE_CONTENT (uit site-content.js) en vervangt teksten en foto's.
 * - Beheermodus (?edit=1, in de beheerpagina): teksten worden klikbaar en bewerkbaar.
 * Werkt op gewone HTML-pagina's en op React-sites (houdt wijzigingen vast na elke render).
 * Teksten zijn gekoppeld aan hun oorspronkelijke tekst; foto's aan hun oorspronkelijke bestand.
 */
(function () {
  'use strict';
  if (window.__siteEdit) return;
  var inBeheer = false; try { inBeheer = window.parent !== window && !!window.parent.__isBeheer; } catch (e) {}
  var EDIT = window.parent !== window && (/[?&]edit=1(&|$)/.test(location.search) || inBeheer);
  var MODE = 'edit'; // 'edit' = teksten aanpassen, 'browse' = gewoon klikken (taal, menu, andere pagina)
  var DRAFT_KEY = 'site-beheer-draft';
  var SKIP = 'script,style,noscript,template,svg,textarea,input,select,option,code,pre,[data-se-skip]';
  var BLOCK_TAGS = /^(H[1-6]|P|LI|A|BUTTON|SPAN|LABEL|BLOCKQUOTE|FIGCAPTION|TD|TH|DT|DD|SMALL|STRONG|EM|B|I|DIV|SUMMARY|CITE|Q|TIME|ADDRESS|LEGEND|CAPTION)$/;

  function norm(d) { d = d && typeof d === 'object' ? d : {}; d.text = d.text || {}; d.img = d.img || {}; d.contact = d.contact && typeof d.contact === 'object' && !Array.isArray(d.contact) ? d.contact : {}; return d; }
  var draft = norm(window.SITE_CONTENT);

  /* ---------- contactgegevens: één keer aanpassen, overal op de site vervangen (tekst én links) ---------- */
  var REPL = [], REPL_SIG = '';
  function esc(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function core(num) { var d = String(num).replace(/\D/g, ''); if (d.indexOf('0032') === 0) d = d.slice(4); else if (d.indexOf('32') === 0 && d.length > 9) d = d.slice(2); else if (d.charAt(0) === '0') d = d.slice(1); return d; }
  function buildRepl() {
    var sig = JSON.stringify(draft.contact); if (sig === REPL_SIG) return; REPL_SIG = sig; REPL = [];
    Object.keys(draft.contact).forEach(function (k) {
      var c = draft.contact[k]; if (!c || !c.f || !c.v || c.f === c.v) return;
      if (c.t === 'phone') {
        var oc = core(c.f), nc = core(c.v); if (oc.length < 6 || nc.length < 6) return;
        var digits = oc.split('').map(esc).join('[\\s./-]?');
        REPL.push({ phone: true, re: new RegExp('(\\+\\s?32\\s?(?:\\(0\\)\\s?)?|0032\\s?|\\b32|\\b0)' + digits + '(?!\\d)', 'g'), v: c.v, nc: nc });
      } else if (c.t === 'url') {
        REPL.push({ url: true, f: String(c.f).replace(/\/+$/, ''), v: c.v });
      } else {
        var parts = String(c.f).trim().split(/[\s,]+/).filter(Boolean).map(esc);
        if (!parts.length) return;
        REPL.push({ re: new RegExp('(?<![0-9A-Za-z])' + parts.join('[\\s,]*') + '(?![0-9A-Za-z])', c.t === 'email' ? 'gi' : 'g'), v: c.v, enc: new RegExp(parts.map(function (x) { return x; }).join('(?:\\+|%20|%2C|,|\\s)+'), 'gi'), venc: encodeURIComponent(c.v) });
      }
    });
  }
  function contactText(t) {
    if (!REPL.length || !t) return t;
    REPL.forEach(function (r) {
      if (r.url) return;
      t = t.replace(r.re, r.phone ? function (m, pre) { return /^(\+|00|32)/.test(pre.replace(/\s/g, '')) ? '+32 ' + r.v.replace(/^\s*(\+32|0032|0)\s?/, '') : r.v; } : function () { return r.v; });
    });
    return t;
  }
  function contactHref(h) {
    if (!REPL.length || !h) return h;
    REPL.forEach(function (r) {
      if (r.url) { if (h.replace(/\/+$/, '') === r.f) h = r.v; return; }
      if (r.phone) h = h.replace(r.re, function (m, pre) { var p = pre.replace(/\s/g, ''); return (/^\+/.test(p) ? '+32' : /^(00|32)/.test(p) ? '32' : '0') + r.nc; });
      else { h = h.replace(r.re, r.v); h = h.replace(r.enc, r.venc); }
    });
    return h;
  }
  var A = new WeakMap(); // a -> { orig, applied } voor href
  /* Lege plekken voor contactgegevens (data-contact="phone" enz.): verborgen tot de klant iets invult in het beheer. */
  function slotNode(el) {
    var c = draft.contact[el.getAttribute('data-contact')], v = c && c.v ? String(c.v) : '';
    if (el.hidden !== !v) el.hidden = !v;
    if (!v) return;
    var txt = el.querySelector('[data-contact-text]') || el;
    if (txt.textContent !== v) txt.textContent = v;
    if (el.tagName === 'A') {
      var t = c.t, href = t === 'phone' ? 'tel:+32' + core(v) : t === 'email' ? 'mailto:' + v : t === 'url' ? v : null;
      if (href && el.getAttribute('href') !== href) el.setAttribute('href', href);
    }
  }
  var M = new WeakMap(); // gestructureerde gegevens (Google) en meta-omschrijvingen
  function headData() {
    Array.prototype.forEach.call(document.querySelectorAll('script[type="application/ld+json"], meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]'), function (el) {
      var isMeta = el.tagName === 'META', cur = isMeta ? el.getAttribute('content') || '' : el.textContent, rec = M.get(el);
      var orig = rec && cur === rec.applied ? rec.orig : cur;
      var want = isMeta ? contactText(orig) : contactHref(orig);
      if (cur !== want) { if (isMeta) el.setAttribute('content', want); else el.textContent = want; }
      M.set(el, { orig: orig, applied: want });
    });
  }
  function linkNode(el) {
    var cur = el.getAttribute('href') || '', rec = A.get(el);
    var orig = rec && cur === rec.applied ? rec.orig : cur;
    if (!/^(tel:|mailto:|sms:|https?:\/\/(wa\.me|api\.whatsapp|(www\.)?google\.[a-z.]+\/maps|maps\.|(www\.)?(facebook|instagram|linkedin|tiktok|youtube|twitter|x)\.com))/i.test(orig) && !(rec && rec.orig !== rec.applied)) return;
    var want = contactHref(orig);
    if (cur !== want) el.setAttribute('href', want);
    A.set(el, { orig: orig, applied: want });
  }
  if (EDIT) { try { var s = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (s) draft = norm(s); } catch (e) {} }

  var snapHTML = '';
  var T = new WeakMap(); // tekstknoop -> { orig, applied }
  var I = new WeakMap(); // img -> { orig, applied }
  var key = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
  function srcKey(src) {
    if (!src) return '';
    if (/^data:/.test(src)) return '';
    try { var u = new URL(src, location.href); if (u.origin === location.origin) return u.pathname; return u.origin + u.pathname; } catch (e) { return src; }
  }
  function wrap(orig, txt) { var m = /^(\s*)[\s\S]*?(\s*)$/.exec(orig); return m[1] + txt + m[2]; }
  function skipped(n) { var el = n.nodeType === 1 ? n : n.parentElement; return !el || !!el.closest(SKIP); }

  function textNode(n) {
    var cur = n.nodeValue, rec = T.get(n);
    var orig = rec && cur === rec.applied ? rec.orig : cur;
    var k = key(orig); if (!k) return;
    var want = contactText(Object.prototype.hasOwnProperty.call(draft.text, k) ? wrap(orig, draft.text[k]) : orig);
    if (cur !== want) n.nodeValue = want;
    T.set(n, { orig: orig, applied: want });
  }
  function imgNode(el) {
    var cur = el.getAttribute('src') || '', rec = I.get(el);
    var orig = rec && cur === rec.applied ? rec.orig : cur;
    var k = srcKey(orig); if (!k) { if (!rec) return; }
    var want = k && draft.img[k] ? draft.img[k] : orig;
    if (cur !== want) {
      el.setAttribute('src', want);
      if (want !== orig) {
        if (el.hasAttribute('srcset')) { el.setAttribute('data-se-srcset', el.getAttribute('srcset')); el.removeAttribute('srcset'); }
        var pic = el.parentElement && el.parentElement.tagName === 'PICTURE' ? el.parentElement : null;
        if (pic) Array.prototype.forEach.call(pic.querySelectorAll('source'), function (s) { if (s.hasAttribute('srcset')) { s.setAttribute('data-se-srcset', s.getAttribute('srcset')); s.removeAttribute('srcset'); } });
      } else if (el.hasAttribute('data-se-srcset')) { el.setAttribute('srcset', el.getAttribute('data-se-srcset')); el.removeAttribute('data-se-srcset'); }
    }
    I.set(el, { orig: orig, applied: want });
  }

  var busy = false;
  function apply(root) {
    root = root || document.body; if (!root || busy) return;
    busy = true;
    try {
      buildRepl();
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return skipped(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
      var n; while ((n = w.nextNode())) { if (n.parentElement && n.parentElement.isContentEditable && n.parentElement.closest('[data-se-active]')) continue; textNode(n); }
      var imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];
      Array.prototype.forEach.call(imgs, imgNode);
      if (root.tagName === 'IMG') imgNode(root);
      Array.prototype.forEach.call(root.querySelectorAll ? root.querySelectorAll('a[href]') : [], linkNode);
      if (root.tagName === 'A') linkNode(root);
      if (root === document.body) headData();
      Array.prototype.forEach.call(root.querySelectorAll ? root.querySelectorAll('[data-contact]') : [], slotNode);
      if (root.hasAttribute && root.hasAttribute('data-contact')) slotNode(root);
      if (EDIT) mark(root);
    } finally { busy = false; }
    if (EDIT && typeof api.onRender === 'function') { try { api.onRender(); } catch (e) {} }
  }

  var queued = false, roots = [];
  function schedule(r) { roots.push(r); if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; var list = roots; roots = []; if (list.length > 40) apply(document.body); else list.forEach(function (x) { if (x.isConnected) apply(x); }); }); }
  function observe() {
    new MutationObserver(function (ms) {
      if (busy) return;
      ms.forEach(function (m) {
        if (m.type === 'characterData') { var p = m.target.parentElement; if (p && !(p.isContentEditable && p.closest('[data-se-active]'))) schedule(p); }
        else if (m.type === 'attributes') schedule(m.target);
        else m.addedNodes.forEach(function (a) { if (a.nodeType === 1) schedule(a); else if (a.nodeType === 3 && a.parentElement) schedule(a.parentElement); });
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['src'] });
  }

  /* ---------------- beheermodus ---------------- */
  function hasText(el) { for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && key(c.nodeValue)) return true; return false; }
  function inBanner(el) {
    // cookiebanners en andere vaste meldingen blijven gewoon klikbaar in het beheer
    for (var a = el && el.nodeType === 1 ? el : el && el.parentElement; a && a !== document.body; a = a.parentElement) {
      var pos = getComputedStyle(a).position;
      if ((pos === 'fixed' || pos === 'sticky') && /cookie|privacy|consent|toestemming/i.test(a.textContent || '') && (a.textContent || '').length < 1500) return true;
    }
    return false;
  }
  function block(el) {
    if (inBanner(el)) return null;
    while (el && el !== document.body) {
      if (el.nodeType === 1 && !el.closest(SKIP) && hasText(el) && BLOCK_TAGS.test(el.tagName)) return el;
      el = el.parentElement;
    }
    return null;
  }
  function mark(root) {
    var els = root.querySelectorAll ? root.querySelectorAll('*') : [];
    Array.prototype.forEach.call(els, function (el) { if (!el.hasAttribute('data-se-t') && BLOCK_TAGS.test(el.tagName) && hasText(el) && !el.closest(SKIP)) el.setAttribute('data-se-t', ''); });
  }
  var active = null, snap = [];
  function texts(el) { var out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n; while ((n = w.nextNode())) if (!skipped(n)) out.push(n); return out; }
  function activate(el) {
    if (active === el) return;
    deactivate();
    active = el;
    snapHTML = el.innerHTML;
    snap = texts(el).map(function (n) { var r = T.get(n); return { node: n, orig: r && n.nodeValue === r.applied ? r.orig : n.nodeValue }; });
    el.setAttribute('data-se-active', '');
    try { el.contentEditable = 'plaintext-only'; } catch (e) {}
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.spellcheck = true;
    if (typeof api.onActive === 'function') { try { api.onActive(info()); } catch (e) {} }
  }
  function info() { return active ? { tag: active.tagName, orig: snap.map(function (s) { return s.orig; }).join(''), now: active.textContent || '' } : null; }
  function deactivate() {
    if (!active) return;
    active.removeAttribute('contenteditable'); active.removeAttribute('data-se-active');
    snap.forEach(function (s) { if (s.node.isConnected) T.set(s.node, { orig: s.orig, applied: s.node.nodeValue }); });
    active = null; snap = [];
    if (typeof api.onActive === 'function') { try { api.onActive(null); } catch (e) {} }
  }
  function record() {
    if (!active) return;
    var nodes = texts(active);
    if (snap.length === 1 && (nodes.length !== 1 || nodes[0] !== snap[0].node)) {
      // browser heeft de tekstknoop vervangen: hele blok = die ene tekst
      var all = (active.textContent || '');
      setText(snap[0].orig, all);
      if (!nodes.length) { var t = document.createTextNode(''); active.appendChild(t); nodes = [t]; }
      snap[0].node = nodes[0];
    } else {
      snap.forEach(function (s) { if (s.node.isConnected) setText(s.orig, s.node.nodeValue); });
    }
    if (typeof api.onChange === 'function') api.onChange(info());
  }
  function setText(orig, val) {
    var k = key(orig), v = key(val); if (!k) return;
    if (v === k) delete draft.text[k]; else draft.text[k] = v;
  }
  function editMode() {
    var st = document.createElement('style');
    st.textContent = 'html.se-edit [data-se-t]{outline:1px dashed rgba(127,127,127,.55);outline-offset:2px;cursor:text !important}html.se-edit [data-se-t]:hover{outline:1px dashed currentColor}[data-se-active]{outline:2px solid #2f80ed !important;outline-offset:3px;border-radius:2px}*{-webkit-user-select:auto}';
    document.head.appendChild(st);
    document.documentElement.classList.add('se-edit');
    window.addEventListener('pointerdown', function (e) {
      if (MODE !== 'edit') return;
      var el = block(e.target);
      if (el) activate(el); else if (active && !active.contains(e.target)) deactivate();
    }, true);
    ['click', 'auxclick', 'dblclick'].forEach(function (t) {
      window.addEventListener(t, function (e) {
        if (MODE !== 'edit' || inBanner(e.target)) return;
        var a = e.target.closest && e.target.closest('a[href],button,[role="button"],summary,label');
        if (a || block(e.target)) { e.preventDefault(); e.stopPropagation(); }
        var el = block(e.target); if (el && el === active && document.activeElement !== el) el.focus();
      }, true);
    });
    document.addEventListener('submit', function (e) { if (inBanner(e.target)) return; e.preventDefault(); e.stopPropagation(); }, true);
    document.addEventListener('input', function (e) { if (active && active.contains(e.target)) record(); }, true);
    document.addEventListener('keydown', function (e) { if (active && e.key === 'Enter') { e.preventDefault(); active.blur(); deactivate(); } if (active && e.key === 'Escape') { active.blur(); deactivate(); } }, true);
    document.addEventListener('paste', function (e) {
      if (!active || !active.contains(e.target)) return;
      e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
      document.execCommand('insertText', false, t);
    }, true);
    document.addEventListener('focusout', function () { setTimeout(function () { if (active && !active.contains(document.activeElement)) deactivate(); }, 0); }, true);
  }

  var api = window.__siteEdit = {
    edit: EDIT,
    get draft() { return draft; },
    attach: function (d) { draft = norm(d); apply(document.body); },
    revertActive: function () {
      if (!active) return;
      var origs = snap.map(function (s) { return s.orig; });
      active.innerHTML = snapHTML;
      origs.forEach(function (o) { setText(o, o); });
      snap = texts(active).map(function (n, i) { return { node: n, orig: n.nodeValue }; });
      if (typeof api.onChange === 'function') api.onChange(info());
    },
    apply: function () { apply(document.body); },
    images: function () {
      var seen = {}, out = [];
      Array.prototype.forEach.call(document.querySelectorAll('img'), function (el) {
        if (el.closest(SKIP)) return;
        var rec = I.get(el), orig = rec ? rec.orig : el.getAttribute('src'), k = srcKey(orig);
        if (!k || seen[k]) return; seen[k] = 1;
        var r = el.getBoundingClientRect();
        out.push({ key: k, src: draft.img[k] || el.currentSrc || orig, alt: el.getAttribute('alt') || '', tiny: r.width > 0 && r.width < 24 });
      });
      return out;
    },
    get mode() { return MODE; },
    setMode: function (m) { MODE = m === 'browse' ? 'browse' : 'edit'; if (MODE === 'browse') deactivate(); document.documentElement.classList.toggle('se-edit', MODE === 'edit'); },
    onChange: null, onRender: null
  };

  // Door de server opgebouwde React-pagina's (TanStack Start, Next.js): eerst React laten opstarten, dan pas aanpassen.
  function ssr() { return !!(window.$_TSR || window.__TSR_ROUTER__ || window.__NEXT_DATA__ || document.getElementById('__NEXT_DATA__') || /\$_TSR/.test((document.scripts[0] || {}).textContent || '')); }
  function start() {
    if (EDIT) editMode();
    var go = function () { apply(document.body); observe(); };
    if (!ssr()) return go();
    var run = function () { setTimeout(go, 300); };
    if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
