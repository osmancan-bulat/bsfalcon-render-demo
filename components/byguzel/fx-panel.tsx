"use client";
// Bilgi amaçlı kur tablosu: TL karşılıkları yalnızca burada kullanıcının tanımladığı kurla hesaplanır.
// Otomatik kur çekilmez; sözleşme, plan ve tahsilat tutarları asla dönüştürülmez.
import { useState } from "react";
import { useApp } from "../enterprise/context";
import { Panel } from "../enterprise/shared";
import { DEFAULT_FX } from "@/lib/currency";
import { date } from "@/lib/data";

export default function FxPanel() {
  const { state, act } = useApp();
  const fx = state.fx ?? DEFAULT_FX;
  const [eur, setEur] = useState(String(fx.EUR));
  const [usd, setUsd] = useState(String(fx.USD));
  const [d, setD] = useState(fx.date);
  const n = (v: string) => Number(v.replace(",", "."));
  return (
    <Panel title="Para birimleri ve kur tablosu" subtitle="Sözleşmeler kendi para biriminde tutulur; kur yalnızca bilgi amaçlı TL karşılığı için kullanılır">
      <form
        className="bg-fx"
        onSubmit={(e) => {
          e.preventDefault();
          act({ type: "fx-set", EUR: n(eur), USD: n(usd), date: d });
        }}
      >
        <label>1 EUR = … TL<input inputMode="decimal" value={eur} onChange={(e) => setEur(e.target.value)} required /></label>
        <label>1 USD = … TL<input inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} required /></label>
        <label>Kur tarihi<input type="date" value={d} onChange={(e) => setD(e.target.value)} required /></label>
        <button className="btn primary" type="submit">Kuru kaydet</button>
      </form>
      <p className="fc-note">
        Geçerli tablo: {date(fx.date)} · 1 EUR = {fx.EUR} TL · 1 USD = {fx.USD} TL. Varsayılan değerler örnektir, resmî kur değildir.
        Kur değişikliği hiçbir sözleşme, taksit veya tahsilat tutarını değiştirmez; yalnızca ekrandaki "≈ TL" bilgi satırlarını ve
        yeni satış formundaki öneri fiyatını etkiler.
      </p>
    </Panel>
  );
}
