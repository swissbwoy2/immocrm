# Correction P0 — Mandat de recherche (Logisorama / Immo-rama.ch)

Périmètre strictement P0. Les clauses sensibles (acompte non-remboursable, non-contournement 12 mois, exclusivité, résiliation asymétrique, art. 404 CO) sont volontairement **exclues** et listées pour validation juriste en P1.

## Principes

- **Aucune réécriture des mandats signés** : la v3.1 (id `2c3a6689-…`) est liée à 7 mandats existants → on ne la touche pas, on crée une nouvelle version active.
- **Aucune migration SQL historique modifiée**.
- **Aucune modification** du schéma `mandates` ou des colonnes existantes dans ce P0.
- Formulations prudentes — jamais « 100 % conforme ».

## 1. Nouvelle version contractuelle `v3.2_2026-06-08`

Insertion dans `mandate_contract_texts` (data only, via insert tool) :
- `version = 'v3.2_2026-06-08'`, `is_active = true`
- Bascule de la v3.1 à `is_active = false` (les 7 mandats existants restent liés via `contract_version_id`, ils ne sont pas réécrits).

Contenu nouveau contrat (extraits clés modifiés ; le reste de la trame v3.1 conservé tel quel pour les clauses non-P0) :

### Article 1 — Parties et objet (réécrit)
Remplace toutes mentions « ImmoRésidence Sàrl » / « Sàrl » par :
> Le Client confie à **Immo-rama.ch**, entreprise individuelle exploitée par **M. Christ Ramazani**, siège **Chemin de l'Esparcette 5, 1023 Crissier (VD), Suisse**, IDE **CHE-442.303.796**, tél. **021 625 95 05**, email **info@immo-rama.ch** (ci-après « l'Agence »), un mandat de recherche immobilière selon les critères définis. L'Agence est tenue à une obligation de moyens et non de résultat.

### Article 9 — Protection des données (renforcé LPD)
Version complète conforme à l'audit : finalités explicites, catégories de données (incl. documents à haut niveau de protection : fiches salaire, extrait poursuites, permis, garants/co-candidats), destinataires (régies, propriétaires, sous-traitants techniques), durée de conservation, droits LPD (accès, rectification, suppression, opposition, retrait), contact `info@immo-rama.ch`, renvoi `/politique-confidentialite`, mention WhatsApp, consentement pour tiers.

### Article 12 — Droit applicable et for (corrigé)
> Droit suisse. Sous réserve des fors impératifs, **for à Lausanne (canton de Vaud)**, recours au Tribunal fédéral réservé.

### Clauses non touchées en P0
Art. 2 (exclusivité), 3 (durée/reconduction), 4 (commission), 5 (acompte CHF 300), 6 (résiliation), 11 (non-contournement) → **conservées texto** de v3.1, flaggées pour P1.

## 2. Fallback email — edge function active

`supabase/functions/mandate-submit-signature/index.ts` ligne 149 :
```
"noreply@immoresidence.ch"  →  "noreply@notify.logisorama.ch"
```
(domaine d'envoi déjà actif selon mémoire projet)

## 3. For legacy — parcours `mandat/`

`src/components/mandat/CGVContent.tsx` ligne 180 :
> « La juridiction compétente est Berne (Suisse)… »
→ « Le présent mandat est soumis au droit suisse. Sous réserve des fors impératifs, les tribunaux ordinaires du canton de Vaud sont compétents, for à Lausanne. »

## 4. Edge functions PDF — for Berne hardcodé

Deux fichiers contiennent encore « juridiction competente est Berne » dans le PDF généré :
- `supabase/functions/generate-full-mandat-pdf/index.ts:700`
- `supabase/functions/send-mandat-pdf/index.ts:648`

→ Remplacer par la formulation Vaud/Lausanne.

## 5. Bouton final — transparence acompte

`MandatV3Step7Signature` (parcours v3) : le CTA de soumission devient :
> **« Signer le mandat et confirmer l'acompte de CHF 300.– »**

Modification texte uniquement, pas de logique ni de design.

## 6. Bouton « Tout accepter » — P0 safe

Dans `MandatV3Step6Legal.tsx`, renommer le bouton **« Tout accepter »** → **« J'ai lu et j'accepte toutes les clauses »**. Conservé pour ne pas casser l'UX ; pas d'ajout de logique de scroll-tracking (hors périmètre P0).

## 7. Consentements séparés — **NON appliqués en P0**

L'ajout de checkboxes séparées (Politique de confidentialité, transmission régies, WhatsApp opt-in, marketing opt-in, confirmation tiers informés) nécessite :
- nouvelles colonnes booléennes sur `mandates` + `MandatV3FormData`,
- mise à jour edge functions `mandate-update-draft` et `mandate-submit-signature`,
- nouvelle entrée registry `LEGAL_CHECKBOXES`.

→ **Signalé** comme migration séparée à valider. Pas exécuté dans ce P0 pour respecter la règle « ne pas casser le schéma ».

En revanche, l'article 9 LPD du contrat v3.2 documente déjà explicitement ces traitements et le consentement implicite est tracé par l'acceptation globale + `signature_hash`.

## 8. Hors périmètre P0 (P1 — juriste requis)

- Acompte CHF 300 non-remboursable (LCD / équilibre contractuel)
- Non-contournement 12 mois (durée à challenger)
- Exclusivité + reconduction tacite (art. 404 CO impératif)
- Résiliation asymétrique
- Refonte des consentements séparés (schéma DB)

## Fichiers touchés

| Fichier | Type |
|---|---|
| `mandate_contract_texts` (DB row v3.2) | INSERT + UPDATE v3.1.is_active=false |
| `supabase/functions/mandate-submit-signature/index.ts` | edit fallback email |
| `supabase/functions/generate-full-mandat-pdf/index.ts` | edit for Berne→Vaud |
| `supabase/functions/send-mandat-pdf/index.ts` | edit for Berne→Vaud |
| `src/components/mandat/CGVContent.tsx` | edit for legacy |
| `src/components/mandat-v3/MandatV3Step6Legal.tsx` | renommage bouton |
| `src/components/mandat-v3/MandatV3Step7Signature.tsx` | texte CTA acompte 300.– |

## Vérifications finales

1. v3.1 conservée, `is_active=false`, 7 mandats signés inchangés.
2. v3.2 active, contient identité complète Immo-rama.ch + IDE + adresse Crissier.
3. Plus aucune occurrence active de « ImmoRésidence », « Sàrl », `noreply@immoresidence.ch`, « Berne » comme for.
4. Edge functions PDF régénèrent désormais le for Vaud.
5. CTA mentionne explicitement CHF 300.–.
6. Aucune migration de schéma exécutée.
7. Aucun ancien mandat signé modifié (vérif `SELECT count` inchangé).
