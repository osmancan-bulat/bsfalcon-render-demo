"use client";
import { useState } from "react";
import {
  Check,
  PenLine,
  Download,
  ArrowUpRight,
  PackageCheck,
  CornerDownLeft,
  Wallet,
  Handshake,
} from "lucide-react";
import { useApp } from "./context";
import { unitShort } from "@/lib/units";
import { BarterDrawer } from "./barter";
import { unitById } from "@/lib/units";
import { Drawer, Status, Steps, AuditTrail, Badge } from "./shared";
import {
  requestList,
  requestStatus,
  netPayable,
  offsetFor,
  barterOffset,
  pname,
  summary,
  type RequestRecord,
  paidDate,
} from "@/lib/enterprise";
import { money, date } from "@/lib/data";
import { csvDownload } from "@/lib/export";
export default function RequestPanel({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { state, act } = useApp();
  const [barterOpen, setBarterOpen] = useState(false);
  const [editing, setEditing] = useState(false),
    [confirm, setConfirm] = useState("");
  const r = requestList(state).find((r) => r.id === id);
  if (!r) return null;
  const status = requestStatus(state, r);
  // Aynı proje ve firmadaki barter anlaşması (hakediş ↔ barter bağlantısı)
  const barter =
    r.type === "Certificado de obra"
      ? state.barters.find(
          (b) =>
            b.project === r.project &&
            b.company.trim().toLocaleLowerCase("es") ===
              r.company.trim().toLocaleLowerCase("es"),
        )
      : undefined;
  const barterLeft = barter
    ? barter.amount - barterOffset(state, barter.id)
    : 0;
  const isPurchase = r.type === "Compra";
  const delivered = state.delivered.includes(r.id);
  return (
    <>
      <Drawer
        open
        title={r.name}
        eyebrow={`${r.id} · ${pname(r.project)}`}
        onClose={onClose}
      >
        <div className="request-summary">
          <span>
            {r.type === "Certificado de obra"
              ? "Certificado neto a aprobar"
              : "Total de la orden"}
          </span>
          <strong>{money(r.amount)}</strong>
          <Status status={status} />
        </div>
        {barter ? (
          <div className="link-card">
            <span className="cc-task-icon t-bronze">
              <Handshake size={16} />
            </span>
            <span className="cc-list-main">
              <b>
                Canje · {unitShort(barter.unitId)} · {barter.company}
              </b>
              <small>
                Compensado en este certificado {money(offsetFor(state, r.id))} · a pagar {money(netPayable(state, r))} · obligación de canje pendiente{" "}
                {money(barterLeft)}
              </small>
            </span>
            <button className="btn compact" onClick={() => setBarterOpen(true)}>
              {status === "Aprobado" &&
              barterLeft > 0 &&
              netPayable(state, r) > 0
                ? "Compensar con canje"
                : "Canje"}
            </button>
          </div>
        ) : (
          offsetFor(state, r.id) > 0 && (
            <p className="callout">
              Compensación por canje: {money(offsetFor(state, r.id))} · parte a pagar {money(netPayable(state, r))}
            </p>
          )
        )}
        <Steps
          labels={["Solicitud", "Aprobación de gerencia", "Plan de pagos", "Pagada"]}
          current={
            status === "Pagada" || status === "Compensado"
              ? 3
              : status === "Aprobado"
                ? 2
                : 0
          }
        />
        {editing ? (
          <form
            className="edit-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                act({
                  type: "edit-request",
                  id: r.id,
                  patch: {
                    name: String(f.get("name")),
                    company: String(f.get("company")),
                    amount: Number(f.get("amount")),
                    due: String(f.get("due")),
                    description: String(f.get("description")),
                  },
                })
              )
                setEditing(false);
            }}
          >
            <RequestFields record={r} />
            <div className="form-actions">
              <button
                className="btn"
                type="button"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
              <button className="btn primary">Guardar y enviar a aprobación</button>
            </div>
          </form>
        ) : (
          <>
            <dl className="detail-list">
              <div>
                <dt>Proveedor / contratista</dt>
                <dd>{r.company}</dd>
              </div>
              <div>
                <dt>Proyecto</dt>
                <dd>{pname(r.project)}</dd>
              </div>
              <div>
                <dt>Vencimiento (pago previsto)</dt>
                <dd>
                  {date(r.due)}
                  {requestStatus(state, r) === "Pagada" && (
                    <small>
                      {paidDate(state, r.id)
                        ? `Pagado el ${date(paidDate(state, r.id)!)}`
                        : "Sin fecha de pago registrada"}
                    </small>
                  )}
                </dd>
              </div>
              <div>
                <dt>Tipo de operación</dt>
                <dd>{r.type}</dd>
              </div>
              <div>
                <dt>Responsable de control</dt>
                <dd>
                  {isPurchase ? "Compras" : "Oficina técnica de obra"}
                </dd>
              </div>
              {isPurchase && (
                <div>
                  <dt>Malzeme teslimi</dt>
                  <dd>
                    <Badge tone={delivered ? "green" : "amber"}>
                      {delivered ? "Recibido" : "Recepción pendiente"}
                    </Badge>
                  </dd>
                </div>
              )}
            </dl>
            <div className="callout">
              {r.description ??
                (isPurchase
                  ? "Se verificó que el material solicitado corresponde al plan de obra. La recepción se registra por separado."
                  : "Medición y control de obra completados. El monto mostrado es el certificado neto a aprobar en la demo.")}
            </div>
            <div className="request-actions">
              {status === "Pendiente de aprobación" && (
                <>
                  <button
                    className="btn primary"
                    onClick={() => setConfirm("approve")}
                  >
                    <Check size={16} /> Aprobar
                  </button>
                  <button className="btn" onClick={() => setConfirm("reject")}>
                    <CornerDownLeft size={16} /> Revizyona iade
                  </button>
                </>
              )}
              {["Pendiente de aprobación", "Devuelto"].includes(status) && (
                <button className="btn" onClick={() => setEditing(true)}>
                  <PenLine size={15} /> Editar
                </button>
              )}
              {status === "Aprobado" && (
                <button
                  className="btn primary"
                  onClick={() => setConfirm("pay-order")}
                >
                  <Wallet size={16} /> Registrar pago
                </button>
              )}
              {isPurchase &&
                ["Aprobado", "Pagada"].includes(status) &&
                !delivered && (
                  <button className="btn" onClick={() => setConfirm("deliver")}>
                    <PackageCheck size={16} /> Registrar recepción
                  </button>
                )}
              <button
                className="btn"
                onClick={() =>
                  csvDownload(
                    [
                      ["Acción", r.id],
                      ["Proyecto", pname(r.project)],
                      ["Empresa", r.company],
                      ["Descripción", r.name],
                      ["Monto", r.amount],
                      ["Estado", status],
                      ["Vencimiento", r.due],
                      [
                        "Tipo de documento",
                        "Resumen de operación de ejemplo; no es un comprobante real.",
                      ],
                    ],
                    `${r.id}-ozet.csv`,
                  )
                }
              >
                <Download size={15} /> Resumen de la operación
              </button>
            </div>
            {confirm && (
              <div className="confirm-inline">
                <h3>
                  {confirm === "approve"
                    ? "¿Agregar a pagos programados?"
                    : confirm === "pay-order"
                      ? "¿Registrar el pago?"
                      : confirm === "deliver"
                        ? "¿Se recibió el material?"
                        : "Revizyona iade edilsin mi?"}
                </h3>
                <p>
                  {confirm === "pay-order"
                    ? `Se descontará ${money(r.amount)} de la caja del proyecto. Saldo disponible (demo): ${money(summary(state, r.project).cash)}. No se realiza ninguna transferencia real.`
                    : confirm === "approve"
                      ? "El monto aprobado se agrega a los pagos pendientes en Caja y Movimientos."
                      : "Se actualizarán el estado y el historial."}
                </p>
                <div className="form-actions">
                  <button className="btn" onClick={() => setConfirm("")}>
                    Cancelar
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => {
                      if (
                        act({
                          type: confirm as
                            "approve" | "reject" | "pay-order" | "deliver",
                          id: r.id,
                        })
                      )
                        setConfirm("");
                    }}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        <h3 className="subheading">Historial</h3>
        <AuditTrail items={state.audit.filter((a) => a.entity === r.id)} />
      </Drawer>
      {barter && (
        <BarterDrawer
          id={barterOpen ? barter.id : null}
          onClose={() => setBarterOpen(false)}
        />
      )}
    </>
  );
}
export function RequestFields({ record }: { record?: RequestRecord }) {
  return (
    <div className="form-grid">
      <label className="full">
        Descripción
        <input
          name="name"
          defaultValue={record?.name}
          placeholder="Ej.: certificado de estructura piso 5"
          required
          maxLength={140}
        />
      </label>
      <label className="full">
        Proveedor / contratista
        <input
          name="company"
          defaultValue={record?.company}
          placeholder="Nombre de la empresa"
          required
          maxLength={100}
        />
      </label>
      <label>
        Monto (USD)
        <input
          name="amount"
          type="number"
          min="1"
          step="0.01"
          defaultValue={record?.amount}
          required
        />
      </label>
      <label>
        Pago previsto
        <input
          name="due"
          type="date"
          defaultValue={record?.due ?? "2026-11-25"}
          min="2026-11-15"
          required
        />
      </label>
      <label className="full">
        Descripción / nota de control
        <textarea
          name="description"
          defaultValue={record?.description}
          maxLength={1000}
        />
      </label>
    </div>
  );
}
