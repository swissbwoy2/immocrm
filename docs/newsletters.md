# Newsletter Logisorama

Le menu admin **Newsletter** ouvre `/admin/newsletter`. L’ancienne page **Campagnes de suivi** reste dédiée à ses campagnes fixes.

## Utilisation

1. Dans **Contacts**, choisissez la catégorie puis importez un CSV (UTF-8, virgule ou point-virgule ; colonnes `email`, `prenom`, `nom`). La catégorie courante est présélectionnée. Choisissez Client ou Prospect et une ou plusieurs catégories : propriétaires bailleurs, propriétaires vendeurs, chercheurs à louer, chercheurs à acheter. Vérifiez la liste avant import. Les doublons sont fusionnés ; une réimportation ne réactive pas un désinscrit ou un contact exclu.
2. **Ajouter des clients de l’application** propose les profils actifs et non anonymisés ayant les notifications email activées. Cochez les clients et leur catégorie. Cette opération copie uniquement leur email et leur nom dans le répertoire Newsletter.
3. Dans **Créer**, donnez un nom interne et un objet. Collez du **HTML** ou importez un fichier `.html`. Le bouton **Utiliser le modèle Logisorama** charge la référence du 3 octobre 2026 (640 px, vert/crème, images et blocs alternés, CTA vers `/nouveau-mandat`). Les quatre images livrées dans `public/newsletter` doivent être publiées avec le frontend avant utilisation.
4. Prévisualisez, sélectionnez vos destinataires et, si souhaité, envoyez un test à votre adresse. Les filtres Client/Prospect et catégorie sont indépendants ; la sélection est conservée quand le filtre change, avec un compteur global explicite.
5. Envoyez ou programmez en heure suisse (Europe/Zurich), puis confirmez le récapitulatif. Une campagne programmée devient non modifiable ; dupliquez-la pour une autre édition. Une programmation future peut être annulée.
6. **Historique** affiche les campagnes. Ouvrez une campagne et actualisez son suivi pour voir les échecs/exclusions. « Transmis au prestataire » signifie accepté par l’API, pas livré dans la boîte du destinataire. Les événements disponibles sont réunis dans « Suivi & statistiques » (voir ci-dessous).

Les brouillons enregistrent le contenu ; la sélection des destinataires doit être refaite à leur réouverture. L’aperçu est isolé du reste de l’application ; les scripts/formulaires et commentaires conditionnels VML sont retirés lors de l’enregistrement. Le bouton HTML reste visible dans Outlook. Les mises en page tierces nécessitent un email de test dans les clients de messagerie concernés.

## Connexion Infomaniak

Le module Newsletter utilise désormais l’API Newsletter Infomaniak. Les autres emails de l’application ne sont pas modifiés. Les statuts « transmis » indiquent une prise en charge de la campagne, pas une livraison individuelle.

Configuration privée dans Supabase Vault :

- `infomaniak_newsletter_api_key` : jeton Newsletter, jamais présent dans Git ou dans le navigateur.
- `infomaniak_newsletter_config` : JSON avec `domain_id`, `sender_email`, `sender_name`. Production : domaine 66294 / logisorama.ch, expéditeur support@logisorama.ch, nom Logisorama.
- `newsletter_infomaniak_credentials()` est réservé au rôle de service. L’API admin `connection` ne retourne que l’état du domaine et l’expéditeur.

Appliquer `20261003140000_newsletter_infomaniak.sql` après la migration Newsletter initiale, déployer `newsletter-admin` et `newsletter-worker`, puis publier le frontend. La migration refuse de modifier une file Resend encore active ; elle conserve les campagnes historiques. Le cron existant et son secret de déclenchement sont réutilisés. Les brouillons, imports et catégories restent disponibles même lorsque le domaine est en attente de validation.

L’entrée TXT racine `newsletter.infomaniak.com` a été ajoutée le 3 octobre 2026 (record 38299965). La validation du domaine reste contrôlée par Infomaniak ; l’API refuse les mises en file et les tests tant que le domaine n’est pas `enabled`.

## Programmation et destinataires

Logisorama conserve le créneau Europe/Zurich et l’instantané de la sélection. À partir de l’heure prévue, le worker prépare les abonnés manquants (15 par passage) puis un groupe Infomaniak propre à la campagne. Les abonnés déjà présents ne sont jamais réactivés. Les désinscriptions locales existantes sont conservées ; celles d’Infomaniak sont synchronisées avant la mise en file et le traitement. Les adresses non actives chez Infomaniak sont exclues et visibles dans le suivi. Les désinscriptions encore uniquement présentes dans un autre prestataire doivent être importées avant une migration de listes historiques.

Le groupe distant et le nombre de destinataires sont contrôlés avant chaque transmission. `all_subscribers` reste faux. Le domaine et l’adresse d’expédition sont figés à la programmation ; un changement de domaine de configuration bloque les campagnes anciennes. La préparation de grandes listes peut décaler le début effectif : l’heure choisie est le début du traitement, pas une garantie de livraison à la seconde.

Infomaniak ajoute son lien de désinscription personnel automatiquement. Les anciens liens `{{unsubscribe_url}}` et `{{{RESEND_UNSUBSCRIBE_URL}}}` du modèle sont retirés avant transfert pour éviter des liens invalides. Le HTML est toujours assaini par l’API avant enregistrement/envoi. Les styles en ligne, les images HTTPS et les boutons sont conservés ; tester les modèles tiers dans les clients email utilisés.

## Prévention des doublons

Un verrou de cinq minutes protège chaque campagne. Avant l’appel irréversible de programmation Infomaniak, la base enregistre `submitting`. Un crash, timeout, réponse ambiguë ou échec de persistance après cet appel met la campagne à vérifier : aucun nouvel appel d’envoi automatique. Vérifier la campagne indiquée dans Infomaniak avant une intervention manuelle. Les créations de brouillons/groupes ne déclenchent aucun email ; un arrêt avant sauvegarde de leur identifiant peut laisser un brouillon/groupe inutilisé, mais pas un envoi répété.

Les tests utilisent une table de demandes unique par identifiant : le même appel n’envoie pas deux tests. Les tests incertains restent à vérifier. Les campagnes/groupes distants sont conservés pour le suivi ; les statistiques de livraison ne sont pas encore importées dans Logisorama. Le bouton Actualiser recharge l’état de connexion et les listes ; le suivi d’une campagne recharge ses résultats locaux.

## Vérification sans envoi

```sh
npx deno test --config tests/newsletter/deno.json --allow-read --allow-env tests/newsletter/model_test.ts tests/newsletter/queue_test.ts tests/newsletter/infomaniak_test.ts tests/newsletter/infomaniak_queue_test.ts
npx deno check --config tests/newsletter/deno.json supabase/functions/newsletter-admin/index.ts supabase/functions/newsletter-worker/index.ts
npx tsc --noEmit -p tsconfig.app.json
npx eslint src/pages/admin/Newsletter.tsx supabase/functions/_shared/newsletter-infomaniak.ts supabase/functions/newsletter-admin/index.ts supabase/functions/newsletter-worker/index.ts
npm run build
```

Le worker accepte `{ "action": "check" }` uniquement avec son authentification interne habituelle. Ce contrôle lit l’état Infomaniak sans traiter de campagne ni envoyer d’email.

Les tests PGlite exécutent les vraies migrations : contrôles de rôle, instantané, exclusions tardives, concurrence, résultat incertain sans renvoi, et validation atomique de prise en charge. Les tests du client utilisent des réponses factices, vérifient la pagination, les états d’abonnés, la non-divulgation des secrets et le ciblage explicite. La démo UI (`npx vite --config tests/newsletter/preview/vite.config.ts`) reste entièrement en mémoire.

Documentation fournisseur : [API Newsletter](https://developer.infomaniak.com/docs/api/post/1/newsletters/%7Bdomain%7D/campaigns), [groupes](https://developer.infomaniak.com/docs/api/post/1/newsletters/%7Bdomain%7D/groups/%7Bgroup%7D/subscribers/assign), [programmation](https://developer.infomaniak.com/docs/api/put/1/newsletters/%7Bdomain%7D/campaigns/%7Bcampaign%7D/schedule).

## Suivi des communications

L’onglet **Suivi & statistiques** réunit les campagnes créées dans Logisorama, les emails automatiques et manuels, et les notifications dans l’application. Filtrer par période, canal, type/campagne, destinataire ou objet ; ouvrir **Détail** pour les dates, délais et interactions. Les totaux couvrent toute la sélection, pas seulement la page de 50 résultats.

- Resend : pixels et liens opaques enregistrés avant l’envoi ; reçus de distribution par webhook signé Svix. Raccorder le webhook avec le bouton administrateur (clé Resend autorisée à gérer les webhooks). Le secret reste dans Vault. Les doublons et les reçus arrivés avant la confirmation d’envoi sont rapprochés.
- Infomaniak : ouvertures et clics activés pour les prochaines campagnes. Les rapports sont synchronisés progressivement toutes les 10 minutes. Les compteurs sont ceux du fournisseur ; une observation lors de la synchronisation n’est pas une heure d’ouverture certaine.
- Emails système Lovable : instrumentation des modèles transactionnels, récupération paginée des journaux fournisseur, y compris l’authentification. Les liens contenant un jeton d’authentification ou de désinscription ne sont pas réécrits. Les emails d’authentification gérés par le SDK gardent leur transport natif et ne fournissent pas d’ouvertures/clics.
- SMTP : envoi et interactions suivis ; SMTP ne fournit pas d’accusé de distribution dans cette intégration. Les copies CC/BCC et envois multi-destinataires ne permettent pas d’attribuer une ouverture à une personne ; le suivi individuel est désactivé pour ces envois.
- Notifications : première date de marquage comme lue (y compris marquage groupé) et clics dans la cloche/les pages de notifications. « Disponible » n’atteste pas la réception d’un push sur un appareil.

Une ouverture n’atteste ni une lecture humaine, ni une durée de lecture. Les pixels peuvent être bloqués ou préchargés et les liens visités par des scanners. Les dates historiques manquantes restent inconnues. Les anciennes valeurs `lead_email_logs.delivered_at` étaient déduites des pixels : elles ne sont pas présentées comme des confirmations serveur.

Reporting réservé aux administrateurs ; collecteurs publics limités aux identifiants opaques. Aucun corps d’email, adresse IP ou user-agent n’est conservé dans les événements ; les paramètres des URL sont retirés du journal. Les liens de destination complets sont réservés au service de redirection. Un incident d’instrumentation ne doit pas empêcher l’envoi transactionnel. Tests de base de données dans une transaction annulée et prévisualisation locale fictive : aucun envoi réel.

Si la clé Resend autorise seulement les envois, le raccordement peut aussi se faire depuis la session Resend : créer un webhook vers `https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/communication-webhook`, sélectionner `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed` et `email.failed`, puis utiliser **Raccordement manuel depuis Resend** dans le suivi. Le champ est masqué, réservé à l’administrateur, et vidé dès l’enregistrement dans Vault.
