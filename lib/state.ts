import { BREATHING, CABIN_VOLUME, DISEASE_Q, HORIZON_H, SEATS_PER_ROW, cabinLayout, type ModelInput } from "./model";

export type Disease = "flu" | "covid" | "measles" | "custom";
export type View = "time" | "map" | "distance";
export type CompareBy = "ventilation" | "distance" | "disease" | "masks" | "mixing";
export type Lang = "pl" | "en";

export interface Params {
  ach: number;
  disease: Disease;
  qCustom: number;
  maskOut: number; // procent 0..95
  maskIn: number; // procent 0..95
  flight: number; // czas lotu [h]
  pax: number;
  betaRatio: number;
  sick: number[]; // miejsca chorych: rząd * 6 + fotel (fotel 0..5 = A..F), posortowane, bez powtórzeń
  me: number; // rząd wybranego pasażera (od 0)
}

export interface AppState {
  a: Params;
  b: Params;
  ab: boolean; // porównanie dwóch scenariuszy
  view: View;
  compareBy: CompareBy;
  t: number | null; // wybrana chwila [h], null = koniec lotu
  lang: Lang;
}

export const LIMITS = {
  ach: { min: 3, max: 40, step: 1 },
  qCustom: { min: 1, max: 2000, step: 1 },
  mask: { min: 0, max: 95, step: 5 },
  flight: { min: 0.5, max: HORIZON_H, step: 0.25 },
  pax: { min: 108, max: 216, step: 6 }, // co pełny rząd (6 miejsc)
  betaRatio: { min: 0.3, max: 10 },
  maxSick: 30,
} as const;

export const DEFAULT_PARAMS: Params = {
  ach: 20,
  disease: "covid",
  qCustom: 100,
  maskOut: 0,
  maskIn: 0,
  flight: 2,
  pax: 180,
  betaRatio: 1,
  sick: [14 * 6 + 2],
  me: 16,
};

export const DEFAULT_STATE: AppState = {
  a: DEFAULT_PARAMS,
  b: { ...DEFAULT_PARAMS, ach: 6 },
  ab: false,
  view: "time",
  compareBy: "distance",
  t: null,
  lang: "pl",
};

export const SEAT_LETTERS = "ABCDEF";

export function seatId(row: number, seat: number): number {
  return row * SEATS_PER_ROW + seat;
}

export function seatRow(id: number): number {
  return Math.floor(id / SEATS_PER_ROW);
}

export function seatName(id: number): string {
  return `${seatRow(id) + 1}${SEAT_LETTERS[id % SEATS_PER_ROW]}`;
}

/** Rzędy chorych (z powtórzeniami, gdy w rzędzie siedzi kilku chorych). */
export function sickRows(p: Params): number[] {
  return p.sick.map(seatRow);
}

/** Rząd chorego, od którego liczona jest odległość. */
export function firstSickRow(p: Params): number {
  return seatRow(p.sick[0]!);
}

export function rowsOf(p: Params): number {
  return cabinLayout(p.pax).rows;
}

export function emission(p: Params): number {
  return p.disease === "custom" ? p.qCustom : DISEASE_Q[p.disease];
}

export function toModelInput(p: Params): ModelInput {
  const { rows, seats } = cabinLayout(p.pax);
  return {
    rows,
    seats,
    volume: CABIN_VOLUME,
    breathing: BREATHING,
    ach: p.ach,
    q: emission(p),
    maskOut: p.maskOut / 100,
    maskIn: p.maskIn / 100,
    betaRatio: p.betaRatio,
    sick: sickRows(p),
    horizon: HORIZON_H,
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function num(v: string | null | undefined, fallback: number, lo: number, hi: number, step?: number): number {
  if (v == null || v.trim() === "") return fallback;
  const x = Number(v.replace(",", "."));
  if (!Number.isFinite(x)) return fallback;
  let y = clamp(x, lo, hi);
  if (step) y = clamp(Math.round(y / step) * step, lo, hi);
  return Math.round(y * 1000) / 1000;
}

/** Porządkuje parametry tak, aby zawsze dało się je policzyć. */
export function normalizeParams(p: Params): Params {
  const pax = clamp(Math.round(p.pax / LIMITS.pax.step) * LIMITS.pax.step, LIMITS.pax.min, LIMITS.pax.max);
  const { rows, seats } = cabinLayout(pax);
  // Miejsca poza kabiną (np. po zmniejszeniu liczby pasażerów) przesuwamy na ostatnie istniejące.
  const valid = p.sick.map((raw) => {
    const id = Math.max(0, Math.round(raw));
    const r = Math.min(seatRow(id), rows - 1);
    const s = Math.min(id % SEATS_PER_ROW, seats[r]! - 1);
    return seatId(r, s);
  });
  let sick = Array.from(new Set(valid))
    .sort((x, y) => x - y)
    .slice(0, LIMITS.maxSick);
  if (sick.length === 0) sick = [seatId(Math.min(14, rows - 1), 2)];
  return {
    ...p,
    pax,
    sick,
    me: Math.round(clamp(p.me, 0, rows - 1)),
  };
}

const DISEASES: Disease[] = ["flu", "covid", "measles", "custom"];
const VIEWS: View[] = ["time", "map", "distance"];
const COMPARE: CompareBy[] = ["ventilation", "distance", "disease", "masks", "mixing"];

function oneOf<T extends string>(v: string | null, list: readonly T[], fallback: T): T {
  return v != null && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

function parseParams(get: (k: string) => string | null, base: Params): Params {
  const d = base;
  const sickRaw = get("s");
  const sick =
    sickRaw != null
      ? sickRaw
          .split(/[,.\s]+/)
          .map((x) => /^(\d{1,3})([a-fA-F]?)$/.exec(x))
          .filter((m): m is RegExpExecArray => m != null && Number(m[1]) >= 1)
          .map((m) => seatId(Number(m[1]) - 1, m[2] ? SEAT_LETTERS.indexOf(m[2].toUpperCase()) : 2))
      : d.sick;
  const meRaw = get("me");
  const meNum = meRaw != null ? Number(meRaw) : NaN;
  return normalizeParams({
    ach: num(get("ach"), d.ach, LIMITS.ach.min, LIMITS.ach.max, LIMITS.ach.step),
    disease: oneOf(get("d"), DISEASES, d.disease),
    qCustom: num(get("q"), d.qCustom, LIMITS.qCustom.min, LIMITS.qCustom.max, 1),
    maskOut: num(get("mo"), d.maskOut, LIMITS.mask.min, LIMITS.mask.max, 1),
    maskIn: num(get("mi"), d.maskIn, LIMITS.mask.min, LIMITS.mask.max, 1),
    flight: num(get("T"), d.flight, LIMITS.flight.min, LIMITS.flight.max, LIMITS.flight.step),
    pax: num(get("pax"), d.pax, LIMITS.pax.min, LIMITS.pax.max, LIMITS.pax.step),
    betaRatio: num(get("br"), d.betaRatio, LIMITS.betaRatio.min, LIMITS.betaRatio.max),
    sick,
    me: Number.isInteger(meNum) && meNum >= 1 ? meNum - 1 : d.me,
  });
}

function writeParams(p: Params, set: (k: string, v: string) => void, base: Params) {
  if (p.ach !== base.ach) set("ach", String(p.ach));
  if (p.disease !== base.disease) set("d", p.disease);
  if (p.disease === "custom") set("q", String(p.qCustom));
  if (p.maskOut !== base.maskOut) set("mo", String(p.maskOut));
  if (p.maskIn !== base.maskIn) set("mi", String(p.maskIn));
  if (p.flight !== base.flight) set("T", String(p.flight));
  if (p.pax !== base.pax) set("pax", String(p.pax));
  if (p.betaRatio !== base.betaRatio) set("br", String(Math.round(p.betaRatio * 100) / 100));
  if (p.sick.join() !== base.sick.join()) set("s", p.sick.map(seatName).join(","));
  if (p.me !== base.me) set("me", String(p.me + 1));
}

/** Odczyt stanu z parametrów URL; każda błędna wartość wraca do domyślnej. */
export function parseState(search: string): AppState {
  const sp = new URLSearchParams(search);
  const a = parseParams((k) => sp.get(k), DEFAULT_STATE.a);
  const b = parseParams((k) => sp.get("b" + k), DEFAULT_STATE.b);
  const tRaw = sp.get("t");
  return {
    a,
    b,
    ab: sp.get("ab") === "1",
    view: oneOf(sp.get("v"), VIEWS, DEFAULT_STATE.view),
    compareBy: oneOf(sp.get("cb"), COMPARE, DEFAULT_STATE.compareBy),
    t: tRaw == null ? null : num(tRaw, 0, 0, HORIZON_H, 0.05),
    lang: oneOf(sp.get("lang"), ["pl", "en"] as const, "pl"),
  };
}

/** Zapis stanu do parametrów URL; pomija wartości domyślne, żeby link (i QR) był krótki. */
export function serializeState(s: AppState): string {
  const sp = new URLSearchParams();
  writeParams(s.a, (k, v) => sp.set(k, v), DEFAULT_STATE.a);
  if (s.ab) {
    sp.set("ab", "1");
    writeParams(s.b, (k, v) => sp.set("b" + k, v), DEFAULT_STATE.b);
  }
  if (s.view !== DEFAULT_STATE.view) sp.set("v", s.view);
  if (s.compareBy !== DEFAULT_STATE.compareBy) sp.set("cb", s.compareBy);
  if (s.t != null) sp.set("t", String(s.t));
  if (s.lang !== "pl") sp.set("lang", s.lang);
  return sp.toString().replace(/%2C/g, ",");
}

/** Chwila, dla której pokazujemy mapę, odległość i karty. */
export function effectiveTime(s: AppState, p: Params): number {
  return s.t == null ? p.flight : Math.min(s.t, p.flight);
}
