-- ============================================================
-- RetrouvIt — V2 : métadonnées de session sur les refresh tokens
-- Support de GET /api/auth/sessions (liste des appareils actifs,
-- cahier des charges §5.1) et révocation sélective par appareil.
-- ============================================================

ALTER TABLE refresh_tokens ADD COLUMN device_info VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(45);

-- Accélération du listage des sessions actives par utilisateur
CREATE INDEX idx_refresh_tokens_user_revoked ON refresh_tokens (user_id, revoked);
