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
        title="Ödemeler"
        text="Peşinat, taksit ve ara ödemeler. Bir satıra tıklayın; tahsilat formu müşteri dosyasında açılır."
      />
      <p className="scope-note">
        Toplam tahsilat <b>{money(cb.total)}</b> = sisteme geçişten önce tahsil
        edilen <b>{money(cb.prior)}</b> + bu ödeme planları üzerinden tahsil
        edilen <b>{money(cb.inPlan)}</b>. Aşağıdaki “Ödendi” yalnızca ikinci
        kısmı gösterir.
      </p>
      <Panel>
        {ready && <PaymentsTab key={status ?? "all"} initialStatus={status} />}
      </Panel>
    </>
  );
}

const KINDS = ["Satış", "Barter", "İş (taşeron)"] as const;

export function ContractsPage() {
  const { state, project } = useApp();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("Satış");
  const [customer, setCustomer] = useState<string | null>(null);
  const [barter, setBarter] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tur");
    if (t === "barter") setKind("Barter");
    if (t === "is") setKind("İş (taşeron)");
  }, []);
  const barters = state.barters.filter(
    (b) => project === "all" || b.project === project,
  );
  const works = workContracts(state, project);
  const sales = contractList(state).filter(
    (c) => c.status !== "İptal" && (project === "all" || c.project === project),
  ).length;
  const counts: Record<(typeof KINDS)[number], number> = {
    Satış: sales,
    Barter: barters.length,
    "İş (taşeron)": works.length,
  };
  return (
    <>
      <PageHead
        title="Sözleşmeler"
        text="Satış, barter ve iş sözleşmeleri tek yerde. Her sözleşme görüntülenebilir ve yazdırılabilir."
        action={
          <Link className="btn primary" href="/daireler">
            <Plus size={15} /> Yeni satış sözleşmesi
          </Link>
        }
      />
      <Panel>
        <div className="e-tabs" role="tablist" aria-label="Sözleşme türü">
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
        {kind === "Satış" && (
          <ContractsTab project={project} onOpen={setCustomer} />
        )}
        {kind === "Barter" &&
          (barters.length ? (
            <div className="e-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sözleşme / firma</th>
                    <th>Verilen daire</th>
                    <th>Karşılığında iş</th>
                    <th className="numeric">Bedel</th>
                    <th className="numeric">Kalan yükümlülük</th>
                    <th aria-label="İşlem" />
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
                          <Printer size={14} /> Görüntüle
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Bu projede barter sözleşmesi yok" />
          ))}
        {kind === "İş (taşeron)" &&
          (works.length ? (
            <div className="e-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sözleşme / firma</th>
                    <th>İş kapsamı</th>
                    <th className="numeric">Sözleşme bedeli</th>
                    <th className="numeric">Toplam hakediş</th>
                    <th className="numeric">Ödenen / mahsup</th>
                    <th>Barter</th>
                    <th aria-label="İşlem" />
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
                            Bedele oranı %{Math.round((w.hakedisTotal / w.value) * 100)}
                          </small>
                        )}
                      </td>
                      <td className="numeric">
                        {money(w.paid)}
                        {w.offset > 0 && (
                          <small>Barter mahsubu {money(w.offset)}</small>
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
                          <Printer size={14} /> Görüntüle
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Bu projede iş sözleşmesi yok" />
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

const FILTERS = ["Tümü", "Ödemesi geciken", "Düzenli", "Tamamlanan"] as const;

const SORTS = {
  late: "Gecikme tutarı ↓",
  balance: "Kalan borç ↓",
  next: "Sonraki ödeme ↑",
  name: "Müşteri adı A–Z",
} as const;

export function CustomersPage() {
  const { state, project } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tümü");
  const [sort, setSort] = useState<keyof typeof SORTS>("late");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<{ id: string; focus?: string } | null>(null);
  const lateBy = new Map<string, { total: number; focus: string }>();
  for (const r of paymentRows(state).filter((r) => r.status === "Gecikti")) {
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
        (filter === "Tümü" ||
          (filter === "Ödemesi geciken"
            ? lateBy.has(c.id)
            : filter === "Tamamlanan"
              ? c.status === "Tamamlandı"
              : !lateBy.has(c.id) && c.status !== "Tamamlandı")) &&
        `${c.name} ${c.unitLabel} ${c.number}`
          .toLocaleLowerCase("tr")
          .includes(q.toLocaleLowerCase("tr")),
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
            : a.name.localeCompare(b.name, "tr"),
    );
  const totalBalance = all.reduce((a, c) => a + c.account!.balance, 0);
  const totalLate = all.reduce((a, c) => a + lateOf(c.id), 0);
  const PAGE = 15;
  const max = Math.max(0, Math.ceil(rows.length / PAGE) - 1);
  const pg = Math.min(page, max);
  return (
    <>
      <PageHead
        title="Müşteriler"
        text="Her müşteri tek dosyada: daire, sözleşme, ödeme planı, tahsilatlar, belgeler ve geçmiş."
      />
      <p className="scope-note">
        <b>{all.length}</b> müşteri · toplam kalan borç{" "}
        <b>{money(totalBalance)}</b> · gecikmiş{" "}
        <b className={totalLate ? "danger" : ""}>{money(totalLate)}</b> (
        {lateBy.size && all.filter((c) => lateBy.has(c.id)).length} müşteri)
      </p>
      <Panel>
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            placeholder="Müşteri, daire veya sözleşme no…"
          />
          <div className="seg" role="tablist" aria-label="Müşteri durumu">
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
            aria-label="Sıralama"
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
                  <th>Müşteri</th>
                  <th>Daire</th>
                  <th>Ödenen</th>
                  <th className="numeric">Kalan borç</th>
                  <th className="numeric">Gecikmiş</th>
                  <th>Sonraki ödeme</th>
                  <th aria-label="İşlem" />
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
                          : c.status === "Tamamlandı"
                            ? "Tamamlandı"
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
                            Tahsil et
                          </button>
                        ) : (
                          <Badge
                            tone={c.status === "Tamamlandı" ? "info" : "green"}
                          >
                            {c.status === "Tamamlandı"
                              ? "Tamamlandı"
                              : "Düzenli"}
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
          <Empty title="Bu filtrede müşteri yok" />
        )}
        <div className="e-pagination">
          <span>
            {rows.length
              ? `${pg * PAGE + 1}–${Math.min(rows.length, (pg + 1) * PAGE)} / ${rows.length} müşteri`
              : "Kayıt yok"}
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
