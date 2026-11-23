"use client";
import { useState } from "react";
import {
  Check,
  PenLine,
  Download,
  ArrowUpRight,
  PackageCheck,
  CornerDownLeft,
  Wallet,
  Handshake,
} from "lucide-react";
import { useApp } from "./context";
import { unitShort } from "@/lib/units";
import { BarterDrawer } from "./barter";
import { unitById } from "@/lib/units";
import { Drawer, Status, Steps, AuditTrail, Badge } from "./shared";
import {
  requestList,
  requestStatus,
  netPayable,
  offsetFor,
  barterOffset,
  pname,
  summary,
  type RequestRecord,
  paidDate,
} from "@/lib/enterprise";
import { money, date } from "@/lib/data";
import { csvDownload } from "@/lib/export";
export default function RequestPanel({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const { state, act } = useApp();
  const [barterOpen, setBarterOpen] = useState(false);
  const [editing, setEditing] = useState(false),
    [confirm, setConfirm] = useState("");
  const r = requestList(state).find((r) => r.id === id);
  if (!r) return null;
  const status = requestStatus(state, r);
  // Aynı proje ve firmadaki barter anlaşması (hakediş ↔ barter bağlantısı)
  const barter =
    r.type === "Hakediş"
      ? state.barters.find(
          (b) =>
            b.project === r.project &&
            b.company.trim().toLocaleLowerCase("tr") ===
              r.company.trim().toLocaleLowerCase("tr"),
        )
      : undefined;
  const barterLeft = barter
    ? barter.amount - barterOffset(state, barter.id)
    : 0;
  const isPurchase = r.type === "Satın alma";
  const delivered = state.delivered.includes(r.id);
  return (
    <>
      <Drawer
        open
        title={r.name}
        eyebrow={`${r.id} · ${pname(r.project)}`}
        onClose={onClose}
      >
        <div className="request-summary">
          <span>
            {r.type === "Hakediş"
              ? "Onaya esas net hakediş"
              : "Sipariş toplamı"}
          </span>
          <strong>{money(r.amount)}</strong>
          <Status status={status} />
        </div>
        {barter ? (
          <div className="link-card">
            <span className="cc-task-icon t-bronze">
              <Handshake size={16} />
            </span>
            <span className="cc-list-main">
              <b>
                Barter · {unitShort(barter.unitId)} · {barter.company}
              </b>
              <small>
                Bu hakedişe mahsup {money(offsetFor(state, r.id))} · nakit
                ödenecek {money(netPayable(state, r))} · barter kalan yükümlülük{" "}
                {money(barterLeft)}
              </small>
            </span>
            <button className="btn compact" onClick={() => setBarterOpen(true)}>
              {status === "Onaylandı" &&
              barterLeft > 0 &&
              netPayable(state, r) > 0
                ? "Barterdan mahsup et"
                : "Barter dosyası"}
            </button>
          </div>
        ) : (
          offsetFor(state, r.id) > 0 && (
            <p className="callout">
              Barter mahsubu: {money(offsetFor(state, r.id))} · nakit ödenecek
              kısım {money(netPayable(state, r))}
            </p>
          )
        )}
        <Steps
          labels={["Talep", "Yönetici onayı", "Ödeme planı", "Ödendi"]}
          current={
            status === "Ödendi" || status === "Mahsup edildi"
              ? 3
              : status === "Onaylandı"
                ? 2
                : 0
          }
        />
        {editing ? (
          <form
            className="edit-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                act({
                  type: "edit-request",
                  id: r.id,
                  patch: {
                    name: String(f.get("name")),
                    company: String(f.get("company")),
                    amount: Number(f.get("amount")),
                    due: String(f.get("due")),
                    description: String(f.get("description")),
                  },
                })
              )
                setEditing(false);
            }}
          >
            <RequestFields record={r} />
            <div className="form-actions">
              <button
                className="btn"
                type="button"
                onClick={() => setEditing(false)}
              >
                Vazgeç
              </button>
              <button className="btn primary">Kaydet ve onaya sun</button>
            </div>
          </form>
        ) : (
          <>
            <dl className="detail-list">
              <div>
                <dt>Firma / taşeron</dt>
                <dd>{r.company}</dd>
              </div>
              <div>
                <dt>Proje</dt>
                <dd>{pname(r.project)}</dd>
              </div>
              <div>
                <dt>Vade (planlanan ödeme)</dt>
                <dd>
                  {date(r.due)}
                  {requestStatus(state, r) === "Ödendi" && (
                    <small>
                      {paidDate(state, r.id)
                        ? `Gerçek ödeme ${date(paidDate(state, r.id)!)}`
                        : "Ödeme tarihi kaydı yok"}
                    </small>
                  )}
                </dd>
              </div>
              <div>
                <dt>İşlem türü</dt>
                <dd>{r.type}</dd>
              </div>
              <div>
                <dt>Kontrol sorumlusu</dt>
                <dd>
                  {isPurchase ? "Satın alma birimi" : "Şantiye teknik ofis"}
                </dd>
              </div>
              {isPurchase && (
                <div>
                  <dt>Malzeme teslimi</dt>
                  <dd>
                    <Badge tone={delivered ? "green" : "amber"}>
                      {delivered ? "Teslim alındı" : "Teslim bekleniyor"}
                    </Badge>
                  </dd>
                </div>
              )}
            </dl>
            <div className="callout">
              {r.description ??
                (isPurchase
                  ? "Talep edilen malzemenin saha ihtiyaç planına uygunluğu kontrol edildi. Teslim kabulü ayrı kaydedilir."
                  : "İmalat ölçümü ve saha kontrolü tamamlandı. Gösterilen tutar, demo senaryosunda onaya esas net hakediştir.")}
            </div>
            <div className="request-actions">
              {status === "Onay bekliyor" && (
                <>
                  <button
                    className="btn primary"
                    onClick={() => setConfirm("approve")}
                  >
                    <Check size={16} /> Onayla
                  </button>
                  <button className="btn" onClick={() => setConfirm("reject")}>
                    <CornerDownLeft size={16} /> Revizyona iade
                  </button>
                </>
              )}
              {["Onay bekliyor", "İade edildi"].includes(status) && (
                <button className="btn" onClick={() => setEditing(true)}>
                  <PenLine size={15} /> Düzenle
                </button>
              )}
              {status === "Onaylandı" && (
                <button
                  className="btn primary"
                  onClick={() => setConfirm("pay-order")}
                >
                  <Wallet size={16} /> Ödeme kaydet
                </button>
              )}
              {isPurchase &&
                ["Onaylandı", "Ödendi"].includes(status) &&
                !delivered && (
                  <button className="btn" onClick={() => setConfirm("deliver")}>
                    <PackageCheck size={16} /> Teslim al
                  </button>
                )}
              <button
                className="btn"
                onClick={() =>
                  csvDownload(
                    [
                      ["İşlem", r.id],
                      ["Proje", pname(r.project)],
                      ["Firma", r.company],
                      ["Açıklama", r.name],
                      ["Tutar", r.amount],
                      ["Durum", status],
                      ["Vade", r.due],
                      [
                        "Belge türü",
                        "Temsili işlem özeti; gerçek ödeme dekontu değildir.",
                      ],
                    ],
                    `${r.id}-ozet.csv`,
                  )
                }
              >
                <Download size={15} /> İşlem özeti
              </button>
            </div>
            {confirm && (
              <div className="confirm-inline">
                <h3>
                  {confirm === "approve"
                    ? "Ödeme planına aktarılsın mı?"
                    : confirm === "pay-order"
                      ? "Ödeme kaydı oluşturulsun mu?"
                      : confirm === "deliver"
                        ? "Malzeme teslim alındı mı?"
                        : "Revizyona iade edilsin mi?"}
                </h3>
                <p>
                  {confirm === "pay-order"
                    ? `${money(r.amount)} proje kasa bakiyesinden düşer. Kullanılabilir demo bakiye: ${money(summary(state, r.project).cash)}. Gerçek para transferi yapılmaz.`
                    : confirm === "approve"
                      ? "Onaylanan tutar finans ekranında ödeme bekleyenler listesine eklenir."
                      : "İşlem durumu ve geçmişi güncellenecek."}
                </p>
                <div className="form-actions">
                  <button className="btn" onClick={() => setConfirm("")}>
                    Vazgeç
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => {
                      if (
                        act({
                          type: confirm as
                            "approve" | "reject" | "pay-order" | "deliver",
                          id: r.id,
                        })
                      )
                        setConfirm("");
                    }}
                  >
                    İşlemi tamamla
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        <h3 className="subheading">İşlem geçmişi</h3>
        <AuditTrail items={state.audit.filter((a) => a.entity === r.id)} />
      </Drawer>
      {barter && (
        <BarterDrawer
          id={barterOpen ? barter.id : null}
          onClose={() => setBarterOpen(false)}
        />
      )}
    </>
  );
}
export function RequestFields({ record }: { record?: RequestRecord }) {
  return (
    <div className="form-grid">
      <label className="full">
        İşlem açıklaması
        <input
          name="name"
          defaultValue={record?.name}
          placeholder="Örn. 5. kat betonarme hakedişi"
          required
          maxLength={140}
        />
      </label>
      <label className="full">
        Firma / taşeron
        <input
          name="company"
          defaultValue={record?.company}
          placeholder="Firma adı"
          required
          maxLength={100}
        />
      </label>
      <label>
        Tutar (TL)
        <input
          name="amount"
          type="number"
          min="1"
          step="0.01"
          defaultValue={record?.amount}
          required
        />
      </label>
      <label>
        Planlanan ödeme
        <input
          name="due"
          type="date"
          defaultValue={record?.due ?? "2026-11-25"}
          min="2026-11-15"
          required
        />
      </label>
      <label className="full">
        Açıklama / kontrol notu
        <textarea
          name="description"
          defaultValue={record?.description}
          maxLength={1000}
        />
      </label>
    </div>
  );
}
