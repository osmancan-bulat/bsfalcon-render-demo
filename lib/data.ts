// Tamamen kurgusal demo envanteri: müşteri, firma, finans ve operasyon kayıtları gerçek şirket verisi değildir.
import { personName, FIRM } from "./names.ts";
import { unitById } from "./units.ts";
export const SNAPSHOT = "2026-11-15";
export type ProjectStatus = "Aktif" | "Tamamlandı" | "Arşiv";
/** Şirkete bağlı proje. Yerleşik projeler (VERDORA, Sane Time) ve kullanıcının eklediği projeler aynı yapıyı kullanır. */
export type Project = {
  id: string;
  name: string;
  location: string;
  image: string;
  /** Bağımsız bölüm sayısı (katalogdan hesaplanır). */
  total: number;
  /** Başlangıç senaryosundaki rezerve daire sayısı (yalnızca yerleşik projeler). */
  reserved: number;
  /** Temsili bütçe ve maliyet varsayımı (yeni projelerde 0). */
  budget: number;
  cost: number;
  delivery: string;
  progress: number;
  description: string;
  terms: string;
  mix: string;
  commercial: string;
  /** Sözleşme numaralarında kullanılan kısa kod (SZL-VK-001). */
  code: string;
  status: ProjectStatus;
  builtIn?: boolean;
  created?: string;
};
export const projects: Project[] = [
  {
    id: "verdora",
    name: "VERDORA Kozyatağı",
    location: "Kozyatağı, Kadıköy / İstanbul",
    image: "/images/verdora.webp",
    total: 60,
    reserved: 4,
    // Bütçe, maliyet ve ilerleme temsili demo varsayımıdır.
    budget: 640000000,
    cost: 168000000,
    delivery: "2028 ilk yarı",
    progress: 38,
    description:
      "Kozyatağı'nda A ve B bloktan oluşan, 15 katlı, tamamı 3+1 konut projesi; her daireye kapalı otopark.",
    terms: "M8 Ayşekadın metrosuna yaklaşık 7 dakika · Kaya Sultan Sokak No:4",
    mix: "60 adet 3+1 · net 95,9–101,7 m²",
    commercial: "Ticari birim bilgisi resmî proje sayfasında yer almıyor.",
    code: "VK",
    status: "Aktif",
    builtIn: true,
  },
  {
    id: "sanetime",
    name: "Sane Time Beşevler",
    location: "Beşevler, Nilüfer / Bursa",
    image: "/images/sanetime.webp",
    total: 92,
    reserved: 6,
    budget: 410000000,
    cost: 132000000,
    delivery: "",
    progress: 35,
    description:
      "Nilüfer Beşevler'de 3 bloktan oluşan konut ve ticaret projesi; 92 konut ve 8 bağımsız ticari birim.",
    terms: "Beşevler Kültür Mahallesi · Nilüfer / Bursa",
    mix: "3 blok · 92 konut (tip dağılımı temsili)",
    commercial: "8 bağımsız ticari birim (resmî); satış verisi bu demoya dahil değildir.",
    code: "ST",
    status: "Aktif",
    builtIn: true,
  },
  {
    id: "bulvarpark",
    name: "Bulvar Park II",
    location: "Kasım Önadım Bulvarı, Bursa",
    image: "/images/bulvarpark.webp",
    total: 48,
    reserved: 3,
    budget: 245000000,
    cost: 46000000,
    delivery: "",
    progress: 16,
    description:
      "Kasım Önadım Bulvarı üzerinde, iç avlulu konut projesi.",
    terms: "Kasım Önadım Bulvarı · Bursa",
    mix: "48 konut · adet ve tipler temsili (resmî kaynakta belirtilmemiş)",
    commercial: "Ticari birim bilgisi resmî proje sayfasında yer almıyor.",
    code: "BP",
    status: "Aktif",
    builtIn: true,
  },
];
export type Customer = {
  id: string;
  project: string;
  name: string;
  unit: string;
  price: number;
  deposit: number;
  installment: number;
  paidMonths: number;
  depositExpected?: number;
  depositDue?: string;
  depositDate?: string;
  /** Esnek ödeme planı (yeni sözleşmeler). Yoksa klasik 36 eşit taksit uygulanır. */
  plan?: import("./plan.ts").PlanSpec;
  /** Satış anındaki liste fiyatı; indirim hesabı için. */
  listPrice?: number;
};
/**
 * Örnek (sisteme geçiş öncesi) satışların fiyatlandırma şeması.
 * - "katalog": yeni ve temiz demo başlangıcı; fiyat dairenin liste fiyatından %2–4 pazarlık payıyla türetilir.
 * - "v3.1": önceki sürümün sabit bedelleri (VERDORA ₺14.200.000, diğer projeler ₺5.300.000).
 * Tarayıcıda daha önce işlem yapılmış kayıtlar hangi şemayla oluştuysa o şemayla açılır;
 * imzalı sözleşme bedelleri hiçbir geçişte yeniden fiyatlandırılmaz.
 */
export type BasePricing = "katalog" | "v3.1";
/** Projeye göre örnek satış adedi, ödenmiş taksit sayısı ve kişi numarası başlangıcı (temsili). */
const BASE_SALES: Record<string, { sold: number; paid: number; person: number }> = {
  verdora: { sold: 28, paid: 4, person: 0 },
  sanetime: { sold: 42, paid: 3, person: 28 },
  bulvarpark: { sold: 20, paid: 2, person: 100 },
};
const catalogPlan = (project: string, no: number) => {
  const list = unitById(`${project}-${no}`)?.listPrice ?? 0;
  // Temsili peşinat: liste fiyatının yaklaşık %25'i (50.000 TL'ye yuvarlı)
  const deposit = Math.round((list * 0.25) / 50000) * 50000;
  const installment =
    Math.round((list * (0.96 + ((no * 3) % 5) * 0.005) - deposit) / 36 / 250) *
    250;
  return { deposit, installment, price: deposit + 36 * installment };
};
const legacyPlan = (project: string) =>
  project === "verdora"
    ? { price: 14200000, deposit: 3400000, installment: 300000 }
    : { price: 5300000, deposit: 1340000, installment: 110000 };
function buildCustomers(pricing: BasePricing): Customer[] {
  return projects.flatMap((p) => {
    const b = BASE_SALES[p.id];
    if (!b) return [];
    return Array.from({ length: b.sold }, (_, i) => ({
      id: `${p.id}-${i + 1}`,
      project: p.id,
      name: personName(i + b.person + 1),
      unit: unitById(`${p.id}-${i + 1}`)?.label ?? `A-${String(i + 1).padStart(2, "0")}`,
      ...(pricing === "katalog" ? catalogPlan(p.id, i + 1) : legacyPlan(p.id)),
      paidMonths: b.paid,
    }));
  });
}
export type Installment = {
  id: string;
  customerId: string;
  project: string;
  due: string;
  amount: number;
  kind?: "Taksit" | "Ara ödeme";
  label?: string;
};
const buildInstallments = (cs: Customer[]): Installment[] =>
  cs.flatMap((c, i) =>
    Array.from({ length: 36 - c.paidMonths }, (_, j) => ({
      id: `${c.id}-${j + c.paidMonths + 1}`,
      customerId: c.id,
      project: c.project,
      due: `${2026 + Math.floor((10 + j) / 12)}-${String(((10 + j) % 12) + 1).padStart(2, "0")}-${String(i % 10 === 0 ? 10 : 16 + (i % 12)).padStart(2, "0")}`,
      amount: c.installment,
    })),
  );
const BASE = {
  katalog: buildCustomers("katalog"),
  "v3.1": buildCustomers("v3.1"),
};
const BASE_INSTALLMENTS = {
  katalog: buildInstallments(BASE.katalog),
  "v3.1": buildInstallments(BASE["v3.1"]),
};
export const baseCustomers = (pricing: BasePricing = "katalog") =>
  BASE[pricing];
export const baseInstallments = (pricing: BasePricing = "katalog") =>
  BASE_INSTALLMENTS[pricing];
/** Temiz demo başlangıcı (katalog fiyatları). */
export const customers: Customer[] = BASE.katalog;
export const installments: Installment[] = BASE_INSTALLMENTS.katalog;
// İş paketleri, hakediş/satın alma talepleri ve evrak kayıtları kurgusaldır (temsili demo verisi).
const wp = (
  id: string,
  project: string,
  name: string,
  company: string,
  progress: number,
  weight: number,
  value: number,
  status: string,
  material: string,
) => ({ id, project, name, company, progress, weight, value, status, material });
export const workItems = [
  wp("w1", "verdora", "Temel ve zemin işleri", FIRM.yapi, 100, 15, 12600000, "Tamamlandı", "Teslim alındı"),
  wp("w2", "verdora", "Betonarme taşıyıcı sistem", FIRM.yapi, 60, 35, 43800000, "Devam ediyor", "C35 beton · planlandı"),
  wp("w3", "verdora", "Mekanik ve elektrik altyapı", FIRM.teknik, 0, 25, 24500000, "Planlandı", "Kablo · onay bekliyor"),
  wp("w4", "verdora", "Cephe ve ince işler", FIRM.cephe, 8, 25, 22400000, "Devam ediyor", "Alüminyum profil · sipariş onayı bekliyor"),
  wp("w5", "sanetime", "Temel ve zemin işleri", FIRM.yapi, 100, 15, 7800000, "Tamamlandı", "Teslim alındı"),
  wp("w6", "sanetime", "Betonarme taşıyıcı sistem", FIRM.yapi, 45, 40, 26400000, "3 gün gecikme", "Demir · 18 Kasım"),
  wp("w7", "sanetime", "Mekanik ve elektrik altyapı", FIRM.teknik, 10, 20, 12600000, "Devam ediyor", "Kablo tavaları · sahada"),
  wp("w8", "sanetime", "Cephe ve ince işler", FIRM.cephe, 0, 25, 13900000, "Planlandı", "Planlama aşamasında"),
  wp("w9", "bulvarpark", "Temel ve zemin işleri", FIRM.yapi, 80, 20, 5200000, "Devam ediyor", "Hafriyat tamamlandı"),
  wp("w10", "bulvarpark", "Betonarme taşıyıcı sistem", FIRM.yapi, 0, 35, 14600000, "Planlandı", "Kalıp · teklif aşamasında"),
  wp("w11", "bulvarpark", "Mekanik ve elektrik altyapı", FIRM.teknik, 0, 20, 7400000, "Planlandı", "Planlama aşamasında"),
  wp("w12", "bulvarpark", "Cephe ve ince işler", FIRM.cephe, 0, 25, 8300000, "Planlandı", "Planlama aşamasında"),
];
export const approvals = [
  {
    id: "HAK-024",
    project: "verdora",
    company: FIRM.yapi,
    name: "4. kat betonarme hakedişi",
    type: "Hakediş",
    amount: 1250000,
    due: "2026-11-18",
    status: "Onay bekliyor",
  },
  {
    id: "SAT-018",
    project: "sanetime",
    company: FIRM.demir,
    name: "32 ton inşaat demiri",
    type: "Satın alma",
    amount: 890000,
    due: "2026-11-18",
    status: "Onay bekliyor",
  },
  {
    id: "SAT-019",
    project: "verdora",
    company: FIRM.teknik,
    name: "Elektrik altyapı malzemesi",
    type: "Satın alma",
    amount: 340000,
    due: "2026-11-22",
    status: "Onay bekliyor",
  },
  {
    id: "HAK-021",
    project: "sanetime",
    company: FIRM.yapi,
    name: "Temel imalatı hakedişi",
    type: "Hakediş",
    amount: 760000,
    due: "2026-11-20",
    status: "Onaylandı",
  },
  {
    id: "HAK-022",
    project: "bulvarpark",
    company: FIRM.yapi,
    name: "Hafriyat ve iksa hakedişi",
    type: "Hakediş",
    amount: 520000,
    due: "2026-11-24",
    status: "Onay bekliyor",
  },
];
export const documents = [
  {
    id: "EVR-001",
    project: "verdora",
    name: "Yapı ruhsatı kontrol dosyası",
    type: "Ruhsat",
    date: "2026-11-20",
    owner: "Proje yönetimi",
    status: "Kontrol bekliyor",
  },
  {
    id: "EVR-002",
    project: "sanetime",
    name: "Taşeron sözleşmesi kontrol listesi",
    type: "Sözleşme",
    date: "2026-11-18",
    owner: "Satın alma",
    status: "İncelemede",
  },
  {
    id: "EVR-003",
    project: "verdora",
    name: "Konut teslim hazırlık planı",
    type: "Teslim",
    date: "2026-11-30",
    owner: "Satış operasyon",
    status: "Taslak",
  },
  {
    id: "EVR-004",
    project: "sanetime",
    name: "Kasım saha toplantısı tutanağı",
    type: "Tutanak",
    date: "2026-11-16",
    owner: "Şantiye şefi",
    status: "Hazır",
  },
  {
    id: "EVR-005",
    project: "bulvarpark",
    name: "Zemin etüdü ve iksa raporu",
    type: "Teknik rapor",
    date: "2026-11-19",
    owner: "Proje yönetimi",
    status: "İncelemede",
  },
];
/** Tam TL tutarlar kuruşsuz, kuruşlu tutarlar iki haneli gösterilir. */
export const money = (n: number) => {
  const cents = Math.round(n * 100) % 100 !== 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
};
export const compact = (n: number) =>
  Math.abs(n) < 1000000
    ? money(n)
    : `₺${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n / 1000000)} mn`;
export const date = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
/** v1 özet hesabı; başlangıç verisi doğrulama testi (verify-data) tarafından kullanılır. */
export function stats(project = "all", paid: string[] = []) {
  const cs = customers.filter(
    (c) => project === "all" || c.project === project,
  );
  const ps = projects.filter((p) => project === "all" || p.id === project);
  const ins = installments.filter(
    (i) => project === "all" || i.project === project,
  );
  const revenue = cs.reduce((a, c) => a + c.price, 0);
  const collected =
    cs.reduce((a, c) => a + c.deposit + c.installment * c.paidMonths, 0) +
    ins.filter((i) => paid.includes(i.id)).reduce((a, i) => a + i.amount, 0);
  return {
    sold: cs.length,
    total: ps.reduce((a, p) => a + p.total, 0),
    reserved: ps.reduce((a, p) => a + p.reserved, 0),
    revenue,
    collected,
    balance: revenue - collected,
    budget: ps.reduce((a, p) => a + p.budget, 0),
    cost: ps.reduce((a, p) => a + p.cost, 0),
    overdue: ins
      .filter((i) => i.due < SNAPSHOT && !paid.includes(i.id))
      .reduce((a, i) => a + i.amount, 0),
    month: ins
      .filter((i) => i.due.startsWith("2026-11") && !paid.includes(i.id))
      .reduce((a, i) => a + i.amount, 0),
  };
}
