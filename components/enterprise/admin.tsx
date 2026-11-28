"use client";
// Yönetim & Ayarlar: şirket–proje yapısı, bu tarayıcıdaki veri durumu ve demo kapsamı.
// Kullanıcı/rol yönetimi bu sürümde yoktur; varmış gibi gösterilmez.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, RotateCcw, ShieldAlert } from "lucide-react";
import { useApp } from "./context";
import Backups from "./backups";
import { hubHref, visibleProjects } from "@/lib/catalog";
import { Panel } from "./shared";
import { projects, customerList, SNAPSHOT } from "@/lib/enterprise";
import { salesReport } from "@/lib/reports";
import { date } from "@/lib/data";
import FxPanel from "../byguzel/fx-panel";



export default function AdminView({ onReset }: { onReset: () => void }) {
  const { state, setProject, currency } = useApp();
  const router = useRouter();
  const [storage, setStorage] = useState<{ size: number; backup: boolean } | null>(null);
  useEffect(() => {
    try {
      setStorage({
        size: (localStorage.getItem("byguzel-enterprise-v1") ?? "").length,
        backup: !!localStorage.getItem("byguzel-enterprise-v1-yedek-v1"),
      });
    } catch {
      setStorage(null);
    }
  }, [state]);
  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `byguzel-demo-kayitlari-${SNAPSHOT}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const counts: [string, number][] = [
    [`Satış sözleşmesi (${currency})`, customerList(state).length],
    ["İmza sürecindeki sözleşme", state.drafts.length],
    ["Tahsilat makbuzu", state.receipts.length],
    ["Sonradan alınan peşinat", state.depositPayments.length],
    ["Satış sonrası talep", state.aftersales?.tickets.length ?? 0],
    ["Hatırlatma", state.reminders.length],
    ["İşlem geçmişi kaydı", state.audit.length],
  ];
  return (
    <div className="admin">
      <header className="page-head">
        <div>
          <h1>Yönetim & Ayarlar</h1>
          <p>Şirket ve proje yapısı, bu tarayıcıdaki kayıtlar ve demo kapsamı.</p>
        </div>
      </header>

      <FxPanel />

      <Panel title="Şirket ve projeler" subtitle="By Güzel ana şirkettir; projeler şirkete bağlıdır. Proje adı ve konumu resmîdir; satış ve finans verileri temsilidir.">
        <div className="e-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proje</th>
                <th>Konum</th>
                <th className="numeric">Bağımsız bölüm</th>
                <th className="numeric">Satılan</th>
                <th>Teslim</th>
                <th aria-label="İşlem" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const s = salesReport(state, { project: p.id }).total;
                return (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name}</b>
                      <small>{p.mix}</small>
                    </td>
                    <td>{p.location}</td>
                    <td className="numeric num">{s.total}</td>
                    <td className="numeric num">{s.sold}</td>
                    <td>{p.delivery || "Açıklanmadı"}</td>
                    <td className="row-actions">
                      <button
                        className="btn compact"
                        onClick={() => {
                          setProject(p.id);
                          router.push(hubHref(p.id));
                        }}
                      >
                        Projeye geç <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Backups />
      <div className="admin-grid">
        <Panel title="Veri ve depolama" subtitle="Kayıtlar yalnızca bu tarayıcıda saklanır.">
          <dl className="admin-list">
            {counts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className="num">{v}</dd>
              </div>
            ))}
            <div>
              <dt>Örnek satış fiyat şeması</dt>
              <dd>{state.basePricing === "v3.1" ? "Önceki sürümden korunan bedeller" : "Temiz başlangıç (katalog)"}</dd>
            </div>
            <div>
              <dt>Önceki sürüm yedeği</dt>
              <dd>{storage ? (storage.backup ? "Var (bu tarayıcıda)" : "Yok") : "—"}</dd>
            </div>
            <div>
              <dt>Kayıt boyutu</dt>
              <dd className="num">{storage ? `${Math.max(1, Math.round(storage.size / 1024))} KB` : "—"}</dd>
            </div>
            <div>
              <dt>Senaryo tarihi</dt>
              <dd>{date(SNAPSHOT)} (sabit)</dd>
            </div>
          </dl>
          <div className="form-actions">
            <button className="btn" onClick={exportJson}>
              <Download size={15} /> Kayıtları JSON olarak indir
            </button>
            <button className="btn" onClick={onReset}>
              <RotateCcw size={15} /> Demoyu sıfırla
            </button>
          </div>
        </Panel>

        <Panel title="Kullanıcılar ve yetkiler">
          <div className="admin-honest">
            <ShieldAlert size={20} />
            <div>
              <b>Bu demo sürümünde kullanıcı hesabı, rol ve yetkilendirme yoktur.</b>
              <p>
                Giriş ekranı şifresizdir ve herkes aynı demo kayıtlarını görür.
                Gerçek kullanım için kurumsal kimlik doğrulama, rol bazlı yetki
                (yönetici, satış, finans, şantiye), merkezî veritabanı ve denetim
                izi ayrı bir aşamada kurulacaktır.
              </p>
            </div>
          </div>
          <ul className="confirm-list">
            <li>Kişi ve firma adları kurgusaldır; gerçek müşteri, çalışan veya yüklenici değildir.</li>
            <li>Daire tipi, m², kat, cephe ve liste fiyatları temsili varsayımdır.</li>
            <li>SMS, e-posta, banka veya muhasebe entegrasyonu yoktur.</li>
            <li>Belgeler kayıtlardan anlık üretilir ve hukuki geçerliliği yoktur.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
