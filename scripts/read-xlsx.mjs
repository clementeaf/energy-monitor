#!/usr/bin/env node
/**
 * Extrae el contenido de un archivo .xlsx (Excel).
 * Uso: node scripts/read-xlsx.mjs [ruta.xlsx]
 *      Por defecto lee docs/POWER_Digital_Especificacion_Modulos-rev2.1 (1).xlsx
 *      --out=archivo.txt   escribe en ese archivo
 *      --json              salida JSON
 *      --csv               salida CSV
 *      --sheet="Hoja1"     solo esa hoja
 *
 * Requiere: npm install xlsx (en scripts/)
 */

import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
let inputPath = join(ROOT, 'docs/POWER_Digital_Especificacion_Modulos-rev2.1 (1).xlsx');
let outputPath = null;
let jsonMode = false;
let csvMode = false;
let sheetFilter = null;

for (const arg of args) {
  if (arg.startsWith('--out=')) {
    outputPath = arg.slice(6);
  } else if (arg === '--json') {
    jsonMode = true;
  } else if (arg === '--csv') {
    csvMode = true;
  } else if (arg.startsWith('--sheet=')) {
    sheetFilter = arg.slice(8);
  } else if (!arg.startsWith('--')) {
    inputPath = arg;
  }
}

function sheetToRows(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const rows = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr];
      row.push(cell ? XLSX.utils.format_cell(cell) : '');
    }
    rows.push(row);
  }
  return rows;
}

function formatText(result) {
  const lines = [];
  for (const sheet of result.sheets) {
    lines.push(`=== ${sheet.name} (${sheet.row_count} filas) ===`);
    for (const row of sheet.rows) {
      lines.push(row.join(' | '));
    }
    lines.push('');
  }
  return lines.join('\n');
}

function formatCsv(result) {
  const lines = [];
  for (const sheet of result.sheets) {
    if (result.sheets.length > 1) {
      lines.push(`# ${sheet.name}`);
    }
    for (const row of sheet.rows) {
      const escaped = row.map((cell) => {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      });
      lines.push(escaped.join(','));
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const buffer = await readFile(inputPath);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const sheets = [];
  for (const name of workbook.SheetNames) {
    if (sheetFilter && name.toLowerCase() !== sheetFilter.toLowerCase()) {
      continue;
    }
    const ws = workbook.Sheets[name];
    const rows = sheetToRows(ws);
    sheets.push({ name, rows, row_count: rows.length });
  }

  const result = {
    file: inputPath,
    sheet_count: sheets.length,
    sheets,
  };

  let output;
  if (jsonMode) {
    output = JSON.stringify(result, null, 2);
  } else if (csvMode) {
    output = formatCsv(result);
  } else {
    output = formatText(result);
  }

  if (outputPath) {
    await writeFile(outputPath, output, 'utf8');
    console.error(`Salida escrita en ${outputPath}`);
  } else {
    process.stdout.write(output);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
