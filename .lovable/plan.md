
# Plan : Ajouter les créneaux horaires avec heure de fin au calendrier

## Analyse du problème

Actuellement, lors de la création d'un événement, vous pouvez seulement définir **une heure de début** (ex: 12:00). Il n'y a pas de possibilité de définir un créneau complet (ex: 12:00 à 14:00).

## Ce qui existe déjà

| Élément | État |
|---------|------|
| Colonne `end_date` en base de données | Existe (TIMESTAMPTZ) |
| Interface `EventFormData` avec `end_time` | Existe mais non utilisé |
| Input heure de fin dans le formulaire | Manquant |

## Solution technique

### Fichiers à modifier

#### 1. `src/components/calendar/EventForm.tsx`
Formulaire utilisé par les admins et agents

**Modifications :**
- Ajouter un input `end_time` à côté de l'input `event_time`
- Ajouter la logique pour combiner `end_date` + `end_time` en TIMESTAMPTZ
- Validation : l'heure de fin doit être après l'heure de début (si même jour)

```
Date *         |  Heure début  |  Heure fin
[Calendrier]   |  [12:00]      |  [14:00]
```

#### 2. `src/components/proprietaire/AddCalendarEventDialog.tsx`
Formulaire utilisé par les propriétaires

**Modifications :**
- Ajouter un state `endTime` 
- Ajouter un input heure de fin quand `allDay` est désactivé
- Calculer et envoyer `end_date` lors de l'insertion

---

## Détail des modifications

### EventForm.tsx

1. **Initialiser `end_time`** dans `getDefaultFormData` :
```typescript
end_time: '10:00', // 1h après event_time par défaut
```

2. **Ajouter l'input heure de fin** après l'input heure de début :
```typescript
{!formData.all_day && (
  <>
    <div className="w-28">
      <Label>Début</Label>
      <Input type="time" value={formData.event_time} ... />
    </div>
    <div className="w-28">
      <Label>Fin</Label>
      <Input type="time" value={formData.end_time} ... />
    </div>
  </>
)}
```

3. **Pré-remplir lors de l'édition** : extraire l'heure de `end_date` si présente

### AddCalendarEventDialog.tsx

1. **Ajouter les states** :
```typescript
const [endTime, setEndTime] = useState('10:00');
```

2. **Modifier le reset du formulaire** pour inclure `endTime`

3. **Ajouter l'input dans le JSX** :
```typescript
{!allDay && (
  <div className="grid grid-cols-2 gap-2">
    <div>
      <Label>Début</Label>
      <Input type="time" value={eventTime} onChange={...} />
    </div>
    <div>
      <Label>Fin</Label>
      <Input type="time" value={endTime} onChange={...} />
    </div>
  </div>
)}
```

4. **Calculer `end_date`** dans handleSubmit :
```typescript
let fullEndDate = null;
if (!allDay && endTime) {
  fullEndDate = `${eventDate}T${endTime}:00`;
}

const { error } = await supabase.from('calendar_events').insert({
  ...
  end_date: fullEndDate,
});
```

---

## Validation

- L'heure de fin doit être >= heure de début
- Si l'heure de fin est avant l'heure de début, afficher une erreur :
```typescript
if (endTime <= eventTime) {
  toast.error("L'heure de fin doit être après l'heure de début");
  return;
}
```

---

## Affichage dans le calendrier

Les événements avec un créneau s'afficheront comme :
- **Avant** : `12:00 - Réunion client`  
- **Après** : `12:00 - 14:00 - Réunion client`

---

## Résumé

| Fichier | Modification |
|---------|-------------|
| `src/components/calendar/EventForm.tsx` | Ajouter input heure de fin + logique |
| `src/components/proprietaire/AddCalendarEventDialog.tsx` | Ajouter input heure de fin + envoi `end_date` |

---

## Résultat attendu

Après modification, vous pourrez créer des événements avec un créneau horaire complet :
- Début : 12:00
- Fin : 14:00

L'événement sera affiché avec la plage horaire complète dans le calendrier.
