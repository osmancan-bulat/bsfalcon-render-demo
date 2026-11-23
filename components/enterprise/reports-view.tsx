"use client";
// Raporlama merkezi: kapsam (şirket/proje) ve dönem filtresiyle altı rapor; CSV ve yazdırılabilir çıktı.
import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useApp } from "./context";
import ReportBody from "./report-body";
import { projects, SNAPSHOT } from "@/lib/enterprise";
import { reportCsv, REPORT_TITLES, periodLabel, type ReportKind } from "@/lib/reports";
import { csvDownload } from "@/lib/export";

const KINDS: [ReportKind, string, string][] = [
  ["caja", "Situación financiera", "Ventas, cobranza, cuentas por cobrar y movimientos de caja."],
  ["satis", "Ventas", "Ventas por proyecto y tipología, stock y porcentaje de cobranza."],
  ["cuotas", "Cuotas y mora", "Cobros próximos, antigüedad de la mora y mora por cliente."],
  ["taseron", "Contratistas y certificados", "Certificados, aprobaciones y pagos por contratista."],
  ["yonetici", "Informe gerencial", "Resumen de la empresa y los proyectos, alertas y pendientes."],
];
// Dönem kısayolları senaryo tarihine (15 Kas 2026) göre hesaplanır.
const PRESETS: [string, string | undefined, string | undefined][] = [
  ["Todo el período", undefined, undefined],
  ["Noviembre 2026", "2026-11-01", "2026-11-30"],
  ["Últimos 3 meses", "2026-08-16", SNAPSHOT],
  ["Año 2026", "2026-01-01", "2026-12-31"],
  ["Próximos 3 meses", SNAPSHOT, "2027-02-15"],
];

export default function ReportsView() {
  const { state, project, setProject } = useApp();
  const [kind, setKind] = useState<ReportKind>("caja");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  useEffect(() => {
    const k = new URLSearchParams(location.search).get("rapor") as ReportKind | null;
    if (k && KINDS.some(([id]) => id === k)) setKind(k);
  }, []);
  const f = { project, from, to };
  const invalid = !!(from && to && from > to);
  const query = new URLSearchParams({ tur: "rapor", rapor: kind, project, ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const meta = KINDS.find(([id]) => id === kind)!;
  return (
    <div className="reports">
      <header className="page-head">
        <div>
          <h1>Raporlama</h1>
          <p>
            Todos los informes se calculan en vivo desde los registros; cuando cambia un cobro,
            un pago o un contrato, los informes cambian.
          </p>
        </div>
      </header>

      <section className="rp-filters" aria-label="Filtros del informe">
        <label>
          Kapsam
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">Todos los proyectos (empresa)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="rp-period">
          <span>Período</span>
          <div className="rp-presets" role="group" aria-label="Atajos de período">
            {PRESETS.map(([label, a, b]) => (
              <button
                key={label}
                className={from === a && to === b ? "active" : ""}
                aria-pressed={from === a && to === b}
                onClick={() => {
                  setFrom(a);
                  setTo(b);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label>
          Desde
          <input type="date" value={from ?? ""} onChange={(e) => setFrom(e.target.value || undefined)} />
        </label>
        <label>
          Hasta
          <input type="date" value={to ?? ""} onChange={(e) => setTo(e.target.value || undefined)} />
        </label>
      </section>

      <div className="panel rp-panel">
        <nav className="e-tabs" role="tablist" aria-label="Tipo de informe">
          {KINDS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? "active" : ""} onClick={() => setKind(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="rp-head">
          <div>
            <h2>{REPORT_TITLES[kind]}</h2>
            <p>
              {meta[2]} <b>{project === "all" ? "Toda la empresa" : projects.find((p) => p.id === project)?.name}</b> ·{" "}
              {periodLabel(f)}
            </p>
          </div>
          <div className="rp-actions">
            <button
              className="btn"
              disabled={invalid}
              onClick={() => csvDownload(reportCsv(state, kind, f), `edifica-${kind}-raporu-${project}.csv`)}
            >
              <Download size={15} /> CSV (Excel)
            </button>
            <a className={`btn primary ${invalid ? "disabled" : ""}`} href={`/belge/?${query}`} target="_blank" rel="noreferrer">
              <Printer size={15} /> Imprimir / PDF
            </a>
          </div>
        </div>
        <div className="rp-content">
          {invalid ? (
            <p className="callout">La fecha inicial no puede ser posterior a la final.</p>
          ) : (
            <ReportBody s={state} kind={kind} f={f} />
          )}
        </div>
      </div>
      <p className="company-note">
        Los indicadores de estado (contratado, saldo y vencido) corresponden a la fecha de corte. El filtro de período se aplica a la fecha real de cobro o pago para la caja, a la fecha de firma para las ventas y al vencimiento para cuotas y certificados. El archivo CSV se abre directamente en Excel.
      </p>
    </div>
  );
}
