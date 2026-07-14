import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  /** Reserved status tint for the value — only when the number *means* good/bad. */
  tone?: 'default' | 'good' | 'warning' | 'critical';
  icon?: ReactNode;
}

/**
 * A headline number. The right form when the data is one value — a one-bar bar
 * chart or a two-slice pie would say the same thing with more ink.
 *
 * Proportional figures, not tabular: equal-width digits make a large standalone
 * number look loose.
 */
export default function StatTile({
  label,
  value,
  unit,
  hint,
  tone = 'default',
  icon,
}: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-head">
        {icon && <span className="stat-tile-icon">{icon}</span>}
        <span className="stat-tile-label">{label}</span>
      </div>

      <div className={`stat-tile-value tone-${tone}`}>
        {value}
        {unit && <span className="stat-tile-unit">{unit}</span>}
      </div>

      {hint && <div className="stat-tile-hint">{hint}</div>}
    </div>
  );
}
