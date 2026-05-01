## Objectif

Faire apparaître le **`preview_text`** (« Crée ton compte gratuitement et accède à notre réseau de biens. ») **directement dans le corps de l'email**, juste **au-dessus** du sous-titre actuel (« Crée ton compte gratuitement sur Logisorama et reçois… »).

Aujourd'hui ce texte précieux n'est utilisé que dans le preheader masqué (visible uniquement dans la liste des inbox Gmail/Outlook). On veut qu'il soit **également visible dans l'email ouvert**, comme une accroche dorée premium.

## Rendu attendu

```text
[Logo Immo-Rama]
L'IMMOBILIER ACCESSIBLE
─
H1 : Tu cherches un appartement ?
✨ Crée ton compte gratuitement et accède à notre réseau de biens.   ← preview_text en doré (NOUVEAU)
Sous-titre : Crée ton compte gratuitement sur Logisorama et reçois les meilleures offres…
[CTA Continuer ma recherche]
```

## Modification

**Un seul fichier** : `supabase/functions/send-followup-campaign/index.ts` (ligne 130).

Insérer une ligne juste après le `<h1>` et avant le `<p>` du sous-titre, qui rend le `preview_text` en **doré (#d4a857)** et **semi-bold**, dans la même police Arial que le sous-titre, pour un contraste visuel net.

```html
<h1>${hero_title}</h1>
${preview_text ? `<p style="...color:#d4a857;font-weight:600...">${preview_text}</p>` : ''}
${hero_subtitle ? `<p style="...color:#c9bfac...">${hero_subtitle}</p>` : '...'}
```

## Conservé

- Le **preheader masqué** (`<div style="display:none">`) reste en place → Gmail/Outlook continuent d'afficher le preview à côté de l'objet dans la liste des inbox.
- **Aucune modification** de la base de données : les `preview_text` actuels des 4 campagnes sont réutilisés tels quels.
- **Aucune modification** des autres campagnes : toutes profitent du nouveau rendu (Vente, Rénovation, Location, Achat).

## Déploiement

Redéploiement automatique de l'Edge Function `send-followup-campaign` après l'edit (l'Edge Function se redéploie automatiquement à chaque modification).

## Vérification

Aller sur `/admin/campagnes-suivi` → cliquer **« Test »** sur la campagne **Location** → l'accroche dorée doit apparaître dans le mail reçu à `info@immo-rama.ch`, exactement au-dessus du sous-titre.