// Raporlama motoru. Tüm rakamlar o anki durumdan (EnterpriseState) hesaplanır; sabit veya
// tahmini finansal değer yoktur. Kapsam kuralları:
// - "Durum" göstergeleri (sözleşmeli satış, kalan alacak, gecikme) senaryo tarihine (SNAPSHOT) göredir.
// - "Dönem" göstergeleri (kasaya giren/çıkan, mahsup, imzalanan satış) tarih filtresine uygulanır.
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
    ? `${f.from ? fmt(f.from) : "başlangıç"} – ${f.to ? fmt(f.to) : "bugün"}`
    : "Tüm dönemler";
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
  // yalnızca "Tüm dönemler" toplamında yer alır ve ayrıca belirtilir.
  const dated = !f.from && !f.to;
  const requests = requestList(s).filter((r) => inScope(f, r.project));
  const paidRows = requests
    .filter((r) => requestStatus(s, r) === "Ödendi")
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
    inflowDeposit: inflowBy(["Peşinat"]),
    inflowInstallment: inflowBy(["Taksit", "Tahsilat", "İptal"]),
    inflowInterim: inflowBy(["Ara ödeme"]),
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
      requests.filter((r) => requestStatus(s, r) === "Onaylandı"),
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
    sold.has(id) ? "Satıldı" : drafts.has(id) ? "İmza sürecinde" : barter.has(id) ? "Barter" : reserved.has(id) ? "Rezerve" : "Müsait";
  const scopeUnits = units.filter((u) => inScope(f, u.project));
  const row = (list: typeof scopeUnits) => {
    const soldList = list.filter((u) => sold.has(u.id)).map((u) => sold.get(u.id)!);
    const value = sum(soldList, (c) => c.price);
    const collected = sum(soldList, (c) => acct(s, c).collected);
    return {
      total: list.length,
      sold: soldList.length,
      inSigning: list.filter((u) => status(u.id) === "İmza sürecinde").length,
      barter: list.filter((u) => status(u.id) === "Barter").length,
      reserved: list.filter((u) => status(u.id) === "Rezerve").length,
      available: list.filter((u) => status(u.id) === "Müsait").length,
      value,
      collected,
      rate: value ? collected / value : 0,
      avgPrice: soldList.length ? r2(value / soldList.length) : 0,
      availableListValue: sum(list.filter((u) => status(u.id) === "Müsait"), (u) => u.listPrice),
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
  { key: "0-30", label: "0–30 gün", min: 1, max: 30 },
  { key: "31-60", label: "31–60 gün", min: 31, max: 60 },
  { key: "61-90", label: "61–90 gün", min: 61, max: 90 },
  { key: "90+", label: "90+ gün", min: 91, max: Infinity },
] as const;

export function installmentReport(s: EnterpriseState, f: ReportFilter, horizonDays = 90) {
  syncCatalog(s);
  const names = new Map(customerList(s).map((c) => [c.id, c]));
  const rows = paymentRows(s).filter((r) => inScope(f, r.project) && r.remaining > 0);
  const overdueRows = rows.filter((r) => r.status === "Gecikti" && inRange(f, r.due));
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
      approved: sum(by("Onaylandı"), (r) => r.amount),
      paid: sum(by("Ödendi"), (r) => r.amount),
      pending: sum(by("Onay bekliyor"), (r) => r.amount),
      cashPaid: sum(by("Ödendi"), (r) => netPayable(s, r)),
      cashDue: sum(by("Onaylandı"), (r) => netPayable(s, r)),
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
    return { project: p, name: p === "all" ? "Şirket toplamı" : pname(p), fin, sales, inst };
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
        title: `${inst.perCustomer.length} müşteride geciken ödeme`,
        detail: `En uzun gecikme ${inst.perCustomer[0]?.maxDays ?? 0} gün · ${inst.perCustomer[0]?.name ?? ""}${sm.depositOverdue > 0 ? ` · ${new Intl.NumberFormat("tr-TR").format(sm.depositOverdue)} TL peşinat parçası dahil` : ""}`,
        amount: inst.overdueTotal,
        href: "/odemeler?durum=Gecikti",
      });
    const drafts = (s.drafts ?? []).filter((d) => d.project === p.id);
    if (drafts.length)
      alerts.push({ tone: "warning", project: p.id, title: `${drafts.length} sözleşme imza sürecinde`, detail: drafts.map((d) => `${contractNumber(d.id)} · ${d.name}`).join(", "), amount: sum(drafts, (d) => d.price), href: "/sozlesmeler" });
    const pending = requestList(s).filter((r) => r.project === p.id && requestStatus(s, r) === "Onay bekliyor");
    if (pending.length)
      alerts.push({ tone: "info", project: p.id, title: `${pending.length} talep onay bekliyor`, detail: pending.map((r) => `${r.id} · ${r.company}`).join(", "), amount: sum(pending, (r) => r.amount), href: "/operasyon" });
    const approved = requestList(s).filter((r) => r.project === p.id && requestStatus(s, r) === "Onaylandı");
    if (approved.length)
      alerts.push({ tone: "info", project: p.id, title: `${approved.length} onaylı ödeme bekliyor`, detail: approved.map((r) => `${r.id} · ${r.company}`).join(", "), amount: sum(approved, (r) => netPayable(s, r)), href: "/operasyon" });
    for (const b of s.barters.filter((b) => b.project === p.id)) {
      const days = daysBetween(SNAPSHOT, b.end);
      const rem = r2(b.amount - barterOffset(s, b.id));
      if (rem > 0 && days <= 90)
        alerts.push({ tone: "warning", project: p.id, title: `${b.id} barter işi ${days} gün içinde bitmeli`, detail: `${b.company} · kalan yükümlülük`, amount: rem, href: "/barter" });
    }
  }
  return { rows, alerts };
}

/* ------------------------------------------------------------------ */
/* CSV satırları (dışa aktarma; dosyayı lib/export.ts üretir)           */
/* ------------------------------------------------------------------ */
export type ReportKind = "finans" | "satis" | "taksit" | "barter" | "taseron" | "yonetici";
export function reportCsv(s: EnterpriseState, kind: ReportKind, f: ReportFilter): (string | number)[][] {
  syncCatalog(s);
  const head: (string | number)[][] = [
    [`SANE İnşaat · ${REPORT_TITLES[kind]}`],
    ["Kapsam", f.project === "all" ? "Tüm projeler" : pname(f.project)],
    ["Dönem", periodLabel(f)],
    ["Senaryo tarihi", fmt(SNAPSHOT)],
    [],
  ];
  if (kind === "finans") {
    const a = financialReport(s, f);
    return [...head, ["Gösterge", "Tutar (TL)", "Kapsam"],
      ["Toplam sözleşmeli satış", a.contracted, "Durum"], ["Toplam tahsil edilen", a.collected, "Durum"], ["Kalan alacak", a.balance, "Durum"],
      ["Geciken alacak (taksit + ara ödeme)", a.overdueInstallments, "Durum"], ["Geciken peşinat", a.overdueDeposits, "Durum"], ["Geciken alacak toplamı", a.overdue, "Durum"],
      ["Kasaya giren — peşinat", a.inflowDeposit, "Dönem"], ["Kasaya giren — taksit", a.inflowInstallment, "Dönem"], ["Kasaya giren — ara ödeme", a.inflowInterim, "Dönem"], ["Kasaya giren toplam", a.inflow, "Dönem"],
      ["Kasadan çıkan (ödenen hakediş/satın alma nakit kısmı)", a.outflow, "Dönem · gerçek ödeme tarihine göre"], ["Net nakit akışı", a.net, "Dönem"],
      ["Barter mahsubu (nakit dışı)", a.barterOffset, "Dönem"], ["Barter anlaşma değeri (nakit dışı)", a.barterValue, "Durum"], ["Barter kalan yükümlülük", a.barterRemaining, "Durum"],
      ["Onaylı, ödenmemiş nakit borç", a.payableApproved, "Durum"]];
  }
  if (kind === "satis") {
    const b = salesReport(s, f);
    return [...head, ["Proje", "Daire tipi", "Toplam", "Satılan", "İmza sürecinde", "Barter", "Rezerve", "Müsait", "Satış bedeli (TL)", "Tahsil edilen (TL)", "Tahsilat oranı %", "Ortalama satış (TL)"],
      ...b.byType.map((r) => [r.name, r.type, r.total, r.sold, r.inSigning, r.barter, r.reserved, r.available, r.value, r.collected, Math.round(r.rate * 1000) / 10, r.avgPrice]),
      [], ["Dönemde imzalanan satışlar"], ["Sözleşme", "Müşteri", "Proje", "Daire", "İmza", "Bedel (TL)", "Tahsil edilen (TL)"],
      ...b.signedInPeriod.map((r) => [r.number, r.name, pname(r.project), r.unit, fmt(r.signed), r.price, r.collected])];
  }
  if (kind === "taksit") {
    const c = installmentReport(s, f);
    return [...head, ["Gecikme aralığı", "Ödeme sayısı", "Müşteri", "Tutar (TL)"], ...c.aging.map((a) => [a.label, a.count, a.customers, a.amount]),
      [], ["Müşteri bazlı gecikme"], ["Sözleşme", "Müşteri", "Proje", "Daire", "Geciken ödeme", "En eski vade", "Gecikme (gün)", "Kısmi ödenen (TL)", "Geciken tutar (TL)"],
      ...c.perCustomer.map((r) => [r.number, r.name, pname(r.project), r.unit, r.count, fmt(r.oldest), r.maxDays, r.partialPaid, r.amount]),
      [], ["Yaklaşan tahsilatlar"], ["Vade", "Sözleşme", "Müşteri", "Ödeme", "Durum", "Kalan (TL)"],
      ...c.upcomingRows.map((r) => [fmt(r.due), r.number, r.name, r.label, r.status, r.remaining])];
  }
  if (kind === "barter") {
    const d = barterReport(s, f);
    return [...head, ["Barter", "Firma", "Proje", "Daire", "Liste değeri (TL)", "Anlaşma bedeli (TL)", "Mahsup edilen (TL)", "Dönem mahsubu (TL)", "Kalan yükümlülük (TL)", "İlerleme %", "Tapu devri"],
      ...d.rows.map((r) => [r.id, r.company, pname(r.project), r.unit, r.listValue, r.amount, r.offset, r.offsetInPeriod, r.remaining, r.progress, r.transfer])];
  }
  if (kind === "taseron") {
    const e = subcontractorReport(s, f);
    return [...head, ["Sözleşme", "Firma", "Proje", "İş paketleri", "Sözleşme bedeli (TL)", "Hakediş (TL)", "Onaylı (TL)", "Ödenmiş (TL)", "Onay bekleyen (TL)", "Nakit ödenen (TL)", "Barter mahsubu (TL)"],
      ...e.rows.map((r) => [r.id, r.company, pname(r.project), r.packages, r.value, r.hakedis, r.approved, r.paid, r.pending, r.cashPaid, r.barterOffset])];
  }
  const m = managerReport(s, f);
  return [...head, ["Kapsam", "Sözleşmeli satış (TL)", "Tahsil edilen (TL)", "Kalan alacak (TL)", "Geciken (TL)", "Dönemde kasaya giren (TL)", "Dönemde kasadan çıkan (TL)", "Satılan / toplam daire", "Müsait daire"],
    ...m.rows.map((r) => [r.name, r.fin.contracted, r.fin.collected, r.fin.balance, r.fin.overdue, r.fin.inflow, r.fin.outflow, `${r.sales.sold} / ${r.sales.total}`, r.sales.available]),
    [], ["Önemli uyarılar"], ["Proje", "Uyarı", "Ayrıntı", "Tutar (TL)"], ...m.alerts.map((a) => [pname(a.project), a.title, a.detail, a.amount ?? ""])];
}

export const REPORT_TITLES: Record<ReportKind, string> = {
  finans: "Finansal genel durum",
  satis: "Satış raporu",
  taksit: "Taksit ve gecikme raporu",
  barter: "Barter raporu",
  taseron: "Taşeron ve hakediş raporu",
  yonetici: "Yönetici raporu",
};
