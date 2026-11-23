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
    ? `${(b / 1024).toLocaleString("es-PY", { maximumFractionDigits: 1 })} KB`
    : `${(b / 1024 / 1024).toLocaleString("es-PY", { maximumFractionDigits: 2 })} MB`;
import {
  readArchive,
  saveArchive,
  validateArchiveFile,
  documentValidity,
  type ArchiveFile,
} from "@/lib/archive";
const VALIDITY_TONE: Record<string, string> = {
  "Vigente": "green",
  "Sin vencimiento": "neutral",
  "Por vencer": "amber",
  "Vencido": "red",
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
    [scope, setScope] = useState(project === "all" ? (projects.find((p) => p.status === "Activo")?.id ?? projects[0]?.id ?? "") : project),
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
          : (projects.find((p) => p.status === "Activo")?.id ?? projects[0]?.id ?? ""),
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
        label: `Canje · ${b.company} · ${unitById(b.unitId)?.label}`,
      })),
  ];
  const recordLabel = (r: string) => {
    if (!r) return "Todo el proyecto";
    if (r.startsWith("unit:"))
      return `Unidad ${unitById(r.slice(5))?.label ?? r.slice(5)}`;
    const c = customerList(state).find((c) => c.id === r);
    if (c) return `${c.name} · ${c.unit}`;
    const b = state.barters.find((b) => b.id === r);
    if (b) return `Canje · ${b.company} · ${unitById(b.unitId)?.label}`;
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
            "DOCUMENTO DE DEMOSTRACIÓN — sin validez legal",
            `Resumen del contrato de compraventa · ${c.number}`,
            `Proyecto: ${pname(c.project)} · Unidad ${c.unitLabel} (${c.type}, ${c.gross} m²)`,
            `Comprador: ${c.name} (ficticio)`,
            `Precio: ${money(c.price)} · Plan: ${c.planLabel}`,
          ].join("\n");
          const blob = new Blob([text], { type: "text/plain" });
          return {
            id: `sample-${c.id}`,
            name: `${c.number}-sozlesme-ozeti.txt`,
            project: c.project,
            record: c.id,
            company: "",
            kind: "Contrato de compraventa",
            date: c.signedAt ?? SNAPSHOT,
            expiry: "",
            description:
              "Resumen de contrato de ejemplo generado con los datos de la aplicación.",
            size: blob.size,
            mime: "text/plain",
            blob,
            uploadedAt: SNAPSHOT,
          };
        }),
        ...state.barters.map((b) => {
          const text = [
            "DOCUMENTO DE DEMOSTRACIÓN — sin validez legal",
            `Canje · ${b.id}`,
            `Proyecto: ${pname(b.project)} · Unidad ${unitById(b.unitId)?.label}`,
            `Empresa: ${b.company} (ficticia) · Trabajo: ${b.work}`,
            `Valor: ${money(b.amount)} · Plazo: ${b.start} – ${b.end}`,
          ].join("\n");
          const blob = new Blob([text], { type: "text/plain" });
          return {
            id: `sample-${b.id}`,
            name: `${b.id}-barter-anlasmasi.txt`,
            project: b.project,
            record: b.id,
            company: b.company,
            kind: "Canje",
            date: b.start,
            expiry: b.end,
            description:
              "Resumen de canje de ejemplo.",
            size: blob.size,
            mime: "text/plain",
            blob,
            uploadedAt: SNAPSHOT,
          };
        }),
        ...[
          {
            id: "sample-proj-ruhsat",
            project: "alion",
            name: "alion-resumen-permiso-de-obra.txt",
            kind: "Documento del proyecto",
            date: "2025-12-05",
            expiry: "2026-12-05",
            title: "Resumen de control del permiso de obra",
          },
          {
            id: "sample-proj-sigorta",
            project: "alion",
            name: "santiye-sigorta-policesi-ozeti.txt",
            kind: "Documento del proyecto",
            date: "2025-11-01",
            expiry: "2026-11-01",
            title: "Resumen de póliza de seguro de obra (renovación pendiente)",
          },
        ].map((p) => {
          const blob = new Blob(
            [
              `DOCUMENTO DE DEMOSTRACIÓN — sin validez legal\n${p.title}\nProyecto: ${pname(p.project)}\nVigencia: ${p.expiry}`,
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
      notify(`${docs.length} documentos de ejemplo guardados en este navegador.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudieron crear los documentos de ejemplo.");
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
    return { contract: "—", party: f.company || "Todo el proyecto", unit: "—" };
  };
  const scoped = files.filter(
    (f) =>
      (project === "all" || f.project === project) &&
      (!onlyRecord || f.record === onlyRecord),
  );
  const parties = [...new Set(scoped.map((f) => docInfo(f).party))].sort(
    (a, b) => a.localeCompare(b, "es"),
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
        .toLocaleLowerCase("es")
        .includes(q.toLocaleLowerCase("es"))
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
          .toLocaleLowerCase("es")
          .includes(q.toLocaleLowerCase("es")),
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
        title="Archivo de documentos"
        description="Los documentos de contratos se generan desde los registros; los adjuntos se guardan en este navegador."
        actions={
          <button className="btn primary" onClick={() => setCreate(true)}>
            <Upload size={16} />
            Subir documento
          </button>
        }
      />
      <p className="callout">
        <b>Archivo local de demostración.</b> Los archivos se guardan en el almacenamiento IndexedDB de este navegador
        y se conservan al recargar la página. No se suben a ningún servidor
        ni se comparten con otros dispositivos; si se borran los datos del navegador,
        se pierden. Suba solo documentos de ejemplo.
      </p>
      {error && (
        <p role="alert" className="callout">
          {error}
        </p>
      )}
      <Panel
        title="Documentos de contratos"
        subtitle="Contratos de compraventa y de obra generados automáticamente desde los registros"
      >
        {contractDocs.length ? (
          <div className="e-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Taraf</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th aria-label="Ver" />
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
                        Ver
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No hay documentos de contratos para esta búsqueda" />
        )}
        {contractDocs.length > docLimit && (
          <button
            className="cc-more"
            onClick={() => setDocLimit(contractDocs.length)}
          >
            Todos {contractDocs.length} documentos de contratos
          </button>
        )}
      </Panel>
      <div className="section-gap" />
      <Panel
        title="Archivos subidos"
        subtitle="Se guardan solo en este navegador (demo) · no se envían a ningún servidor"
      >
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Buscar documento, empresa o descripción…"
          />
          <select
            aria-label="Filtro por tipo de documento"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">Todos los tipos</option>
            {[
              "Contrato de compraventa",
              "Contrato de obra",
              "Canje",
              "Documento del proyecto",
              "Otro",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select
            aria-label="Filtro por cliente / empresa"
            value={party}
            onChange={(e) => setParty(e.target.value)}
          >
            <option value="all">Todos los clientes y empresas</option>
            {parties.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            aria-label="Filtro por unidad"
            value={unitF}
            onChange={(e) => setUnitF(e.target.value)}
          >
            <option value="all">Todas las unidades</option>
            {unitsInUse.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <select
            aria-label="Filtro por vigencia"
            value={validity}
            onChange={(e) => setValidity(e.target.value)}
          >
            <option value="all">Todas las vigencias</option>
            {["Vigente", "Por vencer", "Vencido", "Sin vencimiento"].map(
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
                  <th>Documento / tipo</th>
                  <th>N.º de contrato</th>
                  <th>Cliente / empresa</th>
                  <th>Unidad</th>
                  <th>Subido</th>
                  <th>Vigencia</th>
                  <th aria-label="Acción" />
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
                          {f.expiry ? date(f.expiry) : "Sin fecha de vencimiento"}
                        </small>
                      </td>
                      <td>
                        <span className="btn compact">Abrir</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : files.length ? (
          <Empty
            title="No hay documentos con estos filtros"
            detail="Limpie los filtros o cambie la búsqueda."
          />
        ) : (
          <div className="archive-empty">
            <Empty
              title="Aún no hay documentos en este navegador"
              detail="Suba un archivo de ejemplo o genere resúmenes automáticos desde los contratos. Los documentos se guardan solo en este navegador."
            />
            <div className="form-actions">
              <button className="btn" disabled={busy} onClick={createSamples}>
                <FilePlus2 size={15} /> Generar documentos de ejemplo
              </button>
              <button className="btn primary" onClick={() => setCreate(true)}>
                <Upload size={15} /> Subir documento
              </button>
            </div>
          </div>
        )}
      </Panel>
      <Drawer
        open={create}
        title="Subir documento"
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
                throw Error("La fecha de vencimiento no puede ser anterior a la del documento.");
              await saveArchive(v);
              setFiles(await readArchive());
              setCreate(false);
              setSelected(v);
              notify("Archivo guardado en este navegador.");
            } catch (e) {
              notify(e instanceof Error ? e.message : "No se pudo guardar el archivo.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            <label className="full">
              Archivo de ejemplo
              <input
                name="file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.xlsx"
                required
              />
            </label>
            <label>
              Proyecto
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
              Tipo de documento
              <select name="kind">
                {[
                  "Contrato de compraventa",
                  "Contrato de obra",
                  "Canje",
                  "Documento del proyecto",
                  "Otro",
                ].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="full">
              Cliente / unidad relacionada
              <select
                name="record"
                value={record}
                onChange={(e) => setRecord(e.target.value)}
              >
                <option value="">Todo el proyecto</option>
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
                        Unidad {unitById(`${p.id}-${i + 1}`)?.label} · documento de unidad
                      </option>
                    )),
                  )}
              </select>
            </label>
            <label className="full">
              Empresa
              <input name="company" placeholder="Empresa de ejemplo" maxLength={100} />
            </label>
            <label>
              Fecha del documento
              <input
                name="date"
                type="date"
                defaultValue="2026-11-15"
                required
              />
            </label>
            <label>
              Fecha de vencimiento
              <input name="expiry" type="date" />
            </label>
            <label className="full">
              Descripción
              <textarea name="description" maxLength={1000} />
            </label>
            <label className="full">
              <span>
                <input type="checkbox" required /> Uso solo archivos de ejemplo, sin información sensible.
              </span>
            </label>
          </div>
          <button className="btn primary" disabled={busy}>
            {busy ? "Kaydediliyor…" : "Guardar documento"}
          </button>
        </form>
      </Drawer>
      <Drawer
        open={!!selected}
        title={selected?.name ?? "Documento"}
        eyebrow="DETALLE DEL DOCUMENTO · ARCHIVO DE DEMOSTRACIÓN"
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
          <dt>Nombre del documento</dt>
          <dd>{f.name}</dd>
        </div>
        <div>
          <dt>Tipo de documento</dt>
          <dd>{f.kind}</dd>
        </div>
        <div>
          <dt>N.º de contrato</dt>
          <dd>{info.contract}</dd>
        </div>
        <div>
          <dt>Cliente / empresa</dt>
          <dd>{info.party}</dd>
        </div>
        <div>
          <dt>Proyecto · unidad</dt>
          <dd>
            {pname(f.project)} · {info.unit}
          </dd>
        </div>
        <div>
          <dt>Fecha del documento</dt>
          <dd>{f.date ? date(f.date) : "—"}</dd>
        </div>
        <div>
          <dt>Subido</dt>
          <dd>{f.uploadedAt ? date(f.uploadedAt.slice(0, 10)) : "—"}</dd>
        </div>
        <div>
          <dt>Vigencia</dt>
          <dd>
            <Badge tone={VALIDITY_TONE[v]}>{v}</Badge>{" "}
            {f.expiry ? date(f.expiry) : ""}
          </dd>
        </div>
      </dl>
      {f.description && <p className="drawer-intro">{f.description}</p>}
      <p className="callout">
        Archivo de demostración: este archivo se guarda solo en este navegador (IndexedDB);
        no se sube a un servidor, no se respalda y no reemplaza un archivo documental corporativo.
      </p>
      <div className="form-actions">
        <a className="btn primary" href={url} download={f.name}>
          Descargar archivo · {fileSize(f.size)}
        </a>
      </div>
      {text ? (
        <pre className="doc-text">{text}</pre>
      ) : url && f.mime === "application/pdf" ? (
        <iframe
          title="Vista previa del PDF de ejemplo"
          src={url}
          sandbox=""
          className="archive-preview"
        />
      ) : url && f.mime.startsWith("image/") ? (
        <img
          src={url}
          alt="Vista previa del documento de ejemplo"
          className="archive-image"
        />
      ) : (
        <p className="muted">
          Este formato no tiene vista previa; descárguelo para abrirlo.
        </p>
      )}
    </>
  );
}
