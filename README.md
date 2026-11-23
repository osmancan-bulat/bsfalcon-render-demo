# SANE İnşaat · Yönetim Merkezi (tanıtım demosu)

SANE İnşaat için hazırlanmış interaktif proje, satış, tahsilat, sözleşme, barter, hakediş ve raporlama
demosu. Next.js (App Router, statik dışa aktarım); veriler yalnızca kullanıcının tarayıcısında
(`localStorage`, anahtar `sane-enterprise-v1`) tutulur. Sunucu veritabanı ve kullanıcı girişi yoktur.

## Doğrulanmış ve temsili bilgiler

Resmî kaynaklar: saneinsaat.net (ana sayfa, projeler, kurumsal) ve verdorakozyatagi.com/daireler.html.

| Bilgi | Durum |
| --- | --- |
| Logo, kurumsal renkler (#173d29, #0d291a, #f2f0e9, #e75b38), yazı tipleri (Manrope, Newsreader) | saneinsaat.net |
| VERDORA Kozyatağı: Kozyatağı / Kadıköy, A ve B blok, 15 kat, 60 adet 3+1, net 95,9 / 101,7 m², brüt 106,4 / 112,2 m², 2028 ilk yarı teslim | Resmî |
| Sane Time Beşevler: Beşevler, Nilüfer / Bursa, 3 blok, 92 konut, 8 ticari birim | Resmî |
| Bulvar Park II: Kasım Önadım Bulvarı, Bursa | Resmî (yalnızca ad ve konum) |
| Proje görselleri | saneinsaat.net (kartlarda kaynak belirtilir) |
| Sane Time ve Bulvar Park II daire tipleri, m², blok dağılımı; Bulvar Park II daire sayısı (48) | **Temsili** |
| Bütün liste/satış fiyatları, satış ve rezerve adetleri, müşteriler, tahsilatlar, kasa, bütçe, hakediş ve barter tutarları | **Temsili** |

Kişi ve firma adları uydurmadır; SANE İnşaat'ın müşteri, çalışan veya yükleniciyle ilişkisi yoktur.
Senaryo tarihi sabittir: 15 Kasım 2026.

## Komutlar

```bash
npm ci
npm test          # 9 regresyon dosyası, 74 kontrol
npm run build     # statik çıktı: out/
```

## Yayın

Ayrı Vercel projesi: `sane-yonetim-merkezi`.
`vercel.json` statik `out/` klasörünü yayınlar; tüm yanıtlarda `noindex`.
