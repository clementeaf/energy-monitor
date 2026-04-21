#!/usr/bin/env bash
# Migrate remaining MG readings from energy_monitor → monitoreo_v2
# Strategy: COPY pipe per meter (35K rows each) — proven to work
# Single docker exec per meter, no verification count (saves overhead)
set -uo pipefail

CONTAINER="pg-arauco"
SRC_DB="energy_monitor"
DST_DB="monitoreo_v2"

echo "=== MG Readings Migration ==="
echo "Started: $(date)"

# Build mapping: external_id|v2_meter_id|tenant_id
MAPPING=$(docker exec "$CONTAINER" psql -U postgres -d "$DST_DB" -t -A -F'|' -c "
  SELECT m.external_id, m.id, m.tenant_id
  FROM meters m
  WHERE m.external_id LIKE 'MG%'
    AND NOT EXISTS (SELECT 1 FROM readings r WHERE r.meter_id = m.id LIMIT 1)
  ORDER BY m.external_id;
")

if [ -z "$MAPPING" ]; then
  echo "Nothing to migrate."
  exit 0
fi

TOTAL=$(echo "$MAPPING" | wc -l | tr -d ' ')
echo "Pending meters: $TOTAL"
echo ""

CURRENT=0
for LINE in $MAPPING; do
  CURRENT=$((CURRENT + 1))
  EXT_ID=$(echo "$LINE" | cut -d'|' -f1)
  V2_ID=$(echo "$LINE" | cut -d'|' -f2)
  TENANT=$(echo "$LINE" | cut -d'|' -f3)

  # Single docker exec: COPY out from v1 | COPY into v2
  docker exec "$CONTAINER" bash -c "
    psql -U postgres -d $SRC_DB -c \"
      COPY (
        SELECT
          '$TENANT'::uuid,
          '$V2_ID'::uuid,
          timestamp,
          voltage_l1, voltage_l2, voltage_l3,
          current_l1, current_l2, current_l3,
          power_kw, reactive_power_kvar, power_factor,
          frequency_hz, energy_kwh_total
        FROM meter_readings
        WHERE meter_id = '$EXT_ID'
      ) TO STDOUT WITH CSV
    \" | psql -U postgres -d $DST_DB -c \"
      COPY readings(
        tenant_id, meter_id, timestamp,
        voltage_l1, voltage_l2, voltage_l3,
        current_l1, current_l2, current_l3,
        power_kw, reactive_power_kvar, power_factor,
        frequency_hz, energy_kwh_total
      ) FROM STDIN WITH CSV
    \"
  " 2>&1 | tail -1

  echo "[$CURRENT/$TOTAL] $EXT_ID done"
done

echo ""
echo "=== Migration Complete ==="
echo "Finished: $(date)"

# Final verification
echo "=== Verification ==="
docker exec "$CONTAINER" psql -U postgres -d "$DST_DB" -c "
  SELECT left(m.external_id, 2) as prefix,
         count(DISTINCT m.external_id) as meters,
         count(r.id) as readings
  FROM meters m
  LEFT JOIN readings r ON r.meter_id = m.id
  GROUP BY 1 ORDER BY 1;
"
