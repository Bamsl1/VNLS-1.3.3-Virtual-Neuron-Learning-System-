// Göz: tahtaya perspektif bir kamerayla bakar ve 128x128 gri görüntü üretir. Işın atma yok, her piksel için tahta düzlemiyle tek kesişim hesabı var.
// The eye: looks at the board through a perspective camera and produces a 128x128 gray image. No ray tracing, just one plane intersection per pixel.
// Neden GPU'dan okumuyoruz: WebGPU'da piksel okumak asenkron, her bakışı beklemek ana döngüyü bölerdi. Göz zaten sadece tahtaya bakıyor, o yüzden tahta tuvalini doğrudan örnekliyoruz.
// Why we don't read back from the GPU: reading pixels in WebGPU is asynchronous and waiting for every look would split the main loop. The eye only sees the board anyway, so we sample the board canvas directly.
// Sakkad (CFG.FIXATE=1): önce dinlenme konumundan bakar, parlak şeklin ağırlık merkezini bulur,
// kamerayı oraya çevirir ve ikinci bakışı ortadan alır. Beyin ve önizleme ikinci bakışı görür.
// Saccade (CFG.FIXATE=1): looks from the rest position first, finds the centroid of the bright shape,
// turns the camera there and takes a second look from the middle. The brain and the preview get the second look.
// Neden: korteks konuma bağlı özellikler öğreniyor. Harf her seferinde başka yerde durursa aynı harf başka nöronları uyandırır.
// Why: the cortex learns position-bound features. If a letter sits somewhere else every time, the same letter wakes different neurons.
// Yakınlaşma (CFG.ZOOM): şeklin uzun kenarı hep aynı piksel olsun diye görüş alanı daralır ya da genişler (ölçek değişmezliği).
// Zoom (CFG.ZOOM): the field of view narrows or widens so the long side of the shape always has the same pixel size (scale invariance).
// Ölçüm (Node, 29 harf): sakkadsız %48, sakkadlı %89. El yazısı benzeri bozulmada sakkad %41, yakınlaşmayla %51.
// Measured (Node, 29 letters): 48% without the saccade, 89% with it. On handwriting-like distortion: 41% with the saccade, 51% with zoom.
var Retina = (function () {
  var R = CFG.RES, PAD = 256;   // PAD: tahta tuvalinin kenar uzunluğu | side length of the board canvas
  function Retina(world, previewCanvas) {
    this.world = world;
    this.gray = new Float32Array(R * R);
    this.ctx = previewCanvas.getContext('2d');
    this.img = this.ctx.createImageData(R, R);
    this.gx = 0; this.gy = 0; this.zoom = 1;   // son sakkadın piksel kayması ve yakınlaşması | pixel shift and zoom of the last saccade
    this.tx = 0; this.ty = 0; this.fov = world.eye.fov; this.pd = null;
  }
  // tahta tuvalinin (u, v) noktasındaki parlaklık, çift doğrusal örnekleme. u, v 0..1 aralığında | brightness of the board canvas at (u, v), bilinear. u, v in 0..1
  function sample(pd, u, v) {
    var px = u * PAD - .5, py = v * PAD - .5, x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
    var xa = x0 < 0 ? 0 : x0, xb = x0 + 1 > PAD - 1 ? PAD - 1 : x0 + 1, ya = y0 < 0 ? 0 : y0, yb = y0 + 1 > PAD - 1 ? PAD - 1 : y0 + 1;
    var a = pd[(ya * PAD + xa) * 4], b = pd[(ya * PAD + xb) * 4], c = pd[(yb * PAD + xa) * 4], d = pd[(yb * PAD + xb) * 4];
    return ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy) / 255;
  }
  // şu anki bakışla görüntüyü üret, 128x128 gri diziye yaz (siyah arka plan = 0). Piksel başına 2x2 alt örnek.
  // build the image with the current gaze into the 128x128 gray array (black background = 0). 2x2 sub-samples per pixel.
  Retina.prototype.capture = function () {
    var w = this.world, e = w.eye, zb = w.boardZ, pd = this.pd, g = this.gray, d = this.img.data;
    // kamera tabanı: ileri = hedefe doğru, sağ = ileri × yukarı(+y), yukarı = sağ × ileri | camera basis: forward = toward the target, right = forward × up(+y), up = right × forward
    var fx = this.tx - e.x, fy = this.ty - e.y, fz = zb - e.z, fl = Math.sqrt(fx * fx + fy * fy + fz * fz); fx /= fl; fy /= fl; fz /= fl;
    var rx = -fz, rz = fx, rl = Math.sqrt(rx * rx + rz * rz); rx /= rl; rz /= rl;
    var ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
    var th = Math.tan(this.fov * Math.PI / 360), sub = [.25, .75], i, j, a, b;
    for (j = 0; j < R; j++) for (i = 0; i < R; i++) {
      var acc = 0;
      for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) {
        var nx = (i + sub[b]) / R * 2 - 1, ny = 1 - (j + sub[a]) / R * 2;   // üst satır = yukarı | top row = up
        var dx = fx + (rx * nx + ux * ny) * th, dy = fy + uy * ny * th, dz = fz + (rz * nx + uz * ny) * th;
        var t = (zb - e.z) / dz; if (!(t > 0)) continue;
        var u = (e.x + t * dx + 1.5) / 3, v = (1.5 - (e.y + t * dy)) / 3;   // tahta 3x3 birim, merkezi (0, 0) | the board is 3x3 units, centered at (0, 0)
        if (u >= 0 && u < 1 && v >= 0 && v < 1) acc += sample(pd, u, v);
      }
      var val = acc / 4; val = val < .1 ? 0 : val;
      g[j * R + i] = val; var o = (j * R + i) * 4; d[o] = d[o + 1] = d[o + 2] = val * 255; d[o + 3] = 255;
    }
  };
  // parlak piksellerin ağırlık merkezi ve sınır kutusu. Yeterince parlak piksel yoksa null.
  // centroid and bounding box of the bright pixels. null when there are too few bright pixels.
  Retina.prototype.analyze = function () {
    var g = this.gray, n = 0, sx = 0, sy = 0, x0 = R, x1 = -1, y0 = R, y1 = -1;
    for (var y = 0; y < R; y++) for (var x = 0; x < R; x++) if (g[y * R + x] > .6) { n++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return n >= 20 ? { x: sx / n, y: sy / n, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
  };
  Retina.prototype.centroid = Retina.prototype.analyze;
  Retina.prototype.look = function () {
    var w = this.world, e = w.eye, zb = w.boardZ, f0 = e.fov;
    this.pd = w.ctx.getImageData(0, 0, PAD, PAD).data;   // tahtanın o anki hâli | the board as it is right now
    this.gx = 0; this.gy = 0; this.zoom = 1; this.tx = 0; this.ty = 0; this.fov = f0;   // her bakış dinlenme konumundan başlar | every look starts from the rest position
    this.capture();
    var c = CFG.FIXATE ? this.analyze() : null;
    if (c) {
      var upp = 2 * Math.abs(zb - e.z) * Math.tan(f0 * Math.PI / 360) / R;   // tahta düzleminde piksel başına dünya birimi | world units per pixel on the board plane
      this.tx = (c.x - R / 2) * upp; this.ty = -(c.y - R / 2) * upp;          // göz şekle döner (sakkad) | the eye turns to the shape (saccade)
      this.gx = Math.round(c.x - R / 2); this.gy = Math.round(c.y - R / 2);
      var side = Math.max(c.w, c.h);                                           // yakınlaşma: uzun kenar ZOOM piksel olsun (0,5x–2,5x) | zoom: long side becomes ZOOM pixels (0.5x–2.5x)
      if (CFG.ZOOM && side >= 12) { this.zoom = Math.max(.5, Math.min(2.5, CFG.ZOOM / side)); this.fov = 2 * Math.atan(Math.tan(f0 * Math.PI / 360) / this.zoom) * 180 / Math.PI; }
      this.capture();                                                          // ikinci bakış: şekil ortada ve sabit boyutta | second look: the shape is centered and fixed in size
    }
    this.ctx.putImageData(this.img, 0, 0);   // soldaki "gözün gördüğü" önizleme | the "what the eye sees" preview on the left
    return this.gray;
  };
  return Retina;
})();
