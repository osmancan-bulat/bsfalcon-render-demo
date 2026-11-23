// Escenarios EDIFICA: datos publicados de los 4 proyectos, flujo completo de venta → plan → cobros → mora →
// estado de cuenta → recibo → facturación en ALION Residence, reglas de facturación, tipo de cambio y formato.
import assert from "node:assert/strict";
import {
  seedState,
  applyAction,
  summary,
  customerList,
  contractList,
  installmentList,
  paymentRows,
  accountOf,
  customerLedger,
  systemDocuments,
  unitTaken,
  reservedUnits,
  PAYMENT_STATUSES,
} from "../lib/enterprise.ts";
import { billingRows, billingSummary, fxOf } from "../lib/billing.ts";
import { installmentReport, financialReport } from "../lib/reports.ts";
import { buildSchedule, toKurus } from "../lib/plan.ts";
import { units, unitById } from "../lib/units.ts";
import { projects, usd, gs, money, compact, date, setDisplayCurrency, displayCurrency } from "../lib/data.ts";
import { PROFILES, COMPANY } from "../lib/company.ts";

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);
const r2 = (n) => Math.round(n * 100) / 100;
const TURKISH = /[çğıöşÇĞİÖŞ₺]/;

test("Four real projects with published data, sources and an explicit sample-data note", () => {
  assert.deepEqual(projects.map((p) => p.name), ["Lofty City Hub", "ALION Residence", "V Tower del Lago", "Business One"]);
  assert.equal(COMPANY.city, "Ciudad del Este · Paraguay");
  for (const p of projects) {
    const prof = PROFILES[p.id];
    assert(prof && prof.facts.length >= 5 && prof.sources.length >= 2 && prof.sample.length > 40, p.id);
    assert(prof.hero.startsWith("/images/edifica/"), p.id);
  }
  // Participantes tal como figuran en las fuentes
  assert.match(PROFILES.vtower.partners, /Vierci Development y EDIFICA/);
  assert.match(PROFILES.lofty.partners, /no detallan el rol/);
  assert.match(PROFILES.alion.facts.map((f) => f[1]).join(" "), /USD 65\.955/);
  assert.match(PROFILES.vtower.facts.map((f) => f[1]).join(" "), /20 % de entrega · 60 % en cuotas fijas · 20 % con las llaves/);
  // Inventario cargado: 184 unidades (ALION y Business One según fuentes; Lofty y V Tower muestra de ejemplo)
  assert.equal(units.length, 184);
  assert.equal(units.filter((u) => u.project === "business" && u.type.startsWith("Oficina")).length, 48);
});

test("ALION end-to-end: contract, down payment and monthly plan, receipts, partial balance, statement, receipt, billing and dashboard", () => {
  let s = seed();
  const unitId = "alion-30"; // 606A · 2 dormitorios · disponible
  assert(!unitTaken(s, unitId) && !reservedUnits(s, "alion").includes(unitId));
  const u = unitById(unitId);
  const price = 158000, down = 31600;
  const spec = { deposits: [{ amount: down, due: "2026-11-15" }], count: 36, firstDue: "2026-12-10", interim: [] };
  const sch = buildSchedule(price, spec);
  // El plan suma exactamente el precio del contrato
  assert.equal(toKurus(sch.depositTotal) + sch.rows.reduce((a, r) => a + toKurus(r.amount), 0), toKurus(price));
  const dash0 = summary(s);
  s = applyAction(s, {
    type: "contract",
    record: { id: unitId, project: "alion", name: "Cliente de Ejemplo Uno", unit: u.label, price, listPrice: u.listPrice, deposit: down, depositExpected: down, installment: sch.installment, paidMonths: 0, plan: spec },
  });
  const c = customerList(s).find((x) => x.id === unitId);
  assert.equal(contractList(s).find((x) => x.id === unitId).status, "Activo");
  assert.equal(installmentList(s).filter((i) => i.customerId === unitId).length, 36);
  // Panel: contratado, cobrado y saldo se actualizan con el contrato y el anticipo
  const dash1 = summary(s);
  assert.equal(dash1.revenue, r2(dash0.revenue + price));
  assert.equal(dash1.collected, r2(dash0.collected + down));
  assert.equal(dash1.balance, r2(dash0.balance + price - down));
  assert.equal(dash1.cash, r2(dash0.cash + down));
  // Cobro completo de la cuota 1 y cobro parcial de la cuota 2
  const [q1, q2] = installmentList(s).filter((i) => i.customerId === unitId);
  s = applyAction(s, { type: "receipt", installmentId: q1.id, amount: q1.amount, method: "Transferencia bancaria", reference: "TRF-E2E-1" });
  s = applyAction(s, { type: "receipt", installmentId: q2.id, amount: 1000, method: "Efectivo", reference: "REC-E2E-2" });
  const acc = accountOf(s, customerList(s).find((x) => x.id === unitId));
  assert.equal(acc.collected, r2(down + q1.amount + 1000));
  assert.equal(acc.balance, r2(price - down - q1.amount - 1000));
  const row2 = paymentRows(s).find((r) => r.id === q2.id);
  assert.equal(row2.remaining, r2(q2.amount - 1000));
  assert.equal(row2.status, "Pago parcial");
  // Estado de cuenta: el saldo final coincide con la cuenta del cliente
  const ledger = customerLedger(s, unitId);
  assert.equal(ledger.at(-1).balance, acc.balance);
  // Recibos imprimibles para cada cobro
  assert.equal(systemDocuments(s, unitId).filter((d) => d.href.includes("tur=makbuz")).length, 2);
  assert(systemDocuments(s, unitId).some((d) => d.href.includes("tur=ekstre")));
  // Facturación: el anticipo y los dos cobros quedan "Por emitir"
  const rows = billingRows(s).filter((r) => r.customerId === unitId);
  assert.deepEqual(rows.map((r) => r.status), ["Por emitir", "Por emitir", "Por emitir"]);
  const rid = s.receipts.at(-1).id;
  s = applyAction(s, { type: "invoice-issue", source: rid, number: "001-001-0000201", date: "2026-11-15" });
  assert.equal(billingRows(s).find((r) => r.source === rid).status, "Emitida");
  // El panel refleja el cobro: cobrado +2 cuotas parciales, mora y facturación coherentes
  const dash2 = summary(s);
  assert.equal(dash2.collected, r2(dash1.collected + q1.amount + 1000));
  assert.equal(dash2.revenue, r2(dash2.collected + dash2.balance));
  assert.equal(financialReport(s, { project: "all" }).collected, dash2.collected);
  assert.equal(c.price, price);
});

test("Overdue installments are detected with partial payments and aging", () => {
  const s = seed();
  const late = paymentRows(s).filter((r) => r.customerId === "alion-25" && r.status === "Vencida");
  assert.deepEqual(late.map((r) => r.id), ["alion-25-4", "alion-25-5"]);
  assert.equal(late[0].paid, 700);
  assert.equal(late[0].remaining, 700);
  const rep = installmentReport(s, { project: "alion" });
  assert(rep.perCustomer.some((p) => p.id === "alion-25" && p.amount === 2100));
  // El segundo tramo del anticipo de alion-26 está vencido y el tercero próximo
  const dep = paymentRows(s).filter((r) => r.customerId === "alion-26" && r.kind === "Anticipo");
  assert.deepEqual(dep.map((r) => r.status), ["Pagada", "Vencida", "Próxima"]);
  assert.deepEqual([...PAYMENT_STATUSES], ["Vencida", "Próxima", "Pago parcial", "Futura", "Pagada"]);
});

test("Billing register: format, uniqueness, dates, exchange rate snapshot, voiding and reversed receipts", () => {
  let s = seed();
  const bs = billingSummary(s);
  assert.equal(bs.issued.length, 10);
  assert.equal(bs.pending.length, 3);
  assert.equal(r2(bs.pendingAmount + bs.issuedAmount), r2(bs.rows.reduce((a, r) => a + r.amount, 0)));
  const pending = bs.pending[0];
  assert.throws(() => applyAction(s, { type: "invoice-issue", source: pending.source, number: "123", date: "2026-11-15" }), /Formato/);
  assert.throws(() => applyAction(s, { type: "invoice-issue", source: pending.source, number: "001-001-0000101", date: "2026-11-15" }), /ya está registrado/);
  assert.throws(() => applyAction(s, { type: "invoice-issue", source: pending.source, number: "001-001-0000300", date: "2020-01-01" }), /fecha/);
  assert.throws(() => applyAction(s, { type: "invoice-issue", source: pending.source, number: "001-001-0000300", date: "2026-12-01" }), /fecha/);
  // El tipo de cambio vigente queda guardado en la factura; cambiarlo después no altera facturas emitidas
  s = applyAction(s, { type: "fx-set", rate: 7450, date: "2026-11-15" });
  s = applyAction(s, { type: "invoice-issue", source: pending.source, number: "001-001-0000300", date: "2026-11-15" });
  assert.equal(s.billing[pending.source].rate, 7450);
  s = applyAction(s, { type: "fx-set", rate: 7600, date: "2026-11-15" });
  assert.equal(s.billing[pending.source].rate, 7450);
  assert.equal(s.billing["REC-D01"].rate, 7300);
  assert.throws(() => applyAction(s, { type: "invoice-issue", source: pending.source, number: "001-001-0000301", date: "2026-11-15" }), /ya tiene una factura/);
  // Anulación con motivo; luego puede registrarse una nueva factura
  assert.throws(() => applyAction(s, { type: "invoice-void", source: pending.source, reason: " " }), /motivo/);
  s = applyAction(s, { type: "invoice-void", source: pending.source, reason: "Datos del cliente incorrectos" });
  assert.equal(billingRows(s).find((r) => r.source === pending.source).status, "Anulada");
  s = applyAction(s, { type: "invoice-issue", source: pending.source, number: "001-001-0000302", date: "2026-11-15" });
  assert.equal(billingRows(s).find((r) => r.source === pending.source).status, "Emitida");
  // Si se anula el cobro de una factura emitida, la factura queda "Revisar"
  s = applyAction(s, { type: "receipt-reverse", id: "REC-D01", reason: "Cobro imputado por error" });
  assert.equal(billingRows(s).find((r) => r.source === "REC-D01").status, "Revisar");
  assert.equal(billingSummary(s).review.length, 1);
  assert.throws(() => applyAction(s, { type: "invoice-issue", source: "REC-D01", number: "001-001-0000303", date: "2026-11-15" }), /anulado/);
});

test("Currency: USD is the recorded currency; guaraníes use only the defined reference rate", () => {
  assert.equal(usd(65955), "US$ 65.955");
  assert.equal(usd(1565.19), "US$ 1.565,19");
  assert.equal(gs(1, 7300), "₲ 7.300");
  assert.equal(gs(65955, 7300), "₲ 481.471.500");
  assert.equal(date("2026-11-15"), "15 nov 2026");
  let s = seed();
  assert.deepEqual(fxOf(s), { rate: 7300, date: "2026-11-15" });
  for (const bad of [0, 500, 25000, Number.NaN]) assert.throws(() => applyAction(s, { type: "fx-set", rate: bad, date: "2026-11-15" }));
  const before = summary(s);
  s = applyAction(s, { type: "fx-set", rate: 7500, date: "2026-11-20" });
  // Cambiar el tipo de cambio no recalcula ningún monto registrado
  assert.deepEqual(summary(s), before);
  setDisplayCurrency("PYG", fxOf(s).rate);
  assert.equal(displayCurrency().currency, "PYG");
  assert.equal(money(100), "₲ 750.000");
  assert.match(compact(2000000), /^₲ 15\.000 M$/);
  setDisplayCurrency("USD", fxOf(s).rate);
  assert.equal(money(100), "US$ 100");
});

test("Seed contracts follow their plans; V Tower uses the published 20/60/20 structure", () => {
  const s = seed();
  for (const c of [...s.contracts, ...s.drafts]) {
    const sch = buildSchedule(c.price, c.plan);
    assert.equal(toKurus(sch.total), toKurus(c.price), c.id);
    assert.equal(c.installment, sch.installment, c.id);
  }
  const vt = s.contracts.find((c) => c.id === "vtower-9");
  assert.equal(vt.plan.deposits[0].amount, r2(vt.price * 0.2));
  assert.equal(vt.plan.interim[0].amount, r2(vt.price * 0.2));
  assert.equal(vt.plan.interim[0].due.slice(0, 7), "2029-04");
  assert.equal(r2(vt.installment * vt.plan.count), r2(vt.price * 0.6));
  // Los contratos existentes nunca se vuelven a fijar precio: el precio de lista puede cambiar sin afectarlos
  let t = applyAction(s, { type: "unit-update", id: "alion-28", patch: { type: "Monoambiente · T6", gross: 30, listPrice: 99999, facade: "Frente" } });
  assert.equal(customerList(t).find((c) => c.id === "alion-25").price, 63000);
});

test("Reset restores billing, exchange rate and every record", () => {
  let s = seed();
  s = applyAction(s, { type: "fx-set", rate: 7700, date: "2026-11-15" });
  s = applyAction(s, { type: "invoice-issue", source: billingSummary(s).pending[0].source, number: "001-001-0000400", date: "2026-11-15" });
  s = applyAction(s, { type: "reset" });
  assert.deepEqual(s, seedState);
  assert.equal(billingSummary(s).pending.length, 3);
});

test("Engine messages and statuses are in Spanish (no Turkish text reaches the user)", () => {
  const s = seed();
  const errors = [];
  const tries = [
    { type: "receipt", installmentId: "nope", amount: 1, method: "Efectivo", reference: "x" },
    { type: "contract", record: { id: "alion-1", project: "alion", name: "x", unit: "x", price: 1, deposit: 0, installment: 0, paidMonths: 0 } },
    { type: "reserve", id: "alion-1" },
    { type: "approve", id: "nope" },
    { type: "project-create", record: { name: "", code: "", location: "", delivery: "", description: "" } },
    { type: "invoice-issue", source: "nope", number: "1", date: "2026-11-15" },
    { type: "fx-set", rate: 1, date: "2026-11-15" },
  ];
  for (const a of tries) {
    try {
      applyAction(s, a);
    } catch (e) {
      errors.push(e.message);
    }
  }
  assert.equal(errors.length, tries.length);
  for (const m of errors) assert(!TURKISH.test(m), m);
  const ok = applyAction(s, { type: "reserve", id: "alion-40" });
  assert(!TURKISH.test(ok.audit[0].message), ok.audit[0].message);
  for (const r of paymentRows(s)) assert(!TURKISH.test(r.label + r.status + r.kind), r.id);
  for (const c of contractList(s)) assert(!TURKISH.test(c.planLabel + c.status), c.id);
});

console.log(`${checks} Edifica suites passed.`);
