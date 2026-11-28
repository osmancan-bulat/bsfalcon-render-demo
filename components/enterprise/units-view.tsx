"use client";
import { currencyView, setCurrencyView } from "@/lib/currency";
import { isDelivered } from "@/lib/aftersales";
// Daireler: kat bazında daire haritası. Daireye tıklamak ilgili dosyayı açar
// (satılmış → müşteri dosyası, imza sürecinde → sözleşme, barter → barter dosyası, müsait → daire kartı).
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useApp } from "./context";
import NewSaleForm from "./sale-form";
import { Drawer } from "./shared";
import CustomerPanel from "./customer-panel";
import DraftPanel from "./draft-panel";
import { BarterDrawer } from "./barter";
import {
  projects,
  contractList,
  reservedUnits,
  paymentRows,
  pname,
  contractCurrency,
} from "@/lib/enterprise";
import { units, unitShort, type Unit } from "@/lib/units";
import { floorLabel } from "@/lib/catalog";
import { moneyIn } from "@/lib/data";

export type UnitState =
  "sold" | "late" | "draft" | "barter" | "reserved" | "available" | "delivered";
export const UNIT_STATE_LABEL: Record<UnitState, string> = {
  sold: "Satıldı",
  late: "Ödemesi geciken",
  draft: "İmza bekliyor",
  barter: "Barter",
  reserved: "Rezerve",
  available: "Müsait",
  delivered: "Teslim edildi",
};

export function useUnitStates(projectId: string) {
  const { state } = useApp();
  return useMemo(() => {
    // Daire durumu fiziksel stoktur: bütün para birimlerindeki sözleşmeler birlikte değerlendirilir
    const prevView = currencyView();
    setCurrencyView(null);
    const contracts = contractList(state).filter(
      (c) => c.project === projectId && c.status !== "İptal",
    );
    const late = new Set(
      paymentRows(state)
        .filter((r) => r.project === projectId && r.status === "Gecikti")
        .map((r) => r.customerId),
    );
    const reserved = reservedUnits(state, projectId);
    const barters = state.barters.filter((b) => b.project === projectId);
    const stateOf = (u: Unit): UnitState => {
      const c = contracts.find((c) => c.unitId === u.id);
      if (c?.account) return late.has(c.id) ? "late" : isDelivered(state.aftersales, u.id) ? "delivered" : "sold";
      if (c) return "draft";
      if (barters.some((b) => b.unitId === u.id)) return "barter";
      if (reserved.includes(u.id)) return "reserved";
      return "available";
    };
    const map = units
      .filter((u) => u.project === projectId)
      .map((u) => ({ unit: u, state: stateOf(u) }));
    setCurrencyView(prevView);
    const counts = map.reduce<Record<string, number>>(
      (a, m) => ((a[m.state] = (a[m.state] ?? 0) + 1), a),
      {},
    );
    return { map, counts, barters };
  }, [state, projectId]);
}

export default function UnitsView() {
  const { project } = useApp();
  // Şirket genelinde arşivdeki projeler listelenmez; arşivdeki proje seçiliyse yalnızca o gösterilir.
  // Guzel Life Premium (5 blok) önce gösterilir
  const ORDER = ["nergis", "cengilli", "agva"];
  const rank = (id: string) => (ORDER.indexOf(id) + 1 || 99);
  const ids =
    project === "all"
      ? projects.filter((p) => p.status !== "Arşiv").map((p) => p.id).sort((a, b) => rank(a) - rank(b))
      : projects.some((p) => p.id === project)
        ? [project]
        : [];
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Daireler</h1>
          <p>
            Blok ve kat planı. Daireye tıklayın: müşteri, sözleşme, ödeme planı, tahsilatlar ve
            bakiye tek dosyada açılır (sözleşmenin kendi para biriminde). Yeni satış için müsait
            (beyaz) bir daire seçin. Liste fiyatları EUR ve temsilidir.
          </p>
        </div>
      </header>
      {ids.map((id) => (
        <ProjectUnits key={id} projectId={id} />
      ))}
    </>
  );
}

function ProjectUnits({ projectId }: { projectId: string }) {
  const { map, counts, barters } = useUnitStates(projectId);
  const { state, currency, setCurrency } = useApp();
  const [block, setBlock] = useState<string>("all");
  const [open, setOpen] = useState<{
    type: "customer" | "draft" | "barter" | "unit";
    id: string;
  } | null>(null);
  const [adding, setAdding] = useState(false);
  const p = projects.find((p) => p.id === projectId)!;
  const sold = (counts.sold ?? 0) + (counts.late ?? 0) + (counts.delivered ?? 0);
  const blocks = [...new Set(map.map((m) => m.unit.block))];
  const openUnit = (u: Unit, st: UnitState) => {
    // Sözleşme kendi para biriminde açılır: görünüm sözleşmenin para birimine geçer (dönüştürme yapılmaz).
    if (st === "sold" || st === "late" || st === "delivered" || st === "draft") {
      const c = contractCurrency(state, u.id);
      if (c !== currency) setCurrency(c);
    }
    if (st === "sold" || st === "late" || st === "delivered") setOpen({ type: "customer", id: u.id });
    else if (st === "draft") setOpen({ type: "draft", id: u.id });
    else if (st === "barter")
      setOpen({
        type: "barter",
        id: barters.find((b) => b.unitId === u.id)!.id,
      });
    else setOpen({ type: "unit", id: u.id });
  };
  return (
    <section className="panel units-panel">
      <div className="panel-heading">
        <div>
          <h2>{p.name}</h2>
          <p>
            {sold} / {p.total} satıldı
            {blocks.length > 0 && ` · ${blocks.length} blok (${blocks.join(", ")})`}
            {p.status !== "Aktif" && ` · ${p.status}`}
          </p>
        </div>
        {p.status !== "Arşiv" && (
          <button className="btn compact" onClick={() => setAdding(true)}>
            <Plus size={14} /> Blok ekle
          </button>
        )}
        <ul className="unit-legend">
          {(
            [
              "available",
              "reserved",
              "draft",
              "sold",
              "late",
              "delivered",
            ] as UnitState[]
          ).map((k) => (
            <li key={k}>
              <i className={`u-${k}`} /> {UNIT_STATE_LABEL[k]}{" "}
              <b className="num">{counts[k] ?? 0}</b>
            </li>
          ))}
        </ul>
      </div>
      {map.length === 0 && (
        <div className="units-empty">
          <b>Bu projede henüz daire yok.</b>
          <p>
            Blok ekleyerek başlayın: blok adı, kat sayısı ve kattaki daire sayısını girin;
            daireler otomatik numaralanır. Satış, sözleşme ve tahsilat bu dairelerle çalışır.
          </p>
          {p.status !== "Arşiv" && (
            <button className="btn primary" onClick={() => setAdding(true)}>
              <Plus size={15} /> İlk bloğu ekle
            </button>
          )}
        </div>
      )}
      {blocks.length > 1 && (
        <div className="bg-blocks-switch" role="group" aria-label="Blok seçimi">
          <button className={block === "all" ? "active" : ""} onClick={() => setBlock("all")}>Tüm bloklar</button>
          {blocks.map((b) => {
            const bl = map.filter((m) => m.unit.block === b);
            const free = bl.filter((m) => m.state === "available").length;
            return (
              <button key={b} className={block === b ? "active" : ""} onClick={() => setBlock(b)}>
                {b} blok <small>{free} müsait / {bl.length}</small>
              </button>
            );
          })}
        </div>
      )}
      <div className={`bg-blocks ${blocks.length > 1 && block === "all" ? "multi" : "single"}`}>
        {(blocks.length > 1 ? (block === "all" ? blocks : [block]) : [blocks[0] ?? ""]).map((b) => {
          const inBlock = map.filter((m) => blocks.length <= 1 || m.unit.block === b);
          const bFloors = [...new Set(inBlock.map((m) => m.unit.floor))].sort((x, y) => y - x);
          const cols = Math.max(1, ...bFloors.map((f) => inBlock.filter((m) => m.unit.floor === f).length));
          return (
            <div key={b || "tek"} className="bg-block">
              {blocks.length > 1 && (
                <header>
                  <b>{b} Blok</b>
                  <small>
                    {inBlock.length} daire · {inBlock.filter((m) => m.state === "available").length} müsait ·{" "}
                    {inBlock.filter((m) => ["sold", "late", "delivered"].includes(m.state)).length} satıldı
                  </small>
                </header>
              )}
              <div className="cc-floors">
                {bFloors.map((f) => {
                  const row = inBlock.filter((m) => m.unit.floor === f);
                  return (
                    <div key={f} className="cc-floor">
                      <span className="cc-floor-label">{row[0]?.unit.floorLabel ?? (f === 0 ? "Zemin" : f < 0 ? `B${-f}` : `${f}. kat`)}</span>
                      <div className="cc-floor-units" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                        {row.map(({ unit: u, state: st }) => (
                          <button
                            key={u.id}
                            className={`cc-unit u-${st}`}
                            style={cols > row.length && row.length === 1 ? { gridColumn: `span ${cols}` } : row.length * 2 === cols ? { gridColumn: "span 2" } : undefined}
                            onClick={() => openUnit(u, st)}
                            aria-label={`${u.label} · ${u.type} · ${u.gross} m² · ${UNIT_STATE_LABEL[st]}`}
                            title={`${u.label} · ${u.type} · ${u.gross} m² · ${UNIT_STATE_LABEL[st]}`}
                          >
                            <b>{u.label}</b>
                            <small>{u.type}</small>
                            <small className="m2">{u.gross} m²</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {open?.type === "customer" && (
        <CustomerPanel
          key={open.id}
          id={open.id}
          onClose={() => setOpen(null)}
        />
      )}
      {open?.type === "draft" && (
        <DraftPanel
          key={open.id}
          id={open.id}
          onClose={() => setOpen(null)}
          onSigned={(id) => setOpen({ type: "customer", id })}
        />
      )}
      <BarterDrawer
        id={open?.type === "barter" ? open.id : null}
        onClose={() => setOpen(null)}
      />
      <UnitDrawer
        unit={
          open?.type === "unit"
            ? (units.find((u) => u.id === open.id) ?? null)
            : null
        }
        state={
          open?.type === "unit"
            ? map.find((m) => m.unit.id === open.id)?.state
            : undefined
        }
        onClose={() => setOpen(null)}
        onSold={(id, draft) =>
          setOpen({ type: draft ? "draft" : "customer", id })
        }
      />
      {adding && (
        <BlockDrawer
          projectId={projectId}
          existingBlocks={blocks}
          onClose={() => setAdding(false)}
        />
      )}
    </section>
  );
}

/** Müsait veya rezerve daire: bilgiler ve satış / barter başlatma. */
export function UnitDrawer({
  unit: u,
  state: st,
  onClose,
  onSold,
}: {
  unit: Unit | null;
  state?: UnitState;
  onClose: () => void;
  /** Satış kaydedildiğinde: aktif sözleşme → müşteri dosyası, taslak → imza ekranı */
  onSold?: (unitId: string, draft: boolean) => void;
}) {
  const [selling, setSelling] = useState(false);
  const [editing, setEditing] = useState(false);
  const { act } = useApp();
  const projectStatus = u ? projects.find((p) => p.id === u.project)?.status : undefined;
  if (editing && u)
    return (
      <Drawer open onClose={() => setEditing(false)} title={`${unitShort(u.id)} · daire bilgileri`} eyebrow={pname(u.project)}>
        <form
          className="e-form"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            if (
              act({
                type: "unit-update",
                id: u.id,
                patch: {
                  type: String(d.get("type")),
                  gross: Number(d.get("gross")),
                  listPrice: Number(d.get("listPrice")),
                  facade: String(d.get("facade")),
                },
              })
            )
              setEditing(false);
          }}
        >
          <p className="drawer-intro">
            Yalnızca satılmamış daire düzenlenebilir. Liste fiyatı değişikliği mevcut sözleşme
            bedellerini değiştirmez; yalnızca yeni satışlarda öneri fiyatı olur.
          </p>
          <div className="form-row">
            <label>
              Tip
              <input name="type" required defaultValue={u.type} maxLength={12} />
            </label>
            <label>
              Brüt m²
              <input name="gross" type="number" min={10} max={2000} required defaultValue={u.gross} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Liste fiyatı (EUR)
              <input name="listPrice" type="number" min={1} step="0.01" required defaultValue={u.listPrice} />
            </label>
            <label>
              Cephe
              <input name="facade" defaultValue={u.facade} maxLength={20} />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Vazgeç
            </button>
            <button className="btn primary">Kaydet</button>
          </div>
        </form>
      </Drawer>
    );
  if (selling && u)
    return (
      <Drawer
        open
        onClose={() => setSelling(false)}
        title={`Daire ${u.label} · satış sözleşmesi`}
        eyebrow={pname(u.project)}
        wide
      >
        <NewSaleForm
          unitId={u.id}
          onDone={(_, draft) => {
            setSelling(false);
            onSold?.(u.id, draft);
          }}
        />
      </Drawer>
    );
  return (
    <Drawer
      open={!!u}
      onClose={onClose}
      title={u ? unitShort(u.id) : "Daire"}
      eyebrow={
        u ? `${pname(u.project)} · ${st ? UNIT_STATE_LABEL[st] : ""}` : ""
      }
    >
      {u && (
        <>
          <dl className="file-summary cols-3">
            <div>
              <dt>Konum</dt>
              <dd>
                {u.block.length <= 2 ? `${u.block} blok` : u.block} · {u.floorLabel} · kod {u.label}
              </dd>
            </div>
            <div>
              <dt>Tip</dt>
              <dd>
                {u.type} · {u.gross}/{u.net} m²
              </dd>
            </div>
            <div>
              <dt>Cephe</dt>
              <dd>
                {u.facade}
                {u.corner ? " · köşe" : ""}
              </dd>
            </div>
            <div className="wide">
              <dt>Liste fiyatı (temsili)</dt>
              <dd className="num big">{moneyIn(u.listPrice, "EUR")}</dd>
            </div>
          </dl>
          {projectStatus === "Aktif" ? (
            <div className="form-actions">
              <button className="btn" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Düzenle
              </button>
              <button className="btn primary" onClick={() => setSelling(true)}>
                <Plus size={15} /> Satış sözleşmesi
              </button>
            </div>
          ) : (
            <p className="callout">
              Proje “{projectStatus}” durumunda; yeni satış yapılamaz. Proje portföyünden yeniden
              aktifleştirilebilir.
            </p>
          )}
        </>
      )}
    </Drawer>
  );
}

/** Projeye yeni blok: kat ve kattaki daire sayısından daireler üretilir (numaralar kaldığı yerden devam eder). */
function BlockDrawer({
  projectId,
  existingBlocks,
  onClose,
}: {
  projectId: string;
  existingBlocks: string[];
  onClose: () => void;
}) {
  const { act } = useApp();
  const [v, setV] = useState({
    block: String.fromCharCode(65 + existingBlocks.length).slice(0, 1),
    floors: 5,
    perFloor: 4,
    startFloor: 0,
    unitType: "2+1",
    gross: 115,
    listPrice: 3500000,
    facade: "Güney",
  });
  const total = v.floors * v.perFloor;
  const set = (k: keyof typeof v, num = false) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: num ? Number(e.target.value) : e.target.value });
  return (
    <Drawer open onClose={onClose} title="Blok ekle" eyebrow={pname(projectId)}>
      <form
        className="e-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (act({ type: "block-create", project: projectId, ...v })) onClose();
        }}
      >
        <div className="form-row">
          <label>
            Blok adı
            <input value={v.block} onChange={set("block")} required maxLength={3} />
          </label>
          <label>
            Kat sayısı
            <input type="number" min={1} max={40} value={v.floors} onChange={set("floors", true)} required />
          </label>
          <label>
            Kattaki daire
            <input type="number" min={1} max={20} value={v.perFloor} onChange={set("perFloor", true)} required />
          </label>
          <label>
            İlk kat
            <input type="number" min={-3} max={40} value={v.startFloor} onChange={set("startFloor", true)} required />
            <small className="muted">0 = zemin, −1 = bodrum</small>
          </label>
        </div>
        <div className="form-row">
          <label>
            Daire tipi
            <input value={v.unitType} onChange={set("unitType")} required maxLength={12} />
          </label>
          <label>
            Brüt m²
            <input type="number" min={10} max={2000} value={v.gross} onChange={set("gross", true)} required />
          </label>
          <label>
            Liste fiyatı (EUR)
            <input type="number" min={1} step="0.01" value={v.listPrice} onChange={set("listPrice", true)} required />
          </label>
          <label>
            Cephe
            <input value={v.facade} onChange={set("facade")} maxLength={20} />
          </label>
        </div>
        <p className="form-preview">
          {v.block.toLocaleUpperCase("tr") || "?"} blok · {v.floors} kat × {v.perFloor} daire ={" "}
          <b>{total} daire</b> · {floorLabel(v.startFloor)} ile{" "}
          {floorLabel(v.startFloor + v.floors - 1)} arası. Tip ve fiyat daire bazında sonradan
          düzenlenebilir.
          {existingBlocks.length > 0 && ` Mevcut bloklar: ${existingBlocks.join(", ")}.`}
        </p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn primary" disabled={total < 1 || total > 400}>
            {total} daireyi ekle
          </button>
        </div>
      </form>
    </Drawer>
  );
}
