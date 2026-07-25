/**
 * Chart tokens.
 *
 * Colour here does exactly one of three jobs, and each job has one rule:
 *
 *  - identity of a single measure  → one hue (the brand blue), every bar the same.
 *    Never a value-ramp across nominal categories — bar length already shows size.
 *  - state (out of / low / available / in stock) → the reserved STATUS scale below.
 *    It is never used for a non-status series, and always ships with an icon +
 *    label, because amber sits below 3:1 on white by design.
 *  - polarity (found vs expected)   → the DIVERGING pair: two hues that read as
 *    opposite, with a neutral grey midpoint.
 *
 * Validated with the dataviz validator against the white card surface:
 *   blue alone            → all checks pass
 *   blue ↔ red (diverging) → all pass, worst CVD ΔE 85.5
 *   status trio (3-state)  → CVD ΔE 16.9 (clear of the ≥12 target); amber's low
 *                           contrast is mitigated by icon + label + table view.
 *
 * `stock_disponible` was added when the status scale went from 3 states to 4 and
 * `in_stock` was moved onto the brand blue to keep it visually distinct from the
 * new green tier — re-run the dataviz validator against this 4-colour set before
 * relying on colour alone anywhere it isn't paired with an icon/label.
 */

/** Single-series hue — the app's brand blue. */
export const SERIES = '#1D6ADE';

/** Reserved status scale. Never reused as "series 3". */
export const STATUS = {
  in_stock: '#1D6ADE',
  stock_disponible: '#0ca30c',
  low_stock: '#fab219',
  out_of_stock: '#d03b3b',
} as const;

/** Polarity: above vs below the expected quantity. Grey midpoint reads as "nothing". */
export const DIVERGING = {
  positive: '#1D6ADE',
  negative: '#d03b3b',
  neutral: '#E5E7EB',
} as const;

/** Chart chrome — recessive by design; the data is the only loud thing. */
export const CHROME = {
  surface: '#ffffff',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  ink: '#0b0b0b',
  inkSecondary: '#52514e',
} as const;

/** Mark specs, fixed across every chart. */
export const MARK = {
  barMax: 24,
  barRadius: 4,
  lineWidth: 2,
  dotRadius: 4,
  ringWidth: 2,
  /** White gap that separates touching fills — never a stroke around the mark. */
  gap: 2,
  areaOpacity: 0.1,
} as const;

/** Clean axis ticks: 0 / 25 / 50, never 0 / 23.7 / 47.4. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
