# Envoyer un nouveau mot de passe provisoire à Rémi

## Destinataire identifié

- Rémi Martinent — remi.martinent@hotmail.fr — client actif, compte utilisateur déjà existant.

## Ce qui sera fait

1. Déclencher la fonction serveur existante de création/renvoi d'identifiants (`invite-client`) pour ce client uniquement.
   - Génère un mot de passe aléatoire.
   - Met à jour le mot de passe du compte existant.
   - Repositionne l'indicateur « doit changer son mot de passe » pour qu'il soit invité à le modifier après connexion.
   - Envoie l'email d'identifiants depuis notify.logisorama.ch.
2. Vérifier ensuite le statut d'envoi dans le journal d'emails (mise en file, envoi, suppression/bounce éventuel).
3. Confirmer le résultat, et signaler si l'adresse est en liste de suppression (bounce/désabonnement) auquel cas l'email ne partira pas.

## Notes techniques

- Aucune modification de code : appel de l'Edge Function `invite-client` déjà déployée, avec l'identifiant client `0dacf0b4-2f82-4996-913d-e65bc207edef`.
- Le mot de passe généré n'est jamais affiché dans le chat ; il n'est visible que dans l'email reçu par Rémi.
- Vérification post-envoi via `email_send_log` (statut `pending` / `sent` / `failed` / `suppressed`).
