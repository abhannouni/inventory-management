import { Prisma } from '@prisma/client';

/**
 * The single definition of how an order's amounts are computed — exact
 * decimal arithmetic (no floating point), rounded to the centime per line:
 *
 *   total HT   = quantity × unit price HT
 *   TVA amount = total HT × TVA rate / 100
 *   total TTC  = total HT + TVA amount
 *
 * Order totals are the sums of the rounded lines, so the invoice footer always
 * equals what its lines add up to.
 */

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export interface LineInput {
  quantity: number;
  unit_price: number | string;
  tva_rate: number | string;
}

export interface LineAmounts {
  unit_price: Decimal;
  tva_rate: Decimal;
  total_ht: Decimal;
  tva_amount: Decimal;
  total_ttc: Decimal;
}

const round2 = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export function lineAmounts(line: LineInput): LineAmounts {
  const unitPrice = round2(new Decimal(line.unit_price));
  const tvaRate = round2(new Decimal(line.tva_rate));
  const totalHt = round2(unitPrice.mul(line.quantity));
  const tvaAmount = round2(totalHt.mul(tvaRate).div(100));
  return {
    unit_price: unitPrice,
    tva_rate: tvaRate,
    total_ht: totalHt,
    tva_amount: tvaAmount,
    total_ttc: totalHt.add(tvaAmount),
  };
}

export function orderTotals(lines: LineAmounts[]) {
  return lines.reduce(
    (t, l) => ({
      total_ht: t.total_ht.add(l.total_ht),
      total_tva: t.total_tva.add(l.tva_amount),
      total_ttc: t.total_ttc.add(l.total_ttc),
    }),
    {
      total_ht: new Decimal(0),
      total_tva: new Decimal(0),
      total_ttc: new Decimal(0),
    },
  );
}

/** `CMD-2026-00042` */
export function documentNumber(prefix: string, year: number, seq: number) {
  return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
}
