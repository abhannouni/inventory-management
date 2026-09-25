import { QuizAnswerMode } from '@prisma/client';

export const QUIZ_IMPORT_COLUMNS = [
  'question',
  'response_1',
  'response_2',
  'response_3',
  'response_4',
  'correct_response',
] as const;

export const MIN_QUIZ_QUESTIONS = 3;

const RESPONSE_COLUMNS = [
  'response_1',
  'response_2',
  'response_3',
  'response_4',
] as const;

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value).trim();
  return '';
}

export interface ParsedQuizQuestion {
  text: string;
  options: { position: number; text: string; is_correct: boolean }[];
}

export interface ParsedQuizRow {
  data?: ParsedQuizQuestion;
  error?: string;
  /** A fully blank row — ignored rather than reported. */
  skip?: boolean;
}

/**
 * Turns one raw spreadsheet row into a question with 2–4 options, or an error.
 *
 * Empty response cells are dropped. `correct_response` holds the number of the
 * right response (1–4); a `multiple` quiz may list several, e.g. "1,3".
 */
export function parseQuizRow(
  raw: Record<string, unknown>,
  mode: QuizAnswerMode,
): ParsedQuizRow {
  const text = toText(raw.question);
  const responses = RESPONSE_COLUMNS.map((c, i) => ({
    number: i + 1,
    text: toText(raw[c]),
  }));
  const correctText = toText(raw.correct_response);

  if (!text && !correctText && responses.every((r) => !r.text))
    return { skip: true };
  if (!text) return { error: 'Missing question' };

  const filled = responses.filter((r) => r.text);
  if (filled.length < 2) return { error: 'At least 2 responses are required' };

  if (!correctText) return { error: 'Missing correct_response' };

  // "." too: a French-locale Excel turns a typed "1,3" into the number 1.3.
  const parts = correctText.split(/[,;/.\s]+/).filter(Boolean);
  const numbers = parts.map((p) => Number(p.replace(/^response_?/i, '')));
  if (
    !numbers.length ||
    numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 4)
  ) {
    return {
      error: `Invalid correct_response "${correctText}" — use a number from 1 to 4`,
    };
  }
  const correct = new Set(numbers);
  if (mode === QuizAnswerMode.single && correct.size > 1) {
    return {
      error:
        'This quiz accepts one answer per question — give only one correct_response',
    };
  }
  const emptyRef = [...correct].find((n) => !responses[n - 1].text);
  if (emptyRef)
    return {
      error: `correct_response points to response_${emptyRef}, which is empty`,
    };

  return {
    data: {
      text,
      options: filled.map((r, i) => ({
        position: i + 1,
        text: r.text,
        is_correct: correct.has(r.number),
      })),
    },
  };
}
