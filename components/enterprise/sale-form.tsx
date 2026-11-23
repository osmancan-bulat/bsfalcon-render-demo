"use client";
// Yeni satış sözleşmesi: kademeli peşinat, esnek vade, ara ödemeler ve canlı ödeme planı önizlemesi.
import { useMemo, useState } from "react";
import { Plus, Trash2, Check, FileSignature } from "lucide-react";
import { useApp } from "./context";
import { SNAPSHOT, projects } from "@/lib/enterprise";
import { buildSchedule, addMonths, type PlanSpec } from "@/lib/plan";
import { unitById } from "@/lib/units";
import { money, date } from "@/lib/data";

type Row = { amount: string; due: string };
type Interim = Row & { label: string };
const num = (v: string) =>
  v.trim() === "" ? NaN : Number(v.replace(",", "."));

export default function NewSaleForm({
  unitId,
  onDone,
}: {
  unitId: string;
  onDone: (name: string, draft: boolean) => void;
}) {
  const { act } = useApp();
  const u = unitById(unitId)!;
  const p = projects.find((p) => p.id === u.project)!;
  const [name, setName] = useState("");
  const [price, setPrice] = useState(String(u.listPrice));
  // Önerilen peşinat: liste fiyatının yaklaşık %25'i (50.000 TL'ye yuvarlı); kullanıcı değiştirebilir.
  const suggested = String(Math.max(0, Math.round((u.listPrice * 0.25) / 50000) * 50000));
  const [deposits, setDeposits] = useState<Row[]>([
    { amount: suggested, due: SNAPSHOT },
  ]);
  const [count, setCount] = useState("36");
  const [firstDue, setFirstDue] = useState("2026-12-15");
  const [interim, setInterim] = useState<Interim[]>([]);
  const [mode, setMode] = useState<"Activo" | "Borrador">("Activo");
  const [paidNow, setPaidNow] = useState(suggested);
  const [showAll, setShowAll] = useState(false);

  const spec: PlanSpec = {
    deposits: deposits.map((d) => ({ amount: num(d.amount), due: d.due })),
    count: Number(count),
    firstDue,
    interim: interim.map((i) => ({
      amount: num(i.amount),
      due: i.due,
      label: i.label,
    })),
  };
  const preview = useMemo(() => {
    try {
      return { ok: true as const, ...buildSchedule(num(price), spec) };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "No se pudo calcular el plan.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, JSON.stringify(spec)]);
  const discount = u.listPrice - num(price);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview.ok) return;
    const paid = mode === "Activo" ? num(paidNow || "0") : 0;
    const ok = act({
      type: "contract",
      status: mode === "Borrador" ? "Borrador" : undefined,
      record: {
        id: u.id,
        project: u.project,
        name: name.trim(),
        unit: u.label,
        price: num(price),
        deposit: Number.isFinite(paid) ? paid : 0,
        depositExpected: preview.depositTotal,
        depositDue: spec.deposits[0]?.due,
        depositDate: paid > 0 ? SNAPSHOT : undefined,
        installment: preview.installment,
        paidMonths: 0,
        plan: spec,
        listPrice: u.listPrice,
      },
    });
    if (ok) onDone(name.trim(), mode === "Borrador");
  }

  const rows = preview.ok ? preview.rows : [];
  return (
    <form className="sale-form" onSubmit={submit}>
      <div className="sale-unit">
        <div>
          <span className="eyebrow">{p.name}</span>
          <b>
            Unidad {u.label} · {u.type}
          </b>
          <small>
            Bruto {u.gross} m² · {u.net} m² · {u.floorLabel} · {u.facade}
            {u.corner ? "· esquina" : ""}
          </small>
        </div>
        <div className="sale-unit-price">
          <small>Precio de lista (ejemplo)</small>
          <b className="num">{money(u.listPrice)}</b>
          <small>{money(Math.round(u.listPrice / u.gross))} / m²</small>
        </div>
      </div>

      <fieldset>
        <legend>Contrato</legend>
        <div className="form-grid">
          <label className="full">
            Nombre del cliente (ficticio)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder="Ad Soyad"
            />
          </label>
          <label>
            Precio del contrato (USD)
            <input
              type="number"
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <small className={discount > 0 ? "warning" : "muted"}>
              {discount > 0
                ? `Descuento de ${money(discount)} sobre el precio de lista`
                : discount < 0
                  ? `${money(-discount)} por encima del precio de lista`
                  : "Precio de lista"}
            </small>
          </label>
          <label>
            Estado del contrato
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "Activo" | "Borrador")}
            >
              <option value="Activo">Firmado · activo de inmediato</option>
              <option value="Borrador">Borrador · pendiente de firma</option>
            </select>
            <small className="muted">
              {mode === "Borrador"
                ? "La unidad queda bloqueada; la cuenta por cobrar y la caja se generan en la firma."
                : "Las cuentas por cobrar y el plan de pagos se generan de inmediato."}
            </small>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Anticipo</legend>
        {deposits.map((d, n) => (
          <div className="sale-row" key={n}>
            <label>
              {deposits.length > 1 ? `Anticipo ${n + 1} (USD)` : "Anticipo (USD)"}
              <input
                type="number"
                min="0"
                step="0.01"
                value={d.amount}
                onChange={(e) =>
                  setDeposits(
                    deposits.map((x, i) =>
                      i === n ? { ...x, amount: e.target.value } : x,
                    ),
                  )
                }
                required
              />
            </label>
            <label>
              Vencimiento
              <input
                type="date"
                value={d.due}
                onChange={(e) =>
                  setDeposits(
                    deposits.map((x, i) =>
                      i === n ? { ...x, due: e.target.value } : x,
                    ),
                  )
                }
                required
              />
            </label>
            {deposits.length > 1 && (
              <button
                type="button"
                className="icon-button"
                aria-label={`Quitar anticipo ${n + 1}`}
                onClick={() => setDeposits(deposits.filter((_, i) => i !== n))}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn compact ghost"
          onClick={() =>
            setDeposits([
              ...deposits,
              {
                amount: "",
                due: addMonths(deposits.at(-1)?.due ?? SNAPSHOT, 1),
              },
            ])
          }
        >
          <Plus size={14} /> Agregar parte de anticipo
        </button>
        {mode === "Activo" && (
          <label className="form-label">
            Anticipo cobrado en la firma (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={paidNow}
              onChange={(e) => setPaidNow(e.target.value)}
            />
            <small className="muted">
              Las partes restantes del anticipo se cobran a su vencimiento desde la Agenda o la ficha del cliente.
            </small>
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Plan de cuotas</legend>
        <div className="form-grid">
          <label>
            Cantidad de cuotas
            <input
              type="number"
              min="1"
              max="120"
              step="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
            />
          </label>
          <label>
            Fecha de la primera cuota
            <input
              type="date"
              value={firstDue}
              onChange={(e) => setFirstDue(e.target.value)}
              required
            />
            <small className="muted">
              Día de pago entre 1 y 28; las cuotas siguientes vencen el mismo día.
            </small>
          </label>
        </div>
        {interim.map((d, n) => (
          <div className="sale-row three" key={n}>
            <label>
              Descripción del pago intermedio
              <input
                value={d.label}
                onChange={(e) =>
                  setInterim(
                    interim.map((x, i) =>
                      i === n ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
                required
                maxLength={60}
              />
            </label>
            <label>
              Monto (USD)
              <input
                type="number"
                min="1"
                step="0.01"
                value={d.amount}
                onChange={(e) =>
                  setInterim(
                    interim.map((x, i) =>
                      i === n ? { ...x, amount: e.target.value } : x,
                    ),
                  )
                }
                required
              />
            </label>
            <label>
              Vencimiento
              <input
                type="date"
                value={d.due}
                onChange={(e) =>
                  setInterim(
                    interim.map((x, i) =>
                      i === n ? { ...x, due: e.target.value } : x,
                    ),
                  )
                }
                required
              />
            </label>
            <button
              type="button"
              className="icon-button"
              aria-label="Quitar pago intermedio"
              onClick={() => setInterim(interim.filter((_, i) => i !== n))}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn compact ghost"
          onClick={() =>
            setInterim([
              ...interim,
              {
                label: `Pago intermedio ${interim.length + 1}`,
                amount: "",
                due: addMonths(firstDue, 6 * (interim.length + 1) - 1),
              },
            ])
          }
        >
          <Plus size={14} /> Agregar pago intermedio / refuerzo
        </button>
      </fieldset>

      <section className="sale-preview" aria-live="polite">
        {preview.ok ? (
          <>
            <dl className="sale-totals">
              <div>
                <dt>Anticipo</dt>
                <dd className="num">{money(preview.depositTotal)}</dd>
              </div>
              <div>
                <dt>Pagos intermedios</dt>
                <dd className="num">{money(preview.interimTotal)}</dd>
              </div>
              <div>
                <dt>Cuota</dt>
                <dd className="num">
                  {Number(count) > 1
                    ? `${Number(count) - 1} × ${money(preview.installment)}`
                    : money(preview.lastInstallment)}
                </dd>
                {Number(count) > 1 && (
                  <small>Última cuota {money(preview.lastInstallment)}</small>
                )}
              </div>
              <div className="ok">
                <dt>Total del plan</dt>
                <dd className="num">{money(preview.total)}</dd>
                <small>
                  <Check size={12} /> Igual al precio, al centavo
                </small>
              </div>
            </dl>
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
                  {spec.deposits.map((d, n) => (
                    <tr key={`d${n}`} className="acct-interim">
                      <td>
                        {spec.deposits.length > 1
                          ? `Anticipo ${n + 1}`
                          : "Anticipo"}
                      </td>
                      <td>{date(d.due)}</td>
                      <td className="numeric">{money(d.amount)}</td>
                    </tr>
                  ))}
                  {(showAll ? rows : rows.slice(0, 6)).map((r) => (
                    <tr
                      key={r.seq}
                      className={r.kind === "Pago intermedio" ? "acct-interim" : ""}
                    >
                      <td>{r.label}</td>
                      <td>{date(r.due)}</td>
                      <td className="numeric">{money(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 6 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? "Contraer plan"
                  : `Ver los ${rows.length} vencimientos`}
              </button>
            )}
          </>
        ) : (
          <p className="callout">{preview.error}</p>
        )}
      </section>

      <div className="form-actions sticky">
        <button
          className="btn primary"
          type="submit"
          disabled={!preview.ok || !name.trim()}
        >
          <FileSignature size={15} />{" "}
          {mode === "Borrador"
            ? "Guardar borrador de contrato"
            : "Guardar contrato y plan de pagos"}
        </button>
      </div>
    </form>
  );
}
