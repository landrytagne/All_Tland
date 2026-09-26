-- ============================================================
-- RetrouvIt — V10 : verrouillage de compte après échecs de
-- connexion (audit M2) — anti brute-force sur le mot de passe.
--
-- Règle : 5 échecs → compte verrouillé 15 minutes ;
-- un succès réinitialise le compteur. Le verrou expire seul
-- (pas d'intervention admin nécessaire), et un admin peut
-- déverrouiller manuellement.
-- ============================================================

ALTER TABLE users ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP(6) WITHOUT TIME ZONE;
