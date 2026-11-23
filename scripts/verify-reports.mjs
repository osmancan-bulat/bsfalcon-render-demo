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
const C = { project: "corner" };
const P = { project: "primador" };

test("Company totals are exactly the sum of the two projects in every report", () => {
  const s = seed();
  const add = (a, b, keys) => keys.forEach((k) => assert.equal(r2(a[k] + b[k]), ALLV[k], k));
  let ALLV = financialReport(s, ALL);
  add(financialReport(s, C), financialReport(s, P), ["contracted", "collected", "balance", "overdue", "inflow", "outflow", "barterOffset", "barterValue", "barterRemaining", "payableApproved"]);
  ALLV = salesReport(s, ALL).total;
  add(salesReport(s, C).total, salesReport(s, P).total, ["total", "sold", "inSigning", "barter", "reserved", "available", "value", "collected"]);
  ALLV = installmentReport(s, ALL);
  add(installmentReport(s, C), installmentReport(s, P), ["overdueTotal", "overdueCount", "upcomingTotal", "upcomingCount"]);
  ALLV = barterReport(s, ALL).totals;
  add(barterReport(s, C).totals, barterReport(s, P).totals, ["count", "amount", "offset", "remaining"]);
  ALLV = subcontractorReport(s, ALL).totals;
  add(subcontractorReport(s, C).totals, subcontractorReport(s, P).totals, ["value", "hakedis", "approved", "paid", "pending", "barterOffset"]);
  // Stok: her daire tam bir durumda
  const t = salesReport(s, ALL).total;
  assert.equal(t.sold + t.inSigning + t.barter + t.reserved + t.available, units.length);
});

test("Project-scoped reports never contain another project's records", () => {
  const s = seed();
  for (const [f, other] of [[C, "primador"], [P, "corner"]]) {
    assert(installmentReport(s, f).perCustomer.every((r) => r.project === f.project));
    assert(installmentReport(s, f).upcomingRows.every((r) => r.project === f.project));
    assert(barterReport(s, f).rows.every((r) => r.project === f.project));
    assert(subcontractorReport(s, f).rows.every((r) => r.project === f.project));
    assert(salesReport(s, f).byType.every((r) => r.project === f.project));
    assert(salesReport(s, f).signedInPeriod.every((r) => r.project === f.project));
    assert(financialReport(s, f).outflowRows.every((r) => r.project === f.project));
    assert(managerReport(s, f).alerts.every((a) => a.project === f.project));
    assert(!JSON.stringify(reportCsv(s, "taksit", f)).includes(other === "corner" ? "SZL-CP-" : "SZL-PE-"));
  }
});

test("Reports reconcile one-to-one with financial records", () => {
  const s = seed();
  for (const f of [ALL, C, P]) {
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
  const row = paymentRows(s0).find((r) => r.project === "corner" && r.status === "Gecikti" && r.kind === "Taksit" && r.paid === 0);
  const s1 = applyAction(s0, { type: "receipt", installmentId: row.installmentId, amount: row.remaining, method: "Banka havalesi", reference: "HVL-RAPOR" });
  const nov = { project: "corner", from: "2026-11-01", to: "2026-11-30" };
  const [a0, a1] = [financialReport(s0, nov), financialReport(s1, nov)];
  assert.equal(a1.collected, r2(a0.collected + row.remaining));
  assert.equal(a1.balance, r2(a0.balance - row.remaining));
  assert.equal(a1.overdue, r2(a0.overdue - row.remaining));
  assert.equal(a1.inflow, r2(a0.inflow + row.remaining));
  assert.equal(a1.inflowInstallment, r2(a0.inflowInstallment + row.remaining));
  assert.equal(a1.contracted, a0.contracted);
  assert.equal(a1.outflow, a0.outflow);
  assert.equal(a1.barterOffset, a0.barterOffset);
  const [c0, c1] = [installmentReport(s0, C), installmentReport(s1, C)];
  assert.equal(c1.overdueTotal, r2(c0.overdueTotal - row.remaining));
  assert.equal(c1.overdueCount, c0.overdueCount - 1);
  assert.equal(salesReport(s1, C).total.collected, r2(salesReport(s0, C).total.collected + row.remaining));
  // Diğer proje aynı kalır
  assert.deepEqual(financialReport(s1, P), financialReport(s0, P));
  assert.deepEqual(installmentReport(s1, P), installmentReport(s0, P));
  // Ekim dönemi değişmez (tahsilat 15 Kasım tarihli)
  const oct = { project: "corner", from: "2026-10-01", to: "2026-10-31" };
  assert.equal(financialReport(s1, oct).inflow, financialReport(s0, oct).inflow);
});

test("A partial receipt reduces the aging bucket by the paid part only", () => {
  const s0 = seed();
  const row = paymentRows(s0).find((r) => r.status === "Gecikti" && r.kind === "Taksit" && r.paid === 0);
  const s1 = applyAction(s0, { type: "receipt", installmentId: row.installmentId, amount: 10000, method: "Banka havalesi", reference: "HVL-KISMI" });
  const f = { project: row.project };
  const [c0, c1] = [installmentReport(s0, f), installmentReport(s1, f)];
  assert.equal(c1.overdueTotal, r2(c0.overdueTotal - 10000));
  assert.equal(c1.overdueCount, c0.overdueCount);
  const who = c1.perCustomer.find((x) => x.id === row.customerId);
  assert.equal(who.partialPaid, r2((c0.perCustomer.find((x) => x.id === row.customerId).partialPaid) + 10000));
});

test("A barter offset changes only barter and progress-payment figures, never cash or receivables", () => {
  let s0 = seed();
  const hak = requestList(s0).find((r) => r.id === "HAK-024");
  s0 = applyAction(s0, { type: "approve", id: "HAK-024" });
  assert.equal(requestStatus(s0, hak), "Onaylandı");
  const b = s0.barters.find((x) => x.company === hak.company && x.project === hak.project);
  const s1 = applyAction(s0, { type: "barter-offset", barterId: b.id, requestId: "HAK-024", amount: 300000 });
  const [a0, a1] = [financialReport(s0, C), financialReport(s1, C)];
  for (const k of ["contracted", "collected", "balance", "overdue", "inflow", "outflow"]) assert.equal(a1[k], a0[k], k);
  assert.equal(a1.barterOffset, r2(a0.barterOffset + 300000));
  assert.equal(a1.barterRemaining, r2(a0.barterRemaining - 300000));
  assert.equal(a1.payableApproved, r2(a0.payableApproved - 300000));
  const [d0, d1] = [barterReport(s0, C), barterReport(s1, C)];
  assert.equal(d1.rows.find((x) => x.id === b.id).remaining, r2(d0.rows.find((x) => x.id === b.id).remaining - 300000));
  for (const other of d1.rows.filter((x) => x.id !== b.id)) assert.deepEqual(other, d0.rows.find((x) => x.id === other.id));
  const [e0, e1] = [subcontractorReport(s0, C), subcontractorReport(s1, C)];
  const w0 = e0.rows.find((x) => x.company === hak.company), w1 = e1.rows.find((x) => x.company === hak.company);
  assert.equal(w1.barterOffset, r2(w0.barterOffset + 300000));
  assert.equal(w1.cashDue, r2(w0.cashDue - 300000));
  assert.equal(w1.hakedis, w0.hakedis);
  assert.deepEqual(financialReport(s1, P), financialReport(s0, P));
  assert.equal(netPayable(s1, requestList(s1).find((r) => r.id === "HAK-024")), r2(hak.amount - 300000));
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
  for (const row of paymentRows(s).filter((r) => r.status === "Gecikti")) {
    const d = -row.days;
    assert.equal(AGING.filter((b) => d >= b.min && d <= b.max).length, 1, `${row.id} ${d}`);
  }
  assert(SNAPSHOT === "2026-11-15");
});

test("CSV export produces a real Excel-compatible file for every report", () => {
  const s = seed();
  for (const kind of ["finans", "satis", "taksit", "barter", "taseron", "yonetici"]) {
    for (const f of [ALL, C, { project: "primador", from: "2026-11-01", to: "2026-11-30" }]) {
      const rows = reportCsv(s, kind, f);
      assert(rows.length > 6, kind);
      const csv = toCsv(rows);
      assert(csv.startsWith("﻿"));
      assert(csv.includes("TEMSİLİ DEMO VERİSİ"));
      const lines = csv.split("\r\n");
      assert.equal(lines.length, rows.length + 1);
      for (const l of lines.slice(1)) if (l) assert(/^"/.test(l), l);
      assert(!csv.includes("undefined") && !csv.includes("NaN"), kind);
    }
  }
  // Rakamlar sayı olarak, ayırıcı noktalı virgül; formül enjeksiyonu engellenir
  const fin = reportCsv(s, "finans", ALL);
  assert.equal(fin.find((r) => r[0] === "Toplam sözleşmeli satış")[1], financialReport(s, ALL).contracted);
  assert.equal(toCsv([["=1+1", 'a"b', 5, 3550000.75]]).split("\r\n")[1], `"'=1+1";"a""b";"5";"3550000,75"`);
});

test("Cash outflow uses the recorded payment date, never the due date; undated payments are not assigned to a period", () => {
  let s = seed();
  // Seed: HAK-026 vadesi 8 Kasım, ödeme 8 Kasım olarak kayıtlı
  assert.equal(paidDate(s, "HAK-026"), "2026-11-08");
  // Vadesi Aralık olan onaylı talep 15 Kasım'da ödenir → Kasım dönemi çıkışıdır, Aralık değil
  s = applyAction(s, { type: "request", record: { id: "HAK-900", project: "corner", company: "Karataş Yapı Taahhüt", name: "Test hakedişi", type: "Hakediş", amount: 100000, due: "2026-12-20", status: "Onay bekliyor" } });
  const id = s.requests.find((r) => r.name === "Test hakedişi").id;
  s = applyAction(s, { type: "approve", id });
  s = applyAction(s, { type: "pay-order", id });
  assert.equal(paidDate(s, id), SNAPSHOT);
  const nov = financialReport(s, { project: "corner", from: "2026-11-01", to: "2026-11-30" });
  const dec = financialReport(s, { project: "corner", from: "2026-12-01", to: "2026-12-31" });
  assert(nov.outflowRows.some((r) => r.id === id && r.paidAt === SNAPSHOT && r.due === "2026-12-20"));
  assert(!dec.outflowRows.some((r) => r.id === id));
  assert.equal(nov.outflow, r2(560000 + 100000));
  // Ödeme tarihi kaydı olmayan (önceki sürüm) ödeme: dönemlere dağıtılmaz, tüm dönem toplamında kalır
  const legacy = structuredClone(s);
  delete legacy.paidDates[id];
  const all = financialReport(legacy, { project: "corner" });
  const novL = financialReport(legacy, { project: "corner", from: "2026-11-01", to: "2026-11-30" });
  assert.equal(all.outflow, r2(660000));
  assert.equal(novL.outflow, 560000);
  assert.equal(all.undatedPaidCount, 1);
  assert.equal(all.undatedPaidAmount, 100000);
  assert(all.outflowRows.some((r) => r.id === id && !r.paidAt));
  // Tüm dönem çıkışı, kasa hesabındaki ödenen tutarla aynıdır
  assert.equal(all.outflow, summary(legacy, "corner").paid);
  // Önceki sürümden aktarılan veride seed ödeme tarihi korunur
  const raw = JSON.stringify({ ...seed(), paidDates: undefined, dataset: undefined, basePricing: undefined });
  assert.equal(paidDate(migrateSaved(raw).state, "HAK-026"), "2026-11-08");
});

test("Available units equal units that are neither sold, in signing, bartered nor reserved", () => {
  const s = seed();
  for (const p of ["corner", "primador"]) {
    const res = new Set(reservedUnits(s, p));
    const free = units.filter((u) => u.project === p && !unitTaken(s, u.id) && !res.has(u.id)).length;
    assert.equal(salesReport(s, { project: p }).total.available, free, p);
  }
  // Taslak sözleşme daireyi müsait listesinden çıkarır
  assert.equal(salesReport(s, C).total.available, 22);
});

console.log(`${checks} reporting & multi-project suites passed.`);
