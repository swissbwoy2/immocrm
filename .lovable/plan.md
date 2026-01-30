
# Correction du problème d'activation pour Mondi + Amélioration du flux

## Diagnostic

Le client "Mondi Karabrahimi" (`donir91@icloud.com`) a :
- ✅ Une demande de mandat enregistrée
- ✅ Le statut `paye` et `date_paiement` défini
- ❌ `processed_at` et `processed_by` sont NULL (pas traité)
- ❌ Aucun profil, user_role ou client créé
- ❌ Aucun email d'invitation envoyé

**Cause racine** : Le paiement a été enregistré (soit manuellement, soit via le flux incomplet) sans que l'invitation ne soit déclenchée.

## Solution immédiate (Action admin)

1. Aller sur `/admin/demandes-activation`
2. Trouver "Mondi Karabrahimi" dans la liste
3. Cliquer sur le bouton **"Activer"** (pas "Marquer comme payé")
4. Cela va :
   - Créer le profil utilisateur
   - Créer le rôle client
   - Créer la fiche client avec toutes les données du mandat
   - Envoyer l'email d'invitation pour créer le mot de passe

## Amélioration du système (Modifications code)

Pour éviter ce problème à l'avenir, deux modifications sont proposées :

### 1. Fusionner "Marquer comme payé" avec l'activation

Modifier `handleMarkAsPaid` dans `DemandesActivation.tsx` pour qu'il déclenche automatiquement `handleActivateMandat` après avoir enregistré le paiement.

Fichier modifié : `src/pages/admin/DemandesActivation.tsx`

Avant :
```typescript
const handleMarkAsPaid = async (demande: DemandeMandat) => {
  // Seulement mise à jour du statut
  await supabase.from('demandes_mandat').update({ 
    statut: 'paye',
    date_paiement: new Date().toISOString()
  }).eq('id', demande.id);
};
```

Après :
```typescript
const handleMarkAsPaid = async (demande: DemandeMandat) => {
  // Mise à jour du statut
  await supabase.from('demandes_mandat').update({ 
    statut: 'paye',
    date_paiement: new Date().toISOString()
  }).eq('id', demande.id);
  
  // Déclencher automatiquement l'activation
  await handleActivateMandat(demande);
};
```

### 2. Ajouter l'envoi d'invitation dans le webhook AbaNinja

Modifier `abaninja-webhook/index.ts` pour qu'il appelle `invite-client` après avoir enregistré le paiement.

Fichier modifié : `supabase/functions/abaninja-webhook/index.ts`

Ajouter après la mise à jour du statut `paye` :
```typescript
// Après avoir mis à jour le statut, créer le compte client
const inviteResponse = await fetch(
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/invite-client`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      email: demande.email,
      prenom: demande.prenom,
      nom: demande.nom,
      telephone: demande.telephone,
      demandeMandat: {
        // ... toutes les données du mandat
      }
    })
  }
);
```

### 3. Simplifier l'interface admin

Supprimer le bouton "Marquer comme payé" séparé pour éviter toute confusion. Garder uniquement :
- **"Activer"** : Enregistre le paiement ET envoie l'invitation
- **"Renvoyer invitation"** : Pour les cas où l'email n'est pas arrivé

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/admin/DemandesActivation.tsx` | Fusionner `handleMarkAsPaid` avec `handleActivateMandat` |
| `supabase/functions/abaninja-webhook/index.ts` | Ajouter l'appel à `invite-client` après confirmation de paiement |
| (Optionnel) `src/pages/admin/FacturesAbaNinja.tsx` | Même logique si "Marquer payé" existe là aussi |

## Résultat attendu

- Plus aucun client ne peut rester "payé mais non activé"
- Le flux est simplifié : paiement = activation automatique
- Les admins n'ont plus à se soucier de l'ordre des boutons à cliquer
