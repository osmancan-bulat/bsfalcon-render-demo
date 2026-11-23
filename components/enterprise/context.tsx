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
import { setDisplayCurrency, type DisplayCurrency } from "@/lib/data";
type AppContext = {
  state: EnterpriseState;
  ready: boolean;
  project: string;
  setProject: (id: string) => void;
  act: (a: Action) => boolean;
  toast: string;
  notify: (s: string) => void;
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
};
const Context = createContext<AppContext | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EnterpriseState>(seedState),
    [ready, setReady] = useState(false),
    [project, setP] = useState("all"),
    [toast, notify] = useState(""),
    [currency, setCur] = useState<DisplayCurrency>("USD");
  const current = useRef(state);
  // Katalog (projeler ve daireler) her çizimde bu durumla eşitlenir; alt bileşenler güncel listeyi görür.
  syncCatalog(state);
  // Moneda de visualización: los montos se registran en USD; ₲ usa el tipo de cambio definido en Configuración.
  setDisplayCurrency(currency, state.fx?.rate ?? 7300);
  useEffect(() => {
    try {
      if (localStorage.getItem("edifica-moneda") === "PYG") setCur("PYG");
    } catch {}
  }, []);
  const setCurrency = (c: DisplayCurrency) => {
    setCur(c);
    try {
      localStorage.setItem("edifica-moneda", c);
    } catch {}
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem("edifica-enterprise-v1");
      const loaded = raw ? migrateSaved(raw) : null;
      if (raw && !loaded) {
        // Okunamayan kayıt silinmez: yedeklenir, uygulama örnek veriyle açılır.
        try {
          localStorage.setItem("edifica-enterprise-v1-yedek-okunamayan", raw);
        } catch {}
        notify(
          "No se pudieron leer los registros del navegador; se respaldaron y se inició con los datos de ejemplo.",
        );
      }
      if (loaded && loaded.repaired > 0) {
        try {
          localStorage.setItem("edifica-enterprise-v1-yedek-onarim", raw!);
          localStorage.setItem(
            "edifica-onarim-raporu",
            JSON.stringify({
              at: new Date().toISOString(),
              repaired: loaded.repaired,
              fields: loaded.fields,
            }),
          );
          localStorage.setItem(
            "edifica-enterprise-v1",
            JSON.stringify(loaded.state),
          );
        } catch {}
        notify(
          `Se omitieron ${loaded.repaired} registros dañados (${loaded.fields.join(", ")}); los datos anteriores se respaldaron — Configuración › Respaldos.`,
        );
      }
      if (loaded) {
        if (loaded.migrated) {
          // Önceki kayıt silinmez: yedeği saklanır, ardından kurgusal adlarla yeniden yazılır.
          try {
            localStorage.setItem("edifica-enterprise-v1-yedek-v1", raw!);
            localStorage.setItem(
              "edifica-enterprise-v1",
              JSON.stringify(loaded.state),
            );
          } catch {}
        }
        current.current = loaded.state;
        setState(loaded.state);
      }
      const saved = localStorage.getItem("edifica-project");
      syncCatalog(current.current);
      // Yenilemede mevcut olmayan veya arşivdeki proje seçimi korunmaz; kayıt da düzeltilir.
      const valid = resolveScope(saved);
      setP(valid);
      if (saved !== null && saved !== valid)
        localStorage.setItem("edifica-project", valid);
    } catch {
      notify("No se pudieron leer los registros; se inició con los datos de ejemplo.");
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
    try {
      const next = applyAction(current.current, a);
      current.current = next;
      setState(next);
      try {
        localStorage.setItem("edifica-enterprise-v1", JSON.stringify(next));
      } catch {
        notify(
          "La operación se guardó en esta sesión; el almacenamiento del navegador no está disponible.",
        );
        return true;
      }
      notify(
        a.type === "reset"
          ? "La demo volvió a su estado inicial."
          : (next.audit[0]?.message ?? "Operación completada."),
      );
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : "No se pudo completar la operación.");
      return false;
    }
  }
  const setProject = (id: string) => {
    const v = resolveScope(id);
    setP(v);
    try {
      localStorage.setItem("edifica-project", v);
    } catch {}
  };
  // Kapsam her çizimde katalogla doğrulanır: seçili proje silinir veya arşivlenirse alt bileşenler
  // hiçbir zaman geçersiz kimliği görmez; durum ve kalıcı kayıt "Todos los proyectos"e düzeltilir.
  const effective = resolveScope(project);
  useEffect(() => {
    if (!ready || effective === project) return;
    const why = scopeProblem(project);
    setP(effective);
    try {
      localStorage.setItem("edifica-project", effective);
    } catch {}
    notify(
      why === "archived"
        ? "El proyecto seleccionado fue archivado; el alcance pasó a “Todos los proyectos”."
        : "El proyecto seleccionado ya no existe; el alcance pasó a “Todos los proyectos”.",
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
