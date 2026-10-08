"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { INK } from "@/lib/colors";
import { downloadCsv, downloadPng } from "@/lib/export";
import { DICT, fmtHours, fmtNum, fmtPct } from "@/lib/i18n";
import { cabinLayout, sampleIndex, type ModelResult } from "@/lib/model";
import { buildSeries, nearestSickDistance, run, timeRows, type Series } from "@/lib/series";
import {
  DEFAULT_STATE,
  LIMITS,
  effectiveTime,
  normalizeParams,
  parseState,
  seatId,
  seatRow,
  serializeState,
  type AppState,
  type CompareBy,
  type Lang,
  type Params,
  type View,
} from "@/lib/state";
import Controls from "./Controls";
import DistanceChart from "./DistanceChart";
import SeatMap, { type MapMode } from "./SeatMap";
import TimeChart from "./TimeChart";
import { useTheme } from "./hooks";

const VIEWS: View[] = ["time", "map", "distance"];
const COMPARE: CompareBy[] = ["ventilation", "distance", "disease", "masks", "mixing"];

export default function App() {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    setState(parseState(window.location.search));
  }, []);

  // Zapis do adresu z opóźnieniem: animacja nie zasypuje historii przeglądarki.
  useEffect(() => {
    if (!state) return;
    document.documentElement.lang = state.lang;
    const id = setTimeout(() => {
      const q = serializeState(state);
      window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
    }, 250);
    return () => clearTimeout(id);
  }, [state]);

  if (!state) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-[24px]">{DICT.pl.title}</h1>
      </main>
    );
  }
  return <Main state={state} setState={setState as React.Dispatch<React.SetStateAction<AppState>>} />;
}

function Main({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const theme = useTheme();
  const ink = INK[theme];
  const t = DICT[state.lang];
  const lang = state.lang;
  const [active, setActive] = useState<"a" | "b">("a");
  const [mapMode, setMapMode] = useState<MapMode>("sick");
  const [notice, setNotice] = useState(false);
  const [playing, setPlaying] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLElement>(null);

  const calc = useDeferredValue(state);
  const scenarios: readonly ("a" | "b")[] = useMemo(() => (calc.ab ? ["a", "b"] : ["a"]), [calc.ab]);
  const results = useMemo(() => {
    const out: Partial<Record<"a" | "b", ModelResult>> = {};
    for (const k of scenarios) out[k] = run(calc[k]);
    return out;
  }, [calc, scenarios]);

  const edit = active === "b" && state.ab ? "b" : "a";
  const update = useCallback(
    (which: "a" | "b", patch: Partial<Params>) =>
      setState((s) => ({ ...s, [which]: normalizeParams({ ...s[which], ...patch }) })),
    [setState],
  );
  const set = useCallback((patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch })), [setState]);

  const maxFlight = Math.max(state.a.flight, state.ab ? state.b.flight : 0);
  const tA = effectiveTime(calc, calc.a);

  // Animacja suwaka czasu. Timer zamiast requestAnimationFrame: działa także, gdy karta jest chwilowo w tle.
  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const duration = 5000;
    const id = setInterval(() => {
      const f = Math.min(1, (performance.now() - start) / duration);
      if (f >= 1) {
        clearInterval(id);
        setPlaying(false);
        set({ t: null });
        return;
      }
      const tt = Math.round((f * maxFlight) / 0.05) * 0.05;
      set({ t: Math.round(tt * 100) / 100 });
    }, 40);
    return () => clearInterval(id);
  }, [playing, maxFlight, set]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(false), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  // Wykres w czasie: serie porównania albo dwa scenariusze.
  const series: Series[] = useMemo(() => {
    if (!calc.ab) return buildSeries(calc.a, calc.compareBy, lang);
    return [
      {
        key: "A",
        label: `${t.scenario} A, ${t.row.toLowerCase()} ${calc.a.me + 1}`,
        params: calc.a,
        rows: [calc.a.me],
        current: true,
      },
      {
        key: "B",
        label: `${t.scenario} B, ${t.row.toLowerCase()} ${calc.b.me + 1}`,
        params: calc.b,
        rows: [calc.b.me],
        current: false,
      },
    ];
  }, [calc, lang, t]);
  const timeData = useMemo(() => timeRows(series), [series]);

  function onSeat(row: number, seat: number) {
    const p = state[edit];
    if (mapMode === "me") return update(edit, { me: row });
    const id = seatId(row, seat);
    if (p.sick.includes(id)) {
      if (p.sick.length > 1) update(edit, { sick: p.sick.filter((x) => x !== id) });
      else setNotice(true);
    } else if (p.sick.length < LIMITS.maxSick) {
      update(edit, { sick: [...p.sick, id] });
    }
  }

  function openMap() {
    set({ view: "map" });
    viewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exportCsv() {
    const name = `ryzyko-${state.view}.csv`;
    if (state.view === "time") {
      downloadCsv(
        [
          [t.axisTime, ...series.map((s) => `${s.label} [%]`)],
          ...timeData.map((r) => [fmtNum(r.t!, lang, 2), ...series.map((s) => fmtNum(r[s.key]!, lang, 4))]),
        ],
        name,
      );
      return;
    }
    const rows: (string | number)[][] = [[t.scenario, t.row, t.axisDistance, t.axisRisk, t.sick]];
    for (const k of scenarios) {
      const p = calc[k];
      const r = results[k]!;
      const P = r.risk[sampleIndex(effectiveTime(calc, p), r)]!;
      const dist = nearestSickDistance(p);
      P.forEach((x, i) =>
        rows.push([k.toUpperCase(), i + 1, dist[i]!, fmtNum(100 * x, lang, 4), p.sick.filter((id) => seatRow(id) === i).length]),
      );
    }
    downloadCsv(rows, name);
  }

  function exportPng() {
    if (!panelRef.current) return;
    void downloadPng(panelRef.current, `ryzyko-${state.view}.png`, `${t.title}: ${t.views[state.view]}`, ink.surface, ink.text);
  }

  const timeControl = (
    <TimeControl
      t={state.t == null ? maxFlight : Math.min(state.t, maxFlight)}
      max={maxFlight}
      lang={lang}
      playing={playing}
      onPlay={() => {
        if (!playing) set({ t: 0 });
        setPlaying(!playing);
      }}
      onChange={(v) => {
        setPlaying(false);
        set({ t: v >= maxFlight ? null : v });
      }}
    />
  );

  return (
    <div>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 lg:px-6 lg:pb-10">
        <header className="flex items-center justify-between gap-4 border-b-2 border-ink pb-3">
          <h1 className="text-[22px] leading-tight sm:text-[26px]">{t.title}</h1>
          <div className="flex shrink-0" role="group" aria-label={t.language}>
            {(["pl", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                className="btn -ml-px first:ml-0"
                aria-pressed={lang === l}
                onClick={() => set({ lang: l })}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section ref={viewRef} aria-label={t.views[state.view]} className="min-w-0 scroll-mt-2">
            <div role="tablist" className="no-scrollbar flex overflow-x-auto border-b border-rule">
              {VIEWS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={state.view === v}
                  className="tab"
                  onClick={() => set({ view: v })}
                >
                  {t.views[v]}
                </button>
              ))}
            </div>

            <div role="tabpanel" className="pt-4">
              {state.view === "time" && (
                <div ref={panelRef}>
                  {!state.ab ? (
                    <div className="chip-row mb-3" role="group" aria-label={t.compareBy}>
                      <span className="mr-1 shrink-0 text-[14px]">{t.compareBy}:</span>
                      {COMPARE.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="btn"
                          aria-pressed={state.compareBy === c}
                          onClick={() => set({ compareBy: c })}
                        >
                          {t.compare[c]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-3 text-[14px]">{t.abHint}</p>
                  )}
                  <TimeChart data={timeData} lines={series} theme={theme} lang={lang} flight={calc.a.flight} height={320} />
                  <p className="mt-2 text-[13px] text-muted">
                    {!state.ab && state.compareBy === "distance" ? t.chartTimeCaptionDist : t.chartTimeCaption(calc.a.me + 1)}
                  </p>
                </div>
              )}

              {state.view === "map" && (
                <div>
                  <div className="chip-row mb-3" role="group" aria-label={t.mapMode}>
                    <span className="mr-1 shrink-0 text-[14px]">{t.mapMode}:</span>
                    {(["sick", "me"] as MapMode[]).map((m) => (
                      <button key={m} type="button" className="btn" aria-pressed={mapMode === m} onClick={() => setMapMode(m)}>
                        {t.mapModes[m]}
                      </button>
                    ))}
                  </div>
                  {timeControl}
                  <p className="mt-2 min-h-[20px] text-[13px] font-bold text-accent" aria-live="polite">
                    {notice ? t.mapMinOne : ""}
                  </p>
                  <div ref={panelRef} className="mt-1">
                    {state.ab && (
                      <h3 className="mb-1 text-[16px]">
                        {t.scenario} {edit.toUpperCase()}
                      </h3>
                    )}
                    <SeatMap
                      risk={
                        results[edit]?.risk[sampleIndex(effectiveTime(calc, calc[edit]), results[edit]!)] ?? new Float64Array(0)
                      }
                      seats={cabinLayout(calc[edit].pax).seats}
                      sick={state[edit].sick}
                      me={state[edit].me}
                      theme={theme}
                      lang={lang}
                      onSeat={onSeat}
                    />
                  </div>
                  <p className="mt-2 text-[13px] text-muted">{t.mapHint}</p>
                </div>
              )}

              {state.view === "distance" && (
                <div>
                  {timeControl}
                  <div ref={panelRef} className="mt-3">
                    <DistanceChart
                      bars={scenarios.map((k) => {
                        const r = results[k]!;
                        return {
                          label: `${t.scenario} ${k.toUpperCase()}`,
                          risk: r.risk[sampleIndex(effectiveTime(calc, calc[k]), r)]!,
                          dist: nearestSickDistance(calc[k]),
                          me: calc[k].me,
                        };
                      })}
                      theme={theme}
                      lang={lang}
                      height={320}
                    />
                  </div>
                  <p className="mt-2 text-[13px] text-muted">{t.distanceCaption(fmtHours(tA, lang))}</p>
                </div>
              )}

              <p className="mt-3 text-[13px] italic">{t.note}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={exportPng}>
                  {t.exportPng}
                </button>
                <button type="button" className="btn" onClick={exportCsv}>
                  {t.exportCsv}
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {scenarios.map((k) => (
                <Cards
                  key={k}
                  p={calc[k]}
                  r={results[k]!}
                  time={effectiveTime(calc, calc[k])}
                  lang={lang}
                  title={state.ab ? `${t.scenario} ${k.toUpperCase()}` : undefined}
                />
              ))}
            </div>
          </section>

          <aside aria-label={t.params} className="lg:border-l lg:border-rule lg:pl-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[18px]">{t.params}</h2>
              <button
                type="button"
                className="text-[13px] text-muted underline underline-offset-2"
                onClick={() => {
                  setPlaying(false);
                  setState((s) => ({ ...DEFAULT_STATE, lang: s.lang, view: s.view }));
                  setActive("a");
                }}
              >
                {t.reset}
              </button>
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--ink)]"
                checked={state.ab}
                onChange={(e) => {
                  const on = e.target.checked;
                  setActive(on ? "b" : "a");
                  setState((s) => ({ ...s, ab: on, b: on ? { ...s.a, ach: s.a.ach === 6 ? 20 : 6 } : s.b }));
                }}
              />
              {t.abToggle}
            </label>

            {state.ab && (
              <div className="mt-3 flex" role="group">
                {(["a", "b"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="btn -ml-px flex-1 justify-center first:ml-0"
                    aria-pressed={edit === k}
                    onClick={() => setActive(k)}
                  >
                    {t.scenario} {k.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2">
              <Controls
                key={edit}
                p={state[edit]}
                lang={lang}
                onChange={(patch) => update(edit, patch)}
                onOpenMap={state.view === "map" ? undefined : openMap}
              />
            </div>
          </aside>
        </div>

        <footer className="mt-12 border-t-2 border-ink pt-3 text-[13px] italic">{t.note}</footer>
      </main>

      <MobileReadout p={calc.a} r={results.a!} time={tA} lang={lang} />
    </div>
  );
}

function TimeControl({
  t,
  max,
  lang,
  playing,
  onPlay,
  onChange,
}: {
  t: number;
  max: number;
  lang: Lang;
  playing: boolean;
  onPlay: () => void;
  onChange: (v: number) => void;
}) {
  const d = DICT[lang];
  return (
    <div className="flex items-center gap-3">
      <button type="button" className="btn w-24 justify-center" onClick={onPlay} aria-label={playing ? d.pause : d.play}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          {playing ? <path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /> : <path d="M2 1l9 5-9 5z" fill="currentColor" />}
        </svg>
        {playing ? d.pause : d.play}
      </button>
      <label className="flex flex-1 items-center gap-3">
        <span className="sr-only">{d.time}</span>
        <input
          type="range"
          min={0}
          max={max}
          step={0.05}
          value={t}
          aria-valuetext={`${fmtHours(t, lang)} h`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
      <span className="w-16 text-right font-serif text-[18px] font-bold">{fmtHours(Math.round(t * 20) / 20, lang)} h</span>
    </div>
  );
}

function stats(p: Params, r: ModelResult, time: number) {
  const k = sampleIndex(time, r);
  const E = r.expected[k]!;
  const healthy = p.pax - p.sick.length;
  return { me: r.risk[k]![p.me]!, E, avg: healthy > 0 ? E / healthy : 0 };
}

function Cards({ p, r, time, lang, title }: { p: Params; r: ModelResult; time: number; lang: Lang; title?: string }) {
  const t = DICT[lang];
  const s = stats(p, r, time);
  const h = fmtHours(time, lang);
  const items = [
    { label: t.cardMe, value: fmtPct(s.me, lang), sub: t.cardMeSub(p.me + 1, h) },
    { label: t.cardE, value: fmtNum(s.E, lang, s.E < 10 ? 1 : 0), sub: t.cardESub(p.pax) },
    { label: t.cardAvg, value: fmtPct(s.avg, lang), sub: t.cardAvgSub },
  ];
  return (
    <div>
      {title && <h3 className="mb-2 text-[16px]">{title}</h3>}
      <dl className="grid grid-cols-1 border-y border-ink sm:grid-cols-3">
        {items.map((it, i) => (
          <div key={it.label} className={`px-1 py-3 sm:px-4 ${i ? "border-t border-rule sm:border-l sm:border-t-0" : ""}`}>
            <dt className="text-[13px] text-muted">{it.label}</dt>
            <dd className="font-serif text-[30px] font-bold leading-tight">{it.value}</dd>
            <dd className="text-[13px] text-muted">{it.sub}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Pasek na telefonie: wynik widoczny także podczas przesuwania suwaków niżej na stronie. */
function MobileReadout({ p, r, time, lang }: { p: Params; r: ModelResult; time: number; lang: Lang }) {
  const t = DICT[lang];
  const s = stats(p, r, time);
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-bg px-4 py-2 text-[14px] lg:hidden" aria-live="polite">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-3">
        <span>
          {t.cardMe} ({t.row.toLowerCase()} {p.me + 1}, {fmtHours(time, lang)} h):{" "}
          <b className="font-serif text-[18px]">{fmtPct(s.me, lang)}</b>
        </span>
        <span className="whitespace-nowrap">
          {t.sick}: <b className="font-serif text-[18px]">{p.sick.length}</b>
        </span>
      </div>
    </div>
  );
}
