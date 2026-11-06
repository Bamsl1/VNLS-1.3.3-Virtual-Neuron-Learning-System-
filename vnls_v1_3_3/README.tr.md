# VNLS: Sanal Nöron Öğrenme Sistemi

*English name: Virtual Neuron Learning System.* [*English README*](README.md)

Prototip 1 (v1.3.3). Küçük bir spiking "korteks", sanal bir gözle baktığı Türk alfabesinin 29 harfini tanımayı öğreniyor. Hepsi tarayıcıda çalışıyor. Ona şeklin ne olduğunu kimse söylemiyor, özellikleri kendi buluyor, harf adları sonradan bağlanıyor.

## Geliştirme ve yapay zekâ desteği

VNLS, bir yapay zekâ asistanıyla (Anthropic'in Claude'u) ve birkaç diğer yapay zeka modelleri ile birlikte geliştirildi. Yapay zekâ kodun, yorumların ve dokümanların yazılmasına yardım etti. Yön ,algoritma tasarımı ,uı tasarımı ,gereksinimler ,tarayıcıda deneme vb... proje geliştiricisi tarafından yapıldı. Yapay zekânın yazdığı kodda hata olabilir. Aşağıdaki doğruluk sayıları bağımsız bir değerlendirmeden değil, bu projenin kendi Node deneylerinden geliyor.

## Ne yapıyor

* 3D bir sahne: tahta, göz, 128×128 retina, 3000 korteks nöronu ve 256 isim nöronu. Nöronlar küre, sinapslar çizgi. Bir nörona tıklayınca neye bağlı olduğunu görebilirsin. Sahne, hiçbir grafik kütüphanesi olmadan doğrudan WebGPU ile çiziliyor.
* Nöronlar spike atıyor. STDP ile öğreniyorlar, yanal baskılamayla yarışıyorlar, kendi sinapslarını budayıp yeniden kuruyorlar.
* İsimler harf başına tek nöron yerine dağınık bir kodla tutuluyor (birkaç isim nöronunun deseni).
* Göz hareket ediyor. Bir kez bakıyor, şekli buluyor, ona dönüyor ve yaklaşıyor. Böylece korteks harfi hep ortada ve benzer boyda görüyor.
* Beyin çizebiliyor. Şu an gördüğünü ya da adını verdiğin bir harfi yeniden çiziyor.
* Sen de çizebilirsin. Elle moda geç, tahtaya çiz, harfin tuşuna basıp adını öğret.
* Arayüz Türkçe ve İngilizce (Ayarlar → Dil).

## Çalıştırma

`index.html` dosyasını WebGPU destekleyen bir tarayıcıda aç. Derleme yok, kurulacak bir şey yok. GitHub Pages'te ya da yerel bir web sunucusundan da çalışır (WebGPU güvenli bağlam ister: `https`, `localhost` ya da `file://`).

Güncel Chrome ve Edge'de WebGPU var; Safari ve Firefox'ta sürüme ve platforma bağlı. WebGPU yoksa sayfa sessizce bozulmak yerine bunu söyler.

Tarayıcısız öğrenme deneyleri için Node 18 ya da üstü gerekir: `npm run beyin-testi`.

## Ne kadar iyi çalışıyor?

Bu sayılar tarayıcıda insanların çizdiği harflerden değil, Node'da bitmap harflerle yapılan koşulardan geliyor (29 sınıf, şans yaklaşık %3). Kaba rakamlar olarak düşün.

|Kurulum|İsim doğruluğu|
|-|-|
|Temiz harfler, sabit bakış|yaklaşık %48|
|Temiz harfler, sakkad (göz şekle dönüyor)|yaklaşık %89|
|El yazısı benzeri bozulma, sadece sakkad|yaklaşık %41|
|... artı yakınlaşma|yaklaşık %51|
|... artı bozulmuş örneklerle öğrenme|yaklaşık %55-57|

İşe yaramayan iki deneme: korteksi büyütmek (1500, 3000 ve 6000 nöron hep %55-59 çıktı) ve retina çıktısını havuzlamak.

Karşılaştırma için: geri yayılımla eğitilen düz, tek gizli katmanlı bir ağ, aynı bozuk görüntülerde 2500 örnekten %93'e ulaştı. Yani amaç sadece doğruluksa yol bu değil. VNLS'nin amacı öğrenme biçimi: etiketsiz, spike tabanlı, geri yayılım yok.

## Ne olmadığı

Beyinden esinlenmiş, bir beyin simülasyonu değil. Öğrenme fikirleri (spike, STDP, yarışma, yeniden kablolama, dağınık kod, göz hareketi) biyolojiye yakın. Mimari ve ölçek değil: hiyerarşi yerine tek korteks katmanı, 3000 nöron, gerçek retina yerine kamera modeli, ve göz hareketini sinir devresi değil düz kod hesaplıyor. Çizgi, eğri ve köşeleri öğrenen ikinci bir korteks katmanı bariz sonraki adım. Mevcut hâli, denetimli okuyucuyla bile el yazısı benzeri girdide %60 civarında tavan yapıyor.

WebGPU çizimi, yazılım adaptörlü başsız Chromium'da, kare GPU'dan geri okunarak kontrol edildi. Karenin gerçek GPU'yla gerçek ekrana verilmesi standart WebGPU, ama her tarayıcıda doğrulanmadı.

## Paneli kullanma

* **Durdur**, otomatik denemeleri ve öğrenmeyi durdurur. Elle çizim ve isim öğretme durdurulmuşken de çalışır.
* **Mod**, otomatik (rastgele harf) ve elle (sen çizersin) arasında geçiş yapar.
* **Hız** yavaş, hızlı ve ultra. Ultra, kare başına zaman bütçesi kullanır, sayfa donmaz.
* **Ayarlar**, öğrenme parametreleri için kaydırıcılar içerir. Bazıları hemen, bazıları "Beyni sıfırla" ile, boyut ayarları sayfa yenilenince uygulanır. Hepsi tarayıcıda saklanır.
* Panel başlığından sürüklenir, köşesinden boyutlandırılır, kapatılabilir. Başlığa çift tıklayınca sıfırlanır.
* Fare sahnenin üstündeyken W/A/S/D kamerayı oynatır, Q/E aşağı-yukarı, Shift daha hızlı. Fare panelin üstündeyken elle modda harf tuşları adı öğretir.

## Dosyalar

|Yol|Ne|
|-|-|
|`index.html`|sayfa ve panel|
|`src/config.js`|bütün ayarlar tek yerde|
|`src/brain.js`|nöronlar, STDP, yeniden kablolama, isimler, çizim|
|`src/retina.js`|göz: kamera modeli, sakkad, yakınlaşma|
|`src/world.js`|WebGPU ile 3D sahne: gölgelendiriciler, küreler, çizgiler, kamera|
|`src/ui.js`|panel davranışı ve ayarlar|
|`src/i18n.js`|Türkçe ve İngilizce metinler|
|`src/main.js`|ana döngü ve düğmeler|
|`test.js`, `analiz.js`|tarayıcısız öğrenme deneyi ve doğruluk tanı aracı (yukarıdaki sayıları bunlar üretti, test paketi değiller)|
|`LICENSE`, `LICENSE-INFO.md`|lisans ve iki dilde sade açıklaması|

Kod yorumları iki dilli: önce Türkçe, sonra `|` işaretinden sonra (ya da iki satırlık bloğun ikinci yarısında) İngilizce.

## Kaynaklar

Yalnızca ilk makale tasarım referansı olarak kullanıldı, mimari onu izliyor. Diğerleri fikirlerin arka planı, okuyanlar takip edebilsin diye listelendi. Kendi çalışmalarında atıf yapmadan önce ayrıntıları aslından kontrol et.

**Tasarım referansı**

* Diehl, P. U., \& Cook, M. (2015). Unsupervised learning of digit recognition using spike-timing-dependent plasticity. *Frontiers in Computational Neuroscience, 9*, 99. https://doi.org/10.3389/fncom.2015.00099
İz tabanlı STDP, nöronlar arası yanal baskılama, uyumlu ateşleme eşikleri ve etiketsiz öğrenmeden sonra etiket bağlama.

**Arka plan**

* Hebb, D. O. (1949). *The Organization of Behavior*. Wiley. (Hebb öğrenmesi, isim bağlarında kullanıldı.)
* Hubel, D. H., \& Wiesel, T. N. (1962). Receptive fields, binocular interaction and functional architecture in the cat's visual cortex. *The Journal of Physiology, 160*(1), 106-154. (Alıcı alanlar.)
* Markram, H., Lübke, J., Frotscher, M., \& Sakmann, B. (1997). Regulation of synaptic efficacy by coincidence of postsynaptic APs and EPSPs. *Science, 275*(5297), 213-215. (Spike zamanlamasına bağlı plastisite.)
* Bi, G., \& Poo, M. (1998). Synaptic modifications in cultured hippocampal neurons: dependence on spike timing, synaptic strength, and postsynaptic cell type. *The Journal of Neuroscience, 18*(24), 10464-10472. (Spike zamanlamasına bağlı plastisite.)
* Turrigiano, G. G., \& Nelson, S. B. (2004). Homeostatic plasticity in the developing nervous system. *Nature Reviews Neuroscience, 5*(2), 97-107. (Homeostatik eşik kaymasının arkasındaki fikir.)
* Izhikevich, E. M. (2003). Simple model of spiking neurons. *IEEE Transactions on Neural Networks, 14*(6), 1569-1572. (En eski prototiplerde kullanıldı; şimdiki sürüm sızıntılı entegre-ateşle nöronlarını kullanıyor.)
* Rumelhart, D. E., Hinton, G. E., \& Williams, R. J. (1986). Learning representations by back-propagating errors. *Nature, 323*, 533-536. (Yukarıdaki karşılaştırma ağı.)

# Kullanılan Algoritma

Bu proje iki ayrı şey öğreniyor: şekilleri (etiketsiz) ve şekillerin adlarını (isim söylenince). Kodu okuyup yazıyorum, parametre değerleri varsayılanlar.



1\) Şekilleri öğrenme (korteks, etiketsiz)



Her harf gösterimi 50 adım sürer. Her adımda:



Retina: Parlak her piksel, parlaklığı × 0,3 olasılıkla spike atar. Ayrıca her pikselin bir “iz”i var: iz = iz × 0,9 + spike. Yakın zamanda spike atmış piksel yüksek iz taşır.

Girdi: Her korteks nöronunun 150 sinapsı var, her sinaps bir retina pikseline bağlı. Nöronun girdisi, spike atan piksellerin sinaps ağırlıklarının toplamı.

Nöron: v = v × 0,9 + girdi. v, eşiği (8 + uyum eşiği + homeostaz payı) aşarsa nöron ateşler, v sıfırlanır, 3 adım dinlenir ve eşiği biraz yükselir.

Yanal baskılama: Biri ateşleyince diğer bütün nöronların v’sinden 6 × ateşleyen sayısı düşer. Böylece sadece birkaç nöron “kazanır”, bu rekabet.

STDP: Nöron ateşlediği anda her sinapsı şöyle değişir: Δw = 0,01 × (piksel izi − 0,1) × (1 − w). Yakın zamanda aktif olan piksel güçlenir, sessiz piksel zayıflar. Sonuçta nöron, kendisini ateşleten şeklin şablonuna dönüşür.



Gösterimden sonra:



Homeostaz: Hedef ateşleme oranından (%5) çok ateşleyen nöronun eşiği yükselir, hiç ateşlemeyenin düşer. Böylece tek nöron her şeyi yutmaz, ölü nöron kalmaz.

Yeniden kablolama: Kazanan nöron, en zayıf sinapslarından (en çok 2) vazgeçip, o sunumda parlak olan bir pikselden yenisini kurar.

Normalizasyon: Her kazanan nöronun toplam ağırlığı sabit bir değere (12) ölçeklenir, böylece biri güçlenirken diğerleri zayıflar.

2\) İsimleri öğrenme (ikinci katman)



256 “isim nöronu” var. Her harfin adı, rastgele seçilmiş 8 isim nöronundan oluşan bir kod. Harfin tuşuna basınca:



O sırada ateşleyen korteks nöronlarının, harfin kodundaki isim nöronlarıyla bağı güçlenir (+0,1 × ateşleme sayısı).

Koddaki olmayan isim nöronlarıyla bağı hafifçe zayıflar (−0,003 × ateşleme sayısı). Bu karşıt terim kodların birbirinden ayrışmasını sağlar.

Her nöronun bağları toplamı 1 olacak şekilde normalize edilir.



Sonra beyin aynı çizimi küçük kayma, dönme ve ölçekle 6 kez daha görüp bunu tekrarlar.



Cevap verme: Ateşleyen korteks nöronlarından isim nöronlarına bağlarla bir etkinlik desenı çıkar. Her harfin kodundaki nöronların payı hesaplanır, en yüksek pay cevaptır.



Dürüst notlar

Korteks öğrenmesi etiketsiz, ama isim katmanı bir “öğretmen” (adı söyleyen kişi) gerektiriyor.

STDP burada sadeleştirilmiş: ateşlemeden sonra giriş izine bakıyor, tam bir spike-zamanlama eğrisi yok.

Normalizasyon ve homeostaz biyolojiden esinlenmiş mühendislik kısayolları. Yanal baskılama ayrı engelleyici nöronlarla değil tek bir sayıyla yapılıyor.

Mimari Diehl \& Cook (2015) makalesini izliyor.

## Lisans

PolyForm Strict License 1.0.0, bkz. `LICENSE`. Kısaca: noncommercial (ticari olmayan) amaçlarla okuyabilir, çalıştırabilir ve inceleyebilirsin; ama dağıtamaz, üzerinde değişiklik ya da türev iş yapamazsın. `LICENSE-INFO.md`, bunun ne anlama geldiğini ve bu lisansın neden seçildiğini İngilizce ve Türkçe anlatır.

