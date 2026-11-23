"use client";
// Müşteri / daire dosyası. Önce özet (müşteri, daire, durum, bedel, ödenen, kalan, sonraki ödeme),
// ardından beş sekme: Ödeme planı · Tahsilatlar · Sözleşme · Belgeler · İşlem geçmişi.
// Tahsilat tek düğmeyle açılır; form kaydetmeden önce bakiye ve kasa etkisini gösterir.
import Link from "next/link";
import { useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Printer,
  ArrowRightLeft,
  CircleCheck,
  Wallet,
  PenLine,
} from "lucide-react";
import RecordDocuments from "./record-documents";
import { unitById } from "@/lib/units";
import { ADVISORS } from "@/lib/names";
import { useApp } from "./context";
import { unitPlace, unitShort } from "@/lib/units";
import { Drawer, Badge, AuditTrail, Progress } from "./shared";
import {
  customerList,
  pname,
  SNAPSHOT,
  accountOf,
  contractList,
  customerLedger,
  paymentRows,
  fileHistory,
  type PaymentRow,
  nextReceiptId,
} from "@/lib/enterprise";
import { money, date } from "@/lib/data";

const TABS = [
  "Plan de pagos",
  "Tahsilatlar",
  "Contrato",
  "Belgeler",
  "Historial",
] as const;
const TONE: Record<string, string> = {
  "Vencida": "red",
  "Próxima": "amber",
  "Pago parcial": "info",
  "Futura": "neutral",
  "Pagada": "green",
};

export default function CustomerPanel({
  id,
  onClose,
  focus,
}: {
  id: string | null;
  onClose: () => void;
  /** Açılışta tahsilat formu açılacak ödeme: taksit id'si veya "deposit" */
  focus?: string;
}) {
  const { state, act } = useApp();
  const c = customerList(state).find((c) => c.id === id);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Plan de pagos");
  const [paying, setPaying] = useState<string>(focus ?? "");
  const [justPaid, setJustPaid] = useState<{
    amount: number;
    receipt?: string;
  } | null>(null);
  const [reschedule, setReschedule] = useState("");
  const [panel, setPanel] = useState<"" | "transfer" | "edit">("");
  const [fullPlan, setFullPlan] = useState(false);
  const [reversing, setReversing] = useState<{ kind: "receipt" | "deposit"; id: string; ref: string } | null>(null);
  if (!c) return null;
  const acc = accountOf(state, c);
  const contract = contractList(state).find((x) => x.id === c.id)!;
  const u = unitById(c.id);
  const rows = paymentRows(state).filter((r) => r.customerId === c.id);
  const open = rows.filter((r) => r.remaining > 0);
  // Ödeme planı: varsayılan görünümde gecikenler + sıradaki 3 açık ödeme; işlem yalnızca gecikenlerde ve sıradaki ödemede
  const upcomingOpen = open.filter((r) => r.status !== "Vencida");
  const actionable = new Set([
    ...open.filter((r) => r.status === "Vencida").map((r) => r.id),
    ...(upcomingOpen[0] ? [upcomingOpen[0].id] : []),
  ]);
  const focusedIds = new Set([
    ...open.filter((r) => r.status === "Vencida").map((r) => r.id),
    ...upcomingOpen.slice(0, 3).map((r) => r.id),
  ]);
  const paidCount = rows.filter((r) => r.remaining === 0).length;
  const late = open.filter((r) => r.status === "Vencida");
  const nextOpen = late[0] ?? open[0];
  const resolve = (key: string): PaymentRow | undefined =>
    key === "deposit"
      ? rows.find((r) => r.kind === "Anticipo" && r.remaining > 0)
      : key === "next"
        ? nextOpen
        : rows.find((r) => r.id === key);
  const target = paying ? resolve(paying) : undefined;
  const ratio = Math.round((acc.collected / c.price) * 100);
  const lateTotal = late.reduce((a, r) => a + r.remaining, 0);
  const priorPaid =
    c.paidMonths > 0 ? c.deposit + c.paidMonths * c.installment : 0;
  const ledger = tab === "Tahsilatlar" ? customerLedger(state, c.id) : [];
  const receipts = state.receipts.filter((r) =>
    rows.some((x) => x.installmentId === r.installmentId),
  );

  function collect(
    row: PaymentRow,
    amount: number,
    method: string,
    reference: string,
  ) {
    const ok =
      row.kind === "Anticipo"
        ? act({ type: "deposit-receipt", id: c!.id, amount })
        : act({
            type: "receipt",
            installmentId: row.installmentId!,
            amount,
            method,
            reference,
          });
    if (ok) {
      // Makbuz no, applyAction ile aynı kuralla: THS-<sıra>
      setJustPaid({
        amount,
        receipt: row.kind === "Anticipo" ? undefined : nextReceiptId(state),
      });
      setPaying("");
    }
  }

  return (
    <Drawer
      open
      title={c.name}
      eyebrow={`${pname(c.project)} · ${unitPlace(c.id)} · ${contract.number}`}
      onClose={onClose}
      wide
    >
      <dl className="file-summary">
        <div>
          <dt>Cliente</dt>
          <dd>
            {c.name}
            <small>{contract.number}</small>
          </dd>
        </div>
        <div>
          <dt>Unidad</dt>
          <dd>
            {u ? unitShort(c.id) : c.unit} · {u?.type}
            <small>
              {u?.floorLabel} · {u?.gross} m² · {u?.facade} · código {c.unit}
            </small>
          </dd>
        </div>
        <div>
          <dt>Estado de la venta</dt>
          <dd>
            <Badge
              tone={
                late.length
                  ? "red"
                  : contract.status === "Finalizado"
                    ? "info"
                    : "green"
              }
            >
              {late.length
                ? "Con cuotas vencidas"
                : contract.status === "Finalizado"
                  ? "Finalizado"
                  : "Contrato activo"}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Precio total</dt>
          <dd className="num">{money(c.price)}</dd>
        </div>
        <div>
          <dt>Pagado</dt>
          <dd className="num">
            {money(acc.collected)}
            <Progress value={ratio} />
          </dd>
        </div>
        <div>
          <dt>Saldo</dt>
          <dd className="num">{money(acc.balance)}</dd>
        </div>
        <div className={late.length ? "alert" : ""}>
          <dt>{late.length ? "Vencido" : "Próximo pago"}</dt>
          <dd className="num">
            {late.length
              ? money(lateTotal)
              : nextOpen
                ? money(nextOpen.remaining)
                : "—"}
            <small>
              {late.length
                ? `${late.length} pagos · el más antiguo ${date(late[0].due)}`
                : nextOpen
                  ? `${nextOpen.label} · ${date(nextOpen.due)}`
                  : "Sin pagos pendientes"}
            </small>
          </dd>
        </div>
        <div className="file-cta">
          {nextOpen && (
            <button
              className="btn primary"
              onClick={() => setPaying(paying ? "" : "next")}
            >
              <Wallet size={15} /> Registrar cobro
            </button>
          )}
        </div>
      </dl>

      {justPaid && !target && (
        <div className="receipt-done" role="status">
          <CircleCheck size={18} />
          <div>
            <b>{money(justPaid.amount)} cobrado</b>
            <small>
              Saldo pendiente {money(acc.balance)} · ingresaron a caja{" "}
              {money(justPaid.amount)} girdi
            </small>
          </div>
          {justPaid.receipt && (
            <Link
              className="btn compact"
              href={`/belge/?tur=makbuz&id=${justPaid.receipt}`}
              target="_blank"
            >
              <Printer size={14} /> Recibo
            </Link>
          )}
        </div>
      )}
      {target && (
        <ReceiptForm
          key={target.id}
          label={`${target.label} · vence ${date(target.due)}`}
          remaining={target.remaining}
          balance={acc.balance}
          simple={target.kind === "Anticipo"}
          onCancel={() => setPaying("")}
          onSubmit={(amount, method, reference) =>
            collect(target, amount, method, reference)
          }
        />
      )}

      <div className="e-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Plan de pagos" && (
        <section className="acct-section">
          {priorPaid > 0 && (
            <p className="muted">
              Pagado antes de la implementación: anticipo y primeras {c.paidMonths} cuotas ·{" "}
              {money(priorPaid)}
            </p>
          )}
          <div className="plan-head">
            <span>
              {fullPlan
                ? `Plan completo · ${rows.length} pagos`
                : late.length
                  ? `${late.length} vencidos y próximos pagos`
                  : "Próximos pagos"}
              <small>
                {paidCount} pagos cancelados · {open.length} pagos pendientes · saldo{" "}
                {money(acc.balance)}
              </small>
            </span>
            <button
              className="btn compact ghost"
              onClick={() => setFullPlan(!fullPlan)}
            >
              {fullPlan
                ? "Solo los próximos"
                : `Ver plan completo (${rows.length})`}
            </button>
          </div>
          <div className="e-table-wrap drawer-table">
            <table>
              <thead>
                <tr>
                  <th>Pago</th>
                  <th>Vencimiento</th>
                  <th className="numeric">Monto</th>
                  <th className="numeric">Saldo</th>
                  <th>Estado</th>
                  <th aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {(fullPlan
                  ? rows
                  : rows.filter((r) => focusedIds.has(r.id))
                ).map((r) => (
                  <tr
                    key={r.id}
                    className={`${r.kind !== "Cuota" ? "acct-interim" : ""} ${r.remaining === 0 ? "row-paid" : ""}`}
                  >
                    <td>
                      <b>{r.label}</b>
                      {reschedule === r.id && r.installmentId && (
                        <form
                          className="reschedule"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            if (
                              act({
                                type: "reschedule",
                                id: r.installmentId!,
                                date: String(f.get("date")),
                              })
                            )
                              setReschedule("");
                          }}
                        >
                          <input
                            aria-label="Nuevo vencimiento"
                            name="date"
                            type="date"
                            min={SNAPSHOT}
                            defaultValue={r.due < SNAPSHOT ? SNAPSHOT : r.due}
                            required
                          />
                          <button className="btn compact" type="submit">
                            Guardar
                          </button>
                        </form>
                      )}
                    </td>
                    <td>{date(r.due)}</td>
                    <td className="numeric">{money(r.amount)}</td>
                    <td className="numeric">
                      {r.remaining ? money(r.remaining) : "—"}
                    </td>
                    <td>
                      <Badge tone={TONE[r.status]}>{r.status}</Badge>
                    </td>
                    <td>
                      {actionable.has(r.id) && (
                        <div className="row-actions">
                          <button
                            className="btn compact"
                            onClick={() =>
                              setPaying(
                                r.id === "deposit"
                                  ? "deposit"
                                  : r.kind === "Anticipo"
                                    ? "deposit"
                                    : r.id,
                              )
                            }
                          >
                            Cobrar
                          </button>
                          {r.installmentId && (
                            <button
                              className="icon-button"
                              aria-label={`Cambiar vencimiento de ${r.label}`}
                              title="Cambiar vencimiento"
                              onClick={() =>
                                setReschedule(reschedule === r.id ? "" : r.id)
                              }
                            >
                              <CalendarDays size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "Tahsilatlar" && (
        <section className="acct-section">
          <div className="file-actions">
            <span className="muted">
              Cargo del contrato y todos los cobros en un solo estado de cuenta; la última línea es el saldo
              bakiyedir.
            </span>
            <span className="spacer" />
            <Link
              className="btn compact"
              href={`/belge/?tur=ekstre&id=${c.id}`}
              target="_blank"
            >
              <Printer size={14} /> Estado de cuenta
            </Link>
          </div>
          <div className="e-table-wrap drawer-table">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hareket</th>
                  <th className="numeric">Monto</th>
                  <th className="numeric">Saldo</th>
                  <th aria-label="Recibo" />
                </tr>
              </thead>
              <tbody>
                {ledger.map((e, n) => (
                  <tr key={n}>
                    <td>{date(e.date)}</td>
                    <td>
                      <b>{e.label}</b>
                      <small>{e.ref}</small>
                    </td>
                    <td className="numeric">
                      {e.debit ? (
                        money(e.debit)
                      ) : e.credit < 0 ? (
                        <span className="negative">+{money(-e.credit)} anulado</span>
                      ) : (
                        <span className="positive">−{money(e.credit)}</span>
                      )}
                    </td>
                    <td className="numeric">
                      <b>{money(e.balance)}</b>
                    </td>
                    <td className="row-actions">
                      {receipts.some((r) => r.id === e.ref) && (
                        <Link
                          className="icon-button"
                          href={`/belge/?tur=makbuz&id=${e.ref}`}
                          target="_blank"
                          aria-label={`${e.ref} makbuzu`}
                          title="Recibo"
                        >
                          <Printer size={14} />
                        </Link>
                      )}
                      {e.sourceId && !e.reversed && (
                        <button
                          className="text-button"
                          onClick={() =>
                            setReversing({
                              kind: e.kind === "Anticipo" ? "deposit" : "receipt",
                              id: e.sourceId!,
                              ref: e.ref,
                            })
                          }
                          title="Anular cobro erróneo (el registro no se elimina)"
                        >
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reversing && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
                if (
                  act({
                    type: reversing.kind === "deposit" ? "deposit-reverse" : "receipt-reverse",
                    id: reversing.id,
                    reason,
                  })
                )
                  setReversing(null);
              }}
            >
              <h3>{reversing.ref} anular cobro</h3>
              <p className="muted">
                El registro no se elimina: el cobro se marca como “anulado”, el monto vuelve al saldo y la anulación figura en el estado de cuenta y en el historial. Luego se registra el cobro correcto.
              </p>
              <label className="form-label">
                Motivo de la anulación
                <input name="reason" required minLength={5} maxLength={140} placeholder="Ej.: imputado a otra cuota" />
              </label>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setReversing(null)}>
                  Cancelar
                </button>
                <button className="btn danger">Anular cobro</button>
              </div>
            </form>
          )}
        </section>
      )}

      {tab === "Contrato" && (
        <section className="acct-section">
          <dl className="file-summary cols-3">
            <div>
              <dt>N.º de contrato</dt>
              <dd>{contract.number}</dd>
            </div>
            <div>
              <dt>Fecha de firma</dt>
              <dd>{contract.signedAt ? date(contract.signedAt) : "—"}</dd>
            </div>
            <div>
              <dt>Plan de pagos</dt>
              <dd>{contract.planLabel}</dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd className="num">{money(c.price)}</dd>
            </div>
            <div>
              <dt>Precio de lista (ejemplo)</dt>
              <dd className="num">
                {contract.listPrice ? money(contract.listPrice) : "—"}
              </dd>
            </div>
            <div>
              <dt>Descuento</dt>
              <dd className="num">
                {contract.discount > 0 ? money(contract.discount) : "—"}
              </dd>
            </div>
          </dl>
          <div className="file-actions">
            <Link
              className="btn compact"
              href={`/belge/?tur=sozlesme&id=${c.id}`}
              target="_blank"
            >
              <Printer size={14} /> Resumen del contrato
            </Link>
            <Link
              className="btn compact"
              href={`/belge/?tur=plan&id=${c.id}`}
              target="_blank"
            >
              <Printer size={14} /> Plan de pagos
            </Link>
            <span className="spacer" />
            <button
              className="btn compact ghost"
              onClick={() => setPanel(panel === "edit" ? "" : "edit")}
            >
              <PenLine size={14} /> Datos del cliente
            </button>
            <button
              className="btn compact ghost"
              onClick={() => setPanel(panel === "transfer" ? "" : "transfer")}
            >
              <ArrowRightLeft size={14} /> Cesión
            </button>
          </div>
          {panel === "transfer" && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  act({
                    type: "contract-transfer",
                    id: c.id,
                    name: String(f.get("name")),
                    note: String(f.get("note")),
                  })
                )
                  setPanel("");
              }}
            >
              <h3>Cesión del contrato</h3>
              <p className="muted">
                El saldo y el plan de pagos pasan al cesionario sin cambios. Use solo nombres ficticios.
              </p>
              <div className="form-grid">
                <label>
                  Devralan
                  <input
                    name="name"
                    required
                    maxLength={80}
                    placeholder="Nombre y apellido del cesionario"
                  />
                </label>
                <label>
                  Nota
                  <input
                    name="note"
                    maxLength={120}
                    placeholder="Ej.: escritura de cesión"
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPanel("")}
                >
                  Cancelar
                </button>
                <button className="btn primary" type="submit">
                  Registrar cesión
                </button>
              </div>
            </form>
          )}
          {panel === "edit" && (
            <form
              className="inline-form"
              key={c.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  act({
                    type: "customer",
                    id: c.id,
                    patch: {
                      name: String(f.get("name")),
                      phone: String(f.get("phone")),
                      email: String(f.get("email")),
                      owner: String(f.get("owner")),
                      note: String(f.get("note")),
                    },
                  })
                )
                  setPanel("");
              }}
            >
              <h3>Datos del cliente</h3>
              <p className="muted">Ingrese solo datos ficticios.</p>
              <div className="form-grid">
                <label>
                  Ad soyad
                  <input
                    name="name"
                    defaultValue={c.name}
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  Asesor comercial
                  <select name="owner" defaultValue={c.owner ?? "Equipo comercial"}>
                    <option>Equipo comercial</option>
                    {ADVISORS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Teléfono
                  <input
                    name="phone"
                    defaultValue={c.phone ?? ""}
                    placeholder="Teléfono de ejemplo"
                    maxLength={30}
                  />
                </label>
                <label>
                  Correo electrónico
                  <input
                    name="email"
                    type="email"
                    defaultValue={c.email ?? ""}
                    placeholder="ornek@example.com"
                  />
                </label>
                <label className="full">
                  Nota
                  <textarea
                    name="note"
                    defaultValue={c.note ?? ""}
                    maxLength={1000}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPanel("")}
                >
                  Cancelar
                </button>
                <button className="btn primary" type="submit">
                  <Check size={15} /> Guardar
                </button>
              </div>
            </form>
          )}
          <h3 className="subheading">Historial del contrato</h3>
          <ol className="acct-history">
            {contract.history.map((h, n) => (
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
      )}

      {tab === "Belgeler" && (
        <RecordDocuments
          records={[c.id, `unit:${c.id}`]}
          project={c.project}
          uploadHref={`/documentos?record=${c.id}&project=${c.project}`}
        />
      )}

      {tab === "Historial" && (
        <section className="acct-section">
          <ol className="file-history">
            {fileHistory(state, c.id).map((h, n) => (
              <li
                key={n}
                className={`k-${h.kind === "Contrato" ? "contract" : h.kind === "Cambio" ? "change" : "pay"}`}
              >
                <span className="fh-date">{date(h.date)}</span>
                <span className="fh-dot" />
                <span className="cc-list-main">
                  <b>{h.title}</b>
                  <small>{h.detail}</small>
                </span>
                {h.amount !== undefined && (
                  <span className="cc-amount num positive">
                    +{money(h.amount)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </Drawer>
  );
}

function ReceiptForm({
  label,
  remaining,
  balance,
  onCancel,
  onSubmit,
  simple = false,
}: {
  simple?: boolean;
  label: string;
  remaining: number;
  balance: number;
  onCancel: () => void;
  onSubmit: (amount: number, method: string, reference: string) => void;
}) {
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState("Transferencia bancaria");
  const [reference, setReference] = useState("");
  // Çift tıklama koruması: form bir kez gönderildikten sonra kilitlenir.
  const sent = useRef(false);
  const n = Number(amount);
  const valid =
    Number.isFinite(n) &&
    n > 0 &&
    Math.round(n * 100) <= Math.round(remaining * 100);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return (
    <form
      className="inline-form receipt-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (sent.current) return;
        if (valid && (simple || reference.trim())) {
          sent.current = true;
          onSubmit(n, method, reference);
          // Başarısız işlemde (ör. doğrulama hatası) yeniden denenebilsin
          setTimeout(() => (sent.current = false), 800);
        }
      }}
    >
      <div className="flex-between">
        <h3>Cobro · {label}</h3>
        <button type="button" className="text-button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      <div className="form-grid">
        <label>
          Monto cobrado (USD)
          <input
            type="number"
            min="0.01"
            max={remaining}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </label>
        {!simple && (
          <label>
            Medio de pago
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Transferencia bancaria</option>
              <option>Efectivo</option>
              <option>Tarjeta de crédito</option>
            </select>
          </label>
        )}
        {!simple && (
          <label className="full">
            Comprobante / referencia
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej.: TRF-261115-043 · cuota de noviembre"
              required
              maxLength={120}
            />
          </label>
        )}
      </div>
      <dl className="receipt-effect" aria-live="polite">
        <div>
          <dt>Saldo de esta cuota</dt>
          <dd className="num">{valid ? money(r2(remaining - n)) : "—"}</dd>
        </div>
        <div>
          <dt>Saldo del cliente</dt>
          <dd className="num">
            {valid ? `${money(balance)} → ${money(r2(balance - n))}` : "—"}
          </dd>
        </div>
        <div>
          <dt>Impacto en caja</dt>
          <dd className="num positive">{valid ? `+${money(n)}` : "—"}</dd>
        </div>
      </dl>
      {!valid && amount !== "" && (
        <p className="form-error">
          El monto debe ser mayor que 0 y menor o igual al saldo de {money(remaining)} .
        </p>
      )}
      <div className="form-actions">
        <small className="muted">
          {valid && n < remaining
            ? "Cobro parcial: el saldo queda pendiente en el mismo vencimiento."
            : "La cuota queda cancelada."}
        </small>
        <button
          className="btn primary"
          type="submit"
          disabled={!valid || (!simple && !reference.trim())}
        >
          <Check size={15} />{" "}
          {valid ? `Registrar cobro de ${money(n)}` : "Registrar cobro"}
        </button>
      </div>
    </form>
  );
}
