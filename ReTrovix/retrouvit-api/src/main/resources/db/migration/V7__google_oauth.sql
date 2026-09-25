-- ============================================================
-- RetrouvIt — V7 : authentification Google OAuth2 (CDC §5.1/§6.1)
-- - password devient nullable (comptes Google sans mot de passe)
-- - auth_provider distingue LOCAL / GOOGLE (CDC §4.1)
-- Les comptes existants restent LOCAL.
-- ============================================================

ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL';
