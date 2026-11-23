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
  Gecikti: "red",
  Yaklaşıyor: "amber",
  "Kısmen ödendi": "info",
  "Gelecek dönem": "neutral",
  Ödendi: "green",
};
const HINT: Record<PaymentStatus, string> = {
  Gecikti: "Vadesi geçmiş, kalan var",
  Yaklaşıyor: "30 gün içinde",
  "Kısmen ödendi": "Vadesi gelmemiş, kısmi",
  "Gelecek dönem": "30 günden sonra",
  Ödendi: "Bu planlarda tahsil edilen · kısmi dahil",
};
const PAGE = 15;
const relative = (r: PaymentRow) =>
  r.status === "Ödendi"
    ? "Kapandı"
    : r.days < 0
      ? `${-r.days} gün gecikti`
      : r.days === 0
        ? "Bugün"
        : `${r.days} gün kaldı`;

export default function PaymentsTab({
  initialStatus,
}: {
  initialStatus?: PaymentStatus;
}) {
  const { state, project } = useApp();
  const [status, setStatus] = useState<PaymentStatus | "Açık">(
    initialStatus ?? "Açık",
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
      // "Ödendi": bu planlar üzerinden tahsil edilen tüm tutar (kısmi ödemeler dahil) = collectionBreakdown().inPlan
      amount:
        s === "Ödendi"
          ? all.reduce((a, r) => a + r.paid, 0)
          : rows.reduce((a, r) => a + r.remaining, 0),
    };
  });
  const rows = all
    .filter((r) =>
      status === "Açık" ? r.status !== "Ödendi" : r.status === status,
    )
    .filter((r) => kind === "all" || r.kind === kind)
    .filter((r) => {
      const c = names.get(r.customerId);
      return `${c?.name} ${c?.unit} ${contractNumber(r.customerId)}`
        .toLocaleLowerCase("tr")
        .includes(q.toLocaleLowerCase("tr"));
    })
    .sort((a, b) =>
      status === "Ödendi"
        ? b.due.localeCompare(a.due)
        : a.due.localeCompare(b.due),
    );
  const max = Math.max(0, Math.ceil(rows.length / PAGE) - 1);
  const pg = Math.min(page, max);

  return (
    <>
      <div className="pay-status" role="tablist" aria-label="Ödeme durumu">
        {totals.map((t) => (
          <button
            key={t.s}
            role="tab"
            aria-selected={status === t.s}
            className={`pay-chip t-${TONE[t.s]} ${status === t.s ? "active" : ""}`}
            onClick={() => setStatus(status === t.s ? "Açık" : t.s)}
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
          placeholder="Müşteri, daire veya sözleşme no…"
        />
        <select
          aria-label="Ödeme türü"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">Tüm ödeme türleri</option>
          <option>Peşinat</option>
          <option>Taksit</option>
          <option>Ara ödeme</option>
        </select>
        {status !== "Açık" && (
          <button
            className="btn compact ghost"
            onClick={() => setStatus("Açık")}
          >
            Tüm açık ödemeler
          </button>
        )}
        <button
          className="btn compact"
          style={{ marginLeft: "auto" }}
          onClick={() =>
            csvDownload(
              [
                [
                  "Vade",
                  "Müşteri",
                  "Daire",
                  "Sözleşme",
                  "Ödeme",
                  "Tutar",
                  "Ödenen",
                  "Kalan",
                  "Durum",
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
              "bsfalcon-odeme-takibi.csv",
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
                <th>Vade</th>
                <th>Müşteri / daire</th>
                <th>Ödeme</th>
                <th className="numeric">Tutar</th>
                <th className="numeric">Ödenen</th>
                <th className="numeric">Kalan</th>
                <th>Durum</th>
                <th aria-label="İşlem" />
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
                        focus: r.status === "Ödendi" ? undefined : focus,
                      })
                    }
                  >
                    <td>
                      <b>{date(r.due)}</b>
                      <small className={r.status === "Gecikti" ? "danger" : ""}>
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
                      {r.status !== "Ödendi" && (
                        <button
                          className="btn compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen({ id: r.customerId, focus });
                          }}
                        >
                          Tahsil et
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
          title="Bu filtrede ödeme yok"
          detail="Durum veya arama filtresini değiştirin."
        />
      )}
      <div className="e-pagination">
        <span>
          {rows.length
            ? `${pg * PAGE + 1}–${Math.min(rows.length, (pg + 1) * PAGE)} / ${rows.length} ödeme`
            : "Kayıt yok"}{" "}
          · kalan toplam {money(rows.reduce((a, r) => a + r.remaining, 0))}
        </span>
        <div>
          <button
            aria-label="Önceki sayfa"
            disabled={pg === 0}
            onClick={() => setPage(pg - 1)}
          >
            ‹
          </button>
          <button
            aria-label="Sonraki sayfa"
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
