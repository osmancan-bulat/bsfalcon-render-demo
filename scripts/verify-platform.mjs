// Çok projeli platform regresyonları: dinamik proje yaşam döngüsü, blok/daire yönetimi, yeni projede
// satıştan rapora tam akış, arşiv kuralları, izlenebilir tahsilat iptali, çift kayıt koruması ve
// bozuk tarayıcı verisinin güvenli açılması.
import assert from "node:assert/strict";
import {
  seedState,
  applyAction,
  summary,
  customerList,
  contractList,
  contractNumber,
  installmentList,
  paymentRows,
  accountOf,
  customerLedger,
  migrateSaved,
  workContracts,
  unitTaken,
  activeReceipts,
  nextReceiptId,
  projects,
  SNAPSHOT,
} from "../lib/enterprise.ts";
import { financialReport, salesReport, installmentReport, managerReport, reportCsv } from "../lib/reports.ts";
import { unitById, units } from "../lib/units.ts";
import { syncCatalog, visibleProjects, hubHref } from "../lib/catalog.ts";

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);
const r2 = (n) => Math.round(n * 100) / 100;
const project = (over = {}) => ({ name: "Kuzey Vadi Konutları", code: "KV", location: "Mudanya / Bursa", delivery: "Haziran 2029", description: "Temsili yeni proje", ...over });
const block = (projectId, over = {}) => ({ type: "block-create", project: projectId, block: "A", floors: 3, perFloor: 2, startFloor: 0, unitType: "2+1", gross: 110, listPrice: 3000000, facade: "Güney", ...over });
const newProjectId = (s) => s.projectsCustom.at(-1).id;
const sale = (id, name = "Deniz Kaya", over = {}) => ({
  id,
  project: id.split("-")[0],
  name,
  unit: unitById(id).label,
  price: 2900000,
  listPrice: 3000000,
  deposit: 600000,
  depositExpected: 600000,
  installment: 0,
  paidMonths: 0,
  plan: { deposits: [{ amount: 600000, due: SNAPSHOT }], count: 23, firstDue: "2026-12-15", interim: [{ amount: 200000, due: "2027-06-30", label: "Ara ödeme" }] },
  ...over,
});

test("A new project starts empty and is included everywhere automatically", () => {
  const s0 = seed();
  const s = applyAction(s0, { type: "project-create", record: project() });
  const id = newProjectId(s);
  syncCatalog(s);
  const p = projects.find((x) => x.id === id);
  assert(p && p.status === "Aktif" && p.code === "KV" && p.total === 0);
  assert(!id.includes("-"));
  assert(visibleProjects().some((x) => x.id === id));
  assert.equal(hubHref(id), `/proje/?id=${id}`);
  // Boş başlar: başka projenin hiçbir kaydı kopyalanmaz
  assert.equal(customerList(s).filter((c) => c.project === id).length, 0);
  assert.equal(paymentRows(s).filter((r) => r.project === id).length, 0);
  const sm = summary(s, id);
  for (const k of ["revenue", "collected", "balance", "overdueTotal", "cash", "sold", "total", "progress"]) assert.equal(sm[k], 0, k);
  // Şirket toplamları değişmez, yeni proje raporlarda sıfır satırla yer alır
  assert.deepEqual(summary(s).revenue, summary(s0).revenue);
  assert(managerReport(s, { project: "all" }).rows.some((r) => r.project === id && r.fin.contracted === 0));
  assert(!JSON.stringify(reportCsv(s, "yonetici", { project: "all" })).includes("NaN"));
  // Yerleşik projelerin kimlikleri ve numaraları değişmez
  assert.equal(contractNumber("agva-1"), "SZL-AG-001");
  assert.equal(contractNumber("nergis-12"), "SZL-NP-012");
  assert.deepEqual(workContracts(s, "cengilli").map((w) => w.id), ["IS-CV-01", "IS-CV-02", "IS-CV-03"]);
});

test("Project validation: unique name and code, code format, edits and built-in protection", () => {
  let s = applyAction(seed(), { type: "project-create", record: project() });
  assert.throws(() => applyAction(s, { type: "project-create", record: project({ name: "Başka", code: "KV" }) }), /kodu/);
  assert.throws(() => applyAction(s, { type: "project-create", record: project({ name: "kuzey vadi konutları", code: "ZZ" }) }), /adla/);
  assert.throws(() => applyAction(s, { type: "project-create", record: project({ name: "X Proje", code: "K1" }) }), /kodu/);
  assert.throws(() => applyAction(s, { type: "project-create", record: project({ name: "Y Proje", code: "CV" }) }), /kodu/);
  const id = newProjectId(s);
  s = applyAction(s, { type: "project-update", id, patch: { name: "Kuzey Vadi Evleri", location: "Mudanya", delivery: "2029", description: "" } });
  syncCatalog(s);
  assert.equal(projects.find((p) => p.id === id).name, "Kuzey Vadi Evleri");
  assert.equal(projects.find((p) => p.id === id).code, "KV");
  assert.throws(() => applyAction(s, { type: "project-delete", id: "cengilli" }), /silinemez/);
});

test("Blocks generate correctly numbered units; numbering continues; duplicates and bad input are rejected", () => {
  let s = applyAction(seed(), { type: "project-create", record: project() });
  const id = newProjectId(s);
  s = applyAction(s, block(id));
  s = applyAction(s, block(id, { block: "B", floors: 2, perFloor: 3, startFloor: -1, unitType: "3+1", gross: 150, listPrice: 4500000 }));
  syncCatalog(s);
  const us = units.filter((u) => u.project === id);
  assert.equal(us.length, 6 + 6);
  assert.deepEqual(us.map((u) => u.no), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(new Set(us.map((u) => u.id)).size, 12);
  assert.equal(unitById(`${id}-7`).label, "B-07");
  assert.equal(unitById(`${id}-7`).floor, -1);
  assert.equal(projects.find((p) => p.id === id).total, 12);
  assert.throws(() => applyAction(s, block(id)), /zaten var/);
  assert.throws(() => applyAction(s, block(id, { block: "C", floors: 0 })), /Kat/);
  assert.throws(() => applyAction(s, block(id, { block: "C", listPrice: 0 })), /fiyat/);
  // Yerleşik projeye blok eklenince numaralar kaldığı yerden devam eder, mevcut daireler değişmez
  const c = applyAction(seed(), block("nergis", { block: "C" }));
  syncCatalog(c);
  assert.equal(unitById("nergis-39").label, "C-39");
  assert.equal(unitById("nergis-12").label, "3-12");
  assert.equal(summary(c, "nergis").total, 44);
});

test("Full flow in a new project: sale → contract → plan → receipts → reports, isolated from other projects", () => {
  const s0 = seed();
  let s = applyAction(s0, { type: "project-create", record: project() });
  const id = newProjectId(s);
  s = applyAction(s, block(id));
  s = applyAction(s, { type: "contract", record: sale(`${id}-1`) });
  assert.equal(contractNumber(`${id}-1`), "SZL-KV-001");
  const v = contractList(s).find((c) => c.id === `${id}-1`);
  assert.equal(v.status, "Aktif");
  assert.equal(v.number, "SZL-KV-001");
  const rows = installmentList(s).filter((i) => i.customerId === `${id}-1`);
  // 23 taksit + 1 ara ödeme; peşinat + satırlar = bedel
  assert.equal(rows.length, 24);
  assert.equal(r2(600000 + rows.reduce((a, r) => a + r.amount, 0)), 2900000);
  assert(unitTaken(s, `${id}-1`));
  assert.throws(() => applyAction(s, { type: "contract", record: sale(`${id}-1`, "Başka Kişi") }), /satılmış/);
  const first = rows.find((r) => r.kind !== "Ara ödeme");
  s = applyAction(s, { type: "receipt", installmentId: first.id, amount: 30000, method: "Banka havalesi", reference: "HVL-KV-1" });
  const acc = accountOf(s, customerList(s).find((c) => c.id === `${id}-1`));
  assert.equal(acc.collected, 630000);
  assert.equal(acc.balance, 2270000);
  const f = financialReport(s, { project: id });
  assert.equal(f.contracted, 2900000);
  assert.equal(f.collected, 630000);
  assert.equal(f.inflow, 630000);
  assert.equal(salesReport(s, { project: id }).total.sold, 1);
  assert.equal(salesReport(s, { project: id }).total.available, 5);
  // Şirket toplamı = önceki toplam + yeni proje; Çengilli ve Nergis Park hiç değişmez
  assert.equal(financialReport(s, { project: "all" }).contracted, r2(financialReport(s0, { project: "all" }).contracted + 2900000));
  assert.deepEqual(financialReport(s, { project: "cengilli" }), financialReport(s0, { project: "cengilli" }));
  assert.deepEqual(installmentReport(s, { project: "nergis" }), installmentReport(s0, { project: "nergis" }));
  assert(!JSON.stringify(reportCsv(s, "taksit", { project: "cengilli" })).includes("SZL-KV"));
});

test("Unit edits apply only to unsold units and never change an existing sale price", () => {
  let s = applyAction(seed(), { type: "project-create", record: project() });
  const id = newProjectId(s);
  s = applyAction(s, block(id));
  s = applyAction(s, { type: "contract", record: sale(`${id}-1`) });
  assert.throws(() => applyAction(s, { type: "unit-update", id: `${id}-1`, patch: { type: "2+1", gross: 110, listPrice: 9999999, facade: "Güney" } }), /düzenlenemez/);
  s = applyAction(s, { type: "unit-update", id: `${id}-2`, patch: { type: "3+1", gross: 140, listPrice: 4100000, facade: "Doğu" } });
  syncCatalog(s);
  assert.equal(unitById(`${id}-2`).listPrice, 4100000);
  assert.equal(unitById(`${id}-2`).type, "3+1");
  // Yerleşik müsait daire düzenlenir; örnek satış bedelleri değişmez
  const before = customerList(s).find((c) => c.id === "nergis-1").price;
  const free = units.find((u) => u.project === "nergis" && !unitTaken(s, u.id));
  s = applyAction(s, { type: "unit-update", id: free.id, patch: { type: free.type, gross: free.gross, listPrice: free.listPrice + 100000, facade: free.facade } });
  assert.equal(customerList(s).find((c) => c.id === "nergis-1").price, before);
  assert.throws(() => applyAction(s, { type: "unit-update", id: "agva-1", patch: { type: "2+1", gross: 1, listPrice: 1, facade: "" } }), /düzenlenemez/);
});

test("Archiving keeps financial records, blocks new sales and barter; reactivation and safe deletion", () => {
  let s = applyAction(seed(), { type: "project-create", record: project() });
  const id = newProjectId(s);
  s = applyAction(s, block(id));
  s = applyAction(s, { type: "contract", record: sale(`${id}-1`) });
  const totalBefore = summary(s).revenue;
  s = applyAction(s, { type: "project-status", id, status: "Arşiv" });
  syncCatalog(s);
  assert(!visibleProjects().some((p) => p.id === id));
  assert.equal(summary(s).revenue, totalBefore);
  assert.equal(financialReport(s, { project: id }).contracted, 2900000);
  assert.throws(() => applyAction(s, { type: "contract", record: sale(`${id}-2`, "Ece Demir") }), /aktif projede/);
  assert.throws(() => applyAction(s, { type: "barter", record: { id: "BRT-X", project: id, unitId: `${id}-3`, company: "Atlas Mekanik Elektrik", work: "İş", amount: 100000, start: "2026-11-01", end: "2027-01-01", progress: 0, transfer: "Bekliyor" } }), /aktif projede/);
  assert.throws(() => applyAction(s, block(id, { block: "B" })), /Arşiv/);
  assert.throws(() => applyAction(s, { type: "project-delete", id }), /silinemez/);
  assert.throws(() => applyAction(s, { type: "project-status", id, status: "Arşiv" }), /zaten/);
  s = applyAction(s, { type: "project-status", id, status: "Aktif" });
  s = applyAction(s, { type: "contract", record: sale(`${id}-2`, "Ece Demir") });
  assert.equal(customerList(s).filter((c) => c.project === id).length, 2);
  // Kaydı olmayan yeni proje silinebilir; daireleri de kaldırılır
  let e = applyAction(seed(), { type: "project-create", record: project({ name: "Boş Proje", code: "BX" }) });
  const eid = newProjectId(e);
  e = applyAction(e, block(eid));
  e = applyAction(e, { type: "project-delete", id: eid });
  syncCatalog(e);
  assert(!projects.some((p) => p.id === eid));
  assert(!units.some((u) => u.project === eid));
  // Tamamlanan proje görünür kalır ama yeni satış almaz
  let t = applyAction(seed(), { type: "project-status", id: "nergis", status: "Tamamlandı" });
  syncCatalog(t);
  assert(visibleProjects().some((p) => p.id === "nergis"));
  assert.throws(() => applyAction(t, { type: "contract", record: { ...sale("nergis-35"), id: "nergis-35", project: "nergis", unit: "7-35" } }), /aktif projede|satılmış/);
});

test("Receipts: duplicate reference and double submit are rejected; amounts are rounded to the kuruş", () => {
  let s = seed();
  const row = paymentRows(s).find((r) => r.status === "Gecikti" && r.kind === "Taksit" && r.paid === 0);
  s = applyAction(s, { type: "receipt", installmentId: row.installmentId, amount: 10000, method: "Banka havalesi", reference: "HVL-123" });
  assert.throws(() => applyAction(s, { type: "receipt", installmentId: row.installmentId, amount: 10000, method: "Banka havalesi", reference: "hvl-123 " }), /zaten kaydedildi/);
  s = applyAction(s, { type: "receipt", installmentId: row.installmentId, amount: 10.005, method: "Banka havalesi", reference: "HVL-124" });
  assert.equal(s.receipts.at(-1).amount, 10.01);
  assert.throws(() => applyAction(s, { type: "receipt", installmentId: row.installmentId, amount: 0.001, method: "Banka havalesi", reference: "HVL-125" }));
  assert.equal(new Set(s.receipts.map((r) => r.id)).size, s.receipts.length);
});

test("Receipt reversal is traceable: balance and overdue restored, ledger keeps both lines, reports follow", () => {
  let s = seed();
  const row = paymentRows(s).find((r) => r.status === "Gecikti" && r.kind === "Taksit" && r.paid === 0);
  const c0 = customerList(s).find((c) => c.id === row.customerId);
  const before = accountOf(s, c0);
  const novBefore = financialReport(s, { project: row.project, from: "2026-11-01", to: "2026-11-30" }).inflow;
  s = applyAction(s, { type: "receipt", installmentId: row.installmentId, amount: row.remaining, method: "Banka havalesi", reference: "HVL-YANLIS" });
  const rid = s.receipts.at(-1).id;
  assert.throws(() => applyAction(s, { type: "receipt-reverse", id: rid, reason: " " }), /gerekçe/);
  s = applyAction(s, { type: "receipt-reverse", id: rid, reason: "Yanlış müşteriye işlendi" });
  const after = accountOf(s, customerList(s).find((c) => c.id === row.customerId));
  assert.equal(after.collected, before.collected);
  assert.equal(after.balance, before.balance);
  assert.equal(after.overdue, before.overdue);
  assert.equal(s.receipts.length, seedState.receipts.length + 1);
  assert(s.receipts.find((r) => r.id === rid).reversal);
  assert.equal(activeReceipts(s).length, seedState.receipts.length);
  const ledger = customerLedger(s, row.customerId);
  assert(ledger.some((e) => e.ref === rid && e.credit === row.remaining));
  assert(ledger.some((e) => e.kind === "İptal" && e.credit === -row.remaining));
  assert.equal(ledger.at(-1).balance, after.balance);
  assert.equal(financialReport(s, { project: row.project, from: "2026-11-01", to: "2026-11-30" }).inflow, novBefore);
  assert.equal(financialReport(s, { project: row.project }).inflow, financialReport(s, { project: row.project }).collected);
  assert.throws(() => applyAction(s, { type: "receipt-reverse", id: rid, reason: "Tekrar" }), /zaten/);
  // Aynı dekont iptalden sonra doğru taksite yeniden girilebilir; makbuz numarası çakışmaz
  s = applyAction(s, { type: "receipt", installmentId: row.installmentId, amount: 5000, method: "Banka havalesi", reference: "HVL-YANLIS" });
  assert.equal(new Set(s.receipts.map((r) => r.id)).size, s.receipts.length);
  assert.equal(nextReceiptId({ receipts: [{ id: "THS-0010" }, { id: "THS-D01" }] }), "THS-0011");
});

test("Corrupt or partial browser data opens safely and reports what was skipped", () => {
  const base = seed();
  const cases = [
    [{ ...base, customerEdits: null }, 1],
    [{ ...base, barters: null }, 1],
    [{ ...base, contracts: [...base.contracts, { id: "cengilli-45", project: "cengilli" }] }, 1],
    [{ ...base, receipts: [...base.receipts, { id: "X", installmentId: "nope", amount: "abc" }] }, 1],
    [{ ...base, unitsCustom: [{ id: "bad" }], projectsCustom: "x" }, 2],
  ];
  for (const [state, repaired] of cases) {
    const out = migrateSaved(JSON.stringify(state));
    assert(out, "should open");
    assert.equal(out.repaired, repaired);
    summary(out.state);
    paymentRows(out.state);
  }
  assert.equal(migrateSaved("{bozuk"), null);
  assert.equal(migrateSaved(JSON.stringify({ version: 9 })), null);
  // v4.1 verisi (yeni alanlar yok) olduğu gibi açılır
  const v41 = { ...base };
  delete v41.projectsCustom;
  delete v41.unitsCustom;
  delete v41.projectEdits;
  delete v41.unitEdits;
  const out = migrateSaved(JSON.stringify(v41));
  assert.equal(out.repaired, 0);
  assert.deepEqual(out.state.projectsCustom, []);
  assert.deepEqual(summary(out.state), summary(base));
});

test("Work packages link firm → work contract → progress payment → barter offset in a new project", () => {
  let s = applyAction(seed(), { type: "project-create", record: project() });
  const id = newProjectId(s);
  s = applyAction(s, block(id));
  s = applyAction(s, { type: "work-create", record: { project: id, name: "Kaba inşaat", company: "Toprak Yapı İnşaat", value: 9000000, weight: 60 } });
  assert.throws(() => applyAction(s, { type: "work-create", record: { project: id, name: "İnce işler", company: "X Firma", value: 1000, weight: 50 } }), /100/);
  s = applyAction(s, { type: "work-create", record: { project: id, name: "İnce işler", company: "Toprak Yapı İnşaat", value: 3000000, weight: 40 } });
  const wc = workContracts(s, id);
  assert.equal(wc.length, 1);
  assert.equal(wc[0].id, "IS-KV-01");
  assert.equal(wc[0].value, 12000000);
  s = applyAction(s, { type: "request", record: { id: "HAK-KV1", project: id, company: "Toprak Yapı İnşaat", name: "Kaba inşaat 1. hakediş", type: "Hakediş", amount: 800000, due: "2026-12-01", status: "Onay bekliyor" } });
  const hid = s.requests.find((r) => r.name === "Kaba inşaat 1. hakediş").id;
  s = applyAction(s, { type: "approve", id: hid });
  s = applyAction(s, { type: "barter", record: { id: "BRT-KV-01", project: id, unitId: id + "-5", company: "Toprak Yapı İnşaat", work: "Kaba inşaat karşılığı daire", amount: 3000000, start: "2026-11-01", end: "2027-06-01", progress: 10, transfer: "Bekliyor" } });
  s = applyAction(s, { type: "barter-offset", barterId: "BRT-KV-01", requestId: hid, amount: 300000 });
  const w = workContracts(s, id)[0];
  assert.equal(w.hakedisTotal, 800000);
  assert.equal(w.offset, 300000);
  assert.equal(w.barterId, "BRT-KV-01");
  const f = financialReport(s, { project: id });
  assert.equal(f.barterRemaining, 2700000);
  assert.equal(f.payableApproved, 500000);
  assert.equal(f.inflow, 0);
  assert.equal(f.outflow, 0);
  // Mahsup nakit değildir; satılabilir daire sayısı barter dairesi kadar azalır
  assert.equal(salesReport(s, { project: id }).total.barter, 1);
  assert.equal(salesReport(s, { project: id }).total.available, 5);
  // Kalan hakedişi aşan ikinci mahsup reddedilir
  assert.throws(() => applyAction(s, { type: "barter-offset", barterId: "BRT-KV-01", requestId: hid, amount: 600000 }), /aşamaz/);
});

console.log(`${checks} platform suites passed.`);
