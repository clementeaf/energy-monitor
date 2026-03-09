# Read XLSX Skill

## Description
Lee archivos Excel (.xlsx) y muestra su contenido como tabla markdown. Soporta selección de hoja, rango de filas y columnas específicas.

## Trigger
Cuando el usuario pida leer, inspeccionar o analizar un archivo `.xlsx`.

## Steps

### 1. Identificar archivo y opciones
- `FILE`: ruta al archivo xlsx (absoluta o relativa al proyecto)
- `SHEET`: nombre de hoja (default: primera hoja)
- `ROWS`: límite de filas a mostrar (default: 50)
- `COLS`: columnas específicas (default: todas)

### 2. Ejecutar lectura
```bash
python3 -c "
import openpyxl, sys

file = '${FILE}'
sheet_name = '${SHEET}' if '${SHEET}' != '' else None
max_rows = int('${ROWS}') if '${ROWS}' != '' else 50

wb = openpyxl.load_workbook(file, read_only=True, data_only=True)

# Listar hojas si no se especificó
if sheet_name:
    ws = wb[sheet_name]
else:
    ws = wb.active
    print(f'Hojas: {wb.sheetnames}')
    print(f'Leyendo: {ws.title}')
    print()

rows = list(ws.iter_rows(values_only=True))
if not rows:
    print('(vacío)')
    sys.exit(0)

# Header
header = [str(c) if c is not None else '' for c in rows[0]]
print('| ' + ' | '.join(header) + ' |')
print('| ' + ' | '.join(['---'] * len(header)) + ' |')

# Data rows
for row in rows[1:max_rows+1]:
    cells = [str(c) if c is not None else '' for c in row]
    print('| ' + ' | '.join(cells) + ' |')

remaining = len(rows) - 1 - max_rows
if remaining > 0:
    print(f'\n... {remaining} filas más omitidas (total: {len(rows)-1})')

wb.close()
"
```

### 3. Si el usuario necesita filtrar columnas
```bash
python3 -c "
import openpyxl

wb = openpyxl.load_workbook('${FILE}', read_only=True, data_only=True)
ws = wb['${SHEET}'] if '${SHEET}' else wb.active
rows = list(ws.iter_rows(values_only=True))
header = list(rows[0])
cols = [${COLS}]  # indices 0-based o nombres
col_indices = [header.index(c) if isinstance(c, str) else c for c in cols]

print('| ' + ' | '.join([str(header[i]) for i in col_indices]) + ' |')
print('| ' + ' | '.join(['---'] * len(col_indices)) + ' |')
for row in rows[1:${ROWS}+1]:
    cells = [str(row[i]) if row[i] is not None else '' for i in col_indices]
    print('| ' + ' | '.join(cells) + ' |')
wb.close()
"
```

## Output
Tabla markdown con el contenido del archivo. Si hay muchas filas, trunca e indica cuántas faltan.
