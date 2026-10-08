export type Theme = "light" | "dark";

/** Kolory serii (sprawdzone pod kątem daltonizmu); seria bieżąca rysowana kolorem tekstu. */
export const SERIES: Record<Theme, string[]> = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#4a3aa7"],
  dark: ["#3987e5", "#d95926", "#199e70", "#9085e9"],
};

/** Wzory linii: kolor nigdy nie jest jedynym nośnikiem informacji. */
export const DASHES = ["8 4", "2 4", "12 4 2 4", "4 3 4 3 12 3"];

export const INK: Record<Theme, { text: string; muted: string; grid: string; surface: string; accent: string }> = {
  light: { text: "#1b1b1a", muted: "#5c5b57", grid: "#e2e0da", surface: "#fbfaf7", accent: "#7a1f12" },
  dark: { text: "#ecebe6", muted: "#a9a79f", grid: "#3a3936", surface: "#1a1a19", accent: "#f0a183" },
};

/** Skala sekwencyjna ryzyka (jeden odcień, od tła do intensywnego). */
const RAMP: Record<Theme, string[]> = {
  light: ["#f4efe8", "#f6d9c6", "#f1b693", "#e68b5e", "#cf5f34", "#a63c1d", "#6e2410"],
  dark: ["#2b2724", "#4b3027", "#723a2a", "#a24a31", "#d0623d", "#ee8b62", "#fbc2a2"],
};

/** Progi skali w % (logarytmiczna, bo ryzyko zmienia się o rzędy wielkości). */
export const RAMP_TICKS = [0.01, 0.1, 1, 10, 50];

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, f: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i]! - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Kolor dla ryzyka P (0..1). */
export function riskColor(p: number, theme: Theme): string {
  const ramp = RAMP[theme];
  const pct = Math.max(1e-4, 100 * p);
  const lo = Math.log10(RAMP_TICKS[0]!);
  const hi = Math.log10(RAMP_TICKS[RAMP_TICKS.length - 1]!);
  const f = Math.min(1, Math.max(0, (Math.log10(pct) - lo) / (hi - lo)));
  const pos = f * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(pos));
  return mix(ramp[i]!, ramp[i + 1]!, pos - i);
}

export function rampGradient(theme: Theme): string {
  return `linear-gradient(to right, ${RAMP[theme].join(", ")})`;
}
