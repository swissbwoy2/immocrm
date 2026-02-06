

# Correction : La section "Visites a deleguer" ne s'affiche pas

## Probleme identifie

La requete pour charger les visites eligibles retourne une **erreur 400** car elle reference des colonnes inexistantes (`client_nom`, `client_prenom`) dans la table `offres`.

Erreur exacte du serveur :
```
column offres_1.client_nom does not exist
```

La table `offres` n'a pas de colonnes `client_nom` / `client_prenom`. Le nom du client est stocke dans la table `profiles`, accessible via `clients.user_id`.

## Cause racine

Ligne 32 du fichier `src/pages/admin/Coursiers.tsx` :
```typescript
// INCORRECT - client_nom et client_prenom n'existent pas dans offres
supabase.from('visites')
  .select('*, offres(adresse, client_nom, client_prenom)')
  .is('statut_coursier', null)
  .eq('statut', 'planifiee')
```

## Solution

Modifier la requete pour :
1. Retirer `client_nom` et `client_prenom` de la jointure `offres`
2. Ajouter une jointure vers `clients` puis `profiles` pour obtenir le nom du client

La requete corrigee sera :
```typescript
supabase.from('visites')
  .select('*, offres(adresse), clients!client_id(user_id, profiles:user_id(prenom, nom))')
  .is('statut_coursier', null)
  .eq('statut', 'planifiee')
```

Puis adapter l'affichage du nom dans le template (ligne 200) :
```typescript
// AVANT (ne marchait pas)
v.offres?.client_prenom + ' ' + v.offres?.client_nom

// APRES
v.clients?.profiles?.prenom + ' ' + v.clients?.profiles?.nom
```

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/admin/Coursiers.tsx` | Corriger la requete (ligne 32) et l'affichage du nom client (ligne 200) |

## Resultat attendu

Apres correction, la section **"Visites a deleguer"** apparaitra entre les statistiques et le bouton "Ajouter un coursier", listant toutes les visites planifiees avec l'adresse, la date et le nom du client.

