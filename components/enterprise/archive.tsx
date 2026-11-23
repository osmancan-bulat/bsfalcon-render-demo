"use client";
import { useEffect, useState } from "react";
import { Upload, Files, HardDrive, Link2, FilePlus2 } from "lucide-react";
import { useApp } from "./context";
import { isScopeValid } from "@/lib/catalog";
import {
  SectionTitle,
  Kpi,
  Panel,
  SearchBox,
  Drawer,
  Empty,
  Badge,
} from "./shared";
import {
  projects,
  customerList,
  pname,
  contractList,
  contractNumber,
  systemDocuments,
  workContracts,
  workContractDocument,
  SNAPSHOT,
} from "@/lib/enterprise";
import { unitById } from "@/lib/units";
import { money, date } from "@/lib/data";
const fileSize = (b: number) =>
  b < 1024 * 1024
    ? `${(b / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} KB`
    : `${(b / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} MB`;
import {
  readArchive,
  saveArchive,
  validateArchiveFile,
  documentValidity,
  type ArchiveFile,
} from "@/lib/archive";
const VALIDITY_TONE: Record<string, string> = {
  Geçerli: "green",
  Süresiz: "neutral",
  "Süresi yaklaşıyor": "amber",
  "Süresi doldu": "red",
};
export default function ArchiveView() {
  const { state, project, notify } = useApp();
  const [files, setFiles] = useState<ArchiveFile[]>([]),
    [q, setQ] = useState(""),
    [kind, setKind] = useState("all"),
    [create, setCreate] = useState(false),
    [selected, setSelected] = useState<ArchiveFile | null>(null),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [scope, setScope] = useState(project === "all" ? (projects.find((p) => p.status === "Aktif")?.id ?? projects[0]?.id ?? "") : project),
    [record, setRecord] = useState(""),
    [onlyRecord, setOnlyRecord] = useState(""),
    [error, setError] = useState(""),
    [party, setParty] = useState("all"),
    [unitF, setUnitF] = useState("all"),
    [validity, setValidity] = useState("all"),
    [docLimit, setDocLimit] = useState(8);
  useEffect(() => {
    readArchive()
      .then(setFiles)
      .catch((e) => setError(e.message));
    const p = new URLSearchParams(location.search);
    const r = p.get("record");
    if (r) {
      setRecord(r);
      setOnlyRecord(r);
      // Bağlantıdaki proje geçersizse (silinmiş / arşivde) ilk aktif projeye dönülür
      const fromUrl = p.get("project");
      setScope(
        fromUrl && fromUrl !== "all" && isScopeValid(fromUrl)
          ? fromUrl
          : (projects.find((p) => p.status === "Aktif")?.id ?? projects[0]?.id ?? ""),
      );
    }
  }, []);
  useEffect(() => {
    if (!selected) {
      setUrl("");
      return;
    }
    const u = URL.createObjectURL(selected.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [selected]);
  const related = [
    ...customerList(state)
      .filter((c) => c.project === scope)
      .map((c) => ({ id: c.id, label: `${c.name} · ${c.unit}` })),
    ...state.barters
      .filter((b) => b.project === scope)
      .map((b) => ({
        id: b.id,
        label: `Barter · ${b.company} · ${unitById(b.unitId)?.label}`,
      })),
  ];
  const recordLabel = (r: string) => {
    if (!r) return "Proje geneli";
    if (r.startsWith("unit:"))
      return `Daire ${unitById(r.slice(5))?.label ?? r.slice(5)}`;
    const c = customerList(state).find((c) => c.id === r);
    if (c) return `${c.name} · ${c.unit}`;
    const b = state.barters.find((b) => b.id === r);
    if (b) return `Barter · ${b.company} · ${unitById(b.unitId)?.label}`;
    return r;
  };
  async function createSamples() {
    // Uygulama verisinden üretilen temsili metin belgeleri; yalnızca bu tarayıcıya kaydedilir.
    setBusy(true);
    try {
      const contracts = contractList(state).filter(
        (c) => c.account && state.contracts.some((x) => x.id === c.id),
      );
      const docs: ArchiveFile[] = [
        ...contracts.map((c) => {
          const text = [
            "TEMSİLİ DEMO BELGESİ — hukuki geçerliliği yoktur",
            `Satış sözleşmesi özeti · ${c.number}`,
            `Proje: ${pname(c.project)} · Daire ${c.unitLabel} (${c.type}, brüt ${c.gross} m²)`,
            `Alıcı: ${c.name} (kurgusal)`,
            `Bedel: ${money(c.price)} · Plan: ${c.planLabel}`,
          ].join("\n");
          const blob = new Blob([text], { type: "text/plain" });
          return {
            id: `sample-${c.id}`,
            name: `${c.number}-sozlesme-ozeti.txt`,
            project: c.project,
            record: c.id,
            company: "",
            kind: "Satış sözleşmesi",
            date: c.signedAt ?? SNAPSHOT,
            expiry: "",
            description:
              "Uygulama verisinden üretilmiş temsili sözleşme özeti.",
            size: blob.size,
            mime: "text/plain",
            blob,
            uploadedAt: SNAPSHOT,
          };
        }),
        ...state.barters.map((b) => {
          const text = [
            "TEMSİLİ DEMO BELGESİ — hukuki geçerliliği yoktur",
            `Barter (iş karşılığı daire) anlaşması · ${b.id}`,
            `Proje: ${pname(b.project)} · Daire ${unitById(b.unitId)?.label}`,
            `Firma: ${b.company} (kurgusal) · İş: ${b.work}`,
            `Bedel: ${money(b.amount)} · Süre: ${b.start} – ${b.end}`,
          ].join("\n");
          const blob = new Blob([text], { type: "text/plain" });
          return {
            id: `sample-${b.id}`,
            name: `${b.id}-barter-anlasmasi.txt`,
            project: b.project,
            record: b.id,
            company: b.company,
            kind: "Barter anlaşması",
            date: b.start,
            expiry: b.end,
            description:
              "Uygulama verisinden üretilmiş temsili barter anlaşması özeti.",
            size: blob.size,
            mime: "text/plain",
            blob,
            uploadedAt: SNAPSHOT,
          };
        }),
        ...[
          {
            id: "sample-proj-ruhsat",
            project: "cengilli",
            name: "cengilli-yapi-ruhsati-ozeti.txt",
            kind: "Proje belgesi",
            date: "2025-12-05",
            expiry: "2026-12-05",
            title: "Yapı ruhsatı kontrol özeti",
          },
          {
            id: "sample-proj-sigorta",
            project: "cengilli",
            name: "santiye-sigorta-policesi-ozeti.txt",
            kind: "Proje belgesi",
            date: "2025-11-01",
            expiry: "2026-11-01",
            title: "Şantiye sigorta poliçesi özeti (yenileme bekliyor)",
          },
        ].map((p) => {
          const blob = new Blob(
            [
              `TEMSİLİ DEMO BELGESİ — hukuki geçerliliği yoktur\n${p.title}\nProje: ${pname(p.project)}\nGeçerlilik: ${p.expiry}`,
            ],
            { type: "text/plain" },
          );
          return {
            id: p.id,
            name: p.name,
            project: p.project,
            record: "",
            company: "",
            kind: p.kind,
            date: p.date,
            expiry: p.expiry,
            description: p.title,
            size: blob.size,
            mime: "text/plain",
            blob,
            uploadedAt: SNAPSHOT,
          };
        }),
      ];
      for (const d of docs) await saveArchive(d);
      setFiles(await readArchive());
      notify(`${docs.length} temsili belge bu tarayıcıya kaydedildi.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Örnek belgeler oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }
  // Belgenin bağlı olduğu sözleşme, taraf ve daire
  const docInfo = (f: ArchiveFile) => {
    const r = f.record;
    if (r.startsWith("unit:")) {
      const id = r.slice(5);
      const c = customerList(state).find((c) => c.id === id);
      return {
        contract: c ? contractNumber(id) : "—",
        party: c?.name ?? (f.company || "—"),
        unit: unitById(id)?.label ?? id,
      };
    }
    const c =
      customerList(state).find((c) => c.id === r) ??
      state.drafts.find((d) => d.id === r);
    if (c)
      return { contract: contractNumber(c.id), party: c.name, unit: c.unit };
    const b = state.barters.find((b) => b.id === r);
    if (b)
      return {
        contract: b.id,
        party: b.company,
        unit: unitById(b.unitId)?.label ?? "—",
      };
    return { contract: "—", party: f.company || "Proje geneli", unit: "—" };
  };
  const scoped = files.filter(
    (f) =>
      (project === "all" || f.project === project) &&
      (!onlyRecord || f.record === onlyRecord),
  );
  const parties = [...new Set(scoped.map((f) => docInfo(f).party))].sort(
    (a, b) => a.localeCompare(b, "tr"),
  );
  const unitsInUse = [
    ...new Set(scoped.map((f) => docInfo(f).unit).filter((u) => u !== "—")),
  ].sort();
  const rows = scoped.filter((f) => {
    const i = docInfo(f);
    return (
      (kind === "all" || f.kind === kind) &&
      (party === "all" || i.party === party) &&
      (unitF === "all" || i.unit === unitF) &&
      (validity === "all" || documentValidity(f.expiry) === validity) &&
      `${f.name} ${f.company} ${f.description} ${i.contract} ${i.party} ${i.unit}`
        .toLocaleLowerCase("tr")
        .includes(q.toLocaleLowerCase("tr"))
    );
  });
  const contractDocs = [...customerList(state), ...state.drafts]
    .filter((c) => project === "all" || c.project === project)
    .map((c) => systemDocuments(state, c.id)[0])
    .concat(
      state.barters
        .filter((b) => project === "all" || b.project === project)
        .map((b) => systemDocuments(state, b.id)[0]),
    )
    .concat(
      workContracts(state, project).map((w) => workContractDocument(state, w)),
    )
    .filter(
      (d) =>
        d &&
        `${d.name} ${d.detail}`
          .toLocaleLowerCase("tr")
          .includes(q.toLocaleLowerCase("tr")),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const filtersOn =
    kind !== "all" ||
    party !== "all" ||
    unitF !== "all" ||
    validity !== "all" ||
    q !== "" ||
    onlyRecord !== "";
  return (
    <>
      <SectionTitle
        title="Belge arşivi"
        description="Sözleşme belgeleri kayıtlardan üretilir; ek dosyalar bu tarayıcıda saklanır."
        actions={
          <button className="btn primary" onClick={() => setCreate(true)}>
            <Upload size={16} />
            Belge yükle
          </button>
        }
      />
      <p className="callout">
        <b>Yerel demo arşivi.</b> Dosyalar bu tarayıcıdaki IndexedDB alanına
        gerçekten kaydedilir ve sayfa yenilendiğinde korunur. Sunucuya
        yüklenmez, başka cihazlarla paylaşılmaz; tarayıcı verileri silinirse
        kaybolur. Yalnızca temsili belge yükleyin.
      </p>
      {error && (
        <p role="alert" className="callout">
          {error}
        </p>
      )}
      <Panel
        title="Sözleşme belgeleri"
        subtitle="Satış, barter ve iş sözleşmeleri kayıtlardan otomatik üretilir · her zaman görüntülenebilir"
      >
        {contractDocs.length ? (
          <div className="e-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Belge</th>
                  <th>Taraf</th>
                  <th>Tür</th>
                  <th>Tarih</th>
                  <th aria-label="Görüntüle" />
                </tr>
              </thead>
              <tbody>
                {contractDocs.slice(0, docLimit).map((d) => (
                  <tr key={d.id}>
                    <td>
                      <b>{d.name}</b>
                    </td>
                    <td>{d.detail}</td>
                    <td>{d.kind}</td>
                    <td>{date(d.date)}</td>
                    <td>
                      <a
                        className="btn compact"
                        href={d.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Görüntüle
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Bu aramada sözleşme belgesi yok" />
        )}
        {contractDocs.length > docLimit && (
          <button
            className="cc-more"
            onClick={() => setDocLimit(contractDocs.length)}
          >
            Tüm {contractDocs.length} sözleşme belgesini göster
          </button>
        )}
      </Panel>
      <div className="section-gap" />
      <Panel
        title="Yüklenen dosyalar"
        subtitle="Yalnızca bu tarayıcıda saklanır (demo) · sunucuya gönderilmez"
      >
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Belge, firma veya açıklama ara…"
          />
          <select
            aria-label="Belge türü filtresi"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">Tüm belge türleri</option>
            {[
              "Satış sözleşmesi",
              "İş / taşeron sözleşmesi",
              "Barter anlaşması",
              "Proje belgesi",
              "Diğer",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select
            aria-label="Müşteri / firma filtresi"
            value={party}
            onChange={(e) => setParty(e.target.value)}
          >
            <option value="all">Tüm müşteri / firmalar</option>
            {parties.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            aria-label="Daire filtresi"
            value={unitF}
            onChange={(e) => setUnitF(e.target.value)}
          >
            <option value="all">Tüm daireler</option>
            {unitsInUse.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <select
            aria-label="Geçerlilik filtresi"
            value={validity}
            onChange={(e) => setValidity(e.target.value)}
          >
            <option value="all">Tüm geçerlilikler</option>
            {["Geçerli", "Süresi yaklaşıyor", "Süresi doldu", "Süresiz"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
          {filtersOn && (
            <button
              className="btn compact ghost"
              onClick={() => {
                setOnlyRecord("");
                setKind("all");
                setParty("all");
                setUnitF("all");
                setValidity("all");
                setQ("");
              }}
            >
              Filtreleri temizle
            </button>
          )}
        </div>
        {rows.length ? (
          <div className="e-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Belge / tür</th>
                  <th>Sözleşme no</th>
                  <th>Müşteri / firma</th>
                  <th>Daire</th>
                  <th>Yükleme</th>
                  <th>Geçerlilik</th>
                  <th aria-label="İşlem" />
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => {
                  const i = docInfo(f);
                  const v = documentValidity(f.expiry);
                  return (
                    <tr
                      key={f.id}
                      className="clickable"
                      onClick={() => setSelected(f)}
                    >
                      <td>
                        <b>{f.name}</b>
                        <small>
                          {f.kind} · {fileSize(f.size)}
                        </small>
                      </td>
                      <td>{i.contract}</td>
                      <td>
                        <b>{i.party}</b>
                        <small>{pname(f.project)}</small>
                      </td>
                      <td>{i.unit}</td>
                      <td>
                        {f.uploadedAt
                          ? date(f.uploadedAt.slice(0, 10))
                          : f.date
                            ? date(f.date)
                            : "—"}
                      </td>
                      <td>
                        <Badge tone={VALIDITY_TONE[v]}>{v}</Badge>
                        <small>
                          {f.expiry ? date(f.expiry) : "Bitiş tarihi yok"}
                        </small>
                      </td>
                      <td>
                        <span className="btn compact">Aç</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : files.length ? (
          <Empty
            title="Bu filtrelerde belge yok"
            detail="Filtreleri temizleyin veya aramayı değiştirin."
          />
        ) : (
          <div className="archive-empty">
            <Empty
              title="Bu tarayıcıda henüz belge yok"
              detail="Temsili bir dosya yükleyin veya sözleşme ve barter kayıtlarından otomatik temsili özet belgeleri oluşturun. Belgeler yalnızca bu tarayıcıda saklanır."
            />
            <div className="form-actions">
              <button className="btn" disabled={busy} onClick={createSamples}>
                <FilePlus2 size={15} /> Temsili örnek belgeleri oluştur
              </button>
              <button className="btn primary" onClick={() => setCreate(true)}>
                <Upload size={15} /> Belge yükle
              </button>
            </div>
          </div>
        )}
      </Panel>
      <Drawer
        open={create}
        title="Belge yükle"
        onClose={() => {
          if (!busy) setCreate(false);
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const f = new FormData(e.currentTarget);
            const file = f.get("file") as File;
            try {
              validateArchiveFile(file);
              setBusy(true);
              const extension = file.name.split(".").pop()?.toLowerCase();
              const mime =
                extension === "pdf"
                  ? "application/pdf"
                  : ["png", "jpg", "jpeg", "webp"].includes(extension ?? "")
                    ? `image/${extension === "jpg" ? "jpeg" : extension}`
                    : "application/octet-stream";
              const v: ArchiveFile = {
                id: crypto.randomUUID(),
                name: file.name,
                project: scope,
                record: String(f.get("record") ?? ""),
                company: String(f.get("company")),
                kind: String(f.get("kind")),
                date: String(f.get("date")),
                expiry: String(f.get("expiry")),
                description: String(f.get("description")),
                size: file.size,
                mime,
                blob: new Blob([await file.arrayBuffer()], { type: mime }),
                uploadedAt: new Date().toISOString(),
              };
              if (v.expiry && v.expiry < v.date)
                throw Error("Bitiş tarihi belge tarihinden önce olamaz.");
              await saveArchive(v);
              setFiles(await readArchive());
              setCreate(false);
              setSelected(v);
              notify("Dosya bu tarayıcıya kaydedildi.");
            } catch (e) {
              notify(e instanceof Error ? e.message : "Dosya kaydedilemedi.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <label className="full">
              Temsili dosya
              <input
                name="file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.xlsx"
                required
              />
            </label>
            <label>
              Proje
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setRecord("");
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Belge türü
              <select name="kind">
                {[
                  "Satış sözleşmesi",
                  "İş / taşeron sözleşmesi",
                  "Barter anlaşması",
                  "Proje belgesi",
                  "Diğer",
                ].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="full">
              İlgili müşteri / barter / daire
              <select
                name="record"
                value={record}
                onChange={(e) => setRecord(e.target.value)}
              >
                <option value="">Proje geneli</option>
                {related.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
                {projects
                  .filter((p) => p.id === scope)
                  .flatMap((p) =>
                    Array.from({ length: p.total }, (_, i) => (
                      <option key={`unit-${i}`} value={`unit:${p.id}-${i + 1}`}>
                        Daire {unitById(`${p.id}-${i + 1}`)?.label} · bağımsız
                        bölüm belgesi
                      </option>
                    )),
                  )}
              </select>
            </label>
            <label className="full">
              Firma
              <input name="company" placeholder="Örnek firma" maxLength={100} />
            </label>
            <label>
              Belge tarihi
              <input
                name="date"
                type="date"
                defaultValue="2026-11-15"
                required
              />
            </label>
            <label>
              Sözleşme bitiş tarihi
              <input name="expiry" type="date" />
            </label>
            <label className="full">
              Açıklama
              <textarea name="description" maxLength={1000} />
            </label>
            <label className="full">
              <span>
                <input type="checkbox" required /> Yalnızca temsili, hassas
                bilgi içermeyen dosya kullanıyorum.
              </span>
            </label>
          </div>
          <button className="btn primary" disabled={busy}>
            {busy ? "Kaydediliyor…" : "Belgeyi kaydet"}
          </button>
        </form>
      </Drawer>
      <Drawer
        open={!!selected}
        title={selected?.name ?? "Belge"}
        eyebrow="BELGE AYRINTISI · DEMO ARŞİVİ"
        onClose={() => setSelected(null)}
        wide
      >
        {selected && (
          <DocumentDetail f={selected} info={docInfo(selected)} url={url} />
        )}
      </Drawer>
    </>
  );
}

function DocumentDetail({
  f,
  info,
  url,
}: {
  f: ArchiveFile;
  info: { contract: string; party: string; unit: string };
  url: string;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (f.mime === "text/plain" || f.name.toLowerCase().endsWith(".txt"))
      f.blob.text().then(setText);
  }, [f]);
  const v = documentValidity(f.expiry);
  return (
    <>
      <dl className="cc-unit-facts doc-facts">
        <div>
          <dt>Belge adı</dt>
          <dd>{f.name}</dd>
        </div>
        <div>
          <dt>Belge türü</dt>
          <dd>{f.kind}</dd>
        </div>
        <div>
          <dt>Sözleşme no</dt>
          <dd>{info.contract}</dd>
        </div>
        <div>
          <dt>Müşteri / firma</dt>
          <dd>{info.party}</dd>
        </div>
        <div>
          <dt>Proje · daire</dt>
          <dd>
            {pname(f.project)} · {info.unit}
          </dd>
        </div>
        <div>
          <dt>Belge tarihi</dt>
          <dd>{f.date ? date(f.date) : "—"}</dd>
        </div>
        <div>
          <dt>Yükleme</dt>
          <dd>{f.uploadedAt ? date(f.uploadedAt.slice(0, 10)) : "—"}</dd>
        </div>
        <div>
          <dt>Geçerlilik</dt>
          <dd>
            <Badge tone={VALIDITY_TONE[v]}>{v}</Badge>{" "}
            {f.expiry ? date(f.expiry) : ""}
          </dd>
        </div>
      </dl>
      {f.description && <p className="drawer-intro">{f.description}</p>}
      <p className="callout">
        Demo arşivi: bu dosya yalnızca bu tarayıcıda (IndexedDB) saklanır;
        sunucuya yüklenmez, yedeklenmez ve kurumsal belge arşivi yerine geçmez.
      </p>
      <div className="form-actions">
        <a className="btn primary" href={url} download={f.name}>
          Dosyayı indir · {fileSize(f.size)}
        </a>
      </div>
      {text ? (
        <pre className="doc-text">{text}</pre>
      ) : url && f.mime === "application/pdf" ? (
        <iframe
          title="Temsili PDF önizlemesi"
          src={url}
          sandbox=""
          className="archive-preview"
        />
      ) : url && f.mime.startsWith("image/") ? (
        <img
          src={url}
          alt="Temsili belge önizlemesi"
          className="archive-image"
        />
      ) : (
        <p className="muted">
          Bu biçim tarayıcıda önizlenemiyor; dosyayı indirerek açabilirsiniz.
        </p>
      )}
    </>
  );
}
