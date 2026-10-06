import { useEffect, useRef, useState } from 'react';

interface Props<T> {
  id: string;
  label: string;
  placeholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  matches: T[];
  onPick: (item: T) => void;
  getKey: (item: T) => string;
  getPrimary: (item: T) => string;
  getSecondary?: (item: T) => string | undefined;
  noResultsLabel: string;
  error?: string;
  autoFocus?: boolean;
}

/** Type to search, click a match to pick it — the same dropdown as the sell-out pickers. */
export default function SearchPicker<T>({
  id,
  label,
  placeholder,
  query,
  onQueryChange,
  matches,
  onPick,
  getKey,
  getPrimary,
  getSecondary,
  noResultsLabel,
  error,
  autoFocus,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const blur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(blur.current), []);

  return (
    <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`form-input ${error ? 'is-error' : ''}`}
        placeholder={placeholder}
        value={query}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blur.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && query.trim() && (
        <div className="search-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {matches.length === 0 ? (
            <div className="search-dropdown-empty">{noResultsLabel}</div>
          ) : (
            matches.map((item) => (
              <div
                key={getKey(item)}
                className="search-dropdown-item"
                onClick={() => {
                  onPick(item);
                  setOpen(false);
                }}
              >
                <div>
                  <div className="search-dropdown-item-name">{getPrimary(item)}</div>
                  {getSecondary && <div className="search-dropdown-item-meta">{getSecondary(item)}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
