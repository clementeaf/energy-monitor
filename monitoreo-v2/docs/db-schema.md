# Database Schema

TimescaleDB (PostgreSQL 16). 30 tables.

## Core Tables

### tenants
Multi-tenant root. Each tenant is an isolated organization.
```
id (UUID PK), name, slug (unique), logo_url, favicon_url, app_title,
primary_color, secondary_color, sidebar_color, accent_color,
settings (JSONB), is_active, created_at, updated_at
```

### users
```
id (UUID PK), tenant_id (FK tenants), email (unique per tenant),
display_name, auth_provider ('microsoft'|'google'), auth_provider_id,
role_id (FK roles), is_active, mfa_secret, mfa_enabled,
last_login_at, created_at, updated_at
```

### roles
Per-tenant role definitions.
```
id (UUID PK), tenant_id (FK tenants), name, slug (unique per tenant),
description, max_session_minutes, is_default, is_active, created_at, updated_at
```

### permissions
Global catalog (not per-tenant).
```
id (UUID PK), module, action, description
UNIQUE (module, action)
```

### role_permissions
```
role_id (FK roles), permission_id (FK permissions), access_level
PK (role_id, permission_id)
```

### user_building_access
```
user_id (FK users), building_id (FK buildings)
PK (user_id, building_id)
```

## Platform Tables

### buildings
```
id (UUID PK), tenant_id (FK tenants), name, address, area_sqm,
latitude, longitude, timezone, is_active, created_at, updated_at
```

### meters
```
id (UUID PK), tenant_id, building_id (FK buildings), name, serial_number,
meter_type, is_three_phase, is_active, created_at, updated_at
```

### concentrators
```
id (UUID PK), tenant_id, building_id, name, model, ip_address,
port, protocol, is_active, created_at, updated_at
```

### concentrator_meters
```
concentrator_id (FK), meter_id (FK), modbus_address
PK (concentrator_id, meter_id)
```

### readings (hypertable)
Time-series data. Partitioned by time, compressed after 7 days, retained 3 years.
```
tenant_id, meter_id (FK meters), timestamp (TIMESTAMPTZ),
voltage_avg, current_avg, power_kw, energy_kwh, power_factor,
frequency, thd_v, thd_i, demand_kw, reactive_power_kvar
```
Continuous aggregates: `readings_hourly`, `readings_daily`.

### iot_readings
Siemens IoT data (separate from PAC readings).
```
id (UUID PK), tenant_id, device_id, timestamp, variable_name,
value (NUMERIC), unit, raw_json (JSONB)
UNIQUE (device_id, timestamp, variable_name)
```

## Billing Tables

### tariffs
```
id (UUID PK), tenant_id, building_id, name, currency, is_active, created_at
```

### tariff_blocks
```
id (UUID PK), tariff_id (FK tariffs), name, start_hour, end_hour,
price_per_kwh, demand_charge_per_kw, days_of_week
```

### invoices
```
id (UUID PK), tenant_id, building_id, tenant_unit_id, tariff_id,
period_start, period_end, total_kwh, total_amount, status, approved_by,
approved_at, created_at
```

### invoice_line_items
```
id (UUID PK), invoice_id (FK), meter_id, block_name,
kwh, amount, demand_kw, demand_charge
```

## Alert Tables

### alerts
```
id (UUID PK), tenant_id, building_id, meter_id, rule_id,
type, severity, status ('active'|'acknowledged'|'resolved'),
message, value, threshold, acknowledged_by, resolved_by, created_at
```

### alert_rules
```
id (UUID PK), tenant_id, building_id, name, type, severity,
condition (JSONB), is_active, created_at
```

### notification_logs
```
id (UUID PK), tenant_id, alert_id, channel ('email'|'webhook'),
recipient, status, error, sent_at
```

## Other Tables

### tenant_units
Locatarios (store units within buildings).
```
id (UUID PK), tenant_id, building_id, name, floor, area_sqm, is_active
```

### tenant_unit_meters
```
tenant_unit_id (FK), meter_id (FK)
PK (tenant_unit_id, meter_id)
```

### building_hierarchy / meter_hierarchy
Electrical hierarchy trees.

### reports / scheduled_reports
Generated reports and scheduling config.

### integrations / integration_sync_logs
External connector config and sync history.

### fault_events
Equipment fault timeline.

### refresh_tokens
JWT refresh token rotation with theft detection.

### audit_logs (hypertable)
ISO 27001 audit trail. Compressed after 30 days, retained 5 years.
```
id (UUID PK), tenant_id, user_id, action, resource_type, resource_id,
details (JSONB), ip_address, user_agent, created_at
```

## Migrations

| File | Description |
|---|---|
| `database/init/01-extensions.sql` | uuid-ossp, TimescaleDB |
| `database/init/02-core.sql` | tenants, users, buildings, meters, readings |
| `database/init/03-rbac.sql` | permissions, roles, role_permissions, user_building_access |
| `database/init/04-seed.sql` | Initial data |
| `backend/src/database/migrations/09-mfa-columns.sql` | MFA fields on users |
| `backend/src/database/migrations/10-add-missing-permissions.sql` | 8 new permissions |
