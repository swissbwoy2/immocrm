
# Plan : Modifier les offres existantes avec gestion des heures de fin de visite

## Analyse du problème

Actuellement :
- Le `EditOffreDialog` permet de modifier uniquement les informations du bien (adresse, prix, etc.)
- Les visites liées à une offre sont affichées en lecture seule dans `PremiumAgentOffreDetailsDialog`
- La nouvelle colonne `date_visite_fin` existe en base mais les visites existantes n'ont pas d'heure de fin

## Solution

Enrichir le `EditOffreDialog` pour :
1. Charger les visites associées à l'offre
2. Afficher et permettre la modification des dates/heures de début ET de fin
3. Sauvegarder les modifications des visites en base

## Fichier à modifier

### `src/components/EditOffreDialog.tsx`

#### 1. Ajouter l'état pour les visites

```typescript
interface VisiteData {
  id: string;
  date_visite: string;
  date_visite_fin: string | null;
  statut: string;
}

const [visites, setVisites] = useState<VisiteData[]>([]);
```

#### 2. Charger les visites dans le useEffect

```typescript
useEffect(() => {
  if (offre) {
    // ... existing formData setup ...
    
    // Load associated visits
    loadVisites();
  }
}, [offre]);

const loadVisites = async () => {
  if (!offre?.id) return;
  
  const { data } = await supabase
    .from('visites')
    .select('id, date_visite, date_visite_fin, statut')
    .eq('offre_id', offre.id)
    .order('date_visite', { ascending: true });
    
  if (data) {
    setVisites(data.map(v => ({
      id: v.id,
      date_visite: v.date_visite ? formatDateTimeLocal(v.date_visite) : '',
      date_visite_fin: v.date_visite_fin ? extractTime(v.date_visite_fin) : '',
      statut: v.statut
    })));
  }
};
```

#### 3. Ajouter les handlers pour modifier les visites

```typescript
const handleVisiteDateChange = (index: number, value: string) => {
  const updated = [...visites];
  updated[index].date_visite = value;
  setVisites(updated);
};

const handleVisiteEndTimeChange = (index: number, value: string) => {
  const updated = [...visites];
  updated[index].date_visite_fin = value;
  setVisites(updated);
};
```

#### 4. Ajouter la section visites dans le JSX

```typescript
{/* Section Visites */}
{visites.length > 0 && (
  <div className="space-y-4 pt-4 border-t">
    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
      <Calendar className="h-4 w-4" />
      Créneaux de visite
    </h4>
    
    {visites.map((visite, index) => (
      <div key={visite.id} className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
        <div className="space-y-2">
          <Label className="text-xs">Début</Label>
          <Input
            type="datetime-local"
            value={visite.date_visite}
            onChange={(e) => handleVisiteDateChange(index, e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Heure de fin</Label>
          <Input
            type="time"
            value={visite.date_visite_fin || ''}
            onChange={(e) => handleVisiteEndTimeChange(index, e.target.value)}
          />
        </div>
        <Badge variant="outline" className="w-fit">
          {visite.statut}
        </Badge>
      </div>
    ))}
  </div>
)}
```

#### 5. Mettre à jour handleSubmit pour sauvegarder les visites

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!offre?.id) return;

  setLoading(true);
  try {
    // Update offer (existing code)
    const { data, error } = await supabase
      .from('offres')
      .update(updateData)
      .eq('id', offre.id)
      .select()
      .single();

    if (error) throw error;

    // Update visites
    for (const visite of visites) {
      let endDate = null;
      if (visite.date_visite_fin && visite.date_visite) {
        const dateOnly = visite.date_visite.split('T')[0];
        endDate = new Date(`${dateOnly}T${visite.date_visite_fin}`).toISOString();
      }
      
      await supabase
        .from('visites')
        .update({
          date_visite: new Date(visite.date_visite).toISOString(),
          date_visite_fin: endDate
        })
        .eq('id', visite.id);
    }

    toast.success('Offre et visites modifiées avec succès');
    onSuccess({ ...offre, ...data });
    onOpenChange(false);
  } catch (error) {
    // error handling
  }
};
```

## Fonctions utilitaires à ajouter

```typescript
// Convert ISO date to datetime-local format
const formatDateTimeLocal = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toISOString().slice(0, 16);
};

// Extract time from ISO date
const extractTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toTimeString().slice(0, 5);
};
```

## Résumé des modifications

| Fichier | Modification |
|---------|-------------|
| `src/components/EditOffreDialog.tsx` | Charger les visites, afficher les inputs début/fin, sauvegarder les modifications |

## Résultat attendu

Quand un agent clique sur "Modifier" une offre :
1. Le dialogue affiche les informations du bien (comme avant)
2. En dessous, une nouvelle section "Créneaux de visite" affiche les visites associées
3. Pour chaque visite, l'agent peut modifier :
   - La date et heure de début (datetime-local)
   - L'heure de fin (time)
4. Les modifications sont enregistrées en cliquant sur "Enregistrer"

Cela permet de corriger les visites existantes qui n'ont pas d'heure de fin.
