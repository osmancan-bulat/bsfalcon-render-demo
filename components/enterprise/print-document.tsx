"use client";
// Yazdırılabilir belgeler: sözleşme özeti, ödeme planı, cari ekstre, tahsilat makbuzu ve proje yönetici raporu.
// Tüm belgeler tarayıcıdaki demo verisinden üretilir ve "temsili" filigranı taşır.
import { useEffect, useState, type ReactNode } from "react";
import { Printer } from "lucide-react";
import { useApp } from "./context";
import {
  SNAPSHOT,
  projects,
  pname,
  summary,
  customerList,
  contractList,
  customerLedger,
  accountOf,
  depositSchedule,
  installmentList,
  outstanding,
  contractNumber,
  workContracts,
  offsetFor,
  requestStatus,
} from "@/lib/enterprise";
import { money, date } from "@/lib/data";
import { unitById, unitPlace, unitShort } from "@/lib/units";
import ReportBody from "./report-body";
import { REPORT_TITLES, periodLabel, type ReportKind } from "@/lib/reports";

type Params = {
  tur: string;
  id: string;
  project: string;
  rapor: string;
  from?: string;
  to?: string;
};

export default function PrintDocument() {
  const { state, ready } = useApp();
  const [p, setP] = useState<Params | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setP({
      tur: q.get("tur") ?? "",
      id: q.get("id") ?? "",
      project: q.get("project") ?? "alion",
      rapor: q.get("rapor") ?? "yonetici",
      from: q.get("from") ?? undefined,
      to: q.get("to") ?? undefined,
    });
  }, []);
  if (!ready || !p)
    return <div className="doc-loading">Preparando documento…</div>;

  let body: ReactNode = null;
  let title = "Documento";
  if (p.tur === "sozlesme" || p.tur === "plan" || p.tur === "ekstre") {
    const contract = contractList(state).find((c) => c.id === p.id);
    const c = [
      ...customerList(state),
      ...state.drafts,
      ...state.cancelled,
    ].find((c) => c.id === p.id);
    if (contract && c) {
      const acc = contract.account ?? accountOf(state, c, []);
      const parts = depositSchedule(c, contract.signedAt);
      const rows = contract.account ? acc.rows : [];
      if (p.tur === "sozlesme") {
        title = "Resumen del contrato de compraventa";
        body = (
          <>
            <DocMeta
              items={[
                ["N.º de contrato", contract.number],
                ["Estado", contract.status],
                [
                  "Fecha de firma",
                  contract.signedAt ? date(contract.signedAt) : "Pendiente de firma",
                ],
                ["Proyecto", pname(c.project)],
              ]}
            />
            <h3>Taraflar</h3>
            <table className="doc-kv">
              <tbody>
                <tr>
                  <th>Vendedor</th>
                  <td>EDIFICA Desarrollos Inmobiliarios (registro de demostración)</td>
                </tr>
                <tr>
                  <th>Comprador</th>
                  <td>{c.name} (cliente ficticio)</td>
                </tr>
              </tbody>
            </table>
            <h3>Unidades</h3>
            <table className="doc-kv">
              <tbody>
                <tr>
                  <th>Unidad</th>
                  <td>
                    {pname(c.project)} · {unitPlace(c.id)} (código {c.unit}) ·{" "}
                    {contract.type} · {contract.facade} orientación
                  </td>
                </tr>
                <tr>
                  <th>Alan</th>
                  <td>Bruto {contract.gross} m²</td>
                </tr>
                <tr>
                  <th>Precio de venta</th>
                  <td>
                    <b>{money(c.price)}</b>
                    {contract.listPrice
                      ? `(precio de lista ${money(contract.listPrice)}, descuento ${money(contract.discount)})`
                      : ""}
                  </td>
                </tr>
              </tbody>
            </table>
            <h3>Condiciones de pago</h3>
            <table className="doc-kv">
              <tbody>
                <tr>
                  <th>Plan</th>
                  <td>{contract.planLabel}</td>
                </tr>
                <tr>
                  <th>Anticipo</th>
                  <td>
                    {parts.map((d, n) => (
                      <div key={n}>
                        {money(d.amount)} · vence {date(d.due)}
                        {d.remaining === 0 ? "· cobrado" : ""}
                      </div>
                    ))}
                  </td>
                </tr>
                {contract.account && (
                  <tr>
                    <th>Saldo ({date(SNAPSHOT)})</th>
                    <td>
                      Cobrado {money(acc.collected)} · saldo{" "}
                      {money(acc.balance)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="doc-small">
              El calendario detallado figura en el plan de pagos adjunto. Este resumen no es el texto legal del contrato.
            </p>
            <div className="doc-signatures">
              <div>
                <span>Por el vendedor</span>
                <i />
              </div>
              <div>
                <span>Comprador</span>
                <i />
              </div>
            </div>
          </>
        );
      } else if (p.tur === "plan") {
        title = "Plan de pagos";
        body = (
          <>
            <DocMeta
              items={[
                ["N.º de contrato", contract.number],
                ["Cliente", c.name],
                ["Unidad", `${pname(c.project)} · ${unitShort(c.id)}`],
                ["Precio", money(c.price)],
              ]}
            />
            <table className="doc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pago</th>
                  <th>Vencimiento</th>
                  <th className="r">Monto</th>
                  <th className="r">Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((d, n) => (
                  <tr key={`d${n}`}>
                    <td>P{n + 1}</td>
                    <td>
                      {parts.length > 1 ? `Anticipo ${n + 1}` : "Anticipo"}
                    </td>
                    <td>{date(d.due)}</td>
                    <td className="r">{money(d.amount)}</td>
                    <td className="r">{money(d.remaining)}</td>
                    <td>
                      {d.remaining === 0
                        ? "Pagada"
                        : d.paid > 0
                          ? "Parcial"
                          : "Pendiente"}
                    </td>
                  </tr>
                ))}
                {Array.from({ length: c.paidMonths }, (_, k) => (
                  <tr key={`h${k}`}>
                    <td>{k + 1}</td>
                    <td>{k + 1}· cuota</td>
                    <td>—</td>
                    <td className="r">{money(c.installment)}</td>
                    <td className="r">{money(0)}</td>
                    <td>Pagada</td>
                  </tr>
                ))}
                {rows.map((i, n) => {
                  const left = outstanding(state, i);
                  return (
                    <tr key={i.id}>
                      <td>
                        {i.kind === "Pago intermedio" ? "A" : i.id.split("-").pop()}
                      </td>
                      <td>{i.label ?? `Cuota ${n + c.paidMonths + 1}`}</td>
                      <td>{date(i.due)}</td>
                      <td className="r">{money(i.amount)}</td>
                      <td className="r">{money(left)}</td>
                      <td>
                        {left === 0
                          ? "Pagada"
                          : left < i.amount
                            ? "Parcial"
                            : i.due < SNAPSHOT
                              ? "Vencida"
                              : "Planificado"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td className="r">{money(c.price)}</td>
                  <td className="r">
                    {contract.account ? money(acc.balance) : money(c.price)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </>
        );
      } else {
        title = "Estado de cuenta del cliente";
        const ledger = customerLedger(state, c.id);
        body = (
          <>
            <DocMeta
              items={[
                ["N.º de contrato", contract.number],
                ["Cliente", c.name],
                ["Unidad", `${pname(c.project)} · ${unitShort(c.id)}`],
                ["Fecha del estado de cuenta", date(SNAPSHOT)],
              ]}
            />
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Documento</th>
                  <th className="r">Cargo</th>
                  <th className="r">Abono</th>
                  <th className="r">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e, n) => (
                  <tr key={n}>
                    <td>{date(e.date)}</td>
                    <td>{e.label}</td>
                    <td>{e.ref}</td>
                    <td className="r">{e.debit ? money(e.debit) : ""}</td>
                    <td className="r">{e.credit ? money(e.credit) : ""}</td>
                    <td className="r">{money(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>Saldo pendiente</td>
                  <td className="r">{money(ledger.at(-1)?.balance ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        );
      }
    }
  } else if (p.tur === "makbuz") {
    const r = state.receipts.find((r) => r.id === p.id);
    const i = r && installmentList(state).find((i) => i.id === r.installmentId);
    const c = i && customerList(state).find((c) => c.id === i.customerId);
    if (r && i && c) {
      title = r.reversal ? "Recibo de cobro · ANULADO" : "Recibo de cobro";
      const acc = accountOf(state, c);
      body = (
        <>
          {r.reversal && (
            <p className="doc-void">
              Este cobro fue anulado el {date(r.reversal.date)} · Motivo: {r.reversal.reason}. El monto se volvió a sumar al saldo del cliente.
            </p>
          )}
          <DocMeta
            items={[
              ["N.º de recibo", r.id],
              ["Fecha", date(r.date)],
              ["N.º de contrato", contractNumber(c.id)],
              ["Proyecto", pname(c.project)],
            ]}
          />
          <div className="doc-amount">
            <span>Monto cobrado</span>
            <b>{money(r.amount)}</b>
          </div>
          <table className="doc-kv">
            <tbody>
              <tr>
                <th>Pagador</th>
                <td>{c.name} (cliente ficticio)</td>
              </tr>
              <tr>
                <th>Unidad</th>
                <td>
                  {pname(c.project)} · {unitPlace(c.id)}
                </td>
              </tr>
              <tr>
                <th>Pago</th>
                <td>
                  {i.label ?? `Cuota ${i.id.split("-").pop()}`} · vence{" "}
                  {date(i.due)} · monto {money(i.amount)}
                </td>
              </tr>
              <tr>
                <th>Medio / comprobante</th>
                <td>
                  {r.method} · {r.reference}
                </td>
              </tr>
              <tr>
                <th>Saldo actual</th>
                <td>{money(acc.balance)}</td>
              </tr>
            </tbody>
          </table>
          <div className="doc-signatures single">
            <div>
              <span>Cobrado por</span>
              <i />
            </div>
          </div>
        </>
      );
    }
  } else if (p.tur === "barter") {
    const b = state.barters.find((b) => b.id === p.id);
    if (b) {
      title = "Resumen del canje (unidad por obra)";
      const u = unitById(b.unitId);
      const offsets = (state.offsets ?? []).filter((o) => o.barterId === b.id);
      const used = offsets.reduce((a, o) => a + o.amount, 0);
      body = (
        <>
          <DocMeta
            items={[
              ["N.º de contrato", b.id],
              ["Proyecto", pname(b.project)],
              ["Unidad", u?.label ?? b.unitId],
              ["Fecha del documento", date(SNAPSHOT)],
            ]}
          />
          <h3>Taraflar</h3>
          <table className="doc-kv">
            <tbody>
              <tr>
                <th>Daireyi veren</th>
                <td>EDIFICA Desarrollos Inmobiliarios (registro de demostración)</td>
              </tr>
              <tr>
                <th>Empresa ejecutora</th>
                <td>{b.company} (empresa ficticia)</td>
              </tr>
            </tbody>
          </table>
          <h3>Prestaciones</h3>
          <table className="doc-kv">
            <tbody>
              <tr>
                <th>Unidad entregada</th>
                <td>
                  {pname(b.project)} · {unitPlace(b.unitId)} · {u?.type} ·{" "}
                  {u?.gross} m² · {u?.facade} orientación
                </td>
              </tr>
              <tr>
                <th>Trabajo a realizar</th>
                <td>{b.work}</td>
              </tr>
              <tr>
                <th>Valor del acuerdo</th>
                <td>
                  <b>{money(b.amount)}</b> (precio de lista de la unidad{" "}
                  {money(u?.listPrice ?? 0)})
                </td>
              </tr>
              <tr>
                <th>Plazo</th>
                <td>
                  {date(b.start)} – {date(b.end)} · tamamlanma %{b.progress}
                </td>
              </tr>
              <tr>
                <th>Transferencia de la unidad</th>
                <td>{b.transfer}</td>
              </tr>
            </tbody>
          </table>
          <h3>Compensaciones</h3>
          <SimpleTable
            head={["Fecha", "Certificado de obra", "Compensación"]}
            rows={offsets.map((o) => [
              date(o.date),
              o.requestId,
              money(o.amount),
            ])}
            empty="Aún no hay compensaciones."
          />
          <div className="doc-amount">
            <span>Obligación pendiente (sin efectivo)</span>
            <b>{money(b.amount - used)}</b>
          </div>
          <p className="doc-small">
            Un canje no genera ingreso de venta, cobro ni entrada de caja; se compensa
            con los certificados de la empresa. Este resumen no es un texto
            legal.
          </p>
          <div className="doc-signatures">
            <div>
              <span>Por EDIFICA</span>
              <i />
            </div>
            <div>
              <span>{b.company} por</span>
              <i />
            </div>
          </div>
        </>
      );
    }
  } else if (p.tur === "is") {
    const wc = workContracts(state).find((w) => w.id === p.id);
    if (wc) {
      title = "Resumen del contrato de obra";
      body = (
        <>
          <DocMeta
            items={[
              ["N.º de contrato", wc.id],
              ["Proyecto", pname(wc.project)],
              ["Empresa", wc.company],
              ["Fecha del documento", date(SNAPSHOT)],
              ["Precio del contrato", money(wc.value)],
            ]}
          />
          <h3>Taraflar</h3>
          <table className="doc-kv">
            <tbody>
              <tr>
                <th>Comitente</th>
                <td>EDIFICA Desarrollos Inmobiliarios (registro de demostración)</td>
              </tr>
              <tr>
                <th>Contratista</th>
                <td>{wc.company} (empresa ficticia)</td>
              </tr>
            </tbody>
          </table>
          <h3>Alcance</h3>
          <SimpleTable
            head={["Paquete de obra", "Precio", "Avance", "Materiales / estado"]}
            rows={wc.packages.map((w) => [
              w.name,
              money(w.value),
              `%${w.progress}`,
              w.material,
            ])}
            empty="Sin paquetes de obra."
          />
          <h3>Certificados</h3>
          <SimpleTable
            head={["Certificado de obra", "Vencimiento", "Monto", "Compensación por canje", "Estado"]}
            rows={wc.requests.map((r) => [
              `${r.id} · ${r.name}`,
              date(r.due),
              money(r.amount),
              money(offsetFor(state, r.id)),
              requestStatus(state, r),
            ])}
            empty="Este contrato aún no tiene certificados."
          />
          <div className="doc-kpis">
            {(
              [
                ["Precio del contrato", money(wc.value)],
                ["Total certificado", money(wc.hakedisTotal)],
                ["Pagado", money(wc.paid)],
                ["Compensación por canje", money(wc.offset)],
                ["Canje vinculado", wc.barterId ?? "—"],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <p className="doc-small">
            Alcance y certificados generados desde los registros del sistema. Este resumen no es un texto legal.
          </p>
          <div className="doc-signatures">
            <div>
              <span>Por EDIFICA</span>
              <i />
            </div>
            <div>
              <span>{wc.company} por</span>
              <i />
            </div>
          </div>
        </>
      );
    }
  } else if (p.tur === "rapor" || p.tur === "yonetici") {
    const kind = (p.tur === "yonetici" ? "yonetici" : p.rapor) as ReportKind;
    if (REPORT_TITLES[kind] && (p.project === "all" || projects.some((x) => x.id === p.project))) {
      const f = { project: p.project, from: p.from, to: p.to };
      title = REPORT_TITLES[kind];
      body = (
        <>
          <DocMeta
            items={[
              ["Kapsam", p.project === "all" ? "EDIFICA · toda la empresa" : pname(p.project)],
              ["Período", periodLabel(f)],
              ["Fecha del informe", date(SNAPSHOT)],
              ["Kaynak", "Registros de demostración del navegador"],
            ]}
          />
          <div className="doc-report">
            <ReportBody s={state} kind={kind} f={f} />
          </div>
          <p className="doc-small">
            Los indicadores de estado corresponden a la fecha de corte del 15 de noviembre de 2026. El filtro de período se aplica a la fecha real de cobro o pago para la caja, a la fecha de firma para las ventas y al vencimiento para cuotas y certificados. Un vencimiento no implica que el pago se haya realizado.
          </p>
        </>
      );
    }
  } else if (p.tur === "proyecto") {
    const pr = projects.find((x) => x.id === p.project);
    if (pr) {
      title = `Informe gerencial · ${pr.name}`;
      const s = summary(state, pr.id);
      const contracts = contractList(state).filter((c) => c.project === pr.id);
      const late = contracts.filter((c) => (c.account?.overdue ?? 0) > 0);
      const deposits = contracts.filter(
        (c) => (c.account?.depositRemaining ?? 0) > 0,
      );
      const drafts = contracts.filter(
        (c) => c.status === "Borrador" || c.status === "Pendiente de firma",
      );
      const barters = state.barters.filter((b) => b.project === pr.id);
      body = (
        <>
          <DocMeta
            items={[
              ["Fecha del informe", date(SNAPSHOT)],
              ["Konum", pr.location],
              ["Entrega prevista", pr.delivery || "No publicada"],
              ["Avance de obra", `%${s.progress}`],
            ]}
          />
          <div className="doc-kpis">
            {(
              [
                ["Vendidas", `${s.sold} / ${s.total}`],
                ["Valor contratado", money(s.revenue)],
                ["Cobrado", money(s.collected)],
                ["Saldo por cobrar", money(s.balance)],
                ["Vencida", money(s.overdueTotal)],
                ["Anticipo pendiente", money(s.depositPending)],
                ["Canje", `${s.barterCount} unidades · ${money(s.barterValue)}`],
                ["Caja del proyecto", money(s.cash)],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <h3>Pagos vencidos</h3>
          <SimpleTable
            head={["Contrato", "Cliente", "Unidad", "Vencimiento más antiguo", "Vencida"]}
            rows={late.map((c) => [
              c.number,
              c.name,
              c.unitLabel,
              date(c.account!.oldestOverdue!),
              money(c.account!.overdue),
            ])}
            empty="Sin pagos vencidos."
          />
          <h3>Anticipos pendientes</h3>
          <SimpleTable
            head={["Contrato", "Cliente", "Unidad", "Pactado", "Saldo"]}
            rows={deposits.map((c) => [
              c.number,
              c.name,
              c.unitLabel,
              money(c.account!.depositExpected),
              money(c.account!.depositRemaining),
            ])}
            empty="Sin anticipos pendientes."
          />
          <h3>Contratos en proceso de firma</h3>
          <SimpleTable
            head={["Contrato", "Cliente", "Unidad", "Precio", "Estado"]}
            rows={drafts.map((c) => [
              c.number,
              c.name,
              c.unitLabel,
              money(c.price),
              c.status,
            ])}
            empty="Sin borradores."
          />
          <h3>Unidades en canje</h3>
          <SimpleTable
            head={["Unidad", "Empresa", "Trabajo", "Precio", "Cesión"]}
            rows={barters.map((b) => [
              unitShort(b.unitId),
              b.company,
              b.work,
              money(b.amount),
              b.transfer,
            ])}
            empty="Sin canjes."
          />
        </>
      );
    }
  }

  return (
    <div className="doc-shell">
      <div className="doc-toolbar">
        <span>Vista previa · generada con los datos de demostración del navegador</span>
        <button className="btn primary" onClick={() => window.print()}>
          <Printer size={15} /> Imprimir / guardar PDF
        </button>
      </div>
      <article className="doc-page">
        <div className="doc-stamp" aria-label="Documento de demostración">
          DOCUMENTO DE DEMOSTRACIÓN · SIN VALIDEZ LEGAL NI FISCAL
        </div>
        <header className="doc-header">
          <div className="doc-brand"><img src="/images/edifica/edifica-isotipo-oro.svg" alt="" /><span><b>EDIFICA</b><i>DESARROLLOS INMOBILIARIOS</i></span></div>
          <div>
            <span>Centro de Gestión</span>
            <h1>{title}</h1>
          </div>
        </header>
        {body ?? (
          <p className="doc-small">
            Documento no encontrado. Vuelva a abrir el enlace desde la aplicación.
          </p>
        )}
        <footer className="doc-footer">
          DOCUMENTO DE DEMOSTRACIÓN · Personas, empresas y montos son ficticios · Sin validez legal ni fiscal · No es una factura · {date(SNAPSHOT)}
        </footer>
      </article>
    </div>
  );
}

function DocMeta({ items }: { items: [string, string][] }) {
  return (
    <dl className="doc-meta">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SimpleTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: string[][];
  empty: string;
}) {
  if (!rows.length) return <p className="doc-small">{empty}</p>;
  return (
    <table className="doc-table">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, n) => (
          <tr key={n}>
            {r.map((v, k) => (
              <td key={k}>{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
