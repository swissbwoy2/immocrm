

# Annulation de la delegation coursier par l'agent

## Contexte

Actuellement, lorsqu'un agent delegue une visite a un coursier (statut_coursier = "en_attente" ou "accepte"), il n'a aucun moyen d'annuler cette delegation. Le bouton "Deleguer a un coursier" disparait une fois la delegation effectuee, sans etre remplace par une option d'annulation.

## Solution

Ajouter un bouton "Annuler delegation coursier" visible par l'agent lorsque `statut_coursier` est `en_attente` ou `accepte` (pas `termine`).

### Modification dans `src/pages/agent/Visites.tsx`

**Deux emplacements** affichent le bouton de delegation (lignes ~790 et ~914). Dans chacun, ajouter un bloc conditionnel complementaire :

- **Condition actuelle** : `!visite.statut_coursier` -> affiche le bouton "Deleguer"
- **Nouveau bloc** : `visite.statut_coursier === 'en_attente' || visite.statut_coursier === 'accepte'` -> affiche un bouton "Annuler delegation"

Le bouton d'annulation :
- Remet `statut_coursier` a `null`, `coursier_id` a `null`, et `remuneration_coursier` a `null`
- Affiche un badge indiquant le statut actuel (ex: "Coursier en attente" ou "Coursier accepte")
- Utilise un style rouge/destructif pour signaler l'annulation
- Demande une confirmation avant d'annuler si un coursier a deja accepte la mission

### Details techniques

Action du bouton d'annulation :

```typescript
await supabase.from('visites').update({ 
  statut_coursier: null, 
  coursier_id: null, 
  remuneration_coursier: null 
}).eq('id', visite.id);
```

Pour le cas ou `statut_coursier === 'accepte'` (un coursier a deja pris la mission), afficher une boite de dialogue de confirmation avant d'executer l'annulation, car cela retire la mission a un coursier qui l'a acceptee.

### Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/agent/Visites.tsx` | Ajout du bouton d'annulation de delegation dans les 2 emplacements de cartes de visite + dialogue de confirmation |

