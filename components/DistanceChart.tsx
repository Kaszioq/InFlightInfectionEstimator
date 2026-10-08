"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { INK, SERIES, type Theme } from "@/lib/colors";
import { DICT, fmtNum, fmtPct } from "@/lib/i18n";
import type { Lang } from "@/lib/state";

export interface DistanceBar {
  label: string; // np. "A"
  risk: Float64Array;
  dist: number[]; // odległość każdego rzędu od najbliższego chorego
  me: number;
}

export default function DistanceChart({
  bars,
  theme,
  lang,
  height,
  fs = 12,
}: {
  bars: DistanceBar[];
  theme: Theme;
  lang: Lang;
  height: number;
  fs?: number;
}) {
  const t = DICT[lang];
  const ink = INK[theme];
  const colors = [SERIES[theme][0]!, SERIES[theme][1]!];

  // Wspólna oś: odległość od najbliższego chorego, słupek to średnia z rzędów w tej odległości.
  const maxD = Math.max(...bars.flatMap((b) => b.dist));
  const data = Array.from({ length: maxD + 1 }, (_, d) => {
    const row: Record<string, number | null> = { d };
    bars.forEach((b, j) => {
      const rows = b.dist.flatMap((x, i) => (x === d ? [i] : []));
      row[`s${j}`] = rows.length ? (100 * rows.reduce((sum, i) => sum + b.risk[i]!, 0)) / rows.length : null;
      row[`n${j}`] = rows.length;
    });
    return row;
  });

  const ticks = data.map((r) => r.d!).filter((d) => maxD <= 15 || d % 5 === 0);

  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${t.axisRisk}, ${t.axisDistance}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 22, left: 0 }} barGap={1} barCategoryGap="12%">
            <CartesianGrid stroke={ink.grid} vertical={false} />
            <XAxis
              dataKey="d"
              stroke={ink.muted}
              tick={{ fill: ink.muted, fontSize: fs }}
              ticks={ticks}
              interval={0}
              label={{ value: t.axisDistance, position: "insideBottom", offset: -12, fill: ink.muted, fontSize: fs }}
            />
            <YAxis
              width={fs * 4}
              stroke={ink.muted}
              tick={{ fill: ink.muted, fontSize: fs }}
              tickFormatter={(v: number) => `${fmtNum(v, lang, v < 1 && v > 0 ? 1 : 0)}%`}
            />
            <Tooltip
              separator=": "
              cursor={{ fill: ink.grid, opacity: 0.5 }}
              labelFormatter={(d) => t.rowOffset(Number(d), bars[0]!.dist.filter((x) => x === 0).length > 1)}
              formatter={(v, name) => {
                const j = Number(String(name).slice(1));
                return [fmtPct(Number(v) / 100, lang), bars.length > 1 ? bars[j]!.label : t.axisRisk];
              }}
              contentStyle={{ background: ink.surface, border: `1px solid ${ink.grid}`, borderRadius: 2, fontSize: 13 }}
              labelStyle={{ color: ink.text, fontWeight: 700 }}
              itemStyle={{ color: ink.text }}
            />
            {bars.map((b, j) => (
              <Bar key={j} dataKey={`s${j}`} name={`s${j}`} isAnimationActive={false} radius={[2, 2, 0, 0]}>
                {data.map((row) => {
                  const isMe = row.d === b.dist[b.me];
                  return (
                    <Cell
                      key={row.d}
                      fill={isMe ? ink.accent : colors[j]}
                      stroke={isMe ? ink.text : "none"}
                      strokeWidth={isMe ? 1 : 0}
                    />
                  );
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul data-legend className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
        {bars.length > 1 &&
          bars.map((b, j) => (
            <li key={b.label} data-legend-item data-color={colors[j]} data-width="8" className="flex items-center gap-2">
              <span className="inline-block h-3 w-3" style={{ background: colors[j] }} aria-hidden />
              {b.label}
            </li>
          ))}
        <li data-legend-item data-color={ink.accent} data-width="8" className="flex items-center gap-2">
          <span className="inline-block h-3 w-3" style={{ background: ink.accent }} aria-hidden />
          {t.mapLegendMe}
        </li>
      </ul>
    </div>
  );
}
