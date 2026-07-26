import { CHROME } from './tokens';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  /** Big number in the middle, e.g. an overall percentage. */
  centerValue?: string | number;
  centerLabel?: string;
}

/**
 * Part-to-whole as a ring — reserved for a headline circular story (an overall
 * percentage, or a handful of segments) rather than a general substitute for
 * StatusBar's stacked bar, which stays the form for the 4-state stock split
 * whenever it's compared row over row.
 *
 * Same segment math as StatusBar; drawn as stroked arcs so the ring reads at
 * any size without the text rescaling the way a viewBox-scaled label would.
 */
export default function DonutChart({
  data,
  size = 176,
  thickness = 22,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments =
    total > 0
      ? data
          .filter((d) => d.value > 0)
          .map((d) => {
            const dash = (d.value / total) * circumference;
            const seg = { ...d, dash, dashOffset: -offset };
            offset += dash;
            return seg;
          })
      : [];

  return (
    <div className="donut-chart" style={{ width: size, maxWidth: '100%' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="donut-svg"
        role="img"
        aria-label={data.map((d) => `${d.label}: ${d.value}`).join(', ')}
      >
        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle cx={c} cy={c} r={r} fill="none" stroke={CHROME.grid} strokeWidth={thickness} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={s.dashOffset}
              strokeLinecap={segments.length > 1 ? 'butt' : 'round'}
            />
          ))}
        </g>

        {(centerValue !== undefined || centerLabel) && (
          <g>
            {centerValue !== undefined && (
              <text x={c} y={centerLabel ? c - 4 : c + 8} textAnchor="middle" className="donut-center-value">
                {centerValue}
              </text>
            )}
            {centerLabel && (
              <text x={c} y={c + 16} textAnchor="middle" className="donut-center-label">
                {centerLabel}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
