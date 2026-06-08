# Conformité nLPD/RGPD — Lot 3 : bandeau cookies granulaire, consentement upload, i18n légal, audit textuel

## Objectif
Étendre la conformité par 4 livrables indépendants :
1. Nouveau bandeau cookies à 4 catégories + journalisation DB.
2. Checkbox consentement explicite sur les formulaires d'upload de documents sensibles.
3. Versions EN + DE des deux pages légales (mêmes clauses, mêmes numéros).
4. Audit textuel global + corrections (adresses, Sàrl, reCAPTCHA, "100 % conforme").

---

## 1. Bandeau cookies granulaire (4 catégories)

### Backend (migration)
Nouvelle table `cookie_consent_logs` :
- `id`, `user_id` (nullable, lié à auth.users si connecté), `anonymous_id` (uuid client localStorage), `ip_hash` (sha256), `user_agent`, `categories` (jsonb : `{necessary:true, analytics:bool, marketing:bool, personalization:bool}`), `policy_version` (text), `created_at`.
- GRANT INSERT à `anon` + `authenticated` ; GRANT ALL à `service_role`.
- RLS : INSERT ouvert (avec rate-limit côté Edge Function), SELECT réservé admin via `has_role`.

Edge function `log-cookie-consent` (verify_jwt=false) : hash IP côté serveur, insère la ligne. Validation Zod.

### Frontend
Remplacer `src/components/CookieConsentBanner.tsx` par une version 2 niveaux :
- **Bannière** : texte court + 3 boutons équivalents visuellement : "Tout refuser", "Personnaliser", "Tout accepter".
- **Modal "Personnaliser"** (nouveau `CookiePreferencesModal.tsx`) : 4 switches.
  - Nécessaires (lock ON, désactivé)
  - Analytiques
  - Marketing
  - Personnalisation
- À la confirmation : localStorage (`cookie-consent-v2` = objet JSON + version + date), appel `log-cookie-consent`, déclenche `grantTikTokConsent` / `grantGoogleAdsConsent` uniquement si la catégorie correspondante est ON (Analytics → granted ; Marketing → granted ; sinon denied).
- Lien permanent **"Gérer mes cookies"** dans le footer (`PublicFooter`, `LandingFooter`, `VendeurFooter`, `PublicSiteFooter`) ouvrant le modal.
- Refus par défaut maintenu (Consent Mode v2).

### Mise à jour Politique §11
Mentionner les 4 catégories et le lien "Gérer mes cookies".

---

## 2. Consentement upload documents sensibles

### Composant partagé
Nouveau `src/components/legal/SensitiveDocConsentCheckbox.tsx` :
- Checkbox shadcn obligatoire (validation Zod côté soumission).
- Texte : *« J'accepte que les documents transmis (fiche de salaire, extrait de poursuites, pièce d'identité, permis de séjour, contrat de travail) soient traités par Immo-rama.ch (Christ Ramazani) pour la constitution de mon dossier locataire et leur transmission aux régies, conformément à la [politique de confidentialité](/politique-confidentialite) — base : exécution du mandat (art. 31 al. 2 let. a nLPD) + consentement explicite (art. 6 al. 7 nLPD). »*
- Props : `value`, `onChange`, `required`, `name`.
- État du consentement transmis dans le `metadata` lors de l'upload Storage + persistance dans `documents.metadata` (champ jsonb existant) avec `{ consent: true, consent_at, policy_version }`.

### Intégration (3 lots)
- **Espace client** : `CandidateDocumentsSection`, `DocumentUpdateReminder`, `ExtractPoursuitesUploadDialog`, `RequestDocumentsDialog` (modal upload).
- **Formulaires publics mandat** : `RelouerMonAppartement` (formulaire), `pages/staff/MandatPrefill`, `NouveauMandat` (chercher), `MandatV3` parcours public.
- **Tous formulaires publics avec upload** : scan complet pour repérer les inputs `type="file"` côté public et brancher la checkbox.

### Stockage
Pas de nouvelle table. Le consentement est stocké :
- dans le champ `metadata` jsonb de la table `documents` lors de l'INSERT (pas de migration nécessaire) ;
- dans `cookie_consent_logs` n'est PAS utilisé pour les uploads (table séparée si demandé en v2).

---

## 3. Traductions EN + DE des pages légales

Créer :
- `src/pages/legal/MentionsLegales.en.tsx`, `.de.tsx`
- `src/pages/legal/PolitiqueConfidentialite.en.tsx`, `.de.tsx`

Traduction strictement clause à clause, **mêmes numéros 1→14**, mêmes tableaux, mêmes mentions Swiss-U.S. DPF / art. nLPD / clause reCAPTCHA-Typo3.

Routes :
- `/en/legal-notice`, `/en/privacy-policy`
- `/de/impressum`, `/de/datenschutz`

Sélecteur de langue (FR / EN / DE) en haut de chaque page légale, conservant la version cible.

Le footer reste en FR ; ajout discret de 3 chips langue à côté des liens légaux.

---

## 4. Audit textuel global

Corrections identifiées par scan :

| Fichier | Texte | Action |
|---|---|---|
| `supabase/functions/mandate-submit-signature/index.ts:182` | `ImmoRésidence Sàrl – Mandat de recherche immobilière` | → `Immo-rama.ch — Mandat de recherche immobilière` |
| `src/pages/MandatV3Suivi.tsx:102` | `ImmoRésidence Sàrl` | → `Immo-rama.ch` |

Vérifications supplémentaires (déjà clean au scan, à confirmer par grep final) :
- `Allée des Cèdres / Chavannes-près-Renens` : 0 occurrence.
- `reCAPTCHA / Typo3` : uniquement dans §11 (clause de non-utilisation).
- `100 % conforme / garanti conforme` : 0 occurrence dans le contenu public.

Re-scan final dans `src/`, `supabase/functions/`, `index.html`, templates email.

---

## Détails techniques
- Aucune dépendance nouvelle (shadcn Checkbox/Switch/Dialog déjà présents).
- Edge function `log-cookie-consent` : `verify_jwt=false`, CORS standard, hash IP côté serveur.
- Versioning policy : constante `POLICY_VERSION = '2026-06-08'` partagée (`src/lib/legal-version.ts`).
- Pas de modification des autres flux existants (mandat, billing, etc.).
- Tests visuels : bannière + modal sur mobile (safe-area), checkbox sur chaque formulaire ciblé.

## Hors périmètre
- Page Politique cookies "tableau cookie par cookie" : la modal granulaire couvre l'essentiel ; un tableau exhaustif reste optionnel pour une itération suivante.
- Registre des traitements, AIPD, DPA sous-traitants (organisationnel).
- Refonte du Consent Mode TikTok côté serveur (déjà géré client).
- Vérification du certificat DPF de chaque sous-traitant cas par cas.
