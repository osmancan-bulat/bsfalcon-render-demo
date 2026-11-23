// BŞ Falcon Group'a özel modüllerin veri modeli ve başlangıç senaryosu:
// - Kat karşılığı (arsa sahibi / yüklenici paylaşımı, aşamalar, yükümlülükler, belgeler, değişiklik geçmişi)
// - Proje süreci ve güvence takibi (resmî sitedeki 8 adımlı süreç; güvence yalnızca belge takibidir)
// Bütün kayıtlar TEMSİLİ DEMO VERİSİDİR. Arsa sahipleri, hisseler, tarihler ve belgeler örnektir;
// gerçek sözleşme, poliçe veya hukuki güvence bilgisi değildir.

export const CONTRACTOR = "yuklenici";
export type StepStatus = "Tamamlandı" | "Devam ediyor" | "Bekliyor";
export const STEP_STATUSES: StepStatus[] = ["Bekliyor", "Devam ediyor", "Tamamlandı"];

export type ShareOwner = {
  id: string;
  /** Örnek hissedar etiketi (gerçek kişi adı kullanılmaz). */
  name: string;
  /** Arsa sahibi payı içindeki hisse yüzdesi. */
  stake: number;
  note?: string;
};
export type Step = { key: string; title: string; status: StepStatus; date?: string; note?: string };
export type Obligation = { id: string; title: string; due: string; done: boolean; party: string };
export type AgreementDoc = { id: string; title: string; status: "Tamam" | "İncelemede" | "Eksik"; date?: string };
export type LandAgreement = {
  project: string;
  parcel: string;
  /** Sözleşmedeki arsa sahibi payı (% · brüt alan esaslı). */
  landRatio: number;
  owners: ShareOwner[];
  steps: Step[];
  obligations: Obligation[];
  documents: AgreementDoc[];
};
export type ShareHistory = { id: string; date: string; project: string; text: string };
export type LandShareState = {
  agreements: LandAgreement[];
  /** Bağımsız bölüm → arsa sahibi kimliği. Kayıt yoksa bölüm yüklenici payındadır. */
  owners: Record<string, string>;
  history: ShareHistory[];
};

export type ProcessState = Record<string, { steps: Step[]; guarantee: GuaranteeRecord }>;
export type GuaranteeRecord = {
  title: string;
  status: "Belge arşivde" | "Belge bekleniyor" | "Kapsam dışı";
  note: string;
  checked?: string;
};

/** Resmî sitedeki proje süreci adımları (bsfalcongroup.com/proje-sureci). */
export const PROCESS_STEPS: { key: string; title: string; detail: string }[] = [
  { key: "kesif", title: "Tanışma ve Keşif", detail: "Arsa veya yapı yerinde incelenir; imar, parsel ve mevcut durum bilgileri toplanır." },
  { key: "on-degerlendirme", title: "Ön Değerlendirme", detail: "Yapılabilirlik, kapsam ve yaklaşık takvim netleşir." },
  { key: "mimari", title: "Mimari ve Teknik Çözüm", detail: "Vaziyet planı, kat kurgusu ve detaylar hazırlanır; uygulanabilirlik doğrulanır." },
  { key: "sozlesme", title: "Sözleşme ve Güvence", detail: "Kapsam, takvim ve teslim koşulları yazılı hâle gelir; kat karşılığında güvence belirlenir." },
  { key: "ruhsat", title: "Ruhsat ve Hazırlık", detail: "Resmî süreçler yürütülür; saha, malzeme ve ekip planlaması tamamlanır." },
  { key: "uygulama", title: "Uygulama", detail: "Şantiye, uygulama projelerine uygun biçimde iş güvenliği ve kalite kontrolüyle ilerler." },
  { key: "teslim", title: "Kontrol ve Teslim", detail: "Son kontroller yapılır, eksikler giderilir ve bağımsız bölümler teslim edilir." },
  { key: "teslim-sonrasi", title: "Teslim Sonrası", detail: "Teslimden sonraki bildirimler takip edilir." },
];

/** Kat karşılığı anlaşmasına özel aşamalar. */
const AGREEMENT_STEPS = [
  ["on-gorusme", "Ön görüşme ve keşif"],
  ["degerlendirme", "Arsa ve proje değerlendirmesi"],
  ["anlasma", "Kat karşılığı inşaat sözleşmesi (noter)"],
  ["paylasim", "Paylaşım listesi onayı"],
  ["ruhsat", "Mimari proje ve ruhsat"],
  ["insaat", "İnşaat başlangıcı"],
  ["teslim", "Kontrol ve teslim"],
  ["tapu", "Kat irtifakı / tapu devri"],
] as const;
const steps = (done: number, active: number, dates: string[]): Step[] =>
  AGREEMENT_STEPS.map(([key, title], i) => ({
    key,
    title,
    status: i < done ? "Tamamlandı" : i < done + active ? "Devam ediyor" : "Bekliyor",
    date: dates[i],
  }));
const processSteps = (done: number, dates: string[]): Step[] =>
  PROCESS_STEPS.map((p, i) => ({
    key: p.key,
    title: p.title,
    status: i < done ? "Tamamlandı" : i === done ? "Devam ediyor" : "Bekliyor",
    date: dates[i],
  }));

// Nergis Park Evleri: 4., 5., 6. katlar, 31 no'lu daire ve D-1 dükkânı arsa sahiplerine (temsili paylaşım)
const nergisOwners: Record<string, string> = {};
for (let n = 16; n <= 25; n++) nergisOwners[`nergis-${n}`] = "as-np-1";
for (const n of [26, 27, 28, 29, 30, 31, 36]) nergisOwners[`nergis-${n}`] = "as-np-2";
// Çengilli Villa Sitesi: V-06, V-07, V-08 arsa sahibine (temsili)
const cengilliOwners: Record<string, string> = { "cengilli-6": "as-cv-1", "cengilli-7": "as-cv-1", "cengilli-8": "as-cv-1" };

export const seedLandShare: LandShareState = {
  agreements: [
    {
      project: "nergis",
      parcel: "Ada / parsel bilgisi temsili",
      landRatio: 45,
      owners: [
        { id: "as-np-1", name: "Arsa sahibi 1 (örnek hissedar)", stake: 60 },
        { id: "as-np-2", name: "Arsa sahibi 2 (örnek hissedar)", stake: 40 },
      ],
      steps: steps(6, 1, ["2024-03-12", "2024-04-20", "2024-06-14", "2024-07-02", "2024-11-28", "2025-02-10", "", ""]),
      obligations: [
        { id: "YK-NP-1", title: "Kira yardımı · Kasım 2026 ödemesi (örnek)", due: "2026-11-20", done: false, party: "Yüklenici" },
        { id: "YK-NP-2", title: "Arsa sahibi bölümlerinde ortak alan teslim protokolü", due: "2027-03-31", done: false, party: "Yüklenici" },
        { id: "YK-NP-3", title: "Paylaşım listesi değişikliklerinin noter ek protokolü", due: "2026-12-15", done: false, party: "Taraflar" },
        { id: "YK-NP-4", title: "Yapı denetim 6. kat betonarme tutanağı", due: "2026-10-30", done: true, party: "Yüklenici" },
      ],
      documents: [
        { id: "KB-NP-1", title: "Kat karşılığı inşaat sözleşmesi (noter onaylı örnek)", status: "Tamam", date: "2024-06-14" },
        { id: "KB-NP-2", title: "Paylaşım listesi · Ek-1", status: "İncelemede", date: "2026-11-12" },
        { id: "KB-NP-3", title: "Kat irtifakı başvuru dosyası", status: "Eksik" },
        { id: "KB-NP-4", title: "Bitirme ve inşaat tamamlama sigortası poliçe kopyası (temsili)", status: "Tamam", date: "2024-06-20" },
      ],
    },
    {
      project: "cengilli",
      parcel: "Parsel bilgisi temsili",
      landRatio: 35,
      owners: [{ id: "as-cv-1", name: "Arsa sahibi (örnek)", stake: 100 }],
      steps: steps(5, 1, ["2025-06-02", "2025-07-15", "2025-09-04", "2025-09-22", "2026-02-18", "2026-05-11", "", ""]),
      obligations: [
        { id: "YK-CV-1", title: "Arsa sahibi villaları (V-06–V-08) kaba inşaat ilerleme raporu", due: "2026-11-30", done: false, party: "Yüklenici" },
        { id: "YK-CV-2", title: "Akıllı ev sistemi marka/model onayı arsa sahibine sunulacak", due: "2026-12-20", done: false, party: "Yüklenici" },
        { id: "YK-CV-3", title: "Hedef teslim · Kasım 2027", due: "2027-11-30", done: false, party: "Yüklenici" },
      ],
      documents: [
        { id: "KB-CV-1", title: "Kat karşılığı inşaat sözleşmesi (örnek)", status: "Tamam", date: "2025-09-04" },
        { id: "KB-CV-2", title: "Parsel bazlı paylaşım listesi", status: "Tamam", date: "2025-09-22" },
        { id: "KB-CV-3", title: "Bitirme ve inşaat tamamlama sigortası poliçe kopyası (temsili)", status: "Eksik" },
      ],
    },
  ],
  owners: { ...nergisOwners, ...cengilliOwners },
  history: [
    { id: "PH-1", date: "2026-11-12", project: "nergis", text: "Paylaşım listesi Ek-1 revizyonu incelemeye gönderildi" },
    { id: "PH-2", date: "2025-09-22", project: "cengilli", text: "V-06, V-07, V-08 arsa sahibi payına işlendi" },
    { id: "PH-3", date: "2024-07-02", project: "nergis", text: "4–6. katlar, 31 no'lu daire ve D-1 dükkânı arsa sahiplerine işlendi" },
  ],
};

export const seedProcess: ProcessState = {
  agva: {
    steps: processSteps(5, ["2025-03-10", "2025-04-02", "2025-05-20", "2025-06-18", "2025-09-01", "", "", ""]),
    guarantee: { title: "Bitirme ve inşaat tamamlama sigortası", status: "Kapsam dışı", note: "Kat karşılığı anlaşması tanımlı değil; güvence kaydı yok." },
  },
  cengilli: {
    steps: processSteps(5, ["2025-06-02", "2025-07-15", "2025-08-20", "2025-09-04", "2026-02-18", "", "", ""]),
    guarantee: { title: "Bitirme ve inşaat tamamlama sigortası", status: "Belge bekleniyor", note: "Poliçe kopyası evrak arşivine eklenmedi (temsili takip)." },
  },
  nergis: {
    steps: processSteps(5, ["2024-03-12", "2024-04-20", "2024-05-28", "2024-06-14", "2024-11-28", "", "", ""]),
    guarantee: { title: "Bitirme ve inşaat tamamlama sigortası", status: "Belge arşivde", note: "Poliçe kopyası arşivde (temsili). Poliçe doğrulaması yapılmaz.", checked: "2026-11-10" },
  },
};

/** Şantiye gideri kategorileri. */
export const EXPENSE_CATEGORIES = ["Malzeme", "İşçilik", "Ekipman kirası", "Nakliye", "Şantiye genel gideri"] as const;
