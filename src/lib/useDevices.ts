import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** The server's page envelope (skip/take, at most 100 per page). */
export interface DevicePage<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

export const DEVICE_PAGE_SIZE = 25;
const WALK_PAGE = 100;
/** A whole-account view (Overview health, the restore pickers) walks bounded pages and stops here. Beyond it the page says so; it never pretends to be complete. */
export const DEVICE_WALK_LIMIT = 1000;

export function devicePagePath(skip: number, take: number, search?: string, status?: "Active" | "Unregistered"): string {
  const query = new URLSearchParams({ skip: String(skip), take: String(take) });
  if (search?.trim()) query.set("q", search.trim());
  if (status) query.set("status", status);
  return `/api/v1/dashboard/devices?${query}`;
}

export interface AllDevices<T> {
  data: T[] | null;
  /** How many devices the caller may see in total (the server's count, inside the caller's scope). */
  total: number;
  /** True when there are more devices than this view loads. */
  truncated: boolean;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/** Stage 11 (FT-36): the device list is paged on the server. Views that need every device in scope read it page by page, each request bounded. */
export function useAllDevices<T>(): AllDevices<T> {
  const [state, setState] = useState<{ data: T[] | null; total: number; truncated: boolean; error: unknown; loading: boolean }>({ data: null, total: 0, truncated: false, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    const controller = new AbortController();
    setState({ data: null, total: 0, truncated: false, error: null, loading: true });

    (async () => {
      const all: T[] = [];
      let total = 0;
      for (let skip = 0; skip < DEVICE_WALK_LIMIT; skip += WALK_PAGE) {
        const page = await api<DevicePage<T>>(devicePagePath(skip, WALK_PAGE), { signal: controller.signal });
        total = page.total;
        all.push(...page.items);
        if (page.items.length === 0 || all.length >= total) break;
      }
      return { all, total };
    })()
      .then(({ all, total }) => id === latest.current && setState({ data: all, total, truncated: all.length < total, error: null, loading: false }))
      .catch((error) => {
        if (controller.signal.aborted || id !== latest.current) return;
        setState({ data: null, total: 0, truncated: false, error, loading: false }); // no data means no claim
      });

    return () => controller.abort();
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
