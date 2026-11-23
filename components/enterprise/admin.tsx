"use client";
// Configuración: empresa y proyectos, tipo de cambio de referencia, datos de este navegador y alcance de la demo.
// La gestión de usuarios y roles no existe en esta versión y no se simula.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, RotateCcw, ShieldAlert } from "lucide-react";
import { useApp } from "./context";
import Backups from "./backups";
import { hubHref, visibleProjects } from "@/lib/catalog";
import { Panel } from "./shared";
import { projects, customerList, SNAPSHOT } from "@/lib/enterprise";
import { salesReport } from "@/lib/reports";
import { date, usd, gs } from "@/lib/data";
import { fxOf } from "@/lib/billing";



export default function AdminView({ onReset }: { onReset: () => void }) {
  const { state, setProject, act, currency, setCurrency } = useApp();
  const fx = fxOf(state);
  const [rate, setRate] = useState(String(fx.rate));
  const [fxDate, setFxDate] = useState(fx.date);
  const router = useRouter();
  const [storage, setStorage] = useState<{ size: number; backup: boolean } | null>(null);
  useEffect(() => {
    try {
      setStorage({
        size: (localStorage.getItem("edifica-enterprise-v1") ?? "").length,
        backup: !!localStorage.getItem("edifica-enterprise-v1-yedek-v1"),
      });
    } catch {
      setStorage(null);
    }
  }, [state]);
  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edifica-demo-registros-${SNAPSHOT}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const counts: [string, number][] = [
    ["Contrato de compraventa", customerList(state).length],
    ["Contrato en proceso de firma", state.drafts.length],
    ["Recibo de cobro", state.receipts.length],
    ["Anticipo cobrado después de la firma", state.depositPayments.length],
    ["Facturas registradas", Object.values(state.billing ?? {}).filter((b) => b.status === "Emitida").length],
    ["Recordatorio", state.reminders.length],
    ["Registro del historial", state.audit.length],
  ];
  return (
    <div className="admin">
      <header className="page-head">
        <div>
          <h1>Configuración</h1>
          <p>Empresa y proyectos, tipo de cambio, registros de este navegador y alcance de la demo.</p>
        </div>
      </header>

      <Panel
        title="Moneda y tipo de cambio"
        subtitle="Los montos se registran en USD. La vista en guaraníes usa únicamente este tipo de cambio de referencia, definido por el usuario; no hay conversión automática ni cotización en línea."
      >
        <form
          className="ed-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            act({ type: "fx-set", rate: Number(rate.replace(/[.\s]/g, "").replace(",", ".")), date: fxDate });
          }}
        >
          <label>
            ₲ por 1 USD
            <input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} required aria-label="Guaraníes por dólar" />
          </label>
          <label>
            Vigente desde
            <input type="date" value={fxDate} onChange={(e) => setFxDate(e.target.value)} required />
          </label>
          <button className="btn primary" type="submit">Guardar tipo de cambio</button>
          <p>
            Actual: {usd(1)} = {gs(1)} · {date(fx.date)}. Las facturas registradas conservan el tipo de cambio del día en que se emitieron.
          </p>
        </form>
        <div className="ed-filter" role="group" aria-label="Moneda de visualización" style={{ marginTop: 14 }}>
          <button className={currency === "USD" ? "on" : ""} onClick={() => setCurrency("USD")}>Ver en US$</button>
          <button className={currency === "PYG" ? "on" : ""} onClick={() => setCurrency("PYG")}>Ver en guaraníes (₲)</button>
        </div>
      </Panel>

      <Panel title="Empresa y proyectos" subtitle="EDIFICA es la empresa; los proyectos dependen de ella. Nombres, ubicaciones y datos publicados son reales; ventas y finanzas son datos de demostración.">
        <div className="e-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Konum</th>
                <th className="numeric">Unidades</th>
                <th className="numeric">Vendidas</th>
                <th>Entrega</th>
                <th aria-label="Acción" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const s = salesReport(state, { project: p.id }).total;
                return (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name}</b>
                      <small>{p.mix}</small>
                    </td>
                    <td>{p.location}</td>
                    <td className="numeric num">{s.total}</td>
                    <td className="numeric num">{s.sold}</td>
                    <td>{p.delivery || "No publicada"}</td>
                    <td className="row-actions">
                      <button
                        className="btn compact"
                        onClick={() => {
                          setProject(p.id);
                          router.push(hubHref(p.id));
                        }}
                      >
                        Ir al proyecto <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Backups />
      <div className="admin-grid">
        <Panel title="Datos y almacenamiento" subtitle="Los registros se guardan solo en este navegador.">
          <dl className="admin-list">
            {counts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className="num">{v}</dd>
              </div>
            ))}
            <div>
              <dt>Esquema de precios de las ventas de ejemplo</dt>
              <dd>{state.basePricing === "v3.1" ? "Precios conservados de la versión anterior" : "Inicio limpio (catálogo)"}</dd>
            </div>
            <div>
              <dt>Respaldo de versión anterior</dt>
              <dd>{storage ? (storage.backup ? "Sí (en este navegador)" : "No") : "—"}</dd>
            </div>
            <div>
              <dt>Tamaño de los registros</dt>
              <dd className="num">{storage ? `${Math.max(1, Math.round(storage.size / 1024))} KB` : "—"}</dd>
            </div>
            <div>
              <dt>Fecha de corte</dt>
              <dd>{date(SNAPSHOT)} (sabit)</dd>
            </div>
          </dl>
          <div className="form-actions">
            <button className="btn" onClick={exportJson}>
              <Download size={15} /> Descargar registros en JSON
            </button>
            <button className="btn" onClick={onReset}>
              <RotateCcw size={15} /> Restablecer demo
            </button>
          </div>
        </Panel>

        <Panel title="Usuarios y permisos">
          <div className="admin-honest">
            <ShieldAlert size={20} />
            <div>
              <b>Esta versión de demostración no tiene cuentas de usuario, roles ni permisos.</b>
              <p>
                La entrada no requiere contraseña y cada navegador ve sus propios registros de demostración. Para uso real se implementarían autenticación corporativa, permisos por rol (gerencia, cobranza, administración), base de datos central y auditoría en una etapa aparte.
              </p>
            </div>
          </div>
          <ul className="confirm-list">
            <li>Los nombres de personas y empresas son ficticios; no son clientes, empleados ni proveedores reales.</li>
            <li>Los precios de lista y la muestra de unidades de Lofty y V Tower son de ejemplo; la estructura de ALION y Business One proviene de fuentes públicas.</li>
            <li>No hay integración con SMS, correo, bancos, contabilidad, CRM ni facturación electrónica (SIFEN).</li>
            <li>Los documentos se generan desde los registros y no tienen validez legal ni fiscal.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
