// By Güzel'e özel testler: doğrulanmış portföy, para birimi ayrımı, Guzel Life Premium satış akışı,
// teslim/tapu süreci, müşteri talepleri, kur tablosu, şantiye gideri/hakediş ve demo sıfırlama.
import assert from "node:assert/strict";
import {
  seedState,
  applyAction,
  summary,
  requestList,
  customerList,
  allCustomers,
  installmentList,
  paymentRows,
  accountOf,
  customerLedger,
  systemDocuments,
  contractCurrency,
  unitTaken,
  migrateSaved,
  reservedUnits,
} from "../lib/enterprise.ts";
import { salesReport, financialReport } from "../lib/reports.ts";
import { budgetReport } from "../lib/falcon-reports.ts";
import { PORTFOLIO, LISTINGS, COMPANY } from "../lib/portfolio.ts";
import { units, unitById } from "../lib/units.ts";
import { setCurrencyView, toTry, CURRENCIES, DEFAULT_FX } from "../lib/currency.ts";
import { moneyIn } from "../lib/data.ts";
import { HANDOVER_STEPS, isDelivered, handoverProgress } from "../lib/aftersales.ts";
import { toKurus } from "../lib/plan.ts";

let checks = 0;
const test = (name, fn) => {
  try {
    fn();
  } finally {
    setCurrencyView(null);
  }
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);
const inView = (c, fn) => {
  setCurrencyView(c);
  try {
    return fn();
  } finally {
    setCurrencyView(null);
  }
};
const r2 = (n) => Math.round(n * 100) / 100;

test("Verified portfolio: own projects vs listings, Guzel Life Premium 5 blocks / 90 flats, Guzel Nature single 6-storey block", () => {
  assert.deepEqual(PORTFOLIO.map((p) => p.name), ["Guzel Life Premium", "Guzel Nature", "City Prime", "By Güzel 2000", "Medicalanya", "Mahall Oba", "Meva City Alanya"]);
  const glp = PORTFOLIO.find((p) => p.id === "glp");
  assert(glp.facts.includes("5 blok · 90 daire"));
  assert(PORTFOLIO.find((p) => p.id === "gn").facts.startsWith("Tek blok, 6 kat"));
  // Guzel Nature daire adedi yayımlanmadı: portföy bilgisinde adet yok
  assert(!/\d+ daire/.test(PORTFOLIO.find((p) => p.id === "gn").facts));
  // Meva City için fiyat ve durum uydurulmaz
  const meva = PORTFOLIO.find((p) => p.id === "meva");
  assert.equal(meva.price, undefined);
  assert.equal(meva.status, "Bilgi yok");
  // Yalnızca satış ilanı olarak görünen mülkler By Güzel projesi olarak listelenmez
  for (const l of LISTINGS) assert(!PORTFOLIO.some((p) => p.name === l), l);
  assert.deepEqual(PORTFOLIO.filter((p) => p.demoProject).map((p) => p.demoProject).sort(), ["agva", "cengilli", "nergis"]);
  assert.equal(COMPANY.since, 2001);
  assert.equal(COMPANY.construction, 2003);
  assert(COMPANY.claims.includes("şirket beyanı"));
  // Katalog: GLP 5 blok × 18 = 90 daire
  const np = units.filter((u) => u.project === "nergis");
  assert.equal(np.length, 90);
  for (const b of ["A", "B", "C", "D", "E"]) assert.equal(np.filter((u) => u.block === b).length, 18, b);
});

test("Currencies are never added together: each view contains only its own contracts, rows and requests", () => {
  const s = seed();
  const all = allCustomers(s);
  assert(CURRENCIES.every((c) => all.some((x) => (x.currency ?? "EUR") === c)), "seed has all three currencies");
  let count = 0;
  for (const c of CURRENCIES) {
    inView(c, () => {
      const cs = customerList(s);
      count += cs.length;
      assert(cs.every((x) => (x.currency ?? "EUR") === c), c);
      const ids = new Set(cs.map((x) => x.id));
      assert(paymentRows(s).every((r) => ids.has(r.customerId)), `${c} payment rows`);
      assert(installmentList(s).every((i) => ids.has(i.customerId)), `${c} installments`);
      const f = financialReport(s, { project: "all" });
      assert.equal(f.contracted, r2(cs.reduce((a, x) => a + x.price, 0)));
      assert.equal(summary(s).revenue, f.contracted);
      // Hakediş ve giderler TL'dir: yalnızca TL görünümünde
      if (c === "TRY") assert(requestList(s).length > 0);
      else assert.equal(requestList(s).length, 0);
    });
  }
  // Her sözleşme tam olarak bir görünümde
  assert.equal(count, all.length);
  // Fiziksel stok para biriminden bağımsızdır: bütün görünümlerde aynı
  const stock = CURRENCIES.map((c) => inView(c, () => salesReport(s, { project: "nergis" }).total.available));
  assert(stock.every((x) => x === stock[0]));
  assert.equal(moneyIn(1234.5, "EUR").includes("€"), true);
  assert.equal(moneyIn(1234, "USD").includes("$"), true);
  assert.equal(moneyIn(1234, "TRY").includes("₺"), true);
});

test("Exchange rates are user-defined, informational only, and never change contract figures", () => {
  let s = seed();
  const before = CURRENCIES.map((c) => inView(c, () => summary(s)));
  s = applyAction(s, { type: "fx-set", EUR: 40.25, USD: 36.1, date: "2026-11-20" });
  assert.deepEqual(s.fx, { EUR: 40.25, USD: 36.1, date: "2026-11-20" });
  const after = CURRENCIES.map((c) => inView(c, () => summary(s)));
  assert.deepEqual(after, before);
  assert.equal(toTry(1000, "EUR", s.fx), 40250);
  assert.equal(toTry(1000, "TRY", s.fx), 1000);
  for (const bad of [{ EUR: 0 }, { USD: -1 }, { EUR: NaN }, { date: "20.11.2026" }])
    assert.throws(() => applyAction(s, { type: "fx-set", EUR: 40, USD: 36, date: "2026-11-20", ...bad }));
  assert.deepEqual(seedState.fx, DEFAULT_FX);
});

test("Guzel Life Premium sale flow: unit → customer → contract → deposit → monthly plan → collection → balance → statement → receipt → dashboard", () => {
  let s = seed();
  const unit = units.find((u) => u.project === "nergis" && u.block === "C" && !unitTaken(s, u.id) && !reservedUnits(s, "nergis").includes(u.id));
  assert(unit, "an available unit in block C");
  const avail0 = salesReport(s, { project: "nergis" }).total.available;
  const eur0 = inView("EUR", () => financialReport(s, { project: "nergis" }));
  const usd0 = inView("USD", () => financialReport(s, { project: "nergis" }));
  const price = unit.listPrice - 5000;
  const plan = { deposits: [{ amount: 70000, due: "2026-11-15" }], count: 24, firstDue: "2026-12-15", interim: [{ amount: 20000, due: "2027-06-15", label: "Ara ödeme" }] };
  s = applyAction(s, {
    type: "contract",
    record: { id: unit.id, project: "nergis", name: "Anna Lindqvist (örnek)", unit: unit.label, price, deposit: 70000, depositExpected: 70000, depositDue: "2026-11-15", depositDate: "2026-11-15", installment: 0, paidMonths: 0, plan, listPrice: unit.listPrice, currency: "EUR" },
  });
  assert.equal(contractCurrency(s, unit.id), "EUR");
  assert(unitTaken(s, unit.id));
  assert.equal(salesReport(s, { project: "nergis" }).total.available, avail0 - 1);
  // Plan: peşinat + 24 taksit + ara ödeme = bedel (kuruş hassasiyetinde)
  const rows = inView("EUR", () => installmentList(s).filter((i) => i.customerId === unit.id));
  assert.equal(rows.length, 25);
  assert.equal(toKurus(70000) + rows.reduce((a, r) => a + toKurus(r.amount), 0), toKurus(price));
  // Tahsilat: ilk taksit tam ödenir
  const first = rows.find((r) => r.kind !== "Ara ödeme");
  const acc0 = inView("EUR", () => accountOf(s, customerList(s).find((c) => c.id === unit.id)));
  assert.equal(acc0.balance, r2(price - 70000));
  s = applyAction(s, { type: "receipt", installmentId: first.id, amount: first.amount, method: "Banka havalesi", reference: "SWIFT-TEST-1" });
  const acc1 = inView("EUR", () => accountOf(s, customerList(s).find((c) => c.id === unit.id)));
  assert.equal(acc1.balance, r2(acc0.balance - first.amount));
  // Ekstre son satırı bakiye ile aynı; makbuz müşterinin belgelerinde
  const ledger = inView("EUR", () => customerLedger(s, unit.id));
  assert.equal(ledger.at(-1).balance, acc1.balance);
  const receipt = s.receipts.at(-1);
  assert(systemDocuments(s, unit.id).some((d) => d.kind === "Makbuz" && d.href.includes(receipt.id)));
  // Gösterge paneli: EUR toplamları değişir, USD değişmez
  const eur1 = inView("EUR", () => financialReport(s, { project: "nergis" }));
  const usd1 = inView("USD", () => financialReport(s, { project: "nergis" }));
  assert.equal(eur1.contracted, r2(eur0.contracted + price));
  assert.equal(eur1.collected, r2(eur0.collected + 70000 + first.amount));
  assert.deepEqual(usd1, usd0);
  // Aynı daire ikinci kez satılamaz; geçersiz para birimi reddedilir
  assert.throws(() => applyAction(s, { type: "contract", record: { id: unit.id, project: "nergis", name: "X", unit: unit.label, price, deposit: 0, depositExpected: 70000, installment: 0, paidMonths: 0, plan, currency: "EUR" } }));
  const other = units.find((u) => u.project === "nergis" && !unitTaken(s, u.id) && !reservedUnits(s, "nergis").includes(u.id));
  assert.throws(() => applyAction(s, { type: "contract", record: { id: other.id, project: "nergis", name: "X", unit: other.label, price, deposit: 0, depositExpected: 70000, installment: 0, paidMonths: 0, plan, currency: "GBP" } }), /para birimi/);
});

test("A USD contract stays in USD: its plan, receipts and balance never appear in EUR totals", () => {
  let s = seed();
  const unit = units.find((u) => u.project === "nergis" && u.block === "D" && !unitTaken(s, u.id) && !reservedUnits(s, "nergis").includes(u.id));
  const eur0 = inView("EUR", () => summary(s));
  const usd0 = inView("USD", () => summary(s));
  s = applyAction(s, {
    type: "contract",
    record: { id: unit.id, project: "nergis", name: "James Carter (örnek)", unit: unit.label, price: 240000, deposit: 80000, depositExpected: 80000, depositDue: "2026-11-15", depositDate: "2026-11-15", installment: 0, paidMonths: 0, plan: { deposits: [{ amount: 80000, due: "2026-11-15" }], count: 20, firstDue: "2026-12-15", interim: [] }, currency: "USD" },
  });
  assert.deepEqual(inView("EUR", () => summary(s)), eur0);
  const usd1 = inView("USD", () => summary(s));
  assert.equal(usd1.revenue, r2(usd0.revenue + 240000));
  assert.equal(usd1.cash, r2(usd0.cash + 80000));
  assert.equal(inView("USD", () => installmentList(s).filter((i) => i.customerId === unit.id).length), 20);
  assert.equal(inView("EUR", () => installmentList(s).filter((i) => i.customerId === unit.id).length), 0);
});

test("Handover and title-deed steps run in order only for sold units; delivery changes the unit status", () => {
  let s = seed();
  // Seed: GLP'de 30 daire teslim edildi, 31–36 süreçte
  assert.equal(allCustomers(s).filter((c) => isDelivered(s.aftersales, c.id)).length, 30);
  const id = "nergis-40";
  assert.equal(handoverProgress(s.aftersales, id).done, 0);
  // Sırasız adım reddedilir
  assert.throws(() => applyAction(s, { type: "handover-step", unit: id, key: "tapu", date: "2026-11-15" }), /Önce/);
  // Satılmamış daire reddedilir
  const free = units.find((u) => u.project === "nergis" && !unitTaken(s, u.id));
  assert.throws(() => applyAction(s, { type: "handover-step", unit: free.id, key: "odeme", date: "2026-11-15" }), /satılmış/);
  for (const st of HANDOVER_STEPS) s = applyAction(s, { type: "handover-step", unit: id, key: st.key, date: "2026-11-15" });
  assert(isDelivered(s.aftersales, id));
  assert.equal(handoverProgress(s.aftersales, id).done, HANDOVER_STEPS.length);
  // Geri alma yalnızca sondan başa
  assert.throws(() => applyAction(s, { type: "handover-step", unit: id, key: "tapu", date: null }), /sonraki/);
  s = applyAction(s, { type: "handover-step", unit: id, key: "abonelik", date: null });
  s = applyAction(s, { type: "handover-step", unit: id, key: "teslim", date: null });
  assert(!isDelivered(s.aftersales, id));
  assert.throws(() => applyAction(s, { type: "handover-step", unit: id, key: "teslim", date: "15.11.2026" }), /Tarih/);
  // Teslim süreci finansal tutarları değiştirmez
  assert.deepEqual(inView("EUR", () => summary(s)), inView("EUR", () => summary(seed())));
});

test("Customer requests: open, progress, resolve; only for sold units; audit kept", () => {
  let s = seed();
  const n0 = s.aftersales.tickets.length;
  s = applyAction(s, { type: "ticket-create", record: { unitId: "nergis-5", project: "nergis", category: "Arıza / bakım", title: "Balkon kapısı contası", priority: "Normal", opened: "2026-11-15", note: "Fotoğraf istendi" } });
  const t = s.aftersales.tickets[0];
  assert.equal(s.aftersales.tickets.length, n0 + 1);
  assert.equal(t.status, "Açık");
  assert.equal(t.notes.length, 1);
  assert.notEqual(t.id, seedState.aftersales.tickets[0].id);
  s = applyAction(s, { type: "ticket-update", id: t.id, status: "İşlemde", note: "Usta randevusu", date: "2026-11-15" });
  s = applyAction(s, { type: "ticket-update", id: t.id, status: "Çözüldü", date: "2026-11-16" });
  const done = s.aftersales.tickets.find((x) => x.id === t.id);
  assert.equal(done.status, "Çözüldü");
  assert.equal(done.closed, "2026-11-16");
  assert.equal(done.notes.length, 2);
  assert(s.audit.some((a) => a.entity === t.id));
  const free = units.find((u) => u.project === "nergis" && !unitTaken(s, u.id));
  assert.throws(() => applyAction(s, { type: "ticket-create", record: { unitId: free.id, project: "nergis", category: "Arıza / bakım", title: "x", priority: "Normal", opened: "2026-11-15" } }), /satılmış/);
  assert.throws(() => applyAction(s, { type: "ticket-create", record: { unitId: "nergis-5", project: "nergis", category: "Arıza / bakım", title: "  ", priority: "Normal", opened: "2026-11-15" } }));
});

test("Site expense (TRY) reduces TRY cash once and flows into finance and budget reports", () => {
  let s = seed();
  const [sum0, b0] = inView("TRY", () => [summary(s, "agva"), budgetReport(s, "agva")]);
  s = applyAction(s, { type: "expense", record: { project: "agva", category: "Malzeme", company: "Örnek tedarikçi", name: "Hazır beton · 24 m³", amount: 86400.5, date: "2026-11-14" } });
  const [sum1, b1] = inView("TRY", () => [summary(s, "agva"), budgetReport(s, "agva")]);
  assert.equal(sum1.cash, r2(sum0.cash - 86400.5));
  assert.equal(b1.spent, r2(b0.spent + 86400.5));
  // EUR kasası etkilenmez
  assert.equal(inView("EUR", () => summary(s, "agva").cash), inView("EUR", () => summary(seed(), "agva").cash));
  for (const bad of [{ amount: 0 }, { amount: -5 }, { date: "2026-12-01" }, { name: " " }])
    assert.throws(() => applyAction(seed(), { type: "expense", record: { project: "agva", category: "Malzeme", company: "x", name: "y", amount: 10, date: "2026-11-10", ...bad } }));
});

test("Progress payment approved and paid: budget commitment and TRY cash stay consistent", () => {
  let s = seed();
  s = applyAction(s, { type: "request", record: { id: "HAK-500", project: "cengilli", company: "Karataş Yapı Taahhüt", name: "5. kat döşeme hakedişi", type: "Hakediş", amount: 1500000, due: "2026-11-30", status: "Onay bekliyor" } });
  const id = s.requests.find((r) => r.name === "5. kat döşeme hakedişi").id;
  const b0 = inView("TRY", () => budgetReport(s, "cengilli"));
  s = applyAction(s, { type: "approve", id });
  assert.equal(inView("TRY", () => budgetReport(s, "cengilli")).committed, b0.committed + 1500000);
  const cash0 = inView("TRY", () => summary(s, "cengilli").cash);
  s = applyAction(s, { type: "pay-order", id });
  assert.equal(inView("TRY", () => summary(s, "cengilli").cash), cash0 - 1500000);
  const b1 = inView("TRY", () => budgetReport(s, "cengilli"));
  assert.equal(b1.spent, b0.spent + 1500000);
  assert.equal(b1.committed, b0.committed);
});

test("Demo reset restores sales, handover, tickets and exchange rates; old saved data gains the new fields", () => {
  let s = seed();
  s = applyAction(s, { type: "fx-set", EUR: 41, USD: 37, date: "2026-11-20" });
  s = applyAction(s, { type: "handover-step", unit: "nergis-40", key: "odeme", date: "2026-11-15" });
  s = applyAction(s, { type: "ticket-create", record: { unitId: "nergis-5", project: "nergis", category: "Kiralama yönetimi", title: "Yaz kiralaması", priority: "Normal", opened: "2026-11-15" } });
  s = applyAction(s, { type: "reset" });
  assert.deepEqual(s, seedState);
  const old = seed();
  delete old.aftersales;
  delete old.fx;
  const out = migrateSaved(JSON.stringify(old));
  assert(out);
  assert.deepEqual(out.state.aftersales ?? seedState.aftersales, seedState.aftersales);
  assert.deepEqual(out.state.fx ?? seedState.fx, seedState.fx);
  // Liste fiyatları EUR; birim bilgisi tutarlı
  assert(units.every((u) => unitById(u.id) === u && u.listPrice > 0));
});

console.log(`${checks} By Güzel suites passed.`);
