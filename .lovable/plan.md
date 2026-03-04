

## Enrichir la description ICS avec toutes les infos utiles

### Probleme

Actuellement, le champ `description` du fichier `.ics` ne contient quasiment rien — juste "X client(s) concerné(s)" ou le nom d'un seul client. L'utilisateur perd toutes les infos utiles une fois l'evenement dans son calendrier natif (iPhone, Google, Outlook).

### Solution

Creer une fonction utilitaire `buildVisiteICSDescription()` dans `src/utils/generateICS.ts` qui construit une description riche a partir des donnees disponibles. Cette fonction sera appelee partout ou `AddToCalendarButton` est utilise pour des visites.

#### Contenu de la description ICS enrichie :
```text
👤 Client(s): Jean Dupont, Marie Martin
👨‍💼 Agent: Christ Ramazani
📍 Av. Victor-Ruffy 37, 1012 Lausanne
💰 Prix: 2'450 CHF/mois
🏠 3.5 pièces • 85m² • 2e étage
📝 Notes: Client très intéressé, rappeler lundi
🔗 Annonce: https://...
📄 Description: Bel appartement lumineux...
```

#### Fichiers modifies :

1. **`src/utils/generateICS.ts`** — Ajouter `buildVisiteICSDescription(data)` qui accepte un objet avec les champs optionnels (clients, agent, prix, pieces, surface, etage, notes, lien_annonce, description) et construit une string multiligne.

2. **`src/pages/admin/Calendrier.tsx`** (ligne 677-687) — Remplacer la description minimale par l'appel a `buildVisiteICSDescription` avec toutes les donnees de `selectedVisiteGroup` (clients via `getClientName`, agent via `getAgentName`, offres.prix/pieces/surface/etage/description/lien_annonce, notes).

3. **`src/pages/agent/Visites.tsx`** — Enrichir les 2 endroits (carte visite ligne 822 et dialog detail ligne 1652) avec les donnees client, offre et notes.

4. **`src/components/calendar/PremiumAgentDayEvents.tsx`** (ligne 447) — Enrichir avec les noms des clients du groupe, les infos offre.

5. **`src/components/calendar/PremiumClientDayEvents.tsx`** (ligne 398) — Enrichir avec les infos offre disponibles.

### Resultat
Le fichier `.ics` telecharge contiendra toutes les informations utiles directement lisibles dans l'app calendrier native, sans avoir besoin de retourner dans l'application.

