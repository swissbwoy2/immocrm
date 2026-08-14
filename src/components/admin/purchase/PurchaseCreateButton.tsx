import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  userId?: string | null;
  assignedAgentId?: string | null;
  onCreated?: () => void;
}

export function PurchaseCreateButton({ clientId, userId, assignedAgentId, onCreated }: Props) {
  const { createProject } = usePurchaseProject({ clientId });
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-5 border-primary/20 bg-primary/5/40">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="p-2 rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Client identifié comme acheteur</h3>
          <p className="text-sm text-muted-foreground">
            Aucun parcours d'accompagnement à l'achat n'est encore actif pour ce client. Créer le parcours active les 17 étapes, le profil de financement et la tenue des charges (mandat 6 mois).
          </p>
        </div>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const id = await createProject(clientId, userId || null, assignedAgentId || null);
            setBusy(false);
            if (id) { toast.success('Parcours achat créé'); onCreated?.(); }
            else toast.error('Création impossible');
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Créer le parcours achat
        </Button>
      </div>
    </Card>
  );
}
