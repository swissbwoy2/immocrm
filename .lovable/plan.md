
# Ajouter le widget WhatsApp flottant a gauche

## Objectif

Placer le widget Elfsight WhatsApp Chat en position flottante en bas a gauche de l'ecran, en miroir du bouton "Activer ma recherche" qui est en bas a droite. Les deux elements resteront visibles en permanence lors du defilement.

## Modification

**Fichier** : `src/pages/Landing.tsx`

Ajouter un `div` flottant positionne en `fixed bottom-4 left-4` (symetrique au bouton CTA qui est en `fixed bottom-4 right-4`) contenant le widget Elfsight WhatsApp.

Le script Elfsight (`https://elfsightcdn.com/platform.js`) est deja charge dans `index.html` pour le widget Google Reviews, donc pas besoin de le re-ajouter.

## Positionnement visuel

```text
+----------------------------------+
|                                  |
|         (page content)           |
|                                  |
|  [WhatsApp]          [Activer]   |
|  bas-gauche          bas-droite  |
+----------------------------------+
```

## Detail technique

| Fichier | Changement |
|---------|-----------|
| `src/pages/Landing.tsx` | Ajouter un `div` flottant (`fixed bottom-4 left-4 z-50`) contenant le widget `elfsight-app-015a7ee8-3cf5-416f-a607-eb9d4a46e860` avec `data-elfsight-app-lazy`, juste avant ou apres le bouton CTA flottant existant |

Le widget utilisera le meme `z-50` et le meme calcul `safe-area-inset-bottom` que le bouton CTA pour un alignement coherent sur mobile.
