"use client";
// Resumen ejecutivo de EDIFICA: portafolio, stock, contratos, cobranza, mora, facturación y movimientos.
// Todas las cifras se calculan en vivo desde el estado de la demo (mismas funciones que informes y cobros),
// por eso cambian en cuanto se registra un contrato, un cobro o una factura.
import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, AlertTriangle, CalendarClock, ReceiptText, Wallet, Building2, FileSignature, Landmark } from "lucide-react";
import { useApp } from "../enterprise/context";
import {
  projects,
  summary,
  paymentRows,
  customerList,
  contractList,
  requestList,
  paidDate,
  activeReceipts,
  contractSignedAt,
  SNAPSHOT,
} from "@/lib/enterprise";
import { salesReport } from "@/lib/reports";
import { billingSummary, fxOf } from "@/lib/billing";
import { money, compact, date, usd, gs } from "@/lib/data";
import { unitShort } from "@/lib/units";
import { hubHref } from "@/lib/catalog";
import { COMPANY, PROFILES } from "@/lib/company";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;
const addMonth = (ym: string, n: number) => {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function EdificaHome() {
  const { state, currency, setCurrency } = useApp();
  const d = useMemo(() => {
    const all = summary(state, "all");
    const rows = paymentRows(state);
    const names = new Map(customerList(state).map((c) => [c.id, c.name]));
    const late = rows.filter((r) => r.status === "Vencida");
    const thisMonth = rows.filter((r) => r.due.startsWith(SNAPSHOT.slice(0, 7)));
    const upcoming = rows.filter((r) => r.remaining > 0 && r.days >= 0 && r.days <= 30);
    const stock = projects.map((p) => ({ p, t: salesReport(state, { project: p.id }).total, sm: summary(state, p.id) }));
    const units = stock.reduce(
      (a, x) => ({
        total: a.total + x.t.total,
        sold: a.sold + x.t.sold,
        signing: a.signing + x.t.inSigning,
        reserved: a.reserved + x.t.reserved,
        available: a.available + x.t.available,
      }),
      { total: 0, sold: 0, signing: 0, reserved: 0, available: 0 },
    );
    const billing = billingSummary(state);
    // Cobranza mensual: cobros registrados (anticipos + cuotas) y saldo programado por vencimiento
    const start = addMonth(SNAPSHOT.slice(0, 7), -5);
    const months = Array.from({ length: 11 }, (_, i) => addMonth(start, i));
    const collected = new Map<string, number>();
    const add = (dt: string, v: number) => collected.set(dt.slice(0, 7), (collected.get(dt.slice(0, 7)) ?? 0) + v);
    for (const c of state.contracts) if (c.deposit > 0) add(c.depositDate ?? contractSignedAt(state, c), c.deposit);
    for (const p of state.depositPayments) if (!p.reversal) add(p.date, p.amount);
    for (const r of activeReceipts(state)) add(r.date, r.amount);
    const due = new Map<string, number>();
    for (const r of rows) if (r.remaining > 0) due.set(r.due.slice(0, 7), (due.get(r.due.slice(0, 7)) ?? 0) + r.remaining);
    const series = months.map((m) => ({
      m,
      collected: Math.round((collected.get(m) ?? 0) * 100) / 100,
      due: m >= SNAPSHOT.slice(0, 7) ? Math.round((due.get(m) ?? 0) * 100) / 100 : 0,
      overdueBefore: m === SNAPSHOT.slice(0, 7) ? late.filter((r) => r.due.slice(0, 7) < m).reduce((a, r) => a + r.remaining, 0) : 0,
    }));
    // Últimos movimientos de caja (ingresos y egresos)
    const moves = [
      ...activeReceipts(state).map((r) => {
        const cid = r.installmentId.split("-").slice(0, 2).join("-");
        return { date: r.date, label: `Cobro de cuota · ${names.get(cid) ?? cid}`, detail: `${unitShort(cid)} · ${r.reference}`, amount: r.amount, project: cid.split("-")[0] };
      }),
      ...state.contracts
        .filter((c) => c.deposit > 0)
        .map((c) => ({ date: c.depositDate ?? contractSignedAt(state, c), label: `Anticipo · ${names.get(c.id) ?? c.name}`, detail: unitShort(c.id), amount: c.deposit, project: c.project })),
      ...requestList(state)
        .filter((r) => paidDate(state, r.id))
        .map((r) => ({ date: paidDate(state, r.id)!, label: `Pago a proveedor · ${r.company}`, detail: r.name, amount: -r.amount, project: r.project })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
    const contracts = contractList(state);
    return { all, late, thisMonth, upcoming, stock, units, billing, series, moves, names, contracts };
  }, [state]);

  const lateAmount = d.late.reduce((a, r) => a + r.remaining, 0);
  const lateCustomers = new Set(d.late.map((r) => r.customerId)).size;
  const monthDue = d.thisMonth.reduce((a, r) => a + r.amount, 0);
  const monthOpen = d.thisMonth.reduce((a, r) => a + r.remaining, 0);
  const upcomingAmount = d.upcoming.reduce((a, r) => a + r.remaining, 0);
  const fx = fxOf(state);
  const maxBar = Math.max(1, ...d.series.map((x) => Math.max(x.collected, x.due + x.overdueBefore)));
  const maxProject = Math.max(1, ...d.stock.map((x) => x.sm.revenue));

  return (
    <div className="ed-home">
      <section className="ed-hero">
        <div className="ed-hero-text">
          <span className="ed-eyebrow">
            <img src="/images/edifica/edifica-isotipo-oro.svg" alt="" /> {COMPANY.name} · Centro de Gestión
          </span>
          <h1>Resumen Ejecutivo</h1>
          <p>
            Contratos, cuotas, cobranza y facturación de los {projects.length} proyectos en una sola vista. {COMPANY.city}.
          </p>
          <div className="ed-hero-meta">
            <span className="ed-demo-chip">Datos de demostración</span>
            <span>Corte al {date(SNAPSHOT)}</span>
            <span>Montos registrados en USD</span>
          </div>
        </div>
        <div className="ed-currency" role="group" aria-label="Moneda de visualización">
          <small>Moneda de visualización</small>
          <div>
            <button className={currency === "USD" ? "on" : ""} aria-pressed={currency === "USD"} onClick={() => setCurrency("USD")}>US$</button>
            <button className={currency === "PYG" ? "on" : ""} aria-pressed={currency === "PYG"} onClick={() => setCurrency("PYG")}>₲</button>
          </div>
          <em>
            Tipo de cambio de referencia: 1 USD = ₲ {fx.rate.toLocaleString("es-PY")} ({date(fx.date)}) ·{" "}
            <Link href="/configuracion">definido en Configuración</Link>
          </em>
        </div>
      </section>

      <section className="ed-kpis" aria-label="Indicadores principales">
        <Kpi icon={<Building2 size={16} />} label="Unidades cargadas" value={String(d.units.total)}>
          <span className="ed-split">
            <i className="sold" style={{ flex: d.units.sold }} />
            <i className="signing" style={{ flex: d.units.signing }} />
            <i className="reserved" style={{ flex: d.units.reserved }} />
            <i className="free" style={{ flex: d.units.available }} />
          </span>
          <small>{d.units.sold} vendidas · {d.units.signing} en firma · {d.units.reserved} reservadas · {d.units.available} disponibles</small>
        </Kpi>
        <Kpi icon={<FileSignature size={16} />} label="Monto contratado" value={compact(d.all.revenue)}>
          <small>{d.all.sold} contratos activos · ticket medio {compact(d.all.revenue / Math.max(1, d.all.sold))}</small>
        </Kpi>
        <Kpi icon={<Wallet size={16} />} label="Cobrado" value={compact(d.all.collected)} tone="good">
          <span className="ed-bar"><i style={{ width: `${(d.all.collected / Math.max(1, d.all.revenue)) * 100}%` }} /></span>
          <small>{Math.round((d.all.collected / Math.max(1, d.all.revenue)) * 100)} % del monto contratado</small>
        </Kpi>
        <Kpi icon={<Landmark size={16} />} label="Saldo por cobrar" value={compact(d.all.balance)}>
          <small>Cuentas por cobrar de todos los contratos</small>
        </Kpi>
        <Kpi icon={<CalendarClock size={16} />} label="Vence en noviembre" value={money(monthDue)} href="/cobros">
          <small>{money(monthOpen)} pendiente de cobro este mes</small>
        </Kpi>
        <Kpi icon={<AlertTriangle size={16} />} label="Cuotas vencidas" value={money(lateAmount)} tone="bad" href="/cobros?durum=Vencida">
          <small>{d.late.length} cuotas · {lateCustomers} clientes en mora</small>
        </Kpi>
        <Kpi icon={<CalendarClock size={16} />} label="Próximos 30 días" value={money(upcomingAmount)} href="/agenda">
          <small>{d.upcoming.length} vencimientos programados</small>
        </Kpi>
        <Kpi icon={<ReceiptText size={16} />} label="Facturación por emitir" value={money(d.billing.pendingAmount)} tone={d.billing.pending.length ? "warn" : "good"} href="/facturacion">
          <small>{d.billing.pending.length} cobros sin factura · {d.billing.issued.length} facturas registradas</small>
        </Kpi>
      </section>

      <section className="ed-portfolio" aria-label="Portafolio de proyectos">
        <header className="ed-section-head">
          <div>
            <span className="ed-eyebrow">Portafolio</span>
            <h2>Proyectos inmobiliarios</h2>
          </div>
          <Link href="/proyectos" className="ed-link">Ver proyectos <ArrowUpRight size={14} /></Link>
        </header>
        <div className="ed-projects">
          {d.stock.map(({ p, t, sm }) => {
            const prof = PROFILES[p.id];
            return (
              <Link key={p.id} href={hubHref(p.id)} className="ed-project">
                <div className="ed-project-img" style={{ backgroundImage: `url(${prof?.hero ?? p.image})` }}>
                  <span>{prof?.status ?? "Activo"}</span>
                </div>
                <div className="ed-project-body">
                  <small>{prof?.kind.split(" · ")[0] ?? "Proyecto"} · {p.location.split(",")[0]}</small>
                  <h3>{p.name}</h3>
                  <div className="ed-split thin">
                    <i className="sold" style={{ flex: t.sold }} />
                    <i className="signing" style={{ flex: t.inSigning }} />
                    <i className="reserved" style={{ flex: t.reserved }} />
                    <i className="free" style={{ flex: t.available }} />
                  </div>
                  <dl>
                    <div><dt>Vendidas</dt><dd>{t.sold}/{t.total}</dd></div>
                    <div><dt>Contratado</dt><dd>{compact(sm.revenue)}</dd></div>
                    <div><dt>Cobrado</dt><dd>{compact(sm.collected)}</dd></div>
                  </dl>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="ed-grid-2">
        <div className="ed-card">
          <header>
            <div>
              <h3>Cobranza mensual</h3>
              <small>Cobros registrados en el sistema y saldo programado por mes de vencimiento</small>
            </div>
            <div className="ed-legend">
              <span><i className="c1" /> Cobrado</span>
              <span><i className="c2" /> Por cobrar</span>
              <span><i className="c3" /> Vencido</span>
            </div>
          </header>
          <div className="ed-chart" role="img" aria-label="Gráfico de cobranza mensual">
            {d.series.map((x) => (
              <div key={x.m} className={`ed-col ${x.m === SNAPSHOT.slice(0, 7) ? "now" : ""}`} title={`${monthLabel(x.m)} · cobrado ${money(x.collected)} · por cobrar ${money(x.due)}`}>
                <div className="ed-stack">
                  {x.collected > 0 && <i className="c1" style={{ height: `${(x.collected / maxBar) * 100}%` }} />}
                  {x.overdueBefore > 0 && <i className="c3" style={{ height: `${(x.overdueBefore / maxBar) * 100}%` }} />}
                  {x.due > 0 && <i className="c2" style={{ height: `${(x.due / maxBar) * 100}%` }} />}
                </div>
                <span>{monthLabel(x.m)}</span>
              </div>
            ))}
          </div>
          <p className="ed-note">
            Las ventas anteriores a la implementación figuran con su saldo de apertura; los cobros mensuales graficados son los registrados en la demo.
          </p>
        </div>
        <div className="ed-card">
          <header>
            <div>
              <h3>Ingresos por proyecto</h3>
              <small>Monto contratado y cobrado por proyecto</small>
            </div>
          </header>
          <div className="ed-hbars">
            {d.stock.map(({ p, sm }) => (
              <div key={p.id} className="ed-hbar">
                <div className="ed-hbar-head">
                  <b>{p.name}</b>
                  <span>{money(sm.collected)} / {money(sm.revenue)}</span>
                </div>
                <div className="ed-hbar-track">
                  <i className="total" style={{ width: `${(sm.revenue / maxProject) * 100}%` }} />
                  <i className="done" style={{ width: `${(sm.collected / maxProject) * 100}%` }} />
                </div>
                <small>
                  {Math.round((sm.revenue / Math.max(1, d.all.revenue)) * 100)} % de la cartera · saldo {money(sm.balance)}
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ed-grid-3">
        <div className="ed-card">
          <header>
            <div>
              <h3>Cuotas vencidas</h3>
              <small>{d.late.length} cuotas impagas al {date(SNAPSHOT)}</small>
            </div>
            <Link href="/cobros?durum=Vencida" className="ed-link">Gestionar <ArrowUpRight size={14} /></Link>
          </header>
          <ul className="ed-list">
            {d.late.slice(0, 6).map((r) => (
              <li key={r.id}>
                <div>
                  <b>{d.names.get(r.customerId) ?? r.customerId}</b>
                  <small>{unitShort(r.customerId)} · {r.label} · venció {date(r.due)} ({-r.days} días)</small>
                </div>
                <strong className="bad">{money(r.remaining)}</strong>
              </li>
            ))}
            {!d.late.length && <li className="empty">Sin cuotas vencidas.</li>}
          </ul>
        </div>
        <div className="ed-card">
          <header>
            <div>
              <h3>Próximos vencimientos</h3>
              <small>Próximos 30 días</small>
            </div>
            <Link href="/agenda" className="ed-link">Agenda <ArrowUpRight size={14} /></Link>
          </header>
          <ul className="ed-list">
            {d.upcoming.slice(0, 6).map((r) => (
              <li key={r.id}>
                <div>
                  <b>{d.names.get(r.customerId) ?? r.customerId}</b>
                  <small>{unitShort(r.customerId)} · {r.label} · {date(r.due)}</small>
                </div>
                <strong>{money(r.remaining)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="ed-card">
          <header>
            <div>
              <h3>Últimos movimientos</h3>
              <small>Ingresos y egresos de caja</small>
            </div>
            <Link href="/caja" className="ed-link">Caja <ArrowUpRight size={14} /></Link>
          </header>
          <ul className="ed-list">
            {d.moves.map((m, i) => (
              <li key={i}>
                <div>
                  <b>{m.label}</b>
                  <small>{date(m.date)} · {m.detail}</small>
                </div>
                <strong className={m.amount < 0 ? "bad" : "good"}>{m.amount < 0 ? "−" : "+"}{money(Math.abs(m.amount))}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="ed-disclaimer">
        <b>Datos de demostración.</b> Nombres de proyectos, ubicaciones, tipologías y datos publicados provienen de fuentes públicas
        (detalle en cada proyecto). Clientes, precios, contratos, cobros, facturas y movimientos son ejemplos y no son registros reales de EDIFICA.
        Los registros se guardan solo en este navegador; no hay base de datos multiusuario ni acceso seguro en esta versión.
        {currency === "PYG" && ` Vista en guaraníes calculada con el tipo de cambio de referencia definido (${usd(1)} = ${gs(1)}).`}
      </p>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  children,
  tone,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  children?: React.ReactNode;
  tone?: "good" | "bad" | "warn";
  href?: string;
}) {
  const body = (
    <>
      <span className="ed-kpi-label">
        {icon} {label}
      </span>
      <b className="ed-kpi-value">{value}</b>
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={`ed-kpi ${tone ?? ""}`}>
      {body}
    </Link>
  ) : (
    <div className={`ed-kpi ${tone ?? ""}`}>{body}</div>
  );
}
