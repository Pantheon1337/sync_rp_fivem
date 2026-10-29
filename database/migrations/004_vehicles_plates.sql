-- SyncRP migration 004 — vehicles, plates, garages stubs
-- Status: STAGE 0 PLACEHOLDER. Implement in Stage 6–7.
-- Owners: sync_vehicles, sync_garages
-- Russian plates: server-side allocation only.
-- See docs/DATABASE.md

/*
CREATE TABLE vehicle_plates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  plate_text VARCHAR(16) NOT NULL,
  series_region VARCHAR(16) NULL,
  status ENUM('active', 'retired') NOT NULL DEFAULT 'active',
  issued_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_vehicle_plates_text (plate_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE garages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_garages_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  character_id BIGINT UNSIGNED NOT NULL,
  model VARCHAR(64) NOT NULL,
  plate_id BIGINT UNSIGNED NOT NULL,
  garage_id BIGINT UNSIGNED NULL,
  state ENUM('stored', 'out', 'impound') NOT NULL DEFAULT 'stored',
  props_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_vehicles_plate (plate_id),
  KEY idx_vehicles_character (character_id),
  CONSTRAINT fk_vehicles_plate FOREIGN KEY (plate_id) REFERENCES vehicle_plates (id),
  CONSTRAINT fk_vehicles_garage FOREIGN KEY (garage_id) REFERENCES garages (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/
