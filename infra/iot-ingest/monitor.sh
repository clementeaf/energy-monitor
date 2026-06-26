#!/bin/bash
# Monitor IoT ingest pipeline — quick status check
set -e

echo "=== IoT Ingest Monitor ==="
echo "$(date)"
echo ""

# 1. S3 — recent files
echo "▶ S3 (últimos archivos)"
aws s3 ls s3://energy-monitor-iot-ingest/raw/iot/powercenter/data/ --recursive | tail -5
S3_COUNT=$(aws s3 ls s3://energy-monitor-iot-ingest/raw/iot/powercenter/data/ --recursive | wc -l | tr -d ' ')
echo "  Total archivos: $S3_COUNT"
echo ""

# 2. Lambda — last invocation
echo "▶ Lambda (última ejecución)"
STREAM=$(aws logs describe-log-streams \
  --log-group-name /aws/lambda/iot-ingest-prod-ingest \
  --order-by LastEventTime --descending --max-items 1 \
  --query 'logStreams[0].logStreamName' --output text 2>/dev/null)

if [ "$STREAM" != "None" ] && [ -n "$STREAM" ]; then
  aws logs get-log-events \
    --log-group-name /aws/lambda/iot-ingest-prod-ingest \
    --log-stream-name "$STREAM" \
    --limit 5 \
    --query 'events[].message' --output text 2>/dev/null | grep -v "^$" | tail -5
fi
echo ""

# 3. DB — row count (via Lambda invoke)
echo "▶ Lambda invoke (status check)"
RESPONSE=$(aws lambda invoke --function-name iot-ingest-prod-ingest /tmp/iot-monitor-response.json --output text --query 'StatusCode' 2>/dev/null)
echo "  Status: $RESPONSE"
cat /tmp/iot-monitor-response.json | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'  {l}') for l in d.get('body',[])]" 2>/dev/null
echo ""
echo "=== Fin ==="
