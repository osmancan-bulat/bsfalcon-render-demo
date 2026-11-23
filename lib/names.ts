// Catálogo de identidades de EJEMPLO. Todos los nombres de personas y empresas son inventados y no
// corresponden a clientes, empleados ni proveedores reales de EDIFICA.
// El nombre se genera de forma determinista a partir del número de registro: el mismo número da la
// misma persona en todas las pantallas.
const FIRST = [
  "María", "José", "Ana", "Carlos", "Laura", "Diego", "Sofía", "Juan", "Camila",
  "Luis", "Valeria", "Jorge", "Paula", "Miguel", "Lucía", "Andrés", "Natalia", "Fernando",
  "Gabriela", "Ricardo", "Carolina", "Hugo", "Silvia", "Marcos", "Rocío",
];
const LAST = [
  "Benítez", "Martínez", "Giménez", "Ortiz", "Duarte", "Vera", "Ramírez", "Rojas",
  "Báez", "Cáceres", "Villalba", "Acosta", "Ayala", "Franco", "Romero", "Fernández",
  "Sosa", "Núñez", "Cabrera", "Aquino", "Valdez", "Insfrán", "Ledesma", "Morínigo",
];

/**
 * Nombre del n-ésimo cliente de ejemplo. 25 nombres × 24 apellidos: único para n < 600
 * (nombre por n mod 25, apellido por 7n mod 24; 7 y 24 son coprimos).
 */
export const personName = (n: number) =>
  `${FIRST[(n + 19) % 25]} ${LAST[(n * 7 + 9) % 24]}`;

/** Proveedores y contratistas de ejemplo. */
export const FIRM = {
  yapi: "Constructora Ejemplo del Este",
  teknik: "Instalaciones Ejemplo S.A.",
  cephe: "Fachadas Ejemplo S.R.L.",
  demir: "Aceros Ejemplo S.A.",
  aluminyum: "Aberturas Ejemplo S.R.L.",
} as const;

/** Asesores de ejemplo (responsable del cliente). */
export const ADVISORS = ["Asesora 1 · Comercial", "Asesor 2 · Comercial"];

/** Nombres genéricos de versiones anteriores → identidades de ejemplo (compatibilidad de datos guardados). */
const LEGACY_FIRMS: [string, string][] = [
  ["Constructora demo", FIRM.yapi],
  ["Instalaciones demo", FIRM.teknik],
  ["Fachadas demo", FIRM.cephe],
  ["Aceros demo", FIRM.demir],
  ["Aberturas demo", FIRM.aluminyum],
  ["Asesor demo 1", ADVISORS[0]],
  ["Asesor demo 2", ADVISORS[1]],
];

/** Reemplaza nombres genéricos antiguos por la identidad de ejemplo equivalente. Los ids no cambian. */
export function renameLegacy(text: string): string {
  let out = text.replace(/Cliente demo (\d{1,3})/g, (_, n) => personName(Number(n)));
  for (const [from, to] of LEGACY_FIRMS) out = out.split(from).join(to);
  return out;
}
