## Objectif

Remplacer le contenu de la page **Mentions légales FR** par les 12 nouvelles sections datées du **8 juin 2026** et corriger le sujet d'email contenant encore « ImmoRésidence » dans l'Edge Function `mandate-submit-signature`.

## Fichiers modifiés (2 uniquement)

### 1. `src/pages/legal/MentionsLegales.tsx`

Réécriture complète du contenu en conservant :
- wrapper, layout, bouton retour, switcher FR/EN/DE
- `LAST_UPDATE = '8 juin 2026'`
- `useEffect` pour `title` + `meta description`
- typographie (`h2 text-2xl font-semibold mb-3`, `section space-y-8`, etc.)

Meta description mise à jour :
> Mentions légales de Logisorama, service exploité par Immo-rama.ch — entreprise individuelle Christ Ramazani, IDE CHE-442.303.796, siège à Crissier.

**12 sections intégrées** :
1. Éditeur du site (Immo-rama.ch entreprise individuelle, Christ Ramazani, Chemin de l'Esparcette 5 / 1023 Crissier, IDE CHE-442.303.796, info@immo-rama.ch, 021 625 95 05)
2. Responsable de la publication
3. Hébergement (Lovable Cloud + Supabase, UE quand techniquement disponible)
4. Nature du service (relocation, pas de garantie, renvoi aux documents contractuels)
5. Propriété intellectuelle (signes distinctifs Logisorama / Immo-rama.ch)
6. Données personnelles — `Link` vers `/politique-confidentialite`, nLPD + RGPD
7. Cookies et traceurs — Google Ads / Meta Pixel / TikTok Pixel, consentement par défaut refusé
8. Liens externes
9. Limitation de responsabilité
10. Sécurité du site
11. Droit applicable et for — Crissier, VD
12. Contact — `mailto:info@immo-rama.ch`

### 2. `supabase/functions/mandate-submit-signature/index.ts` (ligne 167)

- Avant : `subject: "Confirmation de votre mandat de recherche – ImmoRésidence"`
- Après : `subject: "Confirmation de votre mandat de recherche – Immo-rama.ch"`

Aucun autre contenu de la fonction n'est modifié.

## Hors scope

Pas de modification de : pages EN/DE, anciennes migrations SQL, routes, footers, formulaires, schéma DB, dépendances, autres Edge Functions.

Les occurrences résiduelles de « Immo-Rama Sàrl » / « ImmoRésidence Sàrl » présentes uniquement dans d'anciennes migrations SQL (`20260501151209_*`, `20260306211757_*`) **restent intactes** et **ne sont pas comptées dans l'audit final**.

## Audit final (code actif uniquement, hors migrations historiques)

- 12 sections présentes dans `MentionsLegales.tsx`, `LAST_UPDATE = '8 juin 2026'`
- Meta description contient « entreprise individuelle Christ Ramazani, IDE CHE-442.303.796, siège à Crissier »
- Lien vers `/politique-confidentialite` présent en §6, `mailto:info@immo-rama.ch` en §12
- Sujet email = `Confirmation de votre mandat de recherche – Immo-rama.ch`
- 0 occurrence active de « ImmoRésidence », « Sàrl », « SARL » dans `src/`, `index.html`, Edge Functions actives
- Pages EN/DE inchangées, migrations historiques non modifiées
