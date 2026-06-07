# DER — Monitoreo v2 (auto-generado)

Generado: 2026-06-07 · 45 entidades

> Regenerar: `node scripts/generate-der.mjs`

```mermaid
erDiagram
  tenants ||--o{ notification_logs : "tenant_id"
  alerts ||--o{ notification_logs : "alert_id"
  tenants ||--o{ api_keys : "tenant_id"
  tenants ||--o{ tenant_sso_config : "tenant_id"
  tenants ||--o{ oauth_clients : "tenant_id"
  tenants ||--o{ alert_rules : "tenant_id"
  buildings ||--o{ alert_rules : "building_id"
  users ||--o{ alert_rules : "createdByUser_id"
  tenants ||--o{ backfill_jobs : "tenant_id"
  meters ||--o{ backfill_jobs : "meter_id"
  tenants ||--o{ building_hierarchy : "tenant_id"
  buildings ||--o{ building_hierarchy : "building_id"
  tenants ||--o{ buildings : "tenant_id"
  regions ||--o{ buildings : "region_id"
  concentrators ||--o{ concentrator_meters : "concentrator_id"
  meters ||--o{ concentrator_meters : "meter_id"
  tenants ||--o{ concentrators : "tenant_id"
  buildings ||--o{ concentrators : "building_id"
  tenants ||--o{ data_export_jobs : "tenant_id"
  tenants ||--o{ etl_watermarks : "tenant_id"
  tenants ||--o{ fault_events : "tenant_id"
  buildings ||--o{ fault_events : "building_id"
  meters ||--o{ fault_events : "meter_id"
  concentrators ||--o{ fault_events : "concentrator_id"
  users ||--o{ fault_events : "resolvedByUser_id"
  tenants ||--o{ ingest_gaps : "tenant_id"
  meters ||--o{ ingest_gaps : "meter_id"
  integrations ||--o{ integration_sync_logs : "integration_id"
  tenants ||--o{ integrations : "tenant_id"
  invoices ||--o{ invoice_line_items : "invoice_id"
  meters ||--o{ invoice_line_items : "meter_id"
  tenant_units ||--o{ invoice_line_items : "tenantUnit_id"
  tenants ||--o{ invoices : "tenant_id"
  buildings ||--o{ invoices : "building_id"
  tariffs ||--o{ invoices : "tariff_id"
  users ||--o{ invoices : "approvedByUser_id"
  users ||--o{ invoices : "createdByUser_id"
  meters ||--o{ meter_hierarchy : "meter_id"
  building_hierarchy ||--o{ meter_hierarchy : "hierarchyNode_id"
  meters ||--o{ meter_reading_status : "meter_id"
  tenants ||--o{ meter_reading_status : "tenant_id"
  tenants ||--o{ meters : "tenant_id"
  buildings ||--o{ meters : "building_id"
  tenants ||--o{ alerts : "tenant_id"
  alert_rules ||--o{ alerts : "alertRule_id"
  buildings ||--o{ alerts : "building_id"
  meters ||--o{ alerts : "meter_id"
  users ||--o{ alerts : "assignedToUser_id"
  users ||--o{ alerts : "acknowledgedByUser_id"
  users ||--o{ alerts : "resolvedByUser_id"
  tenants ||--o{ readings : "tenant_id"
  meters ||--o{ readings : "meter_id"
  tenants ||--o{ regions : "tenant_id"
  tenants ||--o{ register_mappings : "tenant_id"
  protocol_types ||--o{ register_mappings : "protocolType_id"
  tenants ||--o{ reports : "tenant_id"
  buildings ||--o{ reports : "building_id"
  users ||--o{ reports : "generatedByUser_id"
  tenants ||--o{ scheduled_reports : "tenant_id"
  buildings ||--o{ scheduled_reports : "building_id"
  users ||--o{ scheduled_reports : "createdByUser_id"
  tariffs ||--o{ tariff_blocks : "tariff_id"
  tenants ||--o{ tariffs : "tenant_id"
  buildings ||--o{ tariffs : "building_id"
  users ||--o{ tariffs : "createdByUser_id"
  tenant_units ||--o{ tenant_unit_meters : "tenantUnit_id"
  meters ||--o{ tenant_unit_meters : "meter_id"
  tenants ||--o{ tenant_units : "tenant_id"
  buildings ||--o{ tenant_units : "building_id"
  users ||--o{ tenant_units : "linkedUser_id"
  tenants ||--o{ webhook_delivery_logs : "tenant_id"
  webhook_subscriptions ||--o{ webhook_delivery_logs : "subscription_id"
  tenants ||--o{ webhook_subscriptions : "tenant_id"
  roles ||--o{ role_permissions : "role_id"
  permissions ||--o{ role_permissions : "permission_id"
  tenants ||--o{ roles : "tenant_id"
  users ||--o{ user_building_access : "user_id"
  users ||--o{ refresh_tokens : "user_id"
  tenants ||--o{ users : "tenant_id"
  roles ||--o{ users : "role_id"

  notification_logs {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar alert_id "NOT NULL"
    varchar channel "NOT NULL"
    varchar status "NOT NULL"
    text recipient
    text subject "NOT NULL"
    text body
    text error_message
    timestamptz created_at "NOT NULL"
  }
  api_keys {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar name "NOT NULL"
    varchar key_hash "NOT NULL"
    varchar key_prefix "NOT NULL"
    text permissions "NOT NULL"
    uuid building_ids "NOT NULL"
    int rate_limit_per_minute "NOT NULL"
    int ingress_rate_limit_per_minute
    timestamptz expires_at
    boolean is_active "NOT NULL"
    timestamptz last_used_at
    uuid created_by
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  tenant_sso_config {
    text issuer "NOT NULL"
    text client_id "NOT NULL"
    text metadata_url
    text encrypted_client_secret "NOT NULL"
    text scim_webhook_secret
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  iot_readings {
    double precision value "NOT NULL"
    integer quality "NOT NULL"
  }
  oauth_clients {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar name "NOT NULL"
    varchar client_id "NOT NULL"
    varchar secret_hash "NOT NULL"
    varchar client_id_prefix "NOT NULL"
    text scopes "NOT NULL"
    uuid building_ids "NOT NULL"
    int token_ttl_seconds "NOT NULL"
    boolean is_active "NOT NULL"
    timestamptz last_used_at
    uuid created_by
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  alert_rules {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    uuid building_id
    varchar alert_type_code "NOT NULL"
    varchar name "NOT NULL"
    text description
    varchar severity "NOT NULL"
    boolean is_active "NOT NULL"
    integer check_interval_seconds "NOT NULL"
    jsonb config "NOT NULL"
    integer escalation_l1_minutes "NOT NULL"
    integer escalation_l2_minutes "NOT NULL"
    integer escalation_l3_minutes "NOT NULL"
    boolean notify_email "NOT NULL"
    boolean notify_push "NOT NULL"
    boolean notify_whatsapp "NOT NULL"
    boolean notify_sms "NOT NULL"
    uuid created_by
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  backfill_jobs {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar meter_id "NOT NULL"
    timestamptz from_ts "NOT NULL"
    timestamptz to_ts "NOT NULL"
    integer rows_inserted "NOT NULL"
    text error
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  building_hierarchy {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar building_id "NOT NULL"
    uuid parent_id
    varchar name "NOT NULL"
    varchar level_type "NOT NULL"
    integer sort_order "NOT NULL"
    jsonb metadata "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  buildings {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar name "NOT NULL"
    varchar code "NOT NULL"
    text address
    decimal area_sqm
    boolean is_active "NOT NULL"
    uuid region_id
    char country_code
    varchar timezone
    varchar external_site_id
    varchar site_kind
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  concentrator_meters {
    smallint bus_number "NOT NULL"
    smallint modbus_address
  }
  concentrators {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar building_id "NOT NULL"
    varchar name "NOT NULL"
    varchar model "NOT NULL"
    varchar serial_number
    inet ip_address
    varchar firmware_version
    varchar status "NOT NULL"
    timestamptz last_heartbeat_at
    boolean mqtt_connected "NOT NULL"
    smallint battery_level
    jsonb metadata "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  data_contracts {
    uuid id PK "NOT NULL"
    uuid tenant_id
    varchar name "NOT NULL"
    varchar version "NOT NULL"
    jsonb schema_json "NOT NULL"
    timestamptz effective_from "NOT NULL"
    timestamptz created_at "NOT NULL"
  }
  data_export_jobs {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    jsonb params "NOT NULL"
    varchar s3_key
    varchar local_path
    integer row_count "NOT NULL"
    text error
    timestamptz expires_at
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  data_quality_daily {
    decimal measured_pct "NOT NULL"
    decimal estimated_pct "NOT NULL"
    decimal invalid_pct "NOT NULL"
    decimal unknown_pct "NOT NULL"
    bigint total "NOT NULL"
  }
  data_slo_breaches {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar slo_type "NOT NULL"
    timestamptz breached_at "NOT NULL"
    jsonb detail "NOT NULL"
  }
  etl_watermarks {
    text last_cursor "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  fault_events {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar building_id "NOT NULL"
    uuid meter_id
    uuid concentrator_id
    varchar fault_type "NOT NULL"
    varchar severity "NOT NULL"
    text description
    timestamptz started_at "NOT NULL"
    timestamptz resolved_at
    text resolution_notes
    uuid resolved_by
    timestamptz created_at "NOT NULL"
  }
  ingest_gaps {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar meter_id "NOT NULL"
    timestamptz gap_start "NOT NULL"
    timestamptz gap_end "NOT NULL"
    timestamptz detected_at "NOT NULL"
    timestamptz resolved_at
    enum status "NOT NULL"
  }
  integration_sync_logs {
    bigint id PK "NOT NULL"
    varchar integration_id "NOT NULL"
    varchar status "NOT NULL"
    integer records_synced "NOT NULL"
    text error_message
    timestamptz started_at "NOT NULL"
    timestamptz completed_at
    timestamptz created_at "NOT NULL"
  }
  integrations {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar name "NOT NULL"
    varchar integration_type "NOT NULL"
    varchar status "NOT NULL"
    jsonb config "NOT NULL"
    timestamptz last_sync_at
    text error_message
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  invoice_line_items {
    uuid id PK "NOT NULL"
    varchar invoice_id "NOT NULL"
    varchar meter_id "NOT NULL"
    uuid tenant_unit_id
    decimal kwh_consumption "NOT NULL"
    decimal kw_demand_max "NOT NULL"
    decimal kvarh_reactive "NOT NULL"
    decimal kwh_exported "NOT NULL"
    decimal net_balance "NOT NULL"
    decimal energy_charge "NOT NULL"
    decimal demand_charge "NOT NULL"
    decimal reactive_charge "NOT NULL"
    decimal fixed_charge "NOT NULL"
    decimal total_net "NOT NULL"
  }
  invoices {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar building_id "NOT NULL"
    uuid tariff_id
    varchar invoice_number "NOT NULL"
    date period_start "NOT NULL"
    date period_end "NOT NULL"
    varchar status "NOT NULL"
    decimal total_net "NOT NULL"
    decimal tax_rate "NOT NULL"
    decimal tax_amount "NOT NULL"
    decimal total "NOT NULL"
    text notes
    uuid approved_by
    timestamptz approved_at
    varchar created_by "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  meter_hierarchy {
  }
  meter_reading_status {
    varchar tenant_id "NOT NULL"
    timestamptz last_reading_at
    timestamptz last_ingested_at
    varchar last_source
    timestamptz updated_at "NOT NULL"
  }
  meters {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar building_id "NOT NULL"
    varchar name "NOT NULL"
    varchar code "NOT NULL"
    varchar meter_type "NOT NULL"
    boolean is_active "NOT NULL"
    jsonb metadata "NOT NULL"
    varchar external_id
    varchar model
    varchar serial_number
    inet ip_address
    smallint modbus_address
    varchar bus_id
    varchar phase_type "NOT NULL"
    varchar di_status "NOT NULL"
    varchar do_status "NOT NULL"
    varchar uplink_route
    integer crc_errors_last_poll "NOT NULL"
    decimal nominal_voltage
    decimal nominal_current
    decimal contracted_demand_kw
    varchar load_category
    uuid parent_meter_id
    varchar _truncated "2 cols omitted"
  }
  alerts {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    uuid alert_rule_id
    varchar building_id "NOT NULL"
    uuid meter_id
    varchar alert_type_code "NOT NULL"
    varchar severity "NOT NULL"
    varchar status "NOT NULL"
    text message "NOT NULL"
    double precision triggered_value
    double precision threshold_value
    uuid assigned_to
    uuid acknowledged_by
    timestamptz acknowledged_at
    uuid resolved_by
    timestamptz resolved_at
    text resolution_notes
    timestamptz created_at "NOT NULL"
  }
  protocol_types {
    varchar label "NOT NULL"
    text description
  }
  readings {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar meter_id "NOT NULL"
    timestamptz timestamp "NOT NULL"
    decimal voltage_l1
    decimal voltage_l2
    decimal voltage_l3
    decimal current_l1
    decimal current_l2
    decimal current_l3
    decimal power_kw "NOT NULL"
    decimal reactive_power_kvar
    decimal power_factor
    decimal frequency_hz
    decimal energy_kwh_total "NOT NULL"
    decimal thd_voltage_pct
    decimal thd_current_pct
    decimal phase_imbalance_pct
    varchar breaker_status
    smallint digital_input_1
    smallint digital_input_2
    smallint digital_output_1
    smallint digital_output_2
    varchar alarm
    varchar _truncated "3 cols omitted"
  }
  regions {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar code "NOT NULL"
    varchar name "NOT NULL"
    char country_code "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  register_mappings {
    uuid id PK "NOT NULL"
    varchar tenant_id
    varchar protocol "NOT NULL"
    varchar device_profile "NOT NULL"
    varchar register_key "NOT NULL"
    varchar target_field "NOT NULL"
    decimal scale_factor "NOT NULL"
    varchar unit
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  reports {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    uuid building_id
    varchar report_type "NOT NULL"
    date period_start "NOT NULL"
    date period_end "NOT NULL"
    varchar format "NOT NULL"
    text file_url
    bigint file_size_bytes
    varchar generated_by "NOT NULL"
    timestamptz created_at "NOT NULL"
  }
  scheduled_reports {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    uuid building_id
    varchar report_type "NOT NULL"
    varchar format "NOT NULL"
    varchar cron_expression "NOT NULL"
    jsonb recipients "NOT NULL"
    boolean is_active "NOT NULL"
    timestamptz last_run_at
    timestamptz next_run_at
    varchar created_by "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  tariff_blocks {
    uuid id PK "NOT NULL"
    varchar tariff_id "NOT NULL"
    varchar block_name "NOT NULL"
    smallint hour_start "NOT NULL"
    smallint hour_end "NOT NULL"
    decimal energy_rate "NOT NULL"
    decimal demand_rate "NOT NULL"
    decimal reactive_rate "NOT NULL"
    decimal fixed_charge "NOT NULL"
  }
  tariffs {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar building_id "NOT NULL"
    varchar name "NOT NULL"
    date effective_from "NOT NULL"
    date effective_to
    boolean is_active "NOT NULL"
    uuid created_by
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  tenant_unit_meters {
  }
  tenant_units {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar building_id "NOT NULL"
    varchar name "NOT NULL"
    varchar unit_code "NOT NULL"
    varchar external_unit_id
    varchar contact_name
    varchar contact_email
    uuid user_id
    boolean is_active "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  webhook_delivery_logs {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar subscription_id
    varchar event_type "NOT NULL"
    text url "NOT NULL"
    varchar status "NOT NULL"
    integer http_status
    integer attempt_count "NOT NULL"
    text error_message
    jsonb payload "NOT NULL"
    timestamptz created_at "NOT NULL"
  }
  webhook_subscriptions {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar event_type "NOT NULL"
    text url "NOT NULL"
    text secret "NOT NULL"
    boolean active "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  permissions {
    uuid id PK "NOT NULL"
    varchar module "NOT NULL"
    varchar action "NOT NULL"
    text description
  }
  role_permissions {
    varchar access_level "NOT NULL"
  }
  roles {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar name "NOT NULL"
    varchar slug "NOT NULL"
    text description
    integer max_session_minutes "NOT NULL"
    smallint hierarchy_level "NOT NULL"
    boolean is_default "NOT NULL"
    boolean require_mfa "NOT NULL"
    boolean is_active "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  user_building_access {
  }
  refresh_tokens {
    uuid id PK "NOT NULL"
    varchar user_id "NOT NULL"
    varchar token_hash "NOT NULL"
    timestamptz expires_at "NOT NULL"
    timestamptz created_at "NOT NULL"
    timestamptz revoked_at
    varchar revoked_reason
    inet ip_address
    text user_agent
  }
  tenants {
    uuid id PK "NOT NULL"
    varchar name "NOT NULL"
    varchar slug "NOT NULL"
    boolean is_active "NOT NULL"
    varchar primary_color "NOT NULL"
    varchar secondary_color "NOT NULL"
    text logo_url
    text favicon_url
    varchar app_title "NOT NULL"
    varchar sidebar_color "NOT NULL"
    varchar accent_color "NOT NULL"
    varchar address
    varchar address_detail
    varchar phone
    varchar tax_id
    jsonb settings "NOT NULL"
    varchar timezone "NOT NULL"
    char default_country_code
    char default_currency
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
  users {
    uuid id PK "NOT NULL"
    varchar tenant_id "NOT NULL"
    varchar email "NOT NULL"
    varchar display_name
    varchar auth_provider "NOT NULL"
    varchar auth_provider_id "NOT NULL"
    varchar role_id "NOT NULL"
    boolean is_active "NOT NULL"
    varchar mfa_secret
    boolean mfa_enabled "NOT NULL"
    text mfa_recovery_codes
    timestamptz privacy_accepted_at
    varchar privacy_policy_version
    boolean data_processing_blocked "NOT NULL"
    text block_reason
    timestamptz blocked_at
    boolean opt_out_automated_decisions "NOT NULL"
    boolean age_verified "NOT NULL"
    timestamptz last_login_at
    timestamptz created_at "NOT NULL"
    timestamptz updated_at "NOT NULL"
  }
```

