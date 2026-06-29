-- Adds owner-onboarding fields to washes.
-- status: pending_setup -> pending_approval -> active (or rejected)
-- Existing washes are already live, so they default to "active" and keep
-- showing up for customers (GET /washes/ filters on status == 'active').

ALTER TABLE washes ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active' NOT NULL;
ALTER TABLE washes ADD COLUMN IF NOT EXISTS description VARCHAR;
ALTER TABLE washes ADD COLUMN IF NOT EXISTS working_hours JSON;

-- Backfill any rows that came in NULL before the NOT NULL/DEFAULT was attached
-- (defensive — covers engines where ADD COLUMN with DEFAULT doesn't backfill).
UPDATE washes SET status = 'active' WHERE status IS NULL;
