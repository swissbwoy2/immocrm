import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PublicHeader } from '@/components/public/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function MesAlertesAnnonces() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: alertes, isLoading } = useQuery({
    queryKey: ['mes-alertes-annonces', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alertes_annonces')
        .select('*')
        .eq('user_id', user?.id as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!loading && !user) return <Navigate to="/login" replace />;

  const toggleActif = async (id: string, actif: boolean) => {
    const { error } = await supabase.from('alertes_annonces').update({ actif }).eq('id', id);
    if (error) return toast.error("Impossible de mettre à jour l'alerte");
    queryClient.invalidateQueries({ queryKey: ['mes-alertes-annonces', user?.id] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('alertes_annonces').delete().eq('id', id);
    if (error) return toast.error("Impossible de supprimer l'alerte");
    toast.success('Alerte supprimée');
    queryClient.invalidateQueries({ queryKey: ['mes-alertes-annonces', user?.id] });
  };

  const describe = (c: any) => {
    const parts: string[] = [];
    if (c?.type_transaction) parts.push(c.type_transaction === 'location' ? 'Location' : 'Vente');
    if (c?.ville) parts.push(`${c.ville}${c.rayon_km ? ` (${c.rayon_km} km)` : ''}`);
    if (c?.prix_min || c?.prix_max) parts.push(`Prix ${c.prix_min || 0} – ${c.prix_max || '∞'} CHF`);
    if (c?.pieces_min) parts.push(`dès ${c.pieces_min} pièces`);
    if (c?.surface_min) parts.push(`dès ${c.surface_min} m²`);
    return parts.join(' • ') || 'Toutes les annonces';
  };

  return (
    <div className="theme-luxury min-h-screen bg-background">
      <PublicHeader />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" /> Mes alertes e-mail
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez les recherches pour lesquelles vous souhaitez être averti.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/annonces"><Search className="h-4 w-4 mr-2" />Rechercher</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : !alertes?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Aucune alerte pour le moment.</p>
              <Button asChild className="mt-4"><Link to="/annonces">Créer une alerte</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alertes.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{a.nom || 'Alerte'}</p>
                      <Badge variant="secondary">
                        {a.frequence === 'quotidien' ? 'Quotidien' : 'Instantané'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{describe(a.criteres)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={!!a.actif} onCheckedChange={(v) => toggleActif(a.id, v)} />
                    <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
