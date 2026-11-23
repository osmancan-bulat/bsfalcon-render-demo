// Raporlama ve çok projeli kapsam regresyonları: raporlar finansal kayıtlarla birebir tutarlı olmalı,
// projeler birbirine karışmamalı, tahsilat ve barter mahsubu yalnızca ilgili kalemleri etkilemeli.
import assert from "node:assert/strict";
import {
  seedState,
  applyAction,
  summary,
  customerList,
  accountOf,
  customerLedger,
  paymentRows,
  requestList,
  requestStatus,
  netPayable,
  barterOffset,
  collectionBreakdown,
  SNAPSHOT,
  paidDate,
  unitTaken,
  reservedUnits,
  migrateSaved,
} from "../lib/enterprise.ts";
import {
  financialReport,
  salesReport,
  installmentReport,
  barterReport,
  subcontractorReport,
  managerReport,
  reportCsv,
  inRange,
  AGING,
} from "../lib/reports.ts";
import { toCsv } from "../lib/export.ts";
import { units } from "../lib/units.ts";

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);
const r2 = (n) => Math.round(n * 100) / 100;
const ALL = { project: "all" };
const C = { project: "vtower" };
const P = { project: "alion" };
const B = { project: "business" };
const L = { project: "lofty" };
const PROJECTS = [L, P, C, B];

test("Company totals are exactly the sum of the four projects in every report", () => {
  const s = seed();
  const add = (fn, keys) => {
    const all = fn(ALL);
    keys.forEach((k) => assert.equal(r2(PROJECTS.reduce((x, f) => x + fn(f)[k], 0)), all[k], k));
  };
  add((f) => financialReport(s, f), ["contracted", "collected", "balance", "overdue", "inflow", "outflow", "barterOffset", "barterValue", "barterRemaining", "payableApproved"]);
  add((f) => salesReport(s, f).total, ["total", "sold", "inSigning", "barter", "reserved", "available", "value", "collected"]);
  add((f) => installmentReport(s, f), ["overdueTotal", "overdueCount", "upcomingTotal", "upcomingCount"]);
  add((f) => barterReport(s, f).totals, ["count", "amount", "offset", "remaining"]);
  add((f) => subcontractorReport(s, f).totals, ["value", "hakedis", "approved", "paid", "pending", "barterOffset"]);
  // Stock: cada unidad en exactamente un estado
  const t = salesReport(s, ALL).total;
  assert.equal(t.sold + t.inSigning + t.barter + t.reserved + t.landowner + t.available, units.length);
});

test("Project-scoped reports never contain another project's records", () => {
  const s = seed();
  for (const [f, other] of [[L, "alion"], [C, "alion"], [P, "vtower"], [B, "vtower"]]) {
    assert(installmentReport(s, f).perCustomer.every((r) => r.project === f.project));
    assert(installmentReport(s, f).upcomingRows.every((r) => r.project === f.project));
    assert(barterReport(s, f).rows.every((r) => r.project === f.project));
    assert(subcontractorReport(s, f).rows.every((r) => r.project === f.project));
    assert(salesReport(s, f).byType.every((r) => r.project === f.project));
    assert(salesReport(s, f).signedInPeriod.every((r) => r.project === f.project));
    assert(financialReport(s, f).outflowRows.every((r) => r.project === f.project));
    assert(managerReport(s, f).alerts.every((a) => a.project === f.project));
    assert(!JSON.stringify(reportCsv(s, "cuotas", f)).includes(other === "vtower" ? "CTR-VTL-" : "CTR-ALN-"));
  }
});

test("Reports reconcile one-to-one with financial records", () => {
  const s = seed();
  for (const f of [ALL, L, C, P, B]) {
    const a = financialReport(s, f);
    const sm = summary(s, f.project);
    assert.equal(a.contracted, sm.revenue);
    assert.equal(a.collected, sm.collected);
    assert.equal(a.balance, sm.balance);
    assert.equal(a.overdue, sm.overdueTotal);
    // Tüm dönemlerin kasaya gireni = toplam tahsilat (cari hesap hareketleri)
    assert.equal(a.inflow, a.collected);
    assert.equal(a.inflow, collectionBreakdown(s, f.project).total);
    assert.equal(r2(a.inflowDeposit + a.inflowInstallment + a.inflowInterim), a.inflow);
    assert.equal(salesReport(s, f).total.value, sm.revenue);
    const c = installmentReport(s, f);
    assert.equal(c.overdueTotal, sm.overdueTotal);
    assert.equal(r2(c.aging.reduce((x, b) => x + b.amount, 0)), c.overdueTotal);
    assert.equal(r2(c.perCustomer.reduce((x, b) => x + b.amount, 0)), c.overdueTotal);
    const d = barterReport(s, f);
    assert.equal(d.totals.offset, r2(s.barters.filter((b) => f.project === "all" || b.project === f.project).reduce((x, b) => x + barterOffset(s, b.id), 0)));
    assert.equal(a.outflow, sm.paid);
  }
  // Yönetici raporu: şirket satırı proje satırlarının toplamı; uyarılarda tutar çift sayılmaz
  const m = managerReport(s, ALL);
  const total = m.rows.find((r) => r.project === "all");
  assert.equal(total.fin.contracted, r2(m.rows.filter((r) => r.project !== "all").reduce((x, r) => x + r.fin.contracted, 0)));
  const danger = m.alerts.filter((x) => x.tone === "danger").reduce((x, a) => x + a.amount, 0);
  assert.equal(r2(danger), financialReport(s, ALL).overdue);
});

test("A full installment receipt flows into every report of its project only", () => {
  const s0 = seed();
  const row = paymentRows(s0).find((r) => r.project === "alion" && r.status === "Vencida" && r.kind === "Cuota" && r.paid === 0);
  const s1 = applyAction(s0, { type: "receipt", installmentId: row.installmentId, amount: row.remaining, method: "Transferencia bancaria", reference: "HVL-RAPOR" });
  const nov = { project: "alion", from: "2026-11-01", to: "2026-11-30" };
  const [a0, a1] = [financialReport(s0, nov), financialReport(s1, nov)];
  assert.equal(a1.collected, r2(a0.collected + row.remaining));
  assert.equal(a1.balance, r2(a0.balance - row.remaining));
  assert.equal(a1.overdue, r2(a0.overdue - row.remaining));
  assert.equal(a1.inflow, r2(a0.inflow + row.remaining));
  assert.equal(a1.inflowInstallment, r2(a0.inflowInstallment + row.remaining));
  assert.equal(a1.contracted, a0.contracted);
  assert.equal(a1.outflow, a0.outflow);
  assert.equal(a1.barterOffset, a0.barterOffset);
  const [c0, c1] = [installmentReport(s0, P), installmentReport(s1, P)];
  assert.equal(c1.overdueTotal, r2(c0.overdueTotal - row.remaining));
  assert.equal(c1.overdueCount, c0.overdueCount - 1);
  assert.equal(salesReport(s1, P).total.collected, r2(salesReport(s0, P).total.collected + row.remaining));
  // Diğer proje aynı kalır
  assert.deepEqual(financialReport(s1, C), financialReport(s0, C));
  assert.deepEqual(installmentReport(s1, C), installmentReport(s0, C));
  // Ekim dönemi değişmez (tahsilat 15 Kasım tarihli)
  const oct = { project: "alion", from: "2026-10-01", to: "2026-10-31" };
  assert.equal(financialReport(s1, oct).inflow, financialReport(s0, oct).inflow);
});

test("A partial receipt reduces the aging bucket by the paid part only", () => {
  const s0 = seed();
  const row = paymentRows(s0).find((r) => r.status === "Vencida" && r.kind === "Cuota" && r.paid === 0);
  const s1 = applyAction(s0, { type: "receipt", installmentId: row.installmentId, amount: 100, method: "Transferencia bancaria", reference: "TRF-PARCIAL" });
  const f = { project: row.project };
  const [c0, c1] = [installmentReport(s0, f), installmentReport(s1, f)];
  assert.equal(c1.overdueTotal, r2(c0.overdueTotal - 100));
  assert.equal(c1.overdueCount, c0.overdueCount);
  const who = c1.perCustomer.find((x) => x.id === row.customerId);
  assert.equal(who.partialPaid, r2((c0.perCustomer.find((x) => x.id === row.customerId).partialPaid) + 100));
});

test("A barter offset changes only barter and progress-payment figures, never cash or receivables", () => {
  let s0 = seed();
  // HAK-025 (ALION · fachada) está aprobado en el escenario; se registra un canje de prueba con el mismo proveedor
  const hak = requestList(s0).find((r) => r.id === "HAK-025");
  s0 = applyAction(s0, { type: "barter", record: { id: "BRT-T", project: "alion", unitId: "alion-40", company: hak.company, work: "Fachada", amount: 15000, start: "2026-11-01", end: "2027-03-01", progress: 20, transfer: "Pendiente" } });
  assert.equal(requestStatus(s0, hak), "Aprobado");
  const b = s0.barters.find((x) => x.company === hak.company && x.project === hak.project);
  const s1 = applyAction(s0, { type: "barter-offset", barterId: b.id, requestId: "HAK-025", amount: 5000 });
  const [a0, a1] = [financialReport(s0, P), financialReport(s1, P)];
  for (const k of ["contracted", "collected", "balance", "overdue", "inflow", "outflow"]) assert.equal(a1[k], a0[k], k);
  assert.equal(a1.barterOffset, r2(a0.barterOffset + 5000));
  assert.equal(a1.barterRemaining, r2(a0.barterRemaining - 5000));
  assert.equal(a1.payableApproved, r2(a0.payableApproved - 5000));
  const [d0, d1] = [barterReport(s0, P), barterReport(s1, P)];
  assert.equal(d1.rows.find((x) => x.id === b.id).remaining, r2(d0.rows.find((x) => x.id === b.id).remaining - 5000));
  for (const other of d1.rows.filter((x) => x.id !== b.id)) assert.deepEqual(other, d0.rows.find((x) => x.id === other.id));
  const [e0, e1] = [subcontractorReport(s0, P), subcontractorReport(s1, P)];
  const w0 = e0.rows.find((x) => x.company === hak.company), w1 = e1.rows.find((x) => x.company === hak.company);
  assert.equal(w1.barterOffset, r2(w0.barterOffset + 5000));
  assert.equal(w1.cashDue, r2(w0.cashDue - 5000));
  assert.equal(w1.hakedis, w0.hakedis);
  assert.deepEqual(financialReport(s1, C), financialReport(s0, C));
  assert.equal(netPayable(s1, requestList(s1).find((r) => r.id === "HAK-025")), r2(netPayable(s0, requestList(s0).find((r) => r.id === "HAK-025")) - 5000));
});

test("Date filters work: inflow by period equals ledger credits in that period", () => {
  const s = seed();
  const ranges = [
    { from: "2026-11-01", to: "2026-11-30" },
    { from: "2026-08-01", to: "2026-10-31" },
    { from: "2027-01-01", to: "2027-12-31" },
    { to: "2026-06-30" },
  ];
  for (const r of ranges) {
    const f = { project: "all", ...r };
    const expected = r2(customerList(s).flatMap((c) => customerLedger(s, c.id)).filter((e) => e.credit > 0 && inRange(f, e.date)).reduce((x, e) => x + e.credit, 0));
    assert.equal(financialReport(s, f).inflow, expected, JSON.stringify(r));
  }
  assert.equal(financialReport(s, { project: "all", from: "2027-01-01", to: "2027-12-31" }).inflow, 0);
  // Sum of disjoint periods = all-time inflow
  const parts = [{ to: "2026-10-31" }, { from: "2026-11-01" }].map((r) => financialReport(s, { project: "all", ...r }).inflow);
  assert.equal(r2(parts[0] + parts[1]), financialReport(s, ALL).inflow);
  // Upcoming installments in a future window only include rows due in that window
  const win = installmentReport(s, { project: "all", from: "2026-12-01", to: "2026-12-31" });
  assert(win.upcomingRows.length > 0 && win.upcomingRows.every((r) => r.due.startsWith("2026-12")));
  assert.equal(win.overdueTotal, 0);
  // Aging buckets cover every overdue day count exactly once
  for (const row of paymentRows(s).filter((r) => r.status === "Vencida")) {
    const d = -row.days;
    assert.equal(AGING.filter((b) => d >= b.min && d <= b.max).length, 1, `${row.id} ${d}`);
  }
  assert(SNAPSHOT === "2026-11-15");
});

test("CSV export produces a real Excel-compatible file for every report", () => {
  const s = seed();
  for (const kind of ["caja", "satis", "cuotas", "taseron", "yonetici"]) {
    for (const f of [ALL, C, { project: "alion", from: "2026-11-01", to: "2026-11-30" }]) {
      const rows = reportCsv(s, kind, f);
      assert(rows.length > 6, kind);
      const csv = toCsv(rows);
      assert(csv.startsWith("﻿"));
      assert(csv.includes("DATOS DE DEMOSTRACIÓN"));
      const lines = csv.split("\r\n");
      assert.equal(lines.length, rows.length + 1);
      for (const l of lines.slice(1)) if (l) assert(/^"/.test(l), l);
      assert(!csv.includes("undefined") && !csv.includes("NaN"), kind);
    }
  }
  // Rakamlar sayı olarak, ayırıcı noktalı virgül; formül enjeksiyonu engellenir
  const fin = reportCsv(s, "caja", ALL);
  assert.equal(fin.find((r) => r[0] === "Total contratado")[1], financialReport(s, ALL).contracted);
  assert.equal(toCsv([["=1+1", 'a"b', 5, 3550000.75]]).split("\r\n")[1], `"'=1+1";"a""b";"5";"3550000,75"`);
});

test("Cash outflow uses the recorded payment date, never the due date; undated payments are not assigned to a period", () => {
  let s = seed();
  // Seed: HAK-026 vadesi 8 Kasım, ödeme 8 Kasım olarak kayıtlı
  assert.equal(paidDate(s, "HAK-026"), "2026-11-08");
  // Vadesi Aralık olan onaylı talep 15 Kasım'da ödenir → Kasım dönemi çıkışıdır, Aralık değil
  s = applyAction(s, { type: "request", record: { id: "HAK-900", project: "vtower", company: "Karataş Yapı Taahhüt", name: "Test hakedişi", type: "Certificado de obra", amount: 100000, due: "2026-12-20", status: "Pendiente de aprobación" } });
  const id = s.requests.find((r) => r.name === "Test hakedişi").id;
  s = applyAction(s, { type: "approve", id });
  s = applyAction(s, { type: "pay-order", id });
  assert.equal(paidDate(s, id), SNAPSHOT);
  const nov = financialReport(s, { project: "vtower", from: "2026-11-01", to: "2026-11-30" });
  const dec = financialReport(s, { project: "vtower", from: "2026-12-01", to: "2026-12-31" });
  assert(nov.outflowRows.some((r) => r.id === id && r.paidAt === SNAPSHOT && r.due === "2026-12-20"));
  assert(!dec.outflowRows.some((r) => r.id === id));
  assert.equal(nov.outflow, r2(4800 + 100000));
  // Ödeme tarihi kaydı olmayan (önceki sürüm) ödeme: dönemlere dağıtılmaz, tüm dönem toplamında kalır
  const legacy = structuredClone(s);
  delete legacy.paidDates[id];
  const all = financialReport(legacy, { project: "vtower" });
  const novL = financialReport(legacy, { project: "vtower", from: "2026-11-01", to: "2026-11-30" });
  assert.equal(all.outflow, r2(104800));
  assert.equal(novL.outflow, 4800);
  assert.equal(all.undatedPaidCount, 1);
  assert.equal(all.undatedPaidAmount, 100000);
  assert(all.outflowRows.some((r) => r.id === id && !r.paidAt));
  // Tüm dönem çıkışı, kasa hesabındaki ödenen tutarla aynıdır
  assert.equal(all.outflow, summary(legacy, "vtower").paid);
  // Önceki sürümden aktarılan veride seed ödeme tarihi korunur
  const raw = JSON.stringify({ ...seed(), paidDates: undefined, dataset: undefined, basePricing: undefined });
  assert.equal(paidDate(migrateSaved(raw).state, "HAK-026"), "2026-11-08");
});

test("Available units equal units that are neither sold, in signing, bartered nor reserved", () => {
  const s = seed();
  for (const p of ["lofty", "alion", "vtower", "business"]) {
    const res = new Set(reservedUnits(s, p));
    const free = units.filter((u) => u.project === p && !unitTaken(s, u.id) && !res.has(u.id)).length;
    assert.equal(salesReport(s, { project: p }).total.available, free, p);
  }
  // Taslak sözleşme daireyi müsait listesinden çıkarır
  // ALION: 64 − 22 vendidas − 1 en firma − 2 reservadas = 39 (sin propietarios de terreno)
  assert.equal(salesReport(s, P).total.available, 39);
  assert.equal(salesReport(s, P).total.landowner, 0);
});

console.log(`${checks} reporting & multi-project suites passed.`);
