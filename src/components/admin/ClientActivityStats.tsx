import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, ThumbsUp, X, Eye, Users, FileText, TrendingUp, Clock, 
  History, Target, Calendar, MessageCircle, Check, ArrowRight,
  BarChart3, Home
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CandidatureWorkflowTimeline } from '@/components/CandidatureWorkflowTimeline';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientActivityStatsProps {
  clientId: string;
  clientUserId: string;
}

interface Stats {
  totalOffres: number;
  offresEnAttente: number;
  offresInteresse: number;
  offresRefusees: number;
  offresVisitePlanifiee: number;
  totalVisites: number;
  visitesDeleguees: number;
  visitesPlanifiees: number;
  visitesEffectuees: number;
  visitesRefusees: number;
  totalCandidatures: number;
  candidaturesEnAttente: number;
  candidaturesAcceptees: number;
  candidaturesRefusees: number;
  candidatureEnCours: any;
  tauxOffreVisite: number;
  tauxVisiteCandidature: number;
  tauxCandidatureAcceptee: number;
  tempsMoyenOffreVisite: number;
  tempsMoyenVisiteCandidature: number;
  tempsMoyenCandidatureCles: number;
}

interface RecentAction {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
}

const COLORS = {
  blue: '#3b82f6',
  yellow: '#eab308',
  green: '#22c55e',
  red: '#ef4444',
  purple: '#8b5cf6',
  indigo: '#6366f1',
  orange: '#f97316',
  gray: '#6b7280',
};

export function ClientActivityStats({ clientId, clientUserId }: ClientActivityStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalOffres: 0,
    offresEnAttente: 0,
    offresInteresse: 0,
    offresRefusees: 0,
    offresVisitePlanifiee: 0,
    totalVisites: 0,
    visitesDeleguees: 0,
    visitesPlanifiees: 0,
    visitesEffectuees: 0,
    visitesRefusees: 0,
    totalCandidatures: 0,
    candidaturesEnAttente: 0,
    candidaturesAcceptees: 0,
    candidaturesRefusees: 0,
    candidatureEnCours: null,
    tauxOffreVisite: 0,
    tauxVisiteCandidature: 0,
    tauxCandidatureAcceptee: 0,
    tempsMoyenOffreVisite: 0,
    tempsMoyenVisiteCandidature: 0,
    tempsMoyenCandidatureCles: 0,
  });
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientStats();
  }, [clientId, clientUserId]);

  const loadClientStats = async () => {
    try {
      setLoading(true);
      
      // Charger toutes les données en parallèle
      const [offresRes, visitesRes, candidaturesRes, notificationsRes] = await Promise.all([
        supabase.from('offres').select('*').eq('client_id', clientId).limit(15000),
        supabase.from('visites').select('*').eq('client_id', clientId).limit(15000),
        supabase.from('candidatures').select('*, offres(*)').eq('client_id', clientId).limit(15000),
        supabase.from('notifications')
          .select('*')
          .eq('user_id', clientUserId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      const offres = offresRes.data || [];
      const visites = visitesRes.data || [];
      const candidatures = candidaturesRes.data || [];
      const notifications = notificationsRes.data || [];

      // Calculs des stats offres
      const offresEnAttente = offres.filter(o => o.statut === 'envoyee').length;
      const offresInteresse = offres.filter(o => o.statut === 'interesse').length;
      const offresRefusees = offres.filter(o => o.statut === 'refusee').length;
      const offresVisitePlanifiee = offres.filter(o => o.statut === 'visite_planifiee').length;

      // Calculs des stats visites
      const visitesDeleguees = visites.filter(v => v.est_deleguee).length;
      const visitesPlanifiees = visites.filter(v => v.statut === 'planifiee' || v.statut === 'confirmee').length;
      const visitesEffectuees = visites.filter(v => v.statut === 'effectuee').length;
      const visitesRefusees = visites.filter(v => v.statut === 'refusee').length;

      // Calculs des stats candidatures
      const candidaturesEnAttente = candidatures.filter(c => c.statut === 'en_attente').length;
      const candidaturesAcceptees = candidatures.filter(c => 
        c.statut === 'acceptee' || c.statut === 'bail_conclu' || c.statut === 'cles_remises'
      ).length;
      const candidaturesRefusees = candidatures.filter(c => c.statut === 'refusee').length;
      
      // Candidature en cours (pas refusée et pas terminée)
      const candidatureEnCours = candidatures.find(c => 
        c.statut !== 'refusee' && c.statut !== 'cles_remises'
      );

      // Calculs des taux de conversion
      const offresAvecVisite = offres.filter(o => 
        visites.some(v => v.offre_id === o.id)
      ).length;
      const tauxOffreVisite = offres.length > 0 
        ? Math.round((offresAvecVisite / offres.length) * 100) 
        : 0;

      const visitesAvecCandidature = visites.filter(v =>
        candidatures.some(c => c.offre_id === v.offre_id)
      ).length;
      const tauxVisiteCandidature = visites.length > 0
        ? Math.round((visitesAvecCandidature / visites.length) * 100)
        : 0;

      const tauxCandidatureAcceptee = candidatures.length > 0
        ? Math.round((candidaturesAcceptees / candidatures.length) * 100)
        : 0;

      // Calcul des temps moyens
      let tempsMoyenOffreVisite = 0;
      let tempsMoyenVisiteCandidature = 0;
      let tempsMoyenCandidatureCles = 0;

      // Temps moyen offre → visite
      const offresAvecVisiteDates = offres.filter(o => 
        visites.some(v => v.offre_id === o.id)
      ).map(o => {
        const visite = visites.find(v => v.offre_id === o.id);
        if (visite) {
          const offreDate = new Date(o.date_envoi || o.created_at);
          const visiteDate = new Date(visite.date_visite);
          return Math.abs(visiteDate.getTime() - offreDate.getTime()) / (1000 * 60 * 60 * 24);
        }
        return 0;
      }).filter(d => d > 0);

      if (offresAvecVisiteDates.length > 0) {
        tempsMoyenOffreVisite = Math.round(
          offresAvecVisiteDates.reduce((a, b) => a + b, 0) / offresAvecVisiteDates.length
        );
      }

      // Temps moyen candidature → clés
      const candidaturesAvecCles = candidatures.filter(c => c.cles_remises_at);
      if (candidaturesAvecCles.length > 0) {
        const temps = candidaturesAvecCles.map(c => {
          const candidatureDate = new Date(c.created_at);
          const clesDate = new Date(c.cles_remises_at);
          return (clesDate.getTime() - candidatureDate.getTime()) / (1000 * 60 * 60 * 24);
        });
        tempsMoyenCandidatureCles = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
      }

      setStats({
        totalOffres: offres.length,
        offresEnAttente,
        offresInteresse,
        offresRefusees,
        offresVisitePlanifiee,
        totalVisites: visites.length,
        visitesDeleguees,
        visitesPlanifiees,
        visitesEffectuees,
        visitesRefusees,
        totalCandidatures: candidatures.length,
        candidaturesEnAttente,
        candidaturesAcceptees,
        candidaturesRefusees,
        candidatureEnCours,
        tauxOffreVisite,
        tauxVisiteCandidature,
        tauxCandidatureAcceptee,
        tempsMoyenOffreVisite,
        tempsMoyenVisiteCandidature,
        tempsMoyenCandidatureCles,
      });

      // Formater les actions récentes
      const formattedActions: RecentAction[] = notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message || '',
        created_at: n.created_at,
      }));
      setRecentActions(formattedActions);

    } catch (error) {
      console.error('Error loading client stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (type: string) => {
    if (type.includes('offer') || type.includes('offre')) return <Send className="h-3 w-3" />;
    if (type.includes('visit') || type.includes('visite')) return <Calendar className="h-3 w-3" />;
    if (type.includes('candidature')) return <FileText className="h-3 w-3" />;
    if (type.includes('message')) return <MessageCircle className="h-3 w-3" />;
    if (type.includes('accept') || type.includes('confirm')) return <Check className="h-3 w-3" />;
    if (type.includes('refus')) return <X className="h-3 w-3" />;
    return <History className="h-3 w-3" />;
  };

  const getActionColor = (type: string) => {
    if (type.includes('accept') || type.includes('confirm') || type.includes('cles')) 
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (type.includes('refus')) 
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (type.includes('offer') || type.includes('offre')) 
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (type.includes('visit') || type.includes('visite')) 
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (type.includes('candidature')) 
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-muted text-muted-foreground';
  };

  // Données pour les graphiques
  const offresStatusData = [
    { name: 'En attente', value: stats.offresEnAttente, color: COLORS.blue },
    { name: 'Intéressé', value: stats.offresInteresse, color: COLORS.yellow },
    { name: 'Visite planifiée', value: stats.offresVisitePlanifiee, color: COLORS.purple },
    { name: 'Refusées', value: stats.offresRefusees, color: COLORS.red },
  ].filter(d => d.value > 0);

  const candidaturesStatusData = [
    { name: 'En attente', value: stats.candidaturesEnAttente, color: COLORS.yellow },
    { name: 'Acceptées', value: stats.candidaturesAcceptees, color: COLORS.green },
    { name: 'Refusées', value: stats.candidaturesRefusees, color: COLORS.red },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Activité du client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Offres reçues */}
            <StatBox 
              icon={Send} 
              label="Offres reçues" 
              value={stats.totalOffres}
              subtext={`${stats.offresEnAttente} en attente`}
              colorClass="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-600"
            />
            
            {/* Offres intéressées */}
            <StatBox 
              icon={ThumbsUp} 
              label="Intéressé" 
              value={stats.offresInteresse}
              colorClass="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-600"
            />
            
            {/* Offres refusées */}
            <StatBox 
              icon={X} 
              label="Refusées" 
              value={stats.offresRefusees}
              colorClass="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600"
            />
            
            {/* Visites */}
            <StatBox 
              icon={Eye} 
              label="Visites" 
              value={stats.totalVisites}
              subtext={`${stats.visitesEffectuees} effectuées`}
              colorClass="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-600"
            />
            
            {/* Visites déléguées */}
            <StatBox 
              icon={Users} 
              label="Visites déléguées" 
              value={stats.visitesDeleguees}
              colorClass="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-600"
            />
            
            {/* Candidatures */}
            <StatBox 
              icon={FileText} 
              label="Candidatures" 
              value={stats.totalCandidatures}
              subtext={`${stats.candidaturesAcceptees} acceptées`}
              colorClass="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Taux de conversion et temps moyens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entonnoir de conversion */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Entonnoir de conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConversionStep 
              from="Offres reçues" 
              fromValue={stats.totalOffres}
              to="Visites" 
              toValue={stats.totalVisites}
              rate={stats.tauxOffreVisite}
            />
            <ConversionStep 
              from="Visites" 
              fromValue={stats.totalVisites}
              to="Candidatures" 
              toValue={stats.totalCandidatures}
              rate={stats.tauxVisiteCandidature}
            />
            <ConversionStep 
              from="Candidatures" 
              fromValue={stats.totalCandidatures}
              to="Acceptées" 
              toValue={stats.candidaturesAcceptees}
              rate={stats.tauxCandidatureAcceptee}
            />
          </CardContent>
        </Card>

        {/* Temps moyens */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Temps moyens du parcours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.tempsMoyenOffreVisite || '-'}j</p>
                <p className="text-xs text-muted-foreground">Offre → Visite</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.tempsMoyenVisiteCandidature || '-'}j</p>
                <p className="text-xs text-muted-foreground">Visite → Candidature</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.tempsMoyenCandidatureCles || '-'}j</p>
                <p className="text-xs text-muted-foreground">Candidature → Clés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camembert Offres */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Répartition des offres</CardTitle>
          </CardHeader>
          <CardContent>
            {offresStatusData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={offresStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                      labelLine={false}
                    >
                      {offresStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                Aucune offre pour ce client
              </div>
            )}
          </CardContent>
        </Card>

        {/* Camembert Candidatures */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Répartition des candidatures</CardTitle>
          </CardHeader>
          <CardContent>
            {candidaturesStatusData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={candidaturesStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                      labelLine={false}
                    >
                      {candidaturesStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                Aucune candidature pour ce client
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Candidature en cours */}
      {stats.candidatureEnCours && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              Candidature en cours
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {stats.candidatureEnCours.offres?.adresse || 'Adresse non disponible'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CandidatureWorkflowTimeline currentStatut={stats.candidatureEnCours.statut} />
          </CardContent>
        </Card>
      )}

      {/* Historique des actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Historique des actions récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActions.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {recentActions.map((action) => (
                  <div key={action.id} className="flex gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      getActionColor(action.type)
                    )}>
                      {getActionIcon(action.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{action.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(action.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Aucune action récente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Composant StatBox
function StatBox({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  colorClass 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  subtext?: string; 
  colorClass: string;
}) {
  return (
    <div className={cn("p-3 rounded-lg border", colorClass)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground">{subtext}</p>
      )}
    </div>
  );
}

// Composant ConversionStep
function ConversionStep({ 
  from, 
  fromValue, 
  to, 
  toValue, 
  rate 
}: { 
  from: string; 
  fromValue: number; 
  to: string; 
  toValue: number; 
  rate: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 p-2 bg-muted/50 rounded text-center">
        <p className="text-lg font-bold">{fromValue}</p>
        <p className="text-xs text-muted-foreground">{from}</p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={rate >= 50 ? "default" : rate >= 25 ? "secondary" : "outline"} className="text-xs">
          {rate}%
        </Badge>
      </div>
      <div className="flex-1 p-2 bg-muted/50 rounded text-center">
        <p className="text-lg font-bold">{toValue}</p>
        <p className="text-xs text-muted-foreground">{to}</p>
      </div>
    </div>
  );
}
