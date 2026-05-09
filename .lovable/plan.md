## Objectif

Refondre uniquement le template email **Location – Recherche appartement** pour maximiser la prise de RDV gratuit à Crissier (CTA dominant unique dans le hero). Activation en ligne reléguée en alternative en bas. Corriger le bug "Bonjour Marie" et nettoyer toute mention "Sàrl". Les 3 autres campagnes restent inchangées.

## Étape 0 — Ancres (bloquante)

Audit :
- `#analyse-dossier` : **existe** dans `src/components/landing/DossierAnalyseSection.tsx`.
- `#dossier-form` : **n'existe pas** → à créer.

Action sur `src/pages/Landing.tsx` :
- Ajouter `id="dossier-form"` sur le wrapper de `QuickLeadForm`.
- Ajouter un `useEffect` global qui lit `window.location.hash` au montage et appelle `document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Petit `setTimeout(50ms)` pour laisser React peindre les sections lazy.
- Tester clic réel sur les 2 ancres après ajout.

## Changements

### 1. `src/pages/Landing.tsx`
- Ajout `id="dossier-form"` sur la section `QuickLeadForm`.
- Ajout `useEffect` de scroll sur hash au mount.

### 2. `supabase/functions/send-followup-campaign/index.ts`

**Constantes en tête de fichier (configurables)** :
```ts
const LOCATION_CTA_RDV_HERO_URL  = 'https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_rdv_hero#analyse-dossier'
const LOCATION_CTA_RDV_FINAL_URL = 'https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_rdv_final#analyse-dossier'
const LOCATION_CTA_ACTIVATION_URL = 'https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_activation_secondaire#dossier-form'
const LOCATION_PREHEADER = 'Passe 30 min avec un expert Logisorama pour vérifier ton dossier, tes critères et tes chances.'
```

**Fix global "Marie" + fallback prénom** :
- Remplacer `lead.first_name?.trim() || 'cher futur client'` par `const firstName = lead.first_name?.trim() || ''`.
- `fakeLead` preview/test = `{ first_name: '', email: TEST_RECIPIENT }`.
- Aucune occurrence "Marie" ne doit subsister (`rg -n "Marie"` → 0).

**Sécurité — échappement systématique** :
- Toute injection de `firstName` (HTML **et** sujet) passe par `escapeHtml(firstName)` côté HTML, et par une fonction de stripping sujet (retrait des caractères de contrôle / sauts de ligne) pour le sujet Resend. Jamais d'injection brute.

**Helper `buildLocationSubject(firstName: string): string`** :
- Avec prénom : `${sanitizedFirstName}, on analyse ta recherche d'appart gratuitement 👋`
- Sans prénom : `On analyse ta recherche d'appart gratuitement 👋`

**Routage subject au moment de l'envoi (Resend)** :
- Dans le bloc qui appelle `sendViaResend(...)` pour `mode === 'send'` ET `mode === 'test'`, si `campaign.campaign_key === 'location'`, on remplace `subject` par `buildLocationSubject(firstName)`. Sinon, on garde `campaign.subject` actuel.
- Idem côté `mode === 'preview'` : le JSON de retour expose `subject = buildLocationSubject('')` pour Location (pour cohérence d'aperçu UI).

**Nouveau renderer `renderLocationEmail(campaign, lead, unsubscribeToken)`** appelé uniquement si `campaign_key === 'location'`. `renderEmail` existant reste utilisé pour achat/vente/rénovation.

**Preheader invisible** dans le `<body>` du HTML Location, juste après l'ouverture, compatible Gmail / Apple Mail / Outlook :
```html
<div style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;color:#F5F5F0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${escapeHtml(LOCATION_PREHEADER)}
</div>
<div style="display:none;max-height:0;overflow:hidden;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
```

**Structure HTML (mobile-first, 600px max, tables imbriquées, aucune grille flex/grid)** :
1. Préheader caché (ci-dessus)
2. Badge `👑 Service premium de recherche d'appartement en Suisse romande`
3. Logo Immo-Rama centré, hauteur max 70px
4. **H1** : `Bonjour{ ' '+firstName si présent}, viens faire analyser ta recherche gratuitement.` — taille 26px mobile / 30px desktop, line-height 1.25
5. Sous-titre : `Tu cherches un appartement en Suisse romande ? Passe à nos bureaux de Crissier : un expert Logisorama analyse ton dossier, tes critères et ta situation en 30 minutes.`
6. **CTA principal** (fond plein doré `#D4A853`, texte noir, padding 18×32, ombre légère, **largeur 100% en mobile, max-width 320px**) → `📍 Réserver mon RDV gratuit à Crissier` → `LOCATION_CTA_RDV_HERO_URL`
7. Sous-texte CTA italique doré clair : `30 min avec un expert · 100 % gratuit · Sans engagement`
8. Bloc bénéfices encadré (5 lignes, checks dorés)
9. Preuve sociale 1 ligne : `⭐⭐⭐⭐⭐ Plus de 500 locataires accompagnés en Suisse romande · Avis Google vérifiés`
10. **3 cartes confiance** en table 3 colonnes desktop, **empilées mobile** via `<table role="presentation">` avec colonnes `width="100%"` sous une media query `@media (max-width: 600px) { .stack { display:block!important; width:100%!important; }}` (CSS critique inline dans `<head>`). Pas de flex/grid.
11. **Rappel CTA RDV** identique au principal → `📍 Fixer mon rendez-vous gratuit` → `LOCATION_CTA_RDV_FINAL_URL`
12. Adresse `Chemin de l'Esparsette 5, 1023 Crissier` + sous-texte `30 min · 1-to-1 avec un expert · Sans engagement`
13. **Bloc alternative** discret : `Tu préfères commencer directement en ligne ?` + `Crée ton compte et indique tes critères en 2 minutes.` + **CTA secondaire outline doré 2px**, fond transparent, texte doré, padding 14×28, **largeur 100% en mobile, max-width 260px** → `Activer ma recherche en ligne` → `LOCATION_CTA_ACTIVATION_URL` + sous-texte `Essai gratuit 48h · Sans engagement immédiat`
14. Bloc Avis Google compact : étoiles + 1 ligne + lien `Lire nos avis Google →`
15. Signature : `À très vite,\nL'équipe Logisorama.ch\nby Immo-Rama.ch`
16. Footer légal : `Immo-Rama.ch · CHE-442.303.796 · Suisse romande · logisorama.ch` + ligne désinscription

**Suppressions explicites pour Location** : bandeau "propulsé par Immo-rama.ch", badge "Agence N°1 / Chasseur premium", slogan "L'immobilier accessible", section "Autres parcours", phrase "souvent avant qu'ils sortent sur le marché", double CTA hero, toute occurrence `Sàrl`/`SARL`/`Sarl`.

**Remplacement Sàrl global** dans `send-followup-campaign/index.ts` (renderer existant inclus pour les 3 autres campagnes) : `Immo-Rama Sàrl` → `Immo-Rama.ch`.

### 3. Migration SQL — `email_followup_campaigns` (ligne `location` uniquement)

URLs en clair (pas de référence à des constantes JS) :

- `subject` : `On analyse ta recherche d'appart gratuitement 👋` (fallback DB ; le code Edge écrase pour Location)
- `preview_text` : `Passe 30 min avec un expert Logisorama pour vérifier ton dossier, tes critères et tes chances.`
- `hero_title` : `Bonjour, viens faire analyser ta recherche gratuitement.`
- `hero_subtitle` : sous-titre du brief
- `body_intro` : `''` (vide, pour éviter double salutation)
- `benefits` : `[]` (le renderer Location utilise sa liste fixe)
- `cta_label` : `Activer ma recherche en ligne`
- `cta_url` : `https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_activation_secondaire#dossier-form`
- `trust_text` : `''`
- `signature` : `À très vite,\nL'équipe Logisorama.ch\nby Immo-Rama.ch`

## Vérification après implémentation

1. `rg -i "Marie|Sàrl|SARL\\b|Sarl\\b"` dans `supabase/functions/send-followup-campaign/index.ts` → 0 résultat.
2. **Aperçu** Location (lead sans prénom) → H1 `Bonjour, viens faire analyser…` + sujet `On analyse ta recherche d'appart gratuitement 👋`.
3. **Test interne** lead `first_name='V-Yael'` → H1 `Bonjour V-Yael, …` + sujet `V-Yael, on analyse…`. Le sujet vu dans Resend (et dans la boîte) doit correspondre, pas seulement dans l'HTML.
4. Preheader visible dans la preview de Gmail/Apple Mail (texte gris en aperçu de boîte).
5. Mobile 375px : H1 à 24–26px, badge + logo + H1 + CTA RDV visibles dans le 1er écran ; CTA RDV largeur ~100% (max 320px) ; CTA activation largeur ~100% (max 260px) ; 3 cartes confiance empilées.
6. Clic CTA RDV (hero et final) → ouvre logisorama.ch et scrolle réellement vers `#analyse-dossier`.
7. Clic CTA activation → ouvre logisorama.ch et scrolle réellement vers `#dossier-form` (vérifier le `useEffect` de scroll).
8. Aperçu campagnes achat / vente / rénovation visuellement identiques (sauf footer "Immo-Rama.ch").

## Hors scope

- Pas de changement à `CampagnesSuivi.tsx`, à `allowResend`, ni au tracking.
- Pas de modification fonctionnelle aux 3 autres campagnes (sauf remplacement Sàrl).
