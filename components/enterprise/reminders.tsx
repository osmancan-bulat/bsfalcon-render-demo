"use client";
import { viewCode } from "@/lib/currency";
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
const OWNERS = ["Genel müdür", ...ADVISORS, "Finans ve tahsilat", "Şantiye ve hakediş"];
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
          "Yerel arşiv okunamadığı için belge bitiş hatırlatmaları gösterilemiyor.",
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
        kind: "Taksit",
        due: i.due,
        amount: outstanding(state, i),
        href: `/satis-tahsilat?q=${encodeURIComponent(cs.find((c) => c.id === i.customerId)?.name ?? "")}`,
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
          kind: "Peşinat",
          due: next?.due ?? c.depositDue ?? SNAPSHOT,
          amount: (c.depositExpected ?? c.deposit) - c.deposit,
        };
      }),
    ...requestList(state)
      .filter(
        (r) => !["Ödendi", "İade edildi"].includes(requestStatus(state, r)),
      )
      .map((r) => ({
        id: r.id,
        project: r.project,
        title: `${r.company} · ${r.name}`,
        kind: r.type,
        due: r.due,
        amount: r.amount,
        href: r.type === "Hakediş" ? "/operasyon" : "/satinalma",
      })),
    ...state.barters
      .filter((b) => b.progress < 100)
      .map((b) => ({
        id: b.id,
        project: b.project,
        title: `${b.company} · ${b.work}`,
        kind: "Barter bitişi",
        due: b.end,
        href: "/barter",
      })),
    ...files
      .filter((f) => f.expiry)
      .map((f) => ({
        id: f.id,
        project: f.project,
        title: f.name,
        kind: "Sözleşme bitişi",
        due: f.expiry,
        href: `/arsiv?record=${encodeURIComponent(f.record)}&project=${f.project}`,
      })),
    ...state.reminders.map((r) => ({
      ...r,
      kind: "Özel hatırlatma",
      custom: true,
    })),
  ].filter((r) => project === "all" || r.project === project);
  const cutoff = "2026-11-30",
    open = entries.filter((r) => !r.done),
    rows = entries
      .filter(
        (r) =>
          r.title.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")) &&
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
        title="Hatırlatmalar"
        description="Taksit, peşinat, iş ve sözleşme tarihlerinin ortak takip ekranı."
        actions={
          <button className="btn primary" onClick={() => setCreate(true)}>
            <Plus size={16} />
            Özel hatırlatma
          </button>
        }
      />
      <p className="callout">
        Uygulama içi takip · Demo tarihi: 15 Kasım 2026. SMS, e-posta ve
        WhatsApp gönderimi bağlı değildir. Hatırlatmalar uygulama açıldığında
        hesaplanır.
      </p>
      {archiveError && <p role="alert">{archiveError}</p>}
      <div className="e-kpis three">
        <Kpi
          label="Geciken kayıt"
          value={String(open.filter((r) => r.due < SNAPSHOT).length)}
          sub="Ödenmemiş / tamamlanmamış"
          icon={<BellRing size={20} />}
        />
        <Kpi
          label="Ay sonuna kadar"
          value={String(
            open.filter((r) => r.due >= SNAPSHOT && r.due <= cutoff).length,
          )}
          sub="Yaklaşan ödeme ve iş tarihleri"
          icon={<Clock size={20} />}
        />
        <Kpi
          label="Bekleyen peşinat"
          value={money(
            open
              .filter((r) => r.kind === "Peşinat")
              .reduce((a, r) => a + (r.amount ?? 0), 0),
          )}
          sub="Kısmi peşinat tahsilatı desteklenir"
          icon={<BellRing size={20} />}
        />
      </div>
      <Panel
        title="Takip listesi"
        subtitle="Kaynak kayıtlar değiştikçe otomatik güncellenir"
      >
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            placeholder="Müşteri, firma veya hatırlatma ara…"
          />
          <select
            aria-label="Hatırlatma türü"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tüm türler</option>
            {[
              "Taksit",
              "Peşinat",
              "Hakediş",
              "Satın alma",
              "Barter bitişi",
              "Sözleşme bitişi",
              "Özel hatırlatma",
            ].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select
            aria-label="Hatırlatma dönemi"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setPage(0);
            }}
          >
            <option value="upcoming">Bu ay ve gecikenler</option>
            <option value="late">Gecikenler</option>
            <option value="all">Tüm açık kayıtlar</option>
            <option value="done">Tamamlanan özel notlar</option>
          </select>
        </div>
        {rows.length ? (
          <div className="e-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Konu / proje</th>
                  <th>Tür</th>
                  <th>Tarih</th>
                  <th className="numeric">Tutar</th>
                  <th>Durum / işlem</th>
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
                          {"owner" in r && r.owner ? ` · Sorumlu: ${r.owner}` : ""}
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
                            ? "Tamamlandı"
                            : r.due < SNAPSHOT
                              ? "Gecikmiş"
                              : "Yaklaşıyor"}
                        </Badge>
                        {r.custom ? (
                          <button
                            className="btn compact"
                            onClick={() =>
                              act({ type: "reminder-done", id: r.id })
                            }
                          >
                            {r.done ? "Yeniden aç" : "Tamamla"}
                          </button>
                        ) : r.customerId ? (
                          <button
                            className="btn compact"
                            onClick={() => setDeposit(r)}
                          >
                            Peşinat tahsil et
                          </button>
                        ) : (
                          <Link
                            className="btn compact"
                            href={r.href ?? "/evrak"}
                          >
                            Kaydı aç
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
                  / {rows.length} kayıt
                </span>
                <div>
                  <button
                    aria-label="Önceki sayfa"
                    disabled={page === 0}
                    onClick={() => setPage(Math.max(0, page - 1))}
                  >
                    ‹
                  </button>
                  <button
                    aria-label="Sonraki sayfa"
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
          <Empty title="Bu filtrede hatırlatma yok" />
        )}
      </Panel>
      <Drawer
        open={create}
        title="Yeni hatırlatma"
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
              Hatırlatma konusu
              <input name="title" required maxLength={200} />
            </label>
            <label>
              Proje
              <select name="project" defaultValue={project}>
                {[
                  <option key="all" value="all">
                    Tüm projeler
                  </option>,
                  ...projects.filter((p) => p.status !== "Arşiv").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  )),
                ]}
              </select>
            </label>
            <label>
              Hatırlatma tarihi
              <input type="date" name="due" required defaultValue={SNAPSHOT} />
            </label>
            <label className="full">
              Sorumlu
              <select name="owner" defaultValue="">
                <option value="">Belirtilmedi</option>
                {OWNERS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <small className="muted">
                Demo: sorumlu yalnızca etiket olarak kaydedilir; bildirim gönderilmez, kullanıcı
                hesabı yoktur.
              </small>
            </label>
          </div>
          <button className="btn primary">Hatırlatmayı kaydet</button>
        </form>
      </Drawer>
      <Drawer
        open={!!deposit}
        title="Peşinat tahsilatı"
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
              {deposit.title} · Kalan {money(deposit.amount ?? 0)}
            </p>
            <label className="form-label">
              Tahsil edilen peşinat ({viewCode()})
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
            <button className="btn primary">Peşinatı kaydet</button>
          </form>
        )}
      </Drawer>
    </>
  );
}
