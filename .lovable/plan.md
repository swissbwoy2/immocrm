## Objectif

Créer le compte de `bcvscpncept@gmail.com` afin qu'il apparaisse dans `/admin/clients`, soit assignable aux agents, et reçoive un email d'invitation pour définir son mot de passe.

## Action unique (pas de modification de code)

Invoquer l'Edge Function existante `invite-client` avec :
- `email` : `bcvscpncept@gmail.com`
- `first_name` / `last_name` : vides (à compléter par vous depuis la fiche, ou à me préciser maintenant si vous les connaissez)
- `parcours` : `relouer` par défaut (à confirmer)

## Ce que ça produit automatiquement

1. Création du user dans `auth.users` avec rôle `client`
2. Création d'une ligne dans `profiles`
3. Création d'une fiche dans `clients` (statut `actif`, priorité `moyenne`) → visible dans `/admin/clients`
4. Envoi d'un email d'invitation Lovable (notify.logisorama.ch) avec lien de définition du mot de passe
5. Trace dans `signup_attempts` (stage `succeeded`)

## Après création

Vous pourrez :
- Ouvrir sa fiche dans `/admin/clients`
- L'assigner à un agent (sync auto `clients.agent_id` ↔ `client_agents`)
- Suivre s'il active son compte via le lien d'invitation

## Questions avant exécution

1. **Parcours à attribuer ?** `relouer` (locataire) / `acheter` / `vendre` / `construire-renover`
2. **Prénom / Nom** connus, ou laisser vides ?
3. **Email confirmé exact** : `bcvscpncept@gmail.com` (orthographe inhabituelle — à valider une dernière fois) ?

Dès que vous validez ces 3 points, je lance l'invitation.