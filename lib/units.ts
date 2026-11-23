// Bağımsız bölüm kataloğu — BŞ Falcon Group demosu.
// Resmî kaynaktan (bsfalcongroup.com) doğrulananlar:
// - Ağva 1111 Triplex Villa: Şile/Ağva'da üç katlı, akıllı ev konseptli tek villa projesi.
// - Nergis Park Evleri: zemin + 7 kat, 35 daire + 3 dükkân, 2+1 ve 3+1 planlar.
// - Çengilli Villa Sitesi: müstakil triplex villalar; villa adedi resmî kaynakta belirtilmemiştir.
// TEMSİLİ DEMO VERİLERİ: Çengilli villa adedi (8), bütün metrekareler, cepheler, kat bazlı tip dağılımı
// ve liste fiyatlarının tamamı demo varsayımıdır; gerçek satış fiyatı değildir.
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

/** Ağva 1111 Triplex Villa: tek villa (bodrum + zemin + 1. kat yaşam kurgusu). */
function agvaUnit(): Unit {
  return {
    id: "agva-1",
    project: "agva",
    no: 1,
    label: "V-01",
    block: "Villa",
    floor: 0,
    floorLabel: "Triplex · 3 kat",
    type: "Triplex villa",
    gross: 340,
    net: 285,
    facade: "Bahçe ve havuz cephesi",
    corner: true,
    listPrice: 42500000,
  };
}

/** Çengilli Villa Sitesi: müstakil triplex villa parselleri (adet ve alanlar temsili). */
function cengilliUnit(no: number): Unit {
  const gross = [318, 296, 304, 296, 312, 300, 296, 324][no - 1];
  const facade = no <= 4 ? "Yol cephesi · bahçeli" : "Vadi cephesi · bahçeli";
  return {
    id: `cengilli-${no}`,
    project: "cengilli",
    no,
    label: `V-${String(no).padStart(2, "0")}`,
    block: "Parsel",
    floor: 0,
    floorLabel: "Triplex · 3 kat",
    type: "Triplex villa",
    gross,
    net: Math.round(gross * 0.84),
    facade,
    corner: no === 1 || no === 8,
    listPrice: round5k(gross * 108000 * (no > 4 ? 1.03 : 1)),
  };
}

/**
 * Nergis Park Evleri: 1–7. katlarda her katta 5 daire (35 daire), zeminde 3 dükkân.
 * Daire no 1–35 katlara göre, dükkânlar 36–38. Kat bazlı 2+1 / 3+1 dağılımı temsilidir.
 */
function nergisUnit(no: number): Unit {
  if (no > 35) {
    const k = no - 35;
    const gross = [96, 118, 84][k - 1];
    return {
      id: `nergis-${no}`, project: "nergis", no, label: `D-${k}`, block: "Dükkân",
      floor: 0, floorLabel: "Zemin kat", type: "Dükkân", gross, net: Math.round(gross * 0.9),
      facade: "Cadde cephesi", corner: k === 2, listPrice: round5k(gross * 152000),
    };
  }
  const floor = Math.ceil(no / 5), k = (no - 1) % 5;
  const type = k === 0 || k === 4 ? "3+1" : "2+1";
  const gross = type === "3+1" ? (k === 0 ? 142 : 138) : [0, 104, 98, 102, 0][k];
  return {
    id: `nergis-${no}`,
    project: "nergis",
    no,
    label: `${floor}-${String(no).padStart(2, "0")}`,
    block: "A",
    floor,
    floorLabel: floorLabel(floor),
    type,
    gross,
    net: Math.round(gross * 0.82),
    facade: ["Güney-Doğu", "Güney", "Doğu", "Batı", "Kuzey-Batı"][k],
    corner: k === 0 || k === 4,
    listPrice: round5k(gross * 74000 * (1 + floor * 0.012)),
  };
}

/** Yerleşik projelerin bağımsız bölümleri (Ağva 1, Çengilli 8, Nergis Park 38). */
export const units: Unit[] = [
  agvaUnit(),
  ...Array.from({ length: 8 }, (_, i) => cengilliUnit(i + 1)),
  ...Array.from({ length: 38 }, (_, i) => nergisUnit(i + 1)),
];
// Katalog çalışma anında genişletilebilir (lib/catalog.ts): dizi ve dizin yerinde güncellenir.
const byId = new Map(units.map((u) => [u.id, u]));
export function rebuildUnitIndex() {
  byId.clear();
  for (const u of units) byId.set(u.id, u);
}
export const unitById = (id: string) => byId.get(id);
export const unitLabel = (id: string) => byId.get(id)?.label ?? id;

/** Okunur daire konumu: "A Blok · 5. Kat · Daire 43". Teknik kod (A-43) ve kimlik (cengilli-33) değişmez. */
export function unitPlace(id: string): string {
  const u = byId.get(id);
  if (!u) return id;
  if (u.type === "Triplex villa" || u.block === "Villa" || u.block === "Parsel") return `Villa ${u.label} · triplex`;
  if (u.type === "Dükkân") return `Zemin Kat · Dükkân ${u.label}`;
  const floor = u.floor === 0 ? "Zemin Kat" : `${u.floor}. Kat`;
  return `${u.block} Blok · ${floor} · Daire ${u.no}`;
}
/** Satış kaydının daire kimliği: müşteri/sözleşme kimliği ile aynıdır (cengilli-33 → cengilli-33). */
export const unitPlaceFor = (customerId: string, fallback = "") =>
  byId.has(customerId) ? unitPlace(customerId) : fallback;
/** Kısa okunur konum: "A Blok · Daire 43". */
export function unitShort(id: string): string {
  const u = byId.get(id);
  if (!u) return id;
  if (u.type === "Triplex villa" || u.block === "Villa" || u.block === "Parsel") return `Villa ${u.label}`;
  if (u.type === "Dükkân") return `Dükkân ${u.label}`;
  return `${u.block} Blok · Daire ${u.no}`;
}
