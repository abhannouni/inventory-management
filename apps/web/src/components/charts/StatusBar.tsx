import { STATUS } from './tokens';

export interface StatusCounts {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface StatusBarProps {
  counts: StatusCounts;
  /** `row` renders one compact bar (inside a list); `block` is the standalone card version. */
  variant?: 'row' | 'block';
  labels: { inStock: string; lowStock: string; outOfStock: string };
}

/**
 * Part-to-whole for stock state — a stacked bar, not a pie: segments are easy to
 * compare against a shared baseline, and 3 segments never need a donut.
 *
 * Colour comes from the reserved STATUS scale, and every segment is labelled with
 * its count, because amber sits below 3:1 on white — the label is what keeps the
 * meaning from resting on colour alone.
 */
export default function StatusBar({ counts, variant = 'row', labels }: StatusBarProps) {
  const total = counts.inStock + counts.lowStock + counts.outOfStock;
  if (total === 0) return null;

  const segments = [
    { key: 'in', value: counts.inStock, color: STATUS.in_stock, label: labels.inStock },
    { key: 'low', value: counts.lowStock, color: STATUS.low_stock, label: labels.lowStock },
    { key: 'out', value: counts.outOfStock, color: STATUS.out_of_stock, label: labels.outOfStock },
  ].filter((s) => s.value > 0);

  return (
    <div className={`status-bar status-bar-${variant}`}>
      <div className="status-bar-track" role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}
      >
        {segments.map((s) => {
          const pct = (s.value / total) * 100;
          // A segment only carries an inline number when the number actually fits;
          // otherwise it would be clipped, and the count still lives in the tooltip,
          // the legend and the table view.
          const fits = pct > 8;

          return (
            <div
              key={s.key}
              className="status-seg"
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${s.value} (${Math.round(pct)}%)`}
            >
              {fits && variant === 'block' && (
                <span className="status-seg-value">{s.value}</span>
              )}
            </div>
          );
        })}
      </div>

      {variant === 'block' && (
        <ul className="status-key">
          {segments.map((s) => (
            <li key={s.key} className="status-key-item">
              <span className="status-key-dot" style={{ background: s.color }} />
              <span className="status-key-label">{s.label}</span>
              <span className="status-key-value">
                {s.value}
                <span className="status-key-pct">
                  {' '}
                  ({Math.round((s.value / total) * 100)}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
