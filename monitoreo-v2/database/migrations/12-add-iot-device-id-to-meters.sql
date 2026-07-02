-- Add iot_device_id column to meters for IoT Core device mapping.
-- Nullable: most meters are not IoT. Unique: one physical device per meter.
ALTER TABLE meters ADD COLUMN IF NOT EXISTS iot_device_id VARCHAR(255) UNIQUE;
