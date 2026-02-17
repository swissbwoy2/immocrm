

# Integration Google Calendar automatique

## Objectif
Quand un evenement (visite, signature, etat des lieux, rappel...) est cree dans l'application, il s'ajoute **automatiquement** dans le Google Agenda de l'utilisateur concerne (client, agent ou admin).

## Architecture

L'integration necessite 3 composants :

### 1. Connexion Google Calendar par utilisateur
Chaque utilisateur doit autoriser l'acces a son Google Agenda une seule fois via un bouton "Connecter Google Agenda" dans ses parametres. Cela genere un **refresh token** stocke de maniere securisee en base.

### 2. Edge function `sync-google-calendar`
Appelee automatiquement a chaque creation d'evenement, elle utilise le refresh token de l'utilisateur pour creer l'evenement dans son Google Agenda via l'API Google Calendar.

### 3. Flux OAuth dedie (separe du login)
Un flux OAuth specifique pour obtenir la permission `calendar.events` sans changer le systeme de login existant.

```text
Utilisateur                  App                    Google
    |                         |                       |
    |-- Clic "Connecter" ---->|                       |
    |                         |-- Redirect OAuth ---->|
    |                         |                       |
    |<---- Callback URL ------|<-- code + tokens -----|
    |                         |                       |
    |  (refresh_token stocke  |                       |
    |   dans la base)         |                       |
    |                         |                       |
    |-- Cree un evenement --->|                       |
    |                         |-- API Calendar ------>|
    |                         |   (avec token)        |
    |                         |                       |
```

## Pre-requis Google Cloud Console

Vous devez avoir configure dans votre Google Cloud Console :
- L'API Google Calendar activee (vous l'avez fait)
- Un **Client OAuth 2.0** de type "Application Web" avec :
  - **URI de redirection autorisee** : `https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/google-calendar-callback`
  - Les scopes : `https://www.googleapis.com/auth/calendar.events`

Vous devrez fournir **2 secrets** :
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`

## Details techniques

### A. Base de donnees

**Nouvelle table `google_calendar_tokens`** :
- `id` (uuid, PK)
- `user_id` (uuid, FK profiles, unique)
- `refresh_token` (text, chiffre)
- `access_token` (text)
- `token_expires_at` (timestamptz)
- `calendar_id` (text, default 'primary')
- `created_at` / `updated_at`
- RLS : chaque utilisateur ne voit que son propre token

### B. Edge functions

**`google-calendar-auth`** : Genere l'URL OAuth Google et redirige l'utilisateur.

**`google-calendar-callback`** : Recoit le code OAuth, echange contre un refresh token, le stocke dans `google_calendar_tokens`, puis redirige vers l'app avec un message de succes.

**`sync-google-calendar`** : Recoit les details d'un evenement (titre, date, description) + user_id, recupere le token, cree l'evenement dans Google Calendar. Appelee depuis le code frontend apres chaque insertion de `calendar_events` ou `visites`.

### C. Frontend

**Composant `GoogleCalendarConnect`** : Bouton dans les parametres utilisateur pour connecter/deconnecter Google Agenda. Affiche le statut (connecte ou non).

**Appel automatique** : Apres chaque insertion reussie dans `calendar_events` ou `visites`, appeler `sync-google-calendar` pour les utilisateurs concernes (createur + participants). Cela concerne environ 9 fichiers existants.

### D. Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/google-calendar-auth/index.ts` | Nouveau - initie le flux OAuth |
| `supabase/functions/google-calendar-callback/index.ts` | Nouveau - recoit le callback OAuth |
| `supabase/functions/sync-google-calendar/index.ts` | Nouveau - cree l'evenement dans Google Calendar |
| `src/components/settings/GoogleCalendarConnect.tsx` | Nouveau - UI de connexion |
| `src/pages/agent/Calendrier.tsx` | Ajouter appel sync apres insert |
| `src/pages/admin/Calendrier.tsx` | Ajouter appel sync apres insert |
| `src/pages/client/Messagerie.tsx` | Ajouter appel sync apres insert |
| `src/pages/agent/Messagerie.tsx` | Ajouter appel sync apres insert |
| `src/pages/agent/Candidatures.tsx` | Ajouter appel sync apres insert |
| `src/pages/admin/Candidatures.tsx` | Ajouter appel sync apres insert |
| `src/pages/client/MesCandidatures.tsx` | Ajouter appel sync apres insert |
| `src/pages/client/OffresRecues.tsx` | Ajouter appel sync apres insert |
| `src/components/proprietaire/AddCalendarEventDialog.tsx` | Ajouter appel sync apres insert |

### E. Helper reutilisable

Un hook `useGoogleCalendarSync` sera cree pour centraliser l'appel a l'edge function :

```typescript
async function syncToGoogleCalendar(event: {
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
}) { ... }
```

## Etapes d'implementation

1. Demander les secrets `GOOGLE_CALENDAR_CLIENT_ID` et `GOOGLE_CALENDAR_CLIENT_SECRET`
2. Creer la table `google_calendar_tokens` avec RLS
3. Creer les 3 edge functions (auth, callback, sync)
4. Creer le composant `GoogleCalendarConnect` et l'integrer dans les pages de parametres
5. Creer le hook `useGoogleCalendarSync`
6. Integrer l'appel sync dans tous les fichiers qui inserent des evenements
7. Tester le flux complet

