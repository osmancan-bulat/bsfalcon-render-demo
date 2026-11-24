"use client";
// Güvenlik Merkezi (DEMO). Kullanıcılar ve yetkiler, oturumlar, giriş kayıtları, kritik finansal değişiklikler,
// belge erişim geçmişi, yedekleme, ayarlar ve üretim mimarisi. Gerçekten uygulanmayan kontroller "aktif"
// gösterilmez: her kontrolün yanında nerede çalıştığı (tarayıcı / üretimde sunucu) açıkça yazılır.
import { useMemo, useState } from "react";
import {
  ShieldCheck, ShieldAlert, Users, MonitorSmartphone, LogIn, FileLock2, Landmark, DatabaseBackup, Settings2, Server,
  KeyRound, LockOpen, UserPlus, AlertTriangle, CheckCircle2, CircleSlash,
} from "lucide-react";
import { useAuth } from "./auth";
import { useApp } from "../enterprise/context";
import { Panel, Badge } from "../enterprise/shared";
import Backups from "../enterprise/backups";
import {
  ROLES, MODULES, ROLE_DEFAULTS, effectivePermissions, roleLabel, generatePassword, newTotpSecret, otpauthUri, sessionExpired,
  type RoleId, type Level, type ModuleId, type User, type Flags,
} from "@/lib/security";

const TABS = [
  ["genel", "Genel durum", ShieldCheck],
  ["kullanicilar", "Kullanıcılar ve yetkiler", Users],
  ["oturumlar", "Aktif oturumlar", MonitorSmartphone],
  ["girisler", "Giriş kayıtları", LogIn],
  ["finansal", "Kritik finansal değişiklikler", Landmark],
  ["belgeler", "Belge erişim geçmişi", FileLock2],
  ["yedek", "Yedekleme", DatabaseBackup],
  ["ayarlar", "Ayarlar ve hesabım", Settings2],
  ["mimari", "Üretim mimarisi", Server],
] as const;
type Tab = (typeof TABS)[number][0];
const dt = (t?: number) => (t ? new Date(t).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const FLAG_LABELS: [keyof Flags, string][] = [
  ["sensitiveDocs", "Hassas belgeleri görüntüleme"],
  ["download", "İndirme / yazdırma / CSV"],
  ["approve", "Onay ve ödeme"],
  ["manageUsers", "Kullanıcı ve yetki yönetimi"],
];

export default function SecurityCenter() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>("genel");
  const admin = !!auth.perms?.flags.manageUsers;
  return (
    <div className="sec-center">
      <header className="sec-head">
        <div>
          <span className="sec-eyebrow">BŞ Falcon · Güvenlik ve denetim</span>
          <h1>Güvenlik Merkezi</h1>
          <p>
            Kullanıcılar, roller, oturumlar ve hassas işlem kayıtları. <b>DEMO:</b> bu sürümde kontroller yalnızca bu
            tarayıcıda çalışır; gerçek kullanım için gereken sunucu altyapısı “Üretim mimarisi” sekmesinde listelenir.
          </p>
        </div>
        <span className="sec-demo-badge"><ShieldAlert size={14} /> İstemci tarafı demo · sunucu doğrulaması yok</span>
      </header>
      <nav className="sec-tabs" role="tablist" aria-label="Güvenlik Merkezi bölümleri">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>
      {!admin && tab !== "genel" && tab !== "ayarlar" && tab !== "mimari" && (
        <p className="sec-info">Salt okunur görünüm: kullanıcı ve yetki değişiklikleri yalnızca sistem yöneticisine açıktır.</p>
      )}
      {tab === "genel" && <Overview go={setTab} />}
      {tab === "kullanicilar" && <UsersTab admin={admin} />}
      {tab === "oturumlar" && <SessionsTab admin={admin} />}
      {tab === "girisler" && <LoginsTab />}
      {tab === "finansal" && <FinancialTab />}
      {tab === "belgeler" && <DocsTab />}
      {tab === "yedek" && <BackupTab />}
      {tab === "ayarlar" && <SettingsTab admin={admin} />}
      {tab === "mimari" && <ArchitectureTab />}
    </div>
  );
}

function Overview({ go }: { go: (t: Tab) => void }) {
  const { store } = useAuth();
  const now = Date.now();
  const day = now - 86400000;
  const users = store.users;
  const locked = users.filter((u) => u.lockedUntil && u.lockedUntil > now);
  const failed24 = store.logins.filter((l) => !l.ok && l.at > day);
  const no2fa = users.filter((u) => u.active && !u.totp);
  const adminsNo2fa = no2fa.filter((u) => u.role === "admin");
  const mustChange = users.filter((u) => u.active && u.mustChange);
  const active = store.sessions.filter((s) => !s.endedAt && !sessionExpired(s, store.settings, now));
  const docs24 = store.docs.filter((d) => d.at > day);
  const alerts: { tone: "red" | "amber" | "info"; title: string; detail: string; tab?: Tab }[] = [
    { tone: "red", title: "Sunucu tarafı kimlik doğrulama yok", detail: "Statik demo: giriş, oturum ve yetki kontrolleri tarayıcıda çalışır ve atlatılabilir. Gerçek şirket verisi girilmemelidir.", tab: "mimari" },
    ...(adminsNo2fa.length ? [{ tone: "amber" as const, title: `${adminsNo2fa.length} sistem yöneticisinde iki adımlı doğrulama kapalı`, detail: adminsNo2fa.map((u) => u.username).join(", "), tab: "ayarlar" as Tab }] : []),
    ...(locked.length ? [{ tone: "amber" as const, title: `${locked.length} hesap geçici olarak kilitli`, detail: locked.map((u) => u.username).join(", "), tab: "kullanicilar" as Tab }] : []),
    ...(failed24.length ? [{ tone: failed24.length >= 5 ? ("red" as const) : ("amber" as const), title: `Son 24 saatte ${failed24.length} başarısız giriş denemesi`, detail: [...new Set(failed24.map((l) => l.username))].slice(0, 6).join(", "), tab: "girisler" as Tab }] : []),
    ...(store.denied.filter((d) => d.at > day).length ? [{ tone: "amber" as const, title: `Son 24 saatte ${store.denied.filter((d) => d.at > day).length} yetkisiz erişim denemesi`, detail: "Engellendi ve kaydedildi", tab: "belgeler" as Tab }] : []),
    ...(mustChange.length ? [{ tone: "info" as const, title: `${mustChange.length} kullanıcı geçici şifreyle çalışıyor`, detail: "İlk girişte şifre değiştirmeleri önerilir", tab: "kullanicilar" as Tab }] : []),
  ];
  return (
    <>
      <div className="sec-kpis">
        <Kpi icon={<Users size={16} />} label="Kullanıcı" value={`${users.filter((u) => u.active).length} / ${users.length}`} sub="aktif / toplam (bu tarayıcı)" />
        <Kpi icon={<KeyRound size={16} />} label="İki adımlı doğrulama" value={`${users.filter((u) => u.totp).length} / ${users.length}`} sub="TOTP etkin kullanıcı" tone={adminsNo2fa.length ? "warn" : "good"} />
        <Kpi icon={<MonitorSmartphone size={16} />} label="Aktif oturum" value={String(active.length)} sub={`${store.settings.idleMinutes} dk hareketsizlikte kapanır`} />
        <Kpi icon={<LogIn size={16} />} label="Başarısız giriş (24 s)" value={String(failed24.length)} sub={`${store.settings.lockAfter} hatada ${store.settings.lockMinutes} dk kilit`} tone={failed24.length ? "warn" : undefined} />
        <Kpi icon={<FileLock2 size={16} />} label="Hassas belge erişimi (24 s)" value={String(docs24.length)} sub={`${docs24.filter((d) => d.action === "denied").length} engellendi`} />
        <Kpi icon={<CircleSlash size={16} />} label="Kilitli hesap" value={String(locked.length)} sub="geçici kilit" tone={locked.length ? "bad" : undefined} />
      </div>
      <div className="sec-grid">
        <Panel title="Güvenlik uyarıları" subtitle="Kayıtlardan anlık hesaplanır">
          <ul className="sec-alerts">
            {alerts.map((a, i) => (
              <li key={i} className={a.tone}>
                <AlertTriangle size={16} />
                <div>
                  <b>{a.title}</b>
                  <small>{a.detail}</small>
                </div>
                {a.tab && <button className="btn small" onClick={() => go(a.tab!)}>İncele</button>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Kontrol durumu" subtitle="Ne çalışıyor, nerede çalışıyor">
          <ul className="sec-controls">
            {CONTROLS.map(([name, status, where]) => (
              <li key={name}>
                {status === "demo" ? <CheckCircle2 size={15} className="ok" /> : <CircleSlash size={15} className="no" />}
                <span>{name}</span>
                <Badge tone={status === "demo" ? "amber" : "neutral"}>{where}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
const CONTROLS: [string, "demo" | "none", string][] = [
  ["Kullanıcı adı / e-posta + şifre ile giriş", "demo", "Tarayıcı içi"],
  ["Şifre özeti (PBKDF2-SHA256, tuzlu)", "demo", "Tarayıcı içi"],
  ["Hatalı girişte kilitleme", "demo", "Tarayıcı içi"],
  ["Oturum zaman aşımı ve çıkış", "demo", "Tarayıcı içi"],
  ["İki adımlı doğrulama (TOTP)", "demo", "Tarayıcı içi"],
  ["Rol bazlı ekran ve işlem yetkisi", "demo", "Tarayıcı içi"],
  ["Hassas belgede yeniden doğrulama", "demo", "Tarayıcı içi"],
  ["Erişim ve işlem kayıtları", "demo", "Tarayıcı içi"],
  ["Sunucu tarafı kimlik doğrulama", "none", "Üretimde gerekli"],
  ["Merkezî veritabanı ve şifreli belge deposu", "none", "Üretimde gerekli"],
  ["HttpOnly / Secure oturum çerezi", "none", "Üretimde gerekli"],
  ["Otomatik sunucu yedeği", "none", "Üretimde gerekli"],
];

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <section className={`sec-kpi ${tone ?? ""}`}>
      <span>{icon} {label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </section>
  );
}

function UsersTab({ admin }: { admin: boolean }) {
  const auth = useAuth();
  const { notify } = useApp();
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [shown, setShown] = useState<{ user: string; password: string } | null>(null);
  const now = Date.now();
  const selected = auth.store.users.find((u) => u.id === sel) ?? null;
  const reset = async (u: User) => {
    const p = generatePassword();
    const m = await auth.resetPassword(u.id, p);
    if (m) return notify(m);
    setShown({ user: u.username, password: p });
    notify(`${u.username} için geçici şifre üretildi.`);
  };
  return (
    <>
      {shown && (
        <p className="sec-info sec-onetime" role="status">
          <b>{shown.user}</b> geçici şifresi (yalnızca şimdi gösterilir): <code>{shown.password}</code>
          <button className="btn small" onClick={() => setShown(null)}>Gizle</button>
        </p>
      )}
      <Panel
        title="Kullanıcılar"
        subtitle="Bu tarayıcıdaki demo kullanıcıları · şifreler yalnızca tuzlu özet olarak saklanır"
        action={admin && <button className="btn primary" onClick={() => setCreating(!creating)}><UserPlus size={15} /> Kullanıcı ekle</button>}
      >
        {creating && admin && <CreateUser onDone={(u, p) => { setCreating(false); setShown({ user: u, password: p }); }} />}
        <div className="table-wrap">
          <table className="sec-table">
            <thead>
              <tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th>2 adımlı</th><th>Son giriş</th><th /></tr>
            </thead>
            <tbody>
              {auth.store.users.map((u) => {
                const locked = u.lockedUntil && u.lockedUntil > now;
                return (
                  <tr key={u.id} className={sel === u.id ? "open" : ""}>
                    <td><b>{u.name}</b><small>{u.username} · {u.email}</small></td>
                    <td>
                      {admin ? (
                        <select value={u.role} aria-label={`${u.username} rolü`} onChange={(e) => { const m = auth.updateUser(u.id, { role: e.target.value as RoleId, overrides: undefined, flagOverrides: undefined }); notify(m ?? `${u.username} rolü güncellendi.`); }}>
                          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                      ) : roleLabel(u.role)}
                      {(u.overrides || u.flagOverrides) && <small>Kişiye özel yetki</small>}
                    </td>
                    <td>
                      <Badge tone={!u.active ? "neutral" : locked ? "red" : "green"}>{!u.active ? "Pasif" : locked ? "Kilitli" : "Aktif"}</Badge>
                      {u.mustChange && <small>Geçici şifre</small>}
                    </td>
                    <td>{u.totp ? <Badge tone="green">Etkin</Badge> : <Badge tone="neutral">Kapalı</Badge>}</td>
                    <td>{dt(u.lastLogin)}</td>
                    <td className="sec-row-actions">
                      <button className="btn small" onClick={() => setSel(sel === u.id ? null : u.id)}>Yetkiler</button>
                      {admin && (
                        <>
                          {locked && <button className="btn small" onClick={() => notify(auth.unlockUser(u.id) ?? "Kilit kaldırıldı.")}><LockOpen size={13} /> Kilidi aç</button>}
                          <button className="btn small" onClick={() => reset(u)}>Şifre sıfırla</button>
                          {u.totp && <button className="btn small" onClick={() => notify(auth.disableTotp(u.id) ?? "İki adımlı doğrulama kapatıldı.")}>2FA kapat</button>}
                          {u.id !== auth.user?.id && (
                            <button className="btn small" onClick={() => notify(auth.updateUser(u.id, { active: !u.active }) ?? (u.active ? "Hesap pasifleştirildi." : "Hesap etkinleştirildi."))}>
                              {u.active ? "Pasifleştir" : "Etkinleştir"}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      {selected && <PermissionEditor user={selected} admin={admin} />}
      <Panel title="Rol varsayılanları" subtitle="Düzenle = işlem yapabilir · Görür = yalnızca görüntüler · — = erişemez">
        <div className="table-wrap">
          <table className="sec-table sec-matrix">
            <thead>
              <tr><th>Modül</th>{ROLES.map((r) => <th key={r.id}>{r.label}</th>)}</tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id}>
                  <td>{m.label}</td>
                  {ROLES.map((r) => <td key={r.id}><LevelBadge l={ROLE_DEFAULTS[r.id].modules[m.id]} /></td>)}
                </tr>
              ))}
              {FLAG_LABELS.map(([k, label]) => (
                <tr key={k} className="flag">
                  <td>{label}</td>
                  {ROLES.map((r) => <td key={r.id}>{ROLE_DEFAULTS[r.id].flags[k] ? "✓" : "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
const LevelBadge = ({ l }: { l: Level }) => (l === "edit" ? <Badge tone="green">Düzenle</Badge> : l === "view" ? <Badge tone="info">Görür</Badge> : <span className="muted">—</span>);

function CreateUser({ onDone }: { onDone: (username: string, password: string) => void }) {
  const auth = useAuth();
  const { notify } = useApp();
  const [f, setF] = useState({ name: "", username: "", email: "", role: "sales" as RoleId });
  return (
    <form
      className="sec-inline"
      onSubmit={async (e) => {
        e.preventDefault();
        const p = generatePassword();
        const m = await auth.createUser({ ...f, password: p });
        if (m) return notify(m);
        notify(`${f.username} oluşturuldu.`);
        onDone(f.username, p);
      }}
    >
      <label>Ad soyad<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
      <label>Kullanıcı adı<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required /></label>
      <label>E-posta<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
      <label>Rol
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as RoleId })}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </label>
      <button className="btn primary" type="submit">Oluştur (geçici şifre üretilir)</button>
      <small className="muted">Yalnızca kurgusal kişi bilgisi girin. Geçici şifre bir kez gösterilir.</small>
    </form>
  );
}

function PermissionEditor({ user, admin }: { user: User; admin: boolean }) {
  const auth = useAuth();
  const { notify } = useApp();
  const eff = effectivePermissions(user);
  const base = ROLE_DEFAULTS[user.role];
  const setLevel = (m: ModuleId, l: Level) => {
    const o = { ...(user.overrides ?? {}) };
    if (base.modules[m] === l) delete o[m];
    else o[m] = l;
    notify(auth.updateUser(user.id, { overrides: Object.keys(o).length ? o : undefined }) ?? "Yetki güncellendi.");
  };
  const setFlag = (k: keyof Flags, v: boolean) => {
    const o = { ...(user.flagOverrides ?? {}) };
    if (base.flags[k] === v) delete o[k];
    else o[k] = v;
    notify(auth.updateUser(user.id, { flagOverrides: Object.keys(o).length ? o : undefined }) ?? "Yetki güncellendi.");
  };
  return (
    <Panel
      title={`${user.name} · yetkiler`}
      subtitle={`${roleLabel(user.role)} rolü varsayılanları; değiştirilen alanlar kişiye özeldir`}
      action={admin && (user.overrides || user.flagOverrides) && (
        <button className="btn small" onClick={() => notify(auth.updateUser(user.id, { overrides: undefined, flagOverrides: undefined }) ?? "Rol varsayılanına dönüldü.")}>Rol varsayılanına dön</button>
      )}
    >
      <div className="sec-perm-grid">
        {MODULES.map((m) => (
          <label key={m.id} className={user.overrides?.[m.id] ? "changed" : ""}>
            <span>{m.label}</span>
            <select disabled={!admin} value={eff.modules[m.id]} onChange={(e) => setLevel(m.id, e.target.value as Level)}>
              <option value="none">Erişemez</option>
              <option value="view">Görüntüler</option>
              <option value="edit">Düzenler</option>
            </select>
          </label>
        ))}
      </div>
      <div className="sec-flags">
        {FLAG_LABELS.map(([k, label]) => (
          <label key={k} className={user.flagOverrides?.[k] !== undefined ? "changed" : ""}>
            <input type="checkbox" disabled={!admin || (k === "manageUsers" && user.id === auth.user?.id)} checked={eff.flags[k]} onChange={(e) => setFlag(k, e.target.checked)} /> {label}
          </label>
        ))}
      </div>
      <p className="muted">
        DEMO: yetkiler menüde, ekranlarda, işlemlerde ve belgelerde tarayıcı içinde uygulanır. Üretim sürümünde her istek
        sunucuda aynı yetki tablosuna göre denetlenmelidir; menü gizleme tek başına güvenlik sağlamaz.
      </p>
    </Panel>
  );
}

function SessionsTab({ admin }: { admin: boolean }) {
  const auth = useAuth();
  const now = Date.now();
  const name = (id: string) => auth.store.users.find((u) => u.id === id)?.username ?? id;
  const rows = auth.store.sessions.slice(0, 40);
  return (
    <Panel title="Oturumlar" subtitle="Yalnızca bu tarayıcıda açılan oturumlar görünür (statik demo; merkezî oturum listesi yoktur)">
      <div className="table-wrap">
        <table className="sec-table">
          <thead><tr><th>Kullanıcı</th><th>Başlangıç</th><th>Son etkinlik</th><th>Durum</th><th /></tr></thead>
          <tbody>
            {rows.map((s) => {
              const exp = sessionExpired(s, auth.store.settings, now);
              const live = !s.endedAt && !exp;
              return (
                <tr key={s.sid}>
                  <td><b>{name(s.userId)}</b><small>{s.sid}{s.sid === auth.session?.sid ? " · bu oturum" : ""}</small></td>
                  <td>{dt(s.startedAt)}</td>
                  <td>{dt(s.lastActive)}</td>
                  <td>{live ? <Badge tone="green">Aktif</Badge> : <Badge tone="neutral">{s.endReason ?? "Süresi doldu"}</Badge>}</td>
                  <td>{live && (admin || s.userId === auth.user?.id) && <button className="btn small" onClick={() => auth.endSession(s.sid)}>Sonlandır</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LoginsTab() {
  const { store } = useAuth();
  const [only, setOnly] = useState<"all" | "fail">("all");
  const rows = store.logins.filter((l) => only === "all" || !l.ok).slice(0, 120);
  return (
    <Panel
      title="Giriş kayıtları"
      subtitle={`${store.logins.length} kayıt · başarısız denemelerde kullanıcı varlığı açığa çıkarılmaz`}
      action={
        <div className="sec-seg">
          <button className={only === "all" ? "on" : ""} onClick={() => setOnly("all")}>Tümü</button>
          <button className={only === "fail" ? "on" : ""} onClick={() => setOnly("fail")}>Başarısız ({store.logins.filter((l) => !l.ok).length})</button>
        </div>
      }
    >
      <div className="table-wrap">
        <table className="sec-table">
          <thead><tr><th>Zaman</th><th>Girilen kullanıcı</th><th>Sonuç</th><th>Ayrıntı</th></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>{dt(l.at)}</td>
                <td>{l.username}</td>
                <td>{l.ok ? <Badge tone="green">Başarılı</Badge> : <Badge tone="red">Başarısız</Badge>}</td>
                <td>{l.reason}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="muted">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const FIN = /THS-|PSN-|HAK-|SAT-|GDR-|MHS-|tahsilat|ödeme|peşinat|imzalandı|iptal|mahsup|gider|sözleşme|devri|vade|silindi|arşiv/i;
function FinancialTab() {
  const { state } = useApp();
  const rows = useMemo(() => state.audit.filter((a) => FIN.test(`${a.entity} ${a.message}`)), [state.audit]);
  return (
    <Panel title="Kritik finansal değişiklikler" subtitle="Tahsilat, ödeme, sözleşme, iptal, mahsup ve gider kayıtları · işlemi yapan kullanıcıyla">
      <div className="table-wrap">
        <table className="sec-table">
          <thead><tr><th>Zaman</th><th>Kayıt</th><th>Değişiklik</th><th>Kullanıcı</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.time}</td>
                <td><code>{a.entity}</code></td>
                <td>{a.message}</td>
                <td>{a.user ?? <span className="muted">Örnek kayıt (oturumdan önce)</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Kayıtlar bu tarayıcıda tutulur ve son 100 işlemle sınırlıdır. Üretimde değiştirilemez (append-only) sunucu denetim kaydı gerekir.</p>
    </Panel>
  );
}

const ACTION_LABEL: Record<string, [string, string]> = {
  view: ["Görüntüleme", "info"],
  download: ["İndirme / yazdırma", "amber"],
  denied: ["Engellendi", "red"],
  reauth: ["Yeniden doğrulandı", "green"],
  "reauth-failed": ["Doğrulama başarısız", "red"],
};
function DocsTab() {
  const { store } = useAuth();
  return (
    <>
      <Panel title="Belge erişim geçmişi" subtitle="Sözleşme, ekstre, makbuz, rapor, arşiv dosyası, müşteri kişisel bilgisi ve CSV dışa aktarma">
        <div className="table-wrap">
          <table className="sec-table">
            <thead><tr><th>Zaman</th><th>Kullanıcı</th><th>Belge</th><th>Tür</th><th>İşlem</th><th>Ayrıntı</th></tr></thead>
            <tbody>
              {store.docs.slice(0, 150).map((d) => (
                <tr key={d.id}>
                  <td>{dt(d.at)}</td>
                  <td>{d.user}</td>
                  <td>{d.doc}</td>
                  <td>{d.kind}</td>
                  <td><Badge tone={ACTION_LABEL[d.action][1]}>{ACTION_LABEL[d.action][0]}</Badge></td>
                  <td>{d.detail ?? ""}</td>
                </tr>
              ))}
              {!store.docs.length && <tr><td colSpan={6} className="muted">Henüz hassas belge erişimi yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Yetkisiz erişim denemeleri" subtitle="Engellenen ekran ve işlem denemeleri">
        <div className="table-wrap">
          <table className="sec-table">
            <thead><tr><th>Zaman</th><th>Kullanıcı</th><th>Deneme</th></tr></thead>
            <tbody>
              {store.denied.slice(0, 100).map((d) => (
                <tr key={d.id}><td>{dt(d.at)}</td><td>{d.user}</td><td>{d.what}</td></tr>
              ))}
              {!store.denied.length && <tr><td colSpan={3} className="muted">Engellenen deneme yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function BackupTab() {
  return (
    <>
      <p className="sec-info">
        Aşağıdaki yedekler yalnızca bu tarayıcıdaki demo kayıtları içindir (manuel JSON yedeği ve geri yükleme). Merkezî,
        otomatik veya şifreli sunucu yedeği <b>yoktur</b>; üretimde günlük otomatik veritabanı yedeği, belirli bir ana geri
        dönüş ve düzenli geri yükleme testi gerekir.
      </p>
      <Backups />
    </>
  );
}

function SettingsTab({ admin }: { admin: boolean }) {
  const auth = useAuth();
  const { notify } = useApp();
  const st = auth.store.settings;
  const [f, setF] = useState({ idleMinutes: st.idleMinutes, lockAfter: st.lockAfter, lockMinutes: st.lockMinutes, reauthMinutes: st.reauthMinutes });
  const [pw, setPw] = useState({ cur: "", next: "", again: "" });
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  return (
    <div className="sec-grid">
      <Panel title="Hesabım" subtitle={`${auth.user?.name} · ${auth.user && roleLabel(auth.user.role)}`}>
        <form
          className="sec-inline"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.next !== pw.again) return notify("Yeni şifreler eşleşmiyor.");
            const m = await auth.changeOwnPassword(pw.cur, pw.next);
            notify(m ?? "Şifre değiştirildi.");
            if (!m) setPw({ cur: "", next: "", again: "" });
          }}
        >
          <label>Mevcut şifre<input type="password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} autoComplete="current-password" required /></label>
          <label>Yeni şifre<input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" required /></label>
          <label>Yeni şifre (tekrar)<input type="password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} autoComplete="new-password" required /></label>
          <button className="btn primary" type="submit">Şifreyi değiştir</button>
        </form>
        <div className="sec-totp">
          <h3><KeyRound size={16} /> İki adımlı doğrulama (TOTP)</h3>
          {auth.user?.totp ? (
            <>
              <p><Badge tone="green">Etkin</Badge> Girişte ve hassas belgelerde doğrulama kodu istenir.</p>
              <button className="btn small" onClick={() => notify(auth.disableTotp(auth.user!.id) ?? "İki adımlı doğrulama kapatıldı.")}>Kapat</button>
            </>
          ) : secret ? (
            <form
              className="sec-inline"
              onSubmit={async (e) => {
                e.preventDefault();
                const m = await auth.enableTotp(secret, code);
                notify(m ?? "İki adımlı doğrulama etkinleştirildi.");
                if (!m) {
                  setSecret("");
                  setCode("");
                }
              }}
            >
              <p>Doğrulama uygulamanıza bu anahtarı elle ekleyin (hesap türü: zamana dayalı), ardından üretilen 6 haneli kodu girin.</p>
              <code className="sec-secret">{secret.match(/.{1,4}/g)?.join(" ")}</code>
              <small className="muted sec-uri">{otpauthUri(secret, auth.user?.username ?? "")}</small>
              <label>Doğrulama kodu<input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required /></label>
              <button className="btn primary" type="submit">Etkinleştir</button>
              <button className="btn" type="button" onClick={() => setSecret("")}>Vazgeç</button>
            </form>
          ) : (
            <>
              <p className="muted">Kapalı. DEMO: gizli anahtar bu tarayıcıda saklanır; üretimde sunucuda şifreli tutulur.</p>
              <button className="btn" onClick={() => setSecret(newTotpSecret())}>Etkinleştirmeyi başlat</button>
            </>
          )}
        </div>
      </Panel>
      <Panel title="Oturum ve giriş kuralları" subtitle={admin ? "Sistem yöneticisi değiştirebilir" : "Salt okunur"}>
        <form
          className="sec-inline"
          onSubmit={(e) => {
            e.preventDefault();
            notify(auth.updateSettings(f) ?? "Güvenlik ayarları kaydedildi.");
          }}
        >
          <label>Hareketsizlikte oturum kapanışı (dk)<input type="number" min={2} max={120} value={f.idleMinutes} onChange={(e) => setF({ ...f, idleMinutes: Number(e.target.value) })} disabled={!admin} /></label>
          <label>Kilitlemeden önce hatalı deneme<input type="number" min={3} max={10} value={f.lockAfter} onChange={(e) => setF({ ...f, lockAfter: Number(e.target.value) })} disabled={!admin} /></label>
          <label>Kilit süresi (dk)<input type="number" min={1} max={120} value={f.lockMinutes} onChange={(e) => setF({ ...f, lockMinutes: Number(e.target.value) })} disabled={!admin} /></label>
          <label>Yeniden doğrulama geçerliliği (dk)<input type="number" min={1} max={60} value={f.reauthMinutes} onChange={(e) => setF({ ...f, reauthMinutes: Number(e.target.value) })} disabled={!admin} /></label>
          {admin && <button className="btn primary" type="submit">Kaydet</button>}
        </form>
        <p className="muted">Mutlak oturum süresi {st.absoluteHours} saattir. Şifre kuralı: en az 10 karakter, harf ve rakam, kullanıcı adını ve kolay dizileri içermez.</p>
        {admin && <button className="btn small" onClick={() => { auth.clearLogs(); notify("Giriş ve belge kayıtları temizlendi (demo)."); }}>Demo kayıtlarını temizle</button>}
      </Panel>
    </div>
  );
}

const ARCH: [string, string, string, "demo" | "partial" | "prod"][] = [
  ["Kimlik doğrulama", "Tarayıcıda PBKDF2 özetiyle şifre kontrolü; atlatılabilir.", "Sunucuda kimlik doğrulama (ör. Auth.js / kurumsal SSO), oturum kimliği sunucuda üretilir.", "partial"],
  ["Rol bazlı erişim (RBAC)", "Menü, ekran, işlem ve belge düzeyinde tarayıcı içi denetim.", "Her API isteğinde sunucu tarafı yetki kontrolü; satış personeli için kayıt sahipliği (yalnızca kendi müşterileri) veritabanı sorgusunda uygulanır.", "partial"],
  ["Merkezî veritabanı", "Yok. Kayıtlar tarayıcı localStorage / IndexedDB alanında.", "Yönetilen PostgreSQL; satır düzeyinde yetki, şifreli bağlantı, ayrı ortamlar (test / canlı).", "prod"],
  ["HTTPS", "Render statik sitesi HTTPS ile sunulur (aktarım şifreli).", "HTTPS + HSTS, güvenlik başlıkları (CSP, X-Frame-Options), yalnızca TLS 1.2+.", "partial"],
  ["Oturum ve çerez", "localStorage'da süreli oturum kaydı; hareketsizlik ve mutlak süre sınırı.", "HttpOnly, Secure, SameSite=Strict çerez; sunucuda oturum iptali, cihaz listesi, eşzamanlı oturum sınırı.", "partial"],
  ["Şifre saklama", "PBKDF2-SHA256, 210.000 tekrar, kullanıcıya özel tuz (tarayıcıda).", "Sunucuda Argon2id veya bcrypt; sızmış şifre kontrolü; hız sınırlama ve IP bazlı kilitleme.", "partial"],
  ["Çok faktörlü doğrulama", "TOTP (RFC 6238) tarayıcıda doğrulanır; gizli anahtar tarayıcıda.", "Sunucuda doğrulanan TOTP veya WebAuthn/passkey; gizli anahtar şifreli saklanır; kurtarma kodları.", "partial"],
  ["Hassas belge depolama", "Belgeler tarayıcıda üretilir/saklanır; görüntüleme öncesi yeniden doğrulama.", "Şifreli nesne deposu (sunucu tarafı şifreleme), herkese açık URL yok, süreli imzalı bağlantılar, virüs taraması.", "prod"],
  ["Denetim kayıtları", "Giriş, belge erişimi, yetkisiz deneme ve finansal işlem kayıtları tarayıcıda.", "Değiştirilemez (append-only) sunucu kaydı, zaman damgası, IP/cihaz bilgisi, saklama süresi ve dışa aktarım.", "partial"],
  ["Yedekleme ve geri yükleme", "Manuel JSON yedeği (yalnızca bu tarayıcı).", "Otomatik günlük yedek, belirli zamana geri dönüş, farklı bölgede kopya, düzenli geri yükleme testi.", "prod"],
  ["KVKK uyumu", "Kişi verisi yok; tüm kayıtlar kurgusal.", "Aydınlatma metni, gerekirse açık rıza, VERBİS kaydı, kişisel veri işleme envanteri, saklama-imha politikası, erişim yetki matrisi, veri ihlali bildirim süreci (72 saat), yurt dışı aktarım değerlendirmesi, personel gizlilik taahhütleri.", "prod"],
];
function ArchitectureTab() {
  return (
    <>
      <p className="sec-info">
        <b>Mevcut demo gerçek şirket verisi için uygun değildir.</b> Statik sitede sunucu olmadığından veriler ve güvenlik
        kontrolleri kullanıcının tarayıcısındadır. Gerçek kullanım için aşağıdaki üretim altyapısı kurulmalıdır.
      </p>
      <Panel title="Gereksinim · bu demoda · üretimde" subtitle="“Kısmi” = mantık hazır, ancak sunucu tarafında uygulanmadığı için güvenlik sağlamaz">
        <div className="table-wrap">
          <table className="sec-table sec-arch">
            <thead><tr><th>Gereksinim</th><th>Bu demoda</th><th>Üretimde gereken</th><th>Durum</th></tr></thead>
            <tbody>
              {ARCH.map(([k, demo, prod, st]) => (
                <tr key={k}>
                  <td><b>{k}</b></td>
                  <td>{demo}</td>
                  <td>{prod}</td>
                  <td>{st === "prod" ? <Badge tone="red">Üretim gerekli</Badge> : <Badge tone="amber">Kısmi · istemci</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Önerilen üretim yapısı" subtitle="Mevcut ekranlar korunarak">
        <ol className="sec-steps">
          <li><b>Uygulama sunucusu:</b> Next.js'in sunucu modunda (statik dışa aktarım yerine) çalıştırılması; tüm okuma/yazma işlemleri yetki kontrollü API üzerinden.</li>
          <li><b>Veritabanı:</b> yönetilen PostgreSQL; mevcut hesap kuralları (bakiye, ödeme planı, mahsup) sunucu tarafına taşınır ve aynı testlerle doğrulanır.</li>
          <li><b>Kimlik:</b> sunucu tarafı oturum, Argon2id şifre özeti, TOTP/WebAuthn, hız sınırlama; kurumsal e-posta ile davetli kullanıcı.</li>
          <li><b>Belgeler:</b> şifreli nesne deposu ve süreli imzalı bağlantılar; belge açma/indirme kayıtları sunucuda.</li>
          <li><b>İşletim:</b> otomatik yedek ve geri yükleme testi, erişim kayıtlarının saklanması, güvenlik güncellemeleri, sızma testi ve KVKK dokümantasyonu.</li>
        </ol>
        <p className="muted">Bu adımlar ücretli barındırma ve veritabanı hizmeti gerektirebilir; bu demoda hiçbir ücretli servis başlatılmamıştır.</p>
      </Panel>
    </>
  );
}
