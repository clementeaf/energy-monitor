-- MapVX indoor map cache — zero runtime dependency on external API.
-- Tables: malls, floors, stores, geometries (GeoJSON per floor+layer).

CREATE TABLE IF NOT EXISTS mapvx_malls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   VARCHAR(50)    NOT NULL UNIQUE,
  name          VARCHAR(255)   NOT NULL,
  center_lat    DECIMAL(10,7)  NOT NULL,
  center_lng    DECIMAL(10,7)  NOT NULL,
  polygon_coords JSONB         NULL,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mapvx_floors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mall_id       UUID           NOT NULL REFERENCES mapvx_malls(id) ON DELETE CASCADE,
  external_key  VARCHAR(50)    NOT NULL,
  label         VARCHAR(50)    NOT NULL,
  level         DECIMAL(3,1)   NOT NULL,
  is_default    BOOLEAN        NOT NULL DEFAULT false,
  sort_order    SMALLINT       NOT NULL DEFAULT 0,
  UNIQUE(mall_id, external_key)
);

CREATE TABLE IF NOT EXISTS mapvx_stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mall_id       UUID           NOT NULL REFERENCES mapvx_malls(id) ON DELETE CASCADE,
  external_id   VARCHAR(50)    NOT NULL,
  title         VARCHAR(255)   NOT NULL,
  lat           DECIMAL(10,7)  NOT NULL,
  lng           DECIMAL(10,7)  NOT NULL,
  floor_key     VARCHAR(50)    NOT NULL,
  category      VARCHAR(100)   NOT NULL DEFAULT '',
  UNIQUE(mall_id, external_id)
);

CREATE TABLE IF NOT EXISTS mapvx_geometries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mall_id       UUID           NOT NULL REFERENCES mapvx_malls(id) ON DELETE CASCADE,
  floor_key     VARCHAR(50)    NOT NULL,
  layer         VARCHAR(20)    NOT NULL,
  geojson       JSONB          NOT NULL,
  UNIQUE(mall_id, floor_key, layer)
);

CREATE INDEX IF NOT EXISTS idx_mapvx_floors_mall ON mapvx_floors(mall_id);
CREATE INDEX IF NOT EXISTS idx_mapvx_stores_mall ON mapvx_stores(mall_id);
CREATE INDEX IF NOT EXISTS idx_mapvx_geometries_lookup ON mapvx_geometries(mall_id, floor_key, layer);

INSERT INTO schema_migrations (version)
VALUES ('51-mapvx-cache')
ON CONFLICT (version) DO NOTHING;
