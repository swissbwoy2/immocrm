## Problème

Le toggle « 🔁 Renvoyer aux leads déjà contactés » se trouve dans la barre sticky qui n'apparaît que si `selectedIds.size > 0`. Or, tant que ce toggle est `false`, toutes les lignes « Envoyé » sont désactivées (`disabled`) → on ne peut rien sélectionner → la barre sticky ne s'affiche jamais → on ne peut jamais activer le toggle. Cercle vicieux.

## Correctif (1 fichier)

`src/pages/admin/CampagnesSuivi.tsx` — déplacer le toggle « Renvoyer aux leads déjà contactés » **hors** de la barre sticky, vers la barre de filtres en haut de l'onglet « Leads & envoi », juste à côté du switch existant « Masquer déjà envoyés ».

Effets :
- Le toggle est visible et activable **avant** toute sélection.
- Une fois activé, les lignes « Envoyé » deviennent cliquables individuellement → l'utilisateur peut cocher 1 seul lead pour relancer.
- Quand `allowResend` est `true`, on désactive automatiquement `hideAlreadySent` (sinon les leads cibles restent masqués) et on dégrise visuellement les lignes.
- Conserver le rappel d'avertissement ⚠️ dans le dialog de confirmation (déjà en place).
- Garder l'envoi du flag `allowResend` dans `supabase.functions.invoke(...)` (déjà en place).

## Hors scope

- Aucun changement edge function ni DB.
- Design email inchangé.

## Vérification

Sur `/admin/campagnes-suivi` → onglet « Leads & envoi » :
1. Activer « 🔁 Renvoyer aux leads déjà contactés » → les leads marqués « Envoyé » deviennent cliquables, le filtre « Masquer déjà envoyés » se décoche automatiquement.
2. Cocher 1 seul lead → la barre sticky apparaît avec « 1 lead sélectionné ».
3. Cliquer Envoyer → dialog avec l'avertissement orange « Mode renvoi activé ».
4. Confirmer → vérifier qu'une nouvelle ligne `sent` apparaît dans `lead_email_logs` pour ce lead.
