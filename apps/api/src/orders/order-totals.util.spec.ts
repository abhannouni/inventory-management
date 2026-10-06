import { documentNumber, lineAmounts, orderTotals } from './order-totals.util';

describe('order totals', () => {
  it('computes HT, TVA and TTC per line', () => {
    const l = lineAmounts({ quantity: 3, unit_price: 12.5, tva_rate: 20 });
    expect(l.total_ht.toFixed(2)).toBe('37.50');
    expect(l.tva_amount.toFixed(2)).toBe('7.50');
    expect(l.total_ttc.toFixed(2)).toBe('45.00');
  });

  it('uses exact decimals and rounds half up to the centime', () => {
    // 0.1 × 3 is 0.30000000000000004 in floating point.
    expect(
      lineAmounts({
        quantity: 3,
        unit_price: 0.1,
        tva_rate: 0,
      }).total_ht.toFixed(2),
    ).toBe('0.30');
    // 10.05 × 7% = 0.7035 → 0.70; 1.15 × 10% = 0.115 → 0.12
    expect(
      lineAmounts({
        quantity: 1,
        unit_price: 10.05,
        tva_rate: 7,
      }).tva_amount.toFixed(2),
    ).toBe('0.70');
    expect(
      lineAmounts({
        quantity: 1,
        unit_price: 1.15,
        tva_rate: 10,
      }).tva_amount.toFixed(2),
    ).toBe('0.12');
  });

  it('handles a 0% rate and accepts string input', () => {
    const l = lineAmounts({ quantity: 2, unit_price: '19.99', tva_rate: '0' });
    expect(l.tva_amount.toFixed(2)).toBe('0.00');
    expect(l.total_ttc.toFixed(2)).toBe('39.98');
  });

  it('sums the rounded lines into the order totals', () => {
    const t = orderTotals([
      lineAmounts({ quantity: 3, unit_price: 12.5, tva_rate: 20 }),
      lineAmounts({ quantity: 1, unit_price: 1.15, tva_rate: 10 }),
    ]);
    expect(t.total_ht.toFixed(2)).toBe('38.65');
    expect(t.total_tva.toFixed(2)).toBe('7.62');
    expect(t.total_ttc.toFixed(2)).toBe('46.27');
    expect(t.total_ht.add(t.total_tva).equals(t.total_ttc)).toBe(true);
  });

  it('formats document numbers', () => {
    expect(documentNumber('FAC', 2026, 42)).toBe('FAC-2026-00042');
  });
});
