"use client";
// Satış sonrası: teslim ve tapu süreci, müşteri talepleri (arıza, kiralama, yeniden satış, oturum izni…)
// ve geciken ödeme hatırlatmaları. Bütün kayıtlar temsilidir; dış gönderim (SMS / e-posta / WhatsApp) yoktur.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Undo2, KeyRound, MessageSquarePlus, BellPlus } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Badge, Panel, Empty } from "../enterprise/shared";
import { SNAPSHOT, allCustomers, accountOf, paymentRows, pname, contractCurrency } from "@/lib/enterprise";
import { HANDOVER_STEPS, TICKET_CATEGORIES, handoverProgress, isDelivered, type Ticket, type TicketCategory } from "@/lib/aftersales";
import { unitById } from "@/lib/units";
import { date, moneyIn } from "@/lib/data";
import { CURRENCIES, curOf } from "@/lib/currency";
import { inCurrency } from "./use-in-currency";

type Filter = "surecte" | "teslim" | "baslamadi" | "hepsi";

export default function AftersalesView() {
  const { state, act, project } = useApp();
  const [filter, setFilter] = useState<Filter>("surecte");
  const [sel, setSel] = useState<string | null>(null);
  const [stepDate, setStepDate] = useState(SNAPSHOT);
  const [tab, setTab] = useState<"teslim" | "talepler" | "gecikme">("teslim");

  const sold = useMemo(
    () => allCustomers(state).filter((c) => project === "all" || c.project === project),
    [state, project],
  );
  const rows = sold.map((c) => ({ c, p: handoverProgress(state.aftersales, c.id), delivered: isDelivered(state.aftersales, c.id) }));
  const counts = {
    surecte: rows.filter((r) => !r.delivered && r.p.done > 0).length,
    teslim: rows.filter((r) => r.delivered).length,
    baslamadi: rows.filter((r) => r.p.done === 0).length,
    hepsi: rows.length,
  };
  const list = rows
    .filter((r) => (filter === "hepsi" ? true : filter === "teslim" ? r.delivered : filter === "surecte" ? !r.delivered && r.p.done > 0 : r.p.done === 0))
    .sort((a, b) => a.c.project.localeCompare(b.c.project) || (unitById(a.c.id)?.label ?? "").localeCompare(unitById(b.c.id)?.label ?? ""));
  const current = rows.find((r) => r.c.id === sel) ?? list[0];

  const tickets = (state.aftersales?.tickets ?? []).filter((t) => project === "all" || t.project === project);
  const openTickets = tickets.filter((t) => t.status !== "Çözüldü");

  // Geciken ödemeler: her para birimi kendi listesinde (toplanmaz)
  const overdueBy = CURRENCIES.map((cur) => ({
    cur,
    rows: inCurrency(cur, () => paymentRows(state)).filter((r) => r.remaining > 0 && r.due < SNAPSHOT && (project === "all" || r.project === project)),
  }));
  const overdueCount = overdueBy.reduce((a, x) => a + x.rows.length, 0);

  return (
    <div className="fc-page bg-as">
      <header className="fc-head">
        <div>
          <span className="eyebrow">Satış sonrası · {project === "all" ? "Tüm projeler" : pname(project)}</span>
          <h1>Teslim, tapu ve müşteri hizmetleri</h1>
          <p>
            Satılan her daire için bakiye kontrolünden anahtar teslimine kadar süreç, müşteri talepleri ve gecikme hatırlatmaları.
            Adımlar sırayla tamamlanır. Kayıtlar temsilidir; SMS, e-posta veya WhatsApp gönderilmez.
          </p>
        </div>
        <div className="fc-switch" role="tablist" aria-label="Satış sonrası bölümleri">
          <button role="tab" aria-selected={tab === "teslim"} className={tab === "teslim" ? "active" : ""} onClick={() => setTab("teslim")}>Teslim ve tapu</button>
          <button role="tab" aria-selected={tab === "talepler"} className={tab === "talepler" ? "active" : ""} onClick={() => setTab("talepler")}>Talepler ({openTickets.length})</button>
          <button role="tab" aria-selected={tab === "gecikme"} className={tab === "gecikme" ? "active" : ""} onClick={() => setTab("gecikme")}>Gecikmeler ({overdueCount})</button>
        </div>
      </header>

      <section className="fc-kpis">
        <div className="fc-kpi"><span>Satılmış bölüm</span><b>{rows.length}</b><small>tüm para birimleri · adet</small></div>
        <div className="fc-kpi"><span>Teslim edildi</span><b>{counts.teslim}</b><small>anahtar teslim tutanağı</small></div>
        <div className="fc-kpi"><span>Süreçte</span><b>{counts.surecte}</b><small>tapu / teslim adımında</small></div>
        <div className="fc-kpi warn"><span>Açık talep</span><b>{openTickets.length}</b><small>{openTickets.filter((t) => t.priority === "Yüksek").length} yüksek öncelik</small></div>
        <div className="fc-kpi warn"><span>Geciken ödeme</span><b>{overdueCount}</b><small>para birimi bazında ayrı</small></div>
      </section>

      {tab === "teslim" && (
        <div className="fc-grid">
          <Panel
            title="Satılan daireler"
            subtitle="Süreç ilerlemesi · bir daire seçin"
            action={
              <div className="fc-switch small">
                {(["surecte", "teslim", "baslamadi", "hepsi"] as Filter[]).map((f) => (
                  <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                    {{ surecte: "Süreçte", teslim: "Teslim", baslamadi: "Başlamadı", hepsi: "Tümü" }[f]} {counts[f]}
                  </button>
                ))}
              </div>
            }
          >
            {list.length === 0 ? (
              <Empty title="Kayıt yok" detail="Bu filtrede satılmış daire bulunmuyor." />
            ) : (
              <ul className="bg-hlist">
                {list.slice(0, 80).map(({ c, p, delivered }) => (
                  <li key={c.id}>
                    <button className={current?.c.id === c.id ? "active" : ""} onClick={() => setSel(c.id)}>
                      <span><b>{unitById(c.id)?.label ?? c.id}</b> · {c.name}<small>{pname(c.project)} · {unitById(c.id)?.type}</small></span>
                      <span className="bg-steps-dots" aria-label={`${p.done}/${p.total} adım`}>
                        {p.steps.map((s) => <i key={s.key} className={s.date ? "on" : ""} />)}
                      </span>
                      {delivered ? <Badge tone="green">Teslim edildi</Badge> : <Badge tone={p.done ? "amber" : "neutral"}>{p.next?.title}</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {list.length > 80 && <p className="fc-note">İlk 80 kayıt gösteriliyor.</p>}
          </Panel>
          {current && <HandoverCard key={current.c.id} id={current.c.id} stepDate={stepDate} setStepDate={setStepDate} />}
        </div>
      )}

      {tab === "talepler" && <Tickets tickets={tickets} soldIds={sold.map((c) => c.id)} />}

      {tab === "gecikme" && (
        <div className="fc-grid three">
          {overdueBy.map(({ cur, rows }) => (
            <Panel key={cur} title={`Geciken · ${cur}`} subtitle={`${rows.length} ödeme · ${rows.length ? moneyIn(rows.reduce((a, r) => a + r.remaining, 0), cur) : "—"}`}>
              <ul className="fh-list">
                {rows.slice(0, 10).map((r) => {
                  const c = sold.find((x) => x.id === r.customerId);
                  const rid = `HTR-GEC-${r.id}`;
                  const exists = state.reminders.some((x) => x.id === rid);
                  return (
                    <li key={r.id}>
                      <span className="fh-date red">{-r.days} g</span>
                      <span><b>{c?.name ?? r.customerId}</b><small>{unitById(r.customerId)?.label} · {r.label} · {date(r.due)}</small></span>
                      <em className="neg">{moneyIn(r.remaining, cur)}</em>
                      <button
                        className="icon-button"
                        disabled={exists}
                        title={exists ? "Hatırlatma oluşturuldu" : "Uygulama içi hatırlatma oluştur"}
                        aria-label="Hatırlatma oluştur"
                        onClick={() =>
                          act({ type: "reminder", record: { id: rid, project: r.project, title: `Gecikme araması: ${c?.name ?? r.customerId} · ${unitById(r.customerId)?.label} · ${moneyIn(r.remaining, cur)}`, due: SNAPSHOT, done: false, owner: "Tahsilat ekibi" } })
                        }
                      >
                        {exists ? <Check size={15} /> : <BellPlus size={15} />}
                      </button>
                    </li>
                  );
                })}
                {rows.length === 0 && <li className="muted">Geciken ödeme yok.</li>}
              </ul>
            </Panel>
          ))}
          <p className="fc-note">Hatırlatmalar yalnızca uygulama içinde oluşturulur (Takvim &amp; Hatırlatmalar). Müşteriye mesaj gönderilmez.</p>
        </div>
      )}
    </div>
  );
}

function HandoverCard({ id, stepDate, setStepDate }: { id: string; stepDate: string; setStepDate: (d: string) => void }) {
  const { state, act } = useApp();
  const c = allCustomers(state).find((x) => x.id === id);
  if (!c) return null;
  const u = unitById(id);
  const cur = curOf(c);
  const acc = inCurrency(cur, () => accountOf(state, c));
  const p = handoverProgress(state.aftersales, id);
  const tickets = (state.aftersales?.tickets ?? []).filter((t) => t.unitId === id);
  return (
    <Panel title={`${u?.label ?? id} · ${c.name}`} subtitle={`${pname(c.project)} · ${u?.block && u.block.length <= 2 ? `${u.block} blok · ` : ""}${u?.floorLabel ?? ""} · ${u?.type ?? ""} · ${u?.gross ?? ""} m²`} className="bg-hcard">
      <dl className="fh-figs">
        <div><dt>Sözleşme</dt><dd>{moneyIn(c.price, cur)}<small>{cur} sözleşmesi</small></dd></div>
        <div><dt>Tahsil edilen</dt><dd>{moneyIn(acc.collected, cur)}<small>%{Math.round((acc.collected / c.price) * 100)}</small></dd></div>
        <div><dt>Kalan bakiye</dt><dd className={acc.overdue ? "neg" : ""}>{moneyIn(acc.balance, cur)}<small>{acc.overdue ? `${moneyIn(acc.overdue, cur)} gecikmiş` : "gecikme yok"}</small></dd></div>
      </dl>
      {acc.balance > 0 && !p.steps[4].date && (
        <p className="callout">Bakiye kapanmadan anahtar teslimi şirket politikasına bağlıdır (demo uyarısı; sistem engellemez).</p>
      )}
      <ol className="bg-steps">
        {p.steps.map((s, i) => {
          const prevDone = i === 0 || !!p.steps[i - 1].date;
          const nextDone = !!p.steps[i + 1]?.date;
          return (
            <li key={s.key} className={s.date ? "done" : prevDone ? "next" : ""}>
              <span className="bg-step-no">{s.date ? <Check size={13} /> : i + 1}</span>
              <span><b>{s.title}</b><small>{s.date ? `${date(s.date)} · ${s.detail}` : s.detail}</small></span>
              {s.date ? (
                <button className="btn small" disabled={nextDone} title={nextDone ? "Önce sonraki adımı geri alın" : "Adımı geri al"} onClick={() => act({ type: "handover-step", unit: id, key: s.key, date: null })}>
                  <Undo2 size={13} /> Geri al
                </button>
              ) : prevDone ? (
                <button className="btn primary small" onClick={() => act({ type: "handover-step", unit: id, key: s.key, date: stepDate })}>
                  {s.key === "teslim" ? <KeyRound size={13} /> : <Check size={13} />} Tamamla
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
      <label className="fc-select">
        İşlem tarihi
        <input type="date" value={stepDate} onChange={(e) => setStepDate(e.target.value)} />
      </label>
      <div className="form-actions left">
        <Link className="btn" href={`/musteriler?musteri=${encodeURIComponent(id)}`}>Müşteri kartı ve ekstre</Link>
        <Link className="btn" href="/arsiv">Belge arşivi</Link>
      </div>
      {tickets.length > 0 && (
        <>
          <h3 className="bg-sub">Bu dairenin talepleri</h3>
          <ul className="fh-list">
            {tickets.map((t) => (
              <li key={t.id}>
                <Badge tone={t.status === "Çözüldü" ? "neutral" : t.priority === "Yüksek" ? "red" : "amber"}>{t.status}</Badge>
                <span><b>{t.id} · {t.title}</b><small>{t.category} · {date(t.opened)}</small></span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="fc-note">Para birimi: {contractCurrency(state, id)} · tutarlar dönüştürülmeden gösterilir.</p>
    </Panel>
  );
}

function Tickets({ tickets, soldIds }: { tickets: Ticket[]; soldIds: string[] }) {
  const { state, act } = useApp();
  const [status, setStatus] = useState<"Açık" | "Tümü">("Açık");
  const [form, setForm] = useState({ unitId: "", category: TICKET_CATEGORIES[0] as TicketCategory, title: "", priority: "Normal" as Ticket["priority"], note: "" });
  const [note, setNote] = useState<Record<string, string>>({});
  const shown = tickets.filter((t) => status === "Tümü" || t.status !== "Çözüldü");
  const names = new Map(allCustomers(state).map((c) => [c.id, c.name]));
  const unitOptions = soldIds
    .map((id) => ({ id, label: `${unitById(id)?.label ?? id} · ${names.get(id) ?? ""} · ${pname(unitById(id)?.project ?? "")}` }))
    .sort((a, b) => a.label.localeCompare(b.label, "tr"));
  return (
    <div className="fc-grid">
      <Panel
        title="Müşteri talepleri ve hizmet kayıtları"
        subtitle="Arıza, kiralama, yeniden satış, tapu, oturum izni, aidat"
        action={
          <div className="fc-switch small">
            {(["Açık", "Tümü"] as const).map((s) => (
              <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s}</button>
            ))}
          </div>
        }
      >
        {shown.length === 0 ? (
          <Empty title="Açık talep yok" />
        ) : (
          <ul className="bg-tickets">
            {shown.map((t) => (
              <li key={t.id} className={t.priority === "Yüksek" && t.status !== "Çözüldü" ? "hi" : ""}>
                <header>
                  <b>{t.id} · {t.title}</b>
                  <Badge tone={t.status === "Çözüldü" ? "neutral" : t.status === "İşlemde" ? "info" : "amber"}>{t.status}</Badge>
                </header>
                <small>{unitById(t.unitId)?.label ?? t.unitId} · {names.get(t.unitId) ?? ""} · {pname(t.project)} · {t.category} · açılış {date(t.opened)}{t.closed ? ` · kapanış ${date(t.closed)}` : ""}</small>
                {t.notes.length > 0 && (
                  <ul className="bg-notes">
                    {t.notes.map((n, i) => <li key={i}><em>{date(n.date)}</em> {n.text}</li>)}
                  </ul>
                )}
                {t.status !== "Çözüldü" && (
                  <div className="bg-ticket-actions">
                    <input placeholder="Not ekle (isteğe bağlı)" value={note[t.id] ?? ""} onChange={(e) => setNote({ ...note, [t.id]: e.target.value })} aria-label={`${t.id} notu`} />
                    {t.status === "Açık" && (
                      <button className="btn small" onClick={() => act({ type: "ticket-update", id: t.id, status: "İşlemde", note: note[t.id], date: SNAPSHOT }) && setNote({ ...note, [t.id]: "" })}>İşleme al</button>
                    )}
                    <button className="btn primary small" onClick={() => act({ type: "ticket-update", id: t.id, status: "Çözüldü", note: note[t.id], date: SNAPSHOT }) && setNote({ ...note, [t.id]: "" })}>Çözüldü</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Yeni talep" subtitle="Satılmış daireye bağlı kayıt">
        <form
          className="bg-form"
          onSubmit={(e) => {
            e.preventDefault();
            const u = unitById(form.unitId);
            if (act({ type: "ticket-create", record: { unitId: form.unitId, project: u?.project ?? "", category: form.category, title: form.title, priority: form.priority, opened: SNAPSHOT, note: form.note } }))
              setForm({ ...form, title: "", note: "" });
          }}
        >
          <label>Daire<select required value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
            <option value="">Seçin…</option>
            {unitOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select></label>
          <label>Kategori<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}>
            {TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select></label>
          <label>Talep<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Örn. Banyo bataryası damlatıyor" /></label>
          <label>Öncelik<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Ticket["priority"] })}><option>Normal</option><option>Yüksek</option></select></label>
          <label>Not<textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <button className="btn primary" type="submit"><MessageSquarePlus size={15} /> Talebi aç</button>
        </form>
      </Panel>
    </div>
  );
}
