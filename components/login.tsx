"use client";
// Giriş ekranı: By Güzel kurumsal kimliği, kullanıcı adı/e-posta + şifre, şifreyi göster/gizle, 2 adımlı
// doğrulama, kontrollü hata mesajları ve oturum süresi bildirimleri. İlk açılışta DEMO kurulumu: yönetici
// şifresini kullanıcı belirler (kaynak kodda şifre yoktur). Bu ekran DEMO'dur: doğrulama tarayıcıda yapılır.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, LogOut, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "./enterprise/shared";
import { useApp } from "./enterprise/context";
import { useAuth } from "./security/auth";
import { projects } from "@/lib/enterprise";
import { generatePassword, passwordProblem, roleLabel, type RoleId } from "@/lib/security";

const SAMPLE_ROLES: { role: RoleId; username: string; name: string }[] = [
  { role: "owner", username: "ust.yonetim", name: "Üst yönetim (örnek)" },
  { role: "accounting", username: "muhasebe", name: "Muhasebe (örnek)" },
  { role: "sales", username: "satis", name: "Satış danışmanı (örnek)" },
  { role: "site", username: "santiye", name: "Şantiye sorumlusu (örnek)" },
  { role: "viewer", username: "izleyici", name: "Görüntüleyici (örnek)" },
];

export default function Login() {
  useApp();
  const auth = useAuth();
  const router = useRouter();
  const active = projects.filter((p) => p.status === "Aktif");
  const [target, setTarget] = useState("/genel-bakis");
  const [created, setCreated] = useState<{ username: string; role: RoleId; password: string }[] | null>(null);
  useEffect(() => {
    const r = new URLSearchParams(location.search).get("r");
    if (r && r.startsWith("/") && !r.startsWith("//")) setTarget(r);
  }, []);
  return (
    <main className="login-v3 sec-login">
      <section className="lv-visual">
        <div className="lv-brand">
          <Logo />
        </div>
        <div className="lv-story">
          <span className="eyebrow">BY GÜZEL · YÖNETİM MERKEZİ</span>
          <h1>
            Alanya'daki projeler, satıştan
            <br />
            tapu teslimine tek merkezde.
          </h1>
          <p>
            Guzel Life Premium'un 5 bloğu, Guzel Nature ve City Prime: daire planı, EUR / USD / TL sözleşmeler,
            taksit ve tahsilat, teslim, tapu ve satış sonrası hizmet. Proje bilgileri byguzel.com'dan; kayıtlar temsilidir.
          </p>
          <ul className="lv-facts">
            <li>
              <b>90</b>
              <span>GLP dairesi · 5 blok</span>
            </li>
            <li>
              <b>3</b>
              <span>Para birimi · ayrı hesap</span>
            </li>
            <li>
              <b>{active.length}</b>
              <span>Demoda yönetilen proje</span>
            </li>
          </ul>
        </div>
        <ol className="lv-projects" aria-label="Devam eden projeler">
          {active.slice(0, 4).map((p) => (
            <li key={p.id}>
              <i className={p.id === "cengilli" ? "bronze" : ""} />
              {p.name} {p.location && <small>{p.location}</small>}
            </li>
          ))}
        </ol>
      </section>

      <section className="lv-form">
        <div className="lv-form-inner">
          <div className="product-logo">
            By Güzel<span>·</span>Yönetim Merkezi
          </div>
          <span className="sec-demo-badge">
            <ShieldAlert size={14} /> DEMO GİRİŞİ · tarayıcı içi doğrulama
          </span>
          {!auth.ready ? (
            <p className="lv-lead">Güvenlik bileşenleri yükleniyor…</p>
          ) : created ? (
            <CreatedList created={created} onDone={() => router.push(target)} />
          ) : auth.user ? (
            <SignedIn target={target} />
          ) : auth.tourAllowed ? (
            <>
              <Tour onDone={() => router.push(target)} />
              <details className="lv-setup">
                <summary>Kendi yönetici hesabınızla kurulum (isteğe bağlı)</summary>
                <Setup onDone={() => router.push(target)} onCreated={setCreated} />
              </details>
            </>
          ) : auth.pendingTotp ? (
            <SecondFactor onDone={() => router.push(target)} />
          ) : (
            <SignIn onDone={() => router.push(target)} />
          )}
          <p className="lv-disclaimer">
            <LockKeyhole size={15} />
            <span>
              <b>Bu giriş bir DEMO'dur.</b> Bu sürüm statik bir sitede çalışır; şifre özeti, oturum ve yetki kontrolleri
              yalnızca bu tarayıcıda tutulur ve teknik bilgisi olan biri tarafından atlatılabilir. Gerçek şirket verisi
              girmeyin. Gerçek kullanım için sunucu tarafı kimlik doğrulama, merkezî veritabanı ve rol bazlı erişim
              kontrolü gerekir (Güvenlik Merkezi › Üretim mimarisi). Kişi, firma ve tutarlar temsilidir.
            </span>
          </p>
        </div>
        <footer>By Güzel için hazırlanmış özel yazılım demosu · Alanya / Antalya</footer>
      </section>
    </main>
  );
}

const TOUR_ROLES: { role: RoleId; title: string; detail: string }[] = [
  { role: "owner", title: "Üst yönetim", detail: "Tüm projeler, finans, raporlar" },
  { role: "accounting", title: "Muhasebe", detail: "Tahsilat, kasa, cari" },
  { role: "sales", title: "Satış danışmanı", detail: "Daire planı, satış, müşteri" },
  { role: "viewer", title: "Görüntüleyici", detail: "Yalnızca okuma" },
];

/** Tanıtım modu: kurulum yapılmamış tarayıcıda şifresiz örnek rol girişi. Güvenlik sağlamaz, öyle de gösterilmez. */
function Tour({ onDone }: { onDone: () => void }) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="lv-tour">
      <p className="lv-lead">
        <b>Tanıtım modu.</b> Bir rol seçin; demo örnek verilerle açılır. Bu giriş şifresizdir ve <b>güvenlik sağlamaz</b> —
        yalnızca ürünü incelemek içindir.
      </p>
      <div className="lv-tour-roles">
        {TOUR_ROLES.map((t) => (
          <button
            key={t.role}
            type="button"
            className={t.role === "owner" ? "btn primary" : "btn"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const e = await auth.startTour(t.role);
              setBusy(false);
              if (e) setErr(e);
              else onDone();
            }}
          >
            <b>{t.title}</b>
            <small>{t.detail}</small>
          </button>
        ))}
      </div>
      {err && <p className="sec-error" role="alert">{err}</p>}
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete, id, label }: { value: string; onChange: (v: string) => void; autoComplete: string; id: string; label: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="sec-field" htmlFor={id}>
      {label}
      <span className="sec-pw">
        <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={show}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const auth = useAuth();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="sec-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setErr("");
        const r = await auth.login(id, pw);
        setBusy(false);
        setPw("");
        if (!r.ok) return setErr(r.message ?? "Giriş yapılamadı.");
        if (!r.needsTotp) onDone();
      }}
    >
      <h2>Oturum açın</h2>
      <p className="lv-lead">Size tanımlanan kullanıcı adı veya e-posta ile giriş yapın.</p>
      {auth.notice && !err && <p className="sec-info" role="status">{auth.notice}</p>}
      <label className="sec-field" htmlFor="login-id">
        Kullanıcı adı veya e-posta
        <span className="sec-input-icon">
          <UserRound size={16} />
          <input id="login-id" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoFocus required />
        </span>
      </label>
      <PasswordInput id="login-pw" label="Şifre" value={pw} onChange={setPw} autoComplete="current-password" />
      {err && <p className="sec-error" role="alert">{err}</p>}
      <button className="lv-enter" type="submit" disabled={busy}>
        {busy ? "Doğrulanıyor…" : "Oturum aç"} <ArrowRight size={18} />
      </button>
      <p className="sec-help">Şifrenizi unuttuysanız sistem yöneticisi Güvenlik Merkezi'nden yeni geçici şifre tanımlar.</p>
    </form>
  );
}

function SecondFactor({ onDone }: { onDone: () => void }) {
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  return (
    <form
      className="sec-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const m = await auth.verifySecondFactor(code);
        setCode("");
        if (m) return setErr(m);
        onDone();
      }}
    >
      <h2>İki adımlı doğrulama</h2>
      <p className="lv-lead">Doğrulama uygulamanızdaki (Google Authenticator, Microsoft Authenticator vb.) 6 haneli kodu girin.</p>
      <label className="sec-field" htmlFor="totp">
        Doğrulama kodu
        <span className="sec-input-icon">
          <KeyRound size={16} />
          <input id="totp" inputMode="numeric" maxLength={6} pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" autoFocus required />
        </span>
      </label>
      {err && <p className="sec-error" role="alert">{err}</p>}
      <button className="lv-enter" type="submit">
        Doğrula <ArrowRight size={18} />
      </button>
      <button type="button" className="sec-link" onClick={auth.cancelSecondFactor}>
        Farklı kullanıcıyla giriş
      </button>
    </form>
  );
}

function SignedIn({ target }: { target: string }) {
  const auth = useAuth();
  return (
    <div className="sec-form">
      <h2>Oturum açık</h2>
      <p className="lv-lead">
        <b>{auth.user!.name}</b> · {roleLabel(auth.user!.role)}
      </p>
      <Link href={target} className="lv-enter">
        Yönetim merkezine devam <ArrowRight size={18} />
      </Link>
      <button type="button" className="sec-link" onClick={() => auth.logout("Oturum kapatıldı.")}>
        <LogOut size={14} /> Oturumu kapat
      </button>
    </div>
  );
}

function CreatedList({ created, onDone }: { created: { username: string; role: RoleId; password: string }[]; onDone: () => void }) {
  return (
    <div className="sec-form">
      <h2>Örnek rol kullanıcıları</h2>
      <p className="lv-lead">
        Şifreler rastgele üretildi ve <b>yalnızca şimdi</b> gösteriliyor; tarayıcıda yalnızca özetleri saklanır. Rolleri
        denemek için not alın. İlk girişte şifre değişikliği önerilir.
      </p>
      <table className="sec-cred">
        <thead>
          <tr><th>Kullanıcı adı</th><th>Rol</th><th>Geçici şifre</th></tr>
        </thead>
        <tbody>
          {created.map((c) => (
            <tr key={c.username}><td>{c.username}</td><td>{roleLabel(c.role)}</td><td><code>{c.password}</code></td></tr>
          ))}
        </tbody>
      </table>
      <button className="lv-enter" type="button" onClick={onDone}>
        Yönetim merkezine geç <ArrowRight size={18} />
      </button>
    </div>
  );
}

function Setup({ onDone, onCreated }: { onDone: () => void; onCreated: (c: { username: string; role: RoleId; password: string }[]) => void }) {
  const auth = useAuth();
  const [f, setF] = useState({ name: "", username: "", email: "", pw: "", pw2: "" });
  const [samples, setSamples] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const problem = f.pw ? passwordProblem(f.pw, f.username) : null;
  return (
    <form
      className="sec-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (f.pw !== f.pw2) return setErr("Şifreler eşleşmiyor.");
        setBusy(true);
        const list = samples ? SAMPLE_ROLES.map((x) => ({ ...x, password: generatePassword() })) : [];
        const m = await auth.setupAdmin({ name: f.name, username: f.username, email: f.email, password: f.pw }, list);
        setBusy(false);
        if (m) return setErr(m);
        if (list.length) onCreated(list.map((x) => ({ username: x.username, role: x.role, password: x.password })));
        else onDone();
      }}
    >
      <h2>
        <ShieldCheck size={20} /> Demo kurulumu
      </h2>
      <p className="lv-lead">
        Bu tarayıcıda henüz kullanıcı yok. İlk <b>sistem yöneticisi</b> hesabını oluşturun. Şifreyi siz belirlersiniz;
        kaynak kodda hazır şifre bulunmaz.
      </p>
      <label className="sec-field">Ad soyad<input value={f.name} onChange={set("name")} required autoComplete="name" /></label>
      <div className="sec-two">
        <label className="sec-field">Kullanıcı adı<input value={f.username} onChange={set("username")} required autoComplete="username" placeholder="ör. yonetici" /></label>
        <label className="sec-field">E-posta<input type="email" value={f.email} onChange={set("email")} required autoComplete="email" placeholder="ad@ornek.test" /></label>
      </div>
      <PasswordInput id="setup-pw" label="Şifre (en az 10 karakter, harf ve rakam)" value={f.pw} onChange={(v) => setF({ ...f, pw: v })} autoComplete="new-password" />
      {problem && <small className="sec-hint">{problem}</small>}
      <PasswordInput id="setup-pw2" label="Şifre (tekrar)" value={f.pw2} onChange={(v) => setF({ ...f, pw2: v })} autoComplete="new-password" />
      <label className="sec-check">
        <input type="checkbox" checked={samples} onChange={(e) => setSamples(e.target.checked)} /> Rolleri denemek için 5 örnek kullanıcı oluştur
        (üst yönetim, muhasebe, satış, şantiye, görüntüleyici; şifreler rastgele üretilir ve bir kez gösterilir)
      </label>
      {err && <p className="sec-error" role="alert">{err}</p>}
      <button className="lv-enter" type="submit" disabled={busy}>
        {busy ? "Oluşturuluyor…" : "Yöneticiyi oluştur ve giriş yap"} <ArrowRight size={18} />
      </button>
    </form>
  );
}
