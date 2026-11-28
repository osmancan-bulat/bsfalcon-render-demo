// v6 regresyonları: peşinat tahsilatı iptali, şantiye ilerlemesinin kaynağı, stok uzlaştırması,
// onarım raporu ve proje kartlarında kullanılan göstergelerin kaynak kayıtlarla tutarlılığı.
import assert from "node:assert/strict";
import {
  seedState,
  applyAction,
  summary,
  customerList,
  accountOf,
  customerLedger,
  migrateSaved,
  progressInfo,
  projectProgress,
  depositSchedule,
  paymentRows,
  projects,
} from "../lib/enterprise.ts";
import { financialReport, salesReport } from "../lib/reports.ts";
import { units } from "../lib/units.ts";
import { syncCatalog } from "../lib/catalog.ts";

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);
const r2 = (n) => Math.round(n * 100) / 100;

test("Deposit payment reversal is traceable and restores the deposit balance exactly", () => {
  let s = seed();
  const id = "nergis-51"; // USD sözleşme, kademeli peşinat: 25.000 $ parça gecikmiş, 25.000 $ Aralık
  const c0 = customerList(s).find((c) => c.id === id);
  const before = { acc: accountOf(s, c0), cash: summary(s, "nergis").cash, fin: financialReport(s, { project: "nergis" }) };
  s = applyAction(s, { type: "deposit-receipt", id, amount: 10000 });
  const pid = s.depositPayments.at(-1).id;
  const mid = accountOf(s, customerList(s).find((c) => c.id === id));
  assert.equal(mid.collected, r2(before.acc.collected + 10000));
  assert.equal(summary(s, "nergis").cash, r2(before.cash + 10000));
  assert.throws(() => applyAction(s, { type: "deposit-reverse", id: pid, reason: "" }), /gerekçe/);
  s = applyAction(s, { type: "deposit-reverse", id: pid, reason: "Yanlış müşteriye işlendi" });
  const c1 = customerList(s).find((c) => c.id === id);
  const after = accountOf(s, c1);
  assert.equal(after.collected, before.acc.collected);
  assert.equal(after.balance, before.acc.balance);
  assert.equal(summary(s, "nergis").cash, before.cash);
  assert.deepEqual(depositSchedule(c1).map((p) => p.remaining), depositSchedule(c0).map((p) => p.remaining));
  // Kayıt silinmez: tahsilat ve iptal satırı birlikte, iptal edilen işaretli
  assert.equal(s.depositPayments.length, 1);
  assert(s.depositPayments[0].reversal);
  const ledger = customerLedger(s, id);
  assert(ledger.some((e) => e.sourceId === pid && e.reversed && e.credit === 10000));
  assert(ledger.some((e) => e.kind === "İptal" && e.credit === -10000));
  assert.equal(ledger.at(-1).balance, after.balance);
  // İmzada alınan peşinat satırı değişmez
  assert.equal(ledger.find((e) => e.ref === "PSN-0").credit, ledger.find((e) => e.ref === "PSN-0").credit);
  assert.equal(financialReport(s, { project: "nergis" }).inflow, before.fin.inflow);
  assert.equal(financialReport(s, { project: "nergis" }).overdue, before.fin.overdue);
  assert.throws(() => applyAction(s, { type: "deposit-reverse", id: pid, reason: "Tekrar" }), /zaten/);
  // Düzeltme sonrası doğru tutar yeniden alınabilir
  s = applyAction(s, { type: "deposit-receipt", id, amount: 50000 });
  assert.equal(depositSchedule(customerList(s).find((c) => c.id === id)).at(-1).remaining, 0);
});

test("Partial receipt reversal restores only that receipt; other receipts on the same installment stay", () => {
  let s = seed();
  const row = paymentRows(s).find((r) => r.status === "Gecikti" && r.kind === "Taksit" && r.paid === 0);
  s = applyAction(s, { type: "receipt", installmentId: row.installmentId, amount: 1000, method: "Banka havalesi", reference: "A-1" });
  s = applyAction(s, { type: "receipt", installmentId: row.installmentId, amount: 500, method: "Banka havalesi", reference: "A-2" });
  const second = s.receipts.at(-1).id;
  s = applyAction(s, { type: "receipt-reverse", id: second, reason: "Yanlış tutar" });
  const r = paymentRows(s).find((x) => x.id === row.id);
  assert.equal(r.paid, 1000);
  assert.equal(r.remaining, r2(row.remaining - 1000));
});

test("Site progress is only reported when work package weights total 100%", () => {
  const s0 = seed();
  for (const p of ["cengilli", "nergis", "agva"]) {
    const info = progressInfo(s0, p);
    assert.equal(info.weight, 100);
    assert.equal(info.value, projectProgress(s0, p));
  }
  let s = applyAction(seed(), { type: "project-create", record: { name: "Test Proje", code: "TP", location: "", delivery: "", description: "" } });
  const id = s.projectsCustom.at(-1).id;
  assert.deepEqual(progressInfo(s, id), { packages: 0, weight: 0, value: null });
  s = applyAction(s, { type: "work-create", record: { project: id, name: "Kaba inşaat", company: "Toprak Yapı İnşaat", value: 1000000, weight: 60 } });
  assert.equal(progressInfo(s, id).value, null);
  assert.equal(progressInfo(s, id).weight, 60);
  s = applyAction(s, { type: "work-create", record: { project: id, name: "İnce işler", company: "Toprak Yapı İnşaat", value: 500000, weight: 40 } });
  assert.equal(progressInfo(s, id).value, 0);
  // Şantiye ilerlemesi finansal ilerlemeden bağımsızdır
  assert.equal(financialReport(s, { project: id }).collectionRate, 0);
});

test("Portfolio stock reconciles: total = sold + in signing + barter + reserved + landowner + available", () => {
  const s = seed();
  syncCatalog(s);
  let sum = { total: 0, sold: 0, inSigning: 0, barter: 0, reserved: 0, landowner: 0, available: 0 };
  for (const p of projects) {
    const t = salesReport(s, { project: p.id }).total;
    assert.equal(t.sold + t.inSigning + t.barter + t.reserved + t.landowner + t.available, t.total, p.id);
    assert.equal(t.total, units.filter((u) => u.project === p.id).length);
    for (const k of Object.keys(sum)) sum[k] += t[k];
  }
  // 142 = City Prime 12 + Guzel Nature 40 + Guzel Life Premium 90; satış 68 = 63 örnek + 5 sözleşme; kat karşılığı ve barter yok
  assert.deepEqual(sum, { total: 142, sold: 68, inSigning: 2, barter: 0, reserved: 6, landowner: 0, available: 66 });
  assert.equal(summary(s).sold, 68);
  assert.equal(summary(s).total, 142);
});

test("Repairs report which fields were affected so data loss is never silent", () => {
  const base = seed();
  const out = migrateSaved(JSON.stringify({ ...base, barters: null, receipts: [...base.receipts, { id: "x" }] }));
  assert.equal(out.repaired, 2);
  assert.deepEqual(out.fields.sort(), ["barters", "receipts"]);
  assert.deepEqual(migrateSaved(JSON.stringify(base)).fields, []);
});

console.log(`${checks} quality suites passed.`);
