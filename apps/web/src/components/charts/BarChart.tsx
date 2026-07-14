import { SERIES, MARK } from './tokens';

export interface BarDatum {
  label: string;
  value: number;
  /** Shown under the label, e.g. "12 visits". */
  hint?: string;
}

interface BarChartProps {
  data: BarDatum[];
  unit?: string;
  /** Fix the scale (e.g. 100 for a percentage) so bars are comparable across charts. */
  maxValue?: number;
}

/**
 * Horizontal bars — the right form when category names are long (store names) and
 * the job is "compare magnitude".
 *
 * Every bar wears the SAME hue. Colouring each bar by its own value would spend
 * the identity channel re-encoding what bar length already shows, and would fail
 * the categorical checks by design.
 *
 * Built from divs rather than SVG so long labels wrap and reflow naturally.
 */
export default function BarChart({ data, unit = '', maxValue }: BarChartProps) {
  if (data.length === 0) return null;

  const top = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="bar-chart">
      {data.map((d) => {
        const pct = top === 0 ? 0 : Math.min(100, (d.value / top) * 100);

        return (
          <li key={d.label} className="bar-row">
            <div className="bar-head">
              <span className="bar-label" title={d.label}>{d.label}</span>
              {/* Value at the bar's tip, always outside the fill, so it can never be
                  clipped by a short bar. */}
              <span className="bar-value">
                {d.value}
                {unit}
              </span>
            </div>

            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${pct}%`,
                  background: SERIES,
                  borderRadius: `0 ${MARK.barRadius}px ${MARK.barRadius}px 0`,
                }}
              />
            </div>

            {d.hint && <span className="bar-hint">{d.hint}</span>}
          </li>
        );
      })}
    </ul>
  );
}
