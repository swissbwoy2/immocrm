## Objectif
Sécuriser `useHomeHead` contre les effets de bord lors des navigations React Router. Un seul fichier modifié : `src/hooks/useHomeHead.ts`.

## Bugs corrigés

### 1. Race condition title / description sur changement de route
Sur `/ → /mentions-legales`, l'ordre React est :
1. `MentionsLegales` monte → `useEffect` pose `document.title = "Mentions légales…"`
2. `Landing` démonte → cleanup actuel restaure brutalement l'ancien `document.title` → **écrase le titre légitime de la page légale**.

**Fix** : restauration conditionnelle (sentinel). On ne restaure que si la valeur courante est encore celle qu'on a posée (`HOME_TITLE` / `HOME_DESCRIPTION`). Sinon, une autre route est déjà passée par là, on ne touche à rien.

### 2. Meta description absente au mount
Si `<meta name="description">` n'existe pas dans `index.html`, le hook actuel ne fait rien. Comportement attendu : créer la balise marquée `data-home-head="true"` et la supprimer au unmount (déjà géré par `removeMarked`).

**Fix** : si `descMeta` n'existe pas, on en crée une marquée `data-home-head="true"` → supprimée automatiquement par `removeMarked()` au unmount, jamais restaurée vide.

## Comportement final garanti

- `/` : title + description + canonical + JSON-LD FAQPage spécifiques home, posés au mount, retirés au unmount sans bavure
- Pages légales et autres routes : leur propre `document.title` (posé via leur `useEffect`) reste intact même après cleanup de Landing
- `removeMarked()` cible strictement `[data-home-head="true"]` → ne touche jamais aux balises sitewide d'`index.html` (Organization, RealEstateAgent, OG, etc.)
- Navigation aller-retour sur `/` : aucun doublon `home-canonical` ni `home-faq-jsonld` grâce au `removeMarked()` exécuté au début de chaque `useEffect`
- Aucun nettoyage de balise sitewide possible (les scripts JSON-LD d'`index.html` ne portent pas `data-home-head`)

## Fichiers
- **Modifié** : `src/hooks/useHomeHead.ts`
- **Non touché** : tout le reste (backend, routes, composants, autres pages).
