/**
 * Excel template for bulk product import.
 *
 * Column headers must match exactly what the backend parser expects
 * (see apps/api/src/products/product-import.util.ts) — the file is
 * read by header name, not by column position.
 */

const TEMPLATE_COLUMNS = [
  'name',
  'sku',
  'category',
  'is_our_product',
  'distributeur',
  'famille',
  'sous_famille',
  'format',
];

const EXAMPLE_ROWS = [
  ['Coca-Cola 330ml', 'CC330', 'Beverages', 'no', 'Coca-Cola Company', 'Boissons', 'Sodas', '330ml'],
  ['Bourchanin Juice 1L', 'BJ1000', 'Beverages', 'yes', '', 'Boissons', 'Jus', '1L'],
];

const INSTRUCTIONS_ROWS: [string, string, string][] = [
  ['name', 'Yes', 'Product name'],
  ['sku', 'Yes', 'Unique product code. Import fails for a row whose SKU already exists.'],
  ['category', 'Yes', 'Product category'],
  ['is_our_product', 'No', 'yes/no. Defaults to no. When "yes", distributeur is forced to Bourchanin.'],
  ['distributeur', 'Conditional', 'Required unless is_our_product is "yes"'],
  ['famille', 'Yes', 'Product famille'],
  ['sous_famille', 'Yes', 'Product sous-famille'],
  ['format', 'Yes', 'Product format, e.g. 500ml'],
];

const HEADER_FILL = 'FF1D6ADE'; // matches --primary
const HEADER_FONT = 'FFFFFFFF';

export async function downloadProductImportTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  const productsSheet = workbook.addWorksheet('Products');
  productsSheet.addRow(TEMPLATE_COLUMNS);
  EXAMPLE_ROWS.forEach((row) => productsSheet.addRow(row));

  const headerRow = productsSheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.font = { color: { argb: HEADER_FONT }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 20;

  productsSheet.columns = TEMPLATE_COLUMNS.map((c) => ({ width: Math.max(c.length + 4, 20) }));

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
  instructionsSheet.addRow(['Delete the example rows before uploading your own products, or leave them — they will be imported as-is.']);
  instructionsSheet.columns = [{ width: 18 }, { width: 14 }, { width: 72 }];
  instructionsSheet.getColumn(3).alignment = { wrapText: true, vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'product-import-template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
