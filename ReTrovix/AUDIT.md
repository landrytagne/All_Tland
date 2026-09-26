# AUDIT TECHNIQUE & SÉCURITÉ — RetrouvIt

**Date : 26 septembre 2026** · Périmètre : `retrouvit-api` (Spring Boot 3.3/Java 21), `retrouvit` (Next.js), infra Docker, CI · Confrontation au cahier des charges et à `RetrouvIt-Flow-Restitution.md`

---

## 1. Verdict global

> **⚠️ NON PRÊT POUR LA PRODUCTION.** Le produit est fonctionnellement très complet (flow de restitution validé E2E à 100 % — 38/38, 127 tests verts), mais **2 vulnérabilités critiques**, **1 majeure**, plusieurs lacunes de robustesse (concurrence, rate limiting) et d'exploitation (backups, monitoring) l'interdisent en l'état.

**L'inventaire** : 29 contrôleurs, 40 services, 52 entités, 31 repositories, 9 migrations Flyway, 67 pages frontend, 127 tests backend. Tous les flux majeurs du CDC existent : auth (OTP 2FA, Google OAuth, sessions), matching, restitution complète (escrow/mission/confirmation/litiges/évaluations), wallet/paiements/retraits avec validation finance, certifications, admin back-office étendu, notifications WebSocket, modération, signalements, anti-contournement (code présent).

---

## 2. 🔴 Critique — à corriger AVANT tout déploiement

### C1. Escalade de privilèges ADMIN par n'importe qui (confirmée par test réel)
`POST /api/users` est **public** (`permitAll`) et `UserService.register()` accepte `"role":"ADMIN"` du client. Test effectué sur la stack locale :

```bash
curl -X POST /api/users -d '{"name":"Hack Test","email":"...","password":"...","role":"ADMIN"}'
# → {"id":19,"role":"ADMIN",...}  — compte admin actif (enabled=true) créé anonymement
```

L'attaquant contrôle l'email fourni → reçoit le code OTP → obtient des tokens **ADMIN** → accès total : `/api/admin/**`, `/api/finance/**` (validation des retraits !), `/api/returns/{id}/resolve-dispute` (arbitrage des litiges et des fonds !).

**Correctif** : forcer `Role.USER` dans `register()` (ignorer `request.getRole()`), et/ou exiger le rôle admin pour créer un admin. Ajouter un test qui échoue si `role=ADMIN` est accepté.

### C2. Arbitrage des litiges accessible aux utilisateurs
`POST /api/returns/{id}/resolve-dispute` (ReturnRequestController) est sous `/api/returns/**` = n'importe quel utilisateur **authentifié** peut trancher un litige et déclencher remboursement ou déblocage des fonds. Le doublon admin existe (`/api/admin/disputes/{id}/resolve`) mais la porte non protégée aussi.

**Correctif** : supprimer l'endpoint de `ReturnRequestController` (le garder admin-only dans AdminController) ou ajouter `@PreAuthorize("hasRole('ADMIN')")`.

### C3 (majeur, proche critique). Tokens de reset password en clair dans les logs
`UserService` ligne 288 : `log.info("Password reset token for {}: {}", email, token)` — le jeton permettant de changer le mot de passe de n'importe quel compte finit dans les logs (Sentry est branché). `POST /api/auth/forgot-password` est public.

**Correctif** : supprimer ce log ; le flux email existe déjà (EmailService).

---

## 3. 🟠 Majeur

| # | Constat | Impact | Recommandation |
|---|---|---|---|
| M1 | **Aucun rate limiting** (pas de Bucket4j/filtre) sur endpoints publics : login, OTP request, forgot-password, register | Brute-force mots de passe, bombing email, énumération | Rate limit par IP+email (5/min OTP, 10/min login), réponse 429 |
| M2 | **Pas de verrouillage de compte** après N échecs de login (contrairement aux OTP : 5 essais ✓) | Brute-force illimité d'un compte | Compteur d'échecs + verrouillage temporaire |
| M3 | **CORS hardcodé** : `setAllowedOrigins` scanne les interfaces réseau et ajoute toutes les IPs LAN ; pas d'env `ALLOWED_ORIGINS` | Config non contrôlable en prod ; origine LAN arbitraire autorisée | Lire les origines depuis l'env, retirer le scan réseau, `allowCredentials(true)` exige des origines explicites |
| M4 | **Pas de verrou de concurrence** sur les opérations money : aucun `@Version` (optimiste), aucun `@Lock(PESSIMISTIC)`, aucun `UPDATE ... WHERE balance >= X` | Deux paiements/retraits simultanés peuvent passer des vérifications de solde et produire un solde négatif | `@Version` sur User/Escrow ou débit atomique en base (`UPDATE users SET wallet_balance = wallet_balance - ? WHERE id=? AND wallet_balance >= ?` et vérifier rows affected) |
| M5 | **Webhook paiement : le dispatcher est un TODO** — signature vérifiée ✓ mais le payload n'est traité par aucun service (`log.info` puis `received`) | Les callbacks réels MoMo/Orange ne mettront à jour aucune transaction | Implémenter le dispatch `payment.success` / `withdrawal.completed` avant le branchement provider réel |
| M6 | **Secrets par défaut committés** : `JWT_SECRET` par défaut dans compose (décodable), `payment.webhook-secret: retrouvit-webhook-secret` en dur, DB postgres/postgres | Prod démarrée sans env = secrets connus de tous | Échouer au boot si secret par défaut détecté en profil prod ; secrets via env/vault |
| M7 | **Dépôt wallet sans paiement réel** : `POST /api/wallet/deposit` crédite directement (la passerelle est simulée) — assumé en session, mais tout l'escrow repose dessus | Toute l'économie est simulée | Brancher `PaymentGatewayService` (l'interface existe) avant lancement réel |

---

## 4. 🟡 Mineur / qualité

| # | Constat | Recommandation |
|---|---|---|
| m1 | Aucune validation Bean sur les contrôleurs qui prennent `Map<String,Object>` (ReturnRequestController notamment) : types et champs non contraints | DTOs typés avec `@Valid` |
| m2 | Utilisateurs **bannis** : `banned=true` est bloqué nulle part au login ni dans le filtre JWT (l'otp/verify vérifie `enabled` mais pas `banned`) ; seule la page frontend `auth/banned` existe | Refuser login/OTP si `banned` ; rejeter les tokens en filtro |
| m3 | `MessageService.getConversation()` ne vérifie pas l'appartenance : un utilisateur authentifié peut **lire une conversation quelconque** en devinant l'id | Vérifier user1/user2 avant réponse |
| m4 | `AntiCircumventionService` (détection contournement paiement) **n'est appelé nulle part** — code mort | Brancher sur l'envoi de messages |
| m5 | Aucun index secondaire en migration (V1 généré sans index hors PK/FK implicites) ; `transactions(user_id)`, `messages(conversation_id, created_at)` vont scanner en grand volume | Index couvrants sur tables chaudes |
| m6 | Swagger exposé sans auth par défaut (`/api-docs`, `/swagger-ui` `permitAll`) | Désactiver en prod (`springdoc.api-docs.enabled=false`) |
| m7 | Pas d'endpoint RGPD : export des données ni suppression de compte/anonymisation | `GET /api/users/me/export` + `DELETE /api/users/me` |
| m8 | Taille max upload 10 MB contrôlée par type/extension ✓ mais pas par magic bytes ; `REPLACE_EXISTING` sans danger (nom généré) | Vérifier l'en-tête magique si besoin durci |
| m9 | `baseline-on-migrate: true` masque les écarts de schéma sur bases pré-existantes | Documenter la procédure prod (base toujours créée par Flyway) |
| m10 | Warnings Lombok `@Builder.Default` ignorés (Meeting.status, Proof.additionalInfoRequests…) : valeurs par défaut silencieusement nulles via builder | Ajouter `@Builder.Default` |
| m11 | Frontend : access+refresh tokens en `localStorage` (XSS exfiltrable) — 0 `dangerouslySetInnerHTML` ✓, guards admin présents ✓, mais accepter le risque ou passer en cookie httpOnly | Cookie httpOnly + CSRF, ou CSP stricte |
| m12 | Pas de pagination visible sur plusieurs endpoints de listes (collaborations admin renvoie `findAll()`) | `Pageable` partout |

---

## 5. Ce qui est solide (confirmé)

- **Machine d'états §25** : complète, contrainte CHECK en base, timeline d'audit tracée, E2E 38/38 (vérification propriété avec bcrypt et 5 essais, contre-proposition, séquestre idempotent, double confirmation, libération auto avec commission **lue de PlatformSettings**, purge positions §20, litiges, avis).
- **OTP 2FA** : haché bcrypt, TTL 5 min, usage unique, 5 tentatives **persistantes** (REQUIRES_NEW, bug corrigé), anti-énumération.
- **Refresh tokens** : rotation + révocation de tous les tokens en cas de **reuse détecté** ; refresh refusé utilisé comme access.
- **Webhook** : signature HMAC comparée à temps constant, ordre des matchers correct.
- **Flyway** : baseline + validate, V1→V9 appliquées proprement sur base vierge (vérifié).
- **CI** : tests et typecheck bloquants, concurrence, artifacts.
- **Uploads** : type + extension whitelistés, noms générés, tailles bornées.
- **Anti-enumeration** sur OTP request ; frontend sans XSS par innerHTML ; guards admin côté client.

---

## 6. Exploitation / infra / scalabilité

| Domaine | État | Action |
|---|---|---|
| TLS/HTTPS | Non configuré (compose expose HTTP) | Reverse proxy (Caddy/Nginx) + HSTS avant prod |
| Backups | **Aucun** (pas de pg_dump planifié) | Cron `pg_dump` chiffré + test de restauration — **bloquant prod** |
| Monitoring | Sentry présent ✓ ; pas d'actuator/healthcheck API dans le compose (healthcheck DB ✓) | `spring-boot-starter-actuator` + healthchecks compose |
| Scalabilité API | Stateless ✓ (JWT) → scale-out possible ; mais WebSocket STOMP en mémoire et rate limiting absent | Sticky sessions/SIFS ou broker externe (Redis) si multi-instances |
| DB | Pas d'index secondaires (m5), pas de pool tuning, pas de read replica | Index d'abord |
| Redis | Absent (assumé : OTP/limites en PG) | Acceptable au volume actuel ; revisiter à l'échelle |
| File storage | Disque local (volume `uploads`) | S3/MinIO si multi-instances |
| CI/CD | CI ✓ ; deploys par SSH conditionnels (secrets requis) | Compléter les secrets de déploiement |
| Ressources | Pas de limites mémoire/CPU sur les conteneurs | Ajouter des `deploy.resources` |

---

## 7. Couverture CDC vs réalisé (critères d'acceptation)

| Domaine CDC | Statut |
|---|---|
| §5.1 Auth (OTP 2FA, Google OAuth, sessions par appareil) | ✅ Implémenté (Google : config prête, credentials à activer) |
| §5.4/§8 Paiements, escrow, retraits, réconciliation, validation finance | ✅ Implémenté (provider **simulé** ; webhook dispatcher TODO M5) |
| §6.2/§7 Matching (poids 35/20/15/30, seuil 80 %, badge 90 %) | ✅ Implémenté + 13 tests |
| §4.2/§6.2 Vérification propriété (question + preuves) | ✅ Implémenté (bcrypt, 5 essais) |
| Flow restitution §1-§27 (machine d'états, escrow, position, litiges, avis) | ✅ **Validé E2E 38/38** |
| Back-office (users, transactions, litiges, modération, analytics, paramètres) | ✅ Implémenté (page collaborations §24 incluse) |
| §12 Tests E2E Playwright, tests de charge k6 | ❌ Absents (scénario bash E2E existe, non intégré CI) |
| RGPD (export, suppression) | ❌ Absent (m7) |
| §14 Hébergement/RTO-RPO | ❌ Décision métier + backups (bloquant) |

---

## 8. Plan d'action priorisé

1. **Aujourd'hui** : C1 (forcer USER à l'inscription + test), C2 (fermer resolve-dispute), C3 (supprimer le log du reset token) — ~1 h, fait sur branche dédiée.
2. **Cette semaine** : M1 rate limiting, M2 verrouillage compte, M4 verrous de concurrence sur wallet/escrow, M6 secrets (fail-fast), m2 bannis, m3 conversation.
3. **Avant prod** : M5 dispatcher webhook, M7 branchement provider réel (ou assumer l'économie simulée), backups automatiques + restauration testée, TLS, actuator, désactiver Swagger prod.
4. **Ensuite** : Playwright/k6, RGPD, index DB, MinIO, broker WS, pagination systématique.

---

*Audit réalisé par analyse statique du code + tests dynamiques sur la stack Docker locale (dont tentative d'escalade de privilèges — réussie — et nettoyage des comptes de test créés).*
