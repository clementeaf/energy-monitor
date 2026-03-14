#!/bin/bash
# Lista única de store_type + store_name desde Mall Grande CSV
BUCKET="energy-monitor-ingest-058310292956"
FILE="MALL_GRANDE_446_completo.csv"

echo "=== store_type ; store_name — Parque Arauco Kennedy ==="
aws s3 cp "s3://$BUCKET/raw/$FILE" - 2>/dev/null \
  | cut -d';' -f5,6 \
  | sort -u \
  | column -t -s';'
