// BŞ Falcon Group'a özel modüllerin veri modeli ve başlangıç senaryosu:
// - Kat karşılığı (arsa sahibi / yüklenici paylaşımı, aşamalar, yükümlülükler, belgeler, değişiklik geçmişi)
// - Proje süreci ve güvence takibi (resmî sitedeki 8 adımlı süreç; güvence yalnızca belge takibidir)
// Bütün kayıtlar TEMSİLİ DEMO VERİSİDİR. Arsa sahipleri, hisseler, tarihler ve belgeler örnektir;
// gerçek sözleşme, poliçe veya hukuki güvence bilgisi değildir.

export const CONTRACTOR = "yuklenici";
export type StepStatus = "Finalizado" | "En curso" | "Pendiente";
export const STEP_STATUSES: StepStatus[] = ["Pendiente", "En curso", "Finalizado"];

export type ShareOwner = {
  id: string;
  /** Örnek hissedar etiketi (gerçek kişi adı kullanılmaz). */
  name: string;
  /** Arsa sahibi payı içindeki hisse yüzdesi. */
  stake: number;
  note?: string;
};
export type Step = { key: string; title: string; status: StepStatus; date?: string; note?: string };
export type Obligation = { id: string; title: string; due: string; done: boolean; party: string };
export type AgreementDoc = { id: string; title: string; status: "Listo" | "En revisión" | "Eksik"; date?: string };
export type LandAgreement = {
  project: string;
  parcel: string;
  /** Sözleşmedeki arsa sahibi payı (% · brüt alan esaslı). */
  landRatio: number;
  owners: ShareOwner[];
  steps: Step[];
  obligations: Obligation[];
  documents: AgreementDoc[];
};
export type ShareHistory = { id: string; date: string; project: string; text: string };
export type LandShareState = {
  agreements: LandAgreement[];
  /** Bağımsız bölüm → arsa sahibi kimliği. Kayıt yoksa bölüm yüklenici payındadır. */
  owners: Record<string, string>;
  history: ShareHistory[];
};

export type ProcessState = Record<string, { steps: Step[]; guarantee: GuaranteeRecord }>;
export type GuaranteeRecord = {
  title: string;
  status: "Documento archivado" | "Documento pendiente" | "Fuera de alcance";
  note: string;
  checked?: string;
};

/** Resmî sitedeki proje süreci adımları (bsfalcongroup.com/proje-sureci). */
export const PROCESS_STEPS: { key: string; title: string; detail: string }[] = [
  { key: "kesif", title: "Tanışma ve Keşif", detail: "Arsa veya yapı yerinde incelenir; imar, parsel ve mevcut durum bilgileri toplanır." },
  { key: "on-degerlendirme", title: "Ön Değerlendirme", detail: "Yapılabilirlik, kapsam ve yaklaşık takvim netleşir." },
  { key: "mimari", title: "Mimari ve Teknik Çözüm", detail: "Vaziyet planı, kat kurgusu ve detaylar hazırlanır; uygulanabilirlik doğrulanır." },
  { key: "sozlesme", title: "Sözleşme ve Güvence", detail: "Kapsam, takvim ve teslim koşulları yazılı hâle gelir; kat karşılığında güvence belirlenir." },
  { key: "ruhsat", title: "Ruhsat ve Hazırlık", detail: "Resmî süreçler yürütülür; saha, malzeme ve ekip planlaması tamamlanır." },
  { key: "uygulama", title: "Uygulama", detail: "Şantiye, uygulama projelerine uygun biçimde iş güvenliği ve kalite kontrolüyle ilerler." },
  { key: "teslim", title: "Kontrol ve Teslim", detail: "Son kontroller yapılır, eksikler giderilir ve bağımsız bölümler teslim edilir." },
  { key: "teslim-sonrasi", title: "Teslim Sonrası", detail: "Teslimden sonraki bildirimler takip edilir." },
];

/** Kat karşılığı anlaşmasına özel aşamalar. */
const AGREEMENT_STEPS = [
  ["on-gorusme", "Ön görüşme ve keşif"],
  ["degerlendirme", "Arsa ve proje değerlendirmesi"],
  ["anlasma", "Kat karşılığı inşaat sözleşmesi (noter)"],
  ["paylasim", "Paylaşım listesi onayı"],
  ["ruhsat", "Mimari proje ve ruhsat"],
  ["insaat", "İnşaat başlangıcı"],
  ["teslim", "Kontrol ve teslim"],
  ["tapu", "Kat irtifakı / tapu devri"],
] as const;
const steps = (done: number, active: number, dates: string[]): Step[] =>
  AGREEMENT_STEPS.map(([key, title], i) => ({
    key,
    title,
    status: i < done ? "Finalizado" : i < done + active ? "En curso" : "Pendiente",
    date: dates[i],
  }));
const processSteps = (done: number, dates: string[]): Step[] =>
  PROCESS_STEPS.map((p, i) => ({
    key: p.key,
    title: p.title,
    status: i < done ? "Finalizado" : i === done ? "En curso" : "Pendiente",
    date: dates[i],
  }));

// EDIFICA: los módulos de canje por terreno y de proceso de obra no se usan en esta demo.
void processSteps;
export const seedLandShare: LandShareState = { agreements: [], owners: {}, history: [] };
export const seedProcess: ProcessState = {};

/** Şantiye gideri kategorileri. */
export const EXPENSE_CATEGORIES = ["Materiales", "Mano de obra", "Alquiler de equipos", "Flete", "Gastos generales de obra"] as const;
