## Objectif

Transformer la messagerie interne (entre clients ↔ agents/admin et propriétaires ↔ admin) en **widget flottant global** disponible dans toute l'app connectée, **sans IA** — uniquement des conversations humaines réelles, branchées sur la table `messages` existante.

Le prompt 21st.dev sert uniquement d'inspiration visuelle (bulle flottante en bas à droite, panneau qui s'ouvre avec animation framer-motion, header avec avatar + statut, sélecteur en haut, zone de chat, input en bas). On enlève toute la logique "agents IA / GPT/Claude/Gemini".

---

## Périmètre

### Inclus
- **Nouveau composant flottant** `FloatingMessenger` monté dans `AppLayout` (donc visible sur toutes les routes connectées : admin, agent, client, propriétaire).
- **Bulle déclencheuse** en bas à droite avec :
  - Icône `MessageSquare` (fermée) / `X` (ouverte)
  - **Badge non-lus** (compteur rouge) basé sur `messages.lu = false` adressés à l'utilisateur
  - Animation pulse douce quand nouveaux messages
- **Panneau flottant** (≈ 380×560px desktop, plein écran mobile) avec 2 vues :
  1. **Liste des conversations** (sélecteur en haut style "agent picker" du prompt, mais avec les vrais interlocuteurs : nom + dernier message + statut online/offline via `profiles.is_online`)
  2. **Vue conversation active** : header (avatar + nom + statut), scroll des messages, input avec envoi
- **Realtime** via le canal Supabase déjà utilisé dans les pages Messagerie (postgres_changes sur `messages`)
- **Réutilisation** des composants existants : `PremiumMessageBubble`, `PremiumChatInput`, `ChatAvatar`, `DateSeparator` → cohérence visuelle garantie
- **Adaptation par rôle** (via `useAuth`) :
  - **Client** → ses agents assignés + admin
  - **Agent** → ses clients + admin
  - **Admin** → tous les agents + clients récents
  - **Propriétaire** → admin uniquement

### Exclu
- **Pas de suppression** des pages `/admin/messagerie`, `/agent/messagerie`, `/client/messagerie`, `/proprietaire/messagerie` — elles restent comme **vue plein écran** (recherche avancée, pièces jointes lourdes). Le widget est un **raccourci**, pas un remplacement.
- Pas d'IA, pas de bot, pas de réponses automatiques.
- Pas de pièces jointes dans le widget v1 → bouton "Ouvrir en plein écran" qui redirige vers la page Messagerie du rôle.
- Pas d'affichage sur le site public (`PublicSiteLayout`) — le widget WhatsApp existant y reste.

---

## Architecture technique

### Nouveaux fichiers

1. **`src/components/messaging/floating/FloatingMessenger.tsx`** — composant racine
   - État `isOpen`, vue active (`'list' | 'conversation'`), conversation sélectionnée
   - Bouton flottant + panneau animé (framer-motion `AnimatePresence`)
   - `fixed bottom-4 right-4 z-40`, safe-area iOS respecté
   - Mobile : plein écran slide-up — Desktop : 380×560px scale + fade (variants du prompt)

2. **`src/components/messaging/floating/FloatingMessengerBubble.tsx`**
   - Bouton 56×56px, gradient primary, ombre dorée
   - Badge non-lus rouge en haut à droite
   - Pulse si nouveaux messages

3. **`src/components/messaging/floating/FloatingConversationList.tsx`**
   - Liste scrollable : avatar + nom + dernier message + horodatage Europe/Zurich + dot online
   - Click → ouvre la conversation

4. **`src/components/messaging/floating/FloatingConversationView.tsx`**
   - Header : retour, avatar, nom, statut, bouton "plein écran" (route Messagerie du rôle)
   - Messages scrollables (réutilise `PremiumMessageBubble` + `DateSeparator`)
   - Input compact (réutilise `PremiumChatInput` sans pièces jointes)

5. **`src/hooks/useFloatingMessenger.tsx`** — Context + Provider
   - État global : `isOpen`, `activeConversationId`, `unreadCount`
   - Méthodes : `openWith(conversationId)`, `close()`, `toggle()`
   - Realtime `messages` → incrémente `unreadCount` + déclenche pulse

### Fichiers modifiés

6. **`src/components/AppLayout.tsx`**
   - Wrap children avec `<FloatingMessengerProvider>`
   - Monter `<FloatingMessenger />` une seule fois dans le layout

### Logique de données

- **Lecture conversations** : reproduire la logique des pages Messagerie (queries `messages` groupées + jointures `profiles`)
- **Realtime** : `supabase.channel('floating-messenger').on('postgres_changes', { table: 'messages', filter: 'destinataire_id=eq.{userId}' })`
- **Marquer comme lu** : à l'ouverture, `UPDATE messages SET lu=true WHERE expediteur_id=X AND destinataire_id=currentUser AND lu=false`
- **RLS** : aucune nouvelle policy — les policies actuelles couvrent déjà lecture/écriture

### Style brand Logisorama

- Header panneau : gradient primary + bordure dorée `hsl(38_45%_48%/0.3)`
- Avatars : `ChatAvatar` existant (déjà brandé)
- Animations : variants framer-motion du prompt (spring damping 25 / stiffness 300) + stagger
- Icônes : `MessageSquare`, `X`, `Send`, `ChevronLeft`, `Maximize2` uniquement (pas Brain/Sparkles/Zap réservées aux IA)
- Dark mode : tokens shadcn déjà gérés

### Mobile (`mem://features/mobile-optimization-strategy`)

- Touch targets ≥ 44px
- Haptic light ouverture/fermeture (`useHapticFeedback`)
- Safe-area-inset-bottom respecté
- Plein écran < 768px, flottant ≥ 768px

---

## Hors scope (v2 possible)

- Push natives widget fermé (déjà géré via `usePushNotifications`)
- Pièces jointes dans le widget
- Recherche dans les conversations
- Réactions emoji
- Widget pour annonceurs (`/espace-annonceur/messages` a sa propre logique séparée)

---

## Validation post-build

- Tester sur 4 rôles → bons interlocuteurs listés
- Badge non-lus en realtime (envoyer message depuis autre compte)
- Ouverture/fermeture mobile (768×894) avec animation fluide bidirectionnelle
- Bouton "plein écran" → bonne route selon rôle
- Widget absent du site public (`PublicSiteLayout`)