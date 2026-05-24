import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Polls `fetchFn` every `interval` ms.
 * Returns { data, loading, error, refresh }.
 */
export function usePolling(fetchFn, interval = 4000, immediate = true) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) refresh();
    timerRef.current = setInterval(refresh, interval);
    return () => clearInterval(timerRef.current);
  }, [refresh, interval, immediate]);

  return { data, loading, error, refresh };
}
