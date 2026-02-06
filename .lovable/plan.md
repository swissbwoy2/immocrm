
# Correction : Transactions manquantes pour les candidatures validees

## Probleme identifie

Le systeme ne cree des transactions que lorsque les cles sont remises (`cles_remises = true`). Mais 5 dossiers sont valides par la regie et le client (stade `attente_bail` ou `bail_conclu`) sans aucune transaction associee.

## Dossiers manquants confirmes dans la base

| Client | Adresse | Loyer | Stade | Commission (loyer) | Agent (45%) | Agence (55%) |
|--------|---------|-------|-------|-------------------|-------------|--------------|
| Mongi Tayahi | Vallombreuse 81, Prilly | 1590 CHF | attente_bail | 1590 CHF | 716 CHF | 874 CHF |
| Aziz Ed_Dahimi | Morges 11, Lausanne | 1310 CHF | attente_bail | 1310 CHF | 590 CHF | 720 CHF |
| Miguel Angel Lloret Robles | Morges 11, Lausanne | 1310 CHF | bail_conclu | 1310 CHF | 590 CHF | 720 CHF |
| Salah Benrabah | Simplon 45, Paudex | 1450 CHF | attente_bail | 1450 CHF | 653 CHF | 797 CHF |
| Mohamed Hilal | Chomaz 2 | 1800 CHF | attente_bail | 1800 CHF | 810 CHF | 990 CHF |

**Commission = loyer uniquement, pas de TVA.**

## Ce qui va etre fait

### 1. Migration SQL

**Mise a jour du trigger** pour qu'il se declenche en deux temps :

```text
QUAND candidature est mise a jour :
  SI nouveau statut = 'attente_bail' ET ancien statut != 'attente_bail' :
    --> Verifier qu'aucune transaction n'existe deja
    --> Creer transaction avec statut = 'en_cours'
    --> Commission = loyer (sans TVA), split 45/55
  
  SI cles_remises passe de false a true :
    --> Mettre a jour la transaction existante : statut = 'conclue'
    --> Si aucune transaction n'existe, en creer une avec statut = 'conclue'
```

**Insertion des 5 transactions manquantes** directement dans la migration pour rattraper les dossiers existants. Chaque transaction sera creee avec le statut `en_cours` (sauf Miguel qui est `bail_conclu`, donc aussi `en_cours` en attente des cles).

### 2. Adaptation de la page Transactions

Actuellement seules les transactions `conclue` sont bien visibles. Modification pour :
- Afficher aussi les transactions `en_cours` avec un badge distinct (couleur differente)
- Les inclure dans les compteurs pertinents

### Impact attendu

| Element | Avant | Apres |
|---------|-------|-------|
| Transactions visibles | 6 | 11 |
| Mongi, Miguel, Aziz, Salah, Mohamed | Absents | Visibles "En cours" |
| Passage a "Conclue" | Manuel | Automatique a la remise des cles |
| Calcul commission | Loyer (sans TVA) | Inchange |

### Fichiers concernes

| Fichier | Modification |
|---------|-------------|
| Nouvelle migration SQL | Trigger mis a jour + 5 transactions inserees |
| `src/pages/admin/Transactions.tsx` | Affichage des transactions "en_cours" |
