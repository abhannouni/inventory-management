import { CreateProductDto } from './dto/create-product.dto';
import { BOURCHANIN_CANONICAL_NAME } from './product-classification';

export const PRODUCT_IMPORT_COLUMNS = [
  'name',
  'sku',
  'category',
  'is_our_product',
  'distributeur',
  'famille',
  'sous_famille',
  'format',
] as const;

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  name: 'name',
  sku: 'sku',
  category: 'category',
  distributeur: 'distributeur',
  famille: 'famille',
  sous_famille: 'sous_famille',
  format: 'format',
};

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'y', 'oui', 'vrai', 'x']);

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value).trim();
  if (value instanceof Date) return value.toISOString().trim();
  return '';
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return TRUTHY_VALUES.has(toText(value).toLowerCase());
}

export interface ParsedProductRow {
  data?: CreateProductDto;
  error?: string;
}

/** Turns one raw spreadsheet row into a validated CreateProductDto, or an error message. */
export function parseProductRow(
  raw: Record<string, unknown>,
): ParsedProductRow {
  const is_our_product = toBoolean(raw.is_our_product);
  const name = toText(raw.name);
  const sku = toText(raw.sku).toUpperCase();
  const category = toText(raw.category);
  const famille = toText(raw.famille);
  const sous_famille = toText(raw.sous_famille);
  const format = toText(raw.format);
  const distributeur = is_our_product
    ? BOURCHANIN_CANONICAL_NAME
    : toText(raw.distributeur);

  const values: Record<string, string> = {
    name,
    sku,
    category,
    distributeur,
    famille,
    sous_famille,
    format,
  };
  const missing = Object.keys(REQUIRED_FIELD_LABELS).filter(
    (key) => !values[key],
  );

  if (missing.length) {
    return { error: `Missing required field(s): ${missing.join(', ')}` };
  }

  return {
    data: {
      name,
      sku,
      category,
      is_our_product,
      distributeur,
      famille,
      sous_famille,
      format,
    },
  };
}
