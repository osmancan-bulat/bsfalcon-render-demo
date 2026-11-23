// Registro interno de facturación (DEMO). Cada cobro registrado en el sistema (anticipo o cuota) genera una
// fila facturable. El usuario registra el número de factura emitida en su sistema de facturación
// (formato 001-001-0000001) o la anula. Esta demo NO emite facturas electrónicas, no se conecta a SIFEN/SET y
// no valida timbrado: solo hace el seguimiento del estado de cada comprobante.
import {
  customerList,
  installmentList,
  contractSignedAt,
  SNAPSHOT,
  type EnterpriseState,
} from "./enterprise.ts";
import { projectById } from "./catalog.ts";
import { r2 } from "./plan.ts";

export type BillingStatus = "Por emitir" | "Emitida" | "Anulada" | "Revisar";
export type BillingRecord = {
  status: "Emitida" | "Anulada";
  number: string;
  date: string;
  /** Tipo de cambio de referencia (₲ por USD) registrado al emitir. */
  rate: number;
  history: { date: string; status: string; note: string }[];
};
export type FxSettings = { rate: number; date: string };
export const DEFAULT_FX: FxSettings = { rate: 7300, date: "2026-11-15" };
export const INVOICE_RE = /^\d{3}-\d{3}-\d{7}$/;

export type BillingRow = {
  source: string;
  kind: "Anticipo" | "Cuota" | "Pago intermedio";
  concept: string;
  customerId: string;
  customer: string;
  project: string;
  amount: number;
  date: string;
  reference: string;
  /** El cobro de origen fue anulado. */
  reversed: boolean;
  status: BillingStatus;
  record?: BillingRecord;
};

export const fxOf = (s: EnterpriseState): FxSettings => s.fx ?? DEFAULT_FX;

/** Filas facturables derivadas de los cobros (no se duplican datos: el cobro es la fuente). */
export function billingRows(s: EnterpriseState): BillingRow[] {
  const names = new Map(customerList(s).map((c) => [c.id, c.name]));
  const inst = new Map(installmentList(s).map((i) => [i.id, i]));
  const rows: Omit<BillingRow, "status" | "record">[] = [];
  for (const c of s.contracts)
    if (c.deposit > 0)
      rows.push({
        source: `ANT-${c.id}`,
        kind: "Anticipo",
        concept: `Anticipo · ${c.unit}`,
        customerId: c.id,
        customer: names.get(c.id) ?? c.name,
        project: c.project,
        amount: r2(c.deposit),
        date: c.depositDate ?? contractSignedAt(s, c),
        reference: "Cobrado en la firma",
        reversed: false,
      });
  for (const d of s.depositPayments) {
    const c = s.contracts.find((x) => x.id === d.customerId);
    rows.push({
      source: d.id,
      kind: "Anticipo",
      concept: `Anticipo (parte) · ${c?.unit ?? ""}`,
      customerId: d.customerId,
      customer: names.get(d.customerId) ?? d.customerId,
      project: c?.project ?? d.customerId.split("-")[0],
      amount: r2(d.amount),
      date: d.date,
      reference: "Cobro de anticipo",
      reversed: !!d.reversal,
    });
  }
  for (const r of s.receipts) {
    const i = inst.get(r.installmentId);
    const cid = i?.customerId ?? r.installmentId.split("-").slice(0, 2).join("-");
    const interim = i?.kind === "Pago intermedio";
    rows.push({
      source: r.id,
      kind: interim ? "Pago intermedio" : "Cuota",
      concept: interim ? `${i?.label ?? "Pago intermedio"}` : `Cuota ${r.installmentId.split("-").pop()}`,
      customerId: cid,
      customer: names.get(cid) ?? cid,
      project: i?.project ?? cid.split("-")[0],
      amount: r2(r.amount),
      date: r.date,
      reference: r.reference,
      reversed: !!r.reversal,
    });
  }
  return rows
    .map((row) => {
      const record = s.billing?.[row.source];
      const status: BillingStatus = row.reversed
        ? record?.status === "Emitida" ? "Revisar" : "Anulada"
        : record?.status ?? "Por emitir";
      return { ...row, record, status };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.source.localeCompare(b.source));
}

export function billingSummary(s: EnterpriseState, project = "all") {
  const rows = billingRows(s).filter((r) => project === "all" || r.project === project);
  const by = (st: BillingStatus) => rows.filter((r) => r.status === st);
  const sum = (rs: BillingRow[]) => r2(rs.reduce((a, r) => a + r.amount, 0));
  return {
    rows,
    pending: by("Por emitir"),
    issued: by("Emitida"),
    voided: by("Anulada"),
    review: by("Revisar"),
    pendingAmount: sum(by("Por emitir")),
    issuedAmount: sum(by("Emitida")),
    reviewAmount: sum(by("Revisar")),
  };
}

export type BillingAction =
  | { type: "invoice-issue"; source: string; number: string; date: string }
  | { type: "invoice-void"; source: string; reason: string }
  | { type: "fx-set"; rate: number; date: string };

/** Aplica una acción de facturación o de tipo de cambio. Devuelve el parche de estado y el texto de auditoría. */
export function applyBillingAction(s: EnterpriseState, a: BillingAction) {
  if (a.type === "fx-set") {
    if (!Number.isFinite(a.rate) || a.rate < 1000 || a.rate > 20000)
      throw Error("El tipo de cambio debe estar entre ₲ 1.000 y ₲ 20.000 por USD.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) throw Error("Fecha del tipo de cambio inválida.");
    const rate = Math.round(a.rate);
    return {
      patch: { fx: { rate, date: a.date } },
      entity: "FX",
      project: "all",
      message: `Tipo de cambio de referencia definido: 1 USD = ₲ ${rate.toLocaleString("es-PY")} (${a.date})`,
    };
  }
  const row = billingRows(s).find((r) => r.source === a.source);
  if (!row) throw Error("Cobro no encontrado.");
  const prev = s.billing?.[a.source];
  if (a.type === "invoice-issue") {
    if (row.reversed) throw Error("El cobro fue anulado; no corresponde emitir factura.");
    if (row.status === "Emitida") throw Error("Este cobro ya tiene una factura emitida.");
    const number = a.number.trim();
    if (!INVOICE_RE.test(number))
      throw Error("Número de factura inválido. Formato: 001-001-0000123 (establecimiento-punto-número).");
    const dup = Object.entries(s.billing ?? {}).find(([k, b]) => k !== a.source && b.number === number && b.status === "Emitida");
    if (dup) throw Error(`El número ${number} ya está registrado en otra factura emitida.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date) || a.date < row.date || a.date > SNAPSHOT)
      throw Error("La fecha de factura debe ser igual o posterior al cobro y no puede ser futura.");
    const rate = fxOf(s).rate;
    const record: BillingRecord = {
      status: "Emitida",
      number,
      date: a.date,
      rate,
      history: [...(prev?.history ?? []), { date: a.date, status: "Emitida", note: `Factura ${number} registrada · TC ₲ ${rate.toLocaleString("es-PY")}` }],
    };
    return {
      patch: { billing: { ...(s.billing ?? {}), [a.source]: record } },
      entity: a.source,
      project: row.project,
      message: `Factura ${number} registrada para ${row.concept} · ${row.customer}`,
    };
  }
  // invoice-void
  if (!prev || prev.status !== "Emitida") throw Error("Solo se puede anular una factura emitida.");
  if (!a.reason.trim()) throw Error("Indique el motivo de la anulación.");
  const record: BillingRecord = {
    ...prev,
    status: "Anulada",
    history: [...prev.history, { date: SNAPSHOT, status: "Anulada", note: a.reason.trim() }],
  };
  return {
    patch: { billing: { ...(s.billing ?? {}), [a.source]: record } },
    entity: a.source,
    project: row.project,
    message: `Factura ${prev.number} anulada · ${a.reason.trim()}`,
  };
}

/** Nombre del proyecto para listados de facturación. */
export const billingProjectName = (id: string) => projectById(id)?.name ?? id;
