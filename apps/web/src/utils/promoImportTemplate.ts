/**
 * Excel template for bulk promo import.
 *
 * Column headers must match exactly what the backend parser expects
 * (see apps/api/src/promos/promo-import.util.ts) — products are matched by
 * SKU, and the file is read by header name, not by column position.
 */

const TEMPLATE_COLUMNS = ['sku', 'contenance', 'original_price', 'promo_price'];

const EXAMPLE_ROWS = [
  ['CC330', '33cl', '8.50', '6.90'],
  ['CC1L', '1L', '18.00', '14.50'],
];

const INSTRUCTIONS_ROWS: [string, string, string][] = [
  ['sku', 'Yes', 'Must match an existing product SKU exactly (case-insensitive)'],
  ['contenance', 'Yes', 'Size/volume variant, e.g. 33cl, 1L'],
  ['original_price', 'Yes', 'Decimal, greater than 0'],
  ['promo_price', 'Yes', 'Decimal, greater than 0'],
];

const HEADER_FILL = 'FF1D6ADE'; // matches --primary
const HEADER_FONT = 'FFFFFFFF';

export async function downloadPromoImportTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  const promosSheet = workbook.addWorksheet('Promos');
  promosSheet.addRow(TEMPLATE_COLUMNS);
  EXAMPLE_ROWS.forEach((row) => promosSheet.addRow(row));

  const headerRow = promosSheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.font = { color: { argb: HEADER_FONT }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 20;

  promosSheet.columns = TEMPLATE_COLUMNS.map((c) => ({ width: Math.max(c.length + 4, 20) }));

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
  instructionsSheet.addRow(['Publishing this file replaces the currently active promo for every user.']);
  instructionsSheet.columns = [{ width: 20 }, { width: 14 }, { width: 72 }];
  instructionsSheet.getColumn(3).alignment = { wrapText: true, vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'promo-import-template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
