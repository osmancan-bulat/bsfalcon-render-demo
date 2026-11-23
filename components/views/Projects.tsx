"use client";
// Proje portföyü ve proje yönetimi: SANE İnşaat'ın bütün projeleri. Yeni proje oluşturma, bilgileri
// düzenleme, durum (aktif / tamamlandı / arşiv) ve kaydı olmayan projeyi silme. Yeni proje boş başlar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Badge, Progress, Drawer } from "../enterprise/shared";
import { projects, progressInfo, type EnterpriseState } from "@/lib/enterprise";
import { salesReport, financialReport } from "@/lib/reports";
import { hubHref } from "@/lib/catalog";
import { compact } from "@/lib/data";
import type { Project } from "@/lib/data";

const TONE: Record<string, string> = { Aktif: "green", Tamamlandı: "neutral", Arşiv: "amber" };

export default function Projects() {
  const { state, project, setProject, act } = useApp();
  const router = useRouter();
  const [form, setForm] = useState<"new" | string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const all = projects;
  const archived = all.filter((p) => p.status === "Arşiv");
  const list = all.filter(
    (p) => (project === "all" || p.id === project) && (showArchived || p.status !== "Arşiv"),
  );
  const editing = form && form !== "new" ? all.find((p) => p.id === form) : undefined;
  const open = (p: Project) => {
    setProject(p.id);
    router.push(hubHref(p.id));
  };
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Proje portföyü</h1>
          <p>
            SANE İnşaat’ın projeleri. Yeni proje eklemek için kod değişikliği
            gerekmez; eklenen proje kapsam seçicide, şirket genel bakışında ve
            raporlarda otomatik yer alır.
          </p>
        </div>
        <button className="btn primary" onClick={() => setForm("new")}>
          <Plus size={15} /> Yeni proje
        </button>
      </header>
      <StockLine state={state} scope={project} />
      {archived.length > 0 && (
        <label className="pf-toggle">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Arşivdeki projeleri göster ({archived.length})
        </label>
      )}
      <div className="pf-grid">
        {list.map((p) => {
          const fin = financialReport(state, { project: p.id });
          const st = salesReport(state, { project: p.id }).total;
          const prog = progressInfo(state, p.id);
          return (
            <article key={p.id} className={`pf-card ${p.status === "Arşiv" ? "archived" : ""}`}>
              {p.image && (
                <div className="project-cover">
                  <img src={p.image} alt={`${p.name} resmî proje görseli`} loading="lazy" />
                  <span>Görsel: saneinsaat.net</span>
                </div>
              )}
              <header className="pf-head">
                <div>
                  <h2>{p.name}</h2>
                  <p>
                    {p.location || "Konum girilmedi"} · kod {p.code}
                    {p.delivery ? ` · teslim ${p.delivery}` : ""}
                  </p>
                </div>
                <Badge tone={TONE[p.status]}>{p.status}</Badge>
              </header>
              {p.description && (
                <p className="pf-desc" title={p.description}>
                  {p.description}
                </p>
              )}
              <section className="pf-section" aria-label="Daire stoku">
                <div className="pf-section-head">
                  <span>Daire stoku</span>
                  <b className="num">
                    {st.sold} <small>/ {st.total} satıldı</small>
                  </b>
                </div>
                {st.total > 0 ? (
                  <>
                    <StockBar s={st} />
                    <p className="pf-legend">
                      {st.available} müsait · {st.inSigning} imza sürecinde · {st.barter} barter · {st.reserved} rezerve
                    </p>
                  </>
                ) : (
                  <p className="pf-legend">Henüz daire yok — Daireler ekranından blok ekleyin.</p>
                )}
              </section>
              <dl className="pf-figures" aria-label="Finansal durum">
                <div>
                  <dt>Sözleşmeli satış</dt>
                  <dd className="num">{compact(fin.contracted)}</dd>
                </div>
                <div>
                  <dt>Tahsil edilen</dt>
                  <dd className="num">
                    {compact(fin.collected)}
                    {fin.contracted > 0 && <small> %{Math.round(fin.collectionRate * 100)}</small>}
                  </dd>
                </div>
                <div>
                  <dt>Kalan alacak</dt>
                  <dd className="num">{compact(fin.balance)}</dd>
                </div>
                <div>
                  <dt>Geciken</dt>
                  <dd className={`num ${fin.overdue > 0 ? "danger" : ""}`}>{compact(fin.overdue)}</dd>
                </div>
              </dl>
              <section className="pf-section" aria-label="Şantiye ilerlemesi">
                <div className="pf-section-head">
                  <span>Şantiye ilerlemesi</span>
                  <b className="num">{prog.value === null ? "—" : `%${prog.value}`}</b>
                </div>
                {prog.value !== null ? (
                  <>
                    <Progress value={prog.value} />
                    <p className="pf-legend">
                      {prog.packages} iş paketinin ağırlıklı ilerlemesi (ağırlık toplamı %100)
                    </p>
                  </>
                ) : (
                  <p className="pf-legend">
                    {prog.packages
                      ? `${prog.packages} iş paketi · ağırlık toplamı %${prog.weight}; %100 tanımlanınca hesaplanır`
                      : "İş paketi tanımlı değil — Taşeronlar ekranından eklenir"}
                  </p>
                )}
              </section>
              <footer className="pf-actions">
                {p.status === "Arşiv" ? (
                  <span className="pf-legend">
                    Arşivde — kayıtları raporlarda korunur. Çalışmak için Düzenle › Yeniden aktifleştir.
                  </span>
                ) : (
                  <>
                    <button className="btn primary" onClick={() => open(p)}>
                      Proje merkezi <ArrowUpRight size={15} />
                    </button>
                    <Link className="btn" href="/daireler" onClick={() => setProject(p.id)}>
                      Daireler
                    </Link>
                  </>
                )}
                <button className="text-button pf-edit" onClick={() => setForm(p.id)}>
                  Düzenle
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      <ProjectDrawer
        key={form ?? "closed"}
        open={!!form}
        project={editing}
        onClose={() => setForm(null)}
        onCreated={(id) => {
          setForm(null);
          setProject(id);
          router.push("/daireler");
        }}
        act={act}
      />
    </>
  );
}

function ProjectDrawer({
  open,
  project,
  onClose,
  onCreated,
  act,
}: {
  open: boolean;
  project?: Project;
  onClose: () => void;
  onCreated: (id: string) => void;
  act: ReturnType<typeof useApp>["act"];
}) {
  const [busy, setBusy] = useState(false);
  const isNew = !project;
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const d = new FormData(e.currentTarget);
    const v = (k: string) => String(d.get(k) ?? "");
    setBusy(true);
    if (isNew) {
      const before = new Set(projects.map((p) => p.id));
      const ok = act({
        type: "project-create",
        record: { name: v("name"), code: v("code"), location: v("location"), delivery: v("delivery"), description: v("description") },
      });
      if (ok) {
        const created = projects.find((p) => !before.has(p.id));
        if (created) onCreated(created.id);
      }
    } else {
      if (act({ type: "project-update", id: project.id, patch: { name: v("name"), location: v("location"), delivery: v("delivery"), description: v("description") } }))
        onClose();
    }
    setBusy(false);
  }
  const status = (st: Project["status"]) => {
    if (project && act({ type: "project-status", id: project.id, status: st })) onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title={isNew ? "Yeni proje" : `${project.name} · proje bilgileri`} eyebrow="PROJE YÖNETİMİ">
      <form className="e-form" onSubmit={submit}>
        {isNew && (
          <p className="drawer-intro">
            Yeni proje boş başlar: başka projenin müşterisi, satışı veya tahsilatı kopyalanmaz.
            Kaydettikten sonra Daireler ekranında blok ve daire ekleyin.
          </p>
        )}
        <label>
          Proje adı
          <input name="name" required minLength={2} maxLength={60} defaultValue={project?.name} />
        </label>
        {isNew ? (
          <label>
            Proje kodu
            <input name="code" required pattern="[A-Za-zÇĞİÖŞÜçğıöşü]{2,4}" maxLength={4} placeholder="Ör. KV" />
            <small className="muted">2–4 harf; sözleşme numaralarında kullanılır (SZL-KV-001). Sonradan değişmez.</small>
          </label>
        ) : (
          <p className="muted">Proje kodu: {project.code} (sözleşme numaralarında kullanıldığı için değiştirilemez)</p>
        )}
        <label>
          Konum
          <input name="location" maxLength={80} defaultValue={project?.location} placeholder="İlçe / il" />
        </label>
        <label>
          Teslim hedefi
          <input name="delivery" maxLength={40} defaultValue={project?.delivery} placeholder="Ör. Haziran 2029" />
        </label>
        <label>
          Açıklama
          <textarea name="description" maxLength={240} rows={3} defaultValue={project?.description} />
        </label>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn primary" disabled={busy}>
            {isNew ? "Projeyi oluştur" : "Kaydet"}
          </button>
        </div>
      </form>
      {!isNew && (
        <section className="acct-section">
          <h3 className="subheading">Proje durumu</h3>
          <p className="muted">
            Arşivdeki proje kapsam seçicide görünmez ve yeni satış alamaz; sözleşme, tahsilat ve
            rapor kayıtları korunur ve şirket toplamlarında kalır. İstendiğinde yeniden aktifleştirilir.
          </p>
          <div className="form-actions">
            {project.status !== "Aktif" && (
              <button className="btn" onClick={() => status("Aktif")}>
                Yeniden aktifleştir
              </button>
            )}
            {project.status === "Aktif" && (
              <button className="btn" onClick={() => status("Tamamlandı")}>
                Tamamlandı olarak işaretle
              </button>
            )}
            {project.status !== "Arşiv" && (
              <button className="btn" onClick={() => status("Arşiv")}>
                Arşive al
              </button>
            )}
            {!project.builtIn && (
              <button
                className="btn danger"
                onClick={() => {
                  if (act({ type: "project-delete", id: project.id })) onClose();
                }}
              >
                Projeyi sil
              </button>
            )}
          </div>
          {!project.builtIn && (
            <p className="muted">Yalnızca hiç satış, sözleşme, barter veya hakediş kaydı olmayan proje silinebilir.</p>
          )}
        </section>
      )}
    </Drawer>
  );
}

type Stock = ReturnType<typeof salesReport>["total"];
const SEGMENTS: [keyof Stock, string, string][] = [
  ["sold", "Satıldı", "sold"],
  ["inSigning", "İmza sürecinde", "draft"],
  ["barter", "Barter", "barter"],
  ["reserved", "Rezerve", "reserved"],
  ["available", "Müsait", "available"],
];
/** Daire stoku çubuğu: segmentlerin toplamı her zaman toplam daireye eşittir. */
function StockBar({ s }: { s: Stock }) {
  return (
    <div
      className="pf-stock"
      role="img"
      aria-label={SEGMENTS.map(([k, l]) => `${l} ${s[k]}`).join(", ")}
    >
      {SEGMENTS.map(([k, l, cls]) =>
        (s[k] as number) > 0 ? (
          <i
            key={k}
            className={`seg-${cls}`}
            style={{ flexGrow: s[k] as number }}
            title={`${l}: ${s[k]}`}
          />
        ) : null,
      )}
    </div>
  );
}
/** Portföy stok uzlaştırması: toplam = satılan + imza sürecinde + barter + rezerve + müsait. */
function StockLine({ state, scope }: { state: EnterpriseState; scope: string }) {
  const visible = projects.filter((p) => p.status !== "Arşiv");
  const ids = scope === "all" ? visible.map((p) => p.id) : [scope];
  const t = ids
    .map((id) => salesReport(state, { project: id }).total)
    .reduce(
      (a, x) => ({
        total: a.total + x.total,
        sold: a.sold + x.sold,
        inSigning: a.inSigning + x.inSigning,
        barter: a.barter + x.barter,
        reserved: a.reserved + x.reserved,
        available: a.available + x.available,
      }),
      { total: 0, sold: 0, inSigning: 0, barter: 0, reserved: 0, available: 0 },
    );
  const active = projects.filter((p) => p.status === "Aktif").length;
  const archivedCount = projects.length - visible.length;
  return (
    <section className="pf-summary" aria-label="Portföy özeti">
      <div>
        <span>Projeler</span>
        <b className="num">{active}</b>
        <small>
          aktif · {projects.length} toplam
          {archivedCount ? ` · ${archivedCount} arşivde` : ""}
        </small>
      </div>
      <div className="pf-summary-stock">
        <span>
          Bağımsız bölüm ·{" "}
          {scope === "all"
            ? `tüm projeler${archivedCount ? " (arşiv hariç)" : ""}`
            : (projects.find((p) => p.id === scope)?.name ?? "")}
        </span>
        <p className="num">
          <b>{t.total}</b> = {t.sold} satılan + {t.inSigning} imza sürecinde + {t.barter} barter +{" "}
          {t.reserved} rezerve + <b>{t.available} müsait</b>
        </p>
      </div>
    </section>
  );
}
