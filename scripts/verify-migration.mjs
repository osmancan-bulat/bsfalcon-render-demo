// Finansal bütünlük regresyonları: önceki sürümün (v3.1) tarayıcı verisi yeni sürüme aktarılırken
// sözleşme bedelleri, tahsilatlar, peşinatlar, vadeler ve bakiyeler değişmemelidir.
import assert from "node:assert/strict";
import {
  seedState,
  applyAction,
  migrateSaved,
  customerList,
  contractList,
  paymentRows,
  accountOf,
  summary,
  collectionBreakdown,
  installmentList,
  agenda,
  systemDocuments,
  contractNumber,
  SNAPSHOT,
} from "../lib/enterprise.ts";
import { baseCustomers, baseInstallments } from "../lib/data.ts";
import { personName, FIRM } from "../lib/names.ts";
import { toKurus } from "../lib/plan.ts";

let checks = 0;
let LATE_ID;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};

/** Bir durumun bütün finansal parmak izi: kişi/sözleşme bazında ve portföy toplamında. */
function fingerprint(s) {
  const people = customerList(s).map((c) => {
    const a = accountOf(s, c);
    return [c.id, contractNumber(c.id), c.unit, c.price, c.deposit, c.installment, a.collected, a.balance, a.overdue];
  });
  const rows = paymentRows(s).map((r) => [r.id, r.due, r.amount, r.paid, r.remaining, r.status]);
  return {
    people,
    rows,
    receipts: s.receipts,
    deposits: s.depositPayments,
    offsets: s.offsets,
    all: summary(s),
    cengilli: summary(s, "cengilli"),
    bulvar: summary(s, "agva"),
    nergis: summary(s, "nergis"),
    breakdown: collectionBreakdown(s),
  };
}

/**
 * Önceki sürümün tarayıcıda kaydettiği veriyi üretir: sabit örnek bedeller (₺3.550.000 / ₺2.650.000),
 * o bedellere göre işlenmiş tahsilatlar, jenerik adlar, dataset/basePricing alanı yok.
 * Üstüne kullanıcının farklı tarihli işlemleri eklenir.
 */
function legacyBrowserData() {
  let s = structuredClone(seedState);
  s.basePricing = "v3.1";
  const legacyIns = baseInstallments("v3.1");
  s.receipts = s.receipts.map((r) =>
    r.id.startsWith("THS-00")
      ? { ...r, amount: legacyIns.find((i) => i.id === r.installmentId).amount, reference: `DEMO-2026-${r.id.slice(-1)}` }
      : r,
  );
  const baseIds = new Set(baseCustomers("v3.1").map((c) => c.id));
  const lateBase = paymentRows(s).find((r) => r.status === "Gecikti" && baseIds.has(r.customerId) && r.paid === 0);
  const nextBase = paymentRows(s).find((r) => r.customerId === "nergis-2" && r.remaining > 0);
  // Kısmi tahsilat (geciken örnek taksit), tam tahsilat (gelecek taksit), peşinat parçası, vade değişikliği, imza
  LATE_ID = lateBase.customerId;
  s = applyAction(s, { type: "receipt", installmentId: lateBase.installmentId, amount: 1000, method: "Banka havalesi", reference: "DEMO-USER-1" });
  s = applyAction(s, { type: "receipt", installmentId: nextBase.installmentId, amount: nextBase.remaining, method: "Kredi kartı", reference: "DEMO-USER-2" });
  s = applyAction(s, { type: "deposit-receipt", id: "nergis-51", amount: 25000 });
  const later = paymentRows(s).find((r) => r.customerId === "nergis-5" && r.remaining > 0 && r.due > SNAPSHOT);
  s = applyAction(s, { type: "reschedule", id: later.installmentId, date: "2027-02-26" });
  s = applyAction(s, { type: "contract-sign", id: "cengilli-21", depositPaid: 38150 });
  // Önceki sürümün adları
  const text = JSON.stringify({ ...s, dataset: undefined, basePricing: undefined })
    .replace(/"(Demo Müşteri \d{3})"/g, '"$1"');
  let legacy = text;
  for (let n = 1; n <= 120; n++) legacy = legacy.split(`"${personName(n)}"`).join(`"Demo Müşteri ${String(n).padStart(3, "0")}"`);
  for (const [k, v] of [["yapi", "Örnek Yapı"], ["teknik", "Örnek Teknik"], ["cephe", "Örnek Cephe"], ["demir", "Örnek Demir"], ["aluminyum", "Örnek Alüminyum"]])
    legacy = legacy.split(FIRM[k]).join(v);
  return { engineState: s, raw: legacy };
}

test("Clean demo start may use catalogue prices; previous-version prices stay available unchanged", () => {
  const legacy = baseCustomers("v3.1");
  // Önceki sürüm şeması (sabit örnek bedeller, EUR): GLP 210.000 €, diğerleri 120.000 €
  assert(legacy.every((c) => c.price === (c.project === "nergis" ? 210000 : 120000)));
  assert(legacy.every((c) => c.deposit === (c.project === "nergis" ? 73200 : 42240) && c.installment === (c.project === "nergis" ? 3800 : 2160)));
  assert(legacy.every((c) => c.deposit + 36 * c.installment === c.price));
  assert.equal(seedState.basePricing, "katalog");
  // Kimlik, daire ve vadeler iki şemada aynıdır; yalnızca bedel farklıdır
  const cat = baseCustomers("katalog");
  assert.deepEqual(cat.map((c) => [c.id, c.unit, c.name]), legacy.map((c) => [c.id, c.unit, c.name]));
  assert.deepEqual(baseInstallments("katalog").map((i) => [i.id, i.due]), baseInstallments("v3.1").map((i) => [i.id, i.due]));
});

test("Migrating previous-version browser data never re-prices contracts or alters any financial figure", () => {
  const { engineState, raw } = legacyBrowserData();
  assert(raw.includes("Demo Müşteri 0") && raw.includes("Örnek Yapı") && !raw.includes("basePricing"));
  const out = migrateSaved(raw);
  assert(out.migrated);
  assert.equal(out.state.basePricing, "v3.1");
  const before = fingerprint(engineState);
  const after = fingerprint(out.state);
  // Kişi bazında: bedel, peşinat, taksit, tahsil edilen, bakiye, geciken — kuruşu kuruşuna aynı
  assert.deepEqual(after.people, before.people);
  assert.deepEqual(after.rows, before.rows);
  assert.deepEqual(after.receipts, before.receipts);
  assert.deepEqual(after.deposits, before.deposits);
  assert.deepEqual(after.offsets, before.offsets);
  assert.deepEqual(after.all, before.all);
  assert.deepEqual(after.cengilli, before.cengilli);
  assert.deepEqual(after.nergis, before.nergis);
  assert.deepEqual(after.bulvar, before.bulvar);
  assert.deepEqual(after.breakdown, before.breakdown);
  // Önceki sürümün tahsilat dekontları aynen korunur (yalnızca kişi/firma adı taşınır)
  assert(after.receipts.some((r) => r.reference === "DEMO-USER-1" && r.amount === 1000));
  assert.equal(customerList(out.state).find((c) => c.id === "cengilli-1").price, 120000);
});

test("A migrated record keeps working: new receipts reduce the preserved balance exactly once", () => {
  const out = migrateSaved(legacyBrowserData().raw).state;
  const c = customerList(out).find((x) => x.id === LATE_ID);
  const before = accountOf(out, c);
  const row = paymentRows(out).find((r) => r.customerId === LATE_ID && r.remaining > 0);
  const next = applyAction(out, { type: "receipt", installmentId: row.installmentId, amount: row.remaining, method: "Banka havalesi", reference: "HVL-TEST" });
  const after = accountOf(next, customerList(next).find((x) => x.id === LATE_ID));
  assert.equal(after.collected, before.collected + row.remaining);
  assert.equal(after.balance, before.balance - row.remaining);
  assert.equal(c.price, c.project === "nergis" ? 210000 : 120000);
  assert.equal(summary(next).cash, summary(out).cash + row.remaining);
});

test("Loading already-migrated or current data is idempotent and keeps its pricing scheme", () => {
  const migrated = migrateSaved(legacyBrowserData().raw).state;
  const again = migrateSaved(JSON.stringify(migrated));
  assert.equal(again.migrated, false);
  assert.equal(again.state.basePricing, "v3.1");
  assert.deepEqual(fingerprint(again.state), fingerprint(migrated));
  // v3.2 Preview verisi (dataset 2, şema alanı yok) katalog fiyatlarıyla oluşmuştu
  const preview = { ...structuredClone(seedState), basePricing: undefined };
  const loaded = migrateSaved(JSON.stringify(preview)).state;
  assert.equal(loaded.basePricing, "katalog");
  assert.deepEqual(fingerprint(loaded), fingerprint(seedState));
  // Demoyu sıfırla: kullanıcı isteğiyle temiz katalog başlangıcı
  assert.equal(applyAction(migrated, { type: "reset" }).basePricing, "katalog");
});

test("Deposit + installments + interim payments equal the contract price to the kuruş (both schemes)", () => {
  for (const s of [structuredClone(seedState), migrateSaved(legacyBrowserData().raw).state]) {
    const rows = installmentList(s);
    for (const c of customerList(s)) {
      const own = rows.filter((r) => r.customerId === c.id);
      let total;
      if (c.plan) {
        // Esnek plan: peşinat parçaları + taksitler + ara ödemeler (satırlar) = bedel
        const deposits = paymentRows(s).filter((r) => r.customerId === c.id && r.kind === "Peşinat");
        total = own.reduce((a, r) => a + toKurus(r.amount), 0) + deposits.reduce((a, r) => a + toKurus(r.amount), 0);
      } else {
        // Klasik plan: peşinat + ödenmiş aylar + kalan taksit satırları = bedel
        total = toKurus(c.deposit + c.installment * c.paidMonths) + own.reduce((a, r) => a + toKurus(r.amount), 0);
      }
      assert.equal(total, toKurus(c.price), `${c.id} ${s.basePricing}`);
    }
  }
});

test("Statuses follow due dates for deposits and installments across dates (both schemes)", () => {
  for (const s of [structuredClone(seedState), migrateSaved(legacyBrowserData().raw).state]) {
    const rows = paymentRows(s);
    const seen = new Set();
    for (const r of rows) {
      seen.add(r.status);
      if (r.remaining === 0) assert.equal(r.status, "Ödendi", r.id);
      else if (r.due < SNAPSHOT) assert.equal(r.status, "Gecikti", r.id);
      else if (r.paid > 0) assert.equal(r.status, "Kısmen ödendi", r.id);
      else assert(["Yaklaşıyor", "Gelecek dönem"].includes(r.status), r.id + " " + r.status);
      if (r.status === "Yaklaşıyor") assert(r.days >= 0 && r.days <= 30, r.id);
      if (r.status === "Gelecek dönem") assert(r.days > 30, r.id);
    }
    for (const st of ["Gecikti", "Yaklaşıyor", "Gelecek dönem", "Ödendi"]) assert(seen.has(st), `${s.basePricing} has ${st}`);
    // Peşinatın geciken parçası ve gelecek parçası ayrı izlenir
    const dep = rows.filter((r) => r.customerId === "nergis-51" && r.kind === "Peşinat");
    assert(dep.length === 3 && dep.some((r) => r.due < SNAPSHOT) && dep.some((r) => r.due > SNAPSHOT));
  }
});

test("Names, contract numbers, unit codes and totals agree across every view (both schemes)", () => {
  for (const s of [structuredClone(seedState), migrateSaved(legacyBrowserData().raw).state]) {
    const people = new Map(customerList(s).map((c) => [c.id, c]));
    for (const v of contractList(s)) {
      const c = people.get(v.id) ?? s.drafts.find((d) => d.id === v.id);
      assert(c, v.id);
      assert.equal(v.name, c.name);
      assert.equal(v.number, contractNumber(v.id));
      assert.equal(v.unitLabel, c.unit);
      assert.equal(v.price, c.price);
    }
    for (const a of agenda(s, "all", 30))
      if (a.ref.type === "customer") assert(a.title.startsWith(people.get(a.ref.id).name), a.id);
    for (const id of ["agva-1", "cengilli-1"])
      for (const d of systemDocuments(s, id)) assert(d.name.startsWith(contractNumber(id)) || d.name.startsWith("THS-"), d.name);
    // Portföy toplamları kişi hesaplarının toplamıdır
    const sum = (f) => Math.round([...people.values()].reduce((a, c) => a + f(accountOf(s, c)), 0) * 100) / 100;
    const total = summary(s);
    assert.equal(total.revenue, Math.round([...people.values()].reduce((a, c) => a + c.price, 0) * 100) / 100);
    assert.equal(total.collected, sum((a) => a.collected));
    assert.equal(total.balance, sum((a) => a.balance));
    assert.equal(collectionBreakdown(s).total, total.collected);
    assert.equal(summary(s, "cengilli").revenue + summary(s, "nergis").revenue + summary(s, "agva").revenue, total.revenue);
  }
});

console.log(`${checks} migration & financial integrity suites passed.`);
