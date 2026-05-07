## Objectif

1. Ajouter un bandeau sur `/client` qui détecte WhatsApp WebView et propose d'ouvrir dans le navigateur réel (Chrome/Safari).
2. Ajouter à la fin de chaque template WhatsApp envoyé aux clients la mention :
   > _Message automatique. Pour répondre, écrivez directement sur le WhatsApp de votre agent._

## 1. Bandeau "Ouvrir dans le navigateur"

**Nouveau composant** : `src/components/client/OpenInBrowserBanner.tsx`

- Détection WhatsApp WebView via `navigator.userAgent` (chaîne contient `WhatsApp` ou `wv` selon plateforme).
- Détection iOS vs Android via UA.
- Affiche un bandeau en haut de la page (sticky, design système, dismissible avec `sessionStorage`).
- Bouton principal :
  - **Android** : lien `intent://...#Intent;scheme=https;package=com.android.chrome;end` → ouvre Chrome.
  - **iOS** : `x-safari-https://logisorama.ch/client` → ouvre Safari (fonctionne sur iOS récents). Fallback : copier l'URL + instruction "Menu ⋮ → Ouvrir dans le navigateur".
- Bouton secondaire : "Copier le lien".

**Intégration** : monter le composant dans le layout client (à identifier — probablement `src/pages/client/*` ou un layout commun). À placer une seule fois dans le layout pour couvrir toutes les pages `/client/*`.

## 2. Mention "message automatique" dans les templates WhatsApp

Les templates Meta sont validés côté Meta Business Manager — on ne peut pas modifier le texte sans resoumettre le template à validation. Deux approches possibles :

### Option A — Modifier les templates Meta (propre mais long)
- Éditer chaque template (`welcome_activation`, `agent_message_alert`, `application_accepted`, `signature_scheduled`, `post_visite_question`, etc.) dans Meta Business Manager pour ajouter en bas :
  > _Message automatique. Pour répondre, écrivez directement à votre agent sur WhatsApp._
- Resoumettre à validation Meta (24-48h par template).
- Mettre à jour la doc `docs/whatsapp_meta_waba_copy_paste.md` et `docs/whatsapp_templates_logisorama_v3.md` pour refléter le nouveau footer.

### Option B — Aucun changement code possible côté templates
- Le footer fait partie du template Meta, pas des variables. **Donc rien à faire en code Lovable** pour ça — c'est une action manuelle dans Meta Business Manager.

**Recommandation** : Option A. Je documente le texte exact à ajouter dans la doc, l'utilisateur (ou Christ) le copie-colle dans chaque template Meta.

## Détails techniques

### Détection WhatsApp WebView
```ts
const isWhatsAppWebView = /WhatsApp/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
```

### Liens d'ouverture externe
- **Android Chrome** : `intent://logisorama.ch/client#Intent;scheme=https;package=com.android.chrome;end`
- **iOS Safari** : `x-safari-https://logisorama.ch/client` (si échec → fallback copy-to-clipboard + toast)

### Texte footer template Meta (FR)
```
---
Message automatique. Pour répondre, écrivez directement à votre agent sur WhatsApp.
```

## Fichiers à créer / modifier

- **Créer** : `src/components/client/OpenInBrowserBanner.tsx`
- **Modifier** : layout client (à identifier dans `src/pages/client/` après exploration) pour monter le bandeau
- **Modifier** : `docs/whatsapp_templates_logisorama_v3.md` + `docs/whatsapp_meta_waba_copy_paste.md` → ajouter le footer standard à tous les templates clients
- **Aucune modification** des edge functions WhatsApp (le footer est dans le template Meta, pas dans les variables)

## Hors scope

- Templates internes (admin, agent) — non concernés.
- Changement du comportement WhatsApp lui-même (impossible, contrôlé par Meta).
