# Durcissement sécurité des fonctions backend

Objectif : fermer les 10 alertes restantes (4 critiques, 6 avertissements) sans changer le comportement pour les utilisateurs légitimes.

## 1. Rénovation : vérifier les droits sur le projet (critique)

Aujourd'hui les fonctions rénovation vérifient seulement que l'appelant est connecté, jamais qu'il a le droit d'accéder au projet visé. N'importe quel compte connecté peut lire ou modifier n'importe quel chantier en connaissant son identifiant.

- Créer un contrôle d'accès partagé qui, pour chaque appel, vérifie que l'utilisateur est admin, agent rattaché, membre du projet ou entreprise liée au projet.
- L'appliquer à toutes les fonctions rénovation (progression, devis, fichiers, historique, clôture, rapport, alertes, comparaison, scoring, upload, incidents).
- Réponse 403 claire si le projet n'appartient pas à l'utilisateur.

## 2. Liens de partage de documents (critique)

La création d'un lien public accepte n'importe quel identifiant de document, pour n'importe quel utilisateur connecté.

- Exiger un rôle admin/agent.
- Vérifier que chaque document demandé appartient bien à un client de l'appelant (ou à n'importe quel client si admin) avant de créer le lien.
- Refuser l'ensemble de la demande si un seul document est hors périmètre.

## 3. Webhooks : signature obligatoire (critique)

Deux failles : la vérification est ignorée quand l'en-tête de signature est absent, et elle est totalement désactivée quand le secret n'est pas configuré.

- WhatsApp, AbaNinja, Meta Leads, IA relocation : rejeter (401) toute requête sans en-tête de signature valide.
- Si le secret n'est pas configuré côté serveur : rejeter la requête (503) au lieu d'accepter aveuglément, avec un message de log explicite.

## 4. Endpoints de notification (avertissement)

Les fonctions d'envoi d'e-mail de notification, de push et les envois WhatsApp peuvent être appelées par n'importe qui, ce qui permet d'envoyer des messages usurpant la marque.

- Ces fonctions ne doivent accepter que : un appel interne (clé de service / secret interne pour les déclencheurs base de données et tâches planifiées), ou un utilisateur connecté avec rôle admin/agent.
- Pour les envois WhatsApp liés à un client, vérifier en plus que l'agent est bien rattaché à ce client.

## 5. Fuite de messages d'erreur techniques (avertissement)

Les erreurs base de données brutes sont renvoyées au navigateur.

- Journaliser le détail côté serveur et ne renvoyer au client qu'un message générique + un code d'erreur.

## 6. Rendez-vous téléphoniques (avertissement)

Un visiteur non connecté peut rattacher n'importe quel lead à n'importe quel créneau.

- Restreindre la règle d'accès public à la création d'un rendez-vous sur un créneau libre, sans possibilité de désigner un lead arbitraire déjà existant.

## Détails techniques

- Nouveau module partagé `supabase/functions/_shared/renovationAuthz.ts` (accès projet) et `_shared/callerAuth.ts` (rôle appelant / appel interne via en-tête secret).
- Les déclencheurs SQL qui appellent `send-push-notification` / `send-notification-email` / `wa-send-*` devront transmettre l'en-tête interne : migration pour mettre à jour ces fonctions de base de données.
- Une migration ajustera la politique RLS de `lead_phone_appointments` pour le rôle anonyme.
- Aucun changement d'interface utilisateur ; les parcours admin/agent/client restent identiques.

## Vérification

- Test d'un appel rénovation avec un compte non autorisé (doit renvoyer 403) et avec le compte propriétaire du projet (doit fonctionner).
- Test d'un webhook sans signature (rejet) et avec signature valide (accepté).
- Test d'un envoi de notification depuis l'app (fonctionne) et depuis un appel anonyme (rejeté).
- Nouvelle analyse de sécurité en fin de travaux, puis publication.
