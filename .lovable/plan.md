# Test workflow complet — client Titan

**Client cible** : Titan Assyxc (`849ab000-877f-41c2-9e70-6cee7a180950`)
**WhatsApp** : 0795912937 (opt-in OK)
**Agent assigné** : `6fe4d48a-a99b-490a-887b-648f47ceff33`

## Objectif

Dérouler **chaque étape** du cycle de vie d'une candidature pour vérifier templates WhatsApp + UI app, depuis la réception d'offre jusqu'à la remise des clés + avis Google.

## Phase 1 — Test "validation manuelle"

1. **Offre A** déjà existante (`30d34751…` Orbe 3.5p) → on l'utilise comme cas "validation manuelle".
   - Vérif côté Titan : réception WA `new_offer_available` + visible dans `/client/offres-recues`.
   - Action attendue de Titan : valider l'offre dans l'app → trigger `wa-send-offre-validee` côté agent.
2. **Pause** : on attend ta confirmation que Titan a validé avant de continuer.
3. Une fois validée → création **visite physique non déléguée** à **H + 2 minutes** sur cette offre.
   - Trigger attendus : `visite_confirmee_client` (immédiat) + cron `visit_reminder_h-1` ne se déclenchera pas car <1h, donc on enverra manuellement le rappel pour test.
   - À H+2min : marquer la visite `effectuee` côté agent → bandeau "Avez-vous bien effectué cette visite ?" doit apparaître dans `/client/visites`.
   - Cron `wa-send-post-visite` (H+3) → on déclenchera manuellement pour ne pas attendre.
   - Test boutons WA **VISITE_OUI → POSTULER** → création candidature → templates `candidature_demandee_client` + `alerte_agent_candidature`.
   - Puis on déroule la timeline candidature : `dossier_envoye` → `dossier_accepte` → `bail_signe` → `cles_remises` → `avis_google` (lien https://g.page/r/CQJCKNAJlouGEAE/review).

## Phase 2 — Test "3 offres en parallèle, visites groupées"

Créer **3 offres** distinctes pour Titan (statut `envoyee`) :

| # | Adresse | Pièces | Prix CHF | Type visite |
|---|---------|--------|----------|-------------|
| B | Rue du Test 1, 1003 Lausanne | 2.5 | 1450 | Physique non déléguée |
| C | Av. Démo 12, 1006 Lausanne | 3.5 | 1890 | **Déléguée coursier** |
| D | Ch. Workflow 7, 1010 Lausanne | 4.5 | 2350 | Physique non déléguée |

- Chaque offre déclenche `new_offer_available` (1 WA Titan + 1 WA agent via `wa-notify-agent-new-offer` si câblé).
- Pour chaque offre, créer **immédiatement** une visite à **H + 2 minutes** :
  - B & D : visites physiques classiques (statut `confirmee`) → templates `visite_confirmee_client`.
  - C : visite **déléguée** assignée au coursier → template `visite_deleguee_client` + notif coursier.
- Cela permet de tester en moins de 5 minutes :
  1. Réception 3 offres (3 WA Titan)
  2. 3 visites confirmées (3 WA Titan)
  3. À H+2min : marquer effectuées (B+D par agent, C par coursier avec compte-rendu photos)
  4. Bandeau confirmation client (les 3) → confirmation → boutons Postuler
  5. 3 candidatures créées → 3 WA Titan + 3 WA agent
  6. Timeline candidature visible dans `/client/candidatures` (et `/client/visites-deleguees` pour C)

## Détails techniques

- Toutes les insertions se font via `supabase--insert` (data only, pas de migration).
- Visites créées avec `date_visite = now() + interval '2 minutes'`, `statut = 'confirmee'`, `agent_id = 6fe4d48a-…`.
- Visite déléguée C : `delegue_a_coursier_id` = coursier actif (à identifier juste avant).
- Pour court-circuiter le cron post-visite (qui tourne H+3), on appellera manuellement `wa-send-post-visite` avec le `visite_id` une fois marquée `effectuee`.
- Aucun changement de code, aucun changement de schéma — uniquement seed de données + appels d'edge functions.

## Questions avant exécution

1. **Phase 1 d'abord** (1 offre → on attend validation Titan) puis Phase 2, ou **on lance tout en parallèle** maintenant pour tester plus vite ?
2. Pour la visite **déléguée C** : as-tu un coursier précis à utiliser, ou je prends le premier coursier actif trouvé ?
3. Veux-tu que je dérouloule **automatiquement** la timeline candidature jusqu'à `cles_remises` + avis Google après la création des candidatures, ou on s'arrête au stade `dossier_envoye` pour que tu puisses tester chaque étape manuellement côté agent ?
