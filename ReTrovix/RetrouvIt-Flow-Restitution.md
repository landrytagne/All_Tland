# RetrouvIt — Flow complet de restitution d'un objet

> **Version de référence pour l'implémentation**

**Principe UX central :**
**Vérifier → Se mettre en relation → Discuter → S'accorder → Sécuriser le paiement → Commencer la mission → Restituer → Confirmer → Libérer les fonds → Évaluer.**

L'objectif est que l'utilisateur ne voie jamais la complexité technique du processus. À chaque étape, l'application lui présente **une seule action principale**.

---

## Table des matières

1. [Détection d'une correspondance](#1-détection-dune-correspondance)
2. [Vérification de la propriété](#2-vérification-de-la-propriété)
3. [Demande de restitution](#3-demande-de-restitution)
4. [Le Finder accepte la mise en relation](#4-le-finder-accepte-la-mise-en-relation)
5. [Ouverture de la conversation](#5-ouverture-de-la-conversation)
6. [Organisation de la restitution](#6-organisation-de-la-restitution)
7. [Le Chercheur reçoit la proposition](#7-le-chercheur-reçoit-la-proposition)
8. [Modification ou refus de la proposition](#8-modification-ou-refus-de-la-proposition)
9. [Paiement en séquestre](#9-paiement-en-séquestre)
10. [Paiement réussi](#10-paiement-réussi)
11. [Initialisation de la mission](#11-initialisation-de-la-mission)
12. [Notification au Finder](#12-notification-au-finder)
13. [Partage de position](#13-partage-de-position)
14. [Arrivée au rendez-vous](#14-arrivée-au-rendez-vous)
15. [Restitution physique de l'objet](#15-restitution-physique-de-lobjet)
16. [Confirmation du Finder](#16-confirmation-du-finder)
17. [Confirmation du Chercheur](#17-confirmation-du-chercheur)
18. [Les deux confirmations sont obligatoires](#18-les-deux-confirmations-sont-obligatoires)
19. [Libération des fonds](#19-libération-des-fonds)
20. [Fin automatique du partage de position](#20-fin-automatique-du-partage-de-position)
21. [Évaluation de la restitution](#21-évaluation-de-la-restitution)
22. [Signalement d'un problème](#22-signalement-dun-problème)
23. [Cas particulier : problème avant la restitution](#23-cas-particulier--problème-avant-la-restitution)
24. [Vue administrateur](#24-vue-administrateur)
25. [Machine d'état officielle de la collaboration](#25-machine-détat-officielle-de-la-collaboration)
26. [Principe UX définitif](#26-principe-ux-définitif)
27. [Règle fondamentale pour le développement](#27-règle-fondamentale-pour-le-développement)

---

## 1. Détection d'une correspondance

Lorsqu'une publication « Objet trouvé » correspond suffisamment à une déclaration « Objet perdu », RetrouvIt crée une **correspondance**.

Le système utilise notamment :

- la catégorie ;
- la similarité de description ;
- la proximité géographique ;
- la proximité temporelle ;
- éventuellement la similarité des photos.

Une correspondance d'au moins **80 %** peut générer une notification au Chercheur. Une correspondance d'au moins **90 %** est mise en avant comme correspondance forte. Le score ne suffit cependant jamais à confirmer la propriété.

**Notification :**

> 🔔 **Une correspondance a été trouvée**
>
> Nous avons trouvé un objet qui pourrait correspondre à votre déclaration.
>
> **Correspondance : 86 %**
>
> 📄 Catégorie : Document
> 📍 Zone : Douala
> 📅 Découvert : aujourd'hui
>
> **[ Vérifier l'objet ]**

---

## 2. Vérification de la propriété

Le Chercheur accède à la correspondance. Les informations sensibles de l'objet retrouvé restent limitées tant que la propriété n'est pas confirmée.

RetrouvIt affiche la **question de vérification** définie lors de la publication de l'objet trouvé.

**Exemple :**

> 🔐 **Vérification de propriété**
>
> Pour protéger le propriétaire et la personne qui a retrouvé l'objet, répondez à cette question :
>
> **Quel était le contenu du sac contenant votre document ?**
>
> `____________________________`
>
> **[ Vérifier ma réponse ]**

**Si la réponse est correcte :**

> ✅ **Propriété vérifiée**
>
> Votre réponse correspond aux informations connues du propriétaire de l'objet.
>
> Vous pouvez maintenant demander sa restitution.
>
> **[ Demander la restitution ]**

La question secrète constitue l'étape de confirmation de propriété avant la mise en relation.

**Si la réponse est incorrecte :**

L'utilisateur peut réessayer selon les règles de sécurité définies par l'application. Après plusieurs échecs, la correspondance peut être bloquée et éventuellement signalée pour vérification.

---

## 3. Demande de restitution

Après validation de la propriété, le Chercheur envoie une demande au Finder.

> **Demander la restitution**
>
> Vous souhaitez récupérer cet objet.
>
> Le Finder recevra votre demande et pourra accepter ou refuser la mise en relation.
>
> **[ Envoyer la demande ]**

Le Finder reçoit immédiatement une notification.

---

## 4. Le Finder accepte la mise en relation

Le Finder voit :

> 🔔 **Demande de restitution**
>
> Un utilisateur a correctement répondu à la question de vérification associée à votre objet.
>
> Il souhaite maintenant organiser sa restitution.
>
> **[ Accepter ]**  **[ Refuser ]**

**Si le Finder accepte :** la collaboration passe à l'état **« Mise en relation acceptée »**. La messagerie devient disponible.

**Si le Finder refuse :** la collaboration est clôturée avec le motif **« Restitution refusée par le Finder »**. Le Chercheur est informé.

---

## 5. Ouverture de la conversation

Une fois la mise en relation acceptée, les deux utilisateurs accèdent à une conversation dédiée à cette restitution. Le chat devient le **centre de la collaboration**.

L'utilisateur ne doit pas être confronté à plusieurs boutons complexes.

**Interface :**

```
┌──────────────────────────────────────┐
│ ← Retour       Restitution           │
├──────────────────────────────────────┤
│                                      │
│            Conversation              │
│                                      │
│  Bonjour, j'ai retrouvé votre        │
│  document.                           │
│                                      │
│  Merci beaucoup.                     │
│  Comment pouvons-nous organiser      │
│  la restitution ?                    │
│                                      │
├──────────────────────────────────────┤
│ Écrire un message...             ➤   │
├──────────────────────────────────────┤
│       Organiser la restitution       │
└──────────────────────────────────────┘
```

Les deux utilisateurs peuvent discuter librement. Les échanges doivent être conservés afin de pouvoir être utilisés en cas de litige.

---

## 6. Organisation de la restitution

Lorsque les deux utilisateurs sont prêts, le **Finder** peut cliquer sur **« Organiser la restitution »**. Il ouvre un formulaire simple.

**Informations demandées :**

| Champ | Exemple |
|---|---|
| Récompense proposée | `10 000 FCFA` |
| Date prévue | `24 septembre 2026` |
| Heure prévue | `15:30` |
| Lieu / rendez-vous | Point de rendez-vous |

Le Finder peut :

- choisir un point de rendez-vous ;
- proposer un lieu public ;
- partager une position lorsque cela est nécessaire.

Le système doit favoriser les lieux publics sécurisés plutôt que les adresses privées. Le cahier des charges prévoit explicitement un point de rendez-vous sécurisé avec partage de position.

**Bouton :** **[ Envoyer la proposition ]**

---

## 7. Le Chercheur reçoit la proposition

> 🔔 **Nouvelle proposition de restitution**
>
> Le Finder vous propose les conditions suivantes :
>
> 💰 Récompense : 10 000 FCFA
> 📅 Date : 24 septembre
> 🕐 Heure : 15:30
> 📍 Lieu : point de rendez-vous proposé
>
> Les fonds seront conservés en séquestre par RetrouvIt jusqu'à la confirmation de la restitution.
>
> **[ Accepter et payer ]**  **[ Refuser ]**

---

## 8. Modification ou refus de la proposition

Si le montant ou les conditions ne conviennent pas au Chercheur, il ne doit pas être obligé d'accepter. Il peut choisir de **modifier la proposition** ou de **refuser**.

> Le montant proposé ne correspond pas à votre accord ?
>
> **[ Modifier ]**  **[ Refuser ]**

Cela permet aux deux parties de revenir à la discussion sans créer un nouveau dossier.

---

## 9. Paiement en séquestre

Lorsque le Chercheur accepte les conditions, il arrive sur un écran de paiement.

**Récapitulatif :**

> ## Sécuriser la restitution
>
> **Récompense Finder** — 10 000 FCFA
> **Frais RetrouvIt** — X XXX FCFA
> **Total** — XX XXX FCFA
>
> 🔒 Votre paiement sera conservé en séquestre.
>
> Les fonds ne seront libérés qu'après confirmation de la restitution conformément aux règles de RetrouvIt.

**Moyens de paiement :**

- MTN MoMo ;
- Orange Money ;
- carte bancaire.

Le cahier des charges prévoit ces moyens de paiement ainsi que le blocage temporaire des fonds jusqu'à confirmation de la restitution.

**Bouton :** **[ Payer et sécuriser la restitution ]**

---

## 10. Paiement réussi

Après confirmation du provider :

> ✅ **Paiement sécurisé**
>
> Votre paiement a bien été enregistré. Les fonds sont actuellement conservés par RetrouvIt. Ils seront libérés après confirmation de la restitution.

La collaboration passe alors à l'état **« Paiement sécurisé »**.

Le Finder reçoit :

> 🔔 **Le paiement a été sécurisé**
>
> Le Chercheur a validé la proposition et le paiement est maintenant placé en séquestre.
>
> Vous pouvez maintenant commencer la mission de restitution.

---

## 11. Initialisation de la mission

Ici est conservé le concept de **« Commencer la mission »**, mais sans créer une succession inutile de validations.

Le Chercheur voit :

> ## Restitution prête
>
> Le paiement est sécurisé.
>
> 📅 24 septembre — 15:30
> 📍 Point de rendez-vous
>
> Vous pouvez maintenant commencer la mission.

**Bouton principal :** **[ Commencer la mission ]**

---

## 12. Notification au Finder

Lorsque le Chercheur démarre la mission :

> 🔔 **Mission démarrée**
>
> Le Chercheur a confirmé le démarrage de la restitution.
>
> Vous pouvez maintenant utiliser la localisation pour rejoindre le rendez-vous.

Le Finder **n'a pas besoin de valider une deuxième fois** que la mission a commencé. Cette simplification est importante pour l'expérience utilisateur.

**Transition automatique :**

```
Chercheur
   ↓
Commencer la mission
   ↓
Mission démarrée
   ↓
Finder informé
```

---

## 13. Partage de position

À partir du moment où la mission est démarrée, les fonctionnalités de localisation deviennent disponibles.

**Le Finder voit :**

> 📍 **Localisation du Chercheur**
>
> Position mise à jour il y a quelques secondes.
>
> Distance estimée : 1,4 km
>
> **[ Voir sur la carte ]**

Le Finder peut également partager sa propre position si cela est nécessaire pour le rendez-vous.

**Principe de confidentialité :** la position exacte ne doit pas être exposée pendant toute la durée de vie du compte. Le partage est limité à la collaboration active.

```
Avant mission          → Position masquée
Mission démarrée       → Position temporairement disponible
Restitution terminée   → Partage automatiquement désactivé
```

---

## 14. Arrivée au rendez-vous

Lorsque le Finder arrive :

> 📍 **Vous êtes arrivé**
>
> Vous pouvez maintenant procéder à la restitution de l'objet.
>
> **[ Je suis arrivé ]**

Le Chercheur reçoit :

> 🔔 **Le Finder est arrivé**
>
> Le Finder vient d'arriver au rendez-vous.

---

## 15. Restitution physique de l'objet

Le Finder remet physiquement l'objet au Chercheur. L'application ne considère **pas encore** la mission comme terminée. Chaque partie doit confirmer indépendamment ce qui s'est passé.

---

## 16. Confirmation du Finder

> ## Objet remis
>
> Vous avez remis l'objet au Chercheur.
>
> Confirmez uniquement si la remise a réellement eu lieu.
>
> **[ Confirmer la remise ]**

---

## 17. Confirmation du Chercheur

> ## Avez-vous reçu votre objet ?
>
> Confirmez uniquement si vous avez bien récupéré l'objet.
>
> **[ Confirmer la réception ]**  **[ Signaler un problème ]**

---

## 18. Les deux confirmations sont obligatoires

Le système attend :

```
Finder     → CONFIRMED_HANDOVER
     +
Chercheur  → CONFIRMED_RECEIPT
```

Seulement lorsque les deux confirmations sont présentes : **« Restitution confirmée »**.

Le cahier des charges prévoit explicitement une confirmation de remise des deux côtés avant le déblocage des fonds.

---

## 19. Libération des fonds

Après confirmation des deux parties :

> 🎉 **Restitution réussie**
>
> L'objet a été officiellement restitué.
>
> Le paiement va maintenant être traité conformément aux règles de RetrouvIt.

Le système calcule alors automatiquement :

```
Montant de la transaction
        ↓
Frais éventuels du provider
        ↓
Commission RetrouvIt
        ↓
Part du Finder
        ↓
Crédit du solde Finder
```

Le taux de commission doit être **configurable dans le back-office** et non codé en dur. Le cahier des charges indique actuellement une répartition indicative d'environ 10 % pour le Finder, avec des taux paramétrables.

Si le modèle économique définit finalement **15 %**, le back-office pourra simplement configurer ce taux.

---

## 20. Fin automatique du partage de position

Après la confirmation des deux parties :

> 🔒 **Partage de position terminé**

Les positions ne sont plus accessibles dans cette collaboration. La mission passe à l'état **COMPLETED**.

---

## 21. Évaluation de la restitution

Une fois la mission terminée :

> ## Comment s'est passée votre restitution ?
>
> Évaluez votre expérience avec l'autre utilisateur.
>
> ⭐ ⭐ ⭐ ⭐ ⭐
>
> **Votre commentaire**
>
> `________________________`
>
> **[ Publier mon avis ]**

Les avis peuvent alimenter le système de confiance, les badges et les statistiques utilisateur. Le cahier des charges prévoit notamment les badges de confiance et les statistiques liées aux restitutions réussies.

---

## 22. Signalement d'un problème

L'avis et le signalement doivent être deux actions différentes.

- ⭐ Évaluer la restitution
- 🚨 Signaler un problème

**Le signalement peut concerner :**

- objet non conforme ;
- fraude ;
- comportement inapproprié ;
- problème de paiement ;
- non-restitution ;
- montant contesté ;
- problème lors du rendez-vous ;
- autre problème.

**L'utilisateur peut joindre :**

- description ;
- photos ;
- documents ;
- autres preuves.

Le dossier passe alors dans le système de **Réclamations / Litiges**. Le back-office peut consulter la transaction et l'historique de conversation afin d'arbitrer le dossier.

---

## 23. Cas particulier : problème avant la restitution

À tout moment avant la confirmation finale, un utilisateur peut signaler un problème. Par exemple :

```
PAIEMENT SÉCURISÉ
       ↓
    MISSION
       ↓
   PROBLÈME
       ↓
 RÉCLAMATION
       ↓
ADMINISTRATION
```

La transaction est alors protégée. Selon la décision de l'administration :

- **Si le Chercheur obtient gain de cause :** 💰 Remboursement
- **Si le Finder obtient gain de cause :** 💰 Déblocage des fonds

Le cahier des charges prévoit le remboursement automatique lorsqu'une réclamation est tranchée en faveur du Chercheur et le déblocage des gains du Finder.

---

## 24. Vue administrateur

L'administrateur doit pouvoir ouvrir une collaboration et voir **toute sa timeline**.

**Exemple :**

```
COLLABORATION #RTV-000124

Objet     : Document administratif
Chercheur : Jean Dupont
Finder    : Paul Martin

────────────────────────────
09:12  Correspondance 86 %
09:14  Vérification réussie
09:18  Demande de restitution
09:20  Finder accepte
09:21  Conversation ouverte
09:35  Proposition : 10 000 FCFA
09:39  Proposition acceptée
09:41  Paiement sécurisé
09:45  Mission démarrée
10:02  Finder arrivé
10:08  Remise confirmée
10:09  Réception confirmée
10:09  Fonds libérés
10:10  Avis publié
────────────────────────────

Onglets : Paiement | Localisation | Messages | Preuves |
          Notifications | Réclamations | Historique
```

L'administration doit également pouvoir consulter :

- utilisateurs ;
- transactions ;
- paiements en séquestre ;
- commissions ;
- reversements ;
- signalements ;
- litiges ;
- conversations ;
- publications ;
- actions de modération.

Cela correspond aux responsabilités prévues dans le back-office du cahier des charges.

---

## 25. Machine d'état officielle de la collaboration

Référence métier pour l'implémentation backend/frontend :

```
MATCH_FOUND
      ↓
VERIFICATION_PENDING
      ↓
VERIFIED
      ↓
CONNECTION_PENDING
      ↓
CHAT_ACTIVE
      ↓
PROPOSAL_PENDING
      ↓
PAYMENT_PENDING
      ↓
ESCROW_FUNDED
      ↓
MISSION_READY
      ↓
MISSION_STARTED
      ↓
MEETING_IN_PROGRESS
      ↓
HANDOVER_PENDING
      ↓
COMPLETED
```

**Sorties parallèles :**

```
CONNECTION_PENDING → REJECTED

PROPOSAL_PENDING → REJECTED → NEGOTIATION

PAYMENT_PENDING → PAYMENT_FAILED

À presque toute étape pertinente → DISPUTED → UNDER_REVIEW → RESOLVED
```

---

## 26. Principe UX définitif

L'utilisateur **ne doit pas penser en termes d'états techniques**. Il doit simplement comprendre :

1. « J'ai peut-être retrouvé mon objet. »
2. « Je dois prouver que c'est bien le mien. »
3. « Le Finder a accepté de me le restituer. »
4. « Nous discutons. »
5. « Nous sommes d'accord sur les conditions. »
6. « Je sécurise le paiement. »
7. « Nous commençons la restitution. »
8. « Nous nous retrouvons. »
9. « Je récupère mon objet. »
10. « Nous confirmons tous les deux. »
11. « Le Finder reçoit sa récompense. »
12. « Je donne mon avis. »

---

## 27. Règle fondamentale pour le développement

**Ne crée pas une succession de pages indépendantes pour chaque étape.**

Construis une **Collaboration** unique avec :

- un état métier ;
- une timeline ;
- une conversation ;
- une proposition de restitution ;
- un paiement/escrow ;
- une session de localisation ;
- une confirmation de remise ;
- un système de réclamation ;
- un historique d'audit.

Le frontend affiche ensuite **l'action correspondant à l'état courant** :

| État | Action affichée |
|---|---|
| `CHAT_ACTIVE` | Organiser la restitution |
| `PROPOSAL_PENDING` | Examiner la proposition |
| `PAYMENT_PENDING` | Payer et sécuriser |
| `ESCROW_FUNDED` | Commencer la mission |
| `MISSION_STARTED` | Voir la position |
| `MEETING_IN_PROGRESS` | Confirmer la remise |
| `HANDOVER_PENDING` | Confirmer la réception |
| `COMPLETED` | Évaluer la restitution |

C'est cette structure qui va permettre à **RetrouvIt de rester simple pour l'utilisateur tout en étant robuste côté backend, paiement, sécurité, administration et litiges**.

**Formule UX à retenir :**

> **Vérifier → Discuter → S'accorder → Sécuriser → Se rencontrer → Restituer → Confirmer → Récompenser.**

Ce flow constitue la **version de référence à conserver pour l'implémentation**.
