"use client";
// Proje merkezlerinin (Guzel Life Premium, Guzel Nature, City Prime) üst bölümü: resmî görseller,
// doğrulanmış proje bilgileri (kaynağıyla) ve bölüm durumu (müsait / rezerve / satıldı / teslim edildi).
// Doğrulanmış bilgi ile demo kurgusu ayrı etiketlenir.
import Link from "next/link";
import { useState } from "react";
import { Building2, KeyRound, PiggyBank } from "lucide-react";
import { useApp } from "../enterprise/context";
import { projects, projectProgress, allCustomers } from "@/lib/enterprise";
import { salesReport } from "@/lib/reports";
import { PORTFOLIO } from "@/lib/portfolio";
import { isDelivered } from "@/lib/aftersales";
import { inCurrency } from "../byguzel/use-in-currency";

const GALLERY: Record<string, string[]> = {
  nergis: ["glp-0-4", "glp-1-11", "glp-2-8", "glp-3-9", "glp-4-8", "glp-5-8"],
  cengilli: ["gn-4-6", "gn-0-7", "gn-1-12", "gn-2-9", "gn-3-10"],
  agva: ["cp-0-9", "cp-1-13"],
};
const VERIFIED: Record<string, { facts: string[]; demo: string }> = {
  nergis: {
    facts: ["5 blok · 90 daire", "2+1 ve 3+1 (ayrı mutfak), 4+1 bahçe dubleks, 5+1 dubleks penthouse", "125–230 m² · 3+1 için 215.000 €'dan · 2024", "Oba, Alanya · sosyal alanlar guzelinvest.com'da"],
    demo: "Blok başına 18 daire dağılımı, daire numaraları, kat yerleşimi ve satış kayıtları temsilidir.",
  },
  cengilli: {
    facts: ["Tek blok, 6 kat", "İlk katta TV odası, masa tenisi, kafeterya, çocuk odası, spor salonu, sauna, buhar ve tuz odası", "1+1'den · 50–180 m² · 105.000 €'dan · yapım yılı 2025"],
    demo: "Daire adedi sitede yayımlanmamıştır; 40 daire (2–6. katlar, katta 8) örnek kurgudur.",
  },
  agva: {
    facts: ["Ayrı mutfaklı 2+1 · 65–122 m²", "Havuz, sauna, çocuk oyun alanı", "185.000 €'dan · yapım yılı 2025"],
    demo: "Bölüm adedi yayımlanmamıştır; 12 bölüm örnek kurgudur.",
  },
};

export default function ProjectFocus({ projectId }: { projectId: string }) {
  const { state } = useApp();
  const [img, setImg] = useState(0);
  const p = projects.find((x) => x.id === projectId);
  if (!p || !p.builtIn) return null;
  const gallery = (GALLERY[projectId] ?? []).map((g) => `/images/byguzel/${g}.jpg`);
  const port = PORTFOLIO.find((x) => x.demoProject === projectId);
  const v = VERIFIED[projectId];
  const t = inCurrency(null, () => salesReport(state, { project: projectId }).total);
  const delivered = allCustomers(state).filter((c) => c.project === projectId && isDelivered(state.aftersales, c.id)).length;
  const prog = projectProgress(state, projectId);
  return (
    <section className="pf-focus">
      <div className="pf-focus-img">
        <img src={gallery[img] ?? p.image} alt={`${p.name} resmî görseli ${img + 1}`} />
        <span>Resmî görsel · {port?.source ?? "byguzel.com"}</span>
        {gallery.length > 1 && (
          <div className="pf-thumbs" role="group" aria-label="Proje görselleri">
            {gallery.map((g, i) => (
              <button key={g} className={i === img ? "active" : ""} onClick={() => setImg(i)} aria-label={`Görsel ${i + 1}`}>
                <img src={g} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="pf-focus-body">
        <p className="pf-focus-desc">{p.description}</p>
        {v && (
          <div className="pf-verified">
            <b>Doğrulanmış bilgiler</b>
            <ul>{v.facts.map((f) => <li key={f}>{f}</li>)}</ul>
            <small>Kaynak: {port?.source}. <b>Demo kurgusu:</b> {v.demo}</small>
          </div>
        )}
        <div className="pf-focus-grid">
          <div><small>Durum</small><b>{projectId === "nergis" ? "Tamamlandı" : `Yapım yılı ${p.delivery}`}</b><span>{projectId === "nergis" ? "2024 · teslimler sürüyor" : "Resmî proje sayfası"}</span></div>
          <div><small>Müsait</small><b>{t.available}</b><span>{t.total} bölümden</span></div>
          <div><small>Rezerve / imza</small><b>{t.reserved + t.inSigning}</b><span>bloke bölüm</span></div>
          <div><small>Satıldı</small><b>{t.sold - delivered}</b><span>teslim bekleyen</span></div>
          <div><small>Teslim edildi</small><b>{delivered}</b><span>anahtar teslimi yapıldı</span></div>
          {projectId !== "nergis" && <div><small>İnşaat ilerlemesi (temsili)</small><b>%{prog}</b><div className="progress"><i style={{ width: `${prog}%` }} /></div></div>}
        </div>
        <div className="pf-focus-actions">
          <Link className="btn primary" href="/daireler"><Building2 size={15} /> {projectId === "nergis" ? "5 blok daire planı" : "Kat ve daire planı"}</Link>
          <Link className="btn" href="/satis-sonrasi"><KeyRound size={15} /> Teslim ve tapu</Link>
          <Link className="btn" href="/butce"><PiggyBank size={15} /> Bütçe ve giderler</Link>
        </div>
      </div>
    </section>
  );
}
