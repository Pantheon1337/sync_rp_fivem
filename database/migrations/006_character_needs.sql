-- SyncRP migration 006 — character hunger/thirst (esx_basicneeds pattern)
-- Owner: sync_needs
-- Values: 0–100 percent (HUD rings). ESX uses 0–1000000; we store percent.

ALTER TABLE characters
  ADD COLUMN hunger TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER bank,
  ADD COLUMN thirst TINYINT UNSIGNED NOT NULL DEFAULT 100 AFTER hunger;
