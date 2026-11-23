"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Wallet,
  HardHat,
  Files,
  ReceiptText,
  ShoppingCart,
  UsersRound,
  Bell,
  Search,
  ChevronRight,
  ArrowUpRight,
  LogOut,
  Menu,
  CalendarDays,
  History,
  RotateCcw,
  ShieldCheck,
  X,
  Command,
  Handshake,
  Archive,
  BellRing,
  FileSignature,
  BarChart3,
  Settings2,
} from "lucide-react";
import Login from "./login";
import { Provider, useApp } from "./enterprise/context";
import {
  Logo,
  Drawer,
  SearchBox,
  AuditTrail,
  Badge,
  Empty,
} from "./enterprise/shared";
import {
  projects,
  summary,
  customerList,
  requestList,
  requestStatus,
  pname,
  paymentRows,
} from "@/lib/enterprise";
import CompanyOverview from "./enterprise/company-overview";
import { hubHref, isScopeValid, scopeProblem } from "@/lib/catalog";
import ScopePicker from "./enterprise/scope-picker";
import ReportsView from "./enterprise/reports-view";
import AdminView from "./enterprise/admin";
import Projects from "./views/Projects";
import Sales from "./views/Sales";
import SiteProgress from "./views/SiteProgress";
import Operations from "./views/Operations";
import Documents from "./views/Documents";
import Finance from "./enterprise/finance";
import CommandCenter from "./enterprise/command-center";
import BarterView from "./enterprise/barter";
import ArchiveView from "./enterprise/archive";
import RemindersView from "./enterprise/reminders";
import UnitsView from "./enterprise/units-view";
import { CustomersPage, PaymentsPage, ContractsPage } from "./views/Pages";
import { useRouter } from "next/navigation";
import {
  SearchResults,
  Notifications,
  FileHost,
  type FileRef,
} from "./enterprise/finder";
// Ana menü: dokuz bölüm. Mevcut modüller bu bölümlerin sekmeleridir; tüm eski adresler çalışır.
type Group = {
  id: string;
  title: string;
  icon: typeof LayoutDashboard;
  tabs: [string, string][];
};
const GROUPS: Group[] = [
  { id: "home", title: "Genel Bakış", icon: LayoutDashboard, tabs: [] },
  {
    id: "projeler-daireler",
    title: "Projeler & Daireler",
    icon: Building2,
    tabs: [
      ["daireler", "Daireler"],
      ["projeler", "Proje portföyü"],
      ["santiye", "Şantiye"],
    ],
  },
  {
    id: "musteriler-satislar",
    title: "Müşteriler & Satışlar",
    icon: UsersRound,
    tabs: [
      ["musteriler", "Müşteriler"],
    ],
  },
  {
    id: "tahsilat-odemeler",
    title: "Tahsilat & Ödemeler",
    icon: Wallet,
    tabs: [
      ["odemeler", "Ödemeler"],
      ["finans", "Finans & kasa"],
    ],
  },
  {
    id: "barter-taseron",
    title: "Barter & Taşeronlar",
    icon: Handshake,
    tabs: [
      ["barter", "Barter"],
      ["taseronlar", "Taşeronlar"],
      ["operasyon", "Hakediş"],
      ["satinalma", "Satın alma"],
    ],
  },
  {
    id: "sozlesme-belge",
    title: "Sözleşmeler & Belgeler",
    icon: FileSignature,
    tabs: [
      ["sozlesmeler", "Sözleşmeler"],
      ["arsiv", "Belge arşivi"],
      ["evrak", "Proje evrakı"],
    ],
  },
  {
    id: "takvim",
    title: "Takvim & Hatırlatmalar",
    icon: CalendarDays,
    tabs: [["hatirlatmalar", "Takvim ve hatırlatmalar"]],
  },
  {
    id: "raporlama",
    title: "Raporlama",
    icon: BarChart3,
    tabs: [["raporlar", "Raporlar"]],
  },
  {
    id: "yonetim",
    title: "Yönetim & Ayarlar",
    icon: Settings2,
    tabs: [["yonetim", "Şirket ve sistem"]],
  },
];
// Menüde sekmesi olmayan eski adresler: içerikleri diğer ekranlarla aynı olduğu için yalnızca adres olarak korunur.
const LEGACY: Record<string, string> = { "satis-tahsilat": "musteriler-satislar" };
const groupOf = (section: string) =>
  GROUPS.find(
    (g) => g.tabs.some(([id]) => id === section) || LEGACY[section] === g.id,
  );
export default function Workspace({ section }: { section: string }) {
  return (
    <Provider>
      {section === "giris" ? <Login /> : <Shell section={section} />}
    </Provider>
  );
}
function Shell({ section }: { section: string }) {
  const { state, ready, project, setProject, act, toast, notify } = useApp();
  const [mobile, setMobile] = useState(false),
    [overlay, setOverlay] = useState(""),
    [search, setSearch] = useState(""),
    [file, setFile] = useState<FileRef | null>(null);
  // Yeni projelerin merkezi /proje/?id=… adresindedir (statik yayında tek sayfa, kimlik sorgudan okunur).
  const [hubId, setHubId] = useState<string | null>(null);
  useEffect(() => {
    if (section === "proje")
      setHubId(new URLSearchParams(location.search).get("id") ?? "");
  }, [section]);
  // Adresin işaret ettiği proje (proje merkezleri): yerleşik adresler veya /proje/?id=…
  const urlProject =
    section === "verdora-kozyatagi"
      ? "verdora"
      : section === "sane-time-besevler"
        ? "sanetime"
        : section === "bulvar-park-2"
          ? "bulvarpark"
          : section === "proje"
          ? hubId
          : null;
  // Adresteki proje geçersizse (silinmiş, arşivde, hiç olmamış) kapsam olarak kullanılmaz.
  const urlValid = urlProject !== null && isScopeValid(urlProject);
  // Şirket genel bakışı her zaman tüm projeleri, proje merkezleri yalnızca kendi projesini kapsar.
  const scope = urlValid
    ? urlProject!
    : section === "genel-bakis"
      ? "all"
      : project;
  const pending = requestList(state).filter(
    (r) => requestStatus(state, r) === "Onay bekliyor",
  );
  const scopedPending = pending.filter(
    (r) => scope === "all" || r.project === scope,
  );
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOverlay("search");
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const projectHub = urlValid;
  const homeSection =
    projectHub || section === "genel-bakis" || section === "proje";
  const router = useRouter();
  // Şirket genel bakışına veya geçerli bir proje merkezine girildiğinde kapsam bir kez eşitlenir.
  // (Sonraki proje seçimleriyle yarışmaması için `project` bağımlılık değildir.)
  useEffect(() => {
    if (section === "genel-bakis" || urlValid) setProject(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, scope, urlValid]);
  // Eski bağlantı veya kayıt geçersiz bir projeyi işaret ediyorsa boş ekranda kalınmaz:
  // arşivdeki proje → Proje portföyü (yeniden aktifleştirilebilir), olmayan proje → şirket genel bakışı.
  const urlKnown = section !== "proje" || hubId !== null;
  useEffect(() => {
    if (!ready || urlProject === null || !urlKnown || urlValid) return;
    const why = scopeProblem(urlProject);
    notify(
      why === "archived"
        ? "Bu proje arşivde; Proje portföyünden yeniden aktifleştirebilirsiniz."
        : "Bağlantıdaki proje bulunamadı; şirket genel bakışına yönlendirildiniz.",
    );
    setProject("all");
    router.replace(why === "archived" ? "/projeler" : "/genel-bakis");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, urlProject, urlKnown, urlValid]);
  // Kapsam değişiminde anında geçiş için şirket ve proje merkezleri önceden yüklenir.
  useEffect(() => {
    for (const href of ["/genel-bakis", "/verdora-kozyatagi", "/sane-time-besevler", "/bulvar-park-2", "/proje"])
      router.prefetch(href);
  }, [router]);
  const homeHref = hubHref(project);
  const group = homeSection ? GROUPS[0] : groupOf(section);
  const lateCount = new Set(
    paymentRows(state)
      .filter(
        (r) =>
          r.status === "Gecikti" && (scope === "all" || r.project === scope),
      )
      .map((r) => r.customerId),
  ).size;
  const draftCount = state.drafts.filter(
    (d) => scope === "all" || d.project === scope,
  ).length;
  const choose = (id: string) => {
    setProject(id);
    setMobile(false);
    if (homeSection)
      router.push(hubHref(id));
  };
  const hakedisPending = scopedPending.filter(
    (r) => r.type === "Hakediş",
  ).length;
  const purchasePending = scopedPending.filter(
    (r) => r.type === "Satın alma",
  ).length;
  // Rozetler sayının neyi ifade ettiğini erişilebilir etiket ve ipucuyla açıklar.
  const pill = (n: number, label: string, cls = "") => (
    <small className={cls} title={label} aria-label={label}>
      {n}
    </small>
  );
  const badge = (id: string) =>
    id === "odemeler" && lateCount
      ? pill(lateCount, `${lateCount} müşteride geciken ödeme`, "danger-pill")
      : id === "sozlesmeler" && draftCount
        ? pill(draftCount, `${draftCount} sözleşme taslak veya imza bekliyor`)
        : id === "operasyon" && hakedisPending
          ? pill(hakedisPending, `${hakedisPending} hakediş onay bekliyor`)
          : id === "satinalma" && purchasePending
            ? pill(purchasePending, `${purchasePending} satın alma talebi onay bekliyor`)
            : null;
  const groupBadge = (g: Group) =>
    g.id === "tahsilat-odemeler"
      ? badge("odemeler")
      : g.id === "sozlesme-belge"
        ? badge("sozlesmeler")
        : g.id === "barter-taseron" && hakedisPending + purchasePending
          ? pill(
              hakedisPending + purchasePending,
              `${hakedisPending} hakediş ve ${purchasePending} satın alma onay bekliyor`,
            )
          : null;
  return (
    <div className="enterprise-app">
      <aside className={`e-sidebar ${mobile ? "open" : ""}`}>
        <Link
          href="/genel-bakis"
          className="e-brand"
          aria-label="SANE yönetici özeti"
        >
          <Logo />
        </Link>
        <ScopePicker scope={scope} onChoose={choose} />
        <nav aria-label="Ana menü">
          {GROUPS.map((g) => (
            <Link
              key={g.id}
              aria-current={group?.id === g.id ? "page" : undefined}
              className={group?.id === g.id ? "active" : ""}
              href={g.id === "home" ? homeHref : `/${g.tabs[0][0]}`}
              onClick={() => setMobile(false)}
            >
              <g.icon size={18} />
              <span>{g.title}</span>
              {groupBadge(g)}
            </Link>
          ))}
        </nav>
        <div className="e-sidebar-bottom">
          <button className="e-history" onClick={() => setOverlay("audit")}>
            <History size={16} /> İşlem geçmişi{" "}
            <small>{state.audit.length}</small>
          </button>
          <div className="e-profile demo">
            <div>
              <b>Demo ortamı</b>
              <small>Kullanıcı girişi ve yetkilendirme yok</small>
            </div>
            <Link href="/" aria-label="Giriş ekranına dön">
              <LogOut size={16} />
            </Link>
          </div>
          <div className="e-powered">
            SANE<span> · </span>
            <small>YÖNETİM MERKEZİ</small>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-shade"
          aria-label="Menüyü kapat"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="e-main">
        <header className="e-topbar">
          <div className="e-breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Menüyü aç"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span className="crumb-company">SANE İnşaat</span>
            <ChevronRight size={13} className="crumb-company" />
            <span>{scope === "all" ? "Tüm projeler" : pname(scope)}</span>
            <ChevronRight size={13} />
            <b>{group?.title ?? "Genel Bakış"}</b>
          </div>
          <div className="e-header-actions">
            <button
              aria-label="Çalışma alanında ara"
              className="global-search"
              onClick={() => setOverlay("search")}
            >
              <Search size={15} />
              <span>Proje, müşteri veya işlem ara</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="e-demo-label"
              title="Demo kapsamı: veriler bu tarayıcıda, kayıtlar temsilî"
              onClick={() => setOverlay("demo")}
            >
              <i />
              Demo · temsili veri · 15 Kas 2026
            </button>
            <button
              className="icon-button"
              aria-label="Bildirim merkezini aç"
              onClick={() => setOverlay("alerts")}
            >
              <Bell size={19} />
              {(lateCount > 0 ||
                draftCount > 0 ||
                pending.some(
                  (r) => scope === "all" || r.project === scope,
                )) && <i className="notification-dot" />}
            </button>
          </div>
        </header>
        <main className="e-content">
          {group && group.tabs.length > 1 && (
            <nav
              className="section-tabs"
              aria-label={`${group.title} bölümleri`}
            >
              {group.tabs.map(([id, title]) => (
                <Link
                  key={id}
                  href={`/${id}`}
                  className={id === section ? "active" : ""}
                  aria-current={id === section ? "page" : undefined}
                >
                  {title}
                  {badge(id)}
                </Link>
              ))}
            </nav>
          )}
          {!ready ? (
            <div className="e-loading">Çalışma alanı hazırlanıyor…</div>
          ) : (
            <>
              {section === "genel-bakis" && <CompanyOverview />}
              {section === "raporlar" && <ReportsView />}
              {section === "yonetim" && (
                <AdminView onReset={() => setOverlay("reset")} />
              )}
              {section === "projeler" && <Projects />}
              {section === "satis-tahsilat" && <Sales />}
              {section === "finans" && <Finance />}
              {section === "santiye" && <SiteProgress />}
              {["operasyon", "satinalma", "taseronlar"].includes(section) && (
                <Operations mode={section} />
              )}{" "}
              {section === "barter" && <BarterView />}
              {section === "daireler" && <UnitsView />}
              {section === "musteriler" && <CustomersPage />}
              {section === "odemeler" && <PaymentsPage />}
              {section === "sozlesmeler" && <ContractsPage />}
              {section === "arsiv" && <ArchiveView />}
              {section === "hatirlatmalar" && <RemindersView />}
              {section === "evrak" && <Documents />}
              {projectHub && <CommandCenter projectId={scope} />}
              {section === "proje" && hubId !== null && !projectHub && (
                <Empty
                  title="Proje bulunamadı"
                  detail="Proje silinmiş veya bağlantı hatalı olabilir. Projeler & Daireler › Proje portföyü üzerinden seçin."
                />
              )}
            </>
          )}
          <footer className="e-footer">
            <span>
              SANE İnşaat <i /> Yönetim Merkezi <i /> Kişi, firma ve
              finansal kayıtlar tamamen temsilidir.
            </span>
            <button onClick={() => setOverlay("reset")}>
              <RotateCcw size={13} /> Demoyu sıfırla
            </button>
          </footer>
        </main>
      </div>
      <Drawer
        open={!!overlay}
        onClose={() => setOverlay("")}
        title={
          overlay === "search"
            ? "Çalışma alanında ara"
            : overlay === "audit"
              ? "İşlem geçmişi"
              : overlay === "reset"
                ? "Demoyu sıfırla"
                : overlay === "demo"
                  ? "Bu bir ürün demosudur"
                  : "Bildirim merkezi"
        }
      >
        {overlay === "search" && (
          <>
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Müşteri, daire, sözleşme no, firma…"
            />
            <SearchResults
              query={search}
              onPick={(f) => {
                setOverlay("");
                setSearch("");
                if (f) setFile(f);
              }}
            />
          </>
        )}
        {overlay === "audit" && (
          <>
            <p className="drawer-intro">
              Bu tarayıcıdaki değişikliklerin kaydı. Son 100 işlem saklanır.
            </p>
            <AuditTrail items={state.audit} />
          </>
        )}
        {overlay === "alerts" && (
          <Notifications
            scope={scope}
            onPick={(f) => {
              setOverlay("");
              if (f) setFile(f);
            }}
          />
        )}
        {overlay === "demo" && (
          <section className="acct-section demo-scope">
            <p className="drawer-intro">
              Bu yönetim merkezi, SANE İnşaat için hazırlanmış bir ürün demosudur.
              Ekrandaki tüm kişi, firma, sözleşme ve tutarlar kurgusaldır.
            </p>
            <ul className="confirm-list">
              <li>
                <b>Kişi ve firma adları kurgusaldır.</b> Selin Yılmaz, Kuzey
                Cephe Sistemleri gibi adlar örnek senaryo için uydurulmuştur;
                gerçek SANE müşterileri, çalışanları veya yüklenicileri
                değildir. Telefon, e-posta ve kimlik bilgisi içermez.
              </li>
              <li>
                <b>Senaryo tarihi sabittir: 15 Kasım 2026.</b> Vade, gecikme ve
                hatırlatmalar bu tarihe göre hesaplanır; sistem saatini
                kullanmaz.
              </li>
              <li>
                <b>Resmî kaynaktan doğrulanan bilgiler:</b> proje adları ve
                konumları; VERDORA Kozyatağı için A/B blok, 15 kat, 60 adet 3+1
                ve net 95,9–101,7 m²; Sane Time Beşevler için 3 blok, 92 konut
                ve 8 ticari birim (saneinsaat.net, verdorakozyatagi.com).
              </li>
              <li>
                <b>Bunların dışındaki her şey temsilidir.</b> Liste ve satış
                fiyatları, satış/rezerve adetleri, tahsilatlar, kasa, bütçe,
                hakediş ve barter tutarları ile Sane Time ve Bulvar Park II daire
                tipleri demo varsayımıdır; SANE İnşaat’ın gerçek verisi değildir.
              </li>
              <li>
                <b>Veriler yalnızca bu tarayıcıda saklanır.</b> Sunucu
                veritabanı yoktur; başka cihaz veya kullanıcı aynı kayıtları
                görmez. Tarayıcı verisi silinirse kayıtlar kaybolur.
              </li>
              <li>
                <b>Kullanıcı girişi ve yetkilendirme yoktur.</b> Giriş ekranı
                şifresizdir; onaylar tek bir demo yöneticisi adına kaydedilir.
              </li>
              <li>
                <b>Belge arşivi demo amaçlıdır.</b> Yüklenen dosyalar yalnızca
                bu tarayıcıda tutulur; kurumsal arşiv, yedekleme veya paylaşım
                yoktur. Sistem belgeleri kayıtlardan anlık üretilir ve hukuki
                metin değildir.
              </li>
              <li>
                <b>Dış gönderim yoktur.</b> SMS, e-posta, banka veya muhasebe
                entegrasyonu bulunmaz.
              </li>
            </ul>
            <p className="muted">
              Gerçek kullanım için sunucu veritabanı, kullanıcı/rol yönetimi,
              denetim izi ve yedekleme ayrıca kurulmalıdır.
            </p>
            <div className="form-actions">
              <button className="btn" onClick={() => setOverlay("reset")}>
                Demoyu sıfırla
              </button>
              <button className="btn primary" onClick={() => setOverlay("")}>
                Anladım
              </button>
            </div>
          </section>
        )}
        {overlay === "reset" && (
          <>
            <p className="drawer-intro">
              Kaydettiğiniz tahsilatlar, ödeme işlemleri, notlar ve düzenlemeler
              kaldırılarak başlangıç verisine dönülür.
            </p>
            <div className="form-actions">
              <button className="btn" onClick={() => setOverlay("")}>
                Vazgeç
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  act({ type: "reset" });
                  setOverlay("");
                }}
              >
                Başlangıca dön
              </button>
            </div>
          </>
        )}
      </Drawer>
      <FileHost file={file} setFile={setFile} />
      {toast && (
        <div className="e-toast" role="status">
          <ShieldCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
