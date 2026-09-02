# Remplacement du numéro de l'agence

Ancien numéro : 021 634 28 39 (+41 21 634 28 39) — obsolète.
Nouveau numéro : 021 634 31 61 (+41 21 634 31 61).

## Ce qui sera modifié

Toutes les occurrences affichées ou envoyées (24 fichiers + 2 textes en base), en conservant le format existant à chaque endroit (local `021 634 31 61`, international `+41 21 634 31 61`, lien `tel:+41216343161`).

**Site public / SEO**
- index.html (métadonnées, JSON-LD)
- public/llms.txt
- Footers : LandingFooter, PublicFooter, PublicSiteFooter, VendeurFooter
- Landing vendeur : VendeurHeroSection, VendeurCTASection, VendeurFAQSection
- RendezVousProprietaire

**Pages légales**
- MentionsLegales, PolitiqueConfidentialite, ConditionsGenerales
- MandatLegalConsents

**Application (offres, PDF, candidatures)**
- src/lib/offreMessage.ts (gabarit d'offre)
- ResendOfferDialog, admin/EnvoyerOffre, admin/OffresEnvoyees, agent/EnvoyerOffre
- FicheSalairePDFViewer
- features/postulation-auto/lib/buildValues.ts

**Edge Functions**
- _shared/offre-message.ts
- postulation-fill-llm
- send-mandat-confirmation
(redéploiement des fonctions concernées)

**Base de données**
- 2 lignes de `mandate_contract_texts` contenant l'ancien numéro : mise à jour du texte du contrat de mandat.

## Notes techniques

- Remplacement littéral uniquement, aucune modification de logique ni de mise en page.
- Le numéro Twint/paiement 076 483 91 99 et le numéro annonceur +41 22 519 09 04 ne sont pas touchés.
- La mémoire projet sera mise à jour pour que 021 634 31 61 devienne le contact officiel.
