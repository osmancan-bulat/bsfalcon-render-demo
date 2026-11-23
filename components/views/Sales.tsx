"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  UsersRound,
  Wallet,
  Clock,
  TriangleAlert,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import { useApp } from "../enterprise/context";
import {
  SectionTitle,
  Kpi,
  Panel,
  Badge,
  Status,
  SearchBox,
  Empty,
  Drawer,
  Progress,
} from "../enterprise/shared";
import CustomerPanel from "../enterprise/customer-panel";
import NewSaleForm from "../enterprise/sale-form";
import ContractsTab from "../enterprise/contracts-tab";
import PaymentsTab from "../enterprise/payments-tab";
import { unitById } from "@/lib/units";
import {
  PAYMENT_STATUSES,
  paymentRows,
  type PaymentStatus,
  activeReceipts,
} from "@/lib/enterprise";
import {
  projects,
  summary,
  customerList,
  installmentList,
  outstanding,
  reservedUnits,
  pname,
  SNAPSHOT,
} from "@/lib/enterprise";
import { money, compact, date } from "@/lib/data";
import { csvDownload } from "@/lib/export";
export default function Sales() {
  const { state, project, act } = useApp();
  const [tab, setTab] = useState("Müşteriler"),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(0),
    [sort, setSort] = useState("default"),
    [customer, setCustomer] = useState<string | null>(null),
    [unit, setUnit] = useState<string | null>(null),
    [contract, setContract] = useState(false),
    [saleType, setSaleType] = useState("cash"),
    [payStatus, setPayStatus] = useState<PaymentStatus | undefined>(undefined);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setQ(p.get("q") ?? "");
    const tabs: Record<string, string> = {
      envanter: "Konut envanteri",
      taksit: "Taksit & peşinat",
      sozlesmeler: "Sözleşmeler",
    };
    const sekme = p.get("sekme");
    if (sekme && tabs[sekme]) setTab(tabs[sekme]);
    if (p.get("filtre") === "gecikmis") {
      setFilter("late");
      setPayStatus("Gecikti");
    }
    const durum = p.get("durum");
    if (durum && (PAYMENT_STATUSES as readonly string[]).includes(durum))
      setPayStatus(durum as PaymentStatus);
    const u = p.get("unit");
    if (u && unitById(u)) {
      setTab("Konut envanteri");
      setUnit(u);
    }
  }, []);
  const s = summary(state, project),
    all = customerList(state).filter(
      (c) => project === "all" || c.project === project,
    ),
    ins = installmentList(state),
    late = (id: string) =>
      ins.some(
        (i) =>
          i.customerId === id && i.due < SNAPSHOT && outstanding(state, i) > 0,
      );
  const cs = all
    .filter(
      (c) =>
        (c.name + " " + c.unit)
          .toLocaleLowerCase("tr")
          .includes(q.toLocaleLowerCase("tr")) &&
        (filter === "all" || (filter === "late" ? late(c.id) : !late(c.id))),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "tr")
        : sort === "price"
          ? b.price - a.price
          : 0,
    );
  const rows = ins
    .filter(
      (i) =>
        all.some((c) => c.id === i.customerId) &&
        i.due.startsWith("2026-11") &&
        (
          all.find((c) => c.id === i.customerId)!.name +
          " " +
          all.find((c) => c.id === i.customerId)!.unit
        )
          .toLocaleLowerCase("tr")
          .includes(q.toLocaleLowerCase("tr")) &&
        (filter === "all" ||
          (filter === "paid"
            ? outstanding(state, i) === 0
            : filter === "late"
              ? i.due < SNAPSHOT && outstanding(state, i) > 0
              : i.due >= SNAPSHOT && outstanding(state, i) > 0)),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  const items = tab === "Müşteriler" ? cs : rows;
  const maxPage = Math.max(0, Math.ceil(items.length / 8) - 1);
  const shownPage = Math.min(page, maxPage);
  const unitProject = projects.find((p) => p.id === unit?.split("-")[0]);
  const isReserved =
    unitProject && reservedUnits(state, unitProject.id).includes(unit!);
  function exportList() {
    csvDownload(
      [
        [
          "Müşteri",
          "Proje",
          "Konut",
          "Sözleşme",
          "Tahsil edilen",
          "Kalan alacak",
        ],
        ...cs.map((c) => {
          const paid =
            c.deposit +
            c.paidMonths * c.installment +
            activeReceipts(state)
              .filter((r) =>
                ins.some(
                  (i) => i.customerId === c.id && i.id === r.installmentId,
                ),
              )
              .reduce((a, r) => a + r.amount, 0);
          return [
            c.name,
            pname(c.project),
            c.unit,
            c.price,
            paid,
            c.price - paid,
          ];
        }),
      ],
      "ceycon-satis-listesi.csv",
    );
  }
  return (
    <>
      <SectionTitle
        title="Satış & envanter"
        description="Konut envanterinden son taksite kadar, her müşteri tek bir hesapta."
        actions={
          <>
            <button className="btn" onClick={exportList}>
              <Download size={16} /> Dışa aktar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setTab("Konut envanteri");
                setContract(false);
                setUnit(null);
              }}
            >
              <Plus size={17} /> Yeni satış
            </button>
          </>
        }
      />
      <div className="e-kpis">
        <Kpi
          label="Nakit satışlı konut"
          value={String(s.sold)}
          sub={`${s.total} konut · ${s.barterCount} barter konut ayrıca izlenir`}
          tag={`%${Math.round((s.sold / s.total) * 100)} satıldı`}
          progress={(s.sold / s.total) * 100}
          icon={<Building2 size={19} />}
        />
        <Kpi
          label="Tahsil edilen"
          value={compact(s.collected)}
          sub="Peşinat ve tüm taksitler"
          progress={(s.collected / s.revenue) * 100}
          icon={<Wallet size={19} />}
        />
        <Kpi
          label="Kasım kalan tahsilat"
          value={compact(s.month)}
          sub={`${compact(s.received)} bu ay tahsil edildi`}
          icon={<Clock size={19} />}
        />
        <Kpi
          label="Gecikmiş alacak"
          value={money(s.overdueTotal)}
          sub={`${
            new Set(
              paymentRows(state)
                .filter(
                  (r) =>
                    r.status === "Gecikti" &&
                    (project === "all" || r.project === project),
                )
                .map((r) => r.customerId),
            ).size
          } müşteri · taksit ve peşinat`}
          icon={<TriangleAlert size={19} />}
          tone="red"
        />
      </div>
      <Panel>
        <div className="e-tabs">
          {[
            "Müşteriler",
            "Sözleşmeler",
            "Taksit & peşinat",
            "Konut envanteri",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => {
                setTab(t);
                setFilter("all");
                setPage(0);
              }}
            >
              {t}
              {t === "Müşteriler" && <small>{all.length}</small>}
            </button>
          ))}
        </div>
        {tab === "Sözleşmeler" && (
          <ContractsTab
            project={project}
            onOpen={setCustomer}
            initialQuery={q}
            key={q}
          />
        )}
        {tab === "Taksit & peşinat" && (
          <PaymentsTab key={payStatus ?? "all"} initialStatus={payStatus} />
        )}
        {tab === "Müşteriler" && (
          <>
            <div className="e-toolbar">
              <SearchBox
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setPage(0);
                }}
                placeholder="Müşteri adı veya daire numarası…"
              />
              <select
                aria-label="Ödeme durumu filtresi"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Tüm ödeme durumları</option>
                <option value="late">Gecikmiş ödeme</option>
                <option value="regular">
                  {tab === "Müşteriler" ? "Düzenli ödeme" : "Yaklaşan taksit"}
                </option>
                {tab !== "Müşteriler" && (
                  <option value="paid">Tahsil edildi</option>
                )}
              </select>
              {tab === "Müşteriler" && (
                <select
                  aria-label="Sıralama"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="default">Konut sırası</option>
                  <option value="name">İsim A–Z</option>
                  <option value="price">Sözleşme tutarı ↓</option>
                </select>
              )}
            </div>
            <div className="e-table-wrap">
              <table>
                <thead>
                  {tab === "Müşteriler" ? (
                    <tr>
                      <th>Müşteri / konut</th>
                      <th>Proje</th>
                      <th>Sözleşme tutarı</th>
                      <th>Tahsilat</th>
                      <th>Ödeme durumu</th>
                      <th />
                    </tr>
                  ) : (
                    <tr>
                      <th>Müşteri / konut</th>
                      <th>Vade tarihi</th>
                      <th>Taksit tutarı</th>
                      <th className="numeric">Kalan tutar</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  )}
                </thead>
                <tbody>
                  {tab === "Müşteriler"
                    ? cs.slice(shownPage * 8, shownPage * 8 + 8).map((c) => {
                        const paid =
                          c.deposit +
                          c.paidMonths * c.installment +
                          activeReceipts(state)
                            .filter((r) =>
                              ins.some(
                                (i) =>
                                  i.customerId === c.id &&
                                  i.id === r.installmentId,
                              ),
                            )
                            .reduce((a, r) => a + r.amount, 0);
                        return (
                          <tr key={c.id}>
                            <td>
                              <button
                                className="customer-cell"
                                onClick={() => setCustomer(c.id)}
                              >
                                <span className="avatar muted">
                                  {c.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")}
                                </span>
                                <span>
                                  <b>{c.name}</b>
                                  <small>
                                    {c.unit} · {c.owner ?? "Satış ekibi"}
                                  </small>
                                </span>
                              </button>
                            </td>
                            <td>{pname(c.project)}</td>
                            <td className="numeric">{money(c.price)}</td>
                            <td>
                              <div className="table-finance">
                                <b>{money(paid)}</b>
                                <Progress value={(paid / c.price) * 100} />
                              </div>
                            </td>
                            <td>
                              <Status
                                status={
                                  late(c.id)
                                    ? "Gecikmiş ödeme"
                                    : "Düzenli ödeme"
                                }
                              />
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                aria-label={`${c.name} hesabını aç`}
                                onClick={() => setCustomer(c.id)}
                              >
                                <ArrowUpRight size={17} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    : rows.slice(shownPage * 8, shownPage * 8 + 8).map((i) => {
                        const c = all.find((c) => c.id === i.customerId)!,
                          remain = outstanding(state, i);
                        return (
                          <tr key={i.id}>
                            <td>
                              <button
                                className="table-link"
                                onClick={() => setCustomer(c.id)}
                              >
                                <b>{c.name}</b>
                                <small>
                                  {pname(c.project)} · {c.unit}
                                </small>
                              </button>
                            </td>
                            <td>{date(i.due)}</td>
                            <td>{money(i.amount)}</td>
                            <td>{money(remain)}</td>
                            <td>
                              <Status
                                status={
                                  remain === 0
                                    ? "Tahsil edildi"
                                    : remain < i.amount
                                      ? "Kısmi ödeme"
                                      : i.due < SNAPSHOT
                                        ? "Gecikmiş"
                                        : "Planlandı"
                                }
                              />
                            </td>
                            <td>
                              <button
                                className="btn compact"
                                onClick={() => setCustomer(c.id)}
                              >
                                {remain ? "Tahsilat işlemi" : "Hesabı aç"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
              {items.length === 0 && (
                <Empty
                  title="Eşleşen kayıt bulunamadı"
                  detail="Arama veya ödeme durumu filtresini değiştirin."
                />
              )}
            </div>
            <div className="e-pagination">
              <span>
                {items.length} kayıttan {items.length ? shownPage * 8 + 1 : 0}–
                {Math.min(shownPage * 8 + 8, items.length)} gösteriliyor
              </span>
              <div>
                <button
                  aria-label="Önceki sayfa"
                  disabled={shownPage === 0}
                  onClick={() => setPage(shownPage - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  {shownPage + 1} / {maxPage + 1}
                </span>
                <button
                  aria-label="Sonraki sayfa"
                  disabled={shownPage === maxPage}
                  onClick={() => setPage(shownPage + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
        {tab === "Konut envanteri" && (
          <div className="e-inventory">
            <div className="inventory-explainer">
              <span>Satış veya rezervasyon için bir konut seçin.</span>
              <div>
                <Badge>Satıldı</Badge>
                <Badge tone="amber">Rezerve / Barter</Badge>
                <Badge tone="neutral">Satışa uygun</Badge>
              </div>
            </div>
            {projects
              .filter((p) => project === "all" || p.id === project)
              .map((p) => (
                <section key={p.id}>
                  <div className="flex-between">
                    <h3>{p.name}</h3>
                    <small>
                      {p.id === "corner"
                        ? "72 konut · demo envanteri"
                        : "106 konut · 100 × 1+1, 6 × 2+1"}
                    </small>
                  </div>
                  <div className="e-unit-grid">
                    {Array.from({ length: p.total }, (_, i) => {
                      const id = `${p.id}-${i + 1}`,
                        c = all.find((c) => c.id === id),
                        barter = state.barters.find((b) => b.unitId === id),
                        draft = state.drafts.some((d) => d.id === id),
                        reserved = reservedUnits(state, p.id).includes(id);
                      return (
                        <button
                          key={id}
                          className={
                            c
                              ? "sold"
                              : barter || draft
                                ? "reserved"
                                : reserved
                                  ? "reserved"
                                  : "available"
                          }
                          aria-label={`${p.name} ${i + 1} numaralı konut ${c ? "satıldı" : barter ? "barter" : reserved ? "rezerve" : "uygun"}`}
                          onClick={() => {
                            if (barter) {
                              location.href = "/barter/";
                            } else if (draft) setTab("Sözleşmeler");
                            else if (c) setCustomer(c.id);
                            else {
                              setUnit(id);
                              setContract(false);
                            }
                          }}
                        >
                          <small>
                            {unitById(id)?.type} · {unitById(id)?.gross} m²
                          </small>
                          <b>{unitById(id)?.label}</b>
                          <span>
                            {c
                              ? "Satıldı"
                              : barter
                                ? "Barter"
                                : draft
                                  ? "Taslak"
                                  : reserved
                                    ? "Rezerve"
                                    : "Uygun"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        )}
      </Panel>
      {customer && (
        <CustomerPanel
          key={customer}
          id={customer}
          onClose={() => setCustomer(null)}
        />
      )}
      <Drawer
        open={!!unit}
        onClose={() => setUnit(null)}
        title={
          contract
            ? "Yeni satış sözleşmesi"
            : `${pname(unitProject?.id ?? "")} · Konut ${unit?.split("-")[1]}`
        }
        eyebrow="KONUT ENVANTERİ"
      >
        {unitProject && unit && (
          <>
            {!contract ? (
              <>
                <UnitFacts id={unit} />
                <Status status={isReserved ? "Rezerve" : "Satışa uygun"} />
                <label className="form-label">
                  Satış türü
                  <select
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value)}
                  >
                    <option value="cash">Nakit Satış</option>
                    <option value="barter">Barter / İş Karşılığı</option>
                  </select>
                </label>
                {saleType === "barter" ? (
                  <Link className="btn primary" href={`/barter?unit=${unit}`}>
                    Barter anlaşması oluştur
                  </Link>
                ) : (
                  <div className="form-actions">
                    <button
                      className="btn"
                      onClick={() => {
                        if (
                          act({
                            type: isReserved ? "release" : "reserve",
                            id: unit,
                          })
                        )
                          setUnit(null);
                      }}
                    >
                      {isReserved ? "Rezervasyonu kaldır" : "Rezerve et"}
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => setContract(true)}
                    >
                      Satış oluştur <ArrowUpRight size={16} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <NewSaleForm
                unitId={unit}
                onDone={(name) => {
                  setUnit(null);
                  setTab("Sözleşmeler");
                  setQ(name);
                  setFilter("all");
                  setPage(0);
                }}
              />
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

function UnitFacts({ id }: { id: string }) {
  const u = unitById(id);
  if (!u) return null;
  return (
    <dl className="cc-unit-facts">
      <div>
        <dt>Tip</dt>
        <dd>{u.type}</dd>
      </div>
      <div>
        <dt>Brüt / net</dt>
        <dd className="num">
          {u.gross} / {u.net} m²
        </dd>
      </div>
      <div>
        <dt>Kat</dt>
        <dd>{u.floorLabel}</dd>
      </div>
      <div>
        <dt>Cephe</dt>
        <dd>
          {u.facade}
          {u.corner ? " · köşe" : ""}
        </dd>
      </div>
      <div>
        <dt>Liste fiyatı</dt>
        <dd className="num">{money(u.listPrice)}</dd>
      </div>
      <div>
        <dt>m² fiyatı</dt>
        <dd className="num">{money(Math.round(u.listPrice / u.gross))}</dd>
      </div>
    </dl>
  );
}
