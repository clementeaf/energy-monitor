CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION time_bucket(bucket_width interval, ts timestamp)
RETURNS timestamp LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE AS $$
BEGIN
  IF bucket_width = INTERVAL '1 month' THEN
    RETURN date_trunc('month', ts);
  END IF;
  IF extract(month FROM bucket_width) <> 0 OR extract(year FROM bucket_width) <> 0 THEN
    RAISE EXCEPTION 'time_bucket compat: unsupported width %', bucket_width;
  END IF;
  RETURN date_bin(bucket_width, ts, TIMESTAMP '2000-01-03 00:00:00');
END $$;

CREATE OR REPLACE FUNCTION time_bucket(bucket_width interval, ts timestamptz)
RETURNS timestamptz LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT time_bucket(bucket_width, ts AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
$$;

CREATE OR REPLACE FUNCTION time_bucket(bucket_width interval, ts timestamptz, timezone text)
RETURNS timestamptz LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT time_bucket(bucket_width, ts AT TIME ZONE timezone) AT TIME ZONE timezone
$$;

CREATE OR REPLACE FUNCTION time_bucket(bucket_width interval, ts date)
RETURNS date LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT time_bucket(bucket_width, ts::timestamp)::date
$$;

CREATE OR REPLACE FUNCTION create_hypertable(relation regclass, time_column_name name, if_not_exists boolean DEFAULT false)
RETURNS void LANGUAGE sql AS $$ SELECT $$;

CREATE OR REPLACE FUNCTION add_compression_policy(relation regclass, compress_after interval)
RETURNS void LANGUAGE sql AS $$ SELECT $$;

CREATE OR REPLACE FUNCTION add_retention_policy(relation regclass, drop_after interval)
RETURNS void LANGUAGE sql AS $$ SELECT $$;

CREATE OR REPLACE FUNCTION remove_retention_policy(relation regclass, if_exists boolean DEFAULT false)
RETURNS void LANGUAGE sql AS $$ SELECT $$;

CREATE OR REPLACE FUNCTION add_continuous_aggregate_policy(continuous_aggregate regclass, start_offset interval, end_offset interval, schedule_interval interval)
RETURNS void LANGUAGE sql AS $$ SELECT $$;

CREATE OR REPLACE FUNCTION remove_continuous_aggregate_policy(continuous_aggregate regclass, if_exists boolean DEFAULT false)
RETURNS void LANGUAGE sql AS $$ SELECT $$;
