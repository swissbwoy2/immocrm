# Récap Meta WABA — Copier-coller pour Immo-rama.ch

> Pour chaque template, va sur Meta Business Manager → WhatsApp Manager → Templates → **Créer template** (ou éditer si existe).
> Catégorie · Langue · Header · Body · Footer · Boutons. Tous en `fr`.

---

## T1 · `welcome_activation` · MARKETING

- **Header (TEXT)** : `🎉 Bienvenue chez Logisorama`
- **Body** :
```
Bonjour {{1}},

Votre mandat de recherche est officiellement activé 🔓
Votre agent dédié : {{2}}

À partir de maintenant, vous recevrez ici :
🏠 Les nouvelles offres correspondant à vos critères
📅 Les propositions de visite
📨 Les mises à jour de candidature

Bonne recherche ! 🍀
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons** : 1 URL — `🔗 Mon espace` → `https://logisorama.ch/client`

---

## T2 · `new_offer` · UTILITY ⭐

- **Header (TEXT)** : `🏠 Nouvelle offre pour vous`
- **Body** :
```
Bonjour {{1}} ! Une offre vient de matcher votre recherche 🎯

🏠 *{{2}} pièces — {{3}} m²*
📍 {{4}}
🏢 Étage : {{5}}
💰 {{6}} CHF/mois
📅 Disponibilité : {{7}}

📝 {{8}}

🔗 Annonce : {{9}}

Intéressé(e) ? Répondez ici, on organise la visite 👇
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons** :
  - URL dynamique — `📂 Voir le dossier` → `https://logisorama.ch/client/offres/{{1}}` (variable URL)
  - QR — `🙋 Je veux visiter` (payload : `new_offer_visit_request`)

---

## T3 · `proposition_visite_client` · UTILITY

- **Header** : `📅 Proposition de visite`
- **Body** :
```
Bonjour {{1}},

{{2}} vous propose une visite :

🏠 {{3}} pièces — {{4}} m²
📍 {{5}}
💰 {{6}} CHF/mois
📅 Visite le {{7}}

🔗 Annonce : {{8}}

Confirmez votre présence, ou déléguez la visite à notre équipe (un coursier s'y rend pour vous et vous envoie photos + vidéo + compte-rendu) 🎥
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons (3 QR)** :
  - `✅ Oui je viens` (`visit_propose_yes`)
  - `🎥 Déléguer à un coursier` (`visit_propose_delegate`)
  - `❌ Non merci` (`visit_propose_no`)

---

## T4 · `visit_reminder_24h` · UTILITY

- **Header** : `🔔 Rappel visite demain`
- **Body** :
```
Bonjour {{1}},

Petit rappel pour votre visite de DEMAIN à {{2}} 🗓️

🏠 {{3}} pièces — {{4}} m²
📍 {{5}}
💰 {{6}} CHF/mois
🏢 Étage {{7}}

🔗 Annonce : {{8}}

📲 Agent dédié : {{9}}

Confirmez votre venue, ou demandez à déléguer si empêchement.
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons (3 QR)** :
  - `✅ Je confirme` (`visit_remind_confirm`)
  - `🎥 Déléguer` (`visit_remind_delegate`)
  - `❌ Annuler` (`visit_remind_cancel`)

---

## T5 · `post_visite_question` · UTILITY

- **Header** : `✨ Comment s'est passée votre visite ?`
- **Body** :
```
Bonjour {{1}} !

Comment s'est passée votre visite de :
🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois

🔗 Annonce : {{6}}

Souhaitez-vous postuler ? L'agent {{7}} prépare le dossier en 24h 📁
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons (3 QR)** :
  - `✅ Oui je postule` (`post_visit_apply_yes`)
  - `🤔 J'hésite` (`post_visit_apply_maybe`)
  - `❌ Pas pour moi` (`post_visit_apply_no`)

---

## T6 · `candidature_demandee_client` · UTILITY

- **Header** : `📨 Dossier en préparation`
- **Body** :
```
Bonjour {{1}} !

Votre demande de candidature est lancée 🚀

🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois
🏢 Régie : {{6}}

🔗 Annonce : {{7}}

Votre agent {{8}} prépare et transmet le dossier sous 24h ⏱️
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons** :
  - URL — `📁 Suivre mon dossier` → `https://logisorama.ch/client/candidatures`
  - QR — `❓ J'ai une question` (`candidature_question`)

---

## T7 · `candidature_refus_client` · UTILITY

- **Header** : `📩 Réponse de la régie`
- **Body** :
```
Bonjour {{1}},

Malheureusement, votre dossier pour :
🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois

n'a pas été retenu par la régie {{6}}.

Motif : {{7}}

Pas de panique ! On continue à chercher activement 💪
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons (2 URL)** :
  - `🔍 Voir les nouvelles offres` → `https://logisorama.ch/client/annonces`
  - `💬 En parler à l'agent` → `https://logisorama.ch/client/messagerie`

---

## T8 · `application_accepted` · UTILITY

- **Header** : `🎉 Candidature acceptée !`
- **Body** :
```
Excellente nouvelle {{1}} 🎊

La régie {{2}} ACCEPTE votre dossier !

🏠 {{3}} pièces — {{4}} m²
📍 {{5}}
💰 {{6}} CHF/mois
📅 Emménagement prévu : {{7}}

🔗 Annonce : {{8}}

Prochaine étape : signature du bail. Confirmez-vous votre engagement ?
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons** :
  - URL — `📄 Voir le dossier` → `https://logisorama.ch/client/candidatures`
  - QR — `🙏 Merci, je signe` (`application_thanks`)

---

## T9 · `signature_scheduled` · UTILITY

- **Header** : `🖋️ Signature du bail planifiée`
- **Body** :
```
Bonjour {{1}} !

Votre signature est planifiée :

📅 {{2}} à {{3}}
📍 {{4}}
🏢 Régie : {{5}}

Pour le bien :
🏠 {{6}} pièces — {{7}} m²
📍 {{8}}
💰 {{9}} CHF/mois

🗺️ Itinéraire : {{10}}
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons (2 URL)** :
  - URL dynamique — `🗺️ Google Maps` → `https://www.google.com/maps/search/?api=1&query={{1}}`
  - URL fixe — `📋 Mon dossier` → `https://logisorama.ch/client/candidatures`

---

## T10 · `etat_des_lieux_scheduled` · UTILITY

- **Header** : `📋 État des lieux planifié`
- **Body** :
```
Bonjour {{1}} !

Votre état des lieux est fixé :
📅 {{2}} à {{3}}
📍 {{4}}

🏠 {{5}} pièces — {{6}} m²
💰 {{7}} CHF/mois
👤 Concierge : {{8}}

🔗 Annonce : {{9}}

À prévoir : pièce d'identité + relevé compteurs si déjà accessibles.
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons** :
  - URL — `📋 Détails dossier` → `https://logisorama.ch/client/candidatures`
  - QR — `🔄 Demander un autre créneau` (`edl_reschedule`)

---

## T11 · `keys_handover` · UTILITY

- **Header** : `🔑 Remise des clés confirmée`
- **Body** :
```
🎊 Bienvenue dans votre nouveau chez-vous {{1}} !

Vous avez désormais les clés de :
🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois
📅 Depuis le {{6}}

Toute l'équipe Logisorama vous souhaite une excellente installation 🏡

PS : connaissez-vous quelqu'un qui cherche aussi ? Parrainez-le et gagnez 100 CHF 🎁
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons** :
  - URL — `🏡 Mon espace` → `https://logisorama.ch/client`
  - QR — `🎁 Je parraine ({{7}})` (`referral_start`)

---

## T12 · `google_review_request` · MARKETING

- **Header** : `⭐ Votre avis compte !`
- **Body** :
```
Bonjour {{1}},

Cela fait une semaine que vous avez emménagé au {{2}} 🏡

Votre expérience avec {{3}} et l'équipe Logisorama vous a-t-elle convaincu ?

📝 Un avis Google nous aide ÉNORMÉMENT à aider d'autres locataires en galère.

⭐ Note moyenne actuelle : {{4}} ({{5}} avis)

Merci d'avance ! 🙏 — {{6}}
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons (2 URL)** :
  - `⭐ Laisser un avis Google` → URL Google review (à compléter)
  - `🎁 Voir mon parrainage` → `https://logisorama.ch/client/parrainage`

---

## T13 · `mandate_expiring_30d` · UTILITY

- **Header** : `📅 Votre mandat expire bientôt`
- **Body** :
```
Bonjour {{1}},

Votre mandat Logisorama arrive à échéance le {{2}}.

📊 Bilan recherche :
• {{3}} offres reçues
• {{4}} visites effectuées

3 options :
🔄 Renouveler 90 jours
💸 Annuler & remboursement (si éligible)
✅ J'ai trouvé seul

Que souhaitez-vous ?
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons (3 QR)** :
  - `🔄 Renouveler` (`mandate_renew`)
  - `💸 Annuler & remb.` (`mandate_cancel_refund`)
  - `✅ J'ai trouvé seul` (`mandate_found_alone`)

---

## T14 · `agent_message` · UTILITY

- **Header** : `💬 Message de votre agent`
- **Body** :
```
Bonjour {{1}},

{{2}} vous a écrit :

« {{3}} »

📎 Concerne : {{4}}
```
- **Footer** : `Logisorama by Immo-rama.ch`
- **Boutons** :
  - URL — `💬 Ouvrir messagerie` → `https://logisorama.ch/client/messagerie`
  - QR — `📞 Me rappeler` (`agent_message_callback`)

---

## T15 · `alerte_agent_reponse_visite` · UTILITY (interne)

- **Header** : `📲 Réponse client visite`
- **Body** :
```
{{1}} a répondu à la proposition de visite :

🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois
📅 Créneau : {{6}}

💬 Réponse : {{7}}

🔗 Annonce : {{8}}
```
- **Footer** : `Logisorama CRM`
- **Boutons** :
  - URL — `📋 CRM` → `https://logisorama.ch/agent/visites`
  - QR — `📞 Appeler client` (`agent_call_client_now`)
  - QR — `🎥 Trouver coursier` (`agent_dispatch_courier`)

---

## T16 · `alerte_agent_candidature` · UTILITY (interne)

- **Header** : `📨 Nouvelle candidature client`
- **Body** :
```
🚨 {{1}} souhaite postuler pour :

🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois
📅 Visité le {{6}}
🏢 Régie : {{7}}

🔗 Annonce : {{8}}

Préparer & transmettre le dossier sous 24h ⏱️
```
- **Footer** : `Logisorama CRM`
- **Boutons** :
  - URL — `📁 Préparer dossier` → `https://logisorama.ch/agent/candidatures`
  - QR — `✅ Pris en charge` (`agent_candidature_taken`)

---

## Checklist post-création

- [ ] Tous les templates en **statut Actif** (qualité OK)
- [ ] `template_name_meta` exact = `template_key` (snake_case)
- [ ] Désactiver `hello_world` (template défaut Meta — non utilisé)
- [ ] Vérifier dans `whatsapp_message_templates` table que chaque clé existe avec `is_active = true`
