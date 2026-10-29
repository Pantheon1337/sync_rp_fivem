-- SyncRP migration 003 — economy accounts + ledger
-- Stage 4 — APPLY THIS FILE
-- Owner: sync_economy
-- Money unit: BIGINT whole RUB (рубли). Display as ₽.
-- See docs/DATABASE.md

CREATE TABLE IF NOT EXISTS economy_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  character_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(16) NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_economy_character_type (character_id, type),
  KEY idx_economy_accounts_character (character_id),
  CONSTRAINT fk_economy_accounts_character
    FOREIGN KEY (character_id) REFERENCES characters (id),
  CONSTRAINT chk_economy_accounts_type
    CHECK (type IN ('cash', 'bank', 'business', 'org')),
  CONSTRAINT chk_economy_accounts_balance
    CHECK (balance >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS economy_ledger (
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
  KEY idx_ledger_to (to_account_id),
  KEY idx_ledger_created (created_at),
  CONSTRAINT chk_economy_ledger_amount CHECK (amount > 0),
  CONSTRAINT fk_ledger_from
    FOREIGN KEY (from_account_id) REFERENCES economy_accounts (id),
  CONSTRAINT fk_ledger_to
    FOREIGN KEY (to_account_id) REFERENCES economy_accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
