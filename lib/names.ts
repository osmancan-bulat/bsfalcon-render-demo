// Kurgusal kimlik kataloğu. Kişi ve firma adlarının tamamı uydurmadır; gerçek SANE
// müşterileri, çalışanları veya yüklenicileriyle ilişkisi yoktur.
// Ad, kayıt numarasından deterministik üretilir: aynı numara her ekranda aynı kişiyi verir.
const FIRST = [
  "Selin", "Mert", "Zeynep", "Burak", "Elif", "Emre", "Derya", "Can", "Deniz",
  "Kerem", "Ece", "Onur", "Merve", "Serkan", "Gizem", "Hakan", "Aslı", "Tolga",
  "Pınar", "Barış", "Nazlı", "Murat", "Esra", "Cem", "İrem",
];
const LAST = [
  "Yılmaz", "Demir", "Arslan", "Kaya", "Çelik", "Şahin", "Aydın", "Öztürk",
  "Koç", "Kurt", "Özdemir", "Polat", "Erdem", "Aksoy", "Tekin", "Korkmaz",
  "Güneş", "Doğan", "Yıldız", "Bulut", "Karaca", "Uysal", "Ateş", "Ekinci",
];

/**
 * n. kurgusal müşterinin adı. 25 ad × 24 soyad, Çin kalan teoremi gereği n < 600 için
 * benzersizdir (ad n mod 25, soyad 7n mod 24 ile belirlenir; 7 ile 24 aralarında asal).
 */
export const personName = (n: number) =>
  `${FIRST[(n + 19) % 25]} ${LAST[(n * 7 + 9) % 24]}`;

/** Kurgusal yüklenici ve tedarikçi firmalar. */
export const FIRM = {
  yapi: "Karataş Yapı Taahhüt",
  teknik: "Atlas Mekanik Elektrik",
  cephe: "Kuzey Cephe Sistemleri",
  demir: "Bozkır Demir Çelik",
  aluminyum: "Lale Alüminyum Doğrama",
} as const;

/** Kurgusal satış danışmanları (müşteri sorumlusu seçimi). */
export const ADVISORS = ["Nazlı Kurt · Satış", "Onur Tekin · Satış"];

/** Önceki demo sürümünün jenerik adları → kurgusal kimlikler. */
const LEGACY_FIRMS: [string, string][] = [
  ["Örnek Yapı", FIRM.yapi],
  ["Örnek Teknik", FIRM.teknik],
  ["Örnek Cephe", FIRM.cephe],
  ["Örnek Demir", FIRM.demir],
  ["Örnek Alüminyum", FIRM.aluminyum],
  ["Demo danışman 1", ADVISORS[0]],
  ["Demo danışman 2", ADVISORS[1]],
];

/**
 * Önceki sürümün metnindeki "Demo Müşteri 081" ve "Örnek Yapı" gibi adları aynı kayıt
 * numarasına karşılık gelen kurgusal kimlikle değiştirir. Kimlikler (ID) değişmez.
 */
export function renameLegacy(text: string): string {
  let out = text.replace(/Demo Müşteri (\d{1,3})/g, (_, n) =>
    personName(Number(n)),
  );
  for (const [from, to] of LEGACY_FIRMS) out = out.split(from).join(to);
  return out;
}
