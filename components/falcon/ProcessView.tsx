"use client";
// Proje süreci ve güvence takibi: byguzel.com/proje-sureci sayfasındaki 8 adım proje bazında izlenir.
// Güvence alanı yalnızca belge takibidir; poliçe doğrulaması, sigorta entegrasyonu veya hukuki güvence sunulmaz.
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Badge, Panel } from "../enterprise/shared";
import { processOf } from "@/lib/falcon-reports";
import { STEP_STATUSES, type StepStatus } from "@/lib/falcon";
import { projects, documents } from "@/lib/enterprise";
import { date } from "@/lib/data";

export default function ProcessView() {
  const { state, act } = useApp();
  const active = projects.filter((p) => p.status === "Aktif");
  return (
    <div className="fc-page">
      <header className="fc-head">
        <div>
          <span className="eyebrow">Proje süreci ve güvence takibi</span>
          <h1>Keşiften teslime 8 adım</h1>
          <p>
            Adımlar By Güzel'un yayımladığı proje sürecidir. Her projede hangi aşamada olunduğu, tarihler ve
            güvence belgelerinin arşiv durumu izlenir.
          </p>
        </div>
      </header>
      {active.map((p) => {
        const pr = processOf(state, p.id);
        if (!pr) return null;
        const docs = documents.filter((d) => d.project === p.id);
        return (
          <Panel
            key={p.id}
            title={p.name}
            subtitle={`${p.location}${p.delivery ? ` · hedef teslim ${p.delivery}` : ""} · ${pr.done}/${pr.total} adım tamamlandı`}
            className="fc-process"
          >
            <ol className="fc-timeline">
              {pr.steps.map((st, i) => (
                <li key={st.key} className={st.status === "Tamamlandı" ? "done" : st.status === "Devam ediyor" ? "now" : ""}>
                  <span className="dot">{i + 1}</span>
                  <b>{st.title}</b>
                  <small title={pr.details[i]?.detail}>{st.date ? date(st.date) : st.status === "Devam ediyor" ? "Sürüyor" : "Planlanacak"}</small>
                  <select
                    aria-label={`${p.name} · ${st.title}`}
                    value={st.status}
                    onChange={(e) => act({ type: "process-step", project: p.id, key: st.key, status: e.target.value as StepStatus })}
                  >
                    {STEP_STATUSES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </li>
              ))}
            </ol>
            <div className="fc-process-foot">
              <div className="fc-guarantee">
                <ShieldCheck size={18} />
                <div>
                  <b>{pr.guarantee.title}</b>
                  <small>{pr.guarantee.note}</small>
                </div>
                <Badge tone={pr.guarantee.status === "Belge arşivde" ? "green" : pr.guarantee.status === "Belge bekleniyor" ? "amber" : "neutral"}>
                  {pr.guarantee.status}
                </Badge>
              </div>
              <div className="fc-proc-docs">
                <span>Proje evrakı</span>
                {docs.map((d) => (
                  <small key={d.id}>{d.name} · <em>{d.status}</em></small>
                ))}
                <Link className="e-text-link" href="/evrak">Evrak arşivi <ArrowRight size={14} /></Link>
              </div>
            </div>
          </Panel>
        );
      })}
      <p className="fc-note">
        Falcon Güvencesi (bitirme ve inşaat tamamlama sigortası) bu demoda yalnızca belge takibi olarak gösterilir.
        Sistem poliçe doğrulaması yapmaz, sigorta şirketiyle entegre değildir ve hukuki güvence sunmaz.
      </p>
    </div>
  );
}
