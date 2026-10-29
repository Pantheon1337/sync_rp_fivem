-- SyncRP migration 005 — character height (ESX-identity style field)
-- Stage 4 P0 — APPLY after 002_characters
-- Owner: sync_characters

ALTER TABLE characters
  ADD COLUMN height_cm SMALLINT UNSIGNED NULL AFTER gender;
