

# Plan : Rendez-vous téléphonique obligatoire dans le formulaire "Analyse de dossier"

## Mise à jour vs version précédente

- Plage horaire élargie : **7h30 → 22h00** (au lieu de 8h30 → 16h30)
- Toujours 7j/7 (lundi → dimanche inclus)
- Slots de 15 min → **58 slots/jour** (7h30, 7h45, … 21h45)

## Objectif

Avant qu'un prospect puisse envoyer son formulaire d'analyse de dossier, il doit **réserver un créneau téléphonique de 15 minutes** entre 7h30 et 22h00 (Europe/Zurich), tous les jours. Le créneau apparaît dans `/admin/calendrier` + `/admin/leads`, l'admin confirme, et le prospect reçoit une confirmation email avec invitation `.ics`.

## Comportement attendu

```text
Formulaire analyse de dossier
        │
        ▼
[Étape finale ajoutée] ──► Choix créneau téléphonique
        │                        │
        │   7j/7 (lun → dim inclus)
        │   7h30 → 22h00, slots de 15 min (58 slots/jour)
        │   Créneaux déjà pris = grisés (indisponibles)
        │
        ▼
   Submit form ──► Crée lead + crée rendez-vous "en_attente"
        │
        ▼
   Admin voit dans /admin/leads (badge "RDV tél le X à Y")
   Admin voit dans /admin/calendrier (event orange en attente)
        │
        ▼
   Admin clique "Confirmer le RDV"
        │
        ▼
   Email au prospect : "Votre rendez-vous téléphonique est fixé le … à …"
   + pièce jointe invitation.ics (réutilise send-calendar-invite)
```

## Données

### Nouvelle table `lead_phone_appointments`

```text
id                  uuid PK
lead_id             uuid → leads.id (nullable)
prospect_email      text NOT NULL
prospect_phone      text NOT NULL
prospect_name       text NOT NULL
slot_start          timestamptz NOT NULL  (Europe/Zurich)
slot_end            timestamptz NOT NULL  (slot_start + 15min)
status              text DEFAULT 'en_attente'  (en_attente | confirme | annule | termine)
confirmed_by        uuid (admin user_id)
confirmed_at        timestamptz
ics_sent_at         timestamptz
notes_admin         text
source_form         text DEFAULT 'analyse_dossier'
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()

UNIQUE INDEX (slot_start) WHERE status != 'annule'
INDEX (slot_start), INDEX (status), INDEX (lead_id)
```

### RLS
- **INSERT public anonyme** : autorisé (prospect non loggé)
- **SELECT public anonyme** : autorisé sur `slot_start, status` via vue `available_phone_slots`
- **SELECT/UPDATE/DELETE admin** : `has_role(auth.uid(), 'admin')`

## Génération des créneaux

Côté **frontend** : J+1 → J+14 jours calendaires × **58 slots/jour** (de 7h30 à 21h45, pas de 15 min, dernier appel possible 21h45 → 22h00).
Query `lead_phone_appointments WHERE slot_start BETWEEN now AND now+14d AND status != 'annule'` → grise les créneaux pris.

## Modifications fichiers

### 1. Migration DB
- Création table `lead_phone_appointments` + RLS + vue `available_phone_slots`
- Trigger `updated_at`
- `ALTER PUBLICATION supabase_realtime ADD TABLE lead_phone_appointments`

### 2. `src/components/landing/AnalyseDossierForm.tsx` (nom à confirmer à la lecture)
Étape finale obligatoire `<PhoneSlotPicker />` avant le bouton "Envoyer mon dossier". Bouton désactivé tant que pas de créneau choisi.

### 3. Nouveau `src/components/landing/PhoneSlotPicker.tsx`
- DatePicker shadcn — J+1 à J+14, aucun jour désactivé
- Grille 58 slots de 15 min (7h30 → 21h45)
- Slot pris : `disabled + opacity-50 + bg-muted`
- Slot sélectionné : `bg-primary text-primary-foreground`
- Realtime subscribe sur `lead_phone_appointments`
- Style premium landing (glass, gold, Framer Motion)
- Sur mobile : grille collapsée par tranche horaire (Matin 7h30-12h / Après-midi 12h-18h / Soir 18h-22h) pour éviter scroll infini

### 4. Logique submit form analyse-dossier
- Insert `lead_phone_appointments` avec slot choisi (gestion conflit unique → message "créneau déjà pris, choisis-en un autre")
- Insert lead avec `source = 'landing_analyse_dossier'`
- UPDATE `lead_phone_appointments.lead_id`
- Toast : "Demande envoyée. Votre RDV téléphonique est en attente de confirmation."

### 5. `/admin/leads` (`src/pages/admin/Leads.tsx`)
- Badge "RDV tél" sur leads `landing_analyse_dossier`
- Format : `📞 Sam 27 avril 21h15` + badge statut (`en_attente` orange / `confirme` vert)
- Bouton **Confirmer RDV** (si `en_attente`) → invoke `confirm-phone-appointment`
- Bouton **Annuler RDV**

### 6. `/admin/calendrier` (`src/pages/admin/Calendrier.tsx`)
- Source ajoutée : `lead_phone_appointments WHERE status IN ('en_attente','confirme')`
- Couleur : orange si `en_attente`, vert si `confirme`
- Title : "📞 RDV tél : {prospect_name} ({prospect_phone})"

### 7. Edge Function `supabase/functions/confirm-phone-appointment/index.ts`
- Auth : JWT admin requis
- Reçoit `{ appointment_id }`
- UPDATE status='confirme', confirmed_by, confirmed_at
- Envoie email Resend + invoke `send-calendar-invite` :
  - title : "Rendez-vous téléphonique avec Logisorama"
  - description : "Notre équipe vous appellera au {prospect_phone}"
  - start/end du slot, timezone Europe/Zurich
- Email HTML : "Votre rendez-vous téléphonique est fixé le {date} à {heure}" + bouton Ajouter au calendrier
- Marque `ics_sent_at = now()`

## Validation

1. Créneaux 7j/7 de 7h30 à 22h00 (58 slots/jour)
2. Slots pris grisés en temps réel
3. Soumission impossible sans créneau
4. Lead + RDV créés en `en_attente`
5. Badge RDV + bouton Confirmer dans `/admin/leads`
6. Event orange dans `/admin/calendrier`
7. Confirmer → email + `.ics` (iPhone/Google/Outlook)
8. Event devient vert
9. Réservation simultanée → erreur claire
10. Slots passés non sélectionnables

## Fichiers touchés

```text
[NEW] supabase migration                               table + RLS + vue + realtime
[NEW] src/components/landing/PhoneSlotPicker.tsx
[NEW] supabase/functions/confirm-phone-appointment/index.ts
[MOD] src/components/landing/AnalyseDossierForm.tsx    (intégration picker + submit)
[MOD] src/pages/admin/Leads.tsx                        (badge RDV + bouton Confirmer)
[MOD] src/pages/admin/Calendrier.tsx                   (source événements)
```

## Notes techniques

- **Timezone Europe/Zurich** strict partout (génération slots, affichage, ics)
- **Pas d'auto-confirm** : confirmation manuelle admin
- **Réutilise `send-calendar-invite`** existant
- **Realtime** activé sur `lead_phone_appointments`
- Aucune modification de `auth.users`

