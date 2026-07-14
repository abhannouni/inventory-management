import { DIVERGING, MARK } from './tokens';

export interface VarianceDatum {
  label: string;
  /** found − expected. Negative = short of the expected quantity. */
  variance: number;
  found: number;
  expected: number;
}

interface VarianceChartProps {
  data: VarianceDatum[];
  labels: { over: string; under: string };
}

/**
 * Diverging bars around a zero baseline — the form for polarity ("which side of
 * expected is this?"), which a plain bar chart cannot show.
 *
 * Two hues that read as opposite (blue / red, CVD ΔE 85.5) with a neutral grey
 * midpoint, so zero reads as "nothing" rather than as a third category.
 */
export default function VarianceChart({ data, labels }: VarianceChartProps) {
  if (data.length === 0) return null;

  // A symmetric scale, so a bar of -5 is exactly as long as one of +5.
  const extent = Math.max(...data.map((d) => Math.abs(d.variance)), 1);

  return (
    <ul className="variance-chart">
      {data.map((d) => {
        const pct = (Math.abs(d.variance) / extent) * 50;
        const positive = d.variance > 0;
        const zero = d.variance === 0;

        return (
          <li key={d.label} className="var-row">
            <span className="var-label" title={d.label}>{d.label}</span>

            <div className="var-track">
              {/* The baseline is the reference; keep it visible through the bars. */}
              <span className="var-axis" />

              {!zero && (
                <span
                  className="var-fill"
                  style={{
                    background: positive ? DIVERGING.positive : DIVERGING.negative,
                    width: `${pct}%`,
                    left: positive ? '50%' : `${50 - pct}%`,
                    borderRadius: positive
                      ? `0 ${MARK.barRadius}px ${MARK.barRadius}px 0`
                      : `${MARK.barRadius}px 0 0 ${MARK.barRadius}px`,
                  }}
                  title={`${d.label}: ${d.found} / ${d.expected}`}
                />
              )}
            </div>

            <span className={`var-value ${zero ? 'is-zero' : positive ? 'is-over' : 'is-under'}`}>
              {d.variance > 0 ? `+${d.variance}` : d.variance}
            </span>
          </li>
        );
      })}

      {/* The scale sits under the track only — hence the wrapper, so the three
          labels share one row instead of stacking down the grid column. */}
      <li className="var-scale">
        <span className="var-scale-track">
          <span>{labels.under}</span>
          <span>0</span>
          <span>{labels.over}</span>
        </span>
      </li>
    </ul>
  );
}
