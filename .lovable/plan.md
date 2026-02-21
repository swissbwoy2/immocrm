
# Corriger "Fait à Lausanne" en "Fait à Crissier"

Le contrat indique "Fait à Lausanne" alors que le siège d'Immo-rama.ch est au Chemin de l'Esparcette 5, **1023 Crissier**.

## Fichiers à modifier

| Fichier | Ligne | Correction |
|---|---|---|
| `supabase/functions/generate-full-mandat-pdf/index.ts` | 742 | `Fait a Lausanne` → `Fait à Crissier` |
| `supabase/functions/send-mandat-pdf/index.ts` | 661 | `Fait a Lausanne` → `Fait à Crissier` |

Deux modifications simples, aucun changement de base de données nécessaire.
