# Réactivation Lovable Cloud

## Constat (vérifié le 24.10.2026)
- Le backend (base de données + connexion) est en ligne et répond normalement : il est déjà réactivé, aucune action requise.
- Crédits restants : 100 (expirent le 13.12.2026). Les recharges précédentes sont épuisées.
- Le serveur consomme environ 30 crédits/jour quand il tourne en continu : les 100 crédits couvrent donc environ 3 jours avant une nouvelle coupure.

## Proposition (optionnelle, pour éviter une nouvelle coupure)
1. Recharger des crédits dans Paramètres → Plans et crédits.
2. Réduire la consommation en espaçant les tâches automatiques qui tournent chaque minute (synchronisation des e-mails, newsletter, file de postulations) et en supprimant les doublons déjà repérés dans l'audit du 18.10 (sync e-mails ×2, rappels WhatsApp ×2).
   - Ces changements de fréquence nécessitent votre accord, car ils retardent légèrement les traitements.

## Détails techniques
- Doublons cron à retirer : sync-all-imap-emails, wa-send-post-visite, wa-send-google-review, wa-send-mandate-expiring.
- Passer sync-all-imap-emails et newsletter-worker de 1 min à 5 min ; garder process-postulation-job à 1 min ou passer à 2 min.
