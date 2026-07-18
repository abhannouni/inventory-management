import { useEffect, useMemo, useRef, useState } from 'react';
import Input from './Input';

interface MultiSelectSearchProps<T> {
  label: string;
  placeholder: string;
  items: T[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  getKey: (item: T) => string;
  getPrimary: (item: T) => string;
  getSecondary?: (item: T) => string | undefined;
  noResultsLabel: string;
  typeToSearchLabel: string;
  /** Below this item count the full list is browsable without typing first — searching still narrows it. */
  browseThreshold?: number;
  /** Caps how many matches are rendered at once, so a 1000+ row dataset never floods the DOM. */
  maxResults?: number;
}

/**
 * A searchable multi-pick field: type to filter, click to add a chip, click a
 * chip's x to remove it. Matches are capped and only rendered once the query
 * is non-empty (unless the dataset is small), so this stays fast against
 * catalogs with thousands of products.
 */
export default function MultiSelectSearch<T>({
  label,
  placeholder,
  items,
  selectedIds,
  onChange,
  getKey,
  getPrimary,
  getSecondary,
  noResultsLabel,
  typeToSearchLabel,
  browseThreshold = 50,
  maxResults = 50,
}: MultiSelectSearchProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedSet.has(getKey(item))),
    [items, selectedSet, getKey],
  );

  const canBrowse = items.length <= browseThreshold;
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q && !canBrowse) return [];
    const pool = items.filter((item) => !selectedSet.has(getKey(item)));
    const filtered = q
      ? pool.filter((item) => {
          const primary = getPrimary(item).toLowerCase();
          const secondary = getSecondary?.(item)?.toLowerCase() ?? '';
          return primary.includes(q) || secondary.includes(q);
        })
      : pool;
    return filtered.slice(0, maxResults);
  }, [items, selectedSet, q, canBrowse, getKey, getPrimary, getSecondary, maxResults]);

  const totalMatches = useMemo(() => {
    if (!q && !canBrowse) return 0;
    const pool = items.filter((item) => !selectedSet.has(getKey(item)));
    if (!q) return pool.length;
    return pool.filter((item) => {
      const primary = getPrimary(item).toLowerCase();
      const secondary = getSecondary?.(item)?.toLowerCase() ?? '';
      return primary.includes(q) || secondary.includes(q);
    }).length;
  }, [items, selectedSet, q, canBrowse, getKey, getPrimary, getSecondary]);

  const handlePick = (item: T) => {
    onChange([...selectedIds, getKey(item)]);
    setQuery('');
  };

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((existing) => existing !== id));
  };

  return (
    <div>
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
              <>
                {matches.map((item) => (
                  <div key={getKey(item)} className="search-dropdown-item" onClick={() => handlePick(item)}>
                    <div>
                      <div className="search-dropdown-item-name">{getPrimary(item)}</div>
                      {getSecondary && <div className="search-dropdown-item-meta">{getSecondary(item)}</div>}
                    </div>
                  </div>
                ))}
                {totalMatches > matches.length && (
                  <div className="search-dropdown-empty">+{totalMatches - matches.length}</div>
                )}
              </>
            )}
          </div>
        )}
        {open && !q && !canBrowse && (
          <div className="search-dropdown">
            <div className="search-dropdown-empty">{typeToSearchLabel}</div>
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="chip-list">
          {selectedItems.map((item) => (
            <span key={getKey(item)} className="chip">
              {getPrimary(item)}
              <button type="button" className="chip-remove" onClick={() => handleRemove(getKey(item))} aria-label={getPrimary(item)}>
                <XIcon />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function XIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
