## Objectif

Rendre l'adresse cliquable dans le modal "Détails de la visite" du calendrier — pour **admin**, **agent** et **client** — afin d'ouvrir l'itinéraire :
- **Apple Plans** sur iPhone/iPad (`maps://`)
- **Google Maps** sur Android, desktop et autres

## Constat

- Le composant `src/components/AddressLink.tsx` ouvre déjà Google Maps mais ne détecte pas iOS.
- Côté **client**, `PremiumClientDayEvents.tsx` (ligne 261) utilise déjà `AddressLink` → bénéficie automatiquement de l'amélioration.
- Côté **admin** (`src/pages/admin/Calendrier.tsx` lignes 647-650) et **agent** (`src/pages/agent/Calendrier.tsx` lignes 1163-1180, 1036), l'adresse est un simple `<h4>` non cliquable → à remplacer par `AddressLink`.

## Plan technique

### 1. `src/components/AddressLink.tsx` — détection iOS
- Détecter iOS via `navigator.userAgent` (iPhone/iPad/iPod) + iPadOS moderne (`Macintosh` + `maxTouchPoints > 1`).
- Sur iOS : ouvrir `maps://?daddr=<adresse encodée>` (Plans natif).
- Sinon : conserver `https://www.google.com/maps/dir/?api=1&destination=...`.
- Mettre à jour le tooltip : "Ouvrir l'itinéraire dans Plans/Maps".

### 2. `src/pages/admin/Calendrier.tsx`
- Remplacer le bloc `<h4><MapPin/>{adresse}</h4>` (ligne 647-650) par `<AddressLink address={selectedVisiteGroup[0].adresse} className="font-semibold text-lg" />`.

### 3. `src/pages/agent/Calendrier.tsx`
- Modal détails visite (lignes 1167-1167) : remplacer `<h4>{selectedVisite.adresse}</h4>` par `<AddressLink ... />`.
- Modal feedback visite déléguée (ligne 1036) : idem.

### 4. Client
- Aucune modification de page nécessaire : `PremiumClientDayEvents` utilise déjà `AddressLink`. L'amélioration iOS est automatique.

## Fichiers modifiés

- `src/components/AddressLink.tsx`
- `src/pages/admin/Calendrier.tsx`
- `src/pages/agent/Calendrier.tsx`
