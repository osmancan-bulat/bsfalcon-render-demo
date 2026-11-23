import assert from "node:assert/strict";
import {
  seedState,
  summary,
  applyAction,
  installmentList,
  outstanding,
  requestList,
  requestStatus,
  projectProgress,
  reservedUnits,
  customerList,
} from "../lib/enterprise.ts";
let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  console.log("PASS:", name);
}
const seed = () => structuredClone(seedState);
test("Portfolio totals reconcile across project scopes", () => {
  const all = summary(seed());
  for (const key of [
    "revenue",
    "collected",
    "balance",
    "cash",
    "payable",
    "planned",
    "received",
    "overdue",
    "sold",
    "total",
  ])
    assert.equal(
      all[key],
      ["lofty", "alion", "vtower", "business"].reduce((a, p) => a + summary(seed(), p)[key], 0),
    );
  assert.equal(all.revenue, all.collected + all.balance);
});
test("Partial receipt updates customer balance, overdue, cash, and totals", () => {
  let s = seed();
  const i = installmentList(s).find(
      (i) => i.due < "2026-11-15" && outstanding(s, i) > 0,
    ),
    before = summary(s),
    o0 = outstanding(s, i);
  s = applyAction(s, {
    type: "receipt",
    installmentId: i.id,
    amount: 100,
    method: "Havale",
    reference: "TEST-001",
  });
  assert.equal(outstanding(s, i), o0 - 100);
  const after = summary(s);
  assert.equal(after.collected, before.collected + 100);
  assert.equal(after.cash, before.cash + 100);
  assert.equal(after.overdue, before.overdue - 100);
  assert.equal(after.revenue, after.balance + after.collected);
  assert.throws(() =>
    applyAction(s, {
      type: "receipt",
      installmentId: i.id,
      amount: i.amount,
      method: "Havale",
      reference: "TEST",
    }),
  );
  s = applyAction(s, {
    type: "receipt",
    installmentId: i.id,
    amount: outstanding(s, i),
    method: "Havale",
    reference: "TEST-002",
  });
  assert.equal(outstanding(s, i), 0);
  assert.throws(() =>
    applyAction(s, {
      type: "receipt",
      installmentId: i.id,
      amount: 1,
      method: "Havale",
      reference: "TEST-003",
    }),
  );
});
test("Approval creates payable; payment reduces cash exactly once without doubling cost", () => {
  let s = seed();
  const r = requestList(s).find((r) => r.id === "CER-024"),
    before = summary(s);
  assert.throws(() => applyAction(s, { type: "pay-order", id: r.id }));
  s = applyAction(s, { type: "approve", id: r.id });
  assert.equal(summary(s).payable, before.payable + r.amount);
  assert.throws(() => applyAction(s, { type: "approve", id: r.id }));
  s = applyAction(s, { type: "pay-order", id: r.id });
  assert.equal(summary(s).cash, before.cash - r.amount);
  assert.equal(summary(s).payable, before.payable);
  assert.equal(summary(s).cost, before.cost);
  assert.throws(() => applyAction(s, { type: "pay-order", id: r.id }));
  assert.throws(() =>
    applyAction(s, { type: "edit-request", id: r.id, patch: { amount: 5 } }),
  );
});
test("Purchase revision, reapproval and delivery lifecycle", () => {
  let s = seed();
  s = applyAction(s, { type: "reject", id: "OC-018" });
  assert.equal(
    requestStatus(
      s,
      requestList(s).find((r) => r.id === "OC-018"),
    ),
    "Devuelto",
  );
  s = applyAction(s, {
    type: "edit-request",
    id: "OC-018",
    patch: { amount: 900000 },
  });
  assert.equal(
    requestStatus(
      s,
      requestList(s).find((r) => r.id === "OC-018"),
    ),
    "Pendiente de aprobación",
  );
  assert.throws(() => applyAction(s, { type: "deliver", id: "OC-018" }));
  s = applyAction(s, { type: "approve", id: "OC-018" });
  s = applyAction(s, { type: "deliver", id: "OC-018" });
  assert(s.delivered.includes("OC-018"));
  assert.throws(() => applyAction(s, { type: "deliver", id: "OC-018" }));
});
test("Reservations and new sale reconcile inventory, cash and 36 installments", () => {
  let s = seed();
  const before = summary(s, "alion");
  s = applyAction(s, { type: "reserve", id: "alion-35" });
  assert.equal(summary(s, "alion").reserved, before.reserved + 1);
  s = applyAction(s, { type: "release", id: "alion-35" });
  assert.equal(summary(s, "alion").reserved, before.reserved);
  const c = {
    id: "alion-35",
    project: "alion",
    name: "Test Müşteri",
    unit: "B-72",
    price: 3550000,
    deposit: 850000,
    installment: 75000,
    paidMonths: 0,
  };
  s = applyAction(s, { type: "contract", record: c });
  const after = summary(s, "alion");
  assert.equal(after.sold, before.sold + 1);
  assert.equal(after.cash, before.cash + 850000);
  assert.equal(after.revenue, before.revenue + 3550000);
  assert.equal(after.collected, before.collected + 850000);
  const plan = installmentList(s).filter((i) => i.customerId === c.id);
  assert.equal(plan.length, 36);
  assert.equal(plan[0].due, "2026-12-15");
  assert.equal(plan.at(-1).due, "2029-11-15");
  assert.equal(
    plan.reduce((a, i) => a + i.amount, 0),
    2700000,
  );
  assert.throws(() => applyAction(s, { type: "contract", record: c }));
  assert.throws(() =>
    applyAction(seed(), { type: "contract", record: { ...c, price: NaN } }),
  );
  assert.throws(() => applyAction(s, { type: "reserve", id: "alion-35" }));
});
test("Rescheduling preserves receivable and changes due bucket", () => {
  let s = seed();
  const i = installmentList(s).find(
      (i) => i.due < "2026-11-15" && outstanding(s, i) > 0,
    ),
    before = summary(s),
    o0 = outstanding(s, i);
  s = applyAction(s, { type: "reschedule", id: i.id, date: "2026-12-15" });
  assert.equal(summary(s).overdue, before.overdue - o0);
  assert.equal(summary(s).balance, before.balance);
  assert.equal(summary(s).planned, before.planned - (i.due.startsWith("2026-11") ? i.amount : 0));
});
test("Weighted progress updates all summaries", () => {
  let s = seed();
  const before = projectProgress(s, "alion");
  s = applyAction(s, {
    type: "work",
    id: "w6",
    patch: { progress: 100, note: "Finalizado", material: "Listo" },
  });
  assert(projectProgress(s, "alion") > before);
  assert.equal(summary(s, "alion").progress, projectProgress(s, "alion"));
  assert.throws(() =>
    applyAction(s, {
      type: "work",
      id: "w6",
      patch: { progress: 101, note: "", material: "" },
    }),
  );
});
test("Reset restores isolated seed and clears audit", () => {
  const s = applyAction(
    applyAction(seed(), { type: "note", text: "Deneme", project: "alion" }),
    { type: "reset" },
  );
  assert.deepEqual(s, seedState);
});
console.log(`${checks} enterprise workflow suites passed.`);
test("Barter reserves inventory without changing cash, receivables, cash sales or installments", () => {
  const base = seed(),
    before = summary(base),
    count = installmentList(base).length;
  const record = {
    id: "BARTER-TEST",
    project: "alion",
    unitId: "alion-34",
    company: "Örnek Firma",
    work: "Temsili cephe işi",
    amount: 3500000,
    start: "2026-11-15",
    end: "2026-12-15",
    progress: 0,
    transfer: "Pendiente",
  };
  const s = applyAction(base, { type: "barter", record });
  for (const key of ["cash", "collected", "balance", "revenue", "sold"])
    assert.equal(summary(s)[key], before[key]);
  assert.equal(summary(s).barterCount, before.barterCount + 1);
  assert.equal(installmentList(s).length, count);
  assert.throws(() => applyAction(s, { type: "reserve", id: "alion-34" }));
  assert.throws(() =>
    applyAction(s, { type: "barter", record: { ...record, id: "duplicate" } }),
  );
  assert.throws(() =>
    applyAction(s, {
      type: "contract",
      record: {
        id: "alion-34",
        project: "alion",
        name: "Demo",
        unit: "A-71",
        price: 3550000,
        deposit: 850000,
        installment: 75000,
        paidMonths: 0,
      },
    }),
  );
  const done = applyAction(s, {
    type: "barter-progress",
    id: record.id,
    progress: 100,
    transfer: "Devredildi",
  });
  assert.equal(done.barters[0].progress, 100);
  assert.equal(summary(done).cash, before.cash);
});
test("Unpaid deposit remains receivable; partial deposit changes cash exactly once", () => {
  const base = seed(),
    before = summary(base);
  let s = applyAction(base, {
    type: "contract",
    record: {
      id: "alion-28",
      project: "alion",
      name: "Demo Peşinat",
      unit: "B-70",
      price: 3550000,
      deposit: 0,
      depositExpected: 850000,
      depositDue: "2026-11-20",
      installment: 75000,
      paidMonths: 0,
    },
  });
  assert.equal(summary(s).cash, before.cash);
  assert.equal(summary(s).balance, before.balance + 3550000);
  s = applyAction(s, {
    type: "deposit-receipt",
    id: "alion-28",
    amount: 250000,
  });
  assert.equal(summary(s).cash, before.cash + 250000);
  assert.equal(summary(s).balance, before.balance + 3300000);
  assert.throws(() =>
    applyAction(s, {
      type: "deposit-receipt",
      id: "alion-28",
      amount: 600001,
    }),
  );
  s = applyAction(s, {
    type: "deposit-receipt",
    id: "alion-28",
    amount: 600000,
  });
  assert.equal(summary(s).balance, before.balance + 2700000);
  assert.throws(() =>
    applyAction(s, { type: "deposit-receipt", id: "alion-28", amount: 1 }),
  );
});
test("Custom reminders toggle without financial effect", () => {
  const s = applyAction(seed(), {
    type: "reminder",
    record: {
      id: "R1",
      project: "alion",
      title: "Demo takip",
      due: "2026-11-20",
      done: false,
    },
  });
  const n = applyAction(s, { type: "reminder-done", id: "R1" });
  assert.equal(n.reminders[0].done, true);
  assert.equal(summary(n).cash, summary(seed()).cash);
});
