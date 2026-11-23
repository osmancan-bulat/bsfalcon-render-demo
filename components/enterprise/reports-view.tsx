"use client";
// Raporlama merkezi: kapsam (şirket/proje) ve dönem filtresiyle altı rapor; CSV ve yazdırılabilir çıktı.
import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useApp } from "./context";
import ReportBody from "./report-body";
import { projects, SNAPSHOT } from "@/lib/enterprise";
import { reportCsv, REPORT_TITLES, periodLabel, type ReportKind } from "@/lib/reports";
import { csvDownload } from "@/lib/export";

const KINDS: [ReportKind, string, string][] = [
  ["finans", "Finansal durum", "Satış, tahsilat, alacak, kasa hareketi ve nakit dışı barter etkisi."],
  ["satis", "Satış", "Projeye ve daire tipine göre satışlar, stok durumu ve tahsilat oranları."],
  ["taksit", "Taksit ve gecikme", "Yaklaşan tahsilatlar, gecikme yaşlandırması ve müşteri bazlı gecikmeler."],
  ["barter", "Barter", "Firma bazında anlaşmalar, verilen daireler, mahsuplar ve kalan yükümlülükler."],
  ["taseron", "Taşeron ve hakediş", "Firma ve iş paketine göre hakediş, onay, ödeme ve mahsup tutarları."],
  ["yonetici", "Yönetici raporu", "Şirket ve proje özeti, önemli uyarılar ve bekleyen işlemler."],
];
// Dönem kısayolları senaryo tarihine (15 Kas 2026) göre hesaplanır.
const PRESETS: [string, string | undefined, string | undefined][] = [
  ["Tüm dönem", undefined, undefined],
  ["Kasım 2026", "2026-11-01", "2026-11-30"],
  ["Son 3 ay", "2026-08-16", SNAPSHOT],
  ["2026 yılı", "2026-01-01", "2026-12-31"],
  ["Önümüzdeki 3 ay", SNAPSHOT, "2027-02-15"],
];

export default function ReportsView() {
  const { state, project, setProject } = useApp();
  const [kind, setKind] = useState<ReportKind>("finans");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  useEffect(() => {
    const k = new URLSearchParams(location.search).get("rapor") as ReportKind | null;
    if (k && KINDS.some(([id]) => id === k)) setKind(k);
  }, []);
  const f = { project, from, to };
  const invalid = !!(from && to && from > to);
  const query = new URLSearchParams({ tur: "rapor", rapor: kind, project, ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const meta = KINDS.find(([id]) => id === kind)!;
  return (
    <div className="reports">
      <header className="page-head">
        <div>
          <h1>Raporlama</h1>
          <p>
            Bütün raporlar kayıtlardan anlık hesaplanır; tahsilat, mahsup veya
            sözleşme değiştiğinde raporlar da değişir.
          </p>
        </div>
      </header>

      <section className="rp-filters" aria-label="Rapor filtreleri">
        <label>
          Kapsam
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">Tüm projeler (şirket geneli)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="rp-period">
          <span>Dönem</span>
          <div className="rp-presets" role="group" aria-label="Dönem kısayolları">
            {PRESETS.map(([label, a, b]) => (
              <button
                key={label}
                className={from === a && to === b ? "active" : ""}
                aria-pressed={from === a && to === b}
                onClick={() => {
                  setFrom(a);
                  setTo(b);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label>
          Başlangıç
          <input type="date" value={from ?? ""} onChange={(e) => setFrom(e.target.value || undefined)} />
        </label>
        <label>
          Bitiş
          <input type="date" value={to ?? ""} onChange={(e) => setTo(e.target.value || undefined)} />
        </label>
      </section>

      <div className="panel rp-panel">
        <nav className="e-tabs" role="tablist" aria-label="Rapor türü">
          {KINDS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? "active" : ""} onClick={() => setKind(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="rp-head">
          <div>
            <h2>{REPORT_TITLES[kind]}</h2>
            <p>
              {meta[2]} <b>{project === "all" ? "Şirket geneli" : projects.find((p) => p.id === project)?.name}</b> ·{" "}
              {periodLabel(f)}
            </p>
          </div>
          <div className="rp-actions">
            <button
              className="btn"
              disabled={invalid}
              onClick={() => csvDownload(reportCsv(state, kind, f), `sane-${kind}-raporu-${project}.csv`)}
            >
              <Download size={15} /> CSV (Excel)
            </button>
            <a className={`btn primary ${invalid ? "disabled" : ""}`} href={`/belge/?${query}`} target="_blank" rel="noreferrer">
              <Printer size={15} /> Yazdır / PDF
            </a>
          </div>
        </div>
        <div className="rp-content">
          {invalid ? (
            <p className="callout">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>
          ) : (
            <ReportBody s={state} kind={kind} f={f} />
          )}
        </div>
      </div>
      <p className="company-note">
        Durum göstergeleri (sözleşmeli satış, kalan ve geciken alacak) senaryo
        tarihine göredir. Dönem filtresi: kasaya giren ve çıkan gerçek
        tahsilat/ödeme tarihine, barter mahsubu mahsup tarihine, satışlar imza
        tarihine, taksit ve hakediş listeleri vade tarihine göre uygulanır. Vade,
        ödemenin yapıldığı anlamına gelmez. Barter nakit girişi veya çıkışı
        sayılmaz. CSV dosyası Excel’de doğrudan açılır.
      </p>
    </div>
  );
}
