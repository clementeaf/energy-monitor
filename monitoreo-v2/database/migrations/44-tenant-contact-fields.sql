-- Tenant billing/contact fields referenced by Tenant entity (CompaniesPage).

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_detail VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

INSERT INTO schema_migrations (version, description) VALUES
    ('44-tenant-contact-fields', 'tenant address, phone, tax_id columns')
ON CONFLICT (version) DO NOTHING;
