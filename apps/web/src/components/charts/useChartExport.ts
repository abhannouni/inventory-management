import { createContext, useContext, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { AnyExportDataset } from '../../utils/export';

export interface RegisteredChart {
  id: string;
  title: string;
  subtitle?: string;
  dataset: AnyExportDataset;
  getNode: () => HTMLElement | null;
}

export interface ChartExportActions {
  register: (entry: RegisteredChart) => void;
  unregister: (id: string) => void;
}

// Split in two so a ChartCard's registration effect never depends on the charts
// list itself: `actions` is a stable object for the lifetime of the provider,
// while `list` changes every time a chart mounts/unmounts. If both lived in one
// context value, registering a chart would change that value, which would
// re-run every ChartCard's registration effect, which would register again —
// an infinite loop.
export const ChartExportActionsContext = createContext<ChartExportActions | null>(null);
export const ChartExportListContext = createContext<RegisteredChart[]>([]);

/**
 * A ChartCard calls this once to publish its dataset and a live pointer to its
 * rendered DOM (for image capture). Title/subtitle/dataset are read through a
 * ref on every access, so the registration effect only re-runs when the chart's
 * identity (id) changes — never on every keystroke or refetch.
 */
export function useRegisterChart(
  id: string,
  title: string,
  subtitle: string | undefined,
  dataset: AnyExportDataset,
  nodeRef: RefObject<HTMLElement | null>,
) {
  const actions = useContext(ChartExportActionsContext);
  const latest = useRef({ title, subtitle, dataset });

  // Mirrors the latest props onto the ref after each commit — never during
  // render — so the registered entry's getters always read fresh values.
  useEffect(() => {
    latest.current = { title, subtitle, dataset };
  });

  useEffect(() => {
    if (!actions) return;
    const entry: RegisteredChart = {
      id,
      get title() {
        return latest.current.title;
      },
      get subtitle() {
        return latest.current.subtitle;
      },
      get dataset() {
        return latest.current.dataset;
      },
      getNode: () => nodeRef.current,
    };
    actions.register(entry);
    return () => actions.unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, id]);
}

/** The page-level download picker reads the currently mounted charts from here. */
export function useChartRegistry(): RegisteredChart[] {
  return useContext(ChartExportListContext);
}
