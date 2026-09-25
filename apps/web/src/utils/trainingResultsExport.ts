import type { TFunction } from 'i18next';
import type { TrainingQuizExport } from '../api/training.api';
import { formatDate, formatDurationShort, formatRole } from './format';

/**
 * Excel export of training quiz results (Super Admin only — the data comes
 * from a `training.manage` endpoint).
 *
 * One "Summary" sheet with a line per quiz, then one sheet per quiz: a line
 * per assigned user with status, score and the answer they picked for each
 * question — green when right, red when wrong. Row 2 of each quiz sheet shows
 * the right answers for reference.
 */

const HEADER_FILL = 'FF310024'; // matches --primary
const HEADER_FONT = 'FFFFFFFF';
const RIGHT_FILL = 'FFDCFCE7';
const WRONG_FILL = 'FFFEE2E2';
const KEY_FILL = 'FFF3EAE2';

/** Excel sheet names: max 31 chars, none of []:*?/\ , unique in the workbook. */
function sheetName(title: string, used: Set<string>) {
  const base = title.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 28) || 'Quiz';
  let name = base;
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base.slice(0, 27)} ${i}`;
  used.add(name.toLowerCase());
  return name;
}

export async function downloadTrainingResults(quizzes: TrainingQuizExport[], t: TFunction, language: string) {
  const ExcelJS = (await import('exceljs')).default;
  type Row = import('exceljs').Row;
  const workbook = new ExcelJS.Workbook();

  const styleHeader = (row: Row) => {
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.font = { color: { argb: HEADER_FONT }, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
    row.height = 30;
  };

  // ─── Summary ──────────────────────────────────────────────────────────────
  const summary = workbook.addWorksheet(t('export.summarySheet'));
  styleHeader(
    summary.addRow([
      t('export.cols.quiz'),
      t('create.fields.deadline'),
      t('export.cols.durationMin'),
      t('export.cols.questions'),
      t('stats.assigned'),
      t('stats.completed'),
      t('stats.pending'),
      t('filters.missed'),
      t('stats.average'),
    ]),
  );
  quizzes.forEach((q) => {
    const done = q.assignments.filter((a) => a.status === 'completed');
    const total = q.questions.length;
    const avg = done.length && total
      ? Math.round((done.reduce((s, a) => s + (a.score ?? 0), 0) / (done.length * total)) * 100)
      : null;
    summary.addRow([
      q.title,
      formatDate(q.deadline, language),
      q.duration_minutes,
      total,
      q.assignments.length,
      done.length,
      q.assignments.filter((a) => a.status === 'not_started' || a.status === 'in_progress').length,
      q.assignments.filter((a) => a.status === 'missed').length,
      avg === null ? '—' : `${avg}%`,
    ]);
  });
  summary.columns = [{ width: 40 }, { width: 22 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }];
  summary.views = [{ state: 'frozen', ySplit: 1 }];

  // ─── One sheet per quiz ───────────────────────────────────────────────────
  const used = new Set([t('export.summarySheet').toLowerCase()]);
  quizzes.forEach((q) => {
    const sheet = workbook.addWorksheet(sheetName(q.title, used));
    const fixed = [
      t('results.user'),
      t('export.cols.email'),
      t('export.cols.role'),
      t('results.status'),
      t('results.score'),
      '%',
      t('results.time'),
      t('export.cols.startedAt'),
      t('results.submittedAt'),
      t('results.leaves'),
    ];
    const optionText = new Map(q.questions.flatMap((qu) => qu.options.map((o) => [o.id, o.text] as const)));

    styleHeader(sheet.addRow([...fixed, ...q.questions.map((qu) => `Q${qu.position}. ${qu.text}`)]));

    // Reference line: the right answer(s) under each question.
    const key = sheet.addRow([
      t('export.rightAnswers'),
      ...Array(fixed.length - 1).fill(''),
      ...q.questions.map((qu) => qu.options.filter((o) => o.is_correct).map((o) => o.text).join(' / ')),
    ]);
    key.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KEY_FILL } };
      cell.font = { italic: true, bold: true };
    });

    q.assignments.forEach((a) => {
      const pct = a.score !== null && a.total ? Math.round((a.score / a.total) * 100) : null;
      const done = a.status === 'completed';
      const row = sheet.addRow([
        a.user.full_name,
        a.user.email,
        formatRole(a.user.role),
        t(`status.${a.status}`),
        done ? `${a.score ?? 0}/${a.total}` : '—',
        done && pct !== null ? `${pct}%` : '—',
        formatDurationShort(a.duration_seconds),
        a.started_at ? formatDate(a.started_at, language) : '—',
        a.submitted_at ? formatDate(a.submitted_at, language) : '—',
        a.leave_count,
        ...q.questions.map((qu) => {
          const ans = a.answers[qu.id];
          return ans ? ans.option_ids.map((id) => optionText.get(id) ?? '').join(' / ') : '—';
        }),
      ]);
      q.questions.forEach((qu, i) => {
        const ans = a.answers[qu.id];
        const cell = row.getCell(fixed.length + 1 + i);
        if (ans) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ans.is_correct ? RIGHT_FILL : WRONG_FILL } };
        } else if (done) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WRONG_FILL } };
        }
      });
    });

    sheet.columns = [
      { width: 26 }, { width: 28 }, { width: 18 }, { width: 14 }, { width: 10 }, { width: 8 },
      { width: 10 }, { width: 20 }, { width: 20 }, { width: 12 },
      ...q.questions.map(() => ({ width: 30 })),
    ];
    sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = quizzes.length === 1
    ? quizzes[0].title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'quiz'
    : `${quizzes.length}-questionnaires`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `resultats-${slug}-${stamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
