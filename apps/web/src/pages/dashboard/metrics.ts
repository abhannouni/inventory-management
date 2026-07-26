import type { VisitReport } from '../../types';

/**
 * Every role dashboard is drawn from `GET /reports/visits` — it is already
 * scoped server-side per role (super_admin: everything, admin: assigned
 * stores/region, supervisor: assigned stores, merchandiser: own visits only,
 * see ReportsService.buildVisitWhere), so these helpers never re-filter by
 * role — the rows they're given are already the right rows.
 */

export interface StockTotals {
  total: number;
  inStock: number;
  stockDisponible: number;
  lowStock: number;
  outOfStock: number;
}

const emptyTotals = (): StockTotals => ({ total: 0, inStock: 0, stockDisponible: 0, lowStock: 0, outOfStock: 0 });

export function aggregateStockTotals(reports: VisitReport[]): StockTotals {
  const acc = emptyTotals();
  for (const v of reports) {
    acc.total += v.summary?.total ?? 0;
    acc.inStock += v.summary?.inStock ?? 0;
    acc.stockDisponible += v.summary?.stockDisponible ?? 0;
    acc.lowStock += v.summary?.lowStock ?? 0;
    acc.outOfStock += v.summary?.outOfStock ?? 0;
  }
  return acc;
}

/** Share of audited products actually available on the shelf (in stock or stock disponible). */
export function availabilityPct(t: StockTotals): number {
  return t.total === 0 ? 0 : Math.round(((t.inStock + t.stockDisponible) / t.total) * 100);
}

export function outOfStockPct(t: StockTotals): number {
  return t.total === 0 ? 0 : Math.round((t.outOfStock / t.total) * 100);
}

/** Stores ranked by out-of-stock count, worst first — the ones that need a visit. */
export function stockoutsByStore(reports: VisitReport[], topN = 8) {
  const map = new Map<string, { label: string; value: number; visits: number }>();
  for (const v of reports) {
    const id = v.store?.id ?? 'unknown';
    const row = map.get(id) ?? { label: v.store?.name ?? '—', value: 0, visits: 0 };
    row.value += v.summary?.outOfStock ?? 0;
    row.visits += 1;
    map.set(id, row);
  }
  return [...map.values()]
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

function lastNDays(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Out-of-stock incidents per day, oldest → newest, over the last N days. */
export function stockoutTrend(reports: VisitReport[], days: number, locale: string) {
  const byDay = new Map<string, number>(lastNDays(days).map((d) => [d, 0]));
  for (const v of reports) {
    const day = String(v.checkin_at).slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + (v.summary?.outOfStock ?? 0));
  }
  return [...byDay.entries()].map(([day, value]) => ({
    label: new Date(day).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    value,
  }));
}

/** Visits per day, oldest → newest, over the last N days. */
export function visitsTrend(reports: VisitReport[], days: number, locale: string) {
  const byDay = new Map<string, number>(lastNDays(days).map((d) => [d, 0]));
  for (const v of reports) {
    const day = String(v.checkin_at).slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return [...byDay.entries()].map(([day, value]) => ({
    label: new Date(day).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    value,
  }));
}

/** Average daily availability %, oldest → newest — smoother than raw counts. */
export function availabilityTrend(reports: VisitReport[], days: number, locale: string) {
  const byDay = new Map<string, StockTotals>(lastNDays(days).map((d) => [d, emptyTotals()]));
  for (const v of reports) {
    const day = String(v.checkin_at).slice(0, 10);
    const bucket = byDay.get(day);
    if (!bucket) continue;
    bucket.total += v.summary?.total ?? 0;
    bucket.inStock += v.summary?.inStock ?? 0;
    bucket.stockDisponible += v.summary?.stockDisponible ?? 0;
  }
  return [...byDay.entries()].map(([day, t]) => ({
    label: new Date(day).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    value: t.total === 0 ? 0 : Math.round(((t.inStock + t.stockDisponible) / t.total) * 100),
  }));
}

/** Availability % by region, lowest first — where the network needs attention. */
export function healthByRegion(reports: VisitReport[]) {
  const map = new Map<string, StockTotals>();
  for (const v of reports) {
    const name = v.store?.region?.name ?? '—';
    const row = map.get(name) ?? emptyTotals();
    row.total += v.summary?.total ?? 0;
    row.inStock += v.summary?.inStock ?? 0;
    row.stockDisponible += v.summary?.stockDisponible ?? 0;
    map.set(name, row);
  }
  return [...map.entries()]
    .filter(([, t]) => t.total > 0)
    .map(([label, t]) => ({ label, value: availabilityPct(t) }))
    .sort((a, b) => a.value - b.value);
}

/** Most recent visits that turned up a stockout — the actionable feed. */
export function recentStockoutVisits(reports: VisitReport[], limit = 6) {
  return [...reports]
    .filter((v) => (v.summary?.outOfStock ?? 0) > 0)
    .sort((a, b) => new Date(b.checkin_at).getTime() - new Date(a.checkin_at).getTime())
    .slice(0, limit);
}

export function recentVisits(reports: VisitReport[], limit = 6) {
  return [...reports]
    .sort((a, b) => new Date(b.checkin_at).getTime() - new Date(a.checkin_at).getTime())
    .slice(0, limit);
}

export function visitsSince(reports: VisitReport[], days: number): VisitReport[] {
  const cutoff = Date.now() - days * 86400000;
  return reports.filter((v) => new Date(v.checkin_at).getTime() >= cutoff);
}
