// BŞ Falcon Group demosu · TEMSİLİ DEMO SENARYOSU (15 Kasım 2026).
// Kişi, firma, sözleşme ve tutarların tamamı örnektir; şirketin gerçek müşteri, satış veya finans verisi değildir.
// Kayıtlar birbirine bağlıdır: barter firmaları hakediş firmalarıyla eşleşir, mahsuplar ilgili hakedişleri azaltır,
// tahsilatlar sözleşme ödeme planındaki satırlara işlenir. Satışlar yalnızca yüklenici payındaki bölümlerden yapılır.
// Bedeller dairenin temsili liste fiyatından türetilir; ödeme planları kuruşu kuruşuna bedele eşittir.
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
    { date: signedAt, status: "Aktif", note: `İmzalandı · imzada peşinat ${deposit} TL` },
  ],
});

/** İmzalanmış, esnek planlı satışlar. */
export const demoContracts: Customer[] = [
  {
    // Ağva villa: kademeli peşinat (2. parça vadesi geçti) + teslim öncesi ara ödeme
    id: "agva-1",
    project: "agva",
    name: personName(81),
    unit: "V-01",
    price: 41225000,
    listPrice: 42500000,
    deposit: 10000000,
    depositExpected: 16000000,
    depositDue: "2026-08-25",
    depositDate: "2026-08-25",
    installment: 842708,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 10000000, due: "2026-08-25" },
        { amount: 6000000, due: "2026-10-25" },
      ],
      count: 24,
      firstDue: "2026-09-25",
      interim: [{ amount: 5000000, due: "2027-12-15", label: "Ara ödeme · teslim öncesi" }],
    }),
  },
  {
    // Çengilli villa: tek peşinat, 30 taksit ve ara ödeme
    id: "cengilli-3",
    project: "cengilli",
    name: personName(82),
    unit: "V-03",
    price: 32340000,
    listPrice: 32830000,
    deposit: 9000000,
    depositExpected: 9000000,
    depositDue: "2026-09-15",
    depositDate: "2026-09-15",
    installment: 644666,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 9000000, due: "2026-09-15" }],
      count: 30,
      firstDue: "2026-10-15",
      interim: [{ amount: 4000000, due: "2027-06-30", label: "Ara ödeme · yaz" }],
    }),
  },
  {
    // Nergis Park 2+1: kısmi ödenmiş ve vadesi geçmiş taksitler (gecikme örneği)
    id: "nergis-12",
    project: "nergis",
    name: personName(83),
    unit: "3-12",
    price: 7815000,
    listPrice: 7975000,
    deposit: 2000000,
    depositExpected: 2000000,
    depositDue: "2026-07-10",
    depositDate: "2026-07-10",
    installment: 161527,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 2000000, due: "2026-07-10" }],
      count: 36,
      firstDue: "2026-08-10",
      interim: [],
    }),
  },
  {
    // Nergis Park 2+1: kademeli peşinat; ilk taksit yaklaşıyor
    id: "nergis-13",
    project: "nergis",
    name: personName(84),
    unit: "3-13",
    price: 7515000,
    listPrice: 7515000,
    deposit: 1800000,
    depositExpected: 2400000,
    depositDue: "2026-10-20",
    depositDate: "2026-10-20",
    installment: 142083,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 1800000, due: "2026-10-20" },
        { amount: 600000, due: "2026-12-10" },
      ],
      count: 36,
      firstDue: "2026-11-20",
      interim: [],
    }),
  },
  {
    // Nergis Park dükkân D-2: 24 taksit + ara ödeme
    id: "nergis-37",
    project: "nergis",
    name: personName(85),
    unit: "D-2",
    price: 17395000,
    listPrice: 17935000,
    deposit: 5000000,
    depositExpected: 5000000,
    depositDue: "2026-11-05",
    depositDate: "2026-11-05",
    installment: 391458,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 5000000, due: "2026-11-05" }],
      count: 24,
      firstDue: "2026-12-05",
      interim: [{ amount: 3000000, due: "2027-06-05", label: "Ara ödeme · haziran" }],
    }),
  },
];

/** İmza sürecindeki sözleşmeler (bölümü bloke eder, finansal etkisi yoktur). */
export const demoDrafts: Customer[] = [
  {
    id: "cengilli-4",
    project: "cengilli",
    name: personName(86),
    unit: "V-04",
    price: 31970000,
    listPrice: 31970000,
    deposit: 0,
    depositExpected: 9500000,
    depositDue: "2026-11-20",
    installment: 749000,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 9500000, due: "2026-11-20" }],
      count: 30,
      firstDue: "2026-12-20",
      interim: [],
    }),
  },
  {
    id: "nergis-14",
    project: "nergis",
    name: personName(87),
    unit: "3-14",
    price: 7705000,
    listPrice: 7820000,
    deposit: 0,
    depositExpected: 2000000,
    depositDue: "2026-11-28",
    installment: 158472,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 1500000, due: "2026-11-28" },
        { amount: 500000, due: "2027-01-28" },
      ],
      count: 36,
      firstDue: "2027-01-05",
      interim: [],
    }),
  },
];

export const demoContractMeta: Record<string, Meta> = {
  "agva-1": signed("2026-08-20", "2026-08-25", "10.000.000"),
  "cengilli-3": signed("2026-09-10", "2026-09-15", "9.000.000"),
  "nergis-12": signed("2026-07-06", "2026-07-10", "2.000.000"),
  "nergis-13": signed("2026-10-16", "2026-10-20", "1.800.000"),
  "nergis-37": signed("2026-11-01", "2026-11-05", "5.000.000"),
  "cengilli-4": {
    status: "İmza bekliyor",
    created: "2026-11-11",
    history: [
      { date: "2026-11-11", status: "Taslak", note: "Sözleşme taslağı oluşturuldu" },
      { date: "2026-11-13", status: "İmza bekliyor", note: "Sözleşme imzaya gönderildi · noter randevusu 20 Kasım" },
    ],
  },
  "nergis-14": {
    status: "Taslak",
    created: "2026-11-14",
    history: [{ date: "2026-11-14", status: "Taslak", note: "Sözleşme taslağı oluşturuldu · 36 ay vade talebi" }],
  },
};

/** Taksit tahsilatları (ödeme planı satırlarına bağlı). Kasım öncesi tahsilatlar ay başı kasaya dahildir. */
export const demoReceipts = [
  { id: "THS-D01", installmentId: "agva-1-1", amount: 842708, date: "2026-09-25", method: "Banka havalesi", reference: "HVL-260925-AG1" },
  { id: "THS-D02", installmentId: "agva-1-2", amount: 842708, date: "2026-10-24", method: "Banka havalesi", reference: "HVL-261024-AG1" },
  { id: "THS-D03", installmentId: "cengilli-3-1", amount: 644666, date: "2026-10-15", method: "Banka havalesi", reference: "HVL-261015-CV3" },
  { id: "THS-D04", installmentId: "nergis-12-1", amount: 161527, date: "2026-08-10", method: "Banka havalesi", reference: "HVL-260810-NP12" },
  { id: "THS-D05", installmentId: "nergis-12-2", amount: 161527, date: "2026-09-10", method: "Kredi kartı", reference: "POS-260910-NP12" },
  { id: "THS-D06", installmentId: "nergis-12-3", amount: 80000, date: "2026-10-12", method: "Banka havalesi", reference: "HVL-261012-NP12 · kısmi" },
];

/** Daire karşılığı iş anlaşmaları. Firmalar ilgili hakedişlerle aynıdır. */
export const demoBarters = [
  {
    id: "BRT-NP-01",
    project: "nergis",
    unitId: "nergis-33",
    company: FIRM.cephe,
    work: "Cephe ve çerçeveli balkon profilleri",
    amount: 7545000,
    start: "2026-09-01",
    end: "2027-05-31",
    progress: 20,
    transfer: "Bekliyor",
  },
  {
    id: "BRT-CV-01",
    project: "cengilli",
    unitId: "cengilli-5",
    company: FIRM.yapi,
    work: "Villa kaba inşaat işçiliği · V-01–V-05",
    amount: 33315000,
    start: "2026-05-15",
    end: "2027-08-31",
    progress: 40,
    transfer: "Bekliyor",
  },
];

/** Hakediş ve satın alma talepleri (başlangıç onay listesine ek). */
export const demoRequests = [
  {
    id: "HAK-025",
    project: "nergis",
    company: FIRM.cephe,
    name: "Cephe 1. ara hakedişi",
    type: "Hakediş",
    amount: 1180000,
    due: "2026-11-25",
    status: "Onaylandı",
    description: "Barter BRT-NP-01 kapsamında 700.000 TL mahsup edildi; kalan nakit ödenecek.",
  },
  {
    id: "HAK-026",
    project: "cengilli",
    company: FIRM.yapi,
    name: "Villa V-03 kaba inşaat hakedişi",
    type: "Hakediş",
    amount: 960000,
    due: "2026-11-08",
    status: "Onaylandı",
    description: "400.000 TL barter BRT-CV-01 mahsubu; 560.000 TL nakit ödendi.",
  },
  {
    id: "HAK-027",
    project: "agva",
    company: FIRM.teknik,
    name: "Akıllı ev altyapısı 1. hakedişi",
    type: "Hakediş",
    amount: 640000,
    due: "2026-11-28",
    status: "Onay bekliyor",
    description: "Otomasyon kablolaması ve dağıtım panoları.",
  },
  {
    id: "SAT-020",
    project: "nergis",
    company: FIRM.aluminyum,
    name: "Balkon alüminyum doğrama",
    type: "Satın alma",
    amount: 1450000,
    due: "2026-11-30",
    status: "Onay bekliyor",
  },
  {
    // Şantiye gideri (doğrudan ödenmiş): kasa ve bütçe raporuna yansır
    id: "GDR-001",
    project: "nergis",
    company: "Şantiye vinç kiralama (örnek)",
    name: "Kule vinç kirası · Ekim dönemi",
    type: "Şantiye gideri",
    amount: 185000,
    due: "2026-11-06",
    status: "Ödendi",
    description: "Ekipman kirası",
  },
];

export const demoOffsets = [
  { id: "MHS-D01", barterId: "BRT-CV-01", requestId: "HAK-026", amount: 400000, date: "2026-11-05" },
  { id: "MHS-D02", barterId: "BRT-NP-01", requestId: "HAK-025", amount: 700000, date: "2026-11-12" },
];

export const demoReminders = [
  { id: "HTR-D01", project: "cengilli", title: `Noter imza randevusu · ${personName(86)} · Villa V-04`, due: "2026-11-20", done: false },
  { id: "HTR-D02", project: "nergis", title: "Kira yardımı Kasım ödemesi · arsa sahipleri (örnek)", due: "2026-11-20", done: false },
  { id: "HTR-D03", project: "agva", title: `HAK-027 hakediş onayı · ${FIRM.teknik}`, due: "2026-11-26", done: false },
  { id: "HTR-D04", project: "cengilli", title: "Bitirme sigortası poliçe kopyasının evrak arşivine eklenmesi (temsili)", due: "2026-11-25", done: false },
];

export const demoAudit = [
  { id: "AUD-D01", entity: "HAK-025", message: "700.000 TL barter karşılığı mahsup edildi; kasa değişmedi", time: "12 Kas", project: "nergis" },
  { id: "AUD-D02", entity: "cengilli-4", message: "Sözleşme imzaya gönderildi", time: "13 Kas", project: "cengilli" },
  { id: "AUD-D03", entity: "nergis-37", message: "Dükkân satışı imzalandı; ödeme planı ve alacaklar oluşturuldu", time: "5 Kas", project: "nergis" },
  { id: "AUD-D04", entity: "HAK-026", message: "Ödeme kaydedildi; kasa ve ödeme planı güncellendi", time: "8 Kas", project: "cengilli" },
  { id: "AUD-D05", entity: "nergis-12", message: "Kısmi tahsilat kaydedildi (80.000 TL)", time: "12 Eki", project: "nergis" },
];
