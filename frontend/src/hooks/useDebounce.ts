/**
 * src/hooks/useDebounce.ts
 *
 * Generic debounce hook — delays updating the returned value until `delay` ms
 * have elapsed without the input changing. Useful for search inputs where you
 * want to avoid firing a query on every keystroke.
 *
 * @example
 * const debouncedQuery = useDebounce(inputValue, 250);
 * // debouncedQuery only updates 250ms after inputValue stops changing
 */

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
