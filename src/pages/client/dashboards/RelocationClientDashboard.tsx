import { useNavigate } from 'react-router-dom';
import { Globe, FileText, MessageSquare, Bell, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PremiumDashboardHeader, PremiumEmptyState } from '@/components/premium';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';
import { useNotifications } from '@/hooks/useNotifications';

interface Props {
  profile: { prenom?: string } | null;
}

export default function RelocationClientDashboard({ profile }: Props) {
  const navigate = useNavigate();
  const { counts } = useNotifications();

  return (
    <div className="flex-1 overflow-y-auto relative">
      <FloatingParticles count={12} className="fixed inset-0 pointer-events-none z-0 opacity-30" />
      <div className="relative z-10 p-4 md:p-8 space-y-6">
        <PremiumDashboardHeader
          userName={profile?.prenom}
          parcoursType="relocation"
          messageCount={counts.new_message}
          onMessagesClick={() => navigate('/client/messagerie')}
        />

        <Card>
          <CardContent className="pt-6">
            <PremiumEmptyState
              icon={Globe}
              title="Votre relocation est en cours de préparation"
              description="Votre conseiller relocation vous contactera pour cadrer votre installation (logement, administratif, écoles, etc.)."
              action={{ label: 'Contacter mon conseiller', onClick: () => navigate('/client/messagerie') }}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/client/documents')}>
            <CardContent className="pt-6 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <div className="font-semibold">Mes documents</div>
                <div className="text-xs text-muted-foreground">Pièces administratives</div>
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
