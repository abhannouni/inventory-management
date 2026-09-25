/**
 * Excel template for creating a training quiz — one row per question.
 *
 * Column headers must match exactly what the backend parser expects
 * (see apps/api/src/training/quiz-import.util.ts); the file is read by header
 * name, not by column position.
 */

const TEMPLATE_COLUMNS = ['question', 'response_1', 'response_2', 'response_3', 'response_4', 'correct_response'];

const EXAMPLE_ROWS = [
  ['What should be checked first when arriving at a store?', 'The shelf price labels', 'The weather', 'The parking', '', '1'],
  ['Where should the newest stock be placed on the shelf?', 'In front', 'Behind the older stock', '', '', '2'],
  ['Which products must always be facing the customer?', 'Only promo products', 'Only new products', 'Every product', 'None', '3'],
];

const INSTRUCTIONS_ROWS: [string, string, string][] = [
  ['question', 'Yes', 'The question text. One row = one question. At least 3 questions per quiz, no maximum.'],
  ['response_1', 'Yes', 'First possible answer.'],
  ['response_2', 'Yes', 'Second possible answer.'],
  ['response_3', 'No', 'Optional third answer — leave empty if not needed.'],
  ['response_4', 'No', 'Optional fourth answer — leave empty if not needed.'],
  [
    'correct_response',
    'Yes',
    'The number of the right answer: 1, 2, 3 or 4. For a "multiple answers" quiz you can list several, e.g. 1,3.',
  ],
];

const HEADER_FILL = 'FF310024'; // matches --primary
const HEADER_FONT = 'FFFFFFFF';

export async function downloadTrainingQuizTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet('Questions');
  sheet.addRow(TEMPLATE_COLUMNS);
  EXAMPLE_ROWS.forEach((row) => sheet.addRow(row));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.font = { color: { argb: HEADER_FONT }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 20;

  sheet.columns = [{ width: 55 }, { width: 28 }, { width: 28 }, { width: 28 }, { width: 28 }, { width: 18 }];
  // Keep `correct_response` as text so "1,3" isn't turned into a number by Excel.
  sheet.getColumn(6).numFmt = '@';

  const instructionsSheet = workbook.addWorksheet('Instructions');
  const infoHeader = instructionsSheet.addRow(['Column', 'Required', 'Notes']);
  infoHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.font = { color: { argb: HEADER_FONT }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  infoHeader.height = 20;
  INSTRUCTIONS_ROWS.forEach((row) => instructionsSheet.addRow(row));
  instructionsSheet.addRow([]);
  instructionsSheet.addRow(['Keep the header row (row 1) exactly as provided.']);
  instructionsSheet.addRow(['Replace the example rows with your own questions.']);
  instructionsSheet.addRow(['Each user sees the questions and answers in a different random order.']);
  instructionsSheet.columns = [{ width: 20 }, { width: 14 }, { width: 90 }];
  instructionsSheet.getColumn(3).alignment = { wrapText: true, vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'questionnaire-template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
