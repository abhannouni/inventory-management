export const PROMO_IMPORT_COLUMNS = ['sku', 'contenance', 'original_price', 'promo_price'] as const;

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
}

export interface ParsedPromoItemRow {
  data?: {
    product_id: string;
    contenance: string;
    original_price: number;
    promo_price: number;
  };
  error?: string;
}

/**
 * Turns one raw spreadsheet row into a validated promo item, or an error message.
 * Products are matched by SKU (case-insensitive, trimmed).
 */
export function parsePromoRow(
  raw: Record<string, unknown>,
  productIdBySku: Map<string, string>,
): ParsedPromoItemRow {
  const sku = toText(raw.sku);
  const contenance = toText(raw.contenance);
  const originalText = toText(raw.original_price);
  const promoText = toText(raw.promo_price);

  const missing: string[] = [];
  if (!sku) missing.push('sku');
  if (!contenance) missing.push('contenance');
  if (!originalText) missing.push('original_price');
  if (!promoText) missing.push('promo_price');
  if (missing.length) {
    return { error: `Missing required field(s): ${missing.join(', ')}` };
  }

  const product_id = productIdBySku.get(sku.toLowerCase());
  if (!product_id) {
    return { error: `Product not found for SKU "${sku}"` };
  }

  const original_price = Number(originalText);
  if (Number.isNaN(original_price) || original_price <= 0) {
    return { error: `Invalid original_price "${originalText}"` };
  }

  const promo_price = Number(promoText);
  if (Number.isNaN(promo_price) || promo_price <= 0) {
    return { error: `Invalid promo_price "${promoText}"` };
  }

  return { data: { product_id, contenance, original_price, promo_price } };
}
