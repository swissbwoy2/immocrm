# WhatsApp Templates v3 — Détails complets du bien dans chaque message

## Principe directeur

Chaque notification liée à un bien (offre, visite, candidature, signature, clés…) doit contenir **TOUTES les infos clés du bien** :
- 🏠 Type + nb pièces
- 📍 Adresse complète
- 📐 Surface (m²)
- 💰 Prix (CHF)
- 🏢 Étage
- 📅 Disponibilité
- 📝 Mini-description (1 ligne)
- 🔗 **Lien source externe** (Flatfox / immobilier.ch / Homegate — `offres.lien_annonce`), **PAS** logisorama.ch

Les Edge Functions devront enrichir les variables en chargeant `offres` (ou `visites.offre_id → offres`) avant d'appeler `send-whatsapp-notification`.

---

## Contraintes Meta à respecter

- **Body max ~1024 chars**, mais on vise 500-700 pour lisibilité mobile
- **Variables max ~10** par template (on reste à 9 max)
- **Pas de `{{n}}` en début ou fin** de body (Meta refuse) → toujours encadrer par texte
- **Catégorie MARKETING** = obligatoire opt-in, peut être bloquée en silent → on garde MARKETING uniquement pour : welcome, post-visite question, refus candidature, google review
- **UTILITY** pour tout ce qui est transactionnel (offre, visite proposée, rappel, étapes candidature, signature, clés, EDL, mandat 30j)
- **Footer** systématique : `Logisorama by Immo-rama.ch` (60 chars max)
- **Header** texte court optionnel : utilisé uniquement pour les 4 templates "vitrine"
- **Boutons** : max 3 quick-reply OU max 2 URL (pas mixé sauf via 1 URL + 1 QR)
- **Quick Reply payloads** à conserver à l'identique (sinon le webhook `whatsapp-webhook` casse) :
  - `visit_propose_yes`, `visit_propose_no`
  - `post_visit_apply_yes`, `post_visit_apply_maybe`, `post_visit_apply_no`
  - `mandate_renew`, `mandate_cancel_refund`, `mandate_found_alone` (à créer pour mandate_expiring_30d)

---

## Les 17 templates

### 1. `logisorama_welcome_activation` — MARKETING — fr
**Header** : `🎉 Bienvenue chez Logisorama, {{1}} !`
**Body** :
```
Votre mandat de recherche est officiellement ACTIF ✅

Notre équipe va dès maintenant vous proposer des biens 100% adaptés à vos critères, AVANT leur publication sur les portails publics.

Prochaines étapes :
1️⃣ Vous recevrez les offres directement ici sur WhatsApp
2️⃣ Vous validez la visite en 1 clic
3️⃣ On s'occupe du reste jusqu'à la remise des clés 🔑

Une question ? Répondez simplement à ce message, votre conseiller {{2}} vous répond sous 1h ouvrée.

À très vite ! 🏡
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `📱 Ouvrir mon espace` → `https://logisorama.ch/client/dashboard`
**Variables** : `{{1}}=prenom`, `{{2}}=nom_agent`

---

### 2. `logisorama_new_offer` — UTILITY — fr  ⭐ TEMPLATE CŒUR
**Header** : `🏠 Nouvelle offre exclusive pour vous`
**Body** :
```
Bonjour {{1}} 👋

Une offre correspond à vos critères :

🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois
🏢 Étage : {{6}}
📅 Disponible : {{7}}

📝 {{8}}

🔗 Annonce officielle : {{9}}

Vous pouvez consulter le détail complet et réserver une visite directement depuis votre espace Logisorama.
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** :
- [URL] `👀 Voir l'offre complète` → `https://logisorama.ch/client/offres-recues?offreId={{1}}` (variable URL)
- [QR] `📞 Me rappeler`  payload `offer_callback`

**Variables (9)** :
1. prenom
2. pieces (ex: `3.5`)
3. surface (m²)
4. adresse
5. prix
6. etage (ou "—")
7. disponibilite (formatée fr-CH)
8. description (max 120 char tronquée)
9. lien_annonce (`offres.lien_annonce`, fallback "Sur demande")

**Edge Function** : `wa-send-new-offer` (à créer ou enrichir l'appelant existant) — charge `offres` complet.

---

### 3. `logisorama_proposition_visite_client` — UTILITY — fr
**Header** : `📅 Visite proposée — confirmez en 1 clic`
**Body** :
```
Bonjour {{1}},

{{2}} vous propose une visite :

🏠 {{3}} pièces — {{4}} m²
📍 {{5}}
💰 {{6}} CHF/mois
📅 Visite le {{7}}

🔗 Annonce : {{8}}

Confirmez-vous votre présence ?
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** (Quick Reply — payloads à NE PAS changer) :
- ✅ Oui, je confirme → `visit_propose_yes`
- ❌ Non, indisponible → `visit_propose_no`

**Variables (8)** : prenom, agent, pieces, surface, adresse, prix, date_visite_fr, lien_annonce

**Edge Function** : `wa-send-proposition-visite` → étendre pour charger `visites.offre_id → offres`.

---

### 4. `logisorama_visit_reminder_24h` — UTILITY — fr
**Header** : `⏰ Rappel : votre visite demain`
**Body** :
```
Bonjour {{1}},

Petit rappel pour votre visite de DEMAIN à {{2}} 🗓️

🏠 {{3}} pièces — {{4}} m²
📍 {{5}}
💰 {{6}} CHF/mois
🏢 Étage {{7}}

🔗 Annonce : {{8}}

📲 En cas d'empêchement, prévenez votre agent {{9}} dès maintenant.

À demain ! 🔑
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** :
- [URL] `🗺️ Itinéraire Google Maps` → `https://www.google.com/maps/search/?api=1&query={{1}}` (URL var = adresse encodée)
- [QR] `❌ Annuler` → payload `visit_cancel_24h`

**Variables (9)** : prenom, heure_visite, pieces, surface, adresse, prix, etage, lien_annonce, nom_agent

**Edge Function** : `cron-visit-reminders` → enrichir avec `offres`.

---

### 5. `logisorama_post_visite_question` — MARKETING — fr
**Header** : `🤔 Votre avis sur la visite ?`
**Body** :
```
Bonjour {{1}},

Comment s'est passée votre visite de :

🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois

🔗 Pour rappel : {{6}}

Souhaitez-vous déposer votre dossier pour ce bien ? Plus vous êtes rapide, plus vos chances augmentent ⚡
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** (Quick Reply) :
- ✅ Oui je postule → `post_visit_apply_yes`
- 🤔 J'hésite → `post_visit_apply_maybe`
- ❌ Non merci → `post_visit_apply_no`

**Variables (6)** : prenom, pieces, surface, adresse, prix, lien_annonce

---

### 6. `logisorama_candidature_demandee_client` — UTILITY — fr
**Header** : `📨 Candidature en cours d'envoi`
**Body** :
```
Merci {{1}} ✅

Votre candidature pour :
🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois

🔗 Annonce : {{6}}

…est en cours de transmission par votre agent {{7}} à la régie 📤

Vous serez notifié dès qu'il y a du nouveau (en général sous 5 jours ouvrés).
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `📋 Suivre ma candidature` → `https://logisorama.ch/client/mes-candidatures`

**Variables (7)** : prenom, pieces, surface, adresse, prix, lien_annonce, agent

---

### 7. `logisorama_candidature_refus_client` — MARKETING — fr
**Header** : `📬 Réponse régie reçue`
**Body** :
```
Bonjour {{1}},

Malheureusement, votre dossier n'a pas été retenu pour :
🏠 {{2}} pièces — {{3}} m²
📍 {{4}}

🔗 Annonce : {{5}}

Pas d'inquiétude : nous travaillons déjà sur de nouvelles pistes ✨
En moyenne, nos clients trouvent en 4 à 6 semaines.

Restez confiant, on continue 💪
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `🔍 Voir nouvelles offres` → `https://logisorama.ch/client/offres-recues`

**Variables (5)** : prenom, pieces, surface, adresse, lien_annonce

---

### 8. `logisorama_application_accepted` — UTILITY — fr ⭐ (passer EN→fr)
**Header** : `🎉 EXCELLENTE NOUVELLE !`
**Body** :
```
Félicitations {{1}} 🥳🎊

Votre dossier a été ACCEPTÉ par la régie pour :

🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois
📅 Entrée : {{6}}

🔗 Annonce : {{7}}

Votre agent {{8}} prend contact avec vous dans les heures qui viennent pour la suite (signature du bail, état des lieux).

Bienvenue dans votre futur chez-vous 🏡✨
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `📄 Voir mon dossier` → `https://logisorama.ch/client/mes-candidatures`

**Variables (8)** : prenom, pieces, surface, adresse, prix, disponibilite, lien_annonce, agent

---

### 9. `logisorama_signature_scheduled` — UTILITY — fr ⭐ (passer EN→fr)
**Header** : `✍️ Signature du bail planifiée`
**Body** :
```
Bonjour {{1}},

La signature de votre bail est fixée :
📅 {{2}}
📍 Lieu : {{3}}

Pour le bien :
🏠 {{4}} pièces — {{5}} m²
📍 {{6}}
💰 {{7}} CHF/mois

🔗 Annonce : {{8}}

📋 À apporter : pièce d'identité + RIB + justificatif domicile actuel.

Une question ? Votre agent {{9}} reste joignable.
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `🗓️ Ajouter à mon agenda` → `https://logisorama.ch/client/calendrier`

**Variables (9)** : prenom, date_signature, lieu, pieces, surface, adresse, prix, lien_annonce, agent

---

### 10. `logisorama_etat_des_lieux_scheduled` — UTILITY — fr ⭐ (passer EN→fr)
**Header** : `🔍 État des lieux planifié`
**Body** :
```
Bonjour {{1}},

Votre état des lieux d'entrée :
📅 {{2}} à {{3}}
📍 {{4}}

Pour le logement :
🏠 {{5}} pièces — {{6}} m²
🏢 Étage {{7}}

🔗 Annonce de référence : {{8}}

📝 Pensez à : photos avant entrée, relevés compteurs, contact concierge.

Une question ? Répondez à ce message.
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `📋 Checklist EDL` → `https://logisorama.ch/client/dossier`

**Variables (8)** : prenom, date, heure, adresse, pieces, surface, etage, lien_annonce

---

### 11. `logisorama_keys_handover` — UTILITY — fr ⭐ (passer EN→fr)
**Header** : `🔑 Vous avez les clés !`
**Body** :
```
Félicitations {{1}} 🎉🏡

Bienvenue chez vous au :
📍 {{2}}
🏠 {{3}} pièces — {{4}} m²
🏢 Étage {{5}}

🔗 Annonce : {{6}}

Toute l'équipe Logisorama vous souhaite une superbe installation ✨

🙏 Si vous êtes satisfait, votre avis Google nous aide ÉNORMÉMENT (vous le recevrez d'ici 7 jours).
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `💬 Contacter mon agent` → `https://logisorama.ch/client/messagerie`

**Variables (6)** : prenom, adresse, pieces, surface, etage, lien_annonce

---

### 12. `logisorama_google_review_request` — MARKETING — fr (currently EN)
**Header** : `⭐ 30 secondes pour nous aider ?`
**Body** :
```
Bonjour {{1}} 👋

Installation réussie dans votre nouveau {{2}} pièces ?

Si {{3}} et toute l'équipe Logisorama ont mérité votre confiance, votre avis Google booste énormément notre petite agence familiale 🙏

⏱️ 30 secondes — ⭐⭐⭐⭐⭐

Mille mercis du fond du cœur ❤️
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `⭐ Laisser un avis Google` → `https://g.page/r/CQJCKNAJlouGEAE/review`

**Variables (3)** : prenom, pieces, agent

---

### 13. `logisorama_mandate_expiring_30d` — UTILITY — fr
**Header** : `📅 Votre mandat expire bientôt`
**Body** :
```
Bonjour {{1}},

Votre mandat de recherche Logisorama arrive à échéance le {{2}} (dans 30 jours).

3 options s'offrent à vous :
🔄 Renouveler pour 3 mois supplémentaires
💸 Annuler & demander remboursement (selon conditions)
✅ J'ai trouvé seul (on clôture sereinement)

Que souhaitez-vous faire ?
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** (Quick Reply — payloads à créer) :
- 🔄 Renouveler → `mandate_renew`
- 💸 Annuler & remb. → `mandate_cancel_refund`
- ✅ J'ai trouvé seul → `mandate_found_alone`

**Variables (2)** : prenom, date_fin

---

### 14. `logisorama_agent_message` — UTILITY — fr
**Header** : `💬 Nouveau message de votre agent`
**Body** :
```
Bonjour {{1}},

Votre agent {{2}} vous a envoyé un message :

« {{3}} »

📲 Répondez directement depuis votre espace Logisorama pour garder l'historique au même endroit.
```
**Footer** : `Logisorama by Immo-rama.ch`
**Boutons** : [URL] `💬 Ouvrir la messagerie` → `https://logisorama.ch/client/messagerie`

**Variables (3)** : prenom, nom_agent, extrait_message (max 200 char)

---

### 15. `logisorama_alerte_agent_reponse_visite` — UTILITY — fr (interne agent/admin)
**Header** : `📲 Réponse client visite`
**Body** :
```
{{1}} a répondu à la proposition de visite :

🏠 Bien : {{2}}
📅 Créneau : {{3}}
💬 Réponse : {{4}}
📞 {{5}}

🔗 Annonce : {{6}}

Action requise dans le CRM.
```
**Footer** : `Logisorama CRM`
**Boutons** : [URL] `📋 Ouvrir le CRM` → `https://logisorama.ch/agent/visites`

**Variables (6)** : client, bien, creneau, reponse, telephone, lien_annonce

---

### 16. `logisorama_alerte_agent_candidature` — UTILITY — fr (interne agent/admin)
**Header** : `📨 Nouvelle candidature client`
**Body** :
```
🚨 Action requise

{{1}} souhaite postuler pour :
🏠 {{2}}
💰 {{3}} CHF/mois
📅 Visité le {{4}}

🔗 Annonce : {{5}}

Préparer & transmettre le dossier à la régie.
```
**Footer** : `Logisorama CRM`
**Boutons** : [URL] `📁 Préparer dossier` → `https://logisorama.ch/agent/candidatures`

**Variables (5)** : client, bien_resume (pieces+adresse), prix, date_visite, lien_annonce

---

### 17. `hello_world` — UTILITY — en
🚫 **Template Meta par défaut, NE PAS recréer.** Présent uniquement sur le WABA Test pour bootstrap. Aucun usage CRM.

---

## Mapping variables → tables

| Variable | Source DB |
|---|---|
| prenom | `profiles.prenom` via `clients.user_id` |
| nom_agent / agent | `profiles.prenom + nom` via `agents.user_id` |
| pieces | `offres.pieces` |
| surface | `offres.surface` |
| adresse | `offres.adresse` ou `visites.adresse` |
| prix | `offres.prix` (formaté `1'750`) |
| etage | `offres.etage` (fallback `—`) |
| disponibilite | `offres.disponibilite` formaté `fr-CH` |
| description | `offres.description` (slice 0-120) |
| **lien_annonce** | **`offres.lien_annonce`** ⚠️ jamais logisorama.ch ; fallback `"Lien sur demande"` |
| date_visite_fr | `Intl.DateTimeFormat('fr-CH', tz Europe/Zurich)` |

---

## Edge Functions à enrichir (phase 2 — après création des templates)

1. **`send-whatsapp-notification`** : aucun changement (reste générique)
2. **`wa-send-new-offer`** (NOUVEAU ou existant) : charger `offres` complet → 9 variables
3. **`wa-send-proposition-visite`** : JOIN `visites → offres` → 8 variables (au lieu de 4)
4. **`cron-visit-reminders`** (24h) : JOIN `visites → offres` → 9 variables
5. **`wa-send-post-visite-question`** : JOIN → 6 variables
6. **`wa-send-candidature-*`** (demandee, refus, accepted) : JOIN `candidatures → offres`
7. **`wa-send-signature-scheduled`** : JOIN → 9 variables
8. **`wa-send-etat-des-lieux`** : JOIN → 8 variables
9. **`wa-send-keys-handover`** : JOIN → 6 variables
10. **`wa-send-google-review`** : 3 variables
11. **`wa-send-mandate-expiring-30d`** (cron) : 2 variables
12. **`wa-send-agent-message`** : 3 variables
13. **Webhook `whatsapp-webhook`** : ajouter handlers pour `mandate_renew`, `mandate_cancel_refund`, `mandate_found_alone`, `visit_cancel_24h`, `offer_callback`

---

## Migration SQL post-validation Meta (phase 3)

```sql
-- Mettre à jour body_preview + variables_schema + language pour les 16 templates fr
UPDATE whatsapp_message_templates SET language='fr' WHERE template_key IN
('application_accepted','etat_des_lieux_scheduled','google_review_request',
 'keys_handover','signature_scheduled','welcome_activation');

-- Mettre à jour les variables_schema (nb de variables a changé)
-- (1 UPDATE par template_key avec le nouveau schema array)
```

---

## Ordre d'exécution

1. **Vous** : créer les **16 templates** (hors hello_world) sur WABA Immo-rama.ch via Meta Manager — copier exactement les bodies/headers/footers/boutons ci-dessus
2. **Attendre validation Meta** (statut "Actif – Qualité en attente", 1-15 min)
3. **Vous me dites GO** → je lance la migration SQL + j'enrichis les 12 Edge Functions pour passer toutes les variables détaillées
4. **Tests** : `curl_edge_functions` pour chaque flux sur compte test (Christ Ramazani)
5. **Cleanup optionnel** : supprimer les 16 templates dupliqués sur le WABA Test

---

## Note design / UX

- Émojis en début de ligne pour scannabilité mobile (1 émoji = 1 info clé)
- Lien externe (Flatfox/immobilier.ch) toujours **après** les détails, jamais en CTA bouton (les boutons URL pointent vers Logisorama pour garder le client dans l'écosystème)
- Le **bouton URL** ramène toujours vers l'espace client Logisorama → conversion + rétention
- Le **lien texte** dans le body donne accès à la source originale (transparence + confiance)
