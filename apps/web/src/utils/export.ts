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

export interface PptxChartItem {
  title: string;
  subtitle?: string;
  /** The rendered chart DOM node to rasterize onto its slide, or null if unavailable. */
  node: HTMLElement | null;
}

/**
 * One slide per chart: title, subtitle, and a rasterized snapshot of the chart
 * exactly as it renders on screen. pptxgenjs and html-to-image are both pulled
 * in on demand — most users only ever touch the CSV/Excel path.
 */
export async function downloadPptx(
  items: PptxChartItem[],
  fileName: string,
  labels: { coverSubtitle: string; unavailable: string },
) {
  const [{ default: PptxGenJS }, { toPng }] = await Promise.all([
    import('pptxgenjs'),
    import('html-to-image'),
  ]);

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'REPORT_16X9', width: 10, height: 5.63 });
  pptx.layout = 'REPORT_16X9';

  const cover = pptx.addSlide();
  cover.background = { color: 'FFFFFF' };
  cover.addText(fileName, {
    x: 0.5, y: 2.1, w: 9, h: 1, fontSize: 28, bold: true, color: '0B0B0B', align: 'center',
  });
  cover.addText(`${labels.coverSubtitle} · ${new Date().toLocaleDateString()}`, {
    x: 0.5, y: 3.05, w: 9, h: 0.5, fontSize: 13, color: '6B7280', align: 'center',
  });

  for (const item of items) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    slide.addText(item.title, {
      x: 0.4, y: 0.3, w: 9.2, h: 0.5, fontSize: 20, bold: true, color: '0B0B0B',
    });
    if (item.subtitle) {
      slide.addText(item.subtitle, {
        x: 0.4, y: 0.78, w: 9.2, h: 0.35, fontSize: 12, color: '6B7280',
      });
    }

    let imageData: string | null = null;
    if (item.node) {
      try {
        imageData = await Promise.race([
          toPng(item.node, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            cacheBust: true,
            // The app's fonts load from Google Fonts; inlining them means fetching
            // that stylesheet cross-origin, which hangs indefinitely wherever that
            // request is blocked (offline, strict CSP). The chart is legible in the
            // system fallback, so skip the fetch rather than risk a stuck export.
            skipFonts: true,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('capture timed out')), 15000),
          ),
        ]);
      } catch {
        imageData = null;
      }
    }

    if (imageData) {
      slide.addImage({
        data: imageData,
        x: 0.6, y: 1.3, w: 8.8, h: 3.9,
        sizing: { type: 'contain', w: 8.8, h: 3.9 },
      });
    } else {
      slide.addText(labels.unavailable, {
        x: 0.6, y: 2.8, w: 8.8, h: 0.6, fontSize: 14, color: '9CA3AF', align: 'center',
      });
    }
  }

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  triggerDownload(blob, `${slug(fileName)}-${stamp()}.pptx`);
}
