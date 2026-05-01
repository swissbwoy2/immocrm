
# Bloc "Avis Google" dans les emails de campagne de suivi

## Contexte

Les emails de campagne (`send-followup-campaign`) doivent afficher un bloc de preuve sociale renvoyant vers les vrais avis Google de Logisorama.

**Contrainte technique** : le widget Elfsight de la page d'accueil utilise du JavaScript externe — **impossible** dans un email (Gmail/Outlook/Apple Mail bloquent tous les scripts). On utilise donc un bloc HTML statique 100% email-safe (tableaux + styles inline) qui pointe vers :
- Le **vrai lien Google** : `https://g.page/r/CQJCKNAJlouGEAE/review`
- La **section avis du site** : `https://logisorama.ch/#avis` (où le widget Elfsight complet s'affiche)

## Rendu visuel du bloc

```text
┌──────────────────────────────────────────────────┐
│                                                  │
│              ★ ★ ★ ★ ★                           │
│                                                  │
│         Avis Google vérifiés                     │
│   Découvrez les retours de nos clients           │
│                                                  │
│      [ ⭐ Lire nos avis Google → ]               │
│                                                  │
│        Voir tous les témoignages sur le site     │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Spécifications techniques

- **Position** : inséré dans `renderEmail()` **juste avant la 2ème CTA téléphonique** (en bas), pour rassurer le lead avant l'invitation à réserver l'appel.
- **Étoiles** : caractères Unicode `★` couleur or `#d4a857` (pas d'image externe → aucun problème de chargement / proxy Gmail).
- **HTML email-safe** : `<table>` imbriquées + styles inline uniquement, cohérent avec le reste du template.
- **Bouton principal** :
  - Texte : « ⭐ Lire nos avis Google »
  - URL : `https://g.page/r/CQJCKNAJlouGEAE/review?utm_source=campagne_suivi&utm_medium=email&utm_campaign={key}&utm_content=avis_google_direct`
  - Style doré plein (cohérent avec le bouton principal de l'email)
- **Lien secondaire** :
  - Texte : « Voir tous les témoignages sur le site »
  - URL : `https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign={key}&utm_content=avis_google_site#avis`
  - Style discret (texte doré souligné)
- **Palette** : `#b8893d` / `#d4a857` (identique au reste de l'email).

## Fichier modifié

- `supabase/functions/send-followup-campaign/index.ts`
  - Ajout d'une variable `reviewsBlock` dans `renderEmail()`
  - Insertion du bloc juste avant le CTA téléphonique final
- Redéploiement automatique via `deploy_edge_functions(["send-followup-campaign"])`

## Validation

Après déploiement : cliquer sur **« Test »** dans `/admin/campagnes-suivi` pour visualiser le rendu réel du bloc dans la boîte mail.
