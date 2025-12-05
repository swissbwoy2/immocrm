import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Filter, Users, MapPin, Phone, Mail } from 'lucide-react';

interface Referral {
  id: string;
  client_nom: string;
  client_prenom: string | null;
  client_telephone: string | null;
  client_email: string | null;
  lieu_situation: string | null;
  type_affaire: string;
  statut: string;
  montant_commission: number | null;
  created_at: string;
  date_validation: string | null;
  date_paiement: string | null;
}

const statutConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  soumis: { label: 'Soumis', variant: 'secondary' },
  valide: { label: 'Validé', variant: 'default' },
  en_cours: { label: 'En cours', variant: 'outline' },
  conclu: { label: 'Conclu', variant: 'default' },
  paye: { label: 'Payé', variant: 'default' },
  annule: { label: 'Annulé', variant: 'destructive' },
};

const typeAffaireLabels: Record<string, string> = {
  vente: 'Vente',
  achat: 'Achat',
  location: 'Location',
  mise_en_location: 'Mise en location',
};

export default function MesReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadReferrals();
    }
  }, [user]);

  const loadReferrals = async () => {
    try {
      const { data: apporteur } = await supabase
        .from('apporteurs')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!apporteur) return;

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('apporteur_id', apporteur.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter((referral) => {
    const matchesSearch = 
      referral.client_nom.toLowerCase().includes(search.toLowerCase()) ||
      referral.client_prenom?.toLowerCase().includes(search.toLowerCase()) ||
      referral.lieu_situation?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatut = statutFilter === 'all' || referral.statut === statutFilter;
    
    return matchesSearch && matchesStatut;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Mes Referrals</h1>
        <p className="text-muted-foreground">
          Suivez l'état de vos clients référés
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="soumis">Soumis</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="conclu">Conclu</SelectItem>
            <SelectItem value="paye">Payé</SelectItem>
            <SelectItem value="annule">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Referrals List */}
      {filteredReferrals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucun referral trouvé</h3>
            <p className="text-muted-foreground text-center mt-2">
              {search || statutFilter !== 'all' 
                ? 'Aucun résultat ne correspond à vos critères de recherche.'
                : 'Vous n\'avez pas encore soumis de clients.'}
            </p>
            {!search && statutFilter === 'all' && (
              <Button className="mt-4" asChild>
                <a href="/apporteur/soumettre-client">Soumettre un client</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReferrals.map((referral) => (
            <Card key={referral.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {referral.client_prenom} {referral.client_nom}
                    </CardTitle>
                    <CardDescription>
                      {typeAffaireLabels[referral.type_affaire] || referral.type_affaire}
                    </CardDescription>
                  </div>
                  <Badge variant={statutConfig[referral.statut]?.variant || 'secondary'}>
                    {statutConfig[referral.statut]?.label || referral.statut}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm">
                  {referral.lieu_situation && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {referral.lieu_situation}
                    </div>
                  )}
                  {referral.client_telephone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {referral.client_telephone}
                    </div>
                  )}
                  {referral.client_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {referral.client_email}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground">Soumis le:</span>{' '}
                      {format(new Date(referral.created_at), 'dd MMM yyyy', { locale: fr })}
                    </div>
                    {referral.date_validation && (
                      <div>
                        <span className="text-muted-foreground">Validé le:</span>{' '}
                        {format(new Date(referral.date_validation), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    )}
                    {referral.montant_commission && (
                      <div className="ml-auto font-medium">
                        Commission: CHF {referral.montant_commission.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
