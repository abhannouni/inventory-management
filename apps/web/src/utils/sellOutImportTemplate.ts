/**
 * Excel template for bulk sell-out import.
 *
 * Column headers must match exactly what the backend parser expects
 * (see apps/api/src/sell-out/sell-out-import.util.ts) — the file is
 * read by header name, not by column position.
 */

const TEMPLATE_COLUMNS = ['store', 'sku', 'quantity', 'price'];

const EXAMPLE_ROWS = [
  ['Marjane Californie', 'SKU-00123', '10', '25.50'],
  ['Alpha 55', 'SKU-00456', '5', '18.00'],
];

const INSTRUCTIONS_ROWS: [string, string, string][] = [
  ['store', 'Yes', 'Must match the name of an existing store exactly (case-insensitive)'],
  ['sku', 'Yes', 'Must match the SKU of an existing product exactly (case-insensitive)'],
  ['quantity', 'Yes', 'Positive whole number'],
  ['price', 'Yes', 'Positive decimal, e.g. 25.50'],
];

const HEADER_FILL = 'FF1D6ADE'; // matches --primary
const HEADER_FONT = 'FFFFFFFF';

export async function downloadSellOutImportTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet('Sell-Out');
  sheet.addRow(TEMPLATE_COLUMNS);
  EXAMPLE_ROWS.forEach((row) => sheet.addRow(row));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.font = { color: { argb: HEADER_FONT }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 20;

  sheet.columns = TEMPLATE_COLUMNS.map((c) => ({ width: Math.max(c.length + 4, 20) }));

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
  instructionsSheet.addRow(['Every column is required — a row with any blank field will be rejected.']);
  instructionsSheet.addRow(['Delete the example rows before uploading your own data, or leave them — they will be imported as-is.']);
  instructionsSheet.columns = [{ width: 24 }, { width: 14 }, { width: 72 }];
  instructionsSheet.getColumn(3).alignment = { wrapText: true, vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sell-out-import-template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
