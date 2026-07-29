-- Migration 58: Create monitoreo_v3 database and var_electric table
-- Run step 1 (CREATE DATABASE) as superuser against postgres db,
-- then step 2 (CREATE TABLE) against monitoreo_v3.

-- Step 1: run against postgres (or any existing db)
-- CREATE DATABASE monitoreo_v3;

-- Step 2: run against monitoreo_v3
CREATE TABLE IF NOT EXISTS var_electric (
    idvar_electric   INTEGER PRIMARY KEY,
    estado           INTEGER NOT NULL,
    id_remarcador    INTEGER NOT NULL,
    fecha            TIMESTAMP NOT NULL,
    tag1  DOUBLE PRECISION,
    tag2  DOUBLE PRECISION,
    tag3  DOUBLE PRECISION,
    tag4  DOUBLE PRECISION,
    tag5  DOUBLE PRECISION,
    tag6  DOUBLE PRECISION,
    tag7  DOUBLE PRECISION,
    tag8  DOUBLE PRECISION,
    tag9  DOUBLE PRECISION,
    tag10 DOUBLE PRECISION,
    tag11 DOUBLE PRECISION,
    tag12 DOUBLE PRECISION,
    tag13 DOUBLE PRECISION,
    tag14 DOUBLE PRECISION,
    tag15 DOUBLE PRECISION,
    tag16 DOUBLE PRECISION,
    tag17 DOUBLE PRECISION,
    tag18 DOUBLE PRECISION,
    tag19 DOUBLE PRECISION,
    tag20 DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_var_electric_remarcador ON var_electric (id_remarcador);
CREATE INDEX IF NOT EXISTS idx_var_electric_fecha ON var_electric (fecha);
CREATE INDEX IF NOT EXISTS idx_var_electric_remarcador_fecha ON var_electric (id_remarcador, fecha);
