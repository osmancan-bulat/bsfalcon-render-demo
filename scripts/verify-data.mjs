import assert from "node:assert/strict";
import {
  projects,
  customers,
  installments,
  workItems,
  stats,
} from "../lib/data.ts";
for (const p of projects) {
  const work = workItems.filter((w) => w.project === p.id);
  assert.equal(
    work.reduce((a, w) => a + w.weight, 0),
    100,
  );
  assert.equal(
    work.reduce((a, w) => a + (w.weight * w.progress) / 100, 0),
    p.progress,
  );
  const s = stats(p.id);
  assert(s.sold + p.reserved <= p.total);
  assert.equal(s.collected + s.balance, s.revenue);
}
for (const c of customers) {
  assert.equal(c.deposit + 36 * c.installment, c.price);
  assert.equal(
    installments.filter((i) => i.customerId === c.id).length,
    36 - c.paidMonths,
  );
}
assert.equal(new Set(customers.map((c) => c.name)).size, 36);
const base = stats(),
  changed = stats("all", [installments[0].id]);
assert.equal(changed.collected, base.collected + installments[0].amount);
assert.equal(changed.balance, base.balance - installments[0].amount);
assert.equal(changed.overdue, base.overdue - installments[0].amount);
console.log(
  "PASS: contracts, inventory, weighted progress and receipt reconciliation.",
);
