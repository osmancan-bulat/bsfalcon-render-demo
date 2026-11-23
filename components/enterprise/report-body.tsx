// Rapor içerikleri: ekranda (Raporlama) ve yazdırılabilir belgede (/belge?tur=rapor) aynı bileşen kullanılır.
import type { ReactNode } from "react";
import { pname, type EnterpriseState } from "@/lib/enterprise";
import {
  financialReport,
  salesReport,
  installmentReport,
  barterReport,
  subcontractorReport,
  managerReport,
  periodLabel,
  type ReportFilter,
  type ReportKind,
} from "@/lib/reports";
import { money, date } from "@/lib/data";

const pct = (n: number) => `%${(Math.round(n * 1000) / 10).toLocaleString("es-PY")}`;
const monthName = (m: string) =>
  new Date(m + "-15T12:00:00").toLocaleDateString("es-PY", { month: "long", year: "numeric" });

function Figures({ title, note, items }: { title: string; note?: string; items: [string, string, string?, string?][] }) {
  return (
    <section className="rp-block">
      <h3>
        {title}
        {note && <small>{note}</small>}
      </h3>
      <dl className="rp-figures">
        {items.map(([k, v, sub, tone]) => (
          <div key={k} className={tone ?? ""}>
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
            {sub && <small>{sub}</small>}
          </div>
        ))}
      </dl>
    </section>
  );
}

function Table({
  title,
  note,
  head,
  rows,
  foot,
  numeric = [],
  empty = "Sin registros en este alcance.",
}: {
  title?: string;
  note?: string;
  head: string[];
  rows: ReactNode[][];
  foot?: ReactNode[];
  numeric?: number[];
  empty?: string;
}) {
  return (
    <section className="rp-block">
      {title && (
        <h3>
          {title}
          {note && <small>{note}</small>}
        </h3>
      )}
      {rows.length ? (
        <div className="e-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                {head.map((h, i) => (
                  <th key={h} className={numeric.includes(i) ? "numeric" : ""}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={numeric.includes(j) ? "numeric num" : ""}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {foot && (
              <tfoot>
                <tr>
                  {foot.map((c, j) => (
                    <td key={j} className={numeric.includes(j) ? "numeric num" : ""}>
                      {c}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <p className="rp-empty">{empty}</p>
      )}
    </section>
  );
}

const Bar = ({ value, max, tone = "" }: { value: number; max: number; tone?: string }) => (
  <span className={`rp-bar ${tone}`} aria-hidden>
    <i style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
  </span>
);

export default function ReportBody({ s, kind, f }: { s: EnterpriseState; kind: ReportKind; f: ReportFilter }) {
  const period = periodLabel(f);
  if (kind === "caja") {
    const a = financialReport(s, f);
    return (
      <>
        <Figures
          title="Cuentas por cobrar"
          note="Al 15 nov 2026 · independiente del filtro de fechas"
          items={[
            ["Total contratado", money(a.contracted)],
            ["Total cobrado", money(a.collected), `Cobranza ${pct(a.collectionRate)}`],
            ["Saldo por cobrar", money(a.balance)],
            ["Saldo vencido", money(a.overdue), `Cuotas ${money(a.overdueInstallments)} · anticipos ${money(a.overdueDeposits)}`, a.overdue > 0 ? "danger" : ""],
          ]}
        />
        <Figures
          title="Movimiento de caja"
          note={`Período: ${period}`}
          items={[
            ["Ingresos", money(a.inflow), `Anticipos ${money(a.inflowDeposit)} · cuotas ${money(a.inflowInstallment)} · pagos intermedios ${money(a.inflowInterim)}`],
            ["Egresos de caja", money(a.outflow), "Certificados y compras pagados · según fecha real de pago"],
            ["Flujo de caja neto", money(a.net)],
            ["Aprobado, no pagado", money(a.payableApproved), "Deuda pendiente de pago (estado)"],
          ]}
        />
        <Figures
          title="Efecto de canjes (sin efectivo)"
          note="No genera ingresos ni egresos de caja"
          items={[
            ["Valor de canjes", money(a.barterValue), "Trabajos recibidos a cambio de unidades"],
            ["Compensado en el período", money(a.barterOffset), `${a.barterOffsetCount} compensaciones · ${period}`],
            ["Obligación de canje pendiente", money(a.barterRemaining), "Trabajo pendiente con empresas"],
          ]}
        />
        <Table
          title="Pagos de caja"
          note={`El período se determina por la fecha de pago registrada; el vencimiento es informativo y no implica egreso de caja.${a.undatedPaidCount ? ` ${a.undatedPaidCount} pagos sin fecha registrada (${money(a.undatedPaidAmount)}) solo figuran en “Todo el período”.` : ""}`}
          head={["Fecha de pago", "Vencimiento", "Solicitud", "Empresa", "Proyecto", "Tipo", "Pagado (USD)"]}
          numeric={[6]}
          rows={a.outflowRows.map((r) => [r.paidAt ? date(r.paidAt) : "Sin registros", date(r.due), r.id, r.company, pname(r.project), r.type, money(r.amount)])}
          foot={["Total", "", "", "", "", "", money(a.outflow)]}
          empty="No hay pagos a proveedores en este período."
        />
      </>
    );
  }
  if (kind === "satis") {
    const b = salesReport(s, f);
    return (
      <>
        <Table
          title="Ventas por proyecto"
          note="Stock de unidades y precios al 15 nov 2026"
          head={["Proyecto", "Total", "Vendidas", "En firma", "Canje", "Reservada", "Disponible", "Precio de venta", "Cobrado", "Cobranza"]}
          numeric={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
          rows={b.byProject.map((r) => [r.name, r.total, r.sold, r.inSigning, r.barter, r.reserved, r.available, money(r.value), money(r.collected), pct(r.rate)])}
          foot={b.byProject.length > 1 ? ["Total", b.total.total, b.total.sold, b.total.inSigning, b.total.barter, b.total.reserved, b.total.available, money(b.total.value), money(b.total.collected), pct(b.total.rate)] : undefined}
        />
        <Table
          title="Por tipología"
          head={["Proyecto", "Tipología", "Stok", "Vendidas", "Disponible", "Doluluk", "Precio de venta", "Venta promedio", "Cobranza"]}
          numeric={[2, 3, 4, 6, 7, 8]}
          rows={b.byType.map((r) => [
            r.name,
            r.type,
            r.total,
            r.sold,
            r.available,
            <span className="rp-cell-bar" key="b">
              <Bar value={r.sold} max={r.total} /> {pct(r.total ? r.sold / r.total : 0)}
            </span>,
            money(r.value),
            r.sold ? money(r.avgPrice) : "—",
            r.sold ? pct(r.rate) : "—",
          ])}
        />
        <Table
          title="Contratos firmados en el período"
          note={`Por fecha de firma · ${period} · ${b.signedInPeriod.length} contratos`}
          head={["Firma", "Contrato", "Cliente", "Proyecto", "Unidad", "Tipología", "Precio", "Cobrado"]}
          numeric={[6, 7]}
          rows={b.signedInPeriod.slice(0, 40).map((r) => [date(r.signed), r.number, r.name, pname(r.project), r.unit, r.type, money(r.price), money(r.collected)])}
          foot={b.signedInPeriod.length > 40 ? [`+${b.signedInPeriod.length - 40} contratos más (lista completa en el CSV)`, "", "", "", "", "", "", ""] : undefined}
          empty="No hay contratos firmados en este período."
        />
      </>
    );
  }
  if (kind === "cuotas") {
    const c = installmentReport(s, f);
    const max = Math.max(...c.aging.map((a) => a.amount), 1);
    return (
      <>
        <Figures
          title="Resumen"
          note={f.from || f.to ? `Vencimiento: ${period}` : "Vencido: al 15 nov 2026 · próximos: siguientes 90 días"}
          items={[
            ["Saldo vencido", money(c.overdueTotal), `${c.overdueCount} cuotas · ${c.perCustomer.length} clientes`, c.overdueTotal > 0 ? "danger" : ""],
            ["Cobranza próxima", money(c.upcomingTotal), `${c.upcomingCount} vencimientos`],
          ]}
        />
        <Table
          title="Antigüedad de la mora"
          note="En pagos parciales solo se cuenta el saldo"
          head={["Atraso", "Pago", "Cliente", "Monto", ""]}
          numeric={[1, 2, 3]}
          rows={c.aging.map((a) => [a.label, a.count, a.customers, money(a.amount), <Bar key="b" value={a.amount} max={max} tone="danger" />])}
          foot={["Total", c.overdueCount, c.perCustomer.length, money(c.overdueTotal), ""]}
        />
        <Table
          title="Mora por cliente"
          head={["Cliente", "Contrato", "Proyecto · unidad", "Cuotas vencidas", "Vencimiento más antiguo", "Atraso", "Pagado parcialmente", "Monto vencido"]}
          numeric={[3, 5, 6, 7]}
          rows={c.perCustomer.map((r) => [r.name, r.number, `${pname(r.project)} · ${r.unit}`, `${r.count} · ${r.kinds}`, date(r.oldest), `${r.maxDays} días`, r.partialPaid ? money(r.partialPaid) : "—", money(r.amount)])}
          empty="Sin cuotas vencidas."
        />
        <Table
          title="Cobros próximos (por mes)"
          head={["Mes", "Pago", "Con pago parcial", "Monto esperado"]}
          numeric={[1, 2, 3]}
          rows={c.byMonth.map((m) => [monthName(m.month), m.count, m.partial || "—", money(m.amount)])}
          foot={["Total", c.upcomingCount, "", money(c.upcomingTotal)]}
          empty="Sin vencimientos en este rango."
        />
      </>
    );
  }
  if (kind === "barter") {
    const d = barterReport(s, f);
    return (
      <>
        <Figures
          title="Resumen de canjes"
          note="Los canjes no son efectivo; no se incluyen en caja"
          items={[
            ["Unidades entregadas", `${d.totals.count}`, `Valor de lista ${money(d.totals.listValue)}`],
            ["Valor del acuerdo", money(d.totals.amount)],
            ["Certificados compensados", money(d.totals.offset), `En el período ${money(d.totals.offsetInPeriod)}`],
            ["Obligación pendiente", money(d.totals.remaining)],
          ]}
        />
        <Table
          title="Por empresa"
          head={["Empresa", "Acuerdo", "Unidades entregadas", "Valor de lista", "Valor del acuerdo", "Compensación", "Obligación pendiente"]}
          numeric={[1, 3, 4, 5, 6]}
          rows={d.firms.map((r) => [r.company, r.count, r.units, money(r.listValue), money(r.amount), money(r.offset), money(r.remaining)])}
          foot={["Total", d.totals.count, "", money(d.totals.listValue), money(d.totals.amount), money(d.totals.offset), money(d.totals.remaining)]}
        />
        <Table
          title="Acuerdos y compensaciones"
          head={["Canje", "Empresa · trabajo", "Proyecto · unidad", "Precio", "Compensaciones", "Saldo", "Avance · transferencia"]}
          numeric={[3, 5]}
          rows={d.rows.map((r) => [
            r.id,
            `${r.company} · ${r.work}`,
            `${pname(r.project)} · ${r.unit} (${r.unitType})`,
            money(r.amount),
            r.offsets.length ? r.offsets.map((o) => `${o.requestId} ${money(o.amount)} (${date(o.date)})`).join(", ") : "—",
            money(r.remaining),
            `%${r.progress} · ${r.transfer}`,
          ])}
        />
      </>
    );
  }
  if (kind === "taseron") {
    const e = subcontractorReport(s, f);
    return (
      <>
        <Figures
          title="Resumen de certificados"
          note={f.from || f.to ? `Vencimiento de certificados: ${period}` : "Todos los certificados"}
          items={[
            ["Precio del contrato", money(e.totals.value), "Total de contratos de obra"],
            ["Total certificado", money(e.totals.hakedis)],
            ["Pendiente de aprobación", money(e.totals.pending)],
            ["Aprobado (no pagado)", money(e.totals.approved), `A pagar ${money(e.totals.cashDue)}`],
            ["Pagado", money(e.totals.paid), `Pagado ${money(e.totals.cashPaid)}`],
            ["Compensación por canje", money(e.totals.barterOffset), "Cancelado sin efectivo"],
          ]}
        />
        <Table
          title="Empresa y paquete"
          head={["Contrato", "Empresa", "Paquetes de obra", "Precio", "Certificado de obra", "Pendiente de aprobación", "Aprobado", "Pagado", "Pagado", "Compensación por canje"]}
          numeric={[3, 4, 5, 6, 7, 8, 9]}
          rows={e.rows.map((r) => [r.id, `${r.company} · ${pname(r.project)}`, r.packages, money(r.value), money(r.hakedis), money(r.pending), money(r.approved), money(r.paid), money(r.cashPaid), money(r.barterOffset)])}
          foot={["Total", "", "", money(e.totals.value), money(e.totals.hakedis), money(e.totals.pending), money(e.totals.approved), money(e.totals.paid), money(e.totals.cashPaid), money(e.totals.barterOffset)]}
        />
        <Table
          title="Certificados registrados"
          note="El vencimiento es la fecha prevista de pago; el egreso real ocurre en la fecha de pago."
          head={["Certificado de obra", "Empresa", "Vencimiento", "Fecha de pago", "Monto", "Estado", "Compensación por canje", "Efectivo"]}
          numeric={[4, 6, 7]}
          rows={e.rows.flatMap((r) => r.requests.map((q) => [`${q.id} · ${q.name}`, r.company, date(q.due), q.status === "Pagada" ? (q.paidAt ? date(q.paidAt) : "Sin registros") : "—", money(q.amount), q.status, q.offset ? money(q.offset) : "—", money(q.cash)]))}
          empty="Sin certificados en este rango."
        />
      </>
    );
  }
  const m = managerReport(s, f);
  return (
    <>
      <Table
        title="Resumen de la empresa y los proyectos"
        note={`Cuentas por cobrar al 15 nov 2026 · caja ${period}`}
        head={["Alcance", "Vendidas / stock", "Monto contratado", "Cobrado", "Saldo por cobrar", "Vencido", "Ingresos", "Egresos de caja", "Canje pendiente"]}
        numeric={[1, 2, 3, 4, 5, 6, 7, 8]}
        rows={m.rows.map((r) => [
          r.project === "all" ? <b key="t">{r.name}</b> : r.name,
          `${r.sales.sold} / ${r.sales.total}`,
          money(r.fin.contracted),
          <span key="c" className="rp-two">
            {money(r.fin.collected)}
            <small>{pct(r.fin.collectionRate)}</small>
          </span>,
          money(r.fin.balance),
          money(r.fin.overdue),
          money(r.fin.inflow),
          money(r.fin.outflow),
          money(r.fin.barterRemaining),
        ])}
      />
      <section className="rp-block">
        <h3>
          Alertas y pendientes<small>{m.alerts.length} konu</small>
        </h3>
        {m.alerts.length ? (
          <ul className="rp-alerts">
            {m.alerts.map((a, i) => (
              <li key={i} className={a.tone}>
                <b>{a.title}</b>
                <span>
                  {pname(a.project)} · {a.detail}
                </span>
                {a.amount !== undefined && <em className="num">{money(a.amount)}</em>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rp-empty">Sin alertas.</p>
        )}
      </section>
    </>
  );
}
