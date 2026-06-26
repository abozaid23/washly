-- Adds access-code + computed totals to bookings.
-- New tables (booking_services, employee_specializations) are created
-- automatically by SQLAlchemy's create_all on next backend start.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS access_code VARCHAR(6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price FLOAT DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0;
