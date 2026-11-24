"use client";
// Hassas belge kapısı (DEMO · tarayıcı içi): oturum → modül yetkisi → hassas belge yetkisi → yeniden doğrulama
// → görüntüleme kaydı. Yazdırma/PDF ayrı "indirme" yetkisine bağlıdır ve kaydedilir.
// Not: Statik sitede belge içeriği tarayıcıda üretilir; üretimde belgeler sunucuda yetki kontrolüyle ve
// süreli, imzalı bağlantılarla sunulmalıdır (bkz. Güvenlik Merkezi › Üretim mimarisi).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LockKeyhole, ShieldX } from "lucide-react";
import PrintDocument from "../enterprise/print-document";
import { useAuth } from "./auth";
import { useSessionGuard } from "./guard";
import type { ModuleId } from "@/lib/security";

const KINDS: Record<string, { label: string; module: ModuleId }> = {
  sozlesme: { label: "Satış sözleşmesi", module: "satis" },
  plan: { label: "Ödeme planı", module: "satis" },
  ekstre: { label: "Müşteri cari hesap ekstresi", module: "tahsilat" },
  makbuz: { label: "Tahsilat makbuzu", module: "tahsilat" },
  barter: { label: "Barter sözleşmesi", module: "hakedis" },
  is: { label: "İş (taşeron) sözleşmesi", module: "hakedis" },
  rapor: { label: "Finansal rapor", module: "rapor" },
  yonetici: { label: "Yönetici raporu", module: "rapor" },
  proje: { label: "Proje yönetici raporu", module: "rapor" },
};

export default function DocumentGate() {
  const auth = useAuth();
  const signedIn = useSessionGuard();
  const [params, setParams] = useState<{ tur: string; id: string } | null>(null);
  const [state, setState] = useState<"checking" | "ok" | "denied" | "cancelled">("checking");
  const logged = useRef(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setParams({ tur: q.get("tur") ?? "", id: q.get("id") ?? q.get("project") ?? q.get("rapor") ?? "" });
  }, []);
  const kind = params ? KINDS[params.tur] : undefined;
  const label = kind ? `${kind.label}${params?.id ? ` · ${params.id}` : ""}` : "Belge";
  useEffect(() => {
    if (!signedIn || !params || logged.current) return;
    logged.current = true;
    if (!kind || !auth.can(kind.module, "view") || !auth.perms?.flags.sensitiveDocs) {
      auth.logDoc(label, params.tur, "denied", !kind ? "Bilinmeyen belge türü" : "Yetki yok");
      setState("denied");
      return;
    }
    auth.requireReauth(label, params.tur).then((ok) => {
      if (!ok) {
        setState("cancelled");
        return;
      }
      auth.logDoc(label, params.tur, "view");
      setState("ok");
    });
  }, [signedIn, params]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!signedIn || !params || state === "checking")
    return <div className="doc-loading"><LockKeyhole size={16} /> Erişim doğrulanıyor…</div>;
  if (state !== "ok")
    return (
      <section className="sec-denied doc-denied" role="alert">
        <ShieldX size={34} />
        <h1>{state === "denied" ? "Bu belgeyi açma yetkiniz yok" : "Doğrulama tamamlanmadı"}</h1>
        <p>
          {state === "denied"
            ? "Hassas belge erişimi rol ve kullanıcı yetkisine bağlıdır. Deneme Güvenlik Merkezi › Belge erişim geçmişi'ne kaydedildi."
            : "Hassas belge yeniden doğrulama olmadan açılmaz."}
        </p>
        <Link className="btn primary" href="/genel-bakis">Yönetim merkezine dön</Link>
      </section>
    );
  const canPrint = !!auth.perms?.flags.download;
  return (
    <div className={canPrint ? "" : "doc-noprint"} data-print-label={label}>
      <PrintDocument
        canPrint={canPrint}
        onPrint={() => {
          if (!canPrint) {
            auth.logDoc(label, params.tur, "denied", "Yazdırma/indirme yetkisi yok");
            return false;
          }
          auth.logDoc(label, params.tur, "download", "Yazdır / PDF");
          return true;
        }}
      />
    </div>
  );
}
