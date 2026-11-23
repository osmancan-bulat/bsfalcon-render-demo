// BŞ Falcon modülleri: kat karşılığı paylaşımı, şantiye gideri, hakediş/mahsup ve bütçe, süreç, sıfırlama.
import assert from "node:assert/strict";
import { seedState, applyAction, summary, requestList, migrateSaved, unitOwner, customerList } from "../lib/enterprise.ts";
import { salesReport, financialReport } from "../lib/reports.ts";
import { shareSummary, budgetReport, processOf, unitState } from "../lib/falcon-reports.ts";
import { CONTRACTOR } from "../lib/falcon.ts";
import { PORTFOLIO } from "../lib/portfolio.ts";

let checks = 0;
const test = (name, fn) => { fn(); checks++; console.log("PASS:", name); };
const seed = () => structuredClone(seedState);
const sale = (id) => ({ id, project: id.split("-")[0], name: "Örnek Alıcı", unit: "x", price: 7400000, deposit: 2000000, installment: 150000, paidMonths: 0 });

test("Official portfolio: 12 projects, completed delivery counts and active projects match the site", () => {
  assert.equal(PORTFOLIO.length, 12);
  const done = PORTFOLIO.filter((p) => p.status === "Tamamlandı");
  assert.equal(done.length, 6);
  assert.equal(done.reduce((a, p) => a + p.delivered, 0), 24 + 48 + 26 + 52 + 12 + 28);
  assert.deepEqual(PORTFOLIO.filter((p) => p.status === "Devam ediyor").map((p) => p.id), ["agva", "cengilli"]);
});

test("Seed share: agreed vs actual ratio, contractor sales only on contractor units", () => {
  const s = seed();
  const np = shareSummary(s, "nergis");
  assert.equal(np.agreedLandRatio, 45);
  assert.equal(np.owners.find((o) => o.id === "as-np-1").count, 10);
  assert.equal(np.owners.find((o) => o.id === "as-np-2").count, 7);
  assert.equal(np.actualLandRatio, Math.round((np.landGross / np.totalGross) * 1000) / 10);
  for (const c of customerList(s)) assert.equal(unitOwner(s, c.id), CONTRACTOR, c.id);
  for (const b of s.barters) assert.equal(unitOwner(s, b.unitId), CONTRACTOR, b.unitId);
  for (const d of s.drafts) assert.equal(unitOwner(s, d.id), CONTRACTOR, d.id);
  // Stok kırılımı: toplam = satış + imza + barter + rezerve + arsa sahibi + müsait
  for (const p of ["agva", "cengilli", "nergis"]) {
    const t = salesReport(s, { project: p }).total;
    assert.equal(t.sold + t.inSigning + t.barter + t.reserved + t.landowner + t.available, t.total, p);
  }
});

test("Landowner units cannot be sold, reserved or bartered by the contractor", () => {
  const s = seed();
  assert.throws(() => applyAction(s, { type: "contract", record: sale("nergis-16") }), /arsa sahibi/);
  assert.throws(() => applyAction(s, { type: "reserve", id: "nergis-36" }), /arsa sahibi/);
  assert.throws(() => applyAction(s, { type: "barter", record: { id: "BRT-X", project: "cengilli", unitId: "cengilli-6", company: "Karataş Yapı Taahhüt", work: "x", amount: 1, start: "2026-11-01", end: "2027-01-01", progress: 0, transfer: "Bekliyor" } }), /arsa sahibi/);
});

test("Reassigning a unit updates share ratio, stock, sellability and history; sold units are protected", () => {
  let s = seed();
  const before = shareSummary(s, "nergis");
  const st0 = salesReport(s, { project: "nergis" }).total;
  s = applyAction(s, { type: "share-assign", unit: "nergis-15", owner: "as-np-2", note: "Ek protokol taslağı" });
  const after = shareSummary(s, "nergis");
  const st1 = salesReport(s, { project: "nergis" }).total;
  assert.equal(after.owners.find((o) => o.id === "as-np-2").count, 8);
  assert.equal(st1.available, st0.available - 1);
  assert.equal(st1.landowner, st0.landowner + 1);
  assert(after.actualLandRatio > before.actualLandRatio);
  assert.equal(unitState(s, "nergis-15", "nergis"), "Arsa sahibi");
  assert.throws(() => applyAction(s, { type: "contract", record: sale("nergis-15") }), /arsa sahibi/);
  assert.match(s.landshare.history[0].text, /3-15.*Yüklenici → Arsa sahibi 2.*Ek protokol/);
  // Geri alınca bölüm yeniden satılabilir
  s = applyAction(s, { type: "share-assign", unit: "nergis-15", owner: CONTRACTOR });
  assert.deepEqual(shareSummary(s, "nergis").owners.map((o) => o.count), before.owners.map((o) => o.count));
  s = applyAction(s, { type: "contract", record: sale("nergis-15") });
  assert(customerList(s).some((c) => c.id === "nergis-15"));
  // Satılmış / imza sürecindeki / barterli bölüm aktarılamaz; anlaşmasız proje reddedilir
  assert.throws(() => applyAction(s, { type: "share-assign", unit: "nergis-1", owner: "as-np-1" }), /aktarılamaz/);
  assert.throws(() => applyAction(s, { type: "share-assign", unit: "nergis-14", owner: "as-np-1" }), /aktarılamaz/);
  assert.throws(() => applyAction(s, { type: "share-assign", unit: "nergis-33", owner: "as-np-1" }), /aktarılamaz/);
  assert.throws(() => applyAction(s, { type: "share-assign", unit: "agva-1", owner: "as-np-1" }), /anlaşması/);
  assert.throws(() => applyAction(s, { type: "share-assign", unit: "nergis-20", owner: "yok" }), /Geçersiz/);
});

test("Agreement steps and obligations change status and are logged", () => {
  let s = seed();
  s = applyAction(s, { type: "share-step", project: "nergis", key: "insaat", status: "Tamamlandı" });
  const st = shareSummary(s, "nergis").agreement.steps.find((x) => x.key === "insaat");
  assert.equal(st.status, "Tamamlandı");
  const open0 = shareSummary(s, "nergis").openObligations;
  s = applyAction(s, { type: "obligation-toggle", project: "nergis", id: "YK-NP-1" });
  assert.equal(shareSummary(s, "nergis").openObligations, open0 - 1);
  assert.match(s.landshare.history[0].text, /Yükümlülük tamamlandı/);
  s = applyAction(s, { type: "process-step", project: "cengilli", key: "uygulama", status: "Tamamlandı" });
  assert.equal(processOf(s, "cengilli").done, processOf(seed(), "cengilli").done + 1);
});

test("Site expense reduces cash once and flows into finance and budget reports", () => {
  let s = seed();
  const sum0 = summary(s, "agva"), b0 = budgetReport(s, "agva"), f0 = financialReport(s, { project: "agva", from: "2026-11-01", to: "2026-11-30" });
  s = applyAction(s, { type: "expense", record: { project: "agva", category: "Malzeme", company: "Örnek tedarikçi", name: "Hazır beton · 24 m³", amount: 86400.5, date: "2026-11-14" } });
  const r = requestList(s).find((x) => x.name === "Hazır beton · 24 m³");
  assert.equal(r.type, "Şantiye gideri");
  assert.equal(summary(s, "agva").cash, Math.round((sum0.cash - 86400.5) * 100) / 100);
  assert.equal(summary(s, "agva").paid, Math.round((sum0.paid + 86400.5) * 100) / 100);
  const f1 = financialReport(s, { project: "agva", from: "2026-11-01", to: "2026-11-30" });
  assert.equal(f1.outflow, Math.round((f0.outflow + 86400.5) * 100) / 100);
  const b1 = budgetReport(s, "agva");
  assert.equal(b1.spent, Math.round((b0.spent + 86400.5) * 100) / 100);
  assert.equal(b1.byType.find((t) => t.type === "Şantiye gideri").paid, 86400.5);
  assert.equal(budgetReport(s, "cengilli").spent, budgetReport(seed(), "cengilli").spent);
  for (const bad of [{ amount: 0 }, { amount: -5 }, { date: "2026-12-01" }, { name: " " }])
    assert.throws(() => applyAction(seed(), { type: "expense", record: { project: "agva", category: "Malzeme", company: "x", name: "y", amount: 10, date: "2026-11-10", ...bad } }));
});

test("Progress payment created, approved, partially offset by barter and paid: budget and cash stay consistent", () => {
  let s = seed();
  s = applyAction(s, { type: "request", record: { id: "HAK-500", project: "cengilli", company: "Karataş Yapı Taahhüt", name: "Villa V-04 kaba inşaat hakedişi", type: "Hakediş", amount: 1500000, due: "2026-11-30", status: "Onay bekliyor" } });
  const id = s.requests.find((r) => r.name === "Villa V-04 kaba inşaat hakedişi").id;
  const b0 = budgetReport(s, "cengilli");
  s = applyAction(s, { type: "approve", id });
  assert.equal(budgetReport(s, "cengilli").committed, b0.committed + 1500000);
  s = applyAction(s, { type: "barter-offset", barterId: "BRT-CV-01", requestId: id, amount: 500000 });
  const cash0 = summary(s, "cengilli").cash;
  s = applyAction(s, { type: "pay-order", id });
  assert.equal(summary(s, "cengilli").cash, cash0 - 1000000);
  const b1 = budgetReport(s, "cengilli");
  assert.equal(b1.spent, b0.spent + 1500000);
  assert.equal(b1.committed, b0.committed);
});

test("Demo reset restores share, process and expense records; old saved data gains Falcon fields", () => {
  let s = seed();
  s = applyAction(s, { type: "share-assign", unit: "nergis-15", owner: "as-np-1" });
  s = applyAction(s, { type: "expense", record: { project: "nergis", category: "Nakliye", company: "x", name: "y", amount: 1000, date: "2026-11-10" } });
  s = applyAction(s, { type: "reset" });
  assert.deepEqual(s, seedState);
  const old = { ...seed() };
  delete old.landshare;
  delete old.process;
  const out = migrateSaved(JSON.stringify(old));
  assert.deepEqual(out.state.landshare, seedState.landshare);
  assert.deepEqual(out.state.process, seedState.process);
});

console.log(`${checks} Falcon suites passed.`);
