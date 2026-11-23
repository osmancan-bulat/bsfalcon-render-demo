"use client";
// Çalışma kapsamı seçici: BŞ Falcon Group (şirket geneli) veya şirketin projelerinden biri.
// Proje sayısı arttıkça menüyü doldurmaz: tek satırlık bir seçici, açılınca arama ve
// durumlara göre gruplanmış liste. Arşivdeki projeler Proje portföyünden açılır.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { projects } from "@/lib/enterprise";

export default function ScopePicker({
  scope,
  onChoose,
}: {
  scope: string;
  onChoose: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    input.current?.focus();
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const current = projects.find((p) => p.id === scope);
  const norm = (s: string) => s.toLocaleLowerCase("es");
  const match = (p: (typeof projects)[number]) =>
    !q || norm(`${p.name} ${p.code} ${p.location}`).includes(norm(q));
  const groups = (["Activo", "Finalizado"] as const)
    .map((st) => ({ st, list: projects.filter((p) => p.status === st && match(p)) }))
    .filter((g) => g.list.length);
  const archived = projects.filter((p) => p.status === "Archivado").length;
  const pick = (id: string) => {
    setOpen(false);
    setQ("");
    onChoose(id);
  };
  return (
    <div className="scope-picker" ref={box}>
      <span className="e-nav-label">Alcance</span>
      <button
        className="scope-current"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={`project-dot ${scope === "all" ? "company" : scope === "alion" ? "bronze" : ""}`} />
        <span className="scope-text">
          <b>{current ? current.name : "Todos los proyectos"}</b>
          <small>{current ? `EDIFICA · ${current.code}` : "EDIFICA · toda la empresa"}</small>
        </span>
        <ChevronsUpDown size={15} />
      </button>
      {open && (
        <div className="scope-menu" role="listbox" aria-label="Alcance">
          {projects.length > 5 && (
            <label className="scope-search">
              <Search size={14} />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar proyecto…"
                aria-label="Buscar proyecto"
              />
            </label>
          )}
          <button role="option" aria-selected={scope === "all"} className="scope-item" onClick={() => pick("all")}>
            <span className="project-dot company" />
            <span className="scope-text">
              <b>Todos los proyectos</b>
              <small>EDIFICA · toda la empresa</small>
            </span>
            {scope === "all" && <Check size={14} />}
          </button>
          {groups.map((g) => (
            <div key={g.st} className="scope-group">
              <span className="scope-group-label">
                {g.st === "Activo" ? "Proyectos activos" : "Proyectos finalizados"}
              </span>
              {g.list.map((p) => (
                <button
                  key={p.id}
                  role="option"
                  aria-selected={scope === p.id}
                  className="scope-item"
                  onClick={() => pick(p.id)}
                >
                  <span className={`project-dot ${p.id === "alion" ? "bronze" : ""}`} />
                  <span className="scope-text">
                    <b>{p.name}</b>
                    <small>
                      {p.code} · {p.location || "sin ubicación"}
                    </small>
                  </span>
                  {scope === p.id && <Check size={14} />}
                </button>
              ))}
            </div>
          ))}
          {!groups.length && q && <p className="scope-empty">“{q}”: ningún proyecto coincide.</p>}
          <Link className="scope-footer" href="/proyectos" onClick={() => setOpen(false)}>
            Proyectos inmobiliarios{archived ? `· ${archived} archivados` : ""} →
          </Link>
        </div>
      )}
    </div>
  );
}
