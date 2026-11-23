"use client";
// Yedekler: bu tarayıcıdaki demo kayıtlarının yedeğini alma, doğrulama ve geri yükleme.
// Geri yüklemeden önce mevcut durum her zaman yedeklenir; geçersiz yedek geri yüklenemez.
// Bu bir tarayıcı yedeğidir — merkezî/bulut yedekleme değildir.
import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { useApp } from "./context";
import { Panel, Badge } from "./shared";
import { migrateSaved, customerList } from "@/lib/enterprise";
import { syncCatalog } from "@/lib/catalog";

const MAIN = "edifica-enterprise-v1";
const PREFIX = "edifica-enterprise-v1-yedek";
const MANUAL = "edifica-respaldo-manual-";
const LABELS: Record<string, string> = {
  "edifica-enterprise-v1-yedek-v1": "Antes de la migración de versión",
  "edifica-enterprise-v1-yedek-onarim": "Registro previo a la reparación",
  "edifica-enterprise-v1-yedek-okunamayan": "Registro ilegible",
  "edifica-enterprise-v1-yedek-geri-yukleme-oncesi": "Estado previo a la última restauración",
};

type Item = {
  key: string;
  label: string;
  size: number;
  valid: boolean;
  repaired: number;
  fields: string[];
  contracts?: number;
  receipts?: number;
};

function inspect(key: string, raw: string): Item {
  const out = migrateSaved(raw);
  const label = LABELS[key] ?? (key.startsWith(MANUAL) ? `Respaldo manual · ${new Date(key.slice(MANUAL.length)).toLocaleString("es-PY")}` : key);
  if (!out) return { key, label, size: raw.length, valid: false, repaired: 0, fields: [] };
  return {
    key,
    label,
    size: raw.length,
    valid: true,
    repaired: out.repaired,
    fields: out.fields,
    contracts: customerList(out.state).length,
    receipts: out.state.receipts.length,
  };
}

export default function Backups() {
  const { state, notify } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [report, setReport] = useState<{ at: string; repaired: number; fields: string[] } | null>(null);
  const [confirm, setConfirm] = useState<{ label: string; raw: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  function refresh() {
    try {
      const list: Item[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith(PREFIX) || k.startsWith(MANUAL)) list.push(inspect(k, localStorage.getItem(k) ?? ""));
      }
      setItems(list.sort((a, b) => b.key.localeCompare(a.key)));
      const r = localStorage.getItem("edifica-onarim-raporu");
      setReport(r ? JSON.parse(r) : null);
    } catch {
      setItems([]);
    } finally {
      // Yedek doğrulaması ortak kataloğu yedeğin verisiyle eşitler; mevcut duruma geri dönülür.
      syncCatalog(state);
    }
  }
  useEffect(refresh, [state]);
  function backupNow() {
    try {
      const manual = Object.keys(localStorage).filter((k) => k.startsWith(MANUAL)).sort();
      // En fazla 5 elle alınan yedek tutulur (tarayıcı depolama sınırı)
      while (manual.length >= 5) localStorage.removeItem(manual.shift()!);
      localStorage.setItem(MANUAL + new Date().toISOString(), JSON.stringify(state));
      notify("Se respaldaron los registros actuales (en este navegador).");
      refresh();
    } catch {
      notify("No se pudo respaldar: almacenamiento del navegador lleno o deshabilitado.");
    }
  }
  function restore(raw: string) {
    const out = migrateSaved(raw);
    if (!out) {
      notify("Este respaldo no es válido; no se restauró.");
      return;
    }
    try {
      // Geri yüklemeden önce mevcut durum korunur
      localStorage.setItem(`${PREFIX}-geri-yukleme-oncesi`, localStorage.getItem(MAIN) ?? JSON.stringify(state));
      localStorage.setItem(MAIN, raw);
      location.reload();
    } catch {
      notify("No se pudo restaurar: almacenamiento del navegador no disponible.");
    }
  }
  async function fromFile(f: File) {
    const raw = await f.text();
    if (raw.length > 4_000_000) {
      notify("El archivo es demasiado grande (límite 4 MB).");
      return;
    }
    const ok = !!migrateSaved(raw);
    syncCatalog(state);
    if (!ok) {
      notify("El archivo no es un respaldo válido de esta demo; no se restauró.");
      return;
    }
    setConfirm({ label: f.name, raw });
  }
  return (
    <Panel
      title="Yedekler"
      subtitle="Respaldo y restauración de los registros de este navegador. No es un respaldo central ni en la nube."
    >
      <div className="bk-body">
        {report && report.repaired > 0 && (
          <p className="callout">
            Última reparación ({new Date(report.at).toLocaleString("es-PY")}): {report.repaired} registros dañados omitidos ({report.fields.join(", ")}). Los datos de ese momento están en el respaldo “Registro previo a la reparación”;
            puede revisarlos y restaurarlos si es necesario.
          </p>
        )}
        <div className="form-actions bk-actions">
          <button className="btn" onClick={backupNow}>
            <ShieldCheck size={15} /> Respaldar ahora
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            <Upload size={15} /> Restaurar desde JSON
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) fromFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {items.length ? (
          <ul className="bk-list">
            {items.map((b) => (
              <li key={b.key}>
                <div>
                  <b>{b.label}</b>
                  <small>
                    {Math.max(1, Math.round(b.size / 1024))} KB
                    {b.valid
                      ? ` · ${b.contracts} contratos · ${b.receipts} cobros${b.repaired ? ` · ${b.repaired} registros se reparan al cargar` : ""}`
                      : "· ilegible"}
                  </small>
                </div>
                {b.valid ? (
                  <Badge tone={b.repaired ? "amber" : "green"}>{b.repaired ? "Reparable" : "Vigente"}</Badge>
                ) : (
                  <Badge tone="red">Inválido</Badge>
                )}
                <div className="bk-row-actions">
                  <button
                    className="btn compact"
                    disabled={!b.valid}
                    title={b.valid ? "Primero se respalda el estado actual" : "Un respaldo inválido no se puede restaurar"}
                    onClick={() => setConfirm({ label: b.label, raw: localStorage.getItem(b.key) ?? "" })}
                  >
                    <RotateCcw size={14} /> Restaurar
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Descargar respaldo ${b.label}`}
                    onClick={() => {
                      const url = URL.createObjectURL(new Blob([localStorage.getItem(b.key) ?? ""], { type: "application/json" }));
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${b.key}.json`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <Download size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No hay respaldos en este navegador. Use “Respaldar ahora” para respaldar los registros actuales.</p>
        )}
        {confirm && (
          <div className="inline-form">
            <h3>“{confirm.label}”: ¿restaurar?</h3>
            <p className="muted">
              Los registros actuales se respaldan como “Estado previo a la última restauración”; luego se carga este respaldo y la página se recarga.
            </p>
            <div className="form-actions">
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancelar
              </button>
              <button className="btn primary" onClick={() => restore(confirm.raw)}>
                Respaldar el estado actual y restaurar
              </button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

