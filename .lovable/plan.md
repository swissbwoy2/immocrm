

# Correction : Génération facture finale depuis tous les points d'entrée

## Problème diagnostiqué

La candidature d'Aziz (Av. de Morges 11) est passée au statut `attente_bail` **sans que la facture finale ait été créée**.

| Candidature | Statut | Facture finale |
|-------------|--------|----------------|
| Aziz - Av. de Morges 11 | `attente_bail` | ❌ Vide (`nil`) |

**Cause :** Il existe **4 chemins de code** pour changer le statut vers `attente_bail`, mais seul 1 d'entre eux génère la facture finale.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHEMINS POUR PASSER À "attente_bail"                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. PremiumCandidatureDetails.tsx  →  handleValidateRegie()    ✅ FACTURE   │
│  2. Messagerie.tsx                 →  case 'valider_regie'     ❌ PAS DE    │
│  3. Calendrier.tsx                 →  handleUpdateCandidatureStatus()  ❌   │
│  4. Candidatures.tsx (admin/agent) →  handleStatutChange()     ❌           │
└─────────────────────────────────────────────────────────────────────────────┘
```

L'agent a probablement validé via la **Messagerie** ou le **Calendrier**, contournant ainsi la logique de facturation.

---

## Solution proposée

Centraliser la logique de génération de facture dans un hook réutilisable et l'intégrer à **tous les points d'entrée**.

### 1. Créer une fonction utilitaire centralisée

Créer un nouveau hook `useHandleCandidatureProgression` qui :
- Détecte les transitions nécessitant une facture (`bail_conclu` → `attente_bail`)
- Appelle automatiquement `createFinalInvoice` avant le changement de statut
- Met à jour le statut avec les références de facture

### 2. Modifier les points d'entrée

| Fichier | Action |
|---------|--------|
| `src/pages/agent/Messagerie.tsx` | Intégrer le hook pour `valider_regie` |
| `src/pages/agent/Calendrier.tsx` | Intégrer le hook pour transitions vers `attente_bail` |
| `src/pages/admin/Candidatures.tsx` | Intégrer le hook pour transitions vers `attente_bail` |
| `src/pages/agent/Candidatures.tsx` | Intégrer le hook pour transitions vers `attente_bail` |

### 3. Ajouter un mécanisme de rattrapage

Créer un bouton "Générer facture finale" visible dans les détails de candidature lorsque :
- Statut est `attente_bail` ou plus avancé
- ET `facture_finale_invoice_id` est vide

Cela permettra de corriger les cas existants comme Aziz.

---

## Détails techniques

### Nouveau hook : `useHandleCandidatureProgression.ts`

```typescript
// Logique centralisée pour progression candidature
export function useHandleCandidatureProgression() {
  const { createFinalInvoice, loading } = useFinalInvoice();

  const progressCandidature = async (
    candidatureId: string,
    currentStatut: string,
    newStatut: string,
    candidatureData: { client_id, offre_prix, offre_adresse }
  ) => {
    let additionalData = {};

    // Si transition vers attente_bail depuis bail_conclu → créer facture
    if (currentStatut === 'bail_conclu' && newStatut === 'attente_bail') {
      const result = await createFinalInvoice({
        candidatureId,
        clientId: candidatureData.client_id,
        loyerMensuel: candidatureData.offre_prix,
        acomptePaye: 300,
        adresseBien: candidatureData.offre_adresse
      });

      if (result.success) {
        additionalData = {
          facture_finale_invoice_id: result.invoiceId,
          facture_finale_invoice_ref: result.invoiceRef,
          facture_finale_montant: result.montant,
          facture_finale_created_at: new Date().toISOString()
        };
      }
    }

    // Mettre à jour le statut
    await supabase
      .from('candidatures')
      .update({ 
        statut: newStatut, 
        ...additionalData,
        agent_valide_regie: newStatut === 'attente_bail',
        agent_valide_regie_at: newStatut === 'attente_bail' ? new Date().toISOString() : undefined
      })
      .eq('id', candidatureId);

    return { success: true, invoiceData: additionalData };
  };

  return { progressCandidature, loading };
}
```

### Modification Messagerie.tsx (exemple)

```typescript
// AVANT - Mise à jour directe sans facture
case 'valider_regie':
  await supabase
    .from('candidatures')
    .update({ statut: 'attente_bail' })
    .eq('id', candidature.id);
  break;

// APRÈS - Utiliser le hook centralisé
case 'valider_regie':
  await progressCandidature(
    candidature.id,
    candidature.statut,
    'attente_bail',
    { client_id: candidature.client_id, offre_prix: offre.prix, offre_adresse: offre.adresse }
  );
  break;
```

### Bouton de rattrapage dans PremiumCandidatureDetails.tsx

Ajouter un bouton visible quand la facture est manquante :

```typescript
{/* Bouton rattrapage si facture manquante */}
{!hasFactureFinale && ['attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(candidature.statut) && (
  <Button onClick={handleCreateMissingInvoice} variant="outline" className="border-amber-500">
    <Receipt className="h-4 w-4 mr-2" />
    Générer facture finale manquante
  </Button>
)}
```

---

## Fichiers à modifier

| Fichier | Type | Description |
|---------|------|-------------|
| `src/hooks/useHandleCandidatureProgression.ts` | Nouveau | Hook centralisé pour progressions |
| `src/pages/agent/Messagerie.tsx` | Modifier | Intégrer hook pour `valider_regie` |
| `src/pages/agent/Calendrier.tsx` | Modifier | Intégrer hook pour transitions |
| `src/pages/admin/Candidatures.tsx` | Modifier | Intégrer hook pour transitions |
| `src/pages/agent/Candidatures.tsx` | Modifier | Intégrer hook pour transitions |
| `src/components/premium/PremiumCandidatureDetails.tsx` | Modifier | Ajouter bouton rattrapage |

---

## Résultat attendu

### Pour les nouvelles candidatures :
- Quelle que soit la source (Messagerie, Calendrier, page Candidatures), la transition vers `attente_bail` créera automatiquement la facture finale

### Pour les candidatures existantes (comme Aziz) :
- L'agent pourra générer manuellement la facture manquante via un bouton dédié

### Données Aziz corrigées :
| Champ | Avant | Après |
|-------|-------|-------|
| `facture_finale_invoice_id` | `null` | UUID de la facture |
| `facture_finale_invoice_ref` | `null` | `SOLDE-6CE7EA8F` |
| `facture_finale_montant` | `null` | `1010.00 CHF` (1310 - 300) |

