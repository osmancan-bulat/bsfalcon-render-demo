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
} from "./demo-seed.ts";
/** Ay başı: bu tarihten önceki tahsilatlar demo açılış kasasına dahildir. */
export const MONTH_START = "2026-11-01";
export { projects, customers, installments, workItems, documents, SNAPSHOT };
export type ContractStatus =
  "Taslak" | "İmza bekliyor" | "Aktif" | "Tamamlandı" | "İptal";
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
/** Çakışmasız makbuz numarası: mevcut THS-#### numaralarının en büyüğünden devam eder. */
export function nextReceiptId(s: { receipts: { id: string }[] }) {
  const max = Math.max(
    s.receipts.length,
    ...s.receipts.map((r) => Number(/^THS-(\d{4})$/.exec(r.id)?.[1] ?? 0)),
  );
  return `THS-${String(max + 1).padStart(4, "0")}`;
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
      .slice(0, 3)
      .map((i, n) => ({
        id: `THS-00${n + 1}`,
        installmentId: i.id,
        amount: i.amount,
        date: "2026-11-10",
        method: "Banka havalesi",
        reference: `HVL-261110-00${n + 1}`,
      })),
    ...demoReceipts,
  ],
  // SAT-019: onaylı, malzeme teslim alındı, ödemesi vadeli (ödeme planında)
  approved: ["SAT-019"],
  rejected: [],
  paidOrders: ["HAK-026"],
  // HAK-026 vadesi 8 Kasım; ödeme aynı gün kaydedildi (işlem geçmişi AUD-D04)
  paidDates: { "HAK-026": "2026-11-08" },
  delivered: ["SAT-019"],
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
  | { type: "contract"; record: Customer; status?: "Taslak" | "İmza bekliyor" }
  | { type: "contract-status"; id: string; status: "İmza bekliyor" }
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
  projects.find((p) => p.id === id)?.name ?? "Tüm projeler";
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
    ? "Ödendi"
    : s.rejected.includes(r.id)
      ? "İade edildi"
      : s.approved.includes(r.id) || r.status === "Onaylandı"
        ? netPayable(s, r) <= 0
          ? "Mahsup edildi"
          : "Onaylandı"
        : "Onay bekliyor";
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
export const unitTaken = (s: EnterpriseState, id: string) =>
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
const OPENING_CASH: Record<string, number> = { verdora: 12500000, sanetime: 4800000, bulvarpark: 2600000 };
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
        .filter((r) => requestStatus(s, r) === "Onaylandı")
        .reduce((a, r) => a + netPayable(s, r), 0),
    ),
    paid = r2(
      requests
        .filter((r) => requestStatus(s, r) === "Ödendi")
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
    pending: requests.filter((r) => requestStatus(s, r) === "Onay bekliyor")
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
  if (action.type === "barter") {
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
      throw Error("Konut satılmış, rezerve, barter kapsamında veya geçersiz.");
    if (p.status !== "Aktif")
      throw Error("Yalnızca aktif projede barter anlaşması yapılabilir.");
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
      throw Error("Firma, iş, bedel ve tarih aralığını kontrol edin.");
    next.barters = [b, ...s.barters]; // en yeni anlaşma başta
    entity = b.id;
    project = b.project;
    message = "Barter kaydedildi; konut ayrıldı, nakit hareketi oluşturulmadı";
  } else if (action.type === "barter-progress") {
    const b = s.barters.find((b) => b.id === action.id);
    if (
      !b ||
      !Number.isFinite(action.progress) ||
      action.progress < 0 ||
      action.progress > 100 ||
      !["Bekliyor", "Devir sürecinde", "Devredildi"].includes(action.transfer)
    )
      throw Error("Geçerli ilerleme ve devir durumu gerekli.");
    next.barters = s.barters.map((b) =>
      b.id === action.id
        ? { ...b, progress: action.progress, transfer: action.transfer }
        : b,
    );
    entity = b.id;
    project = b.project;
    message = "Barter iş ve devir durumu güncellendi";
  } else if (action.type === "barter-offset") {
    const b = s.barters.find((b) => b.id === action.barterId),
      r = requestList(s).find((r) => r.id === action.requestId);
    if (!b || !r) throw Error("Barter veya hakediş bulunamadı.");
    if (r.type !== "Hakediş" || r.project !== b.project)
      throw Error("Mahsup yalnızca aynı projedeki hakedişe yapılabilir.");
    if (
      r.company.trim().toLocaleLowerCase("tr") !==
      b.company.trim().toLocaleLowerCase("tr")
    )
      throw Error("Hakediş firması barter firmasıyla aynı olmalı.");
    if (requestStatus(s, r) !== "Onaylandı")
      throw Error("Mahsup için hakediş onaylı ve ödenmemiş olmalı.");
    const amount = r2(action.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      throw Error("Pozitif mahsup tutarı gerekli.");
    if (amount > r2(b.amount - barterOffset(s, b.id)))
      throw Error("Tutar barterın kalan mahsup bakiyesini aşamaz.");
    if (amount > netPayable(s, r))
      throw Error("Tutar hakedişin kalan ödemesini aşamaz.");
    next.offsets = [
      ...(s.offsets ?? []),
      { id: id(), barterId: b.id, requestId: r.id, amount, date: SNAPSHOT },
    ];
    entity = r.id;
    project = r.project;
    message = `${amount.toLocaleString("tr-TR")} TL barter karşılığı mahsup edildi; kasa değişmedi`;
  } else if (action.type === "reminder") {
    const r = action.record;
    if (
      !r.title.trim() ||
      !isIsoDate(r.due) ||
      s.reminders.some((v) => v.id === r.id)
    )
      throw Error("Hatırlatma başlığı ve tarih gerekli.");
    next.reminders = [r, ...s.reminders]; // en yeni hatırlatma başta
    entity = r.id;
    project = r.project;
    message = "Uygulama içi hatırlatma oluşturuldu";
  } else if (action.type === "reminder-done") {
    const r = s.reminders.find((r) => r.id === action.id);
    if (!r) throw Error("Hatırlatma bulunamadı.");
    next.reminders = s.reminders.map((r) =>
      r.id === action.id ? { ...r, done: !r.done } : r,
    );
    entity = r.id;
    project = r.project;
    message = "Hatırlatma durumu güncellendi";
  } else if (action.type === "deposit-receipt") {
    const c = s.contracts.find((c) => c.id === action.id);
    if (
      !c ||
      !Number.isFinite(action.amount) ||
      action.amount <= 0 ||
      toKurus(action.amount) >
        toKurus((c.depositExpected ?? c.deposit) - c.deposit)
    )
      throw Error("Tutar kalan peşinatı aşamaz.");
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
    message = "Peşinat tahsil edildi; kasa ve müşteri bakiyesi güncellendi";
  } else if (action.type === "contract-status") {
    const d = (s.drafts ?? []).find((d) => d.id === action.id);
    const meta = s.contractMeta[action.id];
    if (!d || !meta || meta.status !== "Taslak")
      throw Error("Yalnızca taslak sözleşme imzaya gönderilebilir.");
    next.contractMeta = {
      ...s.contractMeta,
      [d.id]: {
        ...meta,
        status: "İmza bekliyor",
        history: [
          ...meta.history,
          {
            date: SNAPSHOT,
            status: "İmza bekliyor",
            note: "Sözleşme imzaya gönderildi",
          },
        ],
      },
    };
    entity = d.id;
    project = d.project;
    message = "Sözleşme imzaya gönderildi";
  } else if (action.type === "contract-sign") {
    const d = (s.drafts ?? []).find((d) => d.id === action.id);
    const meta = s.contractMeta[action.id];
    if (!d || !meta) throw Error("İmzalanacak taslak sözleşme bulunamadı.");
    const expected = d.depositExpected ?? 0;
    if (
      !Number.isFinite(action.depositPaid) ||
      action.depositPaid < 0 ||
      toKurus(action.depositPaid) > toKurus(expected)
    )
      throw Error("İmzada alınan peşinat anlaşmalı peşinatı aşamaz.");
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
        status: "Aktif",
        signedAt: SNAPSHOT,
        history: [
          ...meta.history,
          {
            date: SNAPSHOT,
            status: "Aktif",
            note: `İmzalandı · imzada peşinat ${paid.toLocaleString("tr-TR")} TL`,
          },
        ],
      },
    };
    entity = d.id;
    project = d.project;
    message = "Sözleşme imzalandı; ödeme planı ve alacaklar oluşturuldu";
  } else if (action.type === "contract-cancel") {
    const meta = s.contractMeta[action.id];
    const d = (s.drafts ?? []).find((d) => d.id === action.id);
    if (!d || !meta)
      throw Error(
        "Aktif sözleşmenin feshi iade süreci gerektirir; demoda yalnızca taslak iptal edilir.",
      );
    if (!action.reason.trim()) throw Error("İptal gerekçesi gerekli.");
    next.drafts = s.drafts.filter((v) => v.id !== d.id);
    next.cancelled = [...(s.cancelled ?? []), d];
    next.contractMeta = {
      ...s.contractMeta,
      [d.id]: {
        ...meta,
        status: "İptal",
        history: [
          ...meta.history,
          { date: SNAPSHOT, status: "İptal", note: action.reason.trim() },
        ],
      },
    };
    entity = d.id;
    project = d.project;
    message = "Taslak sözleşme iptal edildi; konut stoka döndü";
  } else if (action.type === "contract-transfer") {
    const c = customerList(s).find((c) => c.id === action.id);
    if (!c) throw Error("Aktif sözleşme bulunamadı.");
    const name = action.name.trim();
    if (!name || name === c.name) throw Error("Devralan kişinin adı gerekli.");
    const prev = s.customerEdits[c.id] ?? {
      name: c.name,
      phone: "",
      email: "",
      owner: "",
      note: "",
    };
    next.customerEdits = { ...s.customerEdits, [c.id]: { ...prev, name } };
    const meta = s.contractMeta[c.id] ?? {
      status: "Aktif" as const,
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
            status: "Devir",
            note: `${c.name} → ${name}${action.note.trim() ? ` · ${action.note.trim()}` : ""}`,
          },
        ],
      },
    };
    entity = c.id;
    project = c.project;
    message = "Sözleşme devri kaydedildi; bakiye ve plan devralana geçti";
  } else if (action.type === "receipt") {
    const i = installmentList(s).find((i) => i.id === action.installmentId);
    if (!i) throw Error("Taksit bulunamadı.");
    if (
      !Number.isFinite(action.amount) ||
      toKurus(action.amount) <= 0 ||
      toKurus(action.amount) > toKurus(outstanding(s, i))
    )
      throw Error("Tutar kalan taksit bakiyesini aşamaz.");
    const ref = action.reference.trim();
    if (!ref) throw Error("Dekont / işlem açıklaması gerekli.");
    // Aynı dekont aynı taksite ikinci kez işlenemez (çift tıklama ve tekrar kayıt koruması).
    if (
      activeReceipts(s).some(
        (r) =>
          r.installmentId === i.id &&
          r.reference.toLocaleLowerCase("tr") === ref.toLocaleLowerCase("tr"),
      )
    )
      throw Error("Bu dekont bu ödeme için zaten kaydedildi.");
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
    message = `${action.amount.toLocaleString("tr-TR")} TL tahsilat kaydedildi`;
  } else if (
    ["approve", "reject", "pay-order", "deliver"].includes(action.type)
  ) {
    if (!req) throw Error("İşlem bulunamadı.");
    const status = requestStatus(s, req);
    entity = req.id;
    project = req.project;
    if (action.type === "approve") {
      if (status !== "Onay bekliyor")
        throw Error("Bu işlem zaten değerlendirildi.");
      next.approved = [...s.approved, req.id];
      message = "Onaylandı; ödeme planına eklendi";
    }
    if (action.type === "reject") {
      if (status !== "Onay bekliyor")
        throw Error("Yalnızca bekleyen işlem iade edilebilir.");
      next.rejected = [...s.rejected, req.id];
      message = "Revizyon için iade edildi";
    }
    if (action.type === "pay-order") {
      if (status !== "Onaylandı")
        throw Error("Ödeme için önce yönetici onayı gerekir.");
      if (netPayable(s, req) > summary(s, req.project).cash)
        throw Error("Projenin demo kasa bakiyesi yetersiz.");
      next.paidOrders = [...s.paidOrders, req.id];
      next.paidDates = { ...(s.paidDates ?? {}), [req.id]: SNAPSHOT };
      message = "Ödeme kaydedildi; kasa ve ödeme planı güncellendi";
    }
    if (action.type === "deliver") {
      if (
        req.type !== "Satın alma" ||
        !["Onaylandı", "Ödendi"].includes(status)
      )
        throw Error("Teslim için onaylı satın alma gerekir.");
      if (s.delivered.includes(req.id))
        throw Error("Teslim zaten kaydedilmiş.");
      next.delivered = [...s.delivered, req.id];
      message = "Malzeme teslim alındı; saha kaydı güncellendi";
    }
  } else if (action.type === "request") {
    const r = action.record;
    if (
      !r.name.trim() ||
      !r.company.trim() ||
      !Number.isFinite(r.amount) ||
      r.amount <= 0
    )
      throw Error("Firma, açıklama ve pozitif tutar gerekli.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.due))
      throw Error("Geçerli tarih gerekli.");
    if (requestList(s).some((v) => v.id === r.id))
      throw Error("Kayıt zaten mevcut.");
    next.requests = [...s.requests, r];
    entity = r.id;
    project = r.project;
    message = "Yeni talep oluşturuldu";
  } else if (action.type === "edit-request") {
    if (
      !req ||
      !["Onay bekliyor", "İade edildi"].includes(requestStatus(s, req))
    )
      throw Error("Onaylı işlem düzenlenemez.");
    const r = { ...req, ...action.patch };
    if (
      !r.name.trim() ||
      !r.company.trim() ||
      !Number.isFinite(r.amount) ||
      r.amount <= 0
    )
      throw Error("Geçerli firma, açıklama ve tutar gerekli.");
    next.requestEdits = { ...s.requestEdits, [req.id]: r };
    next.rejected = s.rejected.filter((i) => i !== req.id);
    entity = req.id;
    project = req.project;
    message = "Talep güncellendi ve onaya sunuldu";
  } else if (action.type === "customer") {
    const c = customerList(s).find((c) => c.id === action.id);
    if (!c || !action.patch.name.trim())
      throw Error("Geçerli müşteri adı gerekli.");
    next.customerEdits = { ...s.customerEdits, [c.id]: action.patch };
    entity = c.id;
    project = c.project;
    message = "Müşteri bilgileri güncellendi";
  } else if (action.type === "reschedule") {
    const i = installmentList(s).find((i) => i.id === action.id);
    if (!i || !outstanding(s, i))
      throw Error("Ödenmiş taksit yeniden planlanamaz.");
    if (action.date < SNAPSHOT)
      throw Error("Yeni vade senaryo tarihinden önce olamaz.");
    next.dueEdits = { ...s.dueEdits, [i.id]: action.date };
    entity = i.id;
    project = i.project;
    message = `Taksit vadesi ${action.date} olarak güncellendi`;
  } else if (action.type === "work") {
    const w = workList(s).find((w) => w.id === action.id);
    if (
      !w ||
      !Number.isFinite(action.patch.progress) ||
      action.patch.progress < 0 ||
      action.patch.progress > 100
    )
      throw Error("İlerleme 0–100 arasında olmalı.");
    next.workEdits = { ...s.workEdits, [w.id]: action.patch };
    entity = w.id;
    project = w.project;
    message = `İmalat ilerlemesi %${action.patch.progress} olarak güncellendi`;
  } else if (action.type === "document") {
    const d = documents.find((d) => d.id === action.id);
    if (!d || !action.patch.owner.trim()) throw Error("Sorumlu gerekli.");
    next.documentEdits = { ...s.documentEdits, [d.id]: action.patch };
    entity = d.id;
    project = d.project;
    message = `Evrak durumu: ${action.patch.status}`;
  } else if (action.type === "note") {
    if (!action.text.trim()) throw Error("Not boş olamaz.");
    entity = id();
    project = action.project;
    next.notes = [
      ...s.notes,
      { id: entity, text: action.text.trim(), project },
    ];
    message = "Yönetici notu eklendi";
  } else if (action.type === "delete-note") {
    next.notes = s.notes.filter((n) => n.id !== action.id);
    entity = action.id;
    message = "Yönetici notu kaldırıldı";
  } else if (action.type === "reserve" || action.type === "release") {
    const projectId = action.id.split("-")[0];
    const p = projects.find((p) => p.id === projectId);
    const u = unitById(action.id);
    if (!p || !u || u.project !== p.id || unitTaken(s, action.id))
      throw Error("Satılmış veya geçersiz konut için işlem yapılamaz.");
    if (p.status === "Arşiv")
      throw Error("Arşivdeki projede rezervasyon yapılamaz; önce projeyi aktifleştirin.");
    project = p.id;
    entity = action.id;
    if (action.type === "reserve") {
      if (reservedUnits(s, p.id).includes(action.id))
        throw Error("Bu konut zaten rezerve.");
      next.reserved = [...new Set([...s.reserved, action.id])];
      next.released = s.released.filter((k) => k !== action.id);
      message = "Konut rezerve edildi";
    } else {
      next.reserved = s.reserved.filter((k) => k !== action.id);
      next.released = [...new Set([...s.released, action.id])];
      message = "Rezervasyon kaldırıldı";
    }
  } else if (action.type === "contract") {
    const c = action.record,
      p = projects.find((p) => p.id === c.project);
    const u = unitById(c.id);
    if (!p || !u || u.project !== p.id || unitTaken(s, c.id))
      throw Error("Konut satılmış veya geçersiz.");
    if (p.status !== "Aktif")
      throw Error("Yalnızca aktif projede yeni satış yapılabilir.");
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
      throw Error("Sözleşme ve taksit tutarları tutarsız.");
    let record: Customer = c;
    if (c.plan) {
      // Esnek plan: peşinat parçaları + ara ödemeler + taksitler kuruşu kuruşuna bedele eşit olmalı.
      const sch = buildSchedule(c.price, c.plan);
      if (toKurus(sch.depositTotal) !== toKurus(expected))
        throw Error(
          "Peşinat parçalarının toplamı anlaşmalı peşinata eşit olmalı.",
        );
      record = {
        ...c,
        depositExpected: sch.depositTotal,
        installment: sch.installment,
        depositDue: c.plan.deposits[0]?.due,
      };
    } else if (Math.abs(expected + 36 * c.installment - c.price) > 0.01)
      throw Error("Sözleşme ve taksit tutarları tutarsız.");
    const draft =
      action.status === "Taslak" || action.status === "İmza bekliyor";
    const status: ContractStatus = draft ? action.status! : "Aktif";
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
              ? "Sözleşme taslağı oluşturuldu"
              : "Sözleşme imzalandı ve aktifleştirildi",
          },
        ],
      },
    };
    entity = c.id;
    project = c.project;
    const n2 = c.plan ? c.plan.count + c.plan.interim.length : 36;
    message = draft
      ? "Sözleşme taslağı kaydedildi; konut bloke edildi"
      : `Konut satışı kaydedildi; ${n2} ödeme satırı oluşturuldu`;
  } else if (action.type === "work-create") {
    const r = action.record;
    const p = projects.find((x) => x.id === r.project);
    if (!p) throw Error("Proje bulunamadı.");
    if (p.status === "Arşiv") throw Error("Arşivdeki projeye iş paketi eklenemez.");
    const name = r.name.trim(),
      company = r.company.trim();
    if (name.length < 3 || company.length < 2)
      throw Error("İş paketi adı ve taşeron firma gerekli.");
    if (!(r.value > 0)) throw Error("Sözleşme bedeli pozitif olmalı.");
    if (!Number.isInteger(r.weight) || r.weight < 1 || r.weight > 100)
      throw Error("Ağırlık 1–100 arasında tam sayı olmalı.");
    const used = workList(s)
      .filter((w) => w.project === p.id)
      .reduce((a, w) => a + w.weight, 0);
    if (used + r.weight > 100)
      throw Error(`Projedeki iş paketlerinin ağırlık toplamı %100'ü aşamaz (kalan %${100 - used}).`);
    if (workList(s).some((w) => w.project === p.id && w.name.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr")))
      throw Error("Bu projede aynı adlı iş paketi var.");
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
      status: "Planlandı",
      material: "—",
    };
    next.workCustom = [...(s.workCustom ?? []), rec];
    entity = rec.id;
    project = p.id;
    message = `İş paketi eklendi: ${name} · ${company}`;
  } else if (action.type === "deposit-reverse") {
    const d = s.depositPayments.find((x) => x.id === action.id);
    if (!d) throw Error("Peşinat tahsilatı bulunamadı.");
    if (d.reversal) throw Error("Bu peşinat tahsilatı zaten iptal edilmiş.");
    if (!action.reason.trim()) throw Error("İptal gerekçesi gerekli.");
    const c = s.contracts.find((x) => x.id === d.customerId);
    if (!c) throw Error("Sözleşme bulunamadı.");
    if (toKurus(c.deposit) < toKurus(d.amount))
      throw Error("Peşinat bakiyesi bu iptal için yetersiz.");
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
    message = `Peşinat tahsilatı iptal edildi (${d.amount.toLocaleString("tr-TR")} TL); kalan peşinata geri eklendi`;
  } else if (action.type === "receipt-reverse") {
    const r = s.receipts.find((x) => x.id === action.id);
    if (!r) throw Error("Tahsilat bulunamadı.");
    if (r.reversal) throw Error("Bu tahsilat zaten iptal edilmiş.");
    if (!action.reason.trim()) throw Error("İptal gerekçesi gerekli.");
    const i = installmentList(s).find((x) => x.id === r.installmentId);
    next.receipts = s.receipts.map((x) =>
      x.id === r.id
        ? { ...x, reversal: { date: SNAPSHOT, reason: action.reason.trim() } }
        : x,
    );
    entity = r.installmentId;
    project = i?.project ?? "all";
    message = `${r.id} tahsilatı iptal edildi (${r.amount.toLocaleString("tr-TR")} TL); bakiye geri eklendi`;
  } else if (action.type === "project-create") {
    const r = action.record;
    const name = r.name.trim(),
      code = r.code.trim().toLocaleUpperCase("tr");
    if (name.length < 2) throw Error("Proje adı gerekli.");
    if (!/^[A-ZÇĞİÖŞÜ]{2,4}$/.test(code))
      throw Error("Proje kodu 2–4 harf olmalı (ör. KV).");
    if (projects.some((p) => p.code === code))
      throw Error("Bu proje kodu başka bir projede kullanılıyor.");
    if (projects.some((p) => p.name.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr")))
      throw Error("Bu adla bir proje zaten var.");
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
      status: "Aktif",
      created: SNAPSHOT,
    };
    next.projectsCustom = [...(s.projectsCustom ?? []), record];
    entity = record.id;
    project = record.id;
    message = `${name} projesi oluşturuldu; blok ve daire ekleyerek başlayın`;
  } else if (action.type === "project-update") {
    const p = projects.find((x) => x.id === action.id);
    if (!p) throw Error("Proje bulunamadı.");
    const name = action.patch.name.trim();
    if (name.length < 2) throw Error("Proje adı gerekli.");
    if (projects.some((x) => x.id !== p.id && x.name.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr")))
      throw Error("Bu adla bir proje zaten var.");
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
    message = "Proje bilgileri güncellendi";
  } else if (action.type === "project-status") {
    const p = projects.find((x) => x.id === action.id);
    if (!p) throw Error("Proje bulunamadı.");
    if (p.status === action.status) throw Error("Proje zaten bu durumda.");
    next.projectEdits = {
      ...(s.projectEdits ?? {}),
      [p.id]: { ...(s.projectEdits?.[p.id] ?? {}), status: action.status },
    };
    entity = p.id;
    project = p.id;
    message =
      action.status === "Arşiv"
        ? "Proje arşivlendi; finansal kayıtları korunur"
        : action.status === "Aktif"
          ? "Proje yeniden aktifleştirildi"
          : "Proje tamamlandı olarak işaretlendi";
  } else if (action.type === "project-delete") {
    const p = projects.find((x) => x.id === action.id);
    if (!p) throw Error("Proje bulunamadı.");
    if (BUILTIN_PROJECT_IDS.includes(p.id) || p.builtIn)
      throw Error("Kayıtları olan proje silinemez; arşive alın.");
    const hasRecords =
      customerList(s).some((c) => c.project === p.id) ||
      (s.drafts ?? []).some((d) => d.project === p.id) ||
      (s.cancelled ?? []).some((d) => d.project === p.id) ||
      s.barters.some((b) => b.project === p.id) ||
      requestList(s).some((r) => r.project === p.id) ||
      s.reminders.some((r) => r.project === p.id) ||
      s.reserved.some((k) => k.startsWith(p.id + "-"));
    if (hasRecords)
      throw Error("Bu projede satış, sözleşme, barter veya hakediş kaydı var; silinemez, arşive alın.");
    next.projectsCustom = (s.projectsCustom ?? []).filter((x) => x.id !== p.id);
    next.unitsCustom = (s.unitsCustom ?? []).filter((u) => u.project !== p.id);
    const edits = { ...(s.projectEdits ?? {}) };
    delete edits[p.id];
    next.projectEdits = edits;
    entity = p.id;
    project = "all";
    message = `${p.name} projesi silindi (kayıt yoktu)`;
  } else if (action.type === "block-create") {
    const p = projects.find((x) => x.id === action.project);
    if (!p) throw Error("Proje bulunamadı.");
    if (p.status === "Arşiv") throw Error("Arşivdeki projeye blok eklenemez.");
    const block = action.block.trim().toLocaleUpperCase("tr");
    if (!/^[A-ZÇĞİÖŞÜ0-9]{1,3}$/.test(block)) throw Error("Blok adı 1–3 harf/rakam olmalı (ör. C).");
    if (units.some((u) => u.project === p.id && u.block === block))
      throw Error(`${block} blok bu projede zaten var.`);
    const ints = [action.floors, action.perFloor, action.startFloor];
    if (!ints.every(Number.isInteger) || action.floors < 1 || action.floors > 40 || action.perFloor < 1 || action.perFloor > 20 || action.startFloor < -3 || action.startFloor > 40)
      throw Error("Kat sayısı 1–40, kattaki daire 1–20 olmalı.");
    if (!action.unitType.trim() || !(action.gross > 0) || !(action.listPrice > 0))
      throw Error("Daire tipi, brüt m² ve liste fiyatı gerekli.");
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
    message = `${block} blok eklendi: ${created.length} daire`;
  } else if (action.type === "unit-update") {
    const u = unitById(action.id);
    if (!u) throw Error("Daire bulunamadı.");
    if (unitTaken(s, u.id))
      throw Error("Satılmış, imza sürecindeki veya barter verilmiş daire düzenlenemez.");
    const pt = action.patch;
    if (!pt.type.trim() || !(pt.gross > 0) || !(pt.listPrice > 0))
      throw Error("Tip, brüt m² ve liste fiyatı gerekli.");
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
    message = `${u.label} dairesi güncellendi (liste fiyatı yalnızca yeni satışları etkiler)`;
  }
  const result: EnterpriseState = {
    ...next,
    audit: [
      {
        id: id(),
        entity,
        message,
        project,
        time: new Date().toLocaleTimeString("tr-TR", {
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
const PROJECT_CODE: Record<string, string> = { verdora: "VK", sanetime: "ST", bulvarpark: "BP" };

export const contractNumber = (id: string) => {
  const [p, n] = id.split("-");
  return `SZL-${PROJECT_CODE[p] ?? projectCode(p)}-${String(n).padStart(3, "0")}`;
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
    ? `${c.plan.deposits.length > 1 ? `${c.plan.deposits.length} parça peşinat` : "Peşinat"} + ${c.plan.count} taksit${c.plan.interim.length ? ` + ${c.plan.interim.length} ara ödeme` : ""}`
    : `Peşinat + 36 taksit`;

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
        status === "Aktif" || status === "Tamamlandı"
          ? contractSignedAt(s, c)
          : undefined,
      planLabel: planLabelOf(c),
      history: meta?.history ?? [
        {
          date: contractSignedAt(s, c),
          status: "Aktif",
          note: "Örnek sözleşme kaydı (demo başlangıç verisi)",
        },
      ],
      account,
    };
  };
  const active = customerList(s).map((c) => {
    const acc = accountOf(s, c, all);
    return view(c, acc.balance <= 0 ? "Tamamlandı" : "Aktif", acc);
  });
  const drafts = (s.drafts ?? []).map((d) =>
    view(d, s.contractMeta[d.id]?.status ?? "Taslak"),
  );
  const cancelled = (s.cancelled ?? [])
    .filter(
      (d) =>
        !customerList(s).some((c) => c.id === d.id) &&
        !(s.drafts ?? []).some((x) => x.id === d.id),
    )
    .map((d) => view(d, "İptal"));
  return [...drafts, ...active, ...cancelled];
}

export type LedgerEntry = {
  /** Düzeltilebilir kaynak kayıt (makbuz veya peşinat tahsilatı) ve iptal durumu. */
  sourceId?: string;
  reversed?: boolean;
  date: string;
  kind: "Sözleşme" | "Peşinat" | "Taksit" | "Ara ödeme" | "Tahsilat" | "İptal";
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
      kind: "Sözleşme",
      label: `${contractNumber(c.id)} sözleşme bedeli`,
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
      kind: "Peşinat",
      label: "Peşinat tahsilatı (imzada)",
      ref: "PSN-0",
      debit: 0,
      credit: atSigning,
    });
  depositLater.forEach((d, n) => {
    raw.push({
      date: d.date,
      kind: "Peşinat",
      label: "Peşinat tahsilatı",
      ref: `PSN-${n + 1}`,
      debit: 0,
      credit: d.amount,
      sourceId: d.id,
      reversed: !!d.reversal,
    });
    if (d.reversal)
      raw.push({
        date: d.reversal.date,
        kind: "İptal",
        label: `PSN-${n + 1} peşinat iptali · ${d.reversal.reason}`,
        ref: `PSN-${n + 1}-İPT`,
        debit: 0,
        credit: -d.amount,
      });
  });
  for (let k = 1; k <= c.paidMonths; k++)
    raw.push({
      date: addMonths(signed, k),
      kind: "Taksit",
      label: `${k}. taksit tahsilatı`,
      ref: `ÖNC-${k}`,
      debit: 0,
      credit: c.installment,
    });
  for (const r of s.receipts) {
    const i = byId.get(r.installmentId);
    if (!i) continue;
    raw.push({
      date: r.date,
      kind: i.kind === "Ara ödeme" ? "Ara ödeme" : "Tahsilat",
      label: `${i.label ?? `${i.id.split("-").pop()}. taksit`} · ${r.method}`,
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
        kind: "İptal",
        label: `${r.id} tahsilat iptali · ${r.reversal.reason}`,
        ref: `${r.id}-İPT`,
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
  "Gecikti",
  "Yaklaşıyor",
  "Kısmen ödendi",
  "Gelecek dönem",
  "Ödendi",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
/** "Yaklaşıyor" penceresi: senaryo tarihinden itibaren 30 gün. */
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
  if (remaining <= 0) return "Ödendi";
  if (due < SNAPSHOT) return "Gecikti";
  if (remaining < amount) return "Kısmen ödendi";
  if (dayDiff(due) <= UPCOMING_DAYS) return "Yaklaşıyor";
  return "Gelecek dönem";
}

export type PaymentRow = {
  id: string;
  /** Taksit satırı için installment id; peşinat için `deposit:<müşteri>:<sıra>` */
  installmentId?: string;
  customerId: string;
  project: string;
  kind: "Peşinat" | "Taksit" | "Ara ödeme";
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
      kind: i.kind === "Ara ödeme" ? "Ara ödeme" : "Taksit",
      label: i.label ?? `${i.id.split("-").pop()}. taksit`,
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
        kind: "Peşinat",
        label: parts.length > 1 ? `${n + 1}. peşinat` : "Peşinat",
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
  kind: "Peşinat" | "Taksit" | "Sözleşme" | "Hakediş" | "Barter" | "Hatırlatma";
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
      kind: r.kind === "Peşinat" ? "Peşinat" : "Taksit",
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
      kind: "Sözleşme",
      title: `${contractNumber(d.id)} · ${d.name}`,
      detail: `${s.contractMeta[d.id]?.status ?? "Taslak"} · imza ve ilk peşinat`,
      amount: d.depositExpected,
      ref: { type: "draft", id: d.id },
    });
  }
  for (const r of requestList(s)) {
    const st = requestStatus(s, r);
    if (!inScope(r.project) || !["Onay bekliyor", "Onaylandı"].includes(st))
      continue;
    const days = dayDiff(r.due);
    if (days > horizon) continue;
    items.push({
      id: `req-${r.id}`,
      project: r.project,
      date: r.due,
      days,
      kind: "Hakediş",
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
      kind: "Barter",
      title: `${b.company} · ${unitById(b.unitId)?.label ?? b.unitId}`,
      detail: `İş bitiş tarihi · %${b.progress} tamamlandı`,
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
      kind: "Hatırlatma",
      title: r.title,
      detail: "Özel hatırlatma",
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
        name: `${no} · Satış sözleşmesi özeti`,
        kind: "Satış sözleşmesi",
        date: signed,
        href: `/belge/?tur=sozlesme&id=${c.id}`,
        detail: `${c.name} · ${c.unit}`,
      },
      {
        id: `${no}-plan`,
        name: `${no} · Ödeme planı`,
        kind: "Ödeme planı",
        date: signed,
        href: `/belge/?tur=plan&id=${c.id}`,
        detail: "Peşinat, taksit ve ara ödemeler",
      },
      {
        id: `${no}-ekstre`,
        name: `${no} · Cari hesap ekstresi`,
        kind: "Cari ekstre",
        date: SNAPSHOT,
        href: `/belge/?tur=ekstre&id=${c.id}`,
        detail: "Borç, tahsilat ve bakiye",
      },
      ...s.receipts
        .filter((r) => ids.has(r.installmentId))
        .map((r) => ({
          id: r.id,
          name: `${r.id} · Tahsilat makbuzu`,
          kind: "Makbuz",
          date: r.date,
          href: `/belge/?tur=makbuz&id=${r.id}`,
          detail: `${r.amount.toLocaleString("tr-TR")} TL · ${r.method}${r.reversal ? " · İPTAL EDİLDİ" : ""}`,
        })),
    ];
  }
  const d = (s.drafts ?? []).find((d) => d.id === recordId);
  if (d)
    return [
      {
        id: `${contractNumber(d.id)}-szl`,
        name: `${contractNumber(d.id)} · Sözleşme taslağı`,
        kind: "Satış sözleşmesi",
        date: s.contractMeta[d.id]?.created ?? SNAPSHOT,
        href: `/belge/?tur=sozlesme&id=${d.id}`,
        detail: `${d.name} · ${s.contractMeta[d.id]?.status ?? "Taslak"}`,
      },
    ];
  const b = s.barters.find((b) => b.id === recordId);
  if (b)
    return [
      {
        id: `${b.id}-szl`,
        name: `${b.id} · Barter sözleşmesi özeti`,
        kind: "Barter sözleşmesi",
        date: b.start,
        href: `/belge/?tur=barter&id=${b.id}`,
        detail: `${b.company} · ${unitById(b.unitId)?.label ?? b.unitId}`,
      },
    ];
  return [];
}

export type HistoryEvent = {
  date: string;
  kind: "Sözleşme" | "Tahsilat" | "Peşinat" | "Değişiklik";
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
      status: "Aktif",
      note: "Sözleşme imzalandı (örnek kayıt)",
    },
  ];
  for (const h of contractEvents)
    events.push({
      date: h.date,
      kind: "Sözleşme",
      title:
        h.status === "Aktif"
          ? "Sözleşme imzalandı"
          : h.status === "Devir"
            ? "Sözleşme devredildi"
            : `Sözleşme · ${h.status}`,
      detail: h.note,
    });
  for (const e of customerLedger(s, c.id)) {
    if (!e.credit) continue;
    events.push({
      date: e.date,
      kind: e.kind === "Peşinat" ? "Peşinat" : "Tahsilat",
      title: e.kind === "Peşinat" ? "Peşinat tahsil edildi" : "Tahsilat",
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
        kind: "Değişiklik",
        title: "Vade değiştirildi",
        detail: `${id.split("-").pop()}. taksit yeni vade ${due}`,
      });
  if (
    s.customerEdits[c.id] &&
    !events.some((e) => e.title === "Sözleşme devredildi")
  )
    events.push({
      date: SNAPSHOT,
      kind: "Değişiklik",
      title: "Müşteri bilgileri güncellendi",
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
const firmKey = (s: string) => s.trim().toLocaleLowerCase("tr");
export function workContracts(
  s: EnterpriseState,
  project = "all",
): WorkContract[] {
  const groups = new Map<string, WorkContract>();
  // Numara: proje içinde iş paketlerinin sırasına göre IS-VK-01, IS-VK-02 … (proje filtresinden bağımsız, kalıcı)
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
        r.type === "Hakediş" &&
        r.project === g.project &&
        firmKey(r.company) === firmKey(g.company),
    );
    g.hakedisTotal = r2(g.requests.reduce((a, r) => a + r.amount, 0));
    g.paid = r2(
      g.requests
        .filter((r) => requestStatus(s, r) === "Ödendi")
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
    name: `${wc.id} · İş sözleşmesi özeti`,
    kind: "İş sözleşmesi",
    date: wc.requests.map((r) => r.due).sort()[0] ?? SNAPSHOT,
    href: `/belge/?tur=is&id=${encodeURIComponent(wc.id)}`,
    detail: `${wc.company} · ${wc.packages.map((p) => p.name).join(", ")}`,
  };
}
