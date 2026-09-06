import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay (default 300ms).
 * Use this to avoid firing API calls on every keystroke.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
