// Çalışma kapsamı regresyonları: silinen / arşivlenen / yeniden aktifleştirilen / yeniden adlandırılan
// proje ile kapsam, kayıtlı seçim ve bağlantı doğrulaması; proje silmenin diğer kayıtları etkilememesi.
import assert from "node:assert/strict";
import { seedState, applyAction, summary, customerList, contractList, paymentRows } from "../lib/enterprise.ts";
import { financialReport, salesReport, installmentReport, barterReport, subcontractorReport, managerReport } from "../lib/reports.ts";
import { syncCatalog, isScopeValid, resolveScope, scopeProblem, visibleProjects, projectById } from "../lib/catalog.ts";

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);
const create = (s, name = "Silinecek Proje", code = "SP") => {
  const next = applyAction(s, { type: "project-create", record: { name, code, location: "Bursa", delivery: "", description: "" } });
  return [next, next.projectsCustom.at(-1).id];
};

test("Deleting the selected empty project makes its id an invalid scope that resolves to all projects", () => {
  let [s, id] = create(seed());
  s = applyAction(s, { type: "block-create", project: id, block: "A", floors: 2, perFloor: 2, startFloor: 0, unitType: "2+1", gross: 100, listPrice: 2000000, facade: "Frente" });
  syncCatalog(s);
  assert(isScopeValid(id));
  assert.equal(resolveScope(id), id);
  s = applyAction(s, { type: "project-delete", id });
  syncCatalog(s);
  assert.equal(isScopeValid(id), false);
  assert.equal(resolveScope(id), "all");
  assert.equal(scopeProblem(id), "missing");
  assert(!visibleProjects().some((p) => p.id === id));
  // Silinen projenin kimliği hiçbir kayıtta kalmaz (daireler, düzenlemeler, katalog)
  const json = JSON.stringify({ ...s, audit: [] });
  assert(!json.includes(`"${id}-`), "unit ids removed");
  assert(!json.includes(`"id":"${id}"`), "project record removed");
  assert.equal(projectById(id), undefined);
});

test("Archiving the selected project invalidates it as scope; reactivation makes it selectable again", () => {
  let [s, id] = create(seed(), "Arşiv Proje", "AP");
  s = applyAction(s, { type: "project-status", id, status: "Archivado" });
  syncCatalog(s);
  assert.equal(isScopeValid(id), false);
  assert.equal(scopeProblem(id), "archived");
  assert.equal(resolveScope(id), "all");
  s = applyAction(s, { type: "project-status", id, status: "Activo" });
  syncCatalog(s);
  assert(isScopeValid(id));
  assert.equal(resolveScope(id), id);
  assert(visibleProjects().some((p) => p.id === id));
  // Tamamlanan proje kapsam olarak seçilebilir (salt görüntüleme)
  s = applyAction(s, { type: "project-status", id: "alion", status: "Finalizado" });
  syncCatalog(s);
  assert(isScopeValid("alion"));
  // Yerleşik proje arşivlenirse eski adresi de geçersiz olur
  s = applyAction(s, { type: "project-status", id: "vtower", status: "Archivado" });
  syncCatalog(s);
  assert.equal(scopeProblem("vtower"), "archived");
});

test("Renaming a project updates the catalog used by the scope picker immediately", () => {
  let [s, id] = create(seed(), "Eski Ad", "EA");
  s = applyAction(s, { type: "project-update", id, patch: { name: "Yeni Ad Konutları", location: "Nilüfer", delivery: "2030", description: "x" } });
  // applyAction sonrası katalog yeni durumla eşittir (arayüz aynı listeyi okur)
  const p = projectById(id);
  assert.equal(p.name, "Yeni Ad Konutları");
  assert.equal(p.location, "Nilüfer");
  assert(visibleProjects().some((x) => x.name === "Yeni Ad Konutları"));
  assert.equal(resolveScope(id), id);
});

test("Stored or linked scopes that do not exist resolve safely (reload and old links)", () => {
  syncCatalog(seed());
  for (const bad of [null, undefined, "", "p99", "lofty-city-hub", "ALL", "silinmis"]) {
    assert.equal(resolveScope(bad), "all", String(bad));
  }
  assert.equal(scopeProblem("p99"), "missing");
  assert.equal(scopeProblem(""), "missing");
  for (const ok of ["all", "vtower", "alion", "business"]) assert.equal(resolveScope(ok), ok);
  assert.equal(scopeProblem("vtower"), null);
});

test("Deleting a project changes no other project's customers, contracts, finances or reports", () => {
  const base = seed();
  let [s, id] = create(base);
  s = applyAction(s, { type: "block-create", project: id, block: "A", floors: 1, perFloor: 4, startFloor: 0, unitType: "1+1", gross: 70, listPrice: 1500000, facade: "Doğu" });
  const before = {};
  for (const p of ["all", "vtower", "alion", "business"]) {
    const f = { project: p };
    before[p] = JSON.stringify([
      summary(s, p),
      financialReport(s, f),
      salesReport(s, f).total,
      installmentReport(s, f),
      barterReport(s, f).totals,
      subcontractorReport(s, f).totals,
      managerReport(s, f).rows.filter((r) => r.project !== id).map((r) => [r.project, r.fin, r.sales]),
    ]);
  }
  const people = JSON.stringify(customerList(s));
  const contracts = JSON.stringify(contractList(s).filter((c) => c.project !== id));
  const rows = JSON.stringify(paymentRows(s));
  const records = (x) => JSON.stringify([x.contracts, x.drafts, x.receipts, x.depositPayments, x.barters, x.offsets, x.requests, x.reminders, x.paidOrders, x.approved]);
  const recordsBefore = records(s);
  s = applyAction(s, { type: "project-delete", id });
  for (const p of ["all", "vtower", "alion", "business"]) {
    const f = { project: p };
    const after = JSON.stringify([
      summary(s, p),
      financialReport(s, f),
      salesReport(s, f).total,
      installmentReport(s, f),
      barterReport(s, f).totals,
      subcontractorReport(s, f).totals,
      managerReport(s, f).rows.filter((r) => r.project !== id).map((r) => [r.project, r.fin, r.sales]),
    ]);
    if (p === "all") {
      // Şirket toplamı yalnızca silinen projenin (boş) stoğu kadar değişir; finans aynı kalır
      const [sb, fb] = JSON.parse(before[p]);
      const [sa, fa] = JSON.parse(after);
      assert.equal(sa.total, sb.total - 4);
      assert.deepEqual(fa, fb);
      assert.equal(sa.revenue, sb.revenue);
      assert.equal(sa.collected, sb.collected);
    } else assert.equal(after, before[p], p);
  }
  assert.equal(JSON.stringify(customerList(s)), people);
  assert.equal(JSON.stringify(contractList(s)), contracts);
  assert.equal(JSON.stringify(paymentRows(s)), rows);
  assert.equal(records(s), recordsBefore);
  // Sonuç başlangıç durumuyla aynı (proje yokmuş gibi)
  assert.deepEqual(summary(s), summary(base));
});

console.log(`${checks} scope suites passed.`);
