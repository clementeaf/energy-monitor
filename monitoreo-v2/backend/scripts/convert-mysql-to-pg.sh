#!/bin/bash
# Convert a MySQL dump to PostgreSQL-compatible SQL.
# Usage: ./convert-mysql-to-pg.sh input.sql > output.sql
set -euo pipefail

INPUT="${1:?Usage: convert-mysql-to-pg.sh <input.sql>}"

sed \
  -e 's/`//g' \
  -e '/^CREATE DATABASE/d' \
  -e '/^USE /d' \
  -e '/^\/\*!/d' \
  -e '/^LOCK TABLES/d' \
  -e '/^UNLOCK TABLES/d' \
  -e 's/ int NOT NULL AUTO_INCREMENT/ SERIAL/g' \
  -e 's/ int unsigned NOT NULL AUTO_INCREMENT/ SERIAL/g' \
  -e 's/ int unsigned/ INTEGER/g' \
  -e 's/ int NOT NULL/ INTEGER NOT NULL/g' \
  -e 's/ int DEFAULT/ INTEGER DEFAULT/g' \
  -e 's/ tinyint(1)/ SMALLINT/g' \
  -e 's/ double([0-9]*,[0-9]*)/ DOUBLE PRECISION/g' \
  -e 's/ double/ DOUBLE PRECISION/g' \
  -e 's/ float unsigned/ REAL/g' \
  -e 's/ float/ REAL/g' \
  -e 's/ datetime/ TIMESTAMP/g' \
  -e 's/ ENGINE=InnoDB[^;]*;/;/g' \
  -e 's/ DEFAULT CHARSET=[^ ;]*//g' \
  -e 's/ ROW_FORMAT=[^ ;]*//g' \
  -e 's/ AUTO_INCREMENT=[0-9]*//g' \
  -e '/^  KEY /d' \
  -e 's/\r$//' \
  "$INPUT" | \
  perl -0777 -pe 's/,\s*\n(\);)/\n$1/g'
