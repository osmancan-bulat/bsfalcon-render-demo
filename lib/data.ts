// Tamamen kurgusal demo envanteri: müşteri, firma, finans ve operasyon kayıtları gerçek şirket verisi değildir.
import { personName, FIRM } from "./names.ts";
import { unitById } from "./units.ts";
export const SNAPSHOT = "2026-11-15";
export type ProjectStatus = "Aktif" | "Tamamlandı" | "Arşiv";
/** Şirkete bağlı proje. Yerleşik projeler (Çengilli, Nergis Park) ve kullanıcının eklediği projeler aynı yapıyı kullanır. */
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
  /** Sözleşme numaralarında kullanılan kısa kod (SZL-CV-001). */
  code: string;
  status: ProjectStatus;
  builtIn?: boolean;
  created?: string;
};
export const projects: Project[] = [
  {
    id: "agva",
    name: "Ağva 1111 Triplex Villa",
    location: "Ağva, Şile / İstanbul",
    image: "/images/agva-triplex.webp",
    total: 1,
    reserved: 0,
    // Bütçe, maliyet ve ilerleme TEMSİLİ demo varsayımıdır.
    budget: 24000000,
    cost: 9600000,
    delivery: "Aralık 2027",
    progress: 48,
    description:
      "Ağva'da üç katlı yaşam kurgusuyla tasarlanan, akıllı ev altyapılı triplex villa; cam korkuluklu teras ve bahçe havuzu.",
    terms: "Villa · Akıllı ev · Şile / Ağva",
    mix: "1 triplex villa · akıllı ev konsepti",
    commercial: "Ticari birim yok.",
    code: "AG",
    status: "Aktif",
    builtIn: true,
  },
  {
    id: "cengilli",
    name: "Çengilli Villa Sitesi",
    location: "Çengilli Köyü, Şile / İstanbul",
    image: "/images/cengilli-villa.webp",
    total: 8,
    reserved: 0,
    budget: 150000000,
    cost: 52000000,
    delivery: "Kasım 2027",
    progress: 31,
    description:
      "Şile Çengilli'de yeşil arazide sıralanan, bahçeli ve havuzlu müstakil triplex villalar; akıllı ev konsepti.",
    terms: "Villa sitesi · Akıllı ev · Şile / Çengilli",
    mix: "Müstakil triplex villalar · villa adedi temsili (8)",
    commercial: "Ticari birim yok.",
    code: "CV",
    status: "Aktif",
    builtIn: true,
  },
  {
    id: "nergis",
    name: "Nergis Park Evleri",
    location: "İstanbul · metroya 200 m",
    image: "/images/nergis-park.webp",
    total: 38,
    reserved: 2,
    budget: 210000000,
    cost: 128000000,
    delivery: "",
    progress: 52,
    description:
      "Zemin + 7 kat, 1.360 m² alan üzerinde 35 daire ve 3 dükkândan oluşan konut + ticaret projesi; 2+1 ve 3+1 planlar.",
    terms: "Kat karşılığı demo senaryosu: proje durumu resmî kaynakta belirtilmemiştir; paylaşım ve satış verileri temsilidir.",
    mix: "Zemin + 7 kat · 35 daire + 3 dükkân",
    commercial: "3 dükkân (resmî)",
    code: "NP",
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
 * - "v3.1": önceki sürümün sabit bedelleri (Çengilli ₺14.200.000, diğer projeler ₺5.300.000).
 * Tarayıcıda daha önce işlem yapılmış kayıtlar hangi şemayla oluştuysa o şemayla açılır;
 * imzalı sözleşme bedelleri hiçbir geçişte yeniden fiyatlandırılmaz.
 */
export type BasePricing = "katalog" | "v3.1";
/**
 * Sisteme geçiş öncesi örnek satışlar (TEMSİLİ): hangi bağımsız bölümlerin satıldığı, ödenmiş taksit
 * sayısı ve kişi numarası başlangıcı. Satışlar yalnızca yüklenici payındaki bölümlerden yapılır.
 */
const BASE_SALES: Record<string, { units: number[]; paid: number; person: number }> = {
  nergis: { units: [1, 2, 3, 4, 5, 6, 7, 8, 9], paid: 6, person: 0 },
  cengilli: { units: [1, 2], paid: 8, person: 20 },
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
  project === "cengilli"
    ? { price: 14200000, deposit: 3400000, installment: 300000 }
    : { price: 5300000, deposit: 1340000, installment: 110000 };
function buildCustomers(pricing: BasePricing): Customer[] {
  return projects.flatMap((p) => {
    const b = BASE_SALES[p.id];
    if (!b) return [];
    return b.units.map((no, i) => ({
      id: `${p.id}-${no}`,
      project: p.id,
      name: personName(i + b.person + 1),
      unit: unitById(`${p.id}-${no}`)?.label ?? String(no),
      ...(pricing === "katalog" ? catalogPlan(p.id, no) : legacyPlan(p.id)),
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
// İş paketleri, hakediş/satın alma talepleri ve evrak kayıtları TEMSİLİ demo verisidir.
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
  wp("w1", "agva", "Temel ve bodrum betonarme", FIRM.yapi, 100, 25, 2200000, "Tamamlandı", "Teslim alındı"),
  wp("w2", "agva", "Kaba inşaat · 3 kat", FIRM.yapi, 60, 35, 5600000, "Devam ediyor", "Çatı betonu planlandı"),
  wp("w3", "agva", "Akıllı ev ve elektrik altyapısı", FIRM.teknik, 10, 20, 3100000, "Devam ediyor", "Otomasyon paneli · sipariş onayında"),
  wp("w4", "agva", "Cephe, havuz ve peyzaj", FIRM.cephe, 0, 20, 4400000, "Planlandı", "Taş kaplama numuneleri bekleniyor"),
  wp("w5", "cengilli", "Altyapı ve parsel hazırlığı", FIRM.yapi, 100, 15, 4800000, "Tamamlandı", "Teslim alındı"),
  wp("w6", "cengilli", "Villa kaba inşaatları", FIRM.yapi, 40, 40, 22000000, "3 gün gecikme", "Demir · 18 Kasım"),
  wp("w7", "cengilli", "Akıllı ev altyapısı", FIRM.teknik, 0, 20, 8600000, "Planlandı", "Teknik şartname onayında"),
  wp("w8", "cengilli", "Çatı, cephe ve peyzaj", FIRM.cephe, 0, 25, 12400000, "Planlandı", "Planlama aşamasında"),
  wp("w9", "nergis", "Temel ve bodrum", FIRM.yapi, 100, 15, 9500000, "Tamamlandı", "Teslim alındı"),
  wp("w10", "nergis", "Betonarme · zemin + 7 kat", FIRM.yapi, 80, 35, 38000000, "Devam ediyor", "7. kat kalıbı sahada"),
  wp("w11", "nergis", "Mekanik ve elektrik tesisat", FIRM.teknik, 30, 20, 18500000, "Devam ediyor", "Kablo tavaları · sahada"),
  wp("w12", "nergis", "Cephe ve ince işler", FIRM.cephe, 10, 30, 26000000, "Devam ediyor", "Çerçeveli balkon profilleri siparişte"),
];
export const approvals = [
  { id: "HAK-024", project: "nergis", company: FIRM.yapi, name: "Betonarme 7. kat hakedişi", type: "Hakediş", amount: 1250000, due: "2026-11-18", status: "Onay bekliyor" },
  { id: "SAT-018", project: "cengilli", company: FIRM.demir, name: "28 ton inşaat demiri", type: "Satın alma", amount: 820000, due: "2026-11-18", status: "Onay bekliyor" },
  { id: "SAT-019", project: "agva", company: FIRM.teknik, name: "Akıllı ev altyapı malzemesi", type: "Satın alma", amount: 340000, due: "2026-11-22", status: "Onay bekliyor" },
  { id: "HAK-021", project: "nergis", company: FIRM.yapi, name: "Betonarme 6. kat hakedişi", type: "Hakediş", amount: 1380000, due: "2026-11-20", status: "Onaylandı" },
];
export const documents = [
  { id: "EVR-001", project: "cengilli", name: "Parsel bazlı yapı ruhsatı kontrol dosyası", type: "Ruhsat", date: "2026-11-20", owner: "Proje yönetimi", status: "Kontrol bekliyor" },
  { id: "EVR-002", project: "nergis", name: "Kat karşılığı sözleşmesi ek protokol kontrolü", type: "Sözleşme", date: "2026-11-18", owner: "Hukuk ve sözleşme", status: "İncelemede" },
  { id: "EVR-003", project: "agva", name: "Akıllı ev sistemleri teknik şartnamesi", type: "Teknik", date: "2026-11-30", owner: "Teknik ofis", status: "Taslak" },
  { id: "EVR-004", project: "nergis", name: "Kasım saha toplantısı tutanağı", type: "Tutanak", date: "2026-11-16", owner: "Şantiye şefi", status: "Hazır" },
  { id: "EVR-005", project: "cengilli", name: "Bitirme ve inşaat tamamlama sigortası belge takibi (temsili)", type: "Güvence", date: "2026-11-25", owner: "Proje yönetimi", status: "Kontrol bekliyor" },
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
