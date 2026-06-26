# Parcours Achat Immobilier — Plan exécuté

## Périmètre

Accompagnement à l'**achat immobilier** (acheteur), greffé sur l'infrastructure location existante sans la modifier.
Aucune refonte de design, aucune nouvelle direction artistique, aucune nouvelle architecture : on clone les patterns existants et on ne fait apparaître l'expérience achat que lorsque le client a un `purchase_project` actif.

## Règles strictes appliquées

- Pas de modification du parcours location.
- Pas de modification du parcours relouer / locataire sortant.
- Pas de modification du parcours vente / mandat propriétaire.
- Sidebar, cartes, typographie, badges, gradients : strictement identiques au parcours location.
- Aucune donnée Stana / Cendrine insérée automatiquement (clients.id à confirmer manuellement).
- Tous les taux financiers (intérêt théorique, entretien, amortissement, taux d'effort, fonds propres min, frais notaire) sont stockés dans `purchase_financing_settings` et modifiables — jamais hardcodés.
- Durée 60 jours = progression opérationnelle visible côté client.
  Les conditions juridiques (mandat, renouvellement, résiliation, remboursement) sont stockées séparément.
- Les documents achat réutilisent la table `documents` existante (étendue avec `purchase_project_id` + `purchase_category`) — même expérience d'upload qu'en location.

## Modèle de données

| Table | Rôle |
|---|---|
| `purchase_projects` | Dossier d'accompagnement, durée 60 j, statuts mandat/acompte, conditions juridiques séparées |
| `purchase_financing_settings` | Taux paramétrables (5 %, 1 %, 1 %, 33 %, 20 %, 5 %) éditables par admin |
| `purchase_financing_profiles` | Revenus détaillés, fonds propres cash / 3a / LPP / EPL, engagements, situation familiale, autorisations, calculs dérivés |
| `purchase_selected_properties` | Biens analysés |
| `purchase_visit_reports` | Rapports courtier (points forts/faibles, risques, estimation, recommandation) |
| `purchase_negotiations` | Offres et contre-offres, historique JSONB |
| `purchase_notary_steps` | Notaire, rendez-vous, signature, remise des clés |
| `purchase_project_steps` | 17 jalons (Activation → Financement → Recherche → Visites → Offre → Notaire) |
| `documents` (étendue) | `purchase_project_id` + `purchase_category` (revenus, fonds_propres, situation_financiere, situation_familiale, autorisations, bien_immobilier) |

RLS sur toutes : admin tout, agent assigné voit ses dossiers, client voit le sien via `clients.user_id = auth.uid()`.

## Calcul tenue des charges

`src/lib/purchaseFinancing.ts` — `computeFinancing(input, settings)` :
- Revenu total + revenu net après engagements
- Fonds propres cash (hors LPP) / fonds propres LPP / total
- Fonds propres requis (% configurable) + règle FINMA des 10 % durs minimum
- Hypothèque estimée
- Charges annuelles / mensuelles (intérêt + entretien + amortissement)
- Taux d'effort vs `taux_effort_max`
- Prix max finançable (par revenu) et capacité d'achat max (par fonds propres)
- Warnings explicites

## 17 étapes du parcours

Activation (3) → Financement (4) → Recherche (2) → Visites (3) → Offre (2) → Notaire (3).

## Espace client — branchement

`src/pages/client/Dashboard.tsx` dispatcher inchangé pour les autres parcours.
Ajout : si l'utilisateur a un `purchase_projects` actif → `DashboardAchat` (page dédiée premium, mêmes composants UI que les autres parcours).

`DashboardAchat` affiche :
- Header premium (parcoursType = "achat")
- Hero résumé + carte conseiller
- 4 KPI (étapes, biens, visites, capacité d'achat)
- Barre de progression 60 jours
- Carte tenue des charges (financement + capacité)
- Biens sélectionnés
- Rapports visite courtier
- Offre & négociation
- Notaire & remise des clés
- Timeline 17 étapes (par groupe)
- Documents par catégorie

## Page publique

`/accompagnement-achat` : hero + 6 value props + 6 étapes + CTA. Vocabulaire strictement acheteur (achat, financement, capacité, visite courtier, offre, négociation, notaire, remise des clés). Pas de mélange vendeur.

## Admin

L'admin verra automatiquement les nouvelles tables via les hooks et accède aux dossiers grâce aux policies RLS `has_role(... ,'admin')`. Le branchement de la fiche admin client (affichage des sections achat dans `ClientDetail.tsx`) sera ajouté dans la prochaine itération, sans modifier les autres parcours.

## Activation Stana & Cendrine

**Non automatique.** Aucune donnée n'a été insérée pour Stana ou Cendrine. La structure existe ; il suffira d'insérer un `purchase_projects` lié au bon `clients.id` quand celui-ci sera confirmé, puis seeder les 17 `purchase_project_steps`.

## Fichiers livrés

Code applicatif :
- `src/lib/purchaseFinancing.ts`
- `src/hooks/usePurchaseProject.ts`
- `src/components/achat/AchatProgressionBar.tsx`
- `src/components/achat/AchatStepsTimeline.tsx`
- `src/components/achat/AchatFinancingCard.tsx`
- `src/components/achat/AchatPropertiesList.tsx`
- `src/components/achat/AchatVisitReportsList.tsx`
- `src/components/achat/AchatNegotiationCard.tsx`
- `src/components/achat/AchatNotarySection.tsx`
- `src/components/achat/AchatDocumentsSection.tsx`
- `src/pages/client/DashboardAchat.tsx`
- `src/pages/AccompagnementAchat.tsx`

Modifications minimales :
- `src/pages/client/Dashboard.tsx` (dispatcher étendu)
- `src/App.tsx` (route publique `/accompagnement-achat`)

Migration base de données : 8 tables + extension `documents` + paramètres financiers seedés.
