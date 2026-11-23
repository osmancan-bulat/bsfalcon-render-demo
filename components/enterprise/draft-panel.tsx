"use client";
import { m2 } from "@/lib/units";
// İmza sürecindeki sözleşme: daire ve müşteri bilgisi, planlanan ödeme takvimi, durum geçmişi ve imza/iptal işlemleri.
// İmza onayı bir doğrulama adımıyla yapılır; imzadan sonra müşteri dosyası oluşturulmuş ödeme planıyla açılır.
import Link from "next/link";
import { useState } from "react";
import { Printer, Send, PenLine, X, ShieldCheck } from "lucide-react";
import { useApp } from "./context";
import { unitPlace } from "@/lib/units";
import { Drawer, Badge } from "./shared";
import { contractNumber, pname } from "@/lib/enterprise";
import { buildSchedule } from "@/lib/plan";
import { unitById } from "@/lib/units";
import { money, date } from "@/lib/data";

export default function DraftPanel({
  id,
  onClose,
  onSigned,
}: {
  id: string;
  onClose: () => void;
  onSigned: (id: string) => void;
}) {
  const { state, act } = useApp();
  const d = state.drafts.find((x) => x.id === id);
  const meta = state.contractMeta[id];
  const [mode, setMode] = useState<"" | "sign" | "cancel">("");
  const [paid, setPaid] = useState(
    String(d?.plan?.deposits[0]?.amount ?? d?.depositExpected ?? 0),
  );
  const [reason, setReason] = useState("");
  if (!d || !meta) return null;
  const u = unitById(d.id);
  const sch = d.plan ? buildSchedule(d.price, d.plan) : null;
  const paidN = Number(paid);
  const validPaid =
    Number.isFinite(paidN) && paidN >= 0 && paidN <= (d.depositExpected ?? 0);

  return (
    <Drawer
      open
      title={`${contractNumber(d.id)} · ${d.name}`}
      eyebrow="CONTRATO EN PROCESO DE FIRMA"
      onClose={onClose}
      wide
    >
      <dl className="file-summary">
        <div>
          <dt>Proyecto</dt>
          <dd>{pname(d.project)}</dd>
        </div>
        <div>
          <dt>Torre · piso · unidad</dt>
          <dd>
            {u ? unitPlace(d.id) : d.unit} <small>código {d.unit}</small>
          </dd>
        </div>
        <div>
          <dt>Tipología · superficie</dt>
          <dd>
            {u?.type} · {m2(u?.gross ?? 0)} m²
          </dd>
        </div>
        <div>
          <dt>Orientación</dt>
          <dd>{u?.facade}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{meta.status}</dd>
        </div>
      </dl>

      <div className="acct-head">
        <div className="acct-figures">
          <div>
            <span>Precio del contrato</span>
            <b className="num">{money(d.price)}</b>
            <small>
              {d.listPrice && d.listPrice > d.price
                ? `Lista ${money(d.listPrice)} · descuento ${money(d.listPrice - d.price)}`
                : "Precio de lista"}
            </small>
          </div>
          <div>
            <span>Anticipo pactado</span>
            <b className="num">{money(d.depositExpected ?? 0)}</b>
            <small>{d.plan?.deposits.length ?? 1} partes</small>
          </div>
          <div>
            <span>Cuota</span>
            <b className="num">
              {sch ? `${d.plan!.count} × ${money(sch.installment)}` : "—"}
            </b>
            <small>Primer vencimiento {d.plan ? date(d.plan.firstDue) : "—"}</small>
          </div>
          <div>
            <span>Finansal etki</span>
            <b className="num">No</b>
            <small>Cuenta por cobrar y caja se generan con la firma</small>
          </div>
        </div>
        <div className="acct-actions">
          <Badge tone={meta.status === "Borrador" ? "neutral" : "amber"}>
            {meta.status}
          </Badge>
          <span className="acct-plan">
            La unidad está bloqueada para este contrato; no admite otra venta
            ni reserva.
          </span>
          <Link
            className="btn compact"
            href={`/belge/?tur=sozlesme&id=${d.id}`}
            target="_blank"
          >
            <Printer size={14} /> Resumen del contrato
          </Link>
        </div>
      </div>

      {mode === "" && (
        <div className="draft-cta">
          {meta.status === "Borrador" && (
            <button
              className="btn"
              onClick={() =>
                act({
                  type: "contract-status",
                  id: d.id,
                  status: "Pendiente de firma",
                })
              }
            >
              <Send size={15} /> Enviar a firma
            </button>
          )}
          <button className="btn danger" onClick={() => setMode("cancel")}>
            <X size={15} /> Anular borrador
          </button>
          <button className="btn primary" onClick={() => setMode("sign")}>
            <PenLine size={15} /> Registrar firma
          </button>
        </div>
      )}

      {mode === "sign" && (
        <form
          className="inline-form confirm-box"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              validPaid &&
              act({ type: "contract-sign", id: d.id, depositPaid: paidN })
            )
              onSigned(d.id);
          }}
        >
          <h3>
            <ShieldCheck size={16} /> Confirmar firma
          </h3>
          <label className="form-label">
            Anticipo cobrado en la firma (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              max={d.depositExpected}
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              required
              autoFocus
            />
          </label>
          <ul className="confirm-list">
            <li>
              Contrato <b>Activo</b> olur;{" "}
              {sch
                ? `${d.plan!.count} cuotas${d.plan!.interim.length ? ` y ${d.plan!.interim.length} pagos intermedios` : ""}`
                : "plan de pagos"}{" "}
              se genera como cuenta por cobrar.
            </li>
            <li>
              Ingresan a caja <b>{validPaid ? money(paidN) : "—"}</b> de anticipo
              {validPaid && paidN < (d.depositExpected ?? 0)
                ? `; el anticipo restante de ${money((d.depositExpected ?? 0) - paidN)} se sigue a su vencimiento`
                : ""}
              .
            </li>
            <li>
              Esta acción no se puede deshacer; un contrato activo solo se cierra mediante
              un proceso de rescisión.
            </li>
          </ul>
          {!validPaid && (
            <p className="form-error">
              El anticipo debe estar entre 0 y {money(d.depositExpected ?? 0)} .
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setMode("")}>
              Cancelar
            </button>
            <button className="btn primary" type="submit" disabled={!validPaid}>
              <PenLine size={15} /> Registrar como firmado
            </button>
          </div>
        </form>
      )}

      {mode === "cancel" && (
        <form
          className="inline-form confirm-box danger"
          onSubmit={(e) => {
            e.preventDefault();
            if (act({ type: "contract-cancel", id: d.id, reason })) onClose();
          }}
        >
          <h3>Anular borrador</h3>
          <label className="form-label">
            Motivo de la anulación
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={120}
              placeholder="Ej.: el cliente desistió"
              autoFocus
            />
          </label>
          <p className="muted">
            La unidad vuelve a estar disponible. El borrador no tenía efecto financiero, por lo que caja y cuentas por cobrar no cambian.
          </p>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setMode("")}>
              Cancelar
            </button>
            <button
              className="btn danger"
              type="submit"
              disabled={!reason.trim()}
            >
              Anular borrador
            </button>
          </div>
        </form>
      )}

      <section className="acct-section">
        <h3>Calendario de pagos</h3>
        {sch ? (
          <div className="e-table-wrap drawer-table">
            <table>
              <thead>
                <tr>
                  <th>Pago</th>
                  <th>Vencimiento</th>
                  <th className="numeric">Monto</th>
                </tr>
              </thead>
              <tbody>
                {d.plan!.deposits.map((p, n) => (
                  <tr key={`d${n}`} className="acct-interim">
                    <td>
                      {d.plan!.deposits.length > 1
                        ? `Anticipo ${n + 1}`
                        : "Anticipo"}
                    </td>
                    <td>{date(p.due)}</td>
                    <td className="numeric">{money(p.amount)}</td>
                  </tr>
                ))}
                {sch.rows.slice(0, 6).map((r) => (
                  <tr
                    key={r.seq}
                    className={r.kind === "Pago intermedio" ? "acct-interim" : ""}
                  >
                    <td>{r.label}</td>
                    <td>{date(r.due)}</td>
                    <td className="numeric">{money(r.amount)}</td>
                  </tr>
                ))}
                {sch.rows.length > 6 && (
                  <tr>
                    <td colSpan={3} className="muted">
                      … y {sch.rows.length - 6} pagos más · total del plan{" "}
                      {money(sch.total)} (igual al precio, al centavo)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Este borrador no tiene plan de pagos.</p>
        )}
      </section>

      <section className="acct-section">
        <h3>Historial del contrato</h3>
        <ol className="acct-history">
          {meta.history.map((h, n) => (
            <li key={n}>
              <span className="acct-history-dot" />
              <div>
                <b>{h.status}</b>
                <small>
                  {date(h.date)} · {h.note}
                </small>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </Drawer>
  );
}
