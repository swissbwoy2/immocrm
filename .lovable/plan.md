## Cause exacte de l'erreur

L'erreur `new row violates row-level security policy for table "demandes_mandat"` vient de la modification récente que j'ai faite dans `src/pages/NouveauMandat.tsx` :

```ts
.insert(insertData as any)
.select('id')   // ⬅️ ajouté hier
.single();
```

Le formulaire `/nouveau-mandat` est utilisé par des visiteurs **non connectés** (rôle `anon`).

- La policy **INSERT** (`Public can submit mandate requests`, `WITH CHECK true`) autorise bien l'insertion.
- Mais le `.select('id')` force PostgREST à demander `Prefer: return=representation`, ce qui exige que la ligne soit visible via une policy **SELECT**.
- Toutes les policies SELECT de `demandes_mandat` exigent `auth.uid()` (admin, propriétaire de la demande via email/profil). Pour un visiteur anonyme, **aucune** ne matche → Supabase renvoie le message RLS trompeur côté INSERT.

Résultat : la cliente Wint2 (non connectée) ne peut plus soumettre. Tous les nouveaux mandats publics sont bloqués depuis cette modif.

## Correctif (minimal, 1 fichier)

Générer l'UUID côté client avant l'insertion, pour **éliminer le `.select()`** :

1. Dans `src/pages/NouveauMandat.tsx`, créer l'id en amont :
   ```ts
   const demandeMandatId = crypto.randomUUID();
   const insertData = { id: demandeMandatId, /* …reste inchangé… */ };
   ```
2. Remplacer le bloc d'insertion par :
   ```ts
   const { error: insertError } = await supabase
     .from('demandes_mandat')
     .insert(insertData as any);
   if (insertError) throw insertError;
   ```
3. Garder `demandeMandatId` tel quel pour les appels suivants à `send-mandat-pdf` et `invite-client` (la valeur est connue avant l'insert, le fix précédent reste valable).

Aucune migration SQL nécessaire : la colonne `id` est un UUID PK, fournir une valeur explicite est accepté et l'INSERT WITH CHECK = true reste satisfait pour `anon`.

## Vérification après build

- Tester la soumission `/nouveau-mandat` en navigation privée (anon).
- Vérifier l'apparition de la ligne dans `demandes_mandat` puis le déclenchement de `invite-client` (id transmis).
- Confirmer que les 3 clients orphelins précédents peuvent toujours être activés manuellement depuis `admin/demandes-activation`.
