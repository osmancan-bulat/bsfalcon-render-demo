// Araç ve filo yönetimi (BŞ Falcon). Araçlar, zimmetler, kilometre, yasal yükümlülükler (MTV, trafik
// sigortası, kasko, muayene), bakım/lastik, yakıt, arıza/servis ve evrak kayıtları.
// TÜM KAYITLAR TEMSİLİDİR: plakalar, personel adları, poliçe numaraları ve tutarlar örnektir.
// Hatırlatmalar uygulama içinde hesaplanır; e-posta, SMS veya WhatsApp gönderimi YOKTUR.

export const FLEET_SNAPSHOT = "2026-11-15";
export type VehicleType = "Binek" | "Hafif ticari" | "Kamyonet" | "Kamyon" | "İş makinesi";
export type ObligationKind = "MTV" | "Trafik sigortası" | "Kasko" | "Muayene" | "Periyodik bakım" | "Lastik değişimi";
export const OBLIGATION_KINDS: ObligationKind[] = ["MTV", "Trafik sigortası", "Kasko", "Muayene", "Periyodik bakım", "Lastik değişimi"];
export type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  type: VehicleType;
  fuel: "Dizel" | "Benzin" | "Hibrit" | "Elektrik";
  project: string;
  assignee: string;
  km: number;
  kmDate: string;
  status: "Aktif" | "Serviste" | "Pasif";
  note?: string;
};
export type Obligation = {
  id: string;
  vehicleId: string;
  kind: ObligationKind;
  due: string;
  /** Tahmini / tahakkuk eden tutar (TL). */
  amount?: number;
  provider?: string;
  reference?: string;
  /** Bakım için hedef kilometre. */
  kmDue?: number;
  status: "Açık" | "Tamamlandı";
  completedAt?: string;
  paid?: number;
  note?: string;
};
export type FuelLog = { id: string; vehicleId: string; date: string; liters: number; amount: number; km: number; station: string };
export type ServiceRecord = { id: string; vehicleId: string; date: string; kind: "Arıza" | "Servis" | "Hasar"; km: number; cost: number; provider: string; description: string; status: "Açık" | "Kapandı" };
export type VehicleDoc = { id: string; vehicleId: string; title: string; kind: "Ruhsat" | "Poliçe" | "Muayene raporu" | "Fatura" | "Zimmet tutanağı"; date: string; expiry?: string };
export type FleetEvent = { id: string; date: string; vehicleId: string; text: string };
export type FleetState = {
  vehicles: Vehicle[];
  obligations: Obligation[];
  fuel: FuelLog[];
  services: ServiceRecord[];
  docs: VehicleDoc[];
  history: FleetEvent[];
};

const v = (id: string, plate: string, brand: string, model: string, year: number, type: VehicleType, fuel: Vehicle["fuel"], project: string, assignee: string, km: number, status: Vehicle["status"] = "Aktif"): Vehicle =>
  ({ id, plate, brand, model, year, type, fuel, project, assignee, km, kmDate: "2026-11-12", status });
const o = (id: string, vehicleId: string, kind: ObligationKind, due: string, amount?: number, extra: Partial<Obligation> = {}): Obligation =>
  ({ id, vehicleId, kind, due, amount, status: "Açık", ...extra });

export const seedFleet: FleetState = {
  vehicles: [
    v("ARC-01", "34 BFG 101", "Toyota", "Corolla 1.5 Vision", 2023, "Binek", "Benzin", "genel", "Proje müdürü (örnek)", 48250),
    v("ARC-02", "34 BFG 214", "Ford", "Transit Custom 320L", 2021, "Hafif ticari", "Dizel", "nergis", "Şantiye şefi · Nergis (örnek)", 126480),
    v("ARC-03", "34 BFG 377", "Fiat", "Doblo Cargo 1.6", 2020, "Hafif ticari", "Dizel", "cengilli", "Saha teknikeri · Çengilli (örnek)", 154920),
    v("ARC-04", "34 BFG 452", "Isuzu", "D-Max 4x4", 2022, "Kamyonet", "Dizel", "agva", "Şantiye şefi · Ağva (örnek)", 88310),
    v("ARC-05", "34 BFG 590", "Mitsubishi", "Canter Fuso 7C15", 2019, "Kamyon", "Dizel", "nergis", "Malzeme sorumlusu (örnek)", 211700, "Serviste"),
    v("ARC-06", "34 BFG 618", "Renault", "Clio 1.0 TCe", 2024, "Binek", "Benzin", "genel", "Satış danışmanı (örnek)", 21340),
  ],
  obligations: [
    // Gecikmiş
    o("YUK-001", "ARC-03", "Muayene", "2026-11-08", 2860, { provider: "Araç muayene istasyonu (örnek)" }),
    o("YUK-002", "ARC-05", "Periyodik bakım", "2026-11-12", 18500, { provider: "Yetkili servis (örnek)", kmDue: 210000 }),
    // 7 gün içinde
    o("YUK-003", "ARC-02", "Kasko", "2026-11-20", 24800, { provider: "Sigorta şirketi (örnek)", reference: "KSK-ÖRNEK-2214" }),
    o("YUK-004", "ARC-04", "Lastik değişimi", "2026-11-21", 32000, { provider: "Lastik bayii (örnek)", note: "Kış lastiği" }),
    // 15 gün içinde
    o("YUK-005", "ARC-01", "Trafik sigortası", "2026-11-28", 9650, { provider: "Sigorta şirketi (örnek)", reference: "TRF-ÖRNEK-0101" }),
    o("YUK-006", "ARC-06", "Periyodik bakım", "2026-11-26", 7400, { kmDue: 22000 }),
    // 30 gün içinde
    o("YUK-007", "ARC-04", "Kasko", "2026-12-12", 21900, { provider: "Sigorta şirketi (örnek)", reference: "KSK-ÖRNEK-4452" }),
    o("YUK-008", "ARC-02", "Muayene", "2026-12-09", 2860),
    // İleri tarih
    o("YUK-009", "ARC-01", "MTV", "2027-01-31", 5240, { note: "2027 1. taksit" }),
    o("YUK-010", "ARC-02", "MTV", "2027-01-31", 4180, { note: "2027 1. taksit" }),
    o("YUK-011", "ARC-03", "MTV", "2027-01-31", 3260, { note: "2027 1. taksit" }),
    o("YUK-012", "ARC-04", "MTV", "2027-01-31", 6120, { note: "2027 1. taksit" }),
    o("YUK-013", "ARC-05", "MTV", "2027-01-31", 7380, { note: "2027 1. taksit" }),
    o("YUK-014", "ARC-06", "MTV", "2027-01-31", 3010, { note: "2027 1. taksit" }),
    o("YUK-015", "ARC-03", "Trafik sigortası", "2027-02-14", 8900),
    o("YUK-016", "ARC-05", "Muayene", "2027-03-02", 3540),
    o("YUK-017", "ARC-06", "Kasko", "2027-04-18", 15400),
    // Tamamlanan
    o("YUK-018", "ARC-01", "MTV", "2026-07-31", 5240, { status: "Tamamlandı", completedAt: "2026-07-24", paid: 5240, note: "2026 2. taksit" }),
    o("YUK-019", "ARC-05", "Trafik sigortası", "2026-10-30", 14200, { status: "Tamamlandı", completedAt: "2026-10-28", paid: 14200, reference: "TRF-ÖRNEK-0590" }),
  ],
  fuel: [
    { id: "YKT-001", vehicleId: "ARC-02", date: "2026-11-03", liters: 62, amount: 3720, km: 125980, station: "Akaryakıt istasyonu (örnek)" },
    { id: "YKT-002", vehicleId: "ARC-02", date: "2026-11-11", liters: 58, amount: 3480, km: 126470, station: "Akaryakıt istasyonu (örnek)" },
    { id: "YKT-003", vehicleId: "ARC-04", date: "2026-11-06", liters: 71, amount: 4260, km: 88010, station: "Akaryakıt istasyonu (örnek)" },
    { id: "YKT-004", vehicleId: "ARC-01", date: "2026-11-09", liters: 41, amount: 2050, km: 48210, station: "Akaryakıt istasyonu (örnek)" },
    { id: "YKT-005", vehicleId: "ARC-05", date: "2026-11-02", liters: 95, amount: 5700, km: 211520, station: "Akaryakıt istasyonu (örnek)" },
  ],
  services: [
    { id: "SRV-001", vehicleId: "ARC-05", date: "2026-11-13", kind: "Arıza", km: 211700, cost: 0, provider: "Yetkili servis (örnek)", description: "Fren sisteminde ses; parça bekleniyor", status: "Açık" },
    { id: "SRV-002", vehicleId: "ARC-03", date: "2026-09-18", kind: "Servis", km: 150100, cost: 6850, provider: "Yetkili servis (örnek)", description: "Yağ, filtre ve balata değişimi", status: "Kapandı" },
    { id: "SRV-003", vehicleId: "ARC-02", date: "2026-08-04", kind: "Hasar", km: 118900, cost: 12400, provider: "Kaporta servisi (örnek)", description: "Şantiye girişinde sağ kapı hasarı · kasko dosyası", status: "Kapandı" },
  ],
  docs: [
    { id: "AEV-001", vehicleId: "ARC-01", title: "Araç ruhsatı (temsili kopya)", kind: "Ruhsat", date: "2023-03-14" },
    { id: "AEV-002", vehicleId: "ARC-02", title: "Kasko poliçesi 2025–2026 (temsili)", kind: "Poliçe", date: "2025-11-20", expiry: "2026-11-20" },
    { id: "AEV-003", vehicleId: "ARC-03", title: "Muayene raporu 2024 (temsili)", kind: "Muayene raporu", date: "2024-11-08", expiry: "2026-11-08" },
    { id: "AEV-004", vehicleId: "ARC-05", title: "Trafik sigortası poliçesi 2026–2027 (temsili)", kind: "Poliçe", date: "2026-10-28", expiry: "2027-10-28" },
    { id: "AEV-005", vehicleId: "ARC-04", title: "Zimmet tutanağı (temsili)", kind: "Zimmet tutanağı", date: "2026-02-01" },
  ],
  history: [
    { id: "AGC-001", date: "2026-11-13", vehicleId: "ARC-05", text: "Arıza kaydı açıldı: fren sistemi · araç serviste" },
    { id: "AGC-002", date: "2026-11-12", vehicleId: "ARC-02", text: "Kilometre güncellendi: 126.480 km" },
    { id: "AGC-003", date: "2026-10-28", vehicleId: "ARC-05", text: "Trafik sigortası yenilendi · 14.200 TL ödendi · yeni bitiş 2027-10-28" },
    { id: "AGC-004", date: "2026-07-24", vehicleId: "ARC-01", text: "MTV 2026 2. taksit ödendi · 5.240 TL" },
  ],
};

const dayDiff = (iso: string, from = FLEET_SNAPSHOT) =>
  Math.round((Date.parse(iso + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 86400000);
export type Bucket = "Gecikmiş" | "7 gün" | "15 gün" | "30 gün" | "İleri tarih" | "Tamamlandı";
export const BUCKETS: Bucket[] = ["Gecikmiş", "7 gün", "15 gün", "30 gün", "İleri tarih", "Tamamlandı"];
export function bucketOf(ob: Obligation, today = FLEET_SNAPSHOT): Bucket {
  if (ob.status === "Tamamlandı") return "Tamamlandı";
  const d = dayDiff(ob.due, today);
  if (d < 0) return "Gecikmiş";
  if (d <= 7) return "7 gün";
  if (d <= 15) return "15 gün";
  if (d <= 30) return "30 gün";
  return "İleri tarih";
}
export const daysLeft = (ob: Obligation, today = FLEET_SNAPSHOT) => dayDiff(ob.due, today);

export function fleetReminders(f: FleetState, today = FLEET_SNAPSHOT) {
  const open = f.obligations.filter((x) => x.status === "Açık").map((x) => ({ ...x, bucket: bucketOf(x, today), days: daysLeft(x, today) }))
    .sort((a, b) => a.due.localeCompare(b.due));
  const count = (b: Bucket) => open.filter((x) => x.bucket === b).length;
  return {
    open,
    overdue: open.filter((x) => x.bucket === "Gecikmiş"),
    within30: open.filter((x) => x.days >= 0 && x.days <= 30),
    counts: { "Gecikmiş": count("Gecikmiş"), "7 gün": count("7 gün"), "15 gün": count("15 gün"), "30 gün": count("30 gün"), "İleri tarih": count("İleri tarih"), "Tamamlandı": f.obligations.filter((x) => x.status === "Tamamlandı").length } as Record<Bucket, number>,
  };
}

export function vehicleSummary(f: FleetState, id: string) {
  const fuel = f.fuel.filter((x) => x.vehicleId === id);
  const svc = f.services.filter((x) => x.vehicleId === id);
  const obs = f.obligations.filter((x) => x.vehicleId === id);
  const next = obs.filter((x) => x.status === "Açık").sort((a, b) => a.due.localeCompare(b.due))[0];
  const sorted = [...fuel].sort((a, b) => a.km - b.km);
  const dist = sorted.length > 1 ? sorted.at(-1)!.km - sorted[0].km : 0;
  const litres = sorted.slice(1).reduce((a, x) => a + x.liters, 0);
  return {
    fuelCost: fuel.reduce((a, x) => a + x.amount, 0),
    fuelLiters: fuel.reduce((a, x) => a + x.liters, 0),
    consumption: dist > 0 ? Math.round((litres / dist) * 1000) / 10 : null, // L/100 km
    serviceCost: svc.reduce((a, x) => a + x.cost, 0),
    obligationPaid: obs.reduce((a, x) => a + (x.paid ?? 0), 0),
    openServices: svc.filter((x) => x.status === "Açık").length,
    next,
  };
}

export type FleetAction =
  | { type: "vehicle-create"; record: Omit<Vehicle, "id" | "kmDate"> & { kmDate?: string } }
  | { type: "vehicle-update"; id: string; patch: Partial<Omit<Vehicle, "id" | "km">> }
  | { type: "vehicle-km"; id: string; km: number; date: string }
  | { type: "vehicle-obligation-add"; record: Omit<Obligation, "id" | "status"> }
  | { type: "vehicle-obligation-complete"; id: string; date: string; paid: number; nextDue: string; note?: string; reference?: string }
  | { type: "vehicle-fuel"; record: Omit<FuelLog, "id"> }
  | { type: "vehicle-service"; record: Omit<ServiceRecord, "id"> }
  | { type: "vehicle-service-close"; id: string; cost: number; date: string }
  | { type: "vehicle-doc"; record: Omit<VehicleDoc, "id"> };

const iso = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const nextId = (prefix: string, ids: string[], pad = prefix === "ARC" ? 2 : 3) => {
  let n = ids.filter((x) => x.startsWith(prefix + "-")).length + 1;
  while (ids.includes(`${prefix}-${String(n).padStart(pad, "0")}`)) n++;
  return `${prefix}-${String(n).padStart(pad, "0")}`;
};
const normPlate = (p: string) => p.toLocaleUpperCase("tr").replace(/\s+/g, " ").trim();
const tl = (n: number) => `${n.toLocaleString("tr-TR")} TL`;

/** Filo işlemini uygular. Geçersiz girdide Türkçe hata fırlatır. */
export function applyFleetAction(f: FleetState, a: FleetAction): { fleet: FleetState; message: string; entity: string } {
  const veh = (id: string) => {
    const x = f.vehicles.find((v) => v.id === id);
    if (!x) throw Error("Araç bulunamadı.");
    return x;
  };
  const log = (vehicleId: string, text: string, date = FLEET_SNAPSHOT): FleetEvent[] =>
    [{ id: nextId("AGC", f.history.map((h) => h.id)), date, vehicleId, text }, ...f.history].slice(0, 300);
  if (a.type === "vehicle-create") {
    const r = a.record;
    const plate = normPlate(r.plate);
    if (!/^\d{2} [A-ZÇĞİÖŞÜ]{1,3} \d{2,4}$/.test(plate)) throw Error("Plaka biçimi geçersiz (ör. 34 ABC 123).");
    if (f.vehicles.some((x) => normPlate(x.plate) === plate)) throw Error("Bu plaka zaten kayıtlı.");
    if (!r.brand.trim() || !r.model.trim()) throw Error("Marka ve model gerekli.");
    if (!Number.isInteger(r.year) || r.year < 1990 || r.year > 2027) throw Error("Üretim yılı geçersiz.");
    if (!Number.isFinite(r.km) || r.km < 0) throw Error("Kilometre geçersiz.");
    const id = nextId("ARC", f.vehicles.map((x) => x.id));
    const rec: Vehicle = { ...r, id, plate, brand: r.brand.trim(), model: r.model.trim(), assignee: r.assignee.trim(), kmDate: r.kmDate ?? FLEET_SNAPSHOT };
    return { fleet: { ...f, vehicles: [...f.vehicles, rec], history: log(id, `Araç eklendi: ${plate} · ${rec.brand} ${rec.model}`) }, message: `Araç eklendi: ${plate}`, entity: id };
  }
  if (a.type === "vehicle-update") {
    const x = veh(a.id);
    const patch = { ...a.patch };
    if (patch.plate !== undefined) {
      const plate = normPlate(patch.plate);
      if (!/^\d{2} [A-ZÇĞİÖŞÜ]{1,3} \d{2,4}$/.test(plate)) throw Error("Plaka biçimi geçersiz (ör. 34 ABC 123).");
      if (f.vehicles.some((y) => y.id !== x.id && normPlate(y.plate) === plate)) throw Error("Bu plaka zaten kayıtlı.");
      patch.plate = plate;
    }
    const changes = Object.entries(patch).filter(([k, val]) => (x as Record<string, unknown>)[k] !== val).map(([k]) => k);
    if (!changes.length) throw Error("Değişiklik yok.");
    const next = { ...x, ...patch };
    const text = patch.assignee !== undefined && patch.assignee !== x.assignee
      ? `Zimmet değişti: ${x.assignee} → ${patch.assignee}`
      : `Araç bilgileri güncellendi (${changes.join(", ")})`;
    return { fleet: { ...f, vehicles: f.vehicles.map((y) => (y.id === x.id ? next : y)), history: log(x.id, text) }, message: `${x.plate} · ${text}`, entity: x.id };
  }
  if (a.type === "vehicle-km") {
    const x = veh(a.id);
    if (!Number.isFinite(a.km) || a.km < x.km) throw Error(`Yeni kilometre mevcut değerden (${x.km.toLocaleString("tr-TR")} km) küçük olamaz.`);
    if (!iso(a.date)) throw Error("Tarih geçersiz.");
    return {
      fleet: { ...f, vehicles: f.vehicles.map((y) => (y.id === x.id ? { ...y, km: Math.round(a.km), kmDate: a.date } : y)), history: log(x.id, `Kilometre güncellendi: ${Math.round(a.km).toLocaleString("tr-TR")} km`, a.date) },
      message: `${x.plate} kilometresi güncellendi`,
      entity: x.id,
    };
  }
  if (a.type === "vehicle-obligation-add") {
    const r = a.record;
    veh(r.vehicleId);
    if (!iso(r.due)) throw Error("Son tarih geçersiz.");
    if (r.amount !== undefined && (!Number.isFinite(r.amount) || r.amount < 0)) throw Error("Tutar geçersiz.");
    const id = nextId("YUK", f.obligations.map((x) => x.id));
    const plate = veh(r.vehicleId).plate;
    return {
      fleet: { ...f, obligations: [...f.obligations, { ...r, id, status: "Açık" }], history: log(r.vehicleId, `${r.kind} kaydı eklendi · son tarih ${r.due}`) },
      message: `${plate} · ${r.kind} takibe alındı`,
      entity: id,
    };
  }
  if (a.type === "vehicle-obligation-complete") {
    const ob = f.obligations.find((x) => x.id === a.id);
    if (!ob) throw Error("Kayıt bulunamadı.");
    if (ob.status === "Tamamlandı") throw Error("Bu işlem zaten tamamlandı.");
    if (!iso(a.date) || a.date > "2027-12-31") throw Error("İşlem tarihi geçersiz.");
    if (!Number.isFinite(a.paid) || a.paid < 0) throw Error("Ödeme tutarı geçersiz.");
    if (!iso(a.nextDue) || a.nextDue <= a.date) throw Error("Yeni son tarih, işlem tarihinden sonra olmalı.");
    const plate = veh(ob.vehicleId).plate;
    const done: Obligation = { ...ob, status: "Tamamlandı", completedAt: a.date, paid: Math.round(a.paid * 100) / 100, note: a.note?.trim() || ob.note, reference: a.reference?.trim() || ob.reference };
    const id = nextId("YUK", f.obligations.map((x) => x.id));
    const renewed: Obligation = { id, vehicleId: ob.vehicleId, kind: ob.kind, due: a.nextDue, amount: ob.amount, provider: ob.provider, status: "Açık", kmDue: ob.kmDue };
    return {
      fleet: {
        ...f,
        obligations: [...f.obligations.map((x) => (x.id === ob.id ? done : x)), renewed],
        history: log(ob.vehicleId, `${ob.kind} tamamlandı · ${tl(done.paid ?? 0)} ödendi · yeni son tarih ${a.nextDue}`, a.date),
      },
      message: `${plate} · ${ob.kind} tamamlandı; sonraki tarih ${a.nextDue}`,
      entity: ob.id,
    };
  }
  if (a.type === "vehicle-fuel") {
    const r = a.record;
    const x = veh(r.vehicleId);
    if (!iso(r.date)) throw Error("Tarih geçersiz.");
    if (!(r.liters > 0) || !(r.amount > 0)) throw Error("Litre ve tutar pozitif olmalı.");
    if (!Number.isFinite(r.km) || r.km < 0) throw Error("Kilometre geçersiz.");
    const id = nextId("YKT", f.fuel.map((y) => y.id));
    const km = Math.max(x.km, Math.round(r.km));
    return {
      fleet: { ...f, fuel: [...f.fuel, { ...r, id }], vehicles: f.vehicles.map((y) => (y.id === x.id ? { ...y, km, kmDate: r.date > y.kmDate ? r.date : y.kmDate } : y)), history: log(x.id, `Yakıt: ${r.liters} L · ${tl(r.amount)}`, r.date) },
      message: `${x.plate} yakıt kaydı eklendi`,
      entity: id,
    };
  }
  if (a.type === "vehicle-service") {
    const r = a.record;
    const x = veh(r.vehicleId);
    if (!iso(r.date)) throw Error("Tarih geçersiz.");
    if (!r.description.trim()) throw Error("Açıklama gerekli.");
    if (!Number.isFinite(r.cost) || r.cost < 0) throw Error("Tutar geçersiz.");
    const id = nextId("SRV", f.services.map((y) => y.id));
    const status = r.status === "Açık" && r.kind !== "Servis" ? "Serviste" : x.status;
    return {
      fleet: { ...f, services: [...f.services, { ...r, id, description: r.description.trim() }], vehicles: f.vehicles.map((y) => (y.id === x.id ? { ...y, status } : y)), history: log(x.id, `${r.kind} kaydı: ${r.description.trim()}`, r.date) },
      message: `${x.plate} · ${r.kind} kaydı eklendi`,
      entity: id,
    };
  }
  if (a.type === "vehicle-service-close") {
    const s = f.services.find((x) => x.id === a.id);
    if (!s) throw Error("Kayıt bulunamadı.");
    if (s.status === "Kapandı") throw Error("Kayıt zaten kapalı.");
    if (!Number.isFinite(a.cost) || a.cost < 0) throw Error("Tutar geçersiz.");
    const x = veh(s.vehicleId);
    const stillOpen = f.services.some((y) => y.vehicleId === x.id && y.id !== s.id && y.status === "Açık");
    return {
      fleet: {
        ...f,
        services: f.services.map((y) => (y.id === s.id ? { ...y, status: "Kapandı", cost: a.cost } : y)),
        vehicles: f.vehicles.map((y) => (y.id === x.id && y.status === "Serviste" && !stillOpen ? { ...y, status: "Aktif" } : y)),
        history: log(x.id, `${s.kind} kaydı kapandı · ${tl(a.cost)}`, a.date),
      },
      message: `${x.plate} · servis kaydı kapandı`,
      entity: s.id,
    };
  }
  if (a.type === "vehicle-doc") {
    const r = a.record;
    veh(r.vehicleId);
    if (!r.title.trim() || !iso(r.date)) throw Error("Belge adı ve tarihi gerekli.");
    if (r.expiry && (!iso(r.expiry) || r.expiry < r.date)) throw Error("Geçerlilik tarihi belge tarihinden önce olamaz.");
    const id = nextId("AEV", f.docs.map((y) => y.id));
    return { fleet: { ...f, docs: [...f.docs, { ...r, id, title: r.title.trim() }], history: log(r.vehicleId, `Evrak eklendi: ${r.title.trim()}`, r.date) }, message: "Araç evrakı eklendi", entity: id };
  }
  throw Error("Bilinmeyen araç işlemi.");
}
