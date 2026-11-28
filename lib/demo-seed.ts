// By Güzel demosu · TEMSİLİ DEMO SENARYOSU (15 Kasım 2026).
// Kişi, firma, sözleşme ve tutarların tamamı örnektir; şirketin gerçek müşteri, satış veya finans verisi değildir.
// Her sözleşme kendi para biriminde (EUR / USD / TRY) tutulur; ödeme planları kuruşu kuruşuna bedele eşittir
// ve tahsilatlar plan satırlarına işlenir. İnşaat giderleri TRY olarak izlenir.
import type { Customer } from "./data.ts";
import type { PlanSpec } from "./plan.ts";
import { personName, FIRM } from "./names.ts";

type Meta = {
  status: "Taslak" | "İmza bekliyor" | "Aktif";
  created: string;
  signedAt?: string;
  history: { date: string; status: string; note: string }[];
};
const plan = (p: PlanSpec) => p;
const signed = (created: string, signedAt: string, deposit: string): Meta => ({
  status: "Aktif",
  created,
  signedAt,
  history: [
    { date: created, status: "Taslak", note: "Sözleşme taslağı oluşturuldu" },
    { date: signedAt, status: "Aktif", note: `İmzalandı · imzada peşinat ${deposit}` },
  ],
});

/** İmzalanmış, esnek planlı satışlar. */
export const demoContracts: Customer[] = [
  {
    // Guzel Life Premium C-14 (3+1): kısmi ödenmiş ve vadesi geçmiş taksitler (gecikme örneği) · EUR
    id: "nergis-50",
    project: "nergis",
    name: personName(81),
    unit: "C-14",
    price: 224000,
    listPrice: 231000,
    deposit: 80000,
    depositExpected: 80000,
    depositDue: "2026-06-10",
    depositDate: "2026-06-10",
    installment: 6000,
    paidMonths: 0,
    currency: "EUR",
    nationality: "Almanya",
    plan: plan({ deposits: [{ amount: 80000, due: "2026-06-10" }], count: 24, firstDue: "2026-07-10", interim: [] }),
  },
  {
    // Guzel Life Premium C-15 (3+1): USD sözleşme, üç parça peşinat (ikinci parça gecikmiş)
    id: "nergis-51",
    project: "nergis",
    name: personName(82),
    unit: "C-15",
    price: 242000,
    listPrice: 246000,
    deposit: 60000,
    depositExpected: 110000,
    depositDue: "2026-10-20",
    depositDate: "2026-10-20",
    installment: 5500,
    paidMonths: 0,
    currency: "USD",
    nationality: "Kazakistan",
    plan: plan({
      deposits: [
        { amount: 60000, due: "2026-10-20" },
        { amount: 25000, due: "2026-11-10" },
        { amount: 25000, due: "2026-12-10" },
      ],
      count: 24,
      firstDue: "2026-11-20",
      interim: [],
    }),
  },
  {
    // Guzel Life Premium C-17 (5+1 dubleks penthouse): tapu devri öncesi ara ödeme · EUR
    id: "nergis-53",
    project: "nergis",
    name: personName(83),
    unit: "C-17",
    price: 379000,
    listPrice: 387000,
    deposit: 150000,
    depositExpected: 150000,
    depositDue: "2026-08-25",
    depositDate: "2026-08-25",
    installment: 10000,
    paidMonths: 0,
    currency: "EUR",
    nationality: "İsveç",
    plan: plan({
      deposits: [{ amount: 150000, due: "2026-08-25" }],
      count: 18,
      firstDue: "2026-09-25",
      interim: [{ amount: 49000, due: "2027-03-15", label: "Ara ödeme · tapu devri öncesi" }],
    }),
  },
  {
    // Guzel Nature 404 (1+1): Türk alıcı, TRY sözleşme, 30 taksit
    id: "cengilli-20",
    project: "cengilli",
    name: personName(84),
    unit: "404",
    price: 4150000,
    listPrice: 4255000,
    deposit: 1450000,
    depositExpected: 1450000,
    depositDue: "2026-09-15",
    depositDate: "2026-09-15",
    installment: 90000,
    paidMonths: 0,
    currency: "TRY",
    nationality: "Türkiye",
    plan: plan({ deposits: [{ amount: 1450000, due: "2026-09-15" }], count: 30, firstDue: "2026-10-15", interim: [] }),
  },
  {
    // City Prime CP-204 (2+1): 24 taksit + anahtar tesliminde ara ödeme · EUR
    id: "agva-8",
    project: "agva",
    name: personName(85),
    unit: "CP-204",
    price: 202000,
    listPrice: 208000,
    deposit: 70000,
    depositExpected: 70000,
    depositDue: "2026-11-05",
    depositDate: "2026-11-05",
    installment: 4666,
    paidMonths: 0,
    currency: "EUR",
    nationality: "Hollanda",
    plan: plan({
      deposits: [{ amount: 70000, due: "2026-11-05" }],
      count: 24,
      firstDue: "2026-12-05",
      interim: [{ amount: 20000, due: "2027-06-05", label: "Ara ödeme · anahtar teslimi" }],
    }),
  },
];

/** İmza sürecindeki sözleşmeler (bölümü bloke eder, finansal etkisi yoktur). */
export const demoDrafts: Customer[] = [
  {
    id: "cengilli-21",
    project: "cengilli",
    name: personName(86),
    unit: "405",
    price: 109000,
    listPrice: 112000,
    deposit: 0,
    depositExpected: 38150,
    depositDue: "2026-11-20",
    installment: 2952,
    paidMonths: 0,
    currency: "EUR",
    nationality: "Ukrayna",
    plan: plan({ deposits: [{ amount: 38150, due: "2026-11-20" }], count: 24, firstDue: "2026-12-20", interim: [] }),
  },
  {
    id: "nergis-52",
    project: "nergis",
    name: personName(87),
    unit: "C-16",
    price: 222000,
    listPrice: 228000,
    deposit: 0,
    depositExpected: 77700,
    depositDue: "2026-11-28",
    installment: 6012,
    paidMonths: 0,
    currency: "EUR",
    nationality: "Norveç",
    plan: plan({ deposits: [{ amount: 77700, due: "2026-11-28" }], count: 24, firstDue: "2027-01-05", interim: [] }),
  },
];

export const demoContractMeta: Record<string, Meta> = {
  "nergis-50": signed("2026-06-05", "2026-06-10", "80.000 €"),
  "nergis-51": signed("2026-10-16", "2026-10-20", "60.000 $"),
  "nergis-53": signed("2026-08-20", "2026-08-25", "150.000 €"),
  "cengilli-20": signed("2026-09-10", "2026-09-15", "1.450.000 ₺"),
  "agva-8": signed("2026-11-01", "2026-11-05", "70.000 €"),
  "cengilli-21": {
    status: "İmza bekliyor",
    created: "2026-11-11",
    history: [
      { date: "2026-11-11", status: "Taslak", note: "Sözleşme taslağı oluşturuldu" },
      { date: "2026-11-13", status: "İmza bekliyor", note: "Sözleşme imzaya gönderildi · yeminli tercüman eşliğinde imza 20 Kasım" },
    ],
  },
  "nergis-52": {
    status: "Taslak",
    created: "2026-11-14",
    history: [{ date: "2026-11-14", status: "Taslak", note: "Sözleşme taslağı oluşturuldu · 24 ay vade talebi" }],
  },
};

/** Taksit tahsilatları (ödeme planı satırlarına bağlı; tutarlar sözleşme para biriminde). */
export const demoReceipts = [
  { id: "THS-D01", installmentId: "nergis-50-1", amount: 6000, date: "2026-07-10", method: "Banka havalesi", reference: "SWIFT-260710-GLP50" },
  { id: "THS-D02", installmentId: "nergis-50-2", amount: 6000, date: "2026-08-10", method: "Banka havalesi", reference: "SWIFT-260810-GLP50" },
  { id: "THS-D03", installmentId: "nergis-50-3", amount: 6000, date: "2026-09-10", method: "Kredi kartı", reference: "POS-260910-GLP50" },
  { id: "THS-D04", installmentId: "nergis-50-4", amount: 3000, date: "2026-10-12", method: "Banka havalesi", reference: "SWIFT-261012-GLP50 · kısmi" },
  { id: "THS-D05", installmentId: "nergis-53-1", amount: 10000, date: "2026-09-25", method: "Banka havalesi", reference: "SWIFT-260925-GLP53" },
  { id: "THS-D06", installmentId: "nergis-53-2", amount: 10000, date: "2026-10-24", method: "Banka havalesi", reference: "SWIFT-261024-GLP53" },
  { id: "THS-D07", installmentId: "cengilli-20-1", amount: 90000, date: "2026-10-15", method: "Banka havalesi", reference: "EFT-261015-GN404" },
];

/** By Güzel senaryosunda daire karşılığı iş (barter) kullanılmaz. */
export const demoBarters = [] as {
  id: string; project: string; unitId: string; company: string; work: string; amount: number;
  start: string; end: string; progress: number; transfer: string;
}[];

/** Hakediş, satın alma ve şantiye giderleri (TRY). */
export const demoRequests = [
  {
    id: "HAK-025",
    project: "cengilli",
    company: FIRM.yapi,
    name: "Sosyal alan katı kaba işleri",
    type: "Hakediş",
    amount: 1180000,
    due: "2026-11-25",
    status: "Onaylandı",
    description: "Fitness, sauna ve tuz odası bölümleri.",
  },
  {
    id: "HAK-026",
    project: "agva",
    company: FIRM.cephe,
    name: "Peyzaj ve havuz çevresi son hakediş",
    type: "Hakediş",
    amount: 960000,
    due: "2026-11-08",
    status: "Onaylandı",
    description: "8 Kasım'da ödendi.",
  },
  {
    id: "HAK-027",
    project: "agva",
    company: FIRM.teknik,
    name: "Asansör montajı 1. hakedişi",
    type: "Hakediş",
    amount: 640000,
    due: "2026-11-28",
    status: "Onay bekliyor",
    description: "İki asansör montajı ve test.",
  },
  {
    id: "SAT-020",
    project: "cengilli",
    company: FIRM.aluminyum,
    name: "Balkon cam korkuluk",
    type: "Satın alma",
    amount: 1450000,
    due: "2026-11-30",
    status: "Onay bekliyor",
  },
  {
    // Şantiye gideri (doğrudan ödenmiş): kasa ve bütçe raporuna yansır
    id: "GDR-001",
    project: "cengilli",
    company: "Ekipman kiralama (örnek)",
    name: "Mobil vinç kirası · Ekim dönemi",
    type: "Şantiye gideri",
    amount: 185000,
    due: "2026-11-06",
    status: "Ödendi",
    description: "Ekipman kirası",
  },
];

export const demoOffsets = [] as { id: string; barterId: string; requestId: string; amount: number; date: string }[];

export const demoReminders = [
  { id: "HTR-D01", project: "cengilli", title: `Sözleşme imzası (yeminli tercüman) · ${personName(86)} · Daire 405`, due: "2026-11-20", done: false },
  { id: "HTR-D02", project: "nergis", title: "2027 aidat tablosunun site sakinlerine gönderilmesi (uygulama içi not)", due: "2026-11-25", done: false },
  { id: "HTR-D03", project: "agva", title: `HAK-027 hakediş onayı · ${FIRM.teknik}`, due: "2026-11-26", done: false },
  { id: "HTR-D04", project: "nergis", title: `Tapu randevusu · ${personName(83)} · C-17 (değerleme raporu bekleniyor)`, due: "2026-11-27", done: false },
];

export const demoAudit = [
  { id: "AUD-D01", entity: "nergis-51", message: "USD sözleşme imzalandı; ödeme planı ve alacaklar oluşturuldu", time: "20 Eki", project: "nergis" },
  { id: "AUD-D02", entity: "cengilli-21", message: "Sözleşme imzaya gönderildi", time: "13 Kas", project: "cengilli" },
  { id: "AUD-D03", entity: "agva-8", message: "City Prime satışı imzalandı; ödeme planı ve alacaklar oluşturuldu", time: "5 Kas", project: "agva" },
  { id: "AUD-D04", entity: "HAK-026", message: "Ödeme kaydedildi; kasa ve ödeme planı güncellendi", time: "8 Kas", project: "agva" },
  { id: "AUD-D05", entity: "nergis-50", message: "Kısmi tahsilat kaydedildi (3.000 €)", time: "12 Eki", project: "nergis" },
];
