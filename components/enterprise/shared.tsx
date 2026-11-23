"use client";
import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
  Download,
  Check,
} from "lucide-react";
import { Badge, Panel, Progress } from "../ui";
export { Badge, Panel, Progress };
export function Logo() {
  return (
    <div className="official-logo">
      <img src="/images/falcon-lockup-black-gold.svg" alt="BŞ Falcon Group resmî logosu" />
    </div>
  );
}
export function Drawer({
  open,
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`e-drawer ${wide ? "wide" : ""}`}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="drawer-head">
        <div>
          <span className="eyebrow">{eyebrow ?? "BŞ Falcon YÖNETİM MERKEZİ"}</span>
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Paneli kapat"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="drawer-body">{children}</div>
    </dialog>
  );
}
export function Kpi({
  label,
  value,
  sub,
  progress,
  icon,
  tag,
  tone = "green",
}: {
  label: string;
  value: string;
  sub: string;
  progress?: number;
  icon: ReactNode;
  tag?: string;
  tone?: string;
}) {
  return (
    <section className={`e-kpi ${tone}`}>
      <div className="e-kpi-top">
        <span>{label}</span>
        <div>{icon}</div>
      </div>
      <strong>{value}</strong>
      <div className="e-kpi-meta">
        {tag && <Badge tone={tone}>{tag}</Badge>}
        <span>{sub}</span>
      </div>
      {progress !== undefined && (
        <Progress value={Math.max(0, Math.min(100, progress))} />
      )}
    </section>
  );
}
export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="e-empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      {detail && <p>{detail}</p>}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Kayıtlarda ara…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="e-search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="icon-button"
          aria-label="Aramayı temizle"
          onClick={() => onChange("")}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
export function SectionTitle({
  title,
  description,
  actions,
  kicker = "BŞ Falcon · OPERASYON MERKEZİ",
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="e-title">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="e-title-actions">{actions}</div>
    </div>
  );
}
export function Status({ status }: { status: string }) {
  return (
    <Badge
      tone={
        /Gecik|İade|Kontrol bekliyor/.test(status)
          ? "red"
          : /bekliyor|İncelemede|Kısmi/.test(status)
            ? "amber"
            : /Ödendi|Onaylandı|Tamam|Tahsil|Hazır|Mahsup|Aktif/.test(status)
              ? "green"
              : "neutral"
      }
    >
      {status}
    </Badge>
  );
}
export function Steps({
  labels,
  current,
}: {
  labels: string[];
  current: number;
}) {
  return (
    <div className="e-steps">
      {labels.map((l, i) => (
        <div key={l} className={i <= current ? "done" : ""}>
          <span>{i < current ? <Check size={12} /> : i + 1}</span>
          <small>{l}</small>
        </div>
      ))}
    </div>
  );
}
export function AuditTrail({
  items,
}: {
  items: { id: string; message: string; time: string }[];
}) {
  return (
    <div className="audit-list">
      {items.length ? (
        items.slice(0, 8).map((a) => (
          <div key={a.id}>
            <i />
            <span>
              <b>{a.message}</b>
              <small>BŞ Falcon Yönetici · {a.time}</small>
            </span>
          </div>
        ))
      ) : (
        <p className="muted">Bu kayıtta henüz işlem yapılmadı.</p>
      )}
    </div>
  );
}
