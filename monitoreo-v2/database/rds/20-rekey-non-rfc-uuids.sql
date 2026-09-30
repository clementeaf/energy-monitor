SET session_replication_role = replica;

DO $$
DECLARE
  rekeyed_table text;
  reference record;
BEGIN
  FOREACH rekeyed_table IN ARRAY ARRAY['roles', 'buildings', 'meters'] LOOP
    EXECUTE format(
      'CREATE TEMP TABLE rekey_%1$s ON COMMIT DROP AS
         SELECT id AS old_id, gen_random_uuid() AS new_id FROM %1$I
         WHERE id::text !~ %2$L',
      rekeyed_table,
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    );
    EXECUTE format(
      'UPDATE %1$I t SET id = r.new_id FROM rekey_%1$s r WHERE t.id = r.old_id',
      rekeyed_table
    );
    FOR reference IN
      SELECT referencing.relname AS table_name, attribute.attname AS column_name
      FROM pg_constraint fk
      JOIN pg_class referencing ON referencing.oid = fk.conrelid
      JOIN pg_attribute attribute ON attribute.attrelid = fk.conrelid AND attribute.attnum = ANY (fk.conkey)
      WHERE fk.contype = 'f' AND fk.confrelid = rekeyed_table::regclass
    LOOP
      EXECUTE format(
        'UPDATE %1$I t SET %2$I = r.new_id FROM rekey_%3$s r WHERE t.%2$I = r.old_id',
        reference.table_name, reference.column_name, rekeyed_table
      );
    END LOOP;
  END LOOP;
END $$;

SET session_replication_role = origin;

INSERT INTO schema_migrations (version, description)
VALUES ('rds-20-rekey-non-rfc-uuids', 'Seeded roles/buildings/meters get RFC 4122 ids so DTO/ParseUUIDPipe validation accepts them')
ON CONFLICT (version) DO NOTHING;
