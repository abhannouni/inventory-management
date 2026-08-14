import type { PriceSurveyItem } from '../../types';

export interface ItemFormValues {
  price_normal: string;
  price_promo: string;
  etat: string;
  competitor_name: string;
  competitor_cl: string;
  competitor_price_normal: string;
  competitor_price_promo: string;
  competitor_etat: string;
}

export const ITEM_FIELDS: (keyof ItemFormValues)[] = [
  'price_normal',
  'price_promo',
  'etat',
  'competitor_name',
  'competitor_cl',
  'competitor_price_normal',
  'competitor_price_promo',
  'competitor_etat',
];

export function itemToFormValues(item: PriceSurveyItem): ItemFormValues {
  return {
    price_normal: item.price_normal ?? '',
    price_promo: item.price_promo ?? '',
    etat: item.etat ?? '',
    competitor_name: item.competitor_name ?? '',
    competitor_cl: item.competitor_cl ?? '',
    competitor_price_normal: item.competitor_price_normal ?? '',
    competitor_price_promo: item.competitor_price_promo ?? '',
    competitor_etat: item.competitor_etat ?? '',
  };
}

const NUMBER_FIELDS = new Set<keyof ItemFormValues>([
  'price_normal',
  'price_promo',
  'competitor_price_normal',
  'competitor_price_promo',
]);

export function formValuesToItemPayload(id: string, values: ItemFormValues) {
  const payload: Record<string, unknown> = { id };
  for (const field of ITEM_FIELDS) {
    const raw = values[field].trim();
    if (NUMBER_FIELDS.has(field)) {
      payload[field] = raw === '' ? null : Number(raw);
    } else {
      payload[field] = raw === '' ? null : raw;
    }
  }
  return payload as {
    id: string;
    price_normal: number | null;
    price_promo: number | null;
    etat: string | null;
    competitor_name: string | null;
    competitor_cl: string | null;
    competitor_price_normal: number | null;
    competitor_price_promo: number | null;
    competitor_etat: string | null;
  };
}
