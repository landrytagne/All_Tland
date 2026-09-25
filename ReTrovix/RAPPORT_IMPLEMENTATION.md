# RAPPORT D'IMPLÉMENTATION — RetrouvIt

**Mise en conformité avec le cahier des charges technique v1.0 (Juillet 2026)**

Date : 25 septembre 2026 · Projet : `ReTrovix/` (repo `All_Tland`, branche `main`)

---

## 1. Résumé exécutif

Six chantiers ont été livrés, chacun sur sa branche, vérifié (tests + build + test d'intégration), mergé sur `main` et poussé. Le projet passe de **91 à 99 tests unitaires verts**, dispose désormais de **7 migrations Flyway** et couvre l'intégralité des écarts identifiés au départ, hormis les points explicitement différés (embeddings image, credentials Google réels, providers MoMo/Orange réels).

| Tâche | Branche | Statut | Vérification |
|---|---|---|---|
| T7 — CI durcie | `feature/ci-hardening` | ✅ Mergé + poussé | Pipeline bloquante |
| T6 — Flyway baseline | `feature/flyway-baseline` | ✅ Mergé + poussé | Boot base vierge + base existante |
| T5 — GET /auth/sessions | `feature/auth-sessions` | ✅ Mergé + poussé | Test HTTP bout-en-bout |
| T1 — OTP 2FA email | `feature/otp-two-factor` | ✅ Mergé + poussé | Cycle complet via MailHog |
| T3 — Matching CDC | `feature/matching-cdc` | ✅ Mergé + poussé | 13 tests moteur |
| T4 — Paiements & wallet | `feature/payments-wallet` | ✅ Mergé + poussé | Retrait + validation finance via HTTP |
| T2 — Google OAuth2 | `feature/google-oauth` | ✅ Mergé + poussé | Rejet propre sans credentials |

**Vérification finale globale** : 99/99 tests verts · typecheck + build production frontend OK · boot complet sur base vierge avec V1→V7 appliquées · Swagger accessible.

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

## 5. Ce qu'il reste hors périmètre de cette session

- **Optionnel (CDC)** : 2FA par SMS (`phone` vérifié), session management par appareil côté UI (l'API existe), export PDF/Excel des rapports admin, service email/OTP via SMTP transactionnel de production.
- **Tests E2E Playwright** (§12) et tests de charge k6 — non couverts par cette session.
- **Choix de l'hébergeur** et RTO/RPO (§14.2) — décision métier.

## 6. Commandes utiles

```bash
# Backend — tests (99)
cd ReTrovix/retrouvit-api && mvn test

# Frontend — typecheck + build
cd ReTrovix/retrouvit && npx tsc --noEmit && npm run build

# Stack complète (postgres + api + web + mailhog)
docker compose up -d --build
# MailHog UI : http://localhost:8025 · Swagger : http://localhost:8080/swagger-ui.html
```

---

*Rapport généré le 25 septembre 2026 — implémentation assistée par Codebuff.*
