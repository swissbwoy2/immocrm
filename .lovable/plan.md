
# Système de Facture Finale AbaNinja

## Résumé du Flux

Le processus de facturation se déroule en **deux étapes** :

1. **Facture d'acompte (300 CHF)** → À l'inscription du client ✅ (déjà implémenté)
2. **Facture finale (Loyer - 300 CHF)** → Quand l'agent valide l'attribution auprès de la régie 🆕

**Exemple concret :**
- Mongi s'inscrit → Facture acompte de 300 CHF
- Agent trouve un appartement à 1590 CHF/mois
- Régie accepte le dossier → Agent clique "Valider auprès de la régie"
- Système génère automatiquement la facture finale de **1290 CHF** (1590 - 300)

## Moment de Déclenchement

La facture finale sera générée automatiquement lorsque l'agent clique sur **"Valider auprès de la régie"** (passage du statut `bail_conclu` → `attente_bail`). C'est le moment où :
- Le client a confirmé son intérêt
- La régie a accepté le dossier
- L'agent valide l'attribution

---

## Modifications Techniques

### 1. Migration Base de Données

Ajouter des colonnes à la table `candidatures` pour stocker les références de la facture finale :

| Colonne | Type | Description |
|---------|------|-------------|
| `facture_finale_invoice_id` | text | UUID de la facture finale dans AbaNinja |
| `facture_finale_invoice_ref` | text | Référence (ex: SOLDE-ABC123) |
| `facture_finale_montant` | numeric | Montant de la facture finale |
| `facture_finale_created_at` | timestamptz | Date de création |

### 2. Nouvelle Edge Function : `create-final-invoice`

Créer une nouvelle Edge Function spécifique pour la facture finale :

**Paramètres d'entrée :**
- `client_uuid` : UUID AbaNinja du client
- `address_uuid` : UUID de l'adresse AbaNinja
- `candidature_id` : ID de la candidature
- `loyer_mensuel` : Prix du loyer (depuis offres.prix)
- `acompte_paye` : Montant déjà payé (300 CHF par défaut)
- `prenom`, `nom`, `email` : Infos du client
- `adresse_bien` : Adresse du bien loué

**Logique :**
```text
montant_final = loyer_mensuel - acompte_paye

Créer facture AbaNinja avec :
- Référence : SOLDE-{candidature_id_short}
- Description : "Solde mandat de recherche - Location réussie"
- Détails : Adresse du bien, loyer mensuel, déduction acompte
- Montant : montant_final
```

### 3. Modification du Workflow

Dans `src/pages/admin/Candidatures.tsx` et `src/components/premium/PremiumCandidatureDetails.tsx` :

**Quand l'agent clique "Valider auprès de la régie" :**

```text
1. Récupérer les infos du client (via clients.user_id → profiles)
2. Vérifier que le client a un abaninja_client_uuid (sinon créer)
3. Appeler create-final-invoice avec :
   - loyer = offres.prix
   - acompte = 300 CHF
4. Mettre à jour candidature avec les refs de la facture
5. Afficher toast de confirmation
```

### 4. Affichage de la Facture Finale

Dans les détails de candidature, afficher :
- Un badge vert si la facture finale existe : "✓ Facture finale: SOLDE-ABC123 (1290 CHF)"
- Les dates importantes avec la date de facturation

---

## Interface Utilisateur

### Dans la vue Candidatures (admin/agent)

```text
┌─────────────────────────────────────────────────────────────┐
│  📍 Rue de la Gare 15, 1000 Lausanne                        │
│  💰 1590 CHF/mois                                           │
│                                                              │
│  Statut: bail_conclu                                        │
│                                                              │
│  [🏢 Valider auprès de la régie]                            │
│           ↓                                                  │
│  ⚡ Génère automatiquement la facture de 1290 CHF           │
│                                                              │
│  Après validation:                                           │
│  ✓ Facture finale: SOLDE-ABC123 - 1290 CHF                  │
└─────────────────────────────────────────────────────────────┘
```

### Calcul du Montant

| Type de recherche | Acompte | Loyer | Facture finale |
|-------------------|---------|-------|----------------|
| Location | 300 CHF | 1590 CHF | 1290 CHF |
| Location | 300 CHF | 2000 CHF | 1700 CHF |
| Location | 300 CHF | 1200 CHF | 900 CHF |

---

## Fichiers à Modifier/Créer

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter colonnes facture_finale_* à candidatures |
| `supabase/functions/create-final-invoice/index.ts` | Nouvelle Edge Function |
| `supabase/config.toml` | Ajouter la config de la nouvelle fonction |
| `src/hooks/useFinalInvoice.ts` | Nouveau hook pour créer la facture finale |
| `src/pages/admin/Candidatures.tsx` | Intégrer la création de facture lors de la validation |
| `src/components/premium/PremiumCandidatureDetails.tsx` | Afficher le badge de facture finale |

---

## Sécurité

- Seuls les administrateurs et agents connectés peuvent déclencher la facture
- L'Edge Function vérifie les données avant d'appeler AbaNinja
- La facture ne peut être créée qu'une seule fois par candidature (vérification de `facture_finale_invoice_id`)

---

## Gestion des Erreurs

| Cas | Comportement |
|-----|--------------|
| Client sans UUID AbaNinja | Créer le client AbaNinja d'abord |
| Facture déjà existante | Afficher un toast d'info, ne pas recréer |
| Erreur AbaNinja | Afficher erreur, permettre de réessayer |
| Loyer non défini | Afficher erreur "Prix du bien manquant" |

---

## Résultat Attendu

1. Le client s'inscrit → reçoit facture acompte 300 CHF ✅
2. L'agent trouve un bien → soumet la candidature
3. La régie accepte → le client confirme
4. **L'agent clique "Valider auprès de la régie"** → 
   - Statut passe à `attente_bail`
   - Facture finale générée automatiquement (Loyer - 300 CHF)
   - Client reçoit la facture par email
5. Le processus continue jusqu'à la remise des clés

