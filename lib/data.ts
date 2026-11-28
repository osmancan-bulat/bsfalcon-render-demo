// By Güzel demo envanteri. Müşteri, firma, sözleşme, tahsilat ve gider kayıtları TEMSİLİDİR (gerçek veri değildir).
// Proje adları, konumları, tipleri, metrekare aralıkları, yapım yılları ve yayımlanan başlangıç fiyatları
// byguzel.com / guzelinvest.com kaynaklıdır (bkz. lib/portfolio.ts).
import { personName, FIRM } from "./names.ts";
import { unitById } from "./units.ts";
import { SYMBOL, currencyView, inView, type Currency } from "./currency.ts";
export const SNAPSHOT = "2026-11-15";
export type ProjectStatus = "Aktif" | "Tamamlandı" | "Arşiv";
/** Şirkete bağlı proje. Yerleşik projeler ve kullanıcının eklediği projeler aynı yapıyı kullanır. */
export type Project = {
  id: string;
  name: string;
  location: string;
  image: string;
  /** Bağımsız bölüm sayısı (katalogdan hesaplanır). */
  total: number;
  /** Başlangıç senaryosundaki rezerve daire sayısı (yalnızca yerleşik projeler). */
  reserved: number;
  /** Temsili bütçe ve maliyet varsayımı (TRY). */
  budget: number;
  cost: number;
  delivery: string;
  progress: number;
  description: string;
  terms: string;
  mix: string;
  commercial: string;
  /** Sözleşme numaralarında kullanılan kısa kod (SZL-GLP-001). */
  code: string;
  status: ProjectStatus;
  builtIn?: boolean;
  created?: string;
};
export const projects: Project[] = [
  {
    id: "agva",
    name: "City Prime",
    location: "Alanya, Antalya",
    image: "/images/byguzel/cp-0-9.jpg",
    total: 12,
    reserved: 1,
    budget: 96000000,
    cost: 61000000,
    delivery: "2025",
    progress: 92,
    description: "Ayrı mutfaklı 2+1 daireler, havuz, sauna ve çocuk oyun alanı olan site içi konut projesi; 65–122 m².",
    terms: "Yayımlanan: 2+1 için 185.000 € · 65–122 m² · yapım yılı 2025. Bağımsız bölüm adedi yayımlanmadı (demoda 12 örnek bölüm).",
    mix: "Örnek kurgu: 3 kat × 4 bölüm, tümü 2+1 (65–122 m²)",
    commercial: "Ticari birim yok.",
    code: "CP",
    status: "Aktif",
    builtIn: true,
  },
  {
    id: "cengilli",
    name: "Guzel Nature",
    location: "Alanya, Antalya",
    image: "/images/byguzel/gn-4-6.jpg",
    total: 40,
    reserved: 2,
    budget: 210000000,
    cost: 128000000,
    delivery: "2025",
    progress: 71,
    description: "Tek blok, altı katlı konut projesi. İlk kat sosyal alanlara ayrılmış: TV odası, masa tenisli dinlenme odası, kafeterya, çocuk oyun odası, fitness, sauna, buhar odası ve tuz odası.",
    terms: "Yayımlanan: 1+1 için 105.000 € · 50–180 m² · yapım yılı 2025. Daire adedi resmî kaynakta yayımlanmadı (demoda 40 örnek bölüm).",
    mix: "Örnek kurgu: 2–6. katlarda katta 8 bölüm (1+1, 2+1, çatı dubleks)",
    commercial: "İlk kat sosyal alan (resmî).",
    code: "GN",
    status: "Aktif",
    builtIn: true,
  },
  {
    id: "nergis",
    name: "Guzel Life Premium",
    location: "Oba, Alanya / Antalya",
    image: "/images/byguzel/glp-0-4.jpg",
    total: 90,
    reserved: 3,
    budget: 540000000,
    cost: 498000000,
    delivery: "Tamamlandı (2024)",
    progress: 100,
    description: "Beş konut bloğu ve toplam 90 daireden oluşan, kendi altyapısıyla geniş hizmet sunan premium konut kompleksi: ayrı mutfaklı 2+1 ve 3+1 daireler, 4+1 bahçe dubleks ve 5+1 dubleks penthouse.",
    terms: "Yayımlanan: 5 blok · 90 daire · 125–230 m² · 3+1 için 215.000 € · yapım yılı 2024 · vatandaşlık başvurusuna uygun ($400.000 sınırı, guzelinvest.com).",
    mix: "5 blok × 18 daire (blok içi kat ve tip dağılımı temsili)",
    commercial: "Sosyal tesis: açık ve kapalı havuz, fitness, sauna, buhar ve tuz odası, spor sahaları.",
    code: "GLP",
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
  /** Sözleşme para birimi. Bütün plan ve tahsilatlar bu para biriminde tutulur. */
  currency?: Currency;
  /** Alıcı uyruğu (temsili; yabancı alıcı süreçleri için). */
  nationality?: string;
};
/**
 * Örnek (sisteme geçiş öncesi) satışların fiyatlandırma şeması.
 * - "katalog": temiz demo başlangıcı; fiyat liste fiyatından pazarlık payıyla türetilir.
 * - "v3.1": önceki sürümün sabit bedelleri (kayıtlı tarayıcı verisi uyumluluğu).
 */
export type BasePricing = "katalog" | "v3.1";
/** Sisteme geçiş öncesi örnek satışlar (TEMSİLİ). */
const BASE_SALES: Record<string, { units: number[]; paid: number; person: number }> = {
  nergis: { units: Array.from({ length: 44 }, (_, i) => i + 1), paid: 14, person: 0 },
  cengilli: { units: Array.from({ length: 14 }, (_, i) => i + 1), paid: 6, person: 50 },
  agva: { units: [1, 2, 3, 4, 5], paid: 4, person: 70 },
};
const NATIONS = ["Almanya", "Türkiye", "Ukrayna", "İsveç", "Kazakistan", "Hollanda", "Rusya", "İran", "Norveç", "Polonya", "İngiltere"];
/** Temsili sözleşme para birimi: çoğu EUR; bazı alıcılar USD veya TRY ile sözleşme yapar. */
const baseCurrency = (project: string, no: number): Currency =>
  project === "nergis" && no % 6 === 0 ? "USD" : project === "cengilli" && no >= 13 ? "TRY" : "EUR";
/** Yalnızca örnek satış bedeli üretmek için sabit çarpanlar (canlı kur değildir). */
export const SEED_RATE: Record<Currency, number> = { EUR: 1, USD: 1.08, TRY: 37 };
const ROUND: Record<Currency, number> = { EUR: 500, USD: 500, TRY: 10000 };
const catalogPlan = (project: string, no: number) => {
  const cur = baseCurrency(project, no);
  const list = (unitById(`${project}-${no}`)?.listPrice ?? 0) * SEED_RATE[cur];
  const deposit = Math.round((list * 0.35) / ROUND[cur]) * ROUND[cur];
  const step = cur === "TRY" ? 100 : 5;
  const installment = Math.round((list * (0.96 + ((no * 3) % 5) * 0.005) - deposit) / 36 / step) * step;
  return { deposit, installment, price: deposit + 36 * installment, currency: cur };
};
const legacyPlan = (project: string) =>
  project === "nergis"
    ? { price: 210000, deposit: 73200, installment: 3800, currency: "EUR" as Currency }
    : { price: 120000, deposit: 42240, installment: 2160, currency: "EUR" as Currency };
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
      nationality: NATIONS[(i + b.person) % NATIONS.length],
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
export const baseCustomers = (pricing: BasePricing = "katalog") => BASE[pricing];
export const baseInstallments = (pricing: BasePricing = "katalog") => BASE_INSTALLMENTS[pricing];
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
  wp("w1", "agva", "Kaba yapı ve çatı", FIRM.yapi, 100, 40, 21000000, "Tamamlandı", "Teslim alındı"),
  wp("w2", "agva", "Mekanik ve elektrik tesisat", FIRM.teknik, 90, 35, 14500000, "Devam ediyor", "Asansör montajı"),
  wp("w3", "agva", "İnce işler ve peyzaj", FIRM.cephe, 82, 25, 16000000, "Devam ediyor", "Havuz kaplaması"),
  wp("w4", "cengilli", "Kaba yapı · 6 kat", FIRM.yapi, 100, 35, 42000000, "Tamamlandı", "Teslim alındı"),
  wp("w5", "cengilli", "Sosyal alan katı (fitness, sauna, tuz odası)", FIRM.teknik, 60, 20, 18000000, "Devam ediyor", "Sauna ekipmanı siparişte"),
  wp("w6", "cengilli", "Cephe, doğrama ve ince işler", FIRM.cephe, 60, 30, 36000000, "Devam ediyor", "PVC doğrama · 4. kat"),
  wp("w7", "cengilli", "Havuz ve çevre düzenlemesi", FIRM.aluminyum, 40, 15, 12000000, "Devam ediyor", "Havuz izolasyonu"),
  wp("w8", "nergis", "Kaba yapı · 5 blok", FIRM.yapi, 100, 40, 186000000, "Tamamlandı", "Teslim alındı"),
  wp("w9", "nergis", "Tesisat ve asansörler", FIRM.teknik, 100, 25, 98000000, "Tamamlandı", "Teslim alındı"),
  wp("w10", "nergis", "İnce işler, sosyal tesis ve peyzaj", FIRM.cephe, 100, 35, 154000000, "Tamamlandı", "Teslim alındı"),
];
export const approvals = [
  { id: "HAK-024", project: "cengilli", company: FIRM.cephe, name: "Cephe ve doğrama 4. kat hakedişi", type: "Hakediş", amount: 1850000, due: "2026-11-18", status: "Onay bekliyor" },
  { id: "SAT-018", project: "cengilli", company: FIRM.teknik, name: "Sauna ve buhar odası ekipmanı", type: "Satın alma", amount: 940000, due: "2026-11-18", status: "Onay bekliyor" },
  { id: "SAT-019", project: "agva", company: FIRM.aluminyum, name: "Havuz kenarı şezlong ve gölgelik", type: "Satın alma", amount: 320000, due: "2026-11-22", status: "Onay bekliyor" },
  { id: "HAK-021", project: "cengilli", company: FIRM.yapi, name: "Kaba yapı son hakediş", type: "Hakediş", amount: 1380000, due: "2026-11-20", status: "Onaylandı" },
];
export const documents = [
  { id: "EVR-001", project: "nergis", name: "İskân belgesi ve kat irtifakı → kat mülkiyeti dosyası", type: "Ruhsat", date: "2026-11-20", owner: "Tapu ve hukuk", status: "Kontrol bekliyor" },
  { id: "EVR-002", project: "cengilli", name: "Yapı ruhsatı ve proje revizyon dosyası", type: "Ruhsat", date: "2026-11-18", owner: "Proje yönetimi", status: "İncelemede" },
  { id: "EVR-003", project: "agva", name: "Teslim tutanağı şablonu (TR/EN/RU)", type: "Teknik", date: "2026-11-30", owner: "Satış sonrası", status: "Taslak" },
  { id: "EVR-004", project: "nergis", name: "Site yönetim planı ve aidat tablosu 2027", type: "Tutanak", date: "2026-11-16", owner: "Site yönetimi", status: "Hazır" },
];
const FMT: Record<Currency, Intl.NumberFormat[]> = {
  TRY: [0, 2].map((d) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: d, maximumFractionDigits: d })),
  EUR: [0, 2].map((d) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR", minimumFractionDigits: d, maximumFractionDigits: d })),
  USD: [0, 2].map((d) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d })),
};
/** Belirli para biriminde tutar: tam tutarlar kuruşsuz, kuruşlu tutarlar iki haneli. */
export const moneyIn = (n: number, c: Currency) => FMT[c][Math.round(n * 100) % 100 !== 0 ? 1 : 0].format(n);
/** Etkin para birimi görünümünde tutar (görünüm yoksa TRY). */
export const money = (n: number) => moneyIn(n, currencyView() ?? "TRY");
export const compact = (n: number) => {
  const c = currencyView() ?? "TRY";
  return Math.abs(n) < 1000000 ? moneyIn(n, c) : `${SYMBOL[c]}${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n / 1000000)} mn`;
};
export const date = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
/** v1 özet hesabı; başlangıç verisi doğrulama testi (verify-data) tarafından kullanılır. */
export function stats(project = "all", paid: string[] = []) {
  const cs = customers.filter((c) => (project === "all" || c.project === project) && inView(c.currency ?? "EUR"));
  const ids = new Set(cs.map((c) => c.id));
  const ps = projects.filter((p) => project === "all" || p.id === project);
  const ins = installments.filter((i) => ids.has(i.customerId));
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
    overdue: ins.filter((i) => i.due < SNAPSHOT && !paid.includes(i.id)).reduce((a, i) => a + i.amount, 0),
    month: ins.filter((i) => i.due.startsWith("2026-11") && !paid.includes(i.id)).reduce((a, i) => a + i.amount, 0),
  };
}
