## Constats
Le problème revient parce qu’il existe aujourd’hui plusieurs sources différentes pour le mandat, et elles ne sont plus synchronisées :

1. `src/components/mandat/CGVContent.tsx` affiche un texte résumé dans le parcours mandat classique.
2. `supabase/functions/generate-mandat-contract/index.ts` génère aussi un PDF avec une section de conditions résumées, pas le mandat complet.
3. `supabase/functions/send-mandat-pdf/index.ts` et `supabase/functions/generate-full-mandat-pdf/index.ts` contiennent, eux, une version beaucoup plus complète.
4. `src/pages/client/MonContrat.tsx` télécharge en priorité le PDF déjà stocké dans `mandat_pdf_url`, donc si ce PDF a été généré par l’ancien moteur résumé, le client revoit encore l’ancienne version.
5. Le module `/mandat-v3` lit encore une autre source (`mandate_contract_texts`), ce qui ajoute une divergence supplémentaire.

En clair : le bug ne vient pas d’un seul écran, il vient du fait qu’il y a plusieurs moteurs de contrat concurrents.

## Plan
### 1. Revenir à une seule source de vérité pour le texte juridique
- Créer une source partagée pour le mandat complet, utilisée partout.
- Brancher dessus le mandat classique, le PDF envoyé par email, le PDF complet admin et l’affichage du contrat.
- Garder le texte juridique complet, pas une version marketing ou condensée.

### 2. Supprimer la génération “résumé” du moteur legacy
- Refactorer `generate-mandat-contract` pour qu’il n’utilise plus ses 6 bullet points résumés.
- Le faire produire le mandat complet avec la même logique que le générateur complet.
- Vérifier aussi `send-mandat-pdf` pour éviter toute divergence de wording ou de numérotation.

### 3. Corriger l’affichage du contrat dans le parcours mandat
- Remplacer dans `CGVContent.tsx` le résumé actuel par le texte juridique complet.
- Réutiliser le même contenu pour le mandat classique et, si pertinent, pour `/mandat-v3` afin d’éviter une nouvelle désynchronisation.

### 4. Corriger les téléchargements côté client/admin
- Modifier `src/pages/client/MonContrat.tsx` pour ne plus dépendre aveuglément d’un ancien `mandat_pdf_url` potentiellement résumé.
- Préférer une régénération avec le moteur complet, ou remplacer automatiquement l’ancien PDF stocké par la version complète.
- Aligner aussi les actions de régénération dans `src/pages/admin/ClientDetail.tsx` et `src/pages/admin/DemandesActivation.tsx`.

### 5. Traiter les anciens mandats déjà générés
- Prévoir une compatibilité pour les contrats déjà stockés avec l’ancien format résumé.
- Soit en les régénérant à la demande, soit en les considérant obsolètes pour forcer le téléchargement de la version complète.
- Éviter que les utilisateurs continuent à récupérer des PDF anciens après le correctif.

### 6. Vérification fonctionnelle
- Tester 4 cas :
  - aperçu du contrat avant signature,
  - email/PDF envoyé après dépôt du mandat,
  - téléchargement du contrat côté client,
  - régénération côté admin.
- Vérifier que tous affichent exactement le mandat complet.

## Détails techniques
- Fichiers concernés :
  - `src/components/mandat/CGVContent.tsx`
  - `src/pages/client/MonContrat.tsx`
  - `src/pages/admin/ClientDetail.tsx`
  - `src/pages/admin/DemandesActivation.tsx`
  - `supabase/functions/generate-mandat-contract/index.ts`
  - `supabase/functions/send-mandat-pdf/index.ts`
  - `supabase/functions/generate-full-mandat-pdf/index.ts`
  - potentiellement `src/components/mandat-v3/MandatV3Step6Legal.tsx`
- Si nécessaire, j’ajouterai un petit marqueur de version du PDF généré pour distinguer un ancien PDF résumé d’un PDF complet.
- Objectif final : un seul contenu juridique, un seul rendu contractuel, zéro régression entre aperçu, PDF, admin et espace client.