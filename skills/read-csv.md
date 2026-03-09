# Read CSV Skill

## Description
Lee archivos CSV y muestra su contenido como tabla markdown. Soporta delimitadores custom, rango de filas y columnas específicas.

## Trigger
Cuando el usuario pida leer, inspeccionar o analizar un archivo `.csv`.

## Steps

### 1. Identificar archivo y opciones
- `FILE`: ruta al archivo csv (absoluta o relativa al proyecto)
- `DELIM`: delimitador (default: `,`)
- `ROWS`: límite de filas a mostrar (default: 50)
- `COLS`: columnas específicas por nombre o índice (default: todas)
- `ENCODING`: encoding del archivo (default: `utf-8`)

### 2. Vista rápida (estructura + primeras filas)
```bash
python3 -c "
import csv, sys

file = '${FILE}'
delim = '${DELIM}' if '${DELIM}' != '' else ','
max_rows = int('${ROWS}') if '${ROWS}' != '' else 50
encoding = '${ENCODING}' if '${ENCODING}' != '' else 'utf-8'

with open(file, 'r', encoding=encoding) as f:
    reader = csv.reader(f, delimiter=delim)
    rows = []
    for i, row in enumerate(reader):
        rows.append(row)
        if i > max_rows:
            break

if not rows:
    print('(vacío)')
    sys.exit(0)

# Count total rows efficiently
with open(file, 'r', encoding=encoding) as f:
    total = sum(1 for _ in f) - 1  # minus header

print(f'Total filas: {total} | Columnas: {len(rows[0])}')
print()

# Header
header = rows[0]
print('| ' + ' | '.join(header) + ' |')
print('| ' + ' | '.join(['---'] * len(header)) + ' |')

# Data
for row in rows[1:max_rows+1]:
    cells = [c if c else '' for c in row]
    # Pad if row has fewer columns
    while len(cells) < len(header):
        cells.append('')
    print('| ' + ' | '.join(cells[:len(header)]) + ' |')

remaining = total - max_rows
if remaining > 0:
    print(f'\n... {remaining} filas más omitidas')
"
```

### 3. Filtrar columnas específicas
```bash
python3 -c "
import csv

file = '${FILE}'
delim = '${DELIM}' if '${DELIM}' != '' else ','
max_rows = int('${ROWS}') if '${ROWS}' != '' else 50
col_names = [${COLS}]  # lista de nombres de columna

with open(file, 'r') as f:
    reader = csv.DictReader(f, delimiter=delim)
    rows = []
    for i, row in enumerate(reader):
        if i >= max_rows:
            break
        rows.append(row)

if not rows:
    print('(vacío)')
else:
    cols = col_names if col_names else list(rows[0].keys())
    print('| ' + ' | '.join(cols) + ' |')
    print('| ' + ' | '.join(['---'] * len(cols)) + ' |')
    for row in rows:
        print('| ' + ' | '.join([row.get(c, '') for c in cols]) + ' |')
"
```

### 4. Estadísticas rápidas (columnas numéricas)
```bash
python3 -c "
import csv

file = '${FILE}'
with open(file, 'r') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f'Filas: {len(rows)}')
print()

for col in rows[0].keys():
    vals = []
    for r in rows:
        try:
            vals.append(float(r[col]))
        except (ValueError, TypeError):
            pass
    if vals and len(vals) > len(rows) * 0.5:
        print(f'{col}: min={min(vals):.2f} max={max(vals):.2f} avg={sum(vals)/len(vals):.2f} count={len(vals)}')
"
```

## Output
Tabla markdown con el contenido. Para archivos grandes, muestra resumen + primeras N filas.
