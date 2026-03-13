#!/bin/bash
export AWS_REGION=us-east-1
export DB_HOST=127.0.0.1
export DB_PORT=5433
export BATCH_SIZE=2500

export TRUNCATE_BEFORE_LOAD=true
export S3_KEY="raw/OUTLET_70_anual.csv"
echo "Importing OUTLET_70_anual.csv..."
npm --prefix infra/drive-import-staging run start

export TRUNCATE_BEFORE_LOAD=false
for file in SC52_StripCenter_anual.csv SC53_StripCenter_anual.csv MALL_MEDIANO_254_completo.csv MALL_GRANDE_446_completo.csv; do
  export S3_KEY="raw/$file"
  echo "Importing $file..."
  npm --prefix infra/drive-import-staging run start
done
