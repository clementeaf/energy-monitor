#!/usr/bin/env python3
"""
Convierte un dump MySQL de Varelectric (`var_electric`) a CSV gzip para cargar
via aws_s3.table_import_from_s3.

Equivalente en streaming de convert-varelectric-dump.mjs, que carga el archivo
entero en memoria y por eso no sirve arriba de ~500MB (limite de string de Node).
Ademas soporta varios remarcadores por dump, que el .mjs no.

Uso:
  ./convert-varelectric-dump.py <dump.sql> <mapa.json> <salida.csv.gz>

mapa.json: {"<id_remarcador>": "<meter_uuid>", ...}. Los remarcadores que no
esten en el mapa se descartan (asi se excluyen los medidores defectuosos).

El CSV NO deriva la potencia ni convierte la zona horaria: ambas cosas las hace
Postgres al pasar de la staging a `readings`, con la hora local tal cual sale
del dump. Ver docs en la migracion 57.

Columnas del CSV, en orden:
  tenant_id, meter_id, ts, voltage_l1..l3, current_l1..l3,
  power_kw, power_factor, energy_kwh_total
"""
import gzip
import json
import re
import sys
from collections import Counter

TUPLA = re.compile(r"\((\d+),(\d+),(\d+),'([^']+)',([^)]*)\)")

# indice 0-based dentro de los 20 tags. Confirmado contra la tabla `tags` del
# dump y el orden de columnas de `export_excel`.
V1, V2, V3 = 0, 1, 2
C1, C2, C3 = 3, 4, 5
POWER, FP, ENERGY = 8, 11, 13

# readings define power_kw y energy_kwh_total NOT NULL
REQUERIDOS = (POWER, ENERGY)


def plausible_v(v):
    """Fase-neutro (~230) o entre fases (~400). Fuera de eso no es un voltaje."""
    return 180 <= v <= 260 or 340 <= v <= 440


def convertir(dump, mapa, tenant, salida):
    st = Counter()
    with open(dump, encoding='utf8', errors='replace') as fh, \
         gzip.open(salida, 'wt', compresslevel=6) as out:
        for line in fh:
            if not line.startswith('INSERT INTO `var_electric`'):
                continue
            for m in TUPLA.finditer(line):
                st['total'] += 1
                meter = mapa.get(m.group(3))
                if meter is None:
                    st['medidor_excluido'] += 1
                    continue

                raw = m.group(5).split(',')
                v = [None if x.strip() == 'NULL' else float(x) for x in raw]

                if any(v[i] is None for i in REQUERIDOS):
                    st['sin_not_null'] += 1
                    continue

                # voltajes fuera de rango fisico -> NULL (la columna lo permite)
                for i in (V1, V2, V3):
                    if v[i] is not None and not plausible_v(v[i]):
                        v[i] = None
                        st['voltaje_nulo'] += 1

                # power_factor es numeric(5,3): un valor como -27365 no entra en
                # la columna y ademas no es un factor de potencia valido.
                if v[FP] is not None and not (-1 <= v[FP] <= 1):
                    v[FP] = None
                    st['fp_nulo'] += 1

                campos = [v[V1], v[V2], v[V3], v[C1], v[C2], v[C3],
                          v[POWER], v[FP], v[ENERGY]]
                cols = ','.join('' if x is None else repr(x) for x in campos)
                out.write(f"{tenant},{meter},{m.group(4)},{cols}\n")
                st['escritas'] += 1

                if st['escritas'] % 1_000_000 == 0:
                    print(f"  {st['escritas']:,} filas...", file=sys.stderr)
    return st


if __name__ == '__main__':
    dump, mapa_path, salida = sys.argv[1:4]
    cfg = json.load(open(mapa_path))
    tenant = cfg.pop('_tenant')
    st = convertir(dump, cfg, tenant, salida)
    for k, n in st.most_common():
        print(f"{k:>18}: {n:,}", file=sys.stderr)
