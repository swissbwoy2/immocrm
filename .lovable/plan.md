
# Problème : Impossible de prévisualiser/télécharger les documents depuis le profil agent

## Cause racine identifiée

Il existe **deux types de chemins de stockage** pour les documents clients, et les politiques RLS du bucket `client-documents` ne couvrent qu'un seul correctement pour les agents :

| Chemin de stockage | Exemple | Politique RLS agent |
|---|---|---|
| `mandat/{timestamp}_type.pdf` | `mandat/1771244445349_poursuites.pdf` | ✅ Vérifie `client_agents` (junction table) |
| `{user_id}/{timestamp}_nom.pdf` | `98da5cb0-.../1769543391775.pdf` | ❌ Vérifie seulement `clients.agent_id` (colonne directe) |

Les documents dans le dossier `{user_id}/` — qui sont les documents uploadés directement par l'agent ou via l'interface admin — ne sont **pas accessibles** aux agents co-assignés (liés via `client_agents`) car les politiques de stockage pour ce pattern ignorent la table de liaison `client_agents`.

## Politiques RLS actuelles (défaillantes pour les agents co-assignés)

```sql
-- ❌ Vérifie uniquement c.agent_id (colonne directe), pas client_agents
"Agents can view their clients documents":
  folder[1] as uuid IN (
    SELECT c.user_id FROM clients c JOIN agents a ON a.id = c.agent_id WHERE a.user_id = auth.uid()
  )

"Agents peuvent voir documents de leurs clients":
  EXISTS (
    SELECT 1 FROM clients c JOIN agents a ON a.id = c.agent_id
    WHERE c.user_id = folder[1] AND a.user_id = auth.uid()
  )
```

## Solution : Ajouter une politique RLS Storage pour les agents co-assignés

Créer une **nouvelle politique SELECT** sur `storage.objects` qui autorise les agents à lire les fichiers dans les dossiers `{user_id}/` de leurs clients co-assignés via `client_agents` :

```sql
CREATE POLICY "Agents co-assignés peuvent voir documents clients (user_id folder)"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM clients c
    JOIN client_agents ca ON ca.client_id = c.id
    JOIN agents a ON a.id = ca.agent_id
    WHERE c.user_id::text = (storage.foldername(name))[1]
    AND a.user_id = auth.uid()
  )
);
```

Cette politique :
- Cible uniquement les fichiers dont le premier segment du chemin est un UUID (dossier `user_id/`)
- Vérifie que l'agent courant est lié au client via `client_agents`
- Couvre donc tous les agents assignés (via colonne directe ET via junction table)

## Fichiers impactés

| Action | Détail |
|---|---|
| Migration SQL | Ajouter la politique RLS Storage pour agents co-assignés sur dossiers `{user_id}/` |
| Aucun fichier frontend | Le code `handlePreview` / `handleDownload` de `ClientDetail.tsx` est correct |

## Résultat attendu

Après la migration, Carina (et tout agent co-assigné) pourra prévisualiser et télécharger **tous les documents** de ses clients, qu'ils soient stockés dans `mandat/` ou dans `{user_id}/`.
