"use client";
// Kat karşılığı yönetimi: arsa sahibi / yüklenici paylaşımı, kat bazlı bağımsız bölüm planı,
// anlaşma aşamaları, teslim yükümlülükleri, belgeler ve değişiklik geçmişi.
// Bütün sayılar lib/falcon-reports.ts › shareSummary ile aynı kaynaktan hesaplanır.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Landmark, Scale, ClipboardCheck, FileWarning, History, ArrowRight } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Badge, Drawer, Panel } from "../enterprise/shared";
import { shareSummary, ownerName, ownerColorClass, agreementOf, type UnitState } from "@/lib/falcon-reports";
import { CONTRACTOR, STEP_STATUSES, seedLandShare, type StepStatus } from "@/lib/falcon";
import { projects } from "@/lib/enterprise";
import { money, compact, date } from "@/lib/data";
import type { Unit } from "@/lib/units";

const STATE_TONE: Record<UnitState, string> = {
  Satıldı: "green",
  "İmza sürecinde": "amber",
  Barter: "bronze",
  Rezerve: "info",
  Müsait: "neutral",
  "Arsa sahibi": "neutral",
};
const STEP_TONE: Record<StepStatus, string> = { Tamamlandı: "green", "Devam ediyor": "amber", Bekliyor: "neutral" };
const pct = (n: number) => `%${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;

export default function LandShareView() {
  const { state, act, project: scope } = useApp();
  const ls = state.landshare ?? seedLandShare;
  const withAgreement = ls.agreements.map((a) => a.project);
  const [project, setProject] = useState(withAgreement.includes(scope) ? scope : withAgreement[0]);
  const [open, setOpen] = useState<Unit | null>(null);
  const sum = useMemo(() => shareSummary(state, project), [state, project]);
  const ag = sum.agreement;
  const p = projects.find((x) => x.id === project);
  const landOwners = sum.owners.filter((o) => o.id !== CONTRACTOR);
  const history = ls.history.filter((h) => h.project === project);
  const noAgreement = projects.filter((x) => x.status === "Aktif" && !withAgreement.includes(x.id));

  return (
    <div className="fc-page">
      <header className="fc-head">
        <div>
          <span className="eyebrow">Kat karşılığı yönetimi</span>
          <h1>Arsa sahibi ve yüklenici paylaşımı</h1>
          <p>
            Hangi bağımsız bölümün kime ait olduğu, sözleşme oranı ile gerçekleşen paylaşım, anlaşma aşamaları ve
            teslim yükümlülükleri tek ekranda. Paydaş değişikliği satış stoğunu ve raporları anında günceller.
          </p>
        </div>
        <div className="fc-switch" role="tablist" aria-label="Proje">
          {withAgreement.map((id) => (
            <button key={id} role="tab" aria-selected={id === project} className={id === project ? "active" : ""} onClick={() => setProject(id)}>
              {projects.find((x) => x.id === id)?.name ?? id}
            </button>
          ))}
        </div>
      </header>

      <section className="fc-kpis">
        <div className="fc-kpi">
          <span><Scale size={15} /> Sözleşme oranı</span>
          <b>{pct(sum.agreedLandRatio)} / {pct(100 - sum.agreedLandRatio)}</b>
          <small>Arsa sahibi / yüklenici · brüt alan esaslı</small>
        </div>
        <div className={`fc-kpi ${Math.abs(sum.deviation) > 1.5 ? "warn" : ""}`}>
          <span><Landmark size={15} /> Gerçekleşen arsa sahibi payı</span>
          <b>{pct(sum.actualLandRatio)}</b>
          <small>
            {sum.landGross.toLocaleString("tr-TR")} / {sum.totalGross.toLocaleString("tr-TR")} m² · sapma{" "}
            {sum.deviation > 0 ? "+" : ""}
            {sum.deviation.toLocaleString("tr-TR")} puan
          </small>
        </div>
        <div className="fc-kpi">
          <span>Yüklenici payı</span>
          <b>{sum.contractorUnits} bölüm</b>
          <small>{sum.contractorSold} satıldı · {sum.contractorSellable} satışa açık</small>
        </div>
        <div className={`fc-kpi ${sum.openObligations ? "warn" : ""}`}>
          <span><ClipboardCheck size={15} /> Açık yükümlülük</span>
          <b>{sum.openObligations}</b>
          <small>Teslim ve sözleşme yükümlülükleri</small>
        </div>
        <div className={`fc-kpi ${sum.missingDocs ? "warn" : ""}`}>
          <span><FileWarning size={15} /> Eksik / incelenen belge</span>
          <b>{sum.missingDocs}</b>
          <small>{ag?.documents.length ?? 0} belgeden</small>
        </div>
      </section>

      <div className="fc-grid">
        <Panel
          title="Kat bazlı paylaşım planı"
          subtitle={`${p?.name} · ${sum.totalUnits} bağımsız bölüm · bir bölüme tıklayarak paydaşını değiştirin`}
          className="fc-plan"
        >
          <div className="fc-legend">
            <span><i className="o-yk" /> Yüklenici</span>
            {landOwners.map((o) => (
              <span key={o.id}><i className={ownerColorClass(state, project, o.id)} /> {o.name}</span>
            ))}
            <span className="sep" />
            <span><em className="st st-sold" /> Satıldı</span>
            <span><em className="st st-sign" /> İmza sürecinde</span>
            <span><em className="st st-barter" /> Barter</span>
            <span><em className="st st-res" /> Rezerve</span>
          </div>
          <div className="fc-floors">
            {sum.floors.map((f) => (
              <div className="fc-floor" key={f.floor}>
                <span className="fc-floor-label">{f.label}</span>
                <div className="fc-floor-units">
                  {f.units.map(({ unit: u, owner, state: st }) => (
                    <button
                      key={u.id}
                      className={`fc-unit ${ownerColorClass(state, project, owner)} ${stateClass(st)}`}
                      onClick={() => setOpen(u)}
                      title={`${u.label} · ${u.type} · ${u.gross} m² · ${ownerName(state, project, owner)} · ${st}`}
                    >
                      <b>{u.label}</b>
                      <small>{u.type} · {u.gross} m²</small>
                      {st !== "Müsait" && st !== "Arsa sahibi" && <em className={`st ${stateClass(st)}`} aria-label={st} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="fc-side">
          <Panel title="Paydaşlar" subtitle={ag?.parcel}>
            <div className="e-table-wrap">
              <table>
                <thead>
                  <tr><th>Paydaş</th><th className="numeric">Bölüm</th><th className="numeric">Brüt m²</th><th className="numeric">Liste değeri</th></tr>
                </thead>
                <tbody>
                  {sum.owners.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className="fc-owner"><i className={ownerColorClass(state, project, o.id)} />{o.name}</span>
                        {o.id !== CONTRACTOR && <small>Arsa sahibi payı içinde hisse {pct(o.stake)}</small>}
                      </td>
                      <td className="numeric">{o.flats}{o.shops ? <small>+ {o.shops} dükkân</small> : null}</td>
                      <td className="numeric">{o.gross.toLocaleString("tr-TR")}</td>
                      <td className="numeric">{compact(o.listValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fc-note">Liste değerleri temsili liste fiyatlarından hesaplanır; satış bedeli değildir.</p>
          </Panel>

          <Panel title="Anlaşma aşamaları">
            <ol className="fc-steps">
              {ag?.steps.map((st) => (
                <li key={st.key} className={st.status === "Tamamlandı" ? "done" : st.status === "Devam ediyor" ? "now" : ""}>
                  <div>
                    <b>{st.title}</b>
                    <small>{st.date ? date(st.date) : "Tarih yok"}</small>
                  </div>
                  <select
                    aria-label={`${st.title} durumu`}
                    value={st.status}
                    onChange={(e) => act({ type: "share-step", project, key: st.key, status: e.target.value as StepStatus })}
                  >
                    {STEP_STATUSES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <div className="fc-grid three">
        <Panel title="Teslim yükümlülükleri" subtitle="Tamamlananı işaretleyin; değişiklik geçmişe yazılır">
          <ul className="fc-checks">
            {ag?.obligations.map((o) => (
              <li key={o.id} className={o.done ? "done" : o.due < "2026-11-15" ? "late" : ""}>
                <label>
                  <input type="checkbox" checked={o.done} onChange={() => act({ type: "obligation-toggle", project, id: o.id })} />
                  <span>
                    <b>{o.title}</b>
                    <small>{o.party} · {date(o.due)}{!o.done && o.due < "2026-11-15" ? " · gecikti" : ""}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Sözleşme ve belgeler" subtitle="Temsili belge takibi; hukuki doğrulama yapılmaz">
          <ul className="fc-docs">
            {ag?.documents.map((d) => (
              <li key={d.id}>
                <span><b>{d.title}</b><small>{d.id}{d.date ? ` · ${date(d.date)}` : ""}</small></span>
                <Badge tone={d.status === "Tamam" ? "green" : d.status === "Eksik" ? "red" : "amber"}>{d.status}</Badge>
              </li>
            ))}
          </ul>
          <Link className="e-text-link" href="/arsiv">Belge arşivine git <ArrowRight size={14} /></Link>
        </Panel>
        <Panel title="Değişiklik geçmişi" action={<History size={16} className="muted" />}>
          <ul className="fc-history">
            {history.length === 0 && <li className="muted">Bu proje için kayıt yok.</li>}
            {history.slice(0, 8).map((h) => (
              <li key={h.id}><small>{date(h.date)}</small><span>{h.text}</span></li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Bağımsız bölüm listesi" subtitle="Paydaş, ticari durum ve temsili liste fiyatı">
        <div className="e-table-wrap">
          <table>
            <thead>
              <tr><th>Bölüm</th><th>Kat</th><th>Tip</th><th className="numeric">Brüt m²</th><th>Paydaş</th><th>Durum</th><th className="numeric">Liste fiyatı</th><th /></tr>
            </thead>
            <tbody>
              {sum.floors.flatMap((f) => f.units).sort((a, b) => a.unit.no - b.unit.no).map(({ unit: u, owner, state: st }) => (
                <tr key={u.id} className="clickable" onClick={() => setOpen(u)}>
                  <td><b>{u.label}</b></td>
                  <td>{u.floorLabel}</td>
                  <td>{u.type}</td>
                  <td className="numeric">{u.gross}</td>
                  <td><span className="fc-owner"><i className={ownerColorClass(state, project, owner)} />{ownerName(state, project, owner)}</span></td>
                  <td><Badge tone={STATE_TONE[st]}>{st}</Badge></td>
                  <td className="numeric">{money(u.listPrice)}</td>
                  <td className="row-actions"><button className="btn compact">Aç</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {noAgreement.length > 0 && (
        <p className="fc-note">
          Kat karşılığı anlaşması tanımlı olmayan aktif projeler: {noAgreement.map((x) => x.name).join(", ")}. Bu projelerin bütün bölümleri yüklenici payında izlenir.
        </p>
      )}

      {open && (
        <UnitShareDrawer
          key={open.id}
          unit={open}
          project={project}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

const stateClass = (st: UnitState) =>
  st === "Satıldı" ? "st-sold" : st === "İmza sürecinde" ? "st-sign" : st === "Barter" ? "st-barter" : st === "Rezerve" ? "st-res" : "";

function UnitShareDrawer({ unit, project, onClose }: { unit: Unit; project: string; onClose: () => void }) {
  const { state, act } = useApp();
  const sum = shareSummary(state, project);
  const ag = agreementOf(state, project);
  const row = sum.floors.flatMap((f) => f.units).find((x) => x.unit.id === unit.id)!;
  const [owner, setOwner] = useState(row.owner);
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");
  const locked = row.owner === CONTRACTOR && row.state !== "Müsait";
  // Değişiklik önizlemesi: gerçekleşen arsa sahibi oranı ne olur?
  const delta = owner === row.owner ? 0 : (owner === CONTRACTOR ? -unit.gross : row.owner === CONTRACTOR ? unit.gross : 0);
  const preview = sum.totalGross ? Math.round(((sum.landGross + delta) / sum.totalGross) * 1000) / 10 : 0;
  return (
    <Drawer open title={`${unit.label} · ${unit.type}`} eyebrow={`Kat karşılığı · ${projects.find((x) => x.id === project)?.name}`} onClose={onClose}>
      <dl className="file-summary">
        <div><dt>Kat</dt><dd>{unit.floorLabel}</dd></div>
        <div><dt>Brüt / net</dt><dd>{unit.gross} / {unit.net} m²</dd></div>
        <div><dt>Cephe</dt><dd>{unit.facade}</dd></div>
        <div><dt>Liste fiyatı (temsili)</dt><dd className="num">{money(unit.listPrice)}</dd></div>
        <div><dt>Paydaş</dt><dd>{ownerName(state, project, row.owner)}</dd></div>
        <div><dt>Ticari durum</dt><dd><Badge tone={STATE_TONE[row.state]}>{row.state}</Badge></dd></div>
      </dl>
      {done && <p className="callout success">{done}</p>}
      {locked ? (
        <p className="callout">
          Bu bölüm yüklenici payında ve <b>{row.state.toLowerCase()}</b> durumunda. Satılmış, imza sürecindeki, barterli
          veya rezerve bölüm arsa sahibine aktarılamaz. Önce ilgili kaydı kapatın.
        </p>
      ) : (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            if (owner === row.owner) return;
            if (act({ type: "share-assign", unit: unit.id, owner, note })) {
              setDone(`Paydaş güncellendi. Gerçekleşen arsa sahibi payı ${pct(preview)} oldu; satış stoğu ve raporlar yenilendi.`);
              setNote("");
            }
          }}
        >
          <label className="full">
            Paydaş
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value={CONTRACTOR}>Yüklenici · BŞ Falcon Group</option>
              {ag?.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <label className="full">
            Değişiklik notu
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. ek protokol taslağına göre" maxLength={120} />
          </label>
          <p className="full muted">
            Kaydedilirse gerçekleşen arsa sahibi payı {pct(sum.actualLandRatio)} → <b>{pct(preview)}</b> (sözleşme {pct(sum.agreedLandRatio)}).
            {owner !== CONTRACTOR ? " Arsa sahibi payındaki bölüm yüklenici satışına kapanır." : " Bölüm yüklenici satış stoğuna açılır."}
          </p>
          <div className="form-actions full">
            <button type="button" className="btn" onClick={onClose}>Kapat</button>
            <button className="btn primary" disabled={owner === row.owner}>Paydaşı kaydet</button>
          </div>
        </form>
      )}
      {row.owner === CONTRACTOR && row.state === "Müsait" && (
        <Link className="e-text-link" href="/daireler">Bu bölüm için satış sözleşmesi hazırla (Daireler) <ArrowRight size={14} /></Link>
      )}
    </Drawer>
  );
}
