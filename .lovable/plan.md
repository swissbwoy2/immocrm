## Diagnostic

Tu as raison, c'est confus :

- **Label UI** dans `CampagnesSuivi.tsx` ligne 1025 : affiche encore `logisorama_location_rdv_crissier_v1` (oubli de mise à jour, purement cosmétique).
- **Code réel** (`send-followup-whatsapp/index.ts` + DB `whatsapp_message_templates`) : envoie via la clé `location_rdv_activation_v2` → template Meta `logisorama_location_rdv_crissier_v2`.
- **Meta** : `v2` est encore *en cours d'examen* → les envois sont rejetés silencieusement par Meta, donc tu ne reçois rien sur ton test.

Donc deux problèmes : (1) on envoie sur un template non approuvé, (2) le label ment.

## Ce que je vais faire

### 1. Repasser temporairement sur v1 (envoi qui marche maintenant)
- DB : `UPDATE whatsapp_message_templates SET template_name_meta='logisorama_location_rdv_crissier_v1' WHERE template_key='location_rdv_activation_v2'` (on garde la clé interne `_v2` pour ne pas casser le code, on remappe juste vers le template Meta v1 qui est APPROVED).
- `send-followup-whatsapp/index.ts` : garder `TEMPLATE_KEY = "location_rdv_activation_v2"` mais remettre `RDV_BUTTON_URL` = lien que tu utilisais en v1 (le bouton du template v1 pointe vers ce que Meta a approuvé chez eux — à confirmer avec toi : la home `https://logisorama.ch/` ou autre ?).
- Test immédiat : tu dois recevoir le message.

### 2. Label UI honnête + dynamique
- Lire la valeur réelle de `template_name_meta` depuis `whatsapp_message_templates` au montage de l'onglet WhatsApp et l'afficher (au lieu d'un texte en dur). Plus jamais de label désynchronisé.
- Ajouter à côté un petit badge "v1 (actif)" / "v2 (en attente Meta)" pour que tu voies en un clin d'œil ce qui est envoyé.

### 3. Bascule v2 quand Meta approuve
- Quand Meta passe v2 en APPROVED, une seule action :
  ```sql
  UPDATE whatsapp_message_templates 
  SET template_name_meta='logisorama_location_rdv_crissier_v2' 
  WHERE template_key='location_rdv_activation_v2';
  ```
  + remettre `RDV_BUTTON_URL` sur `https://logisorama.ch/rendez-vous?...`.
- Aucun redéploiement de code nécessaire côté template (juste l'URL bouton dans la fonction edge si elle change).

### 4. Page `/rendez-vous`
- **Reste en place** et fonctionnelle. Quand v2 sera approuvée, le bouton WhatsApp pointera dessus.
- En attendant, tu peux tester `/rendez-vous` directement dans le navigateur (réservation + email + ICS doivent fonctionner).

## Question avant d'exécuter

**Quel lien doit ouvrir le bouton du template v1 (celui qui marche maintenant) ?**

1. La home `https://logisorama.ch/` (comportement historique avant tout ce chantier)
2. Directement `https://logisorama.ch/rendez-vous` (si Meta a déjà approuvé v1 avec cette URL)
3. Autre URL — précise

Réponds-moi avec 1 / 2 / 3 et je bascule tout de suite. Les rappels automatiques (24h/3h/1h/30 min) je les fais après, comme prévu.
