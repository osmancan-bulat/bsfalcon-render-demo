"use client";
// Genel arama, bildirimler ve dosya açıcı. Arama ve bildirim sonuçları ilgili modern dosyayı
// (müşteri/daire, imza süreci, barter, hakediş, müsait daire) sayfadan ayrılmadan açar.
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  ChevronRight,
  FileSignature,
  Handshake,
  ReceiptText,
  TriangleAlert,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useApp } from "./context";
import { hubHref, visibleProjects } from "@/lib/catalog";
import { unitShort } from "@/lib/units";
import { Badge, Empty } from "./shared";
import CustomerPanel from "./customer-panel";
import DraftPanel from "./draft-panel";
import RequestPanel from "./request-panel";
import { BarterDrawer } from "./barter";
import { UnitDrawer, useUnitStates } from "./units-view";
import {
  projects,
  customerList,
  contractNumber,
  requestList,
  requestStatus,
  paymentRows,
  pname,
  unitTaken,
  workContracts,
} from "@/lib/enterprise";
import { units } from "@/lib/units";
import { money, date } from "@/lib/data";

export type FileRef = {
  type: "customer" | "draft" | "barter" | "request" | "unit";
  id: string;
  focus?: string;
};

type Hit = {
  key: string;
  icon: ReactNode;
  title: string;
  detail: string;
  tag: string;
  file?: FileRef;
  href?: string;
};
const norm = (s: string) => s.toLocaleLowerCase("es").replace(/\s+/g, "");

/** Müşteri, daire etiketi, sözleşme no, firma, barter ve hakediş üzerinden arama. */
export function useSearch(query: string): Hit[] {
  const { state } = useApp();
  const q = norm(query);
  if (q.length < 2) return [];
  const has = (...parts: string[]) => parts.some((p) => norm(p).includes(q));
  const hits: Hit[] = [];
  for (const c of customerList(state))
    if (has(c.name, c.unit, unitShort(c.id), contractNumber(c.id)))
      hits.push({
        key: c.id,
        icon: <UsersRound size={18} />,
        title: c.name,
        detail: `${pname(c.project)} · ${unitShort(c.id)} · ${contractNumber(c.id)}`,
        tag: "Ficha del cliente",
        file: { type: "customer", id: c.id },
      });
  for (const d of state.drafts)
    if (has(d.name, d.unit, unitShort(d.id), contractNumber(d.id)))
      hits.push({
        key: `d-${d.id}`,
        icon: <FileSignature size={18} />,
        title: d.name,
        detail: `${pname(d.project)} · ${unitShort(d.id)} · ${contractNumber(d.id)} · ${state.contractMeta[d.id]?.status ?? "Borrador"}`,
        tag: "Proceso de firma",
        file: { type: "draft", id: d.id },
      });
  for (const b of state.barters) {
    const label = units.find((u) => u.id === b.unitId)?.label ?? b.unitId;
    if (has(b.company, label, unitShort(b.unitId), b.id, b.work))
      hits.push({
        key: b.id,
        icon: <Handshake size={18} />,
        title: `${b.company} · ${unitShort(b.unitId)}`,
        detail: `${pname(b.project)} · ${b.id} · canje`,
        tag: "Canje",
        file: { type: "barter", id: b.id },
      });
  }
  for (const r of requestList(state))
    if (has(r.id, r.company, r.name))
      hits.push({
        key: r.id,
        icon: <ReceiptText size={18} />,
        title: `${r.id} · ${r.company}`,
        detail: `${pname(r.project)} · ${r.name} · ${requestStatus(state, r)}`,
        tag: r.type,
        file: { type: "request", id: r.id },
      });
  for (const u of units)
    if (!unitTaken(state, u.id) && norm(u.label) === q)
      hits.push({
        key: `u-${u.id}`,
        icon: <Building2 size={18} />,
        title: `${unitShort(u.id)} · disponible`,
        detail: `${pname(u.project)} · ${u.type} · ${u.gross} m² · ${money(u.listPrice)}`,
        tag: "Unidad disponible",
        file: { type: "unit", id: u.id },
      });
  for (const w of workContracts(state))
    if (has(w.company, w.id))
      hits.push({
        key: w.id,
        icon: <FileSignature size={18} />,
        title: `${w.company} · contrato de obra`,
        detail: `${pname(w.project)} · ${w.id} · ${w.packages.length} paquetes de obra`,
        tag: "Contrato de obra",
        href: "/contratos?tur=is",
      });
  for (const p of projects)
    if (has(p.name))
      hits.push({
        key: p.id,
        icon: <Building2 size={18} />,
        title: p.name,
        detail: "Resumen del proyecto",
        tag: "Proyecto",
        href: hubHref(p.id),
      });
  return hits.slice(0, 12);
}

export function SearchResults({
  query,
  onPick,
}: {
  query: string;
  onPick: (f: FileRef | null, href?: string) => void;
}) {
  const hits = useSearch(query);
  if (norm(query).length < 2)
    return (
      <p className="muted">
        Escriba nombre del cliente, unidad (ej.: 503F), n.º de contrato (ej.: CTR-ALN-025), proveedor o n.º de certificado.
      </p>
    );
  if (!hits.length)
    return (
      <Empty
        title="Sin resultados"
        detail="Pruebe con el código de unidad, el n.º de contrato o el proveedor."
      />
    );
  return (
    <div className="search-results">
      {hits.map((h) =>
        h.href ? (
          <Link key={h.key} href={h.href} onClick={() => onPick(null)}>
            {h.icon}
            <span>
              <b>{h.title}</b>
              <small>{h.detail}</small>
            </span>
            <Badge tone="neutral">{h.tag}</Badge>
          </Link>
        ) : (
          <button key={h.key} onClick={() => onPick(h.file!)}>
            {h.icon}
            <span>
              <b>{h.title}</b>
              <small>{h.detail}</small>
            </span>
            <Badge tone="neutral">{h.tag}</Badge>
          </button>
        ),
      )}
    </div>
  );
}

/** Seçili projeye göre bildirimler: geciken ödemeler, imza bekleyen sözleşmeler, onay bekleyen işlemler. */
export function Notifications({
  scope,
  onPick,
}: {
  scope: string;
  onPick: (f: FileRef | null) => void;
}) {
  const { state } = useApp();
  const inScope = (p: string) => scope === "all" || p === scope;
  const names = new Map(customerList(state).map((c) => [c.id, c]));
  const late = new Map<
    string,
    { total: number; oldest: string; focus: string }
  >();
  for (const r of paymentRows(state).filter(
    (r) => r.status === "Vencida" && inScope(r.project),
  )) {
    const cur = late.get(r.customerId);
    if (!cur)
      late.set(r.customerId, {
        total: r.remaining,
        oldest: r.due,
        focus: r.installmentId ?? "deposit",
      });
    else cur.total += r.remaining;
  }
  const drafts = state.drafts.filter((d) => inScope(d.project));
  const pending = requestList(state).filter(
    (r) => inScope(r.project) && requestStatus(state, r) === "Pendiente de aprobación",
  );
  const empty = !late.size && !drafts.length && !pending.length;
  return (
    <div className="notify">
      <p className="drawer-intro">
        Pendientes de {scope === "all" ? "todos los proyectos" : pname(scope)}.
        Haga clic en una fila para abrir la ficha.
      </p>
      {late.size > 0 && (
        <section>
          <h3 className="subheading">Pagos vencidos · {late.size}</h3>
          {[...late.entries()].map(([id, v]) => (
            <button
              key={id}
              className="alert-row"
              onClick={() => onPick({ type: "customer", id, focus: v.focus })}
            >
              <span className="cc-task-icon t-danger">
                <TriangleAlert size={15} />
              </span>
              <span className="cc-list-main">
                <b>
                  {names.get(id)?.name} · {unitShort(id)}
                </b>
                <small>Vencimiento más antiguo {date(v.oldest)}</small>
              </span>
              <span className="cc-amount danger num">{money(v.total)}</span>
            </button>
          ))}
        </section>
      )}
      {drafts.length > 0 && (
        <section>
          <h3 className="subheading">
            Contratos pendientes de firma · {drafts.length}
          </h3>
          {drafts.map((d) => (
            <button
              key={d.id}
              className="alert-row"
              onClick={() => onPick({ type: "draft", id: d.id })}
            >
              <span className="cc-task-icon t-warning">
                <FileSignature size={15} />
              </span>
              <span className="cc-list-main">
                <b>
                  {d.name} · {unitShort(d.id)}
                </b>
                <small>
                  {contractNumber(d.id)} ·{" "}
                  {state.contractMeta[d.id]?.status ?? "Borrador"}
                </small>
              </span>
              <span className="cc-amount num">{money(d.price)}</span>
            </button>
          ))}
        </section>
      )}
      {pending.length > 0 && (
        <section>
          <h3 className="subheading">
            Operaciones pendientes de aprobación · {pending.length}
          </h3>
          {pending.map((r) => (
            <button
              key={r.id}
              className="alert-row"
              onClick={() => onPick({ type: "request", id: r.id })}
            >
              <span className="cc-task-icon t-info">
                <ReceiptText size={15} />
              </span>
              <span className="cc-list-main">
                <b>
                  {r.id} · {r.company}
                </b>
                <small>
                  {r.type} · {r.name}
                </small>
              </span>
              <span className="cc-amount num">{money(r.amount)}</span>
            </button>
          ))}
        </section>
      )}
      {empty && <Empty title="Sin pendientes" />}
      <div className="form-actions">
        <Link
          className="btn"
          href="/agenda"
          onClick={() => onPick(null)}
        >
          Recordatorios
        </Link>
        <Link
          className="btn primary"
          href="/cobros?durum=Vencida"
          onClick={() => onPick(null)}
        >
          <Wallet size={15} /> Pagos vencidos
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

/** Dosya açıcı: arama ve bildirimlerden seçilen kaydı ilgili modern panelde açar. */
export function FileHost({
  file,
  setFile,
}: {
  file: FileRef | null;
  setFile: (f: FileRef | null) => void;
}) {
  const close = () => setFile(null);
  const projectId = file?.type === "unit" ? file.id.split("-")[0] : "";
  const { map } = useUnitStates(projectId);
  return (
    <>
      {file?.type === "customer" && (
        <CustomerPanel
          key={`${file.id}-${file.focus}`}
          id={file.id}
          focus={file.focus}
          onClose={close}
        />
      )}
      {file?.type === "draft" && (
        <DraftPanel
          key={file.id}
          id={file.id}
          onClose={close}
          onSigned={(id) => setFile({ type: "customer", id })}
        />
      )}
      {file?.type === "request" && (
        <RequestPanel key={file.id} id={file.id} onClose={close} />
      )}
      <BarterDrawer
        id={file?.type === "barter" ? file.id : null}
        onClose={close}
      />
      <UnitDrawer
        unit={
          file?.type === "unit"
            ? (units.find((u) => u.id === file.id) ?? null)
            : null
        }
        state={
          file?.type === "unit"
            ? map.find((m) => m.unit.id === file.id)?.state
            : undefined
        }
        onClose={close}
        onSold={(id, draft) =>
          setFile({ type: draft ? "draft" : "customer", id })
        }
      />
    </>
  );
}
