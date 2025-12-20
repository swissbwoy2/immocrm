import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, User, Plus, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumLotCardProps {
  lot: {
    id: string;
    reference: string | null;
    designation: string | null;
    type_lot: string | null;
    etage: string | null;
    nb_pieces: number | null;
    surface: number | null;
    loyer_actuel: number | null;
    charges_actuelles: number | null;
    statut: string | null;
  };
  locataire?: {
    id: string;
    nom: string;
    prenom: string | null;
    statut: string | null;
  } | null;
  onAddLocataire?: () => void;
  onClick?: () => void;
  className?: string;
}

const formatCurrency = (value: number | null) => {
  if (value === null) return '-';
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
};

const getTypeLotIcon = (type: string | null) => {
  switch (type) {
    case 'appartement':
      return Home;
    case 'parking':
    case 'garage':
      return Home;
    case 'cave':
    case 'depot':
      return Home;
    default:
      return Home;
  }
};

const getTypeLotLabel = (type: string | null) => {
  const labels: Record<string, string> = {
    appartement: 'Appartement',
    parking: 'Parking',
    garage: 'Garage',
    cave: 'Cave',
    depot: 'Dépôt',
    bureau: 'Bureau',
    commerce: 'Commerce',
    atelier: 'Atelier'
  };
  return labels[type || ''] || type || 'Lot';
};

export function PremiumLotCard({
  lot,
  locataire,
  onAddLocataire,
  onClick,
  className
}: PremiumLotCardProps) {
  const Icon = getTypeLotIcon(lot.type_lot);
  const isOccupied = !!locataire;
  const totalMensuel = (lot.loyer_actuel || 0) + (lot.charges_actuelles || 0);

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md cursor-pointer",
        !isOccupied && "border-amber-200 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isOccupied ? "bg-primary/10" : "bg-amber-500/10"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                isOccupied ? "text-primary" : "text-amber-600"
              )} />
            </div>
            <div>
              <h3 className="font-semibold">
                {lot.reference || lot.designation || 'Lot sans référence'}
              </h3>
              <p className="text-sm text-muted-foreground">{getTypeLotLabel(lot.type_lot)}</p>
            </div>
          </div>
          <Badge variant={isOccupied ? 'default' : 'secondary'}>
            {isOccupied ? 'Occupé' : 'Vacant'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          {lot.etage && (
            <div>
              <span className="text-muted-foreground">Étage:</span>
              <span className="ml-1">{lot.etage}</span>
            </div>
          )}
          {lot.nb_pieces && (
            <div>
              <span className="text-muted-foreground">Pièces:</span>
              <span className="ml-1">{lot.nb_pieces}</span>
            </div>
          )}
          {lot.surface && (
            <div>
              <span className="text-muted-foreground">Surface:</span>
              <span className="ml-1">{lot.surface} m²</span>
            </div>
          )}
          {lot.loyer_actuel && (
            <div>
              <span className="text-muted-foreground">Loyer:</span>
              <span className="ml-1 font-medium">{formatCurrency(lot.loyer_actuel)}</span>
            </div>
          )}
        </div>

        {isOccupied ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {locataire?.prenom} {locataire?.nom}
            </span>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onAddLocataire?.();
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un locataire
          </Button>
        )}

        {totalMensuel > 0 && (
          <div className="mt-3 pt-3 border-t flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total mensuel</span>
            <span className="font-semibold text-primary">{formatCurrency(totalMensuel)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
