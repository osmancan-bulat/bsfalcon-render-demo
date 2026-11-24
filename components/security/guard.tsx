"use client";
// Ekran ve oturum korumaları (DEMO · tarayıcı içi). Oturum yoksa giriş ekranına yönlendirir; yetkisiz
// ekranda içerik yerine erişim engeli gösterir ve denemeyi Güvenlik Merkezi kaydına yazar.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { useAuth } from "./auth";
import { roleLabel, SECTION_MODULE, MODULES } from "@/lib/security";

/** Oturum yoksa giriş ekranına (dönüş adresiyle) yönlendirir. */
export function useSessionGuard() {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.ready || auth.user) return;
    const r = location.pathname + location.search;
    router.replace(`/?r=${encodeURIComponent(r)}`);
  }, [auth.ready, auth.user, router]);
  return auth.ready && !!auth.user;
}

export function AccessDenied({ what, module }: { what: string; module?: string }) {
  const auth = useAuth();
  const logged = useRef("");
  useEffect(() => {
    if (logged.current === what) return;
    logged.current = what;
    auth.logDenied(what);
  }, [what]); // eslint-disable-line react-hooks/exhaustive-deps
  const mod = module ?? MODULES.find((m) => m.id === SECTION_MODULE[what])?.label;
  return (
    <section className="sec-denied" role="alert">
      <ShieldX size={34} />
      <h1>Bu bölüme erişim yetkiniz yok</h1>
      <p>
        {auth.user ? `${auth.user.name} · ${roleLabel(auth.user.role)}` : "Oturum yok"} kullanıcısının
        {mod ? ` “${mod}”` : ""} için görüntüleme yetkisi bulunmuyor. Deneme Güvenlik Merkezi'ne kaydedildi.
      </p>
      <p className="muted">Yetki gerekiyorsa sistem yöneticisine başvurun.</p>
      <Link className="btn primary" href="/genel-bakis">Genel bakışa dön</Link>
    </section>
  );
}
