// Araç ve filo yönetimi: araç ekleme/düzenleme, MTV ve sigorta tarihleri, hatırlatma kovaları,
// tamamlanan işlemde ödeme + yeni son tarih, işlem geçmişi ve sıfırlama.
import assert from "node:assert/strict";
import { seedState, applyAction, summary } from "../lib/enterprise.ts";
import { fleetReminders, bucketOf, vehicleSummary, seedFleet, BUCKETS } from "../lib/fleet.ts";

let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS:", name);
};
const seed = () => structuredClone(seedState);

test("Seed fleet is representative and covers every reminder bucket", () => {
  const f = seedState.fleet;
  assert.equal(f.vehicles.length, 6);
  assert(f.vehicles.every((v) => /\(örnek\)/.test(v.assignee)));
  const r = fleetReminders(f);
  for (const b of BUCKETS) assert(r.counts[b] > 0, b);
  assert.deepEqual(r.overdue.map((x) => x.id), ["YUK-001", "YUK-002"]);
  // Her aracın MTV ve en az bir sigorta kaydı var
  for (const v of f.vehicles) {
    assert(f.obligations.some((o) => o.vehicleId === v.id && o.kind === "MTV"), v.id);
    assert(f.obligations.some((o) => o.vehicleId === v.id && /sigorta|Kasko/.test(o.kind)), v.id);
  }
});

test("Reminder buckets: 7 / 15 / 30 days, overdue and completed follow the due date", () => {
  const base = { id: "X", vehicleId: "ARC-01", kind: "MTV", status: "Açık" };
  assert.equal(bucketOf({ ...base, due: "2026-11-14" }), "Gecikmiş");
  assert.equal(bucketOf({ ...base, due: "2026-11-15" }), "7 gün");
  assert.equal(bucketOf({ ...base, due: "2026-11-22" }), "7 gün");
  assert.equal(bucketOf({ ...base, due: "2026-11-23" }), "15 gün");
  assert.equal(bucketOf({ ...base, due: "2026-11-30" }), "15 gün");
  assert.equal(bucketOf({ ...base, due: "2026-12-15" }), "30 gün");
  assert.equal(bucketOf({ ...base, due: "2026-12-16" }), "İleri tarih");
  assert.equal(bucketOf({ ...base, due: "2026-01-01", status: "Tamamlandı" }), "Tamamlandı");
});

test("Add and edit a vehicle: plate format, duplicates, km cannot go backwards, history kept", () => {
  let s = seed();
  s = applyAction(s, { type: "vehicle-create", record: { plate: "07 bgz 777", brand: "Dacia", model: "Duster", year: 2025, type: "Binek", fuel: "Dizel", project: "cengilli", assignee: "Saha mühendisi (örnek)", km: 1200, status: "Aktif" } });
  const v = s.fleet.vehicles.at(-1);
  assert.equal(v.plate, "07 BGZ 777");
  assert.equal(v.id, "ARC-07");
  assert.throws(() => applyAction(s, { type: "vehicle-create", record: { ...v, plate: "07 BGZ 777" } }), /zaten kayıtlı/);
  assert.throws(() => applyAction(s, { type: "vehicle-create", record: { ...v, plate: "ABC" } }), /Plaka/);
  s = applyAction(s, { type: "vehicle-update", id: v.id, patch: { assignee: "Proje müdürü (örnek)", project: "nergis" } });
  assert.equal(s.fleet.vehicles.at(-1).assignee, "Proje müdürü (örnek)");
  assert.match(s.fleet.history[0].text, /Zimmet değişti/);
  assert.throws(() => applyAction(s, { type: "vehicle-km", id: v.id, km: 1000, date: "2026-11-15" }), /küçük olamaz/);
  s = applyAction(s, { type: "vehicle-km", id: v.id, km: 1850, date: "2026-11-15" });
  assert.equal(s.fleet.vehicles.at(-1).km, 1850);
  assert.equal(s.audit[0].entity, v.id);
});

test("MTV and insurance dates: completing records the payment, creates the next due date and leaves history", () => {
  let s = seed();
  const before = fleetReminders(s.fleet);
  assert.throws(() => applyAction(s, { type: "vehicle-obligation-complete", id: "YUK-003", date: "2026-11-15", paid: 24800, nextDue: "2026-11-10" }), /sonra olmalı/);
  s = applyAction(s, { type: "vehicle-obligation-complete", id: "YUK-003", date: "2026-11-15", paid: 24800, nextDue: "2027-11-20", reference: "KSK-ÖRNEK-2215" });
  const done = s.fleet.obligations.find((o) => o.id === "YUK-003");
  assert.equal(done.status, "Tamamlandı");
  assert.equal(done.paid, 24800);
  const renewed = s.fleet.obligations.at(-1);
  assert.equal(renewed.kind, "Kasko");
  assert.equal(renewed.due, "2027-11-20");
  assert.equal(renewed.status, "Açık");
  const after = fleetReminders(s.fleet);
  assert.equal(after.counts["7 gün"], before.counts["7 gün"] - 1);
  assert.equal(after.counts["Tamamlandı"], before.counts["Tamamlandı"] + 1);
  assert.match(s.fleet.history[0].text, /Kasko tamamlandı · 24.800 TL ödendi · yeni son tarih 2027-11-20/);
  assert.throws(() => applyAction(s, { type: "vehicle-obligation-complete", id: "YUK-003", date: "2026-11-15", paid: 1, nextDue: "2028-01-01" }), /zaten/);
  // Yeni MTV kaydı ve hatırlatma
  s = applyAction(s, { type: "vehicle-obligation-add", record: { vehicleId: "ARC-06", kind: "Trafik sigortası", due: "2026-11-25", amount: 7800 } });
  assert(fleetReminders(s.fleet).open.some((o) => o.vehicleId === "ARC-06" && o.kind === "Trafik sigortası" && o.bucket === "15 gün"));
});

test("Fuel, service and documents: costs, consumption and service status are consistent", () => {
  let s = seed();
  const s0 = vehicleSummary(s.fleet, "ARC-02");
  s = applyAction(s, { type: "vehicle-fuel", record: { vehicleId: "ARC-02", date: "2026-11-15", liters: 60, amount: 3600, km: 127050, station: "İstasyon (örnek)" } });
  const s1 = vehicleSummary(s.fleet, "ARC-02");
  assert.equal(s1.fuelCost, s0.fuelCost + 3600);
  assert(s1.consumption > 5 && s1.consumption < 20);
  assert.equal(s.fleet.vehicles.find((v) => v.id === "ARC-02").km, 127050);
  s = applyAction(s, { type: "vehicle-service", record: { vehicleId: "ARC-01", date: "2026-11-15", kind: "Arıza", km: 48300, cost: 0, provider: "Servis (örnek)", description: "Akü arızası", status: "Açık" } });
  assert.equal(s.fleet.vehicles.find((v) => v.id === "ARC-01").status, "Serviste");
  const sid = s.fleet.services.at(-1).id;
  s = applyAction(s, { type: "vehicle-service-close", id: sid, cost: 4200, date: "2026-11-16" });
  assert.equal(s.fleet.vehicles.find((v) => v.id === "ARC-01").status, "Aktif");
  assert.equal(vehicleSummary(s.fleet, "ARC-01").serviceCost, 4200);
  s = applyAction(s, { type: "vehicle-doc", record: { vehicleId: "ARC-01", title: "Kasko poliçesi 2026–2027 (temsili)", kind: "Poliçe", date: "2026-11-15", expiry: "2027-11-15" } });
  assert.equal(s.fleet.docs.at(-1).vehicleId, "ARC-01");
  assert.throws(() => applyAction(s, { type: "vehicle-doc", record: { vehicleId: "ARC-01", title: "x", kind: "Poliçe", date: "2026-11-15", expiry: "2026-01-01" } }));
});

test("Fleet records never change sales, collection or cash figures; reset restores the seed", () => {
  let s = seed();
  const before = summary(s);
  s = applyAction(s, { type: "vehicle-fuel", record: { vehicleId: "ARC-04", date: "2026-11-15", liters: 50, amount: 3000, km: 88500, station: "x" } });
  s = applyAction(s, { type: "vehicle-obligation-complete", id: "YUK-001", date: "2026-11-15", paid: 2860, nextDue: "2028-11-08" });
  assert.deepEqual(summary(s), before);
  s = applyAction(s, { type: "reset" });
  assert.deepEqual(s.fleet, seedFleet);
});

console.log(`${checks} fleet suites passed.`);
