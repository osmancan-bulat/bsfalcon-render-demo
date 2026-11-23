// Tamamen kurgusal demo envanteri: müşteri, firma, finans ve operasyon kayıtları gerçek şirket verisi değildir.
import { personName, FIRM } from "./names.ts";
import { unitById } from "./units.ts";
export const SNAPSHOT = "2026-11-15";
export type ProjectStatus = "Aktif" | "Tamamlandı" | "Arşiv";
/** Şirkete bağlı proje. Yerleşik projeler (Corner, Primador) ve kullanıcının eklediği projeler aynı yapıyı kullanır. */
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
  /** Sözleşme numaralarında kullanılan kısa kod (SZL-CP-001). */
  code: string;
  status: ProjectStatus;
  builtIn?: boolean;
  created?: string;
};
export const projects: Project[] = [
  {
    id: "corner",
    name: "Corner Prestij",
    location: "Esenboğa / Ankara",
    image: "/images/corner.webp",
    total: 72,
    reserved: 4,
    budget: 180000000,
    cost: 64800000,
    delivery: "Kasım 2028",
    progress: 38,
    description:
      "Üniversite, havalimanı ve savunma sanayi aksında konut yaşamı.",
    terms: "850.000 TL peşinat · 36 ay faizsiz taksit",
    mix: "72 konut · örnek envanter",
    commercial: "Ticari envanter bu senaryoya dahil değildir.",
    code: "CP",
    status: "Aktif",
    builtIn: true,
  },
  {
    id: "primador",
    name: "Primador Esenboğa",
    location: "Yenice, Çubuk / Ankara",
    image: "/images/primador.webp",
    total: 106,
    reserved: 6,
    budget: 220000000,
    cost: 55000000,
    delivery: "Haziran 2028",
    progress: 26,
    description: "Konut ve ticari yaşamı buluşturan, yatırım odaklı proje.",
    terms: "Havalimanı ve Yıldırım Beyazıt Üniversitesi yakınında",
    mix: "100 adet 1+1 · 6 adet 2+1",
    commercial: "Ticari dükkânlar: adet ve satış verisi teyit bekliyor.",
    code: "PE",
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
 * - "v3.1": önceki sürümün sabit bedelleri (Corner ₺3.550.000, Primador ₺2.650.000).
 * Tarayıcıda daha önce işlem yapılmış kayıtlar hangi şemayla oluştuysa o şemayla açılır;
 * imzalı sözleşme bedelleri hiçbir geçişte yeniden fiyatlandırılmaz.
 */
export type BasePricing = "katalog" | "v3.1";
const catalogPlan = (project: string, no: number) => {
  const list = unitById(`${project}-${no}`)?.listPrice ?? 0;
  const deposit = 850000;
  const installment =
    Math.round((list * (0.96 + ((no * 3) % 5) * 0.005) - deposit) / 36 / 250) *
    250;
  return { deposit, installment, price: deposit + 36 * installment };
};
const legacyPlan = (project: string) =>
  project === "corner"
    ? { price: 3550000, deposit: 850000, installment: 75000 }
    : { price: 2650000, deposit: 850000, installment: 50000 };
function buildCustomers(pricing: BasePricing): Customer[] {
  return projects.flatMap((p, pi) =>
    Array.from({ length: pi === 0 ? 38 : 42 }, (_, i) => ({
      id: `${p.id}-${i + 1}`,
      project: p.id,
      name: personName(i + pi * 38 + 1),
      unit: `${i % 2 === 0 ? "A" : "B"}-${String(i + 1).padStart(2, "0")}`,
      ...(pricing === "katalog" ? catalogPlan(p.id, i + 1) : legacyPlan(p.id)),
      paidMonths: pi === 0 ? 4 : 3,
    })),
  );
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
export const workItems = [
  {
    id: "w1",
    project: "corner",
    name: "Temel ve zemin işleri",
    company: FIRM.yapi,
    progress: 100,
    weight: 15,
    /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
    value: 4800000,
    status: "Tamamlandı",
    material: "Teslim alındı",
  },
  {
    id: "w2",
    project: "corner",
    name: "Betonarme taşıyıcı sistem",
    company: FIRM.yapi,
    progress: 60,
    weight: 35,
    /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
    value: 16500000,
    status: "Devam ediyor",
    material: "C30 beton · planlandı",
  },
  {
    id: "w3",
    project: "corner",
    name: "Mekanik ve elektrik altyapı",
    company: FIRM.teknik,
    progress: 0,
    weight: 25,
    /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
    value: 9600000,
    status: "Planlandı",
    material: "Kablo · onay bekliyor",
  },
  {
    id: "w4",
    project: "corner",
    name: "Cephe ve ince işler",
    company: FIRM.cephe,
    progress: 8,
    weight: 25,
    /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
    value: 8400000,
    status: "Devam ediyor",
    material: "Alüminyum profil · sipariş onayı bekliyor",
  },
  {
    id: "w5",
    project: "primador",
    name: "Temel ve zemin işleri",
    company: FIRM.yapi,
    progress: 100,
    weight: 15,
    /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
    value: 3900000,
    status: "Tamamlandı",
    material: "Teslim alındı",
  },
  {
    id: "w6",
    project: "primador",
    name: "Betonarme taşıyıcı sistem",
    company: FIRM.yapi,
    progress: 25,
    weight: 40,
    /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
    value: 14200000,
    status: "3 gün gecikme",
    material: "Demir · 18 Kasım",
  },
  {
    id: "w7",
    project: "primador",
    name: "Mekanik ve elektrik altyapı",
    company: FIRM.teknik,
    progress: 5,
    weight: 20,
    /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
    value: 6800000,
    status: "Devam ediyor",
    material: "Kablo tavaları · sahada",
  },
  {
    id: "w8",
    project: "primador",
    name: "Cephe ve ince işler",
    company: FIRM.cephe,
    progress: 0,
    weight: 25,
    /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
    value: 7500000,
    status: "Planlandı",
    material: "Planlama aşamasında",
  },
];
export const approvals = [
  {
    id: "HAK-024",
    project: "corner",
    company: FIRM.yapi,
    name: "4. kat betonarme hakedişi",
    type: "Hakediş",
    amount: 1250000,
    due: "2026-11-18",
    status: "Onay bekliyor",
  },
  {
    id: "SAT-018",
    project: "primador",
    company: FIRM.demir,
    name: "32 ton inşaat demiri",
    type: "Satın alma",
    amount: 890000,
    due: "2026-11-18",
    status: "Onay bekliyor",
  },
  {
    id: "SAT-019",
    project: "corner",
    company: FIRM.teknik,
    name: "Elektrik altyapı malzemesi",
    type: "Satın alma",
    amount: 340000,
    due: "2026-11-22",
    status: "Onay bekliyor",
  },
  {
    id: "HAK-021",
    project: "primador",
    company: FIRM.yapi,
    name: "Temel imalatı hakedişi",
    type: "Hakediş",
    amount: 760000,
    due: "2026-11-20",
    status: "Onaylandı",
  },
];
export const documents = [
  {
    id: "EVR-001",
    project: "corner",
    name: "Yapı ruhsatı kontrol dosyası",
    type: "Ruhsat",
    date: "2026-11-20",
    owner: "Proje yönetimi",
    status: "Kontrol bekliyor",
  },
  {
    id: "EVR-002",
    project: "primador",
    name: "Taşeron sözleşmesi kontrol listesi",
    type: "Sözleşme",
    date: "2026-11-18",
    owner: "Satın alma",
    status: "İncelemede",
  },
  {
    id: "EVR-003",
    project: "corner",
    name: "Konut teslim hazırlık planı",
    type: "Teslim",
    date: "2026-11-30",
    owner: "Satış operasyon",
    status: "Taslak",
  },
  {
    id: "EVR-004",
    project: "primador",
    name: "Kasım saha toplantısı tutanağı",
    type: "Tutanak",
    date: "2026-11-16",
    owner: "Şantiye şefi",
    status: "Hazır",
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
