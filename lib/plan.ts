// Esnek ödeme planı. Tüm hesaplar kuruş cinsinden tam sayı ile yapılır;
// taksitler tam TL'ye yuvarlanır ve kalan kuruş farkı son taksite eklenir.
export type DepositPart = { amount: number; due: string };
export type InterimPayment = { amount: number; due: string; label: string };
export type PlanSpec = {
  deposits: DepositPart[];
  count: number;
  firstDue: string;
  interim: InterimPayment[];
};
export type ScheduleRow = {
  seq: string;
  kind: "Cuota" | "Pago intermedio";
  label: string;
  due: string;
  amount: number;
};

export const toKurus = (tl: number) => Math.round(tl * 100);
export const fromKurus = (k: number) => k / 100;
/** İki ondalığa güvenli yuvarlama: kayan nokta artıklarını temizler. */
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const sumTL = (values: number[]) =>
  fromKurus(values.reduce((a, v) => a + toKurus(v), 0));

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (d: string) =>
  ISO.test(d) && !Number.isNaN(Date.parse(d + "T00:00:00Z"));

/** Aynı gün, n ay sonrası (gün 1–28 aralığında tutulduğu için ay taşması olmaz). */
export function addMonths(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function validatePlan(price: number, spec: PlanSpec) {
  const P = toKurus(price);
  if (!Number.isFinite(price) || P <= 0)
    throw Error("El precio del contrato debe ser positivo.");
  if (!Number.isInteger(spec.count) || spec.count < 1 || spec.count > 120)
    throw Error("La cantidad de cuotas debe estar entre 1 y 120.");
  if (!isIsoDate(spec.firstDue) || Number(spec.firstDue.slice(8)) > 28)
    throw Error(
      "La fecha de la primera cuota debe ser válida; el día de pago debe estar entre 1 y 28.",
    );
  if (!spec.deposits.length)
    throw Error("Se requiere al menos una línea de anticipo (puede ser US$ 0).");
  for (const d of spec.deposits)
    if (!Number.isFinite(d.amount) || d.amount < 0 || !isIsoDate(d.due))
      throw Error("El monto y la fecha del anticipo deben ser válidos.");
  for (const p of spec.interim)
    if (
      !Number.isFinite(p.amount) ||
      p.amount <= 0 ||
      !isIsoDate(p.due) ||
      !p.label.trim()
    )
      throw Error(
        "Los pagos intermedios requieren descripción, monto y fecha válidos.",
      );
  const D = spec.deposits.reduce((a, d) => a + toKurus(d.amount), 0);
  const I = spec.interim.reduce((a, p) => a + toKurus(p.amount), 0);
  if (D + I >= P)
    throw Error("El anticipo y los pagos intermedios deben ser menores al precio del contrato.");
  if (P - D - I < spec.count * 100)
    throw Error("Cada cuota debe ser de al menos US$ 1.");
}

/** Planın taksit satırlarını üretir. Toplam, kuruşu kuruşuna sözleşme bedeline eşittir. */
export function buildSchedule(price: number, spec: PlanSpec) {
  validatePlan(price, spec);
  const P = toKurus(price);
  const D = spec.deposits.reduce((a, d) => a + toKurus(d.amount), 0);
  const I = spec.interim.reduce((a, p) => a + toKurus(p.amount), 0);
  const rest = P - D - I;
  const base = Math.floor(rest / spec.count / 100) * 100;
  const last = rest - base * (spec.count - 1);
  const rows: ScheduleRow[] = Array.from({ length: spec.count }, (_, i) => ({
    seq: String(i + 1),
    kind: "Cuota" as const,
    label: `Cuota ${i + 1}`,
    due: addMonths(spec.firstDue, i),
    amount: fromKurus(i === spec.count - 1 ? last : base),
  }));
  spec.interim.forEach((p, i) =>
    rows.push({
      seq: `A${i + 1}`,
      kind: "Pago intermedio",
      label: p.label.trim(),
      due: p.due,
      amount: fromKurus(toKurus(p.amount)),
    }),
  );
  rows.sort(
    (a, b) => a.due.localeCompare(b.due) || (a.kind === "Pago intermedio" ? -1 : 1),
  );
  return {
    rows,
    depositTotal: fromKurus(D),
    interimTotal: fromKurus(I),
    installment: fromKurus(base),
    lastInstallment: fromKurus(last),
    total: fromKurus(D + I + rest),
  };
}

/** Kademeli peşinatın hangi kısmının ödendiğini sırayla (önce en eski vade) dağıtır. */
export function depositStatus(parts: DepositPart[], paid: number) {
  let left = toKurus(paid);
  return [...parts]
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((p) => {
      const k = toKurus(p.amount),
        used = Math.min(k, Math.max(0, left));
      left -= used;
      return { ...p, paid: fromKurus(used), remaining: fromKurus(k - used) };
    });
}
