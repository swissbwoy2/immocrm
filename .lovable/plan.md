# Problème — non, ce n'est pas normal

Les policies RLS RESTRICTIVE créées à la dernière migration (`Demo account cannot write *`) sont déclarées en **`FOR ALL`** au lieu de cibler uniquement les écritures.

En PostgreSQL, une policy RESTRICTIVE `FOR ALL` s'applique aussi au **SELECT** → le compte démo ne peut donc plus lire ses propres données : profil client, messages, offres, visites, documents, candidatures, conversations. D'où "Profil non chargé" et listes vides.

À côté, on a déjà des policies RESTRICTIVE séparées par commande (`Demo accounts cannot insert/update/delete *`) qui bloquent correctement les écritures → les `FOR ALL` sont **redondantes ET nuisibles**.

# Correctif (1 migration SQL, aucun changement frontend)

## 1. Supprimer les policies RESTRICTIVE `FOR ALL` cassées

Tables : `clients`, `messages`, `offres`, `visites`, `documents`, `candidatures`, `conversations`.

```sql
DROP POLICY IF EXISTS "Demo account cannot write clients" ON public.clients;
DROP POLICY IF EXISTS "Demo account cannot write messages" ON public.messages;
DROP POLICY IF EXISTS "Demo account cannot write offres" ON public.offres;
DROP POLICY IF EXISTS "Demo account cannot write visites" ON public.visites;
DROP POLICY IF EXISTS "Demo account cannot write documents" ON public.documents;
DROP POLICY IF EXISTS "Demo account cannot write candidatures" ON public.candidatures;
DROP POLICY IF EXISTS "Demo account cannot write conversations" ON public.conversations;
```

## 2. Compléter les policies RESTRICTIVE manquantes

Pour `clients` (INSERT manquant) et `conversations` (insert/update/delete manquants) :

```sql
CREATE POLICY "Demo accounts cannot insert clients"
  ON public.clients AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_account(auth.uid()));

CREATE POLICY "Demo accounts cannot insert conversations"
  ON public.conversations AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_demo_account(auth.uid()));
CREATE POLICY "Demo accounts cannot update conversations"
  ON public.conversations AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_demo_account(auth.uid()));
CREATE POLICY "Demo accounts cannot delete conversations"
  ON public.conversations AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_demo_account(auth.uid()));
```

## 3. Vérifier `profiles` et `rental_applications`

Lister les policies RESTRICTIVE sur ces tables. Si une `FOR ALL` y est présente, la remplacer par 3 policies (insert/update/delete) avec `NOT public.is_demo_account(auth.uid())`.

## 4. Vérifier après déploiement

- Recharger `/client` en démo → profil + dashboard doivent charger normalement.
- Tenter envoi de message → bloqué (UI guard + RLS INSERT).
- Tenter upload de document → bloqué.

# Hors scope

- Aucun changement frontend.
- Triggers `prevent_demo_*_changes` et composant `DemoWriteGuard` inchangés.
- Flag `is_demo_account` et helpers SQL inchangés.