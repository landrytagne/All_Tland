-- ============================================================
-- RetrouvIt — V5 : matching conforme CDC §7
-- scoreBreakdown : détail du score par critère (catégorie, texte,
-- géo, temporel, visuel) en JSON — CDC §4.3.
-- ============================================================

ALTER TABLE matches ADD COLUMN score_breakdown TEXT;
