import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, FileText, MessageSquare, Bell, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumDashboardHeader, PremiumEmptyState } from '@/components/premium';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

interface Props {
  profile: { prenom?: string; nom?: string; parcours_type?: string } | null;
}

export default function RenovationClientDashboard({ profile }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { counts } = useNotifications();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        // Try to fetch any renovation projects visible to this user via RLS
        const { data, error } = await supabase
          .from('renovation_projects')
          .select('id, title, status, priority, project_type, start_date_planned, end_date_planned, budget_estimated, immeuble_id, created_at')
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) console.error('renovation_projects error:', error);
        setProjects(data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="flex-1 overflow-y-auto relative">
      <FloatingParticles count={12} className="fixed inset-0 pointer-events-none z-0 opacity-30" />
      <div className="relative z-10 p-4 md:p-8 space-y-6">
        <PremiumDashboardHeader
          userName={profile?.prenom}
          parcoursType="renovation"
          messageCount={counts.new_message}
          onMessagesClick={() => navigate('/client/messagerie')}
        />

        {/* Mes projets de rénovation */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5" />
          <CardHeader className="relative flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-primary" />
              Mes projets de rénovation
            </CardTitle>
            {projects.length > 0 && (
              <Badge variant="secondary">{projects.length} projet{projects.length > 1 ? 's' : ''}</Badge>
            )}
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="text-sm text-muted-foreground">Chargement…</div>
            ) : projects.length === 0 ? (
              <PremiumEmptyState
                icon={Sparkles}
                title="Votre projet sera bientôt visible"
                description="Votre conseiller rénovation prendra contact avec vous sous 24h ouvrées pour ouvrir votre projet et le configurer ici."
                action={{ label: 'Contacter mon conseiller', onClick: () => navigate('/client/messagerie') }}
              />
            ) : (
              <div className="space-y-3">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/client/messagerie`)}
                    className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/40 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                        <span>Statut : {p.status}</span>
                        {p.priority && <span>Priorité : {p.priority}</span>}
                        {p.budget_estimated && <span>Budget : {Number(p.budget_estimated).toLocaleString('fr-CH')} CHF</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick access cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/client/documents')}>
            <CardContent className="pt-6 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <div className="font-semibold">Mes documents</div>
                <div className="text-xs text-muted-foreground">Devis, plans, factures</div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/client/messagerie')}>
            <CardContent className="pt-6 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              <div>
                <div className="font-semibold">Messagerie</div>
                <div className="text-xs text-muted-foreground">{counts.new_message || 0} nouveau(x)</div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/client/notifications')}>
            <CardContent className="pt-6 flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              <div>
                <div className="font-semibold">Notifications</div>
                <div className="text-xs text-muted-foreground">Alertes & rappels</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
