-- Extends reports.report_type CHECK to allow 'quality' (calidad electrica).
-- Run once on bases creadas antes de 2026-04-02.

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE reports ADD CONSTRAINT reports_report_type_check CHECK (report_type IN (
    'executive', 'consumption', 'demand', 'billing', 'quality',
    'sla', 'esg', 'benchmark', 'inventory', 'alerts_compliance'
));
