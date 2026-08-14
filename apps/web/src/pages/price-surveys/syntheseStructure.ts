/**
 * Mirrors apps/api/src/price-surveys/synthese-structure.ts — keep both in sync.
 * Fixed structure of the "Synthèse" slide: sections, each with a fixed list
 * of sub-areas, each rendered as an own-brand / competitor textarea pair.
 */
export const SYNTHESE_STRUCTURE = {
  mises_en_avant_alcool: ['Frigo', 'Palox', 'Présentoir', 'Fût', 'Autres'],
  ruptures_alcool: ['Spirit', 'Bières', 'Vins', 'Autres'],
  mises_en_avant_food: ['Palox', 'Présentoir', 'Frigo'],
  ruptures_food: ['Palox', 'Présentoir', 'Frigo'],
} as const;

export type SyntheseSection = keyof typeof SYNTHESE_STRUCTURE;

export const SYNTHESE_SECTIONS = Object.keys(SYNTHESE_STRUCTURE) as SyntheseSection[];

export function noteKey(section: string, subArea: string, side: 'own' | 'competitor') {
  return `${section}|${subArea}|${side}`;
}

interface NoteLike {
  section: string;
  sub_area: string;
  side: 'own' | 'competitor';
  text: string | null;
}

/** All (section, sub_area, side) keys, defaulted to '', then filled in from whatever notes exist. */
export function buildInitialNoteValues(notes: NoteLike[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const section of SYNTHESE_SECTIONS) {
    for (const subArea of SYNTHESE_STRUCTURE[section]) {
      map[noteKey(section, subArea, 'own')] = '';
      map[noteKey(section, subArea, 'competitor')] = '';
    }
  }
  for (const note of notes) {
    const key = noteKey(note.section, note.sub_area, note.side);
    if (key in map) map[key] = note.text ?? '';
  }
  return map;
}

/** The full note set, always sent on save (bounded size — every fixed slot, blank or not). */
export function buildNotePayload(values: Record<string, string>) {
  const payload: NoteLike[] = [];
  for (const section of SYNTHESE_SECTIONS) {
    for (const subArea of SYNTHESE_STRUCTURE[section]) {
      for (const side of ['own', 'competitor'] as const) {
        const text = values[noteKey(section, subArea, side)]?.trim() ?? '';
        payload.push({ section, sub_area: subArea, side, text: text === '' ? null : text });
      }
    }
  }
  return payload;
}
