import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, User, CreditCard, FileText, Users, DollarSign, Calendar, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';

interface Apporteur {
  id: string;
  civilite: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  telephone: string | null;
  iban: string | null;
  nom_banque: string | null;
  titulaire_compte: string | null;
  bic_swift: string | null;
  contrat_signe: boolean;
  signature_data: string | null;
  date_signature: string | null;
  date_expiration: string | null;
  taux_commission: number;
  minimum_vente: number;
  minimum_location: number;
  statut: string;
  nombre_clients_referes: number;
  total_commissions_gagnees: number;
  code_parrainage: string;
  created_at: string;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
}

interface Referral {
  id: string;
  client_nom: string;
  client_prenom: string | null;
  type_affaire: string;
  statut: string;
  montant_commission: number | null;
  created_at: string;
}

export default function ApporteurDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [apporteur, setApporteur] = useState<Apporteur | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const { data: apporteurData, error: apporteurError } = await supabase
        .from('apporteurs')
        .select('*')
        .eq('id', id)
        .single();

      if (apporteurError) throw apporteurError;
      setApporteur(apporteurData);

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nom, prenom, email')
        .eq('id', apporteurData.user_id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load referrals
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('apporteur_id', id)
        .order('created_at', { ascending: false });

      setReferrals(referralsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    actif: { label: 'Actif', variant: 'default' },
    en_attente: { label: 'En attente', variant: 'secondary' },
    suspendu: { label: 'Suspendu', variant: 'destructive' },
    expire: { label: 'Expiré', variant: 'outline' },
  };

  const referralStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    soumis: { label: 'Soumis', variant: 'secondary' },
    valide: { label: 'Validé', variant: 'default' },
    en_cours: { label: 'En cours', variant: 'outline' },
    conclu: { label: 'Conclu', variant: 'default' },
    paye: { label: 'Payé', variant: 'default' },
    annule: { label: 'Annulé', variant: 'destructive' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!apporteur) {
    return (
      <div className="text-center py-12">
        <p>Apporteur non trouvé</p>
        <Button onClick={() => navigate('/admin/apporteurs')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header premium avec gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 md:p-8 animate-fade-in">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-4 left-20 w-20 h-20 bg-accent/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/apporteurs')} className="hover:bg-background/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-5 h-5 text-primary animate-pulse-soft" />
                <span className="text-sm font-medium text-primary/80 uppercase tracking-wider">Apporteur</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                {profile?.prenom} {profile?.nom}
              </h1>
              <p className="text-muted-foreground mt-1">{profile?.email}</p>
            </div>
          </div>
          <Badge variant={statusConfig[apporteur.statut]?.variant || 'secondary'} className="text-sm px-3 py-1">
            {statusConfig[apporteur.statut]?.label || apporteur.statut}
          </Badge>
        </div>
      </div>

      {/* Stats avec PremiumKPICard */}
      <div className="grid gap-4 md:grid-cols-4">
        <PremiumKPICard
          title="Code parrainage"
          value={apporteur.code_parrainage}
          icon={Briefcase}
          delay={0}
        />
        <PremiumKPICard
          title="Clients référés"
          value={apporteur.nombre_clients_referes}
          icon={Users}
          delay={50}
        />
        <PremiumKPICard
          title="Commissions totales"
          value={`CHF ${apporteur.total_commissions_gagnees?.toFixed(0) || 0}`}
          icon={DollarSign}
          variant="success"
          delay={100}
        />
        <PremiumKPICard
          title="Expiration contrat"
          value={apporteur.date_expiration 
            ? format(new Date(apporteur.date_expiration), 'dd/MM/yyyy', { locale: fr })
            : '-'}
          icon={Calendar}
          delay={150}
        />
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="banque">Données bancaires</TabsTrigger>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="contrat">Contrat</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Civilité</label>
                  <p className="font-medium">{apporteur.civilite || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Téléphone</label>
                  <p className="font-medium">{apporteur.telephone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Adresse</label>
                  <p className="font-medium">{apporteur.adresse || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Ville</label>
                  <p className="font-medium">
                    {apporteur.code_postal} {apporteur.ville}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Inscrit le</label>
                <p className="font-medium">
                  {format(new Date(apporteur.created_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banque" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informations bancaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">IBAN</label>
                  <p className="font-medium font-mono">{apporteur.iban || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Banque</label>
                  <p className="font-medium">{apporteur.nom_banque || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Titulaire</label>
                  <p className="font-medium">{apporteur.titulaire_compte || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">BIC/SWIFT</label>
                  <p className="font-medium font-mono">{apporteur.bic_swift || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des referrals</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun referral</p>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{referral.client_prenom} {referral.client_nom}</p>
                        <p className="text-sm text-muted-foreground">
                          {referral.type_affaire} • {format(new Date(referral.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={referralStatusConfig[referral.statut]?.variant || 'secondary'}>
                          {referralStatusConfig[referral.statut]?.label || referral.statut}
                        </Badge>
                        {referral.montant_commission && (
                          <p className="text-sm font-medium mt-1">
                            CHF {referral.montant_commission.toFixed(0)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contrat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contrat d'apporteur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-muted-foreground">Taux commission</label>
                  <p className="text-2xl font-bold">{apporteur.taux_commission}%</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Minimum vente</label>
                  <p className="text-2xl font-bold">CHF {apporteur.minimum_vente}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Minimum location</label>
                  <p className="text-2xl font-bold">CHF {apporteur.minimum_location}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Date de signature</label>
                  <p className="font-medium">
                    {apporteur.date_signature 
                      ? format(new Date(apporteur.date_signature), 'dd MMMM yyyy', { locale: fr })
                      : 'Non signé'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Date d'expiration</label>
                  <p className="font-medium">
                    {apporteur.date_expiration 
                      ? format(new Date(apporteur.date_expiration), 'dd MMMM yyyy', { locale: fr })
                      : '-'}
                  </p>
                </div>
              </div>

              {apporteur.signature_data && (
                <div>
                  <label className="text-sm text-muted-foreground">Signature</label>
                  <img 
                    src={apporteur.signature_data} 
                    alt="Signature" 
                    className="max-w-[200px] border rounded mt-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
