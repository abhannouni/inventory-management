/**
 * Fixed structure of the "Synthèse" slide: free-text notes about product
 * displays and stockouts, grouped by section then sub-area, each with an
 * "own brand" and a "competitor" box. Unlike the price-entry slides (which
 * are derived dynamically from whatever product categories are assigned),
 * this layout is fixed — it doesn't come from the product catalog.
 */
export const SYNTHESE_STRUCTURE = {
  mises_en_avant_alcool: ['Frigo', 'Palox', 'Présentoir', 'Fût', 'Autres'],
  ruptures_alcool: ['Spirit', 'Bières', 'Vins', 'Autres'],
  mises_en_avant_food: ['Palox', 'Présentoir', 'Frigo'],
  ruptures_food: ['Palox', 'Présentoir', 'Frigo'],
} as const;

export type SyntheseSection = keyof typeof SYNTHESE_STRUCTURE;

export const SYNTHESE_SECTIONS = Object.keys(SYNTHESE_STRUCTURE) as SyntheseSection[];

export function isValidSyntheseSlot(section: string, subArea: string): boolean {
  const areas = SYNTHESE_STRUCTURE[section as SyntheseSection];
  return !!areas && (areas as readonly string[]).includes(subArea);
}
