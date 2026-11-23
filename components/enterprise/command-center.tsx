"use client";
// Proje ana ekranı. İlk bakışta yalnızca: geciken ödemeler, yaklaşan ödemeler, bekleyen sözleşmeler,
// bugün yapılacaklar ve hızlı işlemler. Finansal özet ikinci sırada; daire haritası, sözleşme listesi
// ve inşaat programı kendi bölümlerinde (Daireler, Sözleşmeler, Şantiye).
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  Handshake,
  Printer,
  Plus,
  ReceiptText,
  TriangleAlert,
  Wallet,
  FileSignature,
  CalendarClock,
  BellRing,
  CircleCheck,
} from "lucide-react";
import { useApp } from "./context";
import { Badge, Empty, Progress } from "./shared";
import CustomerPanel from "./customer-panel";
import DraftPanel from "./draft-panel";
import RequestPanel from "./request-panel";
import { BarterDrawer } from "./barter";
import {
  SNAPSHOT,
  projects,
  summary,
  contractList,
  customerList,
  requestList,
  requestStatus,
  netPayable,
  barterOffset,
  paymentRows,
  agenda,
  collectionBreakdown,
  type ContractView,
  type AgendaItem,
} from "@/lib/enterprise";
import { units, unitShort } from "@/lib/units";
import { money, compact, date } from "@/lib/data";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const CONTRACT_TONE: Record<string, string> = {
  Aktif: "green",
  Tamamlandı: "info",
  Taslak: "neutral",
  "İmza bekliyor": "amber",
  İptal: "red",
};
const AGENDA_ICON: Record<AgendaItem["kind"], ReactNode> = {
  Peşinat: <Wallet size={13} />,
  Taksit: <CalendarClock size={13} />,
  Sözleşme: <FileSignature size={13} />,
  Hakediş: <ReceiptText size={13} />,
  Barter: <Handshake size={13} />,
  Hatırlatma: <BellRing size={13} />,
};

type Open =
  | { type: "customer"; id: string; focus?: string }
  | { type: "draft"; id: string }
  | { type: "request"; id: string }
  | { type: "barter"; id: string }
  | null;

export default function CommandCenter({ projectId }: { projectId: string }) {
  const { state } = useApp();
  const p = projects.find((p) => p.id === projectId)!;
  const [open, setOpen] = useState<Open>(null);
  const [allTasks, setAllTasks] = useState(false);

  const d = useMemo(() => {
    const s = summary(state, projectId);
    const contracts = contractList(state).filter(
      (c) => c.project === projectId,
    );
    const names = new Map(customerList(state).map((c) => [c.id, c]));
    const pays = paymentRows(state).filter((r) => r.project === projectId);
    const lateRows = pays.filter((r) => r.status === "Gecikti");
    const lateBy = new Map<
      string,
      {
        total: number;
        count: number;
        oldest: string;
        focus: string;
        deposit: boolean;
      }
    >();
    for (const r of lateRows) {
      const cur = lateBy.get(r.customerId);
      if (!cur)
        lateBy.set(r.customerId, {
          total: r.remaining,
          count: 1,
          oldest: r.due,
          focus: r.installmentId ?? "deposit",
          deposit: r.kind === "Peşinat",
        });
      else {
        cur.total += r.remaining;
        cur.count++;
      }
    }
    const late = [...lateBy.entries()].sort((a, b) =>
      a[1].oldest.localeCompare(b[1].oldest),
    );
    const upcoming = pays.filter(
      (r) => r.remaining > 0 && r.days >= 0 && r.days <= 30,
    );
    const requests = requestList(state).filter((r) => r.project === projectId);
    const awaiting = requests.filter(
      (r) => requestStatus(state, r) === "Onay bekliyor",
    );
    const approved = requests.filter(
      (r) => requestStatus(state, r) === "Onaylandı",
    );
    const barters = state.barters.filter((b) => b.project === projectId);
    const sameFirm = (a: string, b: string) =>
      a.trim().toLocaleLowerCase("tr") === b.trim().toLocaleLowerCase("tr");
    const offsetChance = approved
      .filter((r) => r.type === "Hakediş")
      .map((r) => ({
        r,
        b: barters.find(
          (b) =>
            sameFirm(b.company, r.company) &&
            b.amount - barterOffset(state, b.id) > 0,
        ),
      }))
      .filter((x) => x.b);
    const drafts = contracts.filter(
      (c) => c.status === "Taslak" || c.status === "İmza bekliyor",
    );
    // Yaklaşan ödemeler: önümüzdeki 14 gün, aynı gün vadeli taksitler tek satırda
    const soon = agenda(state, projectId, 30).filter(
      (a) => a.kind === "Peşinat" || a.kind === "Taksit",
    );
    const grouped: (AgendaItem & { group?: number })[] = [];
    for (const a of soon) {
      if (a.kind !== "Taksit") {
        grouped.push(a);
        continue;
      }
      const same = soon.filter((x) => x.kind === "Taksit" && x.date === a.date);
      if (same.length === 1) grouped.push(a);
      else if (same[0] === a)
        grouped.push({
          ...a,
          id: `grp-${a.date}`,
          title: `${same.length} taksit`,
          detail:
            same
              .slice(0, 2)
              .map((x) => x.title.split(" · ")[0])
              .join(", ") + (same.length > 2 ? ` +${same.length - 2}` : ""),
          amount: same.reduce((s, x) => s + (x.amount ?? 0), 0),
          group: same.length,
        });
    }
    return {
      s,
      contracts,
      names,
      late,
      lateRows,
      upcoming,
      awaiting,
      offsetChance,
      drafts,
      grouped,
      reminders: state.reminders.filter(
        (r) => r.project === projectId && !r.done,
      ),
    };
  }, [state, projectId]);

  const {
    s,
    names,
    late,
    lateRows,
    upcoming,
    awaiting,
    offsetChance,
    drafts,
    grouped,
  } = d;
  const cb = collectionBreakdown(state, projectId);
  const lateTotal = lateRows.reduce((a, r) => a + r.remaining, 0);
  const upcomingTotal = upcoming.reduce((a, r) => a + r.remaining, 0);

  // Her satır: kim · nerede · ne yapılmalı · ne zaman · tutar · işlem.
  type Task = {
    key: string;
    tone: string;
    icon: ReactNode;
    who: string;
    where: string;
    what: string;
    when: string;
    amount?: number;
    action: string;
    run: () => void;
  };
  const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const rowName = (r: (typeof lateRows)[number]) =>
    r.kind === "Peşinat"
      ? r.label === "Peşinat"
        ? "peşinat"
        : `peşinat (${r.label.replace(". peşinat", ". parça")})`
      : r.kind === "Ara ödeme"
        ? "ara ödeme"
        : `${MONTHS[Number(r.due.slice(5, 7)) - 1]} taksiti`;
  const tasks: Task[] = [
    ...late.map(([id, v]) => {
      const c = names.get(id);
      const rows = lateRows.filter((r) => r.customerId === id);
      const lateDays = -Math.min(...rows.map((r) => r.days));
      return {
        key: `late-${id}`,
        tone: "danger",
        icon: <TriangleAlert size={16} />,
        who: c?.name ?? "",
        where: unitShort(id),
        what:
          rows.length === 1
            ? `Geciken ${rowName(rows[0])}`
            : `${rows.length} geciken ödeme · en eskisi ${rowName(rows[0])}`,
        when: `${lateDays} gün gecikti`,
        amount: v.total,
        action: "Tahsilatı görüntüle",
        run: () => setOpen({ type: "customer", id, focus: v.focus }),
      };
    }),
    ...drafts.map((c) => {
      const d = state.drafts.find((x) => x.id === c.id);
      const first = d?.plan?.deposits[0];
      return {
        key: `draft-${c.id}`,
        tone: "warning",
        icon: <FileSignature size={16} />,
        who: c.name,
        where: unitShort(c.id),
        what:
          c.status === "İmza bekliyor"
            ? `${c.number} imza bekliyor · imzada ilk peşinat`
            : `${c.number} taslak · imzaya gönderilmedi`,
        when: first ? `peşinat vadesi ${date(first.due)}` : "",
        amount: first?.amount ?? d?.depositExpected,
        action: c.status === "İmza bekliyor" ? "Sözleşmeyi aç" : "Taslağı incele",
        run: () => setOpen({ type: "draft", id: c.id }),
      };
    }),
    ...awaiting.map((r) => ({
      key: `req-${r.id}`,
      tone: "info",
      icon: <ReceiptText size={16} />,
      who: r.company,
      where: `Hakediş ${r.id}`,
      what: `${r.name} · onay bekliyor`,
      when: `vade ${date(r.due)}`,
      amount: r.amount,
      action: "İncele ve onayla",
      run: () => setOpen({ type: "request", id: r.id }),
    })),
    ...offsetChance.map(({ r, b }) => ({
      key: `off-${r.id}`,
      tone: "bronze",
      icon: <Handshake size={16} />,
      who: r.company,
      where: `Barter ${b!.id} · ${unitShort(b!.unitId)}`,
      what: `${r.id} hakedişi barter bakiyesinden mahsup edilebilir`,
      when: `vade ${date(r.due)}`,
      amount: netPayable(state, r),
      action: "Mahsubu görüntüle",
      run: () => setOpen({ type: "barter", id: b!.id }),
    })),
  ];
  const shownTasks = allTasks ? tasks : tasks.slice(0, 6);
  const draftValue = drafts.reduce((a, c) => a + c.price, 0);

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <span className="eyebrow">{date(SNAPSHOT)}</span>
          <h1>{p.name}</h1>
          <p>
            {p.location} · {p.total} daire{p.delivery ? ` · teslim ${p.delivery}` : ""}
          </p>
        </div>
        <nav className="quick-actions" aria-label="Hızlı işlemler">
          <Link className="btn primary" href="/odemeler?durum=Gecikti">
            <Wallet size={15} /> Tahsilat kaydet
          </Link>
          <Link className="btn" href="/daireler">
            <Plus size={15} /> Yeni satış
          </Link>
          <Link className="btn" href="/barter">
            <Handshake size={15} /> Barter
          </Link>
          <Link
            className="btn ghost"
            href={`/belge/?tur=proje&project=${projectId}`}
            target="_blank"
            aria-label="Yönetici raporu"
          >
            <Printer size={15} />
          </Link>
        </nav>
      </header>

      <section className="status-tiles" aria-label="Öncelikli durum">
        <Link
          href="/odemeler?durum=Gecikti"
          className={`status-tile ${lateTotal > 0 ? "danger" : ""}`}
        >
          <span>Geciken ödemeler</span>
          <strong className="num">{money(lateTotal)}</strong>
          <small>
            {late.length} müşteri · {lateRows.length} ödeme{" "}
            <ArrowRight size={13} />
          </small>
        </Link>
        <Link href="/odemeler?durum=Yaklaşıyor" className="status-tile">
          <span>Önümüzdeki 30 gün</span>
          <strong className="num">{compact(upcomingTotal)}</strong>
          <small>
            {upcoming.length} ödeme bekleniyor <ArrowRight size={13} />
          </small>
        </Link>
        <Link
          href="/sozlesmeler"
          className={`status-tile ${drafts.length ? "warning" : ""}`}
        >
          <span>Bekleyen sözleşmeler</span>
          <strong className="num">{drafts.length}</strong>
          <small>
            {drafts.length
              ? `${compact(draftValue)} · imza süreci`
              : "İmza bekleyen yok"}{" "}
            <ArrowRight size={13} />
          </small>
        </Link>
      </section>

      <div className="home-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Bugün yapılacaklar</h2>
            <Badge tone={tasks.length ? "amber" : "green"}>
              {tasks.length || "Tamam"}
            </Badge>
          </div>
          {tasks.length ? (
            <ul className="cc-actions">
              {shownTasks.map((t) => (
                <li key={t.key}>
                  <button onClick={t.run}>
                    <span className={`cc-task-icon t-${t.tone}`}>{t.icon}</span>
                    <span className="cc-list-main cc-task-main">
                      <b>{t.who}</b>
                      <small>{t.where}</small>
                      <span className="cc-task-what">{t.what}</span>
                    </span>
                    <span className="cc-task-figures">
                      {t.amount !== undefined && (
                        <span
                          className={`cc-amount num ${t.tone === "danger" ? "danger" : ""}`}
                        >
                          {money(t.amount)}
                        </span>
                      )}
                      {t.when && (
                        <small
                          className={t.tone === "danger" ? "cc-when late" : "cc-when"}
                        >
                          {t.when}
                        </small>
                      )}
                    </span>
                    <span className="cc-action-label">
                      {t.action} <ChevronRight size={14} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="cc-allclear">
              <CircleCheck size={20} /> Bugün için bekleyen işlem yok.
            </div>
          )}
          {tasks.length > 6 && (
            <button className="cc-more" onClick={() => setAllTasks(!allTasks)}>
              {allTasks ? "Daha az göster" : `${tasks.length - 6} işlem daha`}
            </button>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Yaklaşan ödemeler · 30 gün</h2>
            <Link className="e-text-link" href="/odemeler?durum=Yaklaşıyor">
              Tümü <ChevronRight size={13} />
            </Link>
          </div>
          <ul className="cc-agenda">
            {grouped.slice(0, 7).map((a) => (
              <li key={a.id}>
                <button
                  onClick={() =>
                    "group" in a && a.group
                      ? (location.href = "/odemeler?durum=Yaklaşıyor")
                      : a.ref.type === "customer" &&
                        setOpen({
                          type: "customer",
                          id: a.ref.id,
                          focus: a.ref.focus,
                        })
                  }
                >
                  <span className="cc-date">
                    <b>{new Date(a.date + "T12:00:00").getDate()}</b>
                    <small>
                      {new Date(a.date + "T12:00:00").toLocaleDateString(
                        "tr-TR",
                        { month: "short" },
                      )}
                    </small>
                  </span>
                  <span className="cc-list-main">
                    <b>{a.title}</b>
                    <small>
                      <span className="cc-kind">
                        {AGENDA_ICON[a.kind]} {a.kind}
                      </span>{" "}
                      · {a.detail}
                    </small>
                  </span>
                  <span className="cc-amount num">{money(a.amount ?? 0)}</span>
                </button>
              </li>
            ))}
            {!grouped.length && <Empty title="30 gün içinde ödeme yok" />}
          </ul>
        </section>
      </div>

      <section className="home-finance" aria-label="Finansal durum">
        <h2>Finansal durum</h2>
        <dl>
          <div>
            <dt>Tahsil edilen</dt>
            <dd className="num">{compact(s.collected)}</dd>
            <Progress value={pct(s.collected, s.revenue)} />
            <small>Sisteme geçiş öncesi {compact(cb.prior)} dahil</small>
          </div>
          <div>
            <dt>Kalan alacak</dt>
            <dd className="num">{compact(s.balance)}</dd>
            <small>{compact(s.revenue)} sözleşme değeri</small>
          </div>
          <div>
            <dt>Proje kasası</dt>
            <dd className="num">{compact(s.cash)}</dd>
            <small>{money(s.payable)} onaylı ödeme bekliyor</small>
          </div>
          <div>
            <dt>Satış</dt>
            <dd className="num">
              {s.sold} / {s.total}
            </dd>
            <small>
              {s.barterCount} barter · {s.reserved} rezerve
            </small>
          </div>
        </dl>
        <Link className="e-text-link" href="/finans">
          Finans ayrıntısı <ChevronRight size={13} />
        </Link>
      </section>

      {open?.type === "customer" && (
        <CustomerPanel
          key={`${open.id}-${open.focus}`}
          id={open.id}
          focus={open.focus}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.type === "draft" && (
        <DraftPanel
          key={open.id}
          id={open.id}
          onClose={() => setOpen(null)}
          onSigned={(id) => setOpen({ type: "customer", id })}
        />
      )}
      {open?.type === "request" && (
        <RequestPanel
          key={open.id}
          id={open.id}
          onClose={() => setOpen(null)}
        />
      )}
      <BarterDrawer
        id={open?.type === "barter" ? open.id : null}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

export function ContractTable({
  rows,
  onOpen,
}: {
  rows: ContractView[];
  onOpen: (id: string) => void;
}) {
  if (!rows.length) return <Empty title="Bu filtrede sözleşme yok" />;
  return (
    <div className="e-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sözleşme / müşteri</th>
            <th>Daire</th>
            <th>Plan</th>
            <th className="numeric">Bedel</th>
            <th>Tahsilat</th>
            <th className="numeric">Bakiye</th>
            <th>Durum</th>
            <th aria-label="İşlemler" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const a = c.account;
            const ratio = a ? pct(a.collected, c.price) : 0;
            return (
              <tr
                key={c.id}
                className={c.status === "İptal" ? "" : "clickable"}
                onClick={() => c.status !== "İptal" && onOpen(c.id)}
              >
                <td>
                  <b>{c.name}</b>
                  <small>
                    {c.number}
                    {c.signedAt ? ` · ${date(c.signedAt)}` : ""}
                  </small>
                </td>
                <td>
                  <b>{unitShort(c.unitId)}</b>
                  <small>
                    {c.floor} · {c.type} · {c.gross} m² · {c.unitLabel}
                  </small>
                </td>
                <td>
                  <small className="cc-plan">{c.planLabel}</small>
                </td>
                <td className="numeric">
                  <b>{money(c.price)}</b>
                  {c.discount > 0 && <small>Liste {money(c.listPrice!)}</small>}
                </td>
                <td className="cc-ratio">
                  {a ? (
                    <>
                      <span className="num">%{ratio}</span>
                      <Progress value={ratio} />
                    </>
                  ) : (
                    <small>İmza sonrası</small>
                  )}
                </td>
                <td className="numeric">
                  <b>{a ? money(a.balance) : "—"}</b>
                  {a && a.overdue > 0 && (
                    <small className="danger">
                      {money(a.overdue)} gecikmiş
                    </small>
                  )}
                  {a && a.overdue === 0 && a.next && (
                    <small>Sıradaki {date(a.next.due)}</small>
                  )}
                </td>
                <td>
                  <Badge
                    tone={a && a.overdue > 0 ? "red" : CONTRACT_TONE[c.status]}
                  >
                    {a && a.overdue > 0 ? "Gecikmeli" : c.status}
                  </Badge>
                </td>
                <td
                  className="row-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    className="icon-button"
                    href={`/belge/?tur=sozlesme&id=${c.id}`}
                    target="_blank"
                    aria-label={`${c.number} sözleşme özetini yazdır`}
                    title="Sözleşme özeti"
                  >
                    <Printer size={15} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
