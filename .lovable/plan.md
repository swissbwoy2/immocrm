## Objectif

Étendre le système de suivi des extraits de poursuites (aujourd'hui uniquement admin) à **l'agent** (vue de ses clients assignés) et **renforcer la visibilité côté client** (Dashboard + Mon Dossier) avec des **emails de rappel automatiques**.

---

## 1. Page Agent — `/agent/suivi-extraits`

**Nouveau fichier :** `src/pages/agent/SuiviExtraitsPoursuites.tsx`

Réutilise la même logique que la page admin mais filtrée sur **les clients assignés à l'agent connecté** (via `clients.agent_id` + table `client_agents` pour les co-assignations, conformément à la mémoire `dual-source-assignment-integrity-strategy`).

Fonctionnalités :
- KPIs : Total assignés / Valides / Avertissement (≥2 mois) / Expirés (≥3 mois) / Manquants / Scannables IA
- Tableau : nom client, date d'émission, âge, statut coloré, méthode (ai/manual/agent), document source, dernière relance
- Bouton **"Scanner les manquants"** et **"Re-scanner tout"** (réutilise l'edge function `extract-poursuites-batch` qui sera étendue pour accepter un `agent_id` optionnel)
- Bouton **"Envoyer un rappel"** par client (déclenche email manuellement)

**Routing :** ajout dans `src/App.tsx` avec `allowedRoles={['agent']}`.
**Sidebar :** ajout entrée "Suivi extraits" dans la section agent de `src/components/AppSidebar.tsx`.

---

## 2. Edge Function `extract-poursuites-batch` — extension

Ajouter un paramètre optionnel `agent_id` au body :
- Si fourni + appelant a le rôle `agent`, filtrer les clients par `agent_id` ou via jointure `client_agents`
- Si appelant est `admin`, comportement actuel inchangé
- Garde-fou RLS : un agent ne peut scanner que SES clients

---

## 3. Mise en avant côté Client

### 3a. Dashboard client (`src/pages/client/Dashboard.tsx`)

`DocumentUpdateReminder` est déjà rendu mais discret. Je vais :
- Le **promouvoir en bandeau hero** en haut du dashboard (juste sous le PremiumDashboardHeader) quand le statut est `expired` ou `warning` ou `missing`
- Créer un nouveau composant `PremiumExtraitPoursuitesHeroCard` (grand format, gradient, CTA "Mettre à jour maintenant", compteur de jours restants avant expiration)
- Le composant existant `DocumentUpdateReminder` reste pour l'état `valid` (compact)

### 3b. Mon Dossier client (`src/pages/client/Dossier.tsx`)

Ajouter une **section dédiée premium "Extrait de poursuites"** dans la sidebar du dossier, avec :
- Date d'émission affichée en grand
- Badge de statut (valide/à renouveler/expiré)
- Méthode de détection (IA / manuelle / agent)
- Lien vers le document source
- Bouton "Téléverser un nouvel extrait"

---

## 4. Emails de rappel automatiques

### 4a. Nouvelle Edge Function planifiée `send-extrait-poursuites-reminders`

Logique :
- Tous les jours (cron pg_cron à 08:00 Europe/Zurich)
- Sélectionne les clients **actifs** dont :
  - `extrait_poursuites_date_emission` est NULL → rappel "manquant" (1 fois / 14 jours)
  - âge entre 60 et 75 jours → rappel "approche expiration" (1 fois / 14 jours)
  - âge ≥ 90 jours → rappel "expiré urgent" (1 fois / 7 jours)
- Anti-spam via `extrait_poursuites_last_reminder_at`
- Utilise `send-transactional-email` avec un nouveau template `extrait-poursuites-reminder` (3 variantes selon statut, passées via `templateData.variant`)
- Met à jour `extrait_poursuites_last_reminder_at` après envoi

### 4b. Template React Email

Nouveau fichier : `supabase/functions/_shared/transactional-email-templates/extrait-poursuites-reminder.tsx`
- Branding Logisorama
- Subject dynamique selon variante
- CTA vers `/client/dossier`
- Enregistré dans `registry.ts`

### 4c. Cron job

SQL (via insert tool) pour planifier `send-extrait-poursuites-reminders` quotidien.

---

## 5. Notifications in-app

À chaque envoi d'email de rappel, créer aussi une **notification in-app** dans la table `notifications` du client (cloche en haut du dashboard) avec lien vers Mon Dossier.

---

## Fichiers impactés

**Créés :**
- `src/pages/agent/SuiviExtraitsPoursuites.tsx`
- `src/components/premium/PremiumExtraitPoursuitesHeroCard.tsx`
- `supabase/functions/send-extrait-poursuites-reminders/index.ts`
- `supabase/functions/_shared/transactional-email-templates/extrait-poursuites-reminder.tsx`

**Modifiés :**
- `src/App.tsx` (route agent)
- `src/components/AppSidebar.tsx` (entrée agent)
- `src/pages/client/Dashboard.tsx` (hero card)
- `src/pages/client/Dossier.tsx` (section dédiée)
- `supabase/functions/extract-poursuites-batch/index.ts` (filtre agent)
- `supabase/functions/_shared/transactional-email-templates/registry.ts`
- `supabase/config.toml` (nouvelle fonction)

**SQL (insert tool) :** cron job quotidien.

---

## Question avant exécution

Le cron de rappel doit-il s'exécuter **quotidiennement à 08:00 Europe/Zurich** (recommandé) ou à une autre fréquence ?