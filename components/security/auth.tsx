"use client";
// DEMO kimlik doğrulama sağlayıcısı (yalnızca tarayıcı). Kullanıcılar, giriş/belge erişim kayıtları ve
// oturum bu tarayıcının localStorage alanında tutulur. Sunucu tarafı doğrulama YOKTUR: üretimde aynı
// kurallar sunucuda uygulanmalıdır (bkz. Güvenlik Merkezi › Üretim mimarisi).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  emptyStore, attemptLogin, hashPassword, verifyPassword, verifyTotp, passwordProblem, sessionExpired, reauthValid,
  randomId, effectivePermissions, can as canFn, canSection as canSectionFn, checkAction as checkActionFn,
  type SecurityStore, type User, type RoleId, type ModuleId, type Level, type DocEvent, type Permissions, type Flags, type SecuritySettings,
} from "@/lib/security";

const STORE = "bsfalcon-guvenlik-v1";
const SESSION = "bsfalcon-oturum-v1";
const NOTICE = "bsfalcon-oturum-mesaj";
type Session = { sid: string; userId: string; startedAt: number; lastActive: number; reauthAt?: number };

type Ctx = {
  ready: boolean;
  store: SecurityStore;
  user: User | null;
  session: Session | null;
  perms: Permissions | null;
  notice: string;
  setupAdmin: (r: { name: string; username: string; email: string; password: string }, samples?: { name: string; username: string; role: RoleId; password: string }[]) => Promise<string | null>;
  login: (identifier: string, password: string) => Promise<{ ok: boolean; needsTotp?: boolean; message?: string; locked?: boolean }>;
  verifySecondFactor: (code: string) => Promise<string | null>;
  cancelSecondFactor: () => void;
  pendingTotp: boolean;
  logout: (reason?: string) => void;
  can: (m: ModuleId, l?: Level) => boolean;
  canSection: (s: string) => boolean;
  checkAction: (type: string) => string | null;
  /** Hassas belge veya işlem öncesi yeniden doğrulama: geçerli pencere varsa hemen true döner. */
  requireReauth: (label: string, kind: string) => Promise<boolean>;
  reauthFresh: () => boolean;
  logDoc: (doc: string, kind: string, action: DocEvent["action"], detail?: string) => void;
  logDenied: (what: string) => void;
  // Yönetim (yalnızca manageUsers)
  createUser: (r: { name: string; username: string; email: string; role: RoleId; password: string }) => Promise<string | null>;
  updateUser: (id: string, patch: Partial<Pick<User, "name" | "email" | "role" | "active" | "overrides" | "flagOverrides">>) => string | null;
  resetPassword: (id: string, password: string) => Promise<string | null>;
  changeOwnPassword: (current: string, next: string) => Promise<string | null>;
  enableTotp: (secret: string, code: string) => Promise<string | null>;
  disableTotp: (id: string) => string | null;
  unlockUser: (id: string) => string | null;
  endSession: (sid: string) => void;
  updateSettings: (patch: Partial<SecuritySettings>) => string | null;
  clearLogs: () => void;
};
const AuthContext = createContext<Ctx | null>(null);

const readJSON = <T,>(k: string): T | null => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const writeJSON = (k: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const sanitizeStore = (s: SecurityStore | null): SecurityStore => {
  const base = emptyStore();
  if (!s || s.version !== 1 || !Array.isArray(s.users)) return base;
  return { ...base, ...s, settings: { ...base.settings, ...(s.settings ?? {}) } };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [store, setStoreState] = useState<SecurityStore>(emptyStore);
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<{ userId: string; store: SecurityStore } | null>(null);
  const [reauth, setReauth] = useState<{ label: string; kind: string; resolve: (ok: boolean) => void } | null>(null);
  const storeRef = useRef(store);
  const sessionRef = useRef(session);
  storeRef.current = store;
  sessionRef.current = session;

  const saveStore = useCallback((s: SecurityStore) => {
    storeRef.current = s;
    setStoreState(s);
    writeJSON(STORE, s);
  }, []);
  const saveSession = useCallback((s: Session | null) => {
    sessionRef.current = s;
    setSession(s);
    writeJSON(SESSION, s);
  }, []);

  const endWith = useCallback((reason: string, how: string) => {
    const cur = sessionRef.current;
    if (cur) {
      const s = storeRef.current;
      saveStore({ ...s, sessions: s.sessions.map((x) => (x.sid === cur.sid ? { ...x, endedAt: Date.now(), endReason: how } : x)) });
    }
    saveSession(null);
    if (reason) {
      try {
        localStorage.setItem(NOTICE, reason);
      } catch {}
      setNotice(reason);
    }
  }, [saveSession, saveStore]);

  // İlk yükleme ve diğer sekmelerle eşitleme
  useEffect(() => {
    const s = sanitizeStore(readJSON<SecurityStore>(STORE));
    storeRef.current = s;
    setStoreState(s);
    const sess = readJSON<Session>(SESSION);
    const u = sess && s.users.find((x) => x.id === sess.userId && x.active);
    const why = sess ? sessionExpired(sess, s.settings) : null;
    if (sess && u && !why) {
      sessionRef.current = sess;
      setSession(sess);
    } else if (sess) {
      writeJSON(SESSION, null);
      if (why) {
        try {
          localStorage.setItem(NOTICE, why);
        } catch {}
      }
    }
    try {
      const n = localStorage.getItem(NOTICE);
      if (n) setNotice(n);
    } catch {}
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORE) {
        const ns = sanitizeStore(readJSON<SecurityStore>(STORE));
        storeRef.current = ns;
        setStoreState(ns);
      }
      if (e.key === SESSION) {
        const ns = readJSON<Session>(SESSION);
        sessionRef.current = ns;
        setSession(ns);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Hareketsizlik ve mutlak süre denetimi; kullanıcı etkinliği oturumu tazeler
  useEffect(() => {
    if (!session) return;
    let lastWrite = 0;
    const touch = () => {
      const cur = sessionRef.current;
      if (!cur) return;
      const now = Date.now();
      if (now - lastWrite < 15000) return;
      lastWrite = now;
      const next = { ...cur, lastActive: now };
      saveSession(next);
      const s = storeRef.current;
      saveStore({ ...s, sessions: s.sessions.map((x) => (x.sid === cur.sid ? { ...x, lastActive: now } : x)) });
    };
    const check = () => {
      const cur = sessionRef.current;
      if (!cur) return;
      const why = sessionExpired(cur, storeRef.current.settings);
      const u = storeRef.current.users.find((x) => x.id === cur.userId);
      if (why) endWith(why, "Süre doldu");
      else if (!u || !u.active) endWith("Hesap pasifleştirildi; oturum kapatıldı.", "Hesap pasif");
    };
    const ev = ["pointerdown", "keydown", "scroll", "touchstart"];
    ev.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const t = setInterval(check, 15000);
    check();
    return () => {
      ev.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(t);
    };
  }, [session?.sid, saveSession, saveStore, endWith]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSession = (u: User, s: SecurityStore) => {
    const now = Date.now();
    // Giriş, hassas belge için yeniden doğrulama sayılmaz: oturumdaki ilk hassas belgede yeniden doğrulama istenir.
    const sess: Session = { sid: randomId("OTR"), userId: u.id, startedAt: now, lastActive: now };
    saveStore({
      ...s,
      users: s.users.map((x) => (x.id === u.id ? { ...x, lastLogin: now } : x)),
      sessions: [{ sid: sess.sid, userId: u.id, startedAt: now, lastActive: now }, ...s.sessions].slice(0, 100),
    });
    saveSession(sess);
    try {
      localStorage.removeItem(NOTICE);
    } catch {}
    setNotice("");
  };

  const user = session ? store.users.find((x) => x.id === session.userId && x.active) ?? null : null;
  const perms = user ? effectivePermissions(user) : null;

  const value: Ctx = {
    ready,
    store,
    user,
    session,
    perms,
    notice,
    pendingTotp: !!pending,
    async setupAdmin(r, samples = []) {
      if (storeRef.current.users.length) return "Kurulum zaten yapılmış.";
      const name = r.name.trim(), username = r.username.trim(), email = r.email.trim();
      if (!name || !/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return "Ad ve geçerli bir kullanıcı adı girin (3–32 karakter; harf, rakam, . _ -).";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Geçerli bir e-posta adresi girin.";
      const p = passwordProblem(r.password, username);
      if (p) return p;
      const h = await hashPassword(r.password);
      const u: User = { id: randomId("USR"), username, email, name, role: "admin", active: true, failed: 0, createdAt: Date.now(), ...h };
      const extra: User[] = [];
      for (const x of samples) {
        const hx = await hashPassword(x.password);
        extra.push({ id: randomId("USR"), username: x.username, email: `${x.username}@ornek.test`, name: x.name, role: x.role, active: true, failed: 0, createdAt: Date.now(), mustChange: true, ...hx });
      }
      const s = { ...storeRef.current, users: [u, ...extra] };
      startSession(u, s);
      return null;
    },
    async login(identifier, password) {
      const { store: s, result } = await attemptLogin(storeRef.current, identifier, password);
      if (!result.ok) {
        saveStore(s);
        return { ok: false, message: result.message, locked: result.locked };
      }
      if (result.needsTotp) {
        saveStore(s);
        setPending({ userId: result.user.id, store: s });
        return { ok: true, needsTotp: true };
      }
      startSession(result.user, s);
      return { ok: true };
    },
    async verifySecondFactor(code) {
      if (!pending) return "Doğrulama süresi doldu; yeniden giriş yapın.";
      const s = storeRef.current;
      const u = s.users.find((x) => x.id === pending.userId);
      if (!u?.totp) return "Doğrulama yapılamadı.";
      const ok = await verifyTotp(u.totp, code);
      const log = { id: randomId("GRS"), at: Date.now(), username: u.username, userId: u.id, ok, reason: ok ? "Başarılı giriş (2 adımlı)" : "Hatalı doğrulama kodu" };
      if (!ok) {
        const failed = (u.failed ?? 0) + 1;
        const locked = failed >= s.settings.lockAfter;
        saveStore({
          ...s,
          logins: [log, ...s.logins].slice(0, 300),
          users: s.users.map((x) => (x.id === u.id ? { ...x, failed: locked ? 0 : failed, lockedUntil: locked ? Date.now() + s.settings.lockMinutes * 60000 : x.lockedUntil } : x)),
        });
        if (locked) {
          setPending(null);
          return `Çok sayıda hatalı kod. Hesap ${s.settings.lockMinutes} dakika kilitlendi.`;
        }
        return "Doğrulama kodu hatalı veya süresi geçmiş.";
      }
      setPending(null);
      startSession(u, { ...s, logins: [log, ...s.logins].slice(0, 300), users: s.users.map((x) => (x.id === u.id ? { ...x, failed: 0 } : x)) });
      return null;
    },
    cancelSecondFactor: () => setPending(null),
    logout: (reason) => endWith(reason ?? "Oturum kapatıldı.", "Kullanıcı çıkışı"),
    can: (m, l = "view") => canFn(user, m, l),
    canSection: (sec) => canSectionFn(user, sec),
    checkAction: (t) => checkActionFn(user, t),
    reauthFresh: () => reauthValid(sessionRef.current?.reauthAt, storeRef.current.settings),
    requireReauth(label, kind) {
      if (reauthValid(sessionRef.current?.reauthAt, storeRef.current.settings)) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => setReauth({ label, kind, resolve }));
    },
    logDoc(doc, kind, action, detail) {
      if (!user) return;
      const s = storeRef.current;
      saveStore({ ...s, docs: [{ id: randomId("BEL"), at: Date.now(), userId: user.id, user: user.name, doc, kind, action, detail }, ...s.docs].slice(0, 400) });
    },
    logDenied(what) {
      const s = storeRef.current;
      saveStore({ ...s, denied: [{ id: randomId("YTK"), at: Date.now(), userId: user?.id ?? "-", user: user?.name ?? "Oturumsuz", what }, ...s.denied].slice(0, 300) });
    },
    async createUser(r) {
      if (!perms?.flags.manageUsers) return "Kullanıcı yönetimi yetkiniz yok.";
      const s = storeRef.current;
      const username = r.username.trim();
      if (!r.name.trim() || !/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return "Ad ve geçerli bir kullanıcı adı girin.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) return "Geçerli bir e-posta adresi girin.";
      const lower = (x: string) => x.toLocaleLowerCase("tr");
      if (s.users.some((u) => lower(u.username) === lower(username) || lower(u.email) === lower(r.email.trim()))) return "Bu kullanıcı adı veya e-posta zaten kayıtlı.";
      const p = passwordProblem(r.password, username);
      if (p) return p;
      const h = await hashPassword(r.password);
      const u: User = { id: randomId("USR"), username, email: r.email.trim(), name: r.name.trim(), role: r.role, active: true, failed: 0, createdAt: Date.now(), mustChange: true, ...h };
      saveStore({ ...storeRef.current, users: [...storeRef.current.users, u] });
      return null;
    },
    updateUser(id, patch) {
      if (!perms?.flags.manageUsers) return "Kullanıcı yönetimi yetkiniz yok.";
      const s = storeRef.current;
      const target = s.users.find((u) => u.id === id);
      if (!target) return "Kullanıcı bulunamadı.";
      const next = { ...target, ...patch };
      const admins = s.users.map((u) => (u.id === id ? next : u)).filter((u) => u.role === "admin" && u.active);
      if (!admins.length) return "En az bir aktif sistem yöneticisi kalmalı.";
      saveStore({ ...s, users: s.users.map((u) => (u.id === id ? next : u)) });
      return null;
    },
    async resetPassword(id, password) {
      if (!perms?.flags.manageUsers) return "Kullanıcı yönetimi yetkiniz yok.";
      const s = storeRef.current;
      const t = s.users.find((u) => u.id === id);
      if (!t) return "Kullanıcı bulunamadı.";
      const p = passwordProblem(password, t.username);
      if (p) return p;
      const h = await hashPassword(password);
      saveStore({ ...storeRef.current, users: storeRef.current.users.map((u) => (u.id === id ? { ...u, ...h, failed: 0, lockedUntil: undefined, mustChange: true } : u)) });
      return null;
    },
    async changeOwnPassword(current, next) {
      if (!user) return "Oturum yok.";
      if (!(await verifyPassword(user, current))) return "Mevcut şifre hatalı.";
      const p = passwordProblem(next, user.username);
      if (p) return p;
      const h = await hashPassword(next);
      saveStore({ ...storeRef.current, users: storeRef.current.users.map((u) => (u.id === user.id ? { ...u, ...h, mustChange: false } : u)) });
      return null;
    },
    async enableTotp(secret, code) {
      if (!user) return "Oturum yok.";
      if (!(await verifyTotp(secret, code))) return "Kod doğrulanamadı. Uygulamadaki güncel 6 haneli kodu girin.";
      saveStore({ ...storeRef.current, users: storeRef.current.users.map((u) => (u.id === user.id ? { ...u, totp: secret } : u)) });
      return null;
    },
    disableTotp(id) {
      if (!user || (id !== user.id && !perms?.flags.manageUsers)) return "Yetkiniz yok.";
      saveStore({ ...storeRef.current, users: storeRef.current.users.map((u) => (u.id === id ? { ...u, totp: undefined } : u)) });
      return null;
    },
    unlockUser(id) {
      if (!perms?.flags.manageUsers) return "Kullanıcı yönetimi yetkiniz yok.";
      saveStore({ ...storeRef.current, users: storeRef.current.users.map((u) => (u.id === id ? { ...u, failed: 0, lockedUntil: undefined } : u)) });
      return null;
    },
    endSession(sid) {
      if (sid === sessionRef.current?.sid) return endWith("Oturum kapatıldı.", "Kullanıcı çıkışı");
      const s = storeRef.current;
      saveStore({ ...s, sessions: s.sessions.map((x) => (x.sid === sid ? { ...x, endedAt: Date.now(), endReason: "Yönetici sonlandırdı" } : x)) });
    },
    updateSettings(patch) {
      if (!perms?.flags.manageUsers) return "Yetkiniz yok.";
      const n = { ...storeRef.current.settings, ...patch };
      if (n.idleMinutes < 2 || n.idleMinutes > 120 || n.lockAfter < 3 || n.lockAfter > 10 || n.lockMinutes < 1 || n.reauthMinutes < 1 || n.reauthMinutes > 60)
        return "Değerler izin verilen aralığın dışında.";
      saveStore({ ...storeRef.current, settings: n });
      return null;
    },
    clearLogs() {
      if (!perms?.flags.manageUsers) return;
      saveStore({ ...storeRef.current, logins: [], docs: [], denied: [] });
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {reauth && user && (
        <ReauthDialog
          user={user}
          label={reauth.label}
          onDone={(ok, method) => {
            const s = storeRef.current;
            const ev: DocEvent = { id: randomId("BEL"), at: Date.now(), userId: user.id, user: user.name, doc: reauth.label, kind: reauth.kind, action: ok ? "reauth" : "reauth-failed", detail: method };
            saveStore({ ...s, docs: [ev, ...s.docs].slice(0, 400) });
            if (ok && sessionRef.current) saveSession({ ...sessionRef.current, reauthAt: Date.now(), lastActive: Date.now() });
            reauth.resolve(ok);
            setReauth(null);
          }}
        />
      )}
    </AuthContext.Provider>
  );
}

function ReauthDialog({ user, label, onDone }: { user: User; label: string; onDone: (ok: boolean, method?: string) => void }) {
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);
  return (
    <div className="sec-modal" role="dialog" aria-modal="true" aria-labelledby="reauth-title">
      <form
        className="sec-modal-card"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          const okPw = await verifyPassword(user, pw);
          const okCode = user.totp ? await verifyTotp(user.totp, code) : true;
          setBusy(false);
          if (okPw && okCode) return onDone(true, user.totp ? "Şifre + doğrulama kodu" : "Şifre");
          const n = tries + 1;
          setTries(n);
          setErr(n >= 3 ? "Üç hatalı deneme. Erişim iptal edildi." : "Doğrulama başarısız. Bilgileri kontrol edin.");
          if (n >= 3) setTimeout(() => onDone(false, "3 hatalı deneme"), 900);
        }}
      >
        <span className="sec-eyebrow">Hassas içerik · yeniden doğrulama</span>
        <h2 id="reauth-title">Kimliğinizi doğrulayın</h2>
        <p>
          <b>{label}</b> hassas içerik olarak işaretli. Devam etmek için şifrenizi{user.totp ? " ve doğrulama uygulamasındaki kodu" : ""} girin.
          Doğrulama birkaç dakika geçerlidir; her işlemde tekrar sorulmaz.
        </p>
        <label>
          Şifre
          <span className="sec-pw">
            <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}>{show ? "Gizle" : "Göster"}</button>
          </span>
        </label>
        {user.totp && (
          <label>
            Doğrulama kodu (6 hane)
            <input inputMode="numeric" pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" required />
          </label>
        )}
        {err && <p className="sec-error" role="alert">{err}</p>}
        <div className="sec-actions">
          <button type="button" className="btn" onClick={() => onDone(false, "Vazgeçildi")}>Vazgeç</button>
          <button className="btn primary" type="submit" disabled={busy}>{busy ? "Doğrulanıyor…" : "Doğrula ve devam et"}</button>
        </div>
        <small className="sec-demo-note">DEMO: doğrulama bu tarayıcıda yapılır. Üretimde sunucu tarafında yeniden kimlik doğrulama gerekir.</small>
      </form>
    </div>
  );
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw Error("AuthProvider gerekli");
  return c;
}
/** AuthProvider dışında (testler, eski sayfalar) null döner. */
export const useAuthOptional = () => useContext(AuthContext);
export type { Flags };
