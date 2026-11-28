"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  seedState,
  applyAction,
  migrateSaved,
  type EnterpriseState,
  type Action,
  projects,
} from "@/lib/enterprise";
import { syncCatalog, resolveScope, scopeProblem } from "@/lib/catalog";
import { setCurrencyView, type Currency } from "@/lib/currency";
import { useAuthOptional } from "../security/auth";
import { roleLabel } from "@/lib/security";
type AppContext = {
  state: EnterpriseState;
  ready: boolean;
  project: string;
  setProject: (id: string) => void;
  act: (a: Action) => boolean;
  toast: string;
  notify: (s: string) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
};
const Context = createContext<AppContext | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EnterpriseState>(seedState),
    [ready, setReady] = useState(false),
    [project, setP] = useState("all"),
    [toast, notify] = useState("");
  const current = useRef(state);
  // Para birimi görünümü: tutarlar yalnızca seçili para birimindeki sözleşme ve kayıtlardan hesaplanır
  const [currency, setCur] = useState<Currency>("EUR");
  setCurrencyView(currency);
  useEffect(() => {
    try {
      const c = localStorage.getItem("byguzel-para-birimi");
      if (c === "USD" || c === "TRY" || c === "EUR") setCur(c);
    } catch {}
  }, []);
  const setCurrency = (c: Currency) => {
    setCurrencyView(c);
    setCur(c);
    try {
      localStorage.setItem("byguzel-para-birimi", c);
    } catch {}
  };
  const auth = useAuthOptional();
  // Katalog (projeler ve daireler) her çizimde bu durumla eşitlenir; alt bileşenler güncel listeyi görür.
  syncCatalog(state);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("byguzel-enterprise-v1");
      const loaded = raw ? migrateSaved(raw) : null;
      if (raw && !loaded) {
        // Okunamayan kayıt silinmez: yedeklenir, uygulama örnek veriyle açılır.
        try {
          localStorage.setItem("byguzel-enterprise-v1-yedek-okunamayan", raw);
        } catch {}
        notify(
          "Tarayıcıdaki kayıtlar okunamadı; yedeklendi ve örnek veriyle başlatıldı.",
        );
      }
      if (loaded && loaded.repaired > 0) {
        try {
          localStorage.setItem("byguzel-enterprise-v1-yedek-onarim", raw!);
          localStorage.setItem(
            "byguzel-onarim-raporu",
            JSON.stringify({
              at: new Date().toISOString(),
              repaired: loaded.repaired,
              fields: loaded.fields,
            }),
          );
          localStorage.setItem(
            "byguzel-enterprise-v1",
            JSON.stringify(loaded.state),
          );
        } catch {}
        notify(
          `${loaded.repaired} bozuk kayıt atlandı (${loaded.fields.join(", ")}); önceki veri yedeklendi — Yönetim & Ayarlar › Yedekler.`,
        );
      }
      if (loaded) {
        if (loaded.migrated) {
          // Önceki kayıt silinmez: yedeği saklanır, ardından kurgusal adlarla yeniden yazılır.
          try {
            localStorage.setItem("byguzel-enterprise-v1-yedek-v1", raw!);
            localStorage.setItem(
              "byguzel-enterprise-v1",
              JSON.stringify(loaded.state),
            );
          } catch {}
        }
        current.current = loaded.state;
        setState(loaded.state);
      }
      const saved = localStorage.getItem("byguzel-project");
      syncCatalog(current.current);
      // Yenilemede mevcut olmayan veya arşivdeki proje seçimi korunmaz; kayıt da düzeltilir.
      const valid = resolveScope(saved);
      setP(valid);
      if (saved !== null && saved !== valid)
        localStorage.setItem("byguzel-project", valid);
    } catch {
      notify("Kayıtlar okunamadı; örnek veriyle başlatıldı.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => notify(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  // Çift gönderim koruması: aynı işlem 1 saniye içinde tekrar gelirse yok sayılır
  // (çift tıklama, Enter + tıklama). Farklı tutar veya kayıtla yapılan işlemler etkilenmez.
  const last = useRef<{ key: string; at: number } | null>(null);
  function act(a: Action) {
    const key = JSON.stringify(a);
    const now = Date.now();
    if (a.type !== "reset" && last.current?.key === key && now - last.current.at < 1000)
      return true;
    last.current = { key, at: now };
    // Yetki denetimi (DEMO · tarayıcı içi): yetkisiz işlem uygulanmaz ve Güvenlik Merkezi kaydına yazılır.
    if (auth) {
      const denied = auth.checkAction(a.type);
      if (denied) {
        auth.logDenied(`İşlem: ${a.type}`);
        notify(denied);
        return false;
      }
    }
    try {
      let next = applyAction(current.current, a);
      if (auth?.user && next.audit.length && next.audit[0] !== current.current.audit[0])
        next = { ...next, audit: [{ ...next.audit[0], user: `${auth.user.name} · ${roleLabel(auth.user.role)}` }, ...next.audit.slice(1)] };
      current.current = next;
      setState(next);
      try {
        localStorage.setItem("byguzel-enterprise-v1", JSON.stringify(next));
      } catch {
        notify(
          "İşlem bu oturumda kaydedildi; tarayıcı depolaması kullanılamıyor.",
        );
        return true;
      }
      notify(
        a.type === "reset"
          ? "Demo başlangıç durumuna döndürüldü."
          : (next.audit[0]?.message ?? "İşlem tamamlandı."),
      );
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
      return false;
    }
  }
  const setProject = (id: string) => {
    const v = resolveScope(id);
    setP(v);
    try {
      localStorage.setItem("byguzel-project", v);
    } catch {}
  };
  // Kapsam her çizimde katalogla doğrulanır: seçili proje silinir veya arşivlenirse alt bileşenler
  // hiçbir zaman geçersiz kimliği görmez; durum ve kalıcı kayıt "Tüm projeler"e düzeltilir.
  const effective = resolveScope(project);
  useEffect(() => {
    if (!ready || effective === project) return;
    const why = scopeProblem(project);
    setP(effective);
    try {
      localStorage.setItem("byguzel-project", effective);
    } catch {}
    notify(
      why === "archived"
        ? "Seçili proje arşive alındı; çalışma kapsamı “Tüm projeler” oldu."
        : "Seçili proje artık mevcut değil; çalışma kapsamı “Tüm projeler” oldu.",
    );
  }, [ready, effective, project]);
  return (
    <Context.Provider
      value={{
        state,
        ready,
        project: effective,
        setProject,
        act,
        toast,
        notify,
        currency,
        setCurrency,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const c = useContext(Context);
  if (!c) throw Error("Provider required");
  return c;
}
