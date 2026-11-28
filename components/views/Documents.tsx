"use client";
import { useState } from "react";
import {
  Files,
  CalendarDays,
  CheckCheck,
  Clock,
  Plus,
  Download,
  PenLine,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { useApp } from "../enterprise/context";
import {
  SectionTitle,
  Kpi,
  Panel,
  Badge,
  Status,
  SearchBox,
  Drawer,
  AuditTrail,
  Empty,
} from "../enterprise/shared";
import {
  documents,
  requestList,
  requestStatus,
  projects,
  pname,
} from "@/lib/enterprise";
import { date, money } from "@/lib/data";
import { csvDownload } from "@/lib/export";
export default function Documents() {
  const { state, project, act } = useApp();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [note, setNote] = useState(false);
  const all = documents
      .filter((d) => project === "all" || d.project === project)
      .map((d) => ({ ...d, ...state.documentEdits[d.id] })),
    ds = all.filter(
      (d) =>
        (d.name + d.owner)
          .toLocaleLowerCase("tr")
          .includes(q.toLocaleLowerCase("tr")) &&
        (filter === "all" || d.status === filter),
    ),
    d = all.find((d) => d.id === selected);
  const agenda = [
    ...all.map((d) => ({
      id: d.id,
      date: d.date,
      name: d.name,
      kind: "Evrak kontrolü",
      project: d.project,
    })),
    ...requestList(state)
      .filter(
        (r) =>
          (project === "all" || r.project === project) &&
          requestStatus(state, r) === "Onaylandı",
      )
      .map((r) => ({
        id: r.id,
        date: r.due,
        name: `${r.company} · ${money(r.amount)}`,
        kind: "Onaylı ödeme",
        project: r.project,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <SectionTitle
        title="Proje evrakı"
        description="Ruhsat, tutanak ve kontrol listesi gibi proje evrakı ile ajanda. Sözleşme belgeleri Belge arşivi’ndedir."
        actions={
          <button className="btn primary" onClick={() => setNote(true)}>
            <Plus size={16} /> Yönetici notu
          </button>
        }
      />
      <div className="e-kpis three">
        <Kpi
          label="Proje evrakı"
          value={String(all.length)}
          sub="Ruhsat, sözleşme, teslim ve tutanak"
          icon={<Files size={20} />}
        />
        <Kpi
          label="Kontrol bekleyen"
          value={String(all.filter((d) => d.status !== "Hazır").length)}
          sub="Sorumlu ve kontrol tarihi atanmış"
          icon={<Clock size={20} />}
          tone="amber"
        />
        <Kpi
          label="Tamamlanan kontrol"
          value={String(all.filter((d) => d.status === "Hazır").length)}
          sub="Kontrol durumu hazır olan dosyalar"
          icon={<CheckCheck size={20} />}
        />
      </div>
      <div className="e-grid documents-grid">
        <Panel
          title="Evrak kontrol merkezi"
          subtitle="Örnek dosya kayıtları · gerçek ruhsat veya sözleşme içermez"
        >
          <div className="e-toolbar">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Evrak veya sorumlu ara…"
            />
            <select
              aria-label="Evrak durumu"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Tüm durumlar</option>
              {["Kontrol bekliyor", "İncelemede", "Taslak", "Hazır"].map(
                (t) => (
                  <option key={t}>{t}</option>
                ),
              )}
            </select>
          </div>
          <div className="e-document-list">
            {ds.map((d) => (
              <button key={d.id} onClick={() => setSelected(d.id)}>
                <span className="document-icon">
                  <Files size={23} />
                  <small>{d.type}</small>
                </span>
                <span>
                  <b>{d.name}</b>
                  <small>
                    {pname(d.project)} · {d.id}
                  </small>
                  <small>
                    {d.owner} · {date(d.date)}
                  </small>
                </span>
                <Status status={d.status} />
                <ArrowUpRight size={17} />
              </button>
            ))}
            {!ds.length && <Empty title="Eşleşen evrak bulunamadı" />}
          </div>
        </Panel>
        <Panel
          title="Yaklaşan tarihler"
          subtitle="Evrak kontrolü ve onaylı ödeme planı"
        >
          <div className="e-agenda">
            {agenda.map((a) => (
              <div key={a.id}>
                <div className="date-tile">
                  <b>{a.date.slice(-2)}</b>
                  {new Date(a.date + "T12:00")
                    .toLocaleDateString("tr-TR", { month: "short" })
                    .toLocaleUpperCase("tr")}
                </div>
                <span>
                  <b>{a.name}</b>
                  <small>
                    {a.kind} · {pname(a.project)}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel
        title="Yönetici çalışma notları"
        subtitle="Proje bazlı notlar ve takip gündemi"
        action={
          <button className="e-text-link" onClick={() => setNote(true)}>
            <Plus size={15} /> Not ekle
          </button>
        }
      >
        <div className="e-notes">
          <div className="e-note">
            <Badge tone="neutral">Örnek gündem</Badge>
            <p>
              Haftalık toplantıda Guzel Nature tahsilat planı, Guzel Life Premium
              sevkiyat tarihi ve hakediş onayları birlikte değerlendirilecek.
            </p>
            <small>15 Kasım 2026 · Proje yönetimi</small>
          </div>
          {state.notes
            .filter(
              (n) =>
                project === "all" ||
                n.project === project ||
                n.project === "all",
            )
            .map((n) => (
              <div className="e-note" key={n.id}>
                <div className="flex-between">
                  <Badge tone="neutral">{pname(n.project)}</Badge>
                  <button
                    className="icon-button"
                    aria-label="Yönetici notunu kaldır"
                    onClick={() => act({ type: "delete-note", id: n.id })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p>{n.text}</p>
                <small>By Güzel Yönetici · Bu oturumda eklendi</small>
              </div>
            ))}
        </div>
      </Panel>
      <Drawer
        open={!!d}
        title={d?.name ?? "Evrak"}
        eyebrow={d ? `${d.id} · ${pname(d.project)}` : undefined}
        onClose={() => setSelected(null)}
      >
        {d && (
          <>
            <div className="document-sheet">
              <span>By Güzel / EVRAK KONTROL FÖYÜ</span>
              <h3>{d.name}</h3>
              <p>Proje: {pname(d.project)}</p>
              <div>
                <b>Kontrol kapsamı</b>
                <ul>
                  <li>Belge numarası ve ilgili proje eşleştirmesi</li>
                  <li>İmza / onay alanlarının tamlığı</li>
                  <li>Eklerin ve tarih bilgisinin doğrulanması</li>
                </ul>
              </div>
              <small>
                Temsili kontrol föyüdür; resmî veya imzalı belge değildir.
              </small>
            </div>
            <form
              key={d.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act({
                  type: "document",
                  id: d.id,
                  patch: {
                    status: String(f.get("status")),
                    owner: String(f.get("owner")),
                    date: String(f.get("date")),
                  },
                });
              }}
            >
              <div className="form-grid">
                <label>
                  Kontrol durumu
                  <select name="status" defaultValue={d.status}>
                    {["Taslak", "Kontrol bekliyor", "İncelemede", "Hazır"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Kontrol tarihi
                  <input
                    name="date"
                    type="date"
                    defaultValue={d.date}
                    required
                  />
                </label>
                <label className="full">
                  Sorumlu
                  <input
                    name="owner"
                    defaultValue={d.owner}
                    required
                    maxLength={80}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    csvDownload(
                      [
                        ["Belge", d.name],
                        ["Proje", pname(d.project)],
                        ["Sorumlu", d.owner],
                        ["Tarih", d.date],
                        ["Durum", d.status],
                        ["Not", "Temsili kontrol föyüdür."],
                      ],
                      `${d.id}.csv`,
                    )
                  }
                >
                  <Download size={15} /> Kontrol föyü
                </button>
                <button className="btn primary">Kontrolü kaydet</button>
              </div>
            </form>
            <h3 className="subheading">Kontrol geçmişi</h3>
            <AuditTrail items={state.audit.filter((a) => a.entity === d.id)} />
          </>
        )}
      </Drawer>
      <Drawer
        open={note}
        title="Yeni yönetici notu"
        onClose={() => setNote(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              act({
                type: "note",
                text: String(f.get("text")),
                project: String(f.get("project")),
              })
            )
              setNote(false);
          }}
        >
          <div className="form-grid">
            <label className="full">
              Proje kapsamı
              <select name="project" defaultValue={project}>
                <option value="all">Tüm projeler</option>
                {projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              Not ve takip aksiyonu
              <textarea
                name="text"
                required
                maxLength={1000}
                placeholder="Konu, sorumlu ve sonraki adım…"
              />
            </label>
          </div>
          <button className="btn primary" type="submit">
            Notu kaydet
          </button>
        </form>
      </Drawer>
    </>
  );
}
