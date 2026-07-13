import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Milliseconds to wait after the last keystroke before firing `onChange`. */
  delay?: number;
}

/**
 * Debounced search box. Keeps its own value while typing so the field stays
 * responsive, and only notifies the parent — which refetches — once input settles.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder,
  delay = 300,
}: SearchInputProps) {
  const { t } = useTranslation('common');
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // Re-sync when the parent resets the term (e.g. "clear filters"). Adjusting
  // state during render rather than in an effect avoids rendering the stale
  // draft for a frame first.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const id = setTimeout(() => onChange(draft), delay);
    return () => clearTimeout(id);
    // `onChange` is re-created each render by callers; depending on it would
    // reset the timer on every keystroke and defeat the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, delay]);

  return (
    <div className="search-input">
      <span className="search-input-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>

      <input
        type="search"
        className="form-input has-icon"
        value={draft}
        placeholder={placeholder ?? t('search.placeholder')}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={placeholder ?? t('search.placeholder')}
      />

      {draft && (
        <button
          type="button"
          className="search-input-clear"
          onClick={() => setDraft('')}
          aria-label={t('search.clear')}
        >
          ✕
        </button>
      )}
    </div>
  );
}
