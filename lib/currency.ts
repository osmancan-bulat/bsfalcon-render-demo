// Para birimi modeli (By Güzel): her sözleşme, tahsilat ve gider kendi para biriminde (TRY / EUR / USD) tutulur.
// Ekranlar ve raporlar tek bir para birimi görünümünde çalışır: farklı para birimleri asla doğrudan toplanmaz.
// Karşılaştırma için dönüşüm yalnızca kullanıcının tanımladığı kurla ve "bilgi amaçlı" etiketiyle yapılır.
export type Currency = "TRY" | "EUR" | "USD";
export const CURRENCIES: Currency[] = ["EUR", "USD", "TRY"];
export const CURRENCY_LABEL: Record<Currency, string> = { EUR: "Euro (EUR)", USD: "ABD doları (USD)", TRY: "Türk lirası (TRY)" };
export const SYMBOL: Record<Currency, string> = { EUR: "€", USD: "$", TRY: "₺" };

/** Etkin görünüm. null = filtre yok (yalnızca testler ve iç hesaplar; arayüz her zaman bir para birimi seçer). */
let VIEW: Currency | null = null;
export const setCurrencyView = (c: Currency | null) => {
  VIEW = c;
};
export const currencyView = () => VIEW;
/** Kaydın para birimi; eski kayıtlarda alan yoksa varsayılan. */
export const curOf = (x: { currency?: Currency } | undefined, fallback: Currency = "EUR"): Currency => x?.currency ?? fallback;
/** Kayıt, etkin görünüme dahil mi? */
export const inView = (c: Currency) => VIEW === null || VIEW === c;
/** Formlardaki tutar etiketleri: "Tutar (EUR)". */
export const viewCode = () => VIEW ?? "TRY";

/** Tanımlı kur tablosu (1 birim → TRY). Yalnızca kullanıcı tarafından belirlenir; otomatik kur çekilmez. */
export type FxTable = { EUR: number; USD: number; date: string };
export const DEFAULT_FX: FxTable = { EUR: 37.5, USD: 35.0, date: "2026-11-15" };
export const toTry = (amount: number, c: Currency, fx: FxTable) => (c === "TRY" ? amount : amount * fx[c]);
