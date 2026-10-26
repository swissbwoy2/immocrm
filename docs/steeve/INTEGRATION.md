# Steeve 3D — notice d'intégration

Steeve, personnage 3D en costume blanc, remplace l'ancienne bulle bleue de messagerie de l'application et le bouton
vert « Tu cherches un logement ? » du site public. Un clic (ou Entrée / Espace) ouvre la messagerie existante,
sans rechargement de la page.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/components/steeve/mascot/steeve-model.js` | Construction du personnage (géométries, matériaux, groupes articulés, expressions) |
| `src/components/steeve/mascot/steeve-mascot.js` | Composant `<steeve-mascot>` : rendu, animations, états, accessibilité, repli SVG |
| `src/components/steeve/mascot/steeve-fallback.webp` | Image fixe de secours (rendu du même modèle, 10 Ko) |
| `src/components/steeve/mascot/steeve-mascot.d.ts` | Types de l'API du composant |
| `src/components/steeve/SteeveLauncher.tsx` | Adaptateur React : chargement à la demande, événements, état réel de la messagerie |
| `src/components/messaging/floating/FloatingMessenger.tsx` | Application : Steeve à la place de l'ancienne bulle (supprimée) |
| `src/components/public-site/SteevePublicChat.tsx` | Site public et portail d'annonces : Steeve ouvre la discussion visiteurs |
| `src/index.css` | Tailles du canevas et position au-dessus de la barre du bas de l'application mobile |

Le personnage vient du pack « steeve-3d-logisorama-v1 ». Le comportement (états, priorités, bulle,
accessibilité, attente autonome) reprend celui du kit précédent, enrichi de 22 gestes. Le tout est adapté à la
version de Three.js du projet (0.133.1, la même que les autres scènes 3D), pour n'avoir qu'une seule version de
Three.js dans l'application. Les couleurs (sRGB) sont converties ; le rendu est en sRGB avec des lumières physiques.
Ne sont pas utilisés en production :
- la démonstration, les scripts et le dossier `vendor/` du pack ;
- le composant `<steeve-widget>` du pack ;
- `steeve.glb`, qui n'est pas chargé : le modèle est construit en code.

## Raccord à la messagerie

- Application : `SteeveLauncher` reçoit l'état réel de `useFloatingMessenger` (`isOpen`, `unreadCount`, `busy`)
  et appelle `toggle()`, comme l'ancienne bulle. Une seule instance par mise en page. Elle reste la même pendant
  la navigation dans l'application, sans nouvel accueil.
- `busy` (Steeve réfléchit) est vrai pendant l'envoi d'un message. Pour un client dont la conversation est confiée
  à Steeve, il le reste jusqu'à l'arrivée réelle de sa réponse. Il est libéré en cas d'erreur, à la fermeture de
  la conversation ou après 60 secondes.
- Un nouveau message arrivé messagerie fermée déclenche une invitation « Tu as un nouveau message ! » et la
  pastille de non-lus, sans ouvrir la messagerie.
- Réactions aux événements réels (prop `cue` de `SteeveLauncher`, fonction `react()` du contexte de messagerie) :

  | Événement | Geste |
  |---|---|
  | Message enregistré (sans réponse de Steeve attendue) | pouce levé (`success`) |
  | Réponse de Steeve reçue | oui (`nod`) |
  | Échec de l'envoi | oups (`oops`) |
  | Pièce classée dans le dossier | applaudissements (`clap`) |
  | Site public, offres trouvées | il montre la discussion (`point`) |
  | Site public, réponse sans offre | oui (`nod`) |
  | Site public, « Elle me plaît » | célébration (`celebrate`) |
  | Site public, nouvelle conversation | clin d'œil (`wink`) |
  | Relance (« Tu hésites ? ») | invitation ou geste vers la discussion |
- Changement de compte ou déconnexion : la messagerie se referme et oublie la conversation active.
- Site public : la discussion visiteurs existante s'ouvre et se ferme. Steeve réfléchit pendant l'attente de la
  réponse. Les invitations (première visite, relance « Tu hésites ? ») passent par sa bulle.

Aucun geste n'est déclenché par une temporisation simulée : le pouce levé suit l'enregistrement réel du message,
jamais une action métier non confirmée.

## API du composant

`play(state, { duration, message })`, `setChatOpen`, `setBusy`, `setQuiet`, `setUnread`, `setMotionEnabled`,
`setTrackingEnabled`, `setAutonomyEnabled`, `setScrollEnabled`.

Gestes (`play`) : greeting, invite, point, success, laugh, surprise, wink, nod, shake, shrug, clap, sad,
celebrate, bow, jump, spin, oops, dance, curious, stretch, thinking, sleep (planche : `steeve-gestes.png`).
États automatiques : idle, listening (messagerie ouverte ou saisie), thinking (attente réelle), scroll.

Événements : `steeve:open`, `steeve:statechange`, `steeve:rendererchange`.

Attributs ajoutés pour Logisorama :
- `mode="inline"` : l'application le positionne elle-même ;
- `greeting="off"` : pas de coucou (une fois par session d'onglet).

## Comportements

- Le regard suit la souris (pointeur précis seulement, jamais au doigt). Le widget reste fixe.
- Défilement : légère réaction, puis calme environ 0,8 seconde après l'arrêt.
- Attente sans activité : un petit geste au hasard à 8, 18 et 28 s (curiosité, étirement, clin d'œil,
  haussement d'épaules, oui), puis le sommeil à 42 s. Il se réveille au moindre geste. La veille n'est ni une
  déconnexion ni la fin de la conversation.
- Priorité : saisie > attente réelle > geste demandé > messagerie ouverte > défilement / autonomie > repos.
  Les gestes déclenchés par l'application restent visibles messagerie ouverte (Steeve est à côté du panneau sur
  ordinateur) ; les gestes autonomes, eux, s'arrêtent.
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
