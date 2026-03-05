
Problème clarifié: on parle bien de l’email d’invitation d’un nouvel agent, pas des invitations calendrier.

Constat après vérification:
- Le flux “nouvel agent” passe par `supabase/functions/create-agent/index.ts`.
- Le renvoi passe par `supabase/functions/resend-agent-invitation/index.ts`.
- Pour Oriane (`dulymbois@immo-rama.ch`), l’invitation a bien été déclenchée côté backend:
  - création agent réussie
  - utilisateur auth créé
  - `invited_at` et `confirmation_sent_at` renseignés
  - statut agent = `en_attente`
- Donc le problème n’est probablement pas “l’agent n’a pas été invité”, mais plutôt “l’email n’arrive pas / n’est pas assez fiable / on ne voit pas clairement son état”.

Plan de correction:
1. Fiabiliser les liens d’invitation
- Remplacer les URLs hardcodées `https://immocrm.lovable.app/first-login` par une URL basée sur le domaine réel de l’app.
- Appliquer ce correctif au moins à `create-agent` et `resend-agent-invitation` (et idéalement aux autres invitations similaires).

2. Rendre l’état d’invitation visible dans l’admin
- Afficher dans la page Agents si l’invitation a été envoyée, quand elle a été envoyée, et si le compte est encore “en attente”.
- Éviter que l’admin pense que rien n’a été envoyé alors que le backend l’a bien déclenché.

3. Ajouter un vrai plan B de livraison
- Conserver le renvoi d’invitation.
- Ajouter une option de secours plus claire: renvoyer un email de définition de mot de passe si le compte existe déjà.
- Option utile: générer/copier un lien d’activation manuel depuis l’admin si l’email n’arrive pas.

4. Corriger la configuration d’envoi des emails d’authentification
- Le projet a bien un domaine web personnalisé, mais aucun domaine email n’est configuré pour l’envoi.
- Je prévoirais la mise en place du domaine d’envoi pour améliorer la délivrabilité des emails d’invitation.

5. Vérification de bout en bout
- Créer un agent test neuf avec une autre adresse.
- Vérifier: création → email reçu → clic sur lien → page `first-login` → définition du mot de passe → passage de `en_attente` à actif si prévu par le flux.

Détail technique:
- Fichiers concernés:
  - `supabase/functions/create-agent/index.ts`
  - `supabase/functions/resend-agent-invitation/index.ts`
  - `src/pages/admin/Agents.tsx`
- Donnée confirmée pour Oriane:
  - profil existant
  - rôle `agent`
  - statut `en_attente`
  - invitation backend enregistrée
- Point important:
  - le bug visible semble être surtout un problème de délivrabilité / configuration email + manque de visibilité dans l’interface, pas un échec de création de l’agent lui-même.
