import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

export interface Loaded<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/** Loads one resource. While loading or after a failure `data` is null - a page
 *  can never keep showing an old value as if it were current. */
export function useApi<T>(path: string | null): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; error: unknown; loading: boolean }>({ data: null, error: null, loading: path !== null });
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (path === null) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const id = ++latest.current;
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    api<T>(path, { signal: controller.signal })
      .then((data) => id === latest.current && setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (controller.signal.aborted || id !== latest.current) return;
        setState({ data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
