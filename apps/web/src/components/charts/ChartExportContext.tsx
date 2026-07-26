import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChartExportActionsContext, ChartExportListContext } from './useChartExport';
import type { RegisteredChart } from './useChartExport';

/**
 * Wraps one report tab. Every ChartCard inside publishes itself here so the
 * page-level download picker can offer "exactly what I want" across every
 * chart currently on screen, without the page having to collect datasets by hand.
 */
export function ChartExportProvider({ children }: { children: ReactNode }) {
  const [charts, setCharts] = useState<RegisteredChart[]>([]);

  const register = useCallback((entry: RegisteredChart) => {
    setCharts((prev) => [...prev.filter((c) => c.id !== entry.id), entry]);
  }, []);

  const unregister = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const actions = useMemo(() => ({ register, unregister }), [register, unregister]);

  return (
    <ChartExportActionsContext.Provider value={actions}>
      <ChartExportListContext.Provider value={charts}>{children}</ChartExportListContext.Provider>
    </ChartExportActionsContext.Provider>
  );
}
