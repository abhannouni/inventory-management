/**
 * Data export for reports and charts.
 *
 * Every chart is paired with the exact rows it was drawn from, so "Download data"
 * always hands back the numbers behind the picture — never a re-derived guess.
 */

export interface ExportColumn<T> {
  /** Header text written to the file. */
  header: string;
  /** Cell value. Return a primitive; Dates and nulls are handled. */
  value: (row: T) => string | number | boolean | Date | null | undefined;
}

export interface ExportDataset<T> {
  /** Used for the file name and the Excel sheet tab. */
  name: string;
  columns: ExportColumn<T>[];
  rows: T[];
}

/**
 * A dataset whose row shape is not tracked by the caller.
 *
 * One workbook bundles several charts, each with a different row type, so the
 * download surface has to hold a heterogeneous list. Each dataset stays
 * internally consistent — its columns are typed against its own rows at the site
 * that builds it — and everything downstream only reads `columns` and `rows`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyExportDataset = ExportDataset<any>;

/** Excel caps sheet names at 31 chars and forbids : \ / ? * [ ] */
function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Data';
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'report';
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function toCell(v: ReturnType<ExportColumn<never>['value']>): string | number | boolean {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return v;
}

/**
 * RFC-4180 quoting. A field is quoted when it contains a delimiter, a quote or a
 * newline, and embedded quotes are doubled.
 */
function csvField(value: string | number | boolean): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(dataset: ExportDataset<T>): string {
  const header = dataset.columns.map((c) => csvField(c.header)).join(',');
  const body = dataset.rows.map((row) =>
    dataset.columns.map((c) => csvField(toCell(c.value(row)))).join(','),
  );
  return [header, ...body].join('\r\n');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv<T>(dataset: ExportDataset<T>) {
  // The BOM makes Excel read the file as UTF-8, so accented and Arabic text
  // survives a double-click instead of arriving as mojibake.
  const blob = new Blob(['﻿' + toCsv(dataset)], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerDownload(blob, `${slug(dataset.name)}-${stamp()}.csv`);
}

/**
 * A real .xlsx. SheetJS is pulled in on demand so it never lands in the initial
 * bundle — most users never click Excel.
 */
export async function downloadXlsx(
  datasets: AnyExportDataset[],
  fileName: string,
) {
  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  const used = new Set<string>();

  for (const dataset of datasets) {
    const aoa = [
      dataset.columns.map((c) => c.header),
      ...dataset.rows.map((row) => dataset.columns.map((c) => toCell(c.value(row)))),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);

    // Roughly size each column to its widest cell so nothing opens as "####".
    sheet['!cols'] = dataset.columns.map((c, i) => ({
      wch: Math.min(
        40,
        Math.max(c.header.length + 2, ...aoa.slice(1).map((r) => String(r[i] ?? '').length + 2)),
      ),
    }));

    // Excel rejects a workbook with two identically-named sheets.
    let name = safeSheetName(dataset.name);
    let n = 2;
    while (used.has(name)) name = `${safeSheetName(dataset.name).slice(0, 28)} ${n++}`;
    used.add(name);

    XLSX.utils.book_append_sheet(book, sheet, name);
  }

  // Not `writeFile`: that path reaches for Node's `fs` and silently does nothing
  // in the browser. Serialise to bytes and hand them to the same Blob download
  // the CSV uses.
  const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `${slug(fileName)}-${stamp()}.xlsx`);
}
