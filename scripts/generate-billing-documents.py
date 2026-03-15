#!/usr/bin/env python3
"""
Genera datos sintéticos de documentos de cobro (facturas) y pagos
a partir de meter_monthly_billing en pg-arauco.

Tabla creada: billing_document
- 1 documento por cada registro en meter_monthly_billing (agrupado por building+month)
- ~85% pagados, ~5% por vencer, ~10% vencidos (en rangos 1-30, 31-60, 61-90, 90+)

Uso: python3 scripts/generate-billing-documents.py
"""
import psycopg2
import random
from datetime import date, timedelta

random.seed(42)

CONN = dict(host='127.0.0.1', port=5434, dbname='arauco', user='postgres', password='arauco')
TODAY = date(2025, 12, 15)  # fecha de referencia (último mes con datos)

# --- Crear tabla ---
DDL = """
DROP TABLE IF EXISTS billing_document;
CREATE TABLE billing_document (
    id              SERIAL PRIMARY KEY,
    building_name   VARCHAR(100) NOT NULL,
    month           DATE NOT NULL,
    doc_number      VARCHAR(20) NOT NULL,
    doc_type        VARCHAR(20) NOT NULL DEFAULT 'factura',
    issue_date      DATE NOT NULL,
    due_date        DATE NOT NULL,
    total_neto_clp  NUMERIC(16,2),
    iva_clp         NUMERIC(16,2),
    total_clp       NUMERIC(16,2) NOT NULL,
    status          VARCHAR(20) NOT NULL,  -- pagado, por_vencer, vencido
    payment_date    DATE,
    payment_amount  NUMERIC(16,2),
    days_overdue    INT DEFAULT 0,
    meter_count     INT NOT NULL DEFAULT 1,
    UNIQUE(building_name, month)
);
CREATE INDEX idx_billing_doc_building ON billing_document(building_name);
CREATE INDEX idx_billing_doc_status ON billing_document(status);
CREATE INDEX idx_billing_doc_due ON billing_document(due_date);
"""

# --- Building codes para doc_number ---
BUILDING_CODES = {
    'Parque Arauco Kennedy': 'MG',
    'Arauco Estación': 'MM',
    'Arauco Premium Outlet Buenaventura': 'OT',
    'Arauco Express Ciudad Empresarial': 'SC52',
    'Arauco Express El Carmen de Huechuraba': 'SC53',
}


def generate_documents(cur):
    """Genera 1 documento por building+month desde meter_monthly_billing."""

    # Agregar billing por building+month
    cur.execute("""
        SELECT building_name, month,
               COUNT(*) AS meter_count,
               SUM(total_neto_clp) AS total_neto,
               SUM(iva_clp) AS iva,
               SUM(total_con_iva_clp) AS total
        FROM meter_monthly_billing
        GROUP BY building_name, month
        ORDER BY building_name, month
    """)
    rows = cur.fetchall()
    print(f"Registros billing agrupados: {len(rows)}")

    docs = []
    doc_seq = 10000

    for building_name, month, meter_count, total_neto, iva, total in rows:
        if total is None or float(total) == 0:
            continue

        code = BUILDING_CODES.get(building_name, 'XX')
        doc_seq += 1
        doc_number = f"FE-{code}-{doc_seq}"

        # Fecha emisión: día 5 del mes siguiente al periodo
        next_month = month.replace(day=28) + timedelta(days=4)
        issue_date = next_month.replace(day=5)

        # Fecha vencimiento: 30 días después de emisión
        due_date = issue_date + timedelta(days=30)

        # Determinar estado
        days_since_due = (TODAY - due_date).days

        if days_since_due < -30:
            # Mes futuro o muy lejano — pagado seguro (meses antiguos)
            status = 'pagado'
        elif days_since_due < 0:
            # Aún no vence
            # ~70% ya pagados anticipadamente, 30% por_vencer
            if random.random() < 0.70:
                status = 'pagado'
            else:
                status = 'por_vencer'
        else:
            # Ya venció
            if days_since_due <= 15:
                # Recién vencido — 60% pagado tarde, 40% vencido
                if random.random() < 0.60:
                    status = 'pagado'
                else:
                    status = 'vencido'
            elif days_since_due <= 45:
                # 30-45 días — 85% pagado, 15% vencido
                if random.random() < 0.85:
                    status = 'pagado'
                else:
                    status = 'vencido'
            else:
                # >45 días — 95% pagado, 5% vencido
                if random.random() < 0.95:
                    status = 'pagado'
                else:
                    status = 'vencido'

        # Generar datos de pago si pagado
        payment_date = None
        payment_amount = None
        days_overdue = 0

        if status == 'pagado':
            # Pago entre 5 días antes y 20 días después del vencimiento
            pay_offset = random.randint(-5, 20)
            payment_date = due_date + timedelta(days=pay_offset)
            if payment_date > TODAY:
                payment_date = TODAY - timedelta(days=random.randint(1, 5))
            payment_amount = float(total)
        elif status == 'vencido':
            days_overdue = max(1, days_since_due)

        docs.append((
            building_name, month, doc_number, 'factura',
            issue_date, due_date,
            float(total_neto) if total_neto else None,
            float(iva) if iva else None,
            float(total),
            status, payment_date, payment_amount, days_overdue, meter_count
        ))

    return docs


def main():
    conn = psycopg2.connect(**CONN)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Crear tabla
        cur.execute(DDL)
        print("Tabla billing_document creada")

        # Generar documentos
        docs = generate_documents(cur)

        # Insertar
        cur.executemany("""
            INSERT INTO billing_document
                (building_name, month, doc_number, doc_type,
                 issue_date, due_date, total_neto_clp, iva_clp, total_clp,
                 status, payment_date, payment_amount, days_overdue, meter_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, docs)

        conn.commit()
        print(f"Insertados: {len(docs)} documentos")

        # Resumen
        cur.execute("""
            SELECT status, COUNT(*), SUM(total_clp)::bigint
            FROM billing_document
            GROUP BY status ORDER BY status
        """)
        print("\n--- Resumen por estado ---")
        for status, count, total in cur.fetchall():
            print(f"  {status:12s}: {count:3d} docs, ${total:>15,} CLP")

        cur.execute("""
            SELECT
                CASE
                    WHEN days_overdue BETWEEN 1 AND 30 THEN '1-30 días'
                    WHEN days_overdue BETWEEN 31 AND 60 THEN '31-60 días'
                    WHEN days_overdue BETWEEN 61 AND 90 THEN '61-90 días'
                    WHEN days_overdue > 90 THEN '90+ días'
                END AS rango,
                COUNT(*), SUM(total_clp)::bigint
            FROM billing_document
            WHERE status = 'vencido'
            GROUP BY 1 ORDER BY 1
        """)
        print("\n--- Vencidos por rango ---")
        for rango, count, total in cur.fetchall():
            print(f"  {rango:12s}: {count:3d} docs, ${total:>15,} CLP")

        cur.execute("""
            SELECT building_name, status, COUNT(*), SUM(total_clp)::bigint
            FROM billing_document
            GROUP BY building_name, status
            ORDER BY building_name, status
        """)
        print("\n--- Por edificio y estado ---")
        for bld, status, count, total in cur.fetchall():
            print(f"  {bld:45s} {status:12s}: {count:3d} docs, ${total:>15,} CLP")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    main()
