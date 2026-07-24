-- ARCHIVED PROTOTYPE: not part of the Vercel + Supabase production path.
CREATE TABLE IF NOT EXISTS portal_tenants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_clients (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY portal_clients_tenant_slug (tenant_id, slug),
  CONSTRAINT portal_clients_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES portal_tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  display_name VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('invited', 'active', 'disabled') NOT NULL DEFAULT 'invited',
  password_changed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_memberships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  client_id CHAR(36) NULL,
  role ENUM('admin', 'manager', 'client') NOT NULL,
  status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY portal_memberships_tenant_user (tenant_id, user_id),
  KEY portal_memberships_client (client_id),
  CONSTRAINT portal_memberships_tenant_fk
    FOREIGN KEY (tenant_id) REFERENCES portal_tenants(id) ON DELETE CASCADE,
  CONSTRAINT portal_memberships_user_fk
    FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE,
  CONSTRAINT portal_memberships_client_fk
    FOREIGN KEY (client_id) REFERENCES portal_clients(id) ON DELETE CASCADE,
  CONSTRAINT portal_memberships_client_role_ck
    CHECK (
      (role = 'client' AND client_id IS NOT NULL)
      OR (role IN ('admin', 'manager') AND client_id IS NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY portal_sessions_user (user_id),
  KEY portal_sessions_expiry (expires_at),
  CONSTRAINT portal_sessions_user_fk
    FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_password_resets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY portal_password_resets_user (user_id),
  KEY portal_password_resets_expiry (expires_at),
  CONSTRAINT portal_password_resets_user_fk
    FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_migration_manifest (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source_system VARCHAR(80) NOT NULL,
  source_table VARCHAR(160) NOT NULL,
  source_id VARCHAR(190) NOT NULL,
  target_table VARCHAR(160) NOT NULL,
  target_id VARCHAR(190) NOT NULL,
  payload_checksum CHAR(64) NOT NULL,
  migrated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY platform_migration_source (source_system, source_table, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
