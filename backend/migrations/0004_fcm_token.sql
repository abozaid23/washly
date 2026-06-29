-- Adds fcm_token to users for Firebase Web Push notifications.

ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR;
