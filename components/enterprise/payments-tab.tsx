"use client";
// Taksit ve peşinat takibi: her ödeme satırı Ödendi / Kısmen ödendi / Yaklaşıyor / Gecikti / Gelecek dönem olarak ayrılır.
// Satıra tıklamak müşteri dosyasını ilgili ödeme ve tahsilat formu açık şekilde getirir.
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useApp } from "./context";
import { unitShort } from "@/lib/units";
import { SearchBox, Badge, Empty } from "./shared";
import CustomerPanel from "./customer-panel";
import {
  paymentRows,
  customerList,
  contractNumber,
  pname,
  PAYMENT_STATUSES,
  type PaymentStatus,
  type PaymentRow,
} from "@/lib/enterprise";
import { money, compact, date } from "@/lib/data";
import { csvDownload } from "@/lib/export";

const TONE: Record<PaymentStatus, string> = {
  "Vencida": "red",
  "Próxima": "amber",
  "Pago parcial": "info",
  "Futura": "neutral",
  "Pagada": "green",
};
const HINT: Record<PaymentStatus, string> = {
  "Vencida": "Vencido con saldo",
  "Próxima": "En los próximos 30 días",
  "Pago parcial": "No vencido, pago parcial",
  "Futura": "Después de 30 días",
  "Pagada": "Cobrado en estos planes · incluye parciales",
};
const PAGE = 15;
const relative = (r: PaymentRow) =>
  r.status === "Pagada"
    ? "Cancelada"
    : r.days < 0
      ? `${-r.days} días de atraso`
      : r.days === 0
        ? "Hoy"
        : `faltan ${r.days} días`;

export default function PaymentsTab({
  initialStatus,
}: {
  initialStatus?: PaymentStatus;
}) {
  const { state, project } = useApp();
  const [status, setStatus] = useState<PaymentStatus | "Pendiente">(
    initialStatus ?? "Pendiente",
  );
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<{ id: string; focus?: string } | null>(null);
  useEffect(() => setPage(0), [status, kind, q, project]);

  const names = useMemo(
    () => new Map(customerList(state).map((c) => [c.id, c])),
    [state],
  );
  const all = useMemo(
    () =>
      paymentRows(state).filter(
        (r) => project === "all" || r.project === project,
      ),
    [state, project],
  );
  const totals = PAYMENT_STATUSES.map((s) => {
    const rows = all.filter((r) => r.status === s);
    return {
      s,
      count: rows.length,
      // "Pagada": bu planlar üzerinden tahsil edilen tüm tutar (kısmi ödemeler dahil) = collectionBreakdown().inPlan
      amount:
        s === "Pagada"
          ? all.reduce((a, r) => a + r.paid, 0)
          : rows.reduce((a, r) => a + r.remaining, 0),
    };
  });
  const rows = all
    .filter((r) =>
      status === "Pendiente" ? r.status !== "Pagada" : r.status === status,
    )
    .filter((r) => kind === "all" || r.kind === kind)
    .filter((r) => {
      const c = names.get(r.customerId);
      return `${c?.name} ${c?.unit} ${contractNumber(r.customerId)}`
        .toLocaleLowerCase("es")
        .includes(q.toLocaleLowerCase("es"));
    })
    .sort((a, b) =>
      status === "Pagada"
        ? b.due.localeCompare(a.due)
        : a.due.localeCompare(b.due),
    );
  const max = Math.max(0, Math.ceil(rows.length / PAGE) - 1);
  const pg = Math.min(page, max);

  return (
    <>
      <div className="pay-status" role="tablist" aria-label="Estado de pago">
        {totals.map((t) => (
          <button
            key={t.s}
            role="tab"
            aria-selected={status === t.s}
            className={`pay-chip t-${TONE[t.s]} ${status === t.s ? "active" : ""}`}
            onClick={() => setStatus(status === t.s ? "Pendiente" : t.s)}
          >
            <span>
              <i /> {t.s} <small>{t.count}</small>
            </span>
            <b className="num">{compact(t.amount)}</b>
            <small>{HINT[t.s]}</small>
          </button>
        ))}
      </div>
      <div className="e-toolbar">
        <SearchBox
          value={q}
          onChange={setQ}
          placeholder="Cliente, unidad o n.º de contrato…"
        />
        <select
          aria-label="Tipo de pago"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">Todos los tipos</option>
          <option>Anticipo</option>
          <option>Cuota</option>
          <option>Pago intermedio</option>
        </select>
        {status !== "Pendiente" && (
          <button
            className="btn compact ghost"
            onClick={() => setStatus("Pendiente")}
          >
            Todos los pagos pendientes
          </button>
        )}
        <button
          className="btn compact"
          style={{ marginLeft: "auto" }}
          onClick={() =>
            csvDownload(
              [
                [
                  "Vencimiento",
                  "Cliente",
                  "Unidad",
                  "Contrato",
                  "Pago",
                  "Monto",
                  "Pagado",
                  "Saldo",
                  "Estado",
                ],
                ...rows.map((r) => {
                  const c = names.get(r.customerId);
                  return [
                    r.due,
                    c?.name ?? "",
                    c?.unit ?? "",
                    contractNumber(r.customerId),
                    r.label,
                    r.amount,
                    r.paid,
                    r.remaining,
                    r.status,
                  ];
                }),
              ],
              "edifica-odeme-takibi.csv",
            )
          }
        >
          <Download size={14} /> CSV
        </button>
      </div>
      {rows.length ? (
        <div className="e-table-wrap">
          <table className="pay-table">
            <thead>
              <tr>
                <th>Vencimiento</th>
                <th>Cliente / unidad</th>
                <th>Pago</th>
                <th className="numeric">Monto</th>
                <th className="numeric">Pagado</th>
                <th className="numeric">Saldo</th>
                <th>Estado</th>
                <th aria-label="Acción" />
              </tr>
            </thead>
            <tbody>
              {rows.slice(pg * PAGE, pg * PAGE + PAGE).map((r) => {
                const c = names.get(r.customerId);
                const focus = r.installmentId ?? "deposit";
                return (
                  <tr
                    key={r.id}
                    className="clickable"
                    onClick={() =>
                      setOpen({
                        id: r.customerId,
                        focus: r.status === "Pagada" ? undefined : focus,
                      })
                    }
                  >
                    <td>
                      <b>{date(r.due)}</b>
                      <small className={r.status === "Vencida" ? "danger" : ""}>
                        {relative(r)}
                      </small>
                    </td>
                    <td>
                      <b>{c?.name}</b>
                      <small>
                        {pname(r.project)} · {unitShort(r.customerId)} ·{" "}
                        {contractNumber(r.customerId)}
                      </small>
                    </td>
                    <td>
                      <b>{r.label}</b>
                      <small>{r.kind}</small>
                    </td>
                    <td className="numeric">{money(r.amount)}</td>
                    <td className="numeric">{r.paid ? money(r.paid) : "—"}</td>
                    <td className="numeric">
                      <b>{money(r.remaining)}</b>
                    </td>
                    <td>
                      <Badge tone={TONE[r.status]}>{r.status}</Badge>
                    </td>
                    <td>
                      {r.status !== "Pagada" && (
                        <button
                          className="btn compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen({ id: r.customerId, focus });
                          }}
                        >
                          Cobrar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No hay pagos con este filtro"
          detail="Cambie el estado o la búsqueda."
        />
      )}
      <div className="e-pagination">
        <span>
          {rows.length
            ? `${pg * PAGE + 1}–${Math.min(rows.length, (pg + 1) * PAGE)} de ${rows.length} pagos`
            : "Sin registros"}{" "}
          · saldo total {money(rows.reduce((a, r) => a + r.remaining, 0))}
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
