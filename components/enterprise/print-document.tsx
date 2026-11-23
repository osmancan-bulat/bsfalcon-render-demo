"use client";
// Yazdırılabilir belgeler: sözleşme özeti, ödeme planı, cari ekstre, tahsilat makbuzu ve proje yönetici raporu.
// Tüm belgeler tarayıcıdaki demo verisinden üretilir ve "temsili" filigranı taşır.
import { useEffect, useState, type ReactNode } from "react";
import { Printer } from "lucide-react";
import { useApp } from "./context";
import {
  SNAPSHOT,
  projects,
  pname,
  summary,
  customerList,
  contractList,
  customerLedger,
  accountOf,
  depositSchedule,
  installmentList,
  outstanding,
  contractNumber,
  workContracts,
  offsetFor,
  requestStatus,
} from "@/lib/enterprise";
import { money, date } from "@/lib/data";
import { unitById, unitPlace, unitShort } from "@/lib/units";
import ReportBody from "./report-body";
import { REPORT_TITLES, periodLabel, type ReportKind } from "@/lib/reports";

type Params = {
  tur: string;
  id: string;
  project: string;
  rapor: string;
  from?: string;
  to?: string;
};

export default function PrintDocument() {
  const { state, ready } = useApp();
  const [p, setP] = useState<Params | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setP({
      tur: q.get("tur") ?? "",
      id: q.get("id") ?? "",
      project: q.get("project") ?? "verdora",
      rapor: q.get("rapor") ?? "yonetici",
      from: q.get("from") ?? undefined,
      to: q.get("to") ?? undefined,
    });
  }, []);
  if (!ready || !p)
    return <div className="doc-loading">Belge hazırlanıyor…</div>;

  let body: ReactNode = null;
  let title = "Belge";
  if (p.tur === "sozlesme" || p.tur === "plan" || p.tur === "ekstre") {
    const contract = contractList(state).find((c) => c.id === p.id);
    const c = [
      ...customerList(state),
      ...state.drafts,
      ...state.cancelled,
    ].find((c) => c.id === p.id);
    if (contract && c) {
      const acc = contract.account ?? accountOf(state, c, []);
      const parts = depositSchedule(c, contract.signedAt);
      const rows = contract.account ? acc.rows : [];
      if (p.tur === "sozlesme") {
        title = "Konut satış sözleşmesi özeti";
        body = (
          <>
            <DocMeta
              items={[
                ["Sözleşme no", contract.number],
                ["Durum", contract.status],
                [
                  "İmza tarihi",
                  contract.signedAt ? date(contract.signedAt) : "İmza bekliyor",
                ],
                ["Proje", pname(c.project)],
              ]}
            />
            <h3>Taraflar</h3>
            <table className="doc-kv">
              <tbody>
                <tr>
                  <th>Satıcı</th>
                  <td>SANE İnşaat (temsili demo kaydı)</td>
                </tr>
                <tr>
                  <th>Alıcı</th>
                  <td>{c.name} (kurgusal müşteri)</td>
                </tr>
              </tbody>
            </table>
            <h3>Bağımsız bölüm</h3>
            <table className="doc-kv">
              <tbody>
                <tr>
                  <th>Daire</th>
                  <td>
                    {pname(c.project)} · {unitPlace(c.id)} (kod {c.unit}) ·{" "}
                    {contract.type} · {contract.facade} cephe
                  </td>
                </tr>
                <tr>
                  <th>Alan</th>
                  <td>Brüt {contract.gross} m²</td>
                </tr>
                <tr>
                  <th>Satış bedeli</th>
                  <td>
                    <b>{money(c.price)}</b>
                    {contract.listPrice
                      ? ` (liste fiyatı ${money(contract.listPrice)}, indirim ${money(contract.discount)})`
                      : ""}
                  </td>
                </tr>
              </tbody>
            </table>
            <h3>Ödeme koşulları</h3>
            <table className="doc-kv">
              <tbody>
                <tr>
                  <th>Plan</th>
                  <td>{contract.planLabel}</td>
                </tr>
                <tr>
                  <th>Peşinat</th>
                  <td>
                    {parts.map((d, n) => (
                      <div key={n}>
                        {money(d.amount)} · vade {date(d.due)}
                        {d.remaining === 0 ? " · tahsil edildi" : ""}
                      </div>
                    ))}
                  </td>
                </tr>
                {contract.account && (
                  <tr>
                    <th>Bakiye ({date(SNAPSHOT)})</th>
                    <td>
                      Tahsil edilen {money(acc.collected)} · kalan{" "}
                      {money(acc.balance)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="doc-small">
              Ayrıntılı ödeme takvimi ekteki ödeme planı belgesinde yer alır. Bu
              özet hukuki sözleşme metni değildir.
            </p>
            <div className="doc-signatures">
              <div>
                <span>Satıcı adına</span>
                <i />
              </div>
              <div>
                <span>Alıcı</span>
                <i />
              </div>
            </div>
          </>
        );
      } else if (p.tur === "plan") {
        title = "Ödeme planı";
        body = (
          <>
            <DocMeta
              items={[
                ["Sözleşme no", contract.number],
                ["Müşteri", c.name],
                ["Daire", `${pname(c.project)} · ${unitShort(c.id)}`],
                ["Bedel", money(c.price)],
              ]}
            />
            <table className="doc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ödeme</th>
                  <th>Vade</th>
                  <th className="r">Tutar</th>
                  <th className="r">Kalan</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((d, n) => (
                  <tr key={`d${n}`}>
                    <td>P{n + 1}</td>
                    <td>
                      {parts.length > 1 ? `${n + 1}. peşinat` : "Peşinat"}
                    </td>
                    <td>{date(d.due)}</td>
                    <td className="r">{money(d.amount)}</td>
                    <td className="r">{money(d.remaining)}</td>
                    <td>
                      {d.remaining === 0
                        ? "Ödendi"
                        : d.paid > 0
                          ? "Kısmi"
                          : "Bekliyor"}
                    </td>
                  </tr>
                ))}
                {Array.from({ length: c.paidMonths }, (_, k) => (
                  <tr key={`h${k}`}>
                    <td>{k + 1}</td>
                    <td>{k + 1}. taksit</td>
                    <td>—</td>
                    <td className="r">{money(c.installment)}</td>
                    <td className="r">{money(0)}</td>
                    <td>Ödendi</td>
                  </tr>
                ))}
                {rows.map((i, n) => {
                  const left = outstanding(state, i);
                  return (
                    <tr key={i.id}>
                      <td>
                        {i.kind === "Ara ödeme" ? "A" : i.id.split("-").pop()}
                      </td>
                      <td>{i.label ?? `${n + c.paidMonths + 1}. taksit`}</td>
                      <td>{date(i.due)}</td>
                      <td className="r">{money(i.amount)}</td>
                      <td className="r">{money(left)}</td>
                      <td>
                        {left === 0
                          ? "Ödendi"
                          : left < i.amount
                            ? "Kısmi"
                            : i.due < SNAPSHOT
                              ? "Gecikmiş"
                              : "Planlandı"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Toplam</td>
                  <td className="r">{money(c.price)}</td>
                  <td className="r">
                    {contract.account ? money(acc.balance) : money(c.price)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </>
        );
      } else {
        title = "Müşteri cari hesap ekstresi";
        const ledger = customerLedger(state, c.id);
        body = (
          <>
            <DocMeta
              items={[
                ["Sözleşme no", contract.number],
                ["Müşteri", c.name],
                ["Daire", `${pname(c.project)} · ${unitShort(c.id)}`],
                ["Ekstre tarihi", date(SNAPSHOT)],
              ]}
            />
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Açıklama</th>
                  <th>Belge</th>
                  <th className="r">Borç</th>
                  <th className="r">Alacak</th>
                  <th className="r">Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e, n) => (
                  <tr key={n}>
                    <td>{date(e.date)}</td>
                    <td>{e.label}</td>
                    <td>{e.ref}</td>
                    <td className="r">{e.debit ? money(e.debit) : ""}</td>
                    <td className="r">{e.credit ? money(e.credit) : ""}</td>
                    <td className="r">{money(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>Kalan bakiye</td>
                  <td className="r">{money(ledger.at(-1)?.balance ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        );
      }
    }
  } else if (p.tur === "makbuz") {
    const r = state.receipts.find((r) => r.id === p.id);
    const i = r && installmentList(state).find((i) => i.id === r.installmentId);
    const c = i && customerList(state).find((c) => c.id === i.customerId);
    if (r && i && c) {
      title = r.reversal ? "Tahsilat makbuzu · İPTAL EDİLDİ" : "Tahsilat makbuzu";
      const acc = accountOf(state, c);
      body = (
        <>
          {r.reversal && (
            <p className="doc-void">
              Bu tahsilat {date(r.reversal.date)} tarihinde iptal edildi · Gerekçe: {r.reversal.reason}. Tutar müşteri bakiyesine geri eklenmiştir.
            </p>
          )}
          <DocMeta
            items={[
              ["Makbuz no", r.id],
              ["Tarih", date(r.date)],
              ["Sözleşme no", contractNumber(c.id)],
              ["Proje", pname(c.project)],
            ]}
          />
          <div className="doc-amount">
            <span>Tahsil edilen tutar</span>
            <b>{money(r.amount)}</b>
          </div>
          <table className="doc-kv">
            <tbody>
              <tr>
                <th>Ödeyen</th>
                <td>{c.name} (kurgusal müşteri)</td>
              </tr>
              <tr>
                <th>Daire</th>
                <td>
                  {pname(c.project)} · {unitPlace(c.id)}
                </td>
              </tr>
              <tr>
                <th>Ödeme</th>
                <td>
                  {i.label ?? `${i.id.split("-").pop()}. taksit`} · vade{" "}
                  {date(i.due)} · tutar {money(i.amount)}
                </td>
              </tr>
              <tr>
                <th>Yöntem / dekont</th>
                <td>
                  {r.method} · {r.reference}
                </td>
              </tr>
              <tr>
                <th>Güncel bakiye</th>
                <td>{money(acc.balance)}</td>
              </tr>
            </tbody>
          </table>
          <div className="doc-signatures single">
            <div>
              <span>Tahsil eden</span>
              <i />
            </div>
          </div>
        </>
      );
    }
  } else if (p.tur === "barter") {
    const b = state.barters.find((b) => b.id === p.id);
    if (b) {
      title = "Barter (iş karşılığı daire) sözleşmesi özeti";
      const u = unitById(b.unitId);
      const offsets = (state.offsets ?? []).filter((o) => o.barterId === b.id);
      const used = offsets.reduce((a, o) => a + o.amount, 0);
      body = (
        <>
          <DocMeta
            items={[
              ["Sözleşme no", b.id],
              ["Proje", pname(b.project)],
              ["Daire", u?.label ?? b.unitId],
              ["Belge tarihi", date(SNAPSHOT)],
            ]}
          />
          <h3>Taraflar</h3>
          <table className="doc-kv">
            <tbody>
              <tr>
                <th>Daireyi veren</th>
                <td>SANE İnşaat (temsili demo kaydı)</td>
              </tr>
              <tr>
                <th>İşi yapan firma</th>
                <td>{b.company} (kurgusal firma)</td>
              </tr>
            </tbody>
          </table>
          <h3>Karşılıklı edimler</h3>
          <table className="doc-kv">
            <tbody>
              <tr>
                <th>Verilen bağımsız bölüm</th>
                <td>
                  {pname(b.project)} · {unitPlace(b.unitId)} · {u?.type} · brüt{" "}
                  {u?.gross} m² · {u?.facade} cephe
                </td>
              </tr>
              <tr>
                <th>Karşılığında yapılacak iş</th>
                <td>{b.work}</td>
              </tr>
              <tr>
                <th>Anlaşma bedeli</th>
                <td>
                  <b>{money(b.amount)}</b> (dairenin liste fiyatı{" "}
                  {money(u?.listPrice ?? 0)})
                </td>
              </tr>
              <tr>
                <th>İş süresi</th>
                <td>
                  {date(b.start)} – {date(b.end)} · tamamlanma %{b.progress}
                </td>
              </tr>
              <tr>
                <th>Daire devri</th>
                <td>{b.transfer}</td>
              </tr>
            </tbody>
          </table>
          <h3>Hakediş mahsupları</h3>
          <SimpleTable
            head={["Tarih", "Hakediş", "Mahsup"]}
            rows={offsets.map((o) => [
              date(o.date),
              o.requestId,
              money(o.amount),
            ])}
            empty="Henüz hakedişe mahsup yapılmadı."
          />
          <div className="doc-amount">
            <span>Kalan yükümlülük (nakit dışı)</span>
            <b>{money(b.amount - used)}</b>
          </div>
          <p className="doc-small">
            Barter satış geliri, tahsilat veya kasa girişi oluşturmaz; firmanın
            hakedişlerinden mahsup edilir. Bu özet hukuki sözleşme metni
            değildir.
          </p>
          <div className="doc-signatures">
            <div>
              <span>SANE İnşaat adına</span>
              <i />
            </div>
            <div>
              <span>{b.company} adına</span>
              <i />
            </div>
          </div>
        </>
      );
    }
  } else if (p.tur === "is") {
    const wc = workContracts(state).find((w) => w.id === p.id);
    if (wc) {
      title = "İş (taşeron) sözleşmesi özeti";
      body = (
        <>
          <DocMeta
            items={[
              ["Sözleşme no", wc.id],
              ["Proje", pname(wc.project)],
              ["Firma", wc.company],
              ["Belge tarihi", date(SNAPSHOT)],
              ["Sözleşme bedeli", money(wc.value)],
            ]}
          />
          <h3>Taraflar</h3>
          <table className="doc-kv">
            <tbody>
              <tr>
                <th>İşveren</th>
                <td>SANE İnşaat (temsili demo kaydı)</td>
              </tr>
              <tr>
                <th>Yüklenici</th>
                <td>{wc.company} (kurgusal firma)</td>
              </tr>
            </tbody>
          </table>
          <h3>İş kapsamı</h3>
          <SimpleTable
            head={["İş paketi", "Bedel", "İlerleme", "Malzeme / durum"]}
            rows={wc.packages.map((w) => [
              w.name,
              money(w.value),
              `%${w.progress}`,
              w.material,
            ])}
            empty="İş paketi yok."
          />
          <h3>Hakedişler</h3>
          <SimpleTable
            head={["Hakediş", "Vade", "Tutar", "Barter mahsubu", "Durum"]}
            rows={wc.requests.map((r) => [
              `${r.id} · ${r.name}`,
              date(r.due),
              money(r.amount),
              money(offsetFor(state, r.id)),
              requestStatus(state, r),
            ])}
            empty="Bu sözleşmede henüz hakediş yok."
          />
          <div className="doc-kpis">
            {(
              [
                ["Sözleşme bedeli", money(wc.value)],
                ["Toplam hakediş", money(wc.hakedisTotal)],
                ["Nakit ödenen", money(wc.paid)],
                ["Barter mahsubu", money(wc.offset)],
                ["Bağlı barter", wc.barterId ?? "—"],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <p className="doc-small">
            İş kapsamı ve hakedişler sistemdeki iş paketi ve hakediş
            kayıtlarından üretilmiştir. Bu özet hukuki sözleşme metni değildir.
          </p>
          <div className="doc-signatures">
            <div>
              <span>SANE İnşaat adına</span>
              <i />
            </div>
            <div>
              <span>{wc.company} adına</span>
              <i />
            </div>
          </div>
        </>
      );
    }
  } else if (p.tur === "rapor" || p.tur === "yonetici") {
    const kind = (p.tur === "yonetici" ? "yonetici" : p.rapor) as ReportKind;
    if (REPORT_TITLES[kind] && (p.project === "all" || projects.some((x) => x.id === p.project))) {
      const f = { project: p.project, from: p.from, to: p.to };
      title = REPORT_TITLES[kind];
      body = (
        <>
          <DocMeta
            items={[
              ["Kapsam", p.project === "all" ? "SANE İnşaat · şirket geneli" : pname(p.project)],
              ["Dönem", periodLabel(f)],
              ["Rapor tarihi", date(SNAPSHOT)],
              ["Kaynak", "Tarayıcıdaki demo kayıtları"],
            ]}
          />
          <div className="doc-report">
            <ReportBody s={state} kind={kind} f={f} />
          </div>
          <p className="doc-small">
            Durum göstergeleri 15 Kasım 2026 senaryo tarihine göredir. Dönem filtresi: kasaya giren ve çıkan gerçek tahsilat/ödeme tarihine, barter mahsubu mahsup tarihine, satışlar imza tarihine, taksit ve hakediş listeleri vade tarihine göre uygulanır. Vade, ödemenin yapıldığı anlamına gelmez. Barter nakit girişi veya çıkışı sayılmaz.
          </p>
        </>
      );
    }
  } else if (p.tur === "proje") {
    const pr = projects.find((x) => x.id === p.project);
    if (pr) {
      title = `${pr.name} yönetici raporu`;
      const s = summary(state, pr.id);
      const contracts = contractList(state).filter((c) => c.project === pr.id);
      const late = contracts.filter((c) => (c.account?.overdue ?? 0) > 0);
      const deposits = contracts.filter(
        (c) => (c.account?.depositRemaining ?? 0) > 0,
      );
      const drafts = contracts.filter(
        (c) => c.status === "Taslak" || c.status === "İmza bekliyor",
      );
      const barters = state.barters.filter((b) => b.project === pr.id);
      body = (
        <>
          <DocMeta
            items={[
              ["Rapor tarihi", date(SNAPSHOT)],
              ["Konum", pr.location],
              ["Teslim hedefi", pr.delivery || "Açıklanmadı"],
              ["İnşaat ilerlemesi", `%${s.progress}`],
            ]}
          />
          <div className="doc-kpis">
            {(
              [
                ["Satılan", `${s.sold} / ${s.total}`],
                ["Sözleşme değeri", money(s.revenue)],
                ["Tahsil edilen", money(s.collected)],
                ["Kalan alacak", money(s.balance)],
                ["Gecikmiş", money(s.overdueTotal)],
                ["Bekleyen peşinat", money(s.depositPending)],
                ["Barter", `${s.barterCount} daire · ${money(s.barterValue)}`],
                ["Proje kasası", money(s.cash)],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <h3>Geciken ödemeler</h3>
          <SimpleTable
            head={["Sözleşme", "Müşteri", "Daire", "En eski vade", "Gecikmiş"]}
            rows={late.map((c) => [
              c.number,
              c.name,
              c.unitLabel,
              date(c.account!.oldestOverdue!),
              money(c.account!.overdue),
            ])}
            empty="Gecikmiş ödeme yok."
          />
          <h3>Bekleyen peşinatlar</h3>
          <SimpleTable
            head={["Sözleşme", "Müşteri", "Daire", "Anlaşmalı", "Kalan"]}
            rows={deposits.map((c) => [
              c.number,
              c.name,
              c.unitLabel,
              money(c.account!.depositExpected),
              money(c.account!.depositRemaining),
            ])}
            empty="Bekleyen peşinat yok."
          />
          <h3>İmza sürecindeki sözleşmeler</h3>
          <SimpleTable
            head={["Sözleşme", "Müşteri", "Daire", "Bedel", "Durum"]}
            rows={drafts.map((c) => [
              c.number,
              c.name,
              c.unitLabel,
              money(c.price),
              c.status,
            ])}
            empty="Taslak sözleşme yok."
          />
          <h3>Barter daireleri</h3>
          <SimpleTable
            head={["Daire", "Firma", "İş", "Bedel", "Devir"]}
            rows={barters.map((b) => [
              unitShort(b.unitId),
              b.company,
              b.work,
              money(b.amount),
              b.transfer,
            ])}
            empty="Barter anlaşması yok."
          />
        </>
      );
    }
  }

  return (
    <div className="doc-shell">
      <div className="doc-toolbar">
        <span>Belge önizleme · tarayıcıdaki demo verisinden üretildi</span>
        <button className="btn primary" onClick={() => window.print()}>
          <Printer size={15} /> Yazdır / PDF kaydet
        </button>
      </div>
      <article className="doc-page">
        <div className="doc-stamp" aria-label="Temsili demo belgesi">
          TEMSİLİ DEMO BELGESİ · HUKUKİ GEÇERLİLİĞİ YOKTUR
        </div>
        <header className="doc-header">
          <img src="/images/sane-logo.png" alt="SANE İnşaat" />
          <div>
            <span>Yönetim Merkezi</span>
            <h1>{title}</h1>
          </div>
        </header>
        {body ?? (
          <p className="doc-small">
            Belge bulunamadı. Bağlantıyı uygulama içinden yeniden açın.
          </p>
        )}
        <footer className="doc-footer">
          TEMSİLİ DEMO BELGESİ · Kişi, firma ve tutarlar kurgusaldır · Hukuki
          veya mali geçerliliği yoktur · {date(SNAPSHOT)}
        </footer>
      </article>
    </div>
  );
}

function DocMeta({ items }: { items: [string, string][] }) {
  return (
    <dl className="doc-meta">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SimpleTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: string[][];
  empty: string;
}) {
  if (!rows.length) return <p className="doc-small">{empty}</p>;
  return (
    <table className="doc-table">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, n) => (
          <tr key={n}>
            {r.map((v, k) => (
              <td key={k}>{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
