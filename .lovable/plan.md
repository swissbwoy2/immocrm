

## Plan — Backfill Meta Lead Ads (version finale validée)

### 3 fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `supabase/functions/meta-leads-backfill/index.ts` | Créer |
| `supabase/config.toml` | Ajouter `[functions.meta-leads-backfill]` avec `verify_jwt = true` |
| `src/pages/admin/MetaLeads.tsx` | Ajouter bouton sync + dialog confirmation + logique d'appel |

---

### 1. Edge Function `meta-leads-backfill`

**Sécurité** : `verify_jwt = true` — le JWT est validé par la gateway, puis la fonction vérifie le rôle admin via `user_roles`.

**Auth** :
- Extraire le token Authorization, appeler `supabase.auth.getUser()` pour obtenir le `user_id`
- Vérifier `user_roles` pour `role = 'admin'` — 403 sinon
- Stocker `admin_user_id` dans tous les logs de session

**Garde-fou anti-concurrence** :
- Chercher dans `meta_lead_logs` un `backfill_started` sans `backfill_completed`/`backfill_failed` correspondant, datant de moins de **10 minutes** (au lieu de 30, pour éviter les blocages prolongés)
- Si trouvé → retourner 409 Conflict
- Le log `backfill_started` contient un `session_id` (UUID généré), réutilisé dans `backfill_completed`/`backfill_failed` pour un matching fiable

**Logique principale** :
1. Auto-détecter `page_id` depuis les `meta_leads` existants (`SELECT DISTINCT page_id ... LIMIT 1`). Accepter un override via le body de la requête.
2. Logger `backfill_started` avec `{ admin_user_id, page_id, session_id }`
3. Récupérer tous les formulaires : `GET /{page_id}/leadgen_forms?fields=id,name,status`
4. Pour chaque formulaire :
   - Logger `backfill_form_started` avec `{ form_id, form_name, session_id }`
   - Paginer les leads : `GET /{form_id}/leads?fields=field_data,created_time,ad_id,campaign_id,form_id,is_organic&limit=500`, suivre `paging.next`
   - Dédupliquer par `leadgen_id` (skip si déjà dans `meta_leads`)
   - Extraire les champs contact (même logique que le webhook : `extractFieldValue`)
   - Enrichir ad/adset/campaign/form/page names via Graph API avec cache `Map<string, string>` en mémoire
   - Insérer avec `source = 'backfill'`
   - Logger `backfill_form_completed` avec `{ form_id, form_name, fetched, imported, skipped, errors, session_id }`
5. Logger `backfill_completed` avec compteurs globaux `{ admin_user_id, session_id, total_fetched, imported, skipped, errors, forms_count }`
6. En cas d'erreur fatale : logger `backfill_failed` avec `{ admin_user_id, session_id, error_message }`
7. Retourner le résumé JSON

**Réutilisation du code webhook** : Les fonctions `fetchGraphAPI`, `fetchGraphAPIWithRetry`, `extractFieldValue` sont dupliquées dans cette edge function (pas de partage possible entre edge functions).

---

### 2. Admin UI — `MetaLeads.tsx`

- Ajouter un bouton **"Synchroniser les leads Meta"** avec icône `Download`, à côté du bouton "Actualiser"
- État `syncing: boolean` — quand `true` : bouton désactivé avec spinner (anti double-clic)
- Au clic : ouvrir un **AlertDialog** de confirmation : "Voulez-vous importer tous les leads Meta existants ? Cette opération peut prendre quelques minutes."
- Sur confirmation :
  - Auto-détecter `page_id` via une requête rapide `meta_leads` côté client
  - Si aucun `page_id` trouvé, afficher un champ Input pour le saisir manuellement
  - Appeler `supabase.functions.invoke('meta-leads-backfill', { body: { page_id } })` — le SDK transmet automatiquement le JWT
- Gestion des réponses :
  - Succès : toast avec `imported / skipped / errors`
  - 409 : toast "Un import est déjà en cours"
  - 403 : toast "Accès refusé"
  - Autre erreur : toast d'erreur générique
- Auto-refresh de la liste après succès

---

### 3. Config

```toml
[functions.meta-leads-backfill]
verify_jwt = true
```

