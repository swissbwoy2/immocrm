## Objectif

1. L'agent peut filmer/joindre une vidéo (iPhone/Samsung/desktop) depuis la messagerie → le client la reçoit dans WhatsApp (vidéo native si possible, sinon lien sécurisé).
2. Nouvelle page **Compte-rendu de visite** (saisie post-visite + envoi récap WA au client).
3. Nouvelle page **Fiche détaillée du bien** (caractéristiques + médias).

---

## Lot 1 — Vidéo WhatsApp (média natif + fallback lien)

### Capture mobile native
- `MessageAttachmentUploader.tsx` : sur le bouton **Vidéo**, ajouter `capture="environment"` (caméra arrière) en plus de `accept="video/*"`. Sur iPhone/Android cela ouvre directement l'appareil photo en mode vidéo. On garde l'option "choisir depuis la galerie" via un second item du popover ("Vidéo (galerie)").

### Logique d'envoi WA (les deux modes)
- Modifier `wa-send-agent-message` (Edge Function) pour accepter un nouveau champ optionnel `attachment` : `{ url, type, name, size, mime }`.
- Si `attachment.type === 'video'` :
  1. **Tentative média natif** : si `size <= 16 MB` ET mime ∈ `video/mp4|video/3gpp` ET fenêtre 24h ouverte (dernier inbound client < 24h, à lire depuis `whatsapp_inbound_messages` ou équivalent), appel direct Meta Graph API `messages` avec `type: "video"` + `link: signed_url`.
  2. **Fallback lien** : sinon (>16 MB, mauvais format, ou hors fenêtre), envoyer le template `agent_message_alert` existant en injectant un message du type `📹 Vidéo de votre agent : {signed_url}` (URL signée Supabase Storage 7 jours).
- Pour les images/audio/documents : même logique générique (image native ≤5 MB, audio ≤16 MB, document ≤100 MB, sinon lien).
- Trigger DB `notify_client_wa_on_agent_message` : étendre pour passer `attachment_url`, `attachment_type`, `attachment_size`, `attachment_mime` du `messages` vers la fonction.

### Détection fenêtre 24h
- Lire la dernière entrée `whatsapp_inbound_messages` (ou la table où `whatsapp-webhook` enregistre les messages reçus) pour ce client. Si `received_at > now() - 24h` → fenêtre ouverte.
- Logger le mode utilisé (`media_native` / `link_fallback`) dans `whatsapp_notification_logs` (nouvelle colonne `delivery_mode`).

### Erreurs Meta gérées
- `131047` (hors fenêtre 24h) → fallback automatique vers template+lien.
- `131053` (média trop gros / format invalide) → fallback lien.
- Toute autre erreur → notification admin existante (déjà en place).

---

## Lot 2 — Page Compte-rendu de visite

### Route et accès
- `/agent/visites/:id/compte-rendu` (et bouton "Faire le compte-rendu" sur les visites passées).
- Accessible aussi depuis `/admin/visites/:id/compte-rendu` (lecture seule pour admin si l'agent est différent).

### Schéma DB (nouvelle table `visite_comptes_rendus`)
- `visite_id` (FK), `agent_id`, `client_id`, `bien_id`
- `appreciation_globale` (enum: tres_positif | positif | mitige | negatif)
- `points_forts` (text[]), `points_faibles` (text[])
- `etat_general` (enum: excellent | bon | moyen | a_renover)
- `interet_client` (enum: tres_interesse | interesse | hesitant | non_interesse)
- `commentaire_libre` (text)
- `prochaines_etapes` (text)
- `medias` (jsonb : `[{url, type, name, size}]`) — photos + vidéos uploadées dans bucket `visite-medias`
- `envoye_au_client_at`, `wa_envoye_at`
- RLS : agent assigné OR co-assigné OR admin

### UI saisie
- Composant `CompteRenduForm` : sections pliables (Appréciation / État du bien / Intérêt client / Médias / Prochaines étapes).
- Upload médias = même `MessageAttachmentUploader` réutilisé (multi-fichiers ici).
- Bouton "Enregistrer brouillon" + "Envoyer au client".

### Envoi au client
- À l'envoi : insertion d'un `messages` dans la conversation client-agent avec un récap formaté + liens vers les médias.
- Trigger WA existant prendra le relais (Lot 1) → vidéos envoyées en natif/lien.
- Optionnel : nouveau template Meta `compte_rendu_visite` (5 vars: prénom, agent, adresse_bien, appreciation, lien_complet) — sinon réutilise `agent_message_alert`.

---

## Lot 3 — Fiche détaillée du bien

### Cadrage
La table `biens` existe déjà avec les champs principaux. Cette fiche = **vue agent enrichie** pour ajouter les médias et caractéristiques marketing manquantes.

### Schéma (extension table `biens` si colonnes manquantes)
À vérifier puis ajouter si absentes : `equipements` (text[]), `description_marketing` (text), `annee_construction`, `etat_bien`, `chauffage`, `orientation`, `etage`, `dpe`, `medias_galerie` (jsonb).

### Route et UI
- `/agent/biens/:id/fiche-detaillee` (édition).
- Sections : Caractéristiques / Équipements / Description / Médias (photos + vidéos + plans) / Documents.
- Upload réutilise le bucket `bien-medias` existant (ou nouveau si absent).
- Bouton "Partager au client" : envoie via messagerie un message avec lien vers une fiche publique (read-only) ou le PDF généré.

---

## Détails techniques

### Storage
- Vérifier bucket `message-attachments` (existant, public). OK pour vidéos jusqu'à 1 GB déjà côté upload.
- Nouveau bucket `visite-medias` (privé, RLS : agent + admin + client lié à la visite).
- Pour les liens WA : `createSignedUrl(path, 60*60*24*7)` (7 jours).

### Edge Functions modifiées/créées
- `wa-send-agent-message` (modifié) — support attachment + fenêtre 24h + média natif Meta.
- `_shared/wa-helpers.ts` — nouvelle fonction `sendWhatsAppMedia({ to, type, link, caption })`.
- `compte-rendu-send` (nouveau, optionnel) — orchestre l'envoi du compte-rendu (insert message + appel WA).

### Migrations
- `whatsapp_notification_logs` : ajouter colonne `delivery_mode text`.
- Nouvelle table `visite_comptes_rendus` + RLS.
- Bucket `visite-medias` + policies.
- (Conditionnel) Colonnes manquantes sur `biens`.

### Frontend
- `MessageAttachmentUploader` : ajouter `capture="environment"` + item "Vidéo (galerie)".
- Nouvelle route `/agent/visites/:id/compte-rendu` + composant.
- Nouvelle route `/agent/biens/:id/fiche-detaillee` + composant.
- Bouton "Faire le compte-rendu" sur cartes visite passée.

---

## Hors périmètre

- Pas de nouveau template WA pour le compte-rendu si `agent_message_alert` suffit (à confirmer après tests).
- Pas de génération PDF du compte-rendu dans cette itération (peut venir après).
- Pas de modification des autres flux WA (candidatures, refus, etc.).
