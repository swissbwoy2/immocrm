# Newsletter Logisorama

Le menu admin **Newsletter** ouvre `/admin/newsletter`. L’ancienne page **Campagnes de suivi** reste dédiée à ses campagnes fixes.

## Utilisation

1. Dans **Contacts**, choisissez la catégorie puis importez un CSV (UTF-8, virgule ou point-virgule ; colonnes `email`, `prenom`, `nom`). La catégorie courante est présélectionnée. Choisissez Client ou Prospect et une ou plusieurs catégories : propriétaires bailleurs, propriétaires vendeurs, chercheurs à louer, chercheurs à acheter. Vérifiez la liste avant import. Les doublons sont fusionnés ; une réimportation ne réactive pas un désinscrit ou un contact exclu.
2. **Ajouter des clients de l’application** propose les profils actifs et non anonymisés ayant les notifications email activées. Cochez les clients et leur catégorie. Cette opération copie uniquement leur email et leur nom dans le répertoire Newsletter.
3. Dans **Créer**, donnez un nom interne et un objet. Collez du **HTML** ou importez un fichier `.html`. Le bouton **Utiliser le modèle Logisorama** charge la référence du 3 octobre 2026 (640 px, vert/crème, images et blocs alternés, CTA vers `/nouveau-mandat`). Les quatre images livrées dans `public/newsletter` doivent être publiées avec le frontend avant utilisation.
4. Prévisualisez, sélectionnez vos destinataires et, si souhaité, envoyez un test à votre adresse. Les filtres Client/Prospect et catégorie sont indépendants ; la sélection est conservée quand le filtre change, avec un compteur global explicite.
5. Envoyez ou programmez en heure suisse (Europe/Zurich), puis confirmez le récapitulatif. Une campagne programmée devient non modifiable ; dupliquez-la pour une autre édition. Une programmation future peut être annulée.
6. **Historique** affiche les campagnes. Ouvrez une campagne et actualisez son suivi pour voir les échecs/exclusions. « Transmis à Resend » signifie accepté par l’API, pas livré dans la boîte du destinataire. Les événements de livraison/ouverture ne sont pas intégrés dans cette version.

Les brouillons enregistrent le contenu ; la sélection des destinataires doit être refaite à leur réouverture. L’aperçu est isolé du reste de l’application ; les scripts/formulaires et commentaires conditionnels VML sont retirés lors de l’enregistrement. Le bouton HTML reste visible dans Outlook. Les mises en page tierces nécessitent un email de test dans les clients de messagerie concernés.

## Déploiement

Cette fonctionnalité nécessite **la migration SQL, les deux fonctions serveur et le frontend**. Le seul déploiement du frontend ne suffit pas.

- Projet Supabase cible : `ydljsdscdnqrqnjvqela`.
- Appliquer `supabase/migrations/20261003110000_newsletters.sql` via la procédure de migration habituelle après revue des migrations en attente. Dépendances existantes : `user_roles`/`has_role`, `email_unsubscribe_tokens`, `email_unsubscribes`, `pg_cron`, `pg_net` et Vault. La migration crée un secret aléatoire `newsletter_dispatch_key`, réservé au déclenchement du worker ; sa valeur ne figure jamais dans le code ou la commande cron.
- Déployer `newsletter-admin` et `newsletter-worker`. Leur `verify_jwt=false` est volontaire : contrôle manuel du JWT utilisateur + rôle admin pour l’API, jeton privé du cron (vérifié côté serveur), ou clé de service/secret interne pour le worker. Une simple clé publique ou un JWT non admin ne donne pas accès.
- Réutiliser le secret serveur `RESEND_API_KEY`, avec accès à l’envoi **et à la lecture des contacts**. Le module synchronise les désinscriptions Resend avant chaque mise en file et chaque passage du worker. Si cette lecture échoue, aucun envoi n’est lancé et une erreur est affichée dans le suivi.
- `NEWSLETTER_FROM_EMAIL` est facultatif : valeur par défaut `Logisorama <info@immo-rama.ch>`, domaine à conserver vérifié chez Resend.
- Vérifier la présence du cron `newsletter-dispatch` (chaque minute) et du secret Vault propre à Newsletter, sans exposer sa valeur. Publier le frontend, y compris `public/newsletter/*`. Aucun contact ni aucune campagne n’est créé automatiquement par la migration.
- Vérification après mise en ligne : ouverture admin et refus non admin, chargement des quatre images publiques, import de contacts de test, brouillon, test email autorisé, programmation avec un destinataire de test, puis contrôle du résultat Resend et du lien de désinscription.

Contrôle de production en lecture seule le 3 octobre 2026 : tables de profils et désinscriptions compatibles, `pg_cron`, `pg_net` et helper présents ; **secret Vault `email_queue_service_role_key` absent**. Le nouveau module utilise donc son propre jeton de déclenchement, créé par la migration, et ne dépend pas de ce secret partagé absent. La mise en file refuse de programmer si son propre jeton manque. Aucune modification de production n’a été appliquée pendant ces contrôles.

## Envoi et reprise

La mise en file est transactionnelle : contenu figé, instantané des adresses sélectionnées et jeton de désinscription par destinataire. Un double clic ne peut pas reprogrammer la même campagne. Chaque destinataire reçoit un email individuel, sans exposer les autres adresses. Les désinscriptions locales et Resend sont exclues ; le lien de désinscription est ajouté automatiquement, ou placé avec `{{unsubscribe_url}}`.

Le cron prend au maximum 50 destinataires par passage (boucle d’envoi limitée à 45 s). Les quotas Resend restent applicables. Chaque tentative réutilise la clé `newsletter/<delivery-id>` avec le même contenu et le même jeton. Un résultat réseau incertain reste en reprise automatique, puis passe à **à vérifier** après 8 tentatives ou 23 h : vérifier Resend avant de dupliquer/reprendre manuellement, pour éviter les doublons après expiration de l’idempotence fournisseur. Les statuts échoués/à vérifier ne sont pas relancés automatiquement à travers une nouvelle campagne.

Limites explicites : 1 000 lignes par CSV, 250 Ko de HTML, 10 000 contacts dans le répertoire, synchronisation Resend jusqu’à 10 000 contacts, programmation jusqu’à 30 jours. Au-delà, adapter pagination et synchronisation avant d’élargir ces limites. Les imports de plus de 1 000 clients depuis l’application sont découpés en lots ; un import partiel peut être relancé sans doublons.

## Vérification locale sans envoi

```sh
npx deno test --config tests/newsletter/deno.json --allow-read --allow-env tests/newsletter/model_test.ts tests/newsletter/queue_test.ts
npx deno check --config tests/newsletter/deno.json supabase/functions/newsletter-admin/index.ts supabase/functions/newsletter-worker/index.ts
npx tsc --noEmit -p tsconfig.app.json
npx eslint src/features/newsletter/*.ts src/pages/admin/Newsletter.tsx supabase/functions/_shared/newsletter*.ts supabase/functions/newsletter-admin/index.ts supabase/functions/newsletter-worker/index.ts
npm run build
```

Le test PostgreSQL exécute la vraie migration dans PGlite avec des tables et rôles factices. Il couvre import, exclusions, snapshot atomique, double programmation, leases et reprise, fenêtre d’idempotence, annulation future et RLS.

Le parcours UI peut être vérifié avec une API purement en mémoire, sans authentification de production ni accès à Supabase/Resend :

```sh
npx vite --config tests/newsletter/preview/vite.config.ts
```

Ouvrir `http://127.0.0.1:4178/tests/newsletter/preview/index.html`. `contacts.csv` fournit un doublon et une adresse invalide. Les images du modèle utilisent les URL HTTPS finales et ne seront disponibles qu’après publication ; l’API de démonstration simule les imports et envois sans persistance. Ne pas utiliser cette démonstration pour envoyer une vraie campagne.

Lors de la validation initiale, `npm ci` a échoué sur les incompatibilités déjà présentes entre `package.json` et `package-lock.json` (notamment Capacitor et dépendances manquantes). L’installation locale a utilisé `npm install --legacy-peer-deps --ignore-scripts --no-package-lock` sans modifier le verrouillage existant. Le plugin MCP de la compilation régénère un fichier hors périmètre : ne pas inclure ce changement automatique dans cette fonctionnalité.
