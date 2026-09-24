# CAHIER DES CHARGES TECHNIQUE — RetrouvIt

**Spécifications techniques d'architecture, de données, d'API et de déploiement**

Version 1.0 — Juillet 2026
Document confidentiel — usage interne et prestataires techniques

---

## Sommaire

1. [Introduction et objectifs techniques](#1-introduction-et-objectifs-techniques)
2. [Architecture globale du système](#2-architecture-globale-du-système)
3. [Stack technique détaillée](#3-stack-technique-détaillée)
4. [Modèle de données](#4-modèle-de-données)
5. [Spécification des API (endpoints REST)](#5-spécification-des-api-endpoints-rest)
6. [Sécurité technique](#6-sécurité-technique)
7. [Service de correspondance (matching)](#7-service-de-correspondance-matching)
8. [Paiement, séquestre (escrow) et workflow financier](#8-paiement-séquestre-escrow-et-workflow-financier)
9. [Messagerie temps réel et géolocalisation](#9-messagerie-temps-réel-et-géolocalisation)
10. [Infrastructure et déploiement](#10-infrastructure-et-déploiement)
11. [Structure des dépôts de code](#11-structure-des-dépôts-de-code)
12. [Stratégie de tests et qualité](#12-stratégie-de-tests-et-qualité)
13. [Observabilité, sauvegarde et plan de reprise](#13-observabilité-sauvegarde-et-plan-de-reprise)
14. [Annexes techniques](#14-annexes-techniques)

---

## 1. Introduction et objectifs techniques

Ce document complète le cahier des charges fonctionnel en précisant les choix d'architecture, le modèle de données, les contrats d'API, les mécanismes de sécurité et les modalités de déploiement de la plateforme RetrouvIt. Il constitue la référence technique pour l'équipe de développement et pour tout prestataire amené à intervenir sur le projet.

### 1.1 Objectifs

- Fournir une architecture modulaire, sécurisée et évolutive, capable de supporter la montée en charge.
- Garantir l'intégrité des transactions financières (séquestre) et la protection des données personnelles.
- Permettre un déploiement continu (CI/CD) fiable, avec un environnement de production stable dès la phase 1.
- Faciliter la maintenance et l'ajout de nouveaux modules (partenaires, gamification, IA) sans refonte majeure.

### 1.2 Principes directeurs

- Architecture en couches (hexagonale) côté backend, séparant domaine métier, application et infrastructure.
- API REST versionnée, documentée (OpenAPI/Swagger), contractuelle entre frontend et backend.
- Sécurité par défaut : aucun endpoint sensible sans authentification, chiffrement systématique des données sensibles.
- Séparation stricte des environnements (développement, recette, production).

---

## 2. Architecture globale du système

L'architecture est organisée autour de trois grands ensembles applicatifs communiquant via des API REST et WebSocket, avec une base de données relationnelle centrale et des services externes (paiement, email, stockage).

### 2.1 Vue d'ensemble des composants

```
[ Client Web / Mobile (Next.js) ]
        |  HTTPS / REST / WebSocket
        v
[ API Gateway / Backend Spring Boot ]
   |        |         |         |
   v        v         v         v
[Auth]  [Matching]  [Paiement]  [Chat/WS]
   \        |         |         /
    \_______|_________|________/
                 |
                 v
     [ PostgreSQL (base centrale) ]
                 |
     +-----------+-----------+
     |                       |
[ Service Email/OTP ]   [ Providers Paiement ]
 (SMTP transactionnel)   (MTN MoMo / Orange Money / carte)
```

### 2.2 Modules applicatifs backend

| Module | Responsabilité |
|---|---|
| `auth-service` | Inscription, connexion, 2FA par OTP email, OAuth2 Google, gestion des tokens JWT/refresh |
| `post-service` | Création, consultation, modération des publications (objets trouvés / perdus) |
| `matching-service` | Calcul du score de correspondance entre publications, déclenchement des notifications |
| `payment-service` | Initiation des paiements, gestion du séquestre, réconciliation avec les providers |
| `chat-service` | Messagerie temps réel via WebSocket, historique des conversations |
| `claim-service` | Gestion des réclamations et litiges, workflow d'arbitrage |
| `notification-service` | Envoi des notifications push/email, préférences utilisateur |
| `admin-service` | Back-office : dashboard, rapports, gestion des utilisateurs et des paramètres |

---

## 3. Stack technique détaillée

| Couche | Technologie | Version cible |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | 15.x |
| Style | TailwindCSS | 4.x |
| State management | Zustand | 5.x |
| Backend | Spring Boot | 3.5.x |
| Sécurité backend | Spring Security | 6.x |
| Base de données | PostgreSQL | 16.x |
| Migration DB | Flyway | 10.x |
| Cache | Redis (sessions OTP, cache matching) | 7.x |
| Temps réel | WebSocket / STOMP (Spring) | — |
| Authentification | JWT (access + refresh) + OAuth2 Google + OTP email | — |
| Conteneurisation | Docker / Docker Compose | — |
| CI/CD | GitHub Actions | — |
| Monitoring | Prometheus + Grafana (ou solution cloud équivalente) | — |

---

## 4. Modèle de données

Les entités ci-dessous constituent le socle du modèle relationnel. Chaque entité est présentée avec ses attributs principaux ; les clés étrangères et index secondaires seront affinés lors de la modélisation détaillée (diagramme entité-association).

### 4.1 User

| Attribut | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| fullName | String | Nom complet |
| email | String (unique) | Adresse email |
| phone | String | Numéro de téléphone vérifié par SMS |
| passwordHash | String | Haché (bcrypt/argon2), null si compte Google |
| authProvider | Enum | LOCAL / GOOGLE |
| twoFactorEnabled | Boolean | 2FA activée (true par défaut pour LOCAL) |
| trustScore | Integer | Score de confiance calculé |
| badgeLevel | Enum | BRONZE / ARGENT / OR / BON_SAMARITAIN |
| walletBalance | Decimal | Solde disponible (gains finder) |
| role | Enum | USER / MODERATOR / FINANCE / SUPERADMIN |
| status | Enum | ACTIVE / SUSPENDED / BANNED |
| createdAt / updatedAt | Timestamp | Traçabilité |

### 4.2 Post

| Attribut | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| authorId | UUID (FK User) | Auteur de la publication |
| type | Enum | FOUND / LOST |
| category | Enum | Catégorie normalisée de l'objet |
| title / description | String / Text | Contenu de la publication |
| photos | List<String> | URLs de stockage des photos |
| locationLat / locationLng | Decimal | Coordonnées géographiques approximatives |
| eventDate | Date | Date de perte ou de découverte |
| verificationQuestion | String | Question de vérification (posts FOUND uniquement) |
| verificationAnswerHash | String | Réponse hachée, jamais exposée en clair |
| estimatedValue | Decimal | Valeur estimée (posts LOST) |
| rewardAmount | Decimal | Montant de récompense proposé ou négocié |
| status | Enum | ACTIVE / IN_NEGOTIATION / RESOLVED / ARCHIVED |
| createdAt / updatedAt | Timestamp | Traçabilité |

### 4.3 Match

| Attribut | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| lostPostId / foundPostId | UUID (FK Post) | Publications concernées |
| score | Decimal (0-100) | Score de correspondance calculé |
| scoreBreakdown | JSON | Détail par critère (catégorie, texte, géo, image) |
| status | Enum | PENDING / NOTIFIED / CONFIRMED / REJECTED |
| createdAt | Timestamp | Date de calcul |

### 4.4 Transaction

| Attribut | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| payerId / payeeId | UUID (FK User) | Chercheur (payeur) / Finder (bénéficiaire) |
| postId | UUID (FK Post) | Publication concernée |
| amount | Decimal | Montant payé par le chercheur |
| platformFee / finderShare | Decimal | Répartition de la commission |
| paymentMethod | Enum | MOMO / ORANGE_MONEY / CARD |
| escrowStatus | Enum | HELD / RELEASED / REFUNDED |
| providerReference | String | Référence de transaction du provider de paiement |
| createdAt / releasedAt | Timestamp | Traçabilité du cycle de vie du paiement |

### 4.5 Autres entités

- **Conversation / Message** : `conversationId`, `matchId`, `senderId`, `content`, `sentAt`, `sharedLocation`.
- **Claim** : `id`, `transactionId`, `raisedBy`, `reason`, `evidenceUrls`, `status` (OPEN / IN_REVIEW / RESOLVED / REFUNDED), `resolvedBy`, `resolutionNote`.
- **Notification** : `id`, `userId`, `type`, `payload`, `read`, `createdAt`.
- **Referral** : `id`, `referrerId`, `refereeId`, `bonusAmount`, `status`.
- **PartnerAccount** : `id`, `organizationName`, `apiKey`, `bulkImportEnabled`.

---

## 5. Spécification des API (endpoints REST)

Toutes les routes sont préfixées par `/api/v1`. Les routes marquées 🔒 nécessitent un token JWT valide ; celles marquées 🔒🔒 nécessitent en plus un rôle administrateur.

### 5.1 Authentification

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Inscription par email (déclenche l'envoi du code OTP) |
| POST | `/auth/verify-otp` | Validation du code OTP (2FA) et émission des tokens |
| POST | `/auth/login` | Connexion par email/mot de passe (déclenche un nouvel OTP) |
| POST | `/auth/google` | Connexion / inscription via Google OAuth2 |
| POST | `/auth/refresh-token` | Renouvellement du token d'accès via refresh token |
| POST | `/auth/forgot-password` | Demande de réinitialisation de mot de passe |
| POST | `/auth/reset-password` | Réinitialisation via lien à usage unique |
| GET | `/auth/sessions` 🔒 | Liste des sessions/appareils actifs de l'utilisateur |

### 5.2 Publications

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/posts` | Liste paginée des publications (filtres catégorie, zone, date) |
| GET | `/posts/{id}` | Détail d'une publication |
| POST | `/posts` 🔒 | Création d'une publication (FOUND ou LOST) |
| PUT | `/posts/{id}` 🔒 | Mise à jour d'une publication (auteur uniquement) |
| DELETE | `/posts/{id}` 🔒 | Suppression / archivage d'une publication |
| POST | `/posts/{id}/verify` 🔒 | Soumission de la réponse à la question de vérification |

### 5.3 Correspondance (matching)

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/matches/me` 🔒 | Correspondances de l'utilisateur avec score ≥ 80 % |
| GET | `/matches/{id}` 🔒 | Détail d'une correspondance et de son score |
| POST | `/matches/recompute` 🔒🔒 | Recalcul manuel du matching (usage admin/debug) |

### 5.4 Paiement

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/payments/initiate` 🔒 | Initialisation d'un paiement en séquestre pour un match |
| POST | `/payments/webhook` | Webhook de confirmation du provider de paiement |
| POST | `/payments/{id}/release` 🔒 | Confirmation de restitution et déblocage des fonds |
| POST | `/payments/{id}/refund` 🔒🔒 | Remboursement suite à un litige tranché |
| GET | `/wallet/me` 🔒 | Solde et historique des gains de l'utilisateur |
| POST | `/wallet/withdraw` 🔒 | Demande de retrait vers Mobile Money |

### 5.5 Messagerie

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/conversations/{matchId}` 🔒 | Historique des messages d'une conversation |
| POST | `/conversations/{matchId}/messages` 🔒 | Envoi d'un message (fallback REST du WebSocket) |
| WS | `/ws/chat` | Canal temps réel (STOMP) pour l'échange de messages |

### 5.6 Réclamations

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/claims` 🔒 | Ouverture d'une réclamation liée à une transaction |
| GET | `/claims/me` 🔒 | Liste des réclamations de l'utilisateur |
| GET | `/claims` 🔒🔒 | Liste de toutes les réclamations (back-office) |
| PUT | `/claims/{id}/resolve` 🔒🔒 | Résolution d'une réclamation par un administrateur |

### 5.7 Back-office / Administration

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/admin/dashboard` 🔒🔒 | Indicateurs synthétiques temps réel |
| GET | `/admin/users` 🔒🔒 | Liste et recherche des utilisateurs |
| PUT | `/admin/users/{id}/status` 🔒🔒 | Suspension / bannissement d'un utilisateur |
| GET | `/admin/reports` 🔒🔒 | Génération de rapports (filtres période/zone) |
| GET | `/admin/reports/export` 🔒🔒 | Export PDF/Excel d'un rapport |
| PUT | `/admin/settings` 🔒🔒 | Mise à jour des paramètres (seuils, commissions) |

---

## 6. Sécurité technique

### 6.1 Authentification et 2FA

- Mot de passe haché avec bcrypt (coût 12) ou argon2id.
- Code OTP à 6 chiffres, généré aléatoirement, stocké en cache Redis avec expiration de 5 minutes, à usage unique.
- Limitation du nombre de tentatives de saisie de l'OTP (5 max, verrouillage temporaire au-delà).
- Token JWT d'accès à courte durée de vie (15 min), refresh token à durée plus longue (7 jours), rotation à chaque utilisation.
- OAuth2 Google via le flux Authorization Code, validation du token côté serveur avant émission des JWT internes.

### 6.2 Protection des données

- Chiffrement en transit : HTTPS/TLS 1.2+ obligatoire sur l'ensemble des échanges.
- Réponses aux questions de vérification stockées uniquement sous forme hachée, jamais en clair, jamais transmises au frontend.
- Aucune donnée de carte bancaire stockée : délégation intégrale au provider de paiement (tokenisation, conformité PCI-DSS).
- Anonymisation des données de localisation tant que la mise en relation n'est pas confirmée (affichage d'une zone approximative uniquement).

### 6.3 Contrôle d'accès

- Autorisations basées sur les rôles (RBAC) : USER, MODERATOR, FINANCE, SUPERADMIN.
- Vérification systématique de la propriété des ressources (un utilisateur ne peut modifier que ses propres publications).
- Journalisation de toutes les actions sensibles côté back-office (qui a fait quoi, quand), à des fins d'audit.

---

## 7. Service de correspondance (matching)

Le service de matching s'exécute de manière asynchrone à chaque création ou mise à jour de publication. Il compare la nouvelle publication à l'ensemble des publications actives du type opposé et produit un score pondéré.

### 7.1 Pondération proposée

| Critère | Poids indicatif | Méthode |
|---|---|---|
| Catégorie | Éliminatoire | Doit correspondre exactement, sinon score = 0 |
| Similarité texte (description) | 35 % | Embeddings sémantiques + similarité cosinus |
| Proximité géographique | 20 % | Distance haversine entre les points déclarés |
| Proximité temporelle | 15 % | Écart de jours entre date de perte et de découverte |
| Similarité visuelle | 30 % | Comparaison d'embeddings image, si photos disponibles |

### 7.2 Traitement des résultats

- Score ≥ 80 % : création d'une entité Match (statut PENDING) et déclenchement d'une notification au chercheur.
- Score ≥ 90 % : badge « Correspondance forte » affiché en priorité dans l'onglet dédié.
- Le score n'ouvre jamais un accès direct aux coordonnées du finder : seule la validation de la question de vérification (section 5.2) déverrouille l'étape de paiement.
- Recalcul déclenché à chaque nouvelle publication ou modification significative (photo ajoutée, description modifiée).

---

## 8. Paiement, séquestre (escrow) et workflow financier

### 8.1 Cycle de vie d'une transaction

```
1. Chercheur valide la question de vérification du post FOUND
2. POST /payments/initiate -> statut escrowStatus = HELD
3. Redirection vers le provider (MoMo / Orange Money / carte)
4. Webhook provider -> confirmation du paiement (fonds bloqués)
5. Ouverture du chat (chat-service) entre chercheur et finder
6. Remise physique de l'objet, confirmation des deux parties
7. POST /payments/{id}/release -> escrowStatus = RELEASED
8. Crédit du wallet du finder (finderShare) + commission plateforme

En cas de litige : POST /claims -> arbitrage back-office
-> POST /payments/{id}/refund -> escrowStatus = REFUNDED
```

### 8.2 Règles de gestion

- Le montant de la commission plateforme et la part reversée au finder (≈ 10 %) sont paramétrables depuis le back-office (table de configuration, pas de valeur codée en dur).
- Tout retrait supérieur à un seuil défini déclenche une validation manuelle côté finance (anti-fraude).
- Réconciliation quotidienne automatisée entre les transactions internes et les relevés des providers de paiement.

---

## 9. Messagerie temps réel et géolocalisation

- Connexion WebSocket authentifiée par JWT, un canal STOMP par conversation (identifiée par le `matchId`).
- Persistance de chaque message en base pour permettre l'historique et l'usage en cas de réclamation.
- Partage de position : envoi de coordonnées GPS via un type de message dédié (LOCATION), affichage sur carte côté client.
- Fermeture automatique du canal après confirmation de remise ou expiration du délai réglementaire (ex. 14 jours d'inactivité).

---

## 10. Infrastructure et déploiement

### 10.1 Environnements

| Environnement | Objectif | Déploiement |
|---|---|---|
| Développement | Développement local des fonctionnalités | Docker Compose local |
| Recette (staging) | Validation fonctionnelle avant mise en production | Déploiement automatique sur push vers la branche `develop` |
| Production | Environnement utilisateur final | Déploiement manuel validé sur push vers la branche `main` |

### 10.2 CI/CD

- Pipeline GitHub Actions : build, tests unitaires, analyse de qualité de code, build des images Docker, déploiement.
- Migrations de base de données appliquées automatiquement via Flyway à chaque déploiement.
- Variables sensibles (clés API, secrets JWT, identifiants providers) gérées via un gestionnaire de secrets, jamais commitées.

### 10.3 Variables d'environnement principales

```
DATABASE_URL, DATABASE_USER, DATABASE_PASSWORD
JWT_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION
GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
MOMO_API_KEY, ORANGE_MONEY_API_KEY, CARD_PROVIDER_KEY
REDIS_URL
STORAGE_BUCKET_URL, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY
```

---

## 11. Structure des dépôts de code

### 11.1 Backend (Spring Boot — architecture hexagonale)

```
src/main/java/com/retrouvit/
  domain/           (entités métier, règles de gestion pures)
  application/       (cas d'usage, services applicatifs)
  infrastructure/
    persistence/     (repositories JPA, mapping)
    security/        (JWT, OAuth2, filtres)
    payment/         (intégration MoMo, Orange Money, carte)
    web/             (contrôleurs REST, WebSocket)
  config/            (configuration Spring)
resources/
  db/migration/      (scripts Flyway V1__..., V2__...)
  application.yml
```

### 11.2 Frontend (Next.js)

```
app/
  (auth)/            (inscription, connexion, OTP)
  (main)/feed/        (fil d'actualité, filtres)
  (main)/posts/[id]/  (détail publication, vérification, paiement)
  (main)/chat/[matchId]/ (messagerie temps réel)
  (main)/profile/     (profil, wallet, badges)
  admin/              (back-office : dashboard, utilisateurs, rapports)
components/           (composants réutilisables, design system)
lib/                  (client API, hooks, stores Zustand)
```

---

## 12. Stratégie de tests et qualité

| Type de test | Portée | Outils suggérés |
|---|---|---|
| Tests unitaires | Logique métier (domain/application), calcul du score de matching | JUnit 5, Mockito / Jest, Vitest |
| Tests d'intégration | Contrôleurs REST, persistance, sécurité | Spring Boot Test, Testcontainers (PostgreSQL) |
| Tests end-to-end | Parcours critiques (inscription, paiement, chat) | Playwright ou Cypress |
| Tests de charge | Fil d'actualité, service de matching sous forte volumétrie | k6 ou Gatling |
| Tests de sécurité | Injection, contrôle d'accès, gestion des tokens | OWASP ZAP, revue de code dédiée |

---

## 13. Observabilité, sauvegarde et plan de reprise

- Centralisation des logs applicatifs (backend, matching, paiement) avec corrélation par identifiant de requête.
- Tableaux de bord de supervision (temps de réponse API, taux d'erreur, latence du service de matching).
- Alerting automatique en cas d'anomalie critique (échec de paiement en masse, indisponibilité d'un provider).
- Sauvegardes automatiques quotidiennes de la base de données, conservées 30 jours, avec test de restauration périodique.
- Plan de reprise d'activité documenté : objectif de temps de reprise (RTO) et de perte de données maximale tolérée (RPO) à définir avec l'hébergeur retenu.

---

## 14. Annexes techniques

### 14.1 Glossaire technique

- **JWT** : JSON Web Token, jeton signé utilisé pour authentifier les requêtes.
- **Escrow** : mécanisme de séquestre bloquant les fonds jusqu'à confirmation de la transaction.
- **RBAC** : Role-Based Access Control, contrôle d'accès basé sur les rôles.
- **Webhook** : notification HTTP envoyée par un service tiers (provider de paiement) vers le backend.
- **STOMP** : protocole de messagerie utilisé au-dessus de WebSocket pour la messagerie temps réel.

### 14.2 Points ouverts à trancher avant développement

- Choix définitif de l'hébergeur cloud et de la région de déploiement.
- Choix du fournisseur d'embeddings pour la similarité texte/image du service de matching.
- Validation juridique des CGU concernant le mécanisme de récompense et de commission.
- Seuils définitifs de commission, de retrait et de score de correspondance (actuellement des valeurs indicatives, paramétrables).
