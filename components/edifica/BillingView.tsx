"use client";
// Registro de facturación: cada cobro (anticipo o cuota) es una fila facturable. Se registra el número de
// la factura emitida en el sistema de facturación de la empresa o se anula. NO emite facturas electrónicas.
import Link from "next/link";
import { useMemo, useState } from "react";
import { Printer, FileCheck2, Ban, Info } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Panel, SearchBox, Badge, Empty } from "../enterprise/shared";
import { billingRows, fxOf, INVOICE_RE, type BillingRow, type BillingStatus } from "@/lib/billing";
import { projects, SNAPSHOT } from "@/lib/enterprise";
import { money, date, usd, gs } from "@/lib/data";
import { unitShort } from "@/lib/units";

const TONE: Record<BillingStatus, string> = { "Por emitir": "amber", Emitida: "green", Anulada: "gray", Revisar: "red" };
const FILTERS: ("Todas" | BillingStatus)[] = ["Todas", "Por emitir", "Emitida", "Anulada", "Revisar"];

export default function BillingView() {
  const { state, project, act } = useApp();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todas");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const fx = fxOf(state);
  const rows = useMemo(
    () => billingRows(state).filter((r) => project === "all" || r.project === project),
    [state, project],
  );
  const shown = rows.filter(
    (r) =>
      (filter === "Todas" || r.status === filter) &&
      (!q || `${r.customer} ${r.concept} ${r.record?.number ?? ""} ${r.reference}`.toLocaleLowerCase("es").includes(q.toLocaleLowerCase("es"))),
  );
  const sum = (st: BillingStatus) => rows.filter((r) => r.status === st).reduce((a, r) => a + r.amount, 0);
  const count = (st: BillingStatus) => rows.filter((r) => r.status === st).length;
  return (
    <div className="ed-billing">
      <div className="ed-billing-intro">
        <Info size={16} />
        <p>
          <b>Registro interno de facturación.</b> Cada cobro registrado genera una fila para facturar. Aquí se registra el número
          de la factura emitida en el sistema de facturación de la empresa (formato 001-001-0000123) y su estado.
          Esta demo <b>no emite facturas electrónicas</b>, no se conecta con SIFEN/SET ni valida timbrado.
        </p>
      </div>
      <div className="ed-kpis four">
        <Stat label="Por emitir" value={money(sum("Por emitir"))} sub={`${count("Por emitir")} cobros sin factura`} tone="warn" />
        <Stat label="Facturas emitidas" value={money(sum("Emitida"))} sub={`${count("Emitida")} facturas registradas`} tone="good" />
        <Stat label="Para revisar" value={money(sum("Revisar"))} sub={`${count("Revisar")} facturas de cobros anulados`} tone={count("Revisar") ? "bad" : undefined} />
        <Stat label="Tipo de cambio de referencia" value={`₲ ${fx.rate.toLocaleString("es-PY")}`} sub={`por USD · ${date(fx.date)} · se guarda en cada factura`} />
      </div>
      <Panel
        title="Comprobantes por cobro"
        subtitle={`${shown.length} de ${rows.length} cobros · montos en USD con su equivalente en guaraníes`}
        action={<SearchBox value={q} onChange={setQ} placeholder="Cliente, concepto o número de factura" />}
      >
        <div className="ed-filter" role="tablist" aria-label="Estado de facturación">
          {FILTERS.map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f}
              <small>{f === "Todas" ? rows.length : count(f)}</small>
            </button>
          ))}
        </div>
        {!shown.length ? (
          <Empty title="Sin comprobantes para este filtro" />
        ) : (
          <div className="table-wrap">
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Fecha de cobro</th>
                  <th>Cliente · unidad</th>
                  <th>Concepto</th>
                  <th className="numeric">Monto (USD)</th>
                  <th className="numeric">Equivalente (₲)</th>
                  <th>Factura</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <Row key={r.source} r={r} open={open === r.source} onToggle={() => setOpen(open === r.source ? null : r.source)} act={act} rate={fx.rate} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="ed-disclaimer">
        Datos de demostración. Números de factura de ejemplo; la integración con el sistema de facturación electrónica (SIFEN) requiere
        un desarrollo y una validación aparte.
      </p>
    </div>
  );
}

function Row({ r, open, onToggle, act, rate }: { r: BillingRow; open: boolean; onToggle: () => void; act: ReturnType<typeof useApp>["act"]; rate: number }) {
  const [num, setNum] = useState("");
  const [day, setDay] = useState(r.date > SNAPSHOT ? SNAPSHOT : SNAPSHOT);
  const [reason, setReason] = useState("");
  const shownRate = r.record?.rate ?? rate;
  const isReceipt = r.source.startsWith("THS-");
  return (
    <>
      <tr className={open ? "open" : ""}>
        <td>{date(r.date)}</td>
        <td>
          <b>{r.customer}</b>
          <small>{unitShort(r.customerId)} · {projects.find((p) => p.id === r.project)?.name}</small>
        </td>
        <td>
          {r.concept}
          <small>{r.reference}</small>
        </td>
        <td className="numeric">{usd(r.amount)}</td>
        <td className="numeric">
          {gs(r.amount, shownRate)}
          <small>TC {shownRate.toLocaleString("es-PY")}{r.record ? " (al emitir)" : " (referencia)"}</small>
        </td>
        <td>{r.record ? <><b>{r.record.number}</b><small>{date(r.record.date)}</small></> : <small>—</small>}</td>
        <td>
          <Badge tone={TONE[r.status]}>{r.status}</Badge>
        </td>
        <td className="ed-row-actions">
          {isReceipt && (
            <Link className="icon-button" href={`/belge/?tur=makbuz&id=${r.source}`} title="Imprimir recibo de cobro" aria-label="Imprimir recibo de cobro">
              <Printer size={15} />
            </Link>
          )}
          <button className="btn small" onClick={onToggle}>
            {r.status === "Emitida" || r.status === "Revisar" ? "Detalle" : r.status === "Anulada" && r.reversed ? "Detalle" : "Registrar factura"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="ed-row-detail">
          <td colSpan={8}>
            {(r.status === "Por emitir" || (r.status === "Anulada" && !r.reversed)) && (
              <form
                className="ed-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (act({ type: "invoice-issue", source: r.source, number: num, date: day })) {
                    setNum("");
                    onToggle();
                  }
                }}
              >
                <label>
                  N.º de factura
                  <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="001-001-0000123" required pattern="\d{3}-\d{3}-\d{7}" aria-invalid={!!num && !INVOICE_RE.test(num)} />
                </label>
                <label>
                  Fecha de emisión
                  <input type="date" value={day} min={r.date} max={SNAPSHOT} onChange={(e) => setDay(e.target.value)} required />
                </label>
                <p>
                  Se registrará {usd(r.amount)} = {gs(r.amount, rate)} con TC ₲ {rate.toLocaleString("es-PY")}.
                </p>
                <button className="btn primary" type="submit">
                  <FileCheck2 size={15} /> Registrar factura
                </button>
              </form>
            )}
            {r.status === "Emitida" && (
              <form
                className="ed-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (act({ type: "invoice-void", source: r.source, reason })) setReason("");
                }}
              >
                <label className="grow">
                  Motivo de anulación
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: datos del cliente incorrectos" required />
                </label>
                <button className="btn danger" type="submit">
                  <Ban size={15} /> Anular factura
                </button>
              </form>
            )}
            {r.status === "Revisar" && (
              <p className="ed-warn">El cobro de origen fue anulado y la factura {r.record?.number} sigue emitida: corresponde emitir una nota de crédito en el sistema de facturación y anular la factura aquí.</p>
            )}
            {r.record?.history.length ? (
              <ol className="ed-history">
                {r.record.history.map((h, i) => (
                  <li key={i}>
                    <b>{h.status}</b> · {date(h.date)} · {h.note}
                  </li>
                ))}
              </ol>
            ) : null}
            {r.status === "Revisar" && (
              <form className="ed-inline-form" onSubmit={(e) => { e.preventDefault(); act({ type: "invoice-void", source: r.source, reason: reason || "Cobro anulado · nota de crédito emitida" }); }}>
                <label className="grow">
                  Motivo
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cobro anulado · nota de crédito emitida" />
                </label>
                <button className="btn danger" type="submit"><Ban size={15} /> Anular factura</button>
              </form>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className={`ed-kpi ${tone ?? ""}`}>
      <span className="ed-kpi-label">{label}</span>
      <b className="ed-kpi-value">{value}</b>
      <small>{sub}</small>
    </div>
  );
}
