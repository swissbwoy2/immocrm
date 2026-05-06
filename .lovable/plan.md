## Diagnostic

Audit du backend réalisé. Top consommateurs identifiés :

**Tables hyperactives (UPDATEs) :**
- `profiles` : 221 083 UPDATEs ← présence agent toutes les 60s
- `imap_configurations` : 37 602 UPDATEs ← cron IMAP toutes les 15 min
- `notifications` / `messages` : 40k+ UPDATEs

**11 cron jobs actifs** dont 3 toutes les 15 minutes (288 invocations/jour combinées).

---

## Optimisations proposées (par impact)

### 1. Présence agent : 60s → 180s (gain ~66% sur ce poste)
Fichier : `src/hooks/usePresence.ts`
- Passer `PRESENCE_INTERVAL` de `60000` → `180000` (3 min)
- Pause complète quand onglet en arrière-plan (déjà partiellement fait)
- Ne pas activer la présence pour les rôles `client`, `proprietaire`, `apporteur` (déjà mémorisé : "admin/agent only" mais à vérifier dans le hook)

**Impact** : 1 440 → 480 updates/jour/agent = -66%

### 2. Crons toutes les 15 min → réduire la fréquence
Migration SQL avec `cron.alter_job` :

| Cron | Actuel | Proposé | Justification |
|---|---|---|---|
| `sync-imap-emails-every-15-minutes` | */15 | ***/30** | Emails IMAP, 30 min OK |
| `phone-appointment-reminders-24h` | */15 | **0 */1** (1x/h) | Rappel 24h, pas besoin 15 min |
| `send-visit-reminders-every-15-minutes` | */15 | garder (visites = sensible) | OK |

**Impact** : -192 invocations cron/jour

### 3. Crons toutes les heures → garder mais vérifier
- `send-etat-lieux-reminders-hourly` : OK
- `send-signature-reminders-hourly` : OK
- `smart-followups-cron` (toutes 6h) : OK

### 4. Auditer les `notifications` UPDATEs (42k)
À investiguer : pourquoi autant d'updates ? Probablement `read_at` qui se déclenche à chaque vue. C'est sain mais on peut batcher.

### 5. Realtime subscriptions
Vérifier que `useLeadsRealtime` et `useMetaLeadsRealtime` ne tournent que sur les pages qui en ont besoin (à scoper aux pages admin/agent uniquement, pas en global App).

---

## Fichiers à modifier

1. **`src/hooks/usePresence.ts`** : intervalle 60s → 180s + skip pour rôles non-staff
2. **Migration SQL** : `cron.alter_job` pour 2 crons (IMAP + phone reminders)

---

## Hors-périmètre (à faire plus tard si besoin)

- Cleanup storage (PDFs mandats > 6 mois)
- Pagination réelle vs `.limit(15000)` sur les grandes listes admin
- Audit Edge Function `process-email-queue` (cron toutes les 5s mais nécessaire pour la fiabilité)

---

## Gain estimé

**~50-60% de réduction de la consommation quotidienne**, principalement DB writes et invocations Edge Functions. Aucun impact UX visible (présence en 3 min reste largement suffisant pour "agent en ligne").
