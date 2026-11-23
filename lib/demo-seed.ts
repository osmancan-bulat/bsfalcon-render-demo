// Tamamen kurgusal demo senaryosu (15 Kasım 2026). Kişi, firma, sözleşme ve tutarlar temsilidir.
// Kayıtlar birbirine bağlıdır: barter firmaları hakediş firmalarıyla eşleşir, mahsuplar ilgili
// hakedişleri azaltır, tahsilatlar sözleşme ödeme planlarındaki satırlara işlenir.
// Daireler katalogdaki (lib/units.ts) satılmamış, rezerve olmayan bölümlerden seçilmiştir.
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
    {
      date: signedAt,
      status: "Aktif",
      note: `İmzalandı · imzada peşinat ${deposit} TL`,
    },
  ],
});

/** İmzalanmış, esnek planlı yeni satışlar. */
export const demoContracts: Customer[] = [
  {
    // Kademeli peşinat: 2. parça vadesi geçti (peşinat takibi örneği)
    id: "corner-43",
    project: "corner",
    name: personName(81),
    unit: "A-43",
    price: 3490000,
    listPrice: 3575000,
    deposit: 600000,
    depositExpected: 1000000,
    depositDue: "2026-08-20",
    depositDate: "2026-08-20",
    installment: 74666,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 600000, due: "2026-08-20" },
        { amount: 400000, due: "2026-10-20" },
      ],
      count: 30,
      firstDue: "2026-09-15",
      interim: [
        { amount: 250000, due: "2027-03-31", label: "Ara ödeme · bahar" },
      ],
    }),
  },
  {
    // Kısmi ödenmiş ve vadesi geçmiş taksit (gecikme örneği) + teslim öncesi balon ödeme
    id: "corner-44",
    project: "corner",
    name: personName(82),
    unit: "B-44",
    price: 3312400,
    listPrice: 3380000,
    deposit: 1000000,
    depositExpected: 1000000,
    depositDue: "2026-07-10",
    depositDate: "2026-07-10",
    installment: 75516,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 1000000, due: "2026-07-10" }],
      count: 24,
      firstDue: "2026-08-10",
      interim: [
        {
          amount: 500000,
          due: "2027-06-30",
          label: "Balon ödeme · teslim öncesi",
        },
      ],
    }),
  },
  {
    // Üç parçalı peşinat; yaklaşan peşinat ve ilk taksit vadeleri
    id: "corner-47",
    project: "corner",
    name: personName(83),
    unit: "A-47",
    price: 4185000,
    listPrice: 4185000,
    deposit: 850000,
    depositExpected: 1700000,
    depositDue: "2026-10-05",
    depositDate: "2026-10-05",
    installment: 69027,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 850000, due: "2026-10-05" },
        { amount: 425000, due: "2026-11-25" },
        { amount: 425000, due: "2026-12-25" },
      ],
      count: 36,
      firstDue: "2026-11-20",
      interim: [],
    }),
  },
  {
    // Peşin ağırlıklı, kısa vadeli plan (indirimli)
    id: "corner-51",
    project: "corner",
    name: personName(84),
    unit: "A-51",
    price: 3530000,
    listPrice: 3620000,
    deposit: 2000000,
    depositExpected: 2000000,
    depositDue: "2026-11-03",
    depositDate: "2026-11-03",
    installment: 127500,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 2000000, due: "2026-11-03" }],
      count: 12,
      firstDue: "2026-12-03",
      interim: [],
    }),
  },
  {
    // 48 ay vadeli; Kasım taksiti gecikmiş
    id: "primador-49",
    project: "primador",
    name: personName(91),
    unit: "A-49",
    price: 2480000,
    listPrice: 2535000,
    deposit: 500000,
    depositExpected: 500000,
    depositDue: "2026-09-12",
    depositDate: "2026-09-12",
    installment: 41250,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 500000, due: "2026-09-12" }],
      count: 48,
      firstDue: "2026-10-12",
      interim: [],
    }),
  },
  {
    // 2+1 · kademeli peşinat + ara ödeme; kuruş farkı son taksitte
    id: "primador-101",
    project: "primador",
    name: personName(92),
    unit: "A-101",
    price: 4050000,
    listPrice: 4130000,
    deposit: 700000,
    depositExpected: 1000000,
    depositDue: "2026-11-08",
    depositDate: "2026-11-08",
    installment: 88333,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 700000, due: "2026-11-08" },
        { amount: 300000, due: "2027-01-08" },
      ],
      count: 30,
      firstDue: "2026-12-08",
      interim: [
        { amount: 400000, due: "2027-09-30", label: "Ara ödeme · eylül" },
      ],
    }),
  },
];

/** İmza sürecindeki sözleşmeler (konutu bloke eder, finansal etkisi yoktur). */
export const demoDrafts: Customer[] = [
  {
    id: "corner-52",
    project: "corner",
    name: personName(85),
    unit: "B-52",
    price: 3420000,
    listPrice: 3420000,
    deposit: 0,
    depositExpected: 900000,
    depositDue: "2026-11-20",
    installment: 70000,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 900000, due: "2026-11-20" }],
      count: 36,
      firstDue: "2026-12-20",
      interim: [],
    }),
  },
  {
    id: "corner-53",
    project: "corner",
    name: personName(86),
    unit: "A-53",
    price: 3350000,
    listPrice: 3420000,
    deposit: 0,
    depositExpected: 1000000,
    depositDue: "2026-11-28",
    installment: 48958,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 700000, due: "2026-11-28" },
        { amount: 300000, due: "2027-01-28" },
      ],
      count: 48,
      firstDue: "2027-01-05",
      interim: [],
    }),
  },
  {
    id: "primador-50",
    project: "primador",
    name: personName(93),
    unit: "B-50",
    price: 2615000,
    listPrice: 2615000,
    deposit: 0,
    depositExpected: 650000,
    depositDue: "2026-11-30",
    installment: 54583,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 650000, due: "2026-11-30" }],
      count: 36,
      firstDue: "2026-12-28",
      interim: [],
    }),
  },
];

export const demoContractMeta: Record<string, Meta> = {
  "corner-43": signed("2026-08-14", "2026-08-20", "600.000"),
  "corner-44": signed("2026-07-06", "2026-07-10", "1.000.000"),
  "corner-47": signed("2026-09-29", "2026-10-05", "850.000"),
  "corner-51": signed("2026-10-30", "2026-11-03", "2.000.000"),
  "primador-49": signed("2026-09-08", "2026-09-12", "500.000"),
  "primador-101": signed("2026-11-04", "2026-11-08", "700.000"),
  "corner-52": {
    status: "İmza bekliyor",
    created: "2026-11-11",
    history: [
      {
        date: "2026-11-11",
        status: "Taslak",
        note: "Sözleşme taslağı oluşturuldu",
      },
      {
        date: "2026-11-13",
        status: "İmza bekliyor",
        note: "Sözleşme imzaya gönderildi · noter randevusu 20 Kasım",
      },
    ],
  },
  "corner-53": {
    status: "Taslak",
    created: "2026-11-14",
    history: [
      {
        date: "2026-11-14",
        status: "Taslak",
        note: "Sözleşme taslağı oluşturuldu · 48 ay vade talebi",
      },
    ],
  },
  "primador-50": {
    status: "Taslak",
    created: "2026-11-12",
    history: [
      {
        date: "2026-11-12",
        status: "Taslak",
        note: "Sözleşme taslağı oluşturuldu",
      },
    ],
  },
};

/** Taksit tahsilatları (ödeme planı satırlarına bağlı). Kasım öncesi tahsilatlar ay başı kasaya dahildir. */
export const demoReceipts = [
  {
    id: "THS-D01",
    installmentId: "corner-43-1",
    amount: 74666,
    date: "2026-09-15",
    method: "Banka havalesi",
    reference: "HVL-260915-043",
  },
  {
    id: "THS-D02",
    installmentId: "corner-43-2",
    amount: 74666,
    date: "2026-10-15",
    method: "Banka havalesi",
    reference: "HVL-261015-043",
  },
  {
    id: "THS-D03",
    installmentId: "corner-44-1",
    amount: 75516,
    date: "2026-08-10",
    method: "Banka havalesi",
    reference: "HVL-260810-044",
  },
  {
    id: "THS-D04",
    installmentId: "corner-44-2",
    amount: 75516,
    date: "2026-09-10",
    method: "Kredi kartı",
    reference: "POS-260910-044",
  },
  {
    id: "THS-D05",
    installmentId: "corner-44-3",
    amount: 40000,
    date: "2026-10-12",
    method: "Banka havalesi",
    reference: "HVL-261012-044 · kısmi",
  },
  {
    id: "THS-D06",
    installmentId: "primador-49-1",
    amount: 41250,
    date: "2026-10-12",
    method: "Banka havalesi",
    reference: "HVL-261012-049",
  },
];

/** Daire karşılığı iş anlaşmaları. Firmalar ilgili hakedişlerle aynıdır. */
export const demoBarters = [
  {
    id: "BRT-CP-01",
    project: "corner",
    unitId: "corner-67",
    company: FIRM.cephe,
    work: "Cephe giydirme ve ısı yalıtımı · A/B blok",
    amount: 3600000,
    start: "2026-09-01",
    end: "2027-04-30",
    progress: 35,
    transfer: "Bekliyor",
  },
  {
    id: "BRT-CP-02",
    project: "corner",
    unitId: "corner-68",
    company: FIRM.yapi,
    work: "Betonarme kalıp ve demir işçiliği · 5–8. katlar",
    amount: 3495000,
    start: "2026-07-15",
    end: "2027-01-31",
    progress: 60,
    transfer: "Devir sürecinde",
  },
  {
    id: "BRT-PE-01",
    project: "primador",
    unitId: "primador-60",
    company: FIRM.teknik,
    work: "Mekanik ve elektrik altyapı · A blok",
    amount: 2640000,
    start: "2026-10-01",
    end: "2027-06-30",
    progress: 10,
    transfer: "Bekliyor",
  },
];

/** Hakediş ve satın alma talepleri (başlangıç onay listesine ek). */
export const demoRequests = [
  {
    id: "HAK-025",
    project: "corner",
    company: FIRM.cephe,
    name: "Cephe 1. ara hakedişi",
    type: "Hakediş",
    amount: 1180000,
    due: "2026-11-25",
    status: "Onaylandı",
    description:
      "Barter BRT-CP-01 kapsamında 700.000 TL mahsup edildi; kalan nakit ödenecek.",
  },
  {
    id: "HAK-026",
    project: "corner",
    company: FIRM.yapi,
    name: "5. kat betonarme hakedişi",
    type: "Hakediş",
    amount: 960000,
    due: "2026-11-08",
    status: "Onaylandı",
    description:
      "400.000 TL barter BRT-CP-02 mahsubu; 560.000 TL nakit ödendi.",
  },
  {
    id: "HAK-027",
    project: "primador",
    company: FIRM.teknik,
    name: "Mekanik altyapı 1. hakedişi",
    type: "Hakediş",
    amount: 640000,
    due: "2026-11-28",
    status: "Onay bekliyor",
    description: "Onay sonrası BRT-PE-01 barterından mahsup edilebilir.",
  },
  {
    id: "SAT-020",
    project: "corner",
    company: FIRM.aluminyum,
    name: "Cephe alüminyum profil ve cam",
    type: "Satın alma",
    amount: 1450000,
    due: "2026-11-30",
    status: "Onay bekliyor",
  },
];

export const demoOffsets = [
  {
    id: "MHS-D01",
    barterId: "BRT-CP-02",
    requestId: "HAK-026",
    amount: 400000,
    date: "2026-11-05",
  },
  {
    id: "MHS-D02",
    barterId: "BRT-CP-01",
    requestId: "HAK-025",
    amount: 700000,
    date: "2026-11-12",
  },
];

export const demoReminders = [
  {
    id: "HTR-D01",
    project: "corner",
    title: `Noter imza randevusu · ${personName(85)} · B Blok, Daire 52`,
    due: "2026-11-20",
    done: false,
  },
  {
    id: "HTR-D02",
    project: "corner",
    title: `Tapu devir evrakı kontrolü · ${FIRM.yapi} · B Blok, Daire 68 (barter)`,
    due: "2026-11-22",
    done: false,
  },
  {
    id: "HTR-D03",
    project: "primador",
    title: `HAK-027 hakediş onayı ve barter mahsup değerlendirmesi · ${FIRM.teknik}`,
    due: "2026-11-26",
    done: false,
  },
];

export const demoAudit = [
  {
    id: "AUD-D01",
    entity: "HAK-025",
    message: "700.000 TL barter karşılığı mahsup edildi; kasa değişmedi",
    time: "12 Kas",
    project: "corner",
  },
  {
    id: "AUD-D02",
    entity: "corner-52",
    message: "Sözleşme imzaya gönderildi",
    time: "13 Kas",
    project: "corner",
  },
  {
    id: "AUD-D03",
    entity: "primador-101",
    message: "Sözleşme imzalandı; ödeme planı ve alacaklar oluşturuldu",
    time: "8 Kas",
    project: "primador",
  },
  {
    id: "AUD-D04",
    entity: "HAK-026",
    message: "Ödeme kaydedildi; kasa ve ödeme planı güncellendi",
    time: "8 Kas",
    project: "corner",
  },
  {
    id: "AUD-D05",
    entity: "corner-51",
    message: "Konut satışı kaydedildi; 12 ödeme satırı oluşturuldu",
    time: "3 Kas",
    project: "corner",
  },
];
