// By Güzel · DEMO güvenlik katmanı (istemci tarafı).
//
// ÖNEMLİ: Bu uygulama statik bir sitedir (Render Static Site). Sunucu olmadığı için buradaki kimlik
// doğrulama, oturum ve yetki kontrolleri YALNIZCA TARAYICIDA çalışır. Tarayıcı geliştirici araçlarına
// erişen biri bu kontrolleri atlayabilir. Bu yüzden bu katman gerçek güvenlik değildir; gerçek kullanımda
// aynı kurallar sunucu tarafında (kimlik doğrulama, rol bazlı erişim, denetim kaydı) uygulanmalıdır.
// Kaynak kodda hiçbir gerçek veya varsayılan şifre yoktur: ilk yönetici şifresi tarayıcıda kullanıcı
// tarafından belirlenir ve yalnızca PBKDF2-SHA256 (tuzlu) özeti saklanır.

export type RoleId = "admin" | "owner" | "accounting" | "sales" | "site" | "viewer";
export type Level = "none" | "view" | "edit";
export type ModuleId =
  | "genel" | "projeler" | "kat" | "satis" | "tahsilat" | "finans" | "hakedis"
  | "santiye" | "belge" | "takvim" | "rapor" | "arac" | "yonetim" | "guvenlik";
export type Flags = {
  /** Hassas belgeleri (sözleşme, ekstre, makbuz, rapor, arşiv dosyası) görüntüleme. */
  sensitiveDocs: boolean;
  /** Hassas belgeleri indirme / yazdırma / CSV dışa aktarma. */
  download: boolean;
  /** Hakediş, satın alma ve ödeme onayı. */
  approve: boolean;
  /** Kullanıcı ve yetki yönetimi. */
  manageUsers: boolean;
};
export type Permissions = { modules: Record<ModuleId, Level>; flags: Flags };

export const ROLES: { id: RoleId; label: string; detail: string }[] = [
  { id: "admin", label: "Sistem yöneticisi", detail: "Tüm modüller, kullanıcı ve yetki yönetimi, güvenlik merkezi" },
  { id: "owner", label: "Şirket sahibi / üst yönetim", detail: "Tüm modülleri görür ve onaylar; kullanıcı yönetimi yoktur" },
  { id: "accounting", label: "Muhasebe personeli", detail: "Tahsilat, finans, hakediş ve raporlar; satış ve şantiyeyi görür" },
  { id: "sales", label: "Satış personeli", detail: "Müşteri, sözleşme ve satış işlemleri; şirket mali tablolarını göremez" },
  { id: "site", label: "Şantiye sorumlusu", detail: "Şantiye, süreç, hakediş talebi ve araçlar; mali tabloları göremez" },
  { id: "viewer", label: "Yalnızca görüntüleme", detail: "Operasyon ekranlarını görür; işlem yapamaz, hassas belge açamaz" },
];

export const MODULES: { id: ModuleId; label: string }[] = [
  { id: "genel", label: "Genel bakış ve proje merkezleri" },
  { id: "projeler", label: "Projeler ve bağımsız bölümler" },
  { id: "kat", label: "Kat karşılığı paylaşımı" },
  { id: "satis", label: "Müşteriler, satış ve sözleşmeler" },
  { id: "tahsilat", label: "Tahsilat ve ödeme planları" },
  { id: "finans", label: "Finans, kasa ve bütçe" },
  { id: "hakedis", label: "Barter, taşeron, hakediş ve satın alma" },
  { id: "santiye", label: "Şantiye ve proje süreci" },
  { id: "belge", label: "Belge arşivi ve proje evrakı" },
  { id: "takvim", label: "Takvim ve hatırlatmalar" },
  { id: "rapor", label: "Raporlama" },
  { id: "arac", label: "Araç ve filo yönetimi" },
  { id: "yonetim", label: "Yönetim ve ayarlar" },
  { id: "guvenlik", label: "Güvenlik merkezi" },
];

const all = (l: Level) => Object.fromEntries(MODULES.map((m) => [m.id, l])) as Record<ModuleId, Level>;
const perms = (modules: Partial<Record<ModuleId, Level>>, base: Level, flags: Flags): Permissions => ({
  modules: { ...all(base), ...modules },
  flags,
});
export const ROLE_DEFAULTS: Record<RoleId, Permissions> = {
  admin: perms({}, "edit", { sensitiveDocs: true, download: true, approve: true, manageUsers: true }),
  owner: perms({ guvenlik: "view" }, "edit", { sensitiveDocs: true, download: true, approve: true, manageUsers: false }),
  accounting: perms(
    { projeler: "view", kat: "view", satis: "view", santiye: "view", arac: "view", yonetim: "none", guvenlik: "none" },
    "edit",
    { sensitiveDocs: true, download: true, approve: false, manageUsers: false },
  ),
  sales: perms(
    { genel: "view", projeler: "view", kat: "view", satis: "edit", takvim: "edit", belge: "view" },
    "none",
    { sensitiveDocs: true, download: false, approve: false, manageUsers: false },
  ),
  site: perms(
    { genel: "view", projeler: "view", santiye: "edit", hakedis: "edit", takvim: "edit", arac: "edit", belge: "view", kat: "view" },
    "none",
    { sensitiveDocs: false, download: false, approve: false, manageUsers: false },
  ),
  viewer: perms(
    { genel: "view", projeler: "view", kat: "view", satis: "view", santiye: "view", takvim: "view", arac: "view" },
    "none",
    { sensitiveDocs: false, download: false, approve: false, manageUsers: false },
  ),
};

/** Ekran adresi → modül. Listede olmayan adres "genel" sayılır. */
export const SECTION_MODULE: Record<string, ModuleId> = {
  "genel-bakis": "genel", "guzel-nature": "genel", "guzel-life-premium": "genel", "city-prime": "genel", proje: "genel",
  projeler: "projeler", daireler: "projeler",
  "kat-karsiligi": "kat",
  musteriler: "satis", sozlesmeler: "satis", "satis-tahsilat": "satis",
  odemeler: "tahsilat",
  finans: "finans", butce: "finans",
  barter: "hakedis", taseronlar: "hakedis", operasyon: "hakedis", satinalma: "hakedis",
  santiye: "santiye", surec: "santiye",
  arsiv: "belge", evrak: "belge",
  hatirlatmalar: "takvim",
  raporlar: "rapor",
  araclar: "arac",
  "satis-sonrasi": "satis",
  yonetim: "yonetim",
  guvenlik: "guvenlik",
};

/** İşlem türü → gereken yetki. */
export function actionRequirement(type: string): { module: ModuleId; level: "edit"; approve?: boolean; admin?: boolean } {
  if (["receipt", "deposit-receipt", "receipt-reverse", "deposit-reverse", "reschedule"].includes(type)) return { module: "tahsilat", level: "edit" };
  if (["contract", "contract-status", "contract-sign", "contract-cancel", "contract-transfer", "reserve", "release", "customer"].includes(type)) return { module: "satis", level: "edit" };
  if (["approve", "reject", "pay-order"].includes(type)) return { module: "hakedis", level: "edit", approve: true };
  if (["request", "edit-request", "deliver", "barter", "barter-progress", "barter-offset", "work-create", "work"].includes(type)) return { module: "hakedis", level: "edit" };
  if (type === "expense") return { module: "finans", level: "edit" };
  if (["share-assign", "share-step", "obligation-toggle"].includes(type)) return { module: "kat", level: "edit" };
  if (type === "process-step") return { module: "santiye", level: "edit" };
  if (["project-create", "project-update", "project-status", "project-delete", "block-create", "unit-update"].includes(type)) return { module: "projeler", level: "edit" };
  if (["reminder", "reminder-done"].includes(type)) return { module: "takvim", level: "edit" };
  if (type === "document") return { module: "belge", level: "edit" };
  if (type.startsWith("vehicle") || type.startsWith("fleet")) return { module: "arac", level: "edit" };
  if (type === "reset") return { module: "yonetim", level: "edit", admin: true };
  return { module: "genel", level: "edit" };
}

export type User = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: RoleId;
  active: boolean;
  /** Rol varsayılanından farklılaştırılmış yetkiler (yalnızca değişen alanlar). */
  overrides?: Partial<Permissions["modules"]>;
  flagOverrides?: Partial<Flags>;
  hash: string;
  salt: string;
  iterations: number;
  /** TOTP (RFC 6238) gizli anahtarı (base32). Yalnızca demo: tarayıcıda saklanır. */
  totp?: string;
  failed: number;
  lockedUntil?: number;
  createdAt: number;
  lastLogin?: number;
  mustChange?: boolean;
};
export type LoginEvent = { id: string; at: number; username: string; userId?: string; ok: boolean; reason: string };
export type DocEvent = { id: string; at: number; userId: string; user: string; doc: string; kind: string; action: "view" | "download" | "denied" | "reauth" | "reauth-failed"; detail?: string };
export type SessionRecord = { sid: string; userId: string; startedAt: number; lastActive: number; endedAt?: number; endReason?: string };
export type SecuritySettings = { idleMinutes: number; absoluteHours: number; lockAfter: number; lockMinutes: number; reauthMinutes: number; require2faForAdmins: boolean };
export type SecurityStore = {
  version: 1;
  users: User[];
  logins: LoginEvent[];
  docs: DocEvent[];
  sessions: SessionRecord[];
  denied: { id: string; at: number; userId: string; user: string; what: string }[];
  settings: SecuritySettings;
};
export const DEFAULT_SETTINGS: SecuritySettings = { idleMinutes: 15, absoluteHours: 8, lockAfter: 5, lockMinutes: 5, reauthMinutes: 5, require2faForAdmins: false };
export const emptyStore = (): SecurityStore => ({ version: 1, users: [], logins: [], docs: [], sessions: [], denied: [], settings: { ...DEFAULT_SETTINGS } });

export function effectivePermissions(u: Pick<User, "role" | "overrides" | "flagOverrides">): Permissions {
  const base = ROLE_DEFAULTS[u.role];
  return { modules: { ...base.modules, ...(u.overrides ?? {}) }, flags: { ...base.flags, ...(u.flagOverrides ?? {}) } };
}
export const levelRank = (l: Level) => (l === "edit" ? 2 : l === "view" ? 1 : 0);
export function can(u: Pick<User, "role" | "overrides" | "flagOverrides"> | null, module: ModuleId, level: Level = "view") {
  if (!u) return false;
  return levelRank(effectivePermissions(u).modules[module]) >= levelRank(level);
}
export function canSection(u: Pick<User, "role" | "overrides" | "flagOverrides"> | null, section: string) {
  return can(u, SECTION_MODULE[section] ?? "genel", "view");
}
/** İşlemin yapılıp yapılamayacağı; olumsuzsa Türkçe gerekçe döner. */
export function checkAction(u: Pick<User, "role" | "overrides" | "flagOverrides"> | null, type: string): string | null {
  if (!u) return "Oturum açık değil.";
  const r = actionRequirement(type);
  const p = effectivePermissions(u);
  if (r.admin && u.role !== "admin") return "Bu işlem yalnızca sistem yöneticisine açıktır.";
  if (levelRank(p.modules[r.module]) < 2)
    return `Yetkiniz yok: “${MODULES.find((m) => m.id === r.module)!.label}” modülünde işlem yapma yetkiniz bulunmuyor.`;
  if (r.approve && !p.flags.approve) return "Yetkiniz yok: onay ve ödeme yetkisi gerekir.";
  return null;
}

/* ------------------------------ Şifre ve kimlik ------------------------------ */

export const PBKDF2_ITERATIONS = 210000;
const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));
export const randomId = (p: string) => `${p}-${b64(randomBytes(9)).replace(/[^A-Za-z0-9]/g, "").slice(0, 10)}`;

export async function hashPassword(password: string, salt?: string, iterations = PBKDF2_ITERATIONS) {
  const s = salt ?? b64(randomBytes(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unb64(s), iterations }, key, 256);
  return { hash: b64(bits), salt: s, iterations };
}
/** Sabit zamanlı karşılaştırma. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function verifyPassword(u: Pick<User, "hash" | "salt" | "iterations">, password: string) {
  const { hash } = await hashPassword(password, u.salt, u.iterations);
  return same(hash, u.hash);
}
/** Şifre kuralı: en az 10 karakter, harf ve rakam, kullanıcı adını içermez. Hata metni veya null. */
export function passwordProblem(password: string, username = ""): string | null {
  if (password.length < 10) return "Şifre en az 10 karakter olmalı.";
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) || !/\d/.test(password)) return "Şifre harf ve rakam içermeli.";
  if (username && password.toLocaleLowerCase("tr").includes(username.toLocaleLowerCase("tr"))) return "Şifre kullanıcı adını içeremez.";
  if (/^(.)\1+$/.test(password) || /(0123|1234|2345|3456|4567|5678|6789|qwer|asdf|sifre|şifre|password)/i.test(password))
    return "Şifre tahmin edilebilir bir dizi içeriyor.";
  return null;
}
/** Tek seferlik gösterilecek güçlü rastgele şifre (örnek rol kullanıcıları için). */
export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(14);
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s.slice(0, 4) + "-" + s.slice(4, 9) + "-" + s.slice(9) + (/\d/.test(s) ? "" : "7");
}

/* ------------------------------ TOTP (RFC 6238) ------------------------------ */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Encode(bytes: Uint8Array) {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s: string) {
  const clean = s.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const i = B32.indexOf(c);
    if (i < 0) throw Error("Geçersiz base32");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
export const newTotpSecret = () => base32Encode(randomBytes(20));
export async function totpCode(secret: string, at = Date.now(), step = 30, digits = 6) {
  const counter = Math.floor(at / 1000 / step);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 255;
    c = Math.floor(c / 256);
  }
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = mac[mac.length - 1] & 15;
  const bin = ((mac[o] & 127) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}
/** ±1 adım (30 sn) saat farkı toleransıyla doğrular. */
export async function verifyTotp(secret: string, code: string, at = Date.now()) {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return false;
  for (const d of [-1, 0, 1]) if ((await totpCode(secret, at + d * 30000)) === c) return true;
  return false;
}
export const otpauthUri = (secret: string, account: string) =>
  `otpauth://totp/${encodeURIComponent("By Güzel DEMO:" + account)}?secret=${secret}&issuer=${encodeURIComponent("By Guzel DEMO")}&digits=6&period=30`;

/* ------------------------------ Giriş akışı (saf) ------------------------------ */

export type LoginResult =
  | { ok: true; user: User; needsTotp: boolean }
  | { ok: false; message: string; locked?: boolean };
const GENERIC = "Kullanıcı adı / e-posta veya şifre hatalı.";
/**
 * Kullanıcı adı veya e-posta + şifre ile girişi değerlendirir ve depoyu günceller (başarısız deneme sayacı,
 * kilitleme, giriş kaydı). Hata mesajı kullanıcının var olup olmadığını açığa çıkarmaz.
 */
export async function attemptLogin(store: SecurityStore, identifier: string, password: string, now = Date.now()): Promise<{ store: SecurityStore; result: LoginResult }> {
  const id = identifier.trim().toLocaleLowerCase("tr");
  const s: SecurityStore = { ...store, users: store.users.map((u) => ({ ...u })), logins: [...store.logins] };
  const log = (ok: boolean, reason: string, userId?: string) =>
    (s.logins = [{ id: randomId("GRS"), at: now, username: identifier.trim().slice(0, 80), userId, ok, reason }, ...s.logins].slice(0, 300));
  const u = s.users.find((x) => x.username.toLocaleLowerCase("tr") === id || x.email.toLocaleLowerCase("tr") === id);
  if (!u) {
    // Var olmayan kullanıcı için de aynı süre: sahte doğrulama
    await hashPassword(password || "x", "AAAAAAAAAAAAAAAAAAAAAA==", u ? PBKDF2_ITERATIONS : PBKDF2_ITERATIONS);
    log(false, "Bilinmeyen kullanıcı");
    return { store: s, result: { ok: false, message: GENERIC } };
  }
  if (!u.active) {
    log(false, "Pasif hesap", u.id);
    return { store: s, result: { ok: false, message: "Hesap pasif. Sistem yöneticisiyle görüşün." } };
  }
  if (u.lockedUntil && u.lockedUntil > now) {
    log(false, "Kilitli hesap", u.id);
    const min = Math.ceil((u.lockedUntil - now) / 60000);
    return { store: s, result: { ok: false, locked: true, message: `Çok sayıda hatalı deneme nedeniyle hesap geçici olarak kilitlendi. ${min} dakika sonra tekrar deneyin.` } };
  }
  if (!(await verifyPassword(u, password))) {
    u.failed = (u.failed ?? 0) + 1;
    const left = s.settings.lockAfter - u.failed;
    if (left <= 0) {
      u.lockedUntil = now + s.settings.lockMinutes * 60000;
      u.failed = 0;
      log(false, "Hatalı şifre · hesap kilitlendi", u.id);
      return { store: s, result: { ok: false, locked: true, message: `Çok sayıda hatalı deneme. Hesap ${s.settings.lockMinutes} dakika kilitlendi.` } };
    }
    log(false, "Hatalı şifre", u.id);
    return { store: s, result: { ok: false, message: left <= 2 ? `${GENERIC} Kalan deneme hakkı: ${left}.` : GENERIC } };
  }
  u.failed = 0;
  u.lockedUntil = undefined;
  const needsTotp = !!u.totp;
  if (!needsTotp) {
    u.lastLogin = now;
    log(true, "Başarılı giriş", u.id);
  }
  return { store: s, result: { ok: true, user: u, needsTotp } };
}

export function sessionExpired(sess: Pick<SessionRecord, "startedAt" | "lastActive">, settings: SecuritySettings, now = Date.now()): string | null {
  if (now - sess.lastActive > settings.idleMinutes * 60000) return "Uzun süre işlem yapılmadığı için oturum kapandı.";
  if (now - sess.startedAt > settings.absoluteHours * 3600000) return "Oturum süresi doldu.";
  return null;
}
export const reauthValid = (reauthAt: number | undefined, settings: SecuritySettings, now = Date.now()) =>
  !!reauthAt && now - reauthAt < settings.reauthMinutes * 60000;

export const roleLabel = (r: RoleId) => ROLES.find((x) => x.id === r)?.label ?? r;
