"use client";
// Bir kayda (müşteri, barter, daire) ait belgeler.
// 1) Sistem belgeleri: kayıttan otomatik üretilir, her zaman görüntülenebilir/yazdırılabilir.
// 2) Yüklenen dosyalar: yalnızca bu tarayıcıda (IndexedDB) saklanan demo dosyaları.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, FileText, Printer, Upload } from "lucide-react";
import { useApp } from "./context";
import { Badge } from "./shared";
import { systemDocuments } from "@/lib/enterprise";
import { readArchive, documentValidity, type ArchiveFile } from "@/lib/archive";
import { date } from "@/lib/data";

const TONE: Record<string, string> = {
  Geçerli: "green",
  Süresiz: "neutral",
  "Süresi yaklaşıyor": "amber",
  "Süresi doldu": "red",
};

export default function RecordDocuments({
  records,
  uploadHref,
}: {
  records: string[];
  project?: string;
  uploadHref: string;
}) {
  const { state } = useApp();
  const [files, setFiles] = useState<ArchiveFile[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    readArchive()
      .then(setFiles)
      .catch(() => setError("Tarayıcı arşivi okunamadı."));
  }, []);
  const system = records.flatMap((r) => systemDocuments(state, r));
  const uploaded = (files ?? []).filter((f) => records.includes(f.record));
  function download(f: ArchiveFile) {
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="acct-section">
      <h3 className="subheading">Sözleşme ve sistem belgeleri</h3>
      {system.length ? (
        <ul className="doc-list">
          {system.map((d) => (
            <li key={d.id}>
              <span className="doc-list-icon">
                <FileText size={16} />
              </span>
              <span className="cc-list-main">
                <b>{d.name}</b>
                <small>
                  {d.kind} · {date(d.date)} · {d.detail}
                </small>
              </span>
              <Link className="btn compact" href={d.href} target="_blank">
                <Printer size={14} /> Görüntüle
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Bu kayıt için sistem belgesi yok.</p>
      )}

      <h3 className="subheading">Yüklenen dosyalar</h3>
      {error && <p className="callout">{error}</p>}
      {uploaded.length > 0 && (
        <ul className="doc-list">
          {uploaded.map((f) => {
            const v = documentValidity(f.expiry);
            return (
              <li key={f.id}>
                <span className="doc-list-icon">
                  <FileText size={16} />
                </span>
                <span className="cc-list-main">
                  <b>{f.name}</b>
                  <small>
                    {f.kind} · {f.date ? date(f.date) : "—"}
                    {f.expiry ? ` · geçerlilik ${date(f.expiry)}` : ""}
                  </small>
                </span>
                <Badge tone={TONE[v]}>{v}</Badge>
                <button
                  className="icon-button"
                  aria-label={`${f.name} indir`}
                  onClick={() => download(f)}
                >
                  <Download size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="doc-empty">
        <Upload size={16} />
        <span>
          {uploaded.length
            ? "Ek dosya yükleyebilirsiniz."
            : "Yüklenmiş dosya yok."}{" "}
          Dosyalar yalnızca bu tarayıcıda saklanır (demo); sunucuya gönderilmez.
        </span>
        <Link className="btn compact" href={uploadHref}>
          Dosya ekle
        </Link>
      </div>
    </section>
  );
}
