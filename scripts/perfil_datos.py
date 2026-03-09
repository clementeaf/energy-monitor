"""
Perfil de datos — Extrae estadísticas descriptivas de las tablas principales
de energy-monitor (PostgreSQL RDS).

Uso:
    pip install psycopg2-binary pandas tabulate
    python scripts/perfil_datos.py

Requiere variables de entorno: DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
"""

import os
import sys

import pandas as pd
import psycopg2

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": os.environ.get("DB_PORT", "5432"),
    "dbname": os.environ.get("DB_NAME", "energy_monitor"),
    "user": os.environ.get("DB_USERNAME", "postgres"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "sslmode": "require",
}

QUERIES = {
    "buildings": "SELECT * FROM buildings",
    "meters": "SELECT * FROM meters",
    "readings_sample": """
        SELECT * FROM readings
        ORDER BY timestamp DESC
        LIMIT 10000
    """,
    "hierarchy_nodes": "SELECT * FROM hierarchy_nodes",
    "alerts": "SELECT * FROM alerts",
    "users": "SELECT id, provider, email, name, role_id, is_active FROM users",
    "roles": "SELECT * FROM roles",
    "role_permissions": """
        SELECT rp.role_id, r.name as role, m.code as module, a.code as action
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN modules m ON m.id = rp.module_id
        JOIN actions a ON a.id = rp.action_id
        ORDER BY rp.role_id, m.code, a.code
    """,
}

NUMERIC_COLS_READINGS = [
    "voltage_l1", "voltage_l2", "voltage_l3",
    "current_l1", "current_l2", "current_l3",
    "power_kw", "reactive_power_kvar", "power_factor", "frequency_hz",
    "energy_kwh_total",
    "thd_voltage_pct", "thd_current_pct", "phase_imbalance_pct",
]


def connect():
    try:
        return psycopg2.connect(**DB_CONFIG)
    except psycopg2.OperationalError as e:
        print(f"Error conectando a RDS: {e}")
        print("Asegúrate de tener las variables DB_HOST, DB_PASSWORD, etc.")
        sys.exit(1)


def profile_table(conn, name, query):
    df = pd.read_sql(query, conn)
    print(f"\n{'='*60}")
    print(f"  {name.upper()} — {len(df)} filas, {len(df.columns)} columnas")
    print(f"{'='*60}")

    print(f"\nColumnas: {', '.join(df.columns)}")
    print("\nTipos:")
    print(df.dtypes.to_string())

    print("\nNulls por columna:")
    nulls = df.isnull().sum()
    nulls_pct = (nulls / len(df) * 100).round(1)
    null_df = pd.DataFrame({"nulls": nulls, "pct": nulls_pct})
    print(null_df[null_df["nulls"] > 0].to_string() if null_df["nulls"].sum() > 0 else "  (sin nulls)")

    numeric = df.select_dtypes(include=["number"])
    if not numeric.empty:
        print("\nEstadísticas numéricas:")
        print(numeric.describe().round(3).to_string())

    if "timestamp" in df.columns:
        print(f"\nRango temporal: {df['timestamp'].min()} → {df['timestamp'].max()}")

    return df


def profile_readings(conn):
    df = pd.read_sql(QUERIES["readings_sample"], conn)
    print(f"\n{'='*60}")
    print(f"  READINGS (muestra 10K más recientes)")
    print(f"{'='*60}")

    total = pd.read_sql("SELECT COUNT(*) as n FROM readings", conn)["n"].iloc[0]
    print(f"\nTotal en DB: {total:,} filas")
    print(f"Muestra: {len(df)} filas")

    if "timestamp" in df.columns:
        print(f"Rango muestra: {df['timestamp'].min()} → {df['timestamp'].max()}")

    cols = [c for c in NUMERIC_COLS_READINGS if c in df.columns]
    if cols:
        print(f"\nEstadísticas ({len(cols)} campos eléctricos):")  # noqa: S3457
        print(df[cols].describe().round(3).to_string())

    nulls = df[cols].isnull().sum()
    nulls_pct = (nulls / len(df) * 100).round(1)
    null_info = pd.DataFrame({"nulls": nulls, "pct": nulls_pct})
    print("\nNulls en campos eléctricos:")
    print(null_info.to_string())

    if "meter_id" in df.columns:
        print("\nDistribución por medidor:")
        print(df["meter_id"].value_counts().sort_index().to_string())

    return df


def profile_meters_status(conn):
    query = """
        SELECT m.id, m.model, m.phase_type, m.status, m.last_reading_at,
               COUNT(r.id) as readings_count,
               MIN(r.timestamp) as first_reading,
               MAX(r.timestamp) as last_reading
        FROM meters m
        LEFT JOIN readings r ON r.meter_id = m.id
        GROUP BY m.id ORDER BY m.id
    """
    df = pd.read_sql(query, conn)
    print(f"\n{'='*60}")
    print(f"  METERS STATUS SUMMARY")
    print(f"{'='*60}")
    print(df.to_string(index=False))


def main():
    conn = connect()
    try:
        for name, query in QUERIES.items():
            if name == "readings_sample":
                profile_readings(conn)
            else:
                profile_table(conn, name, query)

        profile_meters_status(conn)
    finally:
        conn.close()

    print("\n" + "=" * 60)
    print("  PERFIL COMPLETO")
    print("=" * 60)


if __name__ == "__main__":
    main()
