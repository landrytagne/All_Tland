# RAPPORT D'IMPLÉMENTATION — RetrouvIt

**Mise en conformité avec le cahier des charges technique v1.0 (Juillet 2026)**

Date : 25-26 septembre 2026 · Projet : `ReTrovix/` (repo `All_Tland`, branche `main`)

---

## 1. Résumé exécutif

Huit chantiers ont été livrés, chacun sur sa branche, vérifié (tests + build + test d'intégration), mergé sur `main` et poussé. Le projet passe de **91 à 127 tests unitaires verts**, dispose désormais de **9 migrations Flyway** et couvre l'intégralité des écarts identifiés au départ, hormis les points explicitement différés (embeddings image, credentials Google réels, providers MoMo/Orange réels).

| Tâche | Branche | Statut | Vérification |
|---|---|---|---|
| T7 — CI durcie | `feature/ci-hardening` | ✅ Mergé + poussé | Pipeline bloquante |
| T6 — Flyway baseline | `feature/flyway-baseline` | ✅ Mergé + poussé | Boot base vierge + base existante |
| T5 — GET /auth/sessions | `feature/auth-sessions` | ✅ Mergé + poussé | Test HTTP bout-en-bout |
| T1 — OTP 2FA email | `feature/otp-two-factor` | ✅ Mergé + poussé | Cycle complet via MailHog |
| T3 — Matching CDC | `feature/matching-cdc` | ✅ Mergé + poussé | 13 tests moteur |
| T4 — Paiements & wallet | `feature/payments-wallet` | ✅ Mergé + poussé | Retrait + validation finance via HTTP |
| T2 — Google OAuth2 | `feature/google-oauth` | ✅ Mergé + poussé | Rejet propre sans credentials |
| **T8 — Flow de restitution officiel** | `feature/restitution-flow` | ✅ Mergé + poussé | 122→127 tests · typecheck + build frontend OK |

**Vérification finale globale** : 127/127 tests verts · typecheck + build production frontend OK · boot sur base vierge avec V1→V9 appliquées · Swagger accessible.

---

## 2. Détail par chantier

### T7 — CI durcie (`ReTrovix/.github/workflows/ci.yml`)

- `continue-on-error` supprimé sur `mvn test` : un test en échec casse désormais la pipeline.
- Typecheck TypeScript déjà bloquant, conservé ; upload des rapports surefire en artifact.
- Au passage : correction de `UserServiceTest` (mocks manquants suite à l'évolution du service).

### T6 — Flyway baseline

- `V1__baseline.sql` : schéma de référence (27 tables) généré depuis les entités JPA via `pg_dump` sur une base de référence — le schéma réellement utilisé est figé en migration.
- Dépendances `flyway-core` + `flyway-database-postgresql` (versions gérées par Boot 3.3).
- `ddl-auto` passe de `update` à **`validate`** : Hibernate ne modifie plus le schéma, il vérifie seulement la cohérence entités ↔ tables.
- `baseline-version: 1` : les bases existantes (dev/prod créées via ddl-auto) posent un baseline v1 au premier boot — V1 y est ignorée, les V2+ s'appliquent normalement.
- **Validé dans les deux scénarios** : base vierge (V1 appliquée + validate OK) et base existante simulée (baseline posée, boot OK).

### T5 — GET /api/auth/sessions (CDC §5.1)

- Sessions actives avec appareil (User-Agent tronqué), IP (X-Forwarded-For supporté), dates, flag `current`.
- `DELETE /api/auth/sessions/{id}` : révocation d'un appareil distant, réservée au propriétaire.
- Le login enregistre les métadonnées ; la rotation du refresh token les conserve (même appareil).
- Le token n'est jamais exposé — seules ses métadonnées.
- Migration **V2** : colonnes `device_info`/`ip_address` + index `(user_id, revoked)` — première migration incrémentale post-baseline.

### T1 — OTP 2FA email (CDC §5.1 / §6.1)

Backend :
- `OtpService` : code 6 chiffres `SecureRandom`, **stocké haché (bcrypt)**, expiration **5 min**, **usage unique**, **5 tentatives max**.
- Bug corrigé au passage : le compteur de tentatives était annulé par le rollback de la transaction de validation — incrément désormais persisté via transaction `REQUIRES_NEW` (vérifié : 4→3→2).
- Inscription en 2 étapes : compte créé inactif (`enabled=false`) puis activé par code ; login refusé tant que non activé.
- Login 2FA : si `two_factor_enabled`, aucun token émis — réponse `otpRequired` + email masqué ; `POST /api/auth/otp/verify` émet les tokens après validation.
- Anti-énumération sur `/otp/request` (message neutre si le compte n'existe pas).
- Migrations **V3** (`otp_codes`) et **V4** (`enabled`, `email_verified`, `two_factor_enabled` ; comptes existants marqués vérifiés).
- Email HTML responsive (bug de format `%` non échappé corrigé).

Frontend :
- Page `verify-otp` réécrite : modes login/register via query params, collage du code, renvoi, états de chargement/erreur/succès.
- Register redirige vers la vérification ; login gère `otpRequired` ; `loginWithTokens` dans AuthContext.

**Test de bout en bout (MailHog)** : inscription → réception code → mauvais code (compteur persistant) → bon code (activation) → login 2FA (`otpRequired:true`) → vérification → tokens JWT émis.

### T3 — Matching conforme CDC §7

- Catégorie **éliminatoire** (score = 0 si différente) ; pondérations CDC : similarité texte **35 %**, géo **20 %**, temporel **15 %** (dégression 3/7/14/30 jours), visuel **30 %**.
- Seuil **80 %** paramétrable (`match_min_score`) au lieu de 60 % codé en dur ; badge « correspondance forte » ≥ **90 %** (`match_strong_score`).
- `scoreBreakdown` JSON persisté (migration **V5**) et exposé dans `MatchResponse`.
- Recalcul à la **création ET à la modification**, dans les **deux sens** (lost→found et found→lost) — le post FOUND ne déclenchait rien avant. Anti-doublon en base.
- Similarité visuelle : photo identique = 30/30 en attendant le choix du fournisseur d'embeddings (point ouvert CDC §14.2) ; sans photo, les poids restants sont renormalisés sur 100 pour ne pas pénaliser le score.
- Frontend : badge « Forte » sur les correspondances ≥ seuil.

### T4 — Paiements & wallet (CDC §5.4 / §8)

- `POST /api/wallet/withdraw` : débit immédiat, soumission au provider ; au-dessus du seuil `withdraw_manual_review_min` (**100 000 XAF**, paramétrable) → `PENDING_REVIEW` + **alerte admin anti-fraude** (§8.2).
- Interface `PaymentGatewayService` + implémentation **simulée** (choix validé) : le branchement MTN MoMo / Orange Money réel se fait en implémentant l'interface, sans toucher au reste.
- `POST /api/payments/webhook` : callback provider **signé** (HMAC SHA-256, comparaison à temps constant). Correctif important : le matcher `permitAll` doit précéder `/api/payments/**` dans Spring Security (l'ordre des règles compte) — détecté et corrigé en test d'intégration.
- Validation finance : `GET|PUT /api/finance/withdrawals` (ADMIN) ; rejet → **recrédit automatique** + transaction REFUND.
- **Réconciliation quotidienne planifiée** (06:00, §8.2) : retraits PROCESSING obsolètes vérifiés auprès du provider ; écart → alerte admin + recrédit ; déclenchement manuel possible.
- Migration **V6** (`withdrawal_requests`). Frontend : page withdraw fonctionnelle (formulaire, historique, états).

**Test de bout en bout** : dépôt → retrait 50 000 (sous seuil → COMPLETED direct) → retrait 120 000 (≥ seuil → PENDING_REVIEW → validation finance → COMPLETED) → webhook sans signature ignoré, avec signature accepté.

### T2 — Google OAuth2 (CDC §5.1 / §6.1) — test différé

- `GoogleTokenVerifier` : validation **côté serveur** — signature RS256 via JWKS Google (cache 1 h), claims `iss`/`aud`/`exp`/`email_verified`.
- Deux flux : `POST /api/auth/google` (id_token, Google Identity Services) et `POST /api/auth/google/code` (**Authorization Code du CDC** : échange serveur-à-serveur, le secret ne quitte jamais le backend) + `GET /api/auth/google/url`.
- Find-or-create : compte Google sans mot de passe, `email_verified`, 2FA déléguée à Google ; un compte local existant se lie au provider.
- Migration **V7** (`password` nullable + `auth_provider`).
- Frontend : bouton Google activé, page callback `/auth/google/callback`.

**Pour activer** (test différé validé en session) : créer des identifiants OAuth dans Google Cloud Console (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`), URI de redirection autorisée : `https://<votre-domaine>/auth/google/callback`.

### T8 — Flow de restitution officiel (`feature/restitution-flow`)

Implémentation de `RetrouvIt-Flow-Restitution.md` (version de référence), mergé sur `main` et poussé (commit `79cf54f`).

**Machine d'états §25 (migration V8)**
- `ReturnStatus` réécrit : MATCH_FOUND → VERIFICATION_PENDING → VERIFIED → CONNECTION_PENDING → CHAT_ACTIVE → PROPOSAL_PENDING → PAYMENT_PENDING → ESCROW_FUNDED → MISSION_READY → MISSION_STARTED → MEETING_IN_PROGRESS → HANDOVER_PENDING → COMPLETED + sorties parallèles (REJECTED, PAYMENT_FAILED, DISPUTED, UNDER_REVIEW, RESOLVED, REFUNDED, CANCELLED).
- Conversion SQL des statuts legacy + nouvelle contrainte CHECK.
- Timeline d'audit `collaboration_events` (§24) : chaque transition est tracée avec acteur, description et métadonnées.

**Vérification de propriété §2 (migration V8)**
- Question de vérification sur `found_objects` : réponse stockée **uniquement hachée (bcrypt)**, jamais en clair ; saisie à la publication (DTO + service).
- `PropertyVerificationService` : succès → VERIFIED ; échec → compteur incrémenté ; **5 échecs → correspondance bloquée**.
- Le système de preuves (`ProofService`) reste le mode alternatif quand aucune question n'est définie.

**Paiement, mission, double confirmation (§9-19)**
- Proposition unique du Finder : montant + date + heure + lieu en une action (§6) ; contre-proposition/refus sans créer de nouveau dossier (§8).
- Paiement séquestre idempotent (anti double-débit), wallet débité, escrow créé (§9-10).
- « Commencer la mission » : transition unique, Finder simplement informé — pas de seconde validation (§12).
- Double confirmation obligatoire (remise Finder + réception Chercheur) → **libération AUTOMATIQUE des fonds** (§19) : commission lue depuis `PlatformSettings` (paramétrable back-office, jamais codée en dur), wallet Finder crédité, escrow clôturé, objets marqués RETURNED.
- Litiges (§22-23) : gel de l'escrow, arbitrage back-office avec remboursement Chercheur ou déblocage Finder selon la décision ; évaluation 1-5 étoiles avec impact trust score (§21).

**Partage de position §13/§20 (migration V9)**
- Table `collaboration_locations` (1 ligne par utilisateur/collaboration, upsert).
- **Fenêtre de confidentialité stricte** : enregistrement/lecture uniquement entre MISSION_STARTED et HANDOVER_PENDING ; refus hors fenêtre ; l'admin peut consulter (§24).
- **Purge automatique §20** : positions supprimées à la libération des fonds et au remboursement après litige + événement d'audit.
- Endpoints : `POST /api/returns/{id}/location`, `GET .../location/peer`, `GET .../location/me`.
- Frontend : composant opt-in `LocationSharingCard` — géolocalisation navigateur, polling peer 15 s, distance haversine, lien OpenStreetMap ; ne rend rien hors fenêtre.

**Vue administrateur §24**
- `GET /api/admin/collaborations` (filtrable par statut) + `GET /api/admin/collaborations/{id}`.
- Page `/admin/collaborations` : tableau, filtres, recherche, dialog à onglets **Historique | Paiement | Localisation | Messages | Preuves** (conversation liée pour arbitrage §5, preuves avec photos).

**Cohérence frontend (principe UX §27)**
- Page collaboration unique `return/[id]` : une seule action contextuelle par état, barre de progression.
- Messagerie remise en cohérence : suppression de l'ancien flow parallèle (`proposeReward`/`acceptReward`/`validate` contredisant la machine d'états) — le chat annonce et redirige vers la page collaboration, seule autoritaire.

**Bug corrigé au passage** : le compteur d'échecs de vérification §2 était annulé par le rollback de la transaction de vérification (commentaire affirmait à tort une transaction indépendante) — nouveau `VerificationAttemptService` avec `@Transactional(REQUIRES_NEW)`, incrément commité indépendamment ; contrat verrouillé par un test dédié. Même mécanisme que l'OTP (T1).

**Vérification** : 25 tests de workflow (happy path, sorties parallèles, négatifs, idempotence, commission) + 10 tests partage de position (fenêtre, masquage, purge, garde-fous) + 5 tests compteur persistant ; typecheck + build production frontend OK (`/admin/collaborations` générée).

---

## 3. Écarts assumés et points différés

| Point | Décision | Justification |
|---|---|---|
| Redis pour les OTP (CDC §3) | Stockage PostgreSQL (`otp_codes`) | Redis absent de la stack déployée ; les règles CDC (hachage, TTL 5 min, 5 essais, usage unique) sont intégralement respectées. Migration vers Redis possible plus tard en remplaçant le repository. |
| Embeddings image (matching, §14.2) | Photo identique = 30/30 | Point explicitement « ouvert à trancher » dans le CDC ; l'architecture (poids isolés dans `visualSimilarity`) permet de brancher un fournisseur sans refactor. |
| Credentials Google réels | Config prête, activation différée | Décision validée en session ; le flux complet est testé pour la dégradation propre. |
| Providers MoMo/Orange réels | Provider simulé | Décision validée en session ; interface unique à implémenter. |

## 4. État des migrations

| Version | Description |
|---|---|
| V1 | Baseline — schéma de référence (27 tables) |
| V2 | Métadonnées de session sur refresh_tokens |
| V3 | Table otp_codes (2FA) |
| V4 | Colonnes 2FA sur users |
| V5 | score_breakdown sur matches |
| V6 | withdrawal_requests |
| V7 | Google OAuth (password nullable, auth_provider) |
| V8 | Flow restitution — conversion statuts §25, question de vérification, collaboration_events |
| V9 | collaboration_locations — partage de position §13/§20 |

## 5. Ce qu'il reste hors périmètre de cette session

- **Optionnel (CDC)** : 2FA par SMS (`phone` vérifié), session management par appareil côté UI (l'API existe), export PDF/Excel des rapports admin, service email/OTP via SMTP transactionnel de production.
- **Tests E2E Playwright** (§12) et tests de charge k6 — non couverts par cette session.
- **Choix de l'hébergeur** et RTO/RPO (§14.2) — décision métier.
- **Map interactive embarquée** : le partage de position §13 affiche coordonnées + lien OpenStreetMap ; une carte Leaflet/Mapbox dans la page est une amélioration UI possible.
- **Notifications push temps réel sur transition de collaboration** : le polling 15 s du partage de position peut être remplacé par un canal WebSocket dédié.

## 6. Commandes utiles

```bash
# Backend — tests (127)
cd ReTrovix/retrouvit-api && mvn test

# Frontend — typecheck + build
cd ReTrovix/retrouvit && npx tsc --noEmit && npm run build

# Stack complète (postgres + api + web + mailhog)
docker compose up -d --build
# MailHog UI : http://localhost:8025 · Swagger : http://localhost:8080/swagger-ui.html
```

---

*Rapport mis à jour le 26 septembre 2026 — implémentation assistée par Codebuff.*
