-- Migration 14: Automated decision opt-out + age verification
-- Ley 21.719 Art. 8 bis (automated decisions) + Art. 16 quater (minors)

-- 1. Opt-out of automated decisions (alert escalation, etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS opt_out_automated_decisions BOOLEAN NOT NULL DEFAULT false;

-- 2. Age verification flag (admin confirms user is 14+ at creation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_verified BOOLEAN NOT NULL DEFAULT true;
