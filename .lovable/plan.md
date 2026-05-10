
# Refonte UI WhatsApp + Fix bug compteur "déjà envoyés"

## 0. Bug compteur (root cause)

`loadWaAlreadySent` filtre uniquement `status='sent'`. Or Meta met à jour la ligne en `'delivered'` puis `'read'` via webhook → ces leads sortent du Set "déjà envoyés" et réapparaissent comme "Disponibles". D'où **156 disponibles affichés** vs ~16 réels.

**Fix** : utiliser `.in("status", ["sent","delivered","read"])` dans :
- `loadWaAlreadySent` (compteur UI + Set de dédup)
- `handleWaRetryFailed` (pour ne PAS retry un lead déjà delivered/read même si une ancienne ligne 'failed' existe)

Pas de changement edge function (la fonction `send-followup-whatsapp` fait déjà la bonne dédup côté serveur dans `alreadySent`, à vérifier et aligner).

## 1. Onglet WhatsApp dans `CampagnesSuivi.tsx`

### Header campagne (compact + premium)
- Bandeau dégradé vert WhatsApp (#25D366 → #128C7E) avec logo, nom campagne, badge statut template, mini-stats inline
- Boutons **Aperçu** / **Test** en haut à droite (icônes seules sur mobile)

### Aperçu message
- Bulle WhatsApp réaliste (fond crème, bulle verte sortante #DCF8C6, double check vert, CTA stylé)

### Barre d'actions
- Sur mobile : barre **sticky bas** (search + bouton principal "Envoyer aux N") avec safe-area
- Sur desktop : barre flottante haut avec backdrop-blur
- "Renvoyer aux déjà contactés" + "Réessayer échecs" → menu kebab pour désencombrer

### Stats compteurs
- 3 mini-cards colorées (Total · Déjà envoyés ✓ · Disponibles) avec animation count-up
- **Compteurs maintenant exacts** grâce au fix bug

### Liste leads
- Mobile : cartes tactiles avec avatar initiales colorées, nom/téléphone, checkbox 44px, badge statut
- Desktop : Table densifiée + zebra rows + hover

### Résultat envoi
- Toast riche avec ✓ animé + breakdown sent/skipped/failed

## 2. Page Inbox WhatsApp (`agent/WhatsAppInbox.tsx`)

### Header global
- Sticky avec avatar + titre + badge non lus + actions à droite (search/filter/refresh)

### Sidebar conversations (look WhatsApp)
- Tabs Clients/Inconnus en chips arrondis
- Cartes conversation : avatar circulaire avec gradient par hash, indicateur fenêtre 24h ouverte (point vert), heure relative ("il y a 5 min"), badge non-lus pill verte, hover shift droite

### Zone conversation (la grosse upgrade)
- Fond crème WhatsApp (#ECE5DD light / #0B141A dark) avec pattern SVG subtil
- Bulles avec queue asymétrique, ombre douce, double check vert intégré, slide-in à l'arrivée
- Header conversation : avatar + nom + statut "en ligne / vu il y a X"

### Zone saisie
- Input rounded-full + bouton emoji placeholder
- Bouton envoi rond vert quand texte présent
- Bandeau "Fenêtre 24h fermée" plus visible avec compte à rebours
- Auto-resize textarea + Enter envoie / Shift+Enter newline

### États vides
- Illustration + message clair sur desktop
- Mobile : liste plein écran quand rien sélectionné, conversation plein écran avec back arrow

### Mobile (430px)
- Touch targets ≥44px, haptic feedback sur envoi, safe-area respectée

## 3. Détails techniques

- Tokens couleur dans `index.css` : `--whatsapp-green`, `--whatsapp-green-dark`, `--whatsapp-bubble-out`, `--whatsapp-bubble-in`, `--whatsapp-bg`
- Nouveaux composants `src/components/whatsapp/` : `WhatsAppBubble`, `ConversationListItem`, `LeadAvatar`
- `formatDistanceToNow` de `date-fns` (locale fr) pour heures relatives
- Aucune modif RLS / edge functions / schéma DB

## Fichiers touchés

- `src/pages/admin/CampagnesSuivi.tsx` — fix bug compteur (~5 lignes) + refonte `TabsContent value="whatsapp"` (~150 lignes)
- `src/pages/agent/WhatsAppInbox.tsx` — refonte rendu (~250 lignes)
- `src/index.css` — tokens WhatsApp
- `src/components/whatsapp/` — 3 nouveaux composants

## Ce qui reste identique

- Toute la logique d'envoi, dédup serveur, RLS, realtime
- Edge functions `send-followup-whatsapp`, `send-whatsapp-notification`, `wa-reply-text`
- Schéma DB + webhooks Meta
