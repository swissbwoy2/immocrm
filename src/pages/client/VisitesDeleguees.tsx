import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, AlertCircle, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  PremiumPageHeader, 
  PremiumEmptyState,
  PremiumVisiteDelegueSection,
  PremiumVisiteDelegueCard,
  PremiumFeedbackCard
} from '@/components/premium';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';

export default function VisitesDeleguees() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVisiteId, setExpandedVisiteId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    loadVisites();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('visites-deleguees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visites'
        },
        () => {
          loadVisites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadVisites = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) return;

      const { data: visitesData } = await supabase
        .from('visites')
        .select('*, offres(*)')
        .eq('client_id', clientData.id)
        .eq('est_deleguee', true)
        .order('created_at', { ascending: false });

      setVisites(visitesData || []);
    } catch (error) {
      console.error('Error loading visites:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle URL params for deep linking
  useEffect(() => {
    const visiteId = searchParams.get('visiteId');
    if (visiteId && visites.length > 0 && !loading) {
      setExpandedVisiteId(visiteId);
      setTimeout(() => {
        cardRefs.current[visiteId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [searchParams, visites, loading]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="relative absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-r-primary/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
        </div>
      </div>
    );
  }

  // Séparer les visites par statut
  const visitesEnAttente = visites.filter(v => v.statut === 'planifiee');
  const visitesConfirmees = visites.filter(v => v.statut === 'confirmee');
  const visitesEffectuees = visites.filter(v => v.statut === 'effectuee');
  const visitesRefusees = visites.filter(v => v.statut === 'refusee');

  return (
    <div className="flex-1 overflow-y-auto relative">
      {/* Background particles */}
      <FloatingParticles count={8} className="opacity-30" />
      
      <div className="p-4 md:p-8 space-y-6 relative">
        {/* Premium Header */}
        <PremiumPageHeader 
          title="Visites déléguées"
          subtitle="Suivez les visites que votre agent effectue pour vous"
          icon={Users}
        />

        {/* Empty state global */}
        {visites.length === 0 && (
          <PremiumEmptyState
            icon={Users}
            title="Vous n'avez pas encore délégué de visites"
            description="Lorsque vous recevez une offre, vous pouvez demander à votre agent d'effectuer la visite pour vous"
            action={
              <Button onClick={() => navigate('/client/offres-recues')} className="group">
                <span className="group-hover:translate-x-1 transition-transform">Voir mes offres</span>
              </Button>
            }
          />
        )}

        {/* Visites en attente de confirmation */}
        {visitesEnAttente.length > 0 && (
          <PremiumVisiteDelegueSection
            title="En attente de confirmation"
            description="Votre agent n'a pas encore confirmé ces demandes de visites"
            icon={AlertCircle}
            count={visitesEnAttente.length}
            variant="pending"
            delay={100}
          >
            {visitesEnAttente.map((visite, index) => (
              <PremiumVisiteDelegueCard
                key={visite.id}
                visite={visite}
                variant="pending"
                index={index}
              />
            ))}
          </PremiumVisiteDelegueSection>
        )}

        {/* Visites confirmées */}
        {visitesConfirmees.length > 0 && (
          <PremiumVisiteDelegueSection
            title="Visites programmées"
            description="Votre agent va effectuer ces visites pour vous"
            icon={CheckCircle}
            count={visitesConfirmees.length}
            variant="confirmed"
            delay={200}
          >
            {visitesConfirmees.map((visite, index) => (
              <PremiumVisiteDelegueCard
                key={visite.id}
                visite={visite}
                variant="confirmed"
                index={index}
              />
            ))}
          </PremiumVisiteDelegueSection>
        )}

        {/* Visites refusées */}
        {visitesRefusees.length > 0 && (
          <PremiumVisiteDelegueSection
            title="Non disponibles"
            description="Votre agent n'était pas disponible pour ces visites"
            icon={XCircle}
            count={visitesRefusees.length}
            variant="refused"
            delay={300}
          >
            {visitesRefusees.map((visite, index) => (
              <PremiumVisiteDelegueCard
                key={visite.id}
                visite={visite}
                variant="refused"
                index={index}
              />
            ))}
          </PremiumVisiteDelegueSection>
        )}

        {/* Visites effectuées avec feedback */}
        <PremiumVisiteDelegueSection
          title="Visites effectuées"
          icon={MessageSquare}
          count={visitesEffectuees.length}
          variant="completed"
          delay={400}
        >
          {visitesEffectuees.length > 0 ? (
            visitesEffectuees.map((visite, index) => (
              <PremiumFeedbackCard
                key={visite.id}
                visite={visite}
                index={index}
              />
            ))
          ) : (
            <PremiumEmptyState
              icon={MessageSquare}
              title="Aucune visite effectuée"
              description="Les visites effectuées avec le feedback de votre agent apparaîtront ici"
              action={
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/client/offres-recues')}
                >
                  Voir mes offres
                </Button>
              }
              className="py-8"
            />
          )}
        </PremiumVisiteDelegueSection>
      </div>
    </div>
  );
}
