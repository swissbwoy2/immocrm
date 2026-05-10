## Objectif

Empêcher qu'un lead puisse recevoir plusieurs fois le même template WhatsApp de campagne. Cause : la dédup dans l'Edge Function ne regarde que `status='sent'` et ignore `delivered`/`read` (mis à jour par le webhook Meta).

## Étape 1 — Fix Edge Function `send-followup-whatsapp`

Dans `supabase/functions/send-followup-whatsapp/index.ts` :

1. **Élargir la dédup** aux statuts `sent`, `delivered`, `read` (au lieu de `sent` seul).
2. **Ajouter une garde anti-doublon dure 24h** : avant chaque envoi, recheck en direct dans `whatsapp_notification_logs` qu'aucun envoi du même `template_key` au même `context_ref` n'existe dans les dernières 24h (tous statuts sauf `failed`). Cette vérif se fait dans la boucle, juste avant l'appel à `send-whatsapp-notification`, pour blinder même contre les double-clics rapprochés.
3. Si `allowResend=true` (case "Renvoyer même si déjà envoyé" cochée volontairement), la garde 24h est bypassée mais un log warning est émis.

## Étape 2 — Garde-fou UI dans `CampagnesSuivi.tsx` (onglet WhatsApp)

1. **Confirmation modale** au clic sur "Envoyer aux N leads" : 
   - Titre : "Confirmer l'envoi WhatsApp"
   - Corps : "Vous allez envoyer le template à **N leads**. Cette campagne ne doit être envoyée qu'**une seule fois** par lead. Continuer ?"
   - Boutons : Annuler / Confirmer l'envoi
2. **Anti double-clic** : bouton désactivé pendant 30 secondes après un clic réussi (cooldown visible avec compte à rebours).
3. **Badge ⚠️ "Déjà contacté X fois"** sur chaque ligne lead si l'historique montre ≥1 envoi (récupéré via `loadWaAlreadySent` enrichi pour compter au lieu de juste flagger).

## Étape 3 — Pas de nettoyage destructif

Les messages partis chez Meta ne peuvent pas être annulés. On laisse l'historique `whatsapp_notification_logs` intact pour l'audit. La transparence est assurée par le badge UI à l'étape 2.

## Fichiers touchés

- `supabase/functions/send-followup-whatsapp/index.ts` (~15 lignes modifiées)
- `src/pages/admin/CampagnesSuivi.tsx` (~50 lignes : modale confirm + cooldown + comptage envois)

## Hors périmètre

- Pas de migration SQL.
- Pas de modification des autres campagnes (vente, achat) — même pattern à appliquer plus tard si besoin.
- Pas de modification du webhook Meta ni de `send-whatsapp-notification`.
