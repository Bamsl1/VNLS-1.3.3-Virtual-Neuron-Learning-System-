// Ortak ayarlar, tarayıcıda da Node testlerinde de aynı dosya kullanılır.
// Shared settings. The same file is used in the browser and in the Node tests.
var CFG = {
  VERSION: '1.3.3',      // her sürümde artır, zip adı ve panel başlığı buradan gelir | bump on every release, the zip name and panel title come from here
  RES: 128,            // retina: 128x128 = 16384 nöron | retina: 128x128 = 16384 neurons
  LET: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ', // Türk alfabesi, 29 harf | Turkish alphabet, 29 letters
  MARGIN: 28, WIN: 20, // korteks nöronlarının yerleşebileceği kenar boşluğu, görme penceresi yarıçapı (piksel) | margin for cortex neuron centers, vision window radius (pixels)
  M: 256, CODE: 8,     // isim nöronu sayısı, her harfin kodundaki nöron sayısı | number of name neurons, neurons in each letter's code
  E: 3000,             // korteks nöronu sayısı. Ölçümde doğruluk 3000'de tavan yapıyor | cortex neurons. In our runs accuracy tops out around 3000
  S: 150,              // nöron başına sinaps. Başta rastgele, sonra kendileri kurar | synapses per neuron. Random at first, then they rewire themselves
  T: 50,               // bir gösterimdeki adım sayısı | steps per presentation
  PIN: 0.3,            // beyaz pikselin adım başına spike olasılığı | spike chance of a white pixel per step
  TRD: 0.9,            // girdi izinin sönümü | decay of the input trace
  LEAK: 0.9, THR: 8, REF: 3, INH: 6,   // sızıntı, eşik, dinlenme süresi, yanal baskılama | leak, threshold, refractory steps, lateral inhibition
  THP: 0.5, THD: 0.999,                // uyum eşiği: ateşleyen zorlaşır, zamanla gevşer | adaptive threshold: firing makes a neuron pickier, it relaxes over time
  ETA: 0.01, XTAR: 0.1, WMAX: 1, WSUM: 12,  // STDP hızı, hedef iz, en büyük ağırlık, toplam ağırlık | STDP rate, target trace, max weight, total weight
  GROW: 2,             // kazanan nöronun bir gösterimde yenileyebileceği en çok sinaps | most synapses a winning neuron may rebuild per presentation
  WT: 0.35, WR: 1, WCUT: 0.1, WS: 0.3, WP: 0.95,  // yazma: isim eşiği, iz yarıçapı, zayıf yankı kesimi, zayıf sinaps eşiği, normalize yüzdeliği | drawing: name threshold, footprint radius, weak echo cutoff, weak synapse threshold, normalize percentile
  AL: 0.1, NEG: 0.003, // isim öğrenme hızı, karşıt (anti-Hebb) ceza. İkisi dengede kalsın ki uzun çalışmada ağırlıklar erimesin: AL×CODE ≈ NEG×(M−CODE) | name learning rate, opposing (anti-Hebb) penalty. Keep them balanced so weights don't melt in long runs
  HB: 0.25, HT: 0.05, HMAX: 1.5,  // homeostaz: hız, hedef spike oranı, sınır. Sessiz nöronun eşiğini düşürür | homeostasis: rate, target spike rate, limit. Lowers the threshold of silent neurons
  REVIVE: 0,           // bu kadar sunumdur ateşlemeyen nöronun alıcı alanı yenilenir, 0 = kapalı (agresif olunca doğruluk düşüyordu) | rebuild a neuron's field after this many silent presentations, 0 = off (too aggressive hurt accuracy)
  MULT: 0,             // isim okurken paylaşılan nöronları çokluğa böl, 1 = açık (ölçümde doğruluğu düşürdü) | divide shared name neurons by their multiplicity when reading, 1 = on (it hurt accuracy)
  MIXED_FONTS: 0,      // 1 = rastgele font ailesi, 0 = tek temiz Arial (varsayılan kapalı) | 1 = random font family, 0 = one clean Arial (off by default)
  ZOOM: 56,            // sakkaddan sonra şeklin uzun kenarı kaç piksel olsun, 0 = yakınlaşma yok | long side of the shape in pixels after the saccade, 0 = no zoom
  REHEARSE: 6,         // harf adı öğretilince çizim kaç kez küçük varyasyonla tekrarlansın, 0 = hiç | how many slightly varied replays when a name is taught, 0 = none
  FIXATE: 1,           // 1 = göz önce çevreden bakar, sonra şeklin ortasına döner (sakkad), 0 = sabit bakış | 1 = the eye looks first, then turns to the middle of the shape (saccade), 0 = fixed gaze
  LIVE_MS: 100,        // elle çizerken canlı bakış aralığı (ms) | live look interval while drawing by hand (ms)
  BUDGET_MS: 40        // ultra modda kare başına deneme bütçesi (ms) | per-frame trial budget in ultra mode (ms)
};
// Panelden değişen ayarlar localStorage'da durur ve açılışta buraya yazılır. | Settings changed in the panel live in localStorage and get applied here on startup.
try { if (typeof localStorage !== 'undefined') { var __o = JSON.parse(localStorage.getItem('vnls_cfg') || '{}'); for (var __k in __o) if (__k in CFG && typeof CFG[__k] === 'number' && typeof __o[__k] === 'number') CFG[__k] = __o[__k]; } } catch (__e) {}
if (typeof module !== 'undefined') module.exports = CFG;
