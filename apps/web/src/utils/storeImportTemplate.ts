/**
 * Excel template for bulk store (POS) import.
 *
 * Column headers must match exactly what the backend parser expects
 * (see apps/api/src/stores/store-import.util.ts) — the file is
 * read by header name, not by column position.
 */

const TEMPLATE_COLUMNS = [
  'name',
  'region',
  'brand',
  'channel',
  'classification',
  'address',
  'city',
  'postal_code',
  'opening_date',
  'section_manager_name',
  'section_manager_phone',
  'department_manager_name',
  'department_manager_phone',
  'gds_name',
  'gds_phone',
  'latitude',
  'longitude',
  'google_maps_url',
  'is_active',
];

const EXAMPLE_ROWS = [
  [
    'Marjane Californie',
    'Casablanca-Settat',
    'Marjane',
    'gms',
    'A',
    '12 Boulevard Zerktouni',
    'Casablanca',
    '20250',
    '2019-04-12',
    'Youssef Alami',
    '+212 661 234 567',
    'Salma Bennis',
    '+212 662 345 678',
    'Karim Idrissi',
    '+212 663 456 789',
    '33.5731',
    '-7.5898',
    'https://maps.app.goo.gl/xxxx',
    'yes',
  ],
  [
    'Alpha 55',
    'Rabat-Salé-Kénitra',
    'Alpha',
    'ls',
    'B',
    '55 Avenue Hassan II',
    'Rabat',
    '10000',
    '2021-09-01',
    'Nadia Fassi',
    '+212 664 567 890',
    'Omar Tazi',
    '+212 665 678 901',
    'Hicham Amrani',
    '+212 666 789 012',
    '34.0209',
    '-6.8417',
    'https://maps.app.goo.gl/yyyy',
    'yes',
  ],
];

const INSTRUCTIONS_ROWS: [string, string, string][] = [
  ['name', 'Yes', 'Point of sale name'],
  ['region', 'Yes', 'Must match the name of an existing region exactly (case-insensitive)'],
  ['brand', 'Yes', 'Retail chain / brand'],
  ['channel', 'Yes', 'gms or ls'],
  ['classification', 'Yes', 'A, B, C or D'],
  ['address', 'Yes', 'Street address'],
  ['city', 'Yes', 'City'],
  ['postal_code', 'Yes', 'Postal code'],
  ['opening_date', 'Yes', 'ISO date, e.g. 2019-04-12'],
  ['section_manager_name', 'Yes', 'Department section manager name'],
  ['section_manager_phone', 'Yes', 'e.g. +212 661 234 567'],
  ['department_manager_name', 'Yes', 'Department manager name'],
  ['department_manager_phone', 'Yes', 'e.g. +212 662 345 678'],
  ['gds_name', 'Yes', 'GDS name'],
  ['gds_phone', 'Yes', 'e.g. +212 663 456 789'],
  ['latitude', 'Yes', 'Decimal, -90 to 90'],
  ['longitude', 'Yes', 'Decimal, -180 to 180'],
  ['google_maps_url', 'Yes', 'Full URL starting with http:// or https://'],
  ['is_active', 'Yes', 'yes/no'],
];

const HEADER_FILL = 'FF1D6ADE'; // matches --primary
const HEADER_FONT = 'FFFFFFFF';

export async function downloadStoreImportTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  const storesSheet = workbook.addWorksheet('Stores');
  storesSheet.addRow(TEMPLATE_COLUMNS);
  EXAMPLE_ROWS.forEach((row) => storesSheet.addRow(row));

  const headerRow = storesSheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.font = { color: { argb: HEADER_FONT }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 20;

  storesSheet.columns = TEMPLATE_COLUMNS.map((c) => ({ width: Math.max(c.length + 4, 20) }));

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
  instructionsSheet.addRow(['Delete the example rows before uploading your own stores, or leave them — they will be imported as-is.']);
  instructionsSheet.columns = [{ width: 24 }, { width: 14 }, { width: 72 }];
  instructionsSheet.getColumn(3).alignment = { wrapText: true, vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'store-import-template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
