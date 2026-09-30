import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clipboard, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCandidatCandidatures, RETENU_BAILLEUR } from '@/hooks/useCandidatCandidatures';

export default function CandidatDashboard() {
  const navigate = useNavigate();
  const { userRoles, refreshRoles, switchRole } = useAuth();
  const { data = [], isLoading } = useCandidatCandidatures();
  const [activating, setActivating] = useState(false);
  const isClient = userRoles.includes('client');

  const enCours = data.filter((c) => !['refuse', 'refusee', 'desiste'].includes(c.statut)).length;
  const retenues = data.filter((c) => c.statut === RETENU_BAILLEUR).length;

  const activate = async () => {
    if (activating) return;
    setActivating(true);
    try {
      const { error } = await supabase.rpc('activate_candidat_searches' as any);
      if (error) throw error;
      await refreshRoles();
      switchRole('client');
      toast.success('Vos recherches sont activées');
      navigate('/client');
    } catch (e: any) {
      toast.error(e?.message || "Impossible d'activer vos recherches");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Mon espace candidat</h1>
          <p className="text-sm text-muted-foreground">Suivez vos candidatures et votre demande de location.</p>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Candidatures', value: data.length },
            { label: 'En cours', value: enCours },
            { label: 'Retenues', value: retenues },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '—' : k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" /> Activer mes recherches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confiez-nous votre recherche : un agent vous propose des biens adaptés. Vous gardez l'accès à votre espace candidat.
            </p>
            {isClient ? (
              <Button onClick={() => { switchRole('client'); navigate('/client'); }} className="min-h-[44px]">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Aller à mon espace client
              </Button>
            ) : (
              <Button onClick={activate} disabled={activating} size="lg" className="min-h-[44px]">
                {activating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Activer mes recherches
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" className="h-auto min-h-[64px] justify-start gap-3 p-4" onClick={() => navigate('/candidat/candidatures')}>
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-left"><span className="block font-semibold">Mes candidatures</span><span className="text-xs text-muted-foreground">Statut et état du dossier</span></span>
          </Button>
          <Button variant="outline" className="h-auto min-h-[64px] justify-start gap-3 p-4" onClick={() => navigate('/candidat/demande')}>
            <Clipboard className="h-5 w-5 text-primary" />
            <span className="text-left"><span className="block font-semibold">Ma demande de location</span><span className="text-xs text-muted-foreground">Compléter mes informations</span></span>
          </Button>
        </div>
      </div>
    </div>
  );
}
