// Sözleşme, esnek plan, kuruş hassasiyeti, cari hesap, barter mahsubu ve daire kataloğu testleri.
import assert from "node:assert/strict";
import {
  seedState,
  summary,
  applyAction,
  installmentList,
  outstanding,
  customerList,
  contractList,
  customerLedger,
  accountOf,
  requestList,
  requestStatus,
  depositSchedule,
  unitTaken,
  reservedUnits,
  paymentRows,
  paymentStatus,
  agenda,
  collectionBreakdown,
  systemDocuments,
  fileHistory,
  workContracts,
  workContractDocument,
  netPayable,
} from "../lib/enterprise.ts";
import { buildSchedule, toKurus, validatePlan } from "../lib/plan.ts";
import { units, unitById } from "../lib/units.ts";
import { documentValidity } from "../lib/archive.ts";

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);
const kurus = (rows) => rows.reduce((a, r) => a + toKurus(r.amount), 0);
const plan = (over = {}) => ({
  deposits: [
    { amount: 500000, due: "2026-11-15" },
    { amount: 350000.5, due: "2027-01-15" },
  ],
  count: 37,
  firstDue: "2026-12-10",
  interim: [{ amount: 250000, due: "2027-06-30", label: "Ara ödeme · yaz" }],
  ...over,
});
const sale = (id, over = {}) => ({
  id,
  project: id.split("-")[0],
  name: "Demo Müşteri Plan",
  unit: "B-66",
  price: 3550000.75,
  deposit: 500000,
  depositExpected: 850000.5,
  installment: 0,
  paidMonths: 0,
  plan: plan(),
  ...over,
});

test("Flexible plan totals equal the contract price to the kuruş", () => {
  for (const [price, count] of [
    [3550000.75, 37],
    [2650000, 36],
    [1800000.01, 7],
    [2999999.99, 120],
  ]) {
    const spec = plan({ count });
    const sch = buildSchedule(price, spec);
    assert.equal(toKurus(sch.depositTotal) + kurus(sch.rows), toKurus(price));
    const taksit = sch.rows.filter((r) => r.kind === "Cuota");
    assert.equal(taksit.length, count);
    // Taksitler tam TL; kuruş farkı yalnızca son taksitte
    taksit
      .slice(0, -1)
      .forEach((r) => assert.equal(toKurus(r.amount) % 100, 0));
    assert.equal(sch.rows.filter((r) => r.kind === "Pago intermedio").length, 1);
  }
  assert.throws(() => validatePlan(1000, plan()));
  assert.throws(() => validatePlan(3550000, plan({ count: 0 })));
  assert.throws(() => validatePlan(3550000, plan({ firstDue: "2026-12-31" })));
});

test("Flexible-plan sale creates exact receivables, staged deposit and unified ledger", () => {
  const base = seed(),
    before = summary(base);
  const s = applyAction(base, { type: "contract", record: sale("alion-35") });
  const rows = installmentList(s).filter((i) => i.customerId === "alion-35");
  assert.equal(rows.length, 38);
  const after = summary(s);
  assert.equal(after.revenue, before.revenue + 3550000.75);
  assert.equal(after.cash, before.cash + 500000);
  assert.equal(
    after.balance,
    Math.round((before.balance + 3550000.75 - 500000) * 100) / 100,
  );
  assert.equal(after.depositPending, before.depositPending + 350000.5);
  const parts = depositSchedule(
    customerList(s).find((c) => c.id === "alion-35"),
  );
  assert.deepEqual(
    parts.map((p) => p.remaining),
    [0, 350000.5],
  );
  const ledger = customerLedger(s, "alion-35");
  const acc = accountOf(
    s,
    customerList(s).find((c) => c.id === "alion-35"),
  );
  assert.equal(ledger.at(-1).balance, acc.balance);
  assert.equal(acc.balance, 3050000.75);
  // Son taksite kuruşlu tahsilat ve kalan peşinat → bakiye kuruşu kuruşuna düşer
  const lastRow = rows.filter((r) => r.kind === "Cuota").at(-1);
  let t = applyAction(s, {
    type: "receipt",
    installmentId: lastRow.id,
    amount: lastRow.amount,
    method: "Transferencia bancaria",
    reference: "DEMO-PLAN",
  });
  t = applyAction(t, {
    type: "deposit-receipt",
    id: "alion-35",
    amount: 350000.5,
  });
  assert.equal(outstanding(t, lastRow), 0);
  const acc2 = accountOf(
    t,
    customerList(t).find((c) => c.id === "alion-35"),
  );
  assert.equal(
    acc2.balance,
    Math.round((3050000.75 - lastRow.amount - 350000.5) * 100) / 100,
  );
  assert.equal(customerLedger(t, "alion-35").at(-1).balance, acc2.balance);
  assert.throws(() =>
    applyAction(t, { type: "deposit-receipt", id: "alion-35", amount: 0.01 }),
  );
  assert.throws(() =>
    applyAction(base, {
      type: "contract",
      record: sale("alion-35", { depositExpected: 850000 }),
    }),
  );
});

test("Seed ledgers reconcile with account balances and portfolio totals", () => {
  const s = seed();
  const total = customerList(s).reduce((a, c) => {
    const led = customerLedger(s, c.id);
    const acc = accountOf(s, c);
    assert.equal(led.at(-1).balance, acc.balance);
    assert.equal(led[0].kind, "Contrato");
    return a + acc.balance;
  }, 0);
  assert.equal(Math.round(total * 100) / 100, summary(s).balance);
});

test("Draft contract blocks the unit without financial effect; sign and cancel lifecycle", () => {
  const base = seed(),
    before = summary(base);
  let s = applyAction(base, {
    type: "contract",
    record: sale("alion-34"),
    status: "Borrador",
  });
  assert(unitTaken(s, "alion-34"));
  for (const k of [
    "revenue",
    "cash",
    "balance",
    "collected",
    "sold",
    "overdue",
  ])
    assert.equal(summary(s)[k], before[k]);
  assert.equal(summary(s).drafts, before.drafts + 1);
  assert.equal(
    contractList(s).find((c) => c.id === "alion-34").status,
    "Borrador",
  );
  assert.throws(() => applyAction(s, { type: "reserve", id: "alion-34" }));
  assert.throws(() =>
    applyAction(s, { type: "contract", record: sale("alion-34") }),
  );
  s = applyAction(s, {
    type: "contract-status",
    id: "alion-34",
    status: "Pendiente de firma",
  });
  assert.equal(
    contractList(s).find((c) => c.id === "alion-34").status,
    "Pendiente de firma",
  );
  assert.throws(() =>
    applyAction(s, {
      type: "contract-sign",
      id: "alion-34",
      depositPaid: 900000,
    }),
  );
  const signed = applyAction(s, {
    type: "contract-sign",
    id: "alion-34",
    depositPaid: 500000,
  });
  assert.equal(summary(signed).cash, before.cash + 500000);
  assert.equal(summary(signed).revenue, before.revenue + 3550000.75);
  const view = contractList(signed).find((c) => c.id === "alion-34");
  assert.equal(view.status, "Activo");
  assert.equal(view.history.length, 3);
  // İptal: yalnızca taslak; konut stoka döner
  const cancelled = applyAction(s, {
    type: "contract-cancel",
    id: "alion-34",
    reason: "Müşteri vazgeçti",
  });
  assert(!unitTaken(cancelled, "alion-34"));
  assert.equal(
    contractList(cancelled).find((c) => c.id === "alion-34").status,
    "Anulado",
  );
  assert.equal(summary(cancelled).cash, before.cash);
  assert.throws(() =>
    applyAction(signed, {
      type: "contract-cancel",
      id: "alion-34",
      reason: "x",
    }),
  );
  assert.throws(() =>
    applyAction(s, { type: "contract-cancel", id: "alion-34", reason: " " }),
  );
});

test("Contract transfer changes the owner but keeps balance and plan", () => {
  const s = seed(),
    c = customerList(s)[0],
    before = accountOf(s, c);
  const t = applyAction(s, {
    type: "contract-transfer",
    id: c.id,
    name: "Demo Devralan",
    note: "Noter devri",
  });
  const c2 = customerList(t).find((x) => x.id === c.id);
  assert.equal(c2.name, "Demo Devralan");
  assert.equal(accountOf(t, c2).balance, before.balance);
  assert.equal(summary(t).balance, summary(s).balance);
  assert.equal(
    contractList(t)
      .find((x) => x.id === c.id)
      .history.at(-1).status,
    "Cesión",
  );
  assert.throws(() =>
    applyAction(t, {
      type: "contract-transfer",
      id: c.id,
      name: "Demo Devralan",
      note: "",
    }),
  );
});

test("Barter offset settles an approved progress payment without cash", () => {
  let s = seed();
  const barter = {
    id: "CNJ-1",
    project: "alion",
    unitId: "alion-32",
    company: "Constructora Ejemplo del Este",
    work: "Betonarme",
    amount: 40000,
    start: "2026-11-01",
    end: "2027-03-01",
    progress: 40,
    transfer: "Pendiente",
  };
  s = applyAction(s, { type: "barter", record: barter });
  // Onaysız hakedişe mahsup yapılamaz
  assert.throws(() =>
    applyAction(s, {
      type: "barter-offset",
      barterId: "CNJ-1",
      requestId: "CER-024",
      amount: 1000,
    }),
  );
  s = applyAction(s, { type: "approve", id: "CER-024" });
  const before = summary(s, "alion");
  s = applyAction(s, {
    type: "barter-offset",
    barterId: "CNJ-1",
    requestId: "CER-024",
    amount: 20000,
  });
  const mid = summary(s, "alion");
  assert.equal(mid.cash, before.cash);
  assert.equal(mid.payable, before.payable - 20000);
  assert.equal(mid.offset, before.offset + 20000);
  // Kalan 850.000 TL nakit ödenir; kasa yalnızca net tutar kadar azalır
  const paid = applyAction(s, { type: "pay-order", id: "CER-024" });
  assert.equal(summary(paid, "alion").cash, before.cash - 28500);
  assert.equal(summary(paid, "alion").paid, before.paid + 28500);
  // Barter bakiyesi ve hakediş bakiyesi aşılamaz; farklı firma reddedilir
  assert.throws(() =>
    applyAction(s, {
      type: "barter-offset",
      barterId: "CNJ-1",
      requestId: "CER-024",
      amount: 20001,
    }),
  );
  const full = applyAction(s, {
    type: "barter-offset",
    barterId: "CNJ-1",
    requestId: "CER-024",
    amount: 20000,
  });
  assert.equal(
    requestStatus(
      full,
      requestList(full).find((r) => r.id === "CER-024"),
    ),
    "Aprobado",
  );
  assert.throws(() =>
    applyAction(full, {
      type: "barter-offset",
      barterId: "CNJ-1",
      requestId: "CER-024",
      amount: 1,
    }),
  );
  let other = applyAction(seed(), {
    type: "barter",
    record: { ...barter, company: "Başka Firma" },
  });
  other = applyAction(other, { type: "approve", id: "CER-024" });
  assert.throws(() =>
    applyAction(other, {
      type: "barter-offset",
      barterId: "CNJ-1",
      requestId: "CER-024",
      amount: 1000,
    }),
  );
});

test("Full barter offset closes a progress payment as settled", () => {
  let s = seed();
  s = applyAction(s, {
    type: "barter",
    record: {
      id: "CNJ-2",
      project: "alion",
      unitId: "alion-38",
      company: "CONSTRUCTORA EJEMPLO DEL ESTE ",
      work: "Kaba inşaat",
      amount: 60000,
      start: "2026-11-01",
      end: "2027-03-01",
      progress: 0,
      transfer: "Pendiente",
    },
  });
  s = applyAction(s, { type: "approve", id: "CER-024" });
  const cash = summary(s).cash;
  s = applyAction(s, {
    type: "barter-offset",
    barterId: "CNJ-2",
    requestId: "CER-024",
    amount: 48500,
  });
  assert.equal(
    requestStatus(
      s,
      requestList(s).find((r) => r.id === "CER-024"),
    ),
    "Compensado",
  );
  assert.equal(summary(s).cash, cash);
  assert.throws(() => applyAction(s, { type: "pay-order", id: "CER-024" }));
});

test("Unit catalogue covers every unit with consistent attributes", () => {
  // ALION Residence — planilla pública: pisos 3–10, 8 unidades por piso, monoambientes T1–T5 y 2 dormitorios T6
  const al = units.filter((u) => u.project === "alion");
  assert.equal(al.length, 64);
  assert.deepEqual([...new Set(al.map((u) => u.floor))].sort((x, y) => x - y), [3, 4, 5, 6, 7, 8, 9, 10]);
  for (const f of [3, 4, 5, 6, 7, 8, 9, 10]) assert.equal(al.filter((u) => u.floor === f).length, 8);
  assert.deepEqual([...new Set(al.map((u) => u.gross))].sort((x, y) => x - y), [24.92, 28.82, 29.32, 30.69, 32.3, 72.2]);
  assert(al.filter((u) => u.gross === 72.2).every((u) => u.type.startsWith("2 dormitorios")));
  // Business One — brochure: Torre 01 (26 oficinas) y Torre 02 (22), desde 57 m², terrazas solo en el piso 7
  const b1 = units.filter((u) => u.project === "business");
  assert.equal(b1.length, 48);
  assert.equal(b1.filter((u) => u.block === "Torre 01").length, 26);
  assert.equal(b1.filter((u) => u.block === "Torre 02").length, 22);
  assert.equal(Math.min(...b1.map((u) => u.gross)), 57.21);
  assert(b1.filter((u) => u.type === "Oficina terraza").every((u) => u.floor === 7));
  // Lofty City Hub — tipologías publicadas; V Tower — muestra de 24 unidades
  const lf = units.filter((u) => u.project === "lofty");
  assert.equal(lf.length, 48);
  assert.deepEqual([...new Set(lf.map((u) => u.type))].sort(), ["DUO", "ONE 23", "SHARE", "SUITE 1D", "SUITE 2D", "SUITE 2D L"]);
  assert.equal(units.filter((u) => u.project === "vtower").length, 24);
  for (const u of units) {
    assert(u.gross >= u.net && u.net > 0);
    assert(u.listPrice > 0 && u.listPrice % 50 === 0);
    assert(u.floor >= 0);
  }
  assert.equal(new Set(units.map((u) => u.id)).size, units.length);
  // Etiquetas de venta iguales al catálogo
  for (const c of customerList(seed()))
    assert.equal(unitById(c.id).label, c.unit);
});

test("Demo seed is internally consistent and reconciles", () => {
  const s = seed();
  const all = installmentList(s);
  // Her daire en fazla bir kayıtta: satış, taslak, barter veya rezervasyon
  const owners = new Map();
  const claim = (id, who) => {
    assert(!owners.has(id), `${id} hem ${owners.get(id)} hem ${who}`);
    owners.set(id, who);
  };
  customerList(s).forEach((c) => claim(c.id, "satış"));
  s.drafts.forEach((d) => claim(d.id, "taslak"));
  s.barters.forEach((b) => claim(b.unitId, "barter"));
  for (const p of ["lofty", "alion", "vtower", "business"])
    reservedUnits(s, p).forEach((id) => claim(id, "reservadas"));
  // Esnek planlar bedelle kuruşu kuruşuna eşit, kayıtlı taksit tutarı plan tabanıyla aynı
  for (const c of [...s.contracts, ...s.drafts]) {
    const sch = buildSchedule(c.price, c.plan);
    assert.equal(toKurus(sch.depositTotal), toKurus(c.depositExpected));
    assert.equal(c.installment, sch.installment);
    assert.equal(unitById(c.id).label, c.unit);
    assert(c.deposit <= c.depositExpected);
  }
  // Tahsilatlar mevcut plan satırlarına bağlı ve bakiyeyi aşmıyor
  for (const r of s.receipts) {
    const i = all.find((i) => i.id === r.installmentId);
    assert(i, r.id);
    assert(outstanding(s, i) >= 0 && r.amount <= i.amount);
  }
  // Mahsuplar barter ve hakediş tutarlarını aşmıyor; firma ve proje eşleşiyor
  for (const o of s.offsets) {
    const b = s.barters.find((b) => b.id === o.barterId);
    const r = requestList(s).find((r) => r.id === o.requestId);
    assert(
      b &&
        r &&
        b.project === r.project &&
        b.company === r.company &&
        r.type === "Certificado de obra",
    );
  }
  for (const b of s.barters)
    assert(
      s.offsets
        .filter((o) => o.barterId === b.id)
        .reduce((a, o) => a + o.amount, 0) <= b.amount,
    );
  // Senaryo: gecikme, bekleyen peşinat, taslak, mahsup ve barter mevcut
  const vk = summary(s);
  assert(
    vk.overdue > 0 &&
      vk.depositPending > 0 &&
      vk.drafts === 2 &&
      vk.offset === 0 &&
      vk.barterCount === 0,
  );
  assert.equal(
    requestStatus(
      s,
      requestList(s).find((r) => r.id === "CER-026"),
    ),
    "Pagada",
  );
  // Kasa: Kasım öncesi peşinatlar açılış kasasına dahil, yalnızca Kasım hareketleri eklenir
  // Apertura (Lofty 420.000 + ALION 310.000 + V Tower 260.000 + Business One 150.000) + cobros de noviembre
  // + anticipo cobrado en la firma en noviembre (oficina T1-201: 49.800) − pagos de noviembre (CER-026 39.800 + GTO-001 4.800)
  assert.equal(vk.cash, 1140000 + vk.received + 49800 - 44600);
  // Toplamlar ve cari hesaplar tutarlı
  const tot = summary(s);
  assert.equal(
    tot.revenue,
    Math.round((tot.collected + tot.balance) * 100) / 100,
  );
  for (const c of customerList(s))
    assert.equal(
      customerLedger(s, c.id).at(-1).balance,
      accountOf(s, c).balance,
    );
});

test("Payment statuses classify every row and reconcile with portfolio totals", () => {
  assert.equal(paymentStatus(100, 0, "2026-10-01"), "Pagada");
  assert.equal(paymentStatus(100, 40, "2026-10-01"), "Vencida");
  assert.equal(paymentStatus(100, 40, "2026-12-01"), "Pago parcial");
  assert.equal(paymentStatus(100, 100, "2026-12-15"), "Próxima");
  assert.equal(paymentStatus(100, 100, "2026-12-16"), "Futura");
  const s = seed();
  const rows = paymentRows(s);
  const sum = (xs) =>
    Math.round(xs.reduce((a, r) => a + r.remaining, 0) * 100) / 100;
  const inst = rows.filter((r) => r.kind !== "Anticipo");
  assert.equal(inst.length, installmentList(s).length);
  assert.equal(
    sum(inst.filter((r) => r.status === "Vencida")),
    summary(s).overdue,
  );
  assert.equal(
    sum(rows.filter((r) => r.kind === "Anticipo")),
    summary(s).depositPending,
  );
  // Yönetici görünümündeki gecikme toplamı = taksit + ara ödeme + peşinat gecikmeleri
  assert.equal(
    sum(rows.filter((r) => r.status === "Vencida")),
    summary(s).overdueTotal,
  );
  for (const p of ["lofty", "alion", "vtower", "business"])
    assert.equal(
      sum(rows.filter((r) => r.status === "Vencida" && r.project === p)),
      summary(s, p).overdueTotal,
    );
  // Kısmen ödenmiş ve vadesi geçmiş taksit gecikmiş sayılır; ödenen kısım korunur
  const b44 = rows.find((r) => r.id === "alion-25-4");
  assert.equal(b44.status, "Vencida");
  assert.equal(b44.paid, 700);
  // Kademeli peşinatın vadesi geçmiş ikinci parçası gecikmiş peşinat olarak görünür
  assert.equal(
    rows.find((r) => r.id === "deposit:alion-26:1").status,
    "Vencida",
  );
  // Tahsilat satır durumunu günceller
  const t2 = applyAction(s, {
    type: "receipt",
    installmentId: "alion-25-4",
    amount: 700,
    method: "Efectivo",
    reference: "T",
  });
  assert.equal(
    paymentRows(t2).find((r) => r.id === "alion-25-4").status,
    "Pagada",
  );
});

test("Agenda lists signature, progress payment, barter and payment dates in order", () => {
  const items = agenda(seed(), "alion");
  assert(items.some((i) => i.ref.type === "draft" && i.ref.id === "alion-27"));
  assert(items.some((i) => i.ref.type === "request" && i.ref.id === "CER-025"));
  assert(items.some((i) => i.kind === "Anticipo" && i.ref.focus === "deposit"));
  assert(items.every((i) => i.project === "alion"));
  for (let k = 1; k < items.length; k++)
    assert(items[k - 1].date <= items[k].date);
  assert(items.every((i) => i.days <= 90));
});

test("Collection scope: prior + in-plan equals the collected total everywhere", () => {
  let s = seed();
  for (const p of ["all", "lofty", "alion", "vtower", "business"]) {
    const cb = collectionBreakdown(s, p);
    assert.equal(cb.total, summary(s, p).collected);
    assert(p === "business" ? cb.prior === 0 && cb.inPlan > 0 : cb.prior > 0 && cb.inPlan > 0);
    // Ödemeler ekranındaki "Pagada" tutarı = tüm satırlardaki tahsil edilen kısım
    const rowsPaid =
      Math.round(
        paymentRows(s)
          .filter((r) => p === "all" || r.project === p)
          .reduce((a, r) => a + r.paid, 0) * 100,
      ) / 100;
    assert.equal(rowsPaid, cb.inPlan);
  }
  // Tahsilat, deposit tahsilatı ve yeni satış her iki toplamı da birlikte değiştirir
  s = applyAction(s, {
    type: "receipt",
    installmentId: "alion-25-4",
    amount: 700,
    method: "Efectivo",
    reference: "T",
  });
  s = applyAction(s, {
    type: "deposit-receipt",
    id: "alion-26",
    amount: 2220,
  });
  s = applyAction(s, { type: "contract", record: sale("alion-35") });
  const cb = collectionBreakdown(s, "vtower");
  assert.equal(cb.total, summary(s, "vtower").collected);
  assert.equal(cb.prior, collectionBreakdown(seed(), "vtower").prior);
});

test("System documents exist for every contract, draft and barter", () => {
  const s = seed();
  for (const c of customerList(s)) {
    const docs = systemDocuments(s, c.id);
    assert(
      docs.some(
        (d) => d.kind === "Contrato de compraventa" && d.href.includes("tur=sozlesme"),
      ),
    );
    assert(docs.some((d) => d.kind === "Plan de pagos"));
  }
  assert(systemDocuments(s, "business-6")[0].kind === "Contrato de compraventa");
  for (const b of s.barters)
    assert.equal(
      systemDocuments(s, b.id)[0].href,
      `/belge/?tur=barter&id=${b.id}`,
    );
  // Tahsilat makbuzu müşterinin belgelerine eklenir
  const t2 = applyAction(s, {
    type: "receipt",
    installmentId: "alion-25-4",
    amount: 700,
    method: "Efectivo",
    reference: "M",
  });
  assert(
    systemDocuments(t2, "alion-25").filter((d) => d.kind === "Recibo")
      .length ===
      systemDocuments(s, "alion-25").filter((d) => d.kind === "Recibo")
        .length +
        1,
  );
});

test("File history is derived from contract events, payments and changes", () => {
  let s = seed();
  const h = fileHistory(s, "alion-1");
  assert(
    h.some((e) => e.kind === "Contrato" && e.title === "Contrato firmado"),
  );
  // Peşinat + ilk 4 taksit + Kasım tahsilatı
  const credits = h.filter((e) => e.amount);
  assert.equal(
    Math.round(credits.reduce((a, e) => a + e.amount, 0)),
    Math.round(
      accountOf(
        s,
        customerList(s).find((c) => c.id === "alion-1"),
      ).collected,
    ),
  );
  for (let k = 1; k < h.length; k++) assert(h[k - 1].date >= h[k].date);
  // Taslaktan imzaya geçen sözleşmenin tüm adımları görünür
  s = applyAction(s, {
    type: "contract-sign",
    id: "business-6",
    depositPaid: 58500,
  });
  const steps = fileHistory(s, "business-6")
    .filter((e) => e.kind === "Contrato")
    .map((e) => e.title);
  assert(
    steps.includes("Contrato · Borrador") &&
      steps.includes("Contrato · Pendiente de firma") &&
      steps.includes("Contrato firmado"),
  );
  // Vade değişikliği ve devir geçmişe yazılır
  s = applyAction(s, {
    type: "reschedule",
    id: "alion-25-4",
    date: "2026-11-30",
  });
  s = applyAction(s, {
    type: "contract-transfer",
    id: "alion-25",
    name: "Demo Devralan",
    note: "",
  });
  const h44 = fileHistory(s, "alion-25");
  assert(h44.some((e) => e.title === "Vencimiento modificado"));
  assert(h44.some((e) => e.title === "Contrato cedido"));
  assert(!h44.some((e) => e.title === "Datos del cliente actualizados"));
});

test("Document structure: every contract and barter has exactly one contract document; validity states", () => {
  let s = seed();
  const docsFor = (st) =>
    [...customerList(st), ...st.drafts, ...st.barters].map((r) =>
      systemDocuments(st, r.id).filter((d) => /^Contrato( de| en)/.test(d.kind)),
    );
  assert(docsFor(s).every((d) => d.length === 1));
  // İptal edilen taslağın belgesi listeden düşer; yeni barterın belgesi eklenir
  s = applyAction(s, {
    type: "contract-cancel",
    id: "alion-27",
    reason: "Vazgeçti",
  });
  assert.equal(systemDocuments(s, "alion-27").length, 0);
  s = applyAction(s, {
    type: "barter",
    record: {
      id: "CNJ-T",
      project: "alion",
      unitId: "alion-28",
      company: "Örnek Firma",
      work: "Trabajo",
      amount: 1000000,
      start: "2026-11-15",
      end: "2027-01-01",
      progress: 0,
      transfer: "Pendiente",
    },
  });
  assert.equal(systemDocuments(s, "CNJ-T")[0].kind, "Contrato de canje");
  assert.equal(documentValidity(""), "Sin vencimiento");
  assert.equal(documentValidity("2026-11-01"), "Vencido");
  assert.equal(documentValidity("2026-12-05"), "Por vencer");
  assert.equal(documentValidity("2027-06-01"), "Vigente");
});

test("Work (subcontractor) contracts are derived from work packages and progress payments", () => {
  const s = seed();
  const vk = workContracts(s, "alion");
  // ALION: un contrato de obra por cada contratista de sus paquetes de obra
  assert.deepEqual(vk.map((w) => w.company).sort(), [
    "Constructora Ejemplo del Este",
    "Fachadas Ejemplo S.R.L.",
    "Instalaciones Ejemplo S.A.",
  ]);
  const fachada = vk.find((w) => w.company === "Fachadas Ejemplo S.R.L.");
  assert.equal(fachada.offset, 0);
  assert.equal(fachada.hakedisTotal, 18600);
  const yapi = vk.find((w) => w.company === "Constructora Ejemplo del Este");
  assert.equal(yapi.hakedisTotal, 48500 + 47200);
  assert.equal(yapi.paid, 0);
  // Lofty: certificado pagado de la constructora
  const lf = workContracts(s, "lofty").find((w) => w.company === "Constructora Ejemplo del Este");
  assert.equal(lf.paid, netPayable(s, requestList(s).find((r) => r.id === "CER-026")));
  assert.equal(
    workContracts(s).length,
    ["lofty", "alion", "vtower", "business"].reduce((a, p) => a + workContracts(s, p).length, 0),
  );
  const doc = workContractDocument(s, fachada);
  assert.equal(doc.kind, "Contrato de obra");
  assert(doc.href.startsWith("/belge/?tur=is&id="));
});

console.log(`${checks} contract & plan suites passed.`);
