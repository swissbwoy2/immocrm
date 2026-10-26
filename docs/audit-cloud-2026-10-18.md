# Audit Lovable Cloud — 18.10.2026

## État après recharge des crédits
- Base relancée le 18.10.2026 vers 20h00 (UTC) : 229 tables, 478 comptes, 24 espaces de stockage, 300 Mo. Données intactes (dernière offre : 18.10 11:37).
- Coupure : du 18.10 ~12:45 au 18.10 ~20:00 (crédits épuisés). Coupure probable aussi entre le 7 et le 12.10.

## Consommation (30 jours)
- Serveur de base de données : 555 crédits (≈ 30/jour quand tout tourne).
- Fonctions serveur, réseau, stockage, temps réel, IA : ≈ 8 crédits au total.
- Build (chat Lovable) : 434 crédits.

## Tâches planifiées (35)
Chaque minute : sync-all-imap-emails, newsletter-worker, process-postulation-job (≈ 4 300 appels/jour).
Doublons : sync-all-imap-emails ×2, wa-send-post-visite ×2, wa-send-google-review ×2 (9h), wa-send-mandate-expiring ×2.
Erreur récurrente : une des tâches « chaque minute » échoue (WORKER_RESOURCE_LIMIT, code 546) à chaque passage.
La fonction newsletter_infomaniak_claim() prend ≈ 4 s par appel.
