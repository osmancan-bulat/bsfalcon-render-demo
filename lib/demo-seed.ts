// Tamamen kurgusal demo senaryosu (15 Kasım 2026). Kişi, firma, sözleşme ve tutarlar TEMSİLİDİR;
// SANE İnşaat'ın gerçek satış, müşteri veya finans verisi değildir.
// Kayıtlar birbirine bağlıdır: barter firmaları hakediş firmalarıyla eşleşir, mahsuplar ilgili
// hakedişleri azaltır, tahsilatlar sözleşme ödeme planlarındaki satırlara işlenir.
// Daireler katalogdaki (lib/units.ts) satılmamış, rezerve olmayan bölümlerden seçilmiştir; bedeller
// dairenin temsili liste fiyatından türetilir ve ödeme planları kuruşu kuruşuna bedele eşittir.
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
    id: "verdora-33",
    project: "verdora",
    name: personName(81),
    unit: "A-33",
    price: 15600000,
    listPrice: 15980000,
    deposit: 2700000,
    depositExpected: 4500000,
    depositDue: "2026-08-20",
    depositDate: "2026-08-20",
    installment: 333333,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 2700000, due: "2026-08-20" },
        { amount: 1800000, due: "2026-10-20" },
      ],
      count: 30,
      firstDue: "2026-09-15",
      interim: [
        { amount: 1100000, due: "2027-03-31", label: "Ara ödeme · bahar" },
      ],
    }),
  },
  {
    // Kısmi ödenmiş ve vadesi geçmiş taksit (gecikme örneği) + teslim öncesi balon ödeme
    id: "verdora-34",
    project: "verdora",
    name: personName(82),
    unit: "A-34",
    price: 14200000,
    listPrice: 14490000,
    deposit: 4300000,
    depositExpected: 4300000,
    depositDue: "2026-07-10",
    depositDate: "2026-07-10",
    installment: 322916,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 4300000, due: "2026-07-10" }],
      count: 24,
      firstDue: "2026-08-10",
      interim: [
        {
          amount: 2150000,
          due: "2027-06-30",
          label: "Balon ödeme · teslim öncesi",
        },
      ],
    }),
  },
  {
    // Üç parçalı peşinat; yaklaşan peşinat ve ilk taksit vadeleri
    id: "verdora-37",
    project: "verdora",
    name: personName(83),
    unit: "A-37",
    price: 16100000,
    listPrice: 16100000,
    deposit: 3250000,
    depositExpected: 6550000,
    depositDue: "2026-10-05",
    depositDate: "2026-10-05",
    installment: 265277,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 3250000, due: "2026-10-05" },
        { amount: 1650000, due: "2026-11-25" },
        { amount: 1650000, due: "2026-12-25" },
      ],
      count: 36,
      firstDue: "2026-11-20",
      interim: [],
    }),
  },
  {
    // Peşin ağırlıklı, kısa vadeli plan (indirimli)
    id: "verdora-41",
    project: "verdora",
    name: personName(84),
    unit: "A-41",
    price: 15815000,
    listPrice: 16220000,
    deposit: 8950000,
    depositExpected: 8950000,
    depositDue: "2026-11-03",
    depositDate: "2026-11-03",
    installment: 572083,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 8950000, due: "2026-11-03" }],
      count: 12,
      firstDue: "2026-12-03",
      interim: [],
    }),
  },
  {
    // 48 ay vadeli; Kasım taksiti gecikmiş
    id: "sanetime-49",
    project: "sanetime",
    name: personName(91),
    unit: "B-49",
    price: 7270000,
    listPrice: 7430000,
    deposit: 1450000,
    depositExpected: 1450000,
    depositDue: "2026-09-12",
    depositDate: "2026-09-12",
    installment: 121250,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 1450000, due: "2026-09-12" }],
      count: 48,
      firstDue: "2026-10-12",
      interim: [],
    }),
  },
  {
    // 2+1 · kademeli peşinat + ara ödeme
    id: "sanetime-86",
    project: "sanetime",
    name: personName(92),
    unit: "C-86",
    price: 5845000,
    listPrice: 5960000,
    deposit: 1000000,
    depositExpected: 1450000,
    depositDue: "2026-11-08",
    depositDate: "2026-11-08",
    installment: 126500,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 1000000, due: "2026-11-08" },
        { amount: 450000, due: "2027-01-08" },
      ],
      count: 30,
      firstDue: "2026-12-08",
      interim: [
        { amount: 600000, due: "2027-09-30", label: "Ara ödeme · eylül" },
      ],
    }),
  },
  {
    // Standart 36 ay plan; ilk taksit yaklaşıyor; kuruş farkı son taksitte
    id: "bulvarpark-24",
    project: "bulvarpark",
    name: personName(94),
    unit: "A-24",
    price: 6195000,
    listPrice: 6195000,
    deposit: 1550000,
    depositExpected: 1550000,
    depositDue: "2026-10-20",
    depositDate: "2026-10-20",
    installment: 129027,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 1550000, due: "2026-10-20" }],
      count: 36,
      firstDue: "2026-11-20",
      interim: [],
    }),
  },
];

/** İmza sürecindeki sözleşmeler (konutu bloke eder, finansal etkisi yoktur). */
export const demoDrafts: Customer[] = [
  {
    id: "verdora-42",
    project: "verdora",
    name: personName(85),
    unit: "A-42",
    price: 14705000,
    listPrice: 14705000,
    deposit: 0,
    depositExpected: 3850000,
    depositDue: "2026-11-20",
    installment: 301527,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 3850000, due: "2026-11-20" }],
      count: 36,
      firstDue: "2026-12-20",
      interim: [],
    }),
  },
  {
    id: "verdora-43",
    project: "verdora",
    name: personName(86),
    unit: "B-43",
    price: 14405000,
    listPrice: 14705000,
    deposit: 0,
    depositExpected: 4300000,
    depositDue: "2026-11-28",
    installment: 210520,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 3000000, due: "2026-11-28" },
        { amount: 1300000, due: "2027-01-28" },
      ],
      count: 48,
      firstDue: "2027-01-05",
      interim: [],
    }),
  },
  {
    id: "sanetime-50",
    project: "sanetime",
    name: personName(93),
    unit: "B-50",
    price: 5900000,
    listPrice: 5900000,
    deposit: 0,
    depositExpected: 1450000,
    depositDue: "2026-11-30",
    installment: 123611,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 1450000, due: "2026-11-30" }],
      count: 36,
      firstDue: "2026-12-28",
      interim: [],
    }),
  },
];

export const demoContractMeta: Record<string, Meta> = {
  "verdora-33": signed("2026-08-14", "2026-08-20", "2.700.000"),
  "verdora-34": signed("2026-07-06", "2026-07-10", "4.300.000"),
  "verdora-37": signed("2026-09-29", "2026-10-05", "3.250.000"),
  "verdora-41": signed("2026-10-30", "2026-11-03", "8.950.000"),
  "sanetime-49": signed("2026-09-08", "2026-09-12", "1.450.000"),
  "sanetime-86": signed("2026-11-04", "2026-11-08", "1.000.000"),
  "bulvarpark-24": signed("2026-10-16", "2026-10-20", "1.550.000"),
  "verdora-42": {
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
  "verdora-43": {
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
  "sanetime-50": {
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
    installmentId: "verdora-33-1",
    amount: 333333,
    date: "2026-09-15",
    method: "Banka havalesi",
    reference: "HVL-260915-033",
  },
  {
    id: "THS-D02",
    installmentId: "verdora-33-2",
    amount: 333333,
    date: "2026-10-15",
    method: "Banka havalesi",
    reference: "HVL-261015-033",
  },
  {
    id: "THS-D03",
    installmentId: "verdora-34-1",
    amount: 322916,
    date: "2026-08-10",
    method: "Banka havalesi",
    reference: "HVL-260810-034",
  },
  {
    id: "THS-D04",
    installmentId: "verdora-34-2",
    amount: 322916,
    date: "2026-09-10",
    method: "Kredi kartı",
    reference: "POS-260910-034",
  },
  {
    id: "THS-D05",
    installmentId: "verdora-34-3",
    amount: 170000,
    date: "2026-10-12",
    method: "Banka havalesi",
    reference: "HVL-261012-034 · kısmi",
  },
  {
    id: "THS-D06",
    installmentId: "sanetime-49-1",
    amount: 121250,
    date: "2026-10-12",
    method: "Banka havalesi",
    reference: "HVL-261012-049",
  },
];

/** Daire karşılığı iş anlaşmaları. Firmalar ilgili hakedişlerle aynıdır. */
export const demoBarters = [
  {
    id: "BRT-VK-01",
    project: "verdora",
    unitId: "verdora-57",
    company: FIRM.cephe,
    work: "Cephe giydirme ve ısı yalıtımı · A/B blok",
    amount: 16200000,
    start: "2026-09-01",
    end: "2027-06-30",
    progress: 35,
    transfer: "Bekliyor",
  },
  {
    id: "BRT-VK-02",
    project: "verdora",
    unitId: "verdora-58",
    company: FIRM.yapi,
    work: "Betonarme kalıp ve demir işçiliği · 8–15. katlar",
    amount: 14690000,
    start: "2026-07-15",
    end: "2027-04-30",
    progress: 60,
    transfer: "Devir sürecinde",
  },
  {
    id: "BRT-ST-01",
    project: "sanetime",
    unitId: "sanetime-60",
    company: FIRM.teknik,
    work: "Mekanik ve elektrik altyapı · B blok",
    amount: 3540000,
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
    project: "verdora",
    company: FIRM.cephe,
    name: "Cephe 1. ara hakedişi",
    type: "Hakediş",
    amount: 1180000,
    due: "2026-11-25",
    status: "Onaylandı",
    description:
      "Barter BRT-VK-01 kapsamında 700.000 TL mahsup edildi; kalan nakit ödenecek.",
  },
  {
    id: "HAK-026",
    project: "verdora",
    company: FIRM.yapi,
    name: "5. kat betonarme hakedişi",
    type: "Hakediş",
    amount: 960000,
    due: "2026-11-08",
    status: "Onaylandı",
    description:
      "400.000 TL barter BRT-VK-02 mahsubu; 560.000 TL nakit ödendi.",
  },
  {
    id: "HAK-027",
    project: "sanetime",
    company: FIRM.teknik,
    name: "Mekanik altyapı 1. hakedişi",
    type: "Hakediş",
    amount: 640000,
    due: "2026-11-28",
    status: "Onay bekliyor",
    description: "Onay sonrası BRT-ST-01 barterından mahsup edilebilir.",
  },
  {
    id: "SAT-020",
    project: "verdora",
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
    barterId: "BRT-VK-02",
    requestId: "HAK-026",
    amount: 400000,
    date: "2026-11-05",
  },
  {
    id: "MHS-D02",
    barterId: "BRT-VK-01",
    requestId: "HAK-025",
    amount: 700000,
    date: "2026-11-12",
  },
];

export const demoReminders = [
  {
    id: "HTR-D01",
    project: "verdora",
    title: `Noter imza randevusu · ${personName(85)} · A Blok, Daire 42`,
    due: "2026-11-20",
    done: false,
  },
  {
    id: "HTR-D02",
    project: "verdora",
    title: `Tapu devir evrakı kontrolü · ${FIRM.yapi} · A Blok, Daire 58 (barter)`,
    due: "2026-11-22",
    done: false,
  },
  {
    id: "HTR-D03",
    project: "sanetime",
    title: `HAK-027 hakediş onayı ve barter mahsup değerlendirmesi · ${FIRM.teknik}`,
    due: "2026-11-26",
    done: false,
  },
  {
    id: "HTR-D04",
    project: "bulvarpark",
    title: "Zemin etüdü ve iksa raporunun proje müellifiyle değerlendirilmesi",
    due: "2026-11-24",
    done: false,
  },
];

export const demoAudit = [
  {
    id: "AUD-D01",
    entity: "HAK-025",
    message: "700.000 TL barter karşılığı mahsup edildi; kasa değişmedi",
    time: "12 Kas",
    project: "verdora",
  },
  {
    id: "AUD-D02",
    entity: "verdora-42",
    message: "Sözleşme imzaya gönderildi",
    time: "13 Kas",
    project: "verdora",
  },
  {
    id: "AUD-D03",
    entity: "sanetime-86",
    message: "Sözleşme imzalandı; ödeme planı ve alacaklar oluşturuldu",
    time: "8 Kas",
    project: "sanetime",
  },
  {
    id: "AUD-D04",
    entity: "HAK-026",
    message: "Ödeme kaydedildi; kasa ve ödeme planı güncellendi",
    time: "8 Kas",
    project: "verdora",
  },
  {
    id: "AUD-D05",
    entity: "verdora-41",
    message: "Konut satışı kaydedildi; 12 ödeme satırı oluşturuldu",
    time: "3 Kas",
    project: "verdora",
  },
];
