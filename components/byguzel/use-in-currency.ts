import { currencyView, setCurrencyView, type Currency } from "@/lib/currency";
/** Hesabı belirli bir para birimi görünümünde çalıştırır ve önceki görünümü geri yükler. */
export function inCurrency<T>(c: Currency | null, fn: () => T): T {
  const prev = currencyView();
  setCurrencyView(c);
  try {
    return fn();
  } finally {
    setCurrencyView(prev);
  }
}
