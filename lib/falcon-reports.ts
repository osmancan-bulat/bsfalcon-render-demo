// BŞ Falcon raporları: kat karşılığı paylaşım özeti ve proje bütçe / gelir-gider raporu.
// Bütün ekranlar (yönetim merkezi, proje merkezleri, kat karşılığı ve raporlar) bu fonksiyonları kullanır;
// böylece aynı veri kaynağından tutarlı sayılar üretilir.
import {
  type EnterpriseState,
  customerList,
  reservedUnits,
  requestList,
  requestStatus,
  netPayable,
  unitOwner,
  workList,
  projects,
} from "./enterprise.ts";
import { units, type Unit } from "./units.ts";
import { syncCatalog } from "./catalog.ts";
import { financialReport } from "./reports.ts";
import { CONTRACTOR, seedLandShare, seedProcess, PROCESS_STEPS, type LandAgreement } from "./falcon.ts";
import { r2 } from "./plan.ts";

export type UnitState = "Satıldı" | "İmza sürecinde" | "Barter" | "Rezerve" | "Müsait" | "Arsa sahibi";

/** Bağımsız bölümün ticari durumu (satış ekranlarıyla aynı öncelik sırası). */
export function unitState(s: EnterpriseState, id: string, project: string): UnitState {
  if (customerList(s).some((c) => c.id === id)) return "Satıldı";
  if ((s.drafts ?? []).some((d) => d.id === id)) return "İmza sürecinde";
  if (s.barters.some((b) => b.unitId === id)) return "Barter";
  if (reservedUnits(s, project).includes(id)) return "Rezerve";
  if (unitOwner(s, id) !== CONTRACTOR) return "Arsa sahibi";
  return "Müsait";
}

export const agreementOf = (s: EnterpriseState, project: string): LandAgreement | undefined =>
  (s.landshare ?? seedLandShare).agreements.find((a) => a.project === project);

/** Kat karşılığı paylaşım özeti: paydaş bazlı adet, brüt alan, liste değeri ve gerçekleşen oran. */
export function shareSummary(s: EnterpriseState, project: string) {
  syncCatalog(s);
  const ag = agreementOf(s, project);
  const list = units.filter((u) => u.project === project);
  const owners = [
    { id: CONTRACTOR, name: "Yüklenici · BŞ Falcon Group", stake: 100 },
    ...(ag?.owners ?? []).map((o) => ({ id: o.id, name: o.name, stake: o.stake })),
  ];
  const by = owners.map((o) => {
    const us = list.filter((u) => unitOwner(s, u.id) === o.id);
    return {
      ...o,
      count: us.length,
      gross: r2(us.reduce((a, u) => a + u.gross, 0)),
      listValue: us.reduce((a, u) => a + u.listPrice, 0),
      flats: us.filter((u) => u.type !== "Dükkân").length,
      shops: us.filter((u) => u.type === "Dükkân").length,
    };
  });
  const totalGross = r2(list.reduce((a, u) => a + u.gross, 0));
  const landGross = r2(by.filter((o) => o.id !== CONTRACTOR).reduce((a, o) => a + o.gross, 0));
  const actualLandRatio = totalGross ? Math.round((landGross / totalGross) * 1000) / 10 : 0;
  const floors = [...new Set(list.map((u) => u.floor))].sort((a, b) => b - a).map((f) => ({
    floor: f,
    label: f === 0 ? "Zemin kat" : `${f}. kat`,
    units: list.filter((u) => u.floor === f).sort((a, b) => a.no - b.no).map((u) => ({
      unit: u,
      owner: unitOwner(s, u.id),
      state: unitState(s, u.id, project),
    })),
  }));
  const contractor = by[0];
  const states = list.map((u) => unitState(s, u.id, project));
  return {
    agreement: ag,
    owners: by,
    totalUnits: list.length,
    totalGross,
    landGross,
    actualLandRatio,
    agreedLandRatio: ag?.landRatio ?? 0,
    deviation: ag ? Math.round((actualLandRatio - ag.landRatio) * 10) / 10 : 0,
    floors,
    contractorSellable: states.filter((x) => x === "Müsait").length,
    contractorSold: states.filter((x) => x === "Satıldı").length,
    contractorUnits: contractor.count,
    openObligations: (ag?.obligations ?? []).filter((o) => !o.done).length,
    missingDocs: (ag?.documents ?? []).filter((d) => d.status !== "Tamam").length,
  };
}

const ownerName = (s: EnterpriseState, project: string, id: string) =>
  id === CONTRACTOR ? "Yüklenici" : agreementOf(s, project)?.owners.find((o) => o.id === id)?.name ?? id;
export { ownerName };

/** Proje bütçe ve gelir-gider raporu (temsili bütçe; gider kalemleri sistem kayıtlarından). */
export function budgetReport(s: EnterpriseState, project: string) {
  syncCatalog(s);
  const inScope = (p: string) => project === "all" || p === project;
  const ps = projects.filter((p) => inScope(p.id));
  const reqs = requestList(s).filter((r) => inScope(r.project));
  const offsets = (s.offsets ?? []).filter((o) => reqs.some((r) => r.id === o.requestId));
  const offsetTotal = r2(offsets.reduce((a, o) => a + o.amount, 0));
  const byStatus = (st: string) => reqs.filter((r) => requestStatus(s, r) === st);
  const paidCash = r2(byStatus("Ödendi").reduce((a, r) => a + netPayable(s, r), 0));
  const approvedUnpaid = r2(byStatus("Onaylandı").reduce((a, r) => a + netPayable(s, r), 0));
  const pendingApproval = r2(byStatus("Onay bekliyor").reduce((a, r) => a + r.amount, 0));
  const budget = ps.reduce((a, p) => a + p.budget, 0);
  // Önceki dönem maliyeti (sisteme geçiş öncesi, temsili) + sistemde kayıtlı ödemeler ve mahsuplar
  const prior = ps.reduce((a, p) => a + p.cost, 0);
  const spent = r2(prior + paidCash + offsetTotal);
  const committed = approvedUnpaid;
  const remaining = r2(budget - spent - committed);
  const types = ["Hakediş", "Satın alma", "Şantiye gideri"];
  const byType = types.map((t) => {
    const rs = reqs.filter((r) => r.type === t);
    return {
      type: t,
      paid: r2(rs.filter((r) => requestStatus(s, r) === "Ödendi").reduce((a, r) => a + netPayable(s, r), 0)),
      offset: r2(offsets.filter((o) => rs.some((r) => r.id === o.requestId)).reduce((a, o) => a + o.amount, 0)),
      approved: r2(rs.filter((r) => requestStatus(s, r) === "Onaylandı").reduce((a, r) => a + netPayable(s, r), 0)),
      pending: r2(rs.filter((r) => requestStatus(s, r) === "Onay bekliyor").reduce((a, r) => a + r.amount, 0)),
      count: rs.length,
    };
  });
  const expenses = reqs.filter((r) => r.type === "Şantiye gideri");
  const categories = [...new Set(expenses.map((r) => r.description || "Diğer"))].map((c) => ({
    category: c,
    amount: r2(expenses.filter((r) => (r.description || "Diğer") === c && requestStatus(s, r) === "Ödendi").reduce((a, r) => a + netPayable(s, r), 0)),
    count: expenses.filter((r) => (r.description || "Diğer") === c).length,
  }));
  const fin = financialReport(s, { project });
  const workValue = workList(s).filter((w) => inScope(w.project)).reduce((a, w) => a + w.value, 0);
  return {
    budget,
    prior,
    paidCash,
    offsetTotal,
    spent,
    committed,
    pendingApproval,
    remaining,
    usedRate: budget ? spent / budget : 0,
    byType,
    categories,
    expenses: expenses.sort((a, b) => b.due.localeCompare(a.due)),
    workValue,
    income: { contracted: fin.contracted, collected: fin.collected, balance: fin.balance, overdue: fin.overdue },
    /** Tahsil edilen − (önceki maliyet + ödenen + mahsup): proje nakit dengesi (temsili). */
    net: r2(fin.collected - spent),
  };
}

/** Proje süreci (resmî 8 adım) ve güvence belge takibi. */
export function processOf(s: EnterpriseState, project: string) {
  const pr = (s.process ?? seedProcess)[project];
  if (!pr) return null;
  const done = pr.steps.filter((x) => x.status === "Tamamlandı").length;
  const current = pr.steps.find((x) => x.status === "Devam ediyor") ?? pr.steps.find((x) => x.status === "Bekliyor");
  return { ...pr, done, total: PROCESS_STEPS.length, current, details: PROCESS_STEPS };
}

export const ownerColorClass = (s: EnterpriseState, project: string, owner: string) => {
  if (owner === CONTRACTOR) return "o-yk";
  const idx = agreementOf(s, project)?.owners.findIndex((o) => o.id === owner) ?? 0;
  return `o-as${Math.max(0, idx) + 1}`;
};
export type { Unit };
