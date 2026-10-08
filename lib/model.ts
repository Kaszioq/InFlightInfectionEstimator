/**
 * Model wielostrefowy kabiny.
 * Kabina to N połączonych rzędów, w każdym rzędzie powietrze jest dobrze wymieszane.
 * Całkowanie jawnym schematem Eulera, czas w godzinach.
 */

export const CABIN_VOLUME = 150; // V [m3]
export const BREATHING = 0.42; // p [m3/h]
export const SEATS_PER_ROW = 6;
export const HORIZON_H = 12; // zakres wykresów [h]
export const SAMPLE_H = 0.05; // odstęp zapisu wyników [h]

export const DISEASE_Q = { flu: 20, covid: 50, measles: 500 } as const;

export interface ModelInput {
  rows: number; // N
  seats: number[]; // liczba miejsc w każdym rzędzie (długość N)
  volume: number; // V
  breathing: number; // p
  ach: number; // wymiany powietrza na godzinę
  q: number; // emisja jednego chorego [kwanty/h]
  maskOut: number; // eta_wyd, 0..1
  maskIn: number; // eta_wd, 0..1
  betaRatio: number; // beta / Q_r
  sick: number[]; // indeksy rzędów chorych (od 0)
  horizon: number; // [h]
}

export interface ModelResult {
  times: number[]; // chwile zapisu [h]
  risk: Float64Array[]; // risk[k][i] = P_i w chwili times[k]
  expected: number[]; // E w chwili times[k]
  dt: number;
}

/** Liczba rzędów i miejsc dla podanej liczby pasażerów (ostatni rząd może być niepełny). */
export function cabinLayout(passengers: number): { rows: number; seats: number[] } {
  const rows = Math.ceil(passengers / SEATS_PER_ROW);
  const seats = Array.from({ length: rows }, (_, i) => (i < rows - 1 ? SEATS_PER_ROW : passengers - SEATS_PER_ROW * (rows - 1)));
  return { rows, seats };
}

export function simulate(input: ModelInput): ModelResult {
  const N = input.rows;
  const Vr = input.volume / N;
  const Q = input.ach * input.volume;
  const Qr = Q / N;
  const beta = input.betaRatio * Qr;
  const mOut = 1 - input.maskOut;
  const mIn = 1 - input.maskIn;

  const S = new Float64Array(N);
  for (const i of input.sick) if (i >= 0 && i < N) S[i]! += input.q * mOut;

  // Krok z warunku stabilności; zaokrąglony w dół tak, aby mieścił się
  // całkowitą liczbę razy w odstępie zapisu (dla 0,002 h nic się nie zmienia).
  const dtMax = Math.min(0.002, (0.2 * Vr) / (Qr + 2 * beta));
  const stepsPerSample = Math.ceil(SAMPLE_H / dtMax - 1e-9);
  const dt = SAMPLE_H / stepsPerSample;
  const samples = Math.round(input.horizon / SAMPLE_H);

  const C = new Float64Array(N);
  const dC = new Float64Array(N);
  const D = new Float64Array(N);
  const doseRate = input.breathing * mIn;

  const times: number[] = [];
  const risk: Float64Array[] = [];
  const expected: number[] = [];

  const sickCount = new Array<number>(N).fill(0);
  for (const i of input.sick) if (i >= 0 && i < N) sickCount[i]! += 1;

  const record = (k: number) => {
    const P = new Float64Array(N);
    let E = 0;
    for (let i = 0; i < N; i++) {
      P[i] = 1 - Math.exp(-D[i]!);
      const healthy = Math.max(0, input.seats[i]! - sickCount[i]!);
      E += healthy * P[i]!;
    }
    times.push(k * SAMPLE_H);
    risk.push(P);
    expected.push(E);
  };

  record(0);
  for (let k = 1; k <= samples; k++) {
    for (let s = 0; s < stepsPerSample; s++) {
      for (let i = 0; i < N; i++) {
        const c = C[i]!;
        let flux = 0;
        if (i > 0) flux += beta * (C[i - 1]! - c);
        if (i < N - 1) flux += beta * (C[i + 1]! - c);
        dC[i] = (S[i]! + flux - Qr * c) / Vr;
      }
      for (let i = 0; i < N; i++) {
        C[i]! += dC[i]! * dt;
        D[i]! += C[i]! * doseRate * dt;
      }
    }
    record(k);
  }

  return { times, risk, expected, dt };
}

/** Indeks próbki dla chwili t [h]. */
export function sampleIndex(t: number, result: ModelResult): number {
  const k = Math.round(t / SAMPLE_H);
  return Math.max(0, Math.min(result.times.length - 1, k));
}

/**
 * Wzór Wellsa i Rileya (równanie 3) z maseczkami (równanie 7),
 * cała kabina jako jedna strefa, stan ustalony.
 */
export function wellsRiley(o: {
  infected: number;
  q: number;
  breathing: number;
  hours: number;
  ach: number;
  volume: number;
  maskOut: number;
  maskIn: number;
}): number {
  const Q = o.ach * o.volume;
  const k = (1 - o.maskOut) * (1 - o.maskIn);
  return 1 - Math.exp(-(o.infected * o.q * k * o.breathing * o.hours) / Q);
}
