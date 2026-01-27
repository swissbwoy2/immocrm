
# Plan : Ajouter les créneaux horaires avec heure de fin dans la création d'offres

## Analyse

Le formulaire d'envoi d'offres (`EnvoyerOffre.tsx`) permet de proposer jusqu'à 3 dates de visite, mais chaque créneau n'a qu'une heure de début. Il faut ajouter une heure de fin pour chaque créneau.

## Fichiers à modifier

### 1. `src/hooks/useDraftManager.ts`

**Modifier la structure des données pour supporter les heures de fin**

| Avant | Après |
|-------|-------|
| `datesVisite: ["", "", ""]` | `datesVisite: ["", "", ""]` + `datesVisiteFin: ["", "", ""]` |

```typescript
export interface OfferFormData {
  // ... existing fields
  datesVisite: string[];
  datesVisiteFin: string[]; // NOUVEAU
}

export const initialFormData: OfferFormData = {
  // ... existing fields
  datesVisite: ["", "", ""],
  datesVisiteFin: ["", "", ""], // NOUVEAU
};
```

### 2. `src/pages/agent/EnvoyerOffre.tsx`

**2.1 Ajouter l'input heure de fin pour chaque créneau**

Modifier la section des dates de visite (lignes 543-551) :

```typescript
{[0, 1, 2].map((index) => (
  <div key={index} className="grid grid-cols-2 gap-2">
    <div>
      <Label className="text-xs text-muted-foreground">Début</Label>
      <Input 
        type="datetime-local"
        value={formData.datesVisite[index]}
        onChange={(e) => handleDateVisiteChange(index, e.target.value)}
      />
    </div>
    <div>
      <Label className="text-xs text-muted-foreground">Fin</Label>
      <Input 
        type="time"
        value={formData.datesVisiteFin[index]}
        onChange={(e) => handleDateVisiteFinChange(index, e.target.value)}
      />
    </div>
  </div>
))}
```

**2.2 Ajouter le handler pour l'heure de fin**

```typescript
const handleDateVisiteFinChange = (index: number, value: string) => {
  const newDates = [...formData.datesVisiteFin];
  newDates[index] = value;
  setFormData({ ...formData, datesVisiteFin: newDates });
};
```

**2.3 Modifier l'insertion des visites (lignes 310-327)**

La table `visites` a une colonne `date_visite_fin` (si elle existe) ou il faudra l'ajouter :

```typescript
for (let i = 0; i < validDates.length; i++) {
  const dateStr = validDates[i];
  const localDate = new Date(dateStr);
  const isoWithTimezone = localDate.toISOString();
  
  // Calculer l'heure de fin
  let endDate = null;
  const endTime = formData.datesVisiteFin[i];
  if (endTime) {
    const dateOnly = dateStr.split('T')[0]; // Extraire la date
    endDate = new Date(`${dateOnly}T${endTime}`).toISOString();
  }
  
  await supabase
    .from('visites')
    .insert({
      offre_id: offre.id,
      client_id: clientId,
      agent_id: agent.id,
      date_visite: isoWithTimezone,
      date_visite_fin: endDate, // NOUVEAU
      adresse: formData.localisation,
      statut: 'planifiee',
      source: 'proposee_agent',
      notes: formData.commentaires,
    });
}
```

### 3. Vérification de la base de données

Vérifier si la table `visites` a une colonne `date_visite_fin`. Si non, ajouter une migration :

```sql
ALTER TABLE visites ADD COLUMN date_visite_fin TIMESTAMPTZ;
```

---

## Résumé des modifications

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useDraftManager.ts` | Ajouter `datesVisiteFin` dans l'interface et les valeurs par défaut |
| `src/pages/agent/EnvoyerOffre.tsx` | Ajouter inputs heure de fin + modifier l'insertion |
| Base de données (si nécessaire) | Ajouter colonne `date_visite_fin` à la table `visites` |

---

## Résultat attendu

Lors de la création d'une offre, l'agent pourra définir pour chaque créneau de visite :
- **Début** : 15/02/2025 à 12:00
- **Fin** : 14:00

Le créneau sera enregistré avec les deux horaires et affiché correctement côté client.
