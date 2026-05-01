## Objectif

Harmoniser les **4 campagnes email de suivi** (`email_followup_campaigns`) pour qu'elles utilisent toutes le **tutoiement** (« tu », « ton », « toi »), à l'image de la campagne **Location** déjà rédigée ainsi.

## Périmètre

- ✅ Campagne **Location** → déjà en tutoiement, **aucun changement**
- 🔄 Campagne **Vente** → vouvoiement → tutoiement
- 🔄 Campagne **Rénovation** → vouvoiement → tutoiement
- 🔄 Campagne **Achat** → placeholders → rédaction complète en tutoiement (et passage en `active` ? — à confirmer, voir ci-dessous)

## Champs concernés par campagne

Pour chaque campagne, on harmonise : `subject`, `preview_text`, `hero_title`, `hero_subtitle`, `body_intro`, `benefits`, `trust_text`, `cta_label`. La `signature` reste inchangée (« L'équipe Logisorama.ch by Immo-Rama Sàrl »).

### Vente (réécriture)

| Champ | Avant | Après |
|---|---|---|
| subject | Vous souhaitez vendre votre bien immobilier ? | Tu souhaites vendre ton bien immobilier ? |
| preview_text | Estimation gratuite, vente discrète, accompagnement premium. | Estimation gratuite, vente discrète, accompagnement premium. *(inchangé — neutre)* |
| hero_title | Vendre votre bien en toute sérénité | Vendre ton bien en toute sérénité |
| hero_subtitle | Logisorama vous accompagne dans la vente… | Logisorama t'accompagne dans la vente de ton appartement, ta maison ou ton immeuble en Suisse romande. |
| body_intro | Bonjour {{first_name}}, merci pour votre intérêt… | Bonjour {{first_name}}, merci pour ton intérêt concernant la vente de ton bien immobilier. |
| benefits[0] | Estimation gratuite et confidentielle | *(inchangé)* |
| benefits[1] | Vente off-market possible | *(inchangé)* |
| benefits[2] | Accompagnement notarial complet | *(inchangé)* |
| benefits[3] | Stratégie marketing premium | *(inchangé)* |
| trust_text | Notre équipe a accompagné plus de 200 propriétaires vendeurs en Suisse romande. | *(inchangé — neutre)* |
| cta_label | Démarrer mon estimation | *(inchangé)* |

### Rénovation (réécriture)

| Champ | Avant | Après |
|---|---|---|
| subject | Votre projet de rénovation mérite un accompagnement premium | Ton projet de rénovation mérite un accompagnement premium |
| preview_text | Pilotage complet de votre chantier… | Pilotage complet de ton chantier par des experts certifiés. |
| hero_title | Donnez vie à votre projet de rénovation | Donne vie à ton projet de rénovation |
| hero_subtitle | …Logisorama orchestre votre projet… | De l'étude à la réception du chantier, Logisorama orchestre ton projet de rénovation ou de construction. |
| body_intro | Bonjour {{first_name}}, merci de votre intérêt… | Bonjour {{first_name}}, merci de ton intérêt pour notre service Rénovation Intelligente. |
| benefits[0] | Devis comparés et négociés pour vous | Devis comparés et négociés pour toi |
| benefits[1] | Suivi de chantier digital en temps réel | *(inchangé)* |
| benefits[2] | Garanties et assurances vérifiées | *(inchangé)* |
| benefits[3] | Économies moyennes de 15% sur le budget | *(inchangé)* |
| trust_text | Plus de 50 chantiers livrés avec un taux de satisfaction de 98%. | *(inchangé — neutre)* |
| cta_label | Lancer mon projet | *(inchangé)* |

### Achat (réécriture complète — sort du placeholder)

| Champ | Après |
|---|---|
| subject | Tu cherches à acheter ton futur bien en Suisse romande ? |
| preview_text | Sélection off-market, accompagnement personnalisé, négociation experte. |
| hero_title | Trouve le bien qui te ressemble |
| hero_subtitle | Logisorama t'aide à dénicher l'appartement, la maison ou l'immeuble qui correspond exactement à tes critères — y compris sur des biens off-market. |
| body_intro | Bonjour {{first_name}}, merci de ton intérêt pour notre service de recherche de bien à l'achat en Suisse romande. |
| benefits | • Accès à des biens off-market exclusifs<br>• Sélection personnalisée selon tes critères<br>• Accompagnement à la visite et à la négociation<br>• Suivi notarial et financement jusqu'à la signature |
| trust_text | Notre équipe a accompagné des dizaines d'acquéreurs vers leur futur logement en Suisse romande. |
| cta_label | Définir mes critères d'achat |
| signature | *(inchangé)* |

## Statut de la campagne Achat

Actuellement `status = 'draft'`. **Question** : faut-il la passer en `active` après réécriture ? Par défaut je la **laisse en `draft`** pour que tu valides le rendu via le bouton « Test » avant activation manuelle depuis `/admin/campagnes-suivi`. Tu pourras l'activer en un clic depuis l'UI.

## Implémentation technique

1. **Une seule migration SQL** (`UPDATE` sur `email_followup_campaigns` pour les 3 campagnes : `vente`, `renovation`, `achat`) — la campagne `location` n'est pas touchée.
2. **Aucune modification de code** : le template HTML (`send-followup-campaign/index.ts`) reste inchangé, il lit dynamiquement les champs depuis la base.
3. **Aucun redéploiement Edge Function nécessaire**.
4. **Aucune modification du `body_intro` mécanique** : le placeholder `{{first_name}}` reste pris en charge par le rendu.

## Vérification post-changement

- Aller sur `/admin/campagnes-suivi`
- Pour chaque campagne, cliquer **« Aperçu »** → vérifier le rendu HTML
- Cliquer **« Test »** → email envoyé à `info@immo-rama.ch` pour valider l'objet, le preheader et le ton dans Gmail/Outlook
- Si OK pour Achat → activer manuellement depuis l'UI

## Hors périmètre

- Pas de changement de design / template HTML
- Pas de changement des CTA URLs / UTM
- Pas de changement de la signature
- Pas de changement de la logique d'envoi ou de la file d'attente