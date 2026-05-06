## Audit constaté

L'audit révèle 3 problèmes restants :

1. **`smart-followups-cron` est repassé à toutes les 6h** (`0 */6 * * *`) — la migration précédente n'a pas tenu (probablement écrasée par une autre migration).
2. **`imap_configurations` : 37 602 updates pour seulement 4 lignes** — chaque sync IMAP écrit `last_sync_at` / status, soit ~9400 updates par ligne. C'est le pire ratio de la DB.
3. **`notifications` : 42 609 updates** — chaque clic "marquer lu" déclenche un update individuel.
4. **Cron `send-document-update-reminders-daily` (7h tous les jours)** fait doublon avec `send-document-update-reminders` (le 25 du mois) — inutile en quotidien.
5. **60 fichiers vidéo orphelins (~2.5 GB) sont toujours dans `message-attachments`** — la suppression précédente a bien tourné mais les fichiers sont revenus / n'ont pas été purgés du disque.

## Plan d'action (Palier 3)

### 1. Re-fixer `smart-followups-cron` à 1×/jour
Migration SQL : `cron.alter_job` → `'0 9 * * *'`.

### 2. Réduire les écritures `imap_configurations`
Modifier la fonction edge `sync-imap-emails` pour ne mettre à jour `last_sync_at` **que si du nouveau courrier a été récupéré** (au lieu de chaque tick de 30 min). Gain estimé : -80% d'updates sur cette table.

### 3. Batcher les `notifications.read_at`
Au lieu d'un update par notification cliquée, utiliser un debounce côté client (regrouper les "marquer lu" sur 2 secondes) + un seul `update ... in (ids)`. Modifier le hook `useNotifications` (ou équivalent).

### 4. Désactiver le cron quotidien redondant
`send-document-update-reminders-daily` (7h tous les jours) → désactivé. Garder uniquement la version mensuelle (le 25).

### 5. Re-purger réellement le storage `message-attachments`
Vérifier pourquoi les 60 fichiers sont encore là (la précédente migration avait `DELETE FROM storage.objects` mais ça ne supprime que la métadonnée, pas le binaire S3). Utiliser l'API Storage (`supabase.storage.from('message-attachments').remove([...])`) via une fonction edge one-shot pour vraiment libérer l'espace.

### 6. Espacer `send-visit-reminders-every-15-minutes`
Passer de toutes les 15 min à toutes les 30 min. Impact UX : un rappel de visite peut arriver jusqu'à 30 min plus tard que prévu (acceptable car déclenché H-2 / H-24).

## Détails techniques

**Fichiers / objets modifiés :**
- `supabase/functions/sync-imap-emails/index.ts` — update conditionnel de `last_sync_at`.
- `src/hooks/useNotifications.ts` (ou nom équivalent) — debounce des `read_at`.
- Nouvelle migration SQL : `cron.alter_job` × 3 (smart-followups, visit-reminders, désactivation doc-reminders-daily).
- Nouvelle edge function one-shot `purge-orphan-attachments` qui appelle `storage.remove([...])` sur les 60 fichiers, puis qui se supprime.

## Gains estimés

| Optim | Gain estimé |
|---|---|
| smart-followups (4×/j → 1×/j) | -75% invocations cette fonction |
| imap update conditionnel | -30 000 writes/jour |
| notifications batching | -50% writes notifications |
| visit-reminders 15→30 min | -50% invocations |
| storage purge réelle | -2.5 GB stockage |
| doc-reminders quotidien off | -30 invocations/jour |

**Impact UX** : nul ou négligeable (rappels de visite +15 min max, statut "lu" des notifs visible avec ~2s de retard).

**Total cumulé avec Paliers 1+2+3 : -65 à -70% de consommation Cloud quotidienne.**

Veux-tu que j'applique ce Palier 3 ?