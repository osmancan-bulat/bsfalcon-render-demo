// Rapor içerikleri: ekranda (Raporlama) ve yazdırılabilir belgede (/belge?tur=rapor) aynı bileşen kullanılır.
import type { ReactNode } from "react";
import { pname, type EnterpriseState } from "@/lib/enterprise";
import {
  financialReport,
  salesReport,
  installmentReport,
  barterReport,
  subcontractorReport,
  managerReport,
  periodLabel,
  type ReportFilter,
  type ReportKind,
} from "@/lib/reports";
import { money, date } from "@/lib/data";

const pct = (n: number) => `%${(Math.round(n * 1000) / 10).toLocaleString("tr-TR")}`;
const monthName = (m: string) =>
  new Date(m + "-15T12:00:00").toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

function Figures({ title, note, items }: { title: string; note?: string; items: [string, string, string?, string?][] }) {
  return (
    <section className="rp-block">
      <h3>
        {title}
        {note && <small>{note}</small>}
      </h3>
      <dl className="rp-figures">
        {items.map(([k, v, sub, tone]) => (
          <div key={k} className={tone ?? ""}>
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
            {sub && <small>{sub}</small>}
          </div>
        ))}
      </dl>
    </section>
  );
}

function Table({
  title,
  note,
  head,
  rows,
  foot,
  numeric = [],
  empty = "Bu kapsamda kayıt yok.",
}: {
  title?: string;
  note?: string;
  head: string[];
  rows: ReactNode[][];
  foot?: ReactNode[];
  numeric?: number[];
  empty?: string;
}) {
  return (
    <section className="rp-block">
      {title && (
        <h3>
          {title}
          {note && <small>{note}</small>}
        </h3>
      )}
      {rows.length ? (
        <div className="e-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                {head.map((h, i) => (
                  <th key={h} className={numeric.includes(i) ? "numeric" : ""}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={numeric.includes(j) ? "numeric num" : ""}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {foot && (
              <tfoot>
                <tr>
                  {foot.map((c, j) => (
                    <td key={j} className={numeric.includes(j) ? "numeric num" : ""}>
                      {c}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <p className="rp-empty">{empty}</p>
      )}
    </section>
  );
}

const Bar = ({ value, max, tone = "" }: { value: number; max: number; tone?: string }) => (
  <span className={`rp-bar ${tone}`} aria-hidden>
    <i style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
  </span>
);

export default function ReportBody({ s, kind, f }: { s: EnterpriseState; kind: ReportKind; f: ReportFilter }) {
  const period = periodLabel(f);
  if (kind === "finans") {
    const a = financialReport(s, f);
    return (
      <>
        <Figures
          title="Alacak durumu"
          note="15 Kas 2026 itibarıyla · tarih filtresinden bağımsız"
          items={[
            ["Toplam sözleşmeli satış", money(a.contracted)],
            ["Toplam tahsil edilen", money(a.collected), `Tahsilat oranı ${pct(a.collectionRate)}`],
            ["Kalan alacak", money(a.balance)],
            ["Geciken alacak", money(a.overdue), `Taksit ${money(a.overdueInstallments)} · peşinat ${money(a.overdueDeposits)}`, a.overdue > 0 ? "danger" : ""],
          ]}
        />
        <Figures
          title="Nakit hareketi"
          note={`Dönem: ${period}`}
          items={[
            ["Kasaya giren", money(a.inflow), `Peşinat ${money(a.inflowDeposit)} · taksit ${money(a.inflowInstallment)} · ara ödeme ${money(a.inflowInterim)}`],
            ["Kasadan çıkan", money(a.outflow), "Ödenen hakediş ve satın almaların nakit kısmı · gerçek ödeme tarihine göre"],
            ["Net nakit akışı", money(a.net)],
            ["Onaylı, ödenmemiş", money(a.payableApproved), "Ödeme bekleyen nakit borç (durum)"],
          ]}
        />
        <Figures
          title="Nakit dışı barter etkisi"
          note="Kasaya giriş veya çıkış oluşturmaz"
          items={[
            ["Barter anlaşma değeri", money(a.barterValue), "Daire karşılığı alınan işler (durum)"],
            ["Dönemde mahsup edilen", money(a.barterOffset), `${a.barterOffsetCount} hakediş mahsubu · ${period}`],
            ["Kalan barter yükümlülüğü", money(a.barterRemaining), "Firmalara karşı yapılacak iş (durum)"],
          ]}
        />
        <Table
          title="Kasadan çıkan ödemeler"
          note={`Dönem ödemenin kaydedildiği güne göre belirlenir; hakediş vadesi bilgi içindir ve nakit çıkışı anlamına gelmez.${a.undatedPaidCount ? ` Ödeme tarihi kaydı olmayan ${a.undatedPaidCount} ödeme (${money(a.undatedPaidAmount)}) yalnızca “Tüm dönem” toplamında yer alır.` : ""}`}
          head={["Ödeme tarihi", "Hakediş vadesi", "Talep", "Firma", "Proje", "Tür", "Nakit (TL)"]}
          numeric={[6]}
          rows={a.outflowRows.map((r) => [r.paidAt ? date(r.paidAt) : "Kayıt yok", date(r.due), r.id, r.company, pname(r.project), r.type, money(r.amount)])}
          foot={["Toplam", "", "", "", "", "", money(a.outflow)]}
          empty="Bu dönemde ödenmiş hakediş veya satın alma yok."
        />
      </>
    );
  }
  if (kind === "satis") {
    const b = salesReport(s, f);
    return (
      <>
        <Table
          title="Projeye göre satışlar"
          note="Daire stoku ve satış bedelleri 15 Kas 2026 itibarıyla"
          head={["Proje", "Toplam", "Satılan", "İmza sürecinde", "Barter", "Rezerve", "Müsait", "Satış bedeli", "Tahsil edilen", "Tahsilat oranı"]}
          numeric={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
          rows={b.byProject.map((r) => [r.name, r.total, r.sold, r.inSigning, r.barter, r.reserved, r.available, money(r.value), money(r.collected), pct(r.rate)])}
          foot={b.byProject.length > 1 ? ["Toplam", b.total.total, b.total.sold, b.total.inSigning, b.total.barter, b.total.reserved, b.total.available, money(b.total.value), money(b.total.collected), pct(b.total.rate)] : undefined}
        />
        <Table
          title="Daire tiplerine göre"
          head={["Proje", "Tip", "Stok", "Satılan", "Müsait", "Doluluk", "Satış bedeli", "Ortalama satış", "Tahsilat oranı"]}
          numeric={[2, 3, 4, 6, 7, 8]}
          rows={b.byType.map((r) => [
            r.name,
            r.type,
            r.total,
            r.sold,
            r.available,
            <span className="rp-cell-bar" key="b">
              <Bar value={r.sold} max={r.total} /> {pct(r.total ? r.sold / r.total : 0)}
            </span>,
            money(r.value),
            r.sold ? money(r.avgPrice) : "—",
            r.sold ? pct(r.rate) : "—",
          ])}
        />
        <Table
          title="Dönemde imzalanan satış sözleşmeleri"
          note={`İmza tarihine göre · ${period} · ${b.signedInPeriod.length} sözleşme`}
          head={["İmza", "Sözleşme", "Müşteri", "Proje", "Daire", "Tip", "Bedel", "Tahsil edilen"]}
          numeric={[6, 7]}
          rows={b.signedInPeriod.slice(0, 40).map((r) => [date(r.signed), r.number, r.name, pname(r.project), r.unit, r.type, money(r.price), money(r.collected)])}
          foot={b.signedInPeriod.length > 40 ? [`+${b.signedInPeriod.length - 40} sözleşme daha (CSV dosyasında tam liste)`, "", "", "", "", "", "", ""] : undefined}
          empty="Bu dönemde imzalanan satış sözleşmesi yok."
        />
      </>
    );
  }
  if (kind === "taksit") {
    const c = installmentReport(s, f);
    const max = Math.max(...c.aging.map((a) => a.amount), 1);
    return (
      <>
        <Figures
          title="Özet"
          note={f.from || f.to ? `Vade tarihi: ${period}` : "Geciken: 15 Kas 2026 itibarıyla · yaklaşan: önümüzdeki 90 gün"}
          items={[
            ["Geciken alacak", money(c.overdueTotal), `${c.overdueCount} ödeme satırı · ${c.perCustomer.length} müşteri`, c.overdueTotal > 0 ? "danger" : ""],
            ["Yaklaşan tahsilat", money(c.upcomingTotal), `${c.upcomingCount} ödeme satırı`],
          ]}
        />
        <Table
          title="Gecikme yaşlandırması"
          note="Kısmi ödenen satırlarda yalnızca kalan tutar sayılır"
          head={["Gecikme", "Ödeme", "Müşteri", "Tutar", ""]}
          numeric={[1, 2, 3]}
          rows={c.aging.map((a) => [a.label, a.count, a.customers, money(a.amount), <Bar key="b" value={a.amount} max={max} tone="danger" />])}
          foot={["Toplam", c.overdueCount, c.perCustomer.length, money(c.overdueTotal), ""]}
        />
        <Table
          title="Müşteri bazlı gecikme"
          head={["Müşteri", "Sözleşme", "Proje · daire", "Geciken ödeme", "En eski vade", "Gecikme", "Kısmi ödenen", "Geciken tutar"]}
          numeric={[3, 5, 6, 7]}
          rows={c.perCustomer.map((r) => [r.name, r.number, `${pname(r.project)} · ${r.unit}`, `${r.count} · ${r.kinds}`, date(r.oldest), `${r.maxDays} gün`, r.partialPaid ? money(r.partialPaid) : "—", money(r.amount)])}
          empty="Geciken ödeme yok."
        />
        <Table
          title="Yaklaşan tahsilatlar (aylık)"
          head={["Ay", "Ödeme", "Kısmi ödenmiş", "Beklenen tutar"]}
          numeric={[1, 2, 3]}
          rows={c.byMonth.map((m) => [monthName(m.month), m.count, m.partial || "—", money(m.amount)])}
          foot={["Toplam", c.upcomingCount, "", money(c.upcomingTotal)]}
          empty="Bu aralıkta vadesi gelen ödeme yok."
        />
      </>
    );
  }
  if (kind === "barter") {
    const d = barterReport(s, f);
    return (
      <>
        <Figures
          title="Barter özeti"
          note="Barter nakit değildir; tutarlar kasa hesaplarına dahil edilmez"
          items={[
            ["Verilen daire", `${d.totals.count}`, `Liste değeri ${money(d.totals.listValue)}`],
            ["Anlaşma bedeli", money(d.totals.amount)],
            ["Mahsup edilen hakediş", money(d.totals.offset), `Dönemde ${money(d.totals.offsetInPeriod)}`],
            ["Kalan yükümlülük", money(d.totals.remaining)],
          ]}
        />
        <Table
          title="Firma bazında"
          head={["Firma", "Anlaşma", "Verilen daireler", "Liste değeri", "Anlaşma bedeli", "Mahsup", "Kalan yükümlülük"]}
          numeric={[1, 3, 4, 5, 6]}
          rows={d.firms.map((r) => [r.company, r.count, r.units, money(r.listValue), money(r.amount), money(r.offset), money(r.remaining)])}
          foot={["Toplam", d.totals.count, "", money(d.totals.listValue), money(d.totals.amount), money(d.totals.offset), money(d.totals.remaining)]}
        />
        <Table
          title="Anlaşmalar ve mahsup edilen hakedişler"
          head={["Barter", "Firma · iş", "Proje · daire", "Bedel", "Mahsuplar", "Kalan", "İlerleme · devir"]}
          numeric={[3, 5]}
          rows={d.rows.map((r) => [
            r.id,
            `${r.company} · ${r.work}`,
            `${pname(r.project)} · ${r.unit} (${r.unitType})`,
            money(r.amount),
            r.offsets.length ? r.offsets.map((o) => `${o.requestId} ${money(o.amount)} (${date(o.date)})`).join(", ") : "—",
            money(r.remaining),
            `%${r.progress} · ${r.transfer}`,
          ])}
        />
      </>
    );
  }
  if (kind === "taseron") {
    const e = subcontractorReport(s, f);
    return (
      <>
        <Figures
          title="Hakediş özeti"
          note={f.from || f.to ? `Hakediş vadesi: ${period}` : "Tüm hakedişler"}
          items={[
            ["Sözleşme bedeli", money(e.totals.value), "İş sözleşmeleri toplamı"],
            ["Hakediş toplamı", money(e.totals.hakedis)],
            ["Onay bekleyen", money(e.totals.pending)],
            ["Onaylı (ödenmemiş)", money(e.totals.approved), `Nakit ödenecek ${money(e.totals.cashDue)}`],
            ["Ödenmiş", money(e.totals.paid), `Nakit ${money(e.totals.cashPaid)}`],
            ["Barter mahsubu", money(e.totals.barterOffset), "Nakit dışı kapatma"],
          ]}
        />
        <Table
          title="Firma ve iş paketi"
          head={["Sözleşme", "Firma", "İş paketleri", "Bedel", "Hakediş", "Onay bekleyen", "Onaylı", "Ödenmiş", "Nakit ödenen", "Barter mahsubu"]}
          numeric={[3, 4, 5, 6, 7, 8, 9]}
          rows={e.rows.map((r) => [r.id, `${r.company} · ${pname(r.project)}`, r.packages, money(r.value), money(r.hakedis), money(r.pending), money(r.approved), money(r.paid), money(r.cashPaid), money(r.barterOffset)])}
          foot={["Toplam", "", "", money(e.totals.value), money(e.totals.hakedis), money(e.totals.pending), money(e.totals.approved), money(e.totals.paid), money(e.totals.cashPaid), money(e.totals.barterOffset)]}
        />
        <Table
          title="Hakediş kayıtları"
          note="Vade, hakedişin ödenmesi planlanan tarihtir; gerçek nakit çıkışı ödeme tarihinde olur."
          head={["Hakediş", "Firma", "Hakediş vadesi", "Ödeme tarihi", "Tutar", "Durum", "Barter mahsubu", "Nakit"]}
          numeric={[4, 6, 7]}
          rows={e.rows.flatMap((r) => r.requests.map((q) => [`${q.id} · ${q.name}`, r.company, date(q.due), q.status === "Ödendi" ? (q.paidAt ? date(q.paidAt) : "Kayıt yok") : "—", money(q.amount), q.status, q.offset ? money(q.offset) : "—", money(q.cash)]))}
          empty="Bu aralıkta hakediş yok."
        />
      </>
    );
  }
  const m = managerReport(s, f);
  return (
    <>
      <Table
        title="Şirket ve proje özeti"
        note={`Alacaklar 15 Kas 2026 itibarıyla · nakit hareketi ${period}`}
        head={["Kapsam", "Satılan / stok", "Sözleşmeli satış", "Tahsil edilen", "Kalan alacak", "Geciken", "Kasaya giren", "Kasadan çıkan", "Barter kalan"]}
        numeric={[1, 2, 3, 4, 5, 6, 7, 8]}
        rows={m.rows.map((r) => [
          r.project === "all" ? <b key="t">{r.name}</b> : r.name,
          `${r.sales.sold} / ${r.sales.total}`,
          money(r.fin.contracted),
          <span key="c" className="rp-two">
            {money(r.fin.collected)}
            <small>{pct(r.fin.collectionRate)}</small>
          </span>,
          money(r.fin.balance),
          money(r.fin.overdue),
          money(r.fin.inflow),
          money(r.fin.outflow),
          money(r.fin.barterRemaining),
        ])}
      />
      <section className="rp-block">
        <h3>
          Önemli uyarılar ve bekleyen işlemler<small>{m.alerts.length} konu</small>
        </h3>
        {m.alerts.length ? (
          <ul className="rp-alerts">
            {m.alerts.map((a, i) => (
              <li key={i} className={a.tone}>
                <b>{a.title}</b>
                <span>
                  {pname(a.project)} · {a.detail}
                </span>
                {a.amount !== undefined && <em className="num">{money(a.amount)}</em>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rp-empty">Uyarı yok.</p>
        )}
      </section>
    </>
  );
}
