## Cause

L'erreur "Une erreur est survenue" sur la réservation au bureau via le formulaire shortlist (`DossierAnalyseSection`) vient de la base de données :

```
duplicate key value violates unique constraint "leads_email_formulaire_unique_idx"
```

Cet email a déjà été enregistré une première fois via le même formulaire (`source = 'landing_analyse_dossier'`). Un index unique empêche un deuxième `INSERT` dans `leads` avec le même couple email + formulaire, donc le `try` échoue, le toast d'erreur s'affiche, et le créneau qui venait d'être créé est annulé.

Le créneau lui-même (`lead_phone_appointments`) avait pourtant bien été pris : c'est uniquement la deuxième écriture (le lead) qui casse.

## Correctif proposé

Dans `src/components/public-site/sections/DossierAnalyseSection.tsx`, fonction `handleSubmit` :

1. Tenter l'`INSERT` dans `leads` comme aujourd'hui.
2. Si Postgres renvoie `23505` sur la contrainte d'unicité de l'email du formulaire :
   - récupérer le lead existant (`select id from leads where email = ... and source = 'landing_analyse_dossier'`),
   - faire un `update` des champs utiles (téléphone, localité, qualification, UTM, etc.) pour rafraîchir les infos,
   - réutiliser son `id` comme `leadId`.
3. Continuer le flow normal : lier le `lead_phone_appointments` créé à ce `leadId`, déclencher `notify-new-lead`, le pixel Meta, et passer en `step = 'submitted'`.
4. Ne plus annuler le créneau dans ce cas (l'annulation reste uniquement pour les vraies erreurs inattendues).

Aucun changement de schéma, RLS, ou edge function n'est nécessaire — uniquement le composant front. Le toast d'erreur ne s'affichera plus pour un prospect qui retente le formulaire avec le même email.
