#!/bin/bash
# ─────────────────────────────────────────────────────────
# Verificación de datos IoT Core — Siemens
# Uso: ./verify.sh [fecha]
# Ejemplo: ./verify.sh 2026-03-25
# Sin argumento usa la fecha de hoy
# ─────────────────────────────────────────────────────────

BUCKET="energy-monitor-ingest-058310292956"
PREFIX="raw/iot"
DATE=${1:-$(date +%Y-%m-%d)}
ENDPOINT="a3ledoeiifsfil-ats.iot.us-east-1.amazonaws.com"

echo "╔══════════════════════════════════════════════════════╗"
echo "║       Verificación IoT Core — Siemens               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Estado IoT Core ──────────────────────────────────
echo "▶ 1. Estado del Thing y Certificado"
echo "─────────────────────────────────────"

THING=$(aws iot describe-thing --thing-name "siemens-poc3000" --output json 2>&1)
if echo "$THING" | grep -q "thingName"; then
  echo "  ✔ Thing: siemens-poc3000 (activo)"
else
  echo "  ✘ Thing no encontrado"
fi

CERT_ID="1d6bc578ac555802179891d8440d7681c7db1c8377c744ad317725c51c3b797b"
CERT_STATUS=$(aws iot describe-certificate --certificate-id "$CERT_ID" --query 'certificateDescription.status' --output text 2>&1)
echo "  Certificado: $CERT_STATUS"

RULE1=$(aws iot get-topic-rule --rule-name "meters_to_s3" --query 'rule.ruleDisabled' --output text 2>&1)
RULE2=$(aws iot get-topic-rule --rule-name "powercenter_to_s3" --query 'rule.ruleDisabled' --output text 2>&1)
[ "$RULE1" = "False" ] && echo "  ✔ Regla meters_to_s3: activa" || echo "  ✘ Regla meters_to_s3: inactiva"
[ "$RULE2" = "False" ] && echo "  ✔ Regla powercenter_to_s3: activa" || echo "  ✘ Regla powercenter_to_s3: inactiva"

echo ""
echo "  Endpoint MQTT: $ENDPOINT"
echo "  Puerto: 8883"
echo "  Topics permitidos: meters/# , powercenter/#"
echo ""

# ── 2. Archivos en S3 ───────────────────────────────────
echo "▶ 2. Archivos recibidos en S3"
echo "─────────────────────────────────────"

ALL_FILES=$(aws s3 ls "s3://$BUCKET/$PREFIX/" --recursive 2>&1)
TOTAL=$(echo "$ALL_FILES" | grep -c "\.json$" 2>/dev/null || echo "0")
echo "  Total histórico: $TOTAL archivos"

echo ""
echo "  Fecha consultada: $DATE"
DAY_FILES=$(echo "$ALL_FILES" | grep "$DATE" || true)
DAY_COUNT=$(echo "$DAY_FILES" | grep -c "\.json$" 2>/dev/null || echo "0")
echo "  Archivos del día: $DAY_COUNT"

if [ "$DAY_COUNT" -gt 0 ] 2>/dev/null; then
  DAY_SIZE=$(echo "$DAY_FILES" | awk '{sum+=$3} END {printf "%.2f KB", sum/1024}')
  echo "  Tamaño total: $DAY_SIZE"
fi

echo ""

# ── 3. Topics recibidos ─────────────────────────────────
echo "▶ 3. Topics MQTT detectados"
echo "─────────────────────────────────────"

# powercenter/data
PC_COUNT=$(echo "$ALL_FILES" | grep "powercenter/data" | grep -c "\.json$" 2>/dev/null || echo "0")
echo "  powercenter/data → $PC_COUNT mensajes"

# meters/*
M_COUNT=$(echo "$ALL_FILES" | grep "meters/" | grep -c "\.json$" 2>/dev/null || echo "0")
echo "  meters/* → $M_COUNT mensajes"

echo ""

# ── 4. Últimos mensajes ─────────────────────────────────
echo "▶ 4. Últimos 5 mensajes recibidos"
echo "─────────────────────────────────────"

LATEST=$(echo "$ALL_FILES" | sort -k1,2 | tail -5 | awk '{print $4}')

if [ -z "$LATEST" ]; then
  echo "  (sin mensajes)"
else
  for KEY in $LATEST; do
    FNAME=$(basename "$KEY")
    TIMESTAMP=$(echo "$ALL_FILES" | grep "$FNAME" | awk '{print $1, $2}')
    echo ""
    echo "  ── $FNAME ($TIMESTAMP)"
    aws s3 cp "s3://$BUCKET/$KEY" - 2>/dev/null | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    if 'item_name' in d:
        print(f\"  Device: {d['item_name']}\")
        print(f\"  Timestamp: {d['timestamp']}\")
        print(f\"  Variables: {d.get('count', '?')}\")
    else:
        print(json.dumps(d, indent=2)[:300])
except:
    print('  (no se pudo parsear)')
" 2>/dev/null | sed 's/^/  /'
  done
fi

echo ""

# ── 5. Conexiones recientes ──────────────────────────────
echo "▶ 5. Actividad reciente (últimas 2h)"
echo "─────────────────────────────────────"

RECENT=$(aws logs filter-log-events \
  --log-group-name "AWSIotLogsV2" \
  --start-time $(( $(date +%s) * 1000 - 7200000 )) \
  --max-items 20 \
  --query 'events[*].message' \
  --output text 2>&1)

if echo "$RECENT" | grep -qi "does not exist\|ResourceNotFoundException"; then
  echo "  (logs de IoT no disponibles)"
elif [ -z "$RECENT" ] || [ "$RECENT" = "None" ]; then
  echo "  Sin actividad en las últimas 2h"
else
  # Count events
  CONNECTS=$(echo "$RECENT" | grep -o '"eventType":"Connect"' | wc -l | tr -d ' ')
  PUBLISHES=$(echo "$RECENT" | grep -o '"eventType":"Publish-In"' | wc -l | tr -d ' ')
  DISCONNECTS=$(echo "$RECENT" | grep -o '"eventType":"Disconnect"' | wc -l | tr -d ' ')
  ERRORS=$(echo "$RECENT" | grep -o '"logLevel":"ERROR"' | wc -l | tr -d ' ')

  echo "  Conexiones: $CONNECTS"
  echo "  Publicaciones: $PUBLISHES"
  echo "  Desconexiones: $DISCONNECTS"
  echo "  Errores: $ERRORS"

  # Show last error if any
  if [ "$ERRORS" -gt 0 ] 2>/dev/null; then
    echo ""
    LAST_ERR=$(echo "$RECENT" | tr '\t' '\n' | grep '"ERROR"' | tail -1 | python3 -c "
import json, sys
try:
    d = json.loads(sys.stdin.read().strip())
    print(f\"  Último error: {d.get('reason','?')} — {d.get('details','?')}\")
except:
    print('  (no se pudo parsear error)')
" 2>/dev/null)
    echo "$LAST_ERR"
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Verificación completada: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════"
