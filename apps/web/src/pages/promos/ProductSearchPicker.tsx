import { useEffect, useMemo, useRef, useState } from 'react';
import Input from '../../components/ui/Input';
import type { Product } from '../../types';

interface Props {
  products: Product[];
  excludeIds?: string[];
  onSelect: (product: Product) => void;
  label: string;
  placeholder: string;
  noResultsLabel: string;
  typeToSearchLabel: string;
}

const BROWSE_THRESHOLD = 50;
const MAX_RESULTS = 50;

/**
 * Single-pick product search: type to filter, click a match to select it.
 * Unlike MultiSelectSearch, the query clears after a pick instead of turning
 * into a chip — the caller (AddPromoModal) owns the picked product and
 * decides when to let it go.
 */
export default function ProductSearchPicker({
  products,
  excludeIds = [],
  onSelect,
  label,
  placeholder,
  noResultsLabel,
  typeToSearchLabel,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);
  const q = query.trim().toLowerCase();
  const canBrowse = products.length <= BROWSE_THRESHOLD;

  const matches = useMemo(() => {
    if (!q && !canBrowse) return [];
    const pool = products.filter((p) => !excludeSet.has(p.id));
    const filtered = q
      ? pool.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      : pool;
    return filtered.slice(0, MAX_RESULTS);
  }, [products, excludeSet, q, canBrowse]);

  const handlePick = (product: Product) => {
    onSelect(product);
    setQuery('');
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimeout.current = setTimeout(() => setOpen(false), 150); }}
        autoComplete="off"
      />
      {open && (q || canBrowse) && (
        <div className="search-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {matches.length === 0 ? (
            <div className="search-dropdown-empty">{noResultsLabel}</div>
          ) : (
            matches.map((p) => (
              <div key={p.id} className="search-dropdown-item" onClick={() => handlePick(p)}>
                <div>
                  <div className="search-dropdown-item-name">{p.name}</div>
                  <div className="search-dropdown-item-meta">{p.sku}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {open && !q && !canBrowse && (
        <div className="search-dropdown">
          <div className="search-dropdown-empty">{typeToSearchLabel}</div>
        </div>
      )}
    </div>
  );
}
