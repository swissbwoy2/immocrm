# Routine automatique de recherche et scoring d'offres

**Sécurité clé** : la routine est livrée **désactivée** et en **mode dry-run**. Aucune offre réelle, aucun email, aucun WhatsApp n'est envoyé tant qu'un admin n'a pas basculé les deux interrupteurs dans `/admin/auto-offres`.

## 1. Base de données (migration)

Nouvelles tables :

- `auto_offer_runs` — historique de chaque exécution (dry_run, compteurs, résumé JSON, clients sous objectif de 5 offres/jour).
- `auto_offer_candidates` — chaque annonce évaluée pour un client (score, breakdown, plafond dur budget, would_send, raison).

Nouveaux flags dans `app_config` :

- `auto_offers_enabled` = `false` (défaut)
- `auto_offers_dry_run` = `true` (défaut)

RLS : admin lit tout ; service_role écrit (les edge functions utilisent service_role).

## 2. Edge function `auto-offers-run`

Périmètre clients : tous SAUF `statut ∈ ('reloge','mandat_annule')`. Les mandats expirés sont inclus. On charge `region_recherche`, `pieces`, `budget_max`, `revenus_mensuels`, `type_bien`, `souhaits_particuliers`, plus l'agent principal via `client_agents.is_primary`.

Source V1 : `immobilier.ch` (liste rendue serveur, fetch HTTP + parsing HTML). Extraction par annonce : titre, adresse, npa/ville, pièces, surface, loyer net, charges, loyer CC, régie, lien, id.

Dédoublonnage :
- Global du run : signature `adresse|pièces|surface|loyer_cc` normalisée.
- Par client : contre `offres` déjà envoyées à ce client sur la même adresse.

Scoring /10 : région (3) + pièces (3) + budget (3) + type bien (1). Seuil de rétention : > 7.

Règles dures inviolables :
- Loyer CC ≤ `revenus_mensuels / 3`. Si `revenus_mensuels` null → `budget_max` comme plafond dur, mentionné dans `reason`.
- Pièces annonce ≥ pièces demandées. Jamais moins ; plus = léger malus.

Souple : préférer ≤ `budget_max`.

Objectif 5 offres/jour/client : si moins après dédoublonnage, on élargit d'abord aux localités proches, puis on autorise plus de pièces (jamais moins), toujours sous le plafond dur, jamais sous 7/10.

Détails visite : liste ne suffit pas → placeholder « visite à fixer manuellement » ; régie inscrite si présente dans la carte liste. Champs prévus pour un rendu cloud + IA en phase 2.

## 3. Comportement selon les flags

- `dry_run = true` OU `enabled = false` : on écrit uniquement dans `auto_offer_candidates` + `auto_offer_runs`, avec `would_send = true` pour ceux qui partiraient.
- `enabled = true` ET `dry_run = false` : on crée les offres réelles en **réutilisant exactement la logique** de `src/pages/agent/EnvoyerOffre.tsx` `handleSubmit` :
  1. Insert `offres` (client_id, agent_id, adresse, prix = loyer net, surface, pieces, description, disponibilite, statut `envoyee`, lien_annonce, commentaires avec régie/contact/visite).
  2. `supabase.functions.invoke('wa-send-new-offer', { body: { offre_id }})`.
  3. Trouver/créer `conversations` du client, insérer `messages` d'offre.
  4. Si créneau connu, créer `visites` (statut `proposee`).
  5. Protection anti-doublon existante respectée.

Pour éviter toute divergence future avec `EnvoyerOffre.tsx`, la logique de création est isolée dans un helper partagé côté edge function.

## 4. Cron

7×/jour heure Europe/Zurich (via pg_cron en UTC) : 07:00, 09:30, 12:30, 14:30, 16:30, 18:00, 20:00. Chaque tick appelle l'edge function avec service role.

## 5. Page admin `/admin/auto-offres` (rôle admin)

- Deux `Switch` : « Activer la routine » et « Mode dry-run » (persistés dans `app_config`).
- Bouton « Lancer un run maintenant » (invoke edge).
- Table des derniers `auto_offer_runs` (compteurs, dry_run, timings).
- Table des candidats du run sélectionné : client, bien, score, loyer CC vs plafond dur, would_send, raison.
- Lien ajouté dans la sidebar admin.

## Détails techniques

- Nouvelle edge function : `supabase/functions/auto-offers-run/index.ts` (Deno, service role, verify_jwt = false ; protégée par un secret partagé `AUTO_OFFERS_CRON_SECRET` requis en header pour les invocations cron et un check admin JWT pour l'invocation manuelle depuis l'UI).
- Parsing HTML immobilier.ch : `deno-dom` via `npm:linkedom` (léger, éprouvé).
- Nouveau composant : `src/pages/admin/AutoOffres.tsx`, route ajoutée dans `App.tsx`, item sidebar dans `AppSidebar.tsx`.
- Aucune modification de `src/pages/agent/EnvoyerOffre.tsx`.
- pg_cron + pg_net déjà utilisés dans le projet ; on ajoute 7 jobs pointant vers l'URL de la fonction avec l'anon key + le secret.

## Livraison

En un seul lot :
1. Migration (tables + flags + policies + GRANT).
2. Cron insert (via insert tool, contient l'anon key et l'URL).
3. Edge function `auto-offers-run` + secret `AUTO_OFFERS_CRON_SECRET`.
4. Page admin + route + sidebar.

Aucun envoi réel possible avant bascule manuelle des deux interrupteurs.
