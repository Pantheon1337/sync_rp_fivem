-- SyncRP migration 001 — accounts, identifiers, sessions
-- Stage 1 — APPLY THIS FILE (no longer a placeholder)
-- Owners: sync_identity (accounts, account_identifiers), sync_sessions (sessions)
-- See docs/DATABASE.md

CREATE TABLE IF NOT EXISTS schema_migrations (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL,
  status ENUM('active', 'suspended', 'banned') NOT NULL DEFAULT 'active',
  locale VARCHAR(10) NOT NULL DEFAULT 'ru',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_accounts_uuid (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_identifiers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(32) NOT NULL,
  value VARCHAR(128) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_identifier_type_value (type, value),
  KEY idx_account_identifiers_account (account_id),
  CONSTRAINT fk_account_identifiers_account
    FOREIGN KEY (account_id) REFERENCES accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT UNSIGNED NOT NULL,
  character_id BIGINT UNSIGNED NULL,
  server_id INT NOT NULL,
  connected_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  disconnected_at DATETIME(3) NULL,
  disconnect_reason VARCHAR(255) NULL,
  endpoint_hash CHAR(64) NULL,
  KEY idx_sessions_account (account_id),
  KEY idx_sessions_open (account_id, disconnected_at),
  CONSTRAINT fk_sessions_account
    FOREIGN KEY (account_id) REFERENCES accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
