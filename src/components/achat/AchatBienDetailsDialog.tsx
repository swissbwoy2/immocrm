import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PurchaseOffreCard } from '@/components/achat/PurchaseOffreCard';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  offre: any | null;
  onInterested?: () => void;
  onNotInterested?: () => void;
  onRequestVisit?: () => void;
}

export function AchatBienDetailsDialog({ open, onOpenChange, offre, onInterested, onNotInterested, onRequestVisit }: Props) {
  if (!offre) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails du bien</DialogTitle>
        </DialogHeader>
        <PurchaseOffreCard
          offre={offre}
          onInterested={onInterested}
          onNotInterested={onNotInterested}
          onRequestVisit={onRequestVisit}
        />
      </DialogContent>
    </Dialog>
  );
}
