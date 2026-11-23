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
import EdificaHome from "./edifica/EdificaHome";
import ProjectFocus from "./edifica/ProjectFocus";
import BillingView from "./edifica/BillingView";
import ReceivablesView from "./edifica/ReceivablesView";
import { Landmark } from "lucide-react";
import { hubHref, isScopeValid, scopeProblem } from "@/lib/catalog";
import ScopePicker from "./enterprise/scope-picker";
import ReportsView from "./enterprise/reports-view";
import AdminView from "./enterprise/admin";
import Projects from "./views/Projects";
import Finance from "./enterprise/finance";
import CommandCenter from "./enterprise/command-center";
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
  { id: "home", title: "Resumen Ejecutivo", icon: LayoutDashboard, tabs: [] },
  {
    id: "proyectos-unidades",
    title: "Proyectos y Unidades",
    icon: Building2,
    tabs: [
      ["proyectos", "Proyectos inmobiliarios"],
      ["unidades", "Unidades y disponibilidad"],
    ],
  },
  { id: "clientes", title: "Clientes", icon: UsersRound, tabs: [["clientes", "Clientes"]] },
  { id: "contratos", title: "Contratos", icon: FileSignature, tabs: [["contratos", "Contratos y planes de pago"]] },
  {
    id: "cobros",
    title: "Cobros y Cuotas",
    icon: Wallet,
    tabs: [
      ["cobros", "Cobros mensuales"],
      ["cuentas-por-cobrar", "Cuentas por cobrar"],
    ],
  },
  { id: "facturacion", title: "Facturación", icon: ReceiptText, tabs: [["facturacion", "Registro de facturación"]] },
  { id: "caja", title: "Caja y Movimientos", icon: Landmark, tabs: [["caja", "Caja y movimientos"]] },
  { id: "informes", title: "Informes Financieros", icon: BarChart3, tabs: [["informes", "Informes"]] },
  { id: "documentos", title: "Documentos", icon: Files, tabs: [["documentos", "Documentos"]] },
  { id: "agenda", title: "Agenda y Vencimientos", icon: CalendarDays, tabs: [["agenda", "Agenda"]] },
  { id: "configuracion", title: "Configuración", icon: Settings2, tabs: [["configuracion", "Empresa y sistema"]] },
];
// Menüde sekmesi olmayan eski adresler: içerikleri diğer ekranlarla aynı olduğu için yalnızca adres olarak korunur.
const LEGACY: Record<string, string> = {};
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
  // Yeni projelerin merkezi /proyecto/?id=… adresindedir (statik yayında tek sayfa, kimlik sorgudan okunur).
  const [hubId, setHubId] = useState<string | null>(null);
  useEffect(() => {
    if (section === "proyecto")
      setHubId(new URLSearchParams(location.search).get("id") ?? "");
  }, [section]);
  // Adresin işaret ettiği proje (proje merkezleri): yerleşik adresler veya /proyecto/?id=…
  const urlProject =
    section === "lofty-city-hub"
      ? "lofty"
      : section === "alion-residence"
        ? "alion"
        : section === "v-tower-del-lago"
          ? "vtower"
          : section === "business-one"
          ? "business"
          : section === "proyecto"
          ? hubId
          : null;
  // Adresteki proje geçersizse (silinmiş, arşivde, hiç olmamış) kapsam olarak kullanılmaz.
  const urlValid = urlProject !== null && isScopeValid(urlProject);
  // Şirket genel bakışı her zaman tüm projeleri, proje merkezleri yalnızca kendi projesini kapsar.
  const scope = urlValid
    ? urlProject!
    : section === "resumen"
      ? "all"
      : project;
  const pending = requestList(state).filter(
    (r) => requestStatus(state, r) === "Pendiente de aprobación",
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
    projectHub || section === "resumen" || section === "proyecto";
  const router = useRouter();
  // Şirket genel bakışına veya geçerli bir proje merkezine girildiğinde kapsam bir kez eşitlenir.
  // (Sonraki proje seçimleriyle yarışmaması için `project` bağımlılık değildir.)
  useEffect(() => {
    if (section === "resumen" || urlValid) setProject(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, scope, urlValid]);
  // Eski bağlantı veya kayıt geçersiz bir projeyi işaret ediyorsa boş ekranda kalınmaz:
  // arşivdeki proje → Proje portföyü (yeniden aktifleştirilebilir), olmayan proje → şirket genel bakışı.
  const urlKnown = section !== "proyecto" || hubId !== null;
  useEffect(() => {
    if (!ready || urlProject === null || !urlKnown || urlValid) return;
    const why = scopeProblem(urlProject);
    notify(
      why === "archived"
        ? "Este proyecto está archivado; puede reactivarlo desde Proyectos inmobiliarios."
        : "No se encontró el proyecto del enlace; se abrió el resumen ejecutivo.",
    );
    setProject("all");
    router.replace(why === "archived" ? "/proyectos" : "/resumen");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, urlProject, urlKnown, urlValid]);
  // Kapsam değişiminde anında geçiş için şirket ve proje merkezleri önceden yüklenir.
  useEffect(() => {
    for (const href of ["/resumen", "/lofty-city-hub", "/alion-residence", "/v-tower-del-lago", "/business-one", "/proyecto"])
      router.prefetch(href);
  }, [router]);
  const homeHref = hubHref(project);
  const group = homeSection ? GROUPS[0] : groupOf(section);
  const lateCount = new Set(
    paymentRows(state)
      .filter(
        (r) =>
          r.status === "Vencida" && (scope === "all" || r.project === scope),
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
    (r) => r.type === "Certificado de obra",
  ).length;
  const purchasePending = scopedPending.filter(
    (r) => r.type === "Compra",
  ).length;
  // Rozetler sayının neyi ifade ettiğini erişilebilir etiket ve ipucuyla açıklar.
  const pill = (n: number, label: string, cls = "") => (
    <small className={cls} title={label} aria-label={label}>
      {n}
    </small>
  );
  const badge = (id: string) =>
    id === "cobros" && lateCount
      ? pill(lateCount, `${lateCount} clientes con cuotas vencidas`, "danger-pill")
      : id === "contratos" && draftCount
        ? pill(draftCount, `${draftCount} contratos en borrador o pendientes de firma`)
        : id === "operasyon" && hakedisPending
          ? pill(hakedisPending, `${hakedisPending} certificados pendientes de aprobación`)
          : id === "satinalma" && purchasePending
            ? pill(purchasePending, `${purchasePending} compras pendientes de aprobación`)
            : null;
  const groupBadge = (g: Group) =>
    g.id === "cobros"
      ? badge("cobros")
      : g.id === "contratos"
        ? badge("contratos")
        : g.id === "caja" && hakedisPending + purchasePending
          ? pill(
              hakedisPending + purchasePending,
              `${hakedisPending + purchasePending} pagos a proveedores pendientes de aprobación`,
            )
          : null;
  return (
    <div className="enterprise-app">
      <aside className={`e-sidebar ${mobile ? "open" : ""}`}>
        <Link
          href="/resumen"
          className="e-brand"
          aria-label="EDIFICA · Resumen ejecutivo"
        >
          <Logo />
        </Link>
        <ScopePicker scope={scope} onChoose={choose} />
        <nav aria-label="Menú principal">
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
            <History size={16} /> Historial{" "}
            <small>{state.audit.length}</small>
          </button>
          <div className="e-profile demo">
            <div>
              <b>Entorno de demostración</b>
              <small>Sin inicio de sesión ni permisos</small>
            </div>
            <Link href="/" aria-label="Volver a la pantalla de inicio">
              <LogOut size={16} />
            </Link>
          </div>
          <div className="e-powered">
            EDIFICA<span> · </span>
            <small>CENTRO DE GESTIÓN</small>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-shade"
          aria-label="Cerrar menú"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="e-main">
        <header className="e-topbar">
          <div className="e-breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span className="crumb-company">EDIFICA</span>
            <ChevronRight size={13} className="crumb-company" />
            <span>{scope === "all" ? "Todos los proyectos" : pname(scope)}</span>
            <ChevronRight size={13} />
            <b>{group?.title ?? "Resumen Ejecutivo"}</b>
          </div>
          <div className="e-header-actions">
            <button
              aria-label="Buscar en el centro de gestión"
              className="global-search"
              onClick={() => setOverlay("search")}
            >
              <Search size={15} />
              <span>Buscar proyecto, cliente u operación</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="e-demo-label"
              title="Alcance de la demo: datos en este navegador, registros de ejemplo"
              onClick={() => setOverlay("demo")}
            >
              <i />
              Datos de demostración · 15 nov 2026
            </button>
            <button
              className="icon-button"
              aria-label="Abrir centro de notificaciones"
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
              aria-label={`Secciones de ${group.title}`}
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
            <div className="e-loading">Preparando el centro de gestión…</div>
          ) : (
            <>
              {section === "resumen" && <EdificaHome />}
              {section === "facturacion" && <BillingView />}
              {section === "cuentas-por-cobrar" && <ReceivablesView />}
              {section === "informes" && <ReportsView />}
              {section === "configuracion" && (
                <AdminView onReset={() => setOverlay("reset")} />
              )}
              {section === "proyectos" && <Projects />}
              {section === "caja" && <Finance />}
              {section === "unidades" && <UnitsView />}
              {section === "clientes" && <CustomersPage />}
              {section === "cobros" && <PaymentsPage />}
              {section === "contratos" && <ContractsPage />}
              {section === "documentos" && <ArchiveView />}
              {section === "agenda" && <RemindersView />}
              {projectHub && <ProjectFocus projectId={scope} />}
              {projectHub && <CommandCenter projectId={scope} />}
              {section === "proyecto" && hubId !== null && !projectHub && (
                <Empty
                  title="Proyecto no encontrado"
                  detail="El proyecto pudo haber sido eliminado o el enlace es incorrecto. Selecciónelo en Proyectos y Unidades › Proyectos inmobiliarios."
                />
              )}
            </>
          )}
          <footer className="e-footer">
            <span>
              Demostración de software preparada para EDIFICA con datos de ejemplo · Datos de demostración.
            </span>
            <button onClick={() => setOverlay("reset")}>
              <RotateCcw size={13} /> Restablecer demo
            </button>
          </footer>
        </main>
      </div>
      <Drawer
        open={!!overlay}
        onClose={() => setOverlay("")}
        title={
          overlay === "search"
            ? "Buscar en el centro de gestión"
            : overlay === "audit"
              ? "Historial"
              : overlay === "reset"
                ? "Restablecer demo"
                : overlay === "demo"
                  ? "Esta es una demostración del producto"
                  : "Bildirim merkezi"
        }
      >
        {overlay === "search" && (
          <>
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Cliente, unidad, n.º de contrato, proveedor…"
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
              Registro de cambios en este navegador. Se guardan las últimas 100 operaciones.
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
              Este centro de gestión es una demostración preparada para EDIFICA. Todas las personas, empresas, contratos y montos en pantalla son ejemplos.
            </p>
            <ul className="confirm-list">
              <li>
                <b>Datos verificados en fuentes públicas:</b> nombre, ciudad, inicio de operaciones (2024) y portafolio de EDIFICA; nombres, ubicaciones, tipologías, superficies, plazos de entrega, participantes y planes de pago publicados de Lofty City Hub, ALION Residence, V Tower del Lago y Business One; imágenes oficiales. Cada proyecto indica sus fuentes.
              </li>
              <li>
                <b>Datos de demostración:</b> clientes, precios de lista y de venta, contratos, cuotas, cobros, facturas, proveedores, caja y avance de obra son ejemplos. La muestra de unidades de Lofty City Hub y V Tower del Lago es de ejemplo. No reflejan registros reales de EDIFICA.
              </li>
              <li>
                <b>Los nombres de personas y empresas son ficticios.</b> No contienen documentos de identidad, teléfonos ni correos reales.
              </li>
              <li>
                <b>La fecha de corte del escenario es fija: 15 de noviembre de 2026.</b> Vencimientos, mora y recordatorios se calculan con esa fecha, no con el reloj del sistema.
              </li>
              <li>
                <b>Moneda:</b> los montos se registran en USD. La vista en guaraníes usa solo el tipo de cambio de referencia definido en Configuración; no hay conversión automática.
              </li>
              <li>
                <b>Facturación:</b> registro interno del estado de cada comprobante. No emite facturas electrónicas ni se conecta con SIFEN/SET.
              </li>
              <li>
                <b>Los datos se guardan solo en este navegador.</b> No hay base de datos en servidor; otro dispositivo o usuario no ve los mismos registros.
              </li>
              <li>
                <b>No hay inicio de sesión ni permisos de usuario.</b> Las aprobaciones se registran a nombre de un único usuario de demostración.
              </li>
              <li>
                <b>No hay envíos externos.</b> No hay integración con SMS, correo, WhatsApp, bancos, contabilidad, CRM ni facturación electrónica.
              </li>
            </ul>
            <p className="muted">
              Para uso real se requiere instalar base de datos en servidor, gestión de usuarios y roles, auditoría y respaldos.
            </p>
            <div className="form-actions">
              <button className="btn" onClick={() => setOverlay("reset")}>
                Restablecer demo
              </button>
              <button className="btn primary" onClick={() => setOverlay("")}>
                Entendido
              </button>
            </div>
          </section>
        )}
        {overlay === "reset" && (
          <>
            <p className="drawer-intro">
              Se eliminan los cobros, pagos, facturas, notas y cambios registrados y se vuelve a los datos iniciales.
            </p>
            <div className="form-actions">
              <button className="btn" onClick={() => setOverlay("")}>
                Cancelar
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  act({ type: "reset" });
                  setOverlay("");
                }}
              >
                Volver al inicio
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
