# Sürüm notları

*English:* [*CHANGELOG.md*](CHANGELOG.md)*. Her sürümde `src/config.js` içindeki `VERSION` artırılır; zip adı `vnls\\\\\\\_v<sürüm>` olur.*

## 1.3.3

* Sürüm numaralandırması 1.3.3'ten yeniden başladı. Aşağıdaki numaralar (1.0'dan 3.3'e) önceki prototipe ait ve geçmiş olarak duruyor.
* 3D görünüm artık three.js yerine doğrudan WebGPU kullanıyor: kendi matris matematiğimiz, üç WGSL gölgelendirici, örnekli küreler, çizgi ve dokulu yüzey boru hatları ve derinlik tamponu. `vendor/three.min.js` kalktı.
* Retina artık pikselleri GPU'dan geri okumuyor (WebGPU'da bu asenkron). Tahtaya aynı perspektif kamerayla bakıyor ve tahta tuvalini CPU'da, piksel başına 2x2 alt örnekle örnekliyor. Sakkad, yakınlaşma ve önizleme eskisi gibi çalışıyor.
* WebGPU yoksa ya da hata verirse sayfa nedenini ekranda gösteriyor (Türkçe ve İngilizce).
* Adı Sanal Nöron Öğrenme Sistemi (Virtual Neuron Learning System) oldu.
* Lisans PolyForm Strict 1.0.0 oldu, `LICENSE-INFO.md` iki dilde açıklıyor.
* Düzeltme: Durdur'dayken bir nöron seçince ekran hemen yenileniyor.
* Yazılım GPU'lu başsız Chromium'da kontrol edildi: gölgelendiriciler derleniyor, doğrulama hatası yok, nöron seçme, seçim çizgileri, durdurulmuşken elle çizim, dil değişimi ve ultra mod çalışıyor.

## 3.3

* Proje adı VNLS (Virtual Neuron Learning Simulation / Sanal Nöron Öğrenme Simülasyonu, sonradan Sistemi oldu) oldu.
* İngilizce ve Türkçe arayüz, Ayarlar → Dil'den seçilir ve tarayıcıda hatırlanır. Panel metinleri, mesajlar ve nöron açıklamaları `src/i18n.js` üzerinden geçer.
* Kod yorumları ve dokümanlar iki dilli. README ve sürüm notları iki dilde var.
* Kayıtlı ayarlar `gorus\\\\\\\_\\\\\\\*` yerine `vnls\\\\\\\_\\\\\\\*` anahtarlarına taşındı, eski sürümlerde kaydedilen ayarlar okunmaz.

## 3.2

* Yakınlaşma (`ZOOM`): sakkaddan sonra görüş alanı, şeklin uzun kenarı hep aynı boyda olacak şekilde ölçeklenir. El yazısı benzeri bozulmada %41'den %51'e (Node taklidi).
* Prova (`REHEARSE`): ad öğretilince çizim küçük kayma, dönme ve ölçeklerle birkaç kez tekrar edilir. Küçük testte tek örnek %75, altı provayla %92.
* Havuzlama denendi, işe yaramadı (%55'ten %56'ya), dışarıda bırakıldı. `analiz.js`'e `WARP`, `NORM`, `CEN`, `POOL` ve `EV` eklendi.

## 3.1

* Sakkad: göz bakar, parlak şeklin ağırlık merkezini bulur, oraya döner ve ikinci bakışı ortadan alır. Node'da isim doğruluğu yaklaşık %48'den %89'a. Kapatılabilir (`FIXATE`).
* `analiz.js`: hataların nerede toplandığını ve aynı korteks etkinliğinden denetimli bir okuyucunun nereye varabildiğini gösteren tanı aracı.
* Bulgular: sınır isim bağlama değil temsildi; Türkçe işaretli harfler sorun değildi; rekabeti gevşetmek işe yaramadı.

## 3.0

* Panel: sürükle, boyutlandır, kapat, durumu hatırla. Kaydırıcılı ayarlar bölümü, tarayıcıda saklanır.
* Sahnede gezinmek için W/A/S/D (Q/E ve Shift ile birlikte).
* Beyin, sen çizerken gördüğünü yeniden çizer (`Brain.imagine`), durdurduğunda da.

## 2.9

* `present` yaklaşık 4 kat hızlandı (3000 nöronla 79 ms → 20 ms), piksel→sinaps indeksi sayesinde. Sonuçlar eski kodla aynı.
* Ultra mod kare başına zaman bütçesi kullanır, sayfa artık donmaz.

## 2.8

* Durdur düğmesi ve elle çizerken canlı bakış.

## 2.7

* İsim nöronları 64'ten 256'ya, korteks 600'den 3000 nörona çıktı.
* `teach()` içindeki karşıt (anti-Hebb) terim harf kodlarını birbirinden ayırır, uzun çalışmada ağırlıkların erimesini önler.

## 2.6

* Göz artık tahta çerçevesini ve göz küresini görmüyor (dekor ayrı katmana alındı).
* Ölü nöronlara karşı homeostatik eşik kayması. Çizim normalizasyonu, elle moddaki tuş yarışı ve `writeBack` sonrası retina önizlemesi düzeltildi. Testte 29 Türk harfi. three.js artık yerel olarak `vendor/` içinde.

## 2.5 ve öncesi

* 2.5: kod satırını yutan bir yorum düzeltildi. 2.4: net retina yüzeyi, renkli nöronlar, sürüm numaraları. 2.3: daha küçük küreler, görünür sinapslar, gri-beyaz-siyah tema. 2.2: düz retina, küre nöronlar, tıklayınca bağlantılar, dağınık isim kodu. 2.1: doku yenileme hatası giderildi, beyin çizmeyi öğrendi. 2.0: etiketsiz öğrenen spiking korteks, 16384 retina nöronu, 29 harf.

## 1.0

* İlk sürüm: sabit tek beyin, 4 harf, ödüllü Hebb/delta kuralı.

