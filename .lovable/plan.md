## Objectif

1. Rendre le compte-rendu de visite **obligatoire** (non bloquant, mais avec rappels et alerte admin).
2. Permettre à l'agent d'uploader des **vidéos mobiles jusqu'à 1 GB** (iPhone/Android, depuis caméra ou galerie) dans la messagerie et le compte-rendu.
3. Envoyer ces vidéos au client via WhatsApp sous forme de **lien sécurisé + miniature** générée automatiquement.

---

## Lot 1 — Compte-rendu obligatoire (non bloquant + rappels + alerte admin)

### Logique de statut
Sur la table `visites`, ajout d'une colonne calculée logique `compte_rendu_status` (via vue ou logique côté UI) basée sur :
- `effectuee_at` : timestamp de fin de visite
- `visite_comptes_rendus.envoye_au_client_at` : preuve d'envoi

États :
- `non_requis` : visite future ou annulée
- `a_faire` : visite effectuée, < 24h, pas de compte-rendu
- `en_retard` : effectuée, > 24h, pas de compte-rendu  
- `fait` : compte-rendu envoyé au client

### UI Agent
- **Liste des visites** (`/agent/visites`) : badge rouge "⚠️ Compte-rendu manquant" sur les visites `en_retard`. Tri en haut de liste.
- **Dashboard agent** : widget "Comptes-rendus à faire" avec compteur cliquable.
- **Notification in-app** quotidienne (toast au login) listant les comptes-rendus en retard.

### UI Admin
- **Dashboard admin** : nouveau widget "Comptes-rendus en retard" (par agent, par âge).
- **Page `/admin/comptes-rendus`** : liste filtrable (agent, état, date), permet de relancer l'agent.
- **Alerte automatique** : Edge Function cron quotidienne (8h Europe/Zurich) qui :
  - Détecte les visites effectuées depuis > 48h sans compte-rendu
  - Envoie une notification in-app à l'admin
  - Envoie un email récap à l'admin (1 par jour, groupé)

### Pas de blocage
L'agent peut continuer à utiliser l'app normalement. Seuls les badges, notifications et alertes admin sont activés.

---

## Lot 2 — Upload vidéo mobile jusqu'à 1 GB

### Buckets storage
- `visite-medias` : passer la limite de fichier à **1 GB** (1073741824 bytes), MIME types autorisés : `video/mp4`, `video/quicktime` (iPhone .mov), `video/3gpp`, `video/webm`, `image/*`.
- `bien-medias` : idem.
- Bucket messagerie (à identifier via codebase) : idem 1 GB.

### Upload côté mobile (`MessageAttachmentUploader.tsx`)
- Boutons distincts :
  - 📷 **Photo (caméra)** : `accept="image/*" capture="environment"`
  - 🎥 **Vidéo (caméra)** : `accept="video/*" capture="environment"`
  - 🖼️ **Galerie** : `accept="image/*,video/*"` (sans capture, ouvre la galerie native)
- **Upload chunké/resumable** via Supabase storage `upload` avec `upsert: false` ; pour les fichiers > 50 MB, utiliser `uploadToSignedUrl` avec progress tracking.
- **Barre de progression** visible (% + MB/s) avec bouton "Annuler".
- **Validation client** : refuser > 1 GB avec message clair, avertir si > 100 MB sur connexion mobile.

### Génération de miniature vidéo (côté client)
- Utiliser `<video>` + `<canvas>` pour extraire une frame à t=1s.
- Upload de la miniature `.jpg` dans le même bucket sous `<video_path>.thumb.jpg`.
- Stockage du chemin de la miniature à côté de la vidéo dans les métadonnées du message / compte-rendu.

---

## Lot 3 — WhatsApp : lien sécurisé + miniature

### Modification `wa-send-agent-message`
Pour les attachments **vidéo** :
- **Toujours** envoyer en mode lien (peu importe la taille), car la miniature donne un meilleur rendu que la vidéo native 16 MB tronquée.
- Génération signed URL 7 jours pour la vidéo + 7 jours pour la miniature.
- Utiliser un nouveau template WhatsApp **`agent_video_message`** (à créer côté Meta) :
  - Header : **IMAGE** (la miniature)
  - Body : "{{1}} vous a envoyé une vidéo. Cliquez ici pour la regarder : {{2}}"
  - Variables : nom agent, lien signé vidéo
- Si template non disponible / hors fenêtre 24h : fallback `agent_message_alert` avec le lien dans le texte.
- Si la fenêtre 24h est ouverte : envoyer un message libre `image` (la miniature) suivi d'un message `text` avec le lien.

### Logs
La table `whatsapp_notification_logs.delivery_mode` accepte la nouvelle valeur `link_with_thumbnail`.

---

## Détails techniques

### Fichiers modifiés
- `src/components/MessageAttachmentUploader.tsx` — boutons caméra/galerie + miniature + progression
- `src/pages/agent/CompteRenduVisite.tsx` — réutilise le nouvel uploader
- `src/pages/agent/Visites.tsx` — badge "compte-rendu manquant"
- `src/pages/agent/Dashboard.tsx` — widget rappel
- `src/pages/admin/Dashboard.tsx` — widget alerte admin
- `src/App.tsx` — route `/admin/comptes-rendus`
- `src/pages/admin/ComptesRendus.tsx` — **nouveau** page admin
- `supabase/functions/wa-send-agent-message/index.ts` — logique lien + miniature
- `supabase/functions/cron-comptes-rendus-retard/index.ts` — **nouvelle** Edge Function cron
- `supabase/functions/_shared/wa-helpers.ts` — helper template vidéo

### Migration
- `ALTER` buckets `visite-medias`, `bien-medias`, messagerie → `file_size_limit = 1073741824`, MIME types vidéo étendus.
- Index sur `visites(effectuee_at)` pour requête cron.
- Cron job pg_cron quotidien 8h Europe/Zurich appelant `cron-comptes-rendus-retard`.

### Hors périmètre
- Pas de blocage de l'app pour l'agent.
- Pas de compression vidéo serveur.
- Pas de modification du flux de paiement / facturation.
- Création du template `agent_video_message` côté Meta Business Manager : **action manuelle utilisateur** après déploiement (je fournirai le contenu exact à coller).
