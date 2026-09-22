# Plan d'implémentation — Système de Gestion de Stock (SGS)

> **Document vivant** — mis à jour à chaque jalon (PHASE 8 du process).
> **Version 2.22 — 22 septembre 2026** — chantier 3 livré : catalogue et déclencheurs de notifications M15 complets (§38).
> Historique : v1.0 (audit initial + plan) → v1.1–v1.4 (décisions Q1–Q3, jalons J0/J1/J5a) → v2.0 (revue + questions Q4–Q6) → v2.1–v2.7 (R1–R6b livrés) → v2.8 (revue du 2026-09-20, questions Q7–Q8) → v2.9 (revue du 2026-09-21 : fusion amont découverte stagée) → v2.21 (revue FRD ↔ code + chantiers 1–2).

---

## 1. Résumé exécutif

L'application SGS est un projet à trois composants dans ce dépôt :

| Composant | Stack | Rôle |
|---|---|---|
| `gestion_stock_backend` | Java 21, Spring Boot 3, Spring Security (JWT), PostgreSQL + Flyway, MinIO, Swagger | API REST `/api/v1` — **source de vérité fonctionnelle** |
| `gestion_stock_complet` | React 18 + Vite, React Router v6, TanStack Query, Zustand, Tailwind, design system embarqué | **Frontend cible** (décision utilisateur explicite) |
| `gestion_stock_bff` | Node/Express | BFF : cookies de session, login/refresh/logout |

`gestion-stock-frontend` (Next.js) est **hors périmètre** (décision utilisateur) : conservé comme référence de travail déjà validé (palette, PhotoUploader, Personnel/RBAC).

**Constat central de l'audit** : la fondation transverse FRD (Modules 1–8 : Entrepôts, Utilisateurs, RBAC, Auth, Fournisseurs, Commandes, Catégories, Produits) est **réellement implémentée et branchée** de bout en bout. En revanche, le **cœur opérationnel de la FRD — Modules 9 à 12 (Stock multi-entrepôt, Entrées, Sorties, Alertes) — n'existe pas côté backend** (aucune entité de quantité dans tout le modèle de données ; les mouvements sont un stub renvoyant des pages vides) et les écrans frontend correspondants consomment des **données mock**. Les Modules 14–17 (Recherche, Notifications in-app, Audit, Rapports) sont absents ou stubs.

La mise en conformité exige donc un **travail backend substantiel** (entités + migrations Flyway + services transactionnels), pas uniquement du frontend — d'où la question de périmètre en section 16.

---

## 2. Évaluation de l'architecture actuelle

### 2.1 Backend (`com.sgs.stock`)
- Modules en couches `controller / dto / service / repository / entity / mapper`, exceptions communes (`BusinessException`, `ResourceNotFoundException`, `GlobalExceptionHandler`), réponse enveloppée `ApiResponse`.
- Sécurité : JWT + `@PreAuthorize` sur les endpoints ; `WarehouseContext` porte les entrepôts autorisés du JWT (isolation multi-entrepôt à la couche Services, conformément à la contrainte FRD M4).
- RBAC : `Role.scope = GLOBAL | WAREHOUSE` (+ `Role.warehouse`), permissions atomiques, overrides individuels par utilisateur (`POST/GET/DELETE /users/{id}/permissions`), `GET /rbac/effective-permissions/{userId}`.
- Persistance : Flyway (`V1…V14+`), `ddl-auto: validate`. MinIO pour les fichiers (`FileController` : photos profil et articles, bucket `sgs-uploads`).
- Docker Compose : Postgres (5433), MinIO (9010), Mailpit (8082).

### 2.2 Frontend (`gestion_stock_complet`)
- Architecture par features (`features/<domaine>/{hooks,schemas}`), services axios (`services/*`), types DTO (`types/api/*`), providers (auth, query, theme, toast, i18n fr/en, animations), design system embarqué (`_designSystem/ds-*`) surchargé par `index.css` (palette Blanc · Violet · Orange · Noir · Vert forêt + dark mode dédié — travail déjà validé).
- Convention d'honnêteté établie dans le code : les écrans sans backend utilisent `ModuleNotBuilt` plutôt que des données fabriquées (`App.tsx` l'explicite pour Rapports/Audit/Notifications/Recherche).
- Aucun test automatisé (0 fichier `*.test.*`). Scripts : `typecheck`, `lint`, `build` uniquement.

### 2.3 BFF
- Rôle strict : pose/lit le cookie de session, proxy login/refresh/logout. Le SPA appelle le backend directement pour le métier. Conforme à l'architecture existante, rien à changer.

---

## 3. Matrice de traçabilité FRD ↔ code

Légende : ✅ conforme · 🟡 partiel · ❌ absent · 🔍 à vérifier en détail pendant l'implémentation

| # | Module FRD | Backend | Frontend (Vite) | Écarts principaux |
|---|---|---|---|---|
| 1 | Utilisateurs | 🟡 | ✅ (Personnel) | CRUD + isolation entrepôt (`UserService` + `WarehouseContext`) + archivage + **provisioning mot de passe temporaire + e-mail bienvenue + `mustChangePassword`** conformes. **Manque : endpoint historique de connexion** (`LoginAttempt` existe mais n'est exposé par aucun endpoint, FRD `users:view_login_history`). Unicité e-mail/username 🔍 (contrainte DB non vue sur l'entité — vérifier les migrations). |
| 2 | RBAC | ✅ | ✅ | Rôles GLOBAL/WAREHOUSE avec portée, matrice par module (accordéons — conforme contrainte FRD), overrides individuels, permissions effectives. À vérifier : refus de suppression d'un rôle encore assigné sans réaffectation ; notification de changement de permission (dépend M15). |
| 3 | Auth & sécurité | ✅ | ✅ | Login e-mail **ou** username, mots de passe hachés, verrouillage après échecs (`failedLoginAttempts`/`lockedUntil`), forgot/reset à jeton usage unique, refresh + tokens révoqués, changement de mot de passe forcé (`mustChangePassword`). À vérifier : durée de validité du mot de passe temporaire (72 h recommandé), expiration de session configurable. |
| 4 | Entrepôts | ✅ | ✅ | CRUD + désignation gestionnaire (`PUT /{id}/manager/{userId}`) + `active`. À vérifier : blocage de suppression si stock/commandes/utilisateurs rattachés (FRD : archivage uniquement). |
| 5 | Fournisseurs | ✅ | ✅ | CRUD ; canaux e-mail/WhatsApp/téléphone (lien `wa.me` réalisé — cf. historique git). À vérifier : suppression physique refusée si référencé, fournisseur archivé non sélectionnable pour nouvelle commande mais consultable sur l'historique. |
| 6 | Commandes fournisseurs | ✅ | ✅ **(J6 terminé)** | Backend complet et **contrat vérifié le 2026-09-19** : les 10 routes de `purchase-order.service.ts` existent dans `PurchaseOrderController` (chemins identiques) ; cycle `DRAFT → … → FULLY_DELIVERED / CANCELLED`, `recomputeStatus`, historique des statuts, rejet de sur-livraison. Frontend : liste + détail + réception **réels** (non commités). **3 écarts ouverts** : (a) édition d'une commande Brouillon/En attente impossible — `PurchaseOrderFormDialog` accepte `order` (mode édition prêt) mais aucun appelant ne le passe ; (b) `canEdit` calculé sans bouton associé dans `PurchaseOrderDetail` ; (c) route `/commandes/nouvelle` sans effet. Voir §20 F3–F5. |
| 7 | Catégories | ✅ | ✅ | Hiérarchie Catégorie → Sous-catégorie → Produit (`products.subcategory_id NOT NULL`), sous-catégories gérées dans le même dialog (travail validé). À vérifier : blocage de suppression d'une catégorie non vide avec liste des dépendantes. |
| 8 | Produits | 🟡 | ✅ | CRUD + recherche + **historique des champs sensibles** (`ProductHistory` — conforme) + image MinIO + sous-catégorie dépendante. **Écart confirmé (F6)** : la table `products` (V9) porte `barcode` UNIQUE, `purchase_price`, `location`, `max_quantity`, mais **`ArticleDto` ne les expose pas** → FRD M8 non satisfaite (unicité code-barres, prix d'achat, avertissement vente à perte, seuil max, emplacement). **Bug d'affichage critique (F1)** : `ArticleFacadeService:251` renvoie `quantiteDisponible = 0` en dur → tous les produits s'affichent « Rupture ». **F7** : résolution de sous-catégorie fragile (fallback « première sous-catégorie active »). |
| 9 | **Stock multi-entrepôt** | ✅ | ✅ **(J5a livré)** | Tables `stocks` (Produit×Entrepôt) + `stock_adjustments` append-only (V19–V21, trigger PG), `StockService` transactionnel avec verrou pessimiste, isolation `WarehouseContext`, `StockController` (consultation, par entrepôt/produit, `low-stock`, `search`, ajustement tracé `STOCK_ADJUST`, historique `STOCK_VIEW_HISTORY`). Frontend `Stock.tsx` réel (filtres entrepôt + stock faible appliqués **côté serveur**, ajustement avec aperçu avant/après, historique append-only). **Reste** : `/mouvements-stock` toujours stub ; valorisation non exposée au tableau de bord. |
| 10 | **Entrées de stock** | ❌ | ⛔ (`ModuleNotBuilt`) | `PurchaseOrderService.receive` journalise `[STOCK_ENTRY_PENDING] Module 10 not yet wired`. Le module `stockentry` ne contient que `package-info.java` **dans `develop` local** ; la migration `V20__stock_entries` de la branche amont `feature/us_be_34_stock_entries` **n'est pas fusionnée** (migrations locales : V19–V21). **Bloquant pour J5b.** |
| 11 | **Sorties de stock** | ❌ | ⛔ (`ModuleNotBuilt`) | 4 types FRD (Vente/Perte/Casse/Expiration) inexistants ; `stockexit` = `package-info.java` + un `CustomerOrderController` mal rangé. Vérification de disponibilité impossible côté sortie. |
| 12 | **Alertes de stock** | ❌ | ⛔ (`ModuleNotBuilt`) | `alert` = `package-info.java`. Seuils par entrepôt partiellement présents dans `stocks` (colonne seuil d'alerte) mais aucune évaluation Faible/Critique/Rupture, aucune levée automatique. |
| 13 | Tableau de bord | ✅ | ✅ | `DashboardService` calcule sur données réelles (produits, commandes) avec isolation entrepôt ; **n'affiche pas** d'indicateurs exigeant des modules absents (« honnêteté des données » documentée). S'enrichira automatiquement avec M9/M12. |
| 14 | Recherche | ❌ | ❌ | Package `search` vide. La palette de commandes (⌘K) ne fait que de la navigation. **P2**. |
| 15 | Notifications | 🟡 | ❌ | `EmailService` existe (bienvenue, reset) ; **pas d'entité ni d'endpoint de notification in-app** ; centre de notifications non monté. **P2**. |
| 16 | Journal d'audit | ❌ | ❌ | Package `auditlog` vide. La permission `AUDIT_READ` est seedée mais aucune route. **P2** (aspects transverses à brancher progressivement dès le début, conformément FRD §29 étape 14). |
| 17 | Rapports | 🟡 stub | ❌ | `/reporting/*` renvoie zéros/listes vides/exports d'octets vides. **P3** — dépend d'un historique de mouvements réel (M9–M11). |

### Périmètre FRD hors implémentation (à traiter explicitement)
- **Commandes clients** : un `CustomerOrderController` (`/commandes-clients`) existe côté backend, sans page frontend. La FRD **exclut** la gestion des commandes clients comme module de vente complet (§0.3). → Recommandation : ne pas l'exposer ; le documenter.
- Hors périmètre confirmés par la FRD : transfert inter-entrepôts, chat fournisseur, comptabilité, EDI.

---

## 4. Fonctionnalités : complètes / partielles / manquantes

- **Complètes (vérifiées en code, plusieurs validées E2E lors des sessions précédentes)** : auth complète, Personnel + RBAC (matrice à switches, admin-only, overrides), Catégories + sous-catégories (création multi dans le même flux), Produits (sous-catégorie dépendante, photo MinIO en différé/immédiat, sans champ URL), Fournisseurs, Entrepôts, Profil, Dashboard (réel), palette/dark mode.
- **Partielles** : Commandes fournisseurs (backend ✅ / frontend mock), Notifications (e-mail seul), Rapports (stub), Utilisateurs (historique de connexion manquant).
- **Manquantes** : Stock, Entrées, Sorties, Alertes, Recherche, Audit — côté modèle de données ET côté UI réelle.

---

## 5. Constats backend

1. **Modèle de données sans stock** : `Product` ne porte aucune quantité ; aucune table `stock` ni `stock_movement` dans les migrations Flyway. Le commentaire du DTO frontend « `quantiteDisponible` est calculée par le serveur à partir des mouvements » est donc **inexact aujourd'hui** (aucun mouvement n'existe) — valeur vraisemblablement constante/0.
2. **Stub documentés, pas de fausseté** : `StockMovementController` et `ReportingController` sont des stubs assumés (TODO en tête de fichier) ; `PurchaseOrderService.receive` identifie l'extension point M10. L'équipe a choisi l'honnêteté plutôt que la simulation — à préserver.
3. **Sécurité correcte en profondeur** : `@PreAuthorize` systématique, isolation entrepôt dans les services (`WarehouseContext`), verrouillage de compte, tokens révoqués.
4. **Provisioning conforme** : génération de mot de passe temporaire + e-mail + `mustChangePassword=true` (`UserService.create`), exactly per FRD M3/scénario C.
5. 🔍 À vérifier pendant l'implémentation : unicité DB e-mail/username (migrations), collision username↔e-mail (FRD §25 edge case), refus de suppression d'entités référencées (M4/M5/M7 — un cas renvoie déjà un 500 brut au lieu d'un 409 : suppression d'une sous-catégorie référencée par un produit archivé, constaté en test).
6. Tests backend 🔍 : campagne à inventorier au démarrage du jalon backend (JUnit/Mockito exigés par la FRD sur : avancement commandes, stock disponible, déclenchement alertes).

## 6. Constats frontend (Vite)

1. **Écrans branchés réels** (hooks features/services) : Login/Forgot/Reset/ChangePassword, Dashboard, Produits, Catégories, Fournisseurs, Entrepôts, Personnel (Comptes + Rôles), Profil, dialogs Produit/Catégorie/Fournisseur/Entrepôt/Utilisateur/Rôle + `PurchaseOrderFormDialog` (réel mais **non monté**).
2. **Écrans mock** (`src/data/*`) : `Stock.tsx` (4 imports), `StockEntries.tsx` (5), `StockExits.tsx` (4), `PurchaseOrders.tsx` (3), `PurchaseOrderDetail.tsx` (4), `Alerts.tsx` (4), `ReceptionDialog`, `NewExitDialog`.
3. **Écrans honnêtement indisponibles** : Rapports, Audit, Notifications, Recherche (`ModuleNotBuilt`).
4. **Code mort identifié** (à purger prudemment, §10) : `components/dashboard/*` (5 composants non rendus), `components/charts/*` (3, recharts tree-shaké), `AnimatedNumber`, `Breadcrumb`, `Accordion`, `Timeline`/`StockGauge` (1 import chacun), doublons `use-pagination.ts`/`usePagination.ts`, pages `Users.tsx` vs `Personnel.tsx` (doublon fonctionnel).
5. **Aucun test** : la suite Jest du Next.js (65 tests, dont 12 sur `PhotoUploader`) n'a pas d'équivalent Vite.

## 7. Incohérences de contrat backend ↔ frontend

| # | Incohérence | Impact | Résolution prévue |
|---|---|---|---|
| C1 | Hooks `use-purchase-orders` + DTO réels, pages liste/détail mock | Flux commande FRD (UC scénario A) impossible en UI | Jalon « Commandes » : brancher liste/détail/réception |
| C2 | `quantiteDisponible` exposé par l'API articles sans source réelle | Valeur trompeuse | Sera corrigé par le Module 9 (champ alimenté par le stock réel) |
| C3 | Historique de connexion : entité `LoginAttempt` existante, aucun endpoint | FRD M1/M3 non satisfaite (`users:view_login_history`) | Endpoint dédié + onglet fiche Personnel |
| C4 | Suppression d'entités référencées → 500 brut (FK) au lieu de 409 métier | UX dégradée | Mapper `DataIntegrityViolationException` → `BusinessException` 409 |
| C5 | `/commandes-clients` backend sans équivalent FRD ni frontend | Flou de périmètre | Décision utilisateur (section 16, Q3) |

## 8. Constats modèle de données

- Flyway V1→V14+ bien séquencées ; `ddl-auto: validate` (toute nouvelle entité exige une migration).
- `products.subcategory_id NOT NULL` — conforme FRD M7 (produit toujours rattaché à une sous-catégorie).
- **Absents** : tables `stock` (par Produit×Entrepôt), `stock_movement` (immuable), `alert` (niveaux + levée), `notification` (in-app), `audit_log` (append-only), historique de connexion exposé.
- RBAC : `roles.scope` + `roles.warehouse_id` permettent les rôles personnalisés par entrepôt — conforme.

## 9. Constats UI/UX

- Design system cohérent (palette validée blanc/violet/orange/noir/vert forêt, dark mode dédié, i18n fr/en, animations framer discrètes).
- Pattern d'honnêteté `ModuleNotBuilt` : à conserver pour tout module backend absent.
- États loading/empty/error présents sur les pages branchées (`EmptyState` 23 usages, skeletons) ; à répliquer sur les nouveaux écrans Stock/Commandes/Alertes.
- Responsive : grille dashboard et tables avec pagination serveur — à vérifier sur les écrans reconstruits.

## 10. Dette technique et risques

| Risque | Gravité | Mitigation |
|---|---|---|
| Volume du jalon backend (M9–M12 = entités + migrations + services transactionnels + tests) | Élevée | Découpage par modules dans l'ordre FRD §29, un jalon git par module, validation à chaque étape |
| Concurrence sur le stock (FRD §26.3 : transactionnel par couple Produit×Entrepôt) | Élevée | Écriture mouvement + mise à jour stock dans **la même transaction** ; verrouillage pessimiste (`SELECT … FOR UPDATE`) sur la ligne de stock |
| Immuabilité des mouvements (FRD) | Moyenne | Pas d'UPDATE/DELETE ; correction par mouvement inverse tracé (endpoint `/correction` à redéfinir proprement) |
| Écrans mock encore visibles pendant la transition | Moyenne | Les basculer en `ModuleNotBuilt` honnête le temps du jalon backend (décision Q3) |
| Dépôt git pollué par des fichiers non liés (autres projets modifiés) | Moyenne | Commits **toujours** avec chemins explicites (`git add <paths>`), jamais `git commit -a` |
| Alertes : second seuil « Critique » configurable (FRD M12) | Faible | Paramétrage global par défaut (50 % du minimum) + surcharge par produit, documenté |
| Code mort frontend (§6.4) | Faible | Purge progressive dans les jalons concernés, jamais en mélange avec une feature |

## 11. Changements d'architecture requis

Aucun remplacement de stack. Extensions dans l'existant :
1. **Module 9 (nouveau)** : entités `StockItem` (Produit×Entrepôt : actuel, réservé, min/max surchargeables) et `StockMovement` (immuable : IN/OUT, type, quantité, motif, référence commande, auteur). Le stock actuel est **synchronisé transactionnellement** par les mouvements (recommandation, §16 Q2) tout en restant « dérivable » de la somme des mouvements — satisfait FRD §9/§23.
2. **Module 10** : brancher `PurchaseOrderService.receive` → création du mouvement IN (même transaction que la réception).
3. **Module 12** : évaluation synchrone des seuils après chaque sortie, levée après entrée (event Spring interne ou appel direct de service — reco : appel direct simple, event bus si besoin avéré).
4. **Module 16** : aspect/intercepteur d'audit sur les actions sensibles (création/modif/suppression/validation + connexions), écriture append-only.
5. Rien d'autre : pas d'Elasticsearch (M14 : requêtes SQL suffisent aux volumétries visées), pas de WebSocket (rafraîchissement à la demande, FRD laisse le choix ouvert).

## 12. Feuille de route (ordre de dépendance, aligné FRD §29)

| Jalon | Contenu | Livrables clés | Validation |
|---|---|---|---|
| **J0 — Socle** | Branche, nettoyage ciblé du code mort listé §6.4, inventory des tests backend | Branche `feature/sgs-j0-socle`, rapport d'inventaire | `tsc`, `lint`, `vite build`, `mvn compile` |
| **J1 — Module 9 Stock (backend)** | ✅ **Réalisé en amont (US-BE-031) et intégré (2026-09-18)** : tables `stocks` (Produit×Entrepôt, CHECK non-négatif, réservé ≤ actuel, seuil d'alerte) + `stock_adjustments` append-only, `StockService` transactionnel avec verrou pessimiste `SELECT…FOR UPDATE`, isolation `WarehouseContext`. Intégration locale : renumérotation V16–V18 → **V19–V21** (collision Flyway avec `V16__product_code_sequence`) + alignement des 26 assertions sur le contrat d'API déballée (`ApiResponseUnwrapper`) | `StockController` : consultation, par entrepôt/produit, stocks faibles, ajustement tracé | **310/310** `mvn test` (dont 40 stock + concurrence) |
| **J2 — Module 10 Entrées (backend)** | 🔄 **En cours en amont** (branche `feature/us_be_34_stock_entries`) — ne PAS dupliquer : coordonner avec l'équipe, revue à la fusion. Objectif inchangé : wire `PurchaseOrderService.receive` → mouvement d'entrée transactionnel (l'extension point `[STOCK_ENTRY_PENDING]` est identifié) | Idem + renumérotation éventuelle des migrations | Test intégration « commande → réception → stock » (FRD planning S4) |
| **J3 — Module 11 Sorties (backend)** | Sorties 4 types + motifs obligatoires + vérif disponible par entrepôt + mouvement OUT immuable | `StockExitController` | Tests (blocage stock insuffisant, cas limite = disponible exact → rupture, FRD §25) |
| **J4 — Module 12 Alertes (backend)** | Seuils par entrepôt, niveaux Faible/Critique/Rupture, une alerte par franchissement, levée automatique | `AlertService` + endpoints | Tests (scénario B FRD complet) |
| **J5a — Frontend Stock (consultation)** | ✅ **Terminé (2026-09-18)** — page `Stock.tsx` réelle : filtre entrepôt + stock faible (serveur), actuel/réservé/disponible calculés backend, badge d'état, ajustement tracé gardé par `STOCK_ADJUST` (aperçu avant/après, motif obligatoire), historique append-only ; pas de recherche libre (non offerte par `GET /stocks/search` — honnêteté de contrat) | `feature/sgs-j5a-stock` `a7eb626` : `Stock.tsx`, `StockAdjustDialog`, `use-stock`, `stock.service`, `stock.dto` | `tsc` ✅, eslint ✅, `vite build` ✅, smoke API 5/5 |
| **J5b — Frontend Entrées/Sorties/Alertes** | Dépend de J2–J4 : recréer les pages sur les endpoints réels (les mocks et `src/data/*` ont déjà été supprimés à J0) | Pages réécrites sur hooks réels | E2E navigateur (scénarios A/B), `tsc`, `build` |
| **J6 — Frontend Commandes fournisseurs** | Liste/détail/réception réelles (hooks existants), progression et statuts conformes | `PurchaseOrders`/`PurchaseOrderDetail` démockés | E2E cycle complet (scénario A FRD) |
| **J7 — Notifications in-app + Audit (backend+frontend)** | Entité + centre de notifications ; aspect d'audit + écran de consultation admin | M15 + M16 fonctionnels | Vérification append-only + traçabilité des actions sensibles |
| **J8 — Recherche + historique de connexions** | Endpoint recherche globale (respect permissions + entrepôt), endpoint historique + onglet fiche | M14 + complément M1/M3 | Tests permissions (jamais de résultat hors périmètre) |
| **J9 — Rapports & statistiques** | Agrégats réels (mouvements, commandes, fournisseurs, ruptures), exports PDF/Excel réels | M17 | Comparaison manuelle vs données de test |
| **J10 — Finalisation** | Audit final FRD complet, UAT scénarios A–D, README, documentation | Rapport de livraison dans ce document | Checklist §18 |

Chaque jalon : branche dédiée, commits scopés, mise à jour de ce document (PHASE 8).

## 13. Fichiers/modules likely concernés

- **Backend** : `modules/stock/**` (nouveau contenu réel), `modules/purchaseorder/service/PurchaseOrderService.receive`, `modules/alert/**`, `modules/notification/**`, `modules/auditlog/**`, `modules/search/**`, `modules/report/**`, `src/main/resources/db/migration/V15+`, `modules/auth` (endpoint historique), `modules/user` (409 sur conflits).
- **Frontend Vite** : `src/pages/{Stock,StockEntries,StockExits,Alerts,PurchaseOrders,PurchaseOrderDetail}.tsx`, `src/components/forms/{ReceptionDialog,NewExitDialog}.tsx`, `src/hooks/use-server-pagination.ts`, `src/services/stock-movement.service.ts` + nouveaux services, `src/features/*` nouveaux hooks, suppression progressive `src/data/*`, `src/components/shell/NotificationPanel.tsx` (à monter), `src/App.tsx` (routes ModuleNotBuilt → réels).

## 14. Stratégie de test et de validation

- **Backend** : JUnit + Mockito exigés par la FRD sur les trois zones à haut risque (taux d'avancement, stock disponible, déclenchement alertes) ; tests d'intégration cycle commande→réception→stock ; `mvn test` à chaque jalon backend.
- **Frontend** : `tsc --noEmit`, ESLint, `vite build` à chaque jalon ; introduction de Vitest + Testing Library (aligné sur les patterns Jest existants du Next.js) pour les hooks/composants critiques ; E2E navigateur (puppeteer-core + Chrome, méthode déjà rodée) sur les scénarios FRD A–D.
- **API réelle** : chaque contrat frontend validé par curl avant branchement (méthode établie).
- **Non vérifiable à l'avance** : performance de recherche à volumétrie réelle, SLA de disponibilité — documentés comme tels (FRD §26).

## 15. Stratégie git

- Dépôt actuel : `main` (2 commits), arbre de travail contenant des fichiers **non liés** modifiés → toute opération de commit utilisera des chemins explicites.
- Une branche par jalon : `feature/sgs-j0-socle`, `feature/sgs-j1-stock`, … fusionnées dans `main` après validation.
- Messages de commit descriptifs (quoi + pourquoi), sans mélanger feature et cleanup.

## 16. Questions bloquantes (PHASE 3)

**Q1 — Périmètre de mission : le backend est-il inclus ?**
✅ **DÉCIDÉ (utilisateur, 2026-09-18) : backend inclus.** Les modules manquants seront implémentés côté serveur dans l'ordre FRD (jalons J1→J9).
La conformité FRD exige de créer les Modules 9–12, 14–16 côté serveur (entités, migrations, services transactionnels) — c'est un chantier backend majeur, pas un habillage frontend.
*Recommandation* : oui, implémenter les modules backend manquants dans l'ordre FRD §29 (J1→J9), car c'est la seule voie vers une livraison réellement conforme. *Alternative* : se limiter au frontend sur l'existant (commandes réelles, purge mocks) et documenter le reste comme backlog — l'application resterait alors partiellement non conforme.

**Q2 — Modèle de stock : quantités synchronisées ou dérivées ?**
✅ **DÉCIDÉ (utilisateur, 2026-09-18) : synchronisé.** Colonne `stock_items.quantity_current` mise à jour dans la même transaction que le mouvement immuable, verrou pessimiste sur la ligne, requête de contrôle de cohérence exposée à l'admin.
Analyse initiale — FRD §23 : « le stock affiché est toujours dérivé des mouvements » ; FRD §26.3 : calcul transactionnel.
*Recommandation* : colonne `stock_items.quantity_current` mise à jour **dans la même transaction** que l'écriture du mouvement immuable (lecture O(1), verrou pessimiste sur la ligne, intégrité garantie) — et une requête de contrôle de cohérence (somme des mouvements vs colonne) exposée à l'admin. *Alternative* : dérivation pure (`SUM(mouvements)`) — strictement plus « puriste » mais plus coûteuse à chaque lecture et plus lourde pour les seuils par entrepôt.

**Q3 — Commandes clients (`/commandes-clients`)**
✅ **DÉCIDÉ (utilisateur, 2026-09-18) : ne pas exposer.** Aucune page frontend ; capacité backend documentée hors périmètre v1.
Contexte initial : la FRD exclut ce module du périmètre. Un contrôleur backend existe.
*Recommandation* : ne pas exposer au frontend, le documenter comme capacité backend hors périmètre v1. *Alternative* : l'intégrer (ajouterait du hors-périmètre FRD).

---

**Q4 — Modules 10/11/12 backend : qui les livre, et dans quel ordre ?**
✅ **DÉCIDÉ (utilisateur, 2026-09-19) : option A — ne pas dupliquer l'amont.** Le backend n'est donc pas modifié pour J2–J4 ; R1–R6 sont traités côté frontend plus les deux corrections backend ciblées de R2/R4. La fusion amont reste préalable à R7.
Constat initial : Constat de la revue (§20 F9) : dans `develop` local, `stockentry` / `stockexit` / `alert` ne contiennent que `package-info.java`, et la migration `V20__stock_entries` de la branche amont `feature/us_be_34_stock_entries` **n'est pas fusionnée**. Le frontend J5b (Entrées/Sorties/Alertes) est donc **réellement bloqué**, contrairement à ce que laissait penser la mention « en cours en amont ».
Ce qui est en jeu : soit je me limite au frontend débloqué (R1–R6) et j'attends la fusion amont ; soit j'implémente J2–J4 moi-même, ce qui implique de **re-séquencer les migrations Flyway** et risque un conflit de fusion avec la branche amont (le plan avait déjà connu ce problème une fois, cf. §19).
*Recommandation* : **option A — ne pas dupliquer l'amont**. J'implémente R1–R6 (frontend + les deux corrections backend ciblées de R2/R4), et nous fusionnons l'amont avant R7. Raison : le risque de divergence de migrations est asymétrique et coûteux (renumérotation + réalignement de `flyway_schema_history` sur les postes de dev), alors que R1–R6 apportent de la valeur sans aucune dépendance.
*Alternative* : option B — j'implémente J2–J4 dans `develop` et nous absorbons la renumérotation. À ne retenir que si l'équipe amont a effectivement arrêté ce travail.

**Q5 — Sémantique de `quantiteDisponible` dans l'API articles (F1).**
✅ **DÉCIDÉ (utilisateur, 2026-09-19) : option C — retirer le champ de l'API articles.** **Appliqué** : `quantiteDisponible` a été retiré du DTO backend et du type frontend, la logique de statut dérivée (`getStockStatus`, incorrecte) a été supprimée, et les écrans Produits / Fiche produit ne fabriquent plus aucune quantité de stock — ils renvoient vers la page Stock. Voir §21.
Constat initial :
Ce qui est en jeu : le FRD §9 pose que le stock est géré **au couple (Produit, Entrepôt)** et qu'un non-Administrateur ne voit que son entrepôt. Or `ArticleDto.quantiteDisponible` est un **scalaire unique par produit**, sans dimension d'entrepôt : la sémantique attendue est donc ambiguë, et c'est ce flou qui a conduit au `0` en dur.
*Recommandation* : **option C — retirer `quantiteDisponible` de `ArticleDto`** et n'afficher l'information de stock que là où elle a un sens (écran Stock, par entrepôt, qui est déjà réel en J5a). Raison : c'est la seule option qui ne demande aucune hypothèse métier, qui respecte l'isolation multi-entrepôt par construction, et qui supprime la possibilité même d'un affichage trompeur. Le badge produit deviendrait « au moins un entrepôt sous seuil » ou disparaîtrait.
*Options écartées* : (a) somme des entrepôts autorisés — mélange des périmètres et donne une valeur sans signification physique ; (b) stock global tous entrepôts — **viole l'isolation** pour un Gestionnaire (FRD §4/§9).
Dans tous les cas, **F2** (logique des niveaux : Rupture = `= 0`, Faible = `≤ min`, Critique = `≤ seuil intermédiaire`) sera corrigé conformément à FRD §12.

**Q6 — Politique de test frontend : maintenant ou à J10 ?**
✅ **DÉCIDÉ (utilisateur, 2026-09-19) : introduire Vitest dès la clôture de R1.** **Appliqué** : Vitest 4 + jsdom installés, `npm test` disponible, **31 tests** couvrant la logique de commande extraite. Voir §21.
Constat initial : Constat (§20.3) : **aucun test frontend n'existe** (0 fichier `*.test.*`), alors que la FRD §27 impose des tests sur les règles à fort risque et que le Next.js de référence en comptait 65 (dont 12 sur `PhotoUploader`). Le travail J6 contient de la logique purement frontend réellement testable : parsing/validation des quantités de réception, calcul du total, filtrage des lignes réceptionnables, ensembles de statuts autorisant chaque transition.
*Recommandation* : **introduire Vitest + Testing Library dès la clôture de R1**, en portant d'abord les tests de logique pure de J6 puis ceux du design system déjà validés côté Next.js. Raison : la porte de qualité actuelle (`tsc` + `build`) ne détecte aucune régression de comportement ; plus la dette de test s'accumule, plus son coût de rattrapage augmente, et R2/R4/R5 sont précisément des zones à risque.
*Alternative* : différer à J10 et n'installer l'outillage qu'à ce moment — acceptable si la priorité est de maximiser la couverture fonctionnelle avant la fin du planning.

*(Non bloquant — politique déjà établie dans le code : tant qu'un module backend manque, son écran reste « indisponible » (`ModuleNotBuilt`) plutôt que mock. Cette politique a été **respectée** : aucune donnée mock ne subsiste dans `src/`.)*

---

**Q7 — Fusion de la chaîne amont (`us_be_34` + `generer_les_notifications`) — posée le 2026-09-20**
⏳ **En attente de décision.**
Constat (§26.3) : la branche `origin/feature/generer_les_notifications` contient le Module 15 (Notifications) complet et testé, construit au-dessus de `feature/us_be_34_stock_entries` (Module 10). Aucune des deux n'est fusionnée ; la fusion exige la renumérotation Flyway amont V17–V21 → V22–V26 (stratégie §20 étendue) et l'alignement de `flyway_schema_history` sur les postes de dev.
*Ce qui est en jeu* : sans cette fusion, R7/J5b (Entrées) et le backend J7 (Notifications) restent bloqués, et **aucune nouvelle migration backend ne peut être créée localement** (collision d'ordre garantie avec la cible de renumérotation).
*Recommandation* : **fusionner la chaîne amont maintenant** (option A du précédent Q4 reste cohérente : ne pas dupliquer l'amont), renuméroter lors du merge, rejouer `mvn test` complet, puis enchaîner le frontend Entrées. Raison : c'est la même logique que la décision Q4 actée (option A), appliquée à une chaîne désormais deux fois plus grosse — plus l'attente est longue, plus le risque de divergence augmente.
*Alternative* : attendre que l'équipe amont fusionne elle-même (délai inconnu) et traiter en attendant uniquement du frontend sans migration (R8 frontend partiel impossible : le centre de notifications exige l'API).

**Q8 — Priorité du prochain jalon — posée le 2026-09-20**
⏳ **En attente de décision.**
Constat : R1–R6/R6b sont livrés ; les chantiers restants sont (a) le frontend Entrées/Sorties/Alertes (R7), (b) le centre de notifications frontend (J7), (c) l'Audit M16 (backend + frontend), (d) la Recherche M14, (e) les Rapports M17.
*Ce qui est en jeu* : l'ordre d'implémentation des prochains jalons, sachant que (a) et (b) dépendent de la fusion Q7, tandis que (c) Audit n'en dépend **pas fonctionnellement** — mais toute migration backend créée avant la fusion créera une collision d'ordre (§26.3-4).
*Recommandation* : après la fusion Q7, enchaîner **R7-a (frontend Entrées)** puis **J7 (centre de notifications frontend)** — les deux consomment immédiatement le backend fraîchement fusionné et complètent le flux métier FRD (scénario A : commande → réception → stock → alerte → notification). M16 Audit suit, en traitant la contrainte de migration par une migration locale **V27+** créée après la fusion.
*Alternative* : commencer par M16 Audit sans attendre (implémentable en code, mais sa migration devra attendre la fusion pour être numérotée — travail à deux temps).

## 17. Definition of Done

Par fonctionnalité : implémentée selon la FRD **et** vérifiée (tests/build/E2E ou API réelle) **et** contrat backend↔frontend synchronisé **et** états loading/empty/error couverts **et** documentée dans ce fichier. Aucune fonctionnalité déclarée complète sans preuve de vérification ; tout ce qui ne peut pas être vérifié est explicitement signalé.

## 18. Checklist de livraison finale

- [ ] 17 modules FRD conformes ou explicitement documentés hors périmètre (décisions Q1–Q3 archivées ici)
- [ ] Contrats API ↔ frontend vérifiés point par point (aucun mock ni donnée fabriquée en production)
- [ ] Migrations Flyway validées (`ddl-auto: validate`) ; intégrité transactionnelle du stock démontrée par test
- [ ] Sécurité : RBAC appliqué à chaque nouvel endpoint (`@PreAuthorize`), isolation entrepôt testée
- [ ] Scénarios FRD A (approvisionnement partiel), B (rupture/alerte), C (onboarding), D (override de permission) passés en E2E
- [ ] `mvn test` + `tsc` + `lint` + `vite build` verts ; suite de tests frontend en place
- [ ] UI : palette/dark mode/i18n cohérents, responsive vérifié (desktop/tablette/mobile), états d'erreur propres (409 métier, pas de 500 bruts)
- [ ] Code mort purgé, aucune duplication concurrente
- [ ] Historique git par jalons lisible, ce document à jour (rapport de livraison final)

---

## 19. Avancement des jalons

| Jalon | État | Branche(s) | Commits | Validation |
|---|---|---|---|---|
| **J0 — Socle** | ✅ **Terminé (2026-09-18)** | `feature/sgs-j0-socle` (frontend **et** backend — dépôts git séparés, découverts à l'audit) | Frontend : `d57b616` (baseline 45 fichiers jamais versionnés : palette, Personnel, PhotoUploader, sous-catégories), `bceaa43` (bascule ModuleNotBuilt + purge 31 fichiers mock, −5 814 lignes). Backend : `47d3326` (module Dashboard réel + provisioning .env), `1d1ac6d` (photos articles MinIO) | Frontend : `tsc` ✅, ESLint **0 erreur** (4 erreurs préexistantes corrigées), `vite build` ✅. Backend : `mvn test` **270/270** ✅ (test Warehouse aligné sur la génération de code automatique) |
| J1 — Module 9 Stock (backend) | ✅ **Terminé** (réalisé en amont US-BE-031, intégré + contrat aligné + migrations renumérotées V19–V21) | develop (poussé vers GitLab `298cca2`) | Fusion `3790b66`, `bed2fb4`, `298cca2` | **310/310** `mvn test` |
| J2 — Module 10 Entrées | 🔄 en cours **en amont** (`feature/us_be_34_stock_entries`) — coordonner, ne pas dupliquer | — | — | — |
| J3 — Module 11 Sorties | ⬜ | — | — | — |
| J4 — Module 12 Alertes | ⬜ | — | — | — |
| J5a — Frontend Stock | ✅ **Terminé (2026-09-18)** | `feature/sgs-j5a-stock` | `a7eb626`, fusion `f9712ff` | `tsc` ✅, eslint applicatif ✅, `vite build` ✅ |
| J5b — Frontend Entrées/Sorties/Alertes | ⛔ **bloqué** — J2/J3/J4 absents de `develop` local (packages `stockentry`/`stockexit`/`alert` vides) | — | — | — |
| J6 — Frontend Commandes | 🔄 **en cours — travail NON COMMITÉ** (3 nouveaux fichiers + 2 modifiés sur `master`) | `master` (arbre de travail) | — | `tsc` ✅, `vite build` ✅ (vérifié 2026-09-19) ; 3 écarts fonctionnels ouverts (F3–F5, §20) |
| J7 — Notifications + Audit | ⬜ | — | — | — |
| J8 — Recherche + historique connexions | ⬜ | — | — | — |
| J9 — Rapports | ⬜ | — | — | — |
| J10 — Finalisation | ⬜ | — | — | — |

**Découvertes J0** : les deux dépôts sont des dépôts git **indépendants** (backend connecté à GitLab `develop` ; frontend sans remote) — la stratégie de branches s'applique dépôt par dépôt. Le `.env` backend était **tracké avec des secrets** → désindexé (à faire : rotation des secrets si le dépôt GitLab est partagé). Le test `WarehouseControllerTest.missingCode` était en retard sur le service (génération auto du code) → aligné.

**Découvertes fusion J0→develop (2026-09-18)** : le dépôt GitLab contenait 5 commits inconnus — le **Module 9 Stock a été réalisé en parallèle en amont (US-BE-031)** avec une qualité conforme (verrou pessimiste, ajustements append-only, CHECK en base, tests d'intégration + concurrence), et le **Module 10 est en cours** (`feature/us_be_34_stock_entries`). Intégration : fusion sans conflit de code (un seul conflit `.gitignore`, résolu en gardant le durcissement secrets de J0), **collision Flyway résolue** (deux V16 sur le remote → renumérotation V16–V18 stock en **V19–V21** ; les environnements ayant déjà appliqué les anciennes versions doivent aligner `flyway_schema_history`), et **alignement de contrat** : la suite d'intégration stock amont attendait l'enveloppe `ApiResponse` alors que le `ApiResponseUnwrapper` global déballe les réponses — 26 assertions corrigées. `mvn test` → **310/310**. `develop` poussé vers GitLab (`298cca2`).

**Conséquence feuille de route** : J1 est livré sans travail neuf ; le frontend Stock (J5a) est débloqué immédiatement ; J2 se joue en amont (coordination). Prochaine action recommandée : **J5a** (page Stock réelle) puis **J6** (Commandes fournisseurs) — tous deux sans dépendance bloquante.

## Relecture de la branche amont `feature/us_be_34_stock_entries` (J2 — Module 10)

*Relecture effectuée le 2026-09-18, avant fusion, à froid depuis `origin`.*

**Verdict : fusionnable sans retouche fonctionnelle.** La qualité est conforme à la FRD et aux décisions actées :

| Critère (FRD) | Constat |
|---|---|
| Transactionnalité (RM-15/CA-15) | `receive()` `@Transactional` unique : lignes livrées + `GoodsReceipt` + mouvements + stock dans la même transaction ; test d'intégration dédié au rollback (ligne invalide → rien persisté) |
| Idempotence (RM-12/CA-11) | Double sécurité : contrôle applicatif `existsByGoodsReceiptLineId` **et** contrainte UNIQUE en base (`stock_entries.goods_receipt_line_id`) ; re-réception d'une ligne déjà traitée ignorée avec warning |
| RM-05/RM-06/RM-17 | Produit et entrepôt dérivés côté backend depuis la commande — jamais fournis par le frontend ; aucun endpoint de création manuelle (`CA-10` : POST → 405) |
| Statuts | `recomputeStatus()` PARTIALLY_DELIVERED / FULLY_DELIVERED + `recordHistory` RECEIVE_PARTIAL/RECEIVE_FULL |
| Permissions & isolation | Tests CA-12/CA-13 (scope entrepôt, authorities) |
| Contrat API | Tests déjà écrits au contrat **déballé** (0 occurrence `$.data`) — alignés avec `ApiResponseUnwrapper` |
| Migrations | `V17__stock`, `V18__stock_permissions`, `V19__stock_adjustments_append_only`, `V20__stock_entries` — **collision avec notre renumérotation V19–V21** |

**Points de vigilance de fusion (le seul chantier réel) :**
1. **Collision de migrations** : amont V17–V20 vs local V19–V21 (notre renumérotation du 2026-09-18). La branche amont étant plus courte (V17–V20), la stratégie la moins intrusive est de renuméroter **l'amont** : V17→V22, V18→V23, V19→V24, V20→V25 lors du merge, en conservant nos contenus (les fichiers sont identiques à nos V19–V21, plus `V20__stock_entries`).
2. **Historique Flyway des environnements de dev** : les devs ayant déjà appliqué les migrations stock sous V17–V20 (ou V19–V21 côté local) devront aligner `flyway_schema_history` (delete + restore checksum) — noté dans le commit de renumérotation et ici.
3. **Vérifier après merge** que `purchase_orders` (Module 6, V13) et `stock_entries` (amont) ne créent pas de dépendance circulaire de migrations (la FK `goods_receipt_line_id → purchase_order_lines` exige V13 avant la migration stock_entries).

Aucun problème de fond détecté : pas de duplication avec le Module 9, contrat déballé respecté, tests d'intégration couvrant les scénarios FRD (partielle→totale, multi-produits, création initiale de stock, rollback, doublons, isolation).

## 20. Revue de code du 2026-09-19 (PHASE 0–1 rejouée)

*Section ajoutée par la reprise du 2026-09-19. Elle constate l'état réel du code et corrige les affirmations du plan devenues périmées ; les §1–§19 gardent valeur d'historique.*

### 20.1 Méthode et périmètre
Périmètre demandé : **frontend `gestion_stock_complet`** (décision utilisateur : React/Vite, `gestion-stock-frontend` Next.js hors périmètre). Le backend n'est consulté **que comme source de contrat**, jamais modifié dans cette revue.

Preuves exécutées : extraction et lecture intégrale du FRD (1 912 lignes — 17 modules + §18–29), lecture intégrale des fichiers du jalon en cours, `tsc --noEmit`, `eslint`, `vite build`, inspection des contrôleurs / DTO / migrations backend, recherche d'imports pour la détection de code mort.

### 20.2 État git exact — le point d'arrêt

| Dépôt | Branche | HEAD | Arbre de travail |
|---|---|---|---|
| `gestion_stock_complet` | `master` | `f9712ff` (fusion J5a) | **3 fichiers non suivis + 2 modifiés** |
| `gestion_stock_backend` | `develop` | `298cca2` | propre |

Fichiers non commités :

| Fichier | État | Rôle |
|---|---|---|
| `src/App.tsx` | modifié | import + 3 routes `/commandes*` remplacent le `ModuleNotBuilt` |
| `src/contexts/SessionContext.tsx` | modifié | ajout de `canCode(code)` pour les permissions sans action canonique (`PURCHASE_ORDER_RECEIVE`, `PURCHASE_ORDER_SEND`) |
| `src/pages/PurchaseOrders.tsx` | **nouveau** (185 l.) | liste réelle + création |
| `src/pages/PurchaseOrderDetail.tsx` | **nouveau** (462 l.) | détail, cycle de vie, lignes, historique, annulation |
| `src/components/forms/PurchaseOrderReceiveDialog.tsx` | **nouveau** (175 l.) | réception partielle/totale par ligne |

> **Conclusion : le jalon J6 (frontend Commandes fournisseurs) est achevé à ~90 % mais non commité.** C'est précisément là que le travail s'est arrêté.

### 20.3 Validations exécutées

| Vérification | Résultat |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ **0 erreur** |
| `npm run build` (`vite build`) | ✅ **succès** (8,17 s) |
| `npm run lint` (brut) | ⚠️ **45 erreurs — 100 % localisées dans `src/_designSystem/ds-…/library.js`** (bundle tiers compilé) |
| `eslint` **hors** `_designSystem` | ✅ **0 erreur**, 33 avertissements (préexistants : `no-explicit-any` ×3, `react-refresh/only-export-components` ×30) |
| Tests frontend | ❌ **aucun** — 0 fichier `*.test.*`, ni Vitest ni Testing Library dans `package.json` |
| `mvn test` backend | ⏸ **non rejoué** dans cette revue (coût) — le « 310/310 » de J1 reste déclaratif, à re-vérifier au prochain jalon backend |

**Action requise** : exclure `src/_designSystem` de la configuration ESLint. Sans cela `npm run lint` échoue systématiquement, ce qui **casse la porte de qualité de tous les jalons** — et explique vraisemblablement l'incohérence « ESLint 0 erreur » rapportée à J0 (mesure probablement faite sur le seul code applicatif).

### 20.4 Écarts constatés, par gravité

**F1 — 🔴 Bug d'affichage : tous les produits apparaissent « Rupture de stock ».**
`ArticleFacadeService.java:251` renvoie `0` en dur pour `quantiteDisponible` (commentaire d'origine : *« to be calculated from stock movements »*). Côté frontend, `getStockStatus()` (`types/api/article.dto.ts:60`) traduit `quantiteDisponible <= stockMinimal` en `RUPTURE` ; comme `0 <= stockMinimal` est toujours vrai, **chaque produit de la liste Produits et de la fiche produit s'affiche en rupture** via `ArticleStockBadge`. Une donnée fabriquée est donc présentée comme vraie — exactement ce que la politique d'honnêteté du projet proscrit ailleurs (`ModuleNotBuilt`).

**F2 — 🟠 Logique de statut de stock incorrecte, indépendamment de F1.**
FRD §12 : « Rupture » = disponible **= 0** ; « Faible » = disponible **≤ seuil minimum** ; « Critique » = ≤ seuil intermédiaire. L'implémentation actuelle (`<= stockMinimal → RUPTURE`) **confond « faible » et « rupture »**. À corriger quelle que soit la décision prise sur F1.

**F3 — 🟠 FRD M6 : la modification d'une commande Brouillon/En attente est impossible.**
`PurchaseOrderFormDialog` **supporte déjà** le mode édition (`order?: PurchaseOrderDto | null`, `isEdit`), mais `PurchaseOrders.tsx` est son seul appelant et ne passe jamais `order`. Or la FRD M6 impose « une commande ne peut être modifiée librement qu'à l'état Brouillon ou En attente » (§25 : les saisies non validées doivent être préservées). Code prêt, non branché.

**F4 — 🟡 `canEdit` calculé sans bouton associé (`PurchaseOrderDetail.tsx`).**
`canEdit` n'entre que dans `hasAnyAction` ; `OrderActions` ne rend que soumettre / valider / envoyer / réceptionner / annuler. Un utilisateur ayant `commandes:modifier` sans les autres droits provoquera l'affichage d'une **barre d'actions vide**. Au passage, `can("commandes","modifier") && (can("commandes","creer") || can("commandes","modifier"))` est redondant.

**F5 — 🟡 Route morte `/commandes/nouvelle`.** `ROUTES.commandeFournisseurNew` existe et `App.tsx` la mappe sur `<PurchaseOrders />`, mais la page n'exploite pas ce chemin : la route rend la liste **sans ouvrir** le dialog de création.

**F6 — 🟠 FRD M8 partiellement exposée (M8 = 🟡, pas ✅).**
La table `products` (`V9__product.sql`) contient `barcode` UNIQUE, `purchase_price`, `location`, `max_quantity`, `subcategory_id NOT NULL`. Mais `ArticleDto` (backend) n'expose que `code, libelle, designation, description, prixUnitaire, stockMinimal, stockAlerte, quantiteDisponible, photoUrl, categorieId, categorieLibelle, fournisseurPrincipalId/Nom`. Sont donc **inatteignables depuis l'UI** : code-barres (unicité exigée), prix d'achat (donc l'avertissement vente à perte), seuil maximum, emplacement.

**F7 — 🟡 Résolution de sous-catégorie fragile.**
`ArticleFacadeService` interprète le `categorieId` envoyé par le frontend comme un ID de **sous-catégorie**, et **à défaut** retient « la première sous-catégorie active de la catégorie » (`findAllByArchivedFalseAndCategoryId(categorieId, PageRequest.of(0,1))`). Si une catégorie comporte plusieurs sous-catégories, le rattachement devient **arbitraire et silencieux** — contraire à FRD M7 (le produit appartient à une sous-catégorie choisie explicitement).

**F8 — 🟠 C3 confirmé : l'historique de connexions n'est exposé par aucun endpoint.**
`LoginAttempt`, `LoginAttemptRepository`, `LoginAttemptService`, `LoginAttemptAuditWriter` existent. Recherche de `login-history|loginHistory|login-attempts` sur tout le backend : **aucun résultat**. Les permissions `users:view_login_history` / `auth:view_login_history` (FRD M1/M3) restent non satisfaites.

**F9 — 🟡 Modules backend toujours absents localement.**
Dans `develop` (HEAD `298cca2`) : `stockentry`, `stockexit`, `alert`, `auditlog`, `search` ne contiennent que `package-info.java` ; `notification` = `EmailService` seul ; `report` = stub. Migrations locales : **V19–V21 seulement** — `V20__stock_entries` de la branche amont **n'est pas fusionné**. Le Module 10 (J2) n'est donc **pas disponible ici**, contrairement à ce que suggérait la mention « en cours en amont ».

**F10 — 🟡 Duplication / reclassement backend (cartographie trompeuse).**
`SupplierOrderController` (`/api/v1/commandes-fournisseurs`) coexiste avec `PurchaseOrderController` (`/api/v1/purchase-orders`) : deux surfaces pour le même domaine, une seule utilisée. `CustomerOrderController` est physiquement rangé dans `modules/stockexit`. Aucun impact runtime, mais fausse l'audit de périmètre.

**F11 — 🟢 Code mort confirmé (par recherche d'imports, pas par supposition).**
Services jamais importés : `product.service.ts`, `supplier.service.ts` (le vivant est `partner.service.ts`), `company.service.ts`, `order.service.ts`, `report.service.ts`, `stock-movement.service.ts`. Également `hooks/use-pagination.ts` (le vivant est `hooks/use-server-pagination.ts`) et `hooks/use-permissions.ts` (homonyme orphelin ; le vivant est `features/rbac/hooks/use-rbac.ts#usePermissions`). `components/shell/NotificationPanel.tsx` est **conservé volontairement** (documenté dans `Topbar.tsx`) — ne pas purger.

### 20.5 Corrections d'affirmations périmées du plan

| Affirmation initiale | Réalité vérifiée le 2026-09-19 |
|---|---|
| §6.4 « doublons `use-pagination.ts` / `usePagination.ts` » | Le PascalCase n'existe plus. Seul `use-pagination.ts` subsiste, **orphelin**. |
| §6.4 « `Users.tsx` vs `Personnel.tsx` (doublon fonctionnel) » | **Faux.** `Personnel.tsx` importe `Users` et `Roles` et les compose en onglets : composition voulue, **ne pas purger**. |
| §6.4 « `components/dashboard/*` (5), `components/charts/*` (3), `Timeline`, `StockGauge` morts » | **Déjà purgés à J0** (dossiers et fichiers absents). `AnimatedNumber` **est utilisé** par `KpiCard`. |
| §6.3 / §12 « Rapports, Audit, Notifications, Recherche = `ModuleNotBuilt` » | ✅ Toujours exact — vérifié dans `App.tsx`. |
| §19 « J5 — Frontend Stock/Entrées/Sorties/Alertes : ⬜ » | **J5a livré** (`a7eb626`, fusion `f9712ff`) ; seule J5b reste bloquée (F9). |
| §7 C1 « liste/détail mock, hooks réels inutilisés » | **Obsolète** : le frontend J6 consomme désormais les endpoints réels (travail non commité). |
| §7 C2 « `quantiteDisponible` … constante/0 » | **Confirmé et aggravé** : `0` en dur (`ArticleFacadeService:251`), avec effet trompeur visible (F1). |
| §19 J0 « ESLint 0 erreur » | Vrai pour le code applicatif, mais `npm run lint` **échoue globalement** (45 erreurs du bundle `_designSystem`, cf. §20.3). |
| §7 C3 « historique de connexion : entité existante, aucun endpoint » | ✅ Confirmé (F8). |
| §7 C4 « suppression d'entités référencées → 500 brut » | Non re-testé dans cette revue — **reste à vérifier** au jalon concerné. |

### 20.6 Ce qui est réellement conforme et vérifié

- **PHASE 5 (UI/UX) respectée dans le travail J6** : `PurchaseOrders.tsx`, `PurchaseOrderDetail.tsx` et `PurchaseOrderReceiveDialog.tsx` réutilisent exclusivement `PageHeader`, `DataTable`/`TableCard`/`Pagination`, `EmptyState`, `TableSkeleton`, `Pill`, `PurchaseOrderStatusBadge`, `Button`, `Dialog`, `Input`. **Aucune invention visuelle, aucune couleur ni composant nouveau.**
- **États traités** : `loading` (skeletons), `empty` (messages contextualisés selon qu'il y a des filtres ou non), `error` (message d'API réel via `extractApiError`) sur les trois écrans.
- **Accessibilité** : `aria-label` sur les barres de progression et les champs de quantité, `role="progressbar"` avec bornes explicites.
- **Contrat J6 vérifié point par point** : les 10 routes consommées existent dans `PurchaseOrderController` ; les autorités `PURCHASE_ORDER_SEND` / `PURCHASE_ORDER_RECEIVE` / `PURCHASE_ORDER_CANCEL` justifient précisément l'ajout de `canCode` (et non de `can`, qui ne couvre que les actions canoniques).
- **Le frontend ne recalcule aucune règle métier** : statuts, quantités livrées/restantes, taux d'avancement et stock proviennent tous du serveur — conforme à FRD §18.1 (« la couche Présentation ne contient aucune règle métier »).
- **Aucune donnée mock ni fabriquée ne subsiste** : recherche `mock|faker|lorem|MOCK_|Fake` sur `src/` hors `_designSystem` → **aucun résultat** ; `src/data/` supprimé à J0.

### 20.7 Feuille de route révisée

| Ordre | Chantier | Dépendance | Nature |
|---|---|---|---|
| **R1** | Clore J6 : brancher l'édition (F3), rendre le bouton d'édition ou retirer le flag (F4), traiter `/commandes/nouvelle` (F5), commit | — | Frontend seul |
| **R2** | Corriger F1 + F2 (`quantiteDisponible` + logique des niveaux de statut) | **décision Q5** | 1 fichier backend + 1 fichier frontend |
| **R3** | Exclure `_designSystem` du périmètre ESLint — débloque la porte de qualité | — | Configuration |
| **R4** | Historique de connexions (F8) : endpoint + onglet dans la fiche utilisateur | — | Backend + Frontend |
| **R5** | M8 complet (F6 + F7) : exposer code-barres, prix d'achat, seuil max, emplacement ; sélection explicite de sous-catégorie | — | Backend DTO + Frontend formulaire |
| **R6** | Purge du code mort confirmé (F11), **isolée** de toute fonctionnalité | — | Frontend |
| **R7** | J5b Entrées / Sorties / Alertes | M10 fusionné ; M11/M12 backend | voir §26.4 (état 2026-09-20) |
| **R8** | Notifications in-app + Audit, puis Recherche, puis Rapports | backend (J7–J9) | transverse |

### 20.8 Questions bloquantes

Voir **§16, questions Q4 à Q6**. Aucune implémentation de **R2** et **R7** ne sera engagée avant réponse : ces deux chantiers reposent sur des choix métier qui ne peuvent pas être tranchés unilatéralement.

---

## 21. Jalon R1–R3 + outillage de test — livré le 2026-09-19

### 21.1 Périmètre livré

| Chantier | Contenu | Statut |
|---|---|---|
| **R3** | `src/_designSystem` exclu du périmètre ESLint (`.eslintrc.cjs`) — la porte de qualité n'échoue plus sur le bundle tiers | ✅ |
| **R1 / F3** | Édition d'une commande **branchée** : bouton « Modifier » sur les états Brouillon / En attente, ouvrant `PurchaseOrderFormDialog` en mode édition (préremplissage + `PUT /purchase-orders/{id}`) — le mode existait mais n'était câblé à aucun point d'entrée (FRD M6) | ✅ |
| **R1 / F4** | Drapeaux d'action centralisés dans une fonction pure ; `canEdit` rend enfin un bouton ; l'expression redondante a disparu ; `hasAnyAction` dérivé des drapeaux (plus de barre d'actions vide) | ✅ |
| **R1 / F5** | Route `/commandes/nouvelle` rendue fonctionnelle : l'ouverture du dialog suit l'URL (lien partageable), `push` à l'ouverture / `replace` à la fermeture ; route déclarée via `ROUTES.commandeFournisseurNew` et non plus en littéral | ✅ |
| **R2 / F1** | Champ fabriqué supprimé : `quantiteDisponible` retiré de `ArticleDto` (backend) et du type frontend ; `ArticleFacadeService` ne renvoie plus de quantité de stock. Les écrans Produits et Fiche produit ne peuvent plus afficher une rupture inexistante | ✅ |
| **R2 / F2** | Logique de statut dérivée et incorrecte supprimée (`getStockStatus`, `ArticleStockBadge` retiré). Les seuils sont désormais **relibellés honnêtement** : `stockMinimal` = seuil minimum (déclencheur d'alerte), `stockAlerte` = seuil **maximum** (le nom du champ backend est trompeur, c'est documenté dans le type) | ✅ |
| **R2 / F14** | Filtre « En rupture uniquement » retiré de la liste Produits : il s'appuyait sur un filtre serveur calculé sur le seuil minimum, pas sur le stock. La page Stock offre un filtre « stock faible » réel | ✅ |
| **Q6** | Vitest 4 + jsdom installés ; `npm test` / `npm run test:watch` ; **31 tests** sur la logique de commande, extraite dans `features/purchase-orders/lib/` | ✅ |

### 21.2 Fichiers modifiés / créés

**Frontend — créés**
- `src/features/purchase-orders/lib/order-actions.ts` — états et drapeaux d'action (fonction pure)
- `src/features/purchase-orders/lib/receive-lines.ts` — saisie/validation des quantités de réception
- `src/features/purchase-orders/lib/order-actions.test.ts` — 14 tests
- `src/features/purchase-orders/lib/receive-lines.test.ts` — 17 tests
- `vitest.config.ts`

**Frontend — modifiés**
- `.eslintrc.cjs`, `package.json` (scripts `test` / `test:watch` + devDependencies)
- `src/pages/PurchaseOrders.tsx`, `src/pages/PurchaseOrderDetail.tsx`
- `src/pages/Products.tsx`, `src/pages/ProductDetail.tsx`
- `src/components/forms/PurchaseOrderReceiveDialog.tsx`
- `src/contexts/SessionContext.tsx` (ajout `canCode`, déjà présent au point d'arrêt)
- `src/App.tsx`, `src/types/api/article.dto.ts`

**Frontend — supprimé**
- `src/features/articles/components/ArticleStockBadge.tsx` (dépendait du champ fabriqué)

**Backend — modifiés**
- `modules/product/dto/ArticleDto.java` — champ `quantiteDisponible` retiré
- `modules/product/service/ArticleFacadeService.java` — mapping correspondant retiré, avec justification en commentaire

### 21.3 Validations exécutées

| Vérification | Résultat |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ **0 erreur** |
| `npm test` (`vitest run`) | ✅ **31/31** (2 fichiers) |
| `npm run lint` | ✅ **0 erreur**, 32 avertissements préexistants |
| `npm run build` (`vite build`) | ✅ succès (3,83 s) |
| `mvn compile` | ✅ succès |
| `mvn test-compile` | ✅ succès (aucun test ne construisait `ArticleDto`) |
| `mvn test -Dtest=ProductControllerTest,ProductServiceTest` | ✅ **0 échec / 0 erreur** |
| `mvn test` complet | ⏸ **non rejoué** — le total « 310/310 » antérieur reste déclaratif ; un run complet est à faire au prochain jalon backend |

### 21.4 Décisions d'implémentation

1. **Le dialog de réception transmet désormais un payload défensif** : `buildReceivePayload` écarte toute ligne dont la quantité dépasse le restant à livrer, même si le bouton est déjà désactivé en amont. Deux tests ont échoué à la première écriture et ont révélé deux faiblesses réelles : `Number()` acceptait la notation scientifique (`"1e3"` → 1000), et le payload n'était pas borné par le restant. **Le code a été corrigé, pas les tests** : la validation repose maintenant sur un motif strict `^\d+$`.
2. **La règle de transition vit dans une fonction pure**, pas dans le composant : `orderActionFlags(statut, permissions)`. Elle est donc testable sans rendu ni serveur, et testée sur les 9 statuts × les combinaisons de permissions.
3. **Aucune quantité de stock n'est réintroduite dans le contrat article** : le type porte un commentaire explicite interdisant ce retour en arrière, pour éviter que le `0` en dur ne réapparaisse.
4. **`/commandes/nouvelle` est pilotée par l'URL** plutôt que par un état local : le bouton devient un lien partageable, et le bouton « retour » du navigateur referme le dialog (comportement modal attendu).

### 21.5 Limites et dette laissée volontairement

- **Avertissements Vitest/Vite** : vitest 4.1.11 installé au-dessus de vite 5.2 émet des avertissements de dépréciation (`esbuild` → `oxc`). Les tests passent et sont fiables ; l'alignement des versions est à planifier, mais ne pas monter vite maintenant éviterait de toucher au découpage de bundle validé.
- **`enRupture` côté serveur (F14)** : le filtre SQL `p.minQuantity > 0` reste en place et reste sémantiquement faux. Il n'est plus consommé par le frontend. À traiter dans R5 (M8).
- **`GET /articles/en-rupture`** et `articleService.listEnRupture` restent présents et non consommés → à purger avec R6.
- **Tests frontend** : la couverture porte sur la logique pure de J6. Les composants, hooks et le design system restent à couvrir (suite de Q6).
- **Aucun test E2E navigateur** n'a été rejoué dans ce jalon : les parcours ont été validés par lecture de code et contrats, pas par exécution contre l'API.

### 21.6 Prochain jalon

**R4** (historique de connexions, F8) puis **R5** (M8 complet, F6/F7) et **R6** (purge du code mort F11). **R7** (Entrées/Sorties/Alertes) reste bloqué jusqu'à la fusion de la branche amont (décision Q4).

### 21.7 État git

Le travail J6 était **non commité** au démarrage de la revue. Après ce jalon, l'arbre de travail contient J6 **et** R1/R2/R3/Q6. Commits proposés (à valider par l'utilisateur, aucune opération git n'a été exécutée) :

1. `chore(lint): exclure le bundle tiers _designSystem du périmètre ESLint` — `.eslintrc.cjs`
2. `feat(commandes): brancher la liste, le détail, l'édition et la réception sur les endpoints réels` — pages + dialog + `canCode` + routes
3. `fix(produits): supprimer la quantité de stock fabriquée et la logique de statut erronée` — DTO backend + type frontend + écrans
4. `test(commandes): introduire Vitest et couvrir la logique de transition et de réception` — lib + tests + config + scripts

Branche proposée : `feature/sgs-j6-commandes` (créée depuis `master`), conformément à la stratégie §15.

---

## 22. R6 — Purge du code mort confirmé (2026-09-19)

### 22.1 Supprimé — périmètre demandé

Méthode : chaque fichier a été vérifié **avant** suppression par recherche d'import **par chemin** *et* par **symbole exporté** (un fichier peut être importé sous un alias, ou exporter un symbole homonyme d'un autre module).

| Fichier supprimé | Symbole exporté | Preuve d'orphelinat |
|---|---|---|
| `services/product.service.ts` | `productService` | 0 import de chemin, 0 référence au symbole |
| `services/supplier.service.ts` | `supplierService` | 0 import ; le vivant est `partner.service.ts` (même nom de symbole) |
| `services/company.service.ts` | `companyService` | 0 import, 0 référence |
| `services/order.service.ts` | `supplierOrderService`, `customerOrderService` | 0 import, 0 référence |
| `services/report.service.ts` | `reportService` | 0 import, 0 référence (module `report` = stub backend) |
| `services/stock-movement.service.ts` | `stockMovementService` | 0 import, 0 référence (`/mouvements-stock` = stub) |
| `hooks/use-pagination.ts` | `usePagination` | 0 import ; le vivant est `hooks/use-server-pagination.ts` |
| `hooks/use-permissions.ts` | `usePermissions` | 0 import ; le vivant est `features/rbac/hooks/use-rbac.ts` |

Également retiré : la méthode `listEnRupture` de `services/article.service.ts` (endpoint `GET /articles/en-rupture`) et son import de type devenu inutile. Un commentaire explique **pourquoi** l'endpoint n'est pas exposé — le filtre serveur est calculé sur le seuil du produit et non sur le stock réel — afin qu'il ne soit pas rebranché par erreur.

**Piège rencontré** : un premier relevé indiquait `1 import` pour `services/order.service.ts`. C'était un **faux positif** — l'expression régulière capturait `purchase-order.service`. Sans vérification, ce fichier aurait été conservé à tort.

### 22.2 Validations

| Vérification | Résultat |
|---|---|
| `npm run typecheck` | ✅ **0 erreur** — confirme l'absence de référence orpheline (résolution de modules stricte) |
| `npm test` | ✅ **31/31** |
| `npm run lint` | ✅ **0 erreur** |
| `npm run build` | ✅ succès — l'empreinte du chunk applicatif change, preuve que la suppression a bien atteint le bundle |

### 22.3 Candidats restants — **recommandation R6b, non appliquée** → **appliquée depuis, voir §25**

Ces éléments ont aussi 0 référence, mais ne relevaient pas du périmètre demandé. Ils sont **documentés et non supprimés**, conformément à la règle de discipline de périmètre.

**Orphelins vrais, sans ambiguïté** (5 fichiers) :
- `hooks/use-auth.ts`
- `lib/jwt.ts`
- `types/api/product.dto.ts`, `types/api/supplier.dto.ts`, `types/api/company.dto.ts` (probablement libérés par la suppression des services ci-dessus)

**Groupes de clés de requête libérés par cette purge** (dans `constants/query-keys.ts`) : `stockMovements`, `customerOrders`, `companies`. Non supprimés : `customerOrders` et `companies` correspondent à des modules backend existants (`customer`, `company`) dont l'exposition n'est pas tranchée, une clé morte aujourd'hui peut redevenir utile.

**Primitives de design system non consommées** (10) : `components/ui/` — `Badge`, `Checkbox`, `Sonner`, `ScrollArea`, `Progress`, `CSwitch`, `Table`, `Separator`, `Avatar`, `Breadcrumb`. Il n'existe **pas** de barrel `components/ui/index.ts`. Ce sont des primitives du kit porté depuis le design system : leur suppression est un choix de conception, pas une évidence de code mort — à arbitrer explicitement.

**Faux positifs à ne jamais supprimer** : `src/index.tsx` (référencé par `index.html`), `src/types/index.ts` (barrel importé par 2 fichiers), `features/*/schemas/*.schema.ts` (référencés), `components/shell/NotificationPanel.tsx` (conservé volontairement, documenté dans `Topbar.tsx`).

---

## 23. R4 — Historique de connexions (2026-09-19)

Corrige **F8 / C3** : l'entité `LoginAttempt` et son repository existaient depuis la Phase 1, mais aucune route ne les exposait — la permission `AUTH_VIEW_LOGIN_HISTORY` était seedée sans consommateur (FRD M1 et M3 non satisfaites).

### 23.1 Backend

| Élément | Détail |
|---|---|
| `user/dto/LoginAttemptResponse.java` (nouveau) | id, identifiant employé, succès, IP, user-agent, motif d'échec, horodatage. **Aucune donnée d'authentification transmise** : ni mot de passe, ni hachage, ni jeton |
| `auth/repository/LoginAttemptRepository` | `findByUser_IdOrderByCreatedAtDesc(UUID, Pageable)` — l'ordre chronologique est fixé par la **requête**, et non par un tri client : un client omettant le tri obtiendrait sinon un ordre arbitraire, inexploitable pour une investigation (UC-03.4) |
| `user/service/UserService.loginHistory` | Réutilise `findActiveOrThrow` puis `assertWarehouseAccess` — l'isolation multi-entrepôt est appliquée **au niveau Services**, jamais seulement masquée côté interface (contrainte FRD §4) |
| `user/controller/UtilisateurController` | `GET /api/v1/utilisateurs/{id}/login-history`, `@PreAuthorize("hasAuthority('AUTH_VIEW_LOGIN_HISTORY')")` |

**Choix d'implémentation — pourquoi `/utilisateurs` et non `/users`** : le backend expose **deux** contrôleurs utilisateur. `UtilisateurController` (`/utilisateurs`) est explicitement documenté comme « Frontend-compatible controller for users » et c'est celui que le SPA consomme pour les comptes ; `UserController` (`/users`) porte les overrides RBAC. Le commentaire en tête de `use-utilisateurs.ts` acte déjà cette séparation (« ce n'est pas un doublon »). Exposer l'historique sur la surface que la fiche utilisateur interroge déjà évite d'ajouter une troisième duplication au périmètre F10.

**Aucune migration nécessaire** : `AUTH_VIEW_LOGIN_HISTORY` est déjà seedée en `V3__rbac.sql` et accordée aux rôles **ADMIN** et **WAREHOUSE_MANAGER** — exactement les deux acteurs prévus par la FRD §22 (Administrateur : tous entrepôts ; Gestionnaire : son entrepôt).

**Amélioration rencontrée en cours de route** : `BusinessException(ErrorCode)` ne porte que le **nom** du code comme message (ex. `"WAREHOUSE_SCOPE_VIOLATION"`), ce qui n'est pas affichable à un utilisateur alors que le frontend expose ce texte tel quel. Une surcharge `assertWarehouseAccess(user, message)` a été ajoutée pour permettre un message rédigé ; les appelants existants conservent leur comportement d'origine (surcharge déléguée avec `null`), et l'endpoint d'historique renvoie désormais un message explicite.

### 23.2 Frontend

| Élément | Détail |
|---|---|
| `types/api/user.dto.ts` | `LoginAttemptDto` (`attemptedAt`, `identifierUsed`, `success`, `ipAddress`, `userAgent`, `failureReason`) |
| `services/user.service.ts` | `loginHistory(id, { page, size })` |
| `features/utilisateurs/hooks/use-utilisateurs.ts` | `useLoginHistory` — `placeholderData` conserve la page précédente pour éviter le retour au squelette en pagination |
| `constants/query-keys.ts` | `users.loginHistory(id, params)` |
| `pages/UserDetail.tsx` | Onglet **Connexions**, monté **uniquement si** `canCode('AUTH_VIEW_LOGIN_HISTORY')` |

L'onglet réutilise exclusivement l'existant : `Tabs`/`TabsList`/`TabsTrigger`, `SectionCard`, `DataTable` + `TableCard`-libre, `Pagination` serveur (`useServerPagination`), `EmptyState` (états vide **et** erreur), `TableSkeleton`, `Pill` (succès/échec), `formatDateTime`. **Aucun composant, couleur ou disposition nouvelle** (PHASE 5).

### 23.3 Tests

| Fichier | Contenu |
|---|---|
| `UserServiceTest$LoginHistory` (nouveau, **5 tests**) | administrateur global → accès à un compte d'un autre entrepôt ; gestionnaire → refus d'un compte hors périmètre **avec vérification que le journal n'est jamais lu** (`verify(..., never())`) ; gestionnaire → son propre entrepôt autorisé ; compte inexistant → 404 ; un échec expose son motif et l'identifiant réellement employé |
| `UtilisateurControllerTest` (nouveau, **6 tests**) | mapping réponse (identifiant, succès, IP, totalElements) ; historique vide → 200 et non une erreur ; pagination par défaut (page 0, taille 20) ; taille demandée `5000` → plafonnée à 100 ; taille `0` → ramenée à 1 ; page négative → 0 |

Le test de refus ne se contente pas de vérifier l'exception : il prouve que **l'isolation est tranchée avant toute lecture du journal**, ce qui est précisément l'exigence FRD §4.

### 23.4 Validations

| Vérification | Résultat |
|---|---|
| `mvn test` (**suite complète**) | ✅ **321/321**, 0 échec, 0 erreur — le total passe de 310 à 321 (+11 tests R4) |
| `mvn compile` / `test-compile` | ✅ |
| `npm run typecheck` | ✅ 0 erreur |
| `npm test` | ✅ 31/31 |
| `npm run lint` | ✅ 0 erreur, 32 avertissements préexistants |
| `npm run build` | ✅ |

### 23.5 Non vérifié — à assumer

- **Aucun test de composant frontend** pour l'onglet : le panneau est présentationnel et la couverture frontend reste limitée à la logique pure (périmètre Q6). Le contrat de la route est, lui, couvert côté backend.
- **Aucun appel réel exécuté** contre l'API démarrée (pas de smoke test) : la vérification s'appuie sur 11 tests backend et sur `@PreAuthorize`, non sur une requête HTTP réelle. Un contrôle navigateur reste à faire au jalon de recette.
- L'ordre `createdAt DESC` est garanti par la requête ; **les tentatives sur identifiant inconnu** (`user_id` null) n'apparaissent dans aucun historique — elles ne sont rattachables à aucun compte. Limite connue et documentée dans le repository.

### 23.6 État git

R4 et R6 sont **commitès** (2026-09-19) sur `feature/sgs-j6-commandes`, en commits distincts :

| Dépôt | Commit | Contenu |
|---|---|---|
| Frontend | `55417a1` | R4 — onglet Connexions (5 fichiers) |
| Frontend | `0e4319c` | R6 — purge du code mort (9 fichiers, −201 lignes) |
| Backend | `2a93c9d` | R4 — endpoint + DTO + 11 tests (6 fichiers) |

Le backend ne reçoit **qu'un** commit : R6 est un nettoyage purement frontend. Arbre de travail propre dans les deux dépôts. Historique complet de la branche : `038a86b`, `f1499ba`, `21170b6`, `7b47c1d` (jalon J6 + R1/R2/R3), puis `55417a1`, `0e4319c` (R4/R6) — arbre résolu et vérifié à chaque étape. **Aucun `git push` n'a été exécuté.**

### 23.7 Suite — R6b (non engagée à ce stade — **livrée depuis, voir §25**)

Le périmètre R6b (5 orphelins restants, 3 groupes de clés de requête morts, sort des 10 primitives `components/ui/`) a été **interrompu avant toute modification** au profit de ces commits : l'arbre était propre et il ne fallait pas mêler du nettoyage supplémentaire à R4/R6. Constats déjà établis pour la reprise :

- **Aucune dépendance interne à `components/ui/`** : vérifié explicitement, aucune primitive `ui/` n'en importe une autre. Les supprimer ne peut donc pas casser une primitive pourtant utilisée — l'absence de ce contrôle est le piège classique de ce type de nettoyage.
- **Impact bundle nul** : les primitives non importées sont éliminées par le tree-shaking de Rollup ; leur suppression est donc une décision de **maintenance et d'honnêteté d'inventaire**, pas d'optimisation de poids.
- Vérifié aussi : `components/ui/Button` (30 usages), `Input` (14), `Dialog` (8), `Textarea` (6), `AlertDialog` (3), `Label` (3), `Select` (3), `Tabs` (3), `Tooltip` (2), `DropdownMenu` (1), `Popover` (1), `Sheet` (1), `Skeleton` (1) sont bel et bien utilisées. `Card.tsx` ressort à **0 usage** et n'avait pas été relevé dans le premier inventaire (il ne figurait que sur la liste des orphelins après la passe R6) — à traiter avec le lot des primitives.

---

## 24. R5 — M8 complet : contrat article élargi + résolution stricte de la sous-catégorie (2026-09-19)

Corrige **F6** (champs FRD M8 inaccessibles depuis l'UI) et **F7** (rattachement de sous-catégorie arbitraire et silencieux).

### 24.1 Backend — contrat et règles

| Élément | Contenu |
|---|---|
| `ArticleDto` | Nouveaux champs : `prixAchat` (coût fournisseur, distinct du prix de vente), `codeBarre`, `emplacement`, `sousCategorieId`/`sousCategorieLibelle`. `categorieId`/`categorieLibelle` sont désormais **dérivés** de la sous-catégorie (FRD M7 : 3 niveaux). Aucune quantité de stock (décision Q5 inchangée) |
| `ArticleCreateRequest` / `ArticleUpdateRequest` | `prixAchat` (optionnel), `codeBarre` (max 100), `emplacement` (max 100), `sousCategorieId` (voie normale) ; `categorieId` conservé pour compatibilité ascendante |
| Résolution de sous-catégorie (**F7**) | Strict : `sousCategorieId` d'abord, sinon `categorieId` s'il désigne directement une sous-catégorie (clients existants), sinon **erreur 409 explicite** — le repli « première sous-catégorie active de la catégorie » est supprimé. Un ID inconnu produit le même message d'invitation (plus un 404 ambigu) |
| Unicité code-barres (FRD M8 §25) | `findIdByBarcodeIgnoreCaseAndArchivedFalse` (projection UUID minimale) ; création et mise à jour refusées si le code-barres est porté par un **autre** produit ; conserver le sien est autorisé sans écriture d'historique |
| Prix d'achat | Création : retombe sur le prix de vente si omis (comportement historique). Une vente à perte est **autorisée et journalisée** (non bloquante, conformément à FRD M8). Toute modification de `purchasePrice` est historisée dans `ProductHistory` (champ sensible) |
| Seuils | Message de validation corrigé : « Le stock maximum doit être supérieur ou égal au stock minimal » (l'ancien message parlait d'« alerte », champ portant le maximum) |
| `CategoryRepository` | Dépendance retirée de la facade (plus de repli catégorie → sous-catégorie) |

### 24.2 Frontend — formulaire et fiche

| Élément | Contenu |
|---|---|
| `article.dto.ts` | Type aligné sur le nouveau contrat ; `sousCategorieId` requis à la création ; commentaire interdisant toute réintroduction d'un scalaire de stock (décision Q5) |
| `article.schema.ts` | `prixAchat` (≥ 0, optionnel), `codeBarre`/`emplacement` (max 100), `sousCategorieId` **requis** ; message du refine aligné sur le serveur |
| `ProductFormSheet` | Inversion du modèle de classement : la **catégorie** vit en état local et pilote la liste des sous-catégories ; la **sous-catégorie** est un champ validé du formulaire envoyé dans `sousCategorieId` (préfillée en édition depuis `article.sousCategorieId`). Nouveaux champs : Prix d'achat, Prix de vente (relabellisé), Code-barres, Emplacement ; les seuils sont relabellisés « Seuil minimum (alerte) » / « Seuil maximum ». **Avertissement vente à perte** non bloquant (`role="alert"`) lorsque vente < achat, conformément à FRD M8 |
| `ProductDetail` | Fiche enrichie : code-barres, emplacement, sous-catégorie, prix d'achat ; la mention « le prix d'achat n'existe pas » est supprimée ; bandeau d'avertissement si vente à perte |
| Aucun composant ni style nouveau (PHASE 5) : `FormField`, `Input`, selects et classes existants réutilisés |

### 24.3 Tests

| Suite | Contenu |
|---|---|
| `ArticleFacadeServiceTest` (**nouveau, 15 tests**) | Résolution stricte (5) : voie normale, compatibilité, **refus sans repli** (vérifie qu'aucun `save` n'a lieu), absence de classement, dérivation de la catégorie. Unicité code-barres (3) : doublon à la création, doublon à la mise à jour, conservation du sien sans historique. Prix d'achat (3) : prix distincts + mapping M8, repli sur prix de vente, historisation du changement. Exposition (2) : champs M8 présents, nullables. Hors groupe : changement de sous-catégorie historisé, validation des seuils (aucune séquence consommée) |

### 24.4 Validations

| Vérification | Résultat |
|---|---|
| `mvn test` (**suite complète**) | ✅ **336/336**, 0 échec, 0 erreur (321 + 15) |
| `mvn compile` | ✅ |
| `npm run typecheck` | ✅ 0 erreur |
| `npm test` | ✅ 31/31 |
| `npm run lint` | ✅ 0 erreur (32 avertissements préexistants) |
| `npm run build` | ✅ 3,78 s |

### 24.5 Limites et dette

- **Aucun smoke HTTP** contre l'API démarrée (validation par 15 tests unitaires + `@PreAuthorize` inchangé). Contrôle navigateur à faire en recette (R7/J10).
- **Filtre `enRupture` serveur toujours sémantiquement faux** (`p.minQuantity > 0`, non consommé par le frontend — cf. §21.5) : à traiter avec la purge backend R6b/Modules 10–12.
- La liste Produits filtre toujours par **catégorie** (contrat `findAllFiltered` inchangé) : un filtre par sous-catégorie est une amélioration non exigée par la FRD, non implémentée.
- Compatibilité ascendante : un client envoyant encore un ID de **catégorie** dans `categorieId` reçoit désormais une 409 explicite (avant : rattachement arbitraire silencieux). Le SPA actuel envoie `sousCategorieId`.

### 24.6 État git

Commits (2026-09-19) sur `feature/sgs-j6-commandes`, un par dépôt, chemins explicites : frontend (DTO + schéma + formulaire + fiche), backend (contrat + facade + repository + 15 tests). Aucun `git push`.

---

---

## 25. R6b — Purge du second lot : orphelins, clés de requête mortes, primitives non consommées (2026-09-19)

Applique le lot documenté en §22.3 : l'arbitrage des primitives du design system, non tranché à l'époque, est acté par décision utilisateur (purge du lot complet, `Card` incluse). Toutes les preuves d'orphelinat ont été **re-vérifiées à HEAD courant** (R4/R5 ont pu créer des consommateurs) selon la méthode §22.1 : recherche par chemin **et** par symbole exporté, guillemets simples et doubles, insensible à la casse, plus une passe **sans ancre `from`** (voir piège §25.2).

### 25.1 Supprimé (17 fichiers, −221 lignes)

| Lot | Fichiers | Preuve d'orphelinat |
|---|---|---|
| Orphelins §22.3 (5) | `hooks/use-auth.ts`, `lib/jwt.ts`, `types/api/product.dto.ts`, `types/api/supplier.dto.ts`, `types/api/company.dto.ts` | 0 import de chemin, 0 référence à un symbole exporté (`useAuth`, `decodeJwt`, `isTokenExpired`, `ProductDto*`, `SupplierDto*`, `CompanyDto*`, `AddressDto`). Les homonymes vivants vérifiés un à un : `useAuthStore` (word boundary), `SupplierDto` de `partner.dto` |
| Cascade (2) | `types/api/stock-movement.dto.ts`, `types/enums/movement-type.ts` | Le groupe de clés `stockMovements` était le **dernier** référent du DTO ; le DTO était le seul consommateur de l'enum (`MOVEMENT_TYPE_LABELS`, `isInboundMovement` sans autre usage) |
| Primitives `components/ui/` (10) | `Badge`, `Checkbox`, `Sonner`, `ScrollArea`, `Progress`, `CSwitch`, `Separator`, `Avatar`, `Breadcrumb`, `Card` | 0 import (alias ou relatif, quotes simples ou doubles, insensible à la casse) ; aucune dépendance interne entre primitives (§23.7). **Arbitrage explicite** : l'inventaire doit refléter le réel — l'impact bundle est nul (§23.7) |

Également retiré dans `constants/query-keys.ts` : les groupes `stockMovements`, `customerOrders`, `companies` (+ l'import `StockMovementFilters` devenu inutile ; `OrderFilters` conservé, utilisé par `supplierOrders`). `jwt-decode` reste déclaré dans `package.json` : retrait de dépendance non exigé par ce lot, à envisager à la prochaine passe de dépendances.

### 25.2 Pièges rencontrés et corrigés

1. **Import multi-ligne** : `DataTable.tsx` importe `../ui/Table` avec `from` et la chaîne sur **deux lignes** — invisible de toute recherche ancrée sur `from "…"`. Détecté par le **build** (échec de résolution Rollup), `Table.tsx` restauré ; `Table` rejoint la liste §23.7 des primitives réellement consommées. Leçon retenue : la preuve d'orphelinat d'un module exige une passe **sans ancre d'import** (chemin seul).
2. **Lecture pipée d'une porte qualité** : le premier `npm run typecheck 2>&1 \| tail -5` affichait des `npm notice` et masquait les erreurs — l'exit code lu était celui de `tail`. Contrôle négatif exécuté (retrait temporaire de `Table.tsx`) : `tsc` sort bien `TS2307` + exit 2. La porte est fiable ; c'est la **lecture** qui ne l'était pas. Tous les rejeux capturent désormais `PIPESTATUS[0]`.

### 25.3 Validations

| Vérification | Résultat |
|---|---|
| `npm run typecheck` | ✅ 0 erreur (**contrôle négatif vérifié** : `TS2307` + exit 2 quand `Table.tsx` est retiré) |
| `npm test` | ✅ 31/31 — aucune suite n'importait les fichiers supprimés |
| `npm run lint` | ✅ 0 erreur, 22 avertissements (32 au jalon R5 : la baisse provient des avertissements portés par les fichiers supprimés eux-mêmes ; +1 au retour de `Table.tsx`) |
| `npm run build` | ✅ 3,22 s — cohérent avec l'impact bundle nul attendu (§23.7 : le code non importé était déjà éliminé par tree-shaking) |

### 25.4 État git

Frontend commit `e5488e2` sur `feature/sgs-j6-commandes` — 18 fichiers (17 suppressions + `query-keys.ts`), −221 lignes. Aucun changement backend (lot purement frontend). Aucun `git push`.

---

## 26. Revue du 2026-09-20 (reprise — PHASE 0–1 rejouées)

### 26.1 Validations rejouées à HEAD courant

| Vérification | Résultat |
|---|---|
| Frontend `npm run typecheck` | ✅ 0 erreur |
| Frontend `npm test` (vitest) | ✅ 31/31 |
| Frontend `npm run lint` | ✅ 0 erreur (22 avertissements préexistants) |
| Frontend `npm run build` | ✅ succès (9,36 s) |
| Backend `mvn compile` (HEAD `bdba44e`) | ✅ succès |
| Recherche de données mock dans `src/` hors `_designSystem` | ✅ aucun résultat |

### 26.2 État git vérifié

| Dépôt | Branche | HEAD | Arbre de travail |
|---|---|---|---|
| `gestion_stock_complet` | `feature/sgs-j6-commandes` | `e5488e2` | propre |
| `gestion_stock_backend` | `feature/sgs-j6-commandes` | `bdba44e` | propre |

Routes `ModuleNotBuilt` restantes dans `App.tsx` : Entrées de stock, Sorties de stock, Alertes de stock, Rapports, Journal d'audit, Notifications, Recherche — conforme à la matrice §3.

### 26.3 🔴 Découverte majeure : branche amont Notifications (Module 15) non fusionnée

La branche distante `origin/feature/generer_les_notifications` **existait au moment des revues précédentes mais n'avait jamais été relevée**. Constats vérifiés :

1. Elle porte **le Module 15 Notifications entièrement implémenté et testé** : entités (`Notification`, `NotificationPreference`, types/canaux/statuts de diffusion), `NotificationController`, `NotificationService`, `NotificationDispatcher`, `NotificationRecipientResolver` (rôles par défaut + préférences individuelles — conforme FRD M15), `NotificationEmailSender`, `NotificationRetryScheduler`, événements typés (`LowStockEvent`, `StockRuptureEvent`, `SystemErrorEvent`), template e-mail, migration `V21__notification.sql`. Volume : **+6 054 lignes / 61 fichiers**, dont ~1 900 lignes de tests (`NotificationEventFlowIntegrationTest` 619 l., `NotificationControllerTest` 322 l., etc.).
2. Elle est construite **au-dessus de `origin/feature/us_be_34_stock_entries`** (Module 10 Entrées, lui-même non fusionné) : la chaîne complète à fusionner est donc `us_be_34` + `generer_les_notifications` (2 branches, la seconde contenant la première).
3. **Aucun fichier** relatif aux Modules 11 (Sorties), 12 (Alertes), 16 (Audit) ni 14 (Recherche) — ces modules restent à implémenter (F9 inchangé, hors `stockentry` désormais couvert).
4. **Collision Flyway confirmée par inventaire** : local `develop`/notre branche porte V16 + V19–V21 (stock) ; la chaîne amont porte V17–V20 (dont V17–V19 identiques en contenu à nos V19–V21) **plus** `V20__stock_entries` et `V21__notification`. La stratégie de renumérotation documentée en §20 s'étend d'un cran : **amont V17→V22, V18→V23, V19→V24, V20→V25, V21__notification→V26**. Conséquence d'ordre : **aucune nouvelle migration backend ne doit être créée localement avant cette fusion** (une V22 locale entrerait en collision avec la cible de renumérotation).
5. Chevauchement avec nos commits (`ArticleDto` M8, historique de connexions) : aucun fichier commun identifié dans le diff amont (`PurchaseOrderServiceTest` ±5 l. et `StockApiIntegrationTest` ±92 l. sont les seuls chevauchements de surface) — fusion attendue sans conflit de code, le chantier réel restant la renumérotation.

### 26.4 Impact sur la feuille de route

| Chantier | Avant cette découverte | Après |
|---|---|---|
| R7 (J5b) Frontend Entrées | bloqué par J2 | **débloqué par la fusion** de la chaîne amont |
| J7 Notifications (backend) | à implémenter | **déjà implémenté en amont** — reste le frontend (centre de notifications) après fusion |
| R7 Frontend Sorties/Alertes | bloqué | **toujours bloqué** : M11/M12 absents même après fusion (F9 partiellement levé) |
| M16 Audit / M14 Recherche / M17 Rapports | à implémenter | inchangé — à faire **après** la fusion (contrainte d'ordre des migrations, §26.3-4) |

### 26.5 Questions bloquantes nouvelles (PHASE 3)

Voir **Q7** (fusion de la chaîne amont) et **Q8** (priorité du prochain jalon) en §16. Aucune implémentation n'est engagée avant réponse — en particulier, la fusion amont conditionne l'ordre des migrations et donc tout nouveau travail backend.

---

## 27. Revue du 2026-09-21 (reprise — PHASE 0–1 rejouées)

### 27.1 Validations rejouées à HEAD courant

| Vérification | Résultat |
|---|---|
| Frontend `npm run typecheck` (`tsc --noEmit`) | ✅ 0 erreur |
| Frontend `npm test` (vitest) | ✅ 31/31 |
| Frontend `npm run lint` | ✅ 0 erreur (22 avertissements préexistants) |
| Frontend `npm run build` | ✅ succès |
| Recherche de données mock dans `src/` hors `_designSystem` | ✅ aucun résultat |
| FRD intégrale re-extraite et relue (1 912 lignes, modules 1–17 + §18–29) | ✅ périmètre inchangé |

### 27.2 🔴 Point d'arrêt réel : fusion amont exécutée mais non commitée (backend)

Le plan v2.8 présentait **Q7 comme « en attente de décision »**. L'inspection du dépôt backend révèle que **la fusion a depuis été exécutée** — sur une nouvelle branche `feature/sgs-j7-notifications` — et est **entièrement stagée mais non commitée** :

| Élément constaté (preuve) | Détail |
|---|---|
| Contenu de la fusion | **60 fichiers stagés** (+6 008 / −12) : modules `stockentry` complets (**Module 10** : contrôleur lecture seule `/stock-entries`, service, DTO, entity, mapper, repository) et `notification` complets (**Module 15** : `NotificationController` 7 endpoints, entités, `NotificationDispatcher`, `NotificationRecipientResolver`, `NotificationRetryScheduler`, événements typés, e-mail) |
| Migrations sur disque | V1–V16, V19–V21 (stock, **contenu adapté**) + **V22__stock_entries** + **V23__notification**. Variante par rapport à la stratégie §26.3-4 : le contenu amont V17–V19 (identique à nos V19–V21) a été **absorbé dans nos fichiers existants** (aucune renumérotation nécessaire) ; seuls amont V20→**V22** et V21__notification→**V23** sont renumérotés. Les numéros V17–V18 restent libres |
| Fichiers adaptés lors de la fusion (stagés `M`) | `GlobalExceptionHandler`, `ProductRepository`, `PurchaseOrderService` (branchement attendu de la réception → mouvements d'entrée), `StockService`, les trois migrations stock (checksums), `PurchaseOrderServiceTest` ; `NotificationEventFlowIntegrationTest` est **AM** (ajouté puis modifié — adaptation présumée au contrat d'API déballée, à confirmer par le run de tests) |
| Frontend | Inchangé : `feature/sgs-j6-commandes` @ `e5488e2`, **arbre propre** |

### 27.3 Conséquences sur la feuille de route

1. **Q7 est de facto tranchée** (option A exécutée par l'utilisateur) — voir §16 pour l'historique de la décision. Le bloqueur devient : **valider la fusion (`mvn test` complet), corriger les échecs éventuels, puis committer** — conformément à la DoD (§17), un jalon ne peut être déclaré livré sans preuve de validation.
2. Risque résiduel principal : les checksums Flyway de V19–V21 ont changé sur des environnements de dev ayant déjà appliqué ces versions → alignement `flyway_schema_history` à documenter dans le message de commit (même procédure qu'à J1, §19).
3. Une fois la fusion commitée, **toute nouvelle migration backend redevient possible (V24+)** — débloque M16 Audit et l'option « deux temps » de Q8.
4. R7-b/c (Sorties M11, Alertes M12) restent **toujours bloqués backend** : aucun code M11/M12 n'existe dans la chaène fusionnée (F9 partiellement levé — `stockexit` ne contient toujours qu'un contrôleur client hors périmètre).

### 27.4 Clôture de la fusion (décision Q-A actée le 2026-09-21)

| Étape | Résultat |
|---|---|
| `mvn test` initial sur la fusion stagée | ❌ 422 tests, **2 erreurs** (`RuptureGeneration`, timeouts async 10 s) — reproductibles en isolation de la classe, absents en isolation de la sous-classe |
| Diagnostic | **Fuite de stubbing Mockito entre classes `@Nested`** : le reset automatique `@MockBean` (MockitoTestExecutionListener) ne couvre que les champs déclarés sur la classe de test courante ; le champ `emailSender` vit sur la classe externe et n'est jamais réinitialisé. Le `doThrow("SMTP indisponible")` posé par `EmailFailure` (exécutée avant) fuyait vers `RuptureGeneration` — **échec déterministe, pas un flaky async** (le dump `>>> DIAG` montrait des lignes `EMAIL … err=SMTP indisponible` créées pendant les tests de rupture) |
| Correctif (1 ligne + commentaire) | `Mockito.reset(emailSender)` dans le `@BeforeEach` externe — restaure l'isolation voulue, n'affaiblit aucune assertion |
| Re-validation | `NotificationEventFlowIntegrationTest` **12/12**, puis suite complète **422/422** (0 échec, 0 erreur) — `BUILD SUCCESS` |
| Commit | **`e90bd8b`** sur `feature/sgs-j7-notifications` — commit de **fusion** (parents `bdba44e` + `71d72c8` « initialisation du module notification »), 60 fichiers, +6 025/−12, arbre propre. Aucun `git push` |
| Conséquence | Toute nouvelle migration backend redevient possible (V24+) — M16/M14/M17 débloqués côté ordre des migrations |

### 27.5 Prochaines étapes

| Ordre | Chantier | Statut |
|---|---|---|
| 1 | ~~Clôturer la fusion backend~~ | ✅ **Terminé** (§27.4, commit `e90bd8b`) |
| 2 | **Q-B actée le 2026-09-21 : R7-a (page Entrées de stock réelle)** puis J7 frontend (centre de notifications) | ✅ **R7-a terminé** (§28) — J7 frontend ensuite |
| 3 | M11/M12 backend (Sorties/Alertes) — migrations V24+ désormais possibles | À planifier |
| 4 | M16 Audit / M14 Recherche / M17 Rapports | Après 2–3 |

---

## 28. R7-a — Frontend Entrées de stock (2026-09-21)

Applique la décision Q-B : la page `/entrees` quitte `ModuleNotBuilt` et consomme le Module 10 fraîchement fusionné.

### 28.1 Contenu livré

| Élément | Détail |
|---|---|
| `types/api/stock-entry.dto.ts` (nouveau) | `StockEntryDto` miroir exact de `StockEntryResponse` (produit, entrepôt, quantité reçue, chaîne `goodsReceipt`/`purchaseOrder`/fournisseur, auteur, horodatage) + `StockEntryFilters`. Commentaire : jamais d'écriture (RM-02/CA-10, immuabilité FRD §10) |
| `services/stock-entry.service.ts` (nouveau) | `GET /stock-entries` (liste filtrée, paginée) et `GET /stock-entries/{id}` (détail tracé). LECTURE SEULE — aucun endpoint d'écriture n'existe côté serveur |
| `features/stock-entries/hooks/use-stock-entries.ts` (nouveau) | `useStockEntries` — `placeholderData` (pas de retour au squelette en pagination) |
| `constants/query-keys.ts` | Groupe `stockEntries` (`list`, `detail`) |
| `pages/Entrees.tsx` (nouveau) | Liste paginée : produit, entrepôt, quantité reçue (en `+`, ton success), commande fournisseur **liée** (`/commandes/{id}`), fournisseur, date + auteur. Filtres **serveur** entrepôt + période (7/30/90 j via `performedFrom` ISO). Dialog de **traçabilité** (CA-09/RM-16) alimenté par le détail serveur : commande → réception → mouvement. Bandeau explicite « aucune saisie manuelle » |
| `App.tsx` | Route `/entrees` : `ModuleNotBuilt` → `<Entrees />` ; commentaire mis à jour (Seuls M11 Sorties et M12 Alertes restent annoncés indisponibles) |

Aucun composant, couleur ou style nouveau (PHASE 5) : `PageHeader`, `Toolbar`/`FilterSelect`/`ActiveFilters`, `DataTable`/`TableCard`/`Pagination`, `EmptyState`, `TableSkeleton`, `Pill`, `Dialog`, `Button` — et les états loading/empty/error complets (empty contextualisé selon filtres actifs).

### 28.2 Incidents traités en cours de jalon

1. **Échec déterministe de 2 tests backend** (découvert par le rejeu `mvn test` exigé par la DoD, cf. §27.4) : fuite de stubbing `@MockBean` entre classes `@Nested` — corrigé et committé avec la fusion (`e90bd8b`).
2. **Validation Flyway en échec au démarrage** (`Migration checksum mismatch` V19/V20/V21 contre la base de dev `sgs_dev`) : conséquence attendue de la renumérotation « absorbée » (§27.2). Diff vérifié commit par commit : **uniquement des commentaires** ont changé, aucun DDL — alignement de `flyway_schema_history` sur les checksums locaux (équivalent `flyway repair`, 3 lignes mises à jour), puis démarrage OK. Les autres postes de dev devront appliquer la même procédure (documentée dans le message de commit `e90bd8b`).

### 28.3 Validations

| Vérification | Résultat |
|---|---|
| Backend `mvn test` (suite complète) | ✅ **422/422**, 0 échec, 0 erreur — `BUILD SUCCESS` |
| Démarrage réel de l'API (Spring Boot, profil dev, PostgreSQL 5433) | ✅ `Started SgsBackendApplication`, validation Flyway passée |
| Smoke API réel : `POST /auth/login` (admin) | ✅ HTTP 200 |
| Smoke API réel : `GET /stock-entries?page=0&size=5` | ✅ HTTP 200 — `{content:[], totalElements:0}` au contrat déballé, conforme au type frontend (page vide cohérente : aucune réception validée depuis la fusion) |
| Smoke API réel : `GET /notifications`, `GET /notifications/unread-count` | ✅ HTTP 200 (contrats confirmés pour le jalon J7 frontend) |
| Frontend `tsc --noEmit` | ✅ 0 erreur |
| Frontend `vitest` | ✅ 31/31 |
| Frontend `eslint` | ✅ 0 erreur (22 avertissements préexistants) |
| Frontend `vite build` | ✅ succès |

**Non vérifié** : le rendu visuel de la page dans un navigateur (aucun flux réel disponible : la table `stock_entries` est vide tant qu'aucune réception n'est validée). Le contrat, la navigation et les états sont validés par code + smoke API ; un contrôle navigateur complet devra suivre la première réception réelle (recette R7-b/J10).

### 28.4 État git

| Dépôt | Branche | Commit | Arbre |
|---|---|---|---|
| `gestion_stock_backend` | `feature/sgs-j7-notifications` | `e90bd8b` (fusion Modules 10+15 + fix test) | propre |
| `gestion_stock_complet` | `feature/sgs-r7a-entrees` (créée depuis `feature/sgs-j6-commandes`) | `527c12f` (6 fichiers, +477/−14) | propre |

Aucun `git push`. L'API Spring est laissée démarrée sur le port 8080 pour la session de développement.

---

## 29. J7 — Frontend Notifications (2026-09-21)

Suite de R7-a (Q-B) : le centre de notifications consomme le Module 15 fusionné au jalon précédent. La route `/notifications` quitte `ModuleNotBuilt`.

### 29.1 Contenu livré

| Élément | Détail |
|---|---|
| `types/api/notification.dto.ts` + `services/notification.service.ts` (nouveaux) | Miroirs des DTOs backend : `NotificationResponse` (avec `typeLabel`, `referenceType/Id` pour les liens profonds, `deliveryStatus`), préférences RM-03, `unread-count`. Endpoints self-service — le destinataire est résolu côté serveur, jamais en paramètre |
| `features/notifications/` (nouveau) | Hooks TanStack (`list`, `unreadCount` avec refetch 60 s, `preferences`, mutations `markAsRead`/`markAllAsRead`/`updatePreferences` — chaque mutation invalide le groupe `notifications`, donc la pastille) + `NotificationPreferencesCard` |
| `NotificationPanel.tsx` (réécrit) | **Mêmes visuels que la maquette d'origine**, désormais typés sur les données réelles : icônes par type d'événement (`STOCK_RUPTURE` → danger…), lien profond `PRODUCT`/`PURCHASE_ORDER`, aperçu des 7 dernières in-app, « tout lire ». Le canal EMAIL n'est pas affiché (un enregistrement par canal, RM-04) |
| `Topbar.tsx` | Cloche **remontée** (elle avait été retirée faute de backend) : pastille réelle, ouverture du panneau, mutations |
| `pages/Notifications.tsx` (nouveau) | Centre complet : historique in-app paginé, filtre « non lues », statut de diffusion (Pill), actions « Consulter » (lien profond, marque lu au passage) / « Marquer comme lue » / « Tout marquer » ; états loading/empty/error complets |
| `pages/Profil.tsx` | Carte « Préférences de notification » : matrice type × canal avec toggles optimistes (`aria-pressed`, même motif visuel que la matrice Rôles), mention des valeurs par défaut (`defaultValue`) |
| `App.tsx` / `navigation.ts` | Route `/notifications` réelle ; commentaires à jour — seuls **Alertes (M12)**, **Audit (M16)** et **Recherche (M14)** restent annoncés indisponibles |

### 29.2 Validations

| Vérification | Résultat |
|---|---|
| Frontend `tsc --noEmit` | ✅ 0 erreur |
| Frontend `vitest` | ✅ 31/31 |
| Frontend `eslint` | ✅ 0 erreur (22 avertissements préexistants) |
| Frontend `vite build` | ✅ succès |
| Smoke API réel (API démarrée au jalon R7-a) | ✅ `GET /notifications` (page déballée), `GET /notifications/unread-count`, `GET /notifications/preferences` (matrice complète IN_APP+EMAIL par type) → **HTTP 200**, formes conformes aux types frontend |

**Non vérifié** : rendu navigateur avec des notifications réelles — aucun événement notifiable n'a encore été déclenché (aucune rupture/réception depuis la fusion). Le premier cycle « réception partielle / vente sous seuil » produira les premières notifications ; contrôle visuel à faire alors. La livraison d'e-mails (Mailpit) est couverte côté backend par les tests d'intégration du Module 15.

### 29.3 État git

| Dépôt | Branche | HEAD | Arbre |
|---|---|---|---|
| `gestion_stock_complet` | `feature/sgs-j7-notifications` (créée depuis `feature/sgs-r7a-entrees`) | `e30376b` (11 fichiers, +877/−85) | propre |
| `gestion_stock_backend` | `feature/sgs-j7-notifications` | `e90bd8b` (inchangé) | propre |

Aucun `git push`. Chaîne frontend linéaire : `e5488e2` (j6) → `527c12f` (R7-a) → `e30376b` (J7).

### 29.4 Restant

- **M12 Alertes** (backend puis frontend), **M11 Sorties** (backend puis frontend) — le cœur opérationnel restant de la FRD.
- **M16 Audit**, **M14 Recherche**, **M17 Rapports** (transverse).
- Contrôles navigateur des nouveaux écrans dès qu'un flux réel produit des données (recette J10).

---

## 30. J3 — Backend Module 11 Sorties de stock (2026-09-21)

### 30.1 Contenu livré

US-BE-035 (FRD §11) — 10 fichiers, +1 294 lignes, aucun module existant modifié :

| Pièce | Détail |
|---|---|
| **Migration V24__stock_exits.sql** | Table append-only + CHECK (`quantity > 0`, types connus, motif obligatoire LOSS/DAMAGE/EXPIRATION) + 4 index + permissions `STOCK_EXIT_READ`/`STOCK_EXIT_CREATE` (**ids 036/037** — collision 034/035 avec V23 détectée et corrigée avant exécution) rôles ADMIN/WAREHOUSE_MANAGER/STOCK_CLERK |
| **Entité/enum** | `StockExit` (append-only, comme `StockEntry`/`StockAdjustment`), `StockExitType` = SALE/LOSS/DAMAGE/EXPIRATION exclusivement (RM-01) |
| **Service** | Verrou pessimiste produit (même mécanique que Module 10, RM-14), contrôle **disponible = actuel − réservé** (RM-04), sortie ÉGALE au disponible autorisée (FRD §25), stock absent → 422 (jamais créé implicitement, RM-11), motif conditionnel → **422 BUSINESS_RULE_VIOLATION** (400 réservé aux erreurs de champs structurelles), décrémentation via la seule `Stock.adjustCurrentQuantity` (invariants d'entité, CA-15), isolation `WarehouseContext` (recherche + détail, 403) |
| **API** | `POST /api/v1/stock-exits` (201), `GET /api/v1/stock-exits` (filtres entrepot/type/produit/période, pagination tri `performedAt` desc), `GET /api/v1/stock-exits/{id}` — aucune route PUT/DELETE (immutabilité, 405) |

### 30.2 Validations

- Tests d'intégration API : **15/15** (création + traçabilité, sortie égale au disponible, réservé non mobilisé, dépassement 422, motif conditionnel, payload invalide 400, produit archivé 422, produit inconnu 404, immutabilité 405, permissions 403, isolation entrepôt, vue consolidée admin global, filtres/pagination).
- Suite backend complète : **437/437** (422 + 15), `BUILD SUCCESS`.
- **Smoke réels** (API démarrée sur sgs_dev, V24 appliquée au démarrage) : login admin → `POST /stock-exits` **201** (traçabilité complète dans la réponse : produit ART-0001, entrepot WH001, `performedBy=admin`) → stock décrémenté **20 → 17** vérifié sur `GET /stocks/...` → dépassement **422 INSUFFICIENT_STOCK** avec message exact (« disponible = 17, demande = 999 »).

**Non vérifié** : rendu navigateur (la page frontend Sorties fait partie du jalon frontend M11, non commencé). Une vente réelle de 3 unités a été enregistrée en base de dev lors du smoke (tracée, volontaire — preuve de bout en bout).

### 30.3 État git

| Dépôt | Branche | HEAD | Arbre |
|---|---|---|---|
| `gestion_stock_backend` | `feature/sgs-j3-sorties` (créée depuis `feature/sgs-j7-notifications`) | `15cd6a1` | propre |

Aucun `git push`. La branche porte le Module 11 backend ; le jalon frontend (page Sorties + dialog d'enregistrement) s'appuiera sur `STOCK_EXIT_READ/CREATE` et le contrat déballé ci-dessus.

### 30.4 Restant

- **M12 Alertes backend** (consommation des seuils post-entrée/sortie — le flux Rupture du Module 15 est déjà branché sur les mouvements) puis **frontend Alertes**.
- **Frontend M11 Sorties** (page + dialog d'enregistrement, motif conditionnel par type).
- **M16 Audit**, **M14 Recherche**, **M17 Rapports** ; contrôles navigateur au premier flux réel.

---

## 31. R8 — Frontend Module 11 Sorties de stock (2026-09-21)

### 31.1 Contenu livré

7 fichiers, +796/−15 — page `/sorties` réelle (quitte `ModuleNotBuilt`) :

| Élément | Détail |
|---|---|
| **Liste** | Pagination serveur, filtres entrepôt / type (Vente, Perte, Casse, Expiration) / période — tous appliqués par le backend ; Pill par type, motif tronqué, quantité en négatif, auteur + horodatage |
| **Dialog d'enregistrement** | Gardé par `STOCK_EXIT_CREATE` : recherche serveur des produits (`GET /articles?search`, affichage du total pour inviter à affiner), entrepôt via `SelectField`, aperçu du **disponible serveur** (`GET /stocks`, actuel − réservé) avec refus d'aperçu au-delà (FRD §25) et avertissement quand aucun stock n'est référencé (RM-11), **motif conditionnel** obligatoire pour Perte/Casse/Expiration (RM-05, libellé + validation anticipée) |
| **Permissions** | `sorties: { read: STOCK_EXIT_READ, create: STOCK_EXIT_CREATE }` — et **`entrees: { read: STOCK_ENTRY_READ }` ajoutée (oubliée en R7-a)** : la sidebar masquait la page Entrées faute de correspondance |
| **Invalidations** | Après création : `stock-exits` + `stocks` (décrément) ; notification succès avec produit/entrepôt réels |

### 31.2 Validations

- `tsc` **0 erreur** (4 erreurs initiales corrigées : import inutilisé, handlers typés), vitest **31/31**, eslint **0 erreur** (23 avertissements préexistants), build OK (3,37 s).
- Smoke réel : `GET /stock-exits` **HTTP 200** avec la vente du smoke J3 visible (SALE, Machine à laver, ×3, `typeLabel` « Vente ») — contrat déballé confirmé côté UI.

**Non vérifié** : rendu navigateur complet du dialog (flux de saisie réel) — la structure et le contrat sont vérifiés par types et smoke ; contrôle visuel à la recette J10. La création depuis l'UI n'a pas été rejouée (le smoke POST réel a déjà été fait au jalon J3 backend).

### 31.3 État git

| Dépôt | Branche | HEAD | Arbre |
|---|---|---|---|
| `gestion_stock_complet` | `feature/sgs-r8-sorties` (créée depuis `feature/sgs-j7-notifications`) | `fdefe55` | propre |

Aucun `git push`. Chaîne frontend : `e5488e2` (j6) → `527c12f` (R7-a) → `e30376b` (J7) → `fdefe55` (R8).

### 31.4 Restant

- **M12 Alertes** backend puis frontend (dernier module opérationnel).
- **M16 Audit**, **M14 Recherche**, **M17 Rapports** (transverse).
- Contrôles navigateur au premier flux réel (recette J10).

---

## 32. J4 + R9 — Module 12 Alertes, backend puis frontend (2026-09-21)

### 32.1 Backend livré (J4 — `748782a`, branche `feature/sgs-j4-alertes`, 14 fichiers +1 208)

US-BE-036 (FRD §12) — le module `alert` (package vide) est implémenté, et les événements `LowStockEvent`/`StockRuptureEvent` du Module 15, **jusqu'ici jamais publiés**, sont enfin émis :

| Pièce | Détail |
|---|---|
| **Migration V25** | Table `stock_alerts` (un enregistrement par ÉPISODE) + **index unique partiel `uq_stock_alerts_open`** (une seule alerte ouverte par couple Produit × Entrepôt — idempotence FRD §12 en base) + permission `ALERT_READ` (id 038, rôles ADMIN/MANAGER/CLERK) |
| **AlertEvaluator** | Évaluation **synchrone** dans la transaction de chaque mouvement : disponible == seuil → LOW, 0 < dispo < seuil → CRITICAL, 0 → RUPTURE (arbitrage documenté dans `LowStockEvent` — seuil intermédiaire configurable resté point ouvert, pas de table de config) ; création / escalade / levée (UC-11.3) / re-déclenchement en nouvel épisode ; événements Module 15 émis après commit (écouteur AFTER_COMMIT) |
| **Branchements** | Trois points d'appel : sortie M11 (déclencheur principal FRD), ajustement M9 (`StockService.adjust`), réception M10 (`applyEntryIncrease`) ; `StockServiceTest` mis à jour (mock `AlertEvaluator`) |
| **API** | `GET /alerts` (filtres entrepôt/niveau/openOnly/produit), `GET /alerts/summary` (compteurs par niveau, consolidé admin), `GET /alerts/{id}` — isolation `WarehouseContext` |

Validations : tests d'intégration **7/7** (cycle de vie complet UC-11.1→11.2→11.3, branchements, filtres, synthèse, permissions/isolation), suite complète **444/444**. Smoke réels : sortie ×17 → 201, alerte **RUPTURE ouverte** (dispo 0, par admin), `summary` {rupture: 1}, **notification STOCK_RUPTURE créée en base** (lignes in-app SENT, e-mail FAILED sans SMTP — comportement tracé).

### 32.2 Frontend livré (R9 — `ba562e0`, branche `feature/sgs-r9-alertes`, 8 fichiers +478/−25)

Page `/alertes` (quitte `ModuleNotBuilt`) : KPI des alertes ouvertes par niveau (accents danger/warning, hint « vue consolidée » pour l'admin), liste des épisodes filtrée serveur (entrepôt, niveau, ouvertes uniquement), disponible/seuil alignés, date de levée + auteur, refetch 60 s (liste + synthèse). **L'item Alertes revient dans la navigation** (retiré faute de backend depuis l'audit initial) avec `alertes: read = ALERT_READ`. Validations : tsc 0 erreur, vitest 31/31, lint 0 erreur, build OK ; smoke `GET /alerts` + `/alerts/summary` HTTP 200 au contrat déballé.

**Non vérifié** : rendu navigateur (recette J10). La base de dev porte désormais une alerte RUPTURE ouverte (Machine à laver, WH001) — utile pour le contrôle visuel.

### 32.3 État git

| Dépôt | Branche | HEAD | Arbre |
|---|---|---|---|
| `gestion_stock_backend` | `feature/sgs-j4-alertes` (depuis `feature/sgs-j3-sorties`) | `748782a` | propre |
| `gestion_stock_complet` | `feature/sgs-r9-alertes` (depuis `feature/sgs-r8-sorties`) | `ba562e0` | propre |

Aucun `git push`.

### 32.4 Restant

- **M16 Audit**, **M14 Recherche**, **M17 Rapports** (transverse) — derniers modules.
- Recette navigateur J10 des écrans récents (une rupture réelle est en base pour l'occasion).

---

## 33. J5 + R10 — Module 14 Recherche globale, backend puis frontend (2026-09-21)

### 33.1 Backend livré (J5 — `b415ccc`, branche `feature/sgs-m14-recherche`, 4 fichiers +730)

- **Endpoint unique** `GET /api/v1/search?q=` : Produits (nom, code, code-barres), Commandes
  (numéro, fournisseur associé), Fournisseurs (nom, contact, e-mail), Catégories (nom),
  Entrepôts (nom, code), Utilisateurs (nom, e-mail, username) — **groupés par type** avec
  comptage exact et aperçu limité à 5 par groupe, tri `updatedAt` desc.
- **Règles FRD §14** : un type n'est cherché que si l'appelant a la permission de lecture du
  module (convention des contrôleurs) ; commandes et entrepôts bornés au `WarehouseContext`
  pour les non-administrateurs ; terme de 2 caractères minimum. Service auto-contenu (JPQL
  via `EntityManager`, **aucun repository modifié**), lecture seule. Option Elasticsearch
  non retenue à cette volumétrie (option FRD).
- **Tests** : 5 tests d'intégration (groupement, code/nom/barcode, filtrage par permission
  par groupe, périmètre entrepôt, admin consolidé) — **suite 449/449**.

### 33.2 Frontend livré (R10 — `c238313`, branche `feature/sgs-r10-recherche`, 5 fichiers +197/−33)

- **Palette ⌘K rebranchée** : la navigation par écrans (filtrée permissions) est conservée et
  complétée par les **résultats serveur groupés** (icônes dédiées par type, `route` fournie
  par le backend → navigation directe), recherche debouncée 300 ms à partir de 2 caractères,
  `placeholderData` contre le flash vide, spinner pendant le fetch.
- Contrats alignés sur la **réponse réelle** (types enum `PRODUCT`/`ORDER`/`SUPPLIER`/
  `CATEGORY`/`WAREHOUSE`/`USER`, champ `total`, `route`) ; aucun filtrage d'autorisation
  côté client (règle FRD §14).

### 33.3 Validations

- Backend **449/449** ; smoke réels sur API relancée : `/search?q=art` (3 produits),
  `/search?q=on` (produit + catégorie + utilisateur), `/search?q=tou` (entrepôt) — 200 au
  contrat déballé ; terme court traité. Incident d'environnement réglé en cours de smoke :
  `ADMIN_USER` absent du `.env` (identifiant réel `admin` lu en base), l'endpoint
  `/actuator/health` répond 503 par l'indicateur mail sans SMTP en dev (connu, non bloquant).
- Frontend : tsc 0 erreur · eslint 0 erreur · vitest 31/31 · build OK.

### 33.4 Restant

- **M16 Audit** (journal des actions) et **M17 Rapports** — derniers modules.
- Recette navigateur J10 (palette incluse — rendu ⌘K non exercé dans un navigateur à ce jalon).

---

## 34. J6 + R11 — Module 16 Journal d'audit, backend puis frontend (2026-09-21)

### 34.1 Backend livré (J6 — `a3fd587`, branche `feature/sgs-m16-audit`, 28 fichiers +1 163)

- **Migration V26** : table `audit_logs` append-only — auteur, action (vocabulaire fermé
  CHECK), entité cible, entrepôt du périmètre, IP, valeurs ancienne/nouvelle **STRUCTURÉES**
  en jsonb (FRD §16, jamais de texte libre). Immuabilité à trois niveaux : entité sans
  setter métier, **aucune route d'écriture**, trigger PostgreSQL (mécanique V21) rejetant
  toute UPDATE/DELETE — vérifié en conditions réelles (`psql` UPDATE/DELETE → ERROR).
- **AuditRecorder** : écriture DANS la transaction métier (REQUIRED — non-perte FRD §16 ;
  choix BLOCAGE du cas d'erreur : une action non tracée échoue). Acteur/IP résolus
  centralement ; auth (LOGIN_SUCCESS, LOGOUT) en REQUIRES_NEW (`recordAs`), à l'image de
  `LoginAttemptAuditWriter`.
- **Instrumentation sans exception** (périmètre FRD §16) : utilisateurs (création, update
  avec diff champ à champ, activation/désactivation, archivage), permissions individuelles
  (GRANT/REVOKE), rôles, fournisseurs, catégories/sous-catégories, produits (diff réutilisant
  `ProductHistory`), commandes (création/validation/annulation), mouvements (ajustement
  avant/après, sorties, réceptions), connexions.
- **Consultation** : `GET /audit-logs` (filtres acteur/action/entité/entrepôt/période) +
  `GET /audit-logs/{id}`, `AUDIT_READ`, isolation entrepôt `WarehouseContext` (AUD-05).
- **Tests** : 7 tests d'intégration nouveaux — suite **456/456** ; mocks `AuditRecorder`
  ajoutés aux tests unitaires impactés, stubs `save()` assignant un id comme le persist.

### 34.2 Frontend livré (R11 — `6ae4576`, branche `feature/sgs-r11-audit`, 8 fichiers +455/−14)

- Page `/audit` : liste paginée filtrée serveur (auteur, action, entité, entrepôt), Pill par
  action à tonalité sémantique, aperçu des valeurs structurées, IP + horodatage.
- L'item **Journal d'audit** revient dans la navigation (Administration), gardé par
  `AUDIT_READ`. Lecture seule par construction (zéro action d'écriture proposée).

### 34.3 Validations

- Backend **456/456** ; smoke réels sur API relancée (V26 appliquée) : login → entrée
  `LOGIN_SUCCESS` créée (`actor=admin`, `ip=::1`, payload structuré), `GET /audit-logs` 200,
  filtre par action, et **immuabilité prouvée en base** (UPDATE/DELETE rejetées par le trigger).
- Frontend : tsc 0 erreur · eslint 0 erreur · vitest 31/31 · build OK.

### 34.4 Restant

- **M17 Rapports** (exports et statistiques — le contrôleur stub `/reporting` attend le
  branchement réel) — dernier module opérationnel.
- Recette navigateur J10 (une rupture réelle attend en base pour l'occasion).

---

## Journal des mises à jour
- **v2.21 (2026-09-22)** : **revue de code FRD ↔ code et chantier 1 livré (§36)** — revue des 17 modules et des §18–29 sur l'état réel (backend `857c957`, SPA `4c8f937`) : 16 écarts listés, répartis en 3 priorités, et **8 chantiers retenus par l'utilisateur**. Chantier 1 « désactivation réellement bloquante + garde-fous FRD §1 » livré : nouveau statut `INACTIVE` distinct du verrouillage temporaire `LOCKED` (+ migration V28 avec reprise des données et contrainte CHECK), refus de connexion d'un compte désactivé, invalidation immédiate du cache d'authentification (une session déjà ouverte avec un JWT de 60 min reste opérationnelle sinon), garde-fous partagés (soi-même, dernier Administrateur actif, dernier Gestionnaire d'entrepôt) appliqués désormais à la désactivation comme à l'archivage. **481/481** `mvn test` (+11 tests) ; `tsc` 0 erreur, vitest 31/31, eslint 0 erreur, `vite build` OK. Reste : 7 chantiers (§36.6).
- **v2.20 (2026-09-21)** : **revue de clôture rejouée (PHASE 0–1/6) et plan du dernier module.** État vérifié sur les deux dépôts (voir §35) : AIB 16/17 conformes, M17=seul stub restant. Portes rejouées à HEAD : backend `mvn test` 456/456 (195 classes, 0 échec) · frontend `tsc` 0 · vitest 31/31 · eslint 0 erreur (23 avert.) · build OK. Plan de clôture posé : J9 (M17 backend, agrégations réelles + export), R12 (frontend Rapports), recettes J10 (C4, unicité DB, référentiel), fusions master/develop + push. Questions **Q9–Q11** posées (§35.8).
- **v2.19 (2026-09-21)** : **J6 + R11 livrés (Module 16 Journal d'audit, backend puis frontend)** — table `audit_logs` append-only (jsonb structuré, trigger immuable vérifié en base), `AuditRecorder` dans la transaction métier (non-perte), instrumentation exhaustive du périmètre FRD §16 (users, rôles, permissions, référentiel, commandes, mouvements, connexions), consultation filtrée `AUDIT_READ` avec isolation entrepôt. Frontend : page `/audit` réelle + item de navigation réactivé. Backend `a3fd587` (456/456), frontend `6ae4576` (tsc/vitest/lint/build verts). Restant : M17 Rapports, recette navigateur J10.
- **v2.18 (2026-09-21)** : **fusions + poussées GitLab (J5/R10)** — backend : `develop` = merge `9de328a` (J5, arbre vérifié **identique** à `feature/sgs-m14-recherche`, fast-forward de `origin/develop` contrôlé avant fusion), push `0649a21..9de328a` + branche de jalon `feature/sgs-m14-recherche` ; frontend : `master` = merge `6ab2d05` (R10, arbre identique à `feature/sgs-r10-recherche`, portes rejouées vertes sur master fusionné : tsc 0, 31/31, build OK), push `996cba9..6ab2d05` + branches `r10/r9/r8` (r9/r8 déjà à jour). Vérifié en remote par `ls-remote` : develop = 9de328a, master = 6ab2d05. Restant : M16/M17, recette navigateur J10.
- **v2.17 (2026-09-21)** : **J5 + R10 livrés (Module 14 Recherche globale, backend puis frontend)** — endpoint unique `GET /search?q=` multi-entités groupé par type avec filtrage par permission et périmètre entrepôt (449/449, 5 tests nouveaux) ; palette ⌘K rebranchée sur le serveur (debounce 300 ms, navigation directe par route serveur, zéro logique d'autorisation côté client). Contrats alignés sur la réponse réelle. Backend `b415ccc` sur `feature/sgs-m14-recherche`, frontend `c238313` sur `feature/sgs-r10-recherche`. Restant : M16/M17, recette navigateur J10.
- **v2.16 (2026-09-21)** : **fusions + poussées GitLab** — backend : `develop` = merges `903f987` (J3) + `0649a21` (J4), **push `298cca2..0649a21`** ; frontend : création du dépôt GitLab `projet_gestion_stock1/gestion_stock_complet` (décision utilisateur — l'ancien dépôt `gestion_stock_frontend` conservé intact), `master` = merges `68df8d5` (R8) + `996cba9` (R9), **push initial** (historique complet) + 7 branches de jalons. Pre-push : arbres de develop/master vérifiés **identiques** aux branches validées (les validations 444/444 et tsc/vitest/build s'appliquent tels quels), portes frontend rejouées vertes sur master fusionné. La revue de code est donc alignée sur ce qui est poussé : **Modules 9-12 + 15 livrés** (backend et frontend), restent M16/M14/M17 + recette navigateur.
- **v2.15 (2026-09-21)** : **J4 + R9 livrés (Module 12 Alertes, backend puis frontend)** — le package `alert` vide est implémenté : épisodes d'alerte (déclenchement/escalade/levée), idempotence par index unique partiel, évaluation synchrone branchée sur les trois mouvements, **activation des événements Module 15 jamais publiés** (première notification STOCK_RUPTURE réelle observée). Frontend : KPI + liste filtrée, item Alertes de retour dans la nav. Validations : backend 444/444, smoke rupture de bout en bout (sortie → alerte → notification) ; frontend tsc/vitest/lint/build verts. Backend `748782a`, frontend `ba562e0`. Restant : M16/M14/M17, recette navigateur.
- **v2.14 (2026-09-21)** : **R8 livré (frontend Module 11 Sorties)** — page `/sorties` réelle : liste filtrée serveur (entrepôt/type/période), dialog d'enregistrement gardé par `STOCK_EXIT_CREATE` avec recherche serveur des produits, aperçu du disponible serveur (`GET /stocks`) et motif conditionnel RM-05 ; correction au passage : permission `entrees` ajoutée à `MODULE_PERMISSIONS` (la sidebar masquait la page Entrées depuis R7-a). Validations : tsc 0, vitest 31/31, lint 0 erreur, build OK ; smoke `GET /stock-exits` 200 avec la vente du smoke J3 visible. Frontend `fdefe55` sur `feature/sgs-r8-sorties`. Restant : M12 (backend puis frontend), M16/M14/M17, recette navigateur.
- **v2.13 (2026-09-21)** : **J3 backend livré (Module 11 Sorties de stock, US-BE-035)** — migration V24 (collision d'ids de permissions 034/035 avec V23 détectée avant exécution, réalloués 036/037), entité append-only, service transactionnel (verrou pessimiste, disponible = actuel − réservé, motif conditionnel 422), API POST/search/{id} sans aucune route de mutation. **437/437** (15 tests nouveaux) ; smoke réels : POST 201 + décrémentation 20→17 + dépassement 422. Backend `15cd6a1` sur `feature/sgs-j3-sorties`. Restant : M12 backend puis frontend, frontend M11, M16/M14/M17.
- **v2.12 (2026-09-21)** : **J7 frontend livré** — centre de notifications branché sur le Module 15 : cloche + pastille réelles dans la Topbar, panneau d'aperçu (visuels de la maquette, données réelles, liens profonds), page `/notifications` complète (historique, filtre non lues, statut de diffusion, actions), préférences type × canal dans le Profil. Smoke réels HTTP 200 sur les 3 endpoints consommés ; tsc/vitest/lint/build verts. Frontend `e30376b` sur `feature/sgs-j7-notifications`. Restant : M11/M12 backend+frontend, M16/M14/M17, contrôles navigateur au premier flux réel.
- **v2.11 (2026-09-21)** : **R7-a livré (décision Q-B actée)** — page Entrées de stock réelle sur `GET /stock-entries` (lecture seule, filtres serveur entrepôt + période, dialog de traçabilité commande → réception → mouvement, lien vers la commande d'origine). Deux incidents traités : échec déterministe de 2 tests backend (fuite de stubbing `@MockBean` entre `@Nested`, cf. §27.4) et validation Flyway en échec au démarrage (checksums V19–V21 : **seuls des commentaires** ont changé, alignement de `flyway_schema_history` documenté). Validations : backend **422/422** + démarrage réel de l'API ; smoke réels `auth/login`, `stock-entries`, `notifications` tous HTTP 200 au contrat déballé ; frontend `tsc`/vitest 31-31/lint/build verts. Frontend `527c12f` sur `feature/sgs-r7a-entrees`. Non vérifié : rendu navigateur (table `stock_entries` vide tant qu'aucune réception n'est validée). Suite : **J7 frontend** (centre de notifications).
- **v2.10 (2026-09-21)** : **fusion backend clôturée (décision Q-A actée)**. Diagnostic de l'échec initial (422 tests, 2 erreurs) : **fuite de stubbing Mockito entre classes `@Nested`** — le reset automatique `@MockBean` ne couvre pas les champs de la classe externe ; correctif d'une ligne (`Mockito.reset` dans `@BeforeEach`), aucune assertion affaiblie. Re-validation : **422/422**, `BUILD SUCCESS`. Commit de fusion **`e90bd8b`** sur `feature/sgs-j7-notifications` (parents `bdba44e` + amont `71d72c8`), arbre propre, aucun `git push`. Migrations V24+ débloquées. **Q-B actée : R7-a (Entrées) puis J7 (notifications)** — implémentation lancée (§27.5).
- **v2.9 (2026-09-21)** : **revue de reprise exécutée (PHASE 0–1/6 rejouées)**. Frontend vert à HEAD (`tsc` ✅, vitest **31/31** ✅, lint 0 erreur ✅, build ✅, 0 mock). **Découverte majeure (§27.2)** : la fusion amont Q7 (Modules 10 + 15, 60 fichiers, +6 008 l.) a été **exécutée par l'utilisateur** sur `feature/sgs-j7-notifications` et est **stagée mais non commitée** ; renumérotation appliquée en variante absorbée (V19–V21 conservés, amont → V22/V23). Q7 de facto tranchée ; le bloqueur immédiat est la validation (`mvn test`) puis le commit. Questions **Q-A** (clôture de la fusion) et **Q-B** (priorité du jalon suivant, ex-Q8) posées en §27.4.
- **v2.8 (2026-09-20)** : **revue de reprise exécutée (PHASE 0–1/6 rejouées)** avant reprise du travail. Les deux dépôts sont propres sur `feature/sgs-j6-commandes` (frontend `e5488e2`, backend `bdba44e`) ; portes qualité vertes : `tsc` ✅, vitest **31/31** ✅, eslint **0 erreur** ✅, `vite build` ✅ (9,36 s), `mvn compile` ✅ ; aucun mock dans `src/`. **Découverte majeure (§26.3)** : la branche amont `origin/feature/generer_les_notifications` (non relevée lors des revues précédentes) contient le **Module 15 Notifications complet et testé** (+6 054 l., 61 fichiers) construit au-dessus du **Module 10** (`us_be_34`, non fusionné) — R7/J5b Entrées et le backend J7 sont donc débloqués par une fusion de chaîne, avec renumérotation Flyway amont V17–V21 → V22–V26 (stratégie §20 étendue) ; **aucune nouvelle migration backend ne doit être créée avant cette fusion**. M11/M12/M16/M14/M17 restent à implémenter. Questions **Q7–Q8** posées (§16). **revue de reprise exécutée (PHASE 0–1/6 rejouées)** avant reprise du travail. Les deux dépôts sont propres sur `feature/sgs-j6-commandes` (frontend `e5488e2`, backend `bdba44e`) ; portes qualité vertes : `tsc` ✅, vitest **31/31** ✅, eslint **0 erreur** ✅, `vite build` ✅ (9,36 s), `mvn compile` ✅ ; aucun mock dans `src/`. **Découverte majeure (§26.3)** : la branche amont `origin/feature/generer_les_notifications` (non relevée lors des revues précédentes) contient le **Module 15 Notifications complet et testé** (+6 054 l., 61 fichiers) construit au-dessus du **Module 10** (`us_be_34`, non fusionné) — R7/J5b Entrées et le backend J7 sont donc débloqués par une fusion de chaîne, avec renumérotation Flyway amont V17–V21 → V22–V26 (stratégie §20 étendue) ; **aucune nouvelle migration backend ne doit être créée avant cette fusion**. M11/M12/M16/M14/M17 restent à implémenter. Questions **Q7–Q8** posées (§16).
- **v2.7 (2026-09-19)** : **R6b livré** — second lot de purge (décision utilisateur explicite incluant les primitives du design system) : 5 orphelins, 3 groupes de clés de requête, cascade `stock-movement.dto` + `movement-type`, 10 primitives `components/ui` (`Card` incluse) — 17 fichiers supprimés (−221 lignes). Deux pièges traités : import multi-ligne de `Table` depuis `DataTable` (détecté par le build, restauré ; la preuve d'orphelinat exige désormais une passe sans ancre `from`) et lecture pipée du premier typecheck (contrôle négatif exécuté ; rejeux avec `PIPESTATUS`). Validations : `tsc` 0 erreur (contrôle négatif vérifié), vitest 31/31, lint 0 erreur (22 avertissements), build 3,22 s. Frontend `e5488e2`, aucun `git push`.
- **v2.6 (2026-09-19)** : **R5 livré (F6+F7)** — contrat article M8 complet (`prixAchat`, `codeBarre` unique, `emplacement`, sous-catégorie explicite), résolution **stricte** de la sous-catégorie (repli arbitraire supprimé, 409 explicite), avertissement vente à perte non bloquant, seuils relabellisés. **15 tests** facade nouveaux ; `mvn test` **336/336** ; frontend `tsc`/`vitest` 31/31/`lint`/`build` verts. Un commit par dépôt sur `feature/sgs-j6-commandes`.
- **v2.5 (2026-09-19)** : **revue de reprise exécutée (PHASE 0/1/6 rejouées)** avant reprise du travail. Constat conforme au plan : les deux dépôts sont propres sur `feature/sgs-j6-commandes` (frontend HEAD `0e4319c`, backend HEAD `2a93c9d`) ; `tsc` ✅, `vitest` **31/31** ✅, `eslint` **0 erreur** ✅, `vite build` ✅ (3,75 s), `mvn compile` ✅. Correctifs vérifiés ponctuellement dans le code : F1/F2 (`quantiteDisponible` et `getStockStatus` introuvables dans `src/`), R1/F3–F5 (dialog création piloté par `ROUTES.commandeFournisseurNew`, `flags.canEdit` rend un bouton), R4 (`useLoginHistory` → onglet Connexions sous `AUTH_VIEW_LOGIN_HISTORY`). Le point d'arrêt confirmé est **R5** (F6/F7), aucune décision bloquante nouvelle. → suite en §24.
- **v2.4 (2026-09-19)** : **R4 et R6 commités** en commits distincts sur `feature/sgs-j6-commandes` — frontend `55417a1` (R4) et `0e4319c` (R6), backend `2a93c9d` (R4). Le backend ne reçoit qu'un commit puisque R6 est purement frontend. Les deux arbres de travail sont propres, aucun `git push`. Constats de R6b consignés en §23.7 sans aucune modification (interrompu proprement, notamment : aucune dépendance interne à `components/ui/`, et impact bundle nul des primitives non importées).
- **v2.3 (2026-09-19)** : **R4 livré** — `GET /utilisateurs/{id}/login-history` (permission `AUTH_VIEW_LOGIN_HISTORY`, déjà seedée pour ADMIN et WAREHOUSE_MANAGER) + onglet « Connexions » sur la fiche utilisateur, monté sous condition de permission. Isolation multi-entrepôt appliquée dans le service, non seulement masquée côté interface. **11 tests** ajoutés (5 service + 6 contrôleur) ; `mvn test` **321/321**. Découverte connexe : `BusinessException(ErrorCode)` ne portait que le nom du code comme message — surcharge ajoutée pour l'endpoint, sans changer le comportement des appelants existants. `tsc` ✅, `vitest` 31/31 ✅, `eslint` 0 erreur ✅, `vite build` ✅. **R4 et R6 non commités.**
- **v2.2 (2026-09-19)** : **R6 livré** — 8 fichiers orphelins supprimés (6 services, 2 hooks) + `listEnRupture` retiré, chaque suppression prouvée par double recherche (chemin *et* symbole exporté). Validations : `tsc` ✅, `vitest` **31/31** ✅, `eslint` **0 erreur** ✅, `vite build` ✅ (empreinte de chunk modifiée). **5 orphelins supplémentaires et 3 groupes de clés de requête documentés en §22.3 comme R6b** — appliqués depuis (v2.7, §25). Le jalon J6 + R1/R2/R3 a été **commité** : frontend `feature/sgs-j6-commandes` (`038a86b`, `f1499ba`, `21170b6`, `7b47c1d`), backend `feature/sgs-j6-commandes` (`20154dd`). R6 **n'est pas commité**.
- **v2.1 (2026-09-19)** : **jalon R1–R3 + outillage de test livré.** Décisions Q4–Q6 actées (option A / option C / Vitest immédiat). F1–F5, F14 corrigés ; porte qualité débloquée (`lint` **0 erreur**) ; **Vitest introduit avec 31 tests** sur la logique de commande extraite en modules purs. Validations : `tsc` ✅, `vitest` **31/31** ✅, `eslint` **0 erreur** ✅, `vite build` ✅, `mvn compile` ✅, `mvn test-compile` ✅, tests `Product*` **0 échec** ✅. Le run `mvn test` complet n'a pas été rejoué. Aucune opération git exécutée — commits proposés en §21.7.
- **v2.0 (2026-09-19)** : **revue de code complète (PHASE 0–1 rejouée)**. Point d'arrêt identifié : **J6 (frontend Commandes fournisseurs) achevé à ~90 % mais non commité** (3 nouveaux fichiers, 2 modifiés). Validations : `tsc` ✅, `vite build` ✅ ; lint = **0 erreur dans le code applicatif**, les 45 erreurs venant du bundle tiers `_designSystem` (action R3). **11 écarts documentés (F1–F11)**, dont un bug d'affichage critique (F1 : `quantiteDisponible` renvoyé à `0` en dur → tous les produits affichés « Rupture ») et une logique de statut incorrecte (F2). 8 affirmations périmées du plan corrigées. Feuille de route révisée en R1–R8. Questions **Q4–Q6** posées.
- **v1.0 (2026-09-18)** : création après audit complet (PHASES 0–2). Questions Q1–Q3 posées.
- **v1.4 (2026-09-18)** : **J5a livré** (page Stock réelle + ajustement tracé, validé contre l'API en cours d'exécution). Incidents traités au passage : `.env` backend supprimé par la fusion J0 (restauré depuis l'historique, puis `POSTGRES_PASSWORD` aligné sur le volume réel — le mot de passe historique ne correspondait plus) ; `stock_adjustments` s'est avéré append-only **au niveau du trigger PostgreSQL** (le DELETE de nettoyage E2E est refusé par la base — preuve supplémentaire de la conformité FRD §16).
- **v1.3 (2026-09-18)** : branches J0 **fusionnées** (master frontend `c05f7c1`, develop backend) et **poussées** (GitLab `322c35a..298cca2`). Découverte : Module 9 réalisé en amont (US-BE-031), intégré — collision Flyway V16 résolue (V19–V21), tests stock alignés sur l'API déballée, **310/310**. J1 clos ; J2 en cours en amont ; J5a débloqué.
- **v1.2 (2026-09-18)** : **J0 terminé et validé** sur les deux dépôts (voir §19). Découvertes : dépôts git séparés, `.env` backend tracké (corrigé), test warehouse obsolète (corrigé).
- **v1.1 (2026-09-18)** : décisions utilisateur actées — **Q1 : backend inclus** (J1→J9) ; **Q2 : stock synchronisé transactionnellement** (verrou pessimiste + requête de cohérence admin) ; **Q3 : commandes clients non exposées**. Implémentation autorisée à partir de J0.

---

## 35. Revue de clôture du 2026-09-21 (PHASE 0–1 rejouées — point d'arrêt réel)

*Reprise de mission sur l'état réel (le document v2.19 déclarait M16 livré). Aucune modification de code : revue seule, preuves exécutées ci-dessous.*

### 35.1 État git exact (vérifié, les deux dépôts)

| Dépôt | Branche | HEAD | Arbre de travail | Remotes |
|---|---|---|---|---|
| `gestion_stock_complet` | `feature/sgs-r11-audit` | `6ae4576` | propre | `origin` = GitLab `projet_gestion_stock1/gestion_stock_complet` |
| `gestion_stock_backend` | `feature/sgs-m16-audit` | `a3fd587` | propre | `origin` = GitLab `projet_gestion_stock1/gestion_stock_backend` |

Branches d'intégration **en retard d'un jalon** : frontend `master` = `6ab2d05` (R10 fusionné, **R11 Audit non fusionné**) ; backend `develop` = `9de328a` (J5 fusionné, **J6 Audit non fusionné**). Les jalons antérieurs J0→R10 sont fusionnés et poussés (journal v2.18).

### 35.2 Preuves exécutées ce jour — toutes vertes

| Vérification | Résultat |
|---|---|
| Backend `mvn test` (suite complète, profils test H2) | ✅ **456/456**, 0 échec, 0 erreur (195 classes) — `BUILD SUCCESS` |
| Frontend `npm run typecheck` | ✅ 0 erreur |
| Frontend `npm test` (vitest) | ✅ **31/31** |
| Frontend `npm run lint` | ✅ 0 erreur, 23 avertissements préexistants |
| Frontend `npm run build` | ✅ succès (4,86 s) |

### 35.3 Constats de la revue — ce qui est réellement conforme

1. **AIB 16/17 conformes et branchés de bout en bout** : Modules 1–8 (référentiel, auth/RBAC, entrepôts, fournisseurs, commandes, catégories, produits M8 complet), 9–12 (stock, entrées, sorties, alertes), 13 (dashboard), 14 (recherche + palette ⌘K), 15 (notifications), 16 (audit). Vérifié par structure de packages, smokes passés aux jalons, contrats et la suite 456.
2. **Aucune donnée fabriquée** : `ModuleNotBuilt` ne subsiste que sur 2 routes — `/rapports` (M17, stub réel côté serveur) et `/recherche` (le backend M14 **existe** depuis J5 ; la route est un reliquat non relié à la navigation, la recherche n'étant offerte que via la palette ⌘K — voir Q10).
3. **Le stub M17 est le seul résidu backend** : `reporting` = 6 endpoints `isAuthenticated()` renvoyant zéros / listes vides / octets vides (fichier `modules/report/controller/ReportingController.java`, 88 l.). **Aucune permission `REPORT_*`** n'est seedée (grep migrations = 0). **Aucune bibliothèque Excel/PDF** dans `pom.xml` (grep poi/itext/jasper/opencsv = 0).
4. **Zones de réutilisation pour M17, identifiées** : modèle `DashboardService` (agrégation à la volée + `WarehouseContext`), `ApiResponse`/`ApiResponseUnwrapper` (DTO déballés), `PageResponse`, `Stock.currentQuantity × Product.purchasePrice` pour la valorisation, `stock_exits` (SALE) pour top-ventes, `stock_entries` + `purchase_order_lines.unitPrice` pour top-achats, `stock_alerts` (épisodes levés/ouverts) pour alertes/ruptures, `findAllByPerformedAtBetweenAndWarehouseIdIn` pour l'évolution. Tests : pattern `StockApiIntegrationTest` (intercepteur + `TestScopeHolder`) à répliquer.
5. **Frontend : l'essentiel de M17 est pré-câblé** : `types/api/reporting.dto.ts` (4 types prêts), clés de requête `dashboard.evolution/topVentes/topAchats` déjà typées par `ReportPeriodParams`, item de navigation `rapports` (`module: 'rapports'`, visible car `read: null`), `rapports: { read: null }` dans `MODULE_PERMISSIONS`, formulaires de locales, librairie **recharts** présente + composants DS `Chart`/`ChartContainer`/`ChartTooltipContent` + `ChartSkeleton`. Manque : service + hooks + page (remplace `ModuleNotBuilt`) + helper de téléchargement blob (aucun n'existe dans `api-client.ts`) + relier `read` à une vraie permission.

### 35.4 Code mort / reliquats relevés (à traiter à la clôture, jamais mêlés à une feature)

- `src/constants/permissions.ts` + `src/lib/permissions.ts` : matrice rôles→permissions héritée (contient `report:read`/`report:export`) — **0 import** de `lib/permissions.ts` (vérifié). À purger en R12/closure (même méthode §22.1).
- `src/types/api/reporting.dto.ts` : les 3 DTOs sont inimportés (seul `ReportPeriodParams` sert aux clés) — seront réactivés par R12, sinon épurés.
- Commentaires obsolètes : `navigation.ts` (« AUDIT_READ existe en base mais aucun contrôleur ne l'expose » — faux depuis J6) ; `App.tsx` blocage « Modules sans implémentation backend » (§ cada route) — à corriger quand `/recherche` et `/rapports` changent de statut.
- Constante de route `ROUTES.mouvements` (`/mouvements`) sans route ni item de navigation — reliquat du stub supprimé. À purger.
- Backend : permission `AUDIT_EXPORT` et `STOCK_VIEW_HISTORY` seedées mais sans endpoint consommateur — documentées, hors périmètre (pas de nettoyage d'infrastructure).

### 35.5 Plan — J9 (backend M17 Rapports)

Remplace le stub par des agrégations réelles, dans l'existant (aucune réécriture) :

| Élément | Détail prévu |
|---|---|
| **Permission** | Migration **V27__report_permissions.sql** : `REPORT_READ` (id `c…000039`, plage 035 libre mais réservée à la cohérence V24 commentaire), seed ADMIN / WAREHOUSE_MANAGER / STOCK_CLERK (convention modules récents). Contrôleurs `@PreAuthorize("hasAuthority('REPORT_READ')")`. Ajout symétrique dans `src/test/resources/data.sql` (ids de test 000010–000095) |
| **`ReportingService`** | Agrégation à la volée `@Transactional(readOnly=true)`, isolation `WarehouseContext` (`isGlobalAdministrator()` vs `allowedWarehouseIds`) sur **toute** requête : ① `dashboardStats` — `valeurTotaleStock = Σ(stocks.currentQuantity × product.purchasePrice)` (entrepôts autorisés, produits non archivés), `nombreArticles`, `nombreArticlesEnAlerte` / `EnRupture` (épisodes **ouverts** de `stock_alerts`, niveaux CRITICAL/LOW et RUPTURE), `nombreMouvementsDuMois` (entrées + sorties + ajustements du mois courant dans le périmètre), `tauxRotationStock` (définition FRD vérifiée à l'implémentation ; proxy documenté : sorties du mois / stock moyen du périmètre) ; ② `evolution-stock` — points par jour bornés `dateDebut/dateFin` (valeur reconstruite à partir des mouvements append-only, entrées/sorties cumulées du jour) ; ③ `top-ventes` — `stock_exits` type SALE groupés par produit, `quantite` = Σ, `montant` = Σ(quantité × `Product.salePrice`), top N (limite 10) ; ④ `top-achats` — `stock_entries` groupés par produit, montant via `purchase_order_lines.unitPrice` (repli `Product.purchasePrice`), top N |
| **Exports** | Selon décision **Q9** : `/export/excel` (XSSFWorkbook Apache POI) et `/export/pdf` (OpenPDF) réels, ou contrat réduit documenté. `responseType: 'blob'` + `Content-Disposition` |
| **Tests** | `ReportingApiIntegrationTest` (pattern `StockApiIntegrationTest` : intercepteur `TestScopeHolder` + `WarehouseContext.initialize`) — couverture : api dashboard (admin vs gestionnaire filtré), valorisation, top ventes/achats + période, évolution, filtrage entrepôt (aucune fuite hors périmètre), immuabilité des sources (lecture seule) ; permission 403 sans `REPORT_READ` |

### 35.6 Plan — R12 (frontend M17 Rapports)

Page `/rapports` réelle (quitte `ModuleNotBuilt`) :

| Élément | Détail prévu |
|---|---|
| **Contrat** | `reporting.dto.ts` conservé/ajusté au contrat serveur définitif ; `reporting.service.ts` (nouveau — n'existe pas) : `dashboardStats()`, `evolution(period)`, `topVentes(period)`, `topAchats(period)` + helpers blob `exportExcel(period)` / `exportPdf(period)` (`apiClient.get(...,{responseType:'blob'})` + `URL.createObjectURL`, motif inexistant aujourd'hui) |
| **Hooks/état** | `features/reporting/hooks/use-reporting.ts` (queries TanStack, `staleTime` ~5 mn, `placeholderData`) ; sélecteur de période (7/30/90 j ou bornes) réinitialisant la pagination/fetch |
| **Page `Rapports.tsx`** | KPI (recharts `ChartContainer`/`ChartTooltipContent` ou `KpiCard` selon les visuels) : valeur stock (money), nombre d'articles, alertes ouvertes, ruptures, mouvements du mois, taux de rotation ; graphe « Évolution de la valeur du stock » (aire) ; « Top ventes » et « Top achats » (barres) ; boutons Export Excel / PDF. **PHASE 5** : uniquement `PageHeader`, `KpiCard`, `SectionCard`, `Pill`, `EmptyState`, `CardSkeleton`/`ChartSkeleton`, primitives `Button`/`Select` existantes — aucun composant ni style nouveau |
| **Permissions/nav** | `MODULE_PERMISSIONS.rapports.read = 'REPORT_READ'` (la sidebar et la palette masquent/ouvrent selon `can('rapports')`) ; commentaires `App.tsx`/`navigation.ts` mis à jour ; locales `reporting` existantes réutilisées |
| **Purge associée** | `permissions.ts` + `lib/permissions.ts` (code mort prouvé), `ROUTES.mouvements` (reliquat), DTOs inutilisés après alignement |

### 35.7 Recettes de vérification finale (J10) — pas de migration backend au-delà de V27 avant ces contrôles

| # | Contrôle (constats antérieurs « à vérifier ») | Cible |
|---|---|---|
| C4 | Suppression d'entités référencées → **409 métier** (et non 500 brut) : sous-catégorie référencée, fournisseur référencé, entrepôt avec stock, rôle assigné | `GlobalExceptionHandler` (`DataIntegrityViolationException`) + tests |
| — | Unicité DB e-mail / username (contrainte V2 vérifiée) + capacité de login par identifiant | migrations + tests |
| — | Entrepôt : refus d'archivage si stock/commandes actifs (FRD M4, archivage seulement) ; fournisseur archivé non sélectionnable en commande ; catégorie non vide : blocage avec liste des dépendantes | services + tests |
| — | Mot de passe temporaire : durée de validité + expiration de session configurables (recommandations FRD §25) — **sinon documentés** | config |
| — | Déménagement/valorisation : contrôle de cohérence stock (= somme des mouvements) exposé à l'admin — conséquence décision Q2 | endpoint + test |
| — | Recette navigateur (UAT) : scénarios FRD A–D, dont la première réception réelle → entrée → alerte → notification (rupture réelle en base de dev : Machine à laver WH001) | E2E chrome/puppeteer ou manuel |
| — | README des 3 composants à jour ; document vivant §1–§18 alignés sur l'état final | docs |

### 35.8 Questions bloquantes (PHASE 3) — réponses attendues avant J9

**Q9 — Exports M17 : formats et dépendances.**
Le FRD (§12 J9) exige des exports « PDF/Excel réels ». Aucune bibliothèque d'export n'existe dans `pom.xml`.
*Ce qui est en jeu* : l'ajout de dépendances (Apache POI pour `.xlsx`, OpenPDF pour `.pdf`) est le seul chemin vers des exports réels serveur ; l'alternative est un contrat réduit (CSV/HTML imprimable) acceptable mais moins conforme à la FRD.
*Recommandation* : **option A — Apache POI (xlsx) + OpenPDF (pdf)**, deux dépendances Java standard, testées par l'API d'intégration (conditions réelles), exports réels sur les 4 jeux (dashboard, évolution, top ventes, top achats). *Alternative* : option B — Excel seul (POI), PDF remplacé par un export HTML imprimable ; option C — CSV compatible Excel, pas de PDF.

**Q10 — Route `/recherche` : page dédiée ou reliquat ?**
Le backend M14 (J5) et la palette ⌘K existent ; la route `/recherche` rend encore `ModuleNotBuilt` alors que le module **existe** (description devenue fausse), et aucun item de navigation ne la relie.
*Ce qui est en jeu* : porte une « page de résultats » complète (groupe par type, pagination, liens) — du travail frontend hors périmètre de la palette — ou supprime simplement le reliquat pour que la recherche reste la palette (surface élargie déjà livrée en R10).
*Recommandation* : **option A — suppression du reliquat** (route `/recherche` → redirection `/`, retrait du commentaire ou de la route) : la palette ⌘K est la surface de recherche dédiée et validée ; la FRD M14 est satisfaite par l'endpoint + la palette. *Alternative* : option B — construire une page de résultats autonome (complète mais non exigée explicitement).

**Q11 — Clôture git : fusions et poussées.**
Au point d'arrêt, `master` (frontend) et `develop` (backend) sont en retard d'un jalon (R11 / J6 non fusionnés) ; les jalons antérieurs sont fusionnés et poussés sur GitLab.
*Ce qui est en jeu* : après validation de M17 + recettes J10, faut-il **fusionner les branches de jalons dans `master`/`develop` et pousser** vers GitLab (stratégie du plan §15) — y compris R11/J6 en attente — ou laisser les branches de jalons telles quelles et fournir le rapport sans push ?
*Recommandation* : **option A — fusion + push après chaque jalon validé** (procédure identique à v2.18 : arbre vérifié identique à la branche validée, portes rejouées sur la branche d'intégration, push `--follow-tags`), y compris M16 en attente. *Alternative* : option B — validation et rapport seulement, opérations git laissées à l'utilisateur.

**Décisions actées (utilisateur, 2026-09-21)** :

- **Q9 → option A : Apache POI (.xlsx) + OpenPDF (.pdf)** — exports serveur réels sur les 4 jeux (dashboard, évolution, top ventes, top achats), testés en intégration, `Content-Disposition` + `responseType:'blob'` côté frontend.
- **Q10 → option A : suppression du reliquat `/recherche`** — la palette ⌘K reste la surface de recherche ; la route redirige vers `/` (retrait de la description erronée et du commentaire devenue fausse).
- **Q11 → option A : fusion + push par jalon validé** — procédure v2.18 (arbre identique vérifié, portes rejouées, push), **commencé par la fusion des jalons en attente : R11 (frontend → master) et J6 (backend → develop)**.

---

## 36. Revue de code FRD ↔ code du 2026-09-22 et chantier 1 — désactivation réellement bloquante (FRD §1)

*Revue demandée par l'utilisateur : « ce qui n'a pas encore été fait » par rapport au FRD. Périmètre réel lu : FRD intégral (1 912 lignes), backend `develop` `857c957`, SPA `gestion_stock_complet` `master` `4c8f937`, BFF, plan v2.20. La revue est **postérieure** aux jalons J0–J12, donc les constats d'obsolescence portent sur des modules livrés mais non rebranchés (§36.1, F2).*

### 36.1 Ce que la revue a établi

- **Les 17 modules existent réellement** côté backend **et** côté SPA : aucun écran `ModuleNotBuilt` ne subsiste (`App.tsx`), aucun service de données fabriquées.
- **16 écarts** ont été identifiés et classés en 3 priorités, dont 8 chantiers retenus par l'utilisateur (§36.6). Les deux plus graves, tous deux corrigés ou planifiés :
  - **E1 (corrigé, §36.2)** : un compte « désactivé » se reconnectait et se réactivait seul ;
  - **E2 (chantier suivant)** : le **tableau de bord M13 est resté à l'état d'avant M9–M12** — il annonce encore « Disponible au Module 10 » pour l'évolution de la valeur, les flux entrées/sorties et le top produits, affirme qu'« aucun journal d'audit n'est exposé par le backend » (faux depuis M16), calcule une « valorisation catalogue » = Σ prix d'achat **unitaires** au lieu de Σ(stock × prix d'achat) exigée par FRD §13, et dérive ses « articles à seuil » du catalogue au lieu des alertes M12.
- **Écarts P2 confirmés par lecture de code** (à traiter dans les chantiers 3 à 6) : catalogue de notifications M15 réduit à 6 types dont 2 jamais publiés (`PURCHASE_ORDER_RECEIVED`, `SYSTEM_ERROR`) ; mot de passe temporaire sans expiration ; politique de mot de passe et expiration d'inactivité non configurables ; collision `username` = e-mail non interdite (FRD §25) ; rapports M17 sans « historique des ruptures » ni rapport fournisseurs ; `AUDIT_EXPORT` sans endpoint ; seuil d'alerte par entrepôt (`stocks.alert_threshold`) non configurable ; contrôle de cohérence stock ↔ mouvements (décision Q2) absent.

### 36.2 Correctifs livrés (E1 — FRD §1 et §3)

| # | Problème (preuve) | Correctif |
|---|---|---|
| 1 | `UserService.deactivate` écrivait `LOCKED` **sans** `lockedUntil`, alors que `LOCKED` est le verrouillage automatique du Module 3. `AuthService.login` ne bloquait que `status == LOCKED && isLocked()` — or `User.isLocked()` exige `lockedUntil` — donc **la connexion passait**, puis `recordSuccess` repassait le compte `ACTIVE` | Nouveau statut **`INACTIVE`** (désactivation administrative), distinct de `LOCKED` (verrouillage temporaire) ; `deactivate` pose `INACTIVE` et nettoie `lockedUntil` / `failedLoginAttempts` |
| 2 | Une session déjà ouverte survivait à la désactivation : `UserAuthDataService` ne portait pas le statut, un JWT de 60 min restait accepté | `UserAuthDataService` refuse `INACTIVE` (401 dès la requête suivante) et `deactivate`/`activate` **évinc**ent la clé du cache d'authentification (TTL de 30 s sinon) |
| 3 | Les garde-fous FRD §1 n'existaient que sur l'archivage : auto-désactivation (bloquée en UI seulement), dernier Administrateur actif, dernier Gestionnaire d'entrepôt (FRD §4) | Trois garde-fous extraits en méthodes partagées `assertNotSelf` / `assertNotLastActiveAdmin` / `assertNotLastWarehouseManager`, appliqués aux **deux** opérations |
| 4 | Un compte désactivé pouvait être verrouillé par 5 tentatives échouées, puis **déverrouillé en `ACTIVE`** par expiration (`unlockIfExpired`) | `recordFailure` n'applique plus le verrouillage qu'aux comptes `ACTIVE` / `PENDING_ACTIVATION` ; `unlockIfExpired` ne lève plus qu'un statut `LOCKED` |
| 5 | Données déjà en base dans l'état ambigu (`LOCKED` sans échéance = désactivation écrite par l'ancien code) | **V28** : reprise `LOCKED` + `locked_until IS NULL` → `INACTIVE`, plus contrainte `chk_users_status` (la colonne n'était contrainte que par sa longueur) |
| 6 | Côté SPA, `Désactivé` et `Verrouillé` auraient été indiscernables (un seul libellé pour `LOCKED`) | `AccountStatusBadge` (`INACTIVE` → « Désactivé », ton `warning`), filtre de statut de `Users.tsx`, commentaire de `user.dto.ts` |

### 36.3 Tests ajoutés (11)

| Suite | Contenu |
|---|---|
| `UserServiceTest$DeactivateUser` (**7**) | désactivation → `INACTIVE` + verrous nettoyés + **cache évincé** + audit ; refus « propre compte » ; refus dernier administrateur ; refus dernier gestionnaire ; gestionnaire non unique → autorisé ; hors périmètre d'entrepôt → refus **avant** tout garde-fou métier ; réactivation → `ACTIVE` + cache évincé |
| `AuthServiceTest$Login` (**2**) | compte `INACTIVE` → refus avec le message FRD **et** vérification que le mot de passe n'est même pas comparé ni aucun jeton émis ; `LOCKED` sans échéance (données héritées) → refus |

Les deux tests de verrouillage existants restent verts **sans modification** : le message « Compte verrouille. Reessayez dans N secondes » dépend désormais de la présence d'une échéance, pas du collaborateur mocké.

### 36.4 Validations exécutées

| Vérification | Résultat |
|---|---|
| `mvn test` (**suite complète**) | ✅ **481/481**, 0 échec, 0 erreur (470 + 11), `BUILD SUCCESS` |
| `mvn test -Dtest=UserServiceTest,AuthServiceTest,ReportingApiIntegrationTest` | ✅ 84/84 (isolation du périmètre touché) |
| Frontend `tsc --noEmit` | ✅ 0 erreur |
| Frontend `vitest` | ✅ **31/31** |
| Frontend `eslint` | ✅ 0 erreur, 24 avertissements (3 `no-explicit-any`, 3 `no-non-null-assertion`, 18 `react-refresh`) — aucun dans les fichiers modifiés |
| Frontend `vite build` | ✅ 17,98 s |

**Incident de lecture écarté** : les rapports Surefire présents dans `target/` dataient du 2026-09-21 16:34 et montraient 7 échecs de `ReportingApiIntegrationTest` (dont une erreur de syntaxe JPQL). Le rejeu **à HEAD** donne 84/84 : ces échecs ne sont **pas** reproductibles et ne doivent pas être reportés comme un état courant — d'où la règle déjà appliquée au §25.2 (ne jamais lire un artefact de build sans vérifier son horodatage).

### 36.5 Non vérifié / limites

- **Aucun test d'intégration HTTP** sur le parcours « désactiver puis se connecter » : la couverture est unitaire (Service + AuthService) et le filtre JWT n'est pas exercé de bout en bout (il l'est indirectement par `ReportingApiIntegrationTest$AccessControl`).
- **Le statut `LOCKED` conserve la session en cours** (choix documenté dans `UserAuthDataService`) : la FRD ne restreint que la connexion pour un verrouillage temporaire, et il se lève seul. À rouvrir si le métier veut couper la session dès le 5ᵉ échec.
- **Contrainte `chk_users_status`** : toute nouvelle valeur de statut devra passer par une migration (comportement voulu).
- **Aucun commit n'a été créé** ; l'arbre de travail porte le chantier complet (7 fichiers backend dont la migration V28, 5 fichiers frontend, 1 fichier de plan).

### 36.6 Chantiers restants (ordre retenu par l'utilisateur)

| # | Chantier | Nature |
|---|---|---|
| 2 | **M13 — refonte du tableau de bord** sur les données réelles (valorisation Σ(stock × prix d'achat), produits critiques via alertes M12, entrées/sorties du jour, derniers mouvements, entrepôts actifs, retrait des sections « Disponible au Module 10 » et de la mention audit) | Backend + Frontend |
| 3 | **M15 — catalogue de notifications** : publier les événements manquants (commande créée/validée/envoyée, réception, nouveau fournisseur, permissions, mot de passe, verrouillage, erreurs système) et brancher `PURCHASE_ORDER_RECEIVED` / `SYSTEM_ERROR` | Backend |
| 4 | **M3 + §25** : expiration 72 h du mot de passe temporaire + régénération, politique de complexité configurable, expiration d'inactivité, interdiction `username` = e-mail d'un autre compte | Backend |
| 5 | **M17 + M16** : historique des ruptures, rapport fournisseurs, « moins utilisés », filtres, impression ; endpoint d'export du journal d'audit (`AUDIT_EXPORT`) | Backend + Frontend |
| 6 | **M9/M12** : configuration du seuil d'alerte par entrepôt et du niveau « Critique » ; contrôle de cohérence stock ↔ somme des mouvements (décision Q2) | Backend |
| 7 | **Recette et tests** : scénarios FRD A–D, tests manquants, portes qualité | Transverse |
| 8 | **Rangement des dépôts** : sort du Next.js hors périmètre, dépôt racine (3 sous-dépôts + ~100 fichiers d'autres projets), PDF du FRD restagé | Chore |

*Chantier 2 livré le 2026-09-22 → §37. Chantier 3 livré le 2026-09-22 → §38. Les chantiers 4 à 8 restent ouverts.*

---

## 37. Chantier 2 — refonte du tableau de bord M13 sur les données réelles (2026-09-22)

*Périmètre : backend `gestion_stock_backend` (develop) + SPA `gestion_stock_complet` (master). Aucun commit créé ; l'arbre de travail porte le chantier complet.*

### 37.1 Ce qui était faux, et ce qui le remplace

| Indicateur | État avant (É2 de la revue) | État après (FRD §13) |
|---|---|---|
| **Valorisation du stock** | « Valorisation catalogue » = **somme des prix d'achat unitaires** du catalogue — ne dépendait ni des quantités ni du stock | `stockValue` = **Σ(stock actuel × prix d'achat)** des produits **actifs** non archivés, calculée **par entrepôt puis consolidée** (règle 1 du §13) |
| **Produits critiques / en rupture** | « Articles à seuil d'alerte » dérivés du catalogue (`minQuantity > 0`), sans rapport avec le stock réel | Compteurs d'**épisodes d'alerte OUVERTS** du Module 12 (`LOW`, `CRITICAL`, `RUPTURE`) + aperçu de 20 produits en alerte avec **disponible, seuil et entrepôt** (règle 2) |
| **Entrées / sorties du jour** | absentes (« Disponible au Module 10 ») | `entryTotals` / `exitTotals` du jour (quantité **et** nombre de mouvements), par entrepôt puis consolidés (règle 3) |
| **Derniers mouvements** | absents | Flux **unifié** : réceptions M10, sorties M11 (quantité signée **négative**) et ajustements M9, triés du plus récent au plus ancien, bornés à 10, avec auteur, entrepôt et référence (N° de commande / type de sortie / motif) |
| **Entrepôts actifs** | absent | `activeWarehouseCount` + **ventilation par entrepôt** (valorisation, alertes critiques, ruptures) triée par valeur décroissante |
| **Écran d'accueil** | 4 sections « Indicateur non disponible — attend le module … » dont trois mentaient depuis M10/M11 (« Disponible au Module 10 ») et une affirmait « **Aucun journal d'audit n'est exposé par le backend** » (faux depuis M16) | Sections **retirées** ; à la place : alertes ouvertes (M12), derniers mouvements (M9–M11), commandes récentes (M6), ventilation par entrepôt, répartition des commandes, et **« Activité récente » branchée sur le journal d'audit réel (M16)** |
| **Filtre par entrepôt (Administrateur)** | inexistant | `GET /dashboard/summary?warehouseId=` — un identifiant **hors périmètre est refusé (403)**, jamais ignoré silencieusement (contrainte FRD §4) |
| **UC-12.3 (clic → liste filtrée)** | aucun indicateur cliquable | Les 8 indicateurs mènent au module source (Alertes, Stock, Entrées, Sorties, Produits, Entrepôts, Commandes) |

### 37.2 Backend (`modules/dashboard`)

| Fichier | Nature |
|---|---|
| `repository/DashboardRepository.java` | **Nouveau** (237 l.) — requêtes JPQL **auto-contenues** (même convention que `SearchService`/`ReportingRepository` : aucun repository d'un autre module modifié) : valorisation groupée par entrepôt, alertes ouvertes par entrepôt × niveau, aperçu d'alertes, totaux du jour, flux récents des trois natures, comptage catalogue, entrepôts actifs. Le chemin d'entrepôt diffère selon l'entité (`StockAlert.warehouse`, `StockAdjustment.stock.warehouse`) ; un périmètre vide **court-circuite** la requête au lieu de produire un `IN ()` dépendant du dialecte |
| `dto/DashboardSummaryResponse.java` | Réécrit — 17 champs + 5 records imbriqués (`AlertProduct`, `WarehouseStock`, `Movement`, `StatusCount`, `RecentOrder`) et l'enum `MovementType` (RECEIPT/EXIT/ADJUSTMENT) ; chaque champ est documenté par `@Schema` |
| `service/DashboardService.java` | Réécrit (356 l. modifiées) — résolution du périmètre (vue consolidée Admin / liste d'entrepôts autorisés / 403 hors périmètre), fusion chronologique des trois sources de mouvements, mappers |
| `controller/DashboardController.java` | `@RequestParam(name = "warehouseId", required = false)` documenté (200 / 401 / **403**) |
| `test/.../DashboardServiceTest.java` | Réécrit : 14 tests exécutés en 6 groupes (`Scope`, `Valuation`, `Alerts`, `Movements`, `Products`, `Orders`) |
| `test/.../api/DashboardApiIntegrationTest.java` | **Nouveau** (446 l.) — 6 tests HTTP réels (MockMvc + PostgreSQL) : agrégat consolidé correct, filtre par entrepôt, refus 403 hors périmètre, isolation d'un non-Administrateur |

**Pourquoi un repository dédié** : les agrégats du §13 traversent six modules. Ajouter des méthodes d'agrégat aux repositories Produits/Stock/Alertes y aurait imposé des dépendances et des JPQL étrangères à leur domaine ; le module 13 lit donc ce que les autres produisent, sans les modifier — c'est la convention déjà retenue par la recherche globale (M14) et les rapports (M17).

### 37.3 Frontend (SPA)

| Fichier | Nature |
|---|---|
| `pages/Dashboard.tsx` | Réécrit (737 l. modifiées) : 8 indicateurs cliquables (KpiCard `onClick`), alertes ouvertes, derniers mouvements (quantité signée colorée), commandes récentes, ventilation par entrepôt, répartition par état, activité d'audit, filtre d'entrepôt pour l'Administrateur (`FilterSelect` + filtres actifs), raccourcis d'administration. Plus aucune section « Module non disponible » |
| `types/api/dashboard.dto.ts` | Miroir exact du nouveau DTO (types union pour `MovementType` et les niveaux d'alerte) |
| `services/dashboard.service.ts` | Filtre optionnel `warehouseId` |
| `features/dashboard/hooks/use-dashboard-summary.ts` | Le filtre entre dans la **clé de requête** (sinon l'écran servirait le cache du réseau) |
| `constants/query-keys.ts` | `dashboard.summary` devient une **fonction** du filtre ; la clé morte `dashboard.stats` (aucun consommateur, aucun service) est supprimée |

La carte « Activité récente » est montée **uniquement** si l'utilisateur détient `AUDIT_READ` (`can("audit", "voir")`) : sans cette garde, l'écran déclenchait une requête vouée au 403 pour les rôles sans cette permission. Le serveur reste l'autorité (il filtre déjà par entrepôt).

### 37.4 Validations exécutées

| Vérification | Résultat |
|---|---|
| `mvn test` (suite complète) | ✅ **495/495**, 0 échec, 0 erreur, `BUILD SUCCESS` (**+14** vs. chantier 1 : le tableau de bord passe d'une couverture obsolète de 4 tests unitaires à 14 tests unitaires + 6 tests d'intégration HTTP) |
| Frontend `tsc --noEmit` | ✅ 0 erreur |
| Frontend `vitest` | ✅ 31/31 |
| Frontend `eslint` | ✅ 0 erreur, 24 avertissements préexistants — **aucun** dans les fichiers du chantier |
| Frontend `vite build` | ✅ 21,5 s |

### 37.5 Limites assumées / non couvert (à ne pas lire comme livré)

- **État « Donnée indisponible » par widget** (FRD §13, cas d'erreur) n'est appliqué qu'**au niveau de la page** : un seul appel agrégé alimente tous les widgets, il n'existe pas de source indépendante qui pourrait tomber seule.
- **Le clic mène à la liste non pré-filtrée** : aucun écran du SPA ne lit de paramètre d'URL (`useSearchParams` absent partout), donc « la liste filtrée correspondante » de l'UC-12.3 n'est atteinte qu'au niveau de la page cible. Écart résiduel à trancher en recette (chantier 7).
- **Pas de courbe d'évolution ni de « top produits »** : le FRD §13 ne demande ni l'une ni l'autre (l'ancien écran les annonçait pourtant « Disponible au Module 10 ») et aucune série temporelle de valorisation n'est stockée. Rien n'est estimé à leur place.
- **`productCount` est global** (le catalogue n'est pas décliné par entrepôt) : le sous-titre de l'indicateur le dit, pour ne pas laisser croire à un comptage filtré.
- **Rafraîchissement** : `staleTime` de 30 s + invalidation, pas de temps réel par websocket — le FRD laisse explicitement ce choix à trancher en conception technique.
- **Incohérence de devise repérée au passage (hors chantier)** : `src/lib/format.ts` (canonique, FCFA) et `src/utils/format.ts` (EUR `money`/`moneyPrecise`/`compactMoney`) coexistent ; le module Achats (`PurchaseOrders`, `PurchaseOrderDetail`, formulaires de réception) affiche donc des montants en euros tandis que le catalogue et les rapports sont en FCFA. Le tableau de bord suit la devise de l'application (FCFA). Correction à planifier (une seule source de formatage monétaire).

---

## 38. Chantier 3 — M15 : catalogue et déclencheurs de notifications complets (2026-09-22)

*Périmètre : backend `gestion_stock_backend` (develop) + retouches SPA `gestion_stock_complet` (master). Aucun commit créé ; l'arbre de travail porte le chantier complet.*

### 38.1 Ce qui manquait, et ce qui le remplace

| Écart (§36.1, F) | Correctif (FRD §15) |
|---|---|
| Catalogue réduit à **6 types** dont **2 jamais publiés** (`PURCHASE_ORDER_RECEIVED`, `SYSTEM_ERROR`) | **16 types** couvrant le stock (M9–M12), le cycle complet des commandes (M6 : créé / validé / envoyé / reçu), le référentiel (M5/M7 : fournisseur, catégorie archivée encore utilisée), les comptes (M1–M4 : désactivation à privilèges, permissions, mot de passe, verrouillage, gestionnaire d'entrepôt) et la technique (RM-07) |
| `PURCHASE_ORDER_RECEIVED` jamais publié | Publié dans `PurchaseOrderService.receive` — **une notification par RÉCEPTION** (statut recalculé partiel/total), pas par mouvement généré ; notifie aussi le magasinier de l'entrepôt concerné |
| `SYSTEM_ERROR` jamais publié | Branché au **seul point de passage de toutes les erreurs techniques** : le catch-all du `GlobalExceptionHandler` (un 500 non prévu devient une notification admin). Les erreurs gérées (400/404/409) ne notifient pas — voulu |
| Destinataires résolus uniquement par rôle | Nouveau régime **nominal** (`NotificationEvent.explicitRecipientIds()`) : changement de mot de passe, permissions de l'intéressé, verrouillage de son compte, designation comme gestionnaire — résoudre par rôle serait faux ou impossible |
| FRD §15 : notifications de sécurité désactivables | Types `securityCritical` (`PASSWORD_CHANGED`, `ACCOUNT_LOCKED`, `USER_PERMISSIONS_CHANGED`) : canaux par défaut TOUJOURS appliqués (préférences ignorées), toute tentative de désactivation **refusée explicitement (422)**, jamais ignorée en silence ; champ `locked` exposé dans la matrice de préférences |
| Erreurs système : pas de mécanisme | Écouteur dédié en phase `AFTER_COMPLETION` (une erreur survient typiquement dans une transaction ANNULÉE — un écouteur post-commit ne verrait jamais l'événement) + **limitation de débit** (`SystemErrorThrottle` : une panne produit des centaines de 5xx par minute, seule la première de chaque fenêtre est notifiée) |
| **Bug M3 découvert à cette occasion** : le compteur d'échecs et le verrouillage étaient écrits par *dirty checking* dans la transaction de la connexion refusée → **annulés par son rollback** → le verrouillage FRD (5 échecs → 15 min) ne se produisait **jamais** en production ; seule la ligne d'audit survivait | Extraction du verrouillage dans **`LoginLockoutWriter`** (`REQUIRES_NEW`, comme l'audit) : l'entité est rechargée par identifiant dans une transaction courte et indépendante ; l'événement `ACCOUNT_LOCKED` est publié **depuis cette transaction** (celle de la connexion se termine en erreur, donc son commit n'arriverait jamais) |
| Résolveur nominal filtré « compte ACTIVE » — l'`ACCOUNT_LOCKED` aurait été **impossible par construction** (le compte vient de passer `LOCKED` dans la même transaction) | `findNotifiableById` : filtre d'archive seul pour les destinataires nominaux (le module source désigne explicitement la personne) ; la résolution **par rôle** conserve son filtre ACTIVE (testé en intégration) |

### 38.2 Déclencheurs branchés (événement → source)

| Type | Publié depuis |
|---|---|
| `PURCHASE_ORDER_CREATED` / `_VALIDATED` / `_SENT` | `PurchaseOrderService` (create / validate / send), via les fabriques `PurchaseOrderStatusEvent.created/validated/sent` |
| `PURCHASE_ORDER_RECEIVED` | `PurchaseOrderService.receive` (partiel ou total) |
| `SUPPLIER_CREATED` | `SupplierService.create` |
| `CATEGORY_ARCHIVED_IN_USE` | `CategoryService` (archivage d'une catégorie utilisée par des produits **actifs** — compteur dédié `ProductRepository.countBySubcategoryCategoryIdAndArchivedFalse`) |
| `PRIVILEGED_ACCOUNT_DEACTIVATED` | `UserService.deactivate` (comptes à privilèges) |
| `USER_PERMISSIONS_CHANGED` | `UserService` (octroi/retrait d'override individuel) — nominal : l'intéressé |
| `PASSWORD_CHANGED` | `AuthService` (changement volontaire **et** réinitialisation par lien) — nominal, sécurité |
| `ACCOUNT_LOCKED` | `LoginLockoutWriter` (5ᵉ échec) — nominal, sécurité |
| `WAREHOUSE_MANAGER_ASSIGNED` | `WarehouseService.assignManager` — nominal (nouveau **et** ancien gestionnaire) |
| `STOCK_RUPTURE` / `STOCK_CRITICAL` / `STOCK_LOW` / `STOCK_ALERT_CLEARED` | `AlertEvaluator` (M12, déjà livré) |
| `SYSTEM_ERROR` | `GlobalExceptionHandler` (catch-all), throttlé |

### 38.3 Backend (`gestion_stock_backend`)

| Fichier | Nature |
|---|---|
| `notification/entity/NotificationType.java` | Réécrit — 16 types avec métadonnées (`label`, `targetRoles`, `defaultChannels`, `restrictedToAdministrators`, `securityCritical`) et règles `isChannelEnabled` / `isNominal` / `isMandatory`. Aucune migration : `notifications.type` est un `varchar(40)` sans contrainte de domaine (choix documenté) |
| `notification/event/*` | **10 nouveaux records** (`PurchaseOrderStatusEvent`, `PurchaseOrderReceivedEvent`, `SupplierCreatedEvent`, `CategoryArchivedInUseEvent`, `PrivilegedAccountDeactivatedEvent`, `UserPermissionsChangedEvent`, `PasswordChangedEvent`, `AccountLockedEvent`, `WarehouseManagerAssignedEvent`, `StockAlertClearedEvent`) + `NotificationEvent.explicitRecipientIds()` (défaut : liste vide) |
| `notification/repository/NotificationRecipientRepository.java` | `findActiveById` → **`findNotifiableById`** (filtre d'archive seul, voir 38.1) ; requêtes par rôle inchangées |
| `notification/service/NotificationRecipientResolver.java` | Trois régimes : admin global / rôles locaux par entrepôt (DoD « hors périmètre = pas transmis ») / nominaux, dédoublonnés par une même map |
| `notification/service/NotificationEventListener.java` | Deux écouteurs : `AFTER_COMMIT` métier (garde anti double-traitement des erreurs système) et `AFTER_COMPLETION` erreurs système avec throttle |
| `notification/service/SystemErrorThrottle.java` | **Nouveau** — une notification d'erreur par fenêtre glissante, les suivantes sont journalisées (comptées) mais non notifiées |
| `notification/service/NotificationService.java` | Canaux effectifs (`resolveEnabledChannels`) honorent les types sécurité ; refus 422 de la désactivation ; matrice de préférences expose `locked` |
| `notification/dto/NotificationPreferenceResponse.java` | Champ `locked` (verrou d'interface pour la SPA) |
| `auth/service/LoginLockoutWriter.java` | **Nouveau** (M3) — compteur + verrouillage en `REQUIRES_NEW`, publication de l'événement ; constantes `MAX_FAILED_ATTEMPTS = 5`, `LOCKOUT_MINUTES = 15` |
| `auth/service/LoginAttemptService.java` | Délègue au writer, retourne l'état de verrouillage (`recordFailure` → `LockoutState`) |
| `common/exception/GlobalExceptionHandler.java` | Publication `SystemErrorEvent` dans le catch-all (le conseil ne dépend que du contrat d'événement, testable sans configuration) |
| `product/repository/ProductRepository.java` | `countBySubcategoryCategoryIdAndArchivedFalse` (compteur produits actifs d'une catégorie) |
| `purchaseorder` / `supplier` / `category` / `user` / `auth` / `warehouse` / `alert` services | Publications de leurs événements respectifs (aucune dépendance vers le module notification — contrat d'événement seul) |

### 38.4 Frontend (SPA)

| Fichier | Nature |
|---|---|
| `types/api/notification.dto.ts` | Miroir exact : 16 types, `locked` dans `NotificationPreferenceDto` |
| `features/notifications/components/NotificationPreferencesCard.tsx` | Bascule **désactivée** pour les types `locked` (ne pas laisser croire à un choix voué au 422), `aria-label`/`title` explicites, légende « verrouillé = notification de sécurité » |
| `components/shell/NotificationPanel.tsx`, `pages/Notifications.tsx` | `TYPE_STYLES` étendus aux 16 types (icônes et tons danger/warning/success/info) |

### 38.5 Tests ajoutés (+35 → **530**)

| Suite | Contenu |
|---|---|
| `NotificationTriggersIntegrationTest` (**nouveau**, HTTP réel) | Création de commande → `PURCHASE_ORDER_CREATED` pour admin **et** gestionnaire de l'entrepôt ; validation → `_VALIDATED` ; envoi → `_SENT` ; réception partielle puis totale → `_RECEIVED` (aussi au magasinier de l'entrepôt) ; `SYSTEM_ERROR` → admins uniquement, gestionnaires hors périmètre exclus ; limitation de débit des erreurs système ; publication concurrente isolée entre tests |
| `AccountLockoutPersistenceIntegrationTest` (**nouveau**) | Le compteur d'échecs **survit au rollback** de la connexion refusée ; le 5ᵉ échec verrouille durablement (`LOCKED` + échéance) ; le bon mot de passe est refusé pendant le verrouillage ; **le titulaire `LOCKED` reçoit sa notification** (motif + durée) |
| `NotificationTypeTest` (**nouveau**) | Règles RM-01/03/07 : cibles par type, sécurité non désactivable, canaux par défaut toujours présents pour les types sécurité, catalogue complet FRD §15 |
| `SystemErrorThrottleTest` (**nouveau**) | Fenêtre : première autorisée, suivantes supprimées, réarmement |
| Tests existants étendus | `NotificationRecipientResolverTest` (destinataire `LOCKED` notifié), `NotificationServiceTest` (matrice `locked`), `GlobalExceptionHandlerTest` (publication sur 500), `NotificationControllerTest` (champ `locked` exposé) ; mocks `eventPublisher` ajoutés à `UserServiceTest`, `AuthServiceTest`, `SupplierServiceTest`, `WarehouseServiceTest`, `PurchaseOrderServiceTest` |

### 38.6 Validations exécutées

| Vérification | Résultat |
|---|---|
| `mvn test` (suite complète) | ✅ **530/530**, 0 échec, 0 erreur, `BUILD SUCCESS` (**+35** vs chantier 2 : 495 → 530) |
| Frontend `tsc --noEmit` | ✅ 0 erreur |
| Frontend `vitest` | ✅ 31/31 |
| Frontend `eslint` | ✅ 0 erreur, 24 avertissements préexistants — **aucun** dans les fichiers modifiés |
| Frontend `vite build` | ✅ 20,9 s |

### 38.7 Limites assumées / non couvert (à ne pas lire comme livré)

- **Aucun envoi e-mail vérifié de bout en bout** : `NotificationEmailSender` est mocké dans les tests (Mailpit disponible en compose, non exercé ici) ; la machine à états de distribution (PENDING → SENT/FAILED/ABANDONED, backoff 5/10/20/40 min, scheduler de re-tentative) est celle de J7, **non retouchée** par ce chantier.
- **Le catalogue n'est pas migré** : `notifications.type` reste un `varchar(40)` libre — ajouter un type ne nécessite pas de migration (comportement voulu et documenté dans l'enum).
- **`SYSTEM_ERROR` n'a qu'un point d'émission** (catch-all) : une exception gérée métier (400/404/409) ne notifie pas les admins — voulu ; le throttle est en mémoire (par JVM, non partagé multi-instances).
- **Pas de lien profond auth pour tous les types** : `hrefFor` gère `PRODUCT` et `PURCHASE_ORDER` ; les référentiels (`SUPPLIER`, `CATEGORY`, `USER`, `WAREHOUSE`) restent sans navigation directe — amélioration possible à la recette.
- **L'e-mail de bienvenue/reset (Module 1) reste hors catalogue M15** : flux `EmailService` historique inchangé.
- **Un seul régime nominal pour `WAREHOUSE_MANAGER_ASSIGNED`** : la réaffectation notifie l'ancien gestionnaire par identifiant explicite — s'il a été archivé entre-temps, il n'est pas notifié (filtre d'archive, comportement documenté).
- **Aucun commit n'a été créé** ; l'arbre de travail porte le chantier complet.
