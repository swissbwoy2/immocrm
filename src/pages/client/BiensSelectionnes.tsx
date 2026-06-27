import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { Card } from '@/components/ui/card';
import { Loader2, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PurchaseOffreCard } from '@/components/achat/PurchaseOffreCard';
import { isPurchaseBuyer } from '@/lib/journey';

const SELECTED_STATUTS = ['interesse', 'visite_planifiee', 'visite_effectuee', 'offre_envisagee'];

export default function BiensSelectionnes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [offres, setOffres] = useState<any[]>([]);

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
    } else {
      setOffres((prev) => prev.map((o) => (o.id === id ? { ...o, statut: newStatut } : o)));
    }
    toast({ title: 'Statut mis à jour' });
  };

  return (
    <PremiumPageShellV2>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-sky-600" /> Biens sélectionnés
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Les biens à l'achat qui ont retenu votre attention.
          </p>
        </div>
        <Badge className="bg-sky-600 hover:bg-sky-600 text-white border-0 text-sm px-3 py-1">
          {offres.length} bien{offres.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      ) : offres.length === 0 ? (
        <Card className="p-10 text-center border-sky-100">
          <Building2 className="h-10 w-10 text-sky-600 mx-auto mb-3 opacity-60" />
          <h2 className="text-lg font-semibold mb-1">Aucun bien sélectionné pour le moment</h2>
          <p className="text-sm text-muted-foreground">
            Marquez un bien comme « Intéressé » dans Biens proposés pour le retrouver ici.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {offres.map((o) => (
            <PurchaseOffreCard
              key={o.id}
              offre={o}
              onRequestVisit={() => updateStatut(o.id, 'visite_planifiee')}
              onNotInterested={() => updateStatut(o.id, 'refusee')}
            />
          ))}
        </div>
      )}
    </PremiumPageShellV2>
  );
}
