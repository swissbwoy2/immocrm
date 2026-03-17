

## Diagnostic

Le rechargement au changement d'onglet est cause par **deux mecanismes agressifs** qui se declenchent quand le navigateur reactive l'onglet :

### 1. Service Worker (`main.tsx` ligne 9-11)
```js
onNeedRefresh() {
  updateSW(true); // Force reload IMMEDIAT sans demander
}
```
Quand l'utilisateur revient sur l'onglet, le navigateur re-evalue le Service Worker. Si le hash des assets a change (meme legerement), `onNeedRefresh` se declenche et force un rechargement instantane.

### 2. `useAppVersionCheck.ts`
- `hasRefreshed` est un `useRef(false)` — il se reinitialise a chaque remontage du composant
- Le check de version tourne toutes les 2 minutes ET au montage initial
- Si le composant se remonte (apres un rechargement SW), il re-verifie et peut re-declencher un reload

### 3. SW update check toutes les 2 min (`main.tsx` ligne 32-35)
Le `registration.update()` periodique peut detecter un "nouveau" SW pendant que l'onglet est en arriere-plan, puis declencher le reload au retour.

---

## Corrections

### `src/main.tsx`
- **Ne plus forcer le reload dans `onNeedRefresh`** — a la place, seulement logger. Le mecanisme `useAppVersionCheck` (base sur la version en BDD) est suffisant et plus fiable pour gerer les vraies mises a jour.
- **Arreter les checks SW quand l'onglet est cache** — ne lancer `registration.update()` que si `!document.hidden`

### `src/hooks/useAppVersionCheck.ts`
- **Ne pas checker quand l'onglet est cache** — ajouter `if (document.hidden) return;` au debut de `checkVersion`
- **Ne pas recharger au retour d'onglet** — seulement mettre a jour la version locale sans reload si la page vient juste de redevenir visible

| Fichier | Changement | Effet |
|---|---|---|
| `main.tsx` | Supprimer `updateSW(true)` dans `onNeedRefresh`, ajouter check `document.hidden` | Plus de reload intempestif au changement d'onglet |
| `useAppVersionCheck.ts` | Skip check si `document.hidden`, ne pas reload au retour d'onglet sauf broadcast explicite | Seules les vraies MAJ (via admin broadcast) declenchent un reload |

