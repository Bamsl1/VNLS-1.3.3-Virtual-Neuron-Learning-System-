// Node testi: etiketsiz öğrenme + isim ilişkilendirme. Kullanım: node test.js [deneme_sayisi] [isim_orani] [seed]
// Desenler tarayıcıdaki 29 Türk harfiyle aynı: A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z
// Node test: unsupervised learning + name association. Usage: node test.js [trials] [name_rate] [seed]
// The patterns match the 29 Turkish letters used in the browser: A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z
const CFG = require('./src/config.js'); global.CFG = CFG; const Brain = require('./src/brain.js');
const LET = [...CFG.LET], NL = LET.length, R = CFG.RES;
// 5x7 nokta desenleri (Ç, Ğ, İ, Ö, Ş, Ü için 5x8), her satır 5 bitlik sayı | 5x7 dot patterns (5x8 for Ç, Ğ, İ, Ö, Ş, Ü), each row is a 5-bit number
const G = [
  [14, 17, 17, 31, 17, 17, 17],            // A
  [30, 17, 17, 30, 17, 17, 30],            // B
  [14, 17, 16, 16, 16, 17, 14],            // C
  [14, 17, 16, 16, 16, 17, 14, 4],         // Ç (sedil | cedilla)
  [30, 17, 17, 17, 17, 17, 30],            // D
  [31, 16, 16, 30, 16, 16, 31],            // E
  [31, 16, 16, 30, 16, 16, 16],            // F
  [14, 17, 16, 23, 17, 17, 15],            // G
  [8, 20, 0, 14, 17, 16, 23, 15],          // Ğ (breve)
  [17, 17, 17, 31, 17, 17, 17],            // H
  [14, 4, 4, 4, 4, 4, 14],                 // I
  [4, 0, 14, 4, 4, 4, 4, 14],              // İ (nokta | dot)
  [7, 2, 2, 2, 2, 18, 12],                 // J
  [17, 18, 20, 24, 20, 18, 17],            // K
  [16, 16, 16, 16, 16, 16, 31],            // L
  [17, 27, 21, 21, 17, 17, 17],            // M
  [17, 25, 21, 19, 17, 17, 17],            // N
  [14, 17, 17, 17, 17, 17, 14],            // O
  [10, 0, 14, 17, 17, 17, 17, 14],         // Ö (iki nokta | two dots)
  [30, 17, 17, 30, 16, 16, 16],            // P
  [30, 17, 17, 30, 20, 18, 17],            // R
  [15, 16, 16, 14, 1, 1, 30],              // S
  [15, 16, 16, 14, 1, 1, 30, 4],           // Ş (sedil | cedilla)
  [31, 4, 4, 4, 4, 4, 4],                  // T
  [17, 17, 17, 17, 17, 17, 14],            // U
  [10, 0, 17, 17, 17, 17, 17, 14],         // Ü (iki nokta | two dots)
  [17, 17, 17, 17, 17, 10, 4],             // V
  [17, 17, 10, 4, 4, 4, 4],                // Y
  [31, 1, 2, 4, 8, 16, 31]                 // Z
];
// seed'li RNG: aynı seed aynı deney demek (Math.random değişir, Brain de aynı diziyi kullanır) | seeded RNG: same seed, same experiment (replaces Math.random, Brain uses the same stream)
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SEED = +(process.env.SEED || process.argv[4] || 1) | 0; Math.random = mulberry32(SEED);
function img(k) { const im = new Float32Array(R * R), rows = G[k].length, s = 6 + Math.floor(Math.random() * 3), dx = Math.floor(Math.random() * 9) - 4, dy = Math.floor(Math.random() * 9) - 4, ox = 64 - ((5 * s / 2) | 0) + dx, oy = 64 - ((rows * s / 2) | 0) + dy;
  G[k].forEach((row, y) => { for (let x = 0; x < 5; x++) if (row >> (4 - x) & 1) for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) if (Math.random() > .04) im[(oy + y * s + a) * R + ox + x * s + b] = 1; }); return im; }
const NT = +process.argv[2] || 3000, PN = +process.argv[3] || .3, br = new Brain(); let t0 = Date.now();
const ever = new Uint32Array(CFG.E);   // hangi korteks nöronu hiç ateşledi? (ölü nöron ölçümü) | which cortex neurons ever fired? (dead neuron count)
// Ölçüm ayrı bir RNG kullanır, böylece ara testler eğitimin rastgele akışını bozmaz. | Evaluation uses its own RNG so the intermediate checks don't disturb the training stream.
const trainRnd = Math.random, evalRnd = mulberry32((SEED ^ 0x9e3779b9) | 0);
function evalAcc(n) { Math.random = evalRnd; let ok = 0;
  try { for (let i = 0; i < n; i++) { const k = (Math.random() * NL) | 0; br.present(img(k), false); const sc = br.name(); let w = 0; sc.forEach((v, j) => { if (v > sc[w]) w = j; }); if (sc[w] > 0 && w == k) ok++; } }
  finally { Math.random = trainRnd; }
  return ok / n; }
for (let n = 1; n <= NT; n++) {
  const k = (Math.random() * NL) | 0; const cnt = br.present(img(k), true); for (let e = 0; e < CFG.E; e++) if (cnt[e] > 0) ever[e]++; if (Math.random() < PN) br.teach(k);
  if (n % 1000 == 0 || n == NT) {
    let act = 0, spikes = 0; for (let e = 0; e < CFG.E; e++) { if (cnt[e] > 0) { act++; spikes += cnt[e]; } }
    const acc = evalAcc(200);
    console.log(`deneme ${n} (seed ${SEED}): isim dogrulugu %${(acc * 100) | 0} (sans %${(100 / NL) | 0}) | son gosterimde ${spikes} spike, ${act} noron | ${((Date.now() - t0) / n).toFixed(1)} ms/deneme`);
  }
}
let dead = 0; for (let e = 0; e < CFG.E; e++) if (ever[e] === 0) dead++;
console.log(`hic ateslemeyen noron: ${dead}/${CFG.E} (%${(dead / CFG.E * 100).toFixed(1)})`);
let sumMin = 1e9, sumMax = 0; for (let e = 0; e < CFG.E; e++) { let t = 0; for (let s = 0; s < CFG.S; s++) t += br.w[e * CFG.S + s]; if (t < sumMin) sumMin = t; if (t > sumMax) sumMax = t; }
console.log(`sinaps agirlik toplami: min ${sumMin.toFixed(3)}, max ${sumMax.toFixed(3)} (hedef ${CFG.WSUM})`);

// Beyin yazıyor mu? Her harfi yazdır, kendi yazısını okuyabiliyor mu? | Does the brain write? Make it draw every letter, can it read its own drawing?
let sr = 0, show = process.env.SHOW || 'AÇĞİÖŞÜ'; const cell = 4;
for (let k = 0; k < NL; k++) { const g = br.write(k, +process.env.TOP || 20); br.present(g, false); const sc = br.name(); let w = 0; sc.forEach((v, j) => { if (v > sc[w]) w = j; }); if (sc[w] > 0 && w == k) sr++;
  if (show.includes(LET[k])) { console.log('--- yazdigi:', LET[k], '-> okudu:', w >= 0 ? LET[w] : '-'); for (let y = 24; y < 104; y += cell * 2) { let r = ''; for (let x = 24; x < 104; x += cell) { let m = 0; for (let a = 0; a < cell * 2; a++) for (let b = 0; b < cell; b++) m = Math.max(m, g[(y + a) * R + x + b]); r += m > .6 ? '#' : m > 0 ? '+' : '.'; } console.log(r); } } }
console.log(`kendi yazisini okuma: %${(sr / NL * 100) | 0} (sans %${(100 / NL) | 0})`);
