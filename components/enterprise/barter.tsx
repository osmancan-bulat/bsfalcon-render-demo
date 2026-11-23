"use client";
// Barter / iş karşılığı daire: anlaşma kaydı, iş ilerlemesi, tapu devri ve taşeron hakedişine mahsup.
// Barter nakit satış, tahsilat veya kasa girişi oluşturmaz; mahsup hakedişin nakit ödemesini azaltır.
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Handshake,
  Building2,
  Wallet,
  Plus,
  ArrowRightLeft,
} from "lucide-react";
import { useApp } from "./context";
import { unitShort } from "@/lib/units";
import RecordDocuments from "./record-documents";
import RequestPanel from "./request-panel";
import {
  SectionTitle,
  Kpi,
  Panel,
  SearchBox,
  Drawer,
  Badge,
  Empty,
  AuditTrail,
  Progress,
} from "./shared";
import {
  projects,
  pname,
  unitTaken,
  requestList,
  requestStatus,
  netPayable,
  offsetFor,
  barterOffset,
  type Barter,
} from "@/lib/enterprise";
import { units, unitById } from "@/lib/units";
import { money, compact, date } from "@/lib/data";

const sameFirm = (a: string, b: string) =>
  a.trim().toLocaleLowerCase("tr") === b.trim().toLocaleLowerCase("tr");

export default function BarterView() {
  const { state, project, act } = useApp();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [create, setCreate] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [scope, setScope] = useState(project === "all" ? (projects.find((p) => p.status === "Aktif")?.id ?? projects[0]?.id ?? "") : project),
    [unit, setUnit] = useState("");

  useEffect(() => {
    const u = new URLSearchParams(location.search).get("unit");
    if (u && unitById(u)) {
      setScope(u.split("-")[0]);
      setUnit(u);
      setCreate(true);
    }
  }, []);

  const records = state.barters.filter(
    (b) => project === "all" || b.project === project,
  );
  const rows = records.filter(
    (b) =>
      (b.company + b.work + (unitById(b.unitId)?.label ?? ""))
        .toLocaleLowerCase("tr")
        .includes(q.toLocaleLowerCase("tr")) &&
      (filter === "all" ||
        (filter === "done" ? b.progress === 100 : b.progress < 100)),
  );
  const available = units.filter(
    (u) => u.project === scope && !unitTaken(state, u.id),
  );
  const chosen = unitById(unit);
  const totalValue = records.reduce((a, b) => a + b.amount, 0);
  const totalOffset = records.reduce(
    (a, b) => a + barterOffset(state, b.id),
    0,
  );
  const listValue = records.reduce(
    (a, b) => a + (unitById(b.unitId)?.listPrice ?? 0),
    0,
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Barter</h1>
          <p>
            {records.length} daire · anlaşma {compact(totalValue)} · hakedişe
            mahsup {compact(totalOffset)} · kalan yükümlülük{" "}
            {compact(totalValue - totalOffset)}
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() => {
            setUnit("");
            setScope(project === "all" ? (projects.find((p) => p.status === "Aktif")?.id ?? projects[0]?.id ?? "") : project);
            setCreate(true);
          }}
        >
          <Plus size={16} /> Barter anlaşması
        </button>
      </header>
      <Panel>
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Firma, iş veya daire ara…"
          />
          <select
            aria-label="Barter iş durumu"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tüm işler</option>
            <option value="active">Devam eden</option>
            <option value="done">Tamamlanan</option>
          </select>
        </div>
        {rows.length ? (
          <div className="e-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Firma / iş</th>
                  <th>Daire</th>
                  <th className="numeric">Anlaşma / liste</th>
                  <th>Mahsup / kalan</th>
                  <th>İş dönemi</th>
                  <th>İlerleme / devir</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const u = unitById(b.unitId);
                  const used = barterOffset(state, b.id);
                  return (
                    <tr
                      key={b.id}
                      className="clickable"
                      onClick={() => setSelected(b.id)}
                    >
                      <td>
                        <b>{b.company}</b>
                        <small>{b.work}</small>
                      </td>
                      <td>
                        <b>
                          {pname(b.project)} · {unitShort(b.unitId)}
                        </b>
                        <small>
                          {u?.type} · {u?.gross} m² · {u?.floorLabel}
                        </small>
                      </td>
                      <td className="numeric">
                        <b>{money(b.amount)}</b>
                        <small>Liste {money(u?.listPrice ?? 0)}</small>
                      </td>
                      <td className="cc-ratio">
                        <span className="num">{money(used)}</span>
                        <small>Kalan {money(b.amount - used)}</small>
                        <Progress value={(used / b.amount) * 100} />
                      </td>
                      <td>
                        {date(b.start)}
                        <small>{date(b.end)}</small>
                      </td>
                      <td>
                        <Badge tone={b.progress === 100 ? "green" : "neutral"}>
                          %{b.progress}
                        </Badge>
                        <small>{b.transfer}</small>
                      </td>
                      <td>
                        <span className="btn compact">Aç</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Henüz barter kaydı yok"
            detail="Bir anlaşma ekleyerek iş, daire, mahsup ve devir takibini başlatın."
          />
        )}
      </Panel>

      <Drawer
        open={create}
        title="Yeni barter anlaşması"
        onClose={() => setCreate(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const record: Barter = {
              id: crypto.randomUUID(),
              project: scope,
              unitId: String(f.get("unit")),
              company: String(f.get("company")),
              work: String(f.get("work")),
              amount: Number(f.get("amount")),
              start: String(f.get("start")),
              end: String(f.get("end")),
              progress: 0,
              transfer: "Bekliyor",
            };
            if (act({ type: "barter", record })) {
              setCreate(false);
              setSelected(record.id);
            }
          }}
        >
          <p className="callout">
            Yalnızca temsili bilgiler kullanın. Bu işlem kasa veya taksit
            tahsilatı oluşturmaz.
          </p>
          <div className="form-grid">
            <label>
              Proje
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setUnit("");
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Verilen daire
              <select
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              >
                <option value="">Daire seçin</option>
                {available.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} · {u.type} · {u.gross} m² · {u.floorLabel}
                  </option>
                ))}
              </select>
            </label>
            {chosen && (
              <p className="full muted">
                Liste fiyatı {money(chosen.listPrice)} · {chosen.facade} cephe.
                Anlaşma bedeli liste fiyatından farklıysa fark raporlarda
                gösterilir.
              </p>
            )}
            <label className="full">
              Barter firması
              <input
                name="company"
                placeholder="Firma unvanı"
                required
                maxLength={100}
              />
              <small className="muted">
                Hakediş mahsubu için taşeron firma adıyla aynı olmalı.
              </small>
            </label>
            <label className="full">
              Karşılığında yapılacak iş
              <textarea name="work" required maxLength={1000} />
            </label>
            <label>
              Anlaşma bedeli (TL)
              <input
                type="number"
                name="amount"
                min="1"
                step="0.01"
                defaultValue={chosen?.listPrice}
                key={chosen?.id}
                required
              />
            </label>
            <label>
              Başlangıç tarihi
              <input
                type="date"
                name="start"
                defaultValue="2026-11-15"
                required
              />
            </label>
            <label>
              Bitiş tarihi
              <input type="date" name="end" required />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn primary">Barter kaydını oluştur</button>
          </div>
        </form>
      </Drawer>

      <BarterDrawer id={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/** Barter dosyası: başka ekranlardan (kontrol merkezi, konut haritası) doğrudan açılabilir. */
export function BarterDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { state } = useApp();
  const b = state.barters.find((b) => b.id === id);
  return (
    <Drawer
      open={!!b}
      title={b ? `${b.company} · ${unitShort(b.unitId)}` : "Barter"}
      eyebrow="BARTER DOSYASI · NAKİT DIŞI"
      onClose={onClose}
      wide
    >
      {b && <BarterDetail key={b.id} b={b} />}
    </Drawer>
  );
}

function BarterDetail({ b }: { b: Barter }) {
  const { state, act } = useApp();
  const u = unitById(b.unitId);
  const used = barterOffset(state, b.id);
  const left = Math.round((b.amount - used) * 100) / 100;
  const diff = b.amount - (u?.listPrice ?? 0);
  const candidates = requestList(state).filter(
    (r) =>
      r.type === "Hakediş" &&
      r.project === b.project &&
      sameFirm(r.company, b.company),
  );
  const eligible = candidates.filter(
    (r) => requestStatus(state, r) === "Onaylandı",
  );
  const history = (state.offsets ?? []).filter((o) => o.barterId === b.id);
  const [reqId, setReqId] = useState(eligible[0]?.id ?? "");
  const req = eligible.find((r) => r.id === reqId) ?? eligible[0];
  const [amount, setAmount] = useState(
    req ? String(Math.min(left, netPayable(state, req))) : "",
  );
  const [confirm, setConfirm] = useState(false);
  const [progress, setProgress] = useState(String(b.progress));
  const [transfer, setTransfer] = useState(b.transfer);
  const n = Number(amount);
  const maxOffset = req ? Math.min(left, netPayable(state, req)) : 0;
  const valid =
    !!req &&
    Number.isFinite(n) &&
    n > 0 &&
    Math.round(n * 100) <= Math.round(maxOffset * 100);
  const [reqOpen, setReqOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<
    "Mahsup" | "Sözleşme ve belgeler" | "İş ve devir"
  >("Mahsup");
  const needsTransferConfirm =
    transfer === "Devredildi" && b.transfer !== "Devredildi";

  return (
    <>
      <dl className="file-summary cols-3">
        <div>
          <dt>Verilen daire</dt>
          <dd>
            {unitShort(b.unitId)} · {u?.type}
            <small>
              {pname(b.project)} · {u?.floorLabel} · kod {u?.label}
            </small>
          </dd>
        </div>
        <div>
          <dt>Firma</dt>
          <dd>{b.company}</dd>
        </div>
        <div>
          <dt>Karşılığında alınan iş</dt>
          <dd>
            {b.work}
            <small>
              İş %{b.progress} · devir: {b.transfer}
            </small>
          </dd>
        </div>
        <div>
          <dt>Anlaşma bedeli</dt>
          <dd className="num">
            {money(b.amount)}
            <small>
              Liste {money(u?.listPrice ?? 0)}
              {diff !== 0
                ? ` · fark ${diff > 0 ? "+" : "−"}${money(Math.abs(diff))}`
                : ""}
            </small>
          </dd>
        </div>
        <div>
          <dt>Hakedişten mahsup</dt>
          <dd className="num">
            {money(used)}
            <Progress value={(used / b.amount) * 100} />
          </dd>
        </div>
        <div>
          <dt>Kalan yükümlülük</dt>
          <dd className="num">
            {money(left)}
            <small>Nakit dışı · kasa etkisi yok</small>
          </dd>
        </div>
      </dl>

      <div className="e-tabs" role="tablist">
        {(["Mahsup", "Sözleşme ve belgeler", "İş ve devir"] as const).map(
          (x) => (
            <button
              key={x}
              role="tab"
              aria-selected={tab === x}
              className={tab === x ? "active" : ""}
              onClick={() => setTab(x)}
            >
              {x}
            </button>
          ),
        )}
      </div>

      {tab === "Mahsup" && (
        <section className="acct-section">
          <p className="muted">
            {b.company} firmasının onaylı hakedişleri barter bedelinden düşülür;
            mahsup kasadan ödeme oluşturmaz.
          </p>
          {candidates.length > 0 && (
            <ul className="firm-requests">
              {candidates.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setReqOpen(r.id)}>
                    <span className="cc-list-main">
                      <b>
                        {r.id} · {r.name}
                      </b>
                      <small>
                        {money(r.amount)} · mahsup{" "}
                        {money(offsetFor(state, r.id))} · nakit{" "}
                        {money(netPayable(state, r))}
                      </small>
                    </span>
                    <Badge
                      tone={
                        requestStatus(state, r) === "Onay bekliyor"
                          ? "amber"
                          : requestStatus(state, r) === "Onaylandı"
                            ? "info"
                            : "green"
                      }
                    >
                      {requestStatus(state, r)}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {req && left > 0 ? (
            !confirm ? (
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valid) setConfirm(true);
                }}
              >
                <div className="form-grid">
                  <label className="full">
                    Onaylı, ödenmemiş hakediş
                    <select
                      value={req.id}
                      onChange={(e) => {
                        setReqId(e.target.value);
                        const r = eligible.find(
                          (r) => r.id === e.target.value,
                        )!;
                        setAmount(String(Math.min(left, netPayable(state, r))));
                      }}
                    >
                      {eligible.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.id} · {r.name} · nakit kalan{" "}
                          {money(netPayable(state, r))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mahsup tutarı (TL)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={maxOffset}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    En fazla
                    <input value={money(maxOffset)} readOnly />
                  </label>
                </div>
                {!valid && amount !== "" && (
                  <p className="form-error">
                    Tutar 0’dan büyük olmalı ve {money(maxOffset)} tutarını
                    aşmamalı.
                  </p>
                )}
                <div className="form-actions">
                  <button
                    className="btn primary"
                    type="submit"
                    disabled={!valid}
                  >
                    Devam et
                  </button>
                </div>
              </form>
            ) : (
              <div className="inline-form confirm-box">
                <h3>Mahsubu onayla</h3>
                <ul className="confirm-list">
                  <li>
                    {req.id} hakedişinin nakit ödenecek kısmı{" "}
                    <b>{money(netPayable(state, req))}</b> →{" "}
                    <b>{money(netPayable(state, req) - n)}</b>
                  </li>
                  <li>
                    Barter kalan yükümlülüğü <b>{money(left)}</b> →{" "}
                    <b>{money(left - n)}</b>
                  </li>
                  <li>
                    Proje kasası değişmez; tahsilat veya satış geliri oluşmaz.
                  </li>
                </ul>
                <div className="form-actions">
                  <button className="btn" onClick={() => setConfirm(false)}>
                    Geri
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => {
                      if (
                        act({
                          type: "barter-offset",
                          barterId: b.id,
                          requestId: req.id,
                          amount: n,
                        })
                      ) {
                        setConfirm(false);
                        setAmount("");
                      }
                    }}
                  >
                    {money(n)} mahsubu kaydet
                  </button>
                </div>
              </div>
            )
          ) : (
            <p className="callout">
              {left <= 0
                ? "Barter bedelinin tamamı hakedişlere mahsup edildi."
                : candidates.length
                  ? "Bu firmanın şu anda açık (onaylı ve ödenmemiş) hakedişi yok; diğer hakedişleri onay bekliyor, ödendi veya mahsupla kapandı."
                  : "Bu firmaya ait hakediş bulunmuyor. Hakediş yönetiminden aynı firma adıyla hakediş oluşturun."}{" "}
              <Link href="/operasyon">Hakediş yönetimi →</Link>
            </p>
          )}
          {history.length > 0 && (
            <div className="e-table-wrap drawer-table">
              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Hakediş</th>
                    <th className="numeric">Mahsup</th>
                    <th className="numeric">Hakediş nakit kalan</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((o) => {
                    const r = requestList(state).find(
                      (r) => r.id === o.requestId,
                    );
                    return (
                      <tr key={o.id}>
                        <td>{date(o.date)}</td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => setReqOpen(o.requestId)}
                          >
                            {o.requestId}
                          </button>
                          <small>
                            {r?.name} · {r ? requestStatus(state, r) : ""}
                          </small>
                        </td>
                        <td className="numeric">{money(o.amount)}</td>
                        <td className="numeric">
                          {r ? money(r.amount - offsetFor(state, r.id)) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "İş ve devir" && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            act({
              type: "barter-progress",
              id: b.id,
              progress: Number(progress),
              transfer,
            });
          }}
        >
          <h3>İş ilerlemesi ve daire devri</h3>
          <div className="form-grid">
            <label>
              İş tamamlanma yüzdesi
              <input
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                required
              />
            </label>
            <label>
              Daire devir durumu
              <select
                value={transfer}
                onChange={(e) => setTransfer(e.target.value)}
              >
                <option>Bekliyor</option>
                <option>Devir sürecinde</option>
                <option>Devredildi</option>
              </select>
            </label>
          </div>
          {needsTransferConfirm && (
            <p className="callout">
              “Devredildi” tapu devrinin tamamlandığını gösterir.{" "}
              {Number(progress) < 100 || left > 0
                ? `İş %${progress} tamamlandı ve ${money(left)} yükümlülük açık; devirden önce kontrol edin.`
                : "İş ve yükümlülük tamamlandı."}
            </p>
          )}
          <div className="form-actions">
            <button className="btn primary">
              {needsTransferConfirm
                ? "Devri onayla ve kaydet"
                : "Durumu güncelle"}
            </button>
          </div>
        </form>
      )}

      {tab === "Sözleşme ve belgeler" && (
        <section className="acct-section">
          <RecordDocuments
            records={[b.id, `unit:${b.unitId}`]}
            project={b.project}
            uploadHref={`/arsiv?record=${encodeURIComponent(b.id)}&project=${b.project}`}
          />
        </section>
      )}
      <AuditTrail
        items={state.audit.filter(
          (a) =>
            a.entity === b.id || history.some((o) => o.requestId === a.entity),
        )}
      />
      {reqOpen && (
        <RequestPanel
          key={reqOpen}
          id={reqOpen}
          onClose={() => setReqOpen(null)}
        />
      )}
    </>
  );
}
