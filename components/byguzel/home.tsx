"use client";
// By Güzel Yönetim Merkezi açılış ekranı. Bütün tutarlar aynı motor ve raporlardan gelir
// (financialReport / salesReport, paymentRows, ledger kayıtları) ve SEÇİLİ PARA BİRİMİNDE hesaplanır.
// Farklı para birimleri toplanmaz; TL karşılığı yalnızca tanımlı kurla, bilgi amaçlı gösterilir.
import Link from "next/link";
import { ArrowRight, CircleAlert, KeyRound, FilePlus2, Wallet, Building2, Info } from "lucide-react";
import { useApp } from "../enterprise/context";
import { useAuthOptional } from "../security/auth";
import { Badge, Panel } from "../enterprise/shared";
import { hubHref } from "@/lib/catalog";
import { SNAPSHOT, projects, pname, paymentRows, customerList, allCustomers, activeReceipts, installmentList } from "@/lib/enterprise";
import { financialReport, salesReport } from "@/lib/reports";
import { PORTFOLIO, LISTINGS, COMPANY } from "@/lib/portfolio";
import { money, compact, date, moneyIn } from "@/lib/data";
import { unitShort, unitById } from "@/lib/units";
import { CURRENCIES, CURRENCY_LABEL, DEFAULT_FX, toTry, type Currency } from "@/lib/currency";
import { HANDOVER_STEPS, handoverProgress, isDelivered } from "@/lib/aftersales";
import { inCurrency } from "./use-in-currency";

const MONTH_END = "2026-11-30";
const DEMO = ["nergis", "cengilli", "agva"];

export default function ByGuzelHome() {
  const { state, currency, setCurrency, setProject } = useApp();
  const auth = useAuthOptional();
  const showFin = !auth || auth.can("finans", "view");
  const fx = state.fx ?? DEFAULT_FX;

  // ---- Seçili para birimi ----
  const fin = financialReport(state, { project: "all" });
  const rows = paymentRows(state);
  const people = new Map(customerList(state).map((c) => [c.id, c]));
  const open = rows.filter((r) => r.remaining > 0);
  const overdue = open.filter((r) => r.due < SNAPSHOT).sort((a, b) => a.due.localeCompare(b.due));
  const thisMonth = open.filter((r) => r.due >= SNAPSHOT && r.due <= MONTH_END);
  const sumOf = (xs: { remaining: number }[]) => xs.reduce((a, r) => a + r.remaining, 0);
  const insById = new Map(installmentList(state).map((i) => [i.id, i]));
  const recent = [
    ...activeReceipts(state)
      .filter((r) => insById.has(r.installmentId))
      .map((r) => ({ id: r.id, date: r.date, amount: r.amount, who: insById.get(r.installmentId)!.customerId, what: insById.get(r.installmentId)!.kind === "Ara ödeme" ? "Ara ödeme" : "Taksit tahsilatı" })),
    ...state.depositPayments.filter((d) => !d.reversal && people.has(d.customerId)).map((d) => ({ id: d.id, date: d.date, amount: d.amount, who: d.customerId, what: "Peşinat" })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  // ---- Stok (para biriminden bağımsız fiziksel bölümler) ----
  const sold = allCustomers(state);
  const stock = DEMO.map((id) => {
    const t = inCurrency(null, () => salesReport(state, { project: id }).total);
    const delivered = sold.filter((c) => c.project === id && isDelivered(state.aftersales, c.id)).length;
    return { id, name: pname(id), total: t.total, available: t.available, reserved: t.reserved + t.inSigning, sold: t.sold - delivered, delivered };
  });
  const tot = stock.reduce((a, s) => ({ total: a.total + s.total, available: a.available + s.available, reserved: a.reserved + s.reserved, sold: a.sold + s.sold, delivered: a.delivered + s.delivered }), { total: 0, available: 0, reserved: 0, sold: 0, delivered: 0 });

  // ---- Para birimi bazında portföy (her satır kendi para biriminde) ----
  const byCur = CURRENCIES.map((c) =>
    inCurrency(c, () => {
      const f = financialReport(state, { project: "all" });
      const od = paymentRows(state).filter((r) => r.remaining > 0 && r.due < SNAPSHOT);
      return { c, contracts: customerList(state).length, contracted: f.contracted, collected: f.collected, balance: f.balance, overdue: od.reduce((a, r) => a + r.remaining, 0) };
    }),
  );

  // ---- Proje bazlı gelir (seçili para birimi) ----
  const perProject = DEMO.map((id) => ({ id, name: pname(id), ...financialReport(state, { project: id }) }));
  const maxP = Math.max(1, ...perProject.map((p) => p.contracted));

  // ---- Teslimler ----
  const handoverOpen = sold
    .filter((c) => !isDelivered(state.aftersales, c.id))
    .map((c) => ({ c, p: handoverProgress(state.aftersales, c.id) }))
    .filter((x) => x.p.done > 0)
    .sort((a, b) => b.p.done - a.p.done)
    .slice(0, 5);

  const glp = projects.find((p) => p.id === "nergis");
  return (
    <div className="bg-home">
      <header className="bg-hero">
        <img className="bg-hero-img" src="/images/byguzel/glp-1-11.jpg" alt="Guzel Life Premium resmî proje görseli (byguzel.com)" />
        <div className="bg-hero-shade" />
        <div className="bg-hero-body">
          <span className="bg-eyebrow">{date(SNAPSHOT)} · Yönetim merkezi · Alanya</span>
          <h1>By Güzel Yönetim Merkezi</h1>
          <p>
            {COMPANY.since}'den beri emlak, {COMPANY.construction}'ten beri inşaat · Satış, sözleşme, taksit, tahsilat,
            teslim ve tapu tek ekranda. Proje bilgileri ve görseller byguzel.com'dan; satış ve finans kayıtları <b>temsilidir</b>.
          </p>
          <nav className="bg-hero-actions" aria-label="Hızlı işlemler">
            <Link className="btn primary" href="/daireler"><FilePlus2 size={15} /> Daire seç ve satış başlat</Link>
            <Link className="btn ghost-light" href="/odemeler"><Wallet size={15} /> Tahsilat kaydet</Link>
            <Link className="btn ghost-light" href="/satis-sonrasi"><KeyRound size={15} /> Teslim ve tapu</Link>
          </nav>
        </div>
        <span className="bg-img-tag">Resmî görsel · byguzel.com</span>
      </header>

      <section className="bg-stock" aria-label="Yönetilen bağımsız bölümler">
        <div className="bg-stock-lead">
          <b>{PORTFOLIO.length}</b>
          <span>Portföydeki proje<small>byguzel.com · Projelerimiz</small></span>
        </div>
        <div className="bg-stock-lead">
          <b>{tot.total}</b>
          <span>Demoda yönetilen bölüm<small>{DEMO.length} proje · GLP 90 daire resmî, diğerleri örnek</small></span>
        </div>
        <div className="bg-stock-bar">
          <div className="bg-bar" role="img" aria-label={`Müsait ${tot.available}, rezerve ${tot.reserved}, satıldı ${tot.sold}, teslim edildi ${tot.delivered}`}>
            <i className="s-av" style={{ flex: tot.available }} />
            <i className="s-re" style={{ flex: tot.reserved }} />
            <i className="s-so" style={{ flex: tot.sold }} />
            <i className="s-de" style={{ flex: tot.delivered }} />
          </div>
          <ul>
            <li><i className="s-av" /> Müsait <b>{tot.available}</b></li>
            <li><i className="s-re" /> Rezerve / imza <b>{tot.reserved}</b></li>
            <li><i className="s-so" /> Satıldı <b>{tot.sold}</b></li>
            <li><i className="s-de" /> Teslim edildi <b>{tot.delivered}</b></li>
          </ul>
        </div>
      </section>

      {!showFin && <p className="sec-info">Şirket geneli mali göstergeler rolünüzde gizlidir. Yetkiniz olan ekranlar menüde listelenir.</p>}
      {showFin && (
        <>
          <div className="bg-cur-note">
            <Info size={14} /> Tutarlar <b>{CURRENCY_LABEL[currency]}</b> sözleşmelerinden hesaplanır. Diğer para birimleri bu toplamlara eklenmez — üst çubuktan geçiş yapın.
          </div>
          <section className="bg-kpis">
            <Link href="/sozlesmeler" className="bg-kpi"><span>Toplam sözleşme</span><b>{compact(fin.contracted)}</b><small>{people.size} sözleşme · {currency}</small></Link>
            <Link href="/odemeler" className="bg-kpi pos"><span>Tahsil edilen</span><b>{compact(fin.collected)}</b><small>%{Math.round(fin.collectionRate * 100)} tahsilat oranı</small><div className="progress"><i style={{ width: `${fin.collectionRate * 100}%` }} /></div></Link>
            <Link href="/odemeler" className="bg-kpi"><span>Kalan alacak</span><b>{compact(fin.balance)}</b><small>Plan dışı bakiye dahil</small></Link>
            <Link href="/odemeler" className="bg-kpi"><span>Bu ay beklenen</span><b>{money(sumOf(thisMonth))}</b><small>{thisMonth.length} ödeme · 15–30 Kasım</small></Link>
            <Link href="/odemeler?durum=Gecikti" className="bg-kpi danger"><span>Geciken ödeme</span><b>{money(sumOf(overdue))}</b><small>{new Set(overdue.map((r) => r.customerId)).size} müşteri · {overdue.length} ödeme</small></Link>
          </section>

          <div className="bg-row">
            <Panel title="Proje bazlı gelir" subtitle={`Sözleşme ve tahsilat · yalnızca ${currency} sözleşmeleri`} className="bg-chart">
              <div className="bg-bars">
                {perProject.map((p) => (
                  <div key={p.id} className="bg-bars-row">
                    <Link href={hubHref(p.id)} onClick={() => setProject(p.id)}><b>{p.name}</b></Link>
                    <div className="bg-bars-track">
                      <i className="c" style={{ width: `${(p.contracted / maxP) * 100}%` }} />
                      <i className="k" style={{ width: `${(p.collected / maxP) * 100}%` }} />
                    </div>
                    <span className="num">{compact(p.collected)} / {compact(p.contracted)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-legend"><span><i className="c" /> Sözleşme bedeli</span><span><i className="k" /> Tahsil edilen</span></div>
            </Panel>
            <Panel title="Para birimine göre portföy" subtitle="Her satır kendi para biriminde · toplanmaz">
              <div className="e-table-wrap">
                <table className="bg-cur-table">
                  <thead><tr><th>Para birimi</th><th className="numeric">Sözleşme</th><th className="numeric">Tahsil</th><th className="numeric">Kalan</th><th className="numeric">Geciken</th></tr></thead>
                  <tbody>
                    {byCur.map((r) => (
                      <tr key={r.c} className={r.c === currency ? "on" : ""}>
                        <td><button type="button" className="e-text-link" onClick={() => setCurrency(r.c)}>{r.c}</button><small>{r.contracts} sözleşme</small></td>
                        <td className="numeric">{moneyIn(r.contracted, r.c)}</td>
                        <td className="numeric">{moneyIn(r.collected, r.c)}</td>
                        <td className="numeric">{moneyIn(r.balance, r.c)}<small>≈ {moneyIn(Math.round(toTry(r.balance, r.c, fx)), "TRY")}</small></td>
                        <td className="numeric">{r.overdue ? <em className="neg">{moneyIn(r.overdue, r.c)}</em> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="fc-note">≈ TL karşılığı yalnızca bilgi amaçlıdır: tanımlı kur {date(fx.date)} · 1 EUR = {fx.EUR} TL · 1 USD = {fx.USD} TL (Yönetim &amp; Ayarlar'dan değiştirilir, otomatik kur çekilmez).</p>
            </Panel>
          </div>
        </>
      )}

      <section className="bg-projects">
        {stock.map((s) => {
          const p = projects.find((x) => x.id === s.id)!;
          const port = PORTFOLIO.find((x) => x.demoProject === s.id);
          return (
            <article key={s.id} className="bg-pcard">
              <div className="bg-pcard-img">
                <img src={p.image} alt={`${p.name} resmî görseli`} loading="lazy" />
                <span className="bg-img-tag">Resmî görsel</span>
              </div>
              <div className="bg-pcard-body">
                <header>
                  <h2>{p.name}</h2>
                  <Badge tone={s.id === "nergis" ? "green" : "info"}>{s.id === "nergis" ? "Tamamlandı · 2024" : `Yapım yılı ${p.delivery}`}</Badge>
                </header>
                <p>{port?.facts}</p>
                <div className="bg-bar small" aria-hidden>
                  <i className="s-av" style={{ flex: s.available }} /><i className="s-re" style={{ flex: s.reserved }} /><i className="s-so" style={{ flex: s.sold }} /><i className="s-de" style={{ flex: s.delivered }} />
                </div>
                <small className="muted">{s.total} bölüm{s.id === "nergis" ? " (resmî)" : " (örnek kurgu)"} · {s.available} müsait · {s.reserved} rezerve · {s.sold} satıldı · {s.delivered} teslim</small>
                <div className="bg-pcard-actions">
                  <Link className="btn primary" href={hubHref(s.id)} onClick={() => setProject(s.id)}>Proje merkezi <ArrowRight size={14} /></Link>
                  <Link className="btn" href="/daireler" onClick={() => setProject(s.id)}><Building2 size={14} /> {s.id === "nergis" ? "5 blok planı" : "Kat planı"}</Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="bg-bottom">
        {showFin && (
          <Panel title="Geciken ödemeler" subtitle={`${currency} · senaryo tarihi ${date(SNAPSHOT)}`}>
            <ul className="fh-list">
              {overdue.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <span className="fh-date red">{-r.days} gün</span>
                  <span><b>{people.get(r.customerId)?.name ?? r.customerId}</b><small>{r.label} · {unitShort(r.customerId)} · {pname(r.project)}</small></span>
                  <em className="neg">{money(r.remaining)}</em>
                </li>
              ))}
              {overdue.length === 0 && <li className="muted">Bu para biriminde geciken ödeme yok.</li>}
            </ul>
            <Link className="e-text-link" href="/odemeler?durum=Gecikti">Tahsilat ekranı <ArrowRight size={14} /></Link>
          </Panel>
        )}
        {showFin && (
          <Panel title="Son finansal hareketler" subtitle={`Tahsilatlar · ${currency}`}>
            <ul className="fh-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <span className="fh-date">{date(r.date).replace(/ \d{4}$/, "")}</span>
                  <span><b>{people.get(r.who)?.name ?? r.who}</b><small>{r.what} · {unitShort(r.who)}</small></span>
                  <em className="pos">{money(r.amount)}</em>
                </li>
              ))}
              {recent.length === 0 && <li className="muted">Bu para biriminde kayıtlı hareket yok.</li>}
            </ul>
          </Panel>
        )}
        <Panel title="Yaklaşan teslimler" subtitle="Teslim ve tapu süreci devam eden daireler">
          <ul className="fh-list">
            {handoverOpen.map(({ c, p }) => (
              <li key={c.id}>
                <span className="fh-date">{p.done}/{p.total}</span>
                <span><b>{unitById(c.id)?.label ?? c.id} · {c.name}</b><small>{pname(c.project)} · sıradaki: {p.next?.title}</small></span>
              </li>
            ))}
            <li>
              <CircleAlert size={15} className="muted" />
              <span><b>Guzel Nature · City Prime</b><small>Yapım yılı 2025 (resmî) · bölüm teslim tarihleri demoda tanımlı değil</small></span>
            </li>
          </ul>
          <Link className="e-text-link" href="/satis-sonrasi">Teslim, tapu ve talepler <ArrowRight size={14} /></Link>
        </Panel>
      </section>

      <Panel title="Resmî portföy" subtitle="byguzel.com · Projelerimiz (28 Kasım 2026'da okundu) · fiyatlar sitede yayımlanan başlangıç fiyatlarıdır">
        <div className="bg-port">
          {PORTFOLIO.map((p) => (
            <article key={p.id}>
              {p.image ? <img src={p.image} alt={`${p.name} resmî görseli`} loading="lazy" /> : <div className="bg-noimg">Görsel yayımlanmadı</div>}
              <div>
                <b>{p.name}</b>
                <small>{p.kind} · {p.location}</small>
                <small>{p.facts}</small>
                <span className="bg-port-foot">
                  {p.price ? <em>{moneyIn(p.price, "EUR")}'dan</em> : <em>Fiyat yok</em>}
                  {p.demoProject ? <Badge tone="green">Demoda yönetiliyor</Badge> : <Badge tone="neutral">Yalnızca portföy</Badge>}
                </span>
              </div>
            </article>
          ))}
        </div>
        <p className="fc-note">
          Ayrı tutulanlar: {LISTINGS.join(", ")} — byguzel.com'da yalnızca satılık ilan olarak görünür; geliştirici bilgisi yayımlanmadığı için
          By Güzel projesi olarak gösterilmez. {glp ? "Guzel Life Premium sosyal alanları ve vatandaşlık uygunluğu guzelinvest.com'dadır; Guzel Invest'in By Güzel ile ilişkisi doğrulanmamıştır." : ""}
        </p>
      </Panel>
      <p className="bg-steps-hint">Teslim süreci adımları: {HANDOVER_STEPS.map((s) => s.title).join(" → ")}</p>
    </div>
  );
}

