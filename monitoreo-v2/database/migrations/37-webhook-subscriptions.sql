-- GAP-150–151: Outbound webhook subscriptions and delivery audit log.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_event_type') THEN
        CREATE TYPE webhook_event_type AS ENUM (
            'reading.stale',
            'alert.created',
            'meter.offline',
            'gap.detected'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type webhook_event_type NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_tenant ON webhook_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_tenant_event
    ON webhook_subscriptions(tenant_id, event_type)
    WHERE active = true;

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES webhook_subscriptions(id) ON DELETE SET NULL,
    event_type webhook_event_type NOT NULL,
    url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed')),
    http_status INTEGER,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_tenant_created
    ON webhook_delivery_logs(tenant_id, created_at DESC);

INSERT INTO permissions (module, action, description) VALUES
    ('webhooks', 'read', 'Ver suscripciones webhook salientes'),
    ('webhooks', 'create', 'Crear suscripciones webhook'),
    ('webhooks', 'update', 'Modificar suscripciones webhook'),
    ('webhooks', 'delete', 'Eliminar suscripciones webhook')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO schema_migrations (version, description) VALUES
    ('37-webhook-subscriptions', 'webhook_subscriptions + webhook_delivery_logs + event enum')
ON CONFLICT (version) DO NOTHING;
