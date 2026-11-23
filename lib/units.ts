// Bağımsız bölüm kataloğu.
// - VERDORA Kozyatağı: blok (A/B), kat sayısı (15), daire sayısı (60), tip (tamamı 3+1) ve net/brüt
//   metrekareler (köşe 101,7/112,2 · orta 95,9/106,4) SANE İnşaat'ın resmî proje sayfasıyla uyumludur.
// - Sane Time Beşevler: 3 blok ve 92 konut resmîdir; blok dağılımı, tip ve metrekareler temsilidir.
// - Bulvar Park II: daire sayısı, tip ve metrekareler resmî kaynakta yer almaz; tamamen temsilidir.
// Liste fiyatlarının TAMAMI demo varsayımıdır; gerçek satış fiyatı değildir.
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
const label = (block: string, no: number) => `${block}-${String(no).padStart(2, "0")}`;

/** VERDORA: her katta A köşe, A orta, B orta, B köşe (resmî plan sırası). */
function verdoraUnit(no: number): Unit {
  const floor = Math.floor((no - 1) / 4),
    k = (no - 1) % 4;
  const block = k < 2 ? "A" : "B";
  const corner = k === 0 || k === 3;
  const net = corner ? 101.7 : 95.9;
  const gross = corner ? 112.2 : 106.4;
  return {
    id: `verdora-${no}`,
    project: "verdora",
    no,
    label: label(block, no),
    block,
    floor,
    floorLabel: floorLabel(floor),
    type: "3+1",
    gross,
    net,
    facade: corner ? "Köşe · 3 cephe" : "Orta · 2 cephe",
    corner,
    // Temsili liste fiyatı (net m² × varsayılan birim fiyat × kat ve köşe primi)
    listPrice: round5k(net * 142000 * (1 + floor * 0.008) * (corner ? 1.04 : 1)),
  };
}

/** Sane Time: A ve B blok 8 kat × 4, C blok 7 kat × 4 = 92 konut (tip ve m² temsili). */
function sanetimeUnit(no: number): Unit {
  const block = no <= 32 ? "A" : no <= 64 ? "B" : "C";
  const i = no - (block === "A" ? 1 : block === "B" ? 33 : 65);
  const floor = Math.floor(i / 4),
    k = i % 4;
  const type = k === 0 ? "3+1" : k === 3 ? "1+1" : "2+1";
  const gross = type === "3+1" ? 146 : type === "2+1" ? (k === 1 ? 116 : 112) : 74;
  const facade = ["Güney-Doğu", "Güney", "Kuzey", "Kuzey-Batı"][k];
  const facadeFactor = facade.startsWith("Güney") ? 1.03 : 0.98;
  return {
    id: `sanetime-${no}`,
    project: "sanetime",
    no,
    label: label(block, no),
    block,
    floor,
    floorLabel: floorLabel(floor),
    type,
    gross,
    net: Math.round(gross * 0.82),
    facade,
    corner: k === 0 || k === 3,
    listPrice: round5k(gross * 47500 * (1 + floor * 0.01) * facadeFactor),
  };
}

/** Bulvar Park II: tek blok, 6 kat × 8 konut (tamamen temsili). */
function bulvarparkUnit(no: number): Unit {
  const floor = Math.floor((no - 1) / 8),
    k = (no - 1) % 8;
  const corner = k === 0 || k === 3 || k === 4 || k === 7;
  const type = corner ? "3+1" : "2+1";
  const gross = corner ? 138 : [0, 108, 104, 0, 0, 104, 108, 0][k];
  const facade = k < 4 ? "Bulvar cephesi" : "Bahçe cephesi";
  return {
    id: `bulvarpark-${no}`,
    project: "bulvarpark",
    no,
    label: label("A", no),
    block: "A",
    floor,
    floorLabel: floorLabel(floor),
    type,
    gross,
    net: Math.round(gross * 0.82),
    facade,
    corner,
    listPrice: round5k(gross * 44000 * (1 + floor * 0.01) * (k < 4 ? 1.02 : 1)),
  };
}

/** Yerleşik projelerin daireleri (VERDORA 60, Sane Time 92, Bulvar Park II 48). */
export const units: Unit[] = [
  ...Array.from({ length: 60 }, (_, i) => verdoraUnit(i + 1)),
  ...Array.from({ length: 92 }, (_, i) => sanetimeUnit(i + 1)),
  ...Array.from({ length: 48 }, (_, i) => bulvarparkUnit(i + 1)),
];
// Katalog çalışma anında genişletilebilir (lib/catalog.ts): dizi ve dizin yerinde güncellenir.
const byId = new Map(units.map((u) => [u.id, u]));
export function rebuildUnitIndex() {
  byId.clear();
  for (const u of units) byId.set(u.id, u);
}
export const unitById = (id: string) => byId.get(id);
export const unitLabel = (id: string) => byId.get(id)?.label ?? id;

/** Okunur daire konumu: "A Blok · 5. Kat · Daire 43". Teknik kod (A-43) ve kimlik (verdora-33) değişmez. */
export function unitPlace(id: string): string {
  const u = byId.get(id);
  if (!u) return id;
  const floor = u.floor === 0 ? "Zemin Kat" : `${u.floor}. Kat`;
  return `${u.block} Blok · ${floor} · Daire ${u.no}`;
}
/** Satış kaydının daire kimliği: müşteri/sözleşme kimliği ile aynıdır (verdora-33 → verdora-33). */
export const unitPlaceFor = (customerId: string, fallback = "") =>
  byId.has(customerId) ? unitPlace(customerId) : fallback;
/** Kısa okunur konum: "A Blok · Daire 43". */
export function unitShort(id: string): string {
  const u = byId.get(id);
  return u ? `${u.block} Blok · Daire ${u.no}` : id;
}
