"use client";
import { compact, money } from "@/lib/data";
import {
  installmentList,
  outstanding,
  requestList,
  requestStatus,
  type EnterpriseState,
  activeReceipts,
} from "@/lib/enterprise";
export function CashChart({
  state,
  project,
}: {
  state: EnterpriseState;
  project: string;
}) {
  const ins = installmentList(state).filter(
    (i) => project === "all" || i.project === project,
  );
  const bins = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 30],
  ];
  const values = bins.map(([a, b]) => {
    const selected = ins.filter(
      (i) =>
        i.due.startsWith("2026-11") &&
        +i.due.slice(-2) >= a &&
        +i.due.slice(-2) <= b,
    );
    const planned = selected.reduce((v, i) => v + i.amount, 0);
    const actual = activeReceipts(state)
      .filter(
        (r) =>
          ins.some((i) => i.id === r.installmentId) &&
          r.date.startsWith("2026-11") &&
          +r.date.slice(-2) >= a &&
          +r.date.slice(-2) <= b,
      )
      .reduce((v, r) => v + r.amount, 0);
    return { planned, actual };
  });
  const max = Math.max(
    ...values.flatMap((v) => [v.planned, v.actual]),
    1000000,
  );
  const top = Math.ceil(max / 1000000) * 1000000;
  return (
    <div className="cash-chart">
      <div className="chart-key">
        <span>
          <i />
          Vadesi gelen
        </span>
        <span>
          <i />
          Tahsil edilen
        </span>
      </div>
      <svg
        viewBox="0 0 650 215"
        role="img"
        aria-label="Kasım ayı haftalık planlanan ve gerçekleşen tahsilat karşılaştırması"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              x1="63"
              x2="630"
              y1={168 - v * 136}
              y2={168 - v * 136}
              stroke="#e7ebe6"
              strokeDasharray={v ? "3 5" : "0"}
            />
            <text x="4" y={173 - v * 136} fill="#5f6864" fontSize="11">
              {compact(top * v)}
            </text>
          </g>
        ))}
        {values.map((v, i) => (
          <g key={i}>
            <rect
              x={103 + i * 140}
              y={168 - (v.planned / top) * 136}
              height={(v.planned / top) * 136}
              width="28"
              rx="4"
              fill="#d4ddd4"
            >
              <title>{money(v.planned)} planlanan</title>
            </rect>
            <rect
              x={137 + i * 140}
              y={168 - (v.actual / top) * 136}
              height={(v.actual / top) * 136}
              width="28"
              rx="4"
              fill="#315c49"
            >
              <title>{money(v.actual)} tahsil edilen</title>
            </rect>
            <text
              x={135 + i * 140}
              y="195"
              textAnchor="middle"
              fill="#748379"
              fontSize="11"
            >
              {bins[i][0]}–{bins[i][1]} Kas
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
export function Ring({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="e-ring"
      style={{
        background: `conic-gradient(#b59a66 ${value * 3.6}deg,#ffffff16 0)`,
      }}
    >
      <div>
        <strong>%{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
