#!/usr/bin/env node
/**
 * Lee los XLSX en docs/porCargar y escribe un resumen (hojas, columnas, filas, muestra).
 * Ahorra contexto: no hace falta abrir los binarios; el resumen se usa para análisis.
 *
 * Uso: node scripts/read-xlsx-porcargar.mjs [--out=resumen.json]
 *      Sin --out escribe JSON por stdout.
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIR = join(ROOT, 'docs/porCargar');

const SAMPLE_ROWS = 3;
const args = process.argv.slice(2);
let outPath = null;
for (const arg of args) {
  if (arg.startsWith('--out=')) outPath = arg.slice(6);
}

/**
 * Devuelve resumen de un libro: nombre de hojas, cabeceras, conteo de filas y muestra.
 * @param {string} path - Ruta al .xlsx
 * @param {Buffer} buf - Contenido del archivo
 * @returns {object} - Resumen por hoja
 */
function summarizeWorkbook(path, buf) {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheets = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    const rowCount = rows.length;
    const headers = rowCount > 0 ? rows[0] : [];
    const sampleRows = rows.slice(1, 1 + SAMPLE_ROWS);

    sheets.push({
      name,
      headers,
      rowCount,
      sampleRows,
    });
  }

  return {
    path,
    sheetNames: wb.SheetNames,
    sheets,
  };
}

async function main() {
  const entries = await readdir(DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.xlsx'))
    .map((e) => e.name)
    .sort();

  const result = { dir: DIR, files: [] };

  for (const name of files) {
    const path = join(DIR, name);
    const buf = await readFile(path);
    result.files.push(summarizeWorkbook(path, buf));
  }

  const json = JSON.stringify(result, null, 2);

  if (outPath) {
    const { writeFile } = await import('fs/promises');
    await writeFile(outPath, json, 'utf8');
    console.error(`Resumen escrito en ${outPath}`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
