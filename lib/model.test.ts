import { describe, expect, it } from "vitest";
import { simulate, sampleIndex, wellsRiley, cabinLayout, type ModelInput } from "./model";
import { buildSeries, rowsAtDistance, timeRows } from "./series";
import { DEFAULT_PARAMS, toModelInput, parseState, serializeState, DEFAULT_STATE, seatId, sickRows } from "./state";

const TOL_PP = 0.15; // punkty procentowe
const SICK = 14; // rząd 15 z 30

function base(over: Partial<ModelInput> = {}): ModelInput {
  return { ...toModelInput(DEFAULT_PARAMS), ...over };
}

function riskAt(input: ModelInput, row: number, hours: number): number {
  const r = simulate(input);
  return 100 * r.risk[sampleIndex(hours, r)]![row]!;
}

function expectPct(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOL_PP);
}

describe("model bazowy: ACH 20, COVID-19, 1 chory w rzędzie 15 z 30, bez maseczek, 2 h", () => {
  it("ten sam rząd 16,9%", () => expectPct(riskAt(base(), SICK, 2), 16.9));
  it("±1 rząd 6,8%", () => {
    expectPct(riskAt(base(), SICK + 1, 2), 6.8);
    expectPct(riskAt(base(), SICK - 1, 2), 6.8);
  });
  it("±2 rzędy 2,6%", () => {
    expectPct(riskAt(base(), SICK + 2, 2), 2.6);
    expectPct(riskAt(base(), SICK - 2, 2), 2.6);
  });
  it("±5 rzędów 0,1%", () => {
    expectPct(riskAt(base(), SICK + 5, 2), 0.1);
    expectPct(riskAt(base(), SICK - 5, 2), 0.1);
  });
});

describe("wentylacja (±2 rzędy, 2 h)", () => {
  it.each([
    [6, 7.7],
    [10, 5.0],
    [30, 1.8],
  ])("ACH %i: %f%%", (ach, pct) => expectPct(riskAt(base({ ach }), SICK + 2, 2), pct));
});

describe("choroba (±2 rzędy, 2 h)", () => {
  it("grypa 1,1%", () => expectPct(riskAt(base({ q: 20 }), SICK + 2, 2), 1.1));
  it("odra 23,2%", () => expectPct(riskAt(base({ q: 500 }), SICK + 2, 2), 23.2));
});

describe("maseczki u obu osób (±2 rzędy, 2 h)", () => {
  it("50%: 0,7%", () => expectPct(riskAt(base({ maskOut: 0.5, maskIn: 0.5 }), SICK + 2, 2), 0.7));
  it("70%: 0,2%", () => expectPct(riskAt(base({ maskOut: 0.7, maskIn: 0.7 }), SICK + 2, 2), 0.2));
});

describe("po 8 h", () => {
  it("±2 rzędy 10,3%", () => expectPct(riskAt(base(), SICK + 2, 8), 10.3));
  it("ten sam rząd 52,7%", () => expectPct(riskAt(base(), SICK, 8), 52.7));
  it("odra ±2 rzędy 66,3%", () => expectPct(riskAt(base({ q: 500 }), SICK + 2, 8), 66.3));
});

describe("oczekiwana liczba zakażonych E, 180 pasażerów, 2 h", () => {
  it.each([
    [6, 6.1],
    [10, 4.0],
    [20, 2.2],
    [30, 1.5],
  ])("ACH %i: E ≈ %f", (ach, e) => {
    const r = simulate(base({ ach }));
    expect(Math.abs(r.expected[sampleIndex(2, r)]! - e)).toBeLessThanOrEqual(0.1);
  });
});

describe("własności modelu", () => {
  it("krok czasowy bazy to 0,002 h", () => expect(simulate(base()).dt).toBeCloseTo(0.002, 12));

  it("kilku chorych: źródła się sumują (model liniowy)", () => {
    const one = simulate(base({ sick: [14] }));
    const two = simulate(base({ sick: [14, 14] }));
    const k = sampleIndex(2, one);
    const d1 = -Math.log(1 - one.risk[k]![16]!);
    const d2 = -Math.log(1 - two.risk[k]![16]!);
    expect(d2 / d1).toBeCloseTo(2, 6);
  });

  it("stabilny przy skrajnych suwakach (ACH 40, beta x10, 220 pasażerów)", () => {
    const { rows, seats } = cabinLayout(220);
    const r = simulate(base({ ach: 40, betaRatio: 10, rows, seats, sick: [18] }));
    for (const P of r.risk) for (const x of P) expect(x >= 0 && x <= 1).toBe(true);
  });

  it("wzór Wellsa i Rileya dla bazy daje ok. 1,4%", () => {
    const p = wellsRiley({ infected: 1, q: 50, breathing: 0.42, hours: 2, ach: 20, volume: 150, maskOut: 0, maskIn: 0 });
    expect(100 * p).toBeCloseTo(1.39, 2);
  });

  it("niepełny ostatni rząd przy 104 pasażerach", () => {
    const { rows, seats } = cabinLayout(104);
    expect(rows).toBe(18);
    expect(seats.reduce((a, b) => a + b, 0)).toBe(104);
  });
});

describe("stan w URL", () => {
  it("śmieci w adresie wracają do bezpiecznych wartości", () => {
    const s = parseState("ach=abc&d=ebola&mo=500&pax=-3&s=0,999,x&me=-1&v=hack&t=99");
    expect(s.a.ach).toBe(20);
    expect(s.a.disease).toBe("covid");
    expect(s.a.maskOut).toBe(95);
    expect(s.a.pax).toBe(108);
    // Rząd 999 nie istnieje: chory trafia do ostatniego rzędu (przy 108 pasażerach to rząd 18).
    expect(s.a.sick).toEqual([seatId(17, 2)]);
    expect(s.a.me).toBe(16);
    expect(s.view).toBe("time");
    expect(s.t).toBe(12);
  });

  it("zapis i odczyt dają ten sam stan", () => {
    const s = {
      ...DEFAULT_STATE,
      a: {
        ...DEFAULT_PARAMS,
        ach: 7,
        sick: [seatId(3, 0), seatId(3, 4), seatId(9, 2)],
        me: 5,
        disease: "custom" as const,
        qCustom: 321,
      },
      ab: true,
      view: "map" as const,
      lang: "en" as const,
    };
    expect(parseState(serializeState(s))).toEqual({ ...s, b: DEFAULT_STATE.b });
  });

  it("miejsca chorych w adresie: 15C, kilku w jednym rzędzie, stary zapis bez litery", () => {
    expect(serializeState({ ...DEFAULT_STATE, a: { ...DEFAULT_PARAMS, sick: [seatId(14, 0), seatId(14, 5)] } })).toBe(
      "s=15A,15F",
    );
    expect(parseState("s=15a,15F").a.sick).toEqual([seatId(14, 0), seatId(14, 5)]);
    expect(parseState("s=15").a.sick).toEqual(DEFAULT_PARAMS.sick);
    expect(sickRows({ ...DEFAULT_PARAMS, sick: [seatId(14, 0), seatId(14, 5)] })).toEqual([14, 14]);
  });

  it("domyślny stan daje pusty adres", () => expect(serializeState(DEFAULT_STATE)).toBe(""));
});

describe("odległość przy kilku chorych", () => {
  // Chorzy w rzędach 11, 16 i 18 (jak na zrzucie): odległość liczona od najbliższego chorego.
  const p = { ...DEFAULT_PARAMS, sick: [seatId(10, 2), seatId(15, 2), seatId(17, 5)], me: 15 };

  it("rząd z chorym nie może być „5 rzędów od chorego”", () => {
    expect(rowsAtDistance(p, 0)).toEqual([10, 15, 17]);
    expect(rowsAtDistance(p, 5)).toEqual([5, 22]);
  });

  it("ryzyko maleje z odległością od najbliższego chorego", () => {
    const series = buildSeries(p, "distance", "pl").filter((s) => s.key.startsWith("d"));
    const at2h = timeRows(series)[40]!;
    const values = series.map((s) => at2h[s.key]!);
    for (let i = 1; i < values.length; i++) expect(values[i]!).toBeLessThan(values[i - 1]!);
  });
});
