import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Handshake, User, Phone, Mail, AlertTriangle, Percent, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ReferralTimeline } from './ReferralTimeline';

interface ApporteurInfoCardProps {
  clientId: string;
  showAlert?: boolean;
  isAdmin?: boolean;
}

interface ApporteurData {
  id: string;
  code_parrainage: string;
  taux_commission: number;
  profile: {
    prenom: string;
    nom: string;
    email: string;
    telephone?: string;
  };
}

interface ReferralData {
  id: string;
  statut: string;
  taux_commission: number;
  montant_commission?: number;
  date_validation?: string;
  date_conclusion?: string;
  date_paiement?: string;
  created_at: string;
}

export function ApporteurInfoCard({ clientId, showAlert = true, isAdmin = false }: ApporteurInfoCardProps) {
  const navigate = useNavigate();
  const [apporteur, setApporteur] = useState<ApporteurData | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApporteurData();
  }, [clientId]);

  const loadApporteurData = async () => {
    try {
      // First check if there's a referral for this client
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (referralError) throw referralError;
      
      if (!referralData) {
        setLoading(false);
        return;
      }

      setReferral(referralData);

      // Load apporteur data
      if (referralData.apporteur_id) {
        const { data: apporteurData, error: apporteurError } = await supabase
          .from('apporteurs')
          .select(`
            id,
            code_parrainage,
            taux_commission,
            user_id
          `)
          .eq('id', referralData.apporteur_id)
          .single();

        if (apporteurError) throw apporteurError;

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('prenom, nom, email, telephone')
          .eq('id', apporteurData.user_id)
          .single();

        if (profileError) throw profileError;

        setApporteur({
          ...apporteurData,
          profile: profileData
        });
      }
    } catch (error) {
      console.error('Error loading apporteur data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!apporteur || !referral) {
    return null;
  }

  const tauxCommission = referral.taux_commission || apporteur.taux_commission || 10;

  return (
    <div className="space-y-4">
      {showAlert && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Client référé par un Apporteur d'Affaires</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <strong>{tauxCommission}%</strong> de la commission totale sera reversée à l'apporteur d'affaires.
            Cela représente <strong>5%</strong> de déduction sur votre part de commission.
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-l-4 border-l-primary">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Handshake className="h-5 w-5 text-primary" />
            Apporteur d'Affaires
            <Badge variant="secondary" className="ml-auto">
              <Percent className="h-3 w-3 mr-1" />
              {tauxCommission}% commission
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {apporteur.profile.prenom} {apporteur.profile.nom}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${apporteur.profile.email}`} className="hover:text-primary transition-colors">
                  {apporteur.profile.email}
                </a>
              </div>
              
              {apporteur.profile.telephone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${apporteur.profile.telephone}`} className="hover:text-primary transition-colors">
                    {apporteur.profile.telephone}
                  </a>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-mono">
                  Code: {apporteur.code_parrainage}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Statut du referral</div>
              <ReferralTimeline 
                statut={referral.statut || 'soumis'} 
                dateCreation={referral.created_at}
                dateValidation={referral.date_validation || undefined}
                dateConclusion={referral.date_conclusion || undefined}
                datePaiement={referral.date_paiement || undefined}
                compact
              />
              
              {referral.montant_commission && referral.statut === 'paye' && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Commission payée: <strong>CHF {referral.montant_commission.toFixed(2)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/apporteurs/${apporteur.id}`)}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Voir le profil de l'apporteur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
