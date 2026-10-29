-- SyncRP migration 002 — characters
-- Status: STAGE 0 PLACEHOLDER. Implement DDL in Stage 2.
-- Owner: sync_characters
-- See docs/DATABASE.md

/*
CREATE TABLE characters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  slot TINYINT UNSIGNED NOT NULL,
  first_name VARCHAR(32) NOT NULL,
  last_name VARCHAR(32) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(16) NOT NULL,
  cash BIGINT NOT NULL DEFAULT 0,
  bank BIGINT NOT NULL DEFAULT 0,
  position_x FLOAT NULL,
  position_y FLOAT NULL,
  position_z FLOAT NULL,
  position_h FLOAT NULL,
  model VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_characters_uuid (uuid),
  UNIQUE KEY uq_characters_account_slot (account_id, slot),
  KEY idx_characters_account (account_id),
  CONSTRAINT fk_characters_account
    FOREIGN KEY (account_id) REFERENCES accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/
