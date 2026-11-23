"use client";
// Proje bütçesi ve gelir-gider: temsili bütçe, sistemde kayıtlı hakediş / satın alma / şantiye gideri ödemeleri,
// barter mahsupları ve tahsilatlar. Şantiye gideri formu kasa, bütçe ve finans raporlarını birlikte günceller.
import { useMemo, useState } from "react";
import { HardHat, PiggyBank, Wallet, Receipt } from "lucide-react";
import { useApp } from "../enterprise/context";
import { Badge, Panel } from "../enterprise/shared";
import { budgetReport } from "@/lib/falcon-reports";
import { EXPENSE_CATEGORIES } from "@/lib/falcon";
import { projects, pname, SNAPSHOT } from "@/lib/enterprise";
import { money, compact, date } from "@/lib/data";

export default function BudgetView() {
  const { state, act, project: scope } = useApp();
  const [project, setProject] = useState(scope);
  const r = useMemo(() => budgetReport(state, project), [state, project]);
  const active = projects.filter((p) => p.status === "Aktif");
  const perProject = active.map((p) => ({ p, b: budgetReport(state, p.id) }));
  const max = Math.max(...perProject.map(({ b }) => Math.max(b.budget, b.income.contracted)), 1);
  return (
    <div className="fc-page">
      <header className="fc-head">
        <div>
          <span className="eyebrow">Proje bütçesi ve giderler</span>
          <h1>Bütçe, şantiye giderleri ve gelir-gider</h1>
          <p>Bütçe ve önceki dönem maliyeti temsili varsayımdır; ödemeler, mahsuplar ve tahsilatlar sistem kayıtlarından hesaplanır.</p>
        </div>
        <label className="fc-select">
          Kapsam
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">Tüm projeler</option>
            {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </header>

      <section className="fc-kpis">
        <div className="fc-kpi"><span><PiggyBank size={15} /> Proje bütçesi</span><b>{compact(r.budget)}</b><small>Temsili bütçe varsayımı</small></div>
        <div className="fc-kpi"><span><HardHat size={15} /> Harcanan</span><b>{compact(r.spent)}</b><small>Bütçe kullanımı %{Math.round(r.usedRate * 100)}</small><div className="progress"><i style={{ width: `${Math.min(100, r.usedRate * 100)}%` }} /></div></div>
        <div className="fc-kpi"><span>Onaylı, ödenmemiş</span><b>{compact(r.committed)}</b><small>Onay bekleyen {compact(r.pendingApproval)}</small></div>
        <div className={`fc-kpi ${r.remaining < 0 ? "warn" : ""}`}><span>Kalan bütçe</span><b>{compact(r.remaining)}</b><small>Bütçe − harcanan − onaylı</small></div>
        <div className="fc-kpi"><span><Wallet size={15} /> Tahsil edilen gelir</span><b>{compact(r.income.collected)}</b><small>Sözleşmeli satış {compact(r.income.contracted)}</small></div>
      </section>

      <div className="fc-grid">
        <Panel title="Gelir-gider karşılaştırması" subtitle="Proje bazında bütçe, harcanan ve tahsil edilen (aynı rapor motoru)">
          <div className="fc-bars">
            {perProject.map(({ p, b }) => (
              <div key={p.id} className="fc-bar-row">
                <b>{p.name}</b>
                <div className="fc-bar-set">
                  <div><span>Bütçe</span><i className="b-budget" style={{ width: `${(b.budget / max) * 100}%` }} /><em>{compact(b.budget)}</em></div>
                  <div><span>Harcanan</span><i className="b-spent" style={{ width: `${(b.spent / max) * 100}%` }} /><em>{compact(b.spent)}</em></div>
                  <div><span>Tahsilat</span><i className="b-income" style={{ width: `${(b.income.collected / max) * 100}%` }} /><em>{compact(b.income.collected)}</em></div>
                </div>
              </div>
            ))}
          </div>
          <p className="fc-note">Harcanan = önceki dönem maliyeti (temsili) + sistemde ödenen hakediş, satın alma ve şantiye giderleri + barter mahsupları.</p>
        </Panel>
        <ExpenseForm defaultProject={project === "all" ? "nergis" : project} onSaved={() => undefined} />
      </div>

      <div className="fc-grid">
        <Panel title="Gider türleri" subtitle={project === "all" ? "Tüm projeler" : pname(project)}>
          <div className="e-table-wrap">
            <table>
              <thead><tr><th>Tür</th><th className="numeric">Ödenen (nakit)</th><th className="numeric">Barter mahsubu</th><th className="numeric">Onaylı, ödenmemiş</th><th className="numeric">Onay bekleyen</th><th className="numeric">Kayıt</th></tr></thead>
              <tbody>
                {r.byType.map((t) => (
                  <tr key={t.type}><td><b>{t.type}</b></td><td className="numeric">{money(t.paid)}</td><td className="numeric">{money(t.offset)}</td><td className="numeric">{money(t.approved)}</td><td className="numeric">{money(t.pending)}</td><td className="numeric">{t.count}</td></tr>
                ))}
                <tr className="total"><td>Önceki dönem maliyeti (temsili)</td><td className="numeric" colSpan={5}>{money(r.prior)}</td></tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Şantiye giderleri" subtitle="Doğrudan ödenen giderler · ödeme tarihine göre">
          <div className="e-table-wrap">
            <table>
              <thead><tr><th>Gider</th><th>Kategori</th><th>Tarih</th><th className="numeric">Tutar</th></tr></thead>
              <tbody>
                {r.expenses.length === 0 && <tr><td colSpan={4} className="muted">Kayıtlı şantiye gideri yok.</td></tr>}
                {r.expenses.map((e) => (
                  <tr key={e.id}><td><b>{e.name}</b><small>{e.id} · {pname(e.project)} · {e.company}</small></td><td><Badge tone="neutral">{e.description}</Badge></td><td>{date(e.due)}</td><td className="numeric">{money(e.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ExpenseForm({ defaultProject }: { defaultProject: string; onSaved: () => void }) {
  const { act } = useApp();
  const active = projects.filter((p) => p.status === "Aktif");
  const [project, setProject] = useState(defaultProject);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(SNAPSHOT);
  const [msg, setMsg] = useState("");
  const value = Number(amount.replace(/\./g, "").replace(",", "."));
  return (
    <Panel title="Şantiye gideri kaydet" subtitle="Kasa, bütçe ve finans raporu birlikte güncellenir" action={<Receipt size={16} className="muted" />}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (act({ type: "expense", record: { project, category, company, name, amount: value, date: day } })) {
            setMsg(`${money(value)} gider kaydedildi; proje kasası ve bütçe raporu güncellendi.`);
            setName("");
            setAmount("");
          }
        }}
      >
        <label>Proje<select value={project} onChange={(e) => setProject(e.target.value)}>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Kategori<select value={category} onChange={(e) => setCategory(e.target.value)}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="full">Açıklama<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. hazır beton · 24 m³" maxLength={80} /></label>
        <label>Firma / tedarikçi<input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Örnek tedarikçi" maxLength={60} /></label>
        <label>Tutar (TL)<input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></label>
        <label>Ödeme tarihi<input type="date" required value={day} max={SNAPSHOT} onChange={(e) => setDay(e.target.value)} /></label>
        {msg && <p className="full callout success">{msg}</p>}
        <div className="form-actions full"><button className="btn primary" disabled={!value || value <= 0}>Gideri kaydet</button></div>
      </form>
    </Panel>
  );
}
