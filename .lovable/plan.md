## Objectif

1. Dans les **4 campagnes de suivi** (`achat`, `location`, `vente`, `renovation`), remplacer les CTA actuels (« Active ta recherche prioritaire », « Continuer ma recherche », etc. → `nouveau-mandat`, `vendre-mon-bien`, …) par un CTA unique : **« Fixer un rendez-vous à nos bureaux »** pointant vers la section de prise de RDV physique de la landing (`https://logisorama.ch/#analyse-dossier`).

   - Mêmes horaires que la section landing déjà mise à jour (Lun→Sam, 08h30→12h00 / 13h30→16h30, créneaux 30 min, Crissier).
   - Le 2ᵉ CTA actuel (« 📞 Réservez votre appel téléphonique gratuit ») est obsolète : il sera relabellé « 📍 Fixer un RDV gratuit à nos bureaux (30 min) » et son texte d'accompagnement aligné (accueil au bureau, plus d'appel téléphonique).

2. Permettre de **renvoyer une campagne aux leads déjà contactés** (aujourd'hui ils sont silencieusement filtrés via `skipped_already_sent`).

## Design email

**Inchangé** — même template, même charte (or/noir Logisorama), mêmes blocs (hero, badge couronne, logo, bénéfices, parcours secondaires, avis Google, signature, footer). Seuls les libellés/URLs des deux CTA changent.

## Fichiers modifiés

### 1. Migration DB — table `email_followup_campaigns`
Mettre à jour les 4 lignes :
- `cta_label` → `Fixer un rendez-vous au bureau`
- `cta_url` → `https://logisorama.ch/?utm_source=email&utm_medium=followup&utm_campaign=<key>&utm_content=cta_rdv_bureau#analyse-dossier`

### 2. `supabase/functions/send-followup-campaign/index.ts`
- 2ᵉ CTA (lignes ~174 et ~222) : libellé « 📍 Fixer un RDV gratuit à nos bureaux (30 min) » + texte « Un expert Logisorama vous accueille à Crissier — c'est 100 % gratuit, durée 30 min. ».
- Mode `send` : accepter un flag `allowResend: boolean` dans le body. Si `true`, ne pas pré-filtrer via `alreadySent` (l'unsub reste filtré). Compteur `skipped_already_sent` toujours retourné (à 0 quand `allowResend`).

### 3. `src/pages/admin/CampagnesSuivi.tsx`
- Ajouter une **case à cocher « 🔁 Renvoyer aux leads déjà contactés »** dans la barre d'action de l'onglet Leads (à côté du bouton « Envoyer »).
- Passer `allowResend` à `supabase.functions.invoke("send-followup-campaign", …)`.
- Adapter le dialog de confirmation : si `allowResend`, afficher un avertissement « Cette action enverra l'email même aux leads ayant déjà reçu cette campagne ».
- Ne pas désactiver/dégriser les leads `sentLeadIds` quand `allowResend` est coché (pour pouvoir les sélectionner).

## Hors scope

- Aucun changement de schéma DB autre que `UPDATE` sur les 4 lignes campagnes.
- Pas de migration `lead_email_logs` : l'historique conserve toutes les traces (un lead renvoyé aura simplement plusieurs lignes `sent`).
- Aucun changement design/layout email.
- La landing `#analyse-dossier` (déjà mise à jour précédemment vers RDV bureau) reste telle quelle.

## Vérification post-implémentation

1. Aperçu (mode `preview`) des 4 campagnes : vérifier que les 2 CTA pointent bien vers `…#analyse-dossier` avec libellés corrects.
2. Envoi test (mode `test`) sur `info@immo-rama.ch` pour la campagne `location` → contrôler le rendu Gmail/Apple Mail.
3. Cocher « Renvoyer » sur un lead déjà marqué « envoyé » → vérifier que le bouton Envoyer s'active et que la fonction renvoie réellement (nouvelle ligne `sent` dans `lead_email_logs`).
