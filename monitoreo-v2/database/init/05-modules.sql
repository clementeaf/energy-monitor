-- ============================================================
-- Monitoreo V2 — Tablas de modulos (M03-M10)
-- Depende de: 02-schema.sql (tenants, users, buildings, meters)
-- ============================================================

-- ============================================================
-- Ampliar tabla meters con columnas del spec rev 2.1
-- ============================================================

ALTER TABLE meters
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS model VARCHAR(100),
    ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ip_address INET,
    ADD COLUMN IF NOT EXISTS modbus_address SMALLINT,
    ADD COLUMN IF NOT EXISTS bus_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS phase_type VARCHAR(20) DEFAULT 'three_phase'
        CHECK (phase_type IN ('single_phase', 'three_phase')),
    ADD COLUMN IF NOT EXISTS di_status VARCHAR(20) DEFAULT 'closed'
        CHECK (di_status IN ('closed', 'open', 'unknown')),
    ADD COLUMN IF NOT EXISTS do_status VARCHAR(20) DEFAULT 'inactive'
        CHECK (do_status IN ('active', 'inactive', 'error')),
    ADD COLUMN IF NOT EXISTS uplink_route VARCHAR(50),
    ADD COLUMN IF NOT EXISTS crc_errors_last_poll INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nominal_voltage NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS nominal_current NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS contracted_demand_kw NUMERIC(10,2);

-- ============================================================
-- M03 — Jerarquia electrica (drill-down 5 niveles)
-- Arbol auto-referencial: edificio > piso > zona > tablero > circuito
-- ============================================================

CREATE TABLE building_hierarchy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES building_hierarchy(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    level_type VARCHAR(30) NOT NULL
        CHECK (level_type IN ('floor', 'zone', 'panel', 'circuit', 'sub_circuit')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hierarchy_building ON building_hierarchy(building_id);
CREATE INDEX idx_hierarchy_parent ON building_hierarchy(parent_id);

-- Vincular medidores a nodos de jerarquia (N:N)
CREATE TABLE meter_hierarchy (
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    hierarchy_node_id UUID NOT NULL REFERENCES building_hierarchy(id) ON DELETE CASCADE,
    PRIMARY KEY (meter_id, hierarchy_node_id)
);

-- ============================================================
-- M03 — Concentradores (PAC4220, S7-1200)
-- ============================================================

CREATE TABLE concentrators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(100) NOT NULL,  -- PAC4220, S7-1200
    serial_number VARCHAR(100),
    ip_address INET,
    firmware_version VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'online'
        CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
    last_heartbeat_at TIMESTAMPTZ,
    mqtt_connected BOOLEAN DEFAULT false,
    battery_level SMALLINT,  -- 0-100, null si no aplica
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_concentrators_building ON concentrators(building_id);

-- Vincular medidores a concentrador + bus
CREATE TABLE concentrator_meters (
    concentrator_id UUID NOT NULL REFERENCES concentrators(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    bus_number SMALLINT NOT NULL DEFAULT 1,
    modbus_address SMALLINT,
    PRIMARY KEY (concentrator_id, meter_id)
);

-- ============================================================
-- M03 — Historial de fallos y mantenimiento
-- ============================================================

CREATE TABLE fault_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
    concentrator_id UUID REFERENCES concentrators(id) ON DELETE SET NULL,
    fault_type VARCHAR(50) NOT NULL,  -- communication, electrical, hardware, firmware
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    description TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fault_events_building ON fault_events(building_id, started_at DESC);
CREATE INDEX idx_fault_events_meter ON fault_events(meter_id, started_at DESC);

-- ============================================================
-- M04 — Facturacion energetica
-- ============================================================

-- Tarifas vigentes por edificio
CREATE TABLE tariffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,  -- null = vigente
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tariffs_building ON tariffs(building_id);

-- Bloques horarios dentro de cada tarifa
CREATE TABLE tariff_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tariff_id UUID NOT NULL REFERENCES tariffs(id) ON DELETE CASCADE,
    block_name VARCHAR(50) NOT NULL,  -- punta, llano, valle
    hour_start SMALLINT NOT NULL CHECK (hour_start BETWEEN 0 AND 23),
    hour_end SMALLINT NOT NULL CHECK (hour_end BETWEEN 0 AND 23),
    energy_rate NUMERIC(12,4) NOT NULL,   -- $/kWh
    demand_rate NUMERIC(12,4) DEFAULT 0,  -- $/kW
    reactive_rate NUMERIC(12,4) DEFAULT 0, -- $/kVArh
    fixed_charge NUMERIC(12,2) DEFAULT 0   -- $/mes
);

CREATE INDEX idx_tariff_blocks_tariff ON tariff_blocks(tariff_id);

-- Locatarios / unidades dentro de edificios
CREATE TABLE tenant_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit_code VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    user_id UUID REFERENCES users(id),  -- locatario vinculado (login portal)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, building_id, unit_code)
);

CREATE INDEX idx_tenant_units_building ON tenant_units(building_id);

-- Medidores asignados a locatario (N:N)
CREATE TABLE tenant_unit_meters (
    tenant_unit_id UUID NOT NULL REFERENCES tenant_units(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_unit_id, meter_id)
);

-- Facturas
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    tariff_id UUID REFERENCES tariffs(id),
    invoice_number VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'approved', 'sent', 'paid', 'voided')),
    total_net NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.19,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_building ON invoices(building_id, period_start DESC);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);

-- Lineas de factura (por medidor/locatario)
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES meters(id),
    tenant_unit_id UUID REFERENCES tenant_units(id),
    kwh_consumption NUMERIC(12,2) NOT NULL DEFAULT 0,
    kw_demand_max NUMERIC(10,2) NOT NULL DEFAULT 0,
    kvarh_reactive NUMERIC(12,2) NOT NULL DEFAULT 0,
    kwh_exported NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    energy_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
    demand_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
    reactive_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
    fixed_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_net NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_invoice_lines_invoice ON invoice_line_items(invoice_id);

-- ============================================================
-- M05 — Centro de alertas
-- ============================================================

-- Reglas de alerta (configurables por tenant/edificio)
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,  -- null = aplica a todos
    alert_type_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    check_interval_seconds INTEGER NOT NULL DEFAULT 900,  -- 15 min default
    config JSONB NOT NULL DEFAULT '{}',  -- umbrales, parametros especificos
    -- Escalamiento
    escalation_l1_minutes INTEGER DEFAULT 0,    -- Operador/Tecnico
    escalation_l2_minutes INTEGER DEFAULT 60,   -- Site Admin
    escalation_l3_minutes INTEGER DEFAULT 1440, -- Corp Admin
    -- Notificacion
    notify_email BOOLEAN NOT NULL DEFAULT true,
    notify_push BOOLEAN NOT NULL DEFAULT false,
    notify_whatsapp BOOLEAN NOT NULL DEFAULT false,
    notify_sms BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_rules_tenant ON alert_rules(tenant_id, is_active);

-- Instancias de alerta
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
    alert_type_code VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'acknowledged', 'resolved')),
    message TEXT NOT NULL,
    triggered_value DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    assigned_to UUID REFERENCES users(id),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant_status ON alerts(tenant_id, status, created_at DESC);
CREATE INDEX idx_alerts_building ON alerts(building_id, created_at DESC);
CREATE INDEX idx_alerts_severity ON alerts(tenant_id, severity, status);

-- ============================================================
-- M06 — Reportes
-- ============================================================

-- Reportes generados
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL
        CHECK (report_type IN (
            'executive', 'consumption', 'demand', 'billing', 'quality',
            'sla', 'esg', 'benchmark', 'inventory', 'alerts_compliance'
        )),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    format VARCHAR(10) NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
    file_url TEXT,        -- S3 path
    file_size_bytes BIGINT,
    generated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_tenant ON reports(tenant_id, created_at DESC);

-- Reportes programados (cron)
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
    cron_expression VARCHAR(100) NOT NULL,  -- ej: '0 8 1 * *' (dia 1, 8am)
    recipients JSONB NOT NULL DEFAULT '[]', -- ["email1@...", "email2@..."]
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- M09 — Integraciones
-- ============================================================

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,  -- mqtt, api, datalake, s3
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'error', 'pending')),
    config JSONB NOT NULL DEFAULT '{}',  -- connection params (encrypted at app level)
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hypertable para logs de sync (inmutable, time-partitioned)
SELECT create_hypertable('integration_sync_logs', 'created_at');
