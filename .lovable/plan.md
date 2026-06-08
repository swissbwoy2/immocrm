# Mentions légales & Politique de confidentialité (nLPD)

## Contexte

Aucune page légale n'existe actuellement (vérifié : pas de route `/mentions-legales` ni `/politique-confidentialite`, aucun composant correspondant). Le site collecte pourtant des données sensibles au sens de l'**art. 5 let. c nLPD** (extrait de poursuites, fiches de salaire, copie ID/permis, données financières) qui exigent une information explicite, une finalité claire et une base légale documentée.

**Forme juridique** : Immo-rama.ch est une **entreprise individuelle** (raison individuelle), IDE **CHE-442.303.796**, exploitée par **Christ Ramazani** — pas une Sàrl.

## Livrables

### 1. Page `/mentions-legales` — `src/pages/legal/MentionsLegales.tsx`
Conforme aux usages suisses (LCD art. 3 al. 1 let. s) :
- Éditeur : **Immo-rama.ch**, entreprise individuelle, titulaire **Christ Ramazani**
- IDE : **CHE-442.303.796**
- Adresse du siège
- Responsable de publication : Christ Ramazani
- Contact : email + téléphone
- Hébergement : Lovable Cloud (Supabase)
- Propriété intellectuelle, marques Logisorama / Immo-rama.ch
- Droit applicable : droit suisse, for au siège du titulaire

### 2. Page `/politique-confidentialite` — `src/pages/legal/PolitiqueConfidentialite.tsx`
Structure alignée nLPD (en vigueur 01.09.2023) + RGPD :

1. **Responsable du traitement** (art. 5 let. j nLPD) — Christ Ramazani, titulaire de l'entreprise individuelle Immo-rama.ch ; contact unique
2. **Catégories de données collectées**
   - Identité, coordonnées, données de connexion
   - **Données sensibles (art. 5 let. c nLPD)** : extrait de poursuites, fiches de salaire, contrat de travail, copie pièce d'identité / permis de séjour, état civil, situation familiale
   - Données de navigation (cookies, pixels Meta/Google/TikTok)
3. **Finalités et bases légales** — tableau explicite :
   | Donnée | Finalité | Base légale |
   |---|---|---|
   | Fiche de salaire | Vérifier la solvabilité exigée par les régies (loyer ≤ 1/3 revenu) | Exécution du mandat + consentement explicite |
   | Extrait de poursuites | Dossier de candidature recevable par les régies | Exécution contractuelle + intérêt légitime |
   | Copie ID / permis séjour | Identification, vérification du droit de séjour | Obligation contractuelle + consentement |
   | Contrat de travail | Justifier la stabilité de l'emploi | Exécution contractuelle |
   | Coordonnées bancaires | Acompte 300 CHF, remboursement | Exécution contractuelle |
4. **Destinataires** : régies immobilières, propriétaires, sous-traitants techniques (Supabase, Resend, AbaNinja, Meta, Google, TikTok, WhatsApp Business)
5. **Transferts hors Suisse** (art. 16-17 nLPD) — UE adéquate, USA via DPF/CCT
6. **Durée de conservation** : mandat actif + 10 ans (art. 962 CO) ; documents sensibles supprimés à la clôture sauf obligation comptable
7. **Sécurité** (art. 8 nLPD) : RLS Supabase, buckets privés, chiffrement, accès restreint
8. **Droits des personnes concernées** (art. 25-32 nLPD) : accès, rectification, suppression, opposition, portabilité, retrait du consentement — email à Christ Ramazani
9. **Décisions individuelles automatisées** (art. 21 nLPD) : matching IA AI-Relocation — droit à intervention humaine
10. **Cookies & traceurs** : renvoi vers le bandeau Consent Mode v2 (Google Ads / Meta / TikTok)
11. **Profilage** (art. 5 let. f nLPD) : segmentation marketing leads
12. **Autorité de contrôle** : PFPDT, Berne
13. **Date de dernière mise à jour**

### 3. Footer public — composant partagé
Créer `src/components/public/PublicFooter.tsx` avec deux `<Link>` discrets vers les pages légales, puis l'inclure dans :
- `HomePage`, `VendreMonBien`, `RelouerMonAppartement`, `ConstruireRenover`
- `PublicAnnonces` et détail annonces
- Pages mandat public (`MandatV3`, `NouveauMandat`)

### 4. Routes
Ajouter dans `src/App.tsx` :
```tsx
<Route path="/mentions-legales" element={<MentionsLegales />} />
<Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
```

### 5. Consentement explicite dans les formulaires sensibles
Ajouter une mention courte avec lien vers la politique sur :
- `FormulaireRelouer`, `NouveauMandat`, `MandatV3`, upload de documents espace client
- Texte type : *« J'accepte que mes documents (fiche de salaire, extrait de poursuites, ID) soient traités par Immo-rama.ch (Christ Ramazani, entreprise individuelle) pour constituer mon dossier locataire, conformément à la [politique de confidentialité](/politique-confidentialite). »*

## Détails techniques

- Pages 100 % statiques (JSX), SEO friendly : `<title>`, meta description, H1 unique, balisage sémantique
- Aucune migration backend, aucune nouvelle dépendance
- Design system (tokens, pas de couleurs hardcodées)
- Date de mise à jour en constante en haut de fichier
- Mise à jour de `mem://style/brand-identity-guidelines` pour figer la forme juridique « entreprise individuelle »

## Hors périmètre

- Revue du bandeau cookies
- Traductions EN/DE (FR uniquement)
- Génération PDF téléchargeable de la politique
