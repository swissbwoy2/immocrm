import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { ACHAT_STEPS } from '@/lib/purchaseFinancing';
import { PremiumDashboardHeader } from '@/components/premium/PremiumDashboardHeader';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Phone, Clock, Sparkles, MapPin, Home, Banknote, FileText, Eye, Handshake, Scale } from 'lucide-react';
import { AchatProgressionBar } from '@/components/achat/AchatProgressionBar';
import { AchatStepsTimeline } from '@/components/achat/AchatStepsTimeline';
import { AchatFinancingCard } from '@/components/achat/AchatFinancingCard';
import { AchatPropertiesList } from '@/components/achat/AchatPropertiesList';
import { AchatVisitReportsList } from '@/components/achat/AchatVisitReportsList';
import { AchatNegotiationCard } from '@/components/achat/AchatNegotiationCard';
import { AchatNotarySection } from '@/components/achat/AchatNotarySection';
import { AchatDocumentsSection } from '@/components/achat/AchatDocumentsSection';
import { useNavigate } from 'react-router-dom';

interface DashboardAchatProps {
  profile?: { prenom?: string; nom?: string } | null;
}

export default function DashboardAchat({ profile }: DashboardAchatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, project, financing, computed, settings, properties, visitReports, negotiations, notary, steps, documents, agent } =
    usePurchaseProject({ userId: user?.id || null });

  const [offres, setOffres] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Mon projet d\'achat | Immo-Rama';
  }, []);

  useEffect(() => {
    (async () => {
      if (!project?.client_id) return;
      const { data } = await supabase
        .from('offres')
        .select('id, adresse, prix, statut, created_at, nombre_pieces, surface, etage, npa, ville, lien_annonce, description, disponibilite')
        .eq('client_id', project.client_id)
        .order('created_at', { ascending: false });
      setOffres(data || []);
    })();
  }, [project?.client_id]);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-sky-600" /></div>;
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <Card className="p-8 border-sky-100">
          <Home className="h-10 w-10 text-sky-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">Aucun projet d'achat actif</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Aucun projet d'accompagnement à l'achat n'est encore associé à votre compte.
          </p>
          <Button onClick={() => navigate('/accompagnement-achat')}>
            Découvrir l'accompagnement achat
          </Button>
        </Card>
      </div>
    );
  }

  const stepsDone = steps.filter((s: any) => s.statut === 'fait').length;
  const initials = (profile?.prenom?.[0] || '?') + (profile?.nom?.[0] || '');
  const fullName = `${profile?.prenom || ''} ${profile?.nom || ''}`.trim() || 'Acheteur';

  return (
    <PremiumPageShellV2 className="relative z-10">
      <PremiumDashboardHeader
        userName={profile?.prenom}
        parcoursType="achat"
        onMessagesClick={() => navigate('/client/messagerie')}
      />

      {/* HERO RESUME */}
      <Card className="p-6 mb-6 border-sky-100 bg-gradient-to-br from-sky-50/60 via-blue-50/40 to-indigo-50/60">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-md text-sky-700 flex items-center justify-center font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <Badge className="bg-sky-600 hover:bg-sky-600 text-white border-0 mb-1.5">
                <Home className="h-3 w-3 mr-1" /> Accompagnement achat
              </Badge>
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <div className="text-sm text-muted-foreground mt-1">
                Statut : <span className="font-medium text-foreground">{project.statut.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {agent ? (
            <Card className="p-3 bg-white/80 backdrop-blur border-sky-100 flex items-center gap-3 min-w-[240px]">
              <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-semibold">
                {(agent.prenom?.[0] || '?') + (agent.nom?.[0] || '')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wide text-sky-700 font-semibold">Votre conseiller</div>
                <div className="text-sm font-semibold truncate">{agent.prenom} {agent.nom}</div>
                {agent.telephone && (
                  <a href={`tel:${agent.telephone}`} className="text-xs text-muted-foreground hover:text-sky-600">{agent.telephone}</a>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-3 bg-white/80 backdrop-blur border-amber-200 text-sm text-amber-800 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Un conseiller vous sera bientôt assigné
            </Card>
          )}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={Sparkles} label="Étapes" value={`${stepsDone}/${ACHAT_STEPS.length}`} color="text-sky-600" />
        <Kpi icon={Home} label="Biens sélectionnés" value={properties.length} color="text-indigo-600" />
        <Kpi icon={Eye} label="Visites courtier" value={visitReports.length} color="text-emerald-600" />
        <Kpi icon={Banknote} label="Capacité d'achat" value={computed ? `CHF ${Math.round(computed.capaciteAchatMax).toLocaleString('fr-CH')}` : '—'} color="text-amber-600" small />
      </div>

      {/* PROGRESSION MANDAT ACHAT (6 mois) */}
      <div className="mb-6">
        <AchatProgressionBar
          dateDebut={project.date_debut_progression || project.created_at}
          dureeJours={project.duree_progression_jours || 180}
          stepsDone={stepsDone}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <AchatFinancingCard computed={computed} settings={settings} statutBancaire={financing?.statut_bancaire} />
          <AchatPropertiesList properties={properties} />
          <AchatVisitReportsList reports={visitReports} properties={properties} />
          <AchatNegotiationCard negotiations={negotiations} />
          <AchatNotarySection notary={notary} />
        </div>
        <div className="space-y-6">
          <AchatStepsTimeline steps={steps} />
          <AchatDocumentsSection documents={documents} />
        </div>
      </div>
    </PremiumPageShellV2>
  );
}

function Kpi({ icon: Icon, label, value, color, small }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={`font-bold ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
    </Card>
  );
}
