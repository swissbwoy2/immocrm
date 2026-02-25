

## Synchronisation Calendrier - Fichiers ICS universels

### Probleme actuel
La synchronisation Google Calendar depend d'une API externe qui n'est pas encore activee. De plus, elle ne fonctionne pas avec le calendrier natif iPhone.

### Solution
Generer des fichiers `.ics` (format iCalendar universel) a chaque creation d'evenement. Ces fichiers fonctionnent avec :
- **Calendrier iPhone** (natif)
- **Google Calendar**
- **Outlook**
- **Tout autre calendrier**

Deux mecanismes complementaires :

1. **Bouton "Ajouter au calendrier"** sur chaque visite/evenement : telecharge un fichier `.ics` que l'utilisateur peut ouvrir pour l'ajouter a son calendrier
2. **Envoi automatique par email** : a chaque creation d'evenement, un email avec le fichier `.ics` en piece jointe est envoye au participant (fonctionne automatiquement sur iPhone - le calendrier propose l'ajout)

### Ce qui sera synchronise
- Visites (normales et deleguees)
- Etats des lieux
- Signatures de bail
- Evenements manuels du calendrier

### Details techniques

**Nouveau fichier : `src/utils/generateICS.ts`**
- Fonction utilitaire qui genere une chaine ICS valide (format RFC 5545) a partir des details d'un evenement (titre, description, date debut/fin, lieu)
- Fonction pour declencher le telechargement du fichier `.ics` dans le navigateur

**Nouvelle edge function : `send-calendar-invite`**
- Recoit les details de l'evenement + email du destinataire
- Genere le fichier `.ics`
- Envoie un email via Resend avec le `.ics` en piece jointe (`text/calendar`)
- L'iPhone detecte automatiquement ce type de piece jointe et propose l'ajout au calendrier natif

**Modifications des pages existantes :**
- `src/pages/agent/Visites.tsx` : ajout d'un bouton "Ajouter au calendrier" sur chaque carte de visite
- `src/pages/agent/Calendrier.tsx` : envoi d'invite ICS a la creation d'evenement
- `src/pages/agent/Candidatures.tsx` : invite ICS pour les etats des lieux
- `src/pages/client/Calendrier.tsx` : bouton "Ajouter au calendrier" sur les visites
- `src/pages/client/MesCandidatures.tsx` : invite ICS pour les signatures
- `src/pages/admin/Calendrier.tsx` : meme logique pour l'admin
- `src/pages/agent/Messagerie.tsx` et `src/pages/client/Messagerie.tsx` : invite ICS quand une visite ou un etat des lieux est cree via la messagerie

**Format du fichier ICS :**
```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ImmoCRM//FR
BEGIN:VEVENT
DTSTART:20260225T140000Z
DTEND:20260225T150000Z
SUMMARY:Visite - Rue de Lausanne 15
DESCRIPTION:Visite avec le client
LOCATION:Rue de Lausanne 15, 1000 Lausanne
END:VEVENT
END:VCALENDAR
```

**Prerequis :**
- Verification que le secret Resend (RESEND_API_KEY) est configure pour l'envoi email (sinon, seul le telechargement manuel sera disponible)

