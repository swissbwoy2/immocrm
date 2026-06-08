# Vérifications finales P0 — Mandat Logisorama

Aucune nouvelle modification structurelle n'est nécessaire : les corrections P0 précédentes sont en place. Ce plan documente les vérifications demandées et un seul ajustement de formulation interne.

## 1. État vérifié côté base de données

```
version           is_active   created_at
v3.2_2026-06-08   true        2026-06-08
v3.1              false       2026-03-06
```

Contenu de la version active :
- `ImmoRésidence` / `Immo-Rama Sàrl` / `ImmoRésidence Sàrl` → **absents**
- `Berne` comme for → **absent**
- IDE `CHE-442.303.796` → **présent**
- Adresse Crissier → **présente**

7 mandats déjà signés restent liés à `v3.1` (intacts, non réécrits).

## 2. État vérifié côté code actif (parcours mandat / emails / PDF)

- `noreply@immoresidence.ch` → **0 occurrence** dans `src/` et `supabase/functions/`
- `Berne` comme for / juridiction → **0 occurrence** dans `supabase/functions/`
- Mentions de `Berne` restantes dans `src/` sont **légitimes** et conservées :
  - `PolitiqueConfidentialite.tsx` → adresse officielle du PFPDT (Feldeggweg 1, 3003 Berne)
  - `swissRealEstateTax.ts`, `SwissGlobe3D.tsx`, listes cantons (`AddProprietaireDialog`, `AddImmeubleDialog`, `StepLocalisation`) → canton de Berne dans une liste de cantons suisses
  - `swissRomandeLocations.ts` → commune de Bernex (GE)

## 3. Domaine d'envoi email — confirmé

`notify.logisorama.ch` est **vérifié en production** (statut ✅ Verified, NS délégués à Lovable). Le fallback `noreply@notify.logisorama.ch` déjà en place dans `mandate-submit-signature/index.ts` est donc valide. **Aucun changement requis.**

## 4. Ajustement unique de formulation interne — `.lovable/plan.md`

Le plan interne mentionne actuellement « consentement implicite ». Cette formulation est juridiquement imprudente.

Remplacer dans la section 7 du fichier `.lovable/plan.md` :

> « le consentement implicite est tracé par l'acceptation globale + signature_hash »

par :

> « En P0, l'acceptation globale du mandat informe le client des traitements nécessaires à l'exécution du mandat et trace la version acceptée via `signature_hash`, `contract_version_id`, `signed_at`, IP et user-agent lorsque disponibles. Les consentements optionnels ou séparés (WhatsApp non indispensable, marketing, transmission tiers / co-candidats) restent à traiter dans une migration P1 dédiée. »

Aucun autre fichier n'est modifié. Aucune migration SQL. Aucune logique d'envoi email touchée. Aucun mandat signé impacté.

## 5. Résumé de conformité P0 (à confirmer après application)

- v3.1 intacte, conservée pour les 7 mandats déjà signés
- v3.1 désactivée uniquement pour les nouvelles signatures
- v3.2_2026-06-08 active pour les nouveaux mandats
- Identité complète Immo-rama.ch (IDE + Crissier + contacts) présente
- Article 9 LPD renforcé (finalités, catégories, durée, droits, contact, PFPDT)
- For Vaud / Lausanne utilisé partout (contrat actif, CGV legacy, PDFs, edge functions)
- Fallback email pointe vers `notify.logisorama.ch` (domaine vérifié)
- Consentements séparés explicitement listés P1 avec migration schéma requise
- Aucune migration SQL historique modifiée
- Aucune réécriture des clauses sensibles (acompte, non-contournement, exclusivité, résiliation, art. 404 CO) — réservées P1 avec validation juriste

## Hors périmètre

Tout reste hors P0 jusqu'à validation juriste : refonte clauses sensibles, ajout colonnes booléennes consentements séparés, mise à jour `mandate-update-draft` / `mandate-submit-signature` pour granularité, nouvelles entrées `LEGAL_CHECKBOXES`.
