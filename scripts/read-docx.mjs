#!/usr/bin/env node
/**
 * Extrae el texto de un archivo .docx (Word).
 * Uso: node scripts/read-docx.mjs [ruta.docx]
 *      Por defecto lee docs/POWER_Digital_Documentacion_BD.docx
 *      Salida: texto plano por stdout. Con --out=archivo.md escribe en ese archivo.
 */

import mammoth from 'mammoth';
import { readFile } from 'fs/promises';
import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
let inputPath = join(ROOT, 'docs/POWER_Digital_Documentacion_BD.docx');
let outputPath = null;

for (const arg of args) {
  if (arg.startsWith('--out=')) {
    outputPath = arg.slice(6);
  } else if (!arg.startsWith('--')) {
    inputPath = arg;
  }
}

async function main() {
  const buffer = await readFile(inputPath);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  if (outputPath) {
    await writeFile(outputPath, text, 'utf8');
    console.error(`Texto escrito en ${outputPath}`);
  } else {
    process.stdout.write(text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
