import { useCallback, useState } from 'react';

/** Persisted state backed by localStorage; falls back silently if unavailable (private mode, quota). */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore — in-memory state still works for this session
      }
    },
    [key],
  );

  return [value, setStoredValue] as const;
}
