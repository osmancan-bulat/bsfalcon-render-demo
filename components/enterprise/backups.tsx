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

const MAIN = "sane-enterprise-v1";
const PREFIX = "sane-enterprise-v1-yedek";
const MANUAL = "sane-yedek-manuel-";
const LABELS: Record<string, string> = {
  "sane-enterprise-v1-yedek-v1": "Sürüm geçişi öncesi (v3.1)",
  "sane-enterprise-v1-yedek-onarim": "Onarım öncesi kayıt",
  "sane-enterprise-v1-yedek-okunamayan": "Okunamayan kayıt",
  "sane-enterprise-v1-yedek-geri-yukleme-oncesi": "Son geri yükleme öncesi durum",
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
  const label = LABELS[key] ?? (key.startsWith(MANUAL) ? `Elle alınan yedek · ${new Date(key.slice(MANUAL.length)).toLocaleString("tr-TR")}` : key);
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
      const r = localStorage.getItem("sane-onarim-raporu");
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
      notify("Mevcut kayıtların yedeği alındı (bu tarayıcıda).");
      refresh();
    } catch {
      notify("Yedek alınamadı: tarayıcı depolaması dolu veya kapalı.");
    }
  }
  function restore(raw: string) {
    const out = migrateSaved(raw);
    if (!out) {
      notify("Bu yedek geçerli değil; geri yüklenmedi.");
      return;
    }
    try {
      // Geri yüklemeden önce mevcut durum korunur
      localStorage.setItem(`${PREFIX}-geri-yukleme-oncesi`, localStorage.getItem(MAIN) ?? JSON.stringify(state));
      localStorage.setItem(MAIN, raw);
      location.reload();
    } catch {
      notify("Geri yükleme yapılamadı: tarayıcı depolaması kullanılamıyor.");
    }
  }
  async function fromFile(f: File) {
    const raw = await f.text();
    if (raw.length > 4_000_000) {
      notify("Dosya çok büyük (4 MB sınırı).");
      return;
    }
    const ok = !!migrateSaved(raw);
    syncCatalog(state);
    if (!ok) {
      notify("Dosya geçerli bir SANE demo yedeği değil; geri yüklenmedi.");
      return;
    }
    setConfirm({ label: f.name, raw });
  }
  return (
    <Panel
      title="Yedekler"
      subtitle="Bu tarayıcıdaki demo kayıtları için yedek alma ve geri yükleme. Merkezî veya bulut yedeklemesi değildir."
    >
      <div className="bk-body">
        {report && report.repaired > 0 && (
          <p className="callout">
            Son onarım ({new Date(report.at).toLocaleString("tr-TR")}): {report.repaired} bozuk kayıt
            atlandı ({report.fields.join(", ")}). O andaki veri “Onarım öncesi kayıt” yedeğindedir;
            gerekirse inceleyip geri yükleyebilirsiniz.
          </p>
        )}
        <div className="form-actions bk-actions">
          <button className="btn" onClick={backupNow}>
            <ShieldCheck size={15} /> Şimdi yedek al
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            <Upload size={15} /> JSON dosyasından geri yükle
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
                      ? ` · ${b.contracts} satış sözleşmesi · ${b.receipts} tahsilat${b.repaired ? ` · ${b.repaired} kayıt onarılarak yüklenir` : ""}`
                      : " · okunamıyor"}
                  </small>
                </div>
                {b.valid ? (
                  <Badge tone={b.repaired ? "amber" : "green"}>{b.repaired ? "Onarılabilir" : "Geçerli"}</Badge>
                ) : (
                  <Badge tone="red">Geçersiz</Badge>
                )}
                <div className="bk-row-actions">
                  <button
                    className="btn compact"
                    disabled={!b.valid}
                    title={b.valid ? "Önce mevcut durum yedeklenir" : "Geçersiz yedek geri yüklenemez"}
                    onClick={() => setConfirm({ label: b.label, raw: localStorage.getItem(b.key) ?? "" })}
                  >
                    <RotateCcw size={14} /> Geri yükle
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`${b.label} yedeğini indir`}
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
          <p className="muted">Bu tarayıcıda yedek yok. “Şimdi yedek al” ile mevcut kayıtların yedeğini alabilirsiniz.</p>
        )}
        {confirm && (
          <div className="inline-form">
            <h3>“{confirm.label}” geri yüklensin mi?</h3>
            <p className="muted">
              Mevcut kayıtlar önce “Son geri yükleme öncesi durum” olarak yedeklenir, ardından bu yedek yüklenir ve
              sayfa yenilenir. Kayıt kimlikleri ve finansal geçmiş yedekteki haliyle gelir.
            </p>
            <div className="form-actions">
              <button className="btn" onClick={() => setConfirm(null)}>
                Vazgeç
              </button>
              <button className="btn primary" onClick={() => restore(confirm.raw)}>
                Mevcut durumu yedekle ve geri yükle
              </button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

