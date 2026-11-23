"use client";
import { m2 } from "@/lib/units";
// Daireler: kat bazında daire haritası. Daireye tıklamak ilgili dosyayı açar
// (satılmış → müşteri dosyası, imza sürecinde → sözleşme, barter → barter dosyası, müsait → daire kartı).
import Link from "next/link";
import { useMemo, useState } from "react";
import { Handshake, Plus, Pencil } from "lucide-react";
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
} from "@/lib/enterprise";
import { units, unitShort, type Unit } from "@/lib/units";
import { floorLabel } from "@/lib/catalog";
import { money } from "@/lib/data";

export type UnitState =
  "sold" | "late" | "draft" | "barter" | "reserved" | "available";
export const UNIT_STATE_LABEL: Record<UnitState, string> = {
  sold: "Vendida",
  late: "Con cuotas vencidas",
  draft: "Pendiente de firma",
  barter: "Canje",
  reserved: "Reservada",
  available: "Disponible",
};

export function useUnitStates(projectId: string) {
  const { state } = useApp();
  return useMemo(() => {
    const contracts = contractList(state).filter(
      (c) => c.project === projectId && c.status !== "Anulado",
    );
    const late = new Set(
      paymentRows(state)
        .filter((r) => r.project === projectId && r.status === "Vencida")
        .map((r) => r.customerId),
    );
    const reserved = reservedUnits(state, projectId);
    const barters = state.barters.filter((b) => b.project === projectId);
    const stateOf = (u: Unit): UnitState => {
      const c = contracts.find((c) => c.unitId === u.id);
      if (c?.account) return late.has(c.id) ? "late" : "sold";
      if (c) return "draft";
      if (barters.some((b) => b.unitId === u.id)) return "barter";
      if (reserved.includes(u.id)) return "reserved";
      return "available";
    };
    const map = units
      .filter((u) => u.project === projectId)
      .map((u) => ({ unit: u, state: stateOf(u) }));
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
  const ids =
    project === "all"
      ? projects.filter((p) => p.status !== "Archivado").map((p) => p.id)
      : projects.some((p) => p.id === project)
        ? [project]
        : [];
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Unidades y disponibilidad</h1>
          <p>
            Haga clic en una unidad: cliente, contrato, plan de pagos y documentos se abren en una ficha. Para una venta nueva, elija una unidad disponible (blanca).
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
  const [open, setOpen] = useState<{
    type: "customer" | "draft" | "barter" | "unit";
    id: string;
  } | null>(null);
  const [adding, setAdding] = useState(false);
  // Katlar aynı sütun sayısıyla tam genişliğe yayılır (bodrum katlar dahil)
  const perFloorMap = new Map<number, number>();
  for (const m of map) perFloorMap.set(m.unit.floor, (perFloorMap.get(m.unit.floor) ?? 0) + 1);
  const perFloor = Math.max(1, ...perFloorMap.values());
  const floors = [...new Set(map.map((m) => m.unit.floor))].sort(
    (a, b) => b - a,
  );
  const p = projects.find((p) => p.id === projectId)!;
  const sold = (counts.sold ?? 0) + (counts.late ?? 0);
  const blocks = [...new Set(map.map((m) => m.unit.block))];
  const openUnit = (u: Unit, st: UnitState) => {
    if (st === "sold" || st === "late") setOpen({ type: "customer", id: u.id });
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
            {sold} / {p.total} vendidas
            {blocks.length > 0 && `· ${blocks.length} torres (${blocks.join(", ")})`}
            {p.status !== "Activo" && ` · ${p.status}`}
          </p>
        </div>
        {p.status !== "Archivado" && (
          <button className="btn compact" onClick={() => setAdding(true)}>
            <Plus size={14} /> Agregar torre
          </button>
        )}
        <ul className="unit-legend">
          {(
            [
              "available",
              "sold",
              "late",
              "draft",
              "barter",
              "reserved",
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
          <b>Este proyecto aún no tiene unidades.</b>
          <p>
            Comience agregando una torre: indique nombre, cantidad de pisos y unidades por piso;
            las unidades se numeran automáticamente y quedan listas para ventas, contratos y cobros.
          </p>
          {p.status !== "Archivado" && (
            <button className="btn primary" onClick={() => setAdding(true)}>
              <Plus size={15} /> Agregar la primera torre
            </button>
          )}
        </div>
      )}
      <div className="cc-floors">
        {floors.map((f) => (
          <div key={f} className="cc-floor">
            <span className="cc-floor-label">
              {f === 0 ? "Zemin" : f < 0 ? `B${-f}` : `Piso ${f}`}
            </span>
            <div
              className="cc-floor-units"
              style={{
                gridTemplateColumns: `repeat(${perFloor}, minmax(0, 1fr))`,
              }}
            >
              {map
                .filter((m) => m.unit.floor === f)
                .map(({ unit: u, state: st }) => (
                  <button
                    key={u.id}
                    className={`cc-unit u-${st}`}
                    onClick={() => openUnit(u, st)}
                    aria-label={`${u.label} · ${u.type} · ${UNIT_STATE_LABEL[st]}`}
                    title={`${u.label} · ${u.type} · ${m2(u.gross)} m² · ${UNIT_STATE_LABEL[st]}`}
                  >
                    <b>{u.label}</b>
                    <small>{u.type}</small>
                  </button>
                ))}
            </div>
          </div>
        ))}
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
      <Drawer open onClose={() => setEditing(false)} title={`${unitShort(u.id)} · datos de la unidad`} eyebrow={pname(u.project)}>
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
            Solo se editan unidades no vendidas. Un cambio de precio de lista no modifica
            contratos existentes; solo se usa como precio sugerido en ventas nuevas.
          </p>
          <div className="form-row">
            <label>
              Tipología
              <input name="type" required defaultValue={u.type} maxLength={12} />
            </label>
            <label>
              Superficie m²
              <input name="gross" type="number" min={10} max={2000} required defaultValue={m2(u.gross)} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Precio de lista (USD)
              <input name="listPrice" type="number" min={1} step="0.01" required defaultValue={u.listPrice} />
            </label>
            <label>
              Orientación
              <input name="facade" defaultValue={u.facade} maxLength={20} />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button className="btn primary">Guardar</button>
          </div>
        </form>
      </Drawer>
    );
  if (selling && u)
    return (
      <Drawer
        open
        onClose={() => setSelling(false)}
        title={`Unidad ${u.label} · contrato de compraventa`}
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
      title={u ? unitShort(u.id) : "Unidad"}
      eyebrow={
        u ? `${pname(u.project)} · ${st ? UNIT_STATE_LABEL[st] : ""}` : ""
      }
    >
      {u && (
        <>
          <dl className="file-summary cols-3">
            <div>
              <dt>Ubicación</dt>
              <dd>
                {u.block} · {u.floorLabel} · código {u.label}
              </dd>
            </div>
            <div>
              <dt>Tipología</dt>
              <dd>
                {u.type} · {m2(u.gross)} m²
              </dd>
            </div>
            <div>
              <dt>Orientación</dt>
              <dd>
                {u.facade}
                {u.corner ? "· esquina" : ""}
              </dd>
            </div>
            <div className="wide">
              <dt>Precio de lista (ejemplo)</dt>
              <dd className="num big">{money(u.listPrice)}</dd>
            </div>
          </dl>
          {projectStatus === "Activo" ? (
            <div className="form-actions">
              <button className="btn" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Editar
              </button>
              <button className="btn primary" onClick={() => setSelling(true)}>
                <Plus size={15} /> Contrato de compraventa
              </button>
            </div>
          ) : (
            <p className="callout">
              El proyecto está en estado “{projectStatus}”; no admite ventas nuevas. Puede reactivarse
              desde Proyectos inmobiliarios.
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
    facade: "Frente",
  });
  const total = v.floors * v.perFloor;
  const set = (k: keyof typeof v, num = false) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: num ? Number(e.target.value) : e.target.value });
  return (
    <Drawer open onClose={onClose} title="Agregar torre" eyebrow={pname(projectId)}>
      <form
        className="e-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (act({ type: "block-create", project: projectId, ...v })) onClose();
        }}
      >
        <div className="form-row">
          <label>
            Nombre de la torre
            <input value={v.block} onChange={set("block")} required maxLength={3} />
          </label>
          <label>
            Cantidad de pisos
            <input type="number" min={1} max={40} value={v.floors} onChange={set("floors", true)} required />
          </label>
          <label>
            Unidades por piso
            <input type="number" min={1} max={20} value={v.perFloor} onChange={set("perFloor", true)} required />
          </label>
          <label>
            Primer piso
            <input type="number" min={-3} max={40} value={v.startFloor} onChange={set("startFloor", true)} required />
            <small className="muted">0 = zemin, −1 = bodrum</small>
          </label>
        </div>
        <div className="form-row">
          <label>
            Tipología
            <input value={v.unitType} onChange={set("unitType")} required maxLength={12} />
          </label>
          <label>
            Superficie m²
            <input type="number" min={10} max={2000} value={v.gross} onChange={set("gross", true)} required />
          </label>
          <label>
            Precio de lista (USD)
            <input type="number" min={1} step="0.01" value={v.listPrice} onChange={set("listPrice", true)} required />
          </label>
          <label>
            Orientación
            <input value={v.facade} onChange={set("facade")} maxLength={20} />
          </label>
        </div>
        <p className="form-preview">
          Torre {v.block.toLocaleUpperCase("es") || "?"} · {v.floors} pisos × {v.perFloor} unidades ={" "}
          <b>{total} unidades</b> · {floorLabel(v.startFloor)} y{" "}
          {floorLabel(v.startFloor + v.floors - 1)} . Tipología y precio se pueden editar luego por unidad.
          {existingBlocks.length > 0 && ` Mevcut bloklar: ${existingBlocks.join(", ")}.`}
        </p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={total < 1 || total > 400}>
            {total} unidades: agregar
          </button>
        </div>
      </form>
    </Drawer>
  );
}
