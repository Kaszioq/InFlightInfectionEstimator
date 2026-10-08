import type { CompareBy, Disease, Lang, View } from "./state";

const pl = {
  title: "Ryzyko zakażenia w kabinie Boeinga 737",
  note: "Symulacja orientacyjna, rząd wielkości, nie prognoza.",
  views: { time: "Ryzyko w czasie", map: "Mapa siedzeń", distance: "Odległość od chorego" } satisfies Record<View, string>,
  params: "Ustawienia",
  reset: "Przywróć domyślne",
  ach: "Wentylacja",
  achUnit: "wymian powietrza/h",
  disease: "Choroba",
  diseases: { flu: "Grypa", covid: "COVID-19", measles: "Odra", custom: "Własna" } satisfies Record<Disease, string>,
  qCustom: "Zaraźliwość",
  qUnit: "dla porównania: grypa 20, COVID-19 50, odra 500",
  maskOut: "Maseczka u chorego",
  maskIn: "Maseczka u pozostałych",
  flight: "Czas lotu",
  pax: "Liczba pasażerów",
  paxRows: (rows: number) => `${rows} rzędów`,
  mixing: "Ruch pasażerów po przejściu",
  mixingLevel: (r: number): string => (r < 0.7 ? "mały" : r <= 1.5 ? "typowy" : r <= 4 ? "duży" : "bardzo duży"),
  sick: "Chorzy",
  sickCount: (n: number) => (n === 1 ? "1 chory" : `${n} chorych`),
  sickSeats: (seats: string) => `miejsca: ${seats}`,
  sickHint: "Chorych dodajesz i usuwasz, stukając fotele na mapie siedzeń.",
  goToMap: "Otwórz mapę siedzeń",
  me: "Twój rząd",
  hours: "h",
  compareBy: "Porównaj",
  compare: {
    ventilation: "wentylację",
    distance: "odległość",
    disease: "choroby",
    masks: "maseczki",
    mixing: "ruch w przejściu",
  } satisfies Record<CompareBy, string>,
  yourSettings: "Twoje ustawienia",
  rowOffset: (d: number, many = false): string =>
    d === 0
      ? many
        ? "rzędy chorych"
        : "rząd chorego"
      : `${d} ${d === 1 ? "rząd" : d < 5 ? "rzędy" : "rzędów"} od ${many ? "najbliższego " : ""}chorego`,
  achSeries: (a: number) => `${a} wymian/h`,
  maskSeries: (m: number) => (m === 0 ? "bez maseczek" : `maseczki ${m}% u wszystkich`),
  mixingSeries: (r: number): string => (r < 1 ? "mały ruch" : r === 1 ? "typowy ruch" : "duży ruch"),
  axisTime: "Czas lotu [h]",
  axisRisk: "Ryzyko zakażenia [%]",
  axisDistance: "Odległość od najbliższego chorego [rzędy]",
  valueAt: (t: string) => `po ${t} h lotu`,
  chartTimeCaption: (row: number) => `Ryzyko dla pasażera w rzędzie ${row}. Pionowa linia: 2 h lotu.`,
  chartTimeCaptionDist:
    "Ryzyko w zależności od tego, jak daleko od najbliższego chorego siedzisz (średnio dla rzędów w tej odległości). Pionowa linia: 2 h lotu.",
  time: "Chwila lotu",
  play: "Odtwórz",
  pause: "Pauza",
  mapMode: "Stuknij fotel, aby",
  mapModes: { sick: "dodać lub usunąć chorego", me: "wybrać swój rząd" },
  mapHint: "Kolor fotela: ryzyko zakażenia w wybranej chwili lotu.",
  mapMinOne: "W samolocie musi zostać co najmniej 1 chory.",
  mapLegendSick: "chory",
  mapLegendMe: "Twój rząd",
  row: "Rząd",
  seatAria: (seat: string, risk: string, sick: boolean) => `Miejsce ${seat}, ${sick ? "chory" : `ryzyko ${risk}`}`,
  front: "przód",
  back: "tył",
  distanceCaption: (t: string) => `Średnie ryzyko w rzędach w danej odległości od najbliższego chorego, po ${t} h lotu.`,
  cardMe: "Twoje ryzyko",
  cardMeSub: (row: number, t: string) => `rząd ${row}, po ${t} h lotu`,
  cardE: "Ilu pasażerów się zarazi",
  cardESub: (pax: number) => `średnio, na ${pax} pasażerów`,
  cardAvg: "Średnie ryzyko pasażera",
  cardAvgSub: "w całym samolocie",
  exportPng: "Zapisz wykres (PNG)",
  exportCsv: "Zapisz dane (CSV)",
  abToggle: "Porównaj dwa scenariusze",
  scenario: "Scenariusz",
  abHint: "Wykres pokazuje oba scenariusze dla Twojego rzędu.",
  language: "Język",
  more: "Więcej ustawień",
  rowsWord: "rzędy",
};

export type Dict = typeof pl;

const en: Dict = {
  title: "Infection risk in a Boeing 737 cabin",
  note: "Indicative simulation, order of magnitude, not a forecast.",
  views: { time: "Risk over time", map: "Seat map", distance: "Distance from infected" },
  params: "Settings",
  reset: "Reset to defaults",
  ach: "Ventilation",
  achUnit: "air changes/h",
  disease: "Disease",
  diseases: { flu: "Influenza", covid: "COVID-19", measles: "Measles", custom: "Custom" },
  qCustom: "Infectiousness",
  qUnit: "for reference: influenza 20, COVID-19 50, measles 500",
  maskOut: "Mask on infected person",
  maskIn: "Masks on everyone else",
  flight: "Flight time",
  pax: "Passengers",
  paxRows: (rows) => `${rows} rows`,
  mixing: "Passengers moving in the aisle",
  mixingLevel: (r) => (r < 0.7 ? "little" : r <= 1.5 ? "typical" : r <= 4 ? "a lot" : "very much"),
  sick: "Infected",
  sickCount: (n) => (n === 1 ? "1 infected" : `${n} infected`),
  sickSeats: (seats) => `seats: ${seats}`,
  sickHint: "Add or remove infected passengers by tapping seats on the seat map.",
  goToMap: "Open seat map",
  me: "Your row",
  hours: "h",
  compareBy: "Compare",
  compare: { ventilation: "ventilation", distance: "distance", disease: "diseases", masks: "masks", mixing: "aisle movement" },
  yourSettings: "Your settings",
  rowOffset: (d, many = false) =>
    d === 0
      ? many
        ? "infected rows"
        : "infected row"
      : `${d} ${d === 1 ? "row" : "rows"} from ${many ? "the nearest" : "the"} infected`,
  achSeries: (a) => `${a} air changes/h`,
  maskSeries: (m) => (m === 0 ? "no masks" : `${m}% masks for all`),
  mixingSeries: (r) => (r < 1 ? "little movement" : r === 1 ? "typical movement" : "a lot of movement"),
  axisTime: "Flight time [h]",
  axisRisk: "Infection risk [%]",
  axisDistance: "Distance from nearest infected [rows]",
  valueAt: (t) => `after ${t} h of flight`,
  chartTimeCaption: (row) => `Risk for a passenger in row ${row}. Vertical line: 2 h of flight.`,
  chartTimeCaptionDist:
    "Risk depending on how far from the nearest infected person you sit (average over rows at that distance). Vertical line: 2 h of flight.",
  time: "Flight time",
  play: "Play",
  pause: "Pause",
  mapMode: "Tap a seat to",
  mapModes: { sick: "add or remove an infected person", me: "pick your row" },
  mapHint: "Seat colour: infection risk at the selected moment.",
  mapMinOne: "At least 1 infected person must stay on board.",
  mapLegendSick: "infected",
  mapLegendMe: "your row",
  row: "Row",
  seatAria: (seat, risk, sick) => `Seat ${seat}, ${sick ? "infected" : `risk ${risk}`}`,
  front: "front",
  back: "rear",
  distanceCaption: (t) => `Average risk in rows at each distance from the nearest infected person, after ${t} h of flight.`,
  cardMe: "Your risk",
  cardMeSub: (row, t) => `row ${row}, after ${t} h of flight`,
  cardE: "Passengers infected",
  cardESub: (pax) => `on average, out of ${pax}`,
  cardAvg: "Average passenger risk",
  cardAvgSub: "across the whole aircraft",
  exportPng: "Save chart (PNG)",
  exportCsv: "Save data (CSV)",
  abToggle: "Compare two scenarios",
  scenario: "Scenario",
  abHint: "The chart shows both scenarios for your row.",
  language: "Language",
  more: "More settings",
  rowsWord: "rows",
};

export const DICT: Record<Lang, Dict> = { pl, en };

export function fmtNum(x: number, lang: Lang, digits: number): string {
  return new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(x);
}

/** Procent z precyzją dobraną do wielkości (P w zakresie 0..1). */
export function fmtPct(p: number, lang: Lang): string {
  const v = 100 * p;
  if (v === 0) return "0%";
  if (v > 0 && v < 0.01) return `< ${fmtNum(0.01, lang, 2)}%`;
  const digits = v < 1 ? 2 : v < 99.95 ? 1 : 0;
  return `${fmtNum(v, lang, digits)}%`;
}

export function fmtHours(h: number, lang: Lang): string {
  const digits = Number.isInteger(h) ? 0 : Number.isInteger(h * 10) ? 1 : 2;
  return fmtNum(h, lang, digits);
}
