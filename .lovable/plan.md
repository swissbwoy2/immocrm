# Renforcement juridique nLPD + RGPD — v2 (verrouillée)

## Objectif
Aligner fortement la Politique de confidentialité et les Mentions légales sur la LPD révisée (01.09.2023) et le RGPD lorsque applicable. **Aucune mention "100 % conforme"** dans le contenu public.

## Fichiers modifiés (2 — strictement)
- `src/pages/legal/PolitiqueConfidentialite.tsx`
- `src/pages/legal/MentionsLegales.tsx`

Aucun autre fichier touché : pas de backend, route, footer, formulaire, dépendance.

---

## 1. `PolitiqueConfidentialite.tsx`

`LAST_UPDATE = '8 juin 2026'`. Structure : **14 sections** (ajout §8 "Violation de données" + renumérotation).

### §2 — Catégories de données
Remplacer "Données sensibles au sens art. 5 let. c nLPD" par :
> **Documents confidentiels à haut niveau de protection** : fiches de salaire, extrait du registre des poursuites, pièce d'identité, permis de séjour, contrat de travail, coordonnées bancaires, informations relatives au ménage.

Paragraphe ajouté : *« Certains de ces documents peuvent contenir ou révéler des données sensibles au sens de l'art. 5 let. c nLPD… niveau de sécurité renforcé. »*

### §3 — Tableau finalités
3ᵉ colonne renommée **"Justification / base RGPD si applicable"**. Reformulation des 5 lignes. **Suppression** de "condition légale à la conclusion d'un bail" (ID/permis). Paragraphe final adouci.

### §4 — Destinataires + tableau sous-traitants
Tableau à 7 lignes (Supabase, Resend, AbaNinja, Meta, Google, TikTok, WhatsApp Business) — colonnes Prestataire / Fonction / Pays / Données. Dans `overflow-x-auto`.

### §5 — Transferts internationaux
Mention explicite **Swiss-U.S. Data Privacy Framework** + EU-U.S. DPF si RGPD + CCT PFPDT à défaut + clause pays sans niveau adéquat.

### §6 — Conservation
Reformulation documents justificatifs (énumération + clauses légales/litige/preuve/demande), sauvegardes techniques, principe de minimisation.

### §7 — Sécurité
Base art. 8 nLPD + accès par rôle journalisé, transmission régies via lien sécurisé, non-transmission WhatsApp/messagerie non sécurisée, "aucune mesure ne garantit un risque zéro".

### Nouveau §8 — Violation de données
Art. 24 nLPD : notification PFPDT si risque élevé, information personnes concernées si nécessaire, documentation interne.

### §9 — Vos droits
Liste droits + paragraphe RGPD UE (accès, rectification, effacement, opposition, limitation, portabilité, décision automatisée).

### §10 — AI-Relocation
*« aide à l'organisation, au matching, au pré-tri interne… ne refuse pas automatiquement, ne décide pas seul, ne remplace pas l'analyse humaine »* + droit revue manuelle.

### §11 — Cookies
Consent Mode v2, refus par défaut, "Refuser tout" aussi visible qu'"Accepter tout", annonce future Politique cookies détaillée, **mention explicite "le site n'utilise pas Google reCAPTCHA ni Typo3"** (seule occurrence autorisée de ces termes).

### §12 — Profilage
Statuts (recherche en cours, dossier incomplet, candidature soumise, mandat actif, clôturé) + "aucun effet juridique, n'exclut pas automatiquement".

### §13 — PFPDT
Inchangé.

### §14 — Modifications
+ information possible par email/notification/affichage si changement important.

---

## 2. `MentionsLegales.tsx`
Adresse unique :
- Immo-rama.ch — entreprise individuelle
- Christ Ramazani
- Chemin de l'Esparcette 5, 1023 Crissier, Suisse
- IDE : CHE-442.303.796
- info@immo-rama.ch

Aucune occurrence "Allée des Cèdres / 1022 Chavannes-près-Renens".

---

## Contraintes techniques
- JSX statique pur, design system, tokens sémantiques.
- Tableaux dans `overflow-x-auto` pour mobile.
- Pas de composant nouveau (HTML standard).
- Pas d'extrapolation, pas d'ajout de contenu juridique non demandé.

---

## Vérification finale (checklist obligatoire avant livraison)
1. `PolitiqueConfidentialite.tsx` contient 14 sections numérotées 1→14.
2. `LAST_UPDATE` = `8 juin 2026`.
3. L'expression "Données sensibles au sens de l'art. 5 let. c nLPD" n'est plus utilisée comme catégorie générale.
4. La catégorie utilisée est bien "Documents confidentiels à haut niveau de protection".
5. La 3ᵉ colonne du tableau §3 est "Justification / base RGPD si applicable".
6. La phrase "condition légale à la conclusion d'un bail" est supprimée.
7. §4 contient le tableau sous-traitants avec 7 lignes.
8. §5 mentionne le Swiss-U.S. Data Privacy Framework.
9. §8 "Violation de données" est présent.
10. Anciennes sections correctement renumérotées.
11. §11 mentionne que le site n'utilise pas reCAPTCHA ni Typo3.
12. "reCAPTCHA" et "Typo3" n'apparaissent nulle part ailleurs.
13. `MentionsLegales.tsx` contient uniquement l'adresse Chemin de l'Esparcette 5, 1023 Crissier.
14. Aucune mention "Allée des Cèdres / Chavannes" résiduelle.
15. Aucun autre fichier modifié.
16. Aucun changement backend, route, footer, formulaire, dépendance.
17. Tableaux dans `overflow-x-auto`.
18. Aucune promesse "100 % conforme" dans le texte public.

## Résumé final attendu après livraison
- 2 fichiers modifiés ;
- principales sections renforcées (§2, §3, §4, §5, §6, §7, §8 nouveau, §9, §10, §11) ;
- confirmation qu'aucun autre fichier n'a été touché.

## Hors périmètre (itération suivante)
Politique cookies détaillée, registre des traitements, AIPD, DPA sous-traitants, procédure suppression interne, audit emails/factures/legacy, vérification certification DPF cas par cas.
