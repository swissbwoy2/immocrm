

# Fix bug submit + Rappel automatique 24h avant le RDV téléphonique

## Diagnostic du bug "rien ne se passe"

Cause confirmée par les logs DB + RLS :

1. À 21:14:52 : INSERT dans `lead_phone_appointments` réussit (ligne présente en base)
2. INSERT dans `leads` exécute `.select('id').single()` → le RETURNING passe par les RLS **SELECT** de `leads`, qui exigent `admin` ou `closeur` → **42501** pour un anon
3. Le `throw` annule la suite mais l'appointment est déjà inséré
4. Le user re-clique → conflit unique 23505 sur le slot → toast "créneau déjà pris" + `setSelectedSlot(null)` → écran qui paraît figé

## Correctifs

### 1. Suppression du `.select()` post-INSERT sur `leads`
Dans les **deux** fichiers (`src/components/landing/DossierAnalyseSection.tsx` et `src/components/public-site/sections/DossierAnalyseSection.tsx`) :
- Générer `const leadId = crypto.randomUUID()` côté client
- INSERT avec `.insert({ id: leadId, ... })` **sans** `.select()` (pattern documenté Lovable pour éviter ce 42501)
- Utiliser `leadId` directement pour l'UPDATE de `lead_phone_appointments.lead_id`

### 2. Nettoyage de l'appointment orphelin si l'INSERT lead échoue
Si l'INSERT `leads` échoue après réservation du slot → DELETE de l'appointment qu'on vient de créer (ou UPDATE status='annule') → libère le créneau immédiatement, plus de blocage en cas de retry.

### 3. Pré-vérif côté client (UX)
Avant l'INSERT appointment, faire un SELECT sur la vue `available_phone_slots` pour vérifier que le slot est encore libre → message clair sans même tenter l'écriture.

## Rappel automatique 24h avant le RDV

### A. Nouvelle Edge Function `send-phone-appointment-reminders`
Logique :
- Sélectionne tous les `lead_phone_appointments` où `status = 'confirme'`, `reminder_24h_sent_at IS NULL`, et `slot_start` est entre `now() + 23h` et `now() + 25h`
- Pour chacun :
  - Envoie un email Resend depuis `support@logisorama.ch` (pattern `send-calendar-invite` existant)
  - Sujet : "📞 Rappel : votre rendez-vous téléphonique demain"
  - Corps HTML premium (gradient sombre + carte glass) reprenant le style de `send-calendar-invite/index.ts` : date en français long (Europe/Zurich), heure, numéro de téléphone, message "Notre équipe vous appellera demain à HH:MM"
  - Bouton CTA "📅 Ajouter au calendrier" qui pointe vers la fonction publique `download-phone-appointment-ics?id={appointment_id}` (génère et sert le `.ics` directement, RFC 5545, méthode REQUEST + VALARM -PT15M)
  - Pièce jointe `.ics` également incluse (réutilise le générateur de `send-calendar-invite`)
- UPDATE `reminder_24h_sent_at = now()` après succès
- Logs structurés : `[reminder] sent=X, skipped=Y, errors=Z`
- CORS standard, pas de JWT requis (appelée par cron)

### B. Nouvelle Edge Function publique `download-phone-appointment-ics`
- GET avec `?id=<uuid>`
- SELECT sur `lead_phone_appointments` (clé service-role pour bypasser RLS, validation stricte UUID)
- Génère ICS Europe/Zurich + alarme 15 min avant
- Réponse `Content-Type: text/calendar; charset=utf-8` + `Content-Disposition: attachment; filename="rdv-logisorama.ics"`
- Permet l'ajout au calendrier en 1 clic depuis n'importe quel client mail

### C. Migration DB
- ALTER TABLE `lead_phone_appointments` ADD COLUMN `reminder_24h_sent_at timestamptz`
- INDEX partiel `(slot_start) WHERE status = 'confirme' AND reminder_24h_sent_at IS NULL` pour des cron requests rapides
- Cron job pg_cron (toutes les 15 min) :
  ```
  SELECT cron.schedule(
    'phone-appointment-reminders-24h',
    '*/15 * * * *',
    $$ SELECT net.http_post(
       url:='https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-phone-appointment-reminders',
       headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
       body:='{}'::jsonb
    ); $$
  );
  ```
  (insérée via outil insert, pas migration, conformément aux règles)

### D. Mise à jour `confirm-phone-appointment`
- Reset `reminder_24h_sent_at = NULL` au moment de la confirmation (sécurise les confirmations tardives < 24h pour qu'elles n'envoient pas de rappel inutile : ajouter une garde "skip si slot_start < now() + 26h" côté reminder).

## Fichiers touchés

```text
[FIX] src/components/landing/DossierAnalyseSection.tsx
[FIX] src/components/public-site/sections/DossierAnalyseSection.tsx
[NEW] supabase migration                                ADD reminder_24h_sent_at + index
[INSERT] cron.schedule                                  job toutes 15 min
[NEW] supabase/functions/send-phone-appointment-reminders/index.ts
[NEW] supabase/functions/download-phone-appointment-ics/index.ts
[MOD] supabase/functions/confirm-phone-appointment/index.ts (reset reminder + appel ICS endpoint)
```

## Validation

1. Soumission analyse dossier après sélection slot → success state, lead + appointment créés et liés (plus de 42501)
2. Re-soumission après échec → slot libéré, pas de blocage
3. RDV confirmé par admin pour H+24 → email rappel automatique reçu dans les 15 min suivantes (cron `*/15`)
4. Email rappel : design premium, bouton "Ajouter au calendrier" fonctionnel (download .ics), pièce jointe .ics présente
5. Pas de double rappel (`reminder_24h_sent_at` empêche)
6. Confirmation tardive < 26h → pas de rappel envoyé (garde temps)
7. RDV annulé → pas de rappel
8. `.ics` ouvre correctement sur iPhone Calendar / Google Calendar / Outlook avec rappel 15 min auto

