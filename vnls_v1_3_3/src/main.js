// Ana döngü: harf göster, göz görsün, korteks ateşlesin ve öğrensin, isim nöronları cevap versin.
// Main loop: show a letter, let the eye look, let the cortex fire and learn, let the name neurons answer.
// Otomatik modda harfler rastgele gelir, ara sıra adı "söylenir". Elle modda tahtaya sen çizersin, adı klavyeden verirsin.
// In automatic mode letters come at random and now and then get "named". In manual mode you draw and type the name.
(async function () {
  var C = CFG, t = I18N.t, LET = [...C.LET], $ = function (id) { return document.getElementById(id); };
  var pad = $('pad'), world, eye, brain = new Brain();
  var S = { sr: [], n: 0, hist: [], speed: 0, manual: false, teacher: true, acc: 0, ready: true, needRender: true, paused: false, live: 0, wb: 0, msg: null };
  $('ver').textContent = 'v' + C.VERSION;
  // WebGPU asenkron açılır. Açılamazsa nedenini ekranda göster | WebGPU starts asynchronously. If it can't start, show the reason on screen
  function fail(err) {
    var m = String(err && err.message || err), box = $('gpuerr');
    box.textContent = /^(nogpu|noadapter)$/.test(m) ? t('e_nogpu') : t('e_gpu', m); box.hidden = false; console.error(err);
  }
  try { world = await World.create($('scene'), pad, $('wr')); } catch (err) { fail(err); return; }
  world.onError = fail; eye = new Retina(world, $('retina'));
  world.onInfo = function (txt) { $('sel').textContent = txt; };
  world.onPick = function (kind, idx) { world.select(kind, idx, brain); world.paint(brain, brain.act()); S.needRender = true; };   // durdurulmuşken de seçim hemen görünsün | show the selection right away, even when paused
  world.clearPad(); world.bind(brain); world.links(brain); world.paint(brain, brain.act());

  // yüzdeyi yazıya çevirir, örn. "55% (son 200)" | turns a hit list into text like "55% (last 200)"
  function pct(h) { return h.length ? t('acc_fmt', Math.round(h.reduce(function (a, b) { return a + b; }, 0) / h.length * 100), h.length) : '–'; }
  // panel altındaki mesaj; dil değişince yeniden çevrilebilsin diye anahtarı saklıyoruz | bottom message; we keep the key so it can be re-translated
  function say(key, arg) { S.msg = key ? [key, arg] : null; $('msg').textContent = key ? t(key, arg) : ''; }
  // durumu gösteren tüm etiketleri güncelle (dil değişince de çağrılır) | refresh every state label (also runs when the language changes)
  function refreshLabels() {
    document.title = 'VNLS v' + C.VERSION + ' – ' + t('full');
    $('pause').textContent = t(S.paused ? 'b_resume' : 'b_pause');
    $('mode').textContent = t(S.manual ? 'b_mode_manual' : 'b_mode_auto');
    $('speed').textContent = t('b_speed_' + S.speed);
    $('teach').textContent = t(S.teacher ? 'b_teach_on' : 'b_teach_off');
    $('fonts').textContent = t(C.MIXED_FONTS ? 'b_fonts_on' : 'b_fonts_off');
    $('acc').textContent = pct(S.hist); $('sr').textContent = pct(S.sr);
    if (S.msg) $('msg').textContent = t(S.msg[0], S.msg[1]);
    world.select(world.sel ? world.sel.kind : null, world.sel ? world.sel.idx : 0, brain);   // nöron açıklaması da yeni dilde | neuron description in the new language
    S.needRender = true;
  }

  // tek bir gösterim. k: doğru harf (otomatikte biliniyor, elle modda -1)
  // one presentation. k: the right letter (known in auto mode, -1 in manual mode)
  // learn=false: sadece bak, öğrenme ve sayaç yok. live=true: çizerken anlık bakış, "öğretmeye hazır" bayrağına dokunmaz
  // learn=false: just look, no learning or counting. live=true: a quick look while drawing, leaves the "ready to teach" flag alone
  function look(k, learn, live) {
    brain.present(eye.look(), learn !== false); $('gaze').textContent = eye.gx + ', ' + eye.gy + ' px · ' + eye.zoom.toFixed(1) + 'x';
    var sc = brain.name(), w = -1, j; for (j = 0; j < LET.length; j++) if (sc[j] > 0 && (w < 0 || sc[j] > sc[w])) w = j;
    if (k >= 0) { var ok = w === k; S.hist.push(ok ? 1 : 0); if (S.hist.length > 200) S.hist.shift(); if (S.teacher && Math.random() < .3) brain.teach(k); $('shown').textContent = LET[k]; $('ans').className = ok ? 'ok' : 'bad'; }
    else { $('shown').textContent = '?'; $('ans').className = ''; }
    if (learn !== false) S.n++; S.needRender = true;
    $('ans').textContent = w < 0 ? '–' : LET[w]; $('n').textContent = S.n;
    $('acc').textContent = pct(S.hist);
    if (k < 0) world.showWrite(brain.imagine());   // elle modda beyin, gördüğünü aynı anda kendi çizer | in manual mode the brain redraws what it sees right away
    if (!live) S.ready = true;   // bu görüntü artık öğretilebilir | this frame can be taught now
  }
  // beynin yazması: adı verilen harfi kendi sinapslarından çizer, sonra kendi çizimini okumaya çalışır
  // the brain writes: draws the named letter from its own synapses, then tries to read what it drew
  function writeBack(k) {
    var save = brain.cnt.slice(), saveImg = brain.img, img = brain.write(k); world.showWrite(img);
    brain.present(img, false); var sc = brain.name(), w = -1, j; for (j = 0; j < LET.length; j++) if (sc[j] > 0 && (w < 0 || sc[j] > sc[w])) w = j;
    brain.cnt.set(save); brain.img = saveImg;   // retina ve önizleme aynı kalsın | keep the retina and the preview untouched
    S.sr.push(w === k ? 1 : 0); if (S.sr.length > 200) S.sr.shift();
    $('sr').textContent = pct(S.sr);
    S.needRender = true;
  }
  // hızlı modlarda yazma-okuma testi seyreltilir: hızlıda her 2, ultrada her 5 denemede bir
  // in the fast modes the write-and-read check runs less often: every 2nd trial (fast), every 5th (ultra)
  function auto() { var k = (Math.random() * LET.length) | 0; world.show(LET[k]); look(k); if (S.speed === 0 || ++S.wb % (S.speed === 1 ? 2 : 5) === 0) writeBack(k); }

  // elle çizim | drawing by hand
  var drawing = false, drew = false, lx = 0, ly = 0, cx = pad.getContext('2d');
  function pp(e) { var r = pad.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 256, (e.clientY - r.top) / r.height * 256]; }
  pad.addEventListener('pointerdown', function (e) { if (!S.manual) return; drawing = true; drew = false; S.ready = false; S.needRender = true; var p = pp(e); lx = p[0]; ly = p[1]; pad.setPointerCapture(e.pointerId); });
  pad.addEventListener('pointermove', function (e) { if (!drawing) return; drew = true; var p = pp(e); cx.strokeStyle = '#fff'; cx.lineWidth = 16; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(lx, ly); cx.lineTo(p[0], p[1]); cx.stroke(); lx = p[0]; ly = p[1]; world.touch(); S.needRender = true;
    if (performance.now() - S.live > C.LIVE_MS) { look(-1, false, true); S.live = performance.now(); }   // çizerken sürekli bakar, durdurulmuş olsa bile | keeps looking while you draw, even when paused
  });
  // çizgi bitti. durdurulmamışsa öğrenir, durdurulmuşsa sadece bakar | stroke done. learns unless paused, otherwise only looks
  pad.addEventListener('pointerup', function () { if (!drawing) return; drawing = false; S.needRender = true; if (drew) look(-1, !S.paused); else S.ready = true; });
  // klavyeden harfe basmak "bu harfin adı bu" demek (ebeveyn çocuğa söyler gibi)
  // pressing a letter key means "this is called X", like a parent telling a child
  window.addEventListener('keydown', function (e) {
    if (!S.manual || e.ctrlKey || e.metaKey || e.repeat || !S.ready) return;
    if ((e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) || (S.overScene && 'wasdqe'.indexOf(e.key.toLowerCase()) >= 0)) return;   // ayar kutuları ve gezinme tuşları hariç | not for settings inputs or the camera keys
    var k = LET.indexOf(e.key.toLocaleUpperCase('tr')); if (k < 0) return;
    // ad bağını kur, sonra çizimi birkaç küçük varyasyonla tekrar et | link the name, then replay the drawing with a few small variations
    S.ready = false; S.needRender = true; brain.teach(k); if (C.REHEARSE > 0) brain.rehearse(eye.gray, k, C.REHEARSE); world.links(brain); say('m_taught', LET[k]); writeBack(k); S.ready = true;
  });
  // sahnede gezinme: fare sahnedeyken W/A/S/D, Q/E aşağı-yukarı, Shift hızlı. Fare panelde ise harf tuşları öğretir.
  // moving around: with the mouse over the scene use W/A/S/D, Q/E for down/up, Shift for speed. Over the panel the letter keys teach instead.
  var keys = {};
  $('scene').addEventListener('pointerenter', function () { S.overScene = true; });
  $('scene').addEventListener('pointerleave', function () { S.overScene = false; keys = {}; });
  window.addEventListener('keydown', function (e) {
    keys.shift = e.shiftKey; var k = e.key.length === 1 ? e.key.toLowerCase() : '';
    if (S.overScene && 'wasdqe'.indexOf(k) >= 0 && k && !e.ctrlKey && !e.metaKey && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) { keys[k] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) { keys.shift = e.shiftKey; var k = e.key.length === 1 ? e.key.toLowerCase() : ''; if (k) keys[k] = false; });
  window.addEventListener('blur', function () { keys = {}; });

  // düğmeler | buttons
  $('speed').onclick = function () { S.speed = (S.speed + 1) % 3; refreshLabels(); };
  $('mode').onclick = function () { S.manual = !S.manual; world.clearPad(); S.ready = !S.manual; if (S.manual) look(-1, false, true); say(S.manual ? 'm_manual' : null); refreshLabels(); };
  // durdur: otomatik deneme, öğrenme ve hesap durur. Elle çizim ve harf öğretme çalışmaya devam eder.
  // pause: automatic trials, learning and computing stop. Drawing by hand and teaching letters keep working.
  $('pause').onclick = function () {
    S.paused = !S.paused;
    if (S.paused) { world.showWrite(brain.imagine()); S.needRender = true; }   // durdurduğun an beyin o anı çizer | the moment you pause, the brain draws that moment
    say(S.paused ? 'm_paused' : null); refreshLabels();
  };
  $('teach').onclick = function () { S.teacher = !S.teacher; refreshLabels(); };
  $('fonts').onclick = function () { C.MIXED_FONTS = C.MIXED_FONTS ? 0 : 1; say(C.MIXED_FONTS ? 'm_fonts_on' : 'm_fonts_off'); refreshLabels(); };
  $('clr').onclick = function () { world.clearPad(); if (S.manual) { S.ready = false; look(-1, false, true); } };
  $('reset').onclick = function () { if (window.VNLS_UI) VNLS_UI.applyPending(); brain = new Brain(); S.n = 0; S.hist = []; S.sr = []; S.ready = !S.manual; world.bind(brain); world.links(brain); world.paint(brain, brain.act()); refreshLabels(); };

  I18N.onChange(refreshLabels); I18N.apply(); refreshLabels();

  var last = performance.now();
  (function frame(ts) {
    requestAnimationFrame(frame); var dt = (ts - last) / 1000; S.acc += ts - last; last = ts;
    world.move(dt, keys);
    var render = false;
    if (!S.manual) {
      if (S.paused) { /* durdu, hesap yok | paused, nothing to compute */ }
      else if (S.speed === 2) {
        // zaman bütçesi: kare başına birkaç deneme, sonra çiz, böylece tarayıcı donmaz | time budget: a few trials per frame, then draw, so the browser never freezes
        var t0 = performance.now(); do { auto(); } while (performance.now() - t0 < C.BUDGET_MS);
        render = true; S.acc = 0;
      } else if (S.speed === 1) {
        auto(); render = true; S.acc = 0;
      } else if (S.acc > 600) {
        S.acc = 0; auto(); render = true;
      }
    } else {
      render = true;   // elle modda her karede çiz, çizim anlık görünsün | draw every frame in manual mode so the stroke shows instantly
    }
    if (render || S.needRender) { world.paint(brain, brain.act()); world.render(true); S.needRender = false; }
  })(last);
})();
