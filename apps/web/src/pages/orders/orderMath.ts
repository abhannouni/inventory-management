/**
 * Live totals for the order form. Mirrors the server's rules
 * (`apps/api/src/orders/order-totals.util.ts`): round each line to the
 * centime, then sum the rounded lines. Worked in integer centimes so
 * floating-point drift never shows (0.1 × 3 = 0.30, not 0.30000000000000004).
 * The server recomputes on confirm and its numbers are the ones invoiced.
 */

export const TVA_PRESETS = [0, 7, 10, 14, 20];
export const DEFAULT_TVA = 20;

/** Round half up to whole centimes, guarding against float noise (1.005 → 1.01). */
const toCents = (value: number) => Math.round(Number(`${value}e2`) + Number.EPSILON);

export interface LineTotals {
  ht: number;
  tva: number;
  ttc: number;
}

export function lineTotals(quantity: number, unitPrice: number, tvaRate: number): LineTotals {
  if (!(quantity > 0) || !(unitPrice >= 0) || !(tvaRate >= 0)) return { ht: 0, tva: 0, ttc: 0 };
  const htCents = Math.round(quantity * toCents(unitPrice));
  // htCents is whole, so this only drifts in the last float bits — nudge half-cents up like the server.
  const tvaCents = Math.round((htCents * tvaRate) / 100 + 1e-9);
  return { ht: htCents / 100, tva: tvaCents / 100, ttc: (htCents + tvaCents) / 100 };
}

export function sumTotals(lines: LineTotals[]): LineTotals {
  const cents = lines.reduce(
    (t, l) => ({ ht: t.ht + toCents(l.ht), tva: t.tva + toCents(l.tva) }),
    { ht: 0, tva: 0 },
  );
  return { ht: cents.ht / 100, tva: cents.tva / 100, ttc: (cents.ht + cents.tva) / 100 };
}

const LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'fr-MA' };

/** "1 234,50 DH" — two decimals, local grouping. */
export function formatMoney(value: number | string | null | undefined, language: string): string {
  const n = Number(value ?? 0);
  return `${n.toLocaleString(LOCALES[language] ?? 'fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
}

export function formatRate(value: number | string): string {
  const n = Number(value);
  return `${Number.isInteger(n) ? n : n.toFixed(2)} %`;
}
