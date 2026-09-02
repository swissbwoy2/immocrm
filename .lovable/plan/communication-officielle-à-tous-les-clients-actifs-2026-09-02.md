# Communication officielle à tous les clients actifs

Envoi d'un email officiel + création automatique d'un ticket Support (trace visible dans l'onglet Support côté client et côté admin) pour les **46 clients au statut « actif »** disposant d'une adresse email.

## Contenu du message (ton institutionnel, français)

Objet : **Communication officielle — Traitement exclusif de vos demandes via l'onglet Support**

Corps :
1. Excuses formelles pour le dysfonctionnement technique en cours depuis trois semaines.
2. **Canal unique** : toute demande doit désormais être formulée via l'onglet **Support** de l'espace client. Aucune demande transmise hors application (WhatsApp, téléphone, email direct) ne sera traitée.
3. **Visites** : sans instruction explicite du client transmise via l'application, aucune visite ne sera effectuée par l'agent en charge du dossier.
4. **Mise à jour obligatoire de l'application** : mettre à jour ou télécharger l'application sur l'App Store / Google Play pour garantir le bon fonctionnement.
5. **Documents** : tenir son dossier à jour afin de ne manquer aucune offre, et suivre rigoureusement l'avancement de sa recherche dans l'application.
6. **Remboursement** : toute demande de remboursement passe par le bouton dédié dans l'onglet **Mon mandat / Mon contrat** (page existante `/client/mon-contrat`).
7. Signature : L'équipe Logisorama — Immo-rama.ch, +41 21 634 31 61, info@immo-rama.ch.

## Ce qui sera construit

- **Nouvelle fonction serveur `broadcast-service-notice`** (réservée admin) :
  - sélectionne les clients `statut = 'actif'` ayant un email ;
  - crée pour chacun un **ticket support** (catégorie « autre », priorité haute, sujet = objet du message) avec un premier message rédigé par l'équipe (`author_role = 'admin'`) → la trace apparaît directement dans l'onglet Support du client ;
  - envoie l'email via la file d'envoi existante (domaine notify.logisorama.ch), en respectant les désinscriptions et les suppressions ;
  - **idempotent** : un client déjà traité n'est ni re-ticketé ni re-emailé (clé de campagne unique).
- **Déclenchement admin** : bouton « Envoyer la communication officielle » dans l'espace admin Support, avec confirmation, aperçu du nombre de destinataires et rapport de résultat (envoyés / ignorés / erreurs).

## Détails techniques

- Insertion via clé de service dans `support_tickets` + `support_ticket_messages` (`author_id` = admin déclencheur).
- Email HTML aux couleurs Logisorama, version texte incluse, CTA vers `/support` et `/client/mon-contrat`.
- Envoi mis en file par lots (`enqueue_email` → `process-email-queue`) pour éviter les limites de débit.
- Contrôle d'opt-out via le helper partagé `notificationEmailOptOut` : les clients désinscrits reçoivent tout de même le **ticket support** (canal in-app), mais pas l'email.
- Aucune modification de schéma sauf une petite table/colonne de traçabilité de campagne pour l'idempotence.
