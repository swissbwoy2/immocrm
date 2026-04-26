## 🎯 Objectif

Refondre l'écran de chargement (`src/components/PageLoader.tsx`) pour qu'il ressemble exactement à celui de **Macoloc** :

- **Fond noir** plein écran (pas le `bg-background` clair actuel)
- **Grand logo Immo-rama.ch** affiché tel quel (pas découpé dans un cercle blanc)
- **Aucun texte** visible ("Logisorama", "by Immo-rama.ch" → supprimés)
- **Aucun dots de progression** (les 3 points qui rebondissent → supprimés)
- **Aucun anneau qui pulse** (le `animate-ping` blanc → supprimé)
- Un **halo lumineux subtil** (radial-gradient) derrière le logo pour le rendu premium Macoloc
- Une **animation discrète** : très léger fade in + pulsation douce d'opacité du logo (pas de scale qui saute)

## 📂 Fichier modifié

### `src/components/PageLoader.tsx`

**Avant** (actuel — non voulu) :
- Fond clair `bg-background`
- Logo dans un cercle `rounded-full bg-card` de 80px
- Anneau `animate-ping` autour
- Texte "Logisorama" + "by Immo-rama.ch"
- 3 dots qui rebondissent

**Après** (souhaité — façon Macoloc) :
```tsx
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function PageLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* Halo radial subtil derrière le logo (effet Macoloc) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(180,140,70,0.18) 0%, rgba(0,0,0,0) 55%)',
        }}
      />
      {/* Logo grand format, sans cercle, sans découpe */}
      <img
        src={logoImmoRama}
        alt="Immo-rama.ch"
        fetchPriority="high"
        className="relative z-10 w-[60vw] max-w-[420px] h-auto object-contain animate-pulse"
        style={{ animationDuration: '2.4s' }}
      />
    </div>
  );
}
```

## ✨ Détails visuels

| Élément | Valeur |
|---|---|
| Fond | `bg-black` (noir pur, comme Macoloc) |
| Taille logo | `60vw` (responsive) avec max **420px** desktop |
| Halo | Radial gradient doré très léger (rgba 180,140,70 / 0.18) |
| Animation | `animate-pulse` avec `animationDuration: 2.4s` (lent, discret) |
| Texte | ❌ Aucun |
| Dots | ❌ Aucun |
| Cercle blanc | ❌ Supprimé |

## ✅ Résultat attendu

Écran totalement noir avec uniquement le **grand logo Immo-rama.ch** au centre, légèrement halo doré derrière, qui pulse doucement. Identique au rendu Macoloc.
