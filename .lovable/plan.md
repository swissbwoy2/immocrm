

# RDV téléphoniques cliquables + bouton « Calendrier » (.ics)

## Constat

Dans `PremiumDayEvents.tsx`, les RDV téléphoniques sont rendus dans le bloc « Regular event » (lignes 383-519) :
- Le conteneur n'a **aucun `onClick`** → impossible d'ouvrir un détail.
- Aucun **bouton « Calendrier »** (`AddToCalendarButton`) n'est rendu, contrairement aux visites.
- Aucun composant détail n'existe pour les RDV téléphoniques.

## Correctif

### 1. Nouveau composant `src/components/calendar/PhoneAppointmentDetailDialog.tsx`
Dialog premium affichant les infos complètes du RDV téléphonique :
- En-tête : nom du prospect + statut (Confirmé/En attente)
- Date & heure (Europe/Zurich, format FR long)
- Téléphone (cliquable `tel:`) + Email (cliquable `mailto:`)
- Lien vers la fiche lead : `/admin/leads?id=...` (si `lead_id`)
- **Bouton « Calendrier »** = `AddToCalendarButton` avec :
  ```ts
  event = {
    title: `RDV téléphonique — ${prospectName}`,
    description: `Appel à passer au ${phone}\nEmail : ${email}`,
    location: `Téléphone : ${phone}`,
    startDate: new Date(slot_start),
    endDate: new Date(slot_end),
    uid: `phone-appt-${appt.id}@logisorama.ch`,
  }
  ```
  → télécharge un .ics ajoutable à iPhone/Google/Outlook (même UX que les visites).
- Bouton « Annuler le RDV » (passe `status='annule'` dans `lead_phone_appointments`).

### 2. `src/components/calendar/PremiumDayEvents.tsx`
- Ajouter prop optionnelle `onPhoneApptClick?: (apptId: string) => void`.
- Dans le bloc « Regular event » : si `data.id.startsWith('phone-rdv-')` :
  - Ajouter `cursor-pointer` + `onClick={() => onPhoneApptClick?.(apptId)}` sur la carte.
  - Stopper la propagation sur le bouton supprimer existant.
  - Masquer les actions « Effectué / Annuler » génériques (gérées dans le dialog).
- Conserver le rendu actuel pour les autres événements (aucun changement).

### 3. `src/pages/admin/Calendrier.tsx`
- Ajouter state `selectedPhoneApptId: string | null`.
- Stocker la liste brute `phoneAppts` (déjà fetchée) dans un state pour pouvoir retrouver le détail à l'ouverture du dialog.
- Passer `onPhoneApptClick={(id) => setSelectedPhoneApptId(id)}` à `<PremiumDayEvents />`.
- Rendre `<PhoneAppointmentDetailDialog appt={...} open={...} onClose={...} onCancelled={() => loadData(true)} />` à la racine.

### 4. Aucun changement DB / Edge Function
Le fetch `lead_phone_appointments` existe déjà. Le `.ics` est généré côté client via `generateICS.ts` (déjà importé par `AddToCalendarButton`).

## Validation

1. Aller sur `/admin/calendrier`, cliquer une date avec un RDV téléphonique → la carte est `cursor-pointer`.
2. Cliquer sur la carte → un dialog s'ouvre avec nom, téléphone (cliquable), email, date/heure.
3. Cliquer sur **« Calendrier »** → un fichier `.ics` se télécharge ; ouverture sur iPhone propose « Ajouter au calendrier ».
4. Cliquer **« Annuler le RDV »** → statut passe à `annule`, la carte disparaît du calendrier (~3 s via realtime).
5. Aucune régression sur les visites, signatures, états des lieux, événements réguliers.

## Fichiers touchés

```text
[NEW] src/components/calendar/PhoneAppointmentDetailDialog.tsx
[MOD] src/components/calendar/PremiumDayEvents.tsx
      - prop onPhoneApptClick
      - carte cliquable si id startsWith('phone-rdv-')
      - masquer actions génériques pour ces events
[MOD] src/pages/admin/Calendrier.tsx
      - state phoneAppts brut + selectedPhoneApptId
      - rendu <PhoneAppointmentDetailDialog />
      - prop onPhoneApptClick passée à PremiumDayEvents
```

