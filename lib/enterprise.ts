import {
  projects,
  customers,
  installments,
  baseCustomers,
  baseInstallments,
  approvals,
  workItems,
  documents,
  SNAPSHOT,
  type Customer,
  type Installment,
  type BasePricing,
} from "./data.ts";
import {
  buildSchedule,
  depositStatus,
  addMonths,
  r2,
  toKurus,
  isIsoDate,
  type PlanSpec,
} from "./plan.ts";
import { unitById, unitShort, units } from "./units.ts";
import { renameLegacy } from "./names.ts";
import {
  syncCatalog,
  projectCode,
  makeBlockUnits,
  floorLabel,
  BUILTIN_PROJECT_IDS,
} from "./catalog.ts";
import type { Unit } from "./units.ts";
import {
  CONTRACTOR,
  seedLandShare,
  seedProcess,
  type LandShareState,
  type ProcessState,
  type StepStatus,
} from "./falcon.ts";
import type { Project, ProjectStatus } from "./data.ts";
import {
  demoContracts,
  demoDrafts,
  demoContractMeta,
  demoReceipts,
  demoBarters,
  demoRequests,
  demoOffsets,
  demoReminders,
  demoAudit,
  demoBilling,
} from "./demo-seed.ts";
import { applyBillingAction, DEFAULT_FX, type BillingAction, type BillingRecord, type FxSettings } from "./billing.ts";
/** Ay başı: bu tarihten önceki tahsilatlar demo açılış kasasına dahildir. */
export const MONTH_START = "2026-11-01";
export { projects, customers, installments, workItems, documents, SNAPSHOT };
export type ContractStatus =
  "Borrador" | "Pendiente de firma" | "Activo" | "Finalizado" | "Anulado";
export type ContractEvent = { date: string; status: string; note: string };
export type ContractMeta = {
  status: ContractStatus;
  signedAt?: string;
  created: string;
  history: ContractEvent[];
};
export type Offset = {
  id: string;
  barterId: string;
  requestId: string;
  amount: number;
  date: string;
};
export type RequestRecord = {
  id: string;
  project: string;
  company: string;
  name: string;
  type: string;
  amount: number;
  due: string;
  status: string;
  description?: string;
};
export type Receipt = {
  id: string;
  installmentId: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  /**
   * Hatalı tahsilatın izlenebilir düzeltmesi: kayıt silinmez, iptal tarihi ve gerekçesiyle işaretlenir.
   * İptal edilen tutar bakiyeye geri eklenir; cari hesapta hem tahsilat hem iptal satırı görünür.
   */
  reversal?: { date: string; reason: string };
};
/** Çakışmasız makbuz numarası: mevcut REC-#### numaralarının en büyüğünden devam eder. */
export function nextReceiptId(s: { receipts: { id: string }[] }) {
  const max = Math.max(
    s.receipts.length,
    ...s.receipts.map((r) => Number(/^REC-(\d{4})$/.exec(r.id)?.[1] ?? 0)),
  );
  return `REC-${String(max + 1).padStart(4, "0")}`;
}
/** Geçerli (iptal edilmemiş) tahsilatlar: bütün bakiye ve rapor hesapları bunları kullanır. */
export const activeReceipts = (s: { receipts: Receipt[] }) =>
  s.receipts.filter((r) => !r.reversal);
export type Audit = {
  id: string;
  entity: string;
  message: string;
  time: string;
  project: string;
};
export type Barter = {
  id: string;
  project: string;
  unitId: string;
  company: string;
  work: string;
  amount: number;
  start: string;
  end: string;
  progress: number;
  transfer: string;
};
export type Reminder = {
  id: string;
  project: string;
  title: string;
  due: string;
  done: boolean;
  /** Sorumlu kişi veya ekip (demo: kurgusal adlar ve ekip adları; kullanıcı hesabı değildir). */
  owner?: string;
};
export type EnterpriseState = {
  /** İmzası tamamlanmamış sözleşmeler: konutu bloke eder, finansal etkisi yoktur. */
  drafts: Customer[];
  /** İptal edilen taslaklar (arşiv). */
  cancelled: Customer[];
  contractMeta: Record<string, ContractMeta>;
  /** Barter karşılığı hakediş mahsupları (nakitsiz kapatma). */
  offsets: Offset[];
  barters: Barter[];
  reminders: Reminder[];
  depositPayments: {
    id: string;
    customerId: string;
    amount: number;
    date: string;
    /** İzlenebilir iptal: kayıt silinmez; tutar sözleşmenin tahsil edilen peşinatından düşülür. */
    reversal?: { date: string; reason: string };
  }[];
  version: 2;
  /** Demo veri kataloğu sürümü. 2: kurgusal kişi/firma adları (Demo Müşteri / Örnek firma yerine). */
  dataset?: number;
  /**
   * Örnek satışların fiyat şeması. Kayıt hangi şemayla oluştuysa korunur:
   * önceki sürümden aktarılan tarayıcı verisi "v3.1", temiz başlangıç "katalog".
   */
  basePricing?: BasePricing;
  receipts: Receipt[];
  approved: string[];
  rejected: string[];
  paidOrders: string[];
  /**
   * Gerçek ödeme tarihi (ödeme kaydedildiği gün). Hakediş vadesinden farklı olabilir.
   * Önceki sürümlerde ödenen kayıtlar için tarih yoksa "kayıt yok" gösterilir; tarih uydurulmaz.
   */
  paidDates?: Record<string, string>;
  delivered: string[];
  requests: RequestRecord[];
  requestEdits: Record<string, Partial<RequestRecord>>;
  customerEdits: Record<
    string,
    { name: string; phone: string; email: string; owner: string; note: string }
  >;
  dueEdits: Record<string, string>;
  workEdits: Record<
    string,
    { progress: number; note: string; material: string }
  >;
  documentEdits: Record<
    string,
    { status: string; owner: string; date: string }
  >;
  notes: { id: string; text: string; project: string }[];
  reserved: string[];
  released: string[];
  contracts: Customer[];
  audit: Audit[];
  /** Kullanıcının eklediği projeler (yerleşik iki proje dışında). */
  projectsCustom?: Project[];
  /** Proje bilgisi ve durum değişiklikleri (yerleşik ve yeni projeler). */
  projectEdits?: Record<string, Partial<Project>>;
  /** Kullanıcının eklediği blok ve daireler. */
  unitsCustom?: Unit[];
  /** Daire bilgisi düzenlemeleri (satılmamış daireler; satış bedelini değiştirmez). */
  unitEdits?: Record<string, Partial<Unit>>;
  /** Kullanıcının eklediği iş paketleri (taşeron firma + iş + sözleşme bedeli). */
  workCustom?: WorkItem[];
  /** BŞ Falcon: kat karşılığı paylaşımı (arsa sahibi / yüklenici), aşamalar ve değişiklik geçmişi. */
  landshare?: LandShareState;
  /** BŞ Falcon: proje süreci adımları ve güvence belge takibi (temsili). */
  process?: ProcessState;
  /** EDIFICA: registro de facturación por cobro (fuente → factura). */
  billing?: Record<string, BillingRecord>;
  /** EDIFICA: tipo de cambio de referencia definido por el usuario (₲ por USD). */
  fx?: FxSettings;
};
export type WorkItem = {
  id: string;
  project: string;
  name: string;
  company: string;
  progress: number;
  weight: number;
  /** Kurgusal iş sözleşmesi bedeli (KDV hariç). */
  value: number;
  status: string;
  material: string;
};
export const DATASET = 2;
export const seedState: EnterpriseState = {
  version: 2,
  dataset: DATASET,
  basePricing: "katalog",
  drafts: demoDrafts,
  cancelled: [],
  contractMeta: demoContractMeta,
  offsets: demoOffsets,
  barters: demoBarters,
  reminders: demoReminders,
  depositPayments: [],
  receipts: [
    ...installments
      .filter((i) => i.due.startsWith("2026-11") && i.due.slice(-2) === "10")
      .slice(0, 1)
      .map((i, n) => ({
        id: `REC-00${n + 1}`,
        installmentId: i.id,
        amount: i.amount,
        date: "2026-11-10",
        method: "Transferencia bancaria",
        reference: `HVL-261110-00${n + 1}`,
      })),
    ...demoReceipts,
  ],
  // OC-019: onaylı, malzeme teslim alındı, ödemesi vadeli (ödeme planında)
  approved: ["OC-019", "GTO-001"],
  rejected: [],
  paidOrders: ["CER-026", "GTO-001"],
  // CER-026 vadesi 8 Kasım; ödeme aynı gün kaydedildi (işlem geçmişi AUD-D04)
  paidDates: { "CER-026": "2026-11-08", "GTO-001": "2026-11-06" },
  delivered: ["OC-019"],
  requests: demoRequests,
  requestEdits: {},
  customerEdits: {},
  dueEdits: {},
  workEdits: {},
  documentEdits: {},
  notes: [],
  reserved: [],
  released: [],
  contracts: demoContracts,
  audit: demoAudit,
  projectsCustom: [],
  projectEdits: {},
  unitsCustom: [],
  unitEdits: {},
  workCustom: [],
  landshare: seedLandShare,
  process: seedProcess,
  billing: demoBilling,
  fx: DEFAULT_FX,
};
/**
 * Tarayıcıda kayıtlı durumu güvenle okur. Önceki demo sürümünün jenerik adları
 * (Demo Müşteri 081, Örnek Yapı …) aynı kayıt numarasındaki kurgusal kimliğe taşınır;
 * kimlikler, tahsilatlar ve tüm kullanıcı işlemleri korunur. Geçersiz veri için null döner.
 */
const isObj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown) => typeof x === "string" && x.length > 0;
const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
/** Kayıt türüne göre zorunlu alan denetimi: bozuk tek kayıt bütün uygulamayı çökertmesin. */
const RECORD_CHECKS: Partial<Record<keyof EnterpriseState, (x: Record<string, unknown>) => boolean>> = {
  contracts: (x) => str(x.id) && str(x.project) && str(x.name) && str(x.unit) && num(x.price) && num(x.deposit) && num(x.installment) && num(x.paidMonths),
  drafts: (x) => str(x.id) && str(x.project) && str(x.name) && str(x.unit) && num(x.price) && num(x.deposit) && num(x.installment),
  cancelled: (x) => str(x.id) && str(x.project) && str(x.name) && num(x.price),
  receipts: (x) => str(x.id) && str(x.installmentId) && num(x.amount) && (x.amount as number) > 0 && str(x.date),
  depositPayments: (x) => str(x.id) && str(x.customerId) && num(x.amount) && (x.amount as number) > 0 && str(x.date),
  barters: (x) => str(x.id) && str(x.project) && str(x.unitId) && str(x.company) && num(x.amount),
  offsets: (x) => str(x.id) && str(x.barterId) && str(x.requestId) && num(x.amount),
  requests: (x) => str(x.id) && str(x.project) && str(x.company) && str(x.name) && num(x.amount) && str(x.due),
  reminders: (x) => str(x.id) && str(x.project) && str(x.title) && str(x.due),
  audit: (x) => str(x.id) && typeof x.message === "string",
  notes: (x) => str(x.id) && typeof x.text === "string",
  projectsCustom: (x) => str(x.id) && str(x.name) && str(x.code),
  workCustom: (x) => str(x.id) && str(x.project) && str(x.name) && str(x.company) && num(x.value) && num(x.weight) && num(x.progress),
  unitsCustom: (x) => str(x.id) && str(x.project) && str(x.label) && num(x.no) && num(x.listPrice),
};
/**
 * Tarayıcı verisini şemaya göre onarır: eksik alan başlangıç değerini alır, türü bozuk alan boşaltılır,
 * zorunlu alanı eksik kayıt atlanır. Atlanan kayıt sayısı `repaired` olarak bildirilir.
 */
function sanitize(p: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...p };
  let repaired = 0;
  const fields = new Set<string>();
  for (const [k, def] of Object.entries(seedState)) {
    const v = p[k];
    if (v === undefined) {
      out[k] = structuredClone(def);
      continue;
    }
    if (Array.isArray(def)) {
      if (!Array.isArray(v)) {
        out[k] = [];
        repaired++;
        fields.add(k);
        continue;
      }
      const check = RECORD_CHECKS[k as keyof EnterpriseState];
      const kept = v.filter((x) =>
        typeof def[0] === "string" || (def.length === 0 && typeof x === "string")
          ? typeof x === "string"
          : isObj(x) && (!check || check(x)),
      );
      repaired += v.length - kept.length;
      if (kept.length !== v.length) fields.add(k);
      out[k] = kept;
    } else if (isObj(def)) {
      if (!isObj(v)) {
        out[k] = {};
        repaired++;
        fields.add(k);
      }
    }
  }
  return { state: out as unknown as EnterpriseState, repaired, fields: [...fields] };
}
/** Onarılmış durumun temel hesaplarla açılabildiğini doğrular. */
function smokeTest(s: EnterpriseState) {
  summary(s);
  paymentRows(s);
  contractList(s);
  workContracts(s);
}
export function migrateSaved(
  raw: string,
): { state: EnterpriseState; migrated: boolean; repaired: number; fields: string[] } | null {
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(p) || p.version !== 2) return null;
  const legacy = ((p.dataset as number | undefined) ?? 1) < DATASET;
  // Önceki sürüm: yalnızca adlar taşınır. Örnek satışlar o sürümün bedelleriyle kalır;
  // tahsilat, peşinat, vade ve sözleşme kayıtları olduğu gibi korunur.
  const source = legacy ? JSON.parse(renameLegacy(raw)) : p;
  const { state, repaired, fields } = sanitize(source);
  const result: EnterpriseState = legacy
    ? { ...state, dataset: DATASET, basePricing: "v3.1" }
    : { ...state, basePricing: state.basePricing ?? "katalog" };
  try {
    smokeTest(result);
  } catch {
    return null;
  }
  return { state: result, migrated: legacy, repaired, fields };
}
export type Action =
  | { type: "barter"; record: Barter }
  | { type: "barter-progress"; id: string; progress: number; transfer: string }
  | { type: "reminder"; record: Reminder }
  | { type: "reminder-done"; id: string }
  | { type: "deposit-receipt"; id: string; amount: number }
  | {
      type: "receipt";
      installmentId: string;
      amount: number;
      method: string;
      reference: string;
    }
  | { type: "approve" | "reject" | "pay-order" | "deliver"; id: string }
  | { type: "request"; record: RequestRecord }
  | { type: "edit-request"; id: string; patch: Partial<RequestRecord> }
  | {
      type: "customer";
      id: string;
      patch: EnterpriseState["customerEdits"][string];
    }
  | { type: "reschedule"; id: string; date: string }
  | { type: "work"; id: string; patch: EnterpriseState["workEdits"][string] }
  | {
      type: "document";
      id: string;
      patch: EnterpriseState["documentEdits"][string];
    }
  | { type: "note"; text: string; project: string }
  | { type: "delete-note"; id: string }
  | { type: "reserve" | "release"; id: string }
  | { type: "contract"; record: Customer; status?: "Borrador" | "Pendiente de firma" }
  | { type: "contract-status"; id: string; status: "Pendiente de firma" }
  | { type: "contract-sign"; id: string; depositPaid: number }
  | { type: "contract-cancel"; id: string; reason: string }
  | { type: "contract-transfer"; id: string; name: string; note: string }
  | {
      type: "barter-offset";
      barterId: string;
      requestId: string;
      amount: number;
    }
  | { type: "reset" }
  | BillingAction
  | { type: "share-assign"; unit: string; owner: string; note?: string }
  | { type: "share-step"; project: string; key: string; status: StepStatus }
  | { type: "obligation-toggle"; project: string; id: string }
  | { type: "process-step"; project: string; key: string; status: StepStatus; note?: string }
  | {
      type: "expense";
      record: { project: string; category: string; company: string; name: string; amount: number; date: string };
    }
  | { type: "receipt-reverse"; id: string; reason: string }
  | { type: "deposit-reverse"; id: string; reason: string }
  | {
      type: "work-create";
      record: { project: string; name: string; company: string; value: number; weight: number };
    }
  | {
      type: "project-create";
      record: { name: string; location: string; code: string; delivery: string; description: string };
    }
  | {
      type: "project-update";
      id: string;
      patch: { name: string; location: string; delivery: string; description: string };
    }
  | { type: "project-status"; id: string; status: ProjectStatus }
  | { type: "project-delete"; id: string }
  | {
      type: "block-create";
      project: string;
      block: string;
      floors: number;
      perFloor: number;
      startFloor: number;
      unitType: string;
      gross: number;
      listPrice: number;
      facade: string;
    }
  | {
      type: "unit-update";
      id: string;
      patch: { type: string; gross: number; listPrice: number; facade: string };
    };
export const pname = (id: string) =>
  projects.find((p) => p.id === id)?.name ?? "Todos los proyectos";
export const customerList = (s: EnterpriseState) => {
  syncCatalog(s);
  return customerListRaw(s);
};
const customerListRaw = (s: EnterpriseState) =>
  [...baseCustomers(s.basePricing), ...s.contracts].map((c) => ({
    ...c,
    ...s.customerEdits[c.id],
  }));
const scheduleCache = new WeakMap<Customer, Installment[]>();
function planRows(c: Customer): Installment[] {
  let rows = scheduleCache.get(c);
  if (!rows) {
    rows = buildSchedule(c.price, c.plan!).rows.map((r) => ({
      id: `${c.id}-${r.seq}`,
      customerId: c.id,
      project: c.project,
      due: r.due,
      amount: r.amount,
      kind: r.kind,
      label: r.label,
    }));
    scheduleCache.set(c, rows);
  }
  return rows;
}
export function installmentList(s: EnterpriseState): Installment[] {
  syncCatalog(s);
  return [
    ...baseInstallments(s.basePricing),
    ...s.contracts.flatMap((c) =>
      c.plan
        ? planRows(c)
        : Array.from({ length: 36 }, (_, i) => ({
            id: `${c.id}-${i + 1}`,
            customerId: c.id,
            project: c.project,
            due: `${2026 + Math.floor((11 + i) / 12)}-${String(((11 + i) % 12) + 1).padStart(2, "0")}-15`,
            amount: c.installment,
          })),
    ),
  ].map((i) => ({ ...i, due: s.dueEdits[i.id] ?? i.due }));
}
/** Kaydedilmiş gerçek ödeme tarihi; yoksa undefined (vade tarihi ödeme tarihi yerine kullanılmaz). */
export const paidDate = (s: EnterpriseState, id: string) =>
  s.paidOrders.includes(id) ? s.paidDates?.[id] : undefined;
export const requestList = (s: EnterpriseState): RequestRecord[] =>
  [...approvals, ...s.requests].map((r) => ({ ...r, ...s.requestEdits[r.id] }));
/** Bir hakedişe barter ile mahsup edilen toplam tutar. */
export const offsetFor = (s: EnterpriseState, requestId: string) =>
  r2(
    (s.offsets ?? [])
      .filter((o) => o.requestId === requestId)
      .reduce((a, o) => a + o.amount, 0),
  );
/** Bir barter anlaşmasının hakedişlere mahsup edilmiş kısmı. */
export const barterOffset = (s: EnterpriseState, barterId: string) =>
  r2(
    (s.offsets ?? [])
      .filter((o) => o.barterId === barterId)
      .reduce((a, o) => a + o.amount, 0),
  );
/** Hakedişin nakit olarak ödenecek / ödenen kısmı. */
export const netPayable = (s: EnterpriseState, r: RequestRecord) =>
  r2(r.amount - offsetFor(s, r.id));
export const requestStatus = (s: EnterpriseState, r: RequestRecord) =>
  s.paidOrders.includes(r.id)
    ? "Pagada"
    : s.rejected.includes(r.id)
      ? "Devuelto"
      : s.approved.includes(r.id) || r.status === "Aprobado"
        ? netPayable(s, r) <= 0
          ? "Compensado"
          : "Aprobado"
        : "Pendiente de aprobación";
export const outstanding = (s: EnterpriseState, i: Installment) =>
  Math.max(
    0,
    r2(
      i.amount -
        activeReceipts(s)
          .filter((r) => r.installmentId === i.id)
          .reduce((a, r) => a + r.amount, 0),
    ),
  );
/** Konut satış, taslak sözleşme veya barter nedeniyle bloke mi? */
/** Bağımsız bölümün paydaşı: arsa sahibi kimliği veya "yuklenici". */
export const unitOwner = (s: EnterpriseState, id: string) => s.landshare?.owners?.[id] ?? CONTRACTOR;
export const isLandownerUnit = (s: EnterpriseState, id: string) => unitOwner(s, id) !== CONTRACTOR;
export const unitTaken = (s: EnterpriseState, id: string) =>
  isLandownerUnit(s, id) ||
  customerList(s).some((c) => c.id === id) ||
  s.barters.some((b) => b.unitId === id) ||
  (s.drafts ?? []).some((d) => d.id === id);
export const workList = (s: EnterpriseState) =>
  [...(workItems as WorkItem[]), ...(s.workCustom ?? [])].map((w) => ({
    ...w,
    ...s.workEdits[w.id],
  }));
export const projectProgress = (s: EnterpriseState, id: string) =>
  Math.round(
    workList(s)
      .filter((w) => w.project === id)
      .reduce((a, w) => a + (w.weight * w.progress) / 100, 0),
  );
/**
 * Şantiye ilerlemesinin kaynağı: projedeki iş paketleri ve ağırlıkları. Ağırlıklar toplamı %100 değilse
 * ilerleme yüzdesi anlamlı değildir; bu durumda `value` null döner ve arayüz kesin yüzde göstermez.
 * (Şantiye ilerlemesi finansal ilerlemeden — tahsilat oranından — bağımsızdır.)
 */
export function progressInfo(s: EnterpriseState, id: string) {
  const ws = workList(s).filter((w) => w.project === id);
  const weight = ws.reduce((a, w) => a + w.weight, 0);
  return {
    packages: ws.length,
    weight,
    value: ws.length && weight === 100 ? projectProgress(s, id) : null,
  };
}
export function reservedUnits(s: EnterpriseState, id: string) {
  syncCatalog(s);
  const p = projects.find((p) => p.id === id);
  if (!p) return [];
  const sold = customers.filter((c) => c.project === id).length;
  return [
    ...new Set([
      ...Array.from({ length: p.reserved }, (_, i) => `${id}-${sold + i + 1}`),
      ...s.reserved.filter((k) => k.startsWith(id + "-")),
    ]),
  ].filter(
    (k) =>
      !s.released.includes(k) &&
      !s.contracts.some((c) => c.id === k) &&
      !s.barters.some((b) => b.unitId === k) &&
      !(s.drafts ?? []).some((d) => d.id === k),
  );
}
/** Temsili ay başı kasa bakiyesi (yalnızca yerleşik projeler; demo varsayımı). */
const OPENING_CASH: Record<string, number> = { lofty: 420000, alion: 310000, vtower: 260000, business: 150000 };
export function summary(s: EnterpriseState, project = "all") {
  syncCatalog(s);
  const inScope = (id: string) => project === "all" || id === project;
  const ps = projects.filter((p) => inScope(p.id)),
    cs = customerList(s).filter((c) => inScope(c.project)),
    ins = installmentList(s).filter((i) => inScope(i.project));
  const requests = requestList(s).filter((r) => inScope(r.project));
  const insIds = new Set(ins.map((i) => i.id));
  const receipts = activeReceipts(s).filter((r) => insIds.has(r.installmentId));
  // Bu ay kaydedilen iptaller (önceki aylarda tahsil edilmiş olsa bile) bu ayın kasasından düşer.
  const reversedThisMonth = s.receipts
    .filter(
      (r) =>
        r.reversal &&
        r.reversal.date >= MONTH_START &&
        insIds.has(r.installmentId) &&
        !r.date.startsWith("2026-11"),
    )
    .reduce((a, r) => a + r.amount, 0);
  const revenue = cs.reduce((a, c) => a + c.price, 0),
    collected =
      cs.reduce((a, c) => a + c.deposit + c.installment * c.paidMonths, 0) +
      receipts.reduce((a, r) => a + r.amount, 0);
  const collectedR = r2(collected);
  const planned = ins
    .filter((i) => i.due.startsWith("2026-11"))
    .reduce((a, i) => a + i.amount, 0);
  const received = receipts
    .filter((r) => r.date.startsWith("2026-11"))
    .reduce((a, r) => a + r.amount, 0);
  const payable = r2(
      requests
        .filter((r) => requestStatus(s, r) === "Aprobado")
        .reduce((a, r) => a + netPayable(s, r), 0),
    ),
    paid = r2(
      requests
        .filter((r) => requestStatus(s, r) === "Pagada")
        .reduce((a, r) => a + netPayable(s, r), 0),
    ),
    offset = r2(
      (s.offsets ?? [])
        .filter((o) => requests.some((r) => r.id === o.requestId))
        .reduce((a, o) => a + o.amount, 0),
    );
  const drafts = (s.drafts ?? []).filter((d) => inScope(d.project));
  const depositOverdue = r2(
    s.contracts
      .filter((c) => inScope(c.project))
      .reduce(
        (a, c) =>
          a +
          depositSchedule(c, contractSignedAt(s, c))
            .filter((p) => p.due < SNAPSHOT)
            .reduce((x, p) => x + p.remaining, 0),
        0,
      ),
  );
  const overdueInstallments = ins
    .filter((i) => i.due < SNAPSHOT)
    .reduce((a, i) => a + outstanding(s, i), 0);
  const depositPending = r2(
    s.contracts
      .filter((c) => inScope(c.project))
      .reduce(
        (a, c) => a + Math.max(0, (c.depositExpected ?? c.deposit) - c.deposit),
        0,
      ),
  );
  const opening = ps.reduce(
    // Temsili ay başı kasa bakiyesi yalnızca yerleşik projelerde vardır; yeni projeler sıfırdan başlar.
    (a, p) => a + (OPENING_CASH[p.id] ?? 0),
    0,
  );
  // Kasaya bu ay giren peşinat: ay başından önce imzada alınan peşinat açılış kasasına dahildir.
  const deposits = s.contracts
    .filter((c) => inScope(c.project))
    .reduce((a, c) => {
      const later = s.depositPayments
        .filter((d) => d.customerId === c.id && !d.reversal)
        .reduce((x, d) => x + d.amount, 0);
      return (
        a + (c.depositDate && c.depositDate < MONTH_START ? later : c.deposit)
      );
    }, 0);
  return {
    sold: cs.length,
    barterCount: s.barters.filter((b) => inScope(b.project)).length,
    barterValue: s.barters
      .filter((b) => inScope(b.project))
      .reduce((sum, b) => sum + b.amount, 0),
    total: ps.reduce((a, p) => a + p.total, 0),
    reserved: ps.reduce((a, p) => a + reservedUnits(s, p.id).length, 0),
    revenue,
    collected: collectedR,
    balance: r2(revenue - collectedR),
    budget: ps.reduce((a, p) => a + p.budget, 0),
    cost: ps.reduce((a, p) => a + p.cost, 0),
    overdue: r2(
      ins
        .filter((i) => i.due < SNAPSHOT)
        .reduce((a, i) => a + outstanding(s, i), 0),
    ),
    planned,
    received,
    month: r2(
      ins
        .filter((i) => i.due.startsWith("2026-11"))
        .reduce((a, i) => a + outstanding(s, i), 0),
    ),
    payable,
    paid,
    offset,
    drafts: drafts.length,
    draftValue: drafts.reduce((a, d) => a + d.price, 0),
    depositPending,
    /** Vadesi geçmiş peşinat parçaları (kademeli peşinat). */
    depositOverdue,
    /** Yönetici görünümü: vadesi geçmiş taksit + ara ödeme + peşinat. */
    overdueTotal: r2(overdueInstallments + depositOverdue),
    opening,
    cash: r2(opening + received - reversedThisMonth + deposits - paid),
    pending: requests.filter((r) => requestStatus(s, r) === "Pendiente de aprobación")
      .length,
    progress: (() => {
      const budget = ps.reduce((a, p) => a + p.budget, 0);
      return budget
        ? Math.round(
            ps.reduce((a, p) => a + projectProgress(s, p.id) * p.budget, 0) /
              budget,
          )
        : 0;
    })(),
  };
}
const id = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
export function applyAction(
  s: EnterpriseState,
  action: Action,
): EnterpriseState {
  let next: EnterpriseState = { ...s },
    message = "",
    entity = "",
    project = "all";
  syncCatalog(s);
  const req =
    "id" in action ? requestList(s).find((r) => r.id === action.id) : undefined;
  if (action.type === "reset") {
    const fresh = structuredClone(seedState);
    syncCatalog(fresh);
    return fresh;
  }
  // Kat karşılığı: arsa sahibi payındaki bölüm yüklenici tarafından satılamaz, rezerve veya barter edilemez.
  const targetUnit =
    action.type === "contract" ? action.record.id
    : action.type === "reserve" ? action.id
    : action.type === "barter" ? action.record.unitId
    : null;
  if (targetUnit && isLandownerUnit(s, targetUnit))
    throw Error("Esta unidad pertenece al propietario del terreno; no se puede vender, reservar ni canjear.");
  if (action.type === "invoice-issue" || action.type === "invoice-void" || action.type === "fx-set") {
    const r = applyBillingAction(s, action);
    next = { ...next, ...r.patch };
    entity = r.entity;
    project = r.project;
    message = r.message;
  } else if (action.type === "share-assign") {
    const u = unitById(action.unit);
    const ls = s.landshare ?? seedLandShare;
    const ag = u && ls.agreements.find((a) => a.project === u.project);
    if (!u || !ag) throw Error("Este proyecto no tiene acuerdo de canje por terreno.");
    const from = unitOwner(s, u.id);
    const to = action.owner;
    if (to !== CONTRACTOR && !ag.owners.some((o) => o.id === to)) throw Error("Propietario inválido.");
    if (from === to) throw Error("La unidad ya pertenece a este titular.");
    // Yüklenicide satılmış, imza sürecindeki, barterli veya rezerve bölüm arsa sahibine aktarılamaz
    if (
      from === CONTRACTOR &&
      (customerList(s).some((c) => c.id === u.id) ||
        (s.drafts ?? []).some((d) => d.id === u.id) ||
        s.barters.some((b) => b.unitId === u.id) ||
        reservedUnits(s, u.project).includes(u.id))
    )
      throw Error("Una unidad vendida, en firma, canjeada o reservada no puede transferirse.");
    const name = (id: string) => (id === CONTRACTOR ? "Contratista" : ag.owners.find((o) => o.id === id)?.name ?? id);
    const owners = { ...ls.owners };
    if (to === CONTRACTOR) delete owners[u.id];
    else owners[u.id] = to;
    const text = `${u.label} (${u.type}): ${name(from)} → ${name(to)}${action.note?.trim() ? " · " + action.note.trim() : ""}`;
    next.landshare = { ...ls, owners, history: [{ id: id(), date: SNAPSHOT, project: u.project, text }, ...ls.history].slice(0, 60) };
    entity = u.id;
    project = u.project;
    message = `Distribución de unidades actualizada: ${text}`;
  } else if (action.type === "share-step") {
    const ls = s.landshare ?? seedLandShare;
    const ag = ls.agreements.find((a) => a.project === action.project);
    const st = ag?.steps.find((x) => x.key === action.key);
    if (!ag || !st) throw Error("Etapa del acuerdo no encontrada.");
    next.landshare = {
      ...ls,
      agreements: ls.agreements.map((a) =>
        a !== ag ? a : { ...a, steps: a.steps.map((x) => (x.key !== st.key ? x : { ...x, status: action.status, date: action.status === "Finalizado" ? x.date || SNAPSHOT : x.date })) },
      ),
      history: [{ id: id(), date: SNAPSHOT, project: ag.project, text: `Etapa del acuerdo: ${st.title} → ${action.status}` }, ...ls.history].slice(0, 60),
    };
    entity = st.key;
    project = ag.project;
    message = `Etapa actualizada: ${st.title} · ${action.status}`;
  } else if (action.type === "obligation-toggle") {
    const ls = s.landshare ?? seedLandShare;
    const ag = ls.agreements.find((a) => a.project === action.project);
    const ob = ag?.obligations.find((o) => o.id === action.id);
    if (!ag || !ob) throw Error("Obligación no encontrada.");
    next.landshare = {
      ...ls,
      agreements: ls.agreements.map((a) => (a !== ag ? a : { ...a, obligations: a.obligations.map((o) => (o.id === ob.id ? { ...o, done: !o.done } : o)) })),
      history: [{ id: id(), date: SNAPSHOT, project: ag.project, text: `Obligación ${ob.done ? "reabierta" : "cumplida"}: ${ob.title}` }, ...ls.history].slice(0, 60),
    };
    entity = ob.id;
    project = ag.project;
    message = `Obligación de entrega ${ob.done ? "reabierta" : "cumplida"}`;
  } else if (action.type === "process-step") {
    const pr = s.process ?? seedProcess;
    const cur = pr[action.project];
    const st = cur?.steps.find((x) => x.key === action.key);
    if (!cur || !st) throw Error("Etapa del proceso no encontrada.");
    next.process = {
      ...pr,
      [action.project]: {
        ...cur,
        steps: cur.steps.map((x) => (x.key !== st.key ? x : { ...x, status: action.status, note: action.note ?? x.note, date: action.status === "Finalizado" ? x.date || SNAPSHOT : x.date })),
      },
    };
    entity = st.key;
    project = action.project;
    message = `Proceso del proyecto actualizado: ${st.title} · ${action.status}`;
  } else if (action.type === "expense") {
    const r = action.record;
    const pj = projects.find((x) => x.id === r.project);
    if (!pj) throw Error("Proyecto no encontrado.");
    if (pj.status !== "Activo") throw Error("Solo se pueden registrar gastos de obra en proyectos activos.");
    if (!r.name.trim() || !r.company.trim()) throw Error("La descripción del gasto y el proveedor son obligatorios.");
    if (!Number.isFinite(r.amount) || r.amount <= 0) throw Error("El monto del gasto debe ser positivo.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || r.date > SNAPSHOT) throw Error("La fecha del gasto debe ser válida y no puede ser futura.");
    const all = requestList(s);
    let n = all.filter((x) => x.id.startsWith("GTO-")).length + 1;
    while (all.some((x) => x.id === `GTO-${String(n).padStart(3, "0")}`)) n++;
    const gid = `GTO-${String(n).padStart(3, "0")}`;
    next.requests = [
      ...s.requests,
      { id: gid, project: r.project, company: r.company.trim(), name: r.name.trim(), type: "Gasto de obra", amount: r2(r.amount), due: r.date, status: "Pagada", description: r.category },
    ];
    next.approved = [...s.approved, gid];
    next.paidOrders = [...s.paidOrders, gid];
    next.paidDates = { ...(s.paidDates ?? {}), [gid]: r.date };
    entity = gid;
    project = r.project;
    message = `Gasto de obra registrado (${r.category}); caja y presupuesto actualizados`;
  } else if (action.type === "barter") {
    const b = action.record,
      p = projects.find((p) => p.id === b.project),
      bu = unitById(b.unitId);
    if (
      !p ||
      !bu ||
      bu.project !== p.id ||
      unitTaken(s, b.unitId) ||
      reservedUnits(s, p.id).includes(b.unitId) ||
      s.barters.some((v) => v.id === b.id)
    )
      throw Error("La unidad está vendida, reservada, canjeada o no es válida.");
    if (p.status !== "Activo")
      throw Error("Solo se pueden registrar canjes en proyectos activos.");
    if (
      !b.company.trim() ||
      !b.work.trim() ||
      !Number.isFinite(b.amount) ||
      b.amount <= 0 ||
      !isIsoDate(b.start) ||
      !isIsoDate(b.end) ||
      b.end < b.start ||
      b.progress < 0 ||
      b.progress > 100
    )
      throw Error("Verifique proveedor, trabajo, monto y fechas.");
    next.barters = [b, ...s.barters]; // en yeni anlaşma başta
    entity = b.id;
    project = b.project;
    message = "Canje registrado; unidad asignada sin movimiento de caja";
  } else if (action.type === "barter-progress") {
    const b = s.barters.find((b) => b.id === action.id);
    if (
      !b ||
      !Number.isFinite(action.progress) ||
      action.progress < 0 ||
      action.progress > 100 ||
      !["Pendiente", "En transferencia", "Devredildi"].includes(action.transfer)
    )
      throw Error("Se requiere un avance y un estado de transferencia válidos.");
    next.barters = s.barters.map((b) =>
      b.id === action.id
        ? { ...b, progress: action.progress, transfer: action.transfer }
        : b,
    );
    entity = b.id;
    project = b.project;
    message = "Estado del canje actualizado";
  } else if (action.type === "barter-offset") {
    const b = s.barters.find((b) => b.id === action.barterId),
      r = requestList(s).find((r) => r.id === action.requestId);
    if (!b || !r) throw Error("Canje o certificado no encontrado.");
    if (r.type !== "Certificado de obra" || r.project !== b.project)
      throw Error("La compensación solo se aplica a certificados del mismo proyecto.");
    if (
      r.company.trim().toLocaleLowerCase("es") !==
      b.company.trim().toLocaleLowerCase("es")
    )
      throw Error("El proveedor del certificado debe ser el mismo del canje.");
    if (requestStatus(s, r) !== "Aprobado")
      throw Error("Para compensar, el certificado debe estar aprobado y sin pagar.");
    const amount = r2(action.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      throw Error("Se requiere un monto de compensación positivo.");
    if (amount > r2(b.amount - barterOffset(s, b.id)))
      throw Error("El monto no puede superar el saldo del canje.");
    if (amount > netPayable(s, r))
      throw Error("El monto no puede superar el saldo del certificado.");
    next.offsets = [
      ...(s.offsets ?? []),
      { id: id(), barterId: b.id, requestId: r.id, amount, date: SNAPSHOT },
    ];
    entity = r.id;
    project = r.project;
    message = `US$ ${amount.toLocaleString("es-PY")} compensados con canje; la caja no cambió`;
  } else if (action.type === "reminder") {
    const r = action.record;
    if (
      !r.title.trim() ||
      !isIsoDate(r.due) ||
      s.reminders.some((v) => v.id === r.id)
    )
      throw Error("Se requieren el título y la fecha del recordatorio.");
    next.reminders = [r, ...s.reminders]; // en yeni hatırlatma başta
    entity = r.id;
    project = r.project;
    message = "Recordatorio creado";
  } else if (action.type === "reminder-done") {
    const r = s.reminders.find((r) => r.id === action.id);
    if (!r) throw Error("Recordatorio no encontrado.");
    next.reminders = s.reminders.map((r) =>
      r.id === action.id ? { ...r, done: !r.done } : r,
    );
    entity = r.id;
    project = r.project;
    message = "Estado del recordatorio actualizado";
  } else if (action.type === "deposit-receipt") {
    const c = s.contracts.find((c) => c.id === action.id);
    if (
      !c ||
      !Number.isFinite(action.amount) ||
      action.amount <= 0 ||
      toKurus(action.amount) >
        toKurus((c.depositExpected ?? c.deposit) - c.deposit)
    )
      throw Error("El monto no puede superar el anticipo pendiente.");
    const amount = r2(action.amount);
    next.contracts = s.contracts.map((v) =>
      v.id === c.id ? { ...v, deposit: r2(v.deposit + amount) } : v,
    );
    next.depositPayments = [
      ...s.depositPayments,
      { id: id(), customerId: c.id, amount, date: SNAPSHOT },
    ];
    entity = c.id;
    project = c.project;
    message = "Anticipo cobrado; caja y saldo del cliente actualizados";
  } else if (action.type === "contract-status") {
    const d = (s.drafts ?? []).find((d) => d.id === action.id);
    const meta = s.contractMeta[action.id];
    if (!d || !meta || meta.status !== "Borrador")
      throw Error("Solo un borrador puede enviarse a firma.");
    next.contractMeta = {
      ...s.contractMeta,
      [d.id]: {
        ...meta,
        status: "Pendiente de firma",
        history: [
          ...meta.history,
          {
            date: SNAPSHOT,
            status: "Pendiente de firma",
            note: "Contrato enviado a firma",
          },
        ],
      },
    };
    entity = d.id;
    project = d.project;
    message = "Contrato enviado a firma";
  } else if (action.type === "contract-sign") {
    const d = (s.drafts ?? []).find((d) => d.id === action.id);
    const meta = s.contractMeta[action.id];
    if (!d || !meta) throw Error("No se encontró el borrador a firmar.");
    const expected = d.depositExpected ?? 0;
    if (
      !Number.isFinite(action.depositPaid) ||
      action.depositPaid < 0 ||
      toKurus(action.depositPaid) > toKurus(expected)
    )
      throw Error("El anticipo cobrado en la firma no puede superar el anticipo pactado.");
    const paid = r2(action.depositPaid);
    const signed: Customer = {
      ...d,
      deposit: paid,
      depositDate: paid > 0 ? SNAPSHOT : undefined,
    };
    next.drafts = s.drafts.filter((v) => v.id !== d.id);
    next.contracts = [...s.contracts, signed];
    next.contractMeta = {
      ...s.contractMeta,
      [d.id]: {
        ...meta,
        status: "Activo",
        signedAt: SNAPSHOT,
        history: [
          ...meta.history,
          {
            date: SNAPSHOT,
            status: "Activo",
            note: `Firmado · anticipo cobrado en la firma US$ ${paid.toLocaleString("es-PY")}`,
          },
        ],
      },
    };
    entity = d.id;
    project = d.project;
    message = "Contrato firmado; plan de pagos y cuentas por cobrar generados";
  } else if (action.type === "contract-cancel") {
    const meta = s.contractMeta[action.id];
    const d = (s.drafts ?? []).find((d) => d.id === action.id);
    if (!d || !meta)
      throw Error(
        "La rescisión de un contrato activo requiere un proceso de devolución; en la demo solo se anulan borradores.",
      );
    if (!action.reason.trim()) throw Error("Indique el motivo de la anulación.");
    next.drafts = s.drafts.filter((v) => v.id !== d.id);
    next.cancelled = [...(s.cancelled ?? []), d];
    next.contractMeta = {
      ...s.contractMeta,
      [d.id]: {
        ...meta,
        status: "Anulado",
        history: [
          ...meta.history,
          { date: SNAPSHOT, status: "Anulado", note: action.reason.trim() },
        ],
      },
    };
    entity = d.id;
    project = d.project;
    message = "Borrador anulado; la unidad volvió a estar disponible";
  } else if (action.type === "contract-transfer") {
    const c = customerList(s).find((c) => c.id === action.id);
    if (!c) throw Error("Contrato activo no encontrado.");
    const name = action.name.trim();
    if (!name || name === c.name) throw Error("Se requiere el nombre del cesionario.");
    const prev = s.customerEdits[c.id] ?? {
      name: c.name,
      phone: "",
      email: "",
      owner: "",
      note: "",
    };
    next.customerEdits = { ...s.customerEdits, [c.id]: { ...prev, name } };
    const meta = s.contractMeta[c.id] ?? {
      status: "Activo" as const,
      created: contractSignedAt(s, c),
      signedAt: contractSignedAt(s, c),
      history: [],
    };
    next.contractMeta = {
      ...s.contractMeta,
      [c.id]: {
        ...meta,
        history: [
          ...meta.history,
          {
            date: SNAPSHOT,
            status: "Cesión",
            note: `${c.name} → ${name}${action.note.trim() ? ` · ${action.note.trim()}` : ""}`,
          },
        ],
      },
    };
    entity = c.id;
    project = c.project;
    message = "Cesión registrada; saldo y plan pasan al cesionario";
  } else if (action.type === "receipt") {
    const i = installmentList(s).find((i) => i.id === action.installmentId);
    if (!i) throw Error("Cuota no encontrada.");
    if (
      !Number.isFinite(action.amount) ||
      toKurus(action.amount) <= 0 ||
      toKurus(action.amount) > toKurus(outstanding(s, i))
    )
      throw Error("El monto no puede superar el saldo de la cuota.");
    const ref = action.reference.trim();
    if (!ref) throw Error("Se requiere el comprobante o la referencia del pago.");
    // Aynı dekont aynı taksite ikinci kez işlenemez (çift tıklama ve tekrar kayıt koruması).
    if (
      activeReceipts(s).some(
        (r) =>
          r.installmentId === i.id &&
          r.reference.toLocaleLowerCase("es") === ref.toLocaleLowerCase("es"),
      )
    )
      throw Error("Este comprobante ya fue registrado para esta cuota.");
    next.receipts = [
      ...s.receipts,
      {
        id: nextReceiptId(s),
        installmentId: i.id,
        amount: r2(action.amount),
        date: SNAPSHOT,
        method: action.method,
        reference: ref,
      },
    ];
    entity = i.id;
    project = i.project;
    message = `Cobro de US$ ${action.amount.toLocaleString("es-PY")} registrado`;
  } else if (
    ["approve", "reject", "pay-order", "deliver"].includes(action.type)
  ) {
    if (!req) throw Error("Operación no encontrada.");
    const status = requestStatus(s, req);
    entity = req.id;
    project = req.project;
    if (action.type === "approve") {
      if (status !== "Pendiente de aprobación")
        throw Error("Esta operación ya fue evaluada.");
      next.approved = [...s.approved, req.id];
      message = "Aprobado; agregado a pagos programados";
    }
    if (action.type === "reject") {
      if (status !== "Pendiente de aprobación")
        throw Error("Solo se puede devolver una operación pendiente.");
      next.rejected = [...s.rejected, req.id];
      message = "Devuelto para revisión";
    }
    if (action.type === "pay-order") {
      if (status !== "Aprobado")
        throw Error("El pago requiere aprobación previa.");
      if (netPayable(s, req) > summary(s, req.project).cash)
        throw Error("Saldo de caja del proyecto insuficiente.");
      next.paidOrders = [...s.paidOrders, req.id];
      next.paidDates = { ...(s.paidDates ?? {}), [req.id]: SNAPSHOT };
      message = "Pago registrado; caja y pagos programados actualizados";
    }
    if (action.type === "deliver") {
      if (
        req.type !== "Compra" ||
        !["Aprobado", "Pagada"].includes(status)
      )
        throw Error("La recepción requiere una compra aprobada.");
      if (s.delivered.includes(req.id))
        throw Error("La recepción ya fue registrada.");
      next.delivered = [...s.delivered, req.id];
      message = "Material recibido en obra";
    }
  } else if (action.type === "request") {
    const r = action.record;
    if (
      !r.name.trim() ||
      !r.company.trim() ||
      !Number.isFinite(r.amount) ||
      r.amount <= 0
    )
      throw Error("Se requieren proveedor, descripción y monto positivo.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.due))
      throw Error("Se requiere una fecha válida.");
    if (requestList(s).some((v) => v.id === r.id))
      throw Error("El registro ya existe.");
    next.requests = [...s.requests, r];
    entity = r.id;
    project = r.project;
    message = "Solicitud creada";
  } else if (action.type === "edit-request") {
    if (
      !req ||
      !["Pendiente de aprobación", "Devuelto"].includes(requestStatus(s, req))
    )
      throw Error("Una operación aprobada no puede editarse.");
    const r = { ...req, ...action.patch };
    if (
      !r.name.trim() ||
      !r.company.trim() ||
      !Number.isFinite(r.amount) ||
      r.amount <= 0
    )
      throw Error("Se requieren proveedor, descripción y monto válidos.");
    next.requestEdits = { ...s.requestEdits, [req.id]: r };
    next.rejected = s.rejected.filter((i) => i !== req.id);
    entity = req.id;
    project = req.project;
    message = "Solicitud actualizada y enviada a aprobación";
  } else if (action.type === "customer") {
    const c = customerList(s).find((c) => c.id === action.id);
    if (!c || !action.patch.name.trim())
      throw Error("Se requiere un nombre de cliente válido.");
    next.customerEdits = { ...s.customerEdits, [c.id]: action.patch };
    entity = c.id;
    project = c.project;
    message = "Datos del cliente actualizados";
  } else if (action.type === "reschedule") {
    const i = installmentList(s).find((i) => i.id === action.id);
    if (!i || !outstanding(s, i))
      throw Error("Una cuota pagada no puede reprogramarse.");
    if (action.date < SNAPSHOT)
      throw Error("El nuevo vencimiento no puede ser anterior a la fecha de corte.");
    next.dueEdits = { ...s.dueEdits, [i.id]: action.date };
    entity = i.id;
    project = i.project;
    message = `Vencimiento de la cuota cambiado a ${action.date}`;
  } else if (action.type === "work") {
    const w = workList(s).find((w) => w.id === action.id);
    if (
      !w ||
      !Number.isFinite(action.patch.progress) ||
      action.patch.progress < 0 ||
      action.patch.progress > 100
    )
      throw Error("El avance debe estar entre 0 y 100.");
    next.workEdits = { ...s.workEdits, [w.id]: action.patch };
    entity = w.id;
    project = w.project;
    message = `Avance de obra actualizado a ${action.patch.progress} %`;
  } else if (action.type === "document") {
    const d = documents.find((d) => d.id === action.id);
    if (!d || !action.patch.owner.trim()) throw Error("Se requiere un responsable.");
    next.documentEdits = { ...s.documentEdits, [d.id]: action.patch };
    entity = d.id;
    project = d.project;
    message = `Estado del documento: ${action.patch.status}`;
  } else if (action.type === "note") {
    if (!action.text.trim()) throw Error("La nota no puede estar vacía.");
    entity = id();
    project = action.project;
    next.notes = [
      ...s.notes,
      { id: entity, text: action.text.trim(), project },
    ];
    message = "Nota de gerencia agregada";
  } else if (action.type === "delete-note") {
    next.notes = s.notes.filter((n) => n.id !== action.id);
    entity = action.id;
    message = "Nota de gerencia eliminada";
  } else if (action.type === "reserve" || action.type === "release") {
    const projectId = action.id.split("-")[0];
    const p = projects.find((p) => p.id === projectId);
    const u = unitById(action.id);
    if (!p || !u || u.project !== p.id || unitTaken(s, action.id))
      throw Error("No se puede operar sobre una unidad vendida o inválida.");
    if (p.status === "Archivado")
      throw Error("No se puede reservar en un proyecto archivado; reactívelo primero.");
    project = p.id;
    entity = action.id;
    if (action.type === "reserve") {
      if (reservedUnits(s, p.id).includes(action.id))
        throw Error("Esta unidad ya está reservada.");
      next.reserved = [...new Set([...s.reserved, action.id])];
      next.released = s.released.filter((k) => k !== action.id);
      message = "Unidad reservada";
    } else {
      next.reserved = s.reserved.filter((k) => k !== action.id);
      next.released = [...new Set([...s.released, action.id])];
      message = "Reserva liberada";
    }
  } else if (action.type === "contract") {
    const c = action.record,
      p = projects.find((p) => p.id === c.project);
    const u = unitById(c.id);
    if (!p || !u || u.project !== p.id || unitTaken(s, c.id))
      throw Error("La unidad está vendida o no es válida.");
    if (p.status !== "Activo")
      throw Error("Solo se pueden registrar ventas en proyectos activos.");
    const expected = c.depositExpected ?? c.deposit;
    if (
      ![c.price, c.deposit, c.installment, expected].every(Number.isFinite) ||
      c.id.split("-")[0] !== c.project ||
      c.paidMonths !== 0 ||
      !c.name.trim() ||
      c.price <= 0 ||
      c.deposit < 0 ||
      toKurus(c.deposit) > toKurus(expected) ||
      toKurus(expected) >= toKurus(c.price)
    )
      throw Error("El precio del contrato y las cuotas no coinciden.");
    let record: Customer = c;
    if (c.plan) {
      // Esnek plan: peşinat parçaları + ara ödemeler + taksitler kuruşu kuruşuna bedele eşit olmalı.
      const sch = buildSchedule(c.price, c.plan);
      if (toKurus(sch.depositTotal) !== toKurus(expected))
        throw Error(
          "La suma de las partes del anticipo debe ser igual al anticipo pactado.",
        );
      record = {
        ...c,
        depositExpected: sch.depositTotal,
        installment: sch.installment,
        depositDue: c.plan.deposits[0]?.due,
      };
    } else if (Math.abs(expected + 36 * c.installment - c.price) > 0.01)
      throw Error("El precio del contrato y las cuotas no coinciden.");
    const draft =
      action.status === "Borrador" || action.status === "Pendiente de firma";
    const status: ContractStatus = draft ? action.status! : "Activo";
    if (draft) record = { ...record, deposit: 0, depositDate: undefined };
    if (draft) next.drafts = [...(s.drafts ?? []), record];
    else next.contracts = [...s.contracts, record];
    next.reserved = s.reserved.filter((k) => k !== c.id);
    next.contractMeta = {
      ...s.contractMeta,
      [c.id]: {
        status,
        created: SNAPSHOT,
        signedAt: draft ? undefined : SNAPSHOT,
        history: [
          {
            date: SNAPSHOT,
            status,
            note: draft
              ? "Borrador de contrato creado"
              : "Contrato firmado y activado",
          },
        ],
      },
    };
    entity = c.id;
    project = c.project;
    const n2 = c.plan ? c.plan.count + c.plan.interim.length : 36;
    message = draft
      ? "Borrador guardado; unidad bloqueada"
      : `Venta registrada; ${n2} vencimientos generados`;
  } else if (action.type === "work-create") {
    const r = action.record;
    const p = projects.find((x) => x.id === r.project);
    if (!p) throw Error("Proyecto no encontrado.");
    if (p.status === "Archivado") throw Error("No se pueden agregar paquetes de obra a un proyecto archivado.");
    const name = r.name.trim(),
      company = r.company.trim();
    if (name.length < 3 || company.length < 2)
      throw Error("Se requieren el nombre del paquete y el contratista.");
    if (!(r.value > 0)) throw Error("El precio del contrato debe ser positivo.");
    if (!Number.isInteger(r.weight) || r.weight < 1 || r.weight > 100)
      throw Error("El peso debe ser un entero entre 1 y 100.");
    const used = workList(s)
      .filter((w) => w.project === p.id)
      .reduce((a, w) => a + w.weight, 0);
    if (used + r.weight > 100)
      throw Error(`La suma de pesos de los paquetes no puede superar 100 % (restante ${100 - used} %).`);
    if (workList(s).some((w) => w.project === p.id && w.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es")))
      throw Error("Ya existe un paquete con ese nombre en el proyecto.");
    let n = workList(s).length + 1;
    while (workList(s).some((w) => w.id === `w${n}`)) n++;
    const rec: WorkItem = {
      id: `w${n}`,
      project: p.id,
      name,
      company,
      progress: 0,
      weight: r.weight,
      value: r2(r.value),
      status: "Planificado",
      material: "—",
    };
    next.workCustom = [...(s.workCustom ?? []), rec];
    entity = rec.id;
    project = p.id;
    message = `Paquete de obra agregado: ${name} · ${company}`;
  } else if (action.type === "deposit-reverse") {
    const d = s.depositPayments.find((x) => x.id === action.id);
    if (!d) throw Error("Cobro de anticipo no encontrado.");
    if (d.reversal) throw Error("Este cobro de anticipo ya fue anulado.");
    if (!action.reason.trim()) throw Error("Indique el motivo de la anulación.");
    const c = s.contracts.find((x) => x.id === d.customerId);
    if (!c) throw Error("Contrato no encontrado.");
    if (toKurus(c.deposit) < toKurus(d.amount))
      throw Error("El anticipo cobrado es insuficiente para esta anulación.");
    next.depositPayments = s.depositPayments.map((x) =>
      x.id === d.id
        ? { ...x, reversal: { date: SNAPSHOT, reason: action.reason.trim() } }
        : x,
    );
    next.contracts = s.contracts.map((x) =>
      x.id === c.id ? { ...x, deposit: r2(x.deposit - d.amount) } : x,
    );
    entity = c.id;
    project = c.project;
    message = `Cobro de anticipo anulado (US$ ${d.amount.toLocaleString("es-PY")}); se sumó al anticipo pendiente`;
  } else if (action.type === "receipt-reverse") {
    const r = s.receipts.find((x) => x.id === action.id);
    if (!r) throw Error("Cobro no encontrado.");
    if (r.reversal) throw Error("Este cobro ya fue anulado.");
    if (!action.reason.trim()) throw Error("Indique el motivo de la anulación.");
    const i = installmentList(s).find((x) => x.id === r.installmentId);
    next.receipts = s.receipts.map((x) =>
      x.id === r.id
        ? { ...x, reversal: { date: SNAPSHOT, reason: action.reason.trim() } }
        : x,
    );
    entity = r.installmentId;
    project = i?.project ?? "all";
    message = `Cobro ${r.id} anulado (US$ ${r.amount.toLocaleString("es-PY")}); el saldo se restableció`;
  } else if (action.type === "project-create") {
    const r = action.record;
    const name = r.name.trim(),
      code = r.code.trim().toLocaleUpperCase("es");
    if (name.length < 2) throw Error("Se requiere el nombre del proyecto.");
    if (!/^[A-ZÑ]{2,4}$/.test(code))
      throw Error("El código del proyecto debe tener 2–4 letras (ej.: ALN).");
    if (projects.some((p) => p.code === code))
      throw Error("Ese código ya lo usa otro proyecto.");
    if (projects.some((p) => p.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es")))
      throw Error("Ya existe un proyecto con ese nombre.");
    let n = (s.projectsCustom ?? []).length + 3;
    while (projects.some((p) => p.id === `p${n}`)) n++;
    const record: Project = {
      id: `p${n}`,
      name,
      location: r.location.trim(),
      image: "",
      total: 0,
      reserved: 0,
      budget: 0,
      cost: 0,
      delivery: r.delivery.trim(),
      progress: 0,
      description: r.description.trim(),
      terms: "",
      mix: "",
      commercial: "",
      code,
      status: "Activo",
      created: SNAPSHOT,
    };
    next.projectsCustom = [...(s.projectsCustom ?? []), record];
    entity = record.id;
    project = record.id;
    message = `Proyecto ${name} creado; agregue torres y unidades para comenzar`;
  } else if (action.type === "project-update") {
    const p = projects.find((x) => x.id === action.id);
    if (!p) throw Error("Proyecto no encontrado.");
    const name = action.patch.name.trim();
    if (name.length < 2) throw Error("Se requiere el nombre del proyecto.");
    if (projects.some((x) => x.id !== p.id && x.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es")))
      throw Error("Ya existe un proyecto con ese nombre.");
    next.projectEdits = {
      ...(s.projectEdits ?? {}),
      [p.id]: {
        ...(s.projectEdits?.[p.id] ?? {}),
        name,
        location: action.patch.location.trim(),
        delivery: action.patch.delivery.trim(),
        description: action.patch.description.trim(),
      },
    };
    entity = p.id;
    project = p.id;
    message = "Datos del proyecto actualizados";
  } else if (action.type === "project-status") {
    const p = projects.find((x) => x.id === action.id);
    if (!p) throw Error("Proyecto no encontrado.");
    if (p.status === action.status) throw Error("El proyecto ya está en ese estado.");
    next.projectEdits = {
      ...(s.projectEdits ?? {}),
      [p.id]: { ...(s.projectEdits?.[p.id] ?? {}), status: action.status },
    };
    entity = p.id;
    project = p.id;
    message =
      action.status === "Archivado"
        ? "Proyecto archivado; sus registros financieros se conservan"
        : action.status === "Activo"
          ? "Proyecto reactivado"
          : "Proyecto marcado como finalizado";
  } else if (action.type === "project-delete") {
    const p = projects.find((x) => x.id === action.id);
    if (!p) throw Error("Proyecto no encontrado.");
    if (BUILTIN_PROJECT_IDS.includes(p.id) || p.builtIn)
      throw Error("Un proyecto con registros no puede eliminarse; archívelo.");
    const hasRecords =
      customerList(s).some((c) => c.project === p.id) ||
      (s.drafts ?? []).some((d) => d.project === p.id) ||
      (s.cancelled ?? []).some((d) => d.project === p.id) ||
      s.barters.some((b) => b.project === p.id) ||
      requestList(s).some((r) => r.project === p.id) ||
      s.reminders.some((r) => r.project === p.id) ||
      s.reserved.some((k) => k.startsWith(p.id + "-"));
    if (hasRecords)
      throw Error("El proyecto tiene ventas, contratos o pagos registrados; no puede eliminarse, archívelo.");
    next.projectsCustom = (s.projectsCustom ?? []).filter((x) => x.id !== p.id);
    next.unitsCustom = (s.unitsCustom ?? []).filter((u) => u.project !== p.id);
    const edits = { ...(s.projectEdits ?? {}) };
    delete edits[p.id];
    next.projectEdits = edits;
    entity = p.id;
    project = "all";
    message = `Proyecto ${p.name} eliminado (no tenía registros)`;
  } else if (action.type === "block-create") {
    const p = projects.find((x) => x.id === action.project);
    if (!p) throw Error("Proyecto no encontrado.");
    if (p.status === "Archivado") throw Error("No se pueden agregar torres a un proyecto archivado.");
    const block = action.block.trim().toLocaleUpperCase("es");
    if (!/^[A-ZÑ0-9]{1,3}$/.test(block)) throw Error("El nombre de la torre debe tener 1–3 letras o números (ej.: T3).");
    if (units.some((u) => u.project === p.id && u.block === block))
      throw Error(`La torre ${block} ya existe en este proyecto.`);
    const ints = [action.floors, action.perFloor, action.startFloor];
    if (!ints.every(Number.isInteger) || action.floors < 1 || action.floors > 40 || action.perFloor < 1 || action.perFloor > 20 || action.startFloor < -3 || action.startFloor > 40)
      throw Error("Pisos: 1–40; unidades por piso: 1–20.");
    if (!action.unitType.trim() || !(action.gross > 0) || !(action.listPrice > 0))
      throw Error("Se requieren tipología, superficie y precio de lista.");
    const created = makeBlockUnits(p.id, units, {
      block,
      floors: action.floors,
      perFloor: action.perFloor,
      startFloor: action.startFloor,
      type: action.unitType.trim(),
      gross: Math.round(action.gross),
      listPrice: r2(action.listPrice),
      facade: action.facade.trim() || "—",
    });
    next.unitsCustom = [...(s.unitsCustom ?? []), ...created];
    entity = p.id;
    project = p.id;
    message = `Torre ${block} agregada: ${created.length} unidades`;
  } else if (action.type === "unit-update") {
    const u = unitById(action.id);
    if (!u) throw Error("Unidad no encontrada.");
    if (unitTaken(s, u.id))
      throw Error("Una unidad vendida, en firma o canjeada no puede editarse.");
    const pt = action.patch;
    if (!pt.type.trim() || !(pt.gross > 0) || !(pt.listPrice > 0))
      throw Error("Se requieren tipología, superficie y precio de lista.");
    next.unitEdits = {
      ...(s.unitEdits ?? {}),
      [u.id]: {
        type: pt.type.trim(),
        gross: Math.round(pt.gross),
        net: Math.round(pt.gross * 0.82),
        listPrice: r2(pt.listPrice),
        facade: pt.facade.trim() || u.facade,
      },
    };
    entity = u.id;
    project = u.project;
    message = `Unidad ${u.label} actualizada (el precio de lista solo afecta ventas nuevas)`;
  }
  const result: EnterpriseState = {
    ...next,
    audit: [
      {
        id: id(),
        entity,
        message,
        project,
        time: new Date().toLocaleTimeString("es-PY", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...s.audit,
    ].slice(0, 100),
  };
  // Sonraki saf hesaplar (ve testler) yeni durumun kataloğunu görsün
  syncCatalog(result);
  return result;
}

/* ------------------------------------------------------------------ */
/* Sözleşme kayıtları ve birleşik müşteri cari hesabı                  */
/* ------------------------------------------------------------------ */
const seedFirstDue = new Map<string, string>();
for (const i of installments)
  if (!seedFirstDue.has(i.customerId)) seedFirstDue.set(i.customerId, i.due);
const PROJECT_CODE: Record<string, string> = { lofty: "LCH", alion: "ALN", vtower: "VTL", business: "B1" };

export const contractNumber = (id: string) => {
  const [p, n] = id.split("-");
  return `CTR-${PROJECT_CODE[p] ?? projectCode(p)}-${String(n).padStart(3, "0")}`;
};

/** Sözleşme imza tarihi: yeni kayıtlarda kayıtlı tarih, örnek kayıtlarda ilk taksitten bir ay öncesi. */
export function contractSignedAt(s: EnterpriseState, c: Customer) {
  const meta = s.contractMeta?.[c.id];
  if (meta?.signedAt) return meta.signedAt;
  const first = seedFirstDue.get(c.id);
  if (first) return addMonths(first, -(c.paidMonths + 1));
  return c.depositDate ?? SNAPSHOT;
}

export type Account = {
  customer: Customer;
  rows: Installment[];
  collected: number;
  balance: number;
  overdue: number;
  overdueCount: number;
  oldestOverdue?: string;
  next?: Installment & { remaining: number };
  depositExpected: number;
  depositPaid: number;
  depositRemaining: number;
};

/** Tek müşteri için tahsilat, bakiye, gecikme ve sıradaki vade. Summary ile aynı kuralları kullanır. */
export function accountOf(
  s: EnterpriseState,
  c: Customer,
  all = installmentList(s),
): Account {
  const rows = all
    .filter((i) => i.customerId === c.id)
    .sort((a, b) => a.due.localeCompare(b.due));
  const ids = new Set(rows.map((r) => r.id));
  const receipts = activeReceipts(s)
    .filter((r) => ids.has(r.installmentId))
    .reduce((a, r) => a + r.amount, 0);
  const collected = r2(c.deposit + c.installment * c.paidMonths + receipts);
  let overdue = 0,
    overdueCount = 0,
    oldestOverdue: string | undefined,
    next: Account["next"];
  for (const i of rows) {
    const left = outstanding(s, i);
    if (!left) continue;
    if (i.due < SNAPSHOT) {
      overdue += left;
      overdueCount++;
      oldestOverdue ??= i.due;
    } else if (!next) next = { ...i, remaining: left };
  }
  const depositExpected = c.depositExpected ?? c.deposit;
  return {
    customer: c,
    rows,
    collected,
    balance: r2(c.price - collected),
    overdue: r2(overdue),
    overdueCount,
    oldestOverdue,
    next,
    depositExpected,
    depositPaid: c.deposit,
    depositRemaining: r2(Math.max(0, depositExpected - c.deposit)),
  };
}

export type ContractView = {
  id: string;
  number: string;
  name: string;
  project: string;
  unitId: string;
  unitLabel: string;
  type?: string;
  gross?: number;
  floor?: string;
  facade?: string;
  listPrice?: number;
  price: number;
  discount: number;
  status: ContractStatus;
  signedAt?: string;
  planLabel: string;
  history: ContractEvent[];
  account?: Account;
};

const planLabelOf = (c: Customer) =>
  c.plan
    ? `${c.plan.deposits.length > 1 ? `Anticipo en ${c.plan.deposits.length} partes` : "Anticipo"} + ${c.plan.count} cuotas${c.plan.interim.length ? ` + ${c.plan.interim.length} pagos intermedios` : ""}`
    : `Anticipo + 36 cuotas`;

/** Tüm sözleşmeler: aktif, tamamlanan, taslak, imza bekleyen ve iptal edilenler. */
export function contractList(s: EnterpriseState): ContractView[] {
  const all = installmentList(s);
  const view = (
    c: Customer,
    status: ContractStatus,
    account?: Account,
  ): ContractView => {
    const u = unitById(c.id);
    const meta = s.contractMeta?.[c.id];
    // Liste fiyatı yalnızca satış anında kaydedildiyse gösterilir (örnek kayıtlarda fiyat sabit demo varsayımıdır).
    const listPrice = c.listPrice;
    return {
      id: c.id,
      number: contractNumber(c.id),
      name: c.name,
      project: c.project,
      unitId: c.id,
      unitLabel: c.unit,
      type: u?.type,
      gross: u?.gross,
      floor: u?.floorLabel,
      facade: u?.facade,
      listPrice,
      price: c.price,
      discount: listPrice ? r2(listPrice - c.price) : 0,
      status,
      signedAt:
        status === "Activo" || status === "Finalizado"
          ? contractSignedAt(s, c)
          : undefined,
      planLabel: planLabelOf(c),
      history: meta?.history ?? [
        {
          date: contractSignedAt(s, c),
          status: "Activo",
          note: "Contrato de ejemplo (datos iniciales de la demo)",
        },
      ],
      account,
    };
  };
  const active = customerList(s).map((c) => {
    const acc = accountOf(s, c, all);
    return view(c, acc.balance <= 0 ? "Finalizado" : "Activo", acc);
  });
  const drafts = (s.drafts ?? []).map((d) =>
    view(d, s.contractMeta[d.id]?.status ?? "Borrador"),
  );
  const cancelled = (s.cancelled ?? [])
    .filter(
      (d) =>
        !customerList(s).some((c) => c.id === d.id) &&
        !(s.drafts ?? []).some((x) => x.id === d.id),
    )
    .map((d) => view(d, "Anulado"));
  return [...drafts, ...active, ...cancelled];
}

export type LedgerEntry = {
  /** Düzeltilebilir kaynak kayıt (makbuz veya peşinat tahsilatı) ve iptal durumu. */
  sourceId?: string;
  reversed?: boolean;
  date: string;
  kind: "Contrato" | "Anticipo" | "Cuota" | "Pago intermedio" | "Cobro" | "Anulado";
  label: string;
  ref: string;
  debit: number;
  credit: number;
  balance: number;
};

/** Birleşik cari hesap ekstresi: sözleşme borcu, peşinat ve taksit tahsilatları tek defterde. */
export function customerLedger(
  s: EnterpriseState,
  customerId: string,
): LedgerEntry[] {
  const c = customerList(s).find((c) => c.id === customerId);
  if (!c) return [];
  const signed = contractSignedAt(s, c);
  const all = installmentList(s).filter((i) => i.customerId === c.id);
  const byId = new Map(all.map((i) => [i.id, i]));
  const raw: Omit<LedgerEntry, "balance">[] = [
    {
      date: signed,
      kind: "Contrato",
      label: `Precio del contrato ${contractNumber(c.id)}`,
      ref: contractNumber(c.id),
      debit: c.price,
      credit: 0,
    },
  ];
  const depositLater = s.depositPayments.filter((d) => d.customerId === c.id);
  const atSigning = r2(
    c.deposit -
      depositLater.filter((d) => !d.reversal).reduce((a, d) => a + d.amount, 0),
  );
  if (atSigning > 0)
    raw.push({
      date: c.depositDate ?? signed,
      kind: "Anticipo",
      label: "Cobro de anticipo (en la firma)",
      ref: "ANT-0",
      debit: 0,
      credit: atSigning,
    });
  depositLater.forEach((d, n) => {
    raw.push({
      date: d.date,
      kind: "Anticipo",
      label: "Cobro de anticipo",
      ref: `ANT-${n + 1}`,
      debit: 0,
      credit: d.amount,
      sourceId: d.id,
      reversed: !!d.reversal,
    });
    if (d.reversal)
      raw.push({
        date: d.reversal.date,
        kind: "Anulado",
        label: `ANT-${n + 1} anulación de anticipo · ${d.reversal.reason}`,
        ref: `ANT-${n + 1}-ANU`,
        debit: 0,
        credit: -d.amount,
      });
  });
  for (let k = 1; k <= c.paidMonths; k++)
    raw.push({
      date: addMonths(signed, k),
      kind: "Cuota",
      label: `Cobro de cuota ${k}`,
      ref: `PREV-${k}`,
      debit: 0,
      credit: c.installment,
    });
  for (const r of s.receipts) {
    const i = byId.get(r.installmentId);
    if (!i) continue;
    raw.push({
      date: r.date,
      kind: i.kind === "Pago intermedio" ? "Pago intermedio" : "Cobro",
      label: `${i.label ?? `Cuota ${i.id.split("-").pop()}`} · ${r.method}`,
      ref: r.id,
      debit: 0,
      credit: r.amount,
      sourceId: r.id,
      reversed: !!r.reversal,
    });
    // İptal edilen tahsilat silinmez: iptal tarihinde ters kayıt olarak görünür.
    if (r.reversal)
      raw.push({
        date: r.reversal.date,
        kind: "Anulado",
        label: `Anulación del cobro ${r.id} · ${r.reversal.reason}`,
        ref: `${r.id}-ANU`,
        debit: 0,
        credit: -r.amount,
      });
  }
  raw.sort((a, b) => a.date.localeCompare(b.date) || b.debit - a.debit);
  let bal = 0;
  return raw.map((e) => {
    bal = r2(bal + e.debit - e.credit);
    return { ...e, balance: bal };
  });
}

/** Kademeli peşinat dağılımı (plan varsa parçalar, yoksa tek satır). */
export function depositSchedule(c: Customer, fallbackDate?: string) {
  const parts = c.plan?.deposits ?? [
    {
      amount: c.depositExpected ?? c.deposit,
      due: c.depositDue ?? c.depositDate ?? fallbackDate ?? SNAPSHOT,
    },
  ];
  return depositStatus(parts, c.deposit);
}
export type { PlanSpec };

/* ------------------------------------------------------------------ */
/* Ödeme takibi: peşinat + taksit + ara ödeme satırları tek listede   */
/* ------------------------------------------------------------------ */
export const PAYMENT_STATUSES = [
  "Vencida",
  "Próxima",
  "Pago parcial",
  "Futura",
  "Pagada",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
/** "Próxima" penceresi: senaryo tarihinden itibaren 30 gün. */
export const UPCOMING_DAYS = 30;
const dayDiff = (iso: string) =>
  Math.round(
    (Date.parse(iso + "T12:00:00Z") - Date.parse(SNAPSHOT + "T12:00:00Z")) /
      86400000,
  );

/**
 * Durum kuralı (öncelik sırasıyla):
 * kalan 0 → Ödendi · vadesi geçmiş ve kalan > 0 → Gecikti (kısmi ödeme olsa da) ·
 * kısmen ödenmiş → Kısmen ödendi · 30 gün içinde → Yaklaşıyor · diğerleri → Gelecek dönem.
 */
export function paymentStatus(
  amount: number,
  remaining: number,
  due: string,
): PaymentStatus {
  if (remaining <= 0) return "Pagada";
  if (due < SNAPSHOT) return "Vencida";
  if (remaining < amount) return "Pago parcial";
  if (dayDiff(due) <= UPCOMING_DAYS) return "Próxima";
  return "Futura";
}

export type PaymentRow = {
  id: string;
  /** Taksit satırı için installment id; peşinat için `deposit:<müşteri>:<sıra>` */
  installmentId?: string;
  customerId: string;
  project: string;
  kind: "Anticipo" | "Cuota" | "Pago intermedio";
  label: string;
  due: string;
  amount: number;
  paid: number;
  remaining: number;
  status: PaymentStatus;
  days: number;
};

/** Aktif sözleşmelerin tüm açık ve kapalı ödeme satırları (örnek müşterilerin geçmiş peşinatları hariç). */
export function paymentRows(s: EnterpriseState): PaymentRow[] {
  const rows: PaymentRow[] = installmentList(s).map((i) => {
    const remaining = outstanding(s, i);
    return {
      id: i.id,
      installmentId: i.id,
      customerId: i.customerId,
      project: i.project,
      kind: i.kind === "Pago intermedio" ? "Pago intermedio" : "Cuota",
      label: i.label ?? `Cuota ${i.id.split("-").pop()}`,
      due: i.due,
      amount: i.amount,
      paid: r2(i.amount - remaining),
      remaining,
      status: paymentStatus(i.amount, remaining, i.due),
      days: dayDiff(i.due),
    };
  });
  for (const c of s.contracts) {
    const parts = depositSchedule(c, contractSignedAt(s, c));
    parts.forEach((p, n) =>
      rows.push({
        id: `deposit:${c.id}:${n}`,
        customerId: c.id,
        project: c.project,
        kind: "Anticipo",
        label: parts.length > 1 ? `Anticipo ${n + 1}` : "Anticipo",
        due: p.due,
        amount: p.amount,
        paid: p.paid,
        remaining: p.remaining,
        status: paymentStatus(p.amount, p.remaining, p.due),
        days: dayDiff(p.due),
      }),
    );
  }
  return rows.sort(
    (a, b) =>
      a.due.localeCompare(b.due) || a.customerId.localeCompare(b.customerId),
  );
}

export type AgendaItem = {
  id: string;
  project: string;
  date: string;
  days: number;
  kind: "Anticipo" | "Cuota" | "Contrato" | "Certificado de obra" | "Canje" | "Recordatorio";
  title: string;
  detail: string;
  amount?: number;
  /** Ayrıntı ekranı: müşteri, taslak sözleşme, hakediş veya barter kaydı */
  ref: {
    type: "customer" | "draft" | "request" | "barter" | "reminder";
    id: string;
    focus?: string;
  };
};

/** Önümüzdeki günlerin önemli tarihleri: ödemeler (günlük toplam), imza, hakediş, barter bitişi, hatırlatma. */
export function agenda(
  s: EnterpriseState,
  project = "all",
  horizon = 30,
): AgendaItem[] {
  const inScope = (p: string) => project === "all" || p === project;
  const names = new Map(customerList(s).map((c) => [c.id, c]));
  const items: AgendaItem[] = [];
  for (const r of paymentRows(s)) {
    if (
      !inScope(r.project) ||
      r.remaining <= 0 ||
      r.days < 0 ||
      r.days > horizon
    )
      continue;
    const c = names.get(r.customerId);
    items.push({
      id: `pay-${r.id}`,
      project: r.project,
      date: r.due,
      days: r.days,
      kind: r.kind === "Anticipo" ? "Anticipo" : "Cuota",
      title: `${c?.name ?? ""} · ${unitShort(r.customerId)}`,
      detail: r.label,
      amount: r.remaining,
      ref: {
        type: "customer",
        id: r.customerId,
        focus: r.installmentId ?? "deposit",
      },
    });
  }
  for (const d of s.drafts ?? []) {
    if (!inScope(d.project)) continue;
    const due = d.plan?.deposits[0]?.due ?? d.depositDue ?? SNAPSHOT;
    items.push({
      id: `draft-${d.id}`,
      project: d.project,
      date: due < SNAPSHOT ? SNAPSHOT : due,
      days: Math.max(0, dayDiff(due)),
      kind: "Contrato",
      title: `${contractNumber(d.id)} · ${d.name}`,
      detail: `${s.contractMeta[d.id]?.status ?? "Borrador"} · firma y primer anticipo`,
      amount: d.depositExpected,
      ref: { type: "draft", id: d.id },
    });
  }
  for (const r of requestList(s)) {
    const st = requestStatus(s, r);
    if (!inScope(r.project) || !["Pendiente de aprobación", "Aprobado"].includes(st))
      continue;
    const days = dayDiff(r.due);
    if (days > horizon) continue;
    items.push({
      id: `req-${r.id}`,
      project: r.project,
      date: r.due,
      days,
      kind: "Certificado de obra",
      title: `${r.id} · ${r.company}`,
      detail: `${r.name} · ${st}`,
      amount: netPayable(s, r),
      ref: { type: "request", id: r.id },
    });
  }
  for (const b of s.barters) {
    const days = dayDiff(b.end);
    if (
      !inScope(b.project) ||
      b.progress >= 100 ||
      days < 0 ||
      days > Math.max(horizon, 90)
    )
      continue;
    items.push({
      id: `brt-${b.id}`,
      project: b.project,
      date: b.end,
      days,
      kind: "Canje",
      title: `${b.company} · ${unitById(b.unitId)?.label ?? b.unitId}`,
      detail: `Fin del trabajo · ${b.progress} % completado`,
      ref: { type: "barter", id: b.id },
    });
  }
  for (const r of s.reminders) {
    const days = dayDiff(r.due);
    if (!inScope(r.project) || r.done || days > horizon) continue;
    items.push({
      id: `rem-${r.id}`,
      project: r.project,
      date: r.due,
      days,
      kind: "Recordatorio",
      title: r.title,
      detail: "Recordatorio",
      ref: { type: "reminder", id: r.id },
    });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------ */
/* Tahsilat kapsamı ve sistem belgeleri                               */
/* ------------------------------------------------------------------ */
/**
 * Toplam tahsilatın iki kaynağı:
 * - prior: sisteme geçişten önce tahsil edilmiş peşinat ve ilk taksitler (örnek müşteriler; plan satırı yoktur)
 * - inPlan: ödeme planı satırları üzerinden tahsil edilenler (peşinat parçaları + taksit/ara ödeme tahsilatları)
 * total = prior + inPlan = summary().collected
 */
export function collectionBreakdown(s: EnterpriseState, project = "all") {
  const inScope = (p: string) => project === "all" || p === project;
  const contractIds = new Set(s.contracts.map((c) => c.id));
  const prior = r2(
    customerList(s)
      .filter((c) => inScope(c.project) && !contractIds.has(c.id))
      .reduce((a, c) => a + c.deposit + c.installment * c.paidMonths, 0),
  );
  const inPlan = r2(
    paymentRows(s)
      .filter((r) => inScope(r.project))
      .reduce((a, r) => a + r.paid, 0),
  );
  return { prior, inPlan, total: r2(prior + inPlan) };
}

export type SystemDocument = {
  id: string;
  name: string;
  kind: string;
  date: string;
  href: string;
  detail: string;
};

/** Kayıttan otomatik üretilen, görüntülenebilir/yazdırılabilir belgeler (sunucuya kaydedilmez). */
export function systemDocuments(
  s: EnterpriseState,
  recordId: string,
): SystemDocument[] {
  const c = customerList(s).find((c) => c.id === recordId);
  if (c) {
    const no = contractNumber(c.id);
    const signed = contractSignedAt(s, c);
    const ids = new Set(
      installmentList(s)
        .filter((i) => i.customerId === c.id)
        .map((i) => i.id),
    );
    return [
      {
        id: `${no}-szl`,
        name: `${no} · Resumen del contrato de compraventa`,
        kind: "Contrato de compraventa",
        date: signed,
        href: `/belge/?tur=sozlesme&id=${c.id}`,
        detail: `${c.name} · ${c.unit}`,
      },
      {
        id: `${no}-plan`,
        name: `${no} · Plan de pagos`,
        kind: "Plan de pagos",
        date: signed,
        href: `/belge/?tur=plan&id=${c.id}`,
        detail: "Anticipo, cuotas y pagos intermedios",
      },
      {
        id: `${no}-ekstre`,
        name: `${no} · Estado de cuenta`,
        kind: "Estado de cuenta",
        date: SNAPSHOT,
        href: `/belge/?tur=ekstre&id=${c.id}`,
        detail: "Cargos, cobros y saldo",
      },
      ...s.receipts
        .filter((r) => ids.has(r.installmentId))
        .map((r) => ({
          id: r.id,
          name: `${r.id} · Recibo de cobro`,
          kind: "Recibo",
          date: r.date,
          href: `/belge/?tur=makbuz&id=${r.id}`,
          detail: `US$ ${r.amount.toLocaleString("es-PY")} · ${r.method}${r.reversal ? " · ANULADO" : ""}`,
        })),
    ];
  }
  const d = (s.drafts ?? []).find((d) => d.id === recordId);
  if (d)
    return [
      {
        id: `${contractNumber(d.id)}-szl`,
        name: `${contractNumber(d.id)} · Borrador de contrato`,
        kind: "Contrato de compraventa",
        date: s.contractMeta[d.id]?.created ?? SNAPSHOT,
        href: `/belge/?tur=sozlesme&id=${d.id}`,
        detail: `${d.name} · ${s.contractMeta[d.id]?.status ?? "Borrador"}`,
      },
    ];
  const b = s.barters.find((b) => b.id === recordId);
  if (b)
    return [
      {
        id: `${b.id}-szl`,
        name: `${b.id} · Resumen del canje`,
        kind: "Contrato de canje",
        date: b.start,
        href: `/belge/?tur=barter&id=${b.id}`,
        detail: `${b.company} · ${unitById(b.unitId)?.label ?? b.unitId}`,
      },
    ];
  return [];
}

export type HistoryEvent = {
  date: string;
  kind: "Contrato" | "Cobro" | "Anticipo" | "Cambio";
  title: string;
  detail: string;
  amount?: number;
};

/**
 * Müşteri / daire dosyasının işlem geçmişi: sözleşme olayları (taslak, imza, devir),
 * peşinat ve taksit tahsilatları (cari ekstreden) ve vade / bilgi değişiklikleri. En yeni üstte.
 */
export function fileHistory(
  s: EnterpriseState,
  customerId: string,
): HistoryEvent[] {
  const c =
    customerList(s).find((c) => c.id === customerId) ??
    (s.drafts ?? []).find((d) => d.id === customerId);
  if (!c) return [];
  const meta = s.contractMeta?.[c.id];
  const events: HistoryEvent[] = [];
  const contractEvents = meta?.history ?? [
    {
      date: contractSignedAt(s, c),
      status: "Activo",
      note: "Contrato firmado (registro de ejemplo)",
    },
  ];
  for (const h of contractEvents)
    events.push({
      date: h.date,
      kind: "Contrato",
      title:
        h.status === "Activo"
          ? "Contrato firmado"
          : h.status === "Cesión"
            ? "Contrato cedido"
            : `Contrato · ${h.status}`,
      detail: h.note,
    });
  for (const e of customerLedger(s, c.id)) {
    if (!e.credit) continue;
    events.push({
      date: e.date,
      kind: e.kind === "Anticipo" ? "Anticipo" : "Cobro",
      title: e.kind === "Anticipo" ? "Anticipo cobrado" : "Cobro",
      detail: `${e.label} · ${e.ref}`,
      amount: e.credit,
    });
  }
  const ids = new Set(
    installmentList(s)
      .filter((i) => i.customerId === c.id)
      .map((i) => i.id),
  );
  for (const [id, due] of Object.entries(s.dueEdits))
    if (ids.has(id))
      events.push({
        date: SNAPSHOT,
        kind: "Cambio",
        title: "Vencimiento modificado",
        detail: `Cuota ${id.split("-").pop()}: nuevo vencimiento ${due}`,
      });
  if (
    s.customerEdits[c.id] &&
    !events.some((e) => e.title === "Contrato cedido")
  )
    events.push({
      date: SNAPSHOT,
      kind: "Cambio",
      title: "Datos del cliente actualizados",
      detail: s.customerEdits[c.id].name,
    });
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------------------------------------------ */
/* İş (taşeron) sözleşmeleri: mevcut iş paketleri ve hakedişlerden türetilir */
/* ------------------------------------------------------------------ */
export type WorkContract = {
  id: string;
  project: string;
  company: string;
  packages: ReturnType<typeof workList>;
  /** Sözleşme bedeli: iş paketlerinin kurgusal bedelleri toplamı. */
  value: number;
  requests: RequestRecord[];
  hakedisTotal: number;
  paid: number;
  offset: number;
  barterId?: string;
};
const firmKey = (s: string) => s.trim().toLocaleLowerCase("es");
export function workContracts(
  s: EnterpriseState,
  project = "all",
): WorkContract[] {
  const groups = new Map<string, WorkContract>();
  // Numara: proje içinde iş paketlerinin sırasına göre IS-CV-01, IS-CV-02 … (proje filtresinden bağımsız, kalıcı)
  const order = new Map<string, number>();
  for (const w of workList(s)) {
    const key = w.project + "|" + firmKey(w.company);
    if (!order.has(key)) order.set(key, [...order.keys()].filter((k) => k.startsWith(w.project + "|")).length + 1);
  }
  for (const w of workList(s)) {
    if (project !== "all" && w.project !== project) continue;
    const n = order.get(w.project + "|" + firmKey(w.company))!;
    const id = `IS-${projectCode(w.project)}-${String(n).padStart(2, "0")}`;
    if (!groups.has(id)) groups.set(id, { id, project: w.project, company: w.company, packages: [], value: 0, requests: [], hakedisTotal: 0, paid: 0, offset: 0 });
    groups.get(id)!.packages.push(w);
    groups.get(id)!.value += w.value;
  }
  for (const g of groups.values()) {
    g.requests = requestList(s).filter(
      (r) =>
        r.type === "Certificado de obra" &&
        r.project === g.project &&
        firmKey(r.company) === firmKey(g.company),
    );
    g.hakedisTotal = r2(g.requests.reduce((a, r) => a + r.amount, 0));
    g.paid = r2(
      g.requests
        .filter((r) => requestStatus(s, r) === "Pagada")
        .reduce((a, r) => a + netPayable(s, r), 0),
    );
    g.offset = r2(g.requests.reduce((a, r) => a + offsetFor(s, r.id), 0));
    g.barterId = s.barters.find(
      (b) =>
        b.project === g.project && firmKey(b.company) === firmKey(g.company),
    )?.id;
  }
  return [...groups.values()];
}

/** İş sözleşmesi belgesi (systemDocuments ile aynı biçim). */
export function workContractDocument(
  s: EnterpriseState,
  wc: WorkContract,
): SystemDocument {
  return {
    id: wc.id,
    name: `${wc.id} · Resumen del contrato de obra`,
    kind: "Contrato de obra",
    date: wc.requests.map((r) => r.due).sort()[0] ?? SNAPSHOT,
    href: `/belge/?tur=is&id=${encodeURIComponent(wc.id)}`,
    detail: `${wc.company} · ${wc.packages.map((p) => p.name).join(", ")}`,
  };
}
