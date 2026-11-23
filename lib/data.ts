// Inventario de demostración: clientes, proveedores, montos y operaciones son DATOS DE EJEMPLO,
// no registros reales de EDIFICA. Los proyectos y sus datos publicados están en lib/company.ts.
import { personName, FIRM } from "./names.ts";
import { unitById } from "./units.ts";
export const SNAPSHOT = "2026-11-15";
export type ProjectStatus = "Activo" | "Finalizado" | "Archivado";
/** Proyecto de la empresa. Los proyectos precargados y los que agrega el usuario comparten la estructura. */
export type Project = {
  id: string;
  name: string;
  location: string;
  image: string;
  /** Cantidad de unidades cargadas (se calcula desde el catálogo). */
  total: number;
  /** Unidades reservadas en el escenario inicial (solo proyectos precargados). */
  reserved: number;
  /** Presupuesto y costo de ejemplo (USD). */
  budget: number;
  cost: number;
  delivery: string;
  progress: number;
  description: string;
  terms: string;
  mix: string;
  commercial: string;
  /** Código corto usado en la numeración de contratos (CTR-ALN-001). */
  code: string;
  status: ProjectStatus;
  builtIn?: boolean;
  created?: string;
};
export const projects: Project[] = [
  {
    id: "lofty",
    name: "Lofty City Hub",
    location: "Ciudad del Este",
    image: "/images/edifica/lofty-torre.jpg",
    total: 48,
    reserved: 2,
    budget: 9800000,
    cost: 3900000,
    delivery: "",
    progress: 33,
    description:
      "Desarrollo de uso mixto con unidades amobladas, plaza comercial de triple altura, centro de convenciones en la planta 15 y rooftop gastronómico en el nivel 23.",
    terms: "Figura en el portafolio de EDIFICA y en el sitio de Métrika; el rol de cada empresa no se detalla en las fuentes consultadas.",
    mix: "ONE 23 · DUO · SHARE · SUITE 1D · SUITE 2D · SUITE 2D L (muestra de 48 unidades)",
    commercial: "Plaza comercial con seis locales (publicado; no cargados en la demo).",
    code: "LCH",
    status: "Activo",
    builtIn: true,
  },
  {
    id: "alion",
    name: "ALION Residence",
    location: "Boquerón I, Ciudad del Este",
    image: "/images/edifica/alion-torre.jpg",
    total: 64,
    reserved: 2,
    budget: 6400000,
    cost: 3550000,
    delivery: "Octubre 2027",
    progress: 49,
    description:
      "Edificio residencial de 14 plantas a dos cuadras del lago: monoambientes de 24,92 a 32,30 m² y unidades de 2 dormitorios de 72,20 m², al frente o contrafrente.",
    terms: "Desarrollador: EDIFICA. Precio publicado: desde USD 65.955.",
    mix: "Monoambientes T1–T5 · 2 dormitorios T6 · 8 unidades por piso (pisos 3–10 cargados)",
    commercial: "Sin locales comerciales publicados.",
    code: "ALN",
    status: "Activo",
    builtIn: true,
  },
  {
    id: "vtower",
    name: "V Tower del Lago",
    location: "Costanera del Lago de la República, Ciudad del Este",
    image: "/images/edifica/v-tower-aereo.jpg",
    total: 24,
    reserved: 1,
    budget: 5200000,
    cost: 1450000,
    delivery: "Abril 2029",
    progress: 24,
    description:
      "Tres torres residenciales frente al Lago de la República con 265 unidades publicadas, locales en planta baja y azoteas con piscina infinita.",
    terms: "Desarrolla Vierci Development y EDIFICA · Proyecta Path Urban · Construye Grupo AGH. Plan publicado: 20 % entrega · 60 % cuotas · 20 % llaves.",
    mix: "265 unidades en 3 torres (publicado) · muestra de 24 unidades de ejemplo",
    commercial: "Locales en planta baja (publicado; no cargados en la demo).",
    code: "VTL",
    status: "Activo",
    builtIn: true,
  },
  {
    id: "business",
    name: "Business One",
    location: "Calle Capitán Bado, Área 01 · Ciudad del Este",
    image: "/images/edifica/business-one-torre.jpg",
    total: 48,
    reserved: 2,
    budget: 8600000,
    cost: 1200000,
    delivery: "",
    progress: 12,
    description:
      "Edificio corporativo de dos torres de 7 pisos articuladas por un patio central: oficinas privadas desde 57 m², coworking, auditorio para 100 personas y cafetería.",
    terms: "Desarrollo de EDIFICA. Superficies sujetas a verificación final; disponibilidad próximamente.",
    mix: "48 oficinas según plantas del brochure (Torre 01: 26 · Torre 02: 22)",
    commercial: "Oficinas corporativas.",
    code: "B1",
    status: "Activo",
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
  /** Plan de pagos flexible (contratos nuevos). Si no existe se aplican 36 cuotas iguales. */
  plan?: import("./plan.ts").PlanSpec;
  /** Precio de lista al momento de la venta; para calcular el descuento. */
  listPrice?: number;
};
/**
 * Esquema de precios de las ventas previas a la implementación del sistema.
 * - "katalog": escenario limpio; el precio se deriva del precio de lista con un margen de negociación.
 * - "v3.1": esquema anterior conservado por compatibilidad de datos guardados.
 * Los contratos firmados nunca se vuelven a fijar precio en una migración.
 */
export type BasePricing = "katalog" | "v3.1";
/**
 * Ventas previas a la implementación (DATOS DE EJEMPLO): unidades vendidas, cuotas ya pagadas y
 * número inicial de cliente de ejemplo.
 */
const BASE_SALES: Record<string, { units: number[]; paid: number; person: number }> = {
  lofty: { units: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], paid: 8, person: 0 },
  alion: { units: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], paid: 10, person: 20 },
  vtower: { units: [1, 2, 3, 4, 5, 6], paid: 5, person: 45 },
};
const catalogPlan = (project: string, no: number) => {
  const list = unitById(`${project}-${no}`)?.listPrice ?? 0;
  // Anticipo de ejemplo: ~20 % del precio de lista (redondeado a USD 500)
  const deposit = Math.round((list * 0.2) / 500) * 500;
  const installment =
    Math.round((list * (0.96 + ((no * 3) % 5) * 0.005) - deposit) / 36 / 5) * 5;
  return { deposit, installment, price: deposit + 36 * installment };
};
const legacyPlan = (project: string) =>
  project === "alion"
    ? { price: 64800, deposit: 13320, installment: 1430 }
    : { price: 86400, deposit: 17280, installment: 1920 };
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
  kind?: "Cuota" | "Pago intermedio";
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
/** Escenario limpio de la demo (precios de catálogo). */
export const customers: Customer[] = BASE.katalog;
export const installments: Installment[] = BASE_INSTALLMENTS.katalog;
// Paquetes de obra, solicitudes de pago y documentos: DATOS DE EJEMPLO.
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
  wp("w1", "lofty", "Estructura de hormigón", FIRM.yapi, 60, 45, 1650000, "En curso", "Losa del piso 12 programada"),
  wp("w2", "lofty", "Instalaciones eléctricas y sanitarias", FIRM.teknik, 20, 30, 820000, "En curso", "Tableros en aprobación"),
  wp("w3", "lofty", "Fachada y terminaciones", FIRM.cephe, 0, 25, 1100000, "Planificado", "Muestras de revestimiento pendientes"),
  wp("w4", "alion", "Estructura de hormigón · 14 plantas", FIRM.yapi, 80, 45, 1420000, "En curso", "Planta 13 en encofrado"),
  wp("w5", "alion", "Instalaciones", FIRM.teknik, 40, 30, 640000, "En curso", "Cañerías en pisos 3–8"),
  wp("w6", "alion", "Mampostería, fachada y terminaciones", FIRM.cephe, 4, 25, 710000, "En curso", "Mampostería en pisos 3–6"),
  wp("w7", "vtower", "Fundaciones Torre I", FIRM.yapi, 60, 40, 980000, "En curso", "Pilotes al 60 %"),
  wp("w8", "vtower", "Estructura Torre I", FIRM.yapi, 0, 60, 2100000, "Planificado", "Inicio previsto en enero"),
  wp("w9", "business", "Movimiento de suelo y fundaciones", FIRM.yapi, 30, 40, 520000, "En curso", "Excavación Torre 01"),
  wp("w10", "business", "Estructura Torres 01 y 02", FIRM.yapi, 0, 60, 1900000, "Planificado", "Planificación"),
];
export const approvals = [
  { id: "CER-024", project: "alion", company: FIRM.yapi, name: "Certificado de obra · estructura planta 12", type: "Certificado de obra", amount: 48500, due: "2026-11-18", status: "Pendiente de aprobación" },
  { id: "OC-018", project: "lofty", company: FIRM.demir, name: "Acero para losas · 24 t", type: "Compra", amount: 26400, due: "2026-11-18", status: "Pendiente de aprobación" },
  { id: "OC-019", project: "business", company: FIRM.teknik, name: "Tableros eléctricos provisorios de obra", type: "Compra", amount: 9800, due: "2026-11-22", status: "Pendiente de aprobación" },
  { id: "CER-021", project: "alion", company: FIRM.yapi, name: "Certificado de obra · estructura planta 11", type: "Certificado de obra", amount: 47200, due: "2026-11-20", status: "Aprobado" },
];
export const documents = [
  { id: "DOC-001", project: "business", name: "Planos de oficinas · versión brochure (superficies a verificar)", type: "Técnico", date: "2026-11-20", owner: "Proyectos", status: "Pendiente de revisión" },
  { id: "DOC-002", project: "alion", name: "Modelo de contrato de compraventa · revisión legal", type: "Contrato", date: "2026-11-18", owner: "Legal", status: "En revisión" },
  { id: "DOC-003", project: "vtower", name: "Reglamento de cocheras y bauleras", type: "Comercial", date: "2026-11-30", owner: "Comercial", status: "Borrador" },
  { id: "DOC-004", project: "lofty", name: "Acta de reunión de obra · noviembre", type: "Acta", date: "2026-11-16", owner: "Dirección de obra", status: "Listo" },
];

// ---------------------------------------------------------------------------------------------
// Moneda y formato (Paraguay). Todos los montos se registran en USD. La vista en guaraníes usa
// exclusivamente el tipo de cambio de referencia definido en Configuración; no hay conversión automática.
export type DisplayCurrency = "USD" | "PYG";
let DISPLAY: { currency: DisplayCurrency; rate: number } = { currency: "USD", rate: 7300 };
export const setDisplayCurrency = (currency: DisplayCurrency, rate: number) => {
  DISPLAY = { currency, rate: rate > 0 ? rate : DISPLAY.rate };
};
export const displayCurrency = () => DISPLAY;
const nf = (digits: number) =>
  new Intl.NumberFormat("es-PY", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** Monto en dólares: "US$ 65.955" o "US$ 1.565,19". */
export const usd = (n: number) => {
  const cents = Math.round(Math.abs(n) * 100) % 100 !== 0;
  return `${n < 0 ? "-" : ""}US$ ${nf(cents ? 2 : 0).format(Math.abs(n))}`;
};
/** Monto en guaraníes al tipo de cambio indicado (sin decimales): "₲ 481.471.500". */
export const gs = (n: number, rate = DISPLAY.rate) =>
  `${n < 0 ? "-" : ""}₲ ${nf(0).format(Math.round(Math.abs(n) * rate))}`;
/** Monto en la moneda de visualización elegida. */
export const money = (n: number) => (DISPLAY.currency === "PYG" ? gs(n) : usd(n));
export const compact = (n: number) => {
  if (DISPLAY.currency === "PYG") {
    const v = n * DISPLAY.rate;
    return Math.abs(v) < 1e6 ? gs(n) : `₲ ${new Intl.NumberFormat("es-PY", { maximumFractionDigits: 1 }).format(v / 1e6)} M`;
  }
  return Math.abs(n) < 1000000
    ? usd(n)
    : `US$ ${new Intl.NumberFormat("es-PY", { maximumFractionDigits: 2 }).format(n / 1000000)} M`;
};
export const date = (d: string) =>
  new Date(d + "T12:00:00")
    .toLocaleDateString("es-PY", { day: "numeric", month: "short", year: "numeric" })
    .replace(".", "");
/** Resumen v1; usado por la prueba del conjunto de datos inicial (verify-data). */
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
