

# Tracking UTM automatique pour mesurer le ROI Facebook Ads

## Objectif

Capturer automatiquement les parametres UTM (utm_source, utm_medium, utm_campaign, utm_content, utm_term) depuis l'URL d'arrivee et les enregistrer avec chaque lead dans la base de donnees. Cela permet de savoir exactement quel lead vient de quelle campagne Facebook.

## Exemple concret

Un visiteur arrive via cette URL Facebook Ads :
```text
https://immocrm.lovable.app/?utm_source=facebook&utm_medium=cpc&utm_campaign=location_romande_jan25&utm_content=frustration_v1
```

Quand il soumet un formulaire (QuickLeadForm ou Analyse Dossier), ces parametres sont automatiquement enregistres avec son lead.

## Ce qui sera fait

### 1. Ajout de 5 colonnes UTM dans la table `leads`

Migration SQL pour ajouter :
- `utm_source` (text, nullable) -- ex: "facebook"
- `utm_medium` (text, nullable) -- ex: "cpc"
- `utm_campaign` (text, nullable) -- ex: "location_romande_jan25"
- `utm_content` (text, nullable) -- ex: "frustration_v1"
- `utm_term` (text, nullable) -- ex: mot-cle cible

Toutes nullable car les leads organiques (sans UTM) continueront de fonctionner normalement.

### 2. Creation d'un hook utilitaire `useUTMParams`

Nouveau fichier : `src/hooks/useUTMParams.ts`

Ce hook :
- Lit les parametres UTM depuis l'URL a l'arrivee du visiteur
- Les stocke dans `sessionStorage` (persiste pendant toute la session meme si le visiteur navigue sur d'autres pages)
- Retourne un objet `{ utm_source, utm_medium, utm_campaign, utm_content, utm_term }` pret a etre insere dans la base

Pourquoi `sessionStorage` ? Parce que le visiteur peut arriver sur la page d'accueil avec les UTM dans l'URL, puis naviguer vers le formulaire (ou scroller). Sans persistance, les parametres seraient perdus.

### 3. Integration dans les 3 points d'insertion de leads

Modification des 3 fichiers qui inserent des leads pour ajouter les champs UTM :

- **`src/components/landing/QuickLeadForm.tsx`** -- Formulaire de shortlist rapide
- **`src/components/landing/DossierAnalyseSection.tsx`** -- Analyse gratuite de dossier
- **`src/pages/FormulaireVendeurComplet.tsx`** -- Formulaire vendeur

Dans chaque fichier : import du hook `useUTMParams`, puis ajout des 5 champs UTM dans l'objet `.insert({...})`.

### 4. Ajout des UTM dans la notification email

Modification de l'edge function `notify-new-lead` pour afficher la source UTM dans l'email de notification envoye a info@immo-rama.ch. L'email indiquera par exemple :

```text
Source: facebook / cpc / location_romande_jan25
```

## Resume technique

| Element | Fichier | Action |
|---------|---------|--------|
| Base de donnees | Migration SQL | Ajouter 5 colonnes UTM |
| Hook UTM | `src/hooks/useUTMParams.ts` | Nouveau fichier |
| QuickLeadForm | `src/components/landing/QuickLeadForm.tsx` | Ajouter UTM a l'insert |
| DossierAnalyse | `src/components/landing/DossierAnalyseSection.tsx` | Ajouter UTM a l'insert |
| FormulaireVendeur | `src/pages/FormulaireVendeurComplet.tsx` | Ajouter UTM a l'insert |
| Notification email | `supabase/functions/notify-new-lead/index.ts` | Afficher source UTM |

## Impact

- Aucun changement visuel pour le visiteur
- Les leads existants ne sont pas affectes (colonnes nullable)
- Compatible avec toutes les plateformes (Facebook, Google, TikTok...) -- il suffit de tagger l'URL

