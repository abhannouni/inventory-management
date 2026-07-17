export const BOURCHANIN_CANONICAL_NAME = 'Bourchanin';

const normalizedBourchaninNames = new Set(
  ['Bourchanin', 'BOURCHANIN', 'bourchanin & cie', 'bourchanin et cie', 'bourchanin and cie']
    .map((value) => normalizeDistributorName(value)),
);

export function normalizeDistributorName(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '');
}

export function isBourchaninDistributor(value: string | null | undefined) {
  if (!value) return false;
  return normalizedBourchaninNames.has(normalizeDistributorName(value));
}
