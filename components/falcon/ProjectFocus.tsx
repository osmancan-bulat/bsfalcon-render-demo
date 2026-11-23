"use client";
// Proje merkezlerinin (Ağva, Çengilli, Nergis Park) üst bölümü: resmî görsel, hedef teslim, süreç adımı,
// şantiye ilerlemesi, bütçe kullanımı ve kat karşılığı özeti. Aynı rapor fonksiyonlarını kullanır.
import Link from "next/link";
import { Landmark, PiggyBank, ShieldCheck, ArrowRight } from "lucide-react";
import { useApp } from "../enterprise/context";
import { projects, projectProgress } from "@/lib/enterprise";
import { budgetReport, shareSummary, processOf } from "@/lib/falcon-reports";
import { CONTRACTOR } from "@/lib/falcon";
import { compact } from "@/lib/data";

export default function ProjectFocus({ projectId }: { projectId: string }) {
  const { state } = useApp();
  const p = projects.find((x) => x.id === projectId);
  if (!p || !p.builtIn) return null;
  const b = budgetReport(state, projectId);
  const pr = processOf(state, projectId);
  const sh = shareSummary(state, projectId);
  const prog = projectProgress(state, projectId);
  const land = sh.owners.filter((o) => o.id !== CONTRACTOR).reduce((a, o) => a + o.count, 0);
  return (
    <section className="pf-focus">
      <div className="pf-focus-img">
        <img src={p.image} alt={`${p.name} resmî mimari görseli`} />
        <span>Resmî görsel · mimari görselleştirme</span>
      </div>
      <div className="pf-focus-body">
        <p className="pf-focus-desc">{p.description}</p>
        <div className="pf-focus-grid">
          <div><small>Hedef teslim</small><b>{p.delivery || "Açıklanmadı"}</b><span>{p.id === "nergis" ? "Kat karşılığı demo senaryosu" : "Resmî proje sayfası"}</span></div>
          <div><small>Şantiye ilerlemesi</small><b>%{prog}</b><div className="progress"><i style={{ width: `${prog}%` }} /></div><span>Ağırlıklı iş paketi ilerlemesi</span></div>
          <div><small>Proje süreci</small><b>{pr?.done}/{pr?.total} adım</b><span>{pr?.current?.title ?? "—"}</span></div>
          <div><small>Bütçe kullanımı (temsili)</small><b>%{Math.round(b.usedRate * 100)}</b><div className="progress"><i style={{ width: `${Math.min(100, b.usedRate * 100)}%` }} /></div><span>{compact(b.spent)} / {compact(b.budget)}</span></div>
          <div><small>Kat karşılığı</small><b>{sh.agreement ? `%${sh.agreedLandRatio} arsa sahibi` : "Tanımlı değil"}</b><span>{sh.agreement ? `${land} bölüm arsa sahibinde · gerçekleşen %${sh.actualLandRatio.toLocaleString("tr-TR")}` : "Tüm bölümler yüklenicide"}</span></div>
        </div>
        <div className="pf-focus-actions">
          <Link className="btn" href="/surec"><ShieldCheck size={15} /> Süreç ve güvence</Link>
          <Link className="btn" href="/butce"><PiggyBank size={15} /> Bütçe ve giderler</Link>
          {sh.agreement && <Link className="btn" href="/kat-karsiligi"><Landmark size={15} /> Kat karşılığı paylaşımı <ArrowRight size={14} /></Link>}
        </div>
      </div>
    </section>
  );
}
