"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DASHES, INK, SERIES, type Theme } from "@/lib/colors";
import { DICT, fmtHours, fmtNum, fmtPct } from "@/lib/i18n";
import { SAMPLE_H } from "@/lib/model";
import type { Lang } from "@/lib/state";

export interface ChartLine {
  key: string;
  label: string;
  current: boolean;
}

export interface LineStyle {
  color: string;
  dash?: string;
  width: number;
}

export function lineStyles(lines: ChartLine[], theme: Theme): LineStyle[] {
  let slot = 0;
  return lines.map((l) => {
    if (l.current) return { color: INK[theme].text, width: 3 };
    const i = slot++;
    return { color: SERIES[theme][i % 4]!, dash: DASHES[i % 4], width: 2 };
  });
}

export function Swatch({ s }: { s: LineStyle }) {
  return (
    <svg width="34" height="10" aria-hidden className="shrink-0">
      <line x1="1" y1="5" x2="33" y2="5" stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} />
    </svg>
  );
}

export default function TimeChart({
  data,
  lines,
  theme,
  lang,
  flight,
  height,
  fs = 12,
}: {
  data: Record<string, number>[];
  lines: ChartLine[];
  theme: Theme;
  lang: Lang;
  flight: number;
  height: number;
  fs?: number;
}) {
  const t = DICT[lang];
  const ink = INK[theme];
  const styles = useMemo(() => lineStyles(lines, theme), [lines, theme]);
  const k = Math.round(flight / SAMPLE_H);
  const at = data[Math.min(k, data.length - 1)] ?? {};
  // Najpierw linie tła, bieżąca na wierzchu.
  const order = lines.map((l, i) => ({ l, i })).sort((a, b) => Number(a.l.current) - Number(b.l.current));

  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${t.axisRisk}, ${t.axisTime}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 12, bottom: 22, left: 0 }}>
            <CartesianGrid stroke={ink.grid} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, 12]}
              ticks={[0, 2, 4, 6, 8, 10, 12]}
              stroke={ink.muted}
              tick={{ fill: ink.muted, fontSize: fs }}
              label={{ value: t.axisTime, position: "insideBottom", offset: -12, fill: ink.muted, fontSize: fs }}
            />
            <YAxis
              width={fs * 4}
              stroke={ink.muted}
              tick={{ fill: ink.muted, fontSize: fs }}
              tickFormatter={(v: number) => `${fmtNum(v, lang, v < 1 && v > 0 ? 1 : 0)}%`}
              domain={[0, (max: number) => Math.max(0.5, Math.ceil(max * 1.08 * 2) / 2)]}
            />
            <ReferenceLine
              x={2}
              stroke={ink.text}
              strokeWidth={1}
              label={{ value: "2 h", position: "insideTopLeft", fill: ink.text, fontSize: fs }}
            />
            {flight !== 2 && (
              <ReferenceLine
                x={flight}
                stroke={ink.muted}
                strokeDasharray="3 3"
                label={{ value: `${fmtHours(flight, lang)} h`, position: "insideTopRight", fill: ink.muted, fontSize: fs }}
              />
            )}
            <Tooltip
              separator=": "
              formatter={(v, name) => {
                const line = lines.find((l) => l.key === name);
                return [fmtPct(Number(v) / 100, lang), line?.label ?? String(name)];
              }}
              labelFormatter={(v) => `${fmtHours(Number(v), lang)} h`}
              contentStyle={{ background: ink.surface, border: `1px solid ${ink.grid}`, borderRadius: 2, fontSize: 13 }}
              labelStyle={{ color: ink.text, fontWeight: 700 }}
              itemStyle={{ color: ink.text }}
              itemSorter={(item) => -Number(item.value)}
            />
            {order.map(({ l, i }) => (
              <Line
                key={l.key}
                dataKey={l.key}
                name={l.key}
                type="linear"
                dot={false}
                isAnimationActive={false}
                stroke={styles[i]!.color}
                strokeWidth={styles[i]!.width}
                strokeDasharray={styles[i]!.dash}
                activeDot={{ r: 4, stroke: ink.surface, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul data-legend className="mt-1 space-y-1 text-[14px]" aria-label={t.valueAt(fmtHours(flight, lang))}>
        <li className="text-[12px] text-muted">{t.valueAt(fmtHours(flight, lang))}</li>
        {lines.map((l, i) => (
          <li
            key={l.key}
            data-legend-item
            data-color={styles[i]!.color}
            data-dash={styles[i]!.dash ?? ""}
            data-width={styles[i]!.width}
            className="flex items-center gap-2"
          >
            <Swatch s={styles[i]!} />
            <span className={l.current ? "font-bold" : ""}>{l.label}:</span>
            <span className="ml-auto font-serif font-bold">{fmtPct((at[l.key] ?? 0) / 100, lang)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
