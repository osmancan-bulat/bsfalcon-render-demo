// DEMO güvenlik katmanı: şifre özeti, giriş/kilitleme, oturum süresi, TOTP, rol yetkileri ve işlem denetimi.
import assert from "node:assert/strict";
import {
  emptyStore, hashPassword, verifyPassword, passwordProblem, generatePassword, attemptLogin, sessionExpired, reauthValid,
  totpCode, verifyTotp, newTotpSecret, base32Decode, base32Encode, can, canSection, checkAction, effectivePermissions,
  ROLE_DEFAULTS, ROLES, MODULES, SECTION_MODULE, DEFAULT_SETTINGS,
} from "../lib/security.ts";
import fs from "node:fs";

let checks = 0;
const test = async (name, fn) => {
  await fn();
  checks++;
  console.log("PASS:", name);
};
const user = async (over = {}) => ({
  id: over.id ?? "USR-1", username: over.username ?? "yonetici", email: over.email ?? "yonetici@ornek.test", name: "Demo Yönetici",
  role: over.role ?? "admin", active: over.active ?? true, failed: 0, createdAt: 0,
  ...(await hashPassword(over.password ?? "Kuzey2026yildiz")), ...over,
});

await test("No password is hard-coded; only salted PBKDF2-SHA256 hashes are stored", async () => {
  const src = ["lib/security.ts", "components/security/auth.tsx", "components/security/login-screen.tsx"].filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
  assert(!/password\s*[:=]\s*["'][^"']{6,}["']/i.test(src), "hard-coded password literal");
  const a = await hashPassword("Kuzey2026yildiz"), b = await hashPassword("Kuzey2026yildiz");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  assert(a.iterations >= 200000);
  assert(await verifyPassword(a, "Kuzey2026yildiz"));
  assert(!(await verifyPassword(a, "kuzey2026yildiz")));
  assert.equal(passwordProblem("kisa1"), "Şifre en az 10 karakter olmalı.");
  assert(passwordProblem("yalnizcaharf"));
  assert(passwordProblem("yonetici2026x", "yonetici"));
  assert(passwordProblem("Sifre12345678"));
  assert.equal(passwordProblem("Bulut7Deniz9"), null);
  const g = generatePassword();
  assert.equal(passwordProblem(g), null, g);
});

await test("Login: username or e-mail, generic error, remaining attempts, lockout and unlock after the lock period", async () => {
  let s = { ...emptyStore(), users: [await user()] };
  let r = await attemptLogin(s, "yonetici@ornek.test", "Kuzey2026yildiz", 1000);
  assert(r.result.ok && !r.result.needsTotp);
  assert.equal(r.store.logins[0].ok, true);
  r = await attemptLogin(s, "yok-boyle", "x", 1000);
  assert.equal(r.result.ok, false);
  assert.equal(r.result.message, "Kullanıcı adı / e-posta veya şifre hatalı.");
  // Aynı mesaj hem olmayan kullanıcı hem hatalı şifre için (kullanıcı varlığı açığa çıkmaz)
  const wrong = await attemptLogin(s, "yonetici", "yanlis-sifre1", 1000);
  assert.equal(wrong.result.message, r.result.message);
  s = wrong.store;
  for (let i = 2; i <= 4; i++) s = (await attemptLogin(s, "yonetici", "yanlis-sifre1", 1000)).store;
  assert.equal(s.users[0].failed, 4);
  const lock = await attemptLogin(s, "yonetici", "yanlis-sifre1", 2000);
  assert(lock.result.locked);
  s = lock.store;
  // Kilitliyken doğru şifre de reddedilir
  const blocked = await attemptLogin(s, "yonetici", "Kuzey2026yildiz", 3000);
  assert(!blocked.result.ok && blocked.result.locked);
  // Kilit süresi dolunca giriş yapılır, sayaç sıfırlanır
  const after = await attemptLogin(blocked.store, "yonetici", "Kuzey2026yildiz", 2000 + DEFAULT_SETTINGS.lockMinutes * 60000 + 1);
  assert(after.result.ok);
  assert.equal(after.store.users[0].failed, 0);
  assert(after.store.logins.filter((l) => !l.ok).length >= 6);
  // Pasif hesap
  const p = await attemptLogin({ ...emptyStore(), users: [await user({ active: false })] }, "yonetici", "Kuzey2026yildiz");
  assert(!p.result.ok);
});

await test("Session expires after idle time and absolute lifetime; re-authentication window", async () => {
  const st = DEFAULT_SETTINGS;
  assert.equal(sessionExpired({ startedAt: 0, lastActive: 0 }, st, 60000), null);
  assert.match(sessionExpired({ startedAt: 0, lastActive: 0 }, st, st.idleMinutes * 60000 + 1), /işlem yapılmadığı/);
  assert.match(sessionExpired({ startedAt: 0, lastActive: st.absoluteHours * 3600000 }, st, st.absoluteHours * 3600000 + 1), /süresi doldu/);
  assert(reauthValid(1000, st, 1000 + 60000));
  assert(!reauthValid(1000, st, 1000 + st.reauthMinutes * 60000 + 1));
  assert(!reauthValid(undefined, st, 1000));
});

await test("TOTP second factor follows RFC 6238 and accepts ±1 time step", async () => {
  const rfc = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // "12345678901234567890"
  assert.equal(await totpCode(rfc, 59000), "287082");
  assert.equal(await totpCode(rfc, 1111111109000), "081804");
  assert.equal(await totpCode(rfc, 1234567890000), "005924");
  const sec = newTotpSecret();
  assert.equal(base32Encode(base32Decode(sec)), sec);
  const now = 1_800_000_000_000;
  assert(await verifyTotp(sec, await totpCode(sec, now), now));
  assert(await verifyTotp(sec, await totpCode(sec, now - 30000), now));
  assert(!(await verifyTotp(sec, await totpCode(sec, now - 120000), now)));
  assert(!(await verifyTotp(sec, "12a456", now)));
  let s = { ...emptyStore(), users: [await user({ totp: sec })] };
  const r = await attemptLogin(s, "yonetici", "Kuzey2026yildiz", now);
  assert(r.result.ok && r.result.needsTotp);
});

await test("Role matrix: six roles, every screen mapped, sales cannot see company finances, viewer cannot act", async () => {
  assert.equal(ROLES.length, 6);
  for (const r of ROLES) for (const m of MODULES) assert(["none", "view", "edit"].includes(ROLE_DEFAULTS[r.id].modules[m.id]));
  const sections = JSON.parse(JSON.stringify(Object.keys(SECTION_MODULE)));
  for (const s of ["finans", "butce", "raporlar", "odemeler", "musteriler", "araclar", "guvenlik", "kat-karsiligi"]) assert(sections.includes(s), s);
  const sales = { role: "sales" };
  assert(canSection(sales, "musteriler") && canSection(sales, "sozlesmeler"));
  for (const s of ["finans", "butce", "raporlar", "yonetim", "guvenlik", "operasyon", "odemeler"]) assert(!canSection(sales, s), s);
  assert.equal(checkAction(sales, "contract"), null);
  assert(checkAction(sales, "pay-order"));
  assert(checkAction(sales, "expense"));
  const viewer = { role: "viewer" };
  for (const t of ["receipt", "contract", "share-assign", "vehicle-km", "approve"]) assert(checkAction(viewer, t), t);
  assert(!effectivePermissions(viewer).flags.sensitiveDocs);
  const acc = { role: "accounting" };
  assert.equal(checkAction(acc, "receipt"), null);
  assert(checkAction(acc, "approve"), "accounting cannot approve by default");
  assert(!can(acc, "guvenlik"));
  const site = { role: "site" };
  assert.equal(checkAction(site, "vehicle-obligation-complete"), null);
  assert(!canSection(site, "finans"));
  assert(checkAction({ role: "owner" }, "reset"), "only admin resets");
  assert.equal(checkAction({ role: "admin" }, "reset"), null);
  assert(checkAction(null, "receipt"));
});

await test("Per-user overrides change what a single user can see and do", async () => {
  const u = { role: "sales", overrides: { tahsilat: "edit", satis: "view" }, flagOverrides: { download: true } };
  assert.equal(checkAction(u, "receipt"), null);
  assert(checkAction(u, "contract"));
  assert(effectivePermissions(u).flags.download);
  assert(!canSection({ role: "sales", overrides: { musteriler: "none" } }, "araclar"));
  assert(!canSection({ role: "sales", overrides: { satis: "none" } }, "musteriler"));
});

console.log(`${checks} security suites passed.`);
