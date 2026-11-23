"use client";
// BŞ Falcon Group Yönetim Merkezi açılış ekranı. Bütün sayılar aynı motor ve raporlardan gelir:
// financialReport / salesReport / managerReport (lib/reports), budgetReport / shareSummary / processOf
// (lib/falcon-reports), paymentRows ve requestList (lib/enterprise). Portföy bilgileri resmî sitedendir.
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Landmark, PiggyBank, ShieldCheck, TriangleAlert, CircleAlert, Info, FileSignature, BarChart3 } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Badge, Panel } from "../enterprise/shared";
import { hubHref } from "@/lib/catalog";
import { SNAPSHOT, projects, pname, paymentRows, requestList, requestStatus, netPayable, customerList, activeReceipts, installmentList, projectProgress } from "@/lib/enterprise";
import { financialReport, salesReport, managerReport } from "@/lib/reports";
import { budgetReport, shareSummary, processOf } from "@/lib/falcon-reports";
import { PORTFOLIO, COMPANY } from "@/lib/portfolio";
import { money, compact, date } from "@/lib/data";
import { unitShort } from "@/lib/units";

const ALERT_ICON = { danger: TriangleAlert, warning: CircleAlert, info: Info };

export default function FalconHome() {
  const { state, act, setProject } = useApp();
  const all = { project: "all" };
  const fin = financialReport(state, all);
  const sales = salesReport(state, all).total;
  const budget = budgetReport(state, "all");
  const { alerts } = managerReport(state, all);
  const rows = paymentRows(state);
  const people = new Map(customerList(state).map((c) => [c.id, c]));
  const reqs = requestList(state);
  const completed = PORTFOLIO.filter((p) => p.status === "Tamamlandı");
  const deliveredUnits = completed.reduce((a, p) => a + (p.delivered ?? 0), 0);

  const upcoming = rows.filter((r) => r.remaining > 0 && r.due >= SNAPSHOT && r.days <= 30).sort((a, b) => a.due.localeCompare(b.due));
  const overdue = rows.filter((r) => r.remaining > 0 && r.due < SNAPSHOT);
  const waiting = reqs.filter((r) => ["Onay bekliyor", "Onaylandı"].includes(requestStatus(state, r)) && r.type !== "Şantiye gideri");
  const obligations = waiting.filter((r) => requestStatus(state, r) === "Onaylandı").reduce((a, r) => a + netPayable(state, r), 0);
  const insById = new Map(installmentList(state).map((i) => [i.id, i]));
  const recent = useMemo(() => {
    const list = activeReceipts(state).map((r) => ({ id: r.id, date: r.date, amount: r.amount, who: insById.get(r.installmentId)?.customerId ?? "", what: "Taksit" }));
    const deps = state.depositPayments.filter((d) => !d.reversal).map((d) => ({ id: d.id, date: d.date, amount: d.amount, who: d.customerId, what: "Peşinat" }));
    return [...list, ...deps].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const missing = [
    ...state.drafts.map((d) => ({ id: d.id, title: `${d.name} · ${unitShort(d.id)}`, detail: `${state.contractMeta[d.id]?.status ?? "Taslak"} · ${pname(d.project)}`, href: "/sozlesmeler" })),
    ...(state.landshare?.agreements ?? []).flatMap((a) => a.documents.filter((d) => d.status !== "Tamam").map((d) => ({ id: d.id, title: d.title, detail: `${d.status} · ${pname(a.project)} · kat karşılığı`, href: "/kat-karsiligi" }))),
  ];
  const todos = state.reminders.filter((r) => !r.done).sort((a, b) => a.due.localeCompare(b.due));

  const featured = ["agva", "cengilli"];
  return (
    <div className="fh">
      <header className="fh-head">
        <img className="fh-logo" src="/images/falcon-lockup-black-gold.svg" alt="BŞ Falcon Group" />
        <div className="fh-title">
          <span className="eyebrow">{date(SNAPSHOT)} · Yönetim merkezi</span>
          <h1>BŞ Falcon Group Yönetim Merkezi</h1>
          <p>
            {COMPANY.since}'dan beri İstanbul'da · {COMPANY.delivered} · resmî portföyde {PORTFOLIO.length} proje.
            Satış, tahsilat, kat karşılığı ve şantiye tek merkezde.
          </p>
        </div>
        <nav className="quick-actions" aria-label="Hızlı işlemler">
          <Link className="btn" href="/kat-karsiligi"><Landmark size={15} /> Kat karşılığı</Link>
          <Link className="btn" href="/butce"><PiggyBank size={15} /> Bütçe</Link>
          <Link className="btn primary" href="/raporlar"><BarChart3 size={15} /> Raporlar</Link>
        </nav>
      </header>

      <section className="fh-portfolio-strip">
        <div><b>2</b><span>Devam eden proje<small>Ağva · Çengilli (resmî)</small></span></div>
        <div><b>{completed.length}</b><span>Tamamlanan proje<small>{deliveredUnits} daire · resmî portföy</small></span></div>
        <div><b>{PORTFOLIO.length - completed.length - 2}</b><span>Durumu açıklanmamış<small>Nergis Park, Yeşilvadi, Sedir, Zirve</small></span></div>
        <div><b>{sales.total}</b><span>Demoda izlenen bölüm<small>{sales.sold} satış · {sales.landowner} arsa sahibi payı</small></span></div>
        <div className="fh-demo-note">Satış, tahsilat ve finans değerleri <b>temsili demo verisidir</b>.</div>
      </section>

      <section className="fh-kpis">
        <Link href="/sozlesmeler" className="fh-kpi"><span>Sözleşmeli satış</span><b>{compact(fin.contracted)}</b><small>{sales.sold} aktif satış sözleşmesi</small></Link>
        <Link href="/odemeler" className="fh-kpi"><span>Tahsil edilen</span><b>{compact(fin.collected)}</b><small>Tahsilat oranı %{Math.round(fin.collectionRate * 100)}</small><div className="progress"><i style={{ width: `${fin.collectionRate * 100}%` }} /></div></Link>
        <Link href="/odemeler" className="fh-kpi"><span>Kalan alacak</span><b>{compact(fin.balance)}</b><small>{upcoming.length} ödeme önümüzdeki 30 günde</small></Link>
        <Link href="/odemeler?durum=Gecikti" className="fh-kpi danger"><span>Geciken alacak</span><b>{money(fin.overdue)}</b><small>{new Set(overdue.map((r) => r.customerId)).size} müşteri · {overdue.length} ödeme</small></Link>
        <Link href="/operasyon" className="fh-kpi"><span>Yaklaşan yükümlülük</span><b>{compact(obligations)}</b><small>Onaylı, ödenmemiş hakediş ve satın alma</small></Link>
        <Link href="/butce" className="fh-kpi"><span>Bütçe kullanımı</span><b>%{Math.round(budget.usedRate * 100)}</b><small>{compact(budget.spent)} / {compact(budget.budget)} (temsili)</small><div className="progress"><i style={{ width: `${Math.min(100, budget.usedRate * 100)}%` }} /></div></Link>
      </section>

      <section className="fh-alerts" aria-label="Kritik uyarılar">
        {[
          ...alerts.slice(0, 3),
          ...["nergis", "cengilli"].flatMap((p) => {
            const sh = shareSummary(state, p);
            return Math.abs(sh.deviation) > 1.5
              ? [{ tone: "warning" as const, project: p, title: `Kat karşılığı oranı sapması · ${pname(p)}`, detail: `Gerçekleşen arsa sahibi payı %${sh.actualLandRatio.toLocaleString("tr-TR")} · sözleşme %${sh.agreedLandRatio}`, href: "/kat-karsiligi" }]
              : [];
          }),
        ].slice(0, 4).map((a, i) => {
          const Icon = ALERT_ICON[a.tone];
          return (
            <Link key={i} href={a.href} className={`fh-alert ${a.tone}`}>
              <Icon size={16} />
              <span><b>{a.title}</b><small>{a.detail}</small></span>
              {"amount" in a && a.amount ? <em>{money(a.amount)}</em> : null}
            </Link>
          );
        })}
      </section>

      <section className="fh-featured">
        {featured.map((id) => {
          const p = projects.find((x) => x.id === id)!;
          const f = financialReport(state, { project: id });
          const st = salesReport(state, { project: id }).total;
          const b = budgetReport(state, id);
          const pr = processOf(state, id);
          const sh = shareSummary(state, id);
          const prog = projectProgress(state, id);
          return (
            <article key={id} className="fh-card">
              <div className="fh-card-img">
                <img src={p.image} alt={`${p.name} resmî mimari görseli`} />
                <span className="fh-img-tag">Resmî görsel · mimari görselleştirme</span>
              </div>
              <div className="fh-card-body">
                <header>
                  <div>
                    <Badge tone="green">Devam ediyor</Badge>
                    <h2>{p.name}</h2>
                    <p>{p.location} · {p.mix}</p>
                  </div>
                  <div className="fh-delivery"><small>Hedef teslim</small><b>{p.delivery}</b></div>
                </header>
                <div className="fh-progress">
                  <div><span>Şantiye ilerlemesi</span><b>%{prog}</b></div>
                  <div className="progress"><i style={{ width: `${prog}%` }} /></div>
                  <small>Süreç: {pr?.current?.title ?? "—"} · {pr?.done}/{pr?.total} adım</small>
                </div>
                <dl className="fh-figs">
                  <div><dt>Satış</dt><dd>{st.sold} / {st.total}<small>{st.inSigning} imza sürecinde · {st.landowner} arsa sahibi</small></dd></div>
                  <div><dt>Sözleşmeli</dt><dd>{compact(f.contracted)}<small>tahsil {compact(f.collected)}</small></dd></div>
                  <div><dt>Bütçe kullanımı</dt><dd>%{Math.round(b.usedRate * 100)}<small>kalan {compact(b.remaining)}</small></dd></div>
                  <div><dt>Kat karşılığı</dt><dd>{sh.agreement ? `%${sh.agreedLandRatio} arsa sahibi` : "Tanımlı değil"}<small>{sh.agreement ? `${sh.owners.filter((o) => o.id !== "yuklenici").reduce((a, o) => a + o.count, 0)} villa arsa sahibinde` : "Tüm bölümler yüklenicide"}</small></dd></div>
                </dl>
                <div className="fh-card-actions">
                  <Link className="btn primary" href={hubHref(id)} onClick={() => setProject(id)}>Proje yönetimi <ArrowRight size={15} /></Link>
                  <Link className="btn" href="/surec"><ShieldCheck size={15} /> Süreç ve güvence</Link>
                  {sh.agreement && <Link className="btn" href="/kat-karsiligi"><Landmark size={15} /> Paylaşım</Link>}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <div className="fh-row">
        <Panel title="Proje bazlı ilerleme, bütçe ve gelir-gider" subtitle="Aynı rapor motorundan · bütçe ve önceki dönem maliyeti temsili" className="fh-budget">
          <div className="e-table-wrap">
            <table>
              <thead><tr><th>Proje</th><th>İlerleme</th><th className="numeric">Bütçe</th><th className="numeric">Harcanan</th><th className="numeric">Tahsil edilen</th><th className="numeric">Kalan alacak</th><th>Gelir / gider</th></tr></thead>
              <tbody>
                {projects.filter((p) => p.status === "Aktif").map((p) => {
                  const b = budgetReport(state, p.id);
                  const prog = projectProgress(state, p.id);
                  const max = Math.max(b.spent, b.income.collected, 1);
                  return (
                    <tr key={p.id}>
                      <td><b>{p.name}</b><small>{p.id === "nergis" ? "Kat karşılığı demo senaryosu" : `Teslim ${p.delivery}`}</small></td>
                      <td><span className="num">%{prog}</span><div className="progress"><i style={{ width: `${prog}%` }} /></div></td>
                      <td className="numeric">{compact(b.budget)}</td>
                      <td className="numeric">{compact(b.spent)}</td>
                      <td className="numeric">{compact(b.income.collected)}</td>
                      <td className="numeric">{compact(b.income.balance)}</td>
                      <td>
                        <div className="fh-io"><i className="in" style={{ width: `${(b.income.collected / max) * 100}%` }} /><i className="out" style={{ width: `${(b.spent / max) * 100}%` }} /></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="fh-io-legend"><span><i className="in" /> Tahsil edilen</span><span><i className="out" /> Harcanan</span></div>
        </Panel>
        <Panel title="Nergis Park Evleri" subtitle="Kat karşılığı demo senaryosu · resmî: zemin + 7 kat, 35 daire + 3 dükkân" className="fh-nergis">
          {(() => {
            const sh = shareSummary(state, "nergis");
            return (
              <>
                <img src="/images/nergis-park.webp" alt="Nergis Park Evleri resmî görseli" />
                <dl className="fh-figs">
                  <div><dt>Sözleşme oranı</dt><dd>%{sh.agreedLandRatio} / %{100 - sh.agreedLandRatio}<small>arsa sahibi / yüklenici</small></dd></div>
                  <div><dt>Gerçekleşen</dt><dd>%{sh.actualLandRatio.toLocaleString("tr-TR")}<small>brüt alan esaslı</small></dd></div>
                  <div><dt>Yüklenici stoğu</dt><dd>{sh.contractorSellable} satışa açık<small>{sh.contractorSold} satıldı</small></dd></div>
                  <div><dt>Açık yükümlülük</dt><dd>{sh.openObligations}<small>{sh.missingDocs} belge bekliyor</small></dd></div>
                </dl>
                <Link className="btn" href="/kat-karsiligi">Paylaşım planını aç <ArrowRight size={15} /></Link>
              </>
            );
          })()}
        </Panel>
      </div>

      <section className="fh-bottom">
        <Panel title="Yaklaşan ödemeler" subtitle="30 gün · müşteri tahsilatları">
          <ul className="fh-list">
            {upcoming.slice(0, 6).map((r) => (
              <li key={r.id}>
                <span className="fh-date">{date(r.due).replace(/ \d{4}$/, "")}</span>
                <span><b>{people.get(r.customerId)?.name ?? r.customerId}</b><small>{r.label} · {unitShort(r.customerId)} · {pname(r.project)}</small></span>
                <em>{money(r.remaining)}</em>
              </li>
            ))}
          </ul>
          <Link className="e-text-link" href="/odemeler">Tüm ödemeler <ArrowRight size={14} /></Link>
        </Panel>
        <Panel title="Bekleyen hakedişler" subtitle="Onay ve ödeme bekleyen">
          <ul className="fh-list">
            {waiting.slice(0, 6).map((r) => (
              <li key={r.id}>
                <Badge tone={requestStatus(state, r) === "Onaylandı" ? "info" : "amber"}>{requestStatus(state, r)}</Badge>
                <span><b>{r.id} · {r.name}</b><small>{r.company} · {pname(r.project)}</small></span>
                <em>{money(netPayable(state, r))}</em>
              </li>
            ))}
          </ul>
          <Link className="e-text-link" href="/operasyon">Hakediş ekranı <ArrowRight size={14} /></Link>
        </Panel>
        <Panel title="Son tahsilatlar">
          <ul className="fh-list">
            {recent.map((r) => (
              <li key={r.id}>
                <span className="fh-date">{date(r.date).replace(/ \d{4}$/, "")}</span>
                <span><b>{people.get(r.who)?.name ?? r.who}</b><small>{r.what} · {unitShort(r.who)}</small></span>
                <em className="pos">{money(r.amount)}</em>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Eksik sözleşme ve evrak">
          <ul className="fh-list">
            {missing.slice(0, 6).map((m) => (
              <li key={m.id}>
                <FileSignature size={15} className="muted" />
                <span><Link href={m.href}><b>{m.title}</b></Link><small>{m.detail}</small></span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Yapılacaklar" subtitle="Yönetici listesi · işaretleyin">
          <ul className="fh-todo">
            {todos.slice(0, 6).map((t) => (
              <li key={t.id}>
                <label>
                  <input type="checkbox" checked={t.done} onChange={() => act({ type: "reminder-done", id: t.id })} />
                  <span><b>{t.title}</b><small>{date(t.due)} · {pname(t.project)}</small></span>
                </label>
              </li>
            ))}
            {todos.length === 0 && <li className="muted">Açık iş kalmadı.</li>}
          </ul>
          <Link className="e-text-link" href="/hatirlatmalar">Takvim <ArrowRight size={14} /></Link>
        </Panel>
      </section>

      <Panel title="Resmî proje portföyü" subtitle="bsfalcongroup.com/projeler · tamamlanan projeler yalnızca portföyde gösterilir">
        <div className="fh-port">
          {PORTFOLIO.map((p) => (
            <article key={p.id}>
              <img src={p.image} alt={p.name} loading="lazy" />
              <div>
                <b>{p.name}</b>
                <small>{p.kind} · {p.location}</small>
                <small>{p.facts}</small>
                <Badge tone={p.status === "Devam ediyor" ? "green" : p.status === "Tamamlandı" ? "neutral" : "info"}>{p.status}</Badge>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
