// Dil desteği: Türkçe ve İngilizce metinler burada. Seçim localStorage'da saklanır.
// Language support: Turkish and English strings live here. The choice is saved in localStorage.
// Kullanım / usage:  I18N.t('anahtar', arg0, arg1)  ->  metindeki {0}, {1} yerine argümanlar konur / fills {0}, {1}
var I18N = (function () {
  var D = {
    tr: {
      full: 'Sanal Nöron Öğrenme Sistemi', lang_label: 'Dil / Language', collapse: 'Paneli aç / kapat',
      sec_images: 'Görüntüler', sec_status: 'Durum', sec_controls: 'Kontroller', sec_settings: 'Ayarlar',
      cap_retina: 'gözün gördüğü: 128×128 piksel, her kare bir retina nöronu', cap_pad: 'tahta (elle modda yaz)', cap_wr: 'beynin çizdiği (hayal ettiği)',
      r_shown: 'Gösterilen', r_ans: 'Beynin cevabı', r_sr: 'Kendi yazısını okudu', r_gaze: 'Bakış kayması (sakkad)', r_n: 'Deneme', r_acc: 'İsim doğruluğu',
      b_pause: 'Durdur', b_resume: 'Devam et', b_mode_auto: 'Mod: otomatik', b_mode_manual: 'Mod: elle yaz',
      b_speed_0: 'Hız: yavaş', b_speed_1: 'Hız: hızlı', b_speed_2: 'Hız: ultra', b_teach_on: 'İsim öğretmeni: açık', b_teach_off: 'İsim öğretmeni: kapalı',
      b_fonts_on: 'Karışık font: açık', b_fonts_off: 'Karışık font: kapalı', b_clear: 'Tahtayı temizle', b_reset: 'Beyni sıfırla',
      b_sreload: 'Sayfayı yenile (boyut ayarları için)', b_sdef: 'Varsayılan ayarlara dön',
      hint1: 'sürükle: döndür · tekerlek: yakınlaş · nörona tıkla: bağlantılar', hint2: 'fare sahnedeyken W/A/S/D: gez, Q/E: aşağı-yukarı, Shift: hızlı · başlığa çift tık: paneli sıfırla',
      acc_fmt: '{0}% (son {1})',
      m_taught: 'Öğretildi: {0} — beyin yazdı', m_manual: 'Pad’e harf çiz, sonra klavyeden adını yaz.',
      m_paused: 'Durduruldu: beyin o anı çizdi. Otomatik deneme ve öğrenme bekliyor; elle yazabilir, harf adını öğretebilirsin.',
      m_fonts_on: 'Rastgele font ailesi aktif', m_fonts_off: 'Tek temiz Arial fontu aktif',
      i_hint: 'Bir nörona tıkla: bağlantılarını gör.',
      i_cortex: 'Korteks nöronu #{0} · {1} girdi sinapsı (retinada beyaz) · {2} çizgi · {3} · yanal baskılama: tüm korteks nöronlarına',
      i_bound: 'en çok bağlı olduğu isim kodu: {0} (%{1})', i_unbound: 'henüz belirli bir isim koduna bağlanmadı',
      i_name: 'İsim nöronu #{0} · {1} korteks nöronuna bağlı · şu harflerin kodunda yer alıyor: {2} (tek harfe ait değil: dağınık kod)',
      g_percep: 'Algı ve öğrenme', g_names: 'İsim öğrenme', g_write: 'Yazma / hayal', g_eye: 'Göz', g_ui: 'Arayüz',
      g_struct: 'Yapı: "Beyni sıfırla" ile uygulanır', g_size: 'Boyut: sayfa yenilenince uygulanır',
      s_T: 'Adım sayısı (T)', s_PIN: 'Girdi spike olasılığı', s_THR: 'Ateşleme eşiği', s_INH: 'Yanal baskılama', s_ETA: 'STDP hızı', s_GROW: 'Yeni sinaps / gösterim',
      s_HB: 'Homeostaz hızı', s_HT: 'Homeostaz hedef oranı', s_AL: 'İsim öğrenme hızı', s_REHEARSE: 'Öğretirken tekrar sayısı', s_NEG: 'Karşıt (anti-Hebb) ceza',
      s_WT: 'İsim eşiği', s_WR: 'Sinaps izi yarıçapı', s_WS: 'Zayıf sinaps eşiği', s_WP: 'Normalize yüzdeliği', s_WCUT: 'Zayıf yankı kesimi',
      s_FIXATE: 'Bakışı şekle çevir (sakkad): 0 kapalı, 1 açık', s_ZOOM: 'Yakınlaşma hedefi (piksel, 0 kapalı)', s_LIVE_MS: 'Canlı bakış aralığı (ms)', s_BUDGET_MS: 'Ultra mod bütçesi (ms)',
      s_CODE: 'İsim kodu uzunluğu', s_WIN: 'Görme penceresi yarıçapı', s_WSUM: 'Toplam sinaps ağırlığı', s_E: 'Korteks nöron sayısı', s_S: 'Sinaps / nöron', s_M: 'İsim nöron sayısı',
      n_pending: 'Bekleyen: {0} → "Beyni sıfırla" ile uygulanır. ', n_reload: 'Boyut değişti → sayfayı yenile.',
      e_nogpu: 'Bu tarayıcıda WebGPU yok ya da kapalı. WebGPU destekleyen güncel bir tarayıcı kullan (örneğin Chrome veya Edge) ve sayfayı https ya da localhost üzerinden aç.',
      e_gpu: 'WebGPU hatası: {0}'
    },
    en: {
      full: 'Virtual Neuron Learning System', lang_label: 'Dil / Language', collapse: 'Collapse / expand panel',
      sec_images: 'Images', sec_status: 'Status', sec_controls: 'Controls', sec_settings: 'Settings',
      cap_retina: 'what the eye sees: 128×128 pixels, each square is one retina neuron', cap_pad: 'board (draw here in manual mode)', cap_wr: 'drawn by the brain (imagined)',
      r_shown: 'Shown', r_ans: "Brain's answer", r_sr: 'Read its own drawing', r_gaze: 'Gaze shift (saccade)', r_n: 'Trials', r_acc: 'Name accuracy',
      b_pause: 'Pause', b_resume: 'Resume', b_mode_auto: 'Mode: automatic', b_mode_manual: 'Mode: draw by hand',
      b_speed_0: 'Speed: slow', b_speed_1: 'Speed: fast', b_speed_2: 'Speed: ultra', b_teach_on: 'Name teacher: on', b_teach_off: 'Name teacher: off',
      b_fonts_on: 'Mixed fonts: on', b_fonts_off: 'Mixed fonts: off', b_clear: 'Clear board', b_reset: 'Reset brain',
      b_sreload: 'Reload page (for size settings)', b_sdef: 'Restore default settings',
      hint1: 'drag: rotate · wheel: zoom · click a neuron: connections', hint2: 'mouse over the scene: W/A/S/D move, Q/E down/up, Shift faster · double-click the title: reset panel',
      acc_fmt: '{0}% (last {1})',
      m_taught: 'Taught: {0} — the brain drew it', m_manual: 'Draw a letter on the board, then type its name on the keyboard.',
      m_paused: 'Paused: the brain drew this moment. Automatic trials and learning are on hold; you can still draw by hand and teach letter names.',
      m_fonts_on: 'Random font families on', m_fonts_off: 'Single clean Arial font on',
      i_hint: 'Click a neuron to see its connections.',
      i_cortex: 'Cortex neuron #{0} · {1} input synapses (white on the retina) · {2} lines · {3} · lateral inhibition: to all cortex neurons',
      i_bound: 'strongest name code: {0} ({1}%)', i_unbound: 'not tied to a specific name code yet',
      i_name: 'Name neuron #{0} · connected to {1} cortex neurons · part of the codes of: {2} (not tied to one letter: distributed code)',
      g_percep: 'Perception and learning', g_names: 'Name learning', g_write: 'Drawing / imagination', g_eye: 'Eye', g_ui: 'Interface',
      g_struct: 'Structure: applied on "Reset brain"', g_size: 'Size: applied after reload',
      s_T: 'Steps per presentation (T)', s_PIN: 'Input spike probability', s_THR: 'Firing threshold', s_INH: 'Lateral inhibition', s_ETA: 'STDP rate', s_GROW: 'New synapses / presentation',
      s_HB: 'Homeostasis rate', s_HT: 'Homeostasis target rate', s_AL: 'Name learning rate', s_REHEARSE: 'Rehearsals when teaching', s_NEG: 'Opposing (anti-Hebb) penalty',
      s_WT: 'Name threshold', s_WR: 'Synapse footprint radius', s_WS: 'Weak synapse threshold', s_WP: 'Normalization percentile', s_WCUT: 'Weak echo cutoff',
      s_FIXATE: 'Turn gaze to shape (saccade): 0 off, 1 on', s_ZOOM: 'Zoom target (pixels, 0 = off)', s_LIVE_MS: 'Live look interval (ms)', s_BUDGET_MS: 'Ultra mode budget (ms)',
      s_CODE: 'Name code length', s_WIN: 'Vision window radius', s_WSUM: 'Total synapse weight', s_E: 'Cortex neurons', s_S: 'Synapses / neuron', s_M: 'Name neurons',
      n_pending: 'Pending: {0} → applied with "Reset brain". ', n_reload: 'Size changed → reload the page.',
      e_nogpu: 'WebGPU is missing or turned off in this browser. Use a recent browser that supports WebGPU (for example Chrome or Edge) and open the page over https or localhost.',
      e_gpu: 'WebGPU error: {0}'
    }
  }, lang = 'tr', listeners = [];

  // kayıtlı dil, yoksa tarayıcı dili (Türkçe değilse İngilizce) | saved language, else the browser language (English unless Turkish)
  try {
    var saved = typeof localStorage !== 'undefined' && localStorage.getItem('vnls_lang');
    if (saved && D[saved]) lang = saved;
    else if (typeof navigator !== 'undefined' && navigator.language && !/^tr/i.test(navigator.language)) lang = 'en';
  } catch (e) {}

  function t(key) {
    var s = (D[lang] && D[lang][key]) || D.tr[key] || key;
    for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]);
    return s;
  }
  // sayfadaki sabit metinleri (data-i18n) güncelle | refresh the static texts in the page (data-i18n)
  function apply() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    document.documentElement.lang = lang;
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), function (el) { el.title = t(el.getAttribute('data-i18n-title')); });
  }
  function set(l) {
    if (!D[l]) return;
    lang = l; try { localStorage.setItem('vnls_lang', l); } catch (e) {}
    apply(); listeners.forEach(function (f) { f(); });
  }
  function onChange(f) { listeners.push(f); }
  return { t: t, set: set, apply: apply, onChange: onChange, get lang() { return lang; } };
})();
