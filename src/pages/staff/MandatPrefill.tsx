import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MandatV3FormData } from '@/components/mandat-v3/types';
import MandatPrefillWizard from '@/components/mandat-v3/MandatPrefillWizard';
import { useToast } from '@/hooks/use-toast';

export default function StaffMandatPrefill() {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<Partial<MandatV3FormData> | undefined>(undefined);
  const [backPath, setBackPath] = useState('/admin/clients');

  useEffect(() => {
    const load = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          const isAgent = roles?.some((r: any) => r.role === 'agent');
          setBackPath(isAgent ? `/agent/clients/${clientId}` : `/admin/clients/${clientId}`);
        }

        const { data: client, error } = await supabase
          .from('clients')
          .select('*, profile:profiles!clients_user_id_fkey(*)')
          .eq('id', clientId)
          .maybeSingle();

        if (error) throw error;
        if (!client) {
          toast({ title: 'Client introuvable', variant: 'destructive' });
          navigate('/');
          return;
        }

        const profile: any = (client as any).profile || {};
        setInitialData({
          email: profile.email || '',
          prenom: profile.prenom || '',
          nom: profile.nom || '',
          telephone: profile.telephone || '',
          date_naissance: (client as any).date_naissance || '',
          nationalite: (client as any).nationalite || '',
          adresse: (client as any).adresse || '',
          ville: (client as any).ville_actuelle || '',
          type_permis: (client as any).type_permis || '',
          etat_civil: (client as any).etat_civil || '',
          profession: (client as any).profession || '',
          employeur: (client as any).employeur || '',
          revenus_mensuels: Number((client as any).revenus_mensuels) || 0,
          type_recherche: (client as any).type_contrat === 'achat' ? 'Acheter' : 'Louer',
          zone_recherche: (client as any).region_recherche || '',
          budget_max: Number((client as any).budget_max) || 0,
        });
      } catch (err: any) {
        console.error(err);
        toast({ title: 'Erreur de chargement', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-4">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour à la fiche client
        </Button>
        <div className="text-center mt-2">
          <h1 className="text-xl sm:text-2xl font-bold">Pré-remplir le mandat de recherche</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Remplissez tous les éléments à la place du client. La signature lui sera demandée par email.
          </p>
        </div>
      </div>
      <MandatPrefillWizard
        initialData={initialData}
        clientId={clientId}
        onSent={() => setTimeout(() => navigate(backPath), 2500)}
      />
    </div>
  );
}
