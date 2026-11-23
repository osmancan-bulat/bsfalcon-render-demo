// Kurgusal veri seti kalitesi, kimlik tutarlılığı ve tarayıcı verisi geçişi testleri.
import assert from "node:assert/strict";
import {
  seedState,
  applyAction,
  migrateSaved,
  customerList,
  contractList,
  paymentRows,
  systemDocuments,
  requestList,
  workContracts,
  agenda,
  summary,
  DATASET,
} from "../lib/enterprise.ts";
import { personName, FIRM, renameLegacy } from "../lib/names.ts";
import { units, unitById, unitPlace, unitShort } from "../lib/units.ts";
import { customers, workItems, SNAPSHOT } from "../lib/data.ts";

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);

test("Seed contains no generic placeholder names or test wording", () => {
  const text = JSON.stringify(seedState) + JSON.stringify(workItems);
  for (const bad of ["Cliente demo", "Constructora demo", "Instalaciones demo", "Fachadas demo", "Aceros demo", "Aberturas demo", "Asesor demo", "DEMO-"])
    assert(!text.includes(bad), `seed still contains "${bad}"`);
  // İletişim veya kimlik bilgisi yok
  assert(!/\b0?5\d{2}[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}\b/.test(text), "phone-like value");
  assert(!/@[a-z0-9-]+\.[a-z]/i.test(text), "e-mail-like value");
  assert(!/\b\d{11}\b/.test(text), "national-ID-like value");
});

test("Every person is unique and keeps one identity across files, contracts, payments and documents", () => {
  const s = seed();
  const people = [...customerList(s), ...s.drafts];
  assert.equal(new Set(people.map((c) => c.name)).size, people.length);
  assert.equal(new Set(people.map((c) => c.id)).size, people.length);
  const byId = new Map(people.map((c) => [c.id, c.name]));
  for (const c of contractList(s)) assert.equal(c.name, byId.get(c.id));
  for (const r of paymentRows(s)) assert(byId.has(r.customerId), r.id);
  // Sistem belgeleri (sözleşme, plan, ekstre, makbuz) aynı kayda bağlanır
  for (const id of ["business-5", "alion-25", "vtower-9"]) {
    const docs = systemDocuments(s, id);
    assert(docs.length >= 3);
    for (const d of docs) assert(d.href.includes(`id=${id}`) || d.href.includes("THS-"), d.href);
  }
  // Ad, aynı kayıt numarasından her yerde aynı üretilir
  assert.equal(s.contracts.find((c) => c.id === "alion-25").name, personName(81));
  assert.equal(customers.find((c) => c.id === "alion-1").name, personName(21));
  // Hatırlatma, ilgili taslağın müşteri adını taşır
  const noter = s.reminders.find((r) => r.id === "HTR-D01");
  assert(noter.title.includes(s.drafts.find((d) => d.id === "business-6").name));
});

test("Firms are consistent across work packages, barters, progress payments and work contracts", () => {
  const s = seed();
  const firms = new Set(Object.values(FIRM));
  for (const w of workItems) assert(firms.has(w.company), w.company);
  for (const b of s.barters) assert(firms.has(b.company), b.company);
  for (const r of requestList(s)) if (r.type !== "Gasto de obra") assert(firms.has(r.company), r.company);
  const corner = workContracts(s, "vtower");
  assert.deepEqual(
    corner.map((w) => w.id),
    corner.map((_, i) => `IS-VTL-${String(i + 1).padStart(2, "0")}`),
  );
  // Her barter firması aynı projede bir iş sözleşmesine bağlıdır
  for (const b of s.barters)
    assert(workContracts(s, b.project).some((w) => w.company === b.company && w.barterId === b.id), b.id);
});

test("Base sale prices follow the unit catalogue and keep deposit + 36 installments = price", () => {
  for (const c of customers) {
    const u = unitById(c.id);
    assert(u, c.id);
    assert.equal(c.unit, u.label);
    assert.equal(c.deposit + 36 * c.installment, c.price);
    const disc = 1 - c.price / u.listPrice;
    assert(disc > 0.01 && disc < 0.05, `${c.id} discount ${disc}`);
  }
  // Büyük ve üst kat daire, küçük alt kat daireden pahalıdır
  const big = customers.find((c) => c.id === "alion-6"); // 606A · 2 dormitorios 72,20 m²
  const small = customers.find((c) => c.id === "alion-4"); // 304G · monoambiente 24,92 m²
  assert(big.price > small.price);
});

test("Sold, barter and draft units never overlap; a taken unit cannot be sold again", () => {
  const s = seed();
  const taken = [
    ...customerList(s).map((c) => c.id),
    ...s.drafts.map((d) => d.id),
    ...s.barters.map((b) => b.unitId),
  ];
  assert.equal(new Set(taken).size, taken.length);
  for (const id of taken) assert(units.some((u) => u.id === id), id);
  for (const id of [customerList(s)[0].id, s.drafts[0].id])
    assert.throws(() =>
      applyAction(s, {
        type: "contract",
        record: { ...customers[0], id, project: id.split("-")[0], unit: unitById(id).label, name: "Prueba" },
      }),
    );
});

test("Readable unit place keeps technical code mapping", () => {
  assert.equal(unitPlace("business-5"), "Torre 01 · Piso 2 · Oficina T1-201");
  assert.equal(unitShort("alion-25"), "Unidad 601D");
  assert.equal(unitPlace("alion-1"), "ALION · Piso 3 · Unidad 301D");
  assert.equal(unitPlace("business-25"), "Torre 01 · Piso 7 · Oficina T1-701");
  assert.equal(unitShort("vtower-9"), "Unidad I-501");
  assert.equal(unitById("business-5").label, "T1-201");
});

test("Scenario dates are fixed to 15 Nov 2026 and statuses follow them", () => {
  assert.equal(SNAPSHOT, "2026-11-15");
  const rows = paymentRows(seed());
  for (const r of rows) {
    if (r.remaining === 0) assert.equal(r.status, "Pagada");
    else if (r.due < SNAPSHOT) assert.equal(r.status, "Vencida", r.id);
    else assert.notEqual(r.status, "Vencida", r.id);
    if (r.remaining > 0 && r.paid > 0 && r.due >= SNAPSHOT) assert.equal(r.status, "Pago parcial");
  }
  // Ajanda geçmiş tarihli ödeme satırı göstermez; gecikenler ayrı izlenir
  for (const a of agenda(seed(), "all", 30))
    if (a.kind === "Cuota" || a.kind === "Anticipo") assert(a.date >= SNAPSHOT, a.id);
});

test("Legacy browser data migrates names safely without losing user actions", () => {
  // Önceki sürüm: jenerik adlar, dataset alanı yok, v3.1 bedelleri, kullanıcı bir tahsilat girmiş
  let s = seed();
  s.basePricing = "v3.1";
  const inst = paymentRows(s).find((r) => r.status === "Vencida" && r.installmentId);
  s = applyAction(s, { type: "receipt", installmentId: inst.installmentId, amount: 100, method: "Transferencia bancaria", reference: "TRF-1" });
  const legacyText = JSON.stringify({ ...s, dataset: undefined, basePricing: undefined })
    .split(personName(81)).join("Cliente demo 081")
    .split(FIRM.yapi).join("Constructora demo")
    .split(FIRM.cephe).join("Fachadas demo");
  assert(legacyText.includes("Cliente demo 081") && legacyText.includes("Constructora demo"));
  const out = migrateSaved(legacyText);
  assert(out && out.migrated);
  assert.equal(out.state.dataset, DATASET);
  assert.deepEqual(out.state.receipts, s.receipts);
  assert.deepEqual(out.state.contracts.map((c) => c.id), s.contracts.map((c) => c.id));
  assert.equal(out.state.contracts.find((c) => c.id === "alion-25").name, personName(81));
  assert.deepEqual(summary(out.state), summary(s));
  assert(!JSON.stringify(out.state).includes("Constructora demo"));
  // Las solicitudes conservan el proveedor migrado
  assert(out.state.requests.some((x) => x.company === FIRM.yapi));
  // İkinci yükleme veriyi tekrar değiştirmez
  const again = migrateSaved(JSON.stringify(out.state));
  assert.equal(again.migrated, false);
  assert.deepEqual(again.state, out.state);
  // Bozuk veya başka sürüm veri reddedilir (örnek veriyle başlanır)
  assert.equal(migrateSaved(JSON.stringify({ version: 1 })), null);
  assert.equal(renameLegacy("Cliente demo 005"), personName(5));
});

test("Work contracts carry an agreement value and progress consistent with their progress payments", () => {
  const s = seed();
  for (const w of workContracts(s)) {
    assert(w.value > 0, w.id);
    assert(w.hakedisTotal < w.value, w.id);
    // Hakedişi olan firmanın iş paketlerinden en az biri başlamış olmalı
    if (w.hakedisTotal > 0) assert(w.packages.some((p) => p.progress > 0), w.id);
  }
  for (const b of s.barters) {
    const w = workContracts(s, b.project).find((x) => x.barterId === b.id);
    assert(w.packages.some((p) => p.progress > 0), b.id + ' barter work not started');
  }
});

console.log(`${checks} dataset suites passed.`);
