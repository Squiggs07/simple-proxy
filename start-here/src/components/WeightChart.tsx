"use client";

/**
 * Weight trend chart: a single trend line (the data) with raw weigh-ins as
 * recessive context dots. One axis, direct label on the latest trend value,
 * native tooltips per weigh-in. The monthly summary table on the same page
 * is the accessible table view of this data.
 */

interface TrendPoint {
  date: string;
  weightKg: number;
  trendKg: number;
}

const W = 320;
const H = 150;
const PAD = { top: 14, right: 52, bottom: 20, left: 10 };

export function WeightChart({
  trend,
  display,
}: {
  trend: TrendPoint[];
  display: (kg: number) => string;
}) {
  if (trend.length < 2) return null;

  const t0 = Date.parse(trend[0].date);
  const t1 = Date.parse(trend[trend.length - 1].date);
  const values = trend.flatMap((p) => [p.weightKg, p.trendKg]);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const pad = Math.max(0.5, (vMax - vMin) * 0.15);
  const lo = vMin - pad;
  const hi = vMax + pad;

  const x = (date: string) =>
    PAD.left +
    ((Date.parse(date) - t0) / Math.max(1, t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const path = trend
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.trendKg).toFixed(1)}`)
    .join(" ");
  const last = trend[trend.length - 1];

  const monthLabel = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Weight trend chart, currently ${display(last.trendKg)}`}
    >
      {/* Recessive gridlines at min/max */}
      {[vMax, vMin].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="#e7e5e4"
            strokeWidth="1"
          />
          <text
            x={W - PAD.right + 4}
            y={y(v) + 3}
            fontSize="9"
            fill="#a8a29e"
          >
            {display(v)}
          </text>
        </g>
      ))}

      {/* Raw weigh-ins: context, not the message */}
      {trend.map((p) => (
        <circle
          key={p.date}
          cx={x(p.date)}
          cy={y(p.weightKg)}
          r="2.5"
          fill="#78716c"
          opacity="0.45"
        >
          <title>{`${monthLabel(p.date)}: ${display(p.weightKg)} (trend ${display(p.trendKg)})`}</title>
        </circle>
      ))}

      {/* The trend line is the data */}
      <path d={path} fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <circle cx={x(last.date)} cy={y(last.trendKg)} r="4" fill="#059669" stroke="#ffffff" strokeWidth="2" />
      <text
        x={Math.min(x(last.date) + 6, W - PAD.right + 2)}
        y={y(last.trendKg) - 7}
        fontSize="10"
        fontWeight="600"
        fill="#292524"
      >
        {display(last.trendKg)}
      </text>

      {/* X labels: first and last date */}
      <text x={PAD.left} y={H - 6} fontSize="9" fill="#a8a29e">
        {monthLabel(trend[0].date)}
      </text>
      <text x={W - PAD.right} y={H - 6} fontSize="9" fill="#a8a29e" textAnchor="end">
        {monthLabel(last.date)}
      </text>
    </svg>
  );
}
