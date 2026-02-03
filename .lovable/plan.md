
# Ajout d'un bouton "Créer facture AbaNinja" pour les clients importés

## Contexte

Actuellement, les factures AbaNinja sont générées automatiquement uniquement quand un client s'inscrit via le formulaire public (`NouveauMandat.tsx`). Les clients importés via CSV n'ont pas ce flux et n'ont donc pas de facture associée.

## Solution proposée

Ajouter un bouton **"Créer facture AbaNinja"** dans la page de détail du client (`ClientDetail.tsx`) qui permet à l'admin de générer manuellement une facture pour les clients importés.

## Modifications techniques

### 1. Migration base de données
Ajouter des colonnes à la table `clients` pour stocker les références AbaNinja :
- `abaninja_client_uuid` (text) - UUID du client dans AbaNinja
- `abaninja_invoice_id` (text) - UUID de la facture
- `abaninja_invoice_ref` (text) - Référence de la facture (ex: MANDAT-XXXX)

### 2. Modification de `ClientDetail.tsx`

Ajouter dans la section des actions du header :
- Un bouton "Créer facture AbaNinja" visible uniquement si le client n'a pas déjà de facture
- Une indication "Facture envoyée" avec la référence si elle existe déjà

Logique du bouton :
```text
1. Appeler create-abaninja-client avec les infos du profil (prenom, nom, email, telephone, adresse)
2. Appeler create-abaninja-invoice avec le client_uuid reçu
3. Mettre à jour la table clients avec les références AbaNinja
4. Afficher un toast de succès
```

### 3. Interface utilisateur

Le bouton sera placé à côté des autres actions (modifier, supprimer, envoyer email) :

```text
┌─────────────────────────────────────────────────────────┐
│  [Retour]   Prénom Nom                                  │
│                                                          │
│  [Modifier] [Supprimer] [Email] [📄 Créer facture]      │
│                           OU                             │
│  [Modifier] [Supprimer] [Email] ✓ Facture: MANDAT-XXXX  │
└─────────────────────────────────────────────────────────┘
```

Le montant sera déterminé automatiquement selon `type_recherche` :
- "Acheter" → 2500 CHF
- Autre (Louer) → 300 CHF

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `src/pages/admin/ClientDetail.tsx` | Ajouter le bouton et la logique d'appel |
| Migration SQL | Ajouter colonnes abaninja_* à la table clients |

## Sécurité

- Seuls les administrateurs connectés peuvent accéder à cette page
- Les Edge Functions AbaNinja sont déjà sécurisées
- L'action est tracée dans les logs

## Résultat attendu

L'administrateur pourra :
1. Ouvrir la fiche d'un client importé
2. Cliquer sur "Créer facture"
3. La facture est créée dans AbaNinja et envoyée par email au client
4. La référence de facture est affichée sur la fiche client
