import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, FileText, MessageSquare, Bell, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { PremiumPageShellV2, PremiumPageHeaderV2, PremiumEmptyStateV2 } from '@/components/dashboard/v2';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

interface Props {
  profile: { prenom?: string; nom?: string; parcours_type?: string } | null;
}

const quickLinks = [
  { icon: FileText, label: 'Mes documents', sub: 'Devis, plans, factures', path: '/client/documents' },
  { icon: MessageSquare, label: 'Messagerie', path: '/client/messagerie' },
  { icon: Bell, label: 'Notifications', sub: 'Alertes & rappels', path: '/client/notifications' },
];

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
    <div className="flex-1 overflow-y-auto">
      <PremiumPageShellV2>
        <PremiumPageHeaderV2
          title={profile?.prenom ? `Bienvenue, ${profile.prenom}` : 'Tableau de bord'}
          subtitle="Suivez vos projets de rénovation en temps réel"
          breadcrumbs={[{ label: 'Espace Client' }, { label: 'Rénovation' }]}
          actions={
            counts.new_message > 0 ? (
              <Button
                variant="outline"
                onClick={() => navigate('/client/messagerie')}
                className="border-primary/20 hover:border-primary/50"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {counts.new_message} message{counts.new_message > 1 ? 's' : ''}
              </Button>
            ) : undefined
          }
        />

        {/* Projects card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <HardHat className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Mes projets de rénovation</h3>
            </div>
            {projects.length > 0 && (
              <Badge variant="secondary">{projects.length} projet{projects.length > 1 ? 's' : ''}</Badge>
            )}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <PremiumEmptyStateV2
                icon={Sparkles}
                title="Votre projet sera bientôt visible"
                description="Votre conseiller rénovation prendra contact avec vous sous 24h ouvrées pour ouvrir votre projet et le configurer ici."
                action={
                  <Button onClick={() => navigate('/client/messagerie')}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contacter mon conseiller
                  </Button>
                }
                compact
              />
            ) : (
              <div className="space-y-2">
                {projects.map((p, i) => (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    onClick={() => navigate(`/client/renovation/${p.id}`)}
                    className="w-full text-left p-4 rounded-xl border bg-background/50 hover:bg-accent/40 hover:border-primary/25 transition-all duration-150 flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-sm text-foreground">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                        <span>Statut : {p.status}</span>
                        {p.priority && <span>Priorité : {p.priority}</span>}
                        {p.budget_estimated && (
                          <span>Budget : {Number(p.budget_estimated).toLocaleString('fr-CH')} CHF</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick access cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {quickLinks.map((link, i) => {
            const Icon = link.icon;
            const sub = link.label === 'Messagerie'
              ? `${counts.new_message || 0} nouveau(x)`
              : link.sub;
            return (
              <motion.button
                key={link.path}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2, transition: { duration: 0.18 } }}
                onClick={() => navigate(link.path)}
                className="text-left flex items-center gap-4 p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:shadow-[0_8px_30px_hsl(217_91%_60%/0.10)] transition-colors duration-200 cursor-pointer group"
              >
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors duration-200 shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">{link.label}</div>
                  {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </PremiumPageShellV2>
    </div>
  );
}
