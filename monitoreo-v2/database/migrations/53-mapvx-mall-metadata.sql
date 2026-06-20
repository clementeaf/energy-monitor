-- Migration 53: Add metadata columns to mapvx_malls for marker-only malls
ALTER TABLE mapvx_malls
  ADD COLUMN IF NOT EXISTS has_indoor  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS size_text   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS image_url   TEXT;
