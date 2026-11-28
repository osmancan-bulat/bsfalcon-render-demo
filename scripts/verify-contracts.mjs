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
import { setCurrencyView } from "../lib/currency.ts";

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
    const taksit = sch.rows.filter((r) => r.kind === "Taksit");
    assert.equal(taksit.length, count);
    // Taksitler tam TL; kuruş farkı yalnızca son taksitte
    taksit
      .slice(0, -1)
      .forEach((r) => assert.equal(toKurus(r.amount) % 100, 0));
    assert.equal(sch.rows.filter((r) => r.kind === "Ara ödeme").length, 1);
  }
  assert.throws(() => validatePlan(1000, plan()));
  assert.throws(() => validatePlan(3550000, plan({ count: 0 })));
  assert.throws(() => validatePlan(3550000, plan({ firstDue: "2026-12-31" })));
});

test("Flexible-plan sale creates exact receivables, staged deposit and unified ledger", () => {
  const base = seed(),
    before = summary(base);
  const s = applyAction(base, { type: "contract", record: sale("nergis-71") });
  const rows = installmentList(s).filter((i) => i.customerId === "nergis-71");
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
    customerList(s).find((c) => c.id === "nergis-71"),
  );
  assert.deepEqual(
    parts.map((p) => p.remaining),
    [0, 350000.5],
  );
  const ledger = customerLedger(s, "nergis-71");
  const acc = accountOf(
    s,
    customerList(s).find((c) => c.id === "nergis-71"),
  );
  assert.equal(ledger.at(-1).balance, acc.balance);
  assert.equal(acc.balance, 3050000.75);
  // Son taksite kuruşlu tahsilat ve kalan peşinat → bakiye kuruşu kuruşuna düşer
  const lastRow = rows.filter((r) => r.kind === "Taksit").at(-1);
  let t = applyAction(s, {
    type: "receipt",
    installmentId: lastRow.id,
    amount: lastRow.amount,
    method: "Banka havalesi",
    reference: "DEMO-PLAN",
  });
  t = applyAction(t, {
    type: "deposit-receipt",
    id: "nergis-71",
    amount: 350000.5,
  });
  assert.equal(outstanding(t, lastRow), 0);
  const acc2 = accountOf(
    t,
    customerList(t).find((c) => c.id === "nergis-71"),
  );
  assert.equal(
    acc2.balance,
    Math.round((3050000.75 - lastRow.amount - 350000.5) * 100) / 100,
  );
  assert.equal(customerLedger(t, "nergis-71").at(-1).balance, acc2.balance);
  assert.throws(() =>
    applyAction(t, { type: "deposit-receipt", id: "nergis-71", amount: 0.01 }),
  );
  assert.throws(() =>
    applyAction(base, {
      type: "contract",
      record: sale("nergis-71", { depositExpected: 850000 }),
    }),
  );
});

test("Seed ledgers reconcile with account balances and portfolio totals", () => {
  const s = seed();
  const total = customerList(s).reduce((a, c) => {
    const led = customerLedger(s, c.id);
    const acc = accountOf(s, c);
    assert.equal(led.at(-1).balance, acc.balance);
    assert.equal(led[0].kind, "Sözleşme");
    return a + acc.balance;
  }, 0);
  assert.equal(Math.round(total * 100) / 100, summary(s).balance);
});

test("Draft contract blocks the unit without financial effect; sign and cancel lifecycle", () => {
  const base = seed(),
    before = summary(base);
  let s = applyAction(base, {
    type: "contract",
    record: sale("nergis-70"),
    status: "Taslak",
  });
  assert(unitTaken(s, "nergis-70"));
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
    contractList(s).find((c) => c.id === "nergis-70").status,
    "Taslak",
  );
  assert.throws(() => applyAction(s, { type: "reserve", id: "nergis-70" }));
  assert.throws(() =>
    applyAction(s, { type: "contract", record: sale("nergis-70") }),
  );
  s = applyAction(s, {
    type: "contract-status",
    id: "nergis-70",
    status: "İmza bekliyor",
  });
  assert.equal(
    contractList(s).find((c) => c.id === "nergis-70").status,
    "İmza bekliyor",
  );
  assert.throws(() =>
    applyAction(s, {
      type: "contract-sign",
      id: "nergis-70",
      depositPaid: 900000,
    }),
  );
  const signed = applyAction(s, {
    type: "contract-sign",
    id: "nergis-70",
    depositPaid: 500000,
  });
  assert.equal(summary(signed).cash, before.cash + 500000);
  assert.equal(summary(signed).revenue, before.revenue + 3550000.75);
  const view = contractList(signed).find((c) => c.id === "nergis-70");
  assert.equal(view.status, "Aktif");
  assert.equal(view.history.length, 3);
  // İptal: yalnızca taslak; konut stoka döner
  const cancelled = applyAction(s, {
    type: "contract-cancel",
    id: "nergis-70",
    reason: "Müşteri vazgeçti",
  });
  assert(!unitTaken(cancelled, "nergis-70"));
  assert.equal(
    contractList(cancelled).find((c) => c.id === "nergis-70").status,
    "İptal",
  );
  assert.equal(summary(cancelled).cash, before.cash);
  assert.throws(() =>
    applyAction(signed, {
      type: "contract-cancel",
      id: "nergis-70",
      reason: "x",
    }),
  );
  assert.throws(() =>
    applyAction(s, { type: "contract-cancel", id: "nergis-70", reason: " " }),
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
    "Devir",
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
    id: "BRT-1",
    project: "cengilli",
    unitId: "cengilli-30",
    company: "Kuzey Cephe Sistemleri",
    work: "Betonarme",
    amount: 1000000,
    start: "2026-11-01",
    end: "2027-03-01",
    progress: 40,
    transfer: "Bekliyor",
  };
  s = applyAction(s, { type: "barter", record: barter });
  // Onaysız hakedişe mahsup yapılamaz
  assert.throws(() =>
    applyAction(s, {
      type: "barter-offset",
      barterId: "BRT-1",
      requestId: "HAK-024",
      amount: 100000,
    }),
  );
  s = applyAction(s, { type: "approve", id: "HAK-024" });
  const before = summary(s, "cengilli");
  s = applyAction(s, {
    type: "barter-offset",
    barterId: "BRT-1",
    requestId: "HAK-024",
    amount: 400000,
  });
  const mid = summary(s, "cengilli");
  assert.equal(mid.cash, before.cash);
  assert.equal(mid.payable, before.payable - 400000);
  assert.equal(mid.offset, before.offset + 400000);
  // Kalan 1.450.000 TL nakit ödenir; kasa yalnızca net tutar kadar azalır
  const paid = applyAction(s, { type: "pay-order", id: "HAK-024" });
  assert.equal(summary(paid, "cengilli").cash, before.cash - 1450000);
  assert.equal(summary(paid, "cengilli").paid, before.paid + 1450000);
  // Barter bakiyesi ve hakediş bakiyesi aşılamaz; farklı firma reddedilir
  assert.throws(() =>
    applyAction(s, {
      type: "barter-offset",
      barterId: "BRT-1",
      requestId: "HAK-024",
      amount: 600001,
    }),
  );
  const full = applyAction(s, {
    type: "barter-offset",
    barterId: "BRT-1",
    requestId: "HAK-024",
    amount: 600000,
  });
  assert.equal(
    requestStatus(
      full,
      requestList(full).find((r) => r.id === "HAK-024"),
    ),
    "Onaylandı",
  );
  assert.throws(() =>
    applyAction(full, {
      type: "barter-offset",
      barterId: "BRT-1",
      requestId: "HAK-024",
      amount: 1,
    }),
  );
  let other = applyAction(seed(), {
    type: "barter",
    record: { ...barter, company: "Başka Firma" },
  });
  other = applyAction(other, { type: "approve", id: "HAK-024" });
  assert.throws(() =>
    applyAction(other, {
      type: "barter-offset",
      barterId: "BRT-1",
      requestId: "HAK-024",
      amount: 1000,
    }),
  );
});

test("Full barter offset closes a progress payment as settled", () => {
  let s = seed();
  s = applyAction(s, {
    type: "barter",
    record: {
      id: "BRT-2",
      project: "cengilli",
      unitId: "cengilli-31",
      company: "KUZEY CEPHE SİSTEMLERİ ",
      work: "Kaba inşaat",
      amount: 2000000,
      start: "2026-11-01",
      end: "2027-03-01",
      progress: 0,
      transfer: "Bekliyor",
    },
  });
  s = applyAction(s, { type: "approve", id: "HAK-024" });
  const cash = summary(s).cash;
  s = applyAction(s, {
    type: "barter-offset",
    barterId: "BRT-2",
    requestId: "HAK-024",
    amount: 1850000,
  });
  assert.equal(
    requestStatus(
      s,
      requestList(s).find((r) => r.id === "HAK-024"),
    ),
    "Mahsup edildi",
  );
  assert.equal(summary(s).cash, cash);
  assert.throws(() => applyAction(s, { type: "pay-order", id: "HAK-024" }));
});

test("Unit catalogue covers every unit with consistent attributes", () => {
  // Guzel Life Premium — resmî (byguzel.com): 5 blok, 90 daire; 2+1, 3+1, 4+1 bahçe dubleks, 5+1 dubleks penthouse
  const np = units.filter((u) => u.project === "nergis");
  assert.equal(np.length, 90);
  assert.deepEqual([...new Set(np.map((u) => u.block))], ["A", "B", "C", "D", "E"]);
  for (const b of "ABCDE") assert.equal(np.filter((u) => u.block === b).length, 18);
  assert.deepEqual([...new Set(np.map((u) => u.type))].sort(), ["2+1", "3+1", "4+1 bahçe dubleks", "5+1 dubleks penthouse"]);
  assert(np.every((u) => u.gross >= 125 && u.gross <= 230));
  assert.equal(new Set(np.map((u) => u.label)).size, 90);
  // Guzel Nature — resmî: tek blok, 6 kat, ilk kat sosyal alan; daire adedi yayımlanmadı (40 örnek)
  const gn = units.filter((u) => u.project === "cengilli");
  assert(gn.every((u) => u.floor >= 2 && u.floor <= 6));
  assert(gn.every((u) => u.gross >= 50 && u.gross <= 180));
  // City Prime — resmî: 2+1, 65–122 m² (12 örnek bölüm)
  const cp = units.filter((u) => u.project === "agva");
  assert(cp.every((u) => u.type === "2+1" && u.gross >= 65 && u.gross <= 122));
  assert.equal(Math.min(...cp.map((u) => u.listPrice)), 185000);
  for (const u of units) {
    assert(u.gross > u.net && u.net > 0);
    assert(u.listPrice > 0 && u.listPrice % 1000 === 0);
    assert(u.floor >= 0);
  }
  // Satış etiketleri katalogla aynı
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
  for (const p of ["cengilli", "nergis", "agva"])
    reservedUnits(s, p).forEach((id) => claim(id, "rezerve"));
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
        r.type === "Hakediş",
    );
  }
  for (const b of s.barters)
    assert(
      s.offsets
        .filter((o) => o.barterId === b.id)
        .reduce((a, o) => a + o.amount, 0) <= b.amount,
    );
  // Senaryo (By Güzel): gecikme, bekleyen peşinat ve taslaklar mevcut; barter ve mahsup kullanılmıyor
  const vk = summary(s);
  assert(vk.overdue > 0 && vk.depositPending > 0 && vk.drafts === 2 && vk.offset === 0 && vk.barterCount === 0);
  assert.equal(requestStatus(s, requestList(s).find((r) => r.id === "HAK-026")), "Ödendi");
  // Kasa para birimi bazında: açılış + Kasım tahsilatı + Kasımda imzada alınan peşinat − Kasım ödemeleri
  // EUR: açılış 1.890.000 + agva-8 peşinatı 70.000 (5 Kasım); USD: açılış 320.000; TRY: açılış 16.600.000 − (HAK-026 960.000 + GDR-001 185.000)
  const cashOf = (c) => {
    setCurrencyView(c);
    try {
      return summary(s);
    } finally {
      setCurrencyView(null);
    }
  };
  const eur = cashOf("EUR"), usd = cashOf("USD"), tl = cashOf("TRY");
  assert.equal(eur.cash, 1890000 + eur.received + 70000);
  assert.equal(usd.cash, 320000 + usd.received);
  assert.equal(tl.cash, 16600000 + tl.received - 960000 - 185000);
  assert.equal(tl.paid, 1145000);
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
  assert.equal(paymentStatus(100, 0, "2026-10-01"), "Ödendi");
  assert.equal(paymentStatus(100, 40, "2026-10-01"), "Gecikti");
  assert.equal(paymentStatus(100, 40, "2026-12-01"), "Kısmen ödendi");
  assert.equal(paymentStatus(100, 100, "2026-12-15"), "Yaklaşıyor");
  assert.equal(paymentStatus(100, 100, "2026-12-16"), "Gelecek dönem");
  const s = seed();
  const rows = paymentRows(s);
  const sum = (xs) =>
    Math.round(xs.reduce((a, r) => a + r.remaining, 0) * 100) / 100;
  const inst = rows.filter((r) => r.kind !== "Peşinat");
  assert.equal(inst.length, installmentList(s).length);
  assert.equal(
    sum(inst.filter((r) => r.status === "Gecikti")),
    summary(s).overdue,
  );
  assert.equal(
    sum(rows.filter((r) => r.kind === "Peşinat")),
    summary(s).depositPending,
  );
  // Yönetici görünümündeki gecikme toplamı = taksit + ara ödeme + peşinat gecikmeleri
  assert.equal(
    sum(rows.filter((r) => r.status === "Gecikti")),
    summary(s).overdueTotal,
  );
  for (const p of ["cengilli", "nergis", "agva"])
    assert.equal(
      sum(rows.filter((r) => r.status === "Gecikti" && r.project === p)),
      summary(s, p).overdueTotal,
    );
  // Kısmen ödenmiş ve vadesi geçmiş taksit gecikmiş sayılır; ödenen kısım korunur
  const b44 = rows.find((r) => r.id === "nergis-50-4");
  assert.equal(b44.status, "Gecikti");
  assert.equal(b44.paid, 3000);
  // Kademeli peşinatın vadesi geçmiş ikinci parçası gecikmiş peşinat olarak görünür
  assert.equal(
    rows.find((r) => r.id === "deposit:nergis-51:1").status,
    "Gecikti",
  );
  // Tahsilat satır durumunu günceller
  const t2 = applyAction(s, {
    type: "receipt",
    installmentId: "nergis-50-4",
    amount: 3000,
    method: "Nakit",
    reference: "T",
  });
  assert.equal(
    paymentRows(t2).find((r) => r.id === "nergis-50-4").status,
    "Ödendi",
  );
});

test("Agenda lists signature, progress payment, barter and payment dates in order", () => {
  const items = agenda(seed(), "nergis");
  assert(items.some((i) => i.ref.type === "draft" && i.ref.id === "nergis-52"));
  assert(agenda(seed(), "cengilli").some((i) => i.ref.type === "request" && i.ref.id === "HAK-025"));
  assert(items.some((i) => i.kind === "Peşinat" && i.ref.focus === "deposit"));
  assert(items.every((i) => i.project === "nergis"));
  for (let k = 1; k < items.length; k++)
    assert(items[k - 1].date <= items[k].date);
  assert(items.every((i) => i.days <= 90));
});

test("Collection scope: prior + in-plan equals the collected total everywhere", () => {
  let s = seed();
  for (const p of ["all", "cengilli", "nergis", "agva"]) {
    const cb = collectionBreakdown(s, p);
    assert.equal(cb.total, summary(s, p).collected);
    assert(cb.prior > 0 && cb.inPlan > 0);
    // Ödemeler ekranındaki "Ödendi" tutarı = tüm satırlardaki tahsil edilen kısım
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
    installmentId: "nergis-50-4",
    amount: 3000,
    method: "Nakit",
    reference: "T",
  });
  s = applyAction(s, {
    type: "deposit-receipt",
    id: "nergis-51",
    amount: 25000,
  });
  s = applyAction(s, { type: "contract", record: sale("nergis-71") });
  const cb = collectionBreakdown(s, "cengilli");
  assert.equal(cb.total, summary(s, "cengilli").collected);
  assert.equal(cb.prior, collectionBreakdown(seed(), "cengilli").prior);
});

test("System documents exist for every contract, draft and barter", () => {
  const s = seed();
  for (const c of customerList(s)) {
    const docs = systemDocuments(s, c.id);
    assert(
      docs.some(
        (d) => d.kind === "Satış sözleşmesi" && d.href.includes("tur=sozlesme"),
      ),
    );
    assert(docs.some((d) => d.kind === "Ödeme planı"));
  }
  assert(systemDocuments(s, "cengilli-4")[0].kind === "Satış sözleşmesi");
  for (const b of s.barters)
    assert.equal(
      systemDocuments(s, b.id)[0].href,
      `/belge/?tur=barter&id=${b.id}`,
    );
  // Tahsilat makbuzu müşterinin belgelerine eklenir
  const t2 = applyAction(s, {
    type: "receipt",
    installmentId: "nergis-12-16",
    amount: 1000,
    method: "Nakit",
    reference: "M",
  });
  assert(
    systemDocuments(t2, "nergis-12").filter((d) => d.kind === "Makbuz")
      .length ===
      systemDocuments(s, "nergis-12").filter((d) => d.kind === "Makbuz")
        .length +
        1,
  );
});

test("File history is derived from contract events, payments and changes", () => {
  let s = seed();
  const h = fileHistory(s, "nergis-1");
  assert(
    h.some((e) => e.kind === "Sözleşme" && e.title === "Sözleşme imzalandı"),
  );
  // Peşinat + ilk 4 taksit + Kasım tahsilatı
  const credits = h.filter((e) => e.amount);
  assert.equal(
    Math.round(credits.reduce((a, e) => a + e.amount, 0)),
    Math.round(
      accountOf(
        s,
        customerList(s).find((c) => c.id === "nergis-1"),
      ).collected,
    ),
  );
  for (let k = 1; k < h.length; k++) assert(h[k - 1].date >= h[k].date);
  // Taslaktan imzaya geçen sözleşmenin tüm adımları görünür
  s = applyAction(s, {
    type: "contract-sign",
    id: "cengilli-21",
    depositPaid: 38150,
  });
  const steps = fileHistory(s, "cengilli-21")
    .filter((e) => e.kind === "Sözleşme")
    .map((e) => e.title);
  assert(
    steps.includes("Sözleşme · Taslak") &&
      steps.includes("Sözleşme · İmza bekliyor") &&
      steps.includes("Sözleşme imzalandı"),
  );
  // Vade değişikliği ve devir geçmişe yazılır
  s = applyAction(s, {
    type: "reschedule",
    id: "nergis-12-16",
    date: "2026-11-30",
  });
  s = applyAction(s, {
    type: "contract-transfer",
    id: "nergis-12",
    name: "Demo Devralan",
    note: "",
  });
  const h44 = fileHistory(s, "nergis-12");
  assert(h44.some((e) => e.title === "Vade değiştirildi"));
  assert(h44.some((e) => e.title === "Sözleşme devredildi"));
  assert(!h44.some((e) => e.title === "Müşteri bilgileri güncellendi"));
});

test("Document structure: every contract and barter has exactly one contract document; validity states", () => {
  let s = seed();
  const docsFor = (st) =>
    [...customerList(st), ...st.drafts, ...st.barters].map((r) =>
      systemDocuments(st, r.id).filter((d) => d.kind.endsWith("sözleşmesi")),
    );
  assert(docsFor(s).every((d) => d.length === 1));
  // İptal edilen taslağın belgesi listeden düşer; yeni barterın belgesi eklenir
  s = applyAction(s, {
    type: "contract-cancel",
    id: "nergis-52",
    reason: "Vazgeçti",
  });
  assert.equal(systemDocuments(s, "nergis-52").length, 0);
  s = applyAction(s, {
    type: "barter",
    record: {
      id: "BRT-T",
      project: "nergis",
      unitId: "nergis-74",
      company: "Örnek Firma",
      work: "İş",
      amount: 1000000,
      start: "2026-11-15",
      end: "2027-01-01",
      progress: 0,
      transfer: "Bekliyor",
    },
  });
  assert.equal(systemDocuments(s, "BRT-T")[0].kind, "Barter sözleşmesi");
  assert.equal(documentValidity(""), "Süresiz");
  assert.equal(documentValidity("2026-11-01"), "Süresi doldu");
  assert.equal(documentValidity("2026-12-05"), "Süresi yaklaşıyor");
  assert.equal(documentValidity("2027-06-01"), "Geçerli");
});

test("Work (subcontractor) contracts are derived from work packages and progress payments", () => {
  const s = seed();
  const vk = workContracts(s, "nergis");
  // Guzel Life Premium iş paketlerindeki her firma için bir iş sözleşmesi
  assert.deepEqual(vk.map((w) => w.company).sort(), [
    "Atlas Mekanik Elektrik",
    "Karataş Yapı Taahhüt",
    "Kuzey Cephe Sistemleri",
  ]);
  // Guzel Nature: kaba yapı firmasının iki hakedişi (onaylı, ödenmemiş), cephe firmasının onay bekleyen hakedişi
  const gn = workContracts(s, "cengilli");
  const yapi = gn.find((w) => w.company === "Karataş Yapı Taahhüt");
  assert.equal(yapi.hakedisTotal, 1380000 + 1180000);
  assert.equal(yapi.paid, 0);
  assert.equal(yapi.offset, 0);
  // City Prime: cephe firmasının ödenen hakedişi
  const cephe = workContracts(s, "agva").find((w) => w.company === "Kuzey Cephe Sistemleri");
  assert.equal(cephe.paid, netPayable(s, requestList(s).find((r) => r.id === "HAK-026")));
  assert.equal(cephe.paid, 960000);
  // By Güzel senaryosunda barter / mahsup yok
  assert(workContracts(s).every((w) => !w.barterId && w.offset === 0));
  assert.equal(
    workContracts(s).length,
    vk.length + gn.length + workContracts(s, "agva").length,
  );
  const doc = workContractDocument(s, cephe);
  assert.equal(doc.kind, "İş sözleşmesi");
  assert(doc.href.startsWith("/belge/?tur=is&id="));
});

console.log(`${checks} contract & plan suites passed.`);
