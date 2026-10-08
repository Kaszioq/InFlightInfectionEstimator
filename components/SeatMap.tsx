"use client";

import { INK, RAMP_TICKS, rampGradient, riskColor, type Theme } from "@/lib/colors";
import { DICT, fmtNum, fmtPct } from "@/lib/i18n";
import { SEAT_LETTERS, seatId, type Lang } from "@/lib/state";
import { useWidth } from "./hooks";

export type MapMode = "sick" | "me";

interface Props {
  risk: Float64Array;
  seats: number[];
  sick: number[]; // identyfikatory miejsc
  me: number;
  theme: Theme;
  lang: Lang;
  onSeat: (row: number, seat: number) => void;
}

const SEAT = 16; // rozmiar fotela w jednostkach SVG
const GAP = 3;
const AISLE = 14;

export default function SeatMap(p: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const vertical = width > 0 && width < 640;
  return (
    <div ref={ref}>
      {width > 0 && (vertical ? <Vertical {...p} /> : <Horizontal {...p} />)}
      <Legend theme={p.theme} lang={p.lang} />
    </div>
  );
}

/** Pozycje 6 foteli w poprzek kabiny: A B C | przejście | D E F. */
const OFFSETS = [0, 1, 2, 3, 4, 5].map((s) => s * (SEAT + GAP) + (s >= 3 ? AISLE : 0));
const ACROSS = 6 * (SEAT + GAP) + AISLE - GAP;

/** Wszystkie fotele jednego rzędu; każdy fotel to osobny przycisk. */
function RowSeats({ i, p, along, horizontal }: { i: number; p: Props; along: number; horizontal: boolean }) {
  const t = DICT[p.lang];
  const ink = INK[p.theme];
  const fill = riskColor(p.risk[i] ?? 0, p.theme);
  const n = p.seats[i] ?? 6;
  const risk = fmtPct(p.risk[i] ?? 0, p.lang);
  return (
    <>
      {OFFSETS.slice(0, n).map((off, s) => {
        const x = horizontal ? along : off;
        const y = horizontal ? off : along;
        const isSick = p.sick.includes(seatId(i, s));
        const label = t.seatAria(`${i + 1}${SEAT_LETTERS[s]}`, risk, isSick);
        return (
          <g
            key={s}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={isSick}
            className="seat cursor-pointer outline-none"
            onClick={() => p.onSeat(i, s)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                p.onSeat(i, s);
              }
            }}
          >
            {/* Obszar dotyku większy niż sam fotel. */}
            <rect x={x - GAP / 2} y={y - GAP / 2} width={SEAT + GAP} height={SEAT + GAP} fill="transparent" />
            <rect
              className="seat-shape"
              x={x}
              y={y}
              width={SEAT}
              height={SEAT}
              rx={3}
              fill={isSick ? ink.text : fill}
              stroke={ink.grid}
              strokeWidth={0.75}
            />
            {isSick && (
              <path
                d={`M${x + 4.5} ${y + 4.5} L${x + SEAT - 4.5} ${y + SEAT - 4.5} M${x + SEAT - 4.5} ${y + 4.5} L${x + 4.5} ${y + SEAT - 4.5}`}
                stroke={ink.surface}
                strokeWidth={2.2}
                pointerEvents="none"
              />
            )}
            <title>{label}</title>
          </g>
        );
      })}
    </>
  );
}

function Vertical(p: Props) {
  const t = DICT[p.lang];
  const ink = INK[p.theme];
  const N = p.seats.length;
  const pitch = SEAT + 5;
  const labelW = 26;
  const valueW = 60;
  const top = 18;
  const W = labelW + ACROSS + valueW;
  const H = top + N * pitch + 16;
  return (
    <svg data-export viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 440 }} className="mx-auto block select-none">
      <text x={labelW + ACROSS / 2} y={11} textAnchor="middle" fontSize={10} fill={ink.muted}>
        {t.front}
      </text>
      {Array.from({ length: N }, (_, i) => {
        const y = top + i * pitch;
        const isMe = i === p.me;
        return (
          <g key={i}>
            {isMe && (
              <rect
                x={labelW - 3}
                y={y - 2.5}
                width={ACROSS + 6}
                height={SEAT + 5}
                fill="none"
                stroke={ink.accent}
                strokeWidth={2}
                rx={3}
                pointerEvents="none"
              />
            )}
            <text
              x={labelW - 8}
              y={y + 12}
              textAnchor="end"
              fontSize={10}
              fill={isMe ? ink.accent : ink.muted}
              fontWeight={isMe ? 700 : 400}
            >
              {i + 1}
            </text>
            <g transform={`translate(${labelW} 0)`}>
              <RowSeats i={i} p={p} along={y} horizontal={false} />
            </g>
            <text x={W - 2} y={y + 12} textAnchor="end" fontSize={10} fill={ink.text} fontWeight={isMe ? 700 : 400}>
              {fmtPct(p.risk[i] ?? 0, p.lang)}
            </text>
          </g>
        );
      })}
      <text x={labelW + ACROSS / 2} y={H - 3} textAnchor="middle" fontSize={10} fill={ink.muted}>
        {t.back}
      </text>
    </svg>
  );
}

function Horizontal(p: Props) {
  const t = DICT[p.lang];
  const ink = INK[p.theme];
  const N = p.seats.length;
  const pitch = SEAT + 5;
  const left = 34;
  const top = 26;
  const W = left + N * pitch + 30;
  const H = top + ACROSS + 34;
  const sickRowSet = new Set(p.sick.map((id) => Math.floor(id / 6)));
  return (
    <svg data-export viewBox={`0 0 ${W} ${H}`} width="100%" className="block select-none">
      <text x={4} y={top + ACROSS / 2 + 3} fontSize={10} fill={ink.muted}>
        {t.front}
      </text>
      <text x={W - 4} y={top + ACROSS / 2 + 3} fontSize={10} fill={ink.muted} textAnchor="end">
        {t.back}
      </text>
      {Array.from({ length: N }, (_, i) => {
        const x = left + i * pitch;
        const isMe = i === p.me;
        const hasSick = sickRowSet.has(i);
        return (
          <g key={i}>
            {isMe && (
              <rect
                x={x - 2.5}
                y={top - 3}
                width={SEAT + 5}
                height={ACROSS + 6}
                fill="none"
                stroke={ink.accent}
                strokeWidth={2}
                rx={3}
                pointerEvents="none"
              />
            )}
            {(isMe || hasSick) && (
              <text
                x={x + SEAT / 2}
                y={top - 9}
                textAnchor="middle"
                fontSize={9}
                fill={isMe ? ink.accent : ink.text}
                fontWeight={700}
              >
                {fmtPct(p.risk[i] ?? 0, p.lang)}
              </text>
            )}
            <g transform={`translate(0 ${top})`}>
              <RowSeats i={i} p={p} along={x} horizontal />
            </g>
            <text
              x={x + SEAT / 2}
              y={top + ACROSS + 16}
              textAnchor="middle"
              fontSize={10}
              fill={isMe ? ink.accent : ink.muted}
              fontWeight={isMe ? 700 : 400}
            >
              {(i + 1) % 5 === 0 || i === 0 || isMe || hasSick ? i + 1 : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Legend({ theme, lang }: { theme: Theme; lang: Lang }) {
  const t = DICT[lang];
  const ink = INK[theme];
  return (
    <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3 text-[13px] text-muted">
      <div className="w-56">
        <div className="h-3 w-full" style={{ background: rampGradient(theme) }} aria-hidden />
        <div className="relative mt-1 h-4">
          {RAMP_TICKS.map((v, i) => (
            <span
              key={v}
              className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${(i / (RAMP_TICKS.length - 1)) * 100}%` }}
            >
              {fmtNum(v, lang, v < 0.1 ? 2 : v < 1 ? 1 : 0)}%
            </span>
          ))}
        </div>
      </div>
      <span className="flex items-center gap-1">
        <svg width="14" height="14" aria-hidden>
          <rect width="14" height="14" rx="3" fill={ink.text} />
          <path d="M4 4 L10 10 M10 4 L4 10" stroke={ink.surface} strokeWidth="2" />
        </svg>
        {t.mapLegendSick}
      </span>
      <span className="flex items-center gap-1">
        <svg width="16" height="14" aria-hidden>
          <rect x="1" y="1" width="14" height="12" rx="3" fill="none" stroke={ink.accent} strokeWidth="2" />
        </svg>
        {t.mapLegendMe}
      </span>
    </div>
  );
}
