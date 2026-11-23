# CEYCON / YAPI360 — Sunum senaryoları

Tüm kişi, firma, sözleşme ve tutarlar kurgusaldır. Senaryo tarihi 15 Kasım 2026'dır.
Sunumdan önce ekranın altındaki **Demoyu sıfırla** ile başlangıç verisine dönün.

## Ekran düzeni

- **Tek giriş:** giriş ekranında **Yönetim merkezine gir** → CEYCON İnşaat **şirket genel bakışı** (iki projenin toplamları, proje kartları, öncelikli konular).
- Sol menünün üstünde **kapsam**: Şirket geneli · Corner Prestij · Primador Esenboğa. Proje seçildiğinde bütün modüller yalnızca o projenin kayıtlarını gösterir.
- Ana menü dokuz bölümdür: **Genel Bakış · Projeler & Daireler · Müşteriler & Satışlar · Tahsilat & Ödemeler · Barter & Taşeronlar · Sözleşmeler & Belgeler · Takvim & Hatırlatmalar · Raporlama · Yönetim & Ayarlar**. Bölüm içindeki modüller (ör. Barter · Taşeronlar · Hakedişler · Satın alma) sayfanın üstünde sekme olarak durur. Eski adresler aynen çalışır.
- Proje seçiliyken **Genel Bakış** o projenin merkezidir: geciken ödemeler, yaklaşan ödemeler, bekleyen sözleşmeler ve bugün yapılacaklar.
- **Raporlama:** Finansal durum · Satış · Taksit ve gecikme · Barter · Taşeron ve hakediş · Yönetici raporu. Kapsam ve dönem filtresi, CSV (Excel) indirme ve yazdırılabilir PDF çıktı.
- Bir daireye veya müşteriye tıklamak tek bir dosya açar: önce özet (müşteri, daire, durum, bedel, ödenen, kalan, sonraki ödeme), sonra sekmeler (Ödeme planı · Tahsilatlar · Sözleşme · Belgeler · İşlem geçmişi).

## Senaryo A — Geciken taksit (1 tıklama + kaydet)

0. Şirket genel bakışında **Corner Prestij › Projeye geç**.
1. Genel Bakış › *Bugün yapılacaklar* listesinin ilk satırı **Mert Öztürk · B Blok · Daire 44** (₺111.032 · 36 gün gecikti). **Tahsilatı görüntüle**.
2. Müşteri dosyası tahsilat formu açık gelir: en eski geciken taksit (₺35.516, kısmen ödenmiş) hazırdır. Form; bu ödemede kalanı, müşteri bakiyesini ve kasa etkisini kaydetmeden önce gösterir.
3. Dekont alanına örnek bir açıklama yazıp kaydedin → yeşil onay: tahsil edilen tutar, kalan bakiye (₺2.085.852) ve **Makbuz** bağlantısı.

Alternatif: üstteki **Tahsilat kaydet** düğmesi veya menü **Ödemeler** › **Gecikti**.

## Senaryo B — Barter (2 tıklama + onay)

1. Menü **Barter** › **Kuzey Cephe Sistemleri · A Blok · Daire 67** satırı (veya **Daireler** haritasında bronz A-67).
2. Özet: verilen daire, firma, karşılığında alınan iş, anlaşma bedeli ₺3.600.000 (liste ₺3.700.000), mahsup ₺700.000, **kalan yükümlülük ₺2.900.000**. Sekmeler: Mahsup · Sözleşme ve belgeler · İş ve devir.
3. *Mahsup* sekmesinde HAK-025 ve ₺480.000 hazırdır → **Devam et** → onay ekranı (hakediş nakit kalanı ₺480.000 → ₺0, kalan yükümlülük ₺2.900.000 → ₺2.420.000, kasa değişmez) → **₺480.000 mahsubu kaydet**.

## Senaryo C — İmza bekleyen sözleşme (3 tıklama)

1. Genel bakış › *Bugün yapılacaklar* › **Elif Çelik · B Blok · Daire 52** satırında **Sözleşmeyi aç** (veya menü **Sözleşmeler** › üstteki imza şeridi).
2. İmza ekranı: daire ve müşteri, bedel, peşinat, planlanan ödeme takvimi, sözleşme geçmişi. Taslağın finansal etkisi yoktur.
3. **İmzayı kaydet** → onay adımı (36 taksitlik alacak oluşur, ₺900.000 peşinat kasaya girer, geri alınamaz) → **İmzalandı olarak kaydet** → müşteri dosyası Aktif sözleşme ve oluşan ödeme planıyla açılır.

## Senaryo D — Müşteri araması

1. Üstteki arama kutusuna **Selin Y** yazın → **Selin Yılmaz · Corner Prestij · A Blok · Daire 43 · SZL-CP-043**.
2. Sonuca tıklayın → müşteri dosyası: geciken peşinat parçası (₺400.000), kalan bakiye ve ödeme planı.

## Senaryo E — Firmanın iş sözleşmesi ve hakedişleri

1. Menü **Sözleşmeler** › **İş (taşeron)** sekmesi › **Karataş Yapı Taahhüt · IS-CP-01** (sözleşme bedeli ₺21.300.000, toplam hakediş ₺2.210.000, barter mahsubu ₺400.000).
2. **Görüntüle** → iş kapsamı, paket bedelleri ve HAK-024 / HAK-026 hakedişleri; **BRT-CP-02** bağlantısı barter dosyasını açar.

## Senaryo F — Raporlama

1. Menü **Raporlama** › kapsam **Şirket geneli**: sözleşmeli satış, tahsil edilen, kalan ve geciken alacak; kasaya giren/çıkan; nakit dışı barter etkisi.
2. **Taksit ve gecikme** sekmesi: 0–30 / 31–60 / 61–90 / 90+ gün yaşlandırması ve müşteri bazlı liste. Senaryo A'daki tahsilattan sonra geciken tutar aynı oranda düşer.
3. **CSV (Excel)** dosyayı indirir; **Yazdır / PDF** profesyonel çıktıyı açar. Kapsamı Corner Prestij yapınca yalnızca o projenin kayıtları kalır.

## Senaryo G — Yeni proje (kod değişikliği olmadan)

1. **Projeler & Daireler › Proje portföyü › Yeni proje**: ad, 2–4 harflik kod (ör. KV), konum, teslim hedefi.
2. Proje boş açılır ve Daireler ekranına geçilir: **İlk bloğu ekle** (ör. A blok · 5 kat × 4 daire = 20 daire).
3. Müsait bir daire › **Satış sözleşmesi** → SZL-KV-001, peşinat ve ödeme planı oluşur; müşteri dosyasından tahsilat kaydedilir.
4. Proje; kapsam seçicide, şirket genel bakışında ve altı raporda otomatik görünür. **Taşeronlar › İş paketi ekle** ile firma–iş paketi–iş sözleşmesi (IS-KV-01) kurulur; hakedişler ve barter mahsupları bu zincire bağlanır.
5. **Düzenle › Arşive al**: proje seçiciden çıkar, yeni satış almaz, finansal kayıtları ve şirket toplamları korunur; **Yeniden aktifleştir** ile geri gelir. Kaydı olan proje silinemez.

## Senaryo H — Hatalı tahsilatın düzeltilmesi

Müşteri dosyası › **Tahsilatlar** › ilgili satırda **İptal et** → gerekçe. Kayıt silinmez; cari ekstrede tahsilat ve iptal satırı birlikte görünür, bakiye geri eklenir, makbuz “İPTAL EDİLDİ” ibaresi taşır. Aynı dekont aynı ödemeye ikinci kez işlenemez.

## Bilinen sınırlar (sunumda açıkça belirtin)

- Kişi ve firma adları (Selin Yılmaz, Karataş Yapı Taahhüt vb.) kurgusaldır; gerçek müşteri, çalışan veya yüklenici değildir. Senaryo tarihi sabittir: 15 Kasım 2026.

- Veriler yalnızca kullanılan tarayıcıda saklanır; kullanıcılar arasında paylaşılmaz, sunucu veritabanı yoktur.
- Belge arşivi demo amaçlıdır (IndexedDB). Gerçek belge saklama, yedekleme ve yetkilendirme kurulmamıştır.
- Giriş gerçek kimlik doğrulama değildir. SMS / e-posta gönderimi, banka veya muhasebe entegrasyonu yoktur.
- Yazdırılabilir belgeler "temsili demo belgesi" ibaresi taşır; hukuki metin değildir.
