# Stabiliser la navigation mensuelle du calendrier admin

## Modification
- Conserver le mois affiché dans l’état interne stable du calendrier.
- Lors d’un changement de mois, recharger silencieusement la plage visible afin de ne pas démonter puis recréer le calendrier au mois courant.
- Garder le chargement plein écran uniquement au premier affichage et préserver le bouton « Aujourd’hui ».

## Vérification
- Contrôler Précédent, Suivant et Aujourd’hui dans l’aperçu admin.
- Vérifier que les données suivent le mois visible et lancer la vérification TypeScript.

## Périmètre
- Uniquement `src/pages/admin/Calendrier.tsx`.
