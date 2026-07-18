import { CreateSellOutDto } from './dto/create-sell-out.dto';

export const SELL_OUT_IMPORT_COLUMNS = ['store', 'sku', 'quantity', 'price'] as const;

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (value instanceof Date) return value.toISOString().trim();
  return '';
}

export interface ParsedSellOutRow {
  data?: CreateSellOutDto;
  error?: string;
}

/** Turns one raw spreadsheet row into a validated CreateSellOutDto, or an error message. */
export function parseSellOutRow(
  raw: Record<string, unknown>,
  storesByName: Map<string, string>,
  productsBySku: Map<string, string>,
): ParsedSellOutRow {
  const storeText = toText(raw.store);
  const skuText = toText(raw.sku).toUpperCase();
  const quantityText = toText(raw.quantity);
  const priceText = toText(raw.price);

  const missing: string[] = [];
  if (!storeText) missing.push('store');
  if (!skuText) missing.push('sku');
  if (!quantityText) missing.push('quantity');
  if (!priceText) missing.push('price');
  if (missing.length) {
    return { error: `Missing required field(s): ${missing.join(', ')}` };
  }

  const store_id = storesByName.get(storeText.toLowerCase());
  if (!store_id) {
    return { error: `Store not found: "${storeText}"` };
  }

  const product_id = productsBySku.get(skuText.toLowerCase());
  if (!product_id) {
    return { error: `Product not found for SKU: "${skuText}"` };
  }

  const quantity = Number(quantityText);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: `Invalid quantity "${quantityText}"` };
  }

  const price = Number(priceText);
  if (Number.isNaN(price) || price <= 0) {
    return { error: `Invalid price "${priceText}"` };
  }

  return { data: { store_id, product_id, quantity, price } };
}
