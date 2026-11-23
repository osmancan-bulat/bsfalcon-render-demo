"use client";
// Sade ana bölümler: Müşteriler, Ödemeler, Sözleşmeler. Mevcut bileşen ve hesapları kullanır; yeni iş mantığı içermez.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Printer } from "lucide-react";
import { BarterDrawer } from "../enterprise/barter";
import { units, unitShort } from "@/lib/units";
import { useApp } from "../enterprise/context";
import { Panel, SearchBox, Badge, Empty, Progress } from "../enterprise/shared";
import CustomerPanel from "../enterprise/customer-panel";
import PaymentsTab from "../enterprise/payments-tab";
import ContractsTab from "../enterprise/contracts-tab";
import {
  workContracts,
  barterOffset,
  collectionBreakdown,
  contractList,
  paymentRows,
  pname,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from "@/lib/enterprise";
import { money, date } from "@/lib/data";

export function PageHead({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </header>
  );
}

export function PaymentsPage() {
  const { state, project } = useApp();
  const cb = collectionBreakdown(state, project);
  const [status, setStatus] = useState<PaymentStatus | undefined>();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const d = new URLSearchParams(location.search).get("durum");
    if (d && (PAYMENT_STATUSES as readonly string[]).includes(d))
      setStatus(d as PaymentStatus);
    setReady(true);
  }, []);
  return (
    <>
      <PageHead
        title="Cobros mensuales"
        text="Anticipos, cuotas y pagos intermedios de todos los planes de pago. Haga clic en una fila para registrar el cobro en la ficha del cliente."
      />
      <p className="scope-note">
        Cobranza total <b>{money(cb.total)}</b> = cobrado antes de la implementación
        <b>{money(cb.prior)}</b> + cobrado en estos planes de pago <b>{money(cb.inPlan)}</b>. La columna “Pagada” muestra solo la segunda parte.
      </p>
      <Panel>
        {ready && <PaymentsTab key={status ?? "all"} initialStatus={status} />}
      </Panel>
    </>
  );
}

const KINDS = ["Ventas", "Canje", "Obra"] as const;

export function ContractsPage() {
  const { state, project } = useApp();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("Ventas");
  const [customer, setCustomer] = useState<string | null>(null);
  const [barter, setBarter] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tur");
    if (t === "barter") setKind("Canje");
    if (t === "is") setKind("Obra");
  }, []);
  const barters = state.barters.filter(
    (b) => project === "all" || b.project === project,
  );
  const works = workContracts(state, project);
  const sales = contractList(state).filter(
    (c) => c.status !== "Anulado" && (project === "all" || c.project === project),
  ).length;
  const counts: Record<(typeof KINDS)[number], number> = {
    "Ventas": sales,
    "Canje": barters.length,
    "Obra": works.length,
  };
  return (
    <>
      <PageHead
        title="Contratos"
        text="Contratos de compraventa con su plan de pagos. Cada contrato puede verse e imprimirse."
        action={
          <Link className="btn primary" href="/unidades">
            <Plus size={15} /> Nuevo contrato de compraventa
          </Link>
        }
      />
      <Panel>
        <div className="e-tabs" role="tablist" aria-label="Tipo de contrato">
          {KINDS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              className={kind === k ? "active" : ""}
              onClick={() => setKind(k)}
            >
              {k} <small>{counts[k]}</small>
            </button>
          ))}
        </div>
        {kind === "Ventas" && (
          <ContractsTab project={project} onOpen={setCustomer} />
        )}
        {kind === "Canje" &&
          (barters.length ? (
            <div className="e-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contrato / empresa</th>
                    <th>Unidades entregadas</th>
                    <th>Trabajo a cambio</th>
                    <th className="numeric">Precio</th>
                    <th className="numeric">Obligación pendiente</th>
                    <th aria-label="Acción" />
                  </tr>
                </thead>
                <tbody>
                  {barters.map((b) => (
                    <tr
                      key={b.id}
                      className="clickable"
                      onClick={() => setBarter(b.id)}
                    >
                      <td>
                        <b>{b.company}</b>
                        <small>{b.id}</small>
                      </td>
                      <td>
                        <b>{unitShort(b.unitId)}</b>
                        <small>
                          {pname(b.project)} · {units.find((u) => u.id === b.unitId)?.type}
                        </small>
                      </td>
                      <td>
                        <small className="cc-plan">{b.work}</small>
                      </td>
                      <td className="numeric">{money(b.amount)}</td>
                      <td className="numeric">
                        <b>{money(b.amount - barterOffset(state, b.id))}</b>
                      </td>
                      <td
                        className="row-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          className="btn compact"
                          href={`/belge/?tur=barter&id=${b.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Printer size={14} /> Ver
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No hay canjes en este proyecto" />
          ))}
        {kind === "Obra" &&
          (works.length ? (
            <div className="e-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contrato / empresa</th>
                    <th>Alcance</th>
                    <th className="numeric">Precio del contrato</th>
                    <th className="numeric">Total certificado</th>
                    <th className="numeric">Pagado / compensado</th>
                    <th>Canje</th>
                    <th aria-label="Acción" />
                  </tr>
                </thead>
                <tbody>
                  {works.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <b>{w.company}</b>
                        <small>
                          {w.id} · {pname(w.project)}
                        </small>
                      </td>
                      <td>
                        <small className="cc-plan">
                          {w.packages
                            .map((p) => `${p.name} (%${p.progress})`)
                            .join(", ")}
                        </small>
                      </td>
                      <td className="numeric">
                        <b>{money(w.value)}</b>
                      </td>
                      <td className="numeric">
                        {w.hakedisTotal ? money(w.hakedisTotal) : "—"}
                        {w.hakedisTotal > 0 && (
                          <small>
                            % del valor{Math.round((w.hakedisTotal / w.value) * 100)}
                          </small>
                        )}
                      </td>
                      <td className="numeric">
                        {money(w.paid)}
                        {w.offset > 0 && (
                          <small>Compensación por canje {money(w.offset)}</small>
                        )}
                      </td>
                      <td>
                        {w.barterId ? (
                          <button
                            className="text-button"
                            onClick={() => setBarter(w.barterId!)}
                          >
                            {w.barterId}
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="row-actions">
                        <a
                          className="btn compact"
                          href={`/belge/?tur=is&id=${encodeURIComponent(w.id)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Printer size={14} /> Ver
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No hay contratos de obra en este proyecto" />
          ))}
      </Panel>
      {customer && (
        <CustomerPanel
          key={customer}
          id={customer}
          onClose={() => setCustomer(null)}
        />
      )}
      <BarterDrawer id={barter} onClose={() => setBarter(null)} />
    </>
  );
}

const FILTERS = ["Todos", "Con cuotas vencidas", "Al día", "Finalizado"] as const;

const SORTS = {
  late: "Monto vencido ↓",
  balance: "Saldo ↓",
  next: "Próximo pago ↑",
  name: "Nombre A–Z",
} as const;

export function CustomersPage() {
  const { state, project } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todos");
  const [sort, setSort] = useState<keyof typeof SORTS>("late");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<{ id: string; focus?: string } | null>(null);
  const lateBy = new Map<string, { total: number; focus: string }>();
  for (const r of paymentRows(state).filter((r) => r.status === "Vencida")) {
    const cur = lateBy.get(r.customerId);
    if (!cur)
      lateBy.set(r.customerId, {
        total: r.remaining,
        focus: r.installmentId ?? "deposit",
      });
    else cur.total += r.remaining;
  }
  const all = contractList(state).filter(
    (c) => c.account && (project === "all" || c.project === project),
  );
  const lateOf = (id: string) => lateBy.get(id)?.total ?? 0;
  const rows = all
    .filter(
      (c) =>
        (filter === "Todos" ||
          (filter === "Con cuotas vencidas"
            ? lateBy.has(c.id)
            : filter === "Finalizado"
              ? c.status === "Finalizado"
              : !lateBy.has(c.id) && c.status !== "Finalizado")) &&
        `${c.name} ${c.unitLabel} ${c.number}`
          .toLocaleLowerCase("es")
          .includes(q.toLocaleLowerCase("es")),
    )
    .sort((a, b) =>
      sort === "late"
        ? lateOf(b.id) - lateOf(a.id) || b.account!.balance - a.account!.balance
        : sort === "balance"
          ? b.account!.balance - a.account!.balance
          : sort === "next"
            ? (a.account!.next?.due ?? "9999").localeCompare(
                b.account!.next?.due ?? "9999",
              )
            : a.name.localeCompare(b.name, "es"),
    );
  const totalBalance = all.reduce((a, c) => a + c.account!.balance, 0);
  const totalLate = all.reduce((a, c) => a + lateOf(c.id), 0);
  const PAGE = 15;
  const max = Math.max(0, Math.ceil(rows.length / PAGE) - 1);
  const pg = Math.min(page, max);
  return (
    <>
      <PageHead
        title="Clientes"
        text="Cada cliente en una ficha: unidad, contrato, plan de pagos, cobros, documentos e historial."
      />
      <p className="scope-note">
        <b>{all.length}</b> clientes · saldo total{" "}
        <b>{money(totalBalance)}</b> · vencido{" "}
        <b className={totalLate ? "danger" : ""}>{money(totalLate)}</b> (
        {lateBy.size && all.filter((c) => lateBy.has(c.id)).length} clientes)
      </p>
      <Panel>
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            placeholder="Cliente, unidad o n.º de contrato…"
          />
          <div className="seg" role="tablist" aria-label="Estado del cliente">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={filter === f ? "active" : ""}
                onClick={() => {
                  setFilter(f);
                  setPage(0);
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            aria-label="Orden"
            value={sort}
            onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <div className="e-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Unidad</th>
                  <th>Pagado</th>
                  <th className="numeric">Saldo</th>
                  <th className="numeric">Vencida</th>
                  <th>Próximo pago</th>
                  <th aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {rows.slice(pg * PAGE, pg * PAGE + PAGE).map((c) => {
                  const a = c.account!;
                  const ratio = Math.round((a.collected / c.price) * 100);
                  const late = lateBy.get(c.id);
                  return (
                    <tr
                      key={c.id}
                      className="clickable"
                      onClick={() => setOpen({ id: c.id })}
                    >
                      <td>
                        <b>{c.name}</b>
                        <small>{c.number}</small>
                      </td>
                      <td>
                        <b>{unitShort(c.unitId)}</b>
                        <small>
                          {pname(c.project)} · {c.type} · {money(c.price)}
                        </small>
                      </td>
                      <td className="cc-ratio">
                        <span className="num">%{ratio}</span>
                        <Progress value={ratio} />
                      </td>
                      <td className="numeric">
                        <b>{money(a.balance)}</b>
                      </td>
                      <td className="numeric">
                        {late ? (
                          <b className="danger">{money(late.total)}</b>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {a.next
                          ? `${date(a.next.due)} · ${money(a.next.remaining)}`
                          : c.status === "Finalizado"
                            ? "Finalizado"
                            : "—"}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {late ? (
                          <button
                            className="btn compact"
                            onClick={() =>
                              setOpen({ id: c.id, focus: late.focus })
                            }
                          >
                            Cobrar
                          </button>
                        ) : (
                          <Badge
                            tone={c.status === "Finalizado" ? "info" : "green"}
                          >
                            {c.status === "Finalizado"
                              ? "Finalizado"
                              : "Al día"}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No hay clientes con este filtro" />
        )}
        <div className="e-pagination">
          <span>
            {rows.length
              ? `${pg * PAGE + 1}–${Math.min(rows.length, (pg + 1) * PAGE)} de ${rows.length} clientes`
              : "Sin registros"}
          </span>
          <div>
            <button
              aria-label="Página anterior"
              disabled={pg === 0}
              onClick={() => setPage(pg - 1)}
            >
              ‹
            </button>
            <button
              aria-label="Página siguiente"
              disabled={pg >= max}
              onClick={() => setPage(pg + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </Panel>
      {open && (
        <CustomerPanel
          key={`${open.id}-${open.focus}`}
          id={open.id}
          focus={open.focus}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
