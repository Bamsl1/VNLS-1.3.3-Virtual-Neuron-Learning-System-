// Etiketsiz öğrenen spiking korteks, Diehl & Cook (2015) tarzında:
//  retina nöronları (Poisson) → korteks nöronları (sızıntılı, uyum eşikli) → yanal baskılamayla rekabet.
//  Öğrenme: iz tabanlı STDP, toplam ağırlık normalizasyonu, kazananda sinaps budama ve yeniden büyütme.
//  İsimler: bir harfin adı duyulunca ateşleyen korteks nöronlarıyla isim nöronları arasında Hebb bağı kurulur.
// Unsupervised spiking cortex, in the style of Diehl & Cook (2015):
//  retina neurons (Poisson) → cortex neurons (leaky, adaptive threshold) → competition through lateral inhibition.
//  Learning: trace-based STDP, total-weight normalization, pruning and regrowing synapses on the winner.
//  Names: when a letter's name is heard, the cortex neurons that fire get a Hebbian link to the name neurons.
var Brain = (function () {
  var C = (typeof CFG !== 'undefined') ? CFG : require('./config.js');
  var R = C.RES, N = R * R, E = C.E, S = C.S, L = [...C.LET].length, M = C.M;
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function Brain() {
    this.px = new Int32Array(E * S); this.w = new Float32Array(E * S);
    this.cx = new Int16Array(E); this.cy = new Int16Array(E);
    this.th = new Float32Array(E); this.v = new Float32Array(E); this.ref = new Uint8Array(E);
    this.sp = new Uint8Array(N); this.tr = new Float32Array(N);
    this.wa = new Float32Array(E * M).fill(1 / M);   // korteks → isim nöronu, başta tarafsız | cortex → name neuron, neutral at first
    this.code = [];                                   // her harfin adı: M isim nöronundan CODE tanesi (dağınık kod) | each letter's name: CODE of the M name neurons (distributed code)
    this.mult = new Float32Array(M);                  // her isim nöronu kaç harfin kodunda (okuma ağırlığı) | how many letter codes each name neuron is in (reading weight)
    this.inc = new Uint8Array(M);                     // teach için: öğretilen harfin kodu (karşıt güncelleme) | for teach: code of the taught letter (opposing update)
    for (var k = 0; k < L; k++) { var cd = []; while (cd.length < C.CODE) { var jj = Math.floor(Math.random() * M); if (cd.indexOf(jj) < 0) cd.push(jj); } this.code.push(cd); for (var q = 0; q < cd.length; q++) this.mult[cd[q]]++; }
    this.cnt = new Float32Array(E);                   // son gösterimdeki spike sayıları | spike counts of the last presentation
    this.fired = new Uint8Array(E);                   // son gösterimde ateşleyenler | which neurons fired in the last presentation
    this.bias = new Float32Array(E);                  // homeostatik eşik kayması, sessiz nöronu cesaretlendirir | homeostatic threshold bias, encourages silent neurons
    this.lastFire = new Int32Array(E);                // nöronun en son hangi sunumda ateşlediği (canlandırma için) | the presentation in which each neuron last fired (for reviving)
    this.tt = 0;                                      // eğitim sunumu sayacı | training presentation counter
    var rv = Math.max(1, C.REVIVE | 0);
    for (var e = 0; e < E; e++) {
      this.cx[e] = Math.floor(rnd(C.MARGIN, R - C.MARGIN)); this.cy[e] = Math.floor(rnd(C.MARGIN, R - C.MARGIN));
      for (var s = 0; s < S; s++) { this.px[e * S + s] = this.randPix(e); this.w[e * S + s] = rnd(.05, .15); }
      this.norm(e); this.lastFire[e] = -Math.floor(Math.random() * rv);
    }
  }
  Brain.prototype.randPix = function (e) {
    var x = this.cx[e] + Math.floor(rnd(-C.WIN, C.WIN + 1)), y = this.cy[e] + Math.floor(rnd(-C.WIN, C.WIN + 1));
    return Math.max(0, Math.min(R - 1, y)) * R + Math.max(0, Math.min(R - 1, x));
  };
  Brain.prototype.norm = function (e) {
    var b = e * S, t = 0, s; for (s = 0; s < S; s++) t += this.w[b + s];
    var f = t > 0 ? C.WSUM / t : 1; for (s = 0; s < S; s++) this.w[b + s] = Math.min(C.WMAX, this.w[b + s] * f);
  };

  // img: RES*RES parlaklık (0..1). learn=true ise STDP ve yapı değişimi olur. Döner: nöron başına spike sayısı.
  // img: RES*RES brightness (0..1). With learn=true STDP and rewiring happen. Returns spike counts per neuron.
  // Ters indeks (piksel → o piksele bağlı sinapslar): piksel spike atınca sadece ona bağlı sinapslar toplanır.
  // Her adımda tüm sinapsları taramakla aynı sonucu verir ama çok daha hızlıdır. Sinaps yapısı değişince (grow/revive) yeniden kurulur.
  // Reverse index (pixel → synapses attached to that pixel): when a pixel spikes only its own synapses are summed.
  // Same result as scanning every synapse each step, just much faster. Rebuilt whenever the wiring changes (grow/revive).
  Brain.prototype.buildIndex = function () {
    var px = this.px, n = E * S, j, ps = this.ps || (this.ps = new Int32Array(N + 1)), pos = this.pos || (this.pos = new Int32Array(N));
    if (!this.nid) { this.nid = new Int16Array(n); this.sid = new Int32Array(n); }
    ps.fill(0); for (j = 0; j < n; j++) ps[px[j] + 1]++;
    for (j = 0; j < N; j++) ps[j + 1] += ps[j];
    pos.set(ps.subarray(0, N));
    for (j = 0; j < n; j++) { var q = pos[px[j]]++; this.nid[q] = (j / S) | 0; this.sid[q] = j; }
    this.idxDirty = false;
  };
  Brain.prototype.present = function (img, learn) {
    var T = C.T, i, e, s, t, act = [];
    for (i = 0; i < N; i++) if (img[i] > 0) act.push(i);
    var sp = this.sp, tr = this.tr, v = this.v, ref = this.ref, th = this.th, bias = this.bias, px = this.px, w = this.w, cnt = this.cnt;
    if (this.idxDirty !== false) this.buildIndex();
    var ps = this.ps, nid = this.nid, sid = this.sid, I = this.Iin || (this.Iin = new Float32Array(E));
    this.img = img; sp.fill(0); tr.fill(0); v.fill(0); ref.fill(0); cnt.fill(0); this.fired.fill(0);
    for (t = 0; t < T; t++) {
      I.fill(0);
      for (i = 0; i < act.length; i++) { var p = act[i], k = Math.random() < img[p] * C.PIN ? 1 : 0; sp[p] = k; tr[p] = tr[p] * C.TRD + k;
        if (k) for (var q = ps[p], qe = ps[p + 1]; q < qe; q++) I[nid[q]] += w[sid[q]]; }
      var nf = 0;
      for (e = 0; e < E; e++) {
        if (ref[e]) { ref[e]--; continue; }
        var b = e * S;
        v[e] = v[e] * C.LEAK + I[e];
        if (v[e] > C.THR + th[e] + bias[e]) {
          v[e] = 0; ref[e] = C.REF; cnt[e]++; this.fired[e] = 1; if (learn) { th[e] += C.THP; this.lastFire[e] = this.tt; } nf++;
          if (learn) for (s = 0; s < S; s++) { var j = b + s, d = C.ETA * (tr[px[j]] - C.XTAR) * (C.WMAX - w[j]); w[j] = Math.max(0, w[j] + d); }
        }
      }
      if (nf) for (e = 0; e < E; e++) if (!(ref[e] === C.REF)) v[e] -= C.INH * nf;   // yanal baskılama: ateşlemeyenleri bastırır | lateral inhibition: suppresses the ones that did not fire
    }
    if (learn) for (e = 0; e < E; e++) {
      th[e] *= C.THD;
      // homeostaz: hedef spike oranının altındaki nöronun eşiği düşer, üstündekinin yükselir | homeostasis: a neuron below the target rate gets a lower threshold, one above gets a higher one
      bias[e] += C.HB * (cnt[e] / T - C.HT);
      if (bias[e] > C.HMAX) bias[e] = C.HMAX; else if (bias[e] < -C.HMAX) bias[e] = -C.HMAX;
    }
    if (learn) for (e = 0; e < E; e++) if (this.fired[e]) { this.grow(e, act); this.norm(e); }
    if (learn && C.REVIVE > 0) for (e = 0; e < E; e++) if (this.tt - this.lastFire[e] > C.REVIVE) this.revive(e, act);
    if (learn) this.tt++;
    return cnt;
  };

  // yapı plastisitesi: kazanan nöron en zayıf sinapslarını bırakır, bu gösterimde aktif piksellerden yenisini kurar
  // structural plasticity: the winner drops its weakest synapses and grows new ones from pixels active in this presentation
  Brain.prototype.grow = function (e, act) {
    if (!act.length) return;
    var b = e * S, n = 0, tries;
    for (var q = 0; q < C.GROW; q++) {
      var wi = 0, s; for (s = 1; s < S; s++) if (this.w[b + s] < this.w[b + wi]) wi = s;
      if (this.w[b + wi] > .5 * C.WSUM / S) return;
      for (tries = 0; tries < 20; tries++) {
        var p = act[(Math.random() * act.length) | 0], x = p % R, y = (p / R) | 0;
        if (Math.abs(x - this.cx[e]) <= C.WIN && Math.abs(y - this.cy[e]) <= C.WIN) { this.px[b + wi] = p; this.w[b + wi] = C.WSUM / S; this.idxDirty = true; break; }
      }
    }
  };

  // Ölü nöronu geri kazan: alıcı alanını bu gösterimdeki aktif piksellerden kur,
  // isim bağlarını sıfırla, eşikleri temizle. Böylece nöron rastgele değil gerçek bir harfe bağlanır.
  // Bring a dead neuron back: build its field from pixels active in this presentation,
  // reset its name links and thresholds. That way it ties to a real letter instead of random noise.
  Brain.prototype.revive = function (e, act) {
    var b = e * S, cand = [], s, i, p, x, y;
    if (act && act.length) for (i = 0; i < act.length; i++) {
      p = act[i]; x = p % R; y = (p / R) | 0;
      if (Math.abs(x - this.cx[e]) <= C.WIN && Math.abs(y - this.cy[e]) <= C.WIN) cand.push(p);
    }
    if (cand.length) {
      for (s = 0; s < S; s++) { this.px[b + s] = cand[(Math.random() * cand.length) | 0]; this.w[b + s] = C.WSUM / S; } this.idxDirty = true;
    } else {
      for (s = 0; s < S; s++) { this.px[b + s] = this.randPix(e); this.w[b + s] = rnd(.05, .15); } this.idxDirty = true;
    }
    this.norm(e); this.th[e] = 0; this.bias[e] = 0; this.v[e] = 0; this.ref[e] = 0;
    for (var j = 0; j < M; j++) this.wa[e * M + j] = 1 / M;
    this.lastFire[e] = this.tt;
  };

  // İsim popülasyonu: M nöron. Bir harfin adı duyulunca o harfin kodundaki (CODE tane) isim nöronları ateşler;
  // aynı anda ateşleyen korteks nöronlarıyla Hebb bağı kurulur (satır toplamı 1, yani nöron başına bağ bütçesi sabit).
  // v2.7 karşıt terim: hedef harfin kodu güçlenirken kodda olmayan isim nöronları zayıflatılır (anti-Hebb).
  // Böylece harf kodları birbirinden ayrışır, hiçbir bağ 0'ın altına inmez.
  // Name population: M neurons. When a letter's name is heard, the CODE name neurons in its code fire;
  // the cortex neurons that fire at the same time get a Hebbian link (row sum is 1, so each neuron has a fixed link budget).
  // v2.7 opposing term: while the target code is strengthened, name neurons outside it are weakened (anti-Hebb).
  // This pulls the letter codes apart, and no link ever goes below 0.
  Brain.prototype.teach = function (k) {
    var code = this.code[k], inc = this.inc;
    inc.fill(0); for (var q = 0; q < code.length; q++) inc[code[q]] = 1;
    for (var e = 0; e < E; e++) if (this.cnt[e] > 0) {
      var b = e * M, s = 0, j, v;
      for (j = 0; j < M; j++) { v = this.wa[b + j] + (inc[j] ? C.AL : -C.NEG) * this.cnt[e]; this.wa[b + j] = v > 0 ? v : 0; }
      for (j = 0; j < M; j++) s += this.wa[b + j]; for (j = 0; j < M; j++) this.wa[b + j] /= s;
    }
  };
  // isim popülasyonunun etkinliği (M uzunluğunda) | activity of the name population (length M)
  Brain.prototype.act = function () {
    var a = new Float32Array(M);
    for (var e = 0; e < E; e++) if (this.cnt[e] > 0) for (var j = 0; j < M; j++) a[j] += this.cnt[e] * this.wa[e * M + j];
    return a;
  };
  // etkinlik deseni hangi harfin koduna uyuyor → harf skorları (L uzunluğunda) | which letter's code the pattern matches → letter scores (length L)
  Brain.prototype.name = function () {
    var a = this.act(), sc = new Float32Array(L), tot = 0, j, k;
    for (j = 0; j < M; j++) tot += a[j];
    // paylaşılan isim nöronlarını çokluğuna böl, her harf koduna eşit katkı versin | divide shared name neurons by their multiplicity so every letter code counts equally
    if (tot > 0) for (k = 0; k < L; k++) { var s = 0, code = this.code[k]; for (j = 0; j < code.length; j++) s += C.MULT ? a[code[j]] / this.mult[code[j]] : a[code[j]]; sc[k] = s / tot; }
    return sc;
  };
  // bir korteks nöronunun bir harfin koduna toplam bağ gücü (0..1) | total link strength from one cortex neuron to one letter's code (0..1)
  Brain.prototype.tune = function (e, k) { var s = 0, code = this.code[k]; for (var j = 0; j < code.length; j++) s += this.wa[e * M + code[j]]; return s; };

  // Beynin "yazması": k isim nöronu etkinleşir → ona güçlü bağlı korteks nöronları geriye doğru etkinleşir →
  // her birinin öğrendiği alıcı alan (sinaps ağırlıkları) retinaya yansır. Yani beynin kendi çizimi (hayal, geri besleme).
  // The brain "writes": name k becomes active → cortex neurons strongly linked to it fire backwards →
  // each one's learned receptive field (synapse weights) is projected onto the retina. A drawing made by the brain itself (imagination, feedback).
  Brain.prototype.write = function (k, top) {
    var cand = [], e;
    for (e = 0; e < E; e++) { var a = this.tune(e, k); if (a > C.WT) cand.push([a, e]); }
    cand.sort(function (x, y) { return y[0] - x[0]; }); return this.footprint(cand.slice(0, top || 20));
  };
  // Hayal: şu an ateşleyen korteks nöronlarının alıcı alanlarından görüntüyü geri kurar (isim gerekmez):
  // beynin "gördüğünü kendi iç görüntüsüyle yeniden çizmesi". cnt sıfırsa boş görüntü döner.
  // Imagine: rebuilds an image from the receptive fields of the cortex neurons firing right now (no name needed):
  // the brain "redrawing what it sees with its own inner picture". Returns an empty image when cnt is zero.
  Brain.prototype.imagine = function (top) {
    var cand = [], e, mx = 0;
    for (e = 0; e < E; e++) if (this.cnt[e] > 0) { cand.push([this.cnt[e], e]); if (this.cnt[e] > mx) mx = this.cnt[e]; }
    if (!cand.length) return new Float32Array(N);
    cand.sort(function (x, y) { return y[0] - x[0]; });
    return this.footprint(cand.slice(0, top || 60).map(function (c) { return [c[0] / mx, c[1]]; }));
  };
  // aday nöronların (ağırlık, nöron) sinaps izlerini retinaya yansıtır, üst yüzdelik dilime göre normalize eder | projects the synapse footprints of candidate neurons (weight, neuron) onto the retina, normalized by the upper percentile
  // Tekrar (prova): öğretilen görüntü küçük rastgele kayma, dönme ve ölçekle n kez yeniden sunulur, her seferinde ad bağı güçlenir.
  // Amaç: tek bir çizimden öğrenip aynı el yazısındaki küçük farklara dayanabilmek.
  // Rehearsal: the taught image is shown n more times with small random shift, rotation and scale, strengthening the name link each time.
  // Goal: learn from a single drawing and still cope with small differences in the same handwriting.
  function jitter(im) {
    var o = new Float32Array(N), sc = .9 + Math.random() * .2, rot = (Math.random() - .5) * .2, c = Math.cos(rot), s = Math.sin(rot), dx = (Math.random() - .5) * 4, dy = (Math.random() - .5) * 4;
    for (var y = 0; y < R; y++) for (var x = 0; x < R; x++) {
      var u = x - R / 2 - dx, v = y - R / 2 - dy, sx = Math.round((c * u + s * v) / sc + R / 2), sy = Math.round((-s * u + c * v) / sc + R / 2);
      if (sx >= 0 && sx < R && sy >= 0 && sy < R) o[y * R + x] = im[sy * R + sx];
    }
    return o;
  }
  Brain.prototype.rehearse = function (img, k, n) {
    var keep = this.cnt.slice();
    for (var i = 0; i < n; i++) { this.present(jitter(img), true); this.teach(k); }
    this.cnt.set(keep);   // ekrandaki etkinlik durumu bozulmasın | keep the on-screen activity state intact
  };
  Brain.prototype.footprint = function (cand) {
    var img = new Float32Array(N), e, s, i;
    var r = C.WR || 1;   // her sinaps retinada kendi yakın çevresini (r piksel) temsil eder: sinaps izi | each synapse stands for its own neighborhood (r pixels) on the retina: the synapse footprint
    var cut = (C.WS || 0) * C.WSUM / S;   // ortalama altı sinapsları yazıya katma, lekeyi azaltır | leave out below-average synapses, reduces blur
    for (var c = 0; c < cand.length; c++) { var a2 = cand[c][0], en = cand[c][1], b = en * S;
      for (s = 0; s < S; s++) { var ww = this.w[b + s] - cut; if (ww <= 0) continue; var p0 = this.px[b + s], x0 = p0 % R, y0 = (p0 / R) | 0;
        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var xx = x0 + dx, yy = y0 + dy; if (xx >= 0 && xx < R && yy >= 0 && yy < R) img[yy * R + xx] += a2 * ww; } } }
    // En yüksek piksele göre değil üst yüzdelik dilime göre ölçekle ki ince çizgiler kaybolmasın. | Scale by the upper percentile, not the brightest pixel, so thin strokes don't vanish.
    var vals = []; for (var v0 = 0; v0 < N; v0++) if (img[v0] > 0) vals.push(img[v0]);
    if (vals.length) { vals.sort(function (x, y) { return x - y; }); var mx = vals[Math.min(vals.length - 1, Math.floor((C.WP || .95) * vals.length))];
      if (mx > 0) for (i = 0; i < N; i++) { var v = img[i] / mx; img[i] = v < (C.WCUT || .1) ? 0 : Math.min(1, v); } }
    return img;
  };
  Brain.L = L; Brain.M = M;
  return Brain;
})();
if (typeof module !== 'undefined') module.exports = Brain;
