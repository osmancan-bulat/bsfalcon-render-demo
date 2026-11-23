// Catálogo de unidades — demo para EDIFICA Desarrollos Inmobiliarios (Ciudad del Este, Paraguay).
// Fuentes públicas consultadas el 23 nov 2026:
// - ALION Residence: estructura de unidades (código, tipología, dormitorios, rumbo y m² propios) tomada de la
//   planilla pública "Departamentos disponibles" enlazada desde edifica.com.py (pisos 3 a 10, 8 unidades por piso).
//   Precios, estados de venta y clientes de esa planilla NO se usan: en la demo son datos de ejemplo.
// - Business One: oficinas y superficies según el brochure oficial (Torre 01 pisos 1–6 y 7; Torre 02 pisos 1–5 y 7).
//   El piso 6 de la Torre 02 no está detallado en el brochure y no se carga. Superficies sujetas a verificación final.
// - Lofty City Hub: tipologías ONE 23, DUO, SHARE, SUITE 1D, SUITE 2D y SUITE 2D L (metrika.com.py). Cantidad de
//   unidades no publicada: la demo carga una MUESTRA de 48 unidades (pisos 9–14).
// - V Tower del Lago: 3 torres y 265 unidades publicadas; tipologías y superficies no publicadas. La demo carga una
//   MUESTRA de 24 unidades de ejemplo en la Torre I.
// DATOS DE DEMOSTRACIÓN: todos los precios de lista son de ejemplo y no son precios reales de EDIFICA.
export type Unit = {
  id: string;
  project: string;
  no: number;
  label: string;
  block: string;
  floor: number;
  floorLabel: string;
  type: string;
  /** Superficie total (m²). */
  gross: number;
  /** Superficie propia (m²). */
  net: number;
  facade: string;
  corner: boolean;
  /** Precio de lista de ejemplo, en USD. */
  listPrice: number;
};

const round50 = (n: number) => Math.round(n / 50) * 50;
const floorLabel = (f: number) => (f === 0 ? "Planta baja" : `Piso ${f}`);

/** ALION Residence: posición → [letra, tipología, dormitorios, rumbo, m² propios] (planilla pública). */
const ALION_POS: [string, string, number, string, number][] = [
  ["D", "T1", 1, "Contrafrente", 28.82],
  ["E", "T2", 1, "Contrafrente", 30.69],
  ["F", "T2", 1, "Contrafrente", 30.69],
  ["G", "T3", 1, "Contrafrente", 24.92],
  ["H", "T4", 1, "Contrafrente", 29.32],
  ["A", "T6", 2, "Frente", 72.2],
  ["B", "T5", 1, "Frente", 32.3],
  ["C", "T6", 2, "Frente", 72.2],
];
function alionUnit(no: number): Unit {
  const floor = 3 + Math.floor((no - 1) / 8), k = (no - 1) % 8;
  const [letter, tipo, dorm, rumbo, m2] = ALION_POS[k];
  return {
    id: `alion-${no}`,
    project: "alion",
    no,
    label: `${floor}0${k + 1}${letter}`,
    block: "ALION",
    floor,
    floorLabel: floorLabel(floor),
    type: dorm === 2 ? `2 dormitorios · ${tipo}` : `Monoambiente · ${tipo}`,
    gross: m2,
    net: m2,
    facade: rumbo,
    corner: k === 0 || k === 7,
    // Ejemplo: USD 2.180/m² + 0,8 % por piso
    listPrice: round50(m2 * 2180 * (1 + (floor - 3) * 0.008)),
  };
}

/** Business One: [torre, piso, oficina, m², tipo] según brochure oficial. */
const B1_T1 = [73.51, 85.7, 65.9, 57.21];
const B1_T2 = [75.75, 79.75, 67.24, 77.05];
const BUSINESS: [number, number, number, number, string][] = [
  ...[1, 2, 3, 4, 5, 6].flatMap((f) => B1_T1.map((m, k) => [1, f, k + 1, m, "Oficina"] as [number, number, number, number, string])),
  [1, 7, 1, 154.81, "Oficina terraza"],
  [1, 7, 2, 121.33, "Oficina terraza"],
  ...[1, 2, 3, 4, 5].flatMap((f) => B1_T2.map((m, k) => [2, f, k + 1, m, "Oficina"] as [number, number, number, number, string])),
  [2, 7, 1, 152.43, "Oficina terraza"],
  [2, 7, 2, 100.77, "Oficina terraza"],
];
function businessUnit(no: number): Unit {
  const [torre, floor, of, m2, type] = BUSINESS[no - 1];
  return {
    id: `business-${no}`,
    project: "business",
    no,
    label: `T${torre}-${floor}0${of}`,
    block: `Torre 0${torre}`,
    floor,
    floorLabel: floorLabel(floor),
    type,
    gross: m2,
    net: m2,
    facade: torre === 1 ? "Torre 01 · patio central" : "Torre 02 · patio central",
    corner: of === 1,
    listPrice: round50(m2 * (type === "Oficina terraza" ? 2450 : 2300) * (1 + floor * 0.006)),
  };
}

/** Lofty City Hub: tipologías publicadas (muestra de 8 unidades por piso, pisos 9–14). */
const LOFTY_MIX: [string, number][] = [
  ["ONE 23", 23], ["ONE 23", 23], ["DUO", 35], ["SHARE", 35],
  ["SUITE 1D", 40], ["SUITE 1D", 40], ["SUITE 2D", 60], ["SUITE 2D L", 60],
];
function loftyUnit(no: number): Unit {
  const floor = 9 + Math.floor((no - 1) / 8), k = (no - 1) % 8;
  const [type, m2] = LOFTY_MIX[k];
  return {
    id: `lofty-${no}`,
    project: "lofty",
    no,
    label: `${floor}${String(k + 1).padStart(2, "0")}`,
    block: "Lofty",
    floor,
    floorLabel: floorLabel(floor),
    type,
    gross: m2,
    net: m2,
    facade: k < 4 ? "Vista ciudad" : "Vista avenida",
    corner: k === 0 || k === 7,
    listPrice: round50(m2 * 2450 * (1 + (floor - 9) * 0.01)),
  };
}

/** V Tower del Lago: muestra de 24 unidades de ejemplo en la Torre I (tipologías no publicadas). */
const VT_MIX: [string, number, string][] = [
  ["2 dormitorios (ejemplo)", 86, "Vista al lago"],
  ["1 dormitorio (ejemplo)", 58, "Vista al lago"],
  ["1 dormitorio (ejemplo)", 56, "Vista ciudad"],
  ["3 dormitorios (ejemplo)", 124, "Vista al lago"],
];
function vtowerUnit(no: number): Unit {
  const floor = 3 + Math.floor((no - 1) / 4), k = (no - 1) % 4;
  const [type, m2, vista] = VT_MIX[k];
  return {
    id: `vtower-${no}`,
    project: "vtower",
    no,
    label: `I-${floor}0${k + 1}`,
    block: "Torre I",
    floor,
    floorLabel: floorLabel(floor),
    type,
    gross: m2,
    net: m2,
    facade: vista,
    corner: k === 0 || k === 3,
    listPrice: round50(m2 * (vista === "Vista al lago" ? 2350 : 2150) * (1 + (floor - 3) * 0.01)),
  };
}

/** Unidades precargadas: Lofty 48 (muestra), ALION 64, V Tower 24 (muestra), Business One 48. */
export const units: Unit[] = [
  ...Array.from({ length: 48 }, (_, i) => loftyUnit(i + 1)),
  ...Array.from({ length: 64 }, (_, i) => alionUnit(i + 1)),
  ...Array.from({ length: 24 }, (_, i) => vtowerUnit(i + 1)),
  ...Array.from({ length: BUSINESS.length }, (_, i) => businessUnit(i + 1)),
];
// El catálogo puede ampliarse en tiempo de ejecución (lib/catalog.ts): el arreglo y el índice se actualizan en el lugar.
const byId = new Map(units.map((u) => [u.id, u]));
export function rebuildUnitIndex() {
  byId.clear();
  for (const u of units) byId.set(u.id, u);
}
export const unitById = (id: string) => byId.get(id);
export const unitLabel = (id: string) => byId.get(id)?.label ?? id;

const isOffice = (u: Unit) => u.type.startsWith("Oficina");
/** Ubicación legible: "ALION · Piso 5 · Unidad 503F". El código técnico y el id no cambian. */
export function unitPlace(id: string): string {
  const u = byId.get(id);
  if (!u) return id;
  if (isOffice(u)) return `${u.block} · ${u.floorLabel} · Oficina ${u.label}`;
  return `${u.block} · ${u.floorLabel} · Unidad ${u.label}`;
}
/** Id de unidad de una venta: coincide con el id del cliente/contrato. */
export const unitPlaceFor = (customerId: string, fallback = "") =>
  byId.has(customerId) ? unitPlace(customerId) : fallback;
/** Ubicación corta: "Unidad 503F" / "Oficina T1-203". */
export function unitShort(id: string): string {
  const u = byId.get(id);
  if (!u) return id;
  return isOffice(u) ? `Oficina ${u.label}` : `Unidad ${u.label}`;
}
/** Superficie con formato paraguayo: 72,2 → "72,2"; 28.82 → "28,82". */
export const m2 = (n: number) => n.toLocaleString("es-PY", { maximumFractionDigits: 2 });
