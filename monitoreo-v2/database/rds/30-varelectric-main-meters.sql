UPDATE meters m
SET metadata = m.metadata || '{"is_main_meter": true}'::jsonb, updated_at = NOW()
FROM buildings b
WHERE b.id = m.building_id
  AND (b.external_site_id, m.code) IN (
    ('altopena', 'VE-101'),
    ('altopena', 'VE-259'),
    ('quilicura', 'VE-QUILICURA-31')
  )
  AND NOT COALESCE((m.metadata->>'is_main_meter')::boolean, false);

INSERT INTO schema_migrations (version, description)
VALUES ('rds-30-varelectric-main-meters', 'Mark main meters (transformers) so consumption is not double counted')
ON CONFLICT (version) DO NOTHING;
