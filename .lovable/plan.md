## Constat

Sur `/admin/leads`, la "LeadShort List" (carrousel **À traiter en priorité**) remonte actuellement **tous** les RDV bureau au statut `en_attente`, peu importe leur date. Résultat :
- 9 RDV `en_attente` en base, dont certains datent du 22 avril, remontent comme "à confirmer" alors qu'ils sont **passés** et probablement déjà traités hors-app → l'admin a l'impression que tout a été "remis à zéro".
- Le carrousel affiche un pictogramme `📞` et le libellé est ambigu, alors qu'il n'existe plus que des **RDV bureau** (le RDV téléphonique a été retiré côté formulaire public).

## Plan

### 1. Recentrer la LeadShort List sur les RDV bureau **actionnables**
Dans `src/pages/admin/Leads.tsx` (`hotItems`) :
- Garder dans le hot uniquement les RDV bureau `en_attente` **futurs** (`slot_start >= maintenant`) ou **du jour même passé de moins de 2h** (cas d'un RDV oublié à confirmer en début de journée).
- Les RDV `en_attente` plus anciens que ça sont considérés stales et **n'apparaissent plus** dans le hot — ils restent visibles dans la liste/pipeline classique pour ne rien perdre.
- Conserver l'affichage des RDV `confirme` dans les 24h à venir et des leads qualifiés froids.

### 2. Étiqueter clairement "RDV bureau" partout dans la LeadShort List
Dans `src/components/admin/leads/LeadsHotCarousel.tsx` :
- Remplacer le pictogramme `📞` par `📍` et préfixer la ligne par **"RDV bureau"** suivi de la date/heure et du statut (`à confirmer` / `confirmé`).
- Garder le bouton **Confirmer** uniquement pour les `en_attente`.

Dans `src/components/admin/leads/LeadsKpiStrip.tsx` :
- Renommer la KPI actuelle "RDV" en **"RDV bureau"** pour lever toute ambiguïté avec un éventuel ancien "RDV téléphonique".
- Conserver le sous-libellé "X à confirmer · Y confirmés".

### 3. Optionnel : petit garde-fou côté KPI "à confirmer"
- Ne compter dans `rdvPending` que les `en_attente` non stales (même règle que le hot), pour que le chiffre affiché corresponde à ce qui est réellement actionnable dans le carrousel.

## Détails techniques

Fichiers modifiés :
- `src/pages/admin/Leads.tsx` — logique `hotItems` + éventuellement `kpis.rdvPending`
- `src/components/admin/leads/LeadsHotCarousel.tsx` — libellé "RDV bureau" + icône
- `src/components/admin/leads/LeadsKpiStrip.tsx` — renommage KPI

Aucune migration DB, aucun changement aux Edge Functions, aucun `status` modifié sur les RDV existants — on filtre simplement l'affichage.

## Question ouverte
Pour les 9 RDV `en_attente` historiques (avril → début mai) qui n'apparaîtront plus dans le hot : préfères-tu qu'on te propose plus tard un **bouton de purge** ("marquer ces RDV passés non confirmés comme `annule`") pour nettoyer la base ? Sinon on les laisse tels quels, ils restent visibles dans le pipeline.