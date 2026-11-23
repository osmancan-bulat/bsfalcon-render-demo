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
  "Tümü",
  "Aktif",
  "Gecikmeli",
  "Taslak / imza",
  "Tamamlandı",
  "İptal",
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
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Tümü");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);
  const all = contractList(state).filter(
    (c) => project === "all" || c.project === project,
  );
  const drafts = all.filter(
    (c) => c.status === "Taslak" || c.status === "İmza bekliyor",
  );
  const match = (c: ContractView) =>
    status === "Tümü"
      ? c.status !== "İptal" && !drafts.some((d) => d.id === c.id) // taslaklar üstteki imza şeridinde
      : status === "Gecikmeli"
        ? (c.account?.overdue ?? 0) > 0
        : status === "Taslak / imza"
          ? c.status === "Taslak" || c.status === "İmza bekliyor"
          : c.status === status;
  const rows = all.filter(
    (c) =>
      match(c) &&
      `${c.name} ${c.number} ${c.unitLabel} ${pname(c.project)}`
        .toLocaleLowerCase("tr")
        .includes(q.toLocaleLowerCase("tr")),
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
          <h3>İmza sürecindeki sözleşmeler · {drafts.length}</h3>
          {drafts.map((d) => (
            <button
              className="draft-card"
              key={d.id}
              onClick={() => setDraft(d.id)}
            >
              <div className="draft-main">
                <Badge tone={d.status === "Taslak" ? "neutral" : "amber"}>
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
                <PenLine size={14} /> İncele ve imzala
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
          placeholder="Sözleşme no, müşteri, daire veya proje…"
        />
        <div className="seg" role="tablist" aria-label="Sözleşme durumu">
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
            ? `${pg * PAGE + 1}–${Math.min(rows.length, (pg + 1) * PAGE)} / ${rows.length} sözleşme`
            : "Kayıt yok"}
        </span>
        <div>
          <button
            aria-label="Önceki sayfa"
            disabled={pg === 0}
            onClick={() => setPage(pg - 1)}
          >
            ‹
          </button>
          <button
            aria-label="Sonraki sayfa"
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
