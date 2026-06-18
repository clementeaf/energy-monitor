-- Cache raw PBF vector tiles for offline indoor map rendering.
-- MapLibre consumes these directly — no coordinate conversion needed.

CREATE TABLE IF NOT EXISTS mapvx_tiles (
  z SMALLINT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (z, x, y)
);

INSERT INTO schema_migrations (version)
VALUES ('52-mapvx-tiles')
ON CONFLICT (version) DO NOTHING;
