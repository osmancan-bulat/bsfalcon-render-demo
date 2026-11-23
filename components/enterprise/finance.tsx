"use client";
import { useState } from "react";
import {
  Download,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useApp } from "./context";
import {
  SectionTitle,
  Kpi,
  Panel,
  Status,
  SearchBox,
  Badge,
  Empty,
} from "./shared";
import { CashChart } from "./charts";
import RequestPanel from "./request-panel";
import {
  summary,
  requestList,
  requestStatus,
  netPayable,
  installmentList,
  customerList,
  pname,
  paidDate,
} from "@/lib/enterprise";
import { money, compact, date } from "@/lib/data";
import { csvDownload } from "@/lib/export";
export default function Finance() {
  const { state, project } = useApp();
  const [tab, setTab] = useState("Ödeme planı"),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const s = summary(state, project);
  const requests = requestList(state).filter(
    (r) =>
      (project === "all" || r.project === project) &&
      ["Onaylandı", "Ödendi", "Mahsup edildi"].includes(
        requestStatus(state, r),
      ),
  );
  const ins = installmentList(state),
    cs = customerList(state);
  const ledger = [
    ...state.receipts
      .filter((r) =>
        ins.some(
          (i) =>
            i.id === r.installmentId &&
            (project === "all" || i.project === project),
        ),
      )
      .map((r) => {
        const i = ins.find((i) => i.id === r.installmentId)!;
        return {
          id: r.id,
          description: cs.find((c) => c.id === i.customerId)?.name ?? "",
          project: i.project,
          date: r.date,
          amount: r.amount,
          type: "Tahsilat",
          reference: r.reference,
        };
      }),
    // İptal edilen tahsilatlar kasadan iptal tarihinde ters kayıt olarak düşer (asıl kayıt silinmez).
    ...state.receipts
      .filter((r) => r.reversal && ins.some((i) => i.id === r.installmentId && (project === "all" || i.project === project)))
      .map((r) => {
        const i = ins.find((i) => i.id === r.installmentId)!;
        return {
          id: `${r.id}-İPT`,
          description: cs.find((c) => c.id === i.customerId)?.name ?? "",
          project: i.project,
          date: r.reversal!.date,
          amount: -r.amount,
          type: "Tahsilat iptali",
          reference: r.reversal!.reason,
        };
      }),
    ...requests
      .filter((r) => requestStatus(state, r) === "Ödendi")
      .map((r) => ({
        id: r.id,
        description: r.company,
        project: r.project,
        // Gerçek ödeme tarihi; kaydı yoksa boş (vade tarihi ödeme tarihi gibi gösterilmez)
        date: paidDate(state, r.id) ?? "",
        amount: -netPayable(state, r),
        type: "Ödeme",
        reference: `${r.name} · vade ${date(r.due)}`,
      })),
    ...state.depositPayments
      .filter((p) =>
        cs.some(
          (c) =>
            c.id === p.customerId &&
            (project === "all" || c.project === project),
        ),
      )
      .map((p) => ({
        id: p.id,
        description: cs.find((c) => c.id === p.customerId)!.name,
        project: cs.find((c) => c.id === p.customerId)!.project,
        date: p.date,
        amount: p.amount,
        type: "Peşinat",
        reference: "Peşinat tahsilatı",
      })),
    ...state.depositPayments
      .filter((p) => p.reversal && cs.some((c) => c.id === p.customerId && (project === "all" || c.project === project)))
      .map((p) => ({
        id: `${p.id}-İPT`,
        description: cs.find((c) => c.id === p.customerId)!.name,
        project: cs.find((c) => c.id === p.customerId)!.project,
        date: p.reversal!.date,
        amount: -p.amount,
        type: "Peşinat iptali",
        reference: p.reversal!.reason,
      })),
    ...state.contracts
      .filter((c) => project === "all" || c.project === project)
      .map((c) => ({
        id: `PES-${c.id}`,
        description: c.name,
        project: c.project,
        date: c.depositDate ?? "2026-11-15",
        amount:
          c.deposit -
          state.depositPayments
            .filter((p) => p.customerId === c.id && !p.reversal)
            .reduce((a, p) => a + p.amount, 0),
        type: "Peşinat",
        reference: "Yeni satış peşinatı",
      })),
  ]
    .filter((r) => r.amount !== 0)
    .sort((a, b) => (b.date || "0").localeCompare(a.date || "0"));
  const rows = requests
    .filter((r) =>
      (r.company + r.name + r.id)
        .toLocaleLowerCase("tr")
        .includes(q.toLocaleLowerCase("tr")),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <>
      <SectionTitle
        title="Finans & kasa"
        description="Tahsilat, onaylı yükümlülükler ve kasa hareketleri arasında tam bağlantı."
        actions={
          <button
            className="btn"
            onClick={() =>
              csvDownload(
                [
                  [
                    "Kod",
                    "Açıklama",
                    "Proje",
                    "Tür",
                    "Tutar",
                    "Tarih",
                    "Referans",
                  ],
                  ...ledger.map((l) => [
                    l.id,
                    l.description,
                    pname(l.project),
                    l.type,
                    l.amount,
                    l.date,
                    l.reference,
                  ]),
                ],
                "ceycon-finans-hareketleri.csv",
              )
            }
          >
            <Download size={16} /> Hareketleri indir
          </button>
        }
      />
      <div className="e-kpis">
        <Kpi
          label="Kullanılabilir demo kasa"
          value={compact(s.cash)}
          sub={`${compact(s.opening)} ay başı bakiyesi (temsili açılış)`}
          icon={<Wallet size={19} />}
          tag="TRY"
        />
        <Kpi
          label="Kasım tahsilatı"
          value={compact(s.received)}
          sub="Bu ay kaydedilen taksit tahsilatı"
          icon={<ArrowDownLeft size={19} />}
          progress={(s.received / s.planned) * 100}
        />
        <Kpi
          label="Ödeme bekleyen"
          value={compact(s.payable)}
          sub="Yönetici onaylı yükümlülükler"
          icon={<Clock size={19} />}
          tone="amber"
        />
        <Kpi
          label="Gerçekleşen ödeme"
          value={compact(s.paid)}
          sub="Kasa bakiyesinden düşülen tutar"
          icon={<ArrowUpRight size={19} />}
        />
      </div>
      <div className="e-grid finance-grid">
        <Panel
          title="Tahsilat planı / gerçekleşen"
          subtitle="Kasım 2026 · haftalık dağılım"
        >
          <CashChart state={state} project={project} />
        </Panel>
        <Panel
          title="Bütçe kontrolü (temsili)"
          subtitle="Bütçe ve maliyet tutarları demo varsayımıdır; kayıtlardan hesaplanmaz"
        >
          <div className="budget-overview">
            <div>
              <span>Toplam proje bütçesi</span>
              <b>{compact(s.budget)}</b>
            </div>
            <div>
              <span>Maliyet varsayımı</span>
              <b>{compact(s.cost)}</b>
            </div>
            <div className="budget-meter">
              <i style={{ width: `${(s.cost / s.budget) * 100}%` }} />
            </div>
            <div>
              <small>Bütçe kullanımı</small>
              <strong>%{Math.round((s.cost / s.budget) * 100)}</strong>
            </div>
            <div className="budget-remaining">
              <span>Kalan bütçe</span>
              <b>{compact(s.budget - s.cost)}</b>
            </div>
            <p>
              Bu panel temsili bütçe varsayımını gösterir. Kayıtlı hakediş,
              ödeme ve tahsilatlar için Raporlama merkezini kullanın; ödeme
              yalnızca nakit hareketi yaratır, maliyeti ikinci kez artırmaz.
            </p>
          </div>
        </Panel>
      </div>
      <Panel>
        <div className="e-tabs">
          {["Ödeme planı", "Kasa hareketleri"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="e-toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Firma, müşteri veya işlem ara…"
          />
          <Badge tone="neutral">
            {tab === "Ödeme planı"
              ? "Yalnızca onaylı işlemler"
              : "Tüm kayıtlı hareketler · yeniden eskiye"}
          </Badge>
        </div>
        <div className="e-table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  {tab === "Ödeme planı" ? "Firma / işlem" : "İşlem / kişi"}
                </th>
                <th>Proje</th>
                <th>Tarih</th>
                <th className="numeric">Tutar</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tab === "Ödeme planı"
                ? rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.company}</b>
                        <small>
                          {r.name} · {r.id}
                        </small>
                      </td>
                      <td>{pname(r.project)}</td>
                      <td>{date(r.due)}</td>
                      <td className="numeric">
                        {money(netPayable(state, r))}
                        {netPayable(state, r) !== r.amount && (
                          <small>Brüt {money(r.amount)} · barter mahsubu</small>
                        )}
                      </td>
                      <td>
                        <Status status={requestStatus(state, r)} />
                      </td>
                      <td>
                        <button
                          className="btn compact"
                          onClick={() => setSelected(r.id)}
                        >
                          {requestStatus(state, r) === "Ödendi"
                            ? "Kaydı incele"
                            : "Ödeme işlemi"}{" "}
                          <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                : ledger
                    .filter((l) =>
                      (l.description + l.reference + l.id)
                        .toLocaleLowerCase("tr")
                        .includes(q.toLocaleLowerCase("tr")),
                    )
                    .map((l) => (
                      <tr key={l.id}>
                        <td>
                          <b>{l.description}</b>
                          <small>
                            {l.id} · {l.reference}
                          </small>
                        </td>
                        <td>{pname(l.project)}</td>
                        <td>{l.date ? date(l.date) : "Tarih kaydı yok"}</td>
                        <td
                          className={l.amount > 0 ? "green-text" : "red-text"}
                        >
                          {l.amount > 0 ? "+" : ""}
                          {money(l.amount)}
                        </td>
                        <td>
                          <Badge tone={l.amount > 0 ? "green" : "neutral"}>
                            {l.type}
                          </Badge>
                        </td>
                        <td />
                      </tr>
                    ))}
            </tbody>
          </table>
          {tab === "Ödeme planı" && !rows.length && (
            <Empty
              title="Onaylanmış ödeme bulunmuyor"
              detail="Hakediş veya satın alma onaylandığında burada görünür."
            />
          )}
        </div>
        <div className="e-table-note">
          Nakit bakiyesi = ay başı bakiyesi + bu ayki tahsilat ve yeni
          peşinatlar − kaydedilen ödemeler.
        </div>
      </Panel>
      {selected && (
        <RequestPanel
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
