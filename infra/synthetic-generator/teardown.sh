#!/bin/bash
# Teardown: remove synthetic readings generator
# Run this when real MQTT pipeline is connected

set -e

echo "Removing EventBridge target..."
aws events remove-targets --rule synthetic-readings-every-1min --ids "1"

echo "Deleting EventBridge rule..."
aws events delete-rule --name synthetic-readings-every-1min

echo "Deleting Lambda function..."
aws lambda delete-function --function-name synthetic-readings-generator

echo "Done. Synthetic generator removed."
echo "Note: existing synthetic readings remain in the database."
