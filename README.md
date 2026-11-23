# CEYCON / YAPI360 — Premium Yönetim Merkezi · v2.1

CEYCON İnşaat için mevcut v1 kod tabanı üzerinde geliştirilen interaktif yönetim demosu. Ana marka **CEYCON İnşaat**; **Corner Prestij** ve **Primador Esenboğa** proje çalışma alanlarıdır.

## Strateji ve bilgi mimarisi

Yönetici satış, tahsilat, nakit, maliyet ve saha durumunu özetten görür; ihtiyaç duyduğu kaydı sağ detay panelinde açar. Ortak proje filtresi tüm ticari ve operasyon ekranlarını aynı kapsama getirir. Corner Prestij, giriş ekranından doğrudan erişilen ayrı bir kontrol merkezidir.

Akışlar: konut → rezervasyon / satış → müşteri → taksit → tahsilat; talep / hakediş → yönetici onayı → ödeme planı → ödeme → kasa; satın alma → onay → teslim kabulü → saha malzeme takibi.

## Sayfalar

| Adres | İşlev |
| --- | --- |
| `/` | Resmî CEYCON logolu giriş, şifresiz demo erişimi |
| `/genel-bakis/` | KPI, proje odağı, haftalık tahsilat grafiği, öncelikler, onaylar |
| `/corner-prestij/` | Corner Prestij kontrol merkezi, iş programı, finans, geçmiş |
| `/primador-esenboga/` | Primador proje kontrol merkezi |
| `/projeler/` | Proje portföyü, stok, teslim hedefi, maliyet / ilerleme |
| `/satis-tahsilat/` | Arama, filtre, sıralama, sayfalama, müşteri düzenleme, kısmi tahsilat, vade değişikliği, rezervasyon, yeni satış |
| `/finans/` | Onaylı ödeme planı, ödeme kaydı, kasa hareketleri, bütçe |
| `/santiye/` | İş paketi arama, ilerleme / malzeme / saha notu güncelleme |
| `/operasyon/` | Hakediş oluşturma, düzenleme, iade, onay, ödeme |
| `/satinalma/` | Satın alma talebi, onay, ödeme, teslim kabulü |
| `/taseronlar/` | Firma kartları, iş paketleri, finansal kayıtlar |
| `/evrak/` | Evrak kontrol kaydı düzenleme, ajanda, not ekleme / kaldırma |

Ortak: global arama (Ctrl/Cmd+K), proje filtresi, bildirim merkezi, işlem geçmişi, CSV raporları, mobil menü, demo sıfırlama.

## Tasarım sistemi

Koyu yeşil sol menü `#142f28`, taş beyazı ana alan `#f4f5f1`, beyaz paneller, kontrollü bronz vurgu. Inter Variable fontları paketten yerel servis edilir. Lucide ikonları; erişilebilir native dialog detay panelleri; klavye odağı, Escape ile kapatma, etiketli formlar. Masaüstü dört kolon KPI; küçük ekranlarda yeniden düzenlenen kartlar ve kendi alanında kaydırılan tablolar.

## Demo verisi ve hesap kuralları

Sabit tarih: **15 Kasım 2026**. Operasyon, kişi, firma ve finansal kayıtlar temsilidir.

| Alan | Corner Prestij | Primador Esenboğa |
| --- | ---: | ---: |
| Konut | 72 (demo varsayımı) | 106 (resmî kaynak) |
| Satılmış | 38 | 42 |
| Rezerve | 4 | 6 |
| Satışa uygun | 30 | 58 |
| Örnek sözleşme | 3.550.000 TL | 2.650.000 TL |
| Örnek peşinat | 850.000 TL | 850.000 TL |
| Örnek plan | 36 × 75.000 TL | 36 × 50.000 TL |
| Önceden ödenen taksit | 4 | 3 |
| Ay başı demo kasa | 4.200.000 TL | 2.250.000 TL |

Başlangıçta 3 taksit için toplam 225.000 TL Kasım tahsilatı bulunur. Portföy: 246.200.000 TL sözleşme, 85.925.000 TL tahsilat, 160.275.000 TL kalan alacak, 275.000 TL gecikmiş taksit, 6.675.000 TL demo kasa, 760.000 TL onaylı ödeme. Detay tabloları ile özetler aynı veriden türetilir. KPI değerleri milyon TL formatında yuvarlanır; tablolar tam TL gösterir.

- Kısmi tahsilat: taksit kalanını, toplam alacağı ve gecikmiş tutarı azaltır; kasa ve toplam tahsilatı artırır.
- Onay: hakedişi / talebi ödeme planına ekler. Henüz kasayı azaltmaz.
- Ödeme: onaylı borcu kapatır, proje kasasını azaltır. Maliyet ikinci kez sayılmaz.
- Yeni satış: konutu stoktan çıkarır, müşteriyi ve 36 taksiti oluşturur; yalnızca alınmış peşinatı kasaya ekler. Bekleyen peşinat hatırlatma merkezinde kısmi tahsil edilebilir.
- Saha ilerlemesi: iş paketi ağırlıklarından hesaplanır. Portföy ilerlemesi proje bütçesiyle ağırlıklandırılır.
- Vade değişikliği: borcu değiştirmez; ilgili ay ve gecikme kovalarını günceller.
- Aynı hakediş iki kez ödenemez; bakiye üzeri tahsilat ve onaysız ödeme engellenir.

## Kaynaklar ve marka

15 Kasım 2026 tarihinde incelenen resmî kaynaklar:

- https://ceyconinsaat.com.tr/ — CEYCON kimliği, 1998, 50+ proje, Ankara / Antalya; Corner Prestij ve Primador portföy ilişkisi; Corner kampanya tanıtımı.
- https://primador.com.tr/ — Yenice / Çubuk, 100 adet 1+1 ve 6 adet 2+1, ticari birimler, havalimanı / üniversite yakınlığı.

CEYCON logosu resmî siteden alınmıştır. Ayrı doğrulanmış Corner logosu bulunmadığından uydurma amblem üretilmemiştir. Corner çalışma alanı tipografik proje kimliği kullanır. Primador mimari görselleri doğru proje adıyla gösterilir. Eski `corner.webp` dosyasındaki görsel Primador'a aittir; girişte açıkça Primador olarak etiketlenmiştir. Kampanya tanıtımları resmî bağlamdır; demo satış fiyatları ve teslim hedefleri ticari taahhüt değildir.

## Dosya yapısı

```
app/
  layout.tsx                 # metadata ve yerel font
  globals.css                # v1 temel stil ve giriş
  enterprise.css             # v2 kurumsal tasarım sistemi
  page.tsx                   # giriş
  [section]/page.tsx         # statik App Router sayfaları
components/
  login.tsx
  workspace.tsx              # navigasyon, kapsam, arama, bildirim
  ui.tsx                     # Panel / Badge / Progress
  enterprise/
    context.tsx              # ortak durum + localStorage + bildirim
    shared.tsx               # Drawer / KPI / Search / Audit
    charts.tsx
    customer-panel.tsx
    request-panel.tsx
    finance.tsx
    project-hub.tsx
  views/                     # modül ekranları
lib/
  data.ts                    # kaynak bağlamı ve başlangıç verisi
  enterprise.ts              # türler, işlemler, hesaplar, doğrulama
  export.ts                  # Excel uyumlu CSV indirme
public/images/               # resmî logo ve proje görselleri
scripts/
  dev.mjs
  verify-data.mjs
  verify-enterprise.mjs
next.config.ts
vercel.json
package-lock.json
```

## Windows'ta açma

Node.js 24 LTS kurulu olmalı. ZIP'i açın; `package.json` bulunan `ceycon-demo` klasörüne geçin. Klasör yolunu tek başına komut olarak çalıştırmayın; başına `cd /d` ekleyin:

```bat
cd /d "C:\Users\msı\Downloads\CEYCON_YAPI360_Premium_Demo\ceycon-demo"
npm ci
npm run dev
```

Tarayıcı: http://localhost:3000 . Terminal açık kalmalı. Klasör farklıysa ilk komuttaki yolu değiştirin. `npm ci` için arşivdeki `package-lock.json` gereklidir.

## Kontroller

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Testler: başlangıç sözleşme / stok / ağırlıklı ilerleme mutabakatı ve sekiz bağlı işlem grubu (portföy toplamları; kısmi tahsilat ve fazla tahsilat engeli; onay / ödeme / mükerrer ödeme; iade / revizyon / teslim; rezervasyon / yeni satış / 36 taksit; vade değişikliği; saha ilerlemesi; sıfırlama).

## Vercel

Next.js static export (`output: 'export'`), `out/` dizini. Vercel framework preset: Other (null); install: `npm ci`; build: `npm run build`; output: `out`; Node.js 24. Ortam değişkeni gerekmiyor. Tüm sayfalar kalıcı URL ile açılır. Proje `ceycon-yonetim-merkezi` olarak kullanıcının Vercel hesabında oluşturulmuştur. Yayın durumu teslim mesajındaki doğrulanmış linkten kontrol edilebilir.

Sonraki güncelleme: bu kaynakları GitHub deposuna aktarın ve aynı Vercel projesine bağlayın; main dalı yayını otomatik günceller. Alternatif: proje klasöründe `npx vercel link` ile **mevcut** CEYCON projesini seçip `npx vercel --prod` çalıştırın.

## Demo sınırı

Bu sürüm çalışan bir **frontend ürün demosudur**. Veriler aynı tarayıcıda localStorage ile kalıcıdır; cihazlar / kullanıcılar arasında senkronize değildir. Giriş gerçek kimlik doğrulama sağlamaz. Gerçek banka transferi, muhasebe, SMS/e-posta, elektronik imza veya sunucu veritabanı yoktur. Dosya yükleme gerçektir ve IndexedDB üzerinde yalnızca kullanılan tarayıcıda saklanır; sunucuya veya başka cihaza aktarılmaz. İndirilen evraklar örnek kontrol özetleridir. Üretim kullanımı için sunucu veritabanı, yetkilendirme, güvenli kayıt / yedekleme ve entegrasyonlar ayrıca uygulanmalıdır. Gerçek müşteri verisi girmeyin.

## 15 Kasım 2026 — v2.1 canlı güncelleme

Yayın: https://ceycon-yonetim-merkezi.vercel.app/

- `/barter/`: iş karşılığı daire, firma, hizmet, tutar, tarihler, ilerleme, devir durumu ve belge ilişkisi. Nakit tahsilat ve satış gelirinden ayrı tutulur.
- `/arsiv/`: PDF, görsel, TXT, DOCX, XLSX yükleme (en fazla 10 MB), arama, filtre, indirme, kayıt ilişkisi ve bitiş tarihi. Dosyalar IndexedDB'dedir. Tarayıcı verileri temizlenirse silinir; paylaşılan kurumsal arşiv değildir. Demo sıfırlama finansal kayıtları sıfırlar; arşiv tarayıcı depolamasıdır.
- `/hatirlatmalar/`: taksit, peşinat, hakediş, barter, sözleşme tarihi ve özel hatırlatmalar. Uygulama içidir; otomatik SMS, e-posta veya WhatsApp gönderilmez. Senaryo tarihi 15 Kasım 2026'dır.
- Ödenmemiş peşinat nakit sayılmaz; kısmi peşinat tahsilatı kalan borcu azaltıp kasayı aynı tutarda artırır.

Tüm kişi/firma ve işlem verileri temsilidir. Kamuya açık demo gerçek kimlik doğrulaması sağlamaz; gerçek kayıtlar girilmemelidir.

## 15 Kasım 2026 — v3 yerel geliştirme (henüz yayınlanmadı)

Vercel production sürümüne dokunulmadı; değişiklikler yalnızca yerel kod tabanındadır.

**Tasarım sistemi**
- `app/theme.css`: tek kaynak tasarım değişkenleri (orman yeşili, doğal taş, grafit, bronz; tipografi, boşluk, köşe, gölge).
- `app/components.css`: uygulama kabuğu, menü, üst çubuk, gösterge, tablo, form, sekme, detay paneli bileşenleri.
- `app/command-center.css`: proje kontrol merkezi, müşteri hesabı, satış formu. `app/print.css`: A4 belgeler.
- Eski `globals.css` / `enterprise.css` içindeki kullanılmayan v1 kuralları, yinelenen `:root` blokları, `!important` kullanımları ve 6–10 px yazı boyutları temizlendi; dağınık renk değerleri tasarım değişkenlerine bağlandı.

**Corner Prestij / Primador kontrol merkezi** (`components/enterprise/command-center.tsx`)
Satış dağılımı, sözleşme değeri, tahsilat, kalan alacak, gecikme; alacak yaşlandırma; yaklaşan ve geciken ödemeler; yapılacaklar; peşinat takibi; barter daireleri; kat bazlı konut haritası; sözleşme tablosu; inşaat programı.

**İş akışları** (`lib/enterprise.ts`, `lib/plan.ts`, `lib/units.ts`)
- Bağımsız sözleşme kayıtları: `SZL-CP-001` numaralandırma; Taslak → İmza bekliyor → Aktif → Tamamlandı; taslak iptali; sözleşme devri; durum geçmişi. Taslak konutu bloke eder, finansal etkisi imzada oluşur.
- Esnek ödeme planı: kademeli peşinat, 1–120 taksit, ilk vade/ödeme günü, ara (balon) ödemeler, canlı önizleme.
- Kuruş hassasiyeti: hesaplar kuruş tam sayısıyla yapılır; taksitler tam TL, fark son taksitte; plan toplamı bedele kuruşu kuruşuna eşittir.
- Birleşik cari hesap: sözleşme borcu, peşinat, taksit ve ara ödeme tahsilatları tek ekstrede; son bakiye müşteri alacağına eşittir.
- Barter ↔ hakediş: aynı firmanın onaylı hakedişine barter mahsubu; mahsup kasa çıkışı oluşturmaz, nakit ödeme net tutar üzerinden yapılır; tam mahsup "Mahsup edildi" durumudur.
- Daire kataloğu: tip, brüt/net m², kat, cephe, köşe, liste fiyatı (temsili varsayım; Primador tip dağılımı resmî tanıtımla uyumlu).
- Yazdırılabilir belgeler (`/belge/`): sözleşme özeti, ödeme planı, cari ekstre, tahsilat makbuzu, proje yönetici raporu. Tümü "temsili demo belgesi" ibaresi taşır.

**Testler**: `npm test` artık `scripts/verify-contracts.mjs` dosyasındaki 8 yeni test grubunu da çalıştırır (toplam 20 grup). Mevcut testlerin içeriği değiştirilmedi; yalnızca Prettier ile biçimlendirildi.

### v3 demo senaryosu (tamamen kurgusal, `lib/demo-seed.ts`)

İlk açılışta yüklenir; "Demoyu sıfırla" bu duruma döner. Tarayıcı kayıt anahtarı `ceycon-enterprise-v3` (eski v2 kayıtları yeni senaryoyu gizlemesin diye).

| Kayıt | Corner Prestij | Primador Esenboğa |
| --- | --- | --- |
| Esnek planlı aktif sözleşme | A-43 (kademeli peşinat, 2. parça gecikmiş), B-44 (kısmi ödenmiş + gecikmiş taksit, balon ödeme), A-47 (3 parça peşinat), A-51 (peşin ağırlıklı, 12 ay) | A-49 (48 ay, Kasım taksiti gecikmiş), A-101 (2+1, kademeli peşinat + ara ödeme) |
| İmza sürecinde | B-52 (imza bekliyor), A-53 (taslak, 48 ay) | B-50 (taslak) |
| Barter | A-67 · Örnek Cephe, B-68 · Örnek Yapı | B-60 · Örnek Teknik |
| Hakediş / satın alma | HAK-025 (onaylı, 700.000 TL barter mahsubu), HAK-026 (400.000 TL mahsup + 560.000 TL nakit ödendi), SAT-019 (onaylı, teslim alındı), SAT-020 (onay bekliyor) | HAK-027 (onay bekliyor; onay sonrası barterdan mahsup edilebilir) |

Kasa kuralı: Kasım öncesi tahsilat ve peşinatlar ay başı açılış kasasına dahildir; kasa yalnızca Kasım hareketleriyle değişir. Tutarlılık `scripts/verify-contracts.mjs` içindeki "Demo seed" testiyle doğrulanır (daire çakışması yok, planlar kuruşu kuruşuna, mahsuplar firma/proje eşleşmeli, cari ekstreler bakiyeyle aynı).

Arşiv: "Temsili örnek belgeleri oluştur" düğmesi sözleşme ve barter kayıtlarından metin özetleri üretip **yalnızca bu tarayıcıya** kaydeder; merkezî arşiv değildir.
