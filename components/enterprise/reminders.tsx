"use client";
import { ADVISORS } from "@/lib/names";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, Clock, Plus } from "lucide-react";
import { useApp } from "./context";
import { unitShort } from "@/lib/units";
import {
  SectionTitle,
  Kpi,
  Panel,
  SearchBox,
  Drawer,
  Empty,
  Badge,
} from "./shared";
import {
  depositSchedule,
  customerList,
  installmentList,
  outstanding,
  requestList,
  requestStatus,
  projects,
  pname,
  SNAPSHOT,
} from "@/lib/enterprise";
import { money, date } from "@/lib/data";
import { readArchive, type ArchiveFile } from "@/lib/archive";
/** Hatırlatma sorumlusu: kurgusal kişi ve ekip etiketleri (kullanıcı hesabı değildir). */
const OWNERS = ["Gerencia general", ...ADVISORS, "Finanzas y cobranza", "Obra y certificados"];
type Entry = {
  id: string;
  project: string;
  title: string;
  kind: string;
  due: string;
  amount?: number;
  href?: string;
  custom?: boolean;
  done?: boolean;
  customerId?: string;
};
export default function RemindersView() {
  const { state, project, act } = useApp();
  const [q, setQ] = useState(""),
    [kind, setKind] = useState("all"),
    [period, setPeriod] = useState("upcoming"),
    [page, setPage] = useState(0),
    [create, setCreate] = useState(false),
    [files, setFiles] = useState<ArchiveFile[]>([]),
    [deposit, setDeposit] = useState<Entry | null>(null),
    [archiveError, setArchiveError] = useState("");
  useEffect(() => {
    readArchive()
      .then(setFiles)
      .catch(() =>
        setArchiveError(
          "No se pudo leer el archivo local; no se muestran vencimientos de documentos.",
        ),
      );
  }, []);
  const cs = customerList(state);
  const entries: Entry[] = [
    ...installmentList(state)
      .filter((i) => outstanding(state, i) > 0)
      .map((i) => ({
        id: i.id,
        project: i.project,
        title: `${cs.find((c) => c.id === i.customerId)?.name} · ${unitShort(i.customerId)}`,
        kind: "Cuota",
        due: i.due,
        amount: outstanding(state, i),
        href: `/cobros?q=${encodeURIComponent(cs.find((c) => c.id === i.customerId)?.name ?? "")}`,
      })),
    ...state.contracts
      .filter((c) => (c.depositExpected ?? c.deposit) > c.deposit)
      .map((c) => {
        const next = depositSchedule(c).find((p) => p.remaining > 0);
        return {
          id: `deposit-${c.id}`,
          customerId: c.id,
          project: c.project,
          title: c.name,
          kind: "Anticipo",
          due: next?.due ?? c.depositDue ?? SNAPSHOT,
          amount: (c.depositExpected ?? c.deposit) - c.deposit,
        };
      }),
    ...requestList(state)
      .filter(
        (r) => !["Pagada", "Devuelto"].includes(requestStatus(state, r)),
      )
      .map((r) => ({
        id: r.id,
        project: r.project,
        title: `${r.company} · ${r.name}`,
        kind: r.type,
        due: r.due,
        amount: r.amount,
        href: "/caja",
      })),
    ...state.barters
      .filter((b) => b.progress < 100)
      .map((b) => ({
        id: b.id,
        project: b.project,
        title: `${b.company} · ${b.work}`,
        kind: "Fin de canje",
        due: b.end,
        href: "/unidades",
      })),
    ...files
      .filter((f) => f.expiry)
      .map((f) => ({
        id: f.id,
        project: f.project,
        title: f.name,
        kind: "Vencimiento de contrato",
        due: f.expiry,
        href: `/documentos?record=${encodeURIComponent(f.record)}&project=${f.project}`,
      })),
    ...state.reminders.map((r) => ({
      ...r,
      kind: "Recordatorio",
      custom: true,
    })),
  ].filter((r) => project === "all" || r.project === project);
  const cutoff = "2026-11-30",
    open = entries.filter((r) => !r.done),
    rows = entries
      .filter(
        (r) =>
          r.title.toLocaleLowerCase("es").includes(q.toLocaleLowerCase("es")) &&
          (kind === "all" || r.kind === kind) &&
          (period === "all" || period === "late"
            ? !r.done && (period === "all" || r.due < SNAPSHOT)
            : period === "done"
              ? r.done
              : !r.done && r.due <= cutoff),
      )
      .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <>
      <SectionTitle
        title="Recordatorios"
        description="Seguimiento unificado de cuotas, anticipos, pagos y vencimientos de contratos."
        actions={
          <button className="btn primary" onClick={() => setCreate(true)}>
            <Plus size={16} />
            Recordatorio
          </button>
        }
      />
      <p className="callout">
        Seguimiento dentro de la aplicación · Fecha de la demo: 15 de noviembre de 2026. No hay envío por SMS, correo ni WhatsApp. Los recordatorios se calculan al abrir la aplicación.
      </p>
      {archiveError && <p role="alert">{archiveError}</p>}
      <div className="e-kpis three">
        <Kpi
          label="Vencidos"
          value={String(open.filter((r) => r.due < SNAPSHOT).length)}
          sub="Sin pagar / sin completar"
          icon={<BellRing size={20} />}
        />
        <Kpi
          label="Hasta fin de mes"
          value={String(
            open.filter((r) => r.due >= SNAPSHOT && r.due <= cutoff).length,
          )}
          sub="Próximos vencimientos"
          icon={<Clock size={20} />}
        />
        <Kpi
          label="Anticipo pendiente"
          value={money(
            open
              .filter((r) => r.kind === "Anticipo")
              .reduce((a, r) => a + (r.amount ?? 0), 0),
          )}
          sub="Admite cobro parcial de anticipos"
          icon={<BellRing size={20} />}
        />
      </div>
      <Panel
        title="Takip listesi"
        subtitle="Se actualiza automáticamente con los registros"
      >
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            placeholder="Buscar cliente, empresa o recordatorio…"
          />
          <select
            aria-label="Tipo de recordatorio"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Todos los tipos</option>
            {[
              "Cuota",
              "Anticipo",
              "Certificado de obra",
              "Compra",
              "Fin de canje",
              "Vencimiento de contrato",
              "Recordatorio",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select
            aria-label="Período"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setPage(0);
            }}
          >
            <option value="upcoming">Este mes y vencidos</option>
            <option value="late">Gecikenler</option>
            <option value="all">Todos los pendientes</option>
            <option value="done">Recordatorios completados</option>
          </select>
        </div>
        {rows.length ? (
          <div className="e-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asunto / proyecto</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th className="numeric">Monto</th>
                  <th>Estado / acción</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice(
                    Math.min(
                      page,
                      Math.max(0, Math.ceil(rows.length / 15) - 1),
                    ) * 15,
                    Math.min(
                      page,
                      Math.max(0, Math.ceil(rows.length / 15) - 1),
                    ) *
                      15 +
                      15,
                  )
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.title}</b>
                        <small>
                          {pname(r.project)}
                          {"owner" in r && r.owner ? `· Responsable: ${r.owner}` : ""}
                        </small>
                      </td>
                      <td>{r.kind}</td>
                      <td>{date(r.due)}</td>
                      <td className="numeric">
                        {r.amount === undefined ? "—" : money(r.amount)}
                      </td>
                      <td>
                        <Badge
                          tone={
                            r.done
                              ? "green"
                              : r.due < SNAPSHOT
                                ? "red"
                                : "amber"
                          }
                        >
                          {r.done
                            ? "Finalizado"
                            : r.due < SNAPSHOT
                              ? "Vencida"
                              : "Próxima"}
                        </Badge>
                        {r.custom ? (
                          <button
                            className="btn compact"
                            onClick={() =>
                              act({ type: "reminder-done", id: r.id })
                            }
                          >
                            {r.done ? "Reabrir" : "Tamamla"}
                          </button>
                        ) : r.customerId ? (
                          <button
                            className="btn compact"
                            onClick={() => setDeposit(r)}
                          >
                            Cobrar anticipo
                          </button>
                        ) : (
                          <Link
                            className="btn compact"
                            href={r.href ?? "/documentos"}
                          >
                            Abrir registro
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {rows.length > 15 && (
              <div className="e-pagination">
                <span>
                  {Math.min(page, Math.ceil(rows.length / 15) - 1) * 15 + 1}–
                  {Math.min(
                    rows.length,
                    (Math.min(page, Math.ceil(rows.length / 15) - 1) + 1) * 15,
                  )}{" "}
                  / {rows.length} registros
                </span>
                <div>
                  <button
                    aria-label="Página anterior"
                    disabled={page === 0}
                    onClick={() => setPage(Math.max(0, page - 1))}
                  >
                    ‹
                  </button>
                  <button
                    aria-label="Página siguiente"
                    disabled={(page + 1) * 15 >= rows.length}
                    onClick={() => setPage(page + 1)}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Empty title="No hay recordatorios con este filtro" />
        )}
      </Panel>
      <Drawer
        open={create}
        title="Nuevo recordatorio"
        onClose={() => setCreate(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              act({
                type: "reminder",
                record: {
                  id: crypto.randomUUID(),
                  title: String(f.get("title")),
                  due: String(f.get("due")),
                  project: String(f.get("project")),
                  owner: String(f.get("owner") || "") || undefined,
                  done: false,
                },
              })
            )
              setCreate(false);
          }}
        >
          <div className="form-grid">
            <label className="full">
              Asunto
              <input name="title" required maxLength={200} />
            </label>
            <label>
              Proyecto
              <select name="project" defaultValue={project}>
                {[
                  <option key="all" value="all">
                    Todos los proyectos
                  </option>,
                  ...projects.filter((p) => p.status !== "Archivado").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  )),
                ]}
              </select>
            </label>
            <label>
              Fecha
              <input type="date" name="due" required defaultValue={SNAPSHOT} />
            </label>
            <label className="full">
              Responsable
              <select name="owner" defaultValue="">
                <option value="">Belirtilmedi</option>
                {OWNERS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <small className="muted">
                Demo: el responsable se guarda solo como etiqueta; no se envían notificaciones y no hay
                cuentas de usuario.
              </small>
            </label>
          </div>
          <button className="btn primary">Guardar recordatorio</button>
        </form>
      </Drawer>
      <Drawer
        open={!!deposit}
        title="Cobro de anticipo"
        onClose={() => setDeposit(null)}
      >
        {deposit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                act({
                  type: "deposit-receipt",
                  id: deposit.customerId!,
                  amount: Number(new FormData(e.currentTarget).get("amount")),
                })
              )
                setDeposit(null);
            }}
          >
            <p>
              {deposit.title} · Saldo {money(deposit.amount ?? 0)}
            </p>
            <label className="form-label">
              Anticipo cobrado (USD)
              <input
                name="amount"
                type="number"
                min="0.01"
                max={deposit.amount}
                step="0.01"
                required
                defaultValue={deposit.amount}
              />
            </label>
            <button className="btn primary">Registrar anticipo</button>
          </form>
        )}
      </Drawer>
    </>
  );
}
