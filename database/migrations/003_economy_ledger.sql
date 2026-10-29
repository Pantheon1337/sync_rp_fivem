-- SyncRP migration 003 — economy accounts + ledger
-- Status: STAGE 0 PLACEHOLDER. Implement in Stage 4.
-- Owner: sync_economy
-- See docs/DATABASE.md

/*
CREATE TABLE economy_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  character_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(16) NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_economy_character_type (character_id, type),
  CONSTRAINT fk_economy_accounts_character
    FOREIGN KEY (character_id) REFERENCES characters (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE economy_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  from_account_id BIGINT UNSIGNED NULL,
  to_account_id BIGINT UNSIGNED NULL,
  amount BIGINT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'RUB',
  reason_code VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  meta_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_economy_ledger_idempotency (idempotency_key),
  KEY idx_ledger_from (from_account_id),
  KEY idx_ledger_to (to_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/
