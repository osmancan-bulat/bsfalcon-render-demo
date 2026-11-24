"use client";
import { useAuthOptional } from "../security/auth";
// Müşteri / daire dosyası. Önce özet (müşteri, daire, durum, bedel, ödenen, kalan, sonraki ödeme),
// ardından beş sekme: Ödeme planı · Tahsilatlar · Sözleşme · Belgeler · İşlem geçmişi.
// Tahsilat tek düğmeyle açılır; form kaydetmeden önce bakiye ve kasa etkisini gösterir.
import Link from "next/link";
import { useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Printer,
  ArrowRightLeft,
  CircleCheck,
  Wallet,
  PenLine,
} from "lucide-react";
import RecordDocuments from "./record-documents";
import { unitById } from "@/lib/units";
import { ADVISORS } from "@/lib/names";
import { useApp } from "./context";
import { unitPlace, unitShort } from "@/lib/units";
import { Drawer, Badge, AuditTrail, Progress } from "./shared";
import {
  customerList,
  pname,
  SNAPSHOT,
  accountOf,
  contractList,
  customerLedger,
  paymentRows,
  fileHistory,
  type PaymentRow,
  nextReceiptId,
} from "@/lib/enterprise";
import { money, date } from "@/lib/data";

const TABS = [
  "Ödeme planı",
  "Tahsilatlar",
  "Sözleşme",
  "Belgeler",
  "İşlem geçmişi",
] as const;
const TONE: Record<string, string> = {
  Gecikti: "red",
  Yaklaşıyor: "amber",
  "Kısmen ödendi": "info",
  "Gelecek dönem": "neutral",
  Ödendi: "green",
};

export default function CustomerPanel({
  id,
  onClose,
  focus,
}: {
  id: string | null;
  onClose: () => void;
  /** Açılışta tahsilat formu açılacak ödeme: taksit id'si veya "deposit" */
  focus?: string;
}) {
  const { state, act } = useApp();
  const c = customerList(state).find((c) => c.id === id);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Ödeme planı");
  const [paying, setPaying] = useState<string>(focus ?? "");
  const [justPaid, setJustPaid] = useState<{
    amount: number;
    receipt?: string;
  } | null>(null);
  const [reschedule, setReschedule] = useState("");
  const [panel, setPanel] = useState<"" | "transfer" | "edit">("");
  const auth = useAuthOptional();
  // Müşteri kişisel bilgileri hassas içeriktir: yetki + yeniden doğrulama + erişim kaydı (DEMO · tarayıcı içi)
  const openPersonal = async () => {
    if (panel === "edit") return setPanel("");
    if (auth) {
      const label = `${c?.name ?? id} · kişisel bilgiler`;
      if (!auth.perms?.flags.sensitiveDocs || !auth.can("satis", "edit")) {
        auth.logDoc(label, "müşteri kişisel bilgisi", "denied", "Yetki yok");
        return;
      }
      if (!(await auth.requireReauth(label, "müşteri kişisel bilgisi"))) return;
      auth.logDoc(label, "müşteri kişisel bilgisi", "view");
    }
    setPanel("edit");
  };
  const [fullPlan, setFullPlan] = useState(false);
  const [reversing, setReversing] = useState<{ kind: "receipt" | "deposit"; id: string; ref: string } | null>(null);
  if (!c) return null;
  const acc = accountOf(state, c);
  const contract = contractList(state).find((x) => x.id === c.id)!;
  const u = unitById(c.id);
  const rows = paymentRows(state).filter((r) => r.customerId === c.id);
  const open = rows.filter((r) => r.remaining > 0);
  // Ödeme planı: varsayılan görünümde gecikenler + sıradaki 3 açık ödeme; işlem yalnızca gecikenlerde ve sıradaki ödemede
  const upcomingOpen = open.filter((r) => r.status !== "Gecikti");
  const actionable = new Set([
    ...open.filter((r) => r.status === "Gecikti").map((r) => r.id),
    ...(upcomingOpen[0] ? [upcomingOpen[0].id] : []),
  ]);
  const focusedIds = new Set([
    ...open.filter((r) => r.status === "Gecikti").map((r) => r.id),
    ...upcomingOpen.slice(0, 3).map((r) => r.id),
  ]);
  const paidCount = rows.filter((r) => r.remaining === 0).length;
  const late = open.filter((r) => r.status === "Gecikti");
  const nextOpen = late[0] ?? open[0];
  const resolve = (key: string): PaymentRow | undefined =>
    key === "deposit"
      ? rows.find((r) => r.kind === "Peşinat" && r.remaining > 0)
      : key === "next"
        ? nextOpen
        : rows.find((r) => r.id === key);
  const target = paying ? resolve(paying) : undefined;
  const ratio = Math.round((acc.collected / c.price) * 100);
  const lateTotal = late.reduce((a, r) => a + r.remaining, 0);
  const priorPaid =
    c.paidMonths > 0 ? c.deposit + c.paidMonths * c.installment : 0;
  const ledger = tab === "Tahsilatlar" ? customerLedger(state, c.id) : [];
  const receipts = state.receipts.filter((r) =>
    rows.some((x) => x.installmentId === r.installmentId),
  );

  function collect(
    row: PaymentRow,
    amount: number,
    method: string,
    reference: string,
  ) {
    const ok =
      row.kind === "Peşinat"
        ? act({ type: "deposit-receipt", id: c!.id, amount })
        : act({
            type: "receipt",
            installmentId: row.installmentId!,
            amount,
            method,
            reference,
          });
    if (ok) {
      // Makbuz no, applyAction ile aynı kuralla: THS-<sıra>
      setJustPaid({
        amount,
        receipt: row.kind === "Peşinat" ? undefined : nextReceiptId(state),
      });
      setPaying("");
    }
  }

  return (
    <Drawer
      open
      title={c.name}
      eyebrow={`${pname(c.project)} · ${unitPlace(c.id)} · ${contract.number}`}
      onClose={onClose}
      wide
    >
      <dl className="file-summary">
        <div>
          <dt>Müşteri</dt>
          <dd>
            {c.name}
            <small>{contract.number}</small>
          </dd>
        </div>
        <div>
          <dt>Daire</dt>
          <dd>
            {u ? unitShort(c.id) : c.unit} · {u?.type}
            <small>
              {u?.floorLabel} · brüt {u?.gross} m² · {u?.facade} · kod {c.unit}
            </small>
          </dd>
        </div>
        <div>
          <dt>Satış durumu</dt>
          <dd>
            <Badge
              tone={
                late.length
                  ? "red"
                  : contract.status === "Tamamlandı"
                    ? "info"
                    : "green"
              }
            >
              {late.length
                ? "Ödemesi gecikmiş"
                : contract.status === "Tamamlandı"
                  ? "Tamamlandı"
                  : "Aktif sözleşme"}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Toplam bedel</dt>
          <dd className="num">{money(c.price)}</dd>
        </div>
        <div>
          <dt>Ödenen</dt>
          <dd className="num">
            {money(acc.collected)}
            <Progress value={ratio} />
          </dd>
        </div>
        <div>
          <dt>Kalan</dt>
          <dd className="num">{money(acc.balance)}</dd>
        </div>
        <div className={late.length ? "alert" : ""}>
          <dt>{late.length ? "Geciken" : "Sonraki ödeme"}</dt>
          <dd className="num">
            {late.length
              ? money(lateTotal)
              : nextOpen
                ? money(nextOpen.remaining)
                : "—"}
            <small>
              {late.length
                ? `${late.length} ödeme · en eski ${date(late[0].due)}`
                : nextOpen
                  ? `${nextOpen.label} · ${date(nextOpen.due)}`
                  : "Açık ödeme yok"}
            </small>
          </dd>
        </div>
        <div className="file-cta">
          {nextOpen && (
            <button
              className="btn primary"
              onClick={() => setPaying(paying ? "" : "next")}
            >
              <Wallet size={15} /> Tahsilat kaydet
            </button>
          )}
        </div>
      </dl>

      {justPaid && !target && (
        <div className="receipt-done" role="status">
          <CircleCheck size={18} />
          <div>
            <b>{money(justPaid.amount)} tahsil edildi</b>
            <small>
              Kalan bakiye {money(acc.balance)} · proje kasasına{" "}
              {money(justPaid.amount)} girdi
            </small>
          </div>
          {justPaid.receipt && (
            <Link
              className="btn compact"
              href={`/belge/?tur=makbuz&id=${justPaid.receipt}`}
              target="_blank"
            >
              <Printer size={14} /> Makbuz
            </Link>
          )}
        </div>
      )}
      {target && (
        <ReceiptForm
          key={target.id}
          label={`${target.label} · vade ${date(target.due)}`}
          remaining={target.remaining}
          balance={acc.balance}
          simple={target.kind === "Peşinat"}
          onCancel={() => setPaying("")}
          onSubmit={(amount, method, reference) =>
            collect(target, amount, method, reference)
          }
        />
      )}

      <div className="e-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ödeme planı" && (
        <section className="acct-section">
          {priorPaid > 0 && (
            <p className="muted">
              Önceki dönemde ödenen: peşinat ve ilk {c.paidMonths} taksit ·{" "}
              {money(priorPaid)}
            </p>
          )}
          <div className="plan-head">
            <span>
              {fullPlan
                ? `Tüm plan · ${rows.length} ödeme`
                : late.length
                  ? `${late.length} geciken ve sıradaki ödemeler`
                  : "Sıradaki ödemeler"}
              <small>
                {paidCount} ödeme kapandı · {open.length} açık ödeme · kalan{" "}
                {money(acc.balance)}
              </small>
            </span>
            <button
              className="btn compact ghost"
              onClick={() => setFullPlan(!fullPlan)}
            >
              {fullPlan
                ? "Yalnızca sıradakiler"
                : `Tüm planı göster (${rows.length})`}
            </button>
          </div>
          <div className="e-table-wrap drawer-table">
            <table>
              <thead>
                <tr>
                  <th>Ödeme</th>
                  <th>Vade</th>
                  <th className="numeric">Tutar</th>
                  <th className="numeric">Kalan</th>
                  <th>Durum</th>
                  <th aria-label="İşlem" />
                </tr>
              </thead>
              <tbody>
                {(fullPlan
                  ? rows
                  : rows.filter((r) => focusedIds.has(r.id))
                ).map((r) => (
                  <tr
                    key={r.id}
                    className={`${r.kind !== "Taksit" ? "acct-interim" : ""} ${r.remaining === 0 ? "row-paid" : ""}`}
                  >
                    <td>
                      <b>{r.label}</b>
                      {reschedule === r.id && r.installmentId && (
                        <form
                          className="reschedule"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            if (
                              act({
                                type: "reschedule",
                                id: r.installmentId!,
                                date: String(f.get("date")),
                              })
                            )
                              setReschedule("");
                          }}
                        >
                          <input
                            aria-label="Yeni vade"
                            name="date"
                            type="date"
                            min={SNAPSHOT}
                            defaultValue={r.due < SNAPSHOT ? SNAPSHOT : r.due}
                            required
                          />
                          <button className="btn compact" type="submit">
                            Kaydet
                          </button>
                        </form>
                      )}
                    </td>
                    <td>{date(r.due)}</td>
                    <td className="numeric">{money(r.amount)}</td>
                    <td className="numeric">
                      {r.remaining ? money(r.remaining) : "—"}
                    </td>
                    <td>
                      <Badge tone={TONE[r.status]}>{r.status}</Badge>
                    </td>
                    <td>
                      {actionable.has(r.id) && (
                        <div className="row-actions">
                          <button
                            className="btn compact"
                            onClick={() =>
                              setPaying(
                                r.id === "deposit"
                                  ? "deposit"
                                  : r.kind === "Peşinat"
                                    ? "deposit"
                                    : r.id,
                              )
                            }
                          >
                            Tahsil et
                          </button>
                          {r.installmentId && (
                            <button
                              className="icon-button"
                              aria-label={`${r.label} vadesini değiştir`}
                              title="Vadeyi değiştir"
                              onClick={() =>
                                setReschedule(reschedule === r.id ? "" : r.id)
                              }
                            >
                              <CalendarDays size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "Tahsilatlar" && (
        <section className="acct-section">
          <div className="file-actions">
            <span className="muted">
              Sözleşme borcu ve tüm tahsilatlar tek ekstrede; son satır kalan
              bakiyedir.
            </span>
            <span className="spacer" />
            <Link
              className="btn compact"
              href={`/belge/?tur=ekstre&id=${c.id}`}
              target="_blank"
            >
              <Printer size={14} /> Cari ekstre
            </Link>
          </div>
          <div className="e-table-wrap drawer-table">
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Hareket</th>
                  <th className="numeric">Tutar</th>
                  <th className="numeric">Bakiye</th>
                  <th aria-label="Makbuz" />
                </tr>
              </thead>
              <tbody>
                {ledger.map((e, n) => (
                  <tr key={n}>
                    <td>{date(e.date)}</td>
                    <td>
                      <b>{e.label}</b>
                      <small>{e.ref}</small>
                    </td>
                    <td className="numeric">
                      {e.debit ? (
                        money(e.debit)
                      ) : e.credit < 0 ? (
                        <span className="negative">+{money(-e.credit)} iptal</span>
                      ) : (
                        <span className="positive">−{money(e.credit)}</span>
                      )}
                    </td>
                    <td className="numeric">
                      <b>{money(e.balance)}</b>
                    </td>
                    <td className="row-actions">
                      {receipts.some((r) => r.id === e.ref) && (
                        <Link
                          className="icon-button"
                          href={`/belge/?tur=makbuz&id=${e.ref}`}
                          target="_blank"
                          aria-label={`${e.ref} makbuzu`}
                          title="Makbuz"
                        >
                          <Printer size={14} />
                        </Link>
                      )}
                      {e.sourceId && !e.reversed && (
                        <button
                          className="text-button"
                          onClick={() =>
                            setReversing({
                              kind: e.kind === "Peşinat" ? "deposit" : "receipt",
                              id: e.sourceId!,
                              ref: e.ref,
                            })
                          }
                          title="Hatalı tahsilatı iptal et (kayıt silinmez)"
                        >
                          İptal et
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reversing && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
                if (
                  act({
                    type: reversing.kind === "deposit" ? "deposit-reverse" : "receipt-reverse",
                    id: reversing.id,
                    reason,
                  })
                )
                  setReversing(null);
              }}
            >
              <h3>{reversing.ref} tahsilatını iptal et</h3>
              <p className="muted">
                Kayıt silinmez: tahsilat “iptal edildi” olarak işaretlenir, tutar bakiyeye geri
                eklenir, cari ekstrede ve işlem geçmişinde iptal satırı görünür. Doğru tutar
                ardından yeni tahsilat olarak girilir.
              </p>
              <label className="form-label">
                İptal gerekçesi
                <input name="reason" required minLength={5} maxLength={140} placeholder="Ör. Yanlış taksite işlendi" />
              </label>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setReversing(null)}>
                  Vazgeç
                </button>
                <button className="btn danger">Tahsilatı iptal et</button>
              </div>
            </form>
          )}
        </section>
      )}

      {tab === "Sözleşme" && (
        <section className="acct-section">
          <dl className="file-summary cols-3">
            <div>
              <dt>Sözleşme no</dt>
              <dd>{contract.number}</dd>
            </div>
            <div>
              <dt>İmza tarihi</dt>
              <dd>{contract.signedAt ? date(contract.signedAt) : "—"}</dd>
            </div>
            <div>
              <dt>Ödeme planı</dt>
              <dd>{contract.planLabel}</dd>
            </div>
            <div>
              <dt>Bedel</dt>
              <dd className="num">{money(c.price)}</dd>
            </div>
            <div>
              <dt>Liste fiyatı (temsili)</dt>
              <dd className="num">
                {contract.listPrice ? money(contract.listPrice) : "—"}
              </dd>
            </div>
            <div>
              <dt>İndirim</dt>
              <dd className="num">
                {contract.discount > 0 ? money(contract.discount) : "—"}
              </dd>
            </div>
          </dl>
          <div className="file-actions">
            <Link
              className="btn compact"
              href={`/belge/?tur=sozlesme&id=${c.id}`}
              target="_blank"
            >
              <Printer size={14} /> Sözleşme özeti
            </Link>
            <Link
              className="btn compact"
              href={`/belge/?tur=plan&id=${c.id}`}
              target="_blank"
            >
              <Printer size={14} /> Ödeme planı
            </Link>
            <span className="spacer" />
            <button
              className="btn compact ghost"
              onClick={openPersonal}
            >
              <PenLine size={14} /> Müşteri bilgileri
            </button>
            <button
              className="btn compact ghost"
              onClick={() => setPanel(panel === "transfer" ? "" : "transfer")}
            >
              <ArrowRightLeft size={14} /> Devir
            </button>
          </div>
          {panel === "transfer" && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  act({
                    type: "contract-transfer",
                    id: c.id,
                    name: String(f.get("name")),
                    note: String(f.get("note")),
                  })
                )
                  setPanel("");
              }}
            >
              <h3>Sözleşme devri</h3>
              <p className="muted">
                Bakiye ve ödeme planı aynen devralana geçer. Yalnızca kurgusal
                ad kullanın.
              </p>
              <div className="form-grid">
                <label>
                  Devralan
                  <input
                    name="name"
                    required
                    maxLength={80}
                    placeholder="Yeni malikin adı soyadı"
                  />
                </label>
                <label>
                  Not
                  <input
                    name="note"
                    maxLength={120}
                    placeholder="Örn. noter devir protokolü"
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPanel("")}
                >
                  Vazgeç
                </button>
                <button className="btn primary" type="submit">
                  Devri kaydet
                </button>
              </div>
            </form>
          )}
          {panel === "edit" && (
            <form
              className="inline-form"
              key={c.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  act({
                    type: "customer",
                    id: c.id,
                    patch: {
                      name: String(f.get("name")),
                      phone: String(f.get("phone")),
                      email: String(f.get("email")),
                      owner: String(f.get("owner")),
                      note: String(f.get("note")),
                    },
                  })
                )
                  setPanel("");
              }}
            >
              <h3>Müşteri bilgileri</h3>
              <p className="muted">Yalnızca kurgusal bilgi girin.</p>
              <div className="form-grid">
                <label>
                  Ad soyad
                  <input
                    name="name"
                    defaultValue={c.name}
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  Satış sorumlusu
                  <select name="owner" defaultValue={c.owner ?? "Satış ekibi"}>
                    <option>Satış ekibi</option>
                    {ADVISORS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Telefon
                  <input
                    name="phone"
                    defaultValue={c.phone ?? ""}
                    placeholder="Temsili telefon"
                    maxLength={30}
                  />
                </label>
                <label>
                  E-posta
                  <input
                    name="email"
                    type="email"
                    defaultValue={c.email ?? ""}
                    placeholder="ornek@example.com"
                  />
                </label>
                <label className="full">
                  Not
                  <textarea
                    name="note"
                    defaultValue={c.note ?? ""}
                    maxLength={1000}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPanel("")}
                >
                  Vazgeç
                </button>
                <button className="btn primary" type="submit">
                  <Check size={15} /> Kaydet
                </button>
              </div>
            </form>
          )}
          <h3 className="subheading">Sözleşme geçmişi</h3>
          <ol className="acct-history">
            {contract.history.map((h, n) => (
              <li key={n}>
                <span className="acct-history-dot" />
                <div>
                  <b>{h.status}</b>
                  <small>
                    {date(h.date)} · {h.note}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {tab === "Belgeler" && (
        <RecordDocuments
          records={[c.id, `unit:${c.id}`]}
          project={c.project}
          uploadHref={`/arsiv?record=${c.id}&project=${c.project}`}
        />
      )}

      {tab === "İşlem geçmişi" && (
        <section className="acct-section">
          <ol className="file-history">
            {fileHistory(state, c.id).map((h, n) => (
              <li
                key={n}
                className={`k-${h.kind === "Sözleşme" ? "contract" : h.kind === "Değişiklik" ? "change" : "pay"}`}
              >
                <span className="fh-date">{date(h.date)}</span>
                <span className="fh-dot" />
                <span className="cc-list-main">
                  <b>{h.title}</b>
                  <small>{h.detail}</small>
                </span>
                {h.amount !== undefined && (
                  <span className="cc-amount num positive">
                    +{money(h.amount)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </Drawer>
  );
}

function ReceiptForm({
  label,
  remaining,
  balance,
  onCancel,
  onSubmit,
  simple = false,
}: {
  simple?: boolean;
  label: string;
  remaining: number;
  balance: number;
  onCancel: () => void;
  onSubmit: (amount: number, method: string, reference: string) => void;
}) {
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState("Banka havalesi");
  const [reference, setReference] = useState("");
  // Çift tıklama koruması: form bir kez gönderildikten sonra kilitlenir.
  const sent = useRef(false);
  const n = Number(amount);
  const valid =
    Number.isFinite(n) &&
    n > 0 &&
    Math.round(n * 100) <= Math.round(remaining * 100);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return (
    <form
      className="inline-form receipt-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (sent.current) return;
        if (valid && (simple || reference.trim())) {
          sent.current = true;
          onSubmit(n, method, reference);
          // Başarısız işlemde (ör. doğrulama hatası) yeniden denenebilsin
          setTimeout(() => (sent.current = false), 800);
        }
      }}
    >
      <div className="flex-between">
        <h3>Tahsilat · {label}</h3>
        <button type="button" className="text-button" onClick={onCancel}>
          Vazgeç
        </button>
      </div>
      <div className="form-grid">
        <label>
          Tahsil edilen tutar (TL)
          <input
            type="number"
            min="0.01"
            max={remaining}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </label>
        {!simple && (
          <label>
            Ödeme yöntemi
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Banka havalesi</option>
              <option>Nakit</option>
              <option>Kredi kartı</option>
            </select>
          </label>
        )}
        {!simple && (
          <label className="full">
            Dekont / açıklama
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Örn. HVL-261115-043 · Kasım taksiti"
              required
              maxLength={120}
            />
          </label>
        )}
      </div>
      <dl className="receipt-effect" aria-live="polite">
        <div>
          <dt>Bu ödemede kalan</dt>
          <dd className="num">{valid ? money(r2(remaining - n)) : "—"}</dd>
        </div>
        <div>
          <dt>Müşteri bakiyesi</dt>
          <dd className="num">
            {valid ? `${money(balance)} → ${money(r2(balance - n))}` : "—"}
          </dd>
        </div>
        <div>
          <dt>Kasa etkisi</dt>
          <dd className="num positive">{valid ? `+${money(n)}` : "—"}</dd>
        </div>
      </dl>
      {!valid && amount !== "" && (
        <p className="form-error">
          Tutar 0’dan büyük ve kalan {money(remaining)} tutarından küçük ya da
          eşit olmalı.
        </p>
      )}
      <div className="form-actions">
        <small className="muted">
          {valid && n < remaining
            ? "Kısmi tahsilat: kalan tutar aynı vadede açık kalır."
            : "Ödeme tamamen kapanır."}
        </small>
        <button
          className="btn primary"
          type="submit"
          disabled={!valid || (!simple && !reference.trim())}
        >
          <Check size={15} />{" "}
          {valid ? `${money(n)} tahsilatı kaydet` : "Tahsilatı kaydet"}
        </button>
      </div>
    </form>
  );
}
