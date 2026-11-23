"use client";
// Şirket genel bakışı: SANE İnşaat'ın bütün projeleri. Rakamlar raporlama motorundan hesaplanır.
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronRight,
  CircleAlert,
  FileSignature,
  ReceiptText,
  TriangleAlert,
  Printer,
} from "lucide-react";
import { useApp } from "./context";
import { hubHref, visibleProjects } from "@/lib/catalog";
import { Badge, Progress } from "./shared";
import { SNAPSHOT, projects, pname } from "@/lib/enterprise";
import {
  financialReport,
  salesReport,
  installmentReport,
  managerReport,
  type Alert,
} from "@/lib/reports";
import { compact, money, date } from "@/lib/data";


const ICON: Record<Alert["tone"], typeof TriangleAlert> = {
  danger: TriangleAlert,
  warning: FileSignature,
  info: ReceiptText,
};

export default function CompanyOverview() {
  const { state, setProject } = useApp();
  const all = { project: "all" };
  const fin = financialReport(state, all);
  // Bu ay: senaryo ayı (Kasım 2026); tahsilat ve ödemeler gerçek kayıt tarihlerine göre
  const month = financialReport(state, { project: "all", from: "2026-11-01", to: "2026-11-30" });
  const sales = salesReport(state, all);
  const inst = installmentReport(state, all);
  const { alerts } = managerReport(state, all);
  return (
    <div className="home company">
      <header className="home-head">
        <div>
          <span className="eyebrow">{date(SNAPSHOT)} · Şirket genel bakışı</span>
          <h1>SANE İnşaat</h1>
          <p>
            {projects.filter((p) => p.status === "Aktif").length} aktif proje · {sales.total.total} bağımsız
            bölüm · {sales.total.sold} satış · tutarlar temsilidir
          </p>
        </div>
        <nav className="quick-actions" aria-label="Hızlı işlemler">
          <Link className="btn" href="/raporlar">
            <BarChart3 size={15} /> Raporlama
          </Link>
          <Link
            className="btn"
            href="/belge/?tur=yonetici&project=all"
            target="_blank"
          >
            <Printer size={15} /> Yönetici raporu
          </Link>
        </nav>
      </header>

      <section className="status-tiles four" aria-label="Şirket finansal durumu">
        <div className="status-tile">
          <span>Sözleşmeli satış</span>
          <strong className="num">{compact(fin.contracted)}</strong>
          <small>{sales.total.sold} aktif satış sözleşmesi</small>
        </div>
        <div className="status-tile">
          <span>Tahsil edilen</span>
          <strong className="num">{compact(fin.collected)}</strong>
          <small>Tahsilat oranı %{Math.round(fin.collectionRate * 100)}</small>
        </div>
        <div className="status-tile">
          <span>Kalan alacak</span>
          <strong className="num">{compact(fin.balance)}</strong>
          <small>{inst.upcomingCount} ödeme önümüzdeki 90 günde</small>
        </div>
        <Link
          href="/odemeler?durum=Gecikti"
          className={`status-tile ${fin.overdue > 0 ? "danger" : ""}`}
          onClick={() => setProject("all")}
        >
          <span>Geciken alacak</span>
          <strong className="num">{money(fin.overdue)}</strong>
          <small>
            {inst.perCustomer.length} müşteri <ArrowRight size={13} />
          </small>
        </Link>
      </section>

      <Link href="/raporlar" className="company-month" aria-label="Bu ayın nakit hareketi — finansal rapor">
        <span>Kasım 2026 nakit hareketi</span>
        <span>
          Kasaya giren <b className="num">{money(month.inflow)}</b>
        </span>
        <span>
          Gerçekleşen ödeme <b className="num">{money(month.outflow)}</b>
          <small> (kayıtlı ödeme tarihine göre)</small>
        </span>
        <span>
          Barter mahsubu <b className="num">{money(month.barterOffset)}</b>
          <small> (nakit dışı)</small>
        </span>
        <ArrowRight size={14} />
      </Link>

      <section className="company-projects" aria-label="Projeler">
        {visibleProjects().map((p) => {
          const pf = { project: p.id };
          const f = financialReport(state, pf);
          const sr = salesReport(state, pf).total;
          const ir = installmentReport(state, pf);
          return (
            <article key={p.id} className="company-project">
              {p.image && (
                <div className="project-cover">
                  <img src={p.image} alt={`${p.name} resmî proje görseli`} loading="lazy" />
                  <span>Görsel: saneinsaat.net</span>
                </div>
              )}
              <header>
                <span className={`project-dot ${p.id === "verdora" ? "bronze" : ""}`} />
                <div>
                  <h2>{p.name}</h2>
                  <p>
                    {p.location}{p.delivery ? ` · teslim ${p.delivery}` : ""}
                  </p>
                </div>
                <Link className="btn primary" href={hubHref(p.id)} onClick={() => setProject(p.id)}>
                  Projeye geç <ArrowRight size={15} />
                </Link>
              </header>
              <div className="company-project-stock">
                <div>
                  <b className="num">
                    {sr.sold}
                    <small> / {sr.total}</small>
                  </b>
                  <span>satılan daire</span>
                </div>
                <Progress value={(sr.sold / sr.total) * 100} />
                <p>
                  {sr.available} müsait · {sr.inSigning} imza sürecinde ·{" "}
                  {sr.barter} barter · {sr.reserved} rezerve
                </p>
              </div>
              <dl className="company-project-figures">
                <div>
                  <dt>Sözleşmeli satış</dt>
                  <dd className="num">{compact(f.contracted)}</dd>
                </div>
                <div>
                  <dt>Tahsil edilen</dt>
                  <dd className="num">
                    {compact(f.collected)}
                    <small>%{Math.round(f.collectionRate * 100)}</small>
                  </dd>
                </div>
                <div>
                  <dt>Kalan alacak</dt>
                  <dd className="num">{compact(f.balance)}</dd>
                </div>
                <div>
                  <dt>Geciken</dt>
                  <dd className={`num ${f.overdue > 0 ? "danger" : ""}`}>
                    {money(f.overdue)}
                    <small>{ir.perCustomer.length} müşteri</small>
                  </dd>
                </div>
                <div>
                  <dt>Barter (nakit dışı)</dt>
                  <dd className="num">
                    {compact(f.barterValue)}
                    <small>kalan {compact(f.barterRemaining)}</small>
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Öncelikli konular</h2>
          <Badge tone={alerts.some((a) => a.tone === "danger") ? "red" : "amber"}>
            {alerts.length}
          </Badge>
        </div>
        {alerts.length ? (
          <ul className="cc-actions company-alerts">
            {alerts.map((a, i) => {
              const Icon = ICON[a.tone];
              return (
                <li key={i}>
                  <Link className="cc-link-row" href={a.href} onClick={() => setProject(a.project)}>
                    <span className={`cc-task-icon t-${a.tone}`}>
                      <Icon size={16} />
                    </span>
                    <span className="cc-list-main cc-task-main">
                      <b>{a.title}</b>
                      <small>{pname(a.project)}</small>
                      <span className="cc-task-what">{a.detail}</span>
                    </span>
                    {a.amount !== undefined && (
                      <span className="cc-task-figures">
                        <span className={`cc-amount num ${a.tone === "danger" ? "danger" : ""}`}>
                          {money(a.amount)}
                        </span>
                      </span>
                    )}
                    <span className="cc-action-label">
                      Aç <ChevronRight size={14} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="cc-allclear">
            <CircleAlert size={20} /> Öncelikli konu yok.
          </div>
        )}
      </section>
      <p className="company-note">
        <Building2 size={14} /> Proje seçildiğinde bütün modüller yalnızca o
        projenin kayıtlarını gösterir. Tutarlar bu tarayıcıdaki demo
        kayıtlarından anlık hesaplanır.
      </p>
    </div>
  );
}
