// Raporlama motoru. Tüm rakamlar o anki durumdan (EnterpriseState) hesaplanır; sabit veya
// tahmini finansal değer yoktur. Kapsam kuralları:
// - "Estado" göstergeleri (sözleşmeli satış, kalan alacak, gecikme) senaryo tarihine (SNAPSHOT) göredir.
// - "Período" göstergeleri (kasaya giren/çıkan, mahsup, imzalanan satış) tarih filtresine uygulanır.
// - Barter nakit değildir: kasaya giren/çıkan hesaplarına girmez, ayrı "nakit dışı" kalem olarak raporlanır.
import {
  SNAPSHOT,
  projects,
  pname,
  customerList,
  accountOf,
  customerLedger,
  contractSignedAt,
  contractNumber,
  paymentRows,
  requestList,
  requestStatus,
  netPayable,
  paidDate,
  offsetFor,
  barterOffset,
  workContracts,
  reservedUnits,
  isLandownerUnit,
  summary,
  installmentList,
  type EnterpriseState,
  type PaymentRow,
} from "./enterprise.ts";
import type { Customer } from "./data.ts";
import { units, unitById, unitShort } from "./units.ts";
import { syncCatalog } from "./catalog.ts";

export type ReportFilter = { project: string; from?: string; to?: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
// Aynı durum için hesap ve cari hareketleri bir kez hesaplanır (durum değişmezdir; yeni işlem yeni nesne üretir).
const accountMemo = new WeakMap<EnterpriseState, Map<string, ReturnType<typeof accountOf>>>();
const ledgerMemo = new WeakMap<EnterpriseState, Map<string, ReturnType<typeof customerLedger>>>();
function acct(s: EnterpriseState, c: Customer) {
  let m = accountMemo.get(s);
  if (!m) accountMemo.set(s, (m = new Map()));
  let a = m.get(c.id);
  if (!a) {
    const all = installmentList(s);
    // installmentList her çağrıda yeni dizi üretir; tüm müşteriler için bir kez hesaplanıp paylaşılır
    for (const x of customerList(s)) if (!m.has(x.id)) m.set(x.id, accountOf(s, x, all));
    a = m.get(c.id) ?? accountOf(s, c, all);
  }
  return a;
}
function ledger(s: EnterpriseState, id: string) {
  let m = ledgerMemo.get(s);
  if (!m) ledgerMemo.set(s, (m = new Map()));
  if (!m.has(id)) m.set(id, customerLedger(s, id));
  return m.get(id)!;
}
const sum = <T>(xs: T[], f: (x: T) => number) => r2(xs.reduce((a, x) => a + f(x), 0));
const inScope = (f: ReportFilter, p: string) => f.project === "all" || f.project === p;
/** Tarih filtresi: boş uç sınırsızdır. */
export const inRange = (f: ReportFilter, d: string) =>
  (!f.from || d >= f.from) && (!f.to || d <= f.to);
export const scopeProjects = (f: ReportFilter) => projects.filter((p) => inScope(f, p.id));
export const periodLabel = (f: ReportFilter) =>
  f.from || f.to
    ? `${f.from ? fmt(f.from) : "inicio"} – ${f.to ? fmt(f.to) : "hoy"}`
    : "Todos los períodos";
const fmt = (d: string) => d.split("-").reverse().join(".");
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);

/* ------------------------------------------------------------------ */
/* A. Finansal genel durum                                            */
/* ------------------------------------------------------------------ */
export function financialReport(s: EnterpriseState, f: ReportFilter) {
  syncCatalog(s);
  const cs = customerList(s).filter((c) => inScope(f, c.project));
  const accounts = cs.map((c) => acct(s, c));
  const contracted = sum(cs, (c) => c.price);
  const collected = sum(accounts, (a) => a.collected);
  const scopeSummaries = scopeProjects(f).map((p) => summary(s, p.id));
  const overdue = sum(scopeSummaries, (x) => x.overdueTotal);
  // Kasaya giren: müşteri cari hesaplarındaki tahsilat hareketleri (peşinat, taksit, ara ödeme), tarihine göre
  const inflowRows = cs.flatMap((c) =>
    ledger(s, c.id)
      // Tahsilat iptalleri negatif kayıt olarak iptal tarihindeki dönemden düşer.
      .filter((e) => e.credit !== 0 && inRange(f, e.date))
      .map((e) => ({ customerId: c.id, project: c.project, date: e.date, kind: e.kind, amount: e.credit })),
  );
  const inflowBy = (k: string[]) => sum(inflowRows.filter((r) => k.includes(r.kind)), (r) => r.amount);
  // Kasadan çıkan: ödenen hakediş ve satın almaların nakit kısmı (barter mahsubu hariç).
  // Dönem, kaydedilen gerçek ödeme tarihine göre belirlenir; hakediş vadesi yalnızca bilgi içindir.
  // Ödeme tarihi kaydı olmayan (önceki sürümden gelen) ödemeler tarih filtresinde dönemlere dağıtılmaz,
  // yalnızca "Todos los períodos" toplamında yer alır ve ayrıca belirtilir.
  const dated = !f.from && !f.to;
  const requests = requestList(s).filter((r) => inScope(f, r.project));
  const paidRows = requests
    .filter((r) => requestStatus(s, r) === "Pagada")
    .map((r) => ({ id: r.id, project: r.project, company: r.company, type: r.type, paidAt: paidDate(s, r.id), due: r.due, amount: netPayable(s, r) }));
  const outflowRows = paidRows.filter((r) => (r.paidAt ? inRange(f, r.paidAt) : dated));
  const undatedPaid = paidRows.filter((r) => !r.paidAt);
  const offsets = (s.offsets ?? []).filter((o) => {
    const r = requests.find((x) => x.id === o.requestId);
    return r && inRange(f, o.date);
  });
  const barters = s.barters.filter((b) => inScope(f, b.project));
  const inflow = sum(inflowRows, (r) => r.amount);
  const outflow = sum(outflowRows, (r) => r.amount);
  return {
    contracted,
    collected,
    balance: r2(contracted - collected),
    collectionRate: contracted ? collected / contracted : 0,
    overdue,
    overdueInstallments: sum(scopeSummaries, (x) => x.overdue),
    overdueDeposits: sum(scopeSummaries, (x) => x.depositOverdue),
    inflow,
    inflowDeposit: inflowBy(["Anticipo"]),
    inflowInstallment: inflowBy(["Cuota", "Cobro", "Anulado"]),
    inflowInterim: inflowBy(["Pago intermedio"]),
    outflow,
    net: r2(inflow - outflow),
    outflowRows,
    /** Ödeme tarihi kaydı olmayan ödenmiş kalemler (dönem filtresinde gösterilmez). */
    undatedPaidCount: undatedPaid.length,
    undatedPaidAmount: sum(undatedPaid, (r) => r.amount),
    barterOffset: sum(offsets, (o) => o.amount),
    barterOffsetCount: offsets.length,
    barterValue: sum(barters, (b) => b.amount),
    barterRemaining: sum(barters, (b) => b.amount - barterOffset(s, b.id)),
    payableApproved: sum(
      requests.filter((r) => requestStatus(s, r) === "Aprobado"),
      (r) => netPayable(s, r),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* B. Satış raporu                                                    */
/* ------------------------------------------------------------------ */
export function salesReport(s: EnterpriseState, f: ReportFilter) {
  syncCatalog(s);
  const cs = customerList(s).filter((c) => inScope(f, c.project));
  const sold = new Map(cs.map((c) => [c.id, c]));
  const drafts = new Set((s.drafts ?? []).map((d) => d.id));
  const barter = new Set(s.barters.map((b) => b.unitId));
  const reserved = new Set(scopeProjects(f).flatMap((p) => reservedUnits(s, p.id)));
  const status = (id: string) =>
    sold.has(id) ? "Vendida" : drafts.has(id) ? "En firma" : barter.has(id) ? "Canje" : reserved.has(id) ? "Reservada" : isLandownerUnit(s, id) ? "Propietario del terreno" : "Disponible";
  const scopeUnits = units.filter((u) => inScope(f, u.project));
  const row = (list: typeof scopeUnits) => {
    const soldList = list.filter((u) => sold.has(u.id)).map((u) => sold.get(u.id)!);
    const value = sum(soldList, (c) => c.price);
    const collected = sum(soldList, (c) => acct(s, c).collected);
    return {
      total: list.length,
      sold: soldList.length,
      inSigning: list.filter((u) => status(u.id) === "En firma").length,
      barter: list.filter((u) => status(u.id) === "Canje").length,
      reserved: list.filter((u) => status(u.id) === "Reservada").length,
      landowner: list.filter((u) => status(u.id) === "Propietario del terreno").length,
      available: list.filter((u) => status(u.id) === "Disponible").length,
      value,
      collected,
      rate: value ? collected / value : 0,
      avgPrice: soldList.length ? r2(value / soldList.length) : 0,
      availableListValue: sum(list.filter((u) => status(u.id) === "Disponible"), (u) => u.listPrice),
    };
  };
  const byProject = scopeProjects(f).map((p) => ({ project: p.id, name: p.name, ...row(scopeUnits.filter((u) => u.project === p.id)) }));
  const types = [...new Set(scopeUnits.map((u) => `${u.project}|${u.type}`))];
  const byType = types.map((k) => {
    const [project, type] = k.split("|");
    return { project, name: pname(project), type, ...row(scopeUnits.filter((u) => u.project === project && u.type === type)) };
  });
  // Dönemde imzalanan satışlar (imza tarihine göre)
  const signedInPeriod = cs
    .map((c) => ({ c, signed: contractSignedAt(s, c) }))
    .filter((x) => inRange(f, x.signed))
    .map(({ c, signed }) => ({
      id: c.id,
      number: contractNumber(c.id),
      name: c.name,
      project: c.project,
      unit: unitShort(c.id),
      type: unitById(c.id)?.type ?? "",
      signed,
      price: c.price,
      collected: acct(s, c).collected,
    }))
    .sort((a, b) => b.signed.localeCompare(a.signed));
  return { total: row(scopeUnits), byProject, byType, signedInPeriod, unitStatus: status };
}

/* ------------------------------------------------------------------ */
/* C. Taksit ve gecikme raporu                                        */
/* ------------------------------------------------------------------ */
export const AGING = [
  { key: "0-30", label: "0–30 días", min: 1, max: 30 },
  { key: "31-60", label: "31–60 días", min: 31, max: 60 },
  { key: "61-90", label: "61–90 días", min: 61, max: 90 },
  { key: "90+", label: "Más de 90 días", min: 91, max: Infinity },
] as const;

export function installmentReport(s: EnterpriseState, f: ReportFilter, horizonDays = 90) {
  syncCatalog(s);
  const names = new Map(customerList(s).map((c) => [c.id, c]));
  const rows = paymentRows(s).filter((r) => inScope(f, r.project) && r.remaining > 0);
  const overdueRows = rows.filter((r) => r.status === "Vencida" && inRange(f, r.due));
  // Yaklaşan: tarih filtresi varsa o aralık, yoksa önümüzdeki `horizonDays` gün
  const upcomingRows = rows
    .filter((r) => r.due >= SNAPSHOT && (f.from || f.to ? inRange(f, r.due) : r.days <= horizonDays))
    .sort((a, b) => a.due.localeCompare(b.due));
  const late = (r: PaymentRow) => daysBetween(r.due, SNAPSHOT);
  const aging = AGING.map((b) => {
    const xs = overdueRows.filter((r) => late(r) >= b.min && late(r) <= b.max);
    return { ...b, count: xs.length, customers: new Set(xs.map((r) => r.customerId)).size, amount: sum(xs, (r) => r.remaining) };
  });
  const byMonth = [...new Set(upcomingRows.map((r) => r.due.slice(0, 7)))].map((m) => {
    const xs = upcomingRows.filter((r) => r.due.startsWith(m));
    return { month: m, count: xs.length, amount: sum(xs, (r) => r.remaining), partial: xs.filter((r) => r.paid > 0).length };
  });
  const perCustomer = [...new Set(overdueRows.map((r) => r.customerId))]
    .map((id) => {
      const xs = overdueRows.filter((r) => r.customerId === id);
      const c = names.get(id)!;
      return {
        id,
        name: c.name,
        project: c.project,
        number: contractNumber(id),
        unit: unitShort(id),
        count: xs.length,
        amount: sum(xs, (r) => r.remaining),
        partialPaid: sum(xs, (r) => r.paid),
        oldest: xs.map((r) => r.due).sort()[0],
        maxDays: Math.max(...xs.map(late)),
        kinds: [...new Set(xs.map((r) => r.kind))].join(", "),
      };
    })
    .sort((a, b) => b.maxDays - a.maxDays || b.amount - a.amount);
  return {
    overdueTotal: sum(overdueRows, (r) => r.remaining),
    overdueCount: overdueRows.length,
    upcomingTotal: sum(upcomingRows, (r) => r.remaining),
    upcomingCount: upcomingRows.length,
    aging,
    byMonth,
    perCustomer,
    upcomingRows: upcomingRows.map((r) => ({ ...r, name: names.get(r.customerId)?.name ?? "", unit: unitShort(r.customerId), number: contractNumber(r.customerId) })),
  };
}

/* ------------------------------------------------------------------ */
/* D. Barter raporu                                                   */
/* ------------------------------------------------------------------ */
export function barterReport(s: EnterpriseState, f: ReportFilter) {
  syncCatalog(s);
  const rows = s.barters
    .filter((b) => inScope(f, b.project))
    .map((b) => {
      const u = unitById(b.unitId);
      const offs = (s.offsets ?? []).filter((o) => o.barterId === b.id);
      return {
        id: b.id,
        project: b.project,
        company: b.company,
        unit: unitShort(b.unitId),
        unitType: u?.type ?? "",
        listValue: u?.listPrice ?? 0,
        amount: b.amount,
        work: b.work,
        offset: sum(offs, (o) => o.amount),
        offsetInPeriod: sum(offs.filter((o) => inRange(f, o.date)), (o) => o.amount),
        offsets: offs.map((o) => ({ ...o, request: requestList(s).find((r) => r.id === o.requestId)?.name ?? o.requestId })),
        remaining: r2(b.amount - barterOffset(s, b.id)),
        progress: b.progress,
        transfer: b.transfer,
        end: b.end,
      };
    });
  const firms = [...new Set(rows.map((r) => r.company))].map((company) => {
    const xs = rows.filter((r) => r.company === company);
    return {
      company,
      count: xs.length,
      units: xs.map((x) => x.unit).join(", "),
      listValue: sum(xs, (x) => x.listValue),
      amount: sum(xs, (x) => x.amount),
      offset: sum(xs, (x) => x.offset),
      offsetInPeriod: sum(xs, (x) => x.offsetInPeriod),
      remaining: sum(xs, (x) => x.remaining),
    };
  });
  return {
    rows,
    firms,
    totals: {
      count: rows.length,
      listValue: sum(rows, (x) => x.listValue),
      amount: sum(rows, (x) => x.amount),
      offset: sum(rows, (x) => x.offset),
      offsetInPeriod: sum(rows, (x) => x.offsetInPeriod),
      remaining: sum(rows, (x) => x.remaining),
    },
  };
}

/* ------------------------------------------------------------------ */
/* E. Taşeron ve hakediş raporu                                       */
/* ------------------------------------------------------------------ */
export function subcontractorReport(s: EnterpriseState, f: ReportFilter) {
  syncCatalog(s);
  const rows = workContracts(s, f.project).map((w) => {
    const reqs = w.requests.filter((r) => inRange(f, r.due));
    const by = (st: string) => reqs.filter((r) => requestStatus(s, r) === st);
    return {
      id: w.id,
      project: w.project,
      company: w.company,
      packages: w.packages.map((p) => `${p.name} (%${p.progress})`).join(", "),
      value: w.value,
      hakedis: sum(reqs, (r) => r.amount),
      approved: sum(by("Aprobado"), (r) => r.amount),
      paid: sum(by("Pagada"), (r) => r.amount),
      pending: sum(by("Pendiente de aprobación"), (r) => r.amount),
      cashPaid: sum(by("Pagada"), (r) => netPayable(s, r)),
      cashDue: sum(by("Aprobado"), (r) => netPayable(s, r)),
      barterOffset: sum(reqs, (r) => offsetFor(s, r.id)),
      requests: reqs.map((r) => ({ id: r.id, name: r.name, due: r.due, paidAt: paidDate(s, r.id), amount: r.amount, status: requestStatus(s, r), offset: offsetFor(s, r.id), cash: netPayable(s, r) })),
      barterId: w.barterId,
    };
  });
  const t = (k: "value" | "hakedis" | "approved" | "paid" | "pending" | "cashPaid" | "cashDue" | "barterOffset") => sum(rows, (r) => r[k]);
  return {
    rows,
    totals: { value: t("value"), hakedis: t("hakedis"), approved: t("approved"), paid: t("paid"), pending: t("pending"), cashPaid: t("cashPaid"), cashDue: t("cashDue"), barterOffset: t("barterOffset") },
  };
}

/* ------------------------------------------------------------------ */
/* F. Yönetici raporu                                                 */
/* ------------------------------------------------------------------ */
export type Alert = { tone: "danger" | "warning" | "info"; project: string; title: string; detail: string; amount?: number; href: string };

export function managerReport(s: EnterpriseState, f: ReportFilter) {
  syncCatalog(s);
  const per = (p: string) => {
    const pf = { ...f, project: p };
    const fin = financialReport(s, pf);
    const sales = salesReport(s, pf).total;
    const inst = installmentReport(s, pf);
    return { project: p, name: p === "all" ? "Total de la empresa" : pname(p), fin, sales, inst };
  };
  const rows = [...scopeProjects(f).map((p) => per(p.id)), ...(f.project === "all" ? [per("all")] : [])];
  const alerts: Alert[] = [];
  for (const p of scopeProjects(f)) {
    const pf = { project: p.id };
    const inst = installmentReport(s, pf);
    const sm = summary(s, p.id);
    // Geciken tutar peşinat parçalarını da içerir; peşinat ayrıca toplanmaz, ayrıntıda belirtilir.
    if (inst.overdueTotal > 0)
      alerts.push({
        tone: "danger",
        project: p.id,
        title: `${inst.perCustomer.length} clientes con cuotas vencidas`,
        detail: `Mayor atraso: ${inst.perCustomer[0]?.maxDays ?? 0} días · ${inst.perCustomer[0]?.name ?? ""}${sm.depositOverdue > 0 ? ` · incluye US$ ${new Intl.NumberFormat("es-PY").format(sm.depositOverdue)} de anticipos` : ""}`,
        amount: inst.overdueTotal,
        href: "/cobros?durum=Vencida",
      });
    const drafts = (s.drafts ?? []).filter((d) => d.project === p.id);
    if (drafts.length)
      alerts.push({ tone: "warning", project: p.id, title: `${drafts.length} contratos en proceso de firma`, detail: drafts.map((d) => `${contractNumber(d.id)} · ${d.name}`).join(", "), amount: sum(drafts, (d) => d.price), href: "/contratos" });
    const pending = requestList(s).filter((r) => r.project === p.id && requestStatus(s, r) === "Pendiente de aprobación");
    if (pending.length)
      alerts.push({ tone: "info", project: p.id, title: `${pending.length} solicitudes pendientes de aprobación`, detail: pending.map((r) => `${r.id} · ${r.company}`).join(", "), amount: sum(pending, (r) => r.amount), href: "/caja" });
    const approved = requestList(s).filter((r) => r.project === p.id && requestStatus(s, r) === "Aprobado");
    if (approved.length)
      alerts.push({ tone: "info", project: p.id, title: `${approved.length} pagos aprobados pendientes`, detail: approved.map((r) => `${r.id} · ${r.company}`).join(", "), amount: sum(approved, (r) => netPayable(s, r)), href: "/caja" });
    for (const b of s.barters.filter((b) => b.project === p.id)) {
      const days = daysBetween(SNAPSHOT, b.end);
      const rem = r2(b.amount - barterOffset(s, b.id));
      if (rem > 0 && days <= 90)
        alerts.push({ tone: "warning", project: p.id, title: `El canje ${b.id} debe finalizar en ${days} días`, detail: `${b.company} · obligación pendiente`, amount: rem, href: "/unidades" });
    }
  }
  return { rows, alerts };
}

/* ------------------------------------------------------------------ */
/* CSV satırları (dışa aktarma; dosyayı lib/export.ts üretir)           */
/* ------------------------------------------------------------------ */
export type ReportKind = "caja" | "satis" | "cuotas" | "barter" | "taseron" | "yonetici";
export function reportCsv(s: EnterpriseState, kind: ReportKind, f: ReportFilter): (string | number)[][] {
  syncCatalog(s);
  const head: (string | number)[][] = [
    [`EDIFICA · ${REPORT_TITLES[kind]}`],
    ["Alcance", f.project === "all" ? "Todos los proyectos" : pname(f.project)],
    ["Período", periodLabel(f)],
    ["Fecha de corte", fmt(SNAPSHOT)],
    [],
  ];
  if (kind === "caja") {
    const a = financialReport(s, f);
    return [...head, ["Indicador", "Monto (USD)", "Kapsam"],
      ["Total contratado", a.contracted, "Estado"], ["Total cobrado", a.collected, "Estado"], ["Saldo por cobrar", a.balance, "Estado"],
      ["Saldo vencido (cuotas + pagos intermedios)", a.overdueInstallments, "Estado"], ["Anticipo vencido", a.overdueDeposits, "Estado"], ["Total vencido", a.overdue, "Estado"],
      ["Ingresos de caja — anticipos", a.inflowDeposit, "Período"], ["Ingresos de caja — cuotas", a.inflowInstallment, "Período"], ["Ingresos de caja — pagos intermedios", a.inflowInterim, "Período"], ["Total de ingresos de caja", a.inflow, "Período"],
      ["Egresos de caja (certificados y compras pagados)", a.outflow, "Período · según fecha real de pago"], ["Flujo de caja neto", a.net, "Período"],
      ["Compensación por canje (sin efectivo)", a.barterOffset, "Período"], ["Valor de canjes (sin efectivo)", a.barterValue, "Estado"], ["Obligación de canje pendiente", a.barterRemaining, "Estado"],
      ["Deuda aprobada no pagada", a.payableApproved, "Estado"]];
  }
  if (kind === "satis") {
    const b = salesReport(s, f);
    return [...head, ["Proyecto", "Tipología", "Total", "Vendidas", "En firma", "Canje", "Reservada", "Disponible", "Precio de venta (USD)", "Cobrado (USD)", "Cobranza %", "Venta promedio (USD)"],
      ...b.byType.map((r) => [r.name, r.type, r.total, r.sold, r.inSigning, r.barter, r.reserved, r.available, r.value, r.collected, Math.round(r.rate * 1000) / 10, r.avgPrice]),
      [], ["Ventas firmadas en el período"], ["Contrato", "Cliente", "Proyecto", "Unidad", "Firma", "Precio (USD)", "Cobrado (USD)"],
      ...b.signedInPeriod.map((r) => [r.number, r.name, pname(r.project), r.unit, fmt(r.signed), r.price, r.collected])];
  }
  if (kind === "cuotas") {
    const c = installmentReport(s, f);
    return [...head, ["Rango de atraso", "Cantidad de pagos", "Cliente", "Monto (USD)"], ...c.aging.map((a) => [a.label, a.count, a.customers, a.amount]),
      [], ["Mora por cliente"], ["Contrato", "Cliente", "Proyecto", "Unidad", "Cuotas vencidas", "Vencimiento más antiguo", "Atraso (días)", "Pagado parcialmente (USD)", "Monto vencido (USD)"],
      ...c.perCustomer.map((r) => [r.number, r.name, pname(r.project), r.unit, r.count, fmt(r.oldest), r.maxDays, r.partialPaid, r.amount]),
      [], ["Cobros próximos"], ["Vencimiento", "Contrato", "Cliente", "Pago", "Estado", "Saldo (USD)"],
      ...c.upcomingRows.map((r) => [fmt(r.due), r.number, r.name, r.label, r.status, r.remaining])];
  }
  if (kind === "barter") {
    const d = barterReport(s, f);
    return [...head, ["Canje", "Empresa", "Proyecto", "Unidad", "Valor de lista (USD)", "Valor del acuerdo (USD)", "Compensado (USD)", "Compensación del período (USD)", "Obligación pendiente (USD)", "Avance %", "Transferencia"],
      ...d.rows.map((r) => [r.id, r.company, pname(r.project), r.unit, r.listValue, r.amount, r.offset, r.offsetInPeriod, r.remaining, r.progress, r.transfer])];
  }
  if (kind === "taseron") {
    const e = subcontractorReport(s, f);
    return [...head, ["Contrato", "Empresa", "Proyecto", "Paquetes de obra", "Precio del contrato (USD)", "Certificado (USD)", "Aprobado (USD)", "Pagado (USD)", "Pendiente de aprobación (USD)", "Pagado en efectivo (USD)", "Compensación por canje (USD)"],
      ...e.rows.map((r) => [r.id, r.company, pname(r.project), r.packages, r.value, r.hakedis, r.approved, r.paid, r.pending, r.cashPaid, r.barterOffset])];
  }
  const m = managerReport(s, f);
  return [...head, ["Alcance", "Ventas contratadas (USD)", "Cobrado (USD)", "Saldo por cobrar (USD)", "Vencido (USD)", "Ingresos del período (USD)", "Egresos del período (USD)", "Vendidas / total de unidades", "Unidad disponible"],
    ...m.rows.map((r) => [r.name, r.fin.contracted, r.fin.collected, r.fin.balance, r.fin.overdue, r.fin.inflow, r.fin.outflow, `${r.sales.sold} / ${r.sales.total}`, r.sales.available]),
    [], ["Alertas importantes"], ["Proyecto", "Alerta", "Detalle", "Monto (USD)"], ...m.alerts.map((a) => [pname(a.project), a.title, a.detail, a.amount ?? ""])];
}

export const REPORT_TITLES: Record<ReportKind, string> = {
  caja: "Situación financiera general",
  satis: "Informe de ventas",
  "cuotas": "Informe de cuotas y mora",
  barter: "Informe de canjes",
  taseron: "Informe de contratistas y certificados",
  yonetici: "Informe gerencial",
};
