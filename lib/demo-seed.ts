// Demo EDIFICA · ESCENARIO DE EJEMPLO (15 nov 2026). Personas, empresas, contratos y montos son DATOS DE
// DEMOSTRACIÓN; no son clientes, ventas ni finanzas reales de EDIFICA. Todos los montos están en USD.
// Los registros están vinculados: los cobros se imputan a cuotas del plan de pagos de cada contrato y
// cada plan suma exactamente el precio del contrato (al centavo).
import type { Customer } from "./data.ts";
import type { PlanSpec } from "./plan.ts";
import { personName, FIRM } from "./names.ts";

type Meta = {
  status: "Borrador" | "Pendiente de firma" | "Activo";
  created: string;
  signedAt?: string;
  history: { date: string; status: string; note: string }[];
};
const plan = (p: PlanSpec) => p;
const signed = (created: string, signedAt: string, deposit: string): Meta => ({
  status: "Activo",
  created,
  signedAt,
  history: [
    { date: created, status: "Borrador", note: "Borrador de contrato creado" },
    { date: signedAt, status: "Activo", note: `Firmado · anticipo cobrado en la firma US$ ${deposit}` },
  ],
});

/** Contratos firmados con plan flexible. */
export const demoContracts: Customer[] = [
  {
    // ALION 601D: cuota pagada parcialmente y cuotas vencidas (ejemplo de mora)
    id: "alion-25",
    project: "alion",
    name: personName(81),
    unit: "601D",
    price: 63000,
    listPrice: 64350,
    deposit: 12600,
    depositExpected: 12600,
    depositDue: "2026-06-10",
    depositDate: "2026-06-10",
    installment: 1400,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 12600, due: "2026-06-10" }],
      count: 36,
      firstDue: "2026-07-10",
      interim: [],
    }),
  },
  {
    // ALION 602E: anticipo en tres partes (la segunda vencida, la tercera próxima); primera cuota en noviembre
    id: "alion-26",
    project: "alion",
    name: personName(82),
    unit: "602E",
    price: 67200,
    listPrice: 68500,
    deposit: 9000,
    depositExpected: 13440,
    depositDue: "2026-10-20",
    depositDate: "2026-10-20",
    installment: 1493,
    paidMonths: 0,
    plan: plan({
      deposits: [
        { amount: 9000, due: "2026-10-20" },
        { amount: 2220, due: "2026-11-10" },
        { amount: 2220, due: "2026-12-10" },
      ],
      count: 36,
      firstDue: "2026-11-20",
      interim: [],
    }),
  },
  {
    // V Tower del Lago: estructura publicada 20 % entrega · 60 % cuotas · 20 % con las llaves (abril 2029)
    id: "vtower-9",
    project: "vtower",
    name: personName(83),
    unit: "I-501",
    price: 203000,
    listPrice: 206150,
    deposit: 40600,
    depositExpected: 40600,
    depositDue: "2026-09-15",
    depositDate: "2026-09-15",
    installment: 4060,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 40600, due: "2026-09-15" }],
      count: 30,
      firstDue: "2026-10-15",
      interim: [{ amount: 40600, due: "2029-04-15", label: "Pago contra entrega de llaves (20 %)" }],
    }),
  },
  {
    // Business One: oficina T1-201, 24 cuotas y pago intermedio
    id: "business-5",
    project: "business",
    name: personName(84),
    unit: "T1-201",
    price: 166000,
    listPrice: 171100,
    deposit: 49800,
    depositExpected: 49800,
    depositDue: "2026-11-05",
    depositDate: "2026-11-05",
    installment: 4008,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 49800, due: "2026-11-05" }],
      count: 24,
      firstDue: "2026-12-05",
      interim: [{ amount: 20000, due: "2027-12-05", label: "Pago intermedio (ejemplo)" }],
    }),
  },
  {
    // Lofty City Hub: SUITE 2D, 36 cuotas al día
    id: "lofty-15",
    project: "lofty",
    name: personName(85),
    unit: "1007",
    price: 144000,
    listPrice: 148450,
    deposit: 28800,
    depositExpected: 28800,
    depositDue: "2026-08-25",
    depositDate: "2026-08-25",
    installment: 3200,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 28800, due: "2026-08-25" }],
      count: 36,
      firstDue: "2026-09-25",
      interim: [],
    }),
  },
];

/** Contratos en proceso de firma (bloquean la unidad; sin efecto financiero). */
export const demoDrafts: Customer[] = [
  {
    id: "business-6",
    project: "business",
    name: personName(86),
    unit: "T1-202",
    price: 195000,
    listPrice: 199500,
    deposit: 0,
    depositExpected: 58500,
    depositDue: "2026-11-20",
    installment: 5687,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 58500, due: "2026-11-20" }],
      count: 24,
      firstDue: "2026-12-20",
      interim: [],
    }),
  },
  {
    id: "alion-27",
    project: "alion",
    name: personName(87),
    unit: "603F",
    price: 67500,
    listPrice: 68500,
    deposit: 0,
    depositExpected: 13500,
    depositDue: "2026-11-28",
    installment: 1500,
    paidMonths: 0,
    plan: plan({
      deposits: [{ amount: 13500, due: "2026-11-28" }],
      count: 36,
      firstDue: "2027-01-05",
      interim: [],
    }),
  },
];

export const demoContractMeta: Record<string, Meta> = {
  "alion-25": signed("2026-06-05", "2026-06-10", "12.600"),
  "alion-26": signed("2026-10-16", "2026-10-20", "9.000"),
  "vtower-9": signed("2026-09-10", "2026-09-15", "40.600"),
  "business-5": signed("2026-11-01", "2026-11-05", "49.800"),
  "lofty-15": signed("2026-08-20", "2026-08-25", "28.800"),
  "business-6": {
    status: "Pendiente de firma",
    created: "2026-11-11",
    history: [
      { date: "2026-11-11", status: "Borrador", note: "Borrador de contrato creado" },
      { date: "2026-11-13", status: "Pendiente de firma", note: "Enviado a firma · cita en escribanía el 20 de noviembre" },
    ],
  },
  "alion-27": {
    status: "Borrador",
    created: "2026-11-14",
    history: [{ date: "2026-11-14", status: "Borrador", note: "Borrador de contrato creado · solicitud de 36 cuotas" }],
  },
};

/** Cobros de cuotas (imputados a filas del plan). Los cobros anteriores a noviembre están en la caja de apertura. */
export const demoReceipts = [
  { id: "REC-D01", installmentId: "alion-25-1", amount: 1400, date: "2026-07-10", method: "Transferencia bancaria", reference: "TRF-260710-ALN25" },
  { id: "REC-D02", installmentId: "alion-25-2", amount: 1400, date: "2026-08-10", method: "Transferencia bancaria", reference: "TRF-260810-ALN25" },
  { id: "REC-D03", installmentId: "alion-25-3", amount: 1400, date: "2026-09-10", method: "Tarjeta de crédito", reference: "POS-260910-ALN25" },
  { id: "REC-D04", installmentId: "alion-25-4", amount: 700, date: "2026-10-12", method: "Transferencia bancaria", reference: "TRF-261012-ALN25 · parcial" },
  { id: "REC-D05", installmentId: "lofty-15-1", amount: 3200, date: "2026-09-25", method: "Transferencia bancaria", reference: "TRF-260925-LCH15" },
  { id: "REC-D06", installmentId: "lofty-15-2", amount: 3200, date: "2026-10-24", method: "Transferencia bancaria", reference: "TRF-261024-LCH15" },
  { id: "REC-D07", installmentId: "vtower-9-1", amount: 4060, date: "2026-10-15", method: "Transferencia bancaria", reference: "TRF-261015-VTL9" },
];

/** Canjes por obra: no se usan en la demo de EDIFICA. */
export const demoBarters = [] as {
  id: string; project: string; unitId: string; company: string; work: string; amount: number;
  start: string; end: string; progress: number; transfer: string;
}[];

/** Solicitudes de pago a proveedores (egresos de caja). */
export const demoRequests = [
  {
    id: "CER-025",
    project: "alion",
    company: FIRM.cephe,
    name: "Certificado de obra · mampostería pisos 3–6",
    type: "Certificado de obra",
    amount: 18600,
    due: "2026-11-25",
    status: "Aprobado",
    description: "Avance certificado por la dirección de obra (ejemplo).",
  },
  {
    id: "CER-026",
    project: "lofty",
    company: FIRM.yapi,
    name: "Certificado de obra · estructura piso 11",
    type: "Certificado de obra",
    amount: 39800,
    due: "2026-11-08",
    status: "Aprobado",
    description: "Pagado por transferencia el 8 de noviembre (ejemplo).",
  },
  {
    id: "CER-027",
    project: "business",
    company: FIRM.yapi,
    name: "Instalación eléctrica provisoria de obra",
    type: "Certificado de obra",
    amount: 7400,
    due: "2026-11-28",
    status: "Pendiente de aprobación",
    description: "Tableros y cableado provisorio.",
  },
  {
    id: "OC-020",
    project: "alion",
    company: FIRM.aluminyum,
    name: "Aberturas de aluminio · pisos 3–6",
    type: "Compra",
    amount: 31200,
    due: "2026-11-30",
    status: "Pendiente de aprobación",
  },
  {
    // Gasto de obra pagado directamente: impacta caja e informes
    id: "GTO-001",
    project: "vtower",
    company: "Alquiler de equipos (ejemplo)",
    name: "Alquiler de grúa · período octubre",
    type: "Gasto de obra",
    amount: 4800,
    due: "2026-11-06",
    status: "Pagada",
    description: "Alquiler de equipo",
  },
];

export const demoOffsets = [] as { id: string; barterId: string; requestId: string; amount: number; date: string }[];

export const demoReminders = [
  { id: "AGD-D01", project: "business", title: `Firma en escribanía · ${personName(86)} · Oficina T1-202`, due: "2026-11-20", done: false },
  { id: "AGD-D02", project: "alion", title: `Gestión de cobro · cuotas vencidas · ${personName(81)} · Unidad 601D`, due: "2026-11-18", done: false },
  { id: "AGD-D03", project: "business", title: `Aprobar certificado CER-027 · ${FIRM.yapi}`, due: "2026-11-26", done: false },
  { id: "AGD-D04", project: "vtower", title: "Enviar estados de cuenta de noviembre a los clientes", due: "2026-11-25", done: false },
];

export const demoAudit = [
  { id: "AUD-D01", entity: "alion-26", message: "Contrato firmado; plan de pagos y cuentas por cobrar generados", time: "20 oct", project: "alion" },
  { id: "AUD-D02", entity: "business-6", message: "Contrato enviado a firma", time: "13 nov", project: "business" },
  { id: "AUD-D03", entity: "business-5", message: "Venta de oficina firmada; plan de pagos y cuentas por cobrar generados", time: "5 nov", project: "business" },
  { id: "AUD-D04", entity: "CER-026", message: "Pago registrado; caja y plan de pagos actualizados", time: "8 nov", project: "lofty" },
  { id: "AUD-D05", entity: "alion-25", message: "Cobro parcial registrado (US$ 700)", time: "12 oct", project: "alion" },
];

/** Registro de facturación inicial (números de ejemplo). Los cobros sin registro figuran "Por emitir". */
const issued = (number: string, date: string) => ({
  status: "Emitida" as const,
  number,
  date,
  rate: 7300,
  history: [{ date, status: "Emitida", note: `Factura ${number} registrada · TC ₲ 7.300` }],
});
export const demoBilling = {
  "ANT-alion-25": issued("001-001-0000101", "2026-06-10"),
  "REC-D01": issued("001-001-0000104", "2026-07-10"),
  "REC-D02": issued("001-001-0000109", "2026-08-10"),
  "ANT-lofty-15": issued("001-001-0000110", "2026-08-25"),
  "REC-D03": issued("001-001-0000112", "2026-09-10"),
  "ANT-vtower-9": issued("001-001-0000113", "2026-09-15"),
  "REC-D05": issued("001-001-0000116", "2026-09-25"),
  "REC-D04": issued("001-001-0000118", "2026-10-12"),
  "REC-D07": issued("001-001-0000119", "2026-10-15"),
  "ANT-alion-26": issued("001-001-0000121", "2026-10-20"),
};
