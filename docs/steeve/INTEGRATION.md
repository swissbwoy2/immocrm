# Steeve 3D — notice d'intégration

Steeve, personnage 3D en costume blanc, remplace l'ancienne bulle bleue de messagerie de l'application et le bouton
vert « Tu cherches un logement ? » du site public. Un clic (ou Entrée / Espace) ouvre la messagerie existante,
sans rechargement de la page.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/components/steeve/mascot/steeve-model.js` | Construction du personnage (géométries, matériaux, groupes articulés, expressions) |
| `src/components/steeve/mascot/steeve-mascot.js` | Composant `<steeve-mascot>` : rendu, animations, états, accessibilité, repli SVG |
| `src/components/steeve/mascot/steeve-master.svg` | Image fixe de secours (WebGL indisponible, module pas encore chargé) |
| `src/components/steeve/mascot/steeve-mascot.d.ts` | Types de l'API du composant |
| `src/components/steeve/SteeveLauncher.tsx` | Adaptateur React : chargement à la demande, événements, état réel de la messagerie |
| `src/components/messaging/floating/FloatingMessenger.tsx` | Application : Steeve à la place de l'ancienne bulle (supprimée) |
| `src/components/public-site/SteevePublicChat.tsx` | Site public et portail d'annonces : Steeve ouvre la discussion visiteurs |
| `src/index.css` | Tailles du canevas et position au-dessus de la barre du bas de l'application mobile |

Le composant vient du kit « steeve-cursor-kit 3 ». Il a été adapté à la version de Three.js du projet
(0.133.1, la même que les autres scènes 3D) : une seule version de Three.js dans l'application. Les couleurs du
kit (sRGB) sont converties, le rendu est en sRGB et les lumières sont physiques, pour garder l'aspect validé.
Les fichiers de démonstration du kit (`index.html`, `demo.css`, `demo.js`), l'ancien moteur SVG
(`steeve-visual.js`) et l'export statique `steeve.glb` ne sont pas utilisés en production.

## Raccord à la messagerie

- Application : `SteeveLauncher` reçoit l'état réel de `useFloatingMessenger` (`isOpen`, `unreadCount`, `busy`)
  et appelle `toggle()`, comme l'ancienne bulle. Une seule instance par mise en page. Elle reste la même pendant
  la navigation dans l'application, sans nouvel accueil.
- `busy` (Steeve réfléchit) est vrai pendant l'envoi d'un message. Pour un client dont la conversation est confiée
  à Steeve, il le reste jusqu'à l'arrivée réelle de sa réponse. Il est libéré en cas d'erreur, à la fermeture de
  la conversation ou après 60 secondes.
- Un nouveau message arrivé messagerie fermée déclenche une invitation « Tu as un nouveau message ! » et la
  pastille de non-lus, sans ouvrir la messagerie.
- Changement de compte ou déconnexion : la messagerie se referme et oublie la conversation active.
- Site public : la discussion visiteurs existante s'ouvre et se ferme. Steeve réfléchit pendant l'attente de la
  réponse. Les invitations (première visite, relance « Tu hésites ? ») passent par sa bulle.

L'état « success » n'est déclenché par aucune temporisation : il est réservé à une réussite métier confirmée,
qui reste à raccorder si besoin (`play('success')`).

## API du composant

`play(state, { duration, message })`, `setChatOpen`, `setBusy`, `setQuiet`, `setUnread`, `setMotionEnabled`,
`setTrackingEnabled`, `setAutonomyEnabled`, `setScrollEnabled`.

États : idle, greeting, listening, thinking, success, dance, sleep, invite, curious, stretch, scroll.

Événements : `steeve:open`, `steeve:statechange`, `steeve:rendererchange`.

Attributs ajoutés pour Logisorama :
- `mode="inline"` : l'application le positionne elle-même ;
- `greeting="off"` : pas de coucou (une fois par session d'onglet).

## Comportements

- Le regard suit la souris (pointeur précis seulement, jamais au doigt). Le widget reste fixe.
- Défilement : légère réaction, puis calme environ 0,8 seconde après l'arrêt.
- Attente sans activité : regard curieux à 8 s, ajustement du col à 18 s, sommeil à 35 s, réveil au moindre
  geste. La veille n'est ni une déconnexion ni la fin de la conversation.
- Priorité : saisie > attente > messagerie ouverte > geste demandé > défilement / autonomie > repos.
- `prefers-reduced-motion` : aucune animation, regard au centre.
- Rendu à la demande, pause en arrière-plan ou hors écran, pixel ratio limité, ressources GPU libérées au
  démontage.

## Tests réalisés (navigateur Chromium automatisé, rendu WebGL logiciel)

- Site public 1440, 768 et 390 px : rendu 3D, une seule mascotte, ouverture au clavier (Entrée), état
  « réflexion » pendant la réponse, fermeture par Échap avec retour du focus sur Steeve.
- Application (session agent simulée), 1440 et 390 px :
  - l'ancienne bulle a disparu ;
  - le clic ouvre la messagerie sans rechargement (même document) ;
  - le panneau s'affiche à gauche de Steeve sur ordinateur ;
  - le focus revient sur Steeve à la fermeture ;
  - après une navigation interne, la même instance est conservée ;
  - sur mobile, Steeve est au-dessus de la barre de navigation du bas.
- WebGL désactivé : repli SVG, la discussion s'ouvre toujours.
- Mouvements réduits : regard figé au centre.
- 12 montages et démontages successifs sans erreur.

## Restent à tester

- Téléphones et tablettes physiques (Safari iOS, Android), fluidité sur appareil modeste, batterie.
- Clavier virtuel ouvert, perte réelle du GPU.
- Vrais comptes : client confié à Steeve (attente de sa réponse), messages non lus réels.
- Retour du focus sur mobile après fermeture tactile. Dans le test automatisé, le focus est resté sur la page.
