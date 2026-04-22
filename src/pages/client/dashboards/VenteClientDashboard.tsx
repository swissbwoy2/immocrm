import { useNavigate } from 'react-router-dom';
import { Tag, FileText, MessageSquare, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { PremiumPageShellV2, PremiumPageHeaderV2, PremiumEmptyStateV2 } from '@/components/dashboard/v2';
import { useNotifications } from '@/hooks/useNotifications';

interface Props {
  profile: { prenom?: string } | null;
}

const quickLinks = [
  { icon: FileText, label: 'Mes documents', sub: 'Titres, plans, expertises', path: '/client/documents' },
  { icon: MessageSquare, label: 'Messagerie', path: '/client/messagerie' },
  { icon: Bell, label: 'Notifications', sub: 'Alertes & rappels', path: '/client/notifications' },
];

export default function VenteClientDashboard({ profile }: Props) {
  const navigate = useNavigate();
  const { counts } = useNotifications();

  return (
    <div className="flex-1 overflow-y-auto">
      <PremiumPageShellV2>
        <PremiumPageHeaderV2
          title={profile?.prenom ? `Bienvenue, ${profile.prenom}` : 'Tableau de bord'}
          subtitle="Votre dossier de vente est suivi par votre conseiller dédié"
          breadcrumbs={[{ label: 'Espace Client' }, { label: 'Vente' }]}
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 overflow-hidden"
        >
          <PremiumEmptyStateV2
            icon={Tag}
            title="Votre dossier de vente est en cours de préparation"
            description="Votre conseiller vous contactera très bientôt pour démarrer l'estimation et l'évaluation de votre bien."
            action={
              <Button onClick={() => navigate('/client/messagerie')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Contacter mon conseiller
              </Button>
            }
          />
        </motion.div>

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
                transition={{ duration: 0.4, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
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
