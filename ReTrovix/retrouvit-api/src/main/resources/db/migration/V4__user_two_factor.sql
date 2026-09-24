-- ============================================================
-- RetrouvIt — V4 : 2FA sur les comptes utilisateurs (CDC §4.1).
-- enabled : un compte non activé (inscription non confirmée par
-- OTP) ne peut pas se connecter. email_verified : preuve que
-- l'email a été confirmé via OTP au moins une fois.
-- ============================================================

ALTER TABLE users ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Les comptes existants (déjà en production/dev) sont considérés
-- vérifiés : ils se connectaient avant l'introduction de la 2FA.
UPDATE users SET email_verified = TRUE WHERE enabled = TRUE;
