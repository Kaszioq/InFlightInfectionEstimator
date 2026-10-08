"use client";

import { useId } from "react";
import { DICT, fmtHours, fmtNum } from "@/lib/i18n";
import { cabinLayout } from "@/lib/model";
import { LIMITS, seatName, type Disease, type Lang, type Params } from "@/lib/state";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  hint?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, display, hint, onChange }: SliderProps) {
  const id = useId();
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px]">
          {label}
        </label>
        <output htmlFor={id} className="font-serif text-[16px] font-bold">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="-mt-1 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

const LOG_MIN = Math.log10(LIMITS.betaRatio.min);
const LOG_MAX = Math.log10(LIMITS.betaRatio.max);

export default function Controls({
  p,
  lang,
  onChange,
  onOpenMap,
}: {
  p: Params;
  lang: Lang;
  onChange: (patch: Partial<Params>) => void;
  onOpenMap?: () => void;
}) {
  const t = DICT[lang];
  const rows = cabinLayout(p.pax).rows;
  const diseaseId = useId();
  const qId = useId();
  const meId = useId();
  const h = (x: number) => `${fmtHours(x, lang)} ${t.hours}`;
  const br = p.betaRatio < 1 ? fmtNum(p.betaRatio, lang, 2) : fmtNum(p.betaRatio, lang, p.betaRatio < 3 ? 1 : 0);

  return (
    <div>
      <Slider
        label={t.ach}
        value={p.ach}
        {...LIMITS.ach}
        display={`${p.ach} ${t.achUnit}`}
        onChange={(ach) => onChange({ ach })}
      />

      <div className="py-2">
        <label htmlFor={diseaseId} className="block text-[14px]">
          {t.disease}
        </label>
        <div className="mt-1 flex gap-2">
          <select
            id={diseaseId}
            className="min-w-0 flex-1"
            value={p.disease}
            onChange={(e) => onChange({ disease: e.target.value as Disease })}
          >
            {(["flu", "covid", "measles", "custom"] as const).map((d) => (
              <option key={d} value={d}>
                {t.diseases[d]}
              </option>
            ))}
          </select>
        </div>
        {p.disease === "custom" && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <label htmlFor={qId} className="text-[14px]">
                {t.qCustom}
              </label>
              <input
                id={qId}
                type="number"
                inputMode="numeric"
                min={LIMITS.qCustom.min}
                max={LIMITS.qCustom.max}
                value={p.qCustom}
                className="w-24"
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value));
                  if (Number.isFinite(v) && v >= LIMITS.qCustom.min) onChange({ qCustom: Math.min(LIMITS.qCustom.max, v) });
                }}
              />
            </div>
            <p className="mt-1 text-[13px] text-muted">{t.qUnit}</p>
          </div>
        )}
      </div>

      <Slider
        label={t.maskOut}
        value={p.maskOut}
        {...LIMITS.mask}
        display={`${p.maskOut}%`}
        onChange={(maskOut) => onChange({ maskOut })}
      />
      <Slider
        label={t.maskIn}
        value={p.maskIn}
        {...LIMITS.mask}
        display={`${p.maskIn}%`}
        onChange={(maskIn) => onChange({ maskIn })}
      />
      <Slider
        label={t.flight}
        value={p.flight}
        {...LIMITS.flight}
        display={h(p.flight)}
        onChange={(flight) => onChange({ flight })}
      />

      <div className="py-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={meId} className="text-[14px]">
            {t.me}
          </label>
          <span className="font-serif text-[16px] font-bold">{p.me + 1}</span>
        </div>
        <input
          id={meId}
          type="range"
          min={0}
          max={rows - 1}
          step={1}
          value={p.me}
          aria-valuetext={`${t.row} ${p.me + 1}`}
          onChange={(e) => onChange({ me: Number(e.target.value) })}
        />
      </div>

      <div className="py-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[14px]">{t.sick}</span>
          <span className="font-serif text-[16px] font-bold">{t.sickCount(p.sick.length)}</span>
        </div>
        <p className="text-[13px] text-muted">
          {t.sickSeats(p.sick.map(seatName).join(", "))}. {t.sickHint}
        </p>
        {onOpenMap && (
          <button type="button" className="btn mt-2" onClick={onOpenMap}>
            {t.goToMap}
          </button>
        )}
      </div>

      <details className="mt-1 border-t border-rule pt-2">
        <summary className="cursor-pointer py-1 text-[14px] text-muted">{t.more}</summary>
        <Slider
          label={t.pax}
          value={p.pax}
          {...LIMITS.pax}
          display={`${p.pax} (${t.paxRows(rows)})`}
          onChange={(pax) => onChange({ pax })}
        />
        <Slider
          label={t.mixing}
          value={Math.log10(p.betaRatio)}
          min={LOG_MIN}
          max={LOG_MAX}
          step={0.01}
          display={`${t.mixingLevel(p.betaRatio)} (×${br})`}
          onChange={(v) => {
            const x = Math.pow(10, v);
            const rounded = x < 1 ? Math.round(x * 100) / 100 : x < 3 ? Math.round(x * 10) / 10 : Math.round(x);
            onChange({ betaRatio: Math.abs(rounded - 1) < 0.04 ? 1 : rounded });
          }}
        />
      </details>
    </div>
  );
}
