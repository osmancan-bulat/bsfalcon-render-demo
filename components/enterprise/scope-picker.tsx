"use client";
// Çalışma kapsamı seçici: SANE İnşaat (şirket geneli) veya şirketin projelerinden biri.
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
  const norm = (s: string) => s.toLocaleLowerCase("tr");
  const match = (p: (typeof projects)[number]) =>
    !q || norm(`${p.name} ${p.code} ${p.location}`).includes(norm(q));
  const groups = (["Aktif", "Tamamlandı"] as const)
    .map((st) => ({ st, list: projects.filter((p) => p.status === st && match(p)) }))
    .filter((g) => g.list.length);
  const archived = projects.filter((p) => p.status === "Arşiv").length;
  const pick = (id: string) => {
    setOpen(false);
    setQ("");
    onChoose(id);
  };
  return (
    <div className="scope-picker" ref={box}>
      <span className="e-nav-label">Çalışma kapsamı</span>
      <button
        className="scope-current"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={`project-dot ${scope === "all" ? "company" : scope === "verdora" ? "bronze" : ""}`} />
        <span className="scope-text">
          <b>{current ? current.name : "Tüm projeler"}</b>
          <small>{current ? `SANE İnşaat · ${current.code}` : "SANE İnşaat · şirket geneli"}</small>
        </span>
        <ChevronsUpDown size={15} />
      </button>
      {open && (
        <div className="scope-menu" role="listbox" aria-label="Çalışma kapsamı">
          {projects.length > 5 && (
            <label className="scope-search">
              <Search size={14} />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Proje ara…"
                aria-label="Proje ara"
              />
            </label>
          )}
          <button role="option" aria-selected={scope === "all"} className="scope-item" onClick={() => pick("all")}>
            <span className="project-dot company" />
            <span className="scope-text">
              <b>Tüm projeler</b>
              <small>SANE İnşaat · şirket geneli</small>
            </span>
            {scope === "all" && <Check size={14} />}
          </button>
          {groups.map((g) => (
            <div key={g.st} className="scope-group">
              <span className="scope-group-label">
                {g.st === "Aktif" ? "Aktif projeler" : "Tamamlanan projeler"}
              </span>
              {g.list.map((p) => (
                <button
                  key={p.id}
                  role="option"
                  aria-selected={scope === p.id}
                  className="scope-item"
                  onClick={() => pick(p.id)}
                >
                  <span className={`project-dot ${p.id === "verdora" ? "bronze" : ""}`} />
                  <span className="scope-text">
                    <b>{p.name}</b>
                    <small>
                      {p.code} · {p.location || "konum yok"}
                    </small>
                  </span>
                  {scope === p.id && <Check size={14} />}
                </button>
              ))}
            </div>
          ))}
          {!groups.length && q && <p className="scope-empty">“{q}” ile eşleşen proje yok.</p>}
          <Link className="scope-footer" href="/projeler" onClick={() => setOpen(false)}>
            Proje portföyü{archived ? ` · ${archived} arşivde` : ""} →
          </Link>
        </div>
      )}
    </div>
  );
}
