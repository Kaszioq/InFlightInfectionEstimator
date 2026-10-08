import { simulate, type ModelResult } from "./model";
import { DICT } from "./i18n";
import { rowsOf, sickRows, toModelInput, type CompareBy, type Lang, type Params } from "./state";

export interface Series {
  key: string;
  label: string;
  params: Params;
  rows: number[]; // rzędy uśredniane w tej serii
  current: boolean; // odpowiada bieżącym ustawieniom
}

/** Prosty bufor wyników, żeby te same scenariusze nie były liczone dwa razy. */
const cache = new Map<string, ModelResult>();
export function run(p: Params): ModelResult {
  const key = JSON.stringify([p.ach, p.disease, p.qCustom, p.maskOut, p.maskIn, p.pax, p.betaRatio, p.sick]);
  let r = cache.get(key);
  if (!r) {
    r = simulate(toModelInput(p));
    if (cache.size > 60) cache.delete(cache.keys().next().value!);
    cache.set(key, r);
  }
  return r;
}

/** Dla każdego rzędu: ile rzędów dzieli go od najbliższego chorego. */
export function nearestSickDistance(p: Params): number[] {
  const sick = sickRows(p);
  return Array.from({ length: rowsOf(p) }, (_, i) => Math.min(...sick.map((s) => Math.abs(i - s))));
}

/** Rzędy, których najbliższy chory jest dokładnie d rzędów dalej. */
export function rowsAtDistance(p: Params, d: number): number[] {
  return nearestSickDistance(p).flatMap((x, i) => (x === d ? [i] : []));
}

const same = (a: Params, b: Params) =>
  a.ach === b.ach &&
  a.disease === b.disease &&
  (a.disease !== "custom" || a.qCustom === b.qCustom) &&
  a.maskOut === b.maskOut &&
  a.maskIn === b.maskIn &&
  a.pax === b.pax &&
  a.betaRatio === b.betaRatio &&
  a.sick.join() === b.sick.join();

export function buildSeries(p: Params, by: CompareBy, lang: Lang): Series[] {
  const t = DICT[lang];
  const many = new Set(sickRows(p)).size > 1;
  let variants: { key: string; label: string; params: Params; rows: number[] }[];
  switch (by) {
    case "ventilation":
      variants = [6, 10, 20, 30].map((ach) => ({
        key: `ach${ach}`,
        label: t.achSeries(ach),
        params: { ...p, ach },
        rows: [p.me],
      }));
      break;
    case "distance":
      variants = [0, 1, 2, 5]
        .map((d) => ({ key: `d${d}`, label: t.rowOffset(d, many), params: p, rows: rowsAtDistance(p, d) }))
        .filter((v) => v.rows.length > 0);
      break;
    case "disease":
      variants = (["flu", "covid", "measles"] as const).map((disease) => ({
        key: disease,
        label: t.diseases[disease],
        params: { ...p, disease },
        rows: [p.me],
      }));
      break;
    case "masks":
      variants = [0, 50, 70].map((m) => ({
        key: `m${m}`,
        label: t.maskSeries(m),
        params: { ...p, maskOut: m, maskIn: m },
        rows: [p.me],
      }));
      break;
    case "mixing":
      variants = [0.3, 1, 3].map((r) => ({
        key: `b${r}`,
        label: t.mixingSeries(r),
        params: { ...p, betaRatio: r },
        rows: [p.me],
      }));
      break;
  }
  const out: Series[] = variants.map((v) => ({
    ...v,
    current: v.rows.length === 1 && v.rows[0] === p.me && same(v.params, p),
  }));
  if (!out.some((s) => s.current)) {
    const label = by === "distance" ? `${t.me} (${p.me + 1})` : t.yourSettings;
    out.unshift({ key: "current", label, params: p, rows: [p.me], current: true });
  }
  return out;
}

/** Wiersze do wykresu w czasie: { t, [key]: ryzyko w % }. */
export function timeRows(series: Series[]): Record<string, number>[] {
  const results = series.map((s) => run(s.params));
  const times = results[0]!.times;
  return times.map((time, k) => {
    const row: Record<string, number> = { t: Math.round(time * 100) / 100 };
    series.forEach((s, j) => {
      const P = results[j]!.risk[k]!;
      row[s.key] = (100 * s.rows.reduce((sum, i) => sum + P[i]!, 0)) / s.rows.length;
    });
    return row;
  });
}
