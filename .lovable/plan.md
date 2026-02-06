

# Correction : Ajouter le bouton "Générer facture manquante" à la page Admin Candidatures

## Problème identifié

La page **Admin Candidatures** (`/admin/candidatures`) a son propre système de rendu des actions qui **ne contient pas** le bouton de récupération de facture. Contrairement à d'autres vues qui utilisent `PremiumCandidatureDetails.tsx`, cette page utilise `renderExpandedActions()` (lignes 405-521).

| Composant | Bouton "Générer facture" |
|-----------|--------------------------|
| `PremiumCandidatureDetails.tsx` | ✅ Présent (lignes 423-448) |
| `AdminCandidatures.tsx` → `renderExpandedActions()` | ❌ **Absent** |
| `AgentCandidatures.tsx` | ❌ À vérifier |

## Solution

Ajouter le bouton de récupération dans la fonction `renderExpandedActions()` de la page Admin Candidatures.

---

## Modifications à effectuer

### Fichier : `src/pages/admin/Candidatures.tsx`

**1. Ajouter les imports nécessaires**
```typescript
import { Receipt, Loader2 } from 'lucide-react';
import { useFinalInvoice } from '@/hooks/useFinalInvoice';
```

**2. Utiliser le hook dans le composant**
```typescript
const { loading: invoiceLoading, createFinalInvoice } = useFinalInvoice();
```

**3. Ajouter la fonction de création de facture manquante**
```typescript
const handleCreateMissingInvoice = async (candidature: Candidature) => {
  if (!candidature.offres?.prix) return;
  
  const result = await createFinalInvoice({
    candidatureId: candidature.id,
    clientId: candidature.client_id,
    loyerMensuel: candidature.offres.prix,
    acomptePaye: 300,
    adresseBien: candidature.offres.adresse
  });

  if (result.success) {
    loadData(); // Recharger les données
    toast({ title: 'Facture créée', description: `Facture ${result.invoiceRef} générée` });
  }
};
```

**4. Ajouter le bouton dans `renderExpandedActions()` pour le statut `attente_bail`**

Avant le bouton "Bail reçu - Proposer dates", ajouter :
```typescript
{candidature.statut === 'attente_bail' && (
  <>
    {/* Bouton facture manquante */}
    {!candidature.facture_finale_invoice_id && candidature.offres?.prix && (
      <div className="w-full mb-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
          ⚠️ Facture finale manquante
        </p>
        <Button 
          size="sm" 
          variant="outline"
          className="border-amber-500 text-amber-600"
          onClick={() => handleCreateMissingInvoice(candidature)}
          disabled={invoiceLoading}
        >
          {invoiceLoading ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Création...</>
          ) : (
            <><Receipt className="h-4 w-4 mr-1" />Générer facture finale</>
          )}
        </Button>
      </div>
    )}
    
    {/* Bouton existant */}
    <Button size="sm" onClick={() => { setSelectedCandidature(candidature); setShowDatesDialog(true); }}>
      <FileCheck className="h-4 w-4 mr-1" />Bail reçu - Proposer dates
    </Button>
  </>
)}
```

**5. Ajouter le champ `facture_finale_invoice_id` à l'interface Candidature**
```typescript
interface Candidature {
  // ... champs existants ...
  facture_finale_invoice_id?: string | null;
  facture_finale_invoice_ref?: string | null;
  facture_finale_montant?: number | null;
}
```

---

## Résultat attendu

Après cette modification :

1. **Pour Aziz (Av. de Morges 11)** : Le bouton orange "⚠️ Facture finale manquante" + "Générer facture finale" apparaîtra dans les actions
2. **Pour les futures candidatures** : Si l'admin valide depuis cette page sans que la facture soit créée, le bouton de récupération sera visible

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `src/pages/admin/Candidatures.tsx` | Ajouter le bouton de récupération + hook |
| `src/pages/agent/Candidatures.tsx` | Vérifier et ajouter si nécessaire |

