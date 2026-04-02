import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import type { ReportFormat } from '../platform/entities/report.entity';

/**
 * Tabular dataset used to render PDF, Excel, or CSV exports.
 */
export interface ReportDataset {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: string[][];
}

/**
 * Serializes a dataset to PDF bytes.
 * @param dataset - Table content and titles
 * @returns PDF buffer
 */
export function datasetToPdfBuffer(dataset: ReportDataset): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    doc.fontSize(16).text(dataset.title, { align: 'center' });
    doc.moveDown(0.5);
    if (dataset.subtitle) {
      doc.fontSize(10).fillColor('#444444').text(dataset.subtitle, { align: 'center' });
      doc.fillColor('#000000');
    }
    doc.moveDown(1);

    const colCount = dataset.columns.length;
    if (colCount === 0) {
      doc.fontSize(11).text('Sin datos para el periodo seleccionado.');
      doc.end();
      return;
    }

    doc.fontSize(9);
    let y = doc.y;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / colCount;
    const startX = doc.page.margins.left;

    const drawHeader = (): void => {
      doc.font('Helvetica-Bold');
      dataset.columns.forEach((h, i) => {
        doc.text(h, startX + i * colWidth, y, {
          width: colWidth - 4,
          align: 'left',
        });
      });
      doc.font('Helvetica');
      y += 18;
    };

    drawHeader();

    for (const row of dataset.rows) {
      if (y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }
      row.forEach((cell, i) => {
        doc.text(String(cell), startX + i * colWidth, y, {
          width: colWidth - 4,
          align: 'left',
        });
      });
      y += 14;
    }

    doc.end();
  });
}

/**
 * Serializes a dataset to an XLSX workbook buffer.
 * @param dataset - Table content and titles
 * @returns XLSX buffer
 */
export async function datasetToExcelBuffer(dataset: ReportDataset): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Reporte', {
    views: [{ state: 'frozen', ySplit: dataset.subtitle ? 3 : 2 }],
  });
  ws.getCell('A1').value = dataset.title;
  ws.getCell('A1').font = { size: 14, bold: true };
  let rowIdx = 2;
  if (dataset.subtitle) {
    ws.getCell(`A${rowIdx}`).value = dataset.subtitle;
    rowIdx += 1;
  }
  rowIdx += 1;
  ws.addRow(dataset.columns);
  const headerRow = ws.getRow(rowIdx);
  headerRow.font = { bold: true };
  rowIdx += 1;
  for (const r of dataset.rows) {
    ws.addRow(r);
    rowIdx += 1;
  }
  ws.columns.forEach((col) => {
    col.width = 18;
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Serializes a dataset to CSV with UTF-8 BOM for Excel compatibility.
 * @param dataset - Table content
 * @returns CSV buffer
 */
export function datasetToCsvBuffer(dataset: ReportDataset): Buffer {
  const lines: string[] = [];
  lines.push(dataset.title);
  if (dataset.subtitle) lines.push(dataset.subtitle);
  lines.push(dataset.columns.map(escapeCsv).join(';'));
  for (const row of dataset.rows) {
    lines.push(row.map((c) => escapeCsv(String(c))).join(';'));
  }
  const body = '\uFEFF' + lines.join('\n');
  return Buffer.from(body, 'utf-8');
}

/**
 * Maps report format to Content-Type header value.
 * @param format - Export format
 * @returns MIME type string
 */
export function mimeForFormat(format: ReportFormat): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Builds a filename for Content-Disposition.
 * @param reportType - Report kind
 * @param periodStart - Period start (date string)
 * @param format - File format
 * @returns Base filename with extension
 */
export function exportFilename(
  reportType: string,
  periodStart: string,
  format: ReportFormat,
): string {
  const ext = format === 'excel' ? 'xlsx' : format;
  const safe = periodStart.replace(/[^0-9-]/g, '');
  return `reporte-${reportType}-${safe}.${ext}`;
}

function escapeCsv(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
