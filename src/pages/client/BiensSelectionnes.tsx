import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { PremiumOffreRecueCard } from '@/components/premium/PremiumOffreRecueCard';
import { PremiumEmptyState } from '@/components/premium/PremiumEmptyState';
import { Card } from '@/components/ui/card';
import { Loader2, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AchatBienDetailsDialog } from '@/components/achat/AchatBienDetailsDialog';
import { isPurchaseBuyer } from '@/lib/journey';

const SELECTED_STATUTS = ['interesse', 'visite_planifiee', 'visite_effectuee', 'offre_envisagee'];

export default function BiensSelectionnes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [offres, setOffres] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: client } = await supabase
      .from('clients')
      .select('id, user_id, type_recherche, journey_type')
      .eq('user_id', user.id)
      .maybeSingle();
    const { data: project } = await supabase
      .from('purchase_projects')
      .select('id, client_id, user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!isPurchaseBuyer(client, project)) {
      navigate('/client', { replace: true });
      return;
    }

    if (!client?.id) {
      setOffres([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('offres')
      .select('*')
      .eq('client_id', client.id)
      .in('statut', SELECTED_STATUTS)
      .order('created_at', { ascending: false });

    setOffres(data || []);
    setLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    document.title = 'Biens sélectionnés | Immo-Rama';
    load();
  }, [load]);

  const updateStatut = async (id: string, newStatut: string) => {
    const { error } = await supabase
      .from('offres')
      .update({ statut: newStatut, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    if (!SELECTED_STATUTS.includes(newStatut)) {
      setOffres((prev) => prev.filter((o) => o.id !== id));
      setSelected(null);
    } else {
      setOffres((prev) => prev.map((o) => (o.id === id ? { ...o, statut: newStatut } : o)));
      setSelected((prev: any) => (prev && prev.id === id ? { ...prev, statut: newStatut } : prev));
    }
    toast({ title: 'Statut mis à jour' });
  };

  return (
    <PremiumPageShellV2>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Biens sélectionnés
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Les biens à l'achat qui ont retenu votre attention.
          </p>
        </div>
        <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 text-sm px-3 py-1">
          {offres.length} bien{offres.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : offres.length === 0 ? (
        <Card className="p-2">
          <PremiumEmptyState
            icon={Building2}
            title="Aucun bien sélectionné pour le moment"
            description="Marquez un bien comme « Intéressé » dans Biens proposés pour le retrouver ici."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {offres.map((o, i) => (
            <PremiumOffreRecueCard
              key={o.id}
              index={i}
              offre={{
                id: o.id,
                adresse: o.adresse,
                pieces: o.nombre_pieces ?? o.pieces,
                surface: o.surface,
                prix: o.prix,
                statut: o.statut,
                date_envoi: o.date_envoi || o.created_at,
              }}
              onClick={() => setSelected(o)}
            />
          ))}
        </div>
      )}

      <AchatBienDetailsDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        offre={selected}
        onRequestVisit={() => selected && updateStatut(selected.id, 'visite_planifiee')}
        onNotInterested={() => selected && updateStatut(selected.id, 'refusee')}
      />
    </PremiumPageShellV2>
  );
}
