"""
Lee un archivo .xlsx y extrae su contenido (todas las hojas).

Uso:
    python scripts/read_xlsx.py docs/archivo.xlsx
    python scripts/read_xlsx.py docs/archivo.xlsx --sheet "Hoja1"
    python scripts/read_xlsx.py docs/archivo.xlsx --output salida.txt
    python scripts/read_xlsx.py docs/archivo.xlsx --json
    python scripts/read_xlsx.py docs/archivo.xlsx --csv

No requiere dependencias externas (usa openpyxl-lite via zipfile+xml).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

EXCEL_EPOCH = datetime(1899, 12, 30)


def _parse_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        with archive.open("xl/sharedStrings.xml") as f:
            root = ET.parse(f).getroot()
    except KeyError:
        return []

    strings: list[str] = []
    for si in root.findall("s:si", NS):
        parts: list[str] = []
        for t in si.iter():
            tag = t.tag.rsplit("}", 1)[-1]
            if tag == "t" and t.text:
                parts.append(t.text)
        strings.append("".join(parts))
    return strings


def _parse_styles(archive: zipfile.ZipFile) -> list[int]:
    try:
        with archive.open("xl/styles.xml") as f:
            root = ET.parse(f).getroot()
    except KeyError:
        return []

    num_fmt_ids: list[int] = []
    xfs = root.find("s:cellXfs", NS)
    if xfs is None:
        return []

    for xf in xfs.findall("s:xf", NS):
        num_fmt_ids.append(int(xf.get("numFmtId", "0")))
    return num_fmt_ids


def _is_date_format(num_fmt_id: int) -> bool:
    return num_fmt_id in {14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47}


def _serial_to_date(serial: float) -> str:
    try:
        dt = EXCEL_EPOCH + timedelta(days=serial)
        if dt.hour == 0 and dt.minute == 0 and dt.second == 0:
            return dt.strftime("%Y-%m-%d")
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, OverflowError):
        return str(serial)


def _get_sheet_names(archive: zipfile.ZipFile) -> list[str]:
    with archive.open("xl/workbook.xml") as f:
        root = ET.parse(f).getroot()

    names: list[str] = []
    sheets = root.find("s:sheets", NS)
    if sheets is not None:
        for sheet in sheets.findall("s:sheet", NS):
            name = sheet.get("name", "")
            if name:
                names.append(name)
    return names


def _get_sheet_paths(archive: zipfile.ZipFile) -> list[str]:
    names = archive.namelist()
    pattern = re.compile(r"^xl/worksheets/sheet(\d+)\.xml$")
    matches = [(int(pattern.match(n).group(1)), n) for n in names if pattern.match(n)]
    matches.sort(key=lambda x: x[0])
    return [m[1] for m in matches]


def _col_letter_to_index(col: str) -> int:
    result = 0
    for ch in col.upper():
        result = result * 26 + (ord(ch) - ord("A") + 1)
    return result - 1


def _parse_cell_ref(ref: str) -> tuple[int, int]:
    match = re.match(r"([A-Z]+)(\d+)", ref)
    if not match:
        return 0, 0
    col = _col_letter_to_index(match.group(1))
    row = int(match.group(2)) - 1
    return row, col


def _parse_sheet(
    archive: zipfile.ZipFile,
    sheet_path: str,
    shared_strings: list[str],
    style_fmt_ids: list[int],
) -> list[list[str]]:
    with archive.open(sheet_path) as f:
        root = ET.parse(f).getroot()

    sheet_data = root.find("s:sheetData", NS)
    if sheet_data is None:
        return []

    rows_dict: dict[int, dict[int, str]] = {}
    max_col = 0

    for row_el in sheet_data.findall("s:row", NS):
        for cell in row_el.findall("s:c", NS):
            ref = cell.get("r", "")
            if not ref:
                continue

            row_idx, col_idx = _parse_cell_ref(ref)
            max_col = max(max_col, col_idx)

            cell_type = cell.get("t", "")
            style_idx = int(cell.get("s", "0"))
            value_el = cell.find("s:v", NS)
            value = value_el.text if value_el is not None else ""

            if not value:
                inline = cell.find("s:is", NS)
                if inline is not None:
                    parts = []
                    for t in inline.iter():
                        tag = t.tag.rsplit("}", 1)[-1]
                        if tag == "t" and t.text:
                            parts.append(t.text)
                    value = "".join(parts)

            if cell_type == "s" and value:
                idx = int(value)
                value = shared_strings[idx] if idx < len(shared_strings) else value
            elif cell_type == "b":
                value = "TRUE" if value == "1" else "FALSE"
            elif cell_type == "" and value:
                try:
                    num = float(value)
                    if style_fmt_ids and style_idx < len(style_fmt_ids):
                        if _is_date_format(style_fmt_ids[style_idx]):
                            value = _serial_to_date(num)
                        elif num == int(num) and abs(num) < 1e15:
                            value = str(int(num))
                except ValueError:
                    pass

            if row_idx not in rows_dict:
                rows_dict[row_idx] = {}
            rows_dict[row_idx][col_idx] = value or ""

    if not rows_dict:
        return []

    max_row = max(rows_dict.keys())
    result: list[list[str]] = []
    for r in range(max_row + 1):
        row_data = rows_dict.get(r, {})
        cells = [row_data.get(c, "") for c in range(max_col + 1)]
        result.append(cells)

    return result


def read_xlsx(xlsx_path: Path, sheet_filter: str | None = None) -> dict:
    if not xlsx_path.exists():
        raise FileNotFoundError(f"No existe el archivo: {xlsx_path}")

    if xlsx_path.suffix.lower() != ".xlsx":
        raise ValueError(f"El archivo no es .xlsx: {xlsx_path}")

    with zipfile.ZipFile(xlsx_path) as archive:
        shared_strings = _parse_shared_strings(archive)
        style_fmt_ids = _parse_styles(archive)
        sheet_names = _get_sheet_names(archive)
        sheet_paths = _get_sheet_paths(archive)

        sheets: list[dict] = []
        for i, path in enumerate(sheet_paths):
            name = sheet_names[i] if i < len(sheet_names) else f"Sheet{i + 1}"

            if sheet_filter and name.lower() != sheet_filter.lower():
                continue

            rows = _parse_sheet(archive, path, shared_strings, style_fmt_ids)
            sheets.append({"name": name, "rows": rows, "row_count": len(rows)})

    return {
        "file": str(xlsx_path),
        "sheet_count": len(sheets),
        "sheets": sheets,
    }


def format_text(result: dict) -> str:
    lines: list[str] = []
    for sheet in result["sheets"]:
        lines.append(f"=== {sheet['name']} ({sheet['row_count']} filas) ===")
        for row in sheet["rows"]:
            lines.append(" | ".join(cell for cell in row))
        lines.append("")
    return "\n".join(lines)


def format_csv(result: dict) -> str:
    lines: list[str] = []
    for sheet in result["sheets"]:
        if len(result["sheets"]) > 1:
            lines.append(f"# {sheet['name']}")
        for row in sheet["rows"]:
            escaped = []
            for cell in row:
                if "," in cell or '"' in cell or "\n" in cell:
                    escaped.append('"' + cell.replace('"', '""') + '"')
                else:
                    escaped.append(cell)
            lines.append(",".join(escaped))
        lines.append("")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Lee un archivo XLSX y extrae su contenido")
    parser.add_argument("xlsx_path", type=Path, help="Ruta al archivo .xlsx")
    parser.add_argument("--sheet", type=str, help="Nombre de hoja especifica a extraer")
    parser.add_argument("--output", type=Path, help="Ruta de salida para guardar el resultado")
    parser.add_argument("--json", action="store_true", help="Salida en formato JSON")
    parser.add_argument("--csv", action="store_true", help="Salida en formato CSV")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        result = read_xlsx(args.xlsx_path, sheet_filter=args.sheet)
    except (FileNotFoundError, ValueError, zipfile.BadZipFile) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.json:
        payload = json.dumps(result, ensure_ascii=False, indent=2)
    elif args.csv:
        payload = format_csv(result)
    else:
        payload = format_text(result)

    if args.output:
        args.output.write_text(payload + ("\n" if not payload.endswith("\n") else ""), encoding="utf-8")
        print(f"Salida escrita en {args.output}")
        return 0

    print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
