#!/bin/bash
# Lista única de store_type + store_name desde CSV local (excluye "Local no sensado")
FILE="/Users/clementefalcone/Desktop/hoktus/energy-monitor/MALL_GRANDE_446_completo.csv"

iconv -f latin1 -t utf-8 "$FILE" \
  | cut -d';' -f2,5,6 \
  | sort -u \
  | grep -v "Local no sensado" \
  | grep -v "store_type" \
  | column -t -s';'
