
# Plan : Template #2 — `logisorama_mandate_expiring_30d`

## Contexte

Infrastructure WhatsApp existante :
- `send-whatsapp-notification` (envoi via Meta Cloud API)
- `whatsapp-webhook` (réception messages + boutons)
- Tables : `whatsapp_message_templates`, `whatsapp_notification_logs`
- Fonction métier : `mandate-renewal-action` (gère renew/cancel/cancel_with_refund)

## Étape 1 — Meta Business Manager (toi, manuel)

Créer le template tel que défini dans le message précédent :
- Nom : `logisorama_mandate_expiring_30d` / Catégorie `Utilitaire` / Langue `French`
- Body avec `{{1}}` (prénom) + `{{2}}` (date d'échéance)
- Pied : `Logisorama By Immo-rama.ch`
- 3 Quick Replies : `Renouveler 90 jours` / `Annuler & remboursement` / `J'ai trouvé seul`
- Soumettre à examen

## Étape 2 — Migration DB

1. **Enregistrer le template** dans `whatsapp_message_templates` (template_key = `mandate_expiring_30d`)
2. **Étendre `mandate_renewal_actions.action`** avec une nouvelle valeur `cancelled_no_refund_after_dialog` (pour traçabilité du flow A)
3. **Index unique anti-doublon** sur `whatsapp_notification_logs(client_id, template_key, date(sent_at))` filtré sur `status='sent'` pour idempotency cron
4. **Activer extensions** `pg_cron` + `pg_net` si pas déjà actives

## Étape 3 — Edge Function `wa-send-mandate-expiring` (cron J-30)

Appelée chaque jour à 08:00 UTC (= 09:00/10:00 Europe/Zurich) :

1. SELECT clients avec :
   - `statut = 'actif'`
   - `mandate_official_end_date = CURRENT_DATE + 30`
   - `mandate_paused_at IS NULL`
   - Pas déjà notifié aujourd'hui (check log)
2. Pour chacun, calculer `daysSinceSignature` (avec gel pause)
3. Invoke `send-whatsapp-notification` :
   - `template_key: "mandate_expiring_30d"`
   - `event_type: "mandate_expiring_30d"`
   - `variables: [client.prenom, formatDateFR(mandate_official_end_date)]`
   - `preference_key: null` (notif contractuelle, pas opt-out)
4. Stocker dans `payload_json` les flags `refund_eligible_at_send` et `days_since_signature` (pour le webhook)

**Cron SQL** (via `supabase--insert`, contient l'anon key projet) :
```sql
SELECT cron.schedule('wa-mandate-expiring-30d', '0 8 * * *',
  $$ SELECT net.http_post(url:='.../wa-send-mandate-expiring', headers:='...', body:='{}'::jsonb); $$);
```

## Étape 4 — Webhook handler (3 Quick Replies)

Étendre `whatsapp-webhook/index.ts` pour intercepter les `button.text` :

| Bouton reçu | Action immédiate |
|---|---|
| `Renouveler 90 jours` | Invoke `mandate-renewal-action` avec `action: "renew"` (pas de token, ajouter mode webhook trust via service role + client_id résolu par téléphone) → renvoi message confirmation WhatsApp libre (fenêtre 24h ouverte par le clic) |
| `J'ai trouvé seul` | Invoke `mandate-renewal-action` avec `action: "cancel"` + `cancellation_reason: "found_alone"` → message félicitations + suppression mandat |
| `Annuler & remboursement` | **Logique conditionnelle** ⬇️ |

### Dialogue "Annuler & remboursement" (Option A choisie)

Lookup `clients.mandat_date_signature` + `mandate_pause_days` → calcul `daysSinceSignature` :

**Cas 1 — Éligible** (`daysSinceSignature >= 82`) :
→ Invoke `mandate-renewal-action` avec `cancel_with_refund` + raison `searching_alone` (par défaut)
→ Réponse : « 💰 Demande de remboursement enregistrée. Traitement sous 30 jours après le {{end_date}}. »

**Cas 2 — Non éligible** (`< 82 jours`) :
→ Réponse texte libre + 2 nouveaux Quick Replies via message interactive :
> « ⚠️ Le remboursement est disponible uniquement après 90 jours de recherche active (vous êtes au jour {{X}}). Souhaitez-vous quand même annuler sans remboursement ? »
- Bouton `Oui, annuler` → action `cancel` + raison `searching_alone` + log action `cancelled_no_refund_after_dialog`
- Bouton `Non, garder` → message « ✅ Très bien, votre mandat reste actif jusqu'au {{end_date}}. »

**Stockage du contexte conversationnel** : nouvelle table légère `whatsapp_pending_actions` (phone, action_type, context_json, expires_at = +1h) pour gérer le 2e clic du dialogue.

### Helper réutilisable

Créer `supabase/functions/_shared/whatsapp-resolve-client.ts` : résout `client_id` depuis `recipient_phone` (normalisation E.164, lookup `clients.telephone`).

### Helper d'envoi de message libre

Créer `supabase/functions/_shared/whatsapp-send-text.ts` : envoie message texte ou interactive-buttons en dehors de tout template (utilisable car fenêtre 24h ouverte par le clic du bouton).

## Étape 5 — Tests manuels

1. Créer manuellement un client de test avec `mandate_official_end_date = CURRENT_DATE + 30`
2. Trigger manuel `wa-send-mandate-expiring` (curl)
3. Vérifier réception WhatsApp + 3 boutons
4. Tester chaque bouton :
   - Renouveler → vérifier `mandat_date_signature` mis à jour
   - J'ai trouvé seul → vérifier `statut = inactif` + `cancellation_reason = found_alone`
   - Annuler & remboursement (avec daysSinceSignature=85) → vérifier `refund_status = pending`
   - Annuler & remboursement (avec daysSinceSignature=10) → vérifier dialogue de fallback + 2 nouveaux boutons

## Détails techniques

### Ordre d'exécution (à mon tour)

1. Migration DB (table `whatsapp_pending_actions` + index unique + insertion template registry + extensions)
2. Helpers `_shared/whatsapp-*.ts`
3. Edge function `wa-send-mandate-expiring`
4. Patch `whatsapp-webhook` (handlers 3 boutons + dialogue fallback)
5. Patch `mandate-renewal-action` pour accepter mode `triggered_by: "whatsapp_webhook"` sans token (avec validation phone↔client)
6. Insertion cron job (via `supabase--insert`)
7. Déploiement edge functions

### Sécurité

- Webhook valide la signature Meta (déjà en place)
- Lookup phone→client_id en service role uniquement
- Idempotency cron via index unique sur log
- Dialogue fallback expire après 1h (table `whatsapp_pending_actions`)

## Hors périmètre (templates suivants)

- Templates #3 à #7 (acceptation dossier, signature, EDL, clés, avis Google) — feront l'objet de plans séparés après approbation Meta du #2.

## Ce que tu fais en parallèle

Pendant que j'implémente le code, tu peux **soumettre le template à Meta** dès maintenant. Approbation 24-48h. Le code sera prêt et déployé avant l'approbation, donc dès qu'il passe `Actif` → ça tourne.
