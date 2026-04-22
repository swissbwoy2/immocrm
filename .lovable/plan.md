

# Fix : Email de relance qui ne part pas

## Diagnostic

L'email de relance pour Cendrine Cardoso (`christ.ramazani@gmail.com`) n'a jamais été envoyé. Deux causes confirmées :

### Cause #1 — Bug bloquant dans `send-lead-relance`
La fonction sélectionne la config SMTP comme ceci :
```ts
.from('email_configurations').select('*').eq('is_active', true).limit(1).single()
```
→ Il y a **7 configurations SMTP actives** (Gaetan, Maurine, Christ, Thibault, Miguel, Carina, Teklu).
→ `.single()` exige **exactement 1 ligne**. Avec 7 lignes, PostgREST renvoie l'erreur `PGRST116` et la fonction **crash silencieusement**.
→ C'est pour ça que tu as cliqué "Relance" mais Cendrine n'a rien reçu.

### Cause #2 — Pas de feedback d'erreur visible
Le toast "Erreur" s'affiche brièvement mais sans détail clair, donc le bug passe inaperçu.

## Correctif

**Fichier modifié** : `supabase/functions/send-lead-relance/index.ts`

1. **Sélectionner la config SMTP de l'utilisateur connecté** (admin qui clique sur Relance), comme le fait déjà `send-smtp-email` :
   ```ts
   .from('email_configurations')
   .select('*')
   .eq('user_id', user.id)
   .eq('is_active', true)
   .maybeSingle()
   ```
2. **Fallback** : si l'admin n'a pas de config personnelle (ex : Christ utilise `christ.ramazani@gmail.com` qui n'est pas dans `email_configurations`), retomber sur la config `info@immo-rama.ch` (config "officielle" de l'agence) :
   ```ts
   if (!emailConfig) {
     // Fallback sur info@immo-rama.ch
     const { data: fallback } = await supabase
       .from('email_configurations')
       .select('*')
       .eq('email_from', 'info@immo-rama.ch')
       .eq('is_active', true)
       .maybeSingle();
     emailConfig = fallback;
   }
   ```
3. **Erreur claire** si toujours aucune config : `"Aucune configuration SMTP trouvée pour cet utilisateur"` (au lieu d'un crash PGRST116 cryptique).

4. **Redéployer** la fonction (`deploy_edge_functions(['send-lead-relance'])`).

5. **Test** : relancer Cendrine Cardoso → vérifier dans les logs que l'envoi part et confirmer la bonne réception sur `christ.ramazani@gmail.com`.

## Fichiers touchés

```text
[MOD] supabase/functions/send-lead-relance/index.ts
      → Filtre par user_id + fallback info@immo-rama.ch + erreur explicite
```

## Validation

1. Cliquer "Relance" sur n'importe quel lead non contacté depuis `/admin/leads`
2. Le toast affiche "Email envoyé à …" (vert)
3. Le destinataire reçoit l'email marketing depuis l'adresse de l'admin connecté
4. Les logs de `send-lead-relance` montrent un envoi réussi (status 200)
5. Le lead passe en `contacted = true` automatiquement
6. Aucune régression sur "Relancer tous" (bouton dialog)

