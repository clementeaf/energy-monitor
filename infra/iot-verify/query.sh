#!/bin/bash
# ─────────────────────────────────────────────────────────
# Consultar datos IoT Siemens POC3000
#
# Uso:
#   ./query.sh                     → últimos 10 mensajes
#   ./query.sh last 20             → últimos 20 mensajes
#   ./query.sh date 2026-03-25     → mensajes de una fecha
#   ./query.sh today               → mensajes de hoy
#   ./query.sh content 5           → últimos 5 con contenido
#   ./query.sh download 2026-03-25 → descargar día completo a ./downloads/
# ─────────────────────────────────────────────────────────

BUCKET="energy-monitor-ingest-058310292956"
PREFIX="raw/iot/powercenter"
CMD=${1:-last}
ARG=${2:-10}
TODAY=$(date +%Y-%m-%d)

case "$CMD" in

  last)
    echo "▶ Últimos $ARG mensajes recibidos"
    echo "─────────────────────────────────────"
    aws s3 ls s3://$BUCKET/$PREFIX/ --recursive | sort -k1,2 | tail -$ARG
    ;;

  today)
    echo "▶ Mensajes de hoy ($TODAY)"
    echo "─────────────────────────────────────"
    FILES=$(aws s3 ls s3://$BUCKET/$PREFIX/ --recursive | grep "$TODAY")
    COUNT=$(echo "$FILES" | grep -c "\.json$" 2>/dev/null || echo "0")
    echo "  Total: $COUNT archivos"
    echo ""
    echo "$FILES" | tail -20
    ;;

  date)
    echo "▶ Mensajes del $ARG"
    echo "─────────────────────────────────────"
    FILES=$(aws s3 ls s3://$BUCKET/$PREFIX/ --recursive | grep "$ARG")
    COUNT=$(echo "$FILES" | grep -c "\.json$" 2>/dev/null || echo "0")
    echo "  Total: $COUNT archivos"
    echo ""
    echo "$FILES"
    ;;

  content)
    echo "▶ Contenido de últimos $ARG mensajes"
    echo "─────────────────────────────────────"
    KEYS=$(aws s3 ls s3://$BUCKET/$PREFIX/ --recursive | sort -k1,2 | tail -$ARG | awk '{print $4}')
    for KEY in $KEYS; do
      FNAME=$(basename "$KEY")
      echo ""
      echo "── $FNAME"
      aws s3 cp "s3://$BUCKET/$KEY" - 2>/dev/null | python3 -m json.tool 2>/dev/null | sed 's/^/  /'
    done
    ;;

  download)
    DIR="./downloads/$ARG"
    mkdir -p "$DIR"
    echo "▶ Descargando datos del $ARG a $DIR/"
    echo "─────────────────────────────────────"
    aws s3 cp s3://$BUCKET/$PREFIX/ "$DIR/" --recursive --exclude "*" --include "*$ARG*"
    COUNT=$(find "$DIR" -name "*.json" | wc -l | tr -d ' ')
    echo ""
    echo "  Descargados: $COUNT archivos en $DIR/"
    ;;

  *)
    echo "Uso:"
    echo "  ./query.sh                     → últimos 10 mensajes"
    echo "  ./query.sh last 20             → últimos 20 mensajes"
    echo "  ./query.sh date 2026-03-25     → mensajes de una fecha"
    echo "  ./query.sh today               → mensajes de hoy"
    echo "  ./query.sh content 5           → últimos 5 con contenido"
    echo "  ./query.sh download 2026-03-25 → descargar día completo"
    ;;

esac
