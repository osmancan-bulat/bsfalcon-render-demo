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
  const [mode, setMode] = useState<"Aktif" | "Taslak">("Aktif");
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
        error: e instanceof Error ? e.message : "Plan hesaplanamadı.",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, JSON.stringify(spec)]);
  const discount = u.listPrice - num(price);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview.ok) return;
    const paid = mode === "Aktif" ? num(paidNow || "0") : 0;
    const ok = act({
      type: "contract",
      status: mode === "Taslak" ? "Taslak" : undefined,
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
    if (ok) onDone(name.trim(), mode === "Taslak");
  }

  const rows = preview.ok ? preview.rows : [];
  return (
    <form className="sale-form" onSubmit={submit}>
      <div className="sale-unit">
        <div>
          <span className="eyebrow">{p.name}</span>
          <b>
            Daire {u.label} · {u.type}
          </b>
          <small>
            Brüt {u.gross} m² · net {u.net} m² · {u.floorLabel} · {u.facade}
            {u.corner ? " · köşe" : ""}
          </small>
        </div>
        <div className="sale-unit-price">
          <small>Liste fiyatı (temsili)</small>
          <b className="num">{money(u.listPrice)}</b>
          <small>{money(Math.round(u.listPrice / u.gross))} / m²</small>
        </div>
      </div>

      <fieldset>
        <legend>Sözleşme</legend>
        <div className="form-grid">
          <label className="full">
            Müşteri adı (kurgusal)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder="Ad Soyad"
            />
          </label>
          <label>
            Sözleşme bedeli (TL)
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
                ? `Liste fiyatından ${money(discount)} indirim`
                : discount < 0
                  ? `Liste fiyatının ${money(-discount)} üzerinde`
                  : "Liste fiyatı"}
            </small>
          </label>
          <label>
            Sözleşme durumu
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "Aktif" | "Taslak")}
            >
              <option value="Aktif">İmzalandı · hemen aktif</option>
              <option value="Taslak">Taslak · imza bekleyecek</option>
            </select>
            <small className="muted">
              {mode === "Taslak"
                ? "Konut bloke edilir; alacak ve kasa etkisi imzada oluşur."
                : "Alacaklar ve ödeme planı hemen oluşur."}
            </small>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Peşinat</legend>
        {deposits.map((d, n) => (
          <div className="sale-row" key={n}>
            <label>
              {deposits.length > 1 ? `${n + 1}. peşinat (TL)` : "Peşinat (TL)"}
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
              Vade
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
                aria-label={`${n + 1}. peşinatı kaldır`}
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
          <Plus size={14} /> Peşinat parçası ekle
        </button>
        {mode === "Aktif" && (
          <label className="form-label">
            İmzada tahsil edilen peşinat (TL)
            <input
              type="number"
              min="0"
              step="0.01"
              value={paidNow}
              onChange={(e) => setPaidNow(e.target.value)}
            />
            <small className="muted">
              Kalan peşinat parçaları vadesinde Hatırlatma Merkezi ve müşteri
              hesabından tahsil edilir.
            </small>
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend>Taksit planı</legend>
        <div className="form-grid">
          <label>
            Taksit sayısı
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
            İlk taksit tarihi
            <input
              type="date"
              value={firstDue}
              onChange={(e) => setFirstDue(e.target.value)}
              required
            />
            <small className="muted">
              Ödeme günü 1–28 arası; sonraki taksitler aynı gün.
            </small>
          </label>
        </div>
        {interim.map((d, n) => (
          <div className="sale-row three" key={n}>
            <label>
              Ara ödeme açıklaması
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
              Tutar (TL)
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
              Vade
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
              aria-label="Ara ödemeyi kaldır"
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
                label: `Ara ödeme ${interim.length + 1}`,
                amount: "",
                due: addMonths(firstDue, 6 * (interim.length + 1) - 1),
              },
            ])
          }
        >
          <Plus size={14} /> Ara / balon ödeme ekle
        </button>
      </fieldset>

      <section className="sale-preview" aria-live="polite">
        {preview.ok ? (
          <>
            <dl className="sale-totals">
              <div>
                <dt>Peşinat</dt>
                <dd className="num">{money(preview.depositTotal)}</dd>
              </div>
              <div>
                <dt>Ara ödemeler</dt>
                <dd className="num">{money(preview.interimTotal)}</dd>
              </div>
              <div>
                <dt>Taksit</dt>
                <dd className="num">
                  {Number(count) > 1
                    ? `${Number(count) - 1} × ${money(preview.installment)}`
                    : money(preview.lastInstallment)}
                </dd>
                {Number(count) > 1 && (
                  <small>Son taksit {money(preview.lastInstallment)}</small>
                )}
              </div>
              <div className="ok">
                <dt>Plan toplamı</dt>
                <dd className="num">{money(preview.total)}</dd>
                <small>
                  <Check size={12} /> Bedelle kuruşu kuruşuna eşit
                </small>
              </div>
            </dl>
            <div className="e-table-wrap drawer-table">
              <table>
                <thead>
                  <tr>
                    <th>Ödeme</th>
                    <th>Vade</th>
                    <th className="numeric">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {spec.deposits.map((d, n) => (
                    <tr key={`d${n}`} className="acct-interim">
                      <td>
                        {spec.deposits.length > 1
                          ? `${n + 1}. peşinat`
                          : "Peşinat"}
                      </td>
                      <td>{date(d.due)}</td>
                      <td className="numeric">{money(d.amount)}</td>
                    </tr>
                  ))}
                  {(showAll ? rows : rows.slice(0, 6)).map((r) => (
                    <tr
                      key={r.seq}
                      className={r.kind === "Ara ödeme" ? "acct-interim" : ""}
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
                  ? "Planı daralt"
                  : `Tüm ${rows.length} ödeme satırını göster`}
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
          {mode === "Taslak"
            ? "Sözleşme taslağını kaydet"
            : "Sözleşmeyi ve ödeme planını kaydet"}
        </button>
      </div>
    </form>
  );
}
