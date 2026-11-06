// 3D sahne, doğrudan WebGPU ile. z ekseni boyunca: sabit tahta → göz → retina (128x128 düz yüzey) → korteks (küre nöronlar) → beynin çizdiği kâğıt.
// Bir nörona tıklayınca gerçek sinaps bağları görünür. İsim nöronlarında (açık gri) harf yazmaz, çünkü kod dağınık.
// 3D scene drawn with plain WebGPU. Along the z axis: fixed board → eye → retina (flat 128x128 surface) → cortex (sphere neurons) → the paper the brain draws on.
// Click a neuron to see its real synapse connections. Name neurons (light gray) carry no letters because the code is distributed.
var World = (function () {
  var C = CFG, R = C.RES, N = R * R, E = C.E, M = C.M, S = C.S, LET = [...C.LET], L = LET.length, NS = 2;
  var BOARD_Z = -9.5, PAPER_Z = 10.5;
  var EYE = { x: 0, y: 0, z: -4.3, fov: 40 };   // göz konumu ve görüş açısı (derece). Retina bunu okuyup tahtaya bakar | eye position and field of view (degrees). The retina reads it to look at the board
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // --- küçük 4x4 matris yardımcıları: sütun öncelikli, WebGPU'da kırpma uzayı z 0..1 aralığında
  // --- tiny 4x4 matrix helpers: column-major, and WebGPU clip space has z in 0..1
  function perspective(fovy, asp, n, f) {
    var t = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = t / asp; m[5] = t; m[10] = f / (n - f); m[11] = -1; m[14] = n * f / (n - f); return m;
  }
  function lookAt(ex, ey, ez, tx, ty, tz) {   // yukarı = +y | up = +y
    var zx = ex - tx, zy = ey - ty, zz = ez - tz, zl = Math.sqrt(zx * zx + zy * zy + zz * zz); zx /= zl; zy /= zl; zz /= zl;
    var xx = zz, xz = -zx, xl = Math.sqrt(xx * xx + xz * xz); xx /= xl; xz /= xl;   // x = yukarı × z | x = up × z
    var yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;                        // y = z × x
    var m = new Float32Array(16);
    m[0] = xx; m[1] = yx; m[2] = zx; m[4] = 0; m[5] = yy; m[6] = zy; m[8] = xz; m[9] = yz; m[10] = zz;
    m[12] = -(xx * ex + xz * ez); m[13] = -(yx * ex + yy * ey + yz * ez); m[14] = -(zx * ex + zy * ey + zz * ez); m[15] = 1; return m;
  }
  function mul(a, b) {   // a * b
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  }
  // bir dünya noktasını ekrana yansıt: [ndcx, ndcy, ndcz, w] | project a world point: [ndcx, ndcy, ndcz, w]
  function project(m, x, y, z) {
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w, w];
  }

  // --- gölgelendiriciler (WGSL). Üç tane: küreler, çizgiler, dokulu yüzeyler. Hepsi aynı Globals yapısını kullanır.
  // --- shaders (WGSL). Three of them: spheres, lines, textured surfaces. They all share the same Globals struct.
  // p0/p1 çizime göre değişir: küre için ışık yönü ve (ortam, yön) ışık şiddeti, çizgi için p0.x = saydamlık, yüzey için merkez ve yarı boyut.
  // p0/p1 depend on the draw: light direction and (ambient, directional) for spheres, p0.x = opacity for lines, center and half size for surfaces.
  var WGSL_G = 'struct Globals { viewProj : mat4x4<f32>, p0 : vec4<f32>, p1 : vec4<f32> };\n@group(0) @binding(0) var<uniform> g : Globals;\n';
  var WGSL_SPHERE = WGSL_G + [
    'struct VOut { @builtin(position) pos : vec4<f32>, @location(0) col : vec3<f32>, @location(1) nrm : vec3<f32> };',
    '@vertex fn vs(@location(0) p : vec3<f32>, @location(1) ip : vec4<f32>, @location(2) ic : vec4<f32>) -> VOut {',
    '  var o : VOut;',
    '  o.pos = g.viewProj * vec4<f32>(ip.xyz + p * ip.w, 1.0);',
    '  o.col = ic.xyz; o.nrm = p;',
    '  return o;',
    '}',
    '@fragment fn fs(i : VOut) -> @location(0) vec4<f32> {',
    '  let l = normalize(g.p0.xyz);',
    '  let d = max(dot(normalize(i.nrm), l), 0.0);',
    '  let k = g.p1.x + g.p1.y * d;',
    '  return vec4<f32>(min(i.col * k, vec3<f32>(1.0)), 1.0);',
    '}'].join('\n');
  var WGSL_LINE = WGSL_G + [
    'struct VOut { @builtin(position) pos : vec4<f32>, @location(0) col : vec3<f32> };',
    '@vertex fn vs(@location(0) p : vec3<f32>, @location(1) c : vec3<f32>) -> VOut {',
    '  var o : VOut;',
    '  o.pos = g.viewProj * vec4<f32>(p, 1.0);',
    '  o.col = c;',
    '  return o;',
    '}',
    '@fragment fn fs(i : VOut) -> @location(0) vec4<f32> {',
    '  return vec4<f32>(i.col, g.p0.x);',
    '}'].join('\n');
  var WGSL_QUAD = WGSL_G + [
    '@group(0) @binding(1) var smp : sampler;',
    '@group(0) @binding(2) var tex : texture_2d<f32>;',
    'struct VOut { @builtin(position) pos : vec4<f32>, @location(0) uv : vec2<f32> };',
    '@vertex fn vs(@builtin(vertex_index) vi : u32) -> VOut {',
    '  var c = array<vec2<f32>, 6>(vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0));',
    '  let q = c[vi];',
    '  var o : VOut;',
    '  o.pos = g.viewProj * vec4<f32>(g.p0.x + q.x * g.p0.w, g.p0.y + q.y * g.p0.w, g.p0.z, 1.0);',
    '  o.uv = vec2<f32>(q.x * 0.5 + 0.5, 0.5 - q.y * 0.5);',
    '  return o;',
    '}',
    '@fragment fn fs(i : VOut) -> @location(0) vec4<f32> {',
    '  return vec4<f32>(textureSample(tex, smp, i.uv).rgb, 1.0);',
    '}'].join('\n');

  function World(canvas, pad, wcv) {
    this.canvas = canvas; this.cv = pad; this.wcv = wcv;
    this.ctx = pad.getContext('2d', { willReadFrequently: true });   // retina tahtayı bu tuvalden okur | the retina reads the board from this canvas
    this.wctx = wcv.getContext('2d');   // beynin çizdiği kâğıdın tuvali, GPU'ya kopyalanmadan önce bağlamı olmalı | canvas of the paper the brain draws on; it needs a context before it is copied to the GPU
    this.eye = EYE; this.boardZ = BOARD_Z;
    this.az = Math.PI / 2.3; this.el = .3; this.dist = 21; this.target = { x: 0, y: 0, z: -1.5 };
    // retina yüzeyinin doku kaynağı: 128x128 piksel = 128x128 nöron, düz ve kesintisiz yüzey (her texel bir nöron)
    // texture source of the retina surface: 128x128 pixels = 128x128 neurons, one flat unbroken surface (each texel is a neuron)
    this.rcv = document.createElement('canvas'); this.rcv.width = this.rcv.height = R; this.rctx = this.rcv.getContext('2d'); this.rimg = this.rctx.createImageData(R, R);
    this.rf = new Float32Array(N);   // seçili nöronun alıcı alanı (retinada beyaz) | receptive field of the selected neuron (white on the retina)
    this.cp = new Float32Array(E * 3); this.np = new Float32Array(M * 3);
    for (var j = 0; j < M; j++) this.np.set([rnd(-1.8, 1.8), rnd(-1.8, 1.8), rnd(3, 5.4)], j * 3);   // isim nöronları bulutun içinde | name neurons sit inside the cloud
    // küre örnekleri: korteks, isim nöronları, en sonda göz küresi. Her örnek 8 sayı: konum+ölçek, renk+boşluk
    // sphere instances: cortex, name neurons, the eye sphere last. Eight numbers each: position+scale, color+padding
    this.inst = new Float32Array((E + M + 1) * 8);
    this.inst.set([EYE.x, EYE.y, EYE.z, .25, .87, .87, .87, 0], (E + M) * 8);
    // arka plandaki sinaps demeti (her nöronun en güçlü NS retina sinapsı + en güçlü isim bağı) ve seçili nöronun bağları
    // background synapse bundle (each neuron's NS strongest retina synapses + its strongest name link) and the links of the selected neuron
    this.bg = { p: new Float32Array(E * (NS + 1) * 6), c: new Float32Array(E * (NS + 1) * 6), n: E * (NS + 1), op: .6 };
    this.sg = { p: new Float32Array(Math.max(E, S + M) * 6), c: new Float32Array(Math.max(E, S + M) * 6), n: 0, op: .95 };
    this.dirty = { pad: true, ret: true, paper: true, inst: true, bg: true, sg: true };
    this.sel = null; this.onPick = null; this.onInfo = null; this.onError = null; this.drag();
  }
  // WebGPU açılışı asenkron olduğu için World doğrudan new ile değil bununla kurulur | WebGPU startup is async, so build a World with this instead of plain new
  World.create = async function (canvas, pad, wcv) { var w = new World(canvas, pad, wcv); await w.initGPU(); return w; };

  World.prototype.initGPU = async function () {
    var me = this;
    if (!navigator.gpu) throw new Error('nogpu');
    var adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('noadapter');
    var device = this.device = await adapter.requestDevice();
    device.lost.then(function (info) { me.lost = true; if (me.onError) me.onError(new Error('device lost: ' + info.message)); });
    device.addEventListener('uncapturederror', function (ev) { if (me.onError) me.onError(new Error(ev.error.message)); });
    this.gctx = this.canvas.getContext('webgpu'); this.format = navigator.gpu.getPreferredCanvasFormat();
    this.gctx.configure({ device: device, format: this.format, alphaMode: 'opaque' });
    device.pushErrorScope('validation');

    // gölgelendirici derleme hataları anlaşılır çıksın diye derleme bilgisini kontrol ediyoruz | check the compile info so shader errors are readable
    async function shader(code, label) {
      var m = device.createShaderModule({ code: code, label: label }), info = await m.getCompilationInfo();
      var bad = info.messages.filter(function (x) { return x.type === 'error'; });
      if (bad.length) throw new Error(label + ' shader: ' + bad.map(function (x) { return 'line ' + x.lineNum + ': ' + x.message; }).join(' | '));
      return m;
    }
    var mSphere = await shader(WGSL_SPHERE, 'sphere'), mLine = await shader(WGSL_LINE, 'line'), mQuad = await shader(WGSL_QUAD, 'quad');

    var V = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    var bglU = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: V, buffer: { type: 'uniform' } }] });
    var bglT = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: V, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }, { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }] });
    var depthState = function (write, cmp) { return { format: 'depth24plus', depthWriteEnabled: write, depthCompare: cmp }; };
    var prim = function (topo) { return { topology: topo, cullMode: 'none' }; };
    var blend = { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
    this.pSphere = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [bglU] }),
      vertex: { module: mSphere, entryPoint: 'vs', buffers: [
        { arrayStride: 12, stepMode: 'vertex', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
        { arrayStride: 32, stepMode: 'instance', attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }, { shaderLocation: 2, offset: 16, format: 'float32x4' }] }] },
      fragment: { module: mSphere, entryPoint: 'fs', targets: [{ format: this.format }] }, primitive: prim('triangle-list'), depthStencil: depthState(true, 'less') });
    this.pLine = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [bglU] }),
      vertex: { module: mLine, entryPoint: 'vs', buffers: [{ arrayStride: 24, stepMode: 'vertex', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] }] },
      fragment: { module: mLine, entryPoint: 'fs', targets: [{ format: this.format, blend: blend }] }, primitive: prim('line-list'), depthStencil: depthState(false, 'less-equal') });
    this.pQuad = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [bglT] }),
      vertex: { module: mQuad, entryPoint: 'vs' }, fragment: { module: mQuad, entryPoint: 'fs', targets: [{ format: this.format }] }, primitive: prim('triangle-list'), depthStencil: depthState(true, 'less') });

    // küre ağı: birim küre, normal = konum olduğu için ayrı normal verisi yok | sphere mesh: a unit sphere, normal = position so no separate normals
    var LON = 12, LAT = 8, verts = [], idx = [], ix, iy;
    for (iy = 0; iy <= LAT; iy++) for (ix = 0; ix <= LON; ix++) { var th = ix / LON * 2 * Math.PI, ph = iy / LAT * Math.PI; verts.push(Math.cos(th) * Math.sin(ph), Math.cos(ph), Math.sin(th) * Math.sin(ph)); }
    for (iy = 0; iy < LAT; iy++) for (ix = 0; ix < LON; ix++) { var a = iy * (LON + 1) + ix, b = a + LON + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    this.sphIdx = idx.length;
    var buf = function (size, usage, data) { var bf = device.createBuffer({ size: Math.ceil(size / 4) * 4, usage: usage | GPUBufferUsage.COPY_DST }); if (data) device.queue.writeBuffer(bf, 0, data); return bf; };
    this.sphV = buf(verts.length * 4, GPUBufferUsage.VERTEX, new Float32Array(verts));
    this.sphI = buf(idx.length * 2, GPUBufferUsage.INDEX, new Uint16Array(idx));   // 576 indeks, bayt sayısı 4'ün katı | 576 indices, a multiple of 4 bytes
    this.instBuf = buf(this.inst.byteLength, GPUBufferUsage.VERTEX);
    // çizgi tamponu köşe başına 6 sayı (konum+renk) tutar. p dizisi parça başına 6 sayı, tampon bunun iki katı | the line buffer holds 6 numbers per vertex (position+color). The p array has 6 numbers per segment, the buffer needs twice that
    this.bg.buf = buf(this.bg.p.length * 8, GPUBufferUsage.VERTEX); this.sg.buf = buf(this.sg.p.length * 8, GPUBufferUsage.VERTEX);
    this.lineTmp = new Float32Array(Math.max(this.bg.p.length, this.sg.p.length) * 2);

    // çerçeve çizgileri | frame lines
    var frame = function (z, c) {
      var h = 1.65, k = [[-h, -h], [h, -h], [h, h], [-h, h]], d = [], i;
      for (i = 0; i < 4; i++) { var p = k[i], q = k[(i + 1) % 4]; d.push(p[0], p[1], z, c, c, c, q[0], q[1], z, c, c, c); }
      return { buf: buf(d.length * 4, GPUBufferUsage.VERTEX, new Float32Array(d)), n: 8 };
    };
    var fBoard = frame(BOARD_Z, .4), fPaper = frame(PAPER_Z, .6);

    // dokular ve örnekleyiciler | textures and samplers
    var tex = function (w, h) { return device.createTexture({ size: [w, h], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT }); };
    this.tBoard = tex(256, 256); this.tRet = tex(R, R); this.tPaper = tex(R, R);
    var linear = device.createSampler({ magFilter: 'linear', minFilter: 'linear' }), nearest = device.createSampler({ magFilter: 'nearest', minFilter: 'nearest' });

    // çizim listesi: her öğenin kendi küçük uniform tamponu var (görüş-izdüşüm matrisi + 2 parametre vektörü = 96 bayt)
    // draw list: every item has its own small uniform buffer (view-projection matrix + 2 parameter vectors = 96 bytes)
    var sunDir = [5, 8, 6, 0];
    var item = function (kind, p0, p1, extra) {
      var u = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      var o = { kind: kind, uni: u, p0: p0, p1: p1 };
      var ent = [{ binding: 0, resource: { buffer: u } }];
      if (extra) ent.push({ binding: 1, resource: extra.sampler }, { binding: 2, resource: extra.tex.createView() });
      o.bind = device.createBindGroup({ layout: extra ? bglT : bglU, entries: ent });
      return o;
    };
    var quad = function (z, half, t, s) { return item('quad', [0, 0, z, half], [0, 0, 0, 0], { tex: t, sampler: s }); };
    this.items = [
      quad(BOARD_Z, 1.5, this.tBoard, linear), quad(0, 3, this.tRet, nearest), quad(PAPER_Z, 1.5, this.tPaper, linear),
      item('sphere', sunDir, [.75, .7, 0, 0]),
      Object.assign(item('line', [1, 0, 0, 0], [0, 0, 0, 0]), { vb: fBoard.buf, n: fBoard.n }), Object.assign(item('line', [1, 0, 0, 0], [0, 0, 0, 0]), { vb: fPaper.buf, n: fPaper.n }),
      Object.assign(item('line', [this.bg.op, 0, 0, 0], [0, 0, 0, 0]), { src: this.bg }), Object.assign(item('line', [this.sg.op, 0, 0, 0], [0, 0, 0, 0]), { src: this.sg })
    ];
    this.ub = new Float32Array(24);
    var err = await device.popErrorScope(); if (err) throw new Error(err.message);
  };

  World.prototype.pp = function (p, out, o) { out[o] = ((p % R) + .5) / R * 6 - 3; out[o + 1] = 3 - (((p / R) | 0) + .5) / R * 6; out[o + 2] = 0; };
  // korteks nöronlarını retinotopik yerleştir, merkezi retinadaki yeri olsun | place cortex neurons retinotopically, the center is their spot on the retina
  World.prototype.bind = function (b) {
    for (var e = 0; e < E; e++) this.cp.set([(b.cx[e] / (R - 1) - .5) * 5.4, (.5 - b.cy[e] / (R - 1)) * 5.4, 2.2 + (e * 0.6180339) % 1 * 4.4], e * 3);
    this.sel = null; this.rf.fill(0); this.sg.n = 0; this.bg.op = .6; this.dirty.sg = true; this.info(I18N.t('i_hint'));
  };
  World.prototype.touch = function () { this.dirty.pad = true; };   // tahta değişti. Göz tuvalden doğrudan okuduğu için sıra sorunu yok | the board changed. The eye reads the canvas directly, so there is no ordering problem
  World.prototype.showWrite = function (img) {
    var x = this.wctx, d = x.createImageData(R, R), i;
    for (i = 0; i < N; i++) { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = img[i] * 255; d.data[i * 4 + 3] = 255; }
    x.putImageData(d, 0, 0); this.dirty.paper = true;
  };
  World.prototype.show = function (letter) {
    var x = this.ctx;
    x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); x.save(); x.translate(128 + rnd(-10, 10), 140 + rnd(-10, 10)); x.rotate(rnd(-.04, .04)); var k = rnd(.95, 1.05); x.scale(k, k);
    x.fillStyle = '#fff';
    if (C.MIXED_FONTS) {
      var fonts = ['Arial', 'sans-serif', 'serif', 'monospace'];
      x.font = (Math.random() < .7 ? 'bold ' : '') + '170px ' + fonts[(Math.random() * 4) | 0];
    } else {
      x.font = (Math.random() < .7 ? 'bold ' : '') + '170px Arial';
    }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(letter, 0, 0); x.restore(); this.touch();
  };
  World.prototype.clearPad = function () { this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, 256, 256); this.touch(); };
  World.prototype.info = function (t) { this.desc = t; if (this.onInfo) this.onInfo(t); };

  // renkler ve boyutlar: retina yüzeyi (gördüğü görüntü + seçili alıcı alan), korteks küreleri, isim küreleri (a = isim etkinliği)
  // colors and sizes: retina surface (the image it sees + selected receptive field), cortex spheres, name spheres (a = name activity)
  World.prototype.paint = function (b, a) {
    var d = this.rimg.data, i, e, j, sel = this.sel, I = this.inst, base;
    var im = b.img;   // gözün gördüğünün aynısı, soldaki önizlemeyle birebir. Seçili nöronun alıcı alanı beyaza çekilir | exactly what the eye sees, identical to the preview on the left. The selected neuron's receptive field is pushed to white
    for (i = 0; i < N; i++) { var g = .05 + .95 * (im ? im[i] : 0), o = this.rf[i], gg = 255 * (g * (1 - o) + o);
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = gg; d[i * 4 + 3] = 255; }
    this.rctx.putImageData(this.rimg, 0, 0); this.dirty.ret = true;
    for (e = 0; e < E; e++) {
      var u = Math.min(1, b.cnt[e] / 3), sc = sel && sel.kind === 'c' && sel.idx === e; base = e * 8;
      I[base] = this.cp[e * 3]; I[base + 1] = this.cp[e * 3 + 1]; I[base + 2] = this.cp[e * 3 + 2]; I[base + 3] = .028 * (1 + .9 * u) * (sc ? 3.2 : 1);
      if (sc) { I[base + 4] = I[base + 5] = I[base + 6] = 1; } else { I[base + 4] = .25 + .75 * u; I[base + 5] = .32 + .5 * u; I[base + 6] = .5 - .1 * u; }   // koyu mavi-gri, ateşleyince sıcak sarı | dark blue-gray, warm yellow when firing
    }
    var mx = 1e-9; for (j = 0; j < M; j++) if (a[j] > mx) mx = a[j];
    for (j = 0; j < M; j++) {
      var v = a[j] > 0 ? .3 + .7 * a[j] / mx : 0, sn = sel && sel.kind === 'n' && sel.idx === j; base = (E + j) * 8;
      I[base] = this.np[j * 3]; I[base + 1] = this.np[j * 3 + 1]; I[base + 2] = this.np[j * 3 + 2]; I[base + 3] = .05 * (1 + .6 * v) * (sn ? 2.4 : 1);
      if (sn) { I[base + 4] = I[base + 5] = I[base + 6] = 1; } else { I[base + 4] = .55 + .4 * v; I[base + 5] = .45 + .3 * v; I[base + 6] = .72 + .28 * v; }   // mor-gri, ateşleyince açık pembe-beyaz | purple-gray, pale pink-white when firing
    }
    this.dirty.inst = true;
  };

  // arka plan demetini yeniden kur, seçim varsa onu da tazele | rebuild the background bundle, and refresh the selection if there is one
  World.prototype.links = function (b) {
    var lp = this.bg.p, lc = this.bg.c, o = 0, e, q, s, used;
    for (e = 0; e < E; e++) {
      used = {};
      for (q = 0; q < NS; q++) {
        var bi = 0, bw = -1; for (s = 0; s < S; s++) { var w = b.w[e * S + s]; if (w > bw && !used[s]) { bw = w; bi = s; } }   // bw=-1: hepsi 0 olsa bile aynı sinapsı iki kez çizme | bw=-1: even if every weight is 0, never draw the same synapse twice
        used[bi] = 1; var t = Math.min(1, bw * 3); this.pp(b.px[e * S + bi], lp, o * 6); lp.set([this.cp[e * 3], this.cp[e * 3 + 1], this.cp[e * 3 + 2]], o * 6 + 3);
        lc.set([.25 * t, .25 * t, .25 * t, .7 * t, .7 * t, .7 * t], o * 6); o++;
      }
      var bk = 0; for (s = 1; s < M; s++) if (b.wa[e * M + s] > b.wa[e * M + bk]) bk = s;
      var wv = b.wa[e * M + bk], vis = wv > 2.5 / M ? Math.min(1, wv * 4) : 0;
      lp.set([this.cp[e * 3], this.cp[e * 3 + 1], this.cp[e * 3 + 2], vis ? this.np[bk * 3] : this.cp[e * 3], vis ? this.np[bk * 3 + 1] : this.cp[e * 3 + 1], vis ? this.np[bk * 3 + 2] : this.cp[e * 3 + 2]], o * 6);
      lc.set([.4 * vis, .4 * vis, .4 * vis, vis, vis, vis], o * 6); o++;
    }
    this.dirty.bg = true;
    if (this.sel) this.select(this.sel.kind, this.sel.idx, b);
  };

  // nöron seç: kind 'c' (korteks) ya da 'n' (isim), null seçimi kaldırır | select a neuron: kind 'c' (cortex) or 'n' (name), null clears the selection
  World.prototype.select = function (kind, idx, b) {
    var p = this.sg.p, c = this.sg.c, n = 0, s, j, e;
    this.rf.fill(0);
    if (!kind) { this.sel = null; this.sg.n = 0; this.bg.op = .6; this.dirty.sg = true; this.info(I18N.t('i_hint')); return; }
    this.sel = { kind: kind, idx: idx }; this.bg.op = .1;
    if (kind === 'c') {
      var mxw = 1e-9; for (s = 0; s < S; s++) mxw = Math.max(mxw, b.w[idx * S + s]);
      for (s = 0; s < S; s++) { var wn = b.w[idx * S + s] / mxw, px = b.px[idx * S + s]; this.pp(px, p, n * 6); p.set([this.cp[idx * 3], this.cp[idx * 3 + 1], this.cp[idx * 3 + 2]], n * 6 + 3);
        var q3 = .25 + .75 * wn; c.set([.3 * q3, .3 * q3, .3 * q3, q3, q3, q3], n * 6); n++; this.rf[px] = Math.max(this.rf[px], wn); }
      for (j = 0; j < M; j++) { var v = b.wa[idx * M + j]; if (v < 3 / M) continue; var t = Math.min(1, v * 8);
        p.set([this.cp[idx * 3], this.cp[idx * 3 + 1], this.cp[idx * 3 + 2], this.np[j * 3], this.np[j * 3 + 1], this.np[j * 3 + 2]], n * 6); c.set([.5 * t, .5 * t, .5 * t, t, t, t], n * 6); n++; }
      var best = 0, bv = 0; for (j = 0; j < L; j++) { var tv = b.tune(idx, j); if (tv > bv) { bv = tv; best = j; } }
      this.info(I18N.t('i_cortex', idx, S, n, bv > C.WT ? I18N.t('i_bound', LET[best], Math.round(bv * 100)) : I18N.t('i_unbound')));
    } else {
      var cnt = 0, names = [];
      for (e = 0; e < E; e++) { var v2 = b.wa[e * M + idx]; if (v2 < 3 / M) continue; var t2 = Math.min(1, v2 * 8); cnt++;
        p.set([this.np[idx * 3], this.np[idx * 3 + 1], this.np[idx * 3 + 2], this.cp[e * 3], this.cp[e * 3 + 1], this.cp[e * 3 + 2]], n * 6); c.set([t2, t2, t2, .4 * t2, .4 * t2, .4 * t2], n * 6); n++; }
      for (j = 0; j < L; j++) if (b.code[j].indexOf(idx) >= 0) names.push(LET[j]);
      this.info(I18N.t('i_name', idx, cnt, names.join(', ') || '–'));
    }
    this.sg.n = n; this.dirty.sg = true;
  };

  // kamera matrisini hesapla (çizim ve tıklama aynı matrisi kullanır) | compute the camera matrix (drawing and picking share it)
  World.prototype.camera = function (w, h) {
    var d = this.dist, t = this.target, ex = t.x + d * Math.cos(this.el) * Math.sin(this.az), ey = t.y + d * Math.sin(this.el), ez = t.z + d * Math.cos(this.el) * Math.cos(this.az);
    this.vp = mul(perspective(50 * Math.PI / 180, w / h, .1, 300), lookAt(ex, ey, ez, t.x, t.y, t.z));
    return this.vp;
  };
  // ekranda en yakın nöronu bul (küreler küçük, 14 piksel yarıçap tıklamayı kolaylaştırır) | find the nearest neuron on screen (spheres are tiny, a 14 px radius makes clicking easy)
  World.prototype.pick = function (ev) {
    var r = this.canvas.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, best = null, bd = 196, vp = this.camera(r.width, r.height), i;
    var test = function (arr, k, kind) { for (i = 0; i < k; i++) { var q = project(vp, arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]); if (q[3] <= 0 || q[2] > 1 || q[2] < 0) continue;
      var dx = (q[0] * .5 + .5) * r.width - mx, dy = (-q[1] * .5 + .5) * r.height - my, dd = dx * dx + dy * dy - (kind === 'n' ? 40 : 0); if (dd < bd) { bd = dd; best = [kind, i]; } } };
    test(this.cp, E, 'c'); test(this.np, M, 'n');
    if (this.onPick) this.onPick(best ? best[0] : null, best ? best[1] : 0);
  };
  World.prototype.drag = function () {
    var me = this, cv = this.canvas, down = false, px = 0, py = 0, sx = 0, sy = 0, moved = false;
    cv.addEventListener('pointerdown', function (e) { down = true; moved = false; px = sx = e.clientX; py = sy = e.clientY; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointerup', function (e) { down = false; if (!moved) me.pick(e); });
    cv.addEventListener('pointermove', function (e) { if (!down) return; if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 5) moved = true;
      if (!moved) return; me.az -= (e.clientX - px) * .006; me.el = Math.max(-1.2, Math.min(1.3, me.el + (e.clientY - py) * .006)); px = e.clientX; py = e.clientY; me.render(true); });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); me.dist = Math.max(4, Math.min(60, me.dist * (1 + e.deltaY * .001))); me.render(true); }, { passive: false });
  };
  // W/A/S/D kamera hedefini bakış yönüne göre kaydırır, Q/E aşağı-yukarı, Shift 3 kat hızlı. Hareket olduysa true döner.
  // W/A/S/D slide the camera target relative to the view, Q/E down/up, Shift is 3x faster. Returns true if the camera moved.
  World.prototype.move = function (dt, k) {
    var sp = this.dist * .6 * Math.min(dt, .1) * (k.shift ? 3 : 1), fx = -Math.sin(this.az), fz = -Math.cos(this.az), dx = 0, dy = 0, dz = 0;
    if (k.w) { dx += fx; dz += fz; } if (k.s) { dx -= fx; dz -= fz; }
    if (k.d) { dx -= fz; dz += fx; } if (k.a) { dx += fz; dz -= fx; }
    if (k.e) dy += 1; if (k.q) dy -= 1;
    var n = Math.sqrt(dx * dx + dy * dy + dz * dz); if (!n) return false;
    this.target.x += dx / n * sp; this.target.y += dy / n * sp; this.target.z += dz / n * sp; this.render(true); return true;
  };

  // tuvali dokuya kopyala (değişmişse) | copy a canvas into a texture (when it changed)
  World.prototype.upload = function (flag, cv, tex, w, h) {
    if (!this.dirty[flag]) return; this.dirty[flag] = false;
    this.device.queue.copyExternalImageToTexture({ source: cv }, { texture: tex }, [w, h]);
  };
  // çizgi köşelerini (konum + renk) iç içe dizip GPU tamponuna yaz | interleave the line vertices (position + color) and write them to the GPU buffer
  World.prototype.uploadLines = function (flag, ln, count) {
    if (!this.dirty[flag]) return; this.dirty[flag] = false;
    var t = this.lineTmp, p = ln.p, c = ln.c, v, nv = count * 2;
    for (v = 0; v < nv; v++) { t[v * 6] = p[v * 3]; t[v * 6 + 1] = p[v * 3 + 1]; t[v * 6 + 2] = p[v * 3 + 2]; t[v * 6 + 3] = c[v * 3]; t[v * 6 + 4] = c[v * 3 + 1]; t[v * 6 + 5] = c[v * 3 + 2]; }
    if (nv) this.device.queue.writeBuffer(ln.buf, 0, t, 0, nv * 6);
  };
  World.prototype.render = function (force) {
    if (!this.items || this.lost) return;
    var cv = this.canvas, dpr = Math.min(1.5, window.devicePixelRatio || 1), w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr)), dev = this.device, q = dev.queue;
    if (cv.width !== w || cv.height !== h) {
      cv.width = w; cv.height = h; if (this.depth) this.depth.destroy();
      this.depth = dev.createTexture({ size: [w, h], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT }); this.depthView = this.depth.createView(); force = true;
    }
    if (!force) return;
    this.upload('pad', this.cv, this.tBoard, 256, 256); this.upload('ret', this.rcv, this.tRet, R, R); this.upload('paper', this.wcv, this.tPaper, R, R);
    if (this.dirty.inst) { q.writeBuffer(this.instBuf, 0, this.inst); this.dirty.inst = false; }
    // bg: sabit sayıda çizgi. sg: seçime göre değişen sayıda | bg: a fixed number of lines. sg: a number that follows the selection
    this.uploadLines('bg', this.bg, this.bg.n); this.uploadLines('sg', this.sg, this.sg.n);
    var vp = this.camera(cv.clientWidth || w, cv.clientHeight || h), ub = this.ub, it, i;
    this.items[6].p0[0] = this.bg.op;
    for (i = 0; i < this.items.length; i++) { it = this.items[i]; ub.set(vp, 0); ub.set(it.p0, 16); ub.set(it.p1, 20); q.writeBuffer(it.uni, 0, ub); }
    var enc = dev.createCommandEncoder(), pass = enc.beginRenderPass({
      colorAttachments: [{ view: this.gctx.getCurrentTexture().createView(), clearValue: { r: .039, g: .039, b: .039, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
      depthStencilAttachment: { view: this.depthView, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' } });
    pass.setPipeline(this.pQuad);
    for (i = 0; i < 3; i++) { pass.setBindGroup(0, this.items[i].bind); pass.draw(6); }
    pass.setPipeline(this.pSphere); pass.setBindGroup(0, this.items[3].bind);
    pass.setVertexBuffer(0, this.sphV); pass.setVertexBuffer(1, this.instBuf); pass.setIndexBuffer(this.sphI, 'uint16'); pass.drawIndexed(this.sphIdx, E + M + 1);
    pass.setPipeline(this.pLine);
    for (i = 4; i < 8; i++) {
      it = this.items[i]; var vb = it.vb || it.src.buf, n = it.vb ? it.n : it.src.n * 2; if (!n) continue;
      pass.setBindGroup(0, it.bind); pass.setVertexBuffer(0, vb); pass.draw(n);
    }
    pass.end(); q.submit([enc.finish()]);
  };
  return World;
})();
