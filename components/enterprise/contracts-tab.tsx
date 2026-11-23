"use client";
// Sözleşme kayıtları: proje, durum ve metin filtresi; satır müşteri dosyasını ya da imza sürecini açar.
import { useState } from "react";
import { PenLine } from "lucide-react";
import { useApp } from "./context";
import { unitShort } from "@/lib/units";
import { SearchBox, Badge } from "./shared";
import { ContractTable } from "./command-center";
import DraftPanel from "./draft-panel";
import { contractList, pname, type ContractView } from "@/lib/enterprise";
import { money } from "@/lib/data";

const STATUSES = [
  "Todos",
  "Activo",
  "Gecikmeli",
  "Borrador / firma",
  "Finalizado",
  "Anulado",
] as const;

export default function ContractsTab({
  project,
  onOpen,
  initialQuery = "",
}: {
  project: string;
  onOpen: (id: string) => void;
  initialQuery?: string;
}) {
  const { state } = useApp();
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Todos");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);
  const all = contractList(state).filter(
    (c) => project === "all" || c.project === project,
  );
  const drafts = all.filter(
    (c) => c.status === "Borrador" || c.status === "Pendiente de firma",
  );
  const match = (c: ContractView) =>
    status === "Todos"
      ? c.status !== "Anulado" && !drafts.some((d) => d.id === c.id) // taslaklar üstteki imza şeridinde
      : status === "Gecikmeli"
        ? (c.account?.overdue ?? 0) > 0
        : status === "Borrador / firma"
          ? c.status === "Borrador" || c.status === "Pendiente de firma"
          : c.status === status;
  const rows = all.filter(
    (c) =>
      match(c) &&
      `${c.name} ${c.number} ${c.unitLabel} ${pname(c.project)}`
        .toLocaleLowerCase("es")
        .includes(q.toLocaleLowerCase("es")),
  );
  const PAGE = 12;
  const max = Math.max(0, Math.ceil(rows.length / PAGE) - 1);
  const pg = Math.min(page, max);
  const open = (id: string) =>
    drafts.some((d) => d.id === id) ? setDraft(id) : onOpen(id);

  return (
    <>
      {drafts.length > 0 && (
        <div className="draft-strip">
          <h3>Contratos en proceso de firma · {drafts.length}</h3>
          {drafts.map((d) => (
            <button
              className="draft-card"
              key={d.id}
              onClick={() => setDraft(d.id)}
            >
              <div className="draft-main">
                <Badge tone={d.status === "Borrador" ? "neutral" : "amber"}>
                  {d.status}
                </Badge>
                <b>
                  {d.number} · {d.name}
                </b>
                <small>
                  {pname(d.project)} · {unitShort(d.unitId)} · {d.type} ·{" "}
                  {money(d.price)} · {d.planLabel}
                </small>
              </div>
              <span className="btn compact primary">
                <PenLine size={14} /> Revisar y firmar
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="e-toolbar">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(0);
          }}
          placeholder="N.º de contrato, cliente, unidad o proyecto…"
        />
        <div className="seg" role="tablist" aria-label="Estado del contrato">
          {STATUSES.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              className={status === s ? "active" : ""}
              onClick={() => {
                setStatus(s);
                setPage(0);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <ContractTable
        rows={rows.slice(pg * PAGE, pg * PAGE + PAGE)}
        onOpen={open}
      />
      <div className="e-pagination">
        <span>
          {rows.length
            ? `${pg * PAGE + 1}–${Math.min(rows.length, (pg + 1) * PAGE)} de ${rows.length} contratos`
            : "Sin registros"}
        </span>
        <div>
          <button
            aria-label="Página anterior"
            disabled={pg === 0}
            onClick={() => setPage(pg - 1)}
          >
            ‹
          </button>
          <button
            aria-label="Página siguiente"
            disabled={pg >= max}
            onClick={() => setPage(pg + 1)}
          >
            ›
          </button>
        </div>
      </div>
      {draft && (
        <DraftPanel
          key={draft}
          id={draft}
          onClose={() => setDraft(null)}
          onSigned={(id) => {
            setDraft(null);
            onOpen(id);
          }}
        />
      )}
    </>
  );
}
