"use client";
import { useState } from "react";
import {
  HardHat,
  TriangleAlert,
  PackageCheck,
  UsersRound,
  PenLine,
  ArrowUpRight,
  Download,
} from "lucide-react";
import { useApp } from "../enterprise/context";
import {
  SectionTitle,
  Kpi,
  Panel,
  SearchBox,
  Progress,
  Badge,
  Status,
  Drawer,
  AuditTrail,
  Empty,
} from "../enterprise/shared";
import {
  workList,
  projects,
  projectProgress,
  summary,
  pname,
  requestList,
  progressInfo,
} from "@/lib/enterprise";
import { csvDownload } from "@/lib/export";
import Link from "next/link";
export default function SiteProgress() {
  const { state, project, act, setProject } = useApp();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<string | null>(null);
  const all = workList(state).filter(
    (w) => project === "all" || w.project === project,
  );
  const work = all.filter(
    (w) =>
      (w.name + w.company)
        .toLocaleLowerCase("tr")
        .includes(q.toLocaleLowerCase("tr")) &&
      (filter === "all" ||
        (filter === "active"
          ? w.progress > 0 && w.progress < 100
          : filter === "complete"
            ? w.progress === 100
            : w.progress === 0)),
  );
  const s = summary(state, project),
    w = all.find((w) => w.id === selected);
  const critical = all.filter((w) => w.id === "w6" && w.progress < 100).length;
  return (
    <>
      <SectionTitle
        title="Şantiye"
        description="İmalat gerçekleşmeleri, malzeme durumu ve saha kararları tek programda."
        actions={
          <button
            className="btn"
            onClick={() =>
              csvDownload(
                [
                  [
                    "İş paketi",
                    "Proje",
                    "Taşeron",
                    "Ağırlık",
                    "İlerleme",
                    "Malzeme",
                  ],
                  ...work.map((w) => [
                    w.name,
                    pname(w.project),
                    w.company,
                    w.weight,
                    w.progress,
                    w.material,
                  ]),
                ],
                "byguzel-saha-raporu.csv",
              )
            }
          >
            <Download size={16} /> Saha raporu
          </button>
        }
      />
      <div className="e-kpis">
        <Kpi
          label="Portföy ilerlemesi"
          value={`%${s.progress}`}
          sub="Proje bütçeleriyle ağırlıklandırılmış"
          progress={s.progress}
          icon={<HardHat size={19} />}
        />
        <Kpi
          label="Devam eden iş paketi"
          value={String(
            all.filter((w) => w.progress > 0 && w.progress < 100).length,
          )}
          sub={`${all.length} iş paketinden`}
          icon={<UsersRound size={19} />}
        />
        <Kpi
          label="Kritik gecikme"
          value={String(critical)}
          sub={
            critical
              ? "Guzel Life Premium betonarme · 3 gün"
              : "Kritik gecikme kaydı bulunmuyor"
          }
          icon={<TriangleAlert size={19} />}
          tone={critical ? "red" : "green"}
        />
        <Kpi
          label="Teslim alınan talep"
          value={String(
            requestList(state).filter(
              (r) =>
                (project === "all" || r.project === project) &&
                state.delivered.includes(r.id),
            ).length,
          )}
          sub="Satın alma kabulü tamamlandı"
          icon={<PackageCheck size={19} />}
        />
      </div>
      <div className="e-grid site-grid">
        <Panel
          title="İmalat takip programı"
          subtitle="İlerleme güncellendiğinde proje özetleri otomatik hesaplanır."
        >
          <div className="e-toolbar">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="İş paketi veya taşeron ara…"
            />
            <select
              aria-label="İmalat durumu"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Tüm iş paketleri</option>
              <option value="active">Devam eden</option>
              <option value="complete">Tamamlanan</option>
              <option value="planned">Başlamayan</option>
            </select>
          </div>
          {projects
            .filter((p) => project === "all" || p.id === project)
            .map((p) => (
              <div className="site-project" key={p.id}>
                <div className="site-project-head">
                  <h3>{p.name}</h3>
                  {progressInfo(state, p.id).value === null ? (
                    <Badge tone="neutral">
                      İlerleme hesaplanamaz · ağırlık %{progressInfo(state, p.id).weight}
                    </Badge>
                  ) : (
                    <Badge>%{progressInfo(state, p.id).value} tamamlandı</Badge>
                  )}
                </div>
                {work
                  .filter((w) => w.project === p.id)
                  .map((w) => (
                    <button
                      className="e-work-row"
                      key={w.id}
                      onClick={() => setSelected(w.id)}
                    >
                      <span
                        className={`work-number ${w.progress === 100 ? "complete" : ""}`}
                      >
                        {w.progress === 100 ? "✓" : w.id.slice(1)}
                      </span>
                      <div>
                        <div className="flex-between">
                          <b>{w.name}</b>
                          <strong>%{w.progress}</strong>
                        </div>
                        <p>
                          {w.company} · Ağırlık %{w.weight}
                        </p>
                        <Progress value={w.progress} />
                      </div>
                      <PenLine size={16} />
                    </button>
                  ))}
              </div>
            ))}
          {!work.length && (
            <Empty title="Filtreye uygun iş paketi bulunamadı" />
          )}
        </Panel>
        <div className="e-stack">
          <Panel
            title="Saha öncelikleri"
            subtitle="Programı etkileyen kritik başlıklar"
          >
            <div className="site-priorities">
              {critical > 0 && (
                <div>
                  <Badge tone="red">3 gün program sapması</Badge>
                  <h3>Guzel Life Premium demir sevkiyatı</h3>
                  <p>
                    {state.delivered.includes("SAT-018")
                      ? "Demir teslim alındı. İmalat programı ve saha ilerlemesi güncellenmeli."
                      : state.approved.includes("SAT-018")
                        ? "Satın alma onaylandı. Malzeme teslim kabulü bekleniyor."
                        : "32 ton demir talebi yönetici onayında. Sevkiyat için 18 Kasım hedefleniyor."}
                  </p>
                  <Link
                    href="/satinalma"
                    className="e-text-link"
                    onClick={() => setProject("nergis")}
                  >
                    İlgili satın alma <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
              {(project === "all" || project === "cengilli") && (
                <div>
                  <Badge>Guzel Nature</Badge>
                  <h3>Kat imalatı kontrolü</h3>
                  <p>
                    Betonarme imalat ilerlemesi %
                    {all.find((w) => w.id === "w2")?.progress ?? 60}. Hakediş
                    ölçüm dosyası{" "}
                    {state.approved.includes("HAK-024")
                      ? "onaylandı."
                      : "yönetici değerlendirmesinde."}
                  </p>
                  <Link
                    href="/operasyon"
                    className="e-text-link"
                    onClick={() => setProject("cengilli")}
                  >
                    Hakedişi incele <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
              {(project === "all" || project === "agva") && (
                <div>
                  <Badge>City Prime</Badge>
                  <h3>Zemin etüdü ve iksa</h3>
                  <p>
                    Temel ve zemin işleri %
                    {all.find((w) => w.id === "w9")?.progress ?? 80}. İksa raporu proje
                    müellifiyle değerlendirilecek; betonarme teklifleri toplanıyor.
                  </p>
                  <Link
                    href="/evrak"
                    className="e-text-link"
                    onClick={() => setProject("agva")}
                  >
                    Evrakı incele <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
              {critical === 0 && project !== "all" && project !== "cengilli" && project !== "agva" && (
                <p className="muted">
                  Bu kapsamda kayıtlı saha önceliği yok. İş paketleri ve hakedişler Taşeronlar ve
                  Hakediş ekranlarından izlenir.
                </p>
              )}
            </div>
          </Panel>
          <Panel title="Malzeme ve teslim durumu">
            <div className="material-tracker">
              {all
                .filter((w) => w.progress < 100)
                .map((w) => (
                  <button key={w.id} onClick={() => setSelected(w.id)}>
                    <span className="material-dot" />
                    <span>
                      <b>
                        {w.id === "w6" && state.delivered.includes("SAT-018")
                          ? "İnşaat demiri · teslim alındı"
                          : w.material}
                      </b>
                      <small>{pname(w.project)}</small>
                    </span>
                    <PenLine size={14} />
                  </button>
                ))}
            </div>
          </Panel>
        </div>
      </div>
      <Drawer
        open={!!w}
        title={w?.name ?? "İmalat kaydı"}
        eyebrow={w ? `${pname(w.project)} · ${w.company}` : undefined}
        onClose={() => setSelected(null)}
      >
        {w && (
          <form
            key={w.id}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                act({
                  type: "work",
                  id: w.id,
                  patch: {
                    progress: Number(f.get("progress")),
                    material: String(f.get("material")),
                    note: String(f.get("note")),
                  },
                })
              )
                setSelected(null);
            }}
          >
            <div className="callout">
              Bu iş paketinin proje ilerlemesine ağırlığı %{w.weight}.
              Kaydettiğiniz yüzde dashboard, portföy ve proje merkezine yansır.
            </div>
            <div className="form-grid">
              <label>
                Gerçekleşme yüzdesi
                <input
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={w.progress}
                  required
                />
              </label>
              <label>
                Taşeron
                <input value={w.company} readOnly />
              </label>
              <label className="full">
                Malzeme durumu
                <input
                  name="material"
                  defaultValue={w.material}
                  required
                  maxLength={150}
                />
              </label>
              <label className="full">
                Saha notu
                <textarea
                  name="note"
                  defaultValue={w.note ?? ""}
                  placeholder="Kontrol sonucu, aksiyon ve sorumlu…"
                  maxLength={1000}
                />
              </label>
            </div>
            <button className="btn primary" type="submit">
              İmalat kaydını güncelle
            </button>
            <h3 className="subheading">Güncelleme geçmişi</h3>
            <AuditTrail items={state.audit.filter((a) => a.entity === w.id)} />
          </form>
        )}
      </Drawer>
    </>
  );
}
