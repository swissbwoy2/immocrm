## 🔴 Cause identifiée : problème de paiement WhatsApp Business

J'ai vérifié les logs des 2 dernières heures sur le template `location_rdv_activation_v2` :

- **131 échecs** vs **2 envoyés**
- **124 échecs sur 131** = même erreur Meta : **`131042 — Business eligibility payment issue`**
  > *"Message failed to send because there were one or more errors related to your payment method."*
- 12 autres = `131026 Message undeliverable` (numéros non WhatsApp, déjà connu)

**👉 Ce n'est PAS un bug de code.** Meta refuse d'envoyer car ton compte WhatsApp Business a un problème de moyen de paiement (carte expirée, plafond atteint, ou facturation à régler).

## ✅ Action requise (côté Meta, pas dans Lovable)

1. Aller sur **business.facebook.com** → Paramètres entreprise → **Facturation et paiements** → **WhatsApp**
2. Vérifier :
   - Carte de crédit valide et non expirée
   - Aucune facture impayée en attente
   - Plafond de dépense (spending limit) pas atteint
3. Mettre à jour la carte si besoin → Meta réactive l'envoi en quelques minutes

## 🔁 Une fois le paiement réglé

Le bouton **"Envoyer aux 171 leads"** fonctionnera tel quel — pas besoin de modifier le code. Les 171 leads encore disponibles sont juste bloqués en file d'attente côté Meta.

## 📝 Amélioration optionnelle (à valider)

Si tu veux, je peux ajouter une **détection automatique** de l'erreur `131042` côté front :
- Quand le batch retourne cette erreur, on **stoppe la boucle immédiatement** (au lieu d'enchaîner 168 batches qui vont tous échouer)
- Affichage d'un toast clair : *"⚠️ Problème de paiement Meta — règle ta facturation WhatsApp Business avant de relancer"*

**Hors périmètre** : aucune modification d'edge function, aucune migration DB, aucun changement de template.