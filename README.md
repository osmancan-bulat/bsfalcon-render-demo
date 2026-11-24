# BŞ Falcon Group · Yönetim Merkezi (tanıtım demosu)

BŞ Falcon Group için hazırlanmış interaktif proje, satış, tahsilat, sözleşme, barter, hakediş ve raporlama
demosu. Next.js (App Router, statik dışa aktarım); veriler yalnızca kullanıcının tarayıcısında
(`localStorage`, anahtar `bsfalcon-enterprise-v1`) tutulur. Sunucu veritabanı ve kullanıcı girişi yoktur.

## Doğrulanmış ve temsili bilgiler

Resmî kaynaklar: saneinsaat.net (ana sayfa, projeler, kurumsal) ve verdorakozyatagi.com/daireler.html.

| Bilgi | Durum |
| --- | --- |
| Logo, kurumsal renkler (#173d29, #0d291a, #f2f0e9, #e75b38), yazı tipleri (Manrope, Newsreader) | saneinsaat.net |
| Çengilli Villa Sitesi: Kozyatağı / Kadıköy, A ve B blok, 15 kat, 60 adet 3+1, net 95,9 / 101,7 m², brüt 106,4 / 112,2 m², 2028 ilk yarı teslim | Resmî |
| Nergis Park Evleri: Beşevler, Nilüfer / Bursa, 3 blok, 92 konut, 8 ticari birim | Resmî |
| Ağva 1111 Triplex Villa: Kasım Önadım Bulvarı, Bursa | Resmî (yalnızca ad ve konum) |
| Proje görselleri | saneinsaat.net (kartlarda kaynak belirtilir) |
| Nergis Park ve Ağva 1111 Triplex Villa daire tipleri, m², blok dağılımı; Ağva 1111 Triplex Villa daire sayısı (48) | **Temsili** |
| Bütün liste/satış fiyatları, satış ve rezerve adetleri, müşteriler, tahsilatlar, kasa, bütçe, hakediş ve barter tutarları | **Temsili** |

Kişi ve firma adları uydurmadır; BŞ Falcon Group'ın müşteri, çalışan veya yükleniciyle ilişkisi yoktur.
Senaryo tarihi sabittir: 15 Kasım 2026.

## Komutlar

```bash
npm ci
npm test          # 9 regresyon dosyası, 74 kontrol
npm run build     # statik çıktı: out/
```

## Yayın

Ayrı Vercel projesi: `bsfalcon-yonetim-merkezi`.
`vercel.json` statik `out/` klasörünü yayınlar; tüm yanıtlarda `noindex`.

## Güvenlik katmanı ve Araç/Filo modülü (DEMO)

- **Giriş (DEMO):** İlk açılışta tarayıcıda yönetici hesabı oluşturulur (şifreyi kullanıcı belirler; kaynak kodda
  şifre yoktur). Şifreler PBKDF2-SHA256 (210.000 tekrar, tuzlu) özetiyle saklanır; hatalı girişte kilitleme,
  hareketsizlikte oturum kapanışı, isteğe bağlı TOTP iki adımlı doğrulama, hassas belgelerde yeniden doğrulama.
- **Roller:** sistem yöneticisi, üst yönetim, muhasebe, satış, şantiye, yalnızca görüntüleme; kişiye özel yetki.
- **Güvenlik Merkezi (`/guvenlik`):** kullanıcılar, oturumlar, giriş ve belge erişim kayıtları, kritik finansal
  değişiklikler, yedekleme, ayarlar ve üretim mimarisi.
- **Araç ve Filo (`/araclar`):** MTV, trafik sigortası, kasko, muayene, bakım, lastik, yakıt, servis ve evrak;
  30/15/7 gün ve gecikmiş hatırlatmaları uygulama içinde (e-posta/SMS/WhatsApp gönderimi yok).
- **Sınır:** Statik sitede kontroller yalnızca tarayıcıda çalışır ve atlatılabilir; gerçek şirket verisi için
  sunucu tarafı kimlik doğrulama, merkezî veritabanı ve rol bazlı erişim gerekir.
