# WhatsApp Templates Logisorama — v3 (T1 → T16)

> Source de vérité unique. Chaque template = catégorie + langue + body final + boutons + mapping SQL + Edge Function trigger.
> Toutes les dates/heures sont rendues en `Europe/Zurich` (UTC+1/+2).

## Helpers communs (`supabase/functions/_shared/wa-helpers.ts`)

| Helper | Description |
|---|---|
| `fmtPieces(n)` | `"3.5"` → `"3.5"`, `4` → `"4"` |
| `fmtPrixCHF(n)` | `2150` → `"2'150"` (apostrophe suisse) |
| `fmtDateFR(iso)` | `"lundi 12 mai 2026 à 14:30"` (Europe/Zurich) |
| `fmtDateCourtFR(iso)` | `"12 mai 2026"` |
| `fmtHeureFR(iso)` | `"14:30"` |
| `fmtDispo(iso\|null)` | date OU `"Sur demande"` |
| `lienAnnonceOuFallback(url)` | URL OU `"Sur demande"` |
| `loadOffreDetails(supabase, offre_id)` | retourne `{pieces, surface, adresse, prix, etage, lien_annonce, regie_nom}` |
| `loadClientProfile(supabase, client_id)` | `{prenom, nom, telephone, whatsapp_phone}` |
| `loadAgentName(supabase, agent_id)` | `"Christ Ramazani"` ou `"votre agent"` |

---

## T1 · `welcome_activation` · MARKETING · fr

**Header** : `🎉 Bienvenue chez Logisorama`

**Body (2 vars)** :
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

**Footer** : `Logisorama by Immo-rama.ch`

**Boutons** : 1 URL · `🔗 Mon espace` → `https://logisorama.ch/client`

**Variables** :
| # | Source |
|---|---|
| `{{1}}` | `profiles.prenom` |
| `{{2}}` | `agent.prenom + nom` |

**Edge Function** : `wa-send-welcome` (existante) — déclenchée à l'activation du mandat.

---

## T2 · `new_offer` · UTILITY · fr ⭐

**Header** : `🏠 Nouvelle offre pour vous`

**Body (9 vars)** :
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

**Footer** : `Logisorama by Immo-rama.ch`

**Boutons (1 URL var + 1 QR)** :
- [URL var] `📂 Voir le dossier` → `https://logisorama.ch/client/offres/{{offre_id}}`
- [QR] `🙋 Je veux visiter` → `new_offer_visit_request`

**Variables** :
| # | Source |
|---|---|
| `{{1}}` | `profiles.prenom` |
| `{{2}}` | `fmtPieces(offres.pieces)` |
| `{{3}}` | `offres.surface` |
| `{{4}}` | `offres.adresse` |
| `{{5}}` | `offres.etage` ou `"—"` |
| `{{6}}` | `fmtPrixCHF(offres.prix)` |
| `{{7}}` | `fmtDispo(offres.disponibilite)` |
| `{{8}}` | `offres.description` (200 char max) |
| `{{9}}` | `lienAnnonceOuFallback(offres.lien_annonce)` |

**Edge Function** : `wa-send-new-offer` (à créer) — INSERT `offres` statut=`a_envoyer`.

---

## T3 · `proposition_visite_client` · UTILITY · fr

**Header** : `📅 Proposition de visite`

**Body (8 vars)** :
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

**Footer** : `Logisorama by Immo-rama.ch`

**Boutons (3 QR)** :
| # | Title | Payload |
|---|---|---|
| 1 | ✅ Oui je viens | `visit_propose_yes` |
| 2 | 🎥 Déléguer à un coursier | `visit_propose_delegate` |
| 3 | ❌ Non merci | `visit_propose_no` |

**Variables** :
| # | Source |
|---|---|
| `{{1}}` | `profiles.prenom` |
| `{{2}}` | `loadAgentName(visites.agent_id)` |
| `{{3}}` | `fmtPieces(offres.pieces)` |
| `{{4}}` | `offres.surface` |
| `{{5}}` | `offres.adresse` |
| `{{6}}` | `fmtPrixCHF(offres.prix)` |
| `{{7}}` | `fmtDateFR(visites.date_visite)` |
| `{{8}}` | `lienAnnonceOuFallback(offres.lien_annonce)` |

**Edge Function** : `wa-send-proposition-visite` (à enrichir).

---

## T4 · `visit_reminder_24h` · UTILITY · fr

**Header** : `🔔 Rappel visite demain`

**Body (9 vars)** :
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

**Footer** : `Logisorama by Immo-rama.ch`

**Boutons (3 QR)** :
| # | Title | Payload |
|---|---|---|
| 1 | ✅ Je confirme | `visit_remind_confirm` |
| 2 | 🎥 Déléguer | `visit_remind_delegate` |
| 3 | ❌ Annuler | `visit_remind_cancel` |

**Variables** :
| # | Source |
|---|---|
| `{{1}}` | `profiles.prenom` |
| `{{2}}` | `fmtHeureFR(visites.date_visite)` |
| `{{3}}` | `fmtPieces(offres.pieces)` |
| `{{4}}` | `offres.surface` |
| `{{5}}` | `offres.adresse` |
| `{{6}}` | `fmtPrixCHF(offres.prix)` |
| `{{7}}` | `offres.etage` ou `"—"` |
| `{{8}}` | `lienAnnonceOuFallback(offres.lien_annonce)` |
| `{{9}}` | `loadAgentName(visites.agent_id)` |

**Edge Function** : `cron-visit-reminders` (à enrichir, cron J-1 09:00 Europe/Zurich).

---

## T5 · `post_visite_question` · UTILITY · fr

**Header** : `✨ Comment s'est passée votre visite ?`

**Body (7 vars)** :
```
Bonjour {{1}} !

Comment s'est passée votre visite de :
🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois

🔗 Annonce : {{6}}

Souhaitez-vous postuler ? L'agent {{7}} prépare le dossier en 24h 📁
```

**Footer** : `Logisorama by Immo-rama.ch`

**Boutons (3 QR)** :
| # | Title | Payload |
|---|---|---|
| 1 | ✅ Oui je postule | `post_visit_apply_yes` |
| 2 | 🤔 J'hésite | `post_visit_apply_maybe` |
| 3 | ❌ Pas pour moi | `post_visit_apply_no` |

**Variables** :
| # | Source |
|---|---|
| `{{1}}` | `profiles.prenom` |
| `{{2}}-{{6}}` | offre |
| `{{7}}` | agent prénom |

**Edge Function** : `cron-post-visit-question` (rebadge de `wa-send-post-visite`).

---

## T6 · `candidature_demandee_client` · UTILITY · fr

**Header** : `📨 Dossier en préparation`

**Body (8 vars)** :
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

**Boutons (1 URL + 1 QR)** :
- [URL] `📁 Suivre mon dossier` → `https://logisorama.ch/client/candidatures`
- [QR] `❓ J'ai une question` → `candidature_question`

**Variables** : prénom · pièces · surface · adresse · prix · régie · lien · agent.

**Edge Function** : `wa-send-candidature-demandee` (NEW) — INSERT `candidatures`.

---

## T7 · `candidature_refus_client` · UTILITY · fr

**Header** : `📩 Réponse de la régie`

**Body (7 vars)** :
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

**Boutons (2 URL)** :
- [URL] `🔍 Voir les nouvelles offres` → `https://logisorama.ch/client/annonces`
- [URL] `💬 En parler à l'agent` → `https://logisorama.ch/client/messagerie`

**Edge Function** : `wa-send-candidature-refus` (NEW).

---

## T8 · `application_accepted` · UTILITY · fr

**Header** : `🎉 Candidature acceptée !`

**Body (8 vars)** :
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

**Boutons (1 URL + 1 QR)** :
- [URL] `📄 Voir le dossier` → `https://logisorama.ch/client/candidatures`
- [QR] `🙏 Merci, je signe` → `application_thanks`

**Edge Function** : `wa-send-application-accepted` (à enrichir EN→fr).

---

## T9 · `signature_scheduled` · UTILITY · fr

**Header** : `🖋️ Signature du bail planifiée`

**Body (10 vars)** :
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

**Boutons (2 URL)** :
- [URL] `🗺️ Google Maps` → `https://www.google.com/maps/search/?api=1&query={{lieu_url_encoded}}`
- [URL] `📋 Mon dossier` → `https://logisorama.ch/client/candidatures`

**Edge Function** : `wa-send-signature-scheduled` (à enrichir).

---

## T10 · `etat_des_lieux_scheduled` · UTILITY · fr

**Header** : `📋 État des lieux planifié`

**Body (9 vars)** :
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

**Boutons (1 URL + 1 QR)** :
- [URL] `📋 Détails dossier` → `https://logisorama.ch/client/candidatures`
- [QR] `🔄 Demander un autre créneau` → `edl_reschedule`

**Edge Function** : `wa-send-edl-scheduled` (à enrichir).

---

## T11 · `keys_handover` · UTILITY · fr

**Header** : `🔑 Remise des clés confirmée`

**Body (7 vars)** :
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

**Boutons (1 URL + 1 QR)** :
- [URL] `🏡 Mon espace` → `https://logisorama.ch/client`
- [QR] `🎁 Je parraine ({{7}})` → `referral_start` *(`{{7}}` = nb_amis_invites_actuels ou `"démarrer"`)*

**Edge Function** : `wa-send-keys-handover` (NEW) — UPDATE `candidatures.cles_remises_at`.

---

## T12 · `google_review_request` · MARKETING · fr

**Header** : `⭐ Votre avis compte !`

**Body (6 vars)** :
```
Bonjour {{1}},

Cela fait une semaine que vous avez emménagé au {{2}} 🏡

Votre expérience avec {{3}} et l'équipe Logisorama vous a-t-elle convaincu ?

📝 Un avis Google nous aide ÉNORMÉMENT à aider d'autres locataires en galère.

⭐ Note moyenne actuelle : {{4}} ({{5}} avis)

Merci d'avance ! 🙏 — {{6}}
```

**Boutons (2 URL)** :
- [URL] `⭐ Laisser un avis Google` → `https://g.page/r/<google_review_id>/review`
- [URL] `🎁 Voir mon parrainage` → `https://logisorama.ch/client/parrainage`

**Edge Function** : `cron-google-review-J7` (NEW) — cron quotidien J+7 après `cles_remises_at`.

---

## T13 · `mandate_expiring_30d` · UTILITY · fr

**Header** : `📅 Votre mandat expire bientôt`

**Body (4 vars)** :
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

**Boutons (3 QR)** :
| # | Title | Payload |
|---|---|---|
| 1 | 🔄 Renouveler | `mandate_renew` |
| 2 | 💸 Annuler & remb. | `mandate_cancel_refund` |
| 3 | ✅ J'ai trouvé seul | `mandate_found_alone` |

**Edge Function** : `wa-send-mandate-expiring` (à enrichir).

---

## T14 · `agent_message` · UTILITY · fr

**Header** : `💬 Message de votre agent`

**Body (4 vars)** :
```
Bonjour {{1}},

{{2}} vous a écrit :

« {{3}} »

📎 Concerne : {{4}}
```

**Boutons (1 URL + 1 QR)** :
- [URL] `💬 Ouvrir messagerie` → `https://logisorama.ch/client/messagerie`
- [QR] `📞 Me rappeler` → `agent_message_callback`

**Edge Function** : `wa-send-agent-message` (NEW) — trigger sur `messages.notify_whatsapp = true`.

---

## T15 · `alerte_agent_reponse_visite` · UTILITY · fr (interne agent)

**Header** : `📲 Réponse client visite`

**Body (8 vars)** :
```
{{1}} a répondu à la proposition de visite :

🏠 {{2}} pièces — {{3}} m²
📍 {{4}}
💰 {{5}} CHF/mois
📅 Créneau : {{6}}

💬 Réponse : {{7}}

🔗 Annonce : {{8}}
```

**Boutons (1 URL + 2 QR)** :
- [URL] `📋 CRM` → `https://logisorama.ch/agent/visites`
- [QR] `📞 Appeler client` → `agent_call_client_now`
- [QR] `🎥 Trouver coursier` → `agent_dispatch_courier`

**Edge Function** : `wa-notify-agent-visit-response` (NEW).

---

## T16 · `alerte_agent_candidature` · UTILITY · fr (interne agent)

**Header** : `📨 Nouvelle candidature client`

**Body (8 vars)** :
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

**Boutons (1 URL + 1 QR)** :
- [URL] `📁 Préparer dossier` → `https://logisorama.ch/agent/candidatures`
- [QR] `✅ Pris en charge` → `agent_candidature_taken`

**Edge Function** : `wa-notify-agent-candidature` (NEW).

---

## Annexe — Mapping Payloads QR → Handlers webhook

| Payload | Action |
|---|---|
| `new_offer_visit_request` | flag `offres.client_request_visit_at` + notif agent |
| `visit_propose_yes` | `visites.statut='planifiee'` + ack |
| `visit_propose_delegate` | `visites.est_deleguee=true` + statut `proposee→deleguee` + notif coursier |
| `visit_propose_no` | `visites.statut='annulee'` + ack |
| `visit_remind_confirm` | flag `visites.confirmed_24h_at` |
| `visit_remind_delegate` | idem délégation |
| `visit_remind_cancel` | `visites.statut='annulee'` + alerte agent T15 |
| `post_visit_apply_yes` | déclenche T6 + T16 |
| `post_visit_apply_maybe` | flag `clients.maybe_followup_at` (J+1) + notif agent |
| `post_visit_apply_no` | `visites.feedback_agent='refus_client'` + notif agent |
| `candidature_question` | sendText + ticket message |
| `application_thanks` | sendText "merci" + log |
| `edl_reschedule` | flag `candidatures.edl_reschedule_requested` + notif agent |
| `referral_start` | sendText avec URL parrainage |
| `agent_message_callback` | notif agent "rappel demandé" |
| `agent_call_client_now` | côté agent — log call intent |
| `agent_dispatch_courier` | côté agent — open visites_deleguees flow |
| `agent_candidature_taken` | `candidatures.statut='en_preparation'` |
| `mandate_renew` / `mandate_cancel_refund` / `mandate_found_alone` | déjà handlers existants |

---

## Annexe — Edge Functions à créer / enrichir

| EF | Status | Trigger |
|---|---|---|
| `wa-send-welcome` | OK | activation mandat |
| `wa-send-new-offer` | NEW | INSERT offres |
| `wa-send-proposition-visite` | ENRICHIR (4→8) | INSERT visites statut=proposee |
| `cron-visit-reminders` | ENRICHIR | cron J-1 09:00 |
| `cron-post-visit-question` | RENAME | cron H+3 post visite |
| `wa-send-candidature-demandee` | NEW | INSERT candidatures |
| `wa-send-candidature-refus` | NEW | UPDATE candidatures.statut=refusee |
| `wa-send-application-accepted` | ENRICHIR | UPDATE agent_valide_regie |
| `wa-send-signature-scheduled` | ENRICHIR (3→10) | UPDATE date_signature_choisie |
| `wa-send-edl-scheduled` | ENRICHIR (3→9) | UPDATE date_etat_lieux |
| `wa-send-keys-handover` | NEW | UPDATE cles_remises_at |
| `cron-google-review-J7` | NEW | cron quotidien |
| `wa-send-mandate-expiring` | ENRICHIR (2→4) | cron J-30 mandat |
| `wa-send-agent-message` | NEW | INSERT messages flag |
| `wa-notify-agent-visit-response` | NEW | depuis webhook |
| `wa-notify-agent-candidature` | NEW | INSERT candidatures |
