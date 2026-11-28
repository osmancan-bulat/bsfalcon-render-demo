// Bağımsız bölüm kataloğu — By Güzel Construction & Real Estate demosu (Alanya).
// İç kimlikler (nergis / cengilli / agva) altyapı uyumluluğu için korunur; ekranda proje adları görünür.
// Resmî kaynaktan (byguzel.com, guzelinvest.com · 28 Kasım 2026) doğrulananlar:
// - Guzel Life Premium (Oba, Alanya): 5 konut bloğu, toplam 90 daire; 2+1 ve 3+1 ayrı mutfaklı daireler,
//   4+1 bahçe dubleks, 5+1 dubleks penthouse; 125–230 m²; 3+1 için "215.000 €" ilanı; yapım yılı 2024.
// - Guzel Nature: tek blok, altı katlı; ilk kat sosyal alanlara ayrılmış; 1+1 için "105.000 €"; 50–180 m²; 2025.
// - City Prime: 2+1 için "185.000 €"; 65–122 m²; 2025.
// TEMSİLİ DEMO VERİLERİ: blok içi kat/daire dağılımı, daire numaraları, cepheler, Guzel Nature ve City Prime
// bağımsız bölüm adetleri (resmî adet yayımlanmadı) ve yayımlanan başlangıç fiyatı dışındaki tüm fiyatlar.
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
  /** Temsili liste fiyatı (EUR). */
  listPrice: number;
};

const round1k = (n: number) => Math.round(n / 1000) * 1000;
const floorLabel = (f: number) => (f === 0 ? "Bahçe katı" : `${f}. kat`);

/**
 * Guzel Life Premium: A–E blokları, her blokta 18 daire (5 × 18 = 90, resmî toplam).
 * Blok içi kurgu temsilidir: bahçe katında 2 adet 4+1 bahçe dubleks; 1–3. katlarda 2+1 ve 3+1;
 * 4. katta 2 adet 3+1 ve 2 adet 5+1 dubleks penthouse (çatı katıyla).
 */
const BLOCKS = ["A", "B", "C", "D", "E"];
function glpUnit(no: number): Unit {
  const b = Math.floor((no - 1) / 18), k = (no - 1) % 18;
  const block = BLOCKS[b];
  let floor: number, type: string, gross: number, base: number;
  if (k < 2) [floor, type, gross, base] = [0, "4+1 bahçe dubleks", 200, 290000];
  else if (k < 14) {
    floor = 1 + Math.floor((k - 2) / 4);
    const pos = (k - 2) % 4;
    [type, gross, base] = pos % 2 === 0 ? ["2+1", 125, 198000] : ["3+1", pos === 3 ? 155 : 150, 215000];
  } else {
    floor = 4;
    [type, gross, base] = k < 16 ? ["3+1", 150, 215000] : ["5+1 dubleks penthouse", 230, 365000];
  }
  const facade = ["Havuz cephesi", "Dağ manzarası", "Bahçe cephesi", "Havuz ve deniz yönü"][(k + b) % 4];
  return {
    id: `nergis-${no}`,
    project: "nergis",
    no,
    label: `${block}-${String(k + 1).padStart(2, "0")}`,
    block,
    floor,
    floorLabel: floor === 4 && type.includes("penthouse") ? "4. kat + çatı" : floorLabel(floor),
    type,
    gross,
    net: Math.round(gross * 0.82),
    facade,
    corner: k % 4 === 0 || k % 4 === 3,
    listPrice: round1k(base * (1 + floor * 0.015 + (facade.includes("deniz") ? 0.03 : 0))),
  };
}

/** Guzel Nature: tek blok, altı kat; ilk kat sosyal alan. Daireler 2–6. katlarda, katta 8 bölüm (örnek kurgu). */
const GN_MIX: [string, number, number][] = [
  ["1+1", 52, 105000], ["1+1", 50, 105000], ["1+1", 55, 109000], ["1+1", 58, 112000],
  ["1+1", 55, 109000], ["1+1", 52, 106000], ["2+1", 86, 158000], ["2+1", 90, 165000],
];
function gnUnit(no: number): Unit {
  const floor = 2 + Math.floor((no - 1) / 8), k = (no - 1) % 8;
  let [type, gross, base] = GN_MIX[k];
  if (floor === 6 && k >= 6) [type, gross, base] = ["3+1 çatı dubleks", 180, 285000];
  return {
    id: `cengilli-${no}`,
    project: "cengilli",
    no,
    label: `${floor}${String(k + 1).padStart(2, "0")}`,
    block: "Tek blok",
    floor,
    floorLabel: `${floor}. kat`,
    type,
    gross,
    net: Math.round(gross * 0.84),
    facade: k < 4 ? "Doğa / dağ manzarası" : "Havuz cephesi",
    corner: k === 0 || k === 7,
    listPrice: round1k(base * (1 + (floor - 2) * 0.012)),
  };
}

/** City Prime: örnek 12 bölüm (3 kat × 4); 2+1 başlangıç 185.000 € (yayımlanan); 65–122 m². */
function cpUnit(no: number): Unit {
  const floor = 1 + Math.floor((no - 1) / 4), k = (no - 1) % 4;
  const [type, gross, base]: [string, number, number] = k === 0 ? ["2+1", 65, 185000] : k === 3 ? ["2+1", 122, 225000] : ["2+1", 98, 199000];
  return {
    id: `agva-${no}`,
    project: "agva",
    no,
    label: `CP-${floor}${String(k + 1).padStart(2, "0")}`,
    block: "City Prime",
    floor,
    floorLabel: `${floor}. kat`,
    type,
    gross,
    net: Math.round(gross * 0.83),
    facade: k < 2 ? "Cadde cephesi" : "Havuz cephesi",
    corner: k === 0 || k === 3,
    listPrice: round1k(base * (1 + (floor - 1) * 0.015)),
  };
}

/** Yönetilen projelerin bağımsız bölümleri (Guzel Life Premium 90, Guzel Nature 40 örnek, City Prime 12 örnek). */
export const units: Unit[] = [
  ...Array.from({ length: 12 }, (_, i) => cpUnit(i + 1)),
  ...Array.from({ length: 40 }, (_, i) => gnUnit(i + 1)),
  ...Array.from({ length: 90 }, (_, i) => glpUnit(i + 1)),
];
// Katalog çalışma anında genişletilebilir (lib/catalog.ts): dizi ve dizin yerinde güncellenir.
const byId = new Map(units.map((u) => [u.id, u]));
export function rebuildUnitIndex() {
  byId.clear();
  for (const u of units) byId.set(u.id, u);
}
export const unitById = (id: string) => byId.get(id);
export const unitLabel = (id: string) => byId.get(id)?.label ?? id;

/** Okunur daire konumu: "C Blok · 2. kat · Daire C-07". Teknik kimlik (nergis-43) değişmez. */
export function unitPlace(id: string): string {
  const u = byId.get(id);
  if (!u) return id;
  if (u.block === "Tek blok") return `Guzel Nature · ${u.floorLabel} · Daire ${u.label}`;
  if (u.block === "City Prime") return `City Prime · ${u.floorLabel} · Daire ${u.label}`;
  return `${u.block} Blok · ${u.floorLabel} · Daire ${u.label}`;
}
/** Satış kaydının daire kimliği: müşteri/sözleşme kimliği ile aynıdır. */
export const unitPlaceFor = (customerId: string, fallback = "") =>
  byId.has(customerId) ? unitPlace(customerId) : fallback;
/** Kısa okunur konum: "C Blok · Daire C-07". */
export function unitShort(id: string): string {
  const u = byId.get(id);
  if (!u) return id;
  if (u.block === "Tek blok" || u.block === "City Prime") return `Daire ${u.label}`;
  return `${u.block} Blok · Daire ${u.label}`;
}
