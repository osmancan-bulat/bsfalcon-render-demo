// Proje ve daire kataloğu: yerleşik projeler (VERDORA Kozyatağı, Sane Time Beşevler, Bulvar Park II) + kullanıcının
// eklediği projeler, bloklar ve daireler. `projects` ve `units` dizileri tüm uygulamada paylaşılır;
// syncCatalog(durum) bunları o durumun kataloğuyla yerinde günceller (kod değişikliği gerekmeden
// yeni projeler her ekrana, seçiciye ve rapora otomatik dahil olur).
import { projects, type Project, type ProjectStatus } from "./data.ts";
import { units, rebuildUnitIndex, type Unit } from "./units.ts";

export type CatalogState = {
  projectsCustom?: Project[];
  projectEdits?: Record<string, Partial<Project>>;
  unitsCustom?: Unit[];
  unitEdits?: Record<string, Partial<Unit>>;
};

const BUILTIN_PROJECTS: Project[] = projects.map((p) => ({ ...p }));
const BUILTIN_UNITS: Unit[] = units.map((u) => ({ ...u }));
export const BUILTIN_PROJECT_IDS = BUILTIN_PROJECTS.map((p) => p.id);

let synced: object | null = null;
/** Katalogu verilen durumla eşitler (aynı durum için tekrar hesaplamaz). */
export function syncCatalog(s: CatalogState) {
  if (synced === s) return;
  synced = s;
  const us = [...BUILTIN_UNITS, ...(s.unitsCustom ?? [])].map((u) => ({
    ...u,
    ...(s.unitEdits?.[u.id] ?? {}),
  }));
  const ps = [
    ...BUILTIN_PROJECTS.map((p) => ({ ...p, ...(s.projectEdits?.[p.id] ?? {}) })),
    ...(s.projectsCustom ?? []).map((p) => ({ ...p, ...(s.projectEdits?.[p.id] ?? {}) })),
  ].map((p) => ({ ...p, total: us.filter((u) => u.project === p.id).length }));
  projects.splice(0, projects.length, ...ps);
  units.splice(0, units.length, ...us);
  rebuildUnitIndex();
}
/** Bir sonraki çağrıda yeniden eşitlemeyi zorlar (testler ve sıfırlama için). */
export const resetCatalogCache = () => {
  synced = null;
};

export const projectById = (id: string) => projects.find((p) => p.id === id);
/**
 * Çalışma kapsamı kuralı (tek kaynak): "all" veya mevcut ve arşivde olmayan bir proje geçerlidir.
 * Silinmiş, arşivlenmiş veya hiç olmamış proje kimliği kapsam olarak kullanılamaz.
 */
export const isScopeValid = (id: string | null | undefined): id is string =>
  id === "all" || projects.some((p) => p.id === id && p.status !== "Arşiv");
/** Geçersiz kapsamı güvenle "all"a (tüm projeler) çevirir. */
export const resolveScope = (id: string | null | undefined) =>
  isScopeValid(id) ? id : "all";
/** Geçersiz kapsamın nedeni: arşivdeki proje mi, mevcut olmayan proje mi? */
export const scopeProblem = (id: string | null | undefined) =>
  isScopeValid(id) ? null : projectById(id ?? "") ? "archived" : "missing";
export const projectCode = (id: string) => projectById(id)?.code ?? "XX";
/** Seçicide ve genel bakışta gösterilen projeler (arşivdekiler hariç). */
export const visibleProjects = () => projects.filter((p) => p.status !== "Arşiv");
export const PROJECT_STATUSES: ProjectStatus[] = ["Aktif", "Tamamlandı", "Arşiv"];

/** Proje merkezi adresi: yerleşik projelerin eski adresleri korunur, yeniler genel adresi kullanır. */
export const hubHref = (id: string) =>
  id === "verdora"
    ? "/verdora-kozyatagi"
    : id === "sanetime"
      ? "/sane-time-besevler"
      : id === "bulvarpark"
        ? "/bulvar-park-2"
        : id === "all"
        ? "/genel-bakis"
        : `/proje/?id=${encodeURIComponent(id)}`;

const floorLabel = (f: number) =>
  f === 0 ? "Zemin kat" : f < 0 ? `${-f}. bodrum kat` : `${f}. kat`;
/** Bir projeye yeni blok için daireler üretir; numaralar projede kaldığı yerden devam eder. */
export function makeBlockUnits(
  project: string,
  existing: Unit[],
  b: { block: string; floors: number; perFloor: number; startFloor: number; type: string; gross: number; listPrice: number; facade: string },
): Unit[] {
  let no = Math.max(0, ...existing.filter((u) => u.project === project).map((u) => u.no));
  const out: Unit[] = [];
  for (let f = b.startFloor; f < b.startFloor + b.floors; f++)
    for (let k = 0; k < b.perFloor; k++) {
      no++;
      out.push({
        id: `${project}-${no}`,
        project,
        no,
        label: `${b.block}-${String(no).padStart(2, "0")}`,
        block: b.block,
        floor: f,
        floorLabel: floorLabel(f),
        type: b.type,
        gross: b.gross,
        net: Math.round(b.gross * 0.82),
        facade: b.facade,
        corner: k === 0 || k === b.perFloor - 1,
        listPrice: b.listPrice,
      });
    }
  return out;
}
export { floorLabel };
