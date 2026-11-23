"use client";
// Ficha del proyecto (centro de proyecto): datos publicados con su fuente, participantes tal como figuran en
// la fuente, galería oficial y qué parte de la demo es de ejemplo. Debajo se muestra el panel operativo.
import { useApp } from "../enterprise/context";
import { projects, summary } from "@/lib/enterprise";
import { salesReport } from "@/lib/reports";
import { PROFILES } from "@/lib/company";
import { compact } from "@/lib/data";

export default function ProjectFocus({ projectId }: { projectId: string }) {
  const { state } = useApp();
  const p = projects.find((x) => x.id === projectId);
  const prof = PROFILES[projectId];
  if (!p || !prof) return null;
  const t = salesReport(state, { project: projectId }).total;
  const sm = summary(state, projectId);
  return (
    <section className="ed-focus">
      <div className="ed-focus-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,8,8,.92) 0%, rgba(8,8,8,.62) 48%, rgba(8,8,8,.1) 100%), url(${prof.hero})` }}>
        <div>
          <span className="ed-eyebrow light">{prof.status}</span>
          <h1>{prof.name}</h1>
          <p>{prof.kind}</p>
          <div className="ed-focus-stats">
            <div><b>{t.total}</b><span>unidades cargadas</span></div>
            <div><b>{t.sold}</b><span>vendidas</span></div>
            <div><b>{t.available}</b><span>disponibles</span></div>
            <div><b>{compact(sm.revenue)}</b><span>contratado</span></div>
            <div><b>{compact(sm.balance)}</b><span>saldo por cobrar</span></div>
          </div>
        </div>
        <small className="ed-credit">Imagen: {prof.sources[0]}</small>
      </div>
      <div className="ed-focus-body">
        <div className="ed-card">
          <header>
            <div>
              <h3>Datos publicados</h3>
              <small>Verificados en fuentes públicas · 23 nov 2026</small>
            </div>
            <span className="ed-verified">Verificado</span>
          </header>
          <dl className="ed-facts">
            {prof.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div>
              <dt>Participantes</dt>
              <dd>{prof.partners}</dd>
            </div>
          </dl>
          <div className="ed-tags">
            {prof.amenities.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
          <p className="ed-sources">Fuentes: {prof.sources.join(" · ")}</p>
        </div>
        <div className="ed-focus-side">
          <div className="ed-gallery">
            {prof.gallery.map((g) => (
              <img key={g} src={g} alt={`${prof.name} · imagen oficial`} loading="lazy" />
            ))}
          </div>
          <div className="ed-sample">
            <b>Datos de demostración en este proyecto</b>
            <p>{prof.sample}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
