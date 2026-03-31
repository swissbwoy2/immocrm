

## Invitation légère avec mention "Période d'essai" / "Compte activé"

### Concept
- Un client invité par email (sans mandat signé) a un **compte gratuit / période d'essai**
- Son profil affiche clairement **"⏳ Période d'essai"** tant qu'il n'a pas signé le mandat + uploadé ses documents
- Une fois le processus complet (signature + documents), le compte passe en **"✅ Compte activé"** et suit le flux normal (barre de progression, J+, etc.)

### Détection automatique de l'état
Le système détermine l'état en vérifiant sur la fiche client :
- `mandat_signature_data` existe → contrat signé
- `demande_mandat_id` existe → mandat rempli
- Documents uploadés dans la table `documents`
- Si tout est présent + statut `actif` → **Compte activé**
- Sinon → **Période d'essai**

### Modifications

#### 1. `supabase/functions/invite-client/index.ts`
- Ajouter paramètre `invitationLegere: boolean` au body
- Si `invitationLegere === true` : autoriser la création sans `demandeMandat`
- Créer profil minimal + rôle `client` + fiche client avec `type_recherche` fourni et `statut = 'en_attente'`
- Pas de `date_ajout` → la barre reste à 0%

#### 2. `src/pages/admin/Clients.tsx`
- Ajouter bouton **"➕ Inviter un client"** avec Dialog (Prénom, Nom, Email, Téléphone, Type recherche)
- Appel `invite-client` avec `invitationLegere: true`
- Dans la liste : afficher un badge **"Période d'essai"** (orange) pour les clients sans `mandat_signature_data` ni `demande_mandat_id`, et **"Compte activé"** (vert) pour ceux qui ont complété le processus

#### 3. `src/pages/admin/ClientDetail.tsx`
- En haut du profil : bannière visible indiquant l'état du compte :
  - **Période d'essai** (orange) : "Ce client est en période d'essai. Pour activer son compte, il doit remplir le mandat, signer et fournir ses documents."
  - **Compte activé** (vert) : "Compte officiellement activé — mandat signé, documents fournis."
- La logique : `isFullyActivated = client.mandat_signature_data && client.demande_mandat_id && client.statut === 'actif'`

#### 4. Espace client (côté client connecté)
- Le client en période d'essai voit un message l'invitant à compléter son dossier avec un lien vers `/mandat-v3` pour remplir le formulaire complet
- Une fois activé, accès normal à son tableau de bord

### Aucune migration nécessaire
Les champs `mandat_signature_data`, `demande_mandat_id` et `statut` existent déjà. On utilise leur combinaison pour déterminer l'état du compte.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/invite-client/index.ts` | Accepter `invitationLegere` pour bypass validation |
| `src/pages/admin/Clients.tsx` | Dialog "Inviter un client" + badge Période d'essai / Activé |
| `src/pages/admin/ClientDetail.tsx` | Bannière état du compte (essai vs activé) |
| Espace client (page dashboard client) | Message d'invitation à compléter le dossier |

