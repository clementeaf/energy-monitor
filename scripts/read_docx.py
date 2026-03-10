"""
Lee un archivo .docx y extrae su contenido textual en orden de aparicion.

Uso:
    python scripts/read_docx.py docs/POWER_Digital_Documentacion_BD.docx
    python scripts/read_docx.py docs/POWER_Digital_Documentacion_BD.docx --output salida.txt
    python scripts/read_docx.py docs/POWER_Digital_Documentacion_BD.docx --json

No requiere dependencias externas.
"""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
}


def iter_block_items(body: ET.Element):
    for child in body:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag in {"p", "tbl"}:
            yield tag, child


def extract_paragraph_text(paragraph: ET.Element) -> str:
    parts: list[str] = []

    for node in paragraph.iter():
        tag = node.tag.rsplit("}", 1)[-1]
        if tag == "t" and node.text:
            parts.append(node.text)
        elif tag == "tab":
            parts.append("\t")
        elif tag in {"br", "cr"}:
            parts.append("\n")

    return "".join(parts).strip()


def extract_table_rows(table: ET.Element) -> list[list[str]]:
    rows: list[list[str]] = []

    for row in table.findall("w:tr", NS):
        cells: list[str] = []
        for cell in row.findall("w:tc", NS):
            fragments = []
            for paragraph in cell.findall("w:p", NS):
                text = extract_paragraph_text(paragraph)
                if text:
                    fragments.append(text)
            cells.append(" ".join(fragments).strip())
        if any(cells):
            rows.append(cells)

    return rows


def read_docx(docx_path: Path) -> dict:
    if not docx_path.exists():
        raise FileNotFoundError(f"No existe el archivo: {docx_path}")

    if docx_path.suffix.lower() != ".docx":
        raise ValueError(f"El archivo no es .docx: {docx_path}")

    with zipfile.ZipFile(docx_path) as archive:
        with archive.open("word/document.xml") as document_file:
            root = ET.parse(document_file).getroot()

    body = root.find("w:body", NS)
    if body is None:
        raise ValueError("No se encontro el cuerpo del documento")

    blocks = []
    flat_lines: list[str] = []

    for block_type, element in iter_block_items(body):
        if block_type == "p":
            text = extract_paragraph_text(element)
            if text:
                blocks.append({"type": "paragraph", "text": text})
                flat_lines.append(text)
            continue

        rows = extract_table_rows(element)
        if not rows:
            continue

        blocks.append({"type": "table", "rows": rows})
        flat_lines.append("[TABLA]")
        for row in rows:
            flat_lines.append(" | ".join(row))

    return {
        "file": str(docx_path),
        "blocks": blocks,
        "text": "\n".join(flat_lines),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Lee un archivo DOCX y extrae su contenido")
    parser.add_argument("docx_path", type=Path, help="Ruta al archivo .docx")
    parser.add_argument("--output", type=Path, help="Ruta de salida para guardar el texto o JSON")
    parser.add_argument("--json", action="store_true", help="Imprime o guarda la salida en JSON")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        result = read_docx(args.docx_path)
    except (FileNotFoundError, ValueError, zipfile.BadZipFile) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    payload = json.dumps(result, ensure_ascii=False, indent=2) if args.json else result["text"]

    if args.output:
        args.output.write_text(payload + ("\n" if not payload.endswith("\n") else ""), encoding="utf-8")
        print(f"Salida escrita en {args.output}")
        return 0

    print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())