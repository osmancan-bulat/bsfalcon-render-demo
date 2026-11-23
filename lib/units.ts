// Bağımsız bölüm kataloğu. Tamamen temsili: tip, metrekare, kat, cephe ve liste fiyatları
// demo varsayımıdır. Primador tip dağılımı (100 × 1+1, 6 × 2+1) resmî tanıtımla uyumludur.
export type Unit = {
  id: string;
  project: string;
  no: number;
  label: string;
  block: string;
  floor: number;
  floorLabel: string;
  type: string;
  gross: number;
  net: number;
  facade: string;
  corner: boolean;
  listPrice: number;
};

const round5k = (n: number) => Math.round(n / 5000) * 5000;
const floorLabel = (f: number) => (f === 0 ? "Zemin kat" : `${f}. kat`);

function cornerUnit(no: number): Unit {
  const p = (no - 1) % 8,
    floor = Math.floor((no - 1) / 8);
  const corner = p === 0 || p === 7;
  const type = p <= 1 || p >= 6 ? "3+1" : "2+1";
  const gross =
    type === "3+1" ? (corner ? 156 : 148) : [0, 0, 118, 116, 116, 114][p];
  const facade = [
    "Güney-Doğu",
    "Güney",
    "Güney",
    "Doğu",
    "Batı",
    "Kuzey",
    "Kuzey",
    "Kuzey-Batı",
  ][p];
  const facadeFactor = facade.startsWith("Güney")
    ? 1.04
    : facade.startsWith("Kuzey")
      ? 0.97
      : 1;
  return {
    id: `corner-${no}`,
    project: "corner",
    no,
    label: `${no % 2 === 1 ? "A" : "B"}-${String(no).padStart(2, "0")}`,
    block: no % 2 === 1 ? "A" : "B",
    floor,
    floorLabel: floorLabel(floor),
    type,
    gross,
    net: Math.round(gross * 0.81),
    facade,
    corner,
    listPrice: round5k(
      gross * 27500 * (1 + floor * 0.012) * facadeFactor * (corner ? 1.03 : 1),
    ),
  };
}

function primadorUnit(no: number): Unit {
  const twoBed = no > 100,
    floor = twoBed ? 1 + ((no - 101) % 3) : Math.floor((no - 1) / 10),
    p = (no - 1) % 10;
  const gross = twoBed ? 98 : [64, 62, 62, 63, 66, 66, 63, 62, 62, 64][p];
  const facade = twoBed
    ? "Güney-Batı"
    : [
        "Güney",
        "Güney",
        "Güney",
        "Doğu",
        "Doğu",
        "Batı",
        "Batı",
        "Kuzey",
        "Kuzey",
        "Kuzey",
      ][p];
  const facadeFactor = facade.startsWith("Güney")
    ? 1.03
    : facade === "Kuzey"
      ? 0.97
      : 1;
  return {
    id: `primador-${no}`,
    project: "primador",
    no,
    label: `${no % 2 === 1 ? "A" : "B"}-${String(no).padStart(2, "0")}`,
    block: no % 2 === 1 ? "A" : "B",
    floor,
    floorLabel: floorLabel(floor),
    type: twoBed ? "2+1" : "1+1",
    gross,
    net: Math.round(gross * 0.82),
    facade,
    corner: p === 0 || p === 9 || twoBed,
    listPrice: round5k(gross * 40500 * (1 + floor * 0.01) * facadeFactor),
  };
}

/** Yerleşik projelerin örnek daireleri (Corner 72, Primador 106). */
export const units: Unit[] = [
  ...Array.from({ length: 72 }, (_, i) => cornerUnit(i + 1)),
  ...Array.from({ length: 106 }, (_, i) => primadorUnit(i + 1)),
];
// Katalog çalışma anında genişletilebilir (lib/catalog.ts): dizi ve dizin yerinde güncellenir.
const byId = new Map(units.map((u) => [u.id, u]));
export function rebuildUnitIndex() {
  byId.clear();
  for (const u of units) byId.set(u.id, u);
}
export const unitById = (id: string) => byId.get(id);
export const unitLabel = (id: string) => byId.get(id)?.label ?? id;

/** Okunur daire konumu: "A Blok · 5. Kat · Daire 43". Teknik kod (A-43) ve kimlik (corner-43) değişmez. */
export function unitPlace(id: string): string {
  const u = byId.get(id);
  if (!u) return id;
  const floor = u.floor === 0 ? "Zemin Kat" : `${u.floor}. Kat`;
  return `${u.block} Blok · ${floor} · Daire ${u.no}`;
}
/** Satış kaydının daire kimliği: müşteri/sözleşme kimliği ile aynıdır (corner-43 → corner-43). */
export const unitPlaceFor = (customerId: string, fallback = "") =>
  byId.has(customerId) ? unitPlace(customerId) : fallback;
/** Kısa okunur konum: "A Blok · Daire 43". */
export function unitShort(id: string): string {
  const u = byId.get(id);
  return u ? `${u.block} Blok · Daire ${u.no}` : id;
}
