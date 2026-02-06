
# Correction : Colonne `adresse` manquante dans la requête du hook

## Problème identifié

L'erreur dans les logs est :
```
"message": "Client non trouvé: column profiles_1.adresse does not exist"
```

Le hook `useFinalInvoice.ts` (lignes 33-50) fait une jointure vers `profiles` et demande la colonne `adresse`, mais cette colonne **n'existe pas** dans `profiles`.

| Table | Colonne `adresse` |
|-------|-------------------|
| `profiles` | ❌ N'existe pas |
| `clients` | ✅ Existe |
| `demandes_mandat` | ✅ Existe |

## Solution

Modifier le hook pour ne plus demander `adresse` via la jointure `profiles`, mais plutôt la récupérer directement depuis la table `clients` qui contient déjà cette information.

## Modifications à effectuer

### Fichier : `src/hooks/useFinalInvoice.ts`

**Avant (ligne 33-50) :**
```typescript
const { data: clientData, error: clientError } = await supabase
  .from('clients')
  .select(`
    id,
    user_id,
    abaninja_client_uuid,
    abaninja_invoice_id,
    profiles:user_id (
      id,
      prenom,
      nom,
      email,
      telephone,
      adresse          // ❌ N'existe pas dans profiles
    )
  `)
```

**Après :**
```typescript
const { data: clientData, error: clientError } = await supabase
  .from('clients')
  .select(`
    id,
    user_id,
    adresse,                    // ✅ Récupérer directement depuis clients
    abaninja_client_uuid,
    abaninja_invoice_id,
    profiles:user_id (
      id,
      prenom,
      nom,
      email,
      telephone
    )
  `)
```

**Puis mettre à jour l'utilisation (ligne 74) :**
```typescript
// Avant
adresse: profile.adresse || ''

// Après
adresse: clientData.adresse || ''
```

## Résumé des changements

| Fichier | Ligne | Modification |
|---------|-------|--------------|
| `src/hooks/useFinalInvoice.ts` | 35 | Ajouter `adresse` au select des clients |
| `src/hooks/useFinalInvoice.ts` | 46 | Supprimer `adresse` du select des profiles |
| `src/hooks/useFinalInvoice.ts` | 74 | Changer `profile.adresse` → `clientData.adresse` |

## Résultat attendu

Après cette correction, le bouton "Générer facture finale" fonctionnera correctement car la requête ne demandera plus une colonne inexistante.
