import { useState, useRef, useEffect } from 'react';

export function useRafDebounce<T>(value: T, immediate: boolean): T {
  const [debounced, setDebounced] = useState(value);
  const ref = useRef(value);

  ref.current = value;

  useEffect(() => {
    if (immediate) {
      setDebounced(value);
      return;
    }

    const raf = requestAnimationFrame(() => {
      setDebounced(ref.current);
    });

    return () => cancelAnimationFrame(raf);
  }, [value, immediate]);

  return debounced;
}
