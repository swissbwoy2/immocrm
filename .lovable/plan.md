
# Tracking Meta Pixel "Contact" sur le widget WhatsApp

## Contexte : 2 sources WhatsApp

| Source | Tracking possible ? | Comment |
|--------|-------------------|---------|
| Bouton WhatsApp dans la pub Facebook | Deja track par Meta Ads Manager | Le visiteur ne passe pas par le site, donc notre Pixel ne le voit pas. Les stats sont visibles dans le Ads Manager (conversations commencees). |
| Widget WhatsApp sur la landing page (Elfsight) | A implementer | Le visiteur est sur notre page, on peut detecter l'interaction et envoyer un evenement Pixel. |

## Ce qu'on va implementer

Tracker les clics sur le **widget Elfsight** pour envoyer un evenement `Contact` au Meta Pixel et au TikTok Pixel.

## Solution technique

Le widget Elfsight est charge dans un **iframe**. Les clics dans un iframe ne remontent pas au JavaScript de la page. La technique standard est de detecter quand le focus de la fenetre passe a l'iframe (evenement `blur` + verification de `document.activeElement`).

### Etape 1 : Creer le hook `useWhatsAppTracking`

Nouveau fichier : `src/hooks/useWhatsAppTracking.ts`

Le hook :
- Ecoute l'evenement `blur` sur `window`
- Verifie que le focus est passe a un element contenu dans le div du widget Elfsight (`.elfsight-app-015a7ee8-3cf5-416f-a607-eb9d4a46e860`)
- Envoie les evenements :
  - Meta Pixel : `fbq('track', 'Contact')`
  - TikTok Pixel : `ttq.track('Contact')` (via le helper existant)
- Debounce de 3 secondes pour eviter les doublons
- Log console pour debug : `[WhatsApp Tracking] Contact event fired`

### Etape 2 : Integrer le hook dans la landing page

Fichier modifie : `src/pages/Landing.tsx`
- Importer et appeler `useWhatsAppTracking()` dans le composant `Landing`

## Fichiers concernes

1. `src/hooks/useWhatsAppTracking.ts` -- nouveau fichier
2. `src/pages/Landing.tsx` -- ajout de l'import et appel du hook

## Limites

- Les contacts WhatsApp via le bouton integre dans la pub Facebook ne sont pas trackables par notre Pixel (le visiteur ne visite jamais le site). Ces conversations sont deja comptabilisees dans le Meta Ads Manager.
- La detection par `blur` peut manquer certains cas (ex: le visiteur interagit avec le widget sans cliquer). C'est neanmoins la methode la plus fiable pour les iframes tiers.
