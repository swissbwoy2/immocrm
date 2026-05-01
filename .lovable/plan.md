
# Mise à jour du sous-titre de la campagne "location"

## Contexte

Le texte actuel du sous-titre de l'email "location" est :
> *Crée ton compte gratuitement sur Logisorama et reçois les meilleures offres adaptées à tes critères.*

Vous souhaitez le remplacer par une version qui mentionne explicitement la **période d'essai de 48h** pour plus de transparence.

## Changement à appliquer

**Avant :**
> Crée ton compte gratuitement sur Logisorama et reçois les meilleures offres adaptées à tes critères.

**Après :**
> Crée ton compte gratuitement sur Logisorama et reçois les meilleures offres adaptées à tes critères pendant 48h. Période d'essai.

## Implémentation

Le texte est stocké dans la colonne `hero_subtitle` de la table `email_followup_campaigns` (campagne `location`). Une simple migration SQL le met à jour :

```sql
UPDATE public.email_followup_campaigns
SET hero_subtitle = 'Crée ton compte gratuitement sur Logisorama et reçois les meilleures offres adaptées à tes critères pendant 48h. Période d''essai.'
WHERE campaign_key = 'location';
```

Aucune modification de code (Edge Function ou frontend) n'est nécessaire — le rendu de l'email lit dynamiquement le champ `hero_subtitle` depuis la base.

## Validation

Après application : cliquer sur **« Test »** dans `/admin/campagnes-suivi` pour la campagne « location » — le nouveau sous-titre apparaîtra dans le hero de l'email.
