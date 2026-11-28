"use client";
// Üst çubuktaki para birimi görünümü: tutarlar yalnızca seçili para birimindeki sözleşmelerden hesaplanır.
import { useApp } from "../enterprise/context";
import { CURRENCIES, CURRENCY_LABEL, SYMBOL } from "@/lib/currency";

export default function CurrencySwitch() {
  const { currency, setCurrency } = useApp();
  return (
    <div className="bg-cur" role="group" aria-label="Para birimi görünümü" title="Farklı para birimleri toplanmaz: yalnızca seçili para birimindeki kayıtlar gösterilir">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          className={c === currency ? "active" : ""}
          aria-pressed={c === currency}
          aria-label={CURRENCY_LABEL[c]}
          onClick={() => setCurrency(c)}
        >
          <span aria-hidden>{SYMBOL[c]}</span> {c}
        </button>
      ))}
    </div>
  );
}
