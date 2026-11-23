"use client";
// Proje portföyü ve proje yönetimi: BŞ Falcon Group'ın bütün projeleri. Yeni proje oluşturma, bilgileri
// düzenleme, durum (aktif / tamamlandı / arşiv) ve kaydı olmayan projeyi silme. Yeni proje boş başlar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Badge, Progress, Drawer } from "../enterprise/shared";
import { projects, progressInfo, type EnterpriseState } from "@/lib/enterprise";
import { salesReport, financialReport } from "@/lib/reports";
import { hubHref } from "@/lib/catalog";
import { compact } from "@/lib/data";
import type { Project } from "@/lib/data";

const TONE: Record<string, string> = { "Activo": "green", "Finalizado": "neutral", "Archivado": "amber" };

export default function Projects() {
  const { state, project, setProject, act } = useApp();
  const router = useRouter();
  const [form, setForm] = useState<"new" | string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const all = projects;
  const archived = all.filter((p) => p.status === "Archivado");
  const list = all.filter(
    (p) => (project === "all" || p.id === project) && (showArchived || p.status !== "Archivado"),
  );
  const editing = form && form !== "new" ? all.find((p) => p.id === form) : undefined;
  const open = (p: Project) => {
    setProject(p.id);
    router.push(hubHref(p.id));
  };
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Proyectos inmobiliarios</h1>
          <p>
            Proyectos de EDIFICA. Agregar un proyecto no requiere cambios de código:
            aparece automáticamente en el selector de alcance, en el resumen ejecutivo y
            en los informes.
          </p>
        </div>
        <button className="btn primary" onClick={() => setForm("new")}>
          <Plus size={15} /> Nuevo proyecto
        </button>
      </header>
      <StockLine state={state} scope={project} />
      {archived.length > 0 && (
        <label className="pf-toggle">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Ver proyectos archivados ({archived.length})
        </label>
      )}
      <div className="pf-grid">
        {list.map((p) => {
          const fin = financialReport(state, { project: p.id });
          const st = salesReport(state, { project: p.id }).total;
          const prog = progressInfo(state, p.id);
          return (
            <article key={p.id} className={`pf-card ${p.status === "Archivado" ? "archived" : ""}`}>
              {p.image && (
                <div className="project-cover">
                  <img src={p.image} alt={`${p.name} · imagen oficial`} loading="lazy" />
                  <span>Imagen: edifica.com.py</span>
                </div>
              )}
              <header className="pf-head">
                <div>
                  <h2>{p.name}</h2>
                  <p>
                    {p.location || "Konum girilmedi"} · código {p.code}
                    {p.delivery ? `· entrega ${p.delivery}` : ""}
                  </p>
                </div>
                <Badge tone={TONE[p.status]}>{p.status}</Badge>
              </header>
              {p.description && (
                <p className="pf-desc" title={p.description}>
                  {p.description}
                </p>
              )}
              <section className="pf-section" aria-label="Stock de unidades">
                <div className="pf-section-head">
                  <span>Stock de unidades</span>
                  <b className="num">
                    {st.sold} <small>/ {st.total} vendidas</small>
                  </b>
                </div>
                {st.total > 0 ? (
                  <>
                    <StockBar s={st} />
                    <p className="pf-legend">
                      {st.available} disponibles · {st.inSigning} en firma · {st.barter} canje · {st.reserved} reservadas
                    </p>
                  </>
                ) : (
                  <p className="pf-legend">Aún no hay unidades — agregue torres desde Unidades y disponibilidad.</p>
                )}
              </section>
              <dl className="pf-figures" aria-label="Situación financiera">
                <div>
                  <dt>Monto contratado</dt>
                  <dd className="num">{compact(fin.contracted)}</dd>
                </div>
                <div>
                  <dt>Cobrado</dt>
                  <dd className="num">
                    {compact(fin.collected)}
                    {fin.contracted > 0 && <small> %{Math.round(fin.collectionRate * 100)}</small>}
                  </dd>
                </div>
                <div>
                  <dt>Saldo por cobrar</dt>
                  <dd className="num">{compact(fin.balance)}</dd>
                </div>
                <div>
                  <dt>Vencido</dt>
                  <dd className={`num ${fin.overdue > 0 ? "danger" : ""}`}>{compact(fin.overdue)}</dd>
                </div>
              </dl>
              <section className="pf-section" aria-label="Avance de obra (ejemplo)">
                <div className="pf-section-head">
                  <span>Avance de obra (ejemplo)</span>
                  <b className="num">{prog.value === null ? "—" : `%${prog.value}`}</b>
                </div>
                {prog.value !== null ? (
                  <>
                    <Progress value={prog.value} />
                    <p className="pf-legend">
                      {prog.packages} paquetes de obra · avance ponderado (ejemplo)
                    </p>
                  </>
                ) : (
                  <p className="pf-legend">
                    {prog.packages
                      ? `${prog.packages} paquetes · peso total ${prog.weight} %; se calcula al llegar a 100 %`
                      : "Sin paquetes de obra definidos"}
                  </p>
                )}
              </section>
              <footer className="pf-actions">
                {p.status === "Archivado" ? (
                  <span className="pf-legend">
                    Archivado — sus registros se conservan en los informes. Para operar: Editar › Reactivar.
                  </span>
                ) : (
                  <>
                    <button className="btn primary" onClick={() => open(p)}>
                      Ver proyecto <ArrowUpRight size={15} />
                    </button>
                    <Link className="btn" href="/unidades" onClick={() => setProject(p.id)}>
                      Unidades y disponibilidad
                    </Link>
                  </>
                )}
                <button className="text-button pf-edit" onClick={() => setForm(p.id)}>
                  Editar
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      <ProjectDrawer
        key={form ?? "closed"}
        open={!!form}
        project={editing}
        onClose={() => setForm(null)}
        onCreated={(id) => {
          setForm(null);
          setProject(id);
          router.push("/unidades");
        }}
        act={act}
      />
    </>
  );
}

function ProjectDrawer({
  open,
  project,
  onClose,
  onCreated,
  act,
}: {
  open: boolean;
  project?: Project;
  onClose: () => void;
  onCreated: (id: string) => void;
  act: ReturnType<typeof useApp>["act"];
}) {
  const [busy, setBusy] = useState(false);
  const isNew = !project;
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const d = new FormData(e.currentTarget);
    const v = (k: string) => String(d.get(k) ?? "");
    setBusy(true);
    if (isNew) {
      const before = new Set(projects.map((p) => p.id));
      const ok = act({
        type: "project-create",
        record: { name: v("name"), code: v("code"), location: v("location"), delivery: v("delivery"), description: v("description") },
      });
      if (ok) {
        const created = projects.find((p) => !before.has(p.id));
        if (created) onCreated(created.id);
      }
    } else {
      if (act({ type: "project-update", id: project.id, patch: { name: v("name"), location: v("location"), delivery: v("delivery"), description: v("description") } }))
        onClose();
    }
    setBusy(false);
  }
  const status = (st: Project["status"]) => {
    if (project && act({ type: "project-status", id: project.id, status: st })) onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title={isNew ? "Nuevo proyecto" : `${project.name} · datos del proyecto`} eyebrow="GESTIÓN DE PROYECTOS">
      <form className="e-form" onSubmit={submit}>
        {isNew && (
          <p className="drawer-intro">
            El proyecto nuevo comienza vacío: no se copian clientes, ventas ni cobros de otros proyectos. Luego agregue torres y unidades en Unidades y disponibilidad.
          </p>
        )}
        <label>
          Nombre del proyecto
          <input name="name" required minLength={2} maxLength={60} defaultValue={project?.name} />
        </label>
        {isNew ? (
          <label>
            Código del proyecto
            <input name="code" required pattern="[A-Za-z]{2,4}" maxLength={4} placeholder="Ej.: ALN" />
            <small className="muted">2–4 letras; se usa en la numeración de contratos (CTR-ALN-001). No se puede cambiar.</small>
          </label>
        ) : (
          <p className="muted">Código del proyecto: {project.code} (no se puede cambiar porque se usa en la numeración de contratos)</p>
        )}
        <label>
          Konum
          <input name="location" maxLength={80} defaultValue={project?.location} placeholder="Ciudad / departamento" />
        </label>
        <label>
          Entrega prevista
          <input name="delivery" maxLength={40} defaultValue={project?.delivery} placeholder="Ej.: junio 2029" />
        </label>
        <label>
          Descripción
          <textarea name="description" maxLength={240} rows={3} defaultValue={project?.description} />
        </label>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            {isNew ? "Crear proyecto" : "Guardar"}
          </button>
        </div>
      </form>
      {!isNew && (
        <section className="acct-section">
          <h3 className="subheading">Estado del proyecto</h3>
          <p className="muted">
            Un proyecto archivado no aparece en el selector y no admite ventas nuevas; contratos, cobros e
            informes se conservan y siguen en los totales de la empresa. Puede reactivarse cuando se desee.
          </p>
          <div className="form-actions">
            {project.status !== "Activo" && (
              <button className="btn" onClick={() => status("Activo")}>
                Reactivar
              </button>
            )}
            {project.status === "Activo" && (
              <button className="btn" onClick={() => status("Finalizado")}>
                Marcar como finalizado
              </button>
            )}
            {project.status !== "Archivado" && (
              <button className="btn" onClick={() => status("Archivado")}>
                Archivar
              </button>
            )}
            {!project.builtIn && (
              <button
                className="btn danger"
                onClick={() => {
                  if (act({ type: "project-delete", id: project.id })) onClose();
                }}
              >
                Eliminar proyecto
              </button>
            )}
          </div>
          {!project.builtIn && (
            <p className="muted">Solo se puede eliminar un proyecto sin ventas, contratos ni pagos registrados.</p>
          )}
        </section>
      )}
    </Drawer>
  );
}

type Stock = ReturnType<typeof salesReport>["total"];
const SEGMENTS: [keyof Stock, string, string][] = [
  ["sold", "Vendida", "sold"],
  ["inSigning", "En firma", "draft"],
  ["barter", "Canje", "barter"],
  ["reserved", "Reservada", "reserved"],
  ["available", "Disponible", "available"],
];
/** Daire stoku çubuğu: segmentlerin toplamı her zaman toplam daireye eşittir. */
function StockBar({ s }: { s: Stock }) {
  return (
    <div
      className="pf-stock"
      role="img"
      aria-label={SEGMENTS.map(([k, l]) => `${l} ${s[k]}`).join(", ")}
    >
      {SEGMENTS.map(([k, l, cls]) =>
        (s[k] as number) > 0 ? (
          <i
            key={k}
            className={`seg-${cls}`}
            style={{ flexGrow: s[k] as number }}
            title={`${l}: ${s[k]}`}
          />
        ) : null,
      )}
    </div>
  );
}
/** Portföy stok uzlaştırması: toplam = satılan + imza sürecinde + barter + rezerve + müsait. */
function StockLine({ state, scope }: { state: EnterpriseState; scope: string }) {
  const visible = projects.filter((p) => p.status !== "Archivado");
  const ids = scope === "all" ? visible.map((p) => p.id) : [scope];
  const t = ids
    .map((id) => salesReport(state, { project: id }).total)
    .reduce(
      (a, x) => ({
        total: a.total + x.total,
        sold: a.sold + x.sold,
        inSigning: a.inSigning + x.inSigning,
        barter: a.barter + x.barter,
        reserved: a.reserved + x.reserved,
        available: a.available + x.available,
      }),
      { total: 0, sold: 0, inSigning: 0, barter: 0, reserved: 0, available: 0 },
    );
  const active = projects.filter((p) => p.status === "Activo").length;
  const archivedCount = projects.length - visible.length;
  return (
    <section className="pf-summary" aria-label="Resumen del portafolio">
      <div>
        <span>Proyectos</span>
        <b className="num">{active}</b>
        <small>
          activos · {projects.length} total
          {archivedCount ? `· ${archivedCount} archivados` : ""}
        </small>
      </div>
      <div className="pf-summary-stock">
        <span>
          Unidades ·{" "}
          {scope === "all"
            ? `todos los proyectos${archivedCount ? " (sin archivados)" : ""}`
            : (projects.find((p) => p.id === scope)?.name ?? "")}
        </span>
        <p className="num">
          <b>{t.total}</b> = {t.sold} vendidas + {t.inSigning} en firma + {t.barter} canje +{" "}
          {t.reserved} reservadas + <b>{t.available} disponibles</b>
        </p>
      </div>
    </section>
  );
}
