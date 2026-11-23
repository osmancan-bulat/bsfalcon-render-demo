"use client";
import { useState } from "react";
import {
  Download,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useApp } from "./context";
import {
  SectionTitle,
  Kpi,
  Panel,
  Status,
  SearchBox,
  Badge,
  Empty,
} from "./shared";
import { CashChart } from "./charts";
import RequestPanel from "./request-panel";
import {
  summary,
  requestList,
  requestStatus,
  netPayable,
  installmentList,
  customerList,
  pname,
  paidDate,
} from "@/lib/enterprise";
import { money, compact, date } from "@/lib/data";
import { csvDownload } from "@/lib/export";
export default function Finance() {
  const { state, project } = useApp();
  const [tab, setTab] = useState("Plan de pagos"),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const s = summary(state, project);
  const requests = requestList(state).filter(
    (r) =>
      (project === "all" || r.project === project) &&
      ["Aprobado", "Pagada", "Compensado"].includes(
        requestStatus(state, r),
      ),
  );
  const ins = installmentList(state),
    cs = customerList(state);
  const ledger = [
    ...state.receipts
      .filter((r) =>
        ins.some(
          (i) =>
            i.id === r.installmentId &&
            (project === "all" || i.project === project),
        ),
      )
      .map((r) => {
        const i = ins.find((i) => i.id === r.installmentId)!;
        return {
          id: r.id,
          description: cs.find((c) => c.id === i.customerId)?.name ?? "",
          project: i.project,
          date: r.date,
          amount: r.amount,
          type: "Cobro",
          reference: r.reference,
        };
      }),
    // İptal edilen tahsilatlar kasadan iptal tarihinde ters kayıt olarak düşer (asıl kayıt silinmez).
    ...state.receipts
      .filter((r) => r.reversal && ins.some((i) => i.id === r.installmentId && (project === "all" || i.project === project)))
      .map((r) => {
        const i = ins.find((i) => i.id === r.installmentId)!;
        return {
          id: `${r.id}-ANU`,
          description: cs.find((c) => c.id === i.customerId)?.name ?? "",
          project: i.project,
          date: r.reversal!.date,
          amount: -r.amount,
          type: "Anulación de cobro",
          reference: r.reversal!.reason,
        };
      }),
    ...requests
      .filter((r) => requestStatus(state, r) === "Pagada")
      .map((r) => ({
        id: r.id,
        description: r.company,
        project: r.project,
        // Gerçek ödeme tarihi; kaydı yoksa boş (vade tarihi ödeme tarihi gibi gösterilmez)
        date: paidDate(state, r.id) ?? "",
        amount: -netPayable(state, r),
        type: "Pago",
        reference: `${r.name} · vence ${date(r.due)}`,
      })),
    ...state.depositPayments
      .filter((p) =>
        cs.some(
          (c) =>
            c.id === p.customerId &&
            (project === "all" || c.project === project),
        ),
      )
      .map((p) => ({
        id: p.id,
        description: cs.find((c) => c.id === p.customerId)!.name,
        project: cs.find((c) => c.id === p.customerId)!.project,
        date: p.date,
        amount: p.amount,
        type: "Anticipo",
        reference: "Cobro de anticipo",
      })),
    ...state.depositPayments
      .filter((p) => p.reversal && cs.some((c) => c.id === p.customerId && (project === "all" || c.project === project)))
      .map((p) => ({
        id: `${p.id}-ANU`,
        description: cs.find((c) => c.id === p.customerId)!.name,
        project: cs.find((c) => c.id === p.customerId)!.project,
        date: p.reversal!.date,
        amount: -p.amount,
        type: "Anulación de anticipo",
        reference: p.reversal!.reason,
      })),
    ...state.contracts
      .filter((c) => project === "all" || c.project === project)
      .map((c) => ({
        id: `PES-${c.id}`,
        description: c.name,
        project: c.project,
        date: c.depositDate ?? "2026-11-15",
        amount:
          c.deposit -
          state.depositPayments
            .filter((p) => p.customerId === c.id && !p.reversal)
            .reduce((a, p) => a + p.amount, 0),
        type: "Anticipo",
        reference: "Anticipo de venta nueva",
      })),
  ]
    .filter((r) => r.amount !== 0)
    .sort((a, b) => (b.date || "0").localeCompare(a.date || "0"));
  const rows = requests
    .filter((r) =>
      (r.company + r.name + r.id)
        .toLocaleLowerCase("es")
        .includes(q.toLocaleLowerCase("es")),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <>
      <SectionTitle
        title="Caja y movimientos"
        description="Cobros, pagos aprobados y movimientos de caja vinculados."
        actions={
          <button
            className="btn"
            onClick={() =>
              csvDownload(
                [
                  [
                    "Código",
                    "Descripción",
                    "Proyecto",
                    "Tipo",
                    "Monto",
                    "Fecha",
                    "Referans",
                  ],
                  ...ledger.map((l) => [
                    l.id,
                    l.description,
                    pname(l.project),
                    l.type,
                    l.amount,
                    l.date,
                    l.reference,
                  ]),
                ],
                "edifica-movimientos-de-caja.csv",
              )
            }
          >
            <Download size={16} /> Descargar movimientos
          </button>
        }
      />
      <div className="e-kpis">
        <Kpi
          label="Caja disponible (demo)"
          value={compact(s.cash)}
          sub={`${compact(s.opening)} saldo de apertura del mes (ejemplo)`}
          icon={<Wallet size={19} />}
          tag="TRY"
        />
        <Kpi
          label="Cobros de noviembre"
          value={compact(s.received)}
          sub="Cobros de cuotas registrados este mes"
          icon={<ArrowDownLeft size={19} />}
          progress={(s.received / s.planned) * 100}
        />
        <Kpi
          label="Pendiente de pago"
          value={compact(s.payable)}
          sub="Pagos aprobados por gerencia"
          icon={<Clock size={19} />}
          tone="amber"
        />
        <Kpi
          label="Pagos realizados"
          value={compact(s.paid)}
          sub="Monto descontado de la caja"
          icon={<ArrowUpRight size={19} />}
        />
      </div>
      <div className="e-grid finance-grid">
        <Panel
          title="Cobranza programada / realizada"
          subtitle="Noviembre 2026 · distribución semanal"
        >
          <CashChart state={state} project={project} />
        </Panel>
        <Panel
          title="Control presupuestario (ejemplo)"
          subtitle="Presupuesto y costos son supuestos de la demo; no se calculan desde los registros"
        >
          <div className="budget-overview">
            <div>
              <span>Presupuesto total de proyectos</span>
              <b>{compact(s.budget)}</b>
            </div>
            <div>
              <span>Costo supuesto</span>
              <b>{compact(s.cost)}</b>
            </div>
            <div className="budget-meter">
              <i style={{ width: `${(s.cost / s.budget) * 100}%` }} />
            </div>
            <div>
              <small>Uso del presupuesto</small>
              <strong>%{Math.round((s.cost / s.budget) * 100)}</strong>
            </div>
            <div className="budget-remaining">
              <span>Presupuesto restante</span>
              <b>{compact(s.budget - s.cost)}</b>
            </div>
            <p>
              Este panel muestra un presupuesto de ejemplo. Para certificados,
              pagos y cobros registrados use Informes Financieros; un pago
              solo genera un movimiento de caja y no vuelve a sumar costo.
            </p>
          </div>
        </Panel>
      </div>
      <Panel>
        <div className="e-tabs">
          {["Plan de pagos", "Movimientos de caja"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Buscar empresa, cliente u operación…"
          />
          <Badge tone="neutral">
            {tab === "Plan de pagos"
              ? "Solo operaciones aprobadas"
              : "Todos los movimientos · del más reciente al más antiguo"}
          </Badge>
        </div>
        <div className="e-table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  {tab === "Plan de pagos" ? "Empresa / operación" : "Operación / persona"}
                </th>
                <th>Proyecto</th>
                <th>Fecha</th>
                <th className="numeric">Monto</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tab === "Plan de pagos"
                ? rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.company}</b>
                        <small>
                          {r.name} · {r.id}
                        </small>
                      </td>
                      <td>{pname(r.project)}</td>
                      <td>{date(r.due)}</td>
                      <td className="numeric">
                        {money(netPayable(state, r))}
                        {netPayable(state, r) !== r.amount && (
                          <small>Bruto {money(r.amount)} · compensación por canje</small>
                        )}
                      </td>
                      <td>
                        <Status status={requestStatus(state, r)} />
                      </td>
                      <td>
                        <button
                          className="btn compact"
                          onClick={() => setSelected(r.id)}
                        >
                          {requestStatus(state, r) === "Pagada"
                            ? "Ver registro"
                            : "Pago"}{" "}
                          <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                : ledger
                    .filter((l) =>
                      (l.description + l.reference + l.id)
                        .toLocaleLowerCase("es")
                        .includes(q.toLocaleLowerCase("es")),
                    )
                    .map((l) => (
                      <tr key={l.id}>
                        <td>
                          <b>{l.description}</b>
                          <small>
                            {l.id} · {l.reference}
                          </small>
                        </td>
                        <td>{pname(l.project)}</td>
                        <td>{l.date ? date(l.date) : "Sin fecha registrada"}</td>
                        <td
                          className={l.amount > 0 ? "green-text" : "red-text"}
                        >
                          {l.amount > 0 ? "+" : ""}
                          {money(l.amount)}
                        </td>
                        <td>
                          <Badge tone={l.amount > 0 ? "green" : "neutral"}>
                            {l.type}
                          </Badge>
                        </td>
                        <td />
                      </tr>
                    ))}
            </tbody>
          </table>
          {tab === "Plan de pagos" && !rows.length && (
            <Empty
              title="No hay pagos aprobados"
              detail="Los certificados y compras aprobados aparecen aquí."
            />
          )}
        </div>
        <div className="e-table-note">
          Saldo de caja = saldo de apertura del mes + cobros del mes y anticipos
          nuevos − pagos registrados.
        </div>
      </Panel>
      {selected && (
        <RequestPanel
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
