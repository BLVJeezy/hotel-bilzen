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

  function norm(d) { d = d && typeof d === 'object' ? d : {}; d.text = d.text || {}; d.img = d.img || {}; return d; }
  var draft = norm(window.SITE_CONTENT);
  if (EDIT) { try { var s = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (s) draft = norm(s); } catch (e) {} }

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
    var want = Object.prototype.hasOwnProperty.call(draft.text, k) ? wrap(orig, draft.text[k]) : orig;
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
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return skipped(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
      var n; while ((n = w.nextNode())) { if (n.parentElement && n.parentElement.isContentEditable && n.parentElement.closest('[data-se-active]')) continue; textNode(n); }
      var imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];
      Array.prototype.forEach.call(imgs, imgNode);
      if (root.tagName === 'IMG') imgNode(root);
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
    snap = texts(el).map(function (n) { var r = T.get(n); return { node: n, orig: r && n.nodeValue === r.applied ? r.orig : n.nodeValue }; });
    el.setAttribute('data-se-active', '');
    try { el.contentEditable = 'plaintext-only'; } catch (e) {}
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.spellcheck = true;
  }
  function deactivate() {
    if (!active) return;
    active.removeAttribute('contenteditable'); active.removeAttribute('data-se-active');
    snap.forEach(function (s) { if (s.node.isConnected) T.set(s.node, { orig: s.orig, applied: s.node.nodeValue }); });
    active = null; snap = [];
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
    if (typeof api.onChange === 'function') api.onChange();
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
