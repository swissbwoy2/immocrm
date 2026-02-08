

# Corriger l'affichage du widget Elfsight Google Reviews

## Probleme identifie

Le widget Elfsight ne s'affiche pas car :
1. Le script est charge dynamiquement via un `useEffect` React, ce qui peut causer des problemes de timing (le script Elfsight cherche les elements avec la classe `elfsight-app-*` mais ils peuvent ne pas etre detectes)
2. L'environnement de previsualisation Lovable (iframe) peut bloquer certains scripts tiers -- le widget devrait fonctionner correctement sur le site publie

## Solution

### 1. Deplacer le script Elfsight dans index.html

**Fichier** : `index.html`

Ajouter le script Elfsight directement dans le `<head>`, a cote du Meta Pixel existant. Cela garantit que le script est charge des le debut, avant meme que React ne monte les composants.

```html
<script src="https://elfsightcdn.com/platform.js" async></script>
```

### 2. Simplifier le composant SocialProofBar

**Fichier** : `src/components/landing/SocialProofBar.tsx`

- Supprimer le `useEffect` qui charge le script dynamiquement (puisqu'il sera dans index.html)
- Supprimer l'import de `useEffect`
- Garder uniquement les badges et le conteneur du widget

### 3. Verification post-deploiement

Le widget pourrait ne pas s'afficher dans la previsualisation Lovable (restriction iframe) mais devrait fonctionner correctement sur le site publie (immocrm.lovable.app). Il faudra publier et tester sur le site en production.

## Resume des modifications

| Fichier | Changement |
|---------|-----------|
| `index.html` | Ajouter le script Elfsight dans le `<head>` |
| `SocialProofBar.tsx` | Supprimer le `useEffect` de chargement dynamique du script |

## Note importante

Si le widget ne s'affiche toujours pas apres publication, cela pourrait indiquer un probleme cote Elfsight (widget non active, plan expire, ou domaine non autorise dans les parametres Elfsight). Il faudra verifier dans le tableau de bord Elfsight que le widget est bien actif et que le domaine du site est autorise.

