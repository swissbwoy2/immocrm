import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { PremiumOffreRecueCard } from '@/components/premium/PremiumOffreRecueCard';
import { PremiumEmptyState } from '@/components/premium/PremiumEmptyState';
import { Card } from '@/components/ui/card';
import { Loader2, Home } from 'lucide-react';
import { AchatBienDetailsDialog } from '@/components/achat/AchatBienDetailsDialog';
import { isPurchaseBuyer } from '@/lib/journey';

export default function BiensProposes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
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
      .order('created_at', { ascending: false });

    setOffres(data || []);
    setLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    document.title = 'Biens proposés | Immo-Rama';
    load();
  }, [load]);

  // Deep link : ?offreId=<id> ou ?offre=<id> ouvre directement la fiche du bien
  useEffect(() => {
    const id = searchParams.get('offreId') || searchParams.get('offre');
    if (!id || offres.length === 0) return;
    const found = offres.find((o) => o.id === id);
    if (found) {
      setSelected(found);
      const next = new URLSearchParams(searchParams);
      next.delete('offreId');
      next.delete('offre');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, offres, setSearchParams]);

  const updateStatut = async (id: string, newStatut: string) => {
    const { error } = await supabase
      .from('offres')
      .update({ statut: newStatut, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    setOffres((prev) => prev.map((o) => (o.id === id ? { ...o, statut: newStatut } : o)));
    setSelected((prev: any) => (prev && prev.id === id ? { ...prev, statut: newStatut } : prev));
    toast({
      title: newStatut === 'interesse' ? 'Bien ajouté à vos sélections' : 'Statut mis à jour',
      description: newStatut === 'interesse' ? 'Retrouvez-le dans « Biens sélectionnés ».' : undefined,
    });
  };

  return (
    <PremiumPageShellV2>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="h-6 w-6 text-primary" /> Biens proposés
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tous les biens à l'achat sélectionnés et envoyés par votre conseiller.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : offres.length === 0 ? (
        <Card className="p-2">
          <PremiumEmptyState
            icon={Home}
            title="Aucun bien proposé pour le moment"
            description="Votre conseiller analyse le marché et vous proposera prochainement des biens correspondant à votre capacité d'achat."
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
        onInterested={() => selected && updateStatut(selected.id, 'interesse')}
        onNotInterested={() => selected && updateStatut(selected.id, 'refusee')}
        onRequestVisit={() => selected && updateStatut(selected.id, 'visite_planifiee')}
      />
    </PremiumPageShellV2>
  );
}
