

## Diagnostic

L'erreur "Erreur lors de la sauvegarde" vient d'une **incompatibilite entre les valeurs du formulaire et la contrainte CHECK de la base**.

La table `ai_agent_assignments` a une contrainte:
```
priority IN ('basse', 'moyenne', 'haute', 'urgente')
```

Mais le formulaire `AssignmentDialog.tsx` envoie des valeurs en anglais: `low`, `normal`, `high`, `urgent`.

## Correction

**Fichier: `src/components/admin/ai-relocation/AssignmentDialog.tsx`**

Aligner les valeurs du Select "Priorite" avec la contrainte DB:

| Actuel (anglais) | Corrige (francais) | Label |
|---|---|---|
| `low` | `basse` | Basse |
| `normal` | `moyenne` | Normale |
| `high` | `haute` | Haute |
| `urgent` | `urgente` | Urgente |

- Changer le state initial de `priority` de `'normal'` a `'moyenne'`
- Mettre a jour les 4 `SelectItem` values
- Pour `urgencyLevel`, pas de contrainte CHECK en base donc les valeurs actuelles passent, mais par coherence, les aligner aussi en francais (`basse`, `normale`, `haute`, `critique`)
- Mettre a jour le `useEffect` pour le mode edition (les valeurs lues de la DB sont deja en francais)

Aucune migration DB necessaire.

