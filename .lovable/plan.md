

## Lot 2 — 3 corrections finales avant exécution

### Correction 1 : Trigger audit budget — alignement colonnes réelles

Les colonnes réelles sont :

**`renovation_budget_lines`** : `id, project_id, category, label, estimated, committed, invoiced, paid, variance (generated), currency, notes, created_at, updated_at`

**`renovation_audit_logs`** : `id, project_id, user_id, action, target_table, target_id, old_data, new_data, ip_address, created_at`

Le trigger corrigé :

```sql
CREATE OR REPLACE FUNCTION public.renovation_audit_budget_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.renovation_audit_logs (
    project_id, user_id, action, target_table, target_id, old_data, new_data
  ) VALUES (
    NEW.project_id,
    auth.uid(),
    'budget_updated',
    'renovation_budget_lines',
    NEW.id,
    jsonb_build_object(
      'category', OLD.category, 'label', OLD.label,
      'estimated', OLD.estimated, 'committed', OLD.committed,
      'invoiced', OLD.invoiced, 'paid', OLD.paid, 'notes', OLD.notes
    ),
    jsonb_build_object(
      'category', NEW.category, 'label', NEW.label,
      'estimated', NEW.estimated, 'committed', NEW.committed,
      'invoiced', NEW.invoiced, 'paid', NEW.paid, 'notes', NEW.notes
    )
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_audit_budget_change
  AFTER UPDATE ON public.renovation_budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.renovation_audit_budget_change();
```

Les colonnes `ip_address` et `created_at` ont des défauts (`NULL` et `now()`), donc pas besoin de les fournir.

---

### Correction 2 : RPC SECURITY DEFINER — double protection

En plus du check `current_setting('request.jwt.claim.role') IS DISTINCT FROM 'service_role'` à l'intérieur des fonctions, ajout explicite de `REVOKE` après chaque création :

```sql
-- Après création de renovation_lock_analysis_job
REVOKE EXECUTE ON FUNCTION public.renovation_lock_analysis_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renovation_lock_analysis_job(uuid) FROM authenticated;

-- Après création de renovation_replace_quote_items
REVOKE EXECUTE ON FUNCTION public.renovation_replace_quote_items(uuid, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renovation_replace_quote_items(uuid, jsonb, jsonb) FROM authenticated;
```

Résultat : même si un utilisateur tente un appel RPC direct, PostgreSQL refuse l'exécution avant même d'entrer dans la fonction.

---

### Correction 3 : Helper `renovation_agent_can_access_immeuble` — signature unique

Cette fonction n'existe pas encore. Une seule version sera créée, utilisée partout :

```sql
CREATE OR REPLACE FUNCTION public.renovation_agent_can_access_immeuble(_immeuble_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Admins can access all buildings
  IF public.renovation_is_admin() THEN
    RETURN true;
  END IF;
  -- Agents can only access buildings they manage
  RETURN EXISTS (
    SELECT 1 FROM public.immeubles
    WHERE id = _immeuble_id
      AND agent_responsable_id = auth.uid()
  );
END; $$;
```

**Signature** : `renovation_agent_can_access_immeuble(uuid) RETURNS boolean` — un seul paramètre (`_immeuble_id`), pas de `_user_id`. Le user est déduit de `auth.uid()`.

Utilisée dans :
- `renovation-create-project` Edge Function (vérification avant INSERT)
- Potentiellement dans les policies RLS futures si nécessaire

---

### Résumé des actions

La migration SQL Lot 2 contiendra dans cet ordre :

1. Helper `renovation_agent_can_access_immeuble(uuid)`
2. Fonction + trigger `renovation_audit_budget_change`
3. Fonction `renovation_lock_analysis_job(uuid)` + REVOKE anon/authenticated
4. Fonction `renovation_replace_quote_items(uuid, jsonb, jsonb)` + REVOKE anon/authenticated
5. Index unique `idx_renovation_quotes_unique_file` sur `renovation_quotes(file_id)`
6. 3 storage policies avec préfixe `project/`

Puis les 5 nouvelles Edge Functions, 2 Edge Functions modifiées, et ~14 fichiers frontend comme validé précédemment.

