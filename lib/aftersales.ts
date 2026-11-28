// Satış sonrası (By Güzel): teslim ve tapu süreci, müşteri talepleri ve hizmet kayıtları.
// Süreç adımları Türkiye'de konut devrinde izlenen genel adımlardır; hukuki danışmanlık değildir.
// Yabancı alıcılarda değerleme raporu (SPK lisanslı) ve tapu işlemlerinde yeminli tercüman gerekebilir.
// Tüm kayıtlar TEMSİLİDİR. E-posta, SMS veya WhatsApp gönderimi yoktur.

export const HANDOVER_STEPS = [
  { key: "odeme", title: "Bakiye kontrolü", detail: "Peşin / vadeli bakiye ve ipotek durumu" },
  { key: "degerleme", title: "Değerleme raporu", detail: "Yabancı alıcıda SPK lisanslı ekspertiz" },
  { key: "randevu", title: "Tapu randevusu", detail: "Web Tapu başvurusu · gerekirse yeminli tercüman" },
  { key: "tapu", title: "Tapu devri", detail: "Harç ödemesi ve tapu senedi" },
  { key: "teslim", title: "Anahtar teslimi", detail: "Teslim tutanağı, sayaç değerleri" },
  { key: "abonelik", title: "Abonelik ve DASK", detail: "Elektrik, su, internet, DASK poliçesi" },
] as const;
export type StepKey = (typeof HANDOVER_STEPS)[number]["key"];
export type TicketCategory = "Arıza / bakım" | "Kiralama yönetimi" | "Yeniden satış" | "Tapu / evrak" | "Oturum izni / vatandaşlık" | "Aidat ve site yönetimi";
export const TICKET_CATEGORIES: TicketCategory[] = ["Arıza / bakım", "Kiralama yönetimi", "Yeniden satış", "Tapu / evrak", "Oturum izni / vatandaşlık", "Aidat ve site yönetimi"];
export type Ticket = {
  id: string;
  unitId: string;
  project: string;
  category: TicketCategory;
  title: string;
  opened: string;
  status: "Açık" | "İşlemde" | "Çözüldü";
  priority: "Normal" | "Yüksek";
  notes: { date: string; text: string }[];
  closed?: string;
};
export type AftersalesState = {
  /** Bölüm → tamamlanan adımlar ve tarihleri. */
  handover: Record<string, Partial<Record<StepKey, string>>>;
  tickets: Ticket[];
};

const done = (dates: string[]): Partial<Record<StepKey, string>> =>
  Object.fromEntries(HANDOVER_STEPS.map((s, i) => [s.key, dates[i]]).filter(([, d]) => d)) as Partial<Record<StepKey, string>>;
// Guzel Life Premium (2024'te tamamlandı): örnek satışların 1–30'u teslim edildi, 31–36 tapu aşamasında.
const handover: AftersalesState["handover"] = {};
for (let n = 1; n <= 30; n++) {
  const m = String(1 + (n % 9)).padStart(2, "0");
  handover[`nergis-${n}`] = done([`2024-${m}-05`, `2024-${m}-08`, `2024-${m}-12`, `2024-${m}-19`, `2024-${m}-20`, `2024-${m}-27`]);
}
for (let n = 31; n <= 36; n++) handover[`nergis-${n}`] = done(["2026-10-02", "2026-10-20", n % 2 ? "2026-11-04" : ""]);
handover["nergis-53"] = done(["2026-08-25"]);
// Guzel Nature ve City Prime: inşaat sürüyor; değerleme ön hazırlığı
handover["cengilli-3"] = done(["2026-09-01"]);

export const seedAftersales: AftersalesState = {
  handover,
  tickets: [
    { id: "TLP-001", unitId: "nergis-3", project: "nergis", category: "Arıza / bakım", title: "Salon klimasında gaz kaçağı şüphesi", opened: "2026-11-11", status: "İşlemde", priority: "Yüksek", notes: [{ date: "2026-11-12", text: "Teknik servis randevusu 18 Kasım (temsili)" }] },
    { id: "TLP-002", unitId: "nergis-7", project: "nergis", category: "Kiralama yönetimi", title: "Kış sezonu uzun dönem kiralama talebi", opened: "2026-11-05", status: "Açık", priority: "Normal", notes: [] },
    { id: "TLP-003", unitId: "nergis-12", project: "nergis", category: "Oturum izni / vatandaşlık", title: "İkamet izni yenilemesi için tapu ve DASK kopyası", opened: "2026-11-09", status: "İşlemde", priority: "Normal", notes: [{ date: "2026-11-10", text: "Belgeler müşteriye e-postayla iletilecek (demo: gönderim yapılmaz)" }] },
    { id: "TLP-004", unitId: "nergis-21", project: "nergis", category: "Yeniden satış", title: "Daireyi 2027 yazında satmak istiyor · değerleme talebi", opened: "2026-10-28", status: "Açık", priority: "Normal", notes: [] },
    { id: "TLP-005", unitId: "nergis-34", project: "nergis", category: "Tapu / evrak", title: "Tapu randevusu için yeminli tercüman (Rusça)", opened: "2026-11-03", status: "Açık", priority: "Yüksek", notes: [] },
    { id: "TLP-006", unitId: "nergis-15", project: "nergis", category: "Aidat ve site yönetimi", title: "2026 aidat ekstresi talebi", opened: "2026-10-14", status: "Çözüldü", priority: "Normal", notes: [{ date: "2026-10-15", text: "Ekstre hazırlandı" }], closed: "2026-10-15" },
  ],
};

export const isDelivered = (a: AftersalesState | undefined, unitId: string) => !!a?.handover[unitId]?.teslim;
export const handoverProgress = (a: AftersalesState | undefined, unitId: string) => {
  const h = a?.handover[unitId] ?? {};
  const doneCount = HANDOVER_STEPS.filter((s) => h[s.key]).length;
  const next = HANDOVER_STEPS.find((s) => !h[s.key]);
  return { done: doneCount, total: HANDOVER_STEPS.length, next, steps: HANDOVER_STEPS.map((s) => ({ ...s, date: h[s.key] })) };
};

export type AftersalesAction =
  | { type: "handover-step"; unit: string; key: StepKey; date: string | null }
  | { type: "ticket-create"; record: Omit<Ticket, "id" | "status" | "notes" | "closed"> & { note?: string } }
  | { type: "ticket-update"; id: string; status: Ticket["status"]; note?: string; date: string };

/** Satış sonrası işlemini uygular; satılmış bölüm kontrolü çağıran tarafından yapılır (sold). */
export function applyAftersales(a: AftersalesState, act: AftersalesAction, sold: (unitId: string) => boolean): { next: AftersalesState; message: string; entity: string } {
  const iso = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (act.type === "handover-step") {
    if (!sold(act.unit)) throw Error("Teslim ve tapu süreci yalnızca satılmış bağımsız bölüm için izlenir.");
    const step = HANDOVER_STEPS.find((s) => s.key === act.key);
    if (!step) throw Error("Süreç adımı bulunamadı.");
    const cur = { ...(a.handover[act.unit] ?? {}) };
    if (act.date === null) {
      if (act.key !== "abonelik" && cur[HANDOVER_STEPS[HANDOVER_STEPS.indexOf(step) + 1]?.key as StepKey])
        throw Error("Sonraki adım tamamlanmış; önce sonraki adımı geri alın.");
      delete cur[act.key];
    } else {
      if (!iso(act.date)) throw Error("Tarih geçersiz.");
      const idx = HANDOVER_STEPS.indexOf(step);
      if (idx > 0 && !cur[HANDOVER_STEPS[idx - 1].key]) throw Error(`Önce “${HANDOVER_STEPS[idx - 1].title}” adımı tamamlanmalı.`);
      cur[act.key] = act.date;
    }
    return {
      next: { ...a, handover: { ...a.handover, [act.unit]: cur } },
      message: act.date === null ? `${step.title} geri alındı` : `${step.title} tamamlandı${act.key === "teslim" ? " · daire teslim edildi" : ""}`,
      entity: act.unit,
    };
  }
  if (act.type === "ticket-create") {
    const r = act.record;
    if (!r.title.trim()) throw Error("Talep açıklaması gerekli.");
    if (!sold(r.unitId)) throw Error("Talep yalnızca satılmış bağımsız bölüm için açılır.");
    if (!iso(r.opened)) throw Error("Tarih geçersiz.");
    let n = a.tickets.length + 1;
    while (a.tickets.some((t) => t.id === `TLP-${String(n).padStart(3, "0")}`)) n++;
    const id = `TLP-${String(n).padStart(3, "0")}`;
    const t: Ticket = { id, unitId: r.unitId, project: r.project, category: r.category, title: r.title.trim(), opened: r.opened, priority: r.priority, status: "Açık", notes: r.note?.trim() ? [{ date: r.opened, text: r.note.trim() }] : [] };
    return { next: { ...a, tickets: [t, ...a.tickets] }, message: `Müşteri talebi açıldı: ${t.title}`, entity: id };
  }
  const t = a.tickets.find((x) => x.id === act.id);
  if (!t) throw Error("Talep bulunamadı.");
  if (!iso(act.date)) throw Error("Tarih geçersiz.");
  if (t.status === act.status && !act.note?.trim()) throw Error("Değişiklik yok.");
  const nt: Ticket = {
    ...t,
    status: act.status,
    closed: act.status === "Çözüldü" ? act.date : undefined,
    notes: act.note?.trim() ? [...t.notes, { date: act.date, text: act.note.trim() }] : t.notes,
  };
  return { next: { ...a, tickets: a.tickets.map((x) => (x.id === t.id ? nt : x)) }, message: `Talep ${t.id}: ${act.status}`, entity: t.id };
}
