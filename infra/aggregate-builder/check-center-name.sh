#!/bin/bash
# List distinct center_name values in Mall Grande CSV
BUCKET="energy-monitor-ingest-058310292956"
echo "=== Distinct center_name in MALL_GRANDE_446_completo.csv ==="
aws s3 cp "s3://$BUCKET/raw/MALL_GRANDE_446_completo.csv" - 2>/dev/null | cut -d';' -f3 | sort -u
