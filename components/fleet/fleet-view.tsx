"use client";
// Araç ve Filo Yönetimi: araçlar, zimmet ve proje, kilometre, MTV / trafik sigortası / kasko / muayene / bakım /
// lastik takibi, yakıt ve servis giderleri, evrak arşivi ve işlem geçmişi. Hatırlatmalar uygulama içinde
// hesaplanır ve bildirim merkezinde görünür; e-posta, SMS veya WhatsApp gönderimi yapılmaz. Kayıtlar temsilidir.
import { useMemo, useState } from "react";
import { Truck, AlertTriangle, CalendarClock, Fuel, Wrench, Plus, FileText, History, Gauge, CheckCircle2 } from "lucide-react";
import { useApp } from "../enterprise/context";
import { useAuth } from "../security/auth";
import { Panel, Badge, Drawer, SearchBox } from "../enterprise/shared";
import { pname, projects } from "@/lib/enterprise";
import { date as fmtDate } from "@/lib/data";
import {
  seedFleet, fleetReminders, vehicleSummary, bucketOf, daysLeft, BUCKETS, OBLIGATION_KINDS, FLEET_SNAPSHOT,
  type Bucket, type Obligation, type Vehicle, type ObligationKind, type VehicleType,
} from "@/lib/fleet";

const tl = (n: number) => `₺${n.toLocaleString("tr-TR")}`;
const BUCKET_TONE: Record<Bucket, string> = { "Gecikmiş": "red", "7 gün": "red", "15 gün": "amber", "30 gün": "amber", "İleri tarih": "neutral", "Tamamlandı": "green" };
const addMonths = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};
function defaultNext(o: Obligation, v?: Vehicle) {
  if (o.kind === "MTV" || o.kind === "Lastik değişimi") return addMonths(o.due, 6);
  if (o.kind === "Muayene") return addMonths(o.due, v?.type === "Binek" ? 24 : 12);
  return addMonths(o.due, 12);
}
const projectName = (id: string) => (id === "genel" ? "Merkez / genel" : pname(id));

export default function FleetView() {
  const { state } = useApp();
  const auth = useAuth();
  const fleet = state.fleet ?? seedFleet;
  const editable = auth.can("arac", "edit");
  const [bucket, setBucket] = useState<Bucket>("Gecikmiş");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const rem = useMemo(() => fleetReminders(fleet), [fleet]);
  const month = FLEET_SNAPSHOT.slice(0, 7);
  const fuelMonth = fleet.fuel.filter((f) => f.date.startsWith(month)).reduce((a, f) => a + f.amount, 0);
  const svcOpen = fleet.services.filter((s) => s.status === "Açık").length;
  const paidYear = fleet.obligations.filter((o) => o.completedAt?.startsWith("2026")).reduce((a, o) => a + (o.paid ?? 0), 0);
  const list = fleet.obligations
    .filter((o) => bucketOf(o) === bucket)
    .sort((a, b) => (bucket === "Tamamlandı" ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "") : a.due.localeCompare(b.due)));
  const vehicles = fleet.vehicles.filter((v) => !q || `${v.plate} ${v.brand} ${v.model} ${v.assignee}`.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));
  const veh = (id: string) => fleet.vehicles.find((v) => v.id === id);
  return (
    <div className="fl-page">
      <header className="fc-head">
        <div>
          <span className="sec-eyebrow">Operasyon · şirket araçları</span>
          <h1>Araç ve Filo Yönetimi</h1>
          <p>
            Zimmet, kilometre, yasal yükümlülükler ve giderler tek ekranda. Hatırlatmalar uygulama içinde ve bildirim
            merkezinde görünür; <b>e-posta, SMS veya WhatsApp gönderimi yoktur.</b> Araç ve tutarlar temsilidir.
          </p>
        </div>
        {editable && <button className="btn primary" onClick={() => setAdding(true)}><Plus size={15} /> Araç ekle</button>}
      </header>

      <div className="fl-kpis">
        <K icon={<Truck size={16} />} label="Araç" value={String(fleet.vehicles.length)} sub={`${fleet.vehicles.filter((v) => v.status === "Serviste").length} serviste · ${fleet.vehicles.filter((v) => v.status === "Aktif").length} aktif`} />
        <K icon={<AlertTriangle size={16} />} label="Gecikmiş işlem" value={String(rem.counts["Gecikmiş"])} sub="süresi geçmiş yükümlülük" tone={rem.counts["Gecikmiş"] ? "bad" : "good"} />
        <K icon={<CalendarClock size={16} />} label="30 gün içinde" value={String(rem.within30.length)} sub={`${rem.counts["7 gün"]} işlem 7 gün içinde`} tone="warn" />
        <K icon={<Fuel size={16} />} label="Kasım yakıt gideri" value={tl(fuelMonth)} sub={`${fleet.fuel.filter((f) => f.date.startsWith(month)).length} dolum`} />
        <K icon={<Wrench size={16} />} label="Açık arıza / servis" value={String(svcOpen)} sub="kapanmamış kayıt" tone={svcOpen ? "warn" : undefined} />
        <K icon={<CheckCircle2 size={16} />} label="2026 ödenen yükümlülük" value={tl(paidYear)} sub="MTV, sigorta, muayene vb." />
      </div>

      <Panel title="Hatırlatmalar" subtitle={`Senaryo tarihi ${fmtDate(FLEET_SNAPSHOT)} · MTV, trafik sigortası, kasko, muayene, bakım ve lastik`}>
        <div className="fl-buckets" role="tablist" aria-label="Hatırlatma dönemi">
          {BUCKETS.map((b) => (
            <button key={b} role="tab" aria-selected={bucket === b} className={`${bucket === b ? "on" : ""} ${BUCKET_TONE[b]}`} onClick={() => setBucket(b)}>
              {b === "Tamamlandı" ? "Tamamlanan" : b === "İleri tarih" ? "30 günden sonra" : b === "Gecikmiş" ? "Gecikmiş" : `${b} kalan`}
              <b>{rem.counts[b]}</b>
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="sec-table">
            <thead>
              <tr><th>Araç</th><th>İşlem</th><th>Son tarih</th><th>Kalan</th><th className="numeric">Tutar</th><th>Kurum / referans</th><th /></tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const v = veh(o.vehicleId);
                const d = daysLeft(o);
                return (
                  <tr key={o.id}>
                    <td><b>{v?.plate}</b><small>{v?.brand} {v?.model}</small></td>
                    <td>{o.kind}{o.note && <small>{o.note}</small>}</td>
                    <td>{fmtDate(o.due)}{o.completedAt && <small>Tamamlandı {fmtDate(o.completedAt)}</small>}</td>
                    <td>{o.status === "Tamamlandı" ? <Badge tone="green">Tamam</Badge> : <Badge tone={BUCKET_TONE[bucketOf(o)]}>{d < 0 ? `${-d} gün gecikti` : d === 0 ? "Bugün" : `${d} gün`}</Badge>}</td>
                    <td className="numeric">{o.paid !== undefined ? tl(o.paid) : o.amount !== undefined ? tl(o.amount) : "—"}</td>
                    <td>{o.provider ?? "—"}{o.reference && <small>{o.reference}</small>}</td>
                    <td>{o.status === "Açık" && editable && <button className="btn small" onClick={() => setCompleting(o.id)}>Tamamla</button>}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={7} className="muted">Bu dönemde kayıt yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Araçlar" subtitle="Satıra tıklayın: yükümlülükler, yakıt, servis, evrak ve geçmiş" action={<SearchBox value={q} onChange={setQ} placeholder="Plaka, model veya zimmetli personel" />}>
        <div className="table-wrap">
          <table className="sec-table fl-table">
            <thead>
              <tr><th>Plaka</th><th>Araç</th><th>Proje</th><th>Zimmet</th><th className="numeric">Kilometre</th><th>Durum</th><th>Sıradaki işlem</th><th className="numeric">Yakıt (toplam)</th></tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const s = vehicleSummary(fleet, v.id);
                return (
                  <tr key={v.id} className="clickable" onClick={() => setOpen(v.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(v.id)}>
                    <td><b className="fl-plate">{v.plate}</b></td>
                    <td>{v.brand} {v.model}<small>{v.year} · {v.type} · {v.fuel}</small></td>
                    <td>{projectName(v.project)}</td>
                    <td>{v.assignee}</td>
                    <td className="numeric">{v.km.toLocaleString("tr-TR")} km<small>{fmtDate(v.kmDate)}</small></td>
                    <td><Badge tone={v.status === "Aktif" ? "green" : v.status === "Serviste" ? "amber" : "neutral"}>{v.status}</Badge></td>
                    <td>{s.next ? <><Badge tone={BUCKET_TONE[bucketOf(s.next)]}>{s.next.kind}</Badge><small>{fmtDate(s.next.due)}</small></> : "—"}</td>
                    <td className="numeric">{tl(s.fuelCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Drawer open={!!completing} title="Yükümlülüğü tamamla" eyebrow="ARAÇ · ÖDEME VE YENİ SON TARİH" onClose={() => setCompleting(null)}>
        {completing && <CompleteForm ob={fleet.obligations.find((o) => o.id === completing)!} v={veh(fleet.obligations.find((o) => o.id === completing)!.vehicleId)} onDone={() => setCompleting(null)} />}
      </Drawer>
      <Drawer open={adding} title="Yeni araç" eyebrow="ARAÇ VE FİLO" onClose={() => setAdding(false)}>
        {adding && <VehicleForm onDone={() => setAdding(false)} />}
      </Drawer>
      <Drawer open={!!open} title={open ? `${veh(open)?.plate} · ${veh(open)?.brand} ${veh(open)?.model}` : ""} eyebrow="ARAÇ DOSYASI" onClose={() => setOpen(null)} wide>
        {open && veh(open) && <VehicleFile v={veh(open)!} editable={editable} onComplete={(id) => setCompleting(id)} />}
      </Drawer>
    </div>
  );
}

function K({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <section className={`sec-kpi ${tone ?? ""}`}>
      <span>{icon} {label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </section>
  );
}

function CompleteForm({ ob, v, onDone }: { ob: Obligation; v?: Vehicle; onDone: () => void }) {
  const { act } = useApp();
  const [f, setF] = useState({ date: FLEET_SNAPSHOT, paid: String(ob.amount ?? ""), nextDue: defaultNext(ob, v), reference: ob.reference ?? "", note: "" });
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (act({ type: "vehicle-obligation-complete", id: ob.id, date: f.date, paid: Number(f.paid), nextDue: f.nextDue, reference: f.reference, note: f.note })) onDone();
      }}
    >
      <p className="drawer-intro">
        <b>{v?.plate}</b> · {ob.kind} · son tarih {fmtDate(ob.due)}. Ödeme kaydedilir, kayıt “Tamamlandı” olur ve aynı
        işlem için yeni son tarihle hatırlatma oluşturulur.
      </p>
      <div className="form-grid">
        <label>İşlem / ödeme tarihi<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></label>
        <label>Ödenen tutar (TL)<input type="number" min={0} step="0.01" value={f.paid} onChange={(e) => setF({ ...f, paid: e.target.value })} required /></label>
        <label>Yeni son tarih<input type="date" value={f.nextDue} onChange={(e) => setF({ ...f, nextDue: e.target.value })} required /></label>
        <label>Poliçe / dekont no<input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="Temsili referans" /></label>
        <label className="full">Not<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onDone}>Vazgeç</button>
        <button className="btn primary" type="submit">Tamamlandı olarak kaydet</button>
      </div>
    </form>
  );
}

const TYPES: VehicleType[] = ["Binek", "Hafif ticari", "Kamyonet", "Kamyon", "İş makinesi"];
function VehicleForm({ v, onDone }: { v?: Vehicle; onDone: () => void }) {
  const { act } = useApp();
  const [f, setF] = useState({
    plate: v?.plate ?? "", brand: v?.brand ?? "", model: v?.model ?? "", year: String(v?.year ?? 2025), type: v?.type ?? ("Binek" as VehicleType),
    fuel: v?.fuel ?? ("Dizel" as Vehicle["fuel"]), project: v?.project ?? "genel", assignee: v?.assignee ?? "", km: String(v?.km ?? 0), status: v?.status ?? ("Aktif" as Vehicle["status"]), note: v?.note ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        const base = { plate: f.plate, brand: f.brand, model: f.model, year: Number(f.year), type: f.type, fuel: f.fuel, project: f.project, assignee: f.assignee, status: f.status, note: f.note };
        const ok = v ? act({ type: "vehicle-update", id: v.id, patch: base }) : act({ type: "vehicle-create", record: { ...base, km: Number(f.km) } });
        if (ok) onDone();
      }}
    >
      <div className="form-grid">
        <label>Plaka<input value={f.plate} onChange={set("plate")} placeholder="34 ABC 123" required /></label>
        <label>Üretim yılı<input type="number" min={1990} max={2027} value={f.year} onChange={set("year")} required /></label>
        <label>Marka<input value={f.brand} onChange={set("brand")} required /></label>
        <label>Model<input value={f.model} onChange={set("model")} required /></label>
        <label>Araç tipi<select value={f.type} onChange={set("type")}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Yakıt<select value={f.fuel} onChange={set("fuel")}>{["Dizel", "Benzin", "Hibrit", "Elektrik"].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Kullanıldığı proje
          <select value={f.project} onChange={set("project")}>
            <option value="genel">Merkez / genel</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Zimmetli personel<input value={f.assignee} onChange={set("assignee")} placeholder="Kurgusal ad veya unvan" required /></label>
        {!v && <label>Güncel kilometre<input type="number" min={0} value={f.km} onChange={set("km")} required /></label>}
        <label>Durum<select value={f.status} onChange={set("status")}>{["Aktif", "Serviste", "Pasif"].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="full">Not<input value={f.note} onChange={set("note")} /></label>
      </div>
      <p className="muted">Yalnızca kurgusal bilgi girin. Kilometre, araç dosyasındaki “Kilometre güncelle” ile ileriye doğru güncellenir.</p>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onDone}>Vazgeç</button>
        <button className="btn primary" type="submit">{v ? "Değişiklikleri kaydet" : "Aracı ekle"}</button>
      </div>
    </form>
  );
}

const FILE_TABS = ["Genel", "Yükümlülükler", "Yakıt", "Arıza ve servis", "Evrak", "Geçmiş"] as const;
function VehicleFile({ v, editable, onComplete }: { v: Vehicle; editable: boolean; onComplete: (id: string) => void }) {
  const { state, act } = useApp();
  const fleet = state.fleet ?? seedFleet;
  const [tab, setTab] = useState<(typeof FILE_TABS)[number]>("Genel");
  const [editing, setEditing] = useState(false);
  const s = vehicleSummary(fleet, v.id);
  const obs = fleet.obligations.filter((o) => o.vehicleId === v.id).sort((a, b) => a.due.localeCompare(b.due));
  return (
    <div className="fl-file">
      <dl className="fl-summary">
        <div><dt>Kilometre</dt><dd>{v.km.toLocaleString("tr-TR")} km</dd></div>
        <div><dt>Zimmet</dt><dd>{v.assignee}</dd></div>
        <div><dt>Proje</dt><dd>{projectName(v.project)}</dd></div>
        <div><dt>Yakıt gideri</dt><dd>{tl(s.fuelCost)}{s.consumption ? ` · ${s.consumption.toLocaleString("tr-TR")} L/100 km` : ""}</dd></div>
        <div><dt>Servis gideri</dt><dd>{tl(s.serviceCost)}</dd></div>
        <div><dt>Ödenen yükümlülük</dt><dd>{tl(s.obligationPaid)}</dd></div>
      </dl>
      <nav className="fl-tabs" role="tablist">
        {FILE_TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>
      {tab === "Genel" && (
        editing ? <VehicleForm v={v} onDone={() => setEditing(false)} /> : (
          <>
            <dl className="fl-detail">
              <div><dt>Plaka</dt><dd>{v.plate}</dd></div>
              <div><dt>Marka / model</dt><dd>{v.brand} {v.model}</dd></div>
              <div><dt>Üretim yılı</dt><dd>{v.year}</dd></div>
              <div><dt>Tip · yakıt</dt><dd>{v.type} · {v.fuel}</dd></div>
              <div><dt>Durum</dt><dd>{v.status}</dd></div>
              <div><dt>Kilometre tarihi</dt><dd>{fmtDate(v.kmDate)}</dd></div>
            </dl>
            {editable && (
              <div className="form-actions">
                <button className="btn" onClick={() => setEditing(true)}>Bilgileri düzenle</button>
                <KmForm v={v} />
              </div>
            )}
          </>
        )
      )}
      {tab === "Yükümlülükler" && (
        <>
          <table className="sec-table">
            <thead><tr><th>İşlem</th><th>Son tarih</th><th>Durum</th><th className="numeric">Tutar</th><th /></tr></thead>
            <tbody>
              {obs.map((o) => (
                <tr key={o.id}>
                  <td>{o.kind}{o.reference && <small>{o.reference}</small>}</td>
                  <td>{fmtDate(o.due)}</td>
                  <td><Badge tone={BUCKET_TONE[bucketOf(o)]}>{bucketOf(o) === "İleri tarih" ? "Planlı" : bucketOf(o)}</Badge></td>
                  <td className="numeric">{o.paid !== undefined ? tl(o.paid) : o.amount !== undefined ? tl(o.amount) : "—"}</td>
                  <td>{o.status === "Açık" && editable && <button className="btn small" onClick={() => onComplete(o.id)}>Tamamla</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {editable && <ObligationForm vehicleId={v.id} />}
        </>
      )}
      {tab === "Yakıt" && (
        <>
          <table className="sec-table">
            <thead><tr><th>Tarih</th><th className="numeric">Litre</th><th className="numeric">Tutar</th><th className="numeric">Kilometre</th><th>İstasyon</th></tr></thead>
            <tbody>
              {fleet.fuel.filter((x) => x.vehicleId === v.id).sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
                <tr key={x.id}><td>{fmtDate(x.date)}</td><td className="numeric">{x.liters}</td><td className="numeric">{tl(x.amount)}</td><td className="numeric">{x.km.toLocaleString("tr-TR")}</td><td>{x.station}</td></tr>
              ))}
            </tbody>
          </table>
          {editable && (
            <QuickForm
              fields={[["date", "Tarih", "date", FLEET_SNAPSHOT], ["liters", "Litre", "number", ""], ["amount", "Tutar (TL)", "number", ""], ["km", "Kilometre", "number", String(v.km)], ["station", "İstasyon", "text", ""]]}
              submit="Yakıt kaydı ekle"
              onSubmit={(d) => act({ type: "vehicle-fuel", record: { vehicleId: v.id, date: d.date, liters: Number(d.liters), amount: Number(d.amount), km: Number(d.km), station: d.station || "—" } })}
            />
          )}
        </>
      )}
      {tab === "Arıza ve servis" && (
        <>
          <table className="sec-table">
            <thead><tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th className="numeric">Tutar</th><th>Durum</th><th /></tr></thead>
            <tbody>
              {fleet.services.filter((x) => x.vehicleId === v.id).sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
                <tr key={x.id}>
                  <td>{fmtDate(x.date)}<small>{x.km.toLocaleString("tr-TR")} km</small></td>
                  <td>{x.kind}</td>
                  <td>{x.description}<small>{x.provider}</small></td>
                  <td className="numeric">{tl(x.cost)}</td>
                  <td><Badge tone={x.status === "Açık" ? "amber" : "green"}>{x.status}</Badge></td>
                  <td>{x.status === "Açık" && editable && <CloseService id={x.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {editable && (
            <QuickForm
              fields={[["date", "Tarih", "date", FLEET_SNAPSHOT], ["kind", "Tür (Arıza / Servis / Hasar)", "select:Arıza,Servis,Hasar", "Arıza"], ["km", "Kilometre", "number", String(v.km)], ["cost", "Tutar (TL, bilinmiyorsa 0)", "number", "0"], ["provider", "Servis", "text", ""], ["description", "Açıklama", "text", ""]]}
              submit="Kayıt ekle"
              onSubmit={(d) => act({ type: "vehicle-service", record: { vehicleId: v.id, date: d.date, kind: d.kind as "Arıza", km: Number(d.km), cost: Number(d.cost), provider: d.provider || "—", description: d.description, status: d.kind === "Servis" ? "Kapandı" : "Açık" } })}
            />
          )}
        </>
      )}
      {tab === "Evrak" && (
        <>
          <ul className="fl-docs">
            {fleet.docs.filter((x) => x.vehicleId === v.id).map((x) => (
              <li key={x.id}>
                <FileText size={15} />
                <div><b>{x.title}</b><small>{x.kind} · {fmtDate(x.date)}{x.expiry ? ` · geçerlilik ${fmtDate(x.expiry)}` : ""}</small></div>
                {x.expiry && <Badge tone={x.expiry < FLEET_SNAPSHOT ? "red" : "green"}>{x.expiry < FLEET_SNAPSHOT ? "Süresi doldu" : "Geçerli"}</Badge>}
              </li>
            ))}
          </ul>
          <p className="muted">Evrak kayıtları temsili meta veridir; dosya içeriği saklanmaz. Üretimde şifreli belge deposunda tutulur.</p>
          {editable && (
            <QuickForm
              fields={[["title", "Belge adı", "text", ""], ["kind", "Tür", "select:Ruhsat,Poliçe,Muayene raporu,Fatura,Zimmet tutanağı", "Poliçe"], ["date", "Belge tarihi", "date", FLEET_SNAPSHOT], ["expiry", "Geçerlilik (varsa)", "date", ""]]}
              submit="Evrak ekle"
              optional={["expiry"]}
              onSubmit={(d) => act({ type: "vehicle-doc", record: { vehicleId: v.id, title: d.title, kind: d.kind as "Poliçe", date: d.date, expiry: d.expiry || undefined } })}
            />
          )}
        </>
      )}
      {tab === "Geçmiş" && (
        <ol className="fl-history">
          {fleet.history.filter((h) => h.vehicleId === v.id).map((h) => (
            <li key={h.id}><History size={13} /> <b>{fmtDate(h.date)}</b> {h.text}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function KmForm({ v }: { v: Vehicle }) {
  const { act } = useApp();
  const [km, setKm] = useState(String(v.km));
  return (
    <form className="fl-km" onSubmit={(e) => { e.preventDefault(); act({ type: "vehicle-km", id: v.id, km: Number(km), date: FLEET_SNAPSHOT }); }}>
      <Gauge size={15} />
      <input type="number" min={v.km} value={km} onChange={(e) => setKm(e.target.value)} aria-label="Güncel kilometre" />
      <button className="btn" type="submit">Kilometre güncelle</button>
    </form>
  );
}

function CloseService({ id }: { id: string }) {
  const { act } = useApp();
  const [cost, setCost] = useState("");
  return (
    <form className="fl-km" onSubmit={(e) => { e.preventDefault(); act({ type: "vehicle-service-close", id, cost: Number(cost || 0), date: FLEET_SNAPSHOT }); }}>
      <input type="number" min={0} placeholder="Tutar" value={cost} onChange={(e) => setCost(e.target.value)} aria-label="Servis tutarı" />
      <button className="btn small" type="submit">Kapat</button>
    </form>
  );
}

function ObligationForm({ vehicleId }: { vehicleId: string }) {
  const { act } = useApp();
  return (
    <QuickForm
      fields={[["kind", "İşlem", `select:${OBLIGATION_KINDS.join(",")}`, "MTV"], ["due", "Son tarih", "date", ""], ["amount", "Tahmini tutar (TL)", "number", ""], ["provider", "Kurum", "text", ""], ["reference", "Poliçe / referans", "text", ""]]}
      submit="Takibe al"
      optional={["amount"]}
      onSubmit={(d) => act({ type: "vehicle-obligation-add", record: { vehicleId, kind: d.kind as ObligationKind, due: d.due, amount: d.amount ? Number(d.amount) : undefined, provider: d.provider || undefined, reference: d.reference || undefined } })}
    />
  );
}

function QuickForm({ fields, submit, onSubmit, optional = [] }: { fields: [string, string, string, string][]; submit: string; onSubmit: (d: Record<string, string>) => boolean; optional?: string[] }) {
  const init = Object.fromEntries(fields.map(([k, , , v]) => [k, v]));
  const [d, setD] = useState<Record<string, string>>(init);
  return (
    <form className="fl-quick" onSubmit={(e) => { e.preventDefault(); if (onSubmit(d)) setD(init); }}>
      {fields.map(([k, label, type]) => (
        <label key={k}>
          {label}
          {type.startsWith("select:") ? (
            <select value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })}>{type.slice(7).split(",").map((o) => <option key={o}>{o}</option>)}</select>
          ) : (
            <input type={type} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} required={!optional.includes(k) && (type !== "text" || k === "description" || k === "title")} step={type === "number" ? "any" : undefined} min={type === "number" ? 0 : undefined} />
          )}
        </label>
      ))}
      <button className="btn primary" type="submit">{submit}</button>
    </form>
  );
}
