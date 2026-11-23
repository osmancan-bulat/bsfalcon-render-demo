"use client";
// Cuentas por cobrar: antigüedad de la mora, saldo por cliente y acceso al estado de cuenta imprimible.
// Usa las mismas reglas que Cobros, Contratos e Informes (installmentReport / accountOf).
import Link from "next/link";
import { useMemo, useState } from "react";
import { Printer, ArrowUpRight } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Panel, SearchBox, Badge } from "../enterprise/shared";
import { contractList, projects, SNAPSHOT } from "@/lib/enterprise";
import { installmentReport } from "@/lib/reports";
import { money, date } from "@/lib/data";

export default function ReceivablesView() {
  const { state, project } = useApp();
  const [q, setQ] = useState("");
  const [onlyLate, setOnlyLate] = useState(false);
  const rep = useMemo(() => installmentReport(state, { project }), [state, project]);
  const accounts = useMemo(
    () =>
      contractList(state)
        .filter((c) => c.account && (project === "all" || c.project === project) && c.account.balance > 0)
        .map((c) => ({ ...c, a: c.account! }))
        .sort((x, y) => y.a.overdue - x.a.overdue || y.a.balance - x.a.balance),
    [state, project],
  );
  const shown = accounts.filter(
    (c) => (!onlyLate || c.a.overdue > 0) && (!q || `${c.name} ${c.number} ${c.unitLabel}`.toLocaleLowerCase("es").includes(q.toLocaleLowerCase("es"))),
  );
  const total = accounts.reduce((a, c) => a + c.a.balance, 0);
  const maxAging = Math.max(1, ...rep.aging.map((b) => b.amount));
  return (
    <div className="ed-receivables">
      <div className="ed-kpis four">
        <div className="ed-kpi">
          <span className="ed-kpi-label">Saldo total por cobrar</span>
          <b className="ed-kpi-value">{money(total)}</b>
          <small>{accounts.length} contratos con saldo</small>
        </div>
        <div className="ed-kpi bad">
          <span className="ed-kpi-label">Vencido</span>
          <b className="ed-kpi-value">{money(rep.overdueTotal)}</b>
          <small>{rep.overdueCount} cuotas · {rep.perCustomer.length} clientes</small>
        </div>
        <div className="ed-kpi">
          <span className="ed-kpi-label">A vencer · 90 días</span>
          <b className="ed-kpi-value">{money(rep.upcomingTotal)}</b>
          <small>{rep.upcomingCount} vencimientos</small>
        </div>
        <div className="ed-kpi good">
          <span className="ed-kpi-label">Al día</span>
          <b className="ed-kpi-value">{accounts.filter((c) => c.a.overdue === 0).length}</b>
          <small>contratos sin cuotas vencidas</small>
        </div>
      </div>
      <div className="ed-grid-2">
        <div className="ed-card">
          <header>
            <div>
              <h3>Antigüedad de la mora</h3>
              <small>Saldo vencido por días de atraso al {date(SNAPSHOT)}</small>
            </div>
          </header>
          <div className="ed-aging">
            {rep.aging.map((b) => (
              <div key={b.key}>
                <span>{b.label}</span>
                <div className="ed-hbar-track"><i className="late" style={{ width: `${(b.amount / maxAging) * 100}%` }} /></div>
                <b>{money(b.amount)}</b>
                <small>{b.count} cuotas · {b.customers} clientes</small>
              </div>
            ))}
          </div>
        </div>
        <div className="ed-card">
          <header>
            <div>
              <h3>Vencimientos por mes</h3>
              <small>Próximos 90 días</small>
            </div>
          </header>
          <ul className="ed-list">
            {rep.byMonth.map((m) => (
              <li key={m.month}>
                <div>
                  <b>{new Date(m.month + "-15T12:00:00").toLocaleDateString("es-PY", { month: "long", year: "numeric" })}</b>
                  <small>{m.count} vencimientos{m.partial ? ` · ${m.partial} con pago parcial` : ""}</small>
                </div>
                <strong>{money(m.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Panel
        title="Saldos por cliente"
        subtitle="Cuenta corriente de cada contrato · estado de cuenta imprimible"
        action={<SearchBox value={q} onChange={setQ} placeholder="Cliente, contrato o unidad" />}
      >
        <label className="ed-check">
          <input type="checkbox" checked={onlyLate} onChange={(e) => setOnlyLate(e.target.checked)} /> Solo clientes con cuotas vencidas
        </label>
        <div className="table-wrap">
          <table className="ed-table">
            <thead>
              <tr>
                <th>Cliente · contrato</th>
                <th>Proyecto · unidad</th>
                <th className="numeric">Precio</th>
                <th className="numeric">Cobrado</th>
                <th className="numeric">Saldo</th>
                <th className="numeric">Vencido</th>
                <th>Próximo vencimiento</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                    <small>{c.number}</small>
                  </td>
                  <td>
                    {projects.find((p) => p.id === c.project)?.name}
                    <small>{c.unitLabel}</small>
                  </td>
                  <td className="numeric">{money(c.price)}</td>
                  <td className="numeric">{money(c.a.collected)}</td>
                  <td className="numeric"><b>{money(c.a.balance)}</b></td>
                  <td className="numeric">
                    {c.a.overdue > 0 ? <Badge tone="red">{money(c.a.overdue)}</Badge> : <small>—</small>}
                  </td>
                  <td>{c.a.next ? <>{date(c.a.next.due)}<small>{money(c.a.next.remaining)}</small></> : <small>—</small>}</td>
                  <td className="ed-row-actions">
                    <Link className="btn small" href={`/belge/?tur=ekstre&id=${c.id}`} title="Estado de cuenta">
                      <Printer size={14} /> Estado de cuenta
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ed-note">
          ¿Cobrar una cuota? Abra <Link href="/cobros">Cobros mensuales <ArrowUpRight size={12} /></Link> o la ficha del cliente.
        </p>
      </Panel>
    </div>
  );
}
