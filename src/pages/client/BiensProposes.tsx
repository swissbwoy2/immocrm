import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { Card } from '@/components/ui/card';
import { Loader2, Home } from 'lucide-react';
import { PurchaseOffreCard } from '@/components/achat/PurchaseOffreCard';
import { isPurchaseBuyer } from '@/lib/journey';

export default function BiensProposes() {
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
      .order('created_at', { ascending: false });

    setOffres(data || []);
    setLoading(false);
  }, [user, navigate]);

  useEffect(() => {
    document.title = 'Biens proposés | Immo-Rama';
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
    setOffres((prev) => prev.map((o) => (o.id === id ? { ...o, statut: newStatut } : o)));
    toast({
      title: newStatut === 'interesse' ? 'Bien ajouté à vos sélections' : 'Statut mis à jour',
      description: newStatut === 'interesse' ? 'Retrouvez-le dans « Biens sélectionnés ».' : undefined,
    });
  };

  return (
    <PremiumPageShellV2>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="h-6 w-6 text-sky-600" /> Biens proposés
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tous les biens à l'achat sélectionnés et envoyés par votre conseiller.
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      ) : offres.length === 0 ? (
        <Card className="p-10 text-center border-sky-100">
          <Home className="h-10 w-10 text-sky-600 mx-auto mb-3 opacity-60" />
          <h2 className="text-lg font-semibold mb-1">Aucun bien proposé pour le moment</h2>
          <p className="text-sm text-muted-foreground">
            Votre conseiller analyse le marché et vous proposera prochainement les biens correspondant à votre projet d'achat.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {offres.map((o) => (
            <PurchaseOffreCard
              key={o.id}
              offre={o}
              onInterested={() => updateStatut(o.id, 'interesse')}
              onNotInterested={() => updateStatut(o.id, 'refusee')}
              onRequestVisit={() => updateStatut(o.id, 'visite_planifiee')}
            />
          ))}
        </div>
      )}
    </PremiumPageShellV2>
  );
}
