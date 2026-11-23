"use client";
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
      eyebrow="İMZA SÜRECİNDEKİ SÖZLEŞME"
      onClose={onClose}
      wide
    >
      <dl className="file-summary">
        <div>
          <dt>Proje</dt>
          <dd>{pname(d.project)}</dd>
        </div>
        <div>
          <dt>Blok · kat · daire</dt>
          <dd>
            {u ? unitPlace(d.id) : d.unit} <small>kod {d.unit}</small>
          </dd>
        </div>
        <div>
          <dt>Tip · alan</dt>
          <dd>
            {u?.type} · {u?.gross}/{u?.net} m²
          </dd>
        </div>
        <div>
          <dt>Cephe</dt>
          <dd>{u?.facade}</dd>
        </div>
        <div>
          <dt>Durum</dt>
          <dd>{meta.status}</dd>
        </div>
      </dl>

      <div className="acct-head">
        <div className="acct-figures">
          <div>
            <span>Sözleşme bedeli</span>
            <b className="num">{money(d.price)}</b>
            <small>
              {d.listPrice && d.listPrice > d.price
                ? `Liste ${money(d.listPrice)} · indirim ${money(d.listPrice - d.price)}`
                : "Liste fiyatı"}
            </small>
          </div>
          <div>
            <span>Anlaşmalı peşinat</span>
            <b className="num">{money(d.depositExpected ?? 0)}</b>
            <small>{d.plan?.deposits.length ?? 1} parça</small>
          </div>
          <div>
            <span>Taksit</span>
            <b className="num">
              {sch ? `${d.plan!.count} × ${money(sch.installment)}` : "—"}
            </b>
            <small>İlk vade {d.plan ? date(d.plan.firstDue) : "—"}</small>
          </div>
          <div>
            <span>Finansal etki</span>
            <b className="num">Yok</b>
            <small>Alacak ve kasa imza ile oluşur</small>
          </div>
        </div>
        <div className="acct-actions">
          <Badge tone={meta.status === "Taslak" ? "neutral" : "amber"}>
            {meta.status}
          </Badge>
          <span className="acct-plan">
            Konut bu sözleşme için bloke edildi; başka satış veya barter
            yapılamaz.
          </span>
          <Link
            className="btn compact"
            href={`/belge/?tur=sozlesme&id=${d.id}`}
            target="_blank"
          >
            <Printer size={14} /> Sözleşme özeti
          </Link>
        </div>
      </div>

      {mode === "" && (
        <div className="draft-cta">
          {meta.status === "Taslak" && (
            <button
              className="btn"
              onClick={() =>
                act({
                  type: "contract-status",
                  id: d.id,
                  status: "İmza bekliyor",
                })
              }
            >
              <Send size={15} /> İmzaya gönder
            </button>
          )}
          <button className="btn danger" onClick={() => setMode("cancel")}>
            <X size={15} /> Taslağı iptal et
          </button>
          <button className="btn primary" onClick={() => setMode("sign")}>
            <PenLine size={15} /> İmzayı kaydet
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
            <ShieldCheck size={16} /> İmzayı onayla
          </h3>
          <label className="form-label">
            İmzada tahsil edilen peşinat (TL)
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
              Sözleşme <b>Aktif</b> olur;{" "}
              {sch
                ? `${d.plan!.count} taksit${d.plan!.interim.length ? ` ve ${d.plan!.interim.length} ara ödeme` : ""}`
                : "ödeme planı"}{" "}
              alacak olarak oluşur.
            </li>
            <li>
              Proje kasasına <b>{validPaid ? money(paidN) : "—"}</b> peşinat
              girer
              {validPaid && paidN < (d.depositExpected ?? 0)
                ? `; kalan ${money((d.depositExpected ?? 0) - paidN)} peşinat vadesinde izlenir`
                : ""}
              .
            </li>
            <li>
              Bu işlem geri alınamaz; aktif sözleşme yalnızca fesih süreciyle
              kapatılabilir.
            </li>
          </ul>
          {!validPaid && (
            <p className="form-error">
              Peşinat 0 ile {money(d.depositExpected ?? 0)} arasında olmalı.
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setMode("")}>
              Vazgeç
            </button>
            <button className="btn primary" type="submit" disabled={!validPaid}>
              <PenLine size={15} /> İmzalandı olarak kaydet
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
          <h3>Taslağı iptal et</h3>
          <label className="form-label">
            İptal gerekçesi
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={120}
              placeholder="Örn. müşteri vazgeçti"
              autoFocus
            />
          </label>
          <p className="muted">
            Konut yeniden satışa açılır. Taslağın finansal etkisi olmadığı için
            kasa ve alacak değişmez.
          </p>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setMode("")}>
              Vazgeç
            </button>
            <button
              className="btn danger"
              type="submit"
              disabled={!reason.trim()}
            >
              Taslağı iptal et
            </button>
          </div>
        </form>
      )}

      <section className="acct-section">
        <h3>Planlanan ödeme takvimi</h3>
        {sch ? (
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
                {d.plan!.deposits.map((p, n) => (
                  <tr key={`d${n}`} className="acct-interim">
                    <td>
                      {d.plan!.deposits.length > 1
                        ? `${n + 1}. peşinat`
                        : "Peşinat"}
                    </td>
                    <td>{date(p.due)}</td>
                    <td className="numeric">{money(p.amount)}</td>
                  </tr>
                ))}
                {sch.rows.slice(0, 6).map((r) => (
                  <tr
                    key={r.seq}
                    className={r.kind === "Ara ödeme" ? "acct-interim" : ""}
                  >
                    <td>{r.label}</td>
                    <td>{date(r.due)}</td>
                    <td className="numeric">{money(r.amount)}</td>
                  </tr>
                ))}
                {sch.rows.length > 6 && (
                  <tr>
                    <td colSpan={3} className="muted">
                      … ve {sch.rows.length - 6} ödeme daha · plan toplamı{" "}
                      {money(sch.total)} (bedelle kuruşu kuruşuna eşit)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Bu taslakta ödeme planı tanımlı değil.</p>
        )}
      </section>

      <section className="acct-section">
        <h3>Sözleşme geçmişi</h3>
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
