#!/usr/bin/env python3
"""Split large INSERT VALUES statements into batches of N tuples.
Reads from stdin, writes to stdout.
Usage: cat dump.sql | python3 split-large-inserts.py > split.sql
"""
import sys, re

BATCH = 200

for line in sys.stdin:
    if not line.startswith('INSERT INTO') or len(line) < 50000:
        sys.stdout.write(line)
        continue
    # Extract: INSERT INTO tablename VALUES (...),...,(...);
    m = re.match(r'(INSERT INTO \S+ VALUES )', line)
    if not m:
        sys.stdout.write(line)
        continue
    prefix = m.group(1)
    rest = line[len(prefix):].rstrip().rstrip(';')
    # Split tuples by ),(
    tuples = re.split(r'\),\(', rest)
    # Re-add parens stripped by split
    for i in range(len(tuples)):
        if i > 0:
            tuples[i] = '(' + tuples[i]
        if i < len(tuples) - 1:
            tuples[i] = tuples[i] + ')'
    for i in range(0, len(tuples), BATCH):
        batch = tuples[i:i+BATCH]
        sys.stdout.write(prefix + ','.join(batch) + ';\n')
