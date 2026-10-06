# Diagnostic : e-mails reçus en double (lecture seule, aucun changement appliqué)

## Constat principal
Les **séquences automatiques ne causent pas les 10 envois**. Une adresse ne reçoit jamais plus de **2 messages de séquence**. Les 10 e-mails viennent surtout de **campagnes manuelles** qui se chevauchent, plus un doublon séquence/campagne manuelle.

## 1. Adresses les plus touchées (séquences seules)
- Maximum : 1 inscription, 2 messages, 2 newsletters par adresse (exemples : cisse130879@, dabour.tarek@, ceyda.akbugday@…). Aucune adresse au-delà.
- Répartition des newsletters de séquence : « Votre visite — Druey 18 » (étape -1) 154 envoyées + 22 en file ; « RE : Candidature appartement à louer » (étape 0) 77 + 2 en file ; étape 1 : 1 en file.

## Tous envois confondus (vue du client)
Les plus touchés : lumnije.rushiti777@ (10), puis 9 pour omar1999.el@, 39arthurmarechaux@, leondeneri0@, christ.ramazani@, etc.

Détail pour lumnije.rushiti777@ (les 10) :
- 03.10 : « Visite annulée — Druey 18 — 4 octobre » (manuel)
- 04.10 : **4 campagnes « Rappel — Visites annulées — Druey 18 »** à 09h, 12h, 13h et 14h, toutes créées au même instant le 03.10 à 18:37 (manuel)
- 03.10 : « RE : Candidature » (copie annulée, non envoyée)
- 04.10 : « RE : Candidature — relance 04.10 à 13h » (manuel, 1 347 destinataires)
- 05.10 : « Votre visite — Druey 18 » (séquence, étape -1)
- 05.10 : « Un nouveau créneau est disponible ! » (notification de créneau)
- 06.10 : « RE : Candidature appartement à louer » (séquence, étape 0 — **même contenu que la relance manuelle du 04.10**)

## 2. Doublons
- Aucune adresse en double dans les contacts (email unique), 1 seule inscription par contact, aucun step en double.
- Même sujet reçu plusieurs fois : **141 adresses** au total.
  - 99 adresses ont reçu **4 fois** « Rappel — Visites annulées » (1 adresse 3 fois, 1 adresse 2 fois).
  - 39 adresses ont reçu **2 fois** « RE : Candidature appartement à louer » : la relance manuelle du 04.10, puis l’étape 0 de la séquence renter.
  - 1 adresse a reçu 2 fois « Votre visite — Druey 18 ».

## 3. Programmation chez Infomaniak
Pas de double programmation constatée : aucun identifiant de campagne Infomaniak n’est partagé entre deux newsletters, et chaque newsletter a son propre groupe.
- Le groupe « Logisorama <id> » est réaligné avant chaque envoi : les abonnés en trop sont retirés, puis la liste est vérifiée (`sameAudience`). Il ne peut donc pas contenir d’autres abonnés.
- Une reprise réutilise le même groupe et la même campagne. Elle s’arrête si la campagne n’est plus un brouillon.
- `begin_send` passe la newsletter à `submitting`. Si l’envoi échoue après ce point, elle passe à `attention` sans nouvel essai automatique.
- Une lease expirée ne permet pas de reprogrammer : `begin_send` exige une lease valide et l’état `preparing`.
- Risque théorique restant : la campagne est créée chez Infomaniak, mais son identifiant n’est pas enregistré (coupure entre le `POST /campaigns` et la mise à jour). La reprise crée alors un second brouillon, qui n’est pas envoyé. Aucun cas observé.

## 4. Règle « une seule entrée par adresse »
- Contrainte unique sur `newsletter_sequence_enrollments.contact_id`, et `newsletter_contacts.email` est unique. Une adresse ne peut donc entrer qu’une fois dans une séquence.
- En revanche, **aucune règle ne compare les séquences aux campagnes manuelles ni aux notifications** :
  - L’étape 0 renter reprend exactement le modèle `candidature.html`, avec le sujet « RE : Candidature appartement à louer » (`scripts/newsletter/seed-sequences.ts`, lignes 109-121). La campagne manuelle du 04.10 utilise ce même contenu.
  - L’étape -1 (invitation visite) et l’étape 0 ont des contenus différents.

## Cause racine
1. **Principale (manuelle)** : 4 campagnes « Rappel — Visites annulées — Appt. Druey 18 » ont été créées ensemble le 03.10 à 18:37, programmées à 09h/12h/13h/14h le 04.10, pour la même audience de 103 adresses. Résultat : 412 envois.
2. **Secondaire (automatique)** : l’étape 0 de la séquence renter renvoie le même contenu que la relance manuelle « RE : Candidature » du 04.10. Aucun filtre n’existe entre les campagnes.
   - Fichier : `scripts/newsletter/seed-sequences.ts`, l. 109-121 (contenu identique).
   - Absence de filtre dans la fonction SQL `newsletter_infomaniak_recipients`.
3. **Contexte** : chaque annulation, chaque nouveau créneau, chaque invitation visite et chaque relance est une campagne séparée. Sur 3 jours, une même personne peut recevoir environ 10 e-mails, sans plafond global.

## Correctif proposé (non appliqué)
1. **Anti-doublon par contenu** : dans `newsletter_infomaniak_recipients`, exclure toute adresse qui a déjà reçu (envoi `sent`) une newsletter de même sujet dans les 7 derniers jours. Pour les séquences, l’étape concernée passe alors en « déjà reçu » sans envoi.
2. **Étape 0 renter** : soit un contenu distinct de la campagne manuelle « Candidature », soit l’étape sautée si le contact a déjà reçu ce modèle.
3. **Plafond de fréquence** : au plus 2 e-mails marketing par adresse et par 24 h. Les notifications transactionnelles (annulation, créneau) restent exemptées, mais une seule par annonce et par jour.
4. **Garde-fou dans l’interface** : avant de programmer une campagne, avertir si une autre campagne de même sujet ou de même audience est déjà programmée dans les 24 h.
5. **Robustesse Infomaniak** (optionnel) : nommer la campagne `Logisorama <id>` et, à la reprise, rechercher un brouillon existant de ce nom avant d’en créer un nouveau.
6. Ajouter les tests : même sujet déjà reçu → exclu ; plafond 24 h ; étape de séquence sautée sans être bloquée.
