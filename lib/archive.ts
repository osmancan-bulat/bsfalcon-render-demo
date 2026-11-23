export type ArchiveFile = {
  id: string;
  name: string;
  project: string;
  record: string;
  company: string;
  kind: string;
  date: string;
  expiry: string;
  description: string;
  size: number;
  mime: string;
  blob: Blob;
  /** Tarayıcıya yüklenme zamanı (ISO). Eski kayıtlarda bulunmayabilir. */
  uploadedAt?: string;
};
export const archiveExtensions = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "txt",
  "docx",
  "xlsx",
];
export function validateArchiveFile(file: { name: string; size: number }) {
  if (
    !archiveExtensions.includes(file.name.split(".").pop()?.toLowerCase() ?? "")
  )
    throw Error("Seleccione PDF, PNG, JPG, WEBP, TXT, DOCX o XLSX.");
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    throw Error("El archivo debe pesar entre 0 y 10 MB.");
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("edifica-demo-archive", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("files", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(Error("No se pudo abrir el archivo del navegador."));
  });
}
export async function readArchive(): Promise<ArchiveFile[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction("files", "readonly"),
      r = t.objectStore("files").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(Error("No se pudo leer el archivo."));
    t.oncomplete = () => db.close();
  });
}
export async function saveArchive(file: ArchiveFile) {
  validateArchiveFile(file);
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction("files", "readwrite");
    t.objectStore("files").put(file);
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(
        Error("No se pudo guardar el archivo; verifique el espacio del navegador."),
      );
    };
    t.onabort = () => reject(Error("No se completó el guardado del archivo."));
  });
}

/** Belge geçerlilik durumu (senaryo tarihi 15 Kasım 2026). */
export function documentValidity(expiry: string, today = "2026-11-15") {
  if (!expiry) return "Sin vencimiento" as const;
  if (expiry < today) return "Vencido" as const;
  const days = Math.round(
    (Date.parse(expiry + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) /
      86400000,
  );
  return days <= 30 ? ("Por vencer" as const) : ("Vigente" as const);
}
