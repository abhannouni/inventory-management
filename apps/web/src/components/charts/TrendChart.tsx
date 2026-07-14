import { useEffect, useId, useRef, useState } from 'react';
import { CHROME, MARK, SERIES, niceTicks } from './tokens';

export interface TrendPoint {
  label: string;
  value: number;
  /** Extra line shown in the tooltip, e.g. the store name. */
  hint?: string;
}

interface TrendChartProps {
  data: TrendPoint[];
  /** Appended to the value in the tooltip and the end label ("%", "visits"…). */
  unit?: string;
  height?: number;
  /** Force the y-axis top (e.g. 100 for a percentage). Defaults to the data max. */
  maxValue?: number;
}

const PAD = { top: 16, right: 20, bottom: 28, left: 40 };

/**
 * Trend over time — a single series, so no legend: the card title names it.
 * Only the endpoint is direct-labelled; the axis and the tooltip carry the rest,
 * because a number on every point is chaos and goes unread.
 */
export default function TrendChart({ data, unit = '', height = 220, maxValue }: TrendChartProps) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  // The SVG is drawn at its real pixel width rather than scaled from a fixed
  // viewBox: a viewBox scales the *text* down with the box, which left axis
  // labels unreadable on a phone. Measuring keeps 10px text 10px at every size.
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = width;
  const H = height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  if (data.length === 0) return null;

  const rawMax = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const ticks = niceTicks(rawMax);
  const top = Math.max(...ticks, rawMax);

  const x = (i: number) =>
    PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`).join(' ');
  const area = `${line} L ${x(data.length - 1)} ${PAD.top + plotH} L ${x(0)} ${PAD.top + plotH} Z`;

  const last = data.length - 1;

  // Budget one label per ~90px of real width, so a narrow card shows fewer of
  // them instead of overlapping. The last one is always drawn, so a strided
  // label sitting right next to it is dropped — otherwise the two collide.
  const maxLabels = Math.max(2, Math.floor(plotW / 90));
  const stride = Math.max(1, Math.ceil(data.length / maxLabels));
  const showLabel = (i: number) => {
    if (i === last) return true;
    if (i % stride !== 0) return false;
    return last - i >= Math.max(1, Math.ceil(stride / 2));
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Map the pointer into viewBox space, then snap to the nearest point — a
    // pinpoint hit target on a small dot would be unusable.
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const ratio = (vx - PAD.left) / plotW;
    const idx = Math.round(ratio * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, idx)));
  };

  const active = hover !== null ? data[hover] : null;

  return (
    <div className="chart-plot" ref={boxRef}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES} stopOpacity={MARK.areaOpacity * 2} />
            <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Gridlines: solid hairlines, one step off the surface. Never dashed. */}
        {ticks.map((tk) => (
          <g key={tk}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tk)}
              y2={y(tk)}
              stroke={CHROME.grid}
              strokeWidth={1}
            />
            <text x={PAD.left - 8} y={y(tk) + 4} textAnchor="end" className="chart-tick">
              {tk}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={SERIES}
          strokeWidth={MARK.lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Endpoint marker + its direct label — the one value worth calling out. */}
        <circle
          cx={x(last)}
          cy={y(data[last].value)}
          r={MARK.dotRadius}
          fill={SERIES}
          stroke={CHROME.surface}
          strokeWidth={MARK.ringWidth}
        />

        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke={CHROME.axis}
              strokeWidth={1}
            />
            <circle
              cx={x(hover)}
              cy={y(data[hover].value)}
              r={MARK.dotRadius + 1}
              fill={SERIES}
              stroke={CHROME.surface}
              strokeWidth={MARK.ringWidth}
            />
          </>
        )}

        {data.map((d, i) =>
          showLabel(i) ? (
            <text
              key={d.label + i}
              x={x(i)}
              y={H - 8}
              // Anchor the outermost labels inward so they can't spill past the plot.
              textAnchor={i === last ? 'end' : i === 0 ? 'start' : 'middle'}
              className="chart-tick"
            >
              {d.label}
            </text>
          ) : null,
        )}
      </svg>

      {active && (
        <div
          className="chart-tooltip"
          style={{ left: `${(x(hover!) / W) * 100}%` }}
          role="status"
        >
          <div className="tt-label">{active.label}</div>
          <div className="tt-value">
            {active.value}
            {unit && <span className="tt-unit">{unit}</span>}
          </div>
          {active.hint && <div className="tt-hint">{active.hint}</div>}
        </div>
      )}
    </div>
  );
}
