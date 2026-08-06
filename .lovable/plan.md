# Serveur MCP distant pour ChatGPT — évaluation de faisabilité (aucun code)

## 1) Transport MCP « Streamable HTTP » sur les Edge Functions de ce projet

**OUI, faisable et fiable — à condition de rester sur des outils courts.**

Constats vérifiés dans ce projet : le backend tourne déjà sur des Edge Functions Deno, `supabase/config.toml` permet déjà `verify_jwt = false` par fonction (nécessaire pour que le serveur MCP valide lui-même le jeton OAuth), et aucun module MCP n'existe encore (`src/lib/mcp` absent, pas de dépendance MCP dans `package.json`).

Le SDK Lovable `@lovable.dev/mcp-js` génère une fonction Deno unique qui sert le transport Streamable HTTP (`initialize`, `tools/list`, `tools/call`, réponses SSE) sur une URL se terminant par `/mcp`. C'est le chemin supporté ; écrire le transport JSON-RPC à la main n'est pas nécessaire.

Limites concrètes à accepter :

| Sujet | Réalité |
| --- | --- |
| Timeout | Un appel d'outil est un aller-retour synchrone avec timeout côté client (quelques dizaines de secondes). Les 5 outils visés sont courts, donc OK. Une génération PDF lourde ou un scraping ne doit PAS être exposé comme outil synchrone. |
| Streaming | SSE fonctionne, mais l'infrastructure Edge peut couper une connexion longue. Ne pas concevoir d'outil qui streame pendant des minutes. |
| Cold start | Quelques centaines de ms à ~2 s sur la première requête après inactivité. Sans impact pour une routine 4×/jour. |
| Sessions | Pas d'état en mémoire entre invocations. Chaque requête doit être auto-portante (jeton + arguments). C'est le mode nominal de MCP ici. |
| Taille de réponse | Retourner des résumés et des URLs signées, jamais des fichiers en base64. `create_document_download_link` doit rendre une URL signée courte durée, pas le PDF. |
| Upload | `upload_prepared_pdf` doit recevoir une URL source ou un petit contenu, sinon passer par une URL d'upload signée générée par l'outil. |

## 2) Écrire soi-même un serveur d'AUTORISATION OAuth 2.1 complet

**Non recommandé, et inutile ici.**

Implémenter à la main `/authorize` + PKCE S256, `/token` avec rotation et révocation de refresh tokens, JWKS et rotation de clés, DCR ou Client ID Metadata Documents, plus les deux documents `.well-known`, représente un composant de sécurité à part entière. Ce que je ne peux honnêtement pas garantir dans une implémentation maison sur Edge Functions : la conformité stricte RFC (8414, 9728, 7636, 8707), la gestion correcte des codes à usage unique en environnement concurrent, la rotation/révocation propre des refresh tokens, la rotation des clés de signature, et la résistance aux erreurs subtiles (redirect_uri, binding audience, replay).

**Ce projet n'en a pas besoin** : Supabase Auth est déjà l'autorité d'authentification et sait jouer le rôle de serveur d'autorisation OAuth 2.1 avec PKCE et enregistrement dynamique de client. L'app n'a alors qu'à être *resource server* (valider le jeton) plus une page de consentement. Aucun serveur d'autorisation externe dédié n'est requis.

## 3) Alternatives

| Option | Compatible connecteur ChatGPT | Sécurité | Effort |
| --- | --- | --- | --- |
| A. MCP sur Edge Function + OAuth délégué à Supabase Auth (activation du serveur OAuth managé, page de consentement dans l'app) | Oui — c'est le flux attendu par ChatGPT (découverte, DCR, PKCE) | Élevée : jetons par utilisateur, RLS appliquée, révocable | Moyen |
| B. Serveur d'autorisation OAuth écrit à la main sur Edge Functions | Oui en théorie | Risquée : surface cryptographique et RFC à maintenir soi-même | Élevé |
| C. Service externe dédié (Auth0/Clerk/WorkOS ou hébergement Node) devant le MCP | Oui | Élevée | Élevé + nouveau composant à opérer et à payer |
| D. Jeton bearer statique stocké dans le connecteur, sans OAuth | Partiellement : le mode développeur/connecteur de ChatGPT privilégie OAuth ou « pas d'auth » ; le bearer fixe n'est pas un chemin propre et durable | Faible : secret longue durée, non lié à un utilisateur, non rotatif | Faible |
| E. MCP public sans authentification | Oui | Inacceptable ici : les données clients seraient lisibles par n'importe qui | Faible |

Option retenue : **A**.

## 4) Architecture recommandée (unique)

```text
ChatGPT (connecteur MCP)
   │  découverte OAuth + PKCE + DCR
   ▼
Supabase Auth  ── serveur d'autorisation (managé)
   │  redirige vers la page de consentement de l'app
   ▼
logisorama.ch/.lovable/oauth/consent  (page React, connexion du compte robot)
   │  approbation → code → jeton d'accès utilisateur
   ▼
Edge Function « mcp » (resource server, verify_jwt = false, validation OAuth par le SDK)
   │  requêtes exécutées avec le jeton du compte robot
   ▼
Base de données — RLS appliquée avec le rôle automation_operator existant
```

Répartition :

- **Faisable dans Lovable/Supabase** : le serveur MCP et ses 5 outils, l'activation du serveur d'autorisation OAuth managé, la page de consentement, la validation des jetons, le cloisonnement par RLS via `automation_operator`.
- **Exige un composant externe** : rien, sauf si le connecteur exigeait un fournisseur d'identité tiers ou des scopes OAuth granulaires (Supabase émet des jetons sans scopes applicatifs ; les permissions restent portées par RLS et par le code des outils).

Sur l'objectif « travailler 4×/jour sans dépendre des cookies du navigateur » : oui, c'est précisément ce que ce montage résout. Le connecteur détient un refresh token OAuth et renouvelle son accès sans navigateur. Une seule action humaine est nécessaire : l'approbation initiale du consentement, connecté avec le compte robot. Les mécanismes actuels (`automation-auth-exchange` / `automation-auth-consume`, page `/bot-login-code`) deviennent alors redondants pour ChatGPT et devraient être supprimés une fois le MCP validé, pour ne pas laisser deux portes d'entrée.

## 5) Risques concrets et points de non-conformité probable

1. **Émetteur (issuer) mal configuré** : l'émetteur doit être l'hôte Supabase direct, pas l'URL proxy. Une erreur ici fait échouer toute vérification de jeton — cause d'échec la plus fréquente.
2. **Retour de consentement perdu** : si la page de connexion ne renvoie pas l'utilisateur vers l'URL de consentement complète (y compris après un login social), le connecteur échoue silencieusement.
3. **Confusion de rôle** : si un outil utilisait une clé privilégiée au lieu du jeton de l'appelant, la RLS serait contournée et toutes les données clients exposées. Tous les outils doivent agir avec l'identité vérifiée.
4. **Fuite via un outil trop généreux** : `get_postulation_context` doit renvoyer un périmètre borné, pas des dossiers arbitraires. À cadrer explicitement.
5. **Liens de téléchargement** : URLs signées à durée très courte, jamais d'URL publique persistante ni de contenu binaire dans la réponse.
6. **`get_robot_login_link`** : cet outil rendrait un lien de session par-dessus le canal ChatGPT. À mon avis il ne devrait pas exister dans un MCP authentifié — il recrée le risque que l'OAuth supprime. Recommandation : le retirer du périmètre.
7. **Écritures** : `upload_prepared_pdf` est le seul outil mutant. Il exige des policies d'INSERT ciblées, une validation stricte du type de fichier et de la taille, et un `destructiveHint: false`.
8. **Timeouts** : tout traitement long exposé comme outil synchrone apparaîtra « interrompu » côté ChatGPT même s'il réussit côté serveur.
9. **Non-conformité probable d'un AS maison** : usage unique des codes en concurrence, rotation/révocation des refresh tokens, rotation des clés JWKS, validation exacte des `redirect_uri`, binding d'audience — c'est exactement ce que l'option A évite.

## Étapes proposées si vous validez

1. Activer le serveur d'autorisation OAuth managé du backend.
2. Ajouter la page de consentement dans l'app, avec préservation du retour après connexion.
3. Créer le module MCP et les outils (4, sans `get_robot_login_link`), chacun agissant sous l'identité du jeton.
4. Déployer la fonction `mcp`, connecter ChatGPT, vérifier la découverte, le consentement, `tools/list` et un appel réel.
5. Vérifier la RLS avec le compte robot, puis retirer l'ancien mécanisme de code de connexion.
