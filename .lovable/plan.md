## Objectif
Relancer automatiquement les clients dont le mandat de 90 jours arrive à échéance, **chaque jour à partir du 59ème jour** (= J-31, soit ~30 jours avant la fin) jusqu'à action du client. Sans action → renouvellement automatique à l'échéance.

## Logique métier
- **Date de référence** : `clients.mandat_date_signature` (présente sur tous les clients actifs).
- **Durée mandat** : 90 jours → `date_fin = mandat_date_signature + 90 jours`.
- **Fenêtre de relance** : à partir du **jour 60 après signature** (≈ 30 jours restants) **jusqu'à la fin** du mandat.
- **Fréquence** : 1 email + 1 notification in-app **par jour**, tous les jours, jusqu'à ce que le client clique sur "Renouveler" ou "Annuler".
- **Cible** : tous les clients `statut = 'actif'` ayant un `mandat_date_signature` non null. Les clients déjà en "critique" (mandat presque fini) reçoivent immédiatement la première relance dès l'activation du système.
- **Sans action à J+90** : le mandat est **renouvelé automatiquement** pour 90 jours supplémentaires (`mandat_date_signature` réinitialisée à la date du renouvellement).

## Changements base de données
1. Nouvelle table `mandate_renewal_actions` :
   - `id`, `client_id` (FK), `action` ('renewed' | 'cancelled' | 'auto_renewed'), `created_at`, `triggered_by` ('client' | 'system')
2. Nouvelle table `mandate_renewal_reminders_log` (anti-doublon journalier) :
   - `client_id`, `reminder_date` (date), unique `(client_id, reminder_date)`
3. Colonne sur `clients` : `mandat_renewal_count` (int, default 0) — nombre de renouvellements automatiques.
4. RLS : lecture par admin/agent assigné + le client lui-même.

## Edge Functions
1. **`mandate-expiry-reminders`** (planifiée via cron quotidien 09:00 Europe/Zurich) :
   - Récupère tous les clients `actif` avec `mandat_date_signature`.
   - Calcule `days_elapsed` et `days_remaining = 90 - days_elapsed`.
   - Si `days_remaining <= 30 && days_remaining >= 0` :
     - Vérifie qu'aucun reminder n'a été envoyé aujourd'hui (table log).
     - Envoie email + crée notification in-app : "Votre mandat se termine dans X jours".
     - L'email contient 2 CTA : **"Renouveler maintenant"** / **"Annuler ma recherche"** (liens signés vers `/mandat/renouvellement?token=...&action=renew|cancel`).
   - Si `days_remaining < 0` (échéance dépassée) et aucune action : appelle automatiquement le renouvellement → reset `mandat_date_signature = now()`, incrémente `mandat_renewal_count`, log `auto_renewed`, notifie client + agent.
2. **`mandate-renewal-action`** (publique, vérifie token) :
   - Action `renew` : reset `mandat_date_signature`, log `renewed`, notification de confirmation.
   - Action `cancel` : passe `statut = 'inactif'`, log `cancelled`, notifie agent + admin.

## Cron
- Job pg_cron quotidien à 09:00 Europe/Zurich (08:00 UTC en hiver) appelant `mandate-expiry-reminders`.

## Frontend
- **Nouvelle page `/mandat/renouvellement`** : confirme l'action (renouveler/annuler) après clic email, affiche un message de succès branded.
- **Bandeau dans l'espace client** (`MonContrat.tsx` ou Dashboard client) : si `days_remaining <= 30`, affiche un encart orange/rouge "Votre mandat se termine dans X jours" avec les 2 boutons d'action.
- **Notification in-app** déjà gérée via la table `notifications` existante.

## Email (template HTML)
- Sujet dynamique : `⏰ Votre mandat se termine dans {X} jour(s)`
- Corps : explication, rappel des biens vus, CTA Renouveler (bleu) + CTA Annuler (gris), mention "Sans action de votre part, votre mandat sera renouvelé automatiquement le {date}".
- Envoi via Resend (déjà configuré comme `smart-followups`).

## Notification interne admin/agent
- À J-7, notifier également l'agent assigné : "Mandat de {client} expire dans 7 jours, aucune action".
- À J0 (renouvellement auto), notifier admin + agent.

## Fichiers à créer/modifier
- **Migration SQL** : tables + colonne + RLS + cron job.
- **Nouveau** : `supabase/functions/mandate-expiry-reminders/index.ts`
- **Nouveau** : `supabase/functions/mandate-renewal-action/index.ts`
- **Nouveau** : `src/pages/MandatRenouvellement.tsx` + route dans `App.tsx`
- **Modifié** : `src/pages/client/MonContrat.tsx` (ou Dashboard client) → bandeau de relance.

## Validation
Test sur les clients actuellement "en critique" (mandat signé il y a > 60 jours) : ils recevront immédiatement la 1ère relance au prochain run du cron.