-- SyncRP migration 005 — character appearance JSON
-- Stage 3 — APPLY THIS FILE
-- Owner: sync_characters
-- See docs/DATABASE.md

ALTER TABLE characters
  ADD COLUMN appearance_json LONGTEXT NULL AFTER model;
