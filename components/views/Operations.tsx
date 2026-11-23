"use client";
import { useState } from "react";
import {
  Plus,
  Download,
  ArrowUpRight,
  ReceiptText,
  Wallet,
  Clock,
  CheckCheck,
  HardHat,
  ShoppingCart,
  PackageCheck,
  UsersRound,
} from "lucide-react";
import { useApp } from "../enterprise/context";
import {
  SectionTitle,
  Kpi,
  Panel,
  SearchBox,
  Status,
  Drawer,
  Badge,
  Empty,
  Progress,
  AuditTrail,
} from "../enterprise/shared";
import RequestPanel, { RequestFields } from "../enterprise/request-panel";
import {
  requestList,
  requestStatus,
  netPayable,
  projects,
  workList,
  pname,
  type RequestRecord,
  paidDate,
} from "@/lib/enterprise";
import { money, compact, date } from "@/lib/data";
import { csvDownload } from "@/lib/export";
export default function Operations({ mode = "operasyon" }: { mode?: string }) {
  const { state, project, act } = useApp();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [create, setCreate] = useState(false),
    [firm, setFirm] = useState<string | null>(null),
    [addWork, setAddWork] = useState(false);
  const purchase = mode === "satinalma",
    contractors = mode === "taseronlar",
    type = purchase ? "Satın alma" : "Hakediş";
  const all = requestList(state).filter(
    (r) =>
      (project === "all" || r.project === project) &&
      (contractors || r.type === type),
  );
  const rows = all.filter(
    (r) =>
      (r.name + r.company + r.id)
        .toLocaleLowerCase("tr")
        .includes(q.toLocaleLowerCase("tr")) &&
      (filter === "all" || requestStatus(state, r) === filter),
  );
  const total = (status: string) =>
    all
      .filter((r) => requestStatus(state, r) === status)
      .reduce((a, r) => a + netPayable(state, r), 0);
  const firms = [
    ...new Set([
      ...workList(state)
        .filter((w) => project === "all" || w.project === project)
        .map((w) => w.company),
      ...all.map((r) => r.company),
    ]),
  ].filter((n) =>
    n.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")),
  );
  return (
    <>
      <SectionTitle
        title={contractors ? "Taşeronlar" : purchase ? "Satın alma" : "Hakediş"}
        description={
          contractors
            ? "İş paketleri, finansal yükümlülükler ve firma performansı aynı kartta."
            : purchase
              ? "İhtiyaç talebinden malzeme kabulüne kadar izlenebilir satın alma."
              : "Saha kontrolünden yönetici onayına, hakedişten ödeme kaydına."
        }
        actions={
          <>
            <button
              className="btn"
              onClick={() =>
                csvDownload(
                  [
                    [
                      "Kod",
                      "Firma",
                      "Proje",
                      "Açıklama",
                      "Tutar",
                      "Durum",
                      "Vade",
                    ],
                    ...rows.map((r) => [
                      r.id,
                      r.company,
                      pname(r.project),
                      r.name,
                      r.amount,
                      requestStatus(state, r),
                      r.due,
                    ]),
                  ],
                  "ceycon-islemler.csv",
                )
              }
            >
              <Download size={16} /> Listeyi indir
            </button>
            {!contractors && (
              <button className="btn primary" onClick={() => setCreate(true)}>
                <Plus size={17} />
                {purchase ? "Talep oluştur" : "Hakediş oluştur"}
              </button>
            )}
            {contractors && (
              <button className="btn primary" onClick={() => setAddWork(true)}>
                <Plus size={17} /> İş paketi ekle
              </button>
            )}
          </>
        }
      />
      <div className="e-kpis">
        <Kpi
          label={contractors ? "Aktif firma" : "Onay bekleyen"}
          value={
            contractors ? String(firms.length) : compact(total("Onay bekliyor"))
          }
          sub={
            contractors
              ? "Seçili proje kapsamındaki firmalar"
              : `${all.filter((r) => requestStatus(state, r) === "Onay bekliyor").length} işlem yönetici kararında`
          }
          icon={
            contractors ? <UsersRound size={19} /> : <ReceiptText size={19} />
          }
          tone="amber"
        />
        <Kpi
          label="Ödeme planında"
          value={compact(total("Onaylandı"))}
          sub="Onaylanmış, henüz ödenmemiş"
          icon={<Clock size={19} />}
        />
        <Kpi
          label="Ödenen tutar"
          value={compact(total("Ödendi"))}
          sub="Kasa hareketine yansıtılan"
          icon={<Wallet size={19} />}
        />
        <Kpi
          label={purchase ? "Teslim alınan" : "Toplam işlem hacmi"}
          value={
            purchase
              ? String(all.filter((r) => state.delivered.includes(r.id)).length)
              : compact(all.reduce((a, r) => a + r.amount, 0))
          }
          sub={
            purchase
              ? `${all.length} satın alma talebi içinden`
              : "İade kayıtları dahil örnek işlem toplamı"
          }
          icon={
            purchase ? <PackageCheck size={19} /> : <CheckCheck size={19} />
          }
        />
      </div>
      <Panel
        title={
          contractors
            ? "Firma portföyü"
            : purchase
              ? "Satın alma talepleri"
              : "Hakediş kayıtları"
        }
        subtitle={
          contractors
            ? "Detay için firma kartını açın"
            : "Tutarları, ödeme tarihlerini ve onay adımlarını takip edin."
        }
        action={
          <Badge tone="neutral">
            {contractors ? firms.length : rows.length} kayıt
          </Badge>
        }
      >
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Firma, açıklama veya işlem kodu…"
          />
          {!contractors && (
            <select
              aria-label="İşlem durumu"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Tüm durumlar</option>
              {[
                "Onay bekliyor",
                "Onaylandı",
                "Ödendi",
                "Mahsup edildi",
                "İade edildi",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
        {contractors ? (
          <div className="firm-grid">
            {firms.map((f, i) => {
              const ws = workList(state).filter(
                (w) =>
                  w.company === f &&
                  (project === "all" || w.project === project),
              );
              const rs = all.filter((r) => r.company === f);
              return (
                <button
                  className="firm-card"
                  key={f}
                  onClick={() => setFirm(f)}
                >
                  <div className="flex-between">
                    <span className="firm-avatar">
                      {f
                        .split(" ")
                        .map((v) => v[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <ArrowUpRight size={18} />
                  </div>
                  <h3>{f}</h3>
                  <p>
                    {ws.length
                      ? `${ws.length} aktif iş paketi`
                      : "Malzeme tedarikçisi"}
                  </p>
                  <div className="firm-stats">
                    <span>
                      <small>İşlem hacmi</small>
                      <b>{compact(rs.reduce((a, r) => a + r.amount, 0))}</b>
                    </span>
                    <span>
                      <small>Ödeme bekliyor</small>
                      <b>
                        {compact(
                          rs
                            .filter(
                              (r) => requestStatus(state, r) === "Onaylandı",
                            )
                            .reduce((a, r) => a + r.amount, 0),
                        )}
                      </b>
                    </span>
                  </div>
                  <Badge tone="neutral">
                    {
                      [
                        ...new Set([
                          ...ws.map((w) => w.project),
                          ...rs.map((r) => r.project),
                        ]),
                      ].length
                    }{" "}
                    projede görevli
                  </Badge>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="e-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>İşlem / açıklama</th>
                  <th>Firma / proje</th>
                  <th className="numeric">Tutar</th>
                  <th>Vade · ödeme</th>
                  <th>Durum</th>
                  {purchase && <th>Teslim</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="table-link"
                        onClick={() => setSelected(r.id)}
                      >
                        <b>{r.name}</b>
                        <small>
                          {r.id} · {r.type}
                        </small>
                      </button>
                    </td>
                    <td>
                      <b>{r.company}</b>
                      <small>{pname(r.project)}</small>
                    </td>
                    <td className="numeric">
                      <b>{money(r.amount)}</b>
                      {netPayable(state, r) !== r.amount && (
                        <small>
                          Barter mahsubu{" "}
                          {money(r.amount - netPayable(state, r))} · nakit{" "}
                          {money(netPayable(state, r))}
                        </small>
                      )}
                    </td>
                    <td>
                      {date(r.due)}
                      <small>
                        {requestStatus(state, r) === "Ödendi"
                          ? paidDate(state, r.id)
                            ? `Ödendi ${date(paidDate(state, r.id)!)}`
                            : "Ödeme tarihi kaydı yok"
                          : "Planlanan vade"}
                      </small>
                    </td>
                    <td>
                      <Status status={requestStatus(state, r)} />
                    </td>
                    {purchase && (
                      <td>
                        <Badge
                          tone={
                            state.delivered.includes(r.id) ? "green" : "neutral"
                          }
                        >
                          {state.delivered.includes(r.id)
                            ? "Teslim alındı"
                            : "Bekleniyor"}
                        </Badge>
                      </td>
                    )}
                    <td>
                      <button
                        className="btn compact"
                        onClick={() => setSelected(r.id)}
                      >
                        İncele <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <Empty title="Bu filtrede işlem bulunamadı" />}
          </div>
        )}
      </Panel>
      {selected && (
        <RequestPanel
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {addWork && (
        <Drawer open onClose={() => setAddWork(false)} title="Yeni iş paketi" eyebrow="TAŞERON · İŞ SÖZLEŞMESİ">
          <form
            className="e-form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              if (
                act({
                  type: "work-create",
                  record: {
                    project: String(d.get("project")),
                    name: String(d.get("name")),
                    company: String(d.get("company")),
                    value: Number(d.get("value")),
                    weight: Number(d.get("weight")),
                  },
                })
              )
                setAddWork(false);
            }}
          >
            <p className="drawer-intro">
              İş paketi, taşeron firma ile yapılan iş sözleşmesinin kapsamıdır. Aynı projede aynı
              firmanın paketleri tek iş sözleşmesinde (IS-kod-no) toplanır; bu firmaya açılan
              hakedişler ve barter mahsupları otomatik bağlanır.
            </p>
            <label>
              Proje
              <select name="project" defaultValue={project === "all" ? (projects.find((p) => p.status === "Aktif")?.id ?? "") : project}>
                {projects
                  .filter((p) => p.status !== "Arşiv")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              İş paketi
              <input name="name" required minLength={3} maxLength={60} placeholder="Ör. Kaba inşaat · A blok" />
            </label>
            <label>
              Taşeron firma
              <input name="company" required minLength={2} maxLength={60} list="work-firms" placeholder="Firma unvanı" />
              <datalist id="work-firms">
                {[...new Set(workList(state).map((w) => w.company))].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <div className="form-row">
              <label>
                Sözleşme bedeli (TL)
                <input name="value" type="number" min={1} step="0.01" required />
              </label>
              <label>
                Proje ilerlemesindeki ağırlık (%)
                <input name="weight" type="number" min={1} max={100} step={1} required defaultValue={20} />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setAddWork(false)}>
                Vazgeç
              </button>
              <button className="btn primary">İş paketini ekle</button>
            </div>
          </form>
        </Drawer>
      )}
      <Drawer
        open={create}
        onClose={() => setCreate(false)}
        title={purchase ? "Yeni satın alma talebi" : "Yeni hakediş kaydı"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const id = `${purchase ? "SAT" : "HAK"}-${String(requestList(state).length + 101).padStart(3, "0")}`;
            if (
              act({
                type: "request",
                record: {
                  id,
                  project: String(f.get("project")),
                  type,
                  name: String(f.get("name")),
                  company: String(f.get("company")),
                  amount: Number(f.get("amount")),
                  due: String(f.get("due")),
                  description: String(f.get("description")),
                  status: "Onay bekliyor",
                },
              })
            ) {
              setCreate(false);
              setSelected(id);
            }
          }}
        >
          <label className="form-label">
            Proje
            <select
              name="project"
              defaultValue={project === "all" ? (projects.find((p) => p.status === "Aktif")?.id ?? projects[0]?.id ?? "") : project}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <RequestFields />
          <div className="callout">
            Kayıt oluşturulunca yönetici onayına düşer. Onay verilmeden ödeme
            yapılamaz.
          </div>
          <button className="btn primary" type="submit">
            Kaydet ve onaya sun
          </button>
        </form>
      </Drawer>
      <Drawer
        open={!!firm}
        onClose={() => setFirm(null)}
        title={firm ?? "Firma"}
      >
        {firm && (
          <>
            <p className="drawer-intro">
              İş paketi ve ödeme özeti · temsili firma kaydı
            </p>
            <h3 className="subheading">İş paketleri</h3>
            {workList(state)
              .filter(
                (w) =>
                  w.company === firm &&
                  (project === "all" || w.project === project),
              )
              .map((w) => (
                <div className="firm-work" key={w.id}>
                  <div className="flex-between">
                    <b>{w.name}</b>
                    <strong>%{w.progress}</strong>
                  </div>
                  <p>{pname(w.project)}</p>
                  <Progress value={w.progress} />
                </div>
              ))}
            <h3 className="subheading">Finansal kayıtlar</h3>
            {all
              .filter((r) => r.company === firm)
              .map((r) => (
                <button
                  className="firm-request"
                  key={r.id}
                  onClick={() => {
                    setFirm(null);
                    setSelected(r.id);
                  }}
                >
                  <span>
                    <b>{r.name}</b>
                    <small>
                      {r.id} · {money(r.amount)}
                    </small>
                  </span>
                  <Status status={requestStatus(state, r)} />
                </button>
              ))}
            {!all.some((r) => r.company === firm) && (
              <Empty
                title="Henüz finansal işlem yok"
                detail="Bu firma saha iş paketlerinde yer alıyor."
              />
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
