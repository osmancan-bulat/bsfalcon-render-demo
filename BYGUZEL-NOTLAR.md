# By Güzel Yönetim Merkezi — demo notları

Bu dal (`byguzel-demo`), BŞ Falcon yönetim merkezi altyapısından türetilmiş **ayrı** bir ürün demosudur.
Falcon'un `main` dalı, Render yayını, CEYCON, Edifica ve diğer demolar bu çalışmada değiştirilmedi.

## 1. Kaynaklar (28 Kasım 2026'da okundu)
- byguzel.com — Ana sayfa, Projelerimiz, Hakkımızda, proje sayfaları
- guzelinvest.com/en/projeler — Guzel Life Premium sosyal alanları ve vatandaşlık uygunluğu
  (Guzel Invest'in By Güzel ile kurumsal ilişkisi doğrulanmadı; farklı adres ve telefon kullanıyor)

## 2. Doğrulanan bilgiler
| Konu | Bilgi | Kaynak |
|---|---|---|
| Şirket | 2001'de emlak ofisi, 2003'ten beri inşaat; "20+ yıl, 30+ proje, 2.500+ satış" şirket beyanı | byguzel.com/hakkimizda |
| Guzel Life Premium | 5 blok, 90 daire; 2+1 ve 3+1 (ayrı mutfak), 4+1 bahçe dubleks, 5+1 dubleks penthouse; 125–230 m²; 3+1 215.000 €'dan; 2024 | byguzel.com, guzelinvest.com |
| Guzel Nature | Tek blok, 6 kat; ilk katta sosyal alanlar (TV odası, masa tenisi, kafeterya, çocuk odası, spor salonu, sauna, buhar ve tuz odası); 1+1 105.000 €'dan; 50–180 m²; 2025 | byguzel.com |
| City Prime | 2+1, 65–122 m², 185.000 €'dan, 2025; havuz, sauna, çocuk parkı | byguzel.com |
| By Güzel 2000 | 115.000 €'dan, 50–220 m², 2024 | byguzel.com |
| Mahall Oba | 550.000 €'dan, 440–595 m², 2024 | byguzel.com |
| Medicalanya | 280.000 €'dan, 64–104 m², 2023 | byguzel.com |
| Meva City Alanya | 10 blok, 8 katlı; sosyal alanlar — fiyat/ilan sayfası yok | byguzel.com (Projelerimiz açıklaması) |

**Doğrulanamayan:** Guzel Nature'ın daire adedi sitede yayımlanmıyor. ~40 daire bilgisi gerçek kabul edilmedi;
demodaki 40 daire açıkça "örnek kurgu" olarak etiketlidir.

**Ayrı tutulanlar (yalnızca satılık ilan):** Avsallar Jasmine Boutique Life, Oba Portakal Sities, Mahmutlar Heaven Hills,
Olimpcity Kargıcak — geliştirici bilgisi yok, By Güzel projesi olarak gösterilmez.

## 3. Temsilî (uydurma) veriler
Blok başına daire dağılımı ve numaraları, Guzel Nature 40 / City Prime 12 bölüm kurgusu, bütün kişi adları,
sözleşme bedelleri, ödeme planları, tahsilatlar, kasa açılışları, bütçe ve hakedişler, teslim/tapu tarihleri,
müşteri talepleri, araç filosu. Kişi adları kurgusaldır; telefon, e-posta, kimlik no içermez.

## 4. Para birimi modeli
- Her sözleşme kendi para biriminde (EUR / USD / TRY) tutulur; plan, tahsilat ve ekstre aynı para birimindedir.
- Ekranlar seçili para biriminde çalışır; **farklı para birimleri hiçbir toplamda birbirine eklenmez.**
- TL karşılığı yalnızca Yönetim & Ayarlar'da kullanıcının tanımladığı kurla ve "bilgi amaçlı" etiketiyle gösterilir.
  Otomatik kur çekilmez; kur değişikliği hiçbir tutarı değiştirmez (test edildi).
- Hakediş, şantiye gideri ve satın alma TL'dir.

## 5. Üretim için teknik değerlendirme (bu demo üretim ERP'si değildir)
Bu sürüm statik bir sitedir: veriler tarayıcının localStorage alanında, giriş ve rol kontrolleri istemci tarafındadır
ve teknik bilgisi olan biri tarafından atlatılabilir. "Tanıtım modu" girişi şifresizdir ve güvenlik sağlamaz.
Gerçek kullanım için en az şunlar gerekir:
1. **Sunucu ve veritabanı:** merkezî veritabanı (ör. PostgreSQL), tüm hesaplamaların sunucuda yapılması, işlem bütünlüğü
   (tahsilat + bakiye tek transaction), yedekleme ve geri yükleme prosedürü.
2. **Kimlik doğrulama:** sunucu tarafı oturum (HttpOnly, Secure, SameSite çerezler), parola özetleri (Argon2id/bcrypt),
   2 adımlı doğrulama, hesap kilitleme, oturum süresi, parola sıfırlama akışı.
3. **Yetkilendirme:** rol ve proje bazlı erişim kontrolünün her API çağrısında sunucuda uygulanması.
4. **Denetim izi:** değiştirilemez işlem kaydı (kim, ne zaman, ne değişti), hassas belge erişim kaydı.
5. **Belge saklama:** şifreli nesne depolama, kısa ömürlü imzalı indirme bağlantıları, virüs taraması.
6. **KVKK:** aydınlatma metni, açık rıza gereken işlemler, veri envanteri (VERBİS değerlendirmesi), saklama/imha
   politikası, yurt dışı aktarım değerlendirmesi (barındırma yeri), yabancı alıcı verileri için ek özen.
7. **Para birimi:** kur kaynağı ve tarih damgası (ör. TCMB) ile kur farkı muhasebesi, e-fatura/e-arşiv ve muhasebe
   entegrasyonu; bunlar demoda yoktur.
8. **Altyapı:** HTTPS, güvenlik başlıkları, hız sınırlama, bağımlılık güncellemeleri, izleme ve alarm.

## 6. Testler
`npm test` — 12 betik, 96 senaryo (motor, sözleşme/plan, veri seti, geçiş, raporlar, platform, kalite, kapsam,
By Güzel, güvenlik, filo). `verify-byguzel.mjs`: portföy doğruluğu, para birimi ayrımı, kur tablosu,
GLP satış akışı, USD sözleşme ayrımı, teslim/tapu sırası, müşteri talepleri, TL gider/hakediş, demo sıfırlama.

## 7. Yayın
Ücretsiz Render Static Site · dal `byguzel-demo` · build `npm ci && npm run build` · publish `out`.
