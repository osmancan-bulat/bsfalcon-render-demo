"use client";
// Şirket genel bakışı: BŞ Falcon Group'ın bütün projeleri. Rakamlar raporlama motorundan hesaplanır.
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronRight,
  CircleAlert,
  FileSignature,
  ReceiptText,
  TriangleAlert,
  Printer,
} from "lucide-react";
import { useApp } from "./context";
import { hubHref, visibleProjects } from "@/lib/catalog";
import { Badge, Progress } from "./shared";
import { SNAPSHOT, projects, pname } from "@/lib/enterprise";
import {
  financialReport,
  salesReport,
  installmentReport,
  managerReport,
  type Alert,
} from "@/lib/reports";
import { compact, money, date } from "@/lib/data";


const ICON: Record<Alert["tone"], typeof TriangleAlert> = {
  danger: TriangleAlert,
  warning: FileSignature,
  info: ReceiptText,
};

export default function CompanyOverview() {
  const { state, setProject } = useApp();
  const all = { project: "all" };
  const fin = financialReport(state, all);
  // Bu ay: senaryo ayı (Kasım 2026); tahsilat ve ödemeler gerçek kayıt tarihlerine göre
  const month = financialReport(state, { project: "all", from: "2026-11-01", to: "2026-11-30" });
  const sales = salesReport(state, all);
  const inst = installmentReport(state, all);
  const { alerts } = managerReport(state, all);
  return (
    <div className="home company">
      <header className="home-head">
        <div>
          <span className="eyebrow">{date(SNAPSHOT)} · Resumen de la empresa</span>
          <h1>EDIFICA</h1>
          <p>
            {projects.filter((p) => p.status === "Activo").length} proyectos activos · {sales.total.total} unidades · {sales.total.sold} ventas · montos de ejemplo
          </p>
        </div>
        <nav className="quick-actions" aria-label="Acciones rápidas">
          <Link className="btn" href="/informes">
            <BarChart3 size={15} /> Raporlama
          </Link>
          <Link
            className="btn"
            href="/belge/?tur=yonetici&project=all"
            target="_blank"
          >
            <Printer size={15} /> Informe gerencial
          </Link>
        </nav>
      </header>

      <section className="status-tiles four" aria-label="Situación financiera de la empresa">
        <div className="status-tile">
          <span>Monto contratado</span>
          <strong className="num">{compact(fin.contracted)}</strong>
          <small>{sales.total.sold} contratos activos</small>
        </div>
        <div className="status-tile">
          <span>Cobrado</span>
          <strong className="num">{compact(fin.collected)}</strong>
          <small>Cobranza %{Math.round(fin.collectionRate * 100)}</small>
        </div>
        <div className="status-tile">
          <span>Saldo por cobrar</span>
          <strong className="num">{compact(fin.balance)}</strong>
          <small>{inst.upcomingCount} pagos en los próximos 90 días</small>
        </div>
        <Link
          href="/cobros?durum=Vencida"
          className={`status-tile ${fin.overdue > 0 ? "danger" : ""}`}
          onClick={() => setProject("all")}
        >
          <span>Saldo vencido</span>
          <strong className="num">{money(fin.overdue)}</strong>
          <small>
            {inst.perCustomer.length} clientes <ArrowRight size={13} />
          </small>
        </Link>
      </section>

      <Link href="/informes" className="company-month" aria-label="Caja del mes — informe financiero">
        <span>Caja de noviembre 2026</span>
        <span>
          Ingresos <b className="num">{money(month.inflow)}</b>
        </span>
        <span>
          Pagos realizados <b className="num">{money(month.outflow)}</b>
          <small> (según fecha de pago registrada)</small>
        </span>
        <span>
          Compensación por canje <b className="num">{money(month.barterOffset)}</b>
          <small> (sin efectivo)</small>
        </span>
        <ArrowRight size={14} />
      </Link>

      <section className="company-projects" aria-label="Proyectos">
        {visibleProjects().map((p) => {
          const pf = { project: p.id };
          const f = financialReport(state, pf);
          const sr = salesReport(state, pf).total;
          const ir = installmentReport(state, pf);
          return (
            <article key={p.id} className="company-project">
              {p.image && (
                <div className="project-cover">
                  <img src={p.image} alt={`${p.name} · imagen oficial`} loading="lazy" />
                  <span>Imagen: edifica.com.py</span>
                </div>
              )}
              <header>
                <span className={`project-dot ${p.id === "alion" ? "bronze" : ""}`} />
                <div>
                  <h2>{p.name}</h2>
                  <p>
                    {p.location}{p.delivery ? `· entrega ${p.delivery}` : ""}
                  </p>
                </div>
                <Link className="btn primary" href={hubHref(p.id)} onClick={() => setProject(p.id)}>
                  Ir al proyecto <ArrowRight size={15} />
                </Link>
              </header>
              <div className="company-project-stock">
                <div>
                  <b className="num">
                    {sr.sold}
                    <small> / {sr.total}</small>
                  </b>
                  <span>unidades vendidas</span>
                </div>
                <Progress value={(sr.sold / sr.total) * 100} />
                <p>
                  {sr.available} disponibles · {sr.inSigning} en firma ·{" "}
                  {sr.barter} canje · {sr.reserved} reservadas
                </p>
              </div>
              <dl className="company-project-figures">
                <div>
                  <dt>Monto contratado</dt>
                  <dd className="num">{compact(f.contracted)}</dd>
                </div>
                <div>
                  <dt>Cobrado</dt>
                  <dd className="num">
                    {compact(f.collected)}
                    <small>%{Math.round(f.collectionRate * 100)}</small>
                  </dd>
                </div>
                <div>
                  <dt>Saldo por cobrar</dt>
                  <dd className="num">{compact(f.balance)}</dd>
                </div>
                <div>
                  <dt>Vencido</dt>
                  <dd className={`num ${f.overdue > 0 ? "danger" : ""}`}>
                    {money(f.overdue)}
                    <small>{ir.perCustomer.length} clientes</small>
                  </dd>
                </div>
                <div>
                  <dt>Canje (sin efectivo)</dt>
                  <dd className="num">
                    {compact(f.barterValue)}
                    <small>saldo {compact(f.barterRemaining)}</small>
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Prioridades</h2>
          <Badge tone={alerts.some((a) => a.tone === "danger") ? "red" : "amber"}>
            {alerts.length}
          </Badge>
        </div>
        {alerts.length ? (
          <ul className="cc-actions company-alerts">
            {alerts.map((a, i) => {
              const Icon = ICON[a.tone];
              return (
                <li key={i}>
                  <Link className="cc-link-row" href={a.href} onClick={() => setProject(a.project)}>
                    <span className={`cc-task-icon t-${a.tone}`}>
                      <Icon size={16} />
                    </span>
                    <span className="cc-list-main cc-task-main">
                      <b>{a.title}</b>
                      <small>{pname(a.project)}</small>
                      <span className="cc-task-what">{a.detail}</span>
                    </span>
                    {a.amount !== undefined && (
                      <span className="cc-task-figures">
                        <span className={`cc-amount num ${a.tone === "danger" ? "danger" : ""}`}>
                          {money(a.amount)}
                        </span>
                      </span>
                    )}
                    <span className="cc-action-label">
                      Abrir <ChevronRight size={14} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="cc-allclear">
            <CircleAlert size={20} /> Sin prioridades.
          </div>
        )}
      </section>
      <p className="company-note">
        <Building2 size={14} /> Al elegir un proyecto, todos los módulos muestran solo sus registros. Los montos se calculan en vivo con los datos de demostración.
      </p>
    </div>
  );
}
