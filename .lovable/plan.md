

# Correction : Afficher uniquement les visites a venir dans "Visites a deleguer"

## Probleme

La requete charge les 50 visites les plus anciennes avec `statut = 'planifiee'` et `statut_coursier IS NULL`, triees par date croissante. Resultat : les vieilles visites de decembre 2025 (passees depuis longtemps) apparaissent en premier et cachent les visites a venir de fevrier 2026.

## Solution

Ajouter un filtre `date_visite >= maintenant` a la requete pour ne montrer que les visites futures.

## Modification technique

**Fichier** : `src/pages/admin/Coursiers.tsx`, ligne 32

Ajouter `.gte('date_visite', new Date().toISOString())` a la requete des visites eligibles :

**Avant :**
```typescript
supabase.from('visites')
  .select('*, offres(adresse), clients!client_id(...)')
  .is('statut_coursier', null)
  .eq('statut', 'planifiee')
  .order('date_visite', { ascending: true })
  .limit(50)
```

**Apres :**
```typescript
supabase.from('visites')
  .select('*, offres(adresse), clients!client_id(...)')
  .is('statut_coursier', null)
  .eq('statut', 'planifiee')
  .gte('date_visite', new Date().toISOString())
  .order('date_visite', { ascending: true })
  .limit(50)
```

Cela filtrera automatiquement les visites passees et n'affichera que les prochaines visites planifiees.

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/admin/Coursiers.tsx` | Ajouter le filtre `.gte('date_visite', ...)` a la ligne 32 |

