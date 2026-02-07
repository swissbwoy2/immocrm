
# Correction : Visite en triple et bouton coursier manquant

## Problemes identifies

### 1. La visite apparait 3 fois

La base de donnees contient **2 enregistrements distincts** pour la meme visite (meme offre, meme client, meme date) :
- Enregistrement A : `est_deleguee: true`, `statut: confirmee`
- Enregistrement B : `est_deleguee: false`, `statut: planifiee`

L'enregistrement A apparait dans **2 sections** differentes :
- Section "Visites urgentes" (car elle est a venir et imminente)
- Section "Visites deleguees confirmees" (car `est_deleguee + confirmee`)

L'enregistrement B apparait dans :
- Section "Visites urgentes" (car il est aussi a venir et imminent)

**Total = 3 cartes** pour ce qui devrait etre 1 seule visite.

### 2. Le bouton "Deleguer a un coursier" n'apparait pas

Ce bouton n'existe que dans le composant `renderPendingRequestCard`, utilise uniquement pour les demandes en attente (`est_deleguee && planifiee`). Les visites confirmees utilisent `renderPremiumVisiteCard` qui ne contient pas ce bouton.

## Ce qui va etre fait

### Etape 1 : Nettoyage de la base (donnees dupliquees)

Supprimer l'enregistrement B (le doublon `planifiee` non delegue) car la visite a deja ete confirmee via l'enregistrement A.

### Etape 2 : Dedupliquer l'affichage dans le code

Modifier la logique de filtrage pour que les visites affichees dans la section "Urgentes" soient **exclues** des sections "Visites deleguees confirmees" et "Visites planifiees". Cela evite qu'une meme visite apparaisse dans deux sections en meme temps.

Actuellement :
- Urgentes = visites a venir + imminentes (peut contenir des deleguees)
- Deleguees confirmees = toutes les deleguees confirmees a venir
- Planifiees = toutes les non-deleguees a venir

Apres correction :
- Urgentes = visites a venir + imminentes (inchange)
- Deleguees confirmees = deleguees confirmees a venir **sauf celles deja affichees dans urgentes**
- Planifiees = non-deleguees a venir **sauf celles deja affichees dans urgentes**

### Etape 3 : Ajouter le bouton "Deleguer a un coursier" aux visites confirmees

Modifier `renderPremiumVisiteCard` pour afficher le bouton de delegation coursier sur les visites a venir qui :
- N'ont pas encore ete deleguees a un coursier (`statut_coursier` est null)
- Sont a une date future

Cela permet a l'agent de deleguer **n'importe quelle visite** a un coursier, qu'elle soit deleguee par le client ou planifiee directement.

## Fichiers concernes

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Suppression du doublon dans la table `visites` |
| `src/pages/agent/Visites.tsx` | Deduplication des sections urgentes/normales + ajout du bouton coursier dans `renderPremiumVisiteCard` |

## Resultat attendu

| Element | Avant | Apres |
|---------|-------|-------|
| Cartes affichees pour cette visite | 3 | 1 |
| Bouton "Deleguer a un coursier" | Absent (sauf demandes en attente) | Visible sur toutes les visites a venir |
| Doublons en base | 2 enregistrements | 1 seul enregistrement |
