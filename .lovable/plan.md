

# Suppression du popup d'engagement mobile

## Ce qui sera fait
1. **Supprimer** le fichier `src/components/landing/EngagementPopup.tsx`
2. **Retirer** l'import et l'utilisation de `<EngagementPopup />` dans `src/pages/Landing.tsx`

C'est tout. Deux modifications, aucun impact sur le reste du site.

## Remarque sur le zoom
D'apres ta capture, tu es a environ **80-85% de zoom**. A 100% sur un iPhone standard (390px de large), les elements seront legerement plus grands. Les ajustements Tailwind faits precedemment restent valides pour le 100%.

## Section technique

| Fichier | Action |
|---------|--------|
| `src/components/landing/EngagementPopup.tsx` | Suppression du fichier |
| `src/pages/Landing.tsx` | Retrait de l'import et du composant `<EngagementPopup />` |

