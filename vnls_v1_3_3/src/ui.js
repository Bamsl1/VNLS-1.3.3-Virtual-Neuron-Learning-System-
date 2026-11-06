// Panel: bölümler ve tüm panel açılıp kapanır, başlıktan sürüklenir, köşeden boyutlanır. Konum, boyut ve açık bölümler hatırlanır.
// Panel: sections and the whole panel collapse, drag by the title, resize from the corner. Position, size and open sections are remembered.
// Ayarlar bölümü: CFG değerlerini kaydırıcıyla değiştirir, config.js açılışta okur. Dil seçimi de burada.
// Settings section: changes CFG values with sliders, config.js reads them on startup. The language picker lives here too.
(function () {
  var $ = function (id) { return document.getElementById(id); }, t = I18N.t;
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ---------- panel ----------
  var P = $('panel'), H = $('phead'), st = load('vnls_panel'), resizing = false, drag = null;
  function applyPanel() {
    P.style.left = (st.x != null ? st.x : 12) + 'px'; P.style.top = (st.y != null ? st.y : 12) + 'px';
    P.style.width = (st.w || 300) + 'px'; P.style.height = (!st.collapsed && st.h) ? st.h + 'px' : '';
    P.classList.toggle('collapsed', !!st.collapsed); $('pcol').textContent = st.collapsed ? '+' : '–';
  }
  applyPanel();
  $('pcol').onclick = function () { st.collapsed = !st.collapsed; applyPanel(); save('vnls_panel', st); };
  // başlığa çift tık: konum ve boyutu sıfırla | double-click the title: reset position and size
  H.addEventListener('dblclick', function (e) { if (e.target.id === 'pcol') return; st = { collapsed: st.collapsed, open: st.open }; applyPanel(); save('vnls_panel', st); });
  H.addEventListener('pointerdown', function (e) { if (e.target.id === 'pcol') return; drag = { dx: e.clientX - P.offsetLeft, dy: e.clientY - P.offsetTop }; H.setPointerCapture(e.pointerId); });
  H.addEventListener('pointermove', function (e) {
    if (!drag) return; st.x = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - drag.dx)); st.y = Math.max(0, Math.min(window.innerHeight - 36, e.clientY - drag.dy));
    P.style.left = st.x + 'px'; P.style.top = st.y + 'px';
  });
  H.addEventListener('pointerup', function () { if (drag) { drag = null; save('vnls_panel', st); } });
  // boyutlandırma sağ-alt köşeden (CSS resize). Sadece sen çekerken kaydedilir, yoksa otomatik yükseklik bozulurdu.
  // resizing works from the bottom-right corner (CSS resize). Only saved while you drag, otherwise the auto height would get stuck.
  P.addEventListener('pointerdown', function (e) { var r = P.getBoundingClientRect(); resizing = e.clientX > r.right - 22 && e.clientY > r.bottom - 22; });
  window.addEventListener('pointerup', function () { if (resizing) { resizing = false; save('vnls_panel', st); } });
  if (window.ResizeObserver) new ResizeObserver(function () { if (resizing && !st.collapsed) { st.w = Math.round(P.offsetWidth); st.h = Math.round(P.offsetHeight); } }).observe(P);
  // bölümlerin (details) açık/kapalı durumu | open/closed state of the sections (details)
  var ds = P.querySelectorAll ? P.querySelectorAll('details') : [];
  Array.prototype.forEach.call(ds, function (d) {
    var k = d.getAttribute('data-k'); if (st.open && st.open[k] !== undefined) d.open = !!st.open[k];
    d.addEventListener('toggle', function () { st.open = st.open || {}; st.open[k] = d.open; save('vnls_panel', st); });
  });

  // ---------- ayarlar | settings ----------
  // [anahtar, min, max, adım, tür]. Etiketler i18n'de "s_ANAHTAR" adıyla durur.
  // [key, min, max, step, kind]. Labels sit in i18n as "s_KEY".
  // tür / kind: live = hemen | at once, reset = "Beyni sıfırla" ile | on "Reset brain", reload = sayfa yenilenince | after a page reload
  var SET = [
    ['g_percep', [['T', 10, 120, 5, 'live'], ['PIN', .05, 1, .05, 'live'], ['THR', 2, 20, .5, 'live'], ['INH', 0, 20, .5, 'live'],
      ['ETA', 0, .05, .001, 'live'], ['GROW', 0, 6, 1, 'live'], ['HB', 0, 1, .05, 'live'], ['HT', 0, .2, .01, 'live']]],
    ['g_names', [['AL', 0, .5, .01, 'live'], ['REHEARSE', 0, 20, 1, 'live'], ['NEG', 0, .02, .001, 'live']]],
    ['g_write', [['WT', .1, .9, .05, 'live'], ['WR', 0, 4, 1, 'live'], ['WS', 0, 1, .1, 'live'], ['WP', .5, 1, .01, 'live'], ['WCUT', 0, .5, .05, 'live']]],
    ['g_eye', [['FIXATE', 0, 1, 1, 'live'], ['ZOOM', 0, 100, 4, 'live']]],
    ['g_ui', [['LIVE_MS', 30, 500, 10, 'live'], ['BUDGET_MS', 10, 150, 5, 'live']]],
    ['g_struct', [['CODE', 2, 24, 1, 'reset'], ['WIN', 8, 40, 1, 'reset'], ['WSUM', 4, 30, 1, 'reset']]],
    ['g_size', [['E', 500, 4500, 100, 'reload'], ['S', 50, 300, 10, 'reload'], ['M', 64, 512, 32, 'reload']]]
  ];
  var pending = {}, needReload = false, labels = [];   // labels: dil değişince yeniden yazılacak öğeler | elements to retitle when the language changes
  function fmt(v) { return (Math.round(v * 1000) / 1000) + ''; }
  function note() {
    var n = $('snote'); if (!n) return; var ps = Object.keys(pending).length;
    n.textContent = (ps ? t('n_pending', Object.keys(pending).join(', ')) : '') + (needReload ? t('n_reload') : '');
  }
  function set(k, v, kind) {
    var o = load('vnls_cfg'); o[k] = v; save('vnls_cfg', o);
    if (kind === 'live') CFG[k] = v; else if (kind === 'reset') pending[k] = v; else needReload = true;
    note();
  }
  function applyPending() { for (var k in pending) CFG[k] = pending[k]; pending = {}; note(); }
  function row(def) {
    var k = def[0], d = document.createElement('div'), lab = document.createElement('label'), inp = document.createElement('input'), val = document.createElement('span');
    d.className = 'srow'; lab.textContent = t('s_' + k); labels.push([lab, 's_' + k]);
    inp.type = 'range'; inp.min = def[1]; inp.max = def[2]; inp.step = def[3]; inp.value = CFG[k]; val.textContent = fmt(CFG[k]);
    inp.addEventListener('input', function () { set(k, +inp.value, def[4]); val.textContent = fmt(+inp.value); });
    d.appendChild(lab); d.appendChild(inp); d.appendChild(val); return d;
  }
  var box = $('settings');
  if (box) SET.forEach(function (g) {
    var h = document.createElement('div'); h.className = 'sgrp'; h.textContent = t(g[0]); labels.push([h, g[0]]); box.appendChild(h);
    g[1].forEach(function (def) { box.appendChild(row(def)); });
  });
  if ($('sreload')) $('sreload').onclick = function () { location.reload(); };
  if ($('sdef')) $('sdef').onclick = function () { try { localStorage.removeItem('vnls_cfg'); } catch (e) {} location.reload(); };
  // dil seçici | language picker
  if ($('lang')) { $('lang').value = I18N.lang; $('lang').onchange = function () { I18N.set(this.value); }; }
  I18N.onChange(function () { labels.forEach(function (l) { l[0].textContent = t(l[1]); }); note(); });
  window.VNLS_UI = { set: set, applyPending: applyPending };
})();
