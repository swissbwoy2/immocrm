import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, Clock, User, MessageSquare, ThumbsUp, ThumbsDown, Minus, AlertTriangle, 
  Bell, History, CheckCircle, XCircle, Trash2, Upload, X, Image, Video, 
  Home, Maximize2, Banknote, ChevronRight, Sparkles, Eye
} from 'lucide-react';
import { AddressLink } from '@/components/AddressLink';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { cn } from '@/lib/utils';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Animated counter component
const AnimatedValue = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{displayValue}{suffix}</span>;
};

// Premium skeleton loader
const VisiteSkeletonCard = ({ index }: { index: number }) => (
  <div 
    className="animate-fade-in rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 space-y-4"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
);

export default function AgentVisites() {
  const { user } = useAuth();
  const { markTypeAsRead } = useNotifications();
  const [searchParams] = useSearchParams();
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [recommandation, setRecommandation] = useState<'recommande' | 'neutre' | 'deconseille'>('neutre');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [selectedVisites, setSelectedVisites] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Media upload states
  const [feedbackMedias, setFeedbackMedias] = useState<{url: string, type: string, name: string, size: number}[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  // Refs for scrolling
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle URL params for deep linking
  useEffect(() => {
    const visiteId = searchParams.get('visiteId');
    if (visiteId && visites.length > 0 && !loading) {
      const visite = visites.find(v => v.id === visiteId);
      if (visite) {
        setSelectedVisite(visite);
        setDetailDialogOpen(true);
        setTimeout(() => {
          cardRefs.current[visiteId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [searchParams, visites, loading]);

  const handleOpenDetail = (visite: any) => {
    setSelectedVisite(visite);
    setDetailDialogOpen(true);
  };

  const handleOpenConfirmDialog = (visite: any) => {
    setSelectedVisite(visite);
    setConfirmDialogOpen(true);
  };

  const handleDeleteVisite = async (visiteId: string, cascade: boolean = false) => {
    try {
      const { data: visite } = await supabase
        .from('visites')
        .select('offre_id, client_id, adresse')
        .eq('id', visiteId)
        .single();

      if (!visite) throw new Error('Visite non trouvée');

      if (cascade && visite.offre_id && visite.client_id) {
        await supabase
          .from('transactions')
          .delete()
          .eq('offre_id', visite.offre_id)
          .eq('client_id', visite.client_id);

        await supabase
          .from('candidatures')
          .update({
            statut: 'en_attente',
            bail_recu: false,
            bail_recu_at: null,
            signature_effectuee: false,
            signature_effectuee_at: null,
            date_signature_choisie: null,
            dates_signature_proposees: null,
            date_etat_lieux: null,
            heure_etat_lieux: null,
            cles_remises: false,
            cles_remises_at: null,
            alerte_cles_vue: false,
            client_accepte_conclure: false,
            client_accepte_conclure_at: null,
            agent_valide_regie: false,
            agent_valide_regie_at: null,
            recommandation_envoyee: false,
            avis_google_envoye: false
          })
          .eq('offre_id', visite.offre_id)
          .eq('client_id', visite.client_id);
      }

      const { error } = await supabase.from('visites').delete().eq('id', visiteId);
      if (error) throw error;

      toast.success(cascade ? 'Visite, transaction et workflow supprimés' : 'Visite supprimée');
      setDetailDialogOpen(false);
      loadVisites();
    } catch (error) {
      console.error('Error deleting visite:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  useEffect(() => {
    loadVisites();
    markTypeAsRead('new_visit');
    markTypeAsRead('visit_reminder');
  }, [user?.id]);

  const loadVisites = async () => {
    if (!user) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;
      
      setAgentId(agentData.id);

      const { data: visitesData } = await supabase
        .from('visites')
        .select('*, offres(*), clients!visites_client_id_fkey(id, user_id)')
        .eq('agent_id', agentData.id)
        .order('date_visite', { ascending: true });

      const clientUserIds = visitesData?.map(v => v.clients?.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const offreIds = visitesData?.map(v => v.offre_id).filter(Boolean) || [];
      const clientIdsFromVisites = visitesData?.map(v => v.client_id).filter(Boolean) || [];
      
      let candidaturesMap = new Map();
      if (offreIds.length > 0) {
        const { data: candidatures } = await supabase
          .from('candidatures')
          .select('*')
          .in('offre_id', offreIds)
          .in('client_id', clientIdsFromVisites);
        
        candidatures?.forEach(c => {
          const key = `${c.offre_id}-${c.client_id}`;
          candidaturesMap.set(key, c);
        });
      }

      const visitesWithProfiles = visitesData?.map(v => ({
        ...v,
        client_profile: profilesMap.get(v.clients?.user_id),
        candidature: candidaturesMap.get(`${v.offre_id}-${v.client_id}`) || null
      })) || [];

      setVisites(visitesWithProfiles);
    } catch (error) {
      console.error('Error loading visites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDelegatedVisit = async () => {
    if (!selectedVisite || !agentId || !user) {
      toast.error('Erreur: visite non sélectionnée');
      return;
    }

    try {
      const dateTime = new Date(selectedVisite.date_visite);
      
      const { error: updateError } = await supabase
        .from('visites')
        .update({ statut: 'confirmee' })
        .eq('id', selectedVisite.id);

      if (updateError) throw updateError;

      const { error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          title: `Visite déléguée - ${selectedVisite.adresse}`,
          description: `Visite déléguée pour ${selectedVisite.client_profile?.prenom || ''} ${selectedVisite.client_profile?.nom || ''}\n\nAdresse: ${selectedVisite.adresse}\n${selectedVisite.offres ? `${selectedVisite.offres.pieces} pièces • ${selectedVisite.offres.surface}m² • ${selectedVisite.offres.prix} CHF/mois` : ''}`,
          event_date: dateTime.toISOString(),
          event_type: 'rendez_vous',
          agent_id: agentId,
          client_id: selectedVisite.client_id,
          created_by: user.id,
          status: 'planifie',
          priority: 'haute'
        });

      if (eventError) throw eventError;

      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', selectedVisite.client_id)
        .eq('agent_id', agentId)
        .maybeSingle();

      if (conv) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user.id,
          sender_type: 'agent',
          content: `✅ **Visite déléguée confirmée**\n\n📍 ${selectedVisite.adresse}\n📅 ${dateTime.toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}\n🕐 ${dateTime.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}\n\nJe me rends à la visite pour vous et vous ferai un retour détaillé.`
        });
      }

      toast.success('✅ Visite confirmée et ajoutée au calendrier');
      setConfirmDialogOpen(false);
      await loadVisites();
    } catch (error) {
      console.error('Error accepting visit:', error);
      toast.error('❌ Erreur lors de la confirmation');
    }
  };

  const handleRefuseDelegatedVisit = async (visite: any) => {
    if (!agentId || !user) return;

    try {
      await supabase
        .from('visites')
        .update({ statut: 'refusee' })
        .eq('id', visite.id);

      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', visite.client_id)
        .eq('agent_id', agentId)
        .maybeSingle();

      if (conv) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user.id,
          sender_type: 'agent',
          content: `❌ **Visite déléguée non disponible**\n\n📍 ${visite.adresse}\n\nJe ne suis malheureusement pas disponible pour effectuer cette visite. Vous pouvez essayer une autre date ou effectuer la visite vous-même.`
        });
      }

      toast.success('Visite refusée, le client a été notifié');
      await loadVisites();
    } catch (error) {
      console.error('Error refusing visit:', error);
      toast.error('❌ Erreur lors du refus');
    }
  };

  const handleMediaUpload = async (files: FileList) => {
    if (!selectedVisite) return;
    setUploadingMedia(true);
    const newMedias = [...feedbackMedias];
    
    for (const file of Array.from(files)) {
      try {
        const filePath = `visites/${selectedVisite.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('client-documents')
          .upload(filePath, file);
        
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);
          
          newMedias.push({
            url: publicUrl,
            type: file.type,
            name: file.name,
            size: file.size
          });
        }
      } catch (err) {
        console.error('Error uploading file:', err);
      }
    }
    
    setFeedbackMedias(newMedias);
    setUploadingMedia(false);
  };

  const removeMedia = (index: number) => {
    setFeedbackMedias(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarquerEffectuee = async (visite: any) => {
    if (visite.est_deleguee) {
      setSelectedVisite(visite);
      setFeedbackText(visite.feedback_agent || '');
      setRecommandation(visite.recommandation_agent || 'neutre');
      setFeedbackMedias((visite.medias as any[]) || []);
      setFeedbackDialogOpen(true);
    } else {
      try {
        await supabase
          .from('visites')
          .update({ statut: 'effectuee' })
          .eq('id', visite.id);

        toast.success('✅ Visite marquée comme effectuée');
        await loadVisites();
      } catch (error) {
        console.error('Error updating visite:', error);
        toast.error('❌ Erreur lors de la mise à jour');
      }
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedVisite || !feedbackText.trim()) {
      toast.error('Veuillez remplir le feedback');
      return;
    }

    try {
      await supabase
        .from('visites')
        .update({
          statut: 'effectuee',
          feedback_agent: feedbackText,
          recommandation_agent: recommandation,
          medias: feedbackMedias
        })
        .eq('id', selectedVisite.id);

      if (selectedVisite.offre_id) {
        await supabase
          .from('offres')
          .update({ statut: 'visite_effectuee' })
          .eq('id', selectedVisite.offre_id);
      }

      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', selectedVisite.client_id)
        .eq('agent_id', selectedVisite.agent_id)
        .maybeSingle();

      if (conv) {
        const recommandationEmoji = {
          recommande: '👍',
          neutre: '🤷',
          deconseille: '👎'
        }[recommandation];

        const recommandationText = {
          recommande: 'Je recommande ce bien',
          neutre: 'Avis neutre',
          deconseille: 'Je ne recommande pas ce bien'
        }[recommandation];

        const postulationMessage = recommandation === 'recommande' 
          ? `\n\n📝 **Prêt à postuler ?**\nSi ce bien vous intéresse, vous pouvez maintenant déposer votre candidature depuis la page "Offres Reçues". Cliquez sur "Demander l'aide de l'agent" pour que je postule pour vous.`
          : (recommandation === 'neutre' 
            ? `\n\n📝 **Vous souhaitez postuler ?**\nVous pouvez maintenant déposer votre candidature depuis la page "Offres Reçues" si ce bien vous intéresse malgré tout.`
            : '');

        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user!.id,
          sender_type: 'agent',
          content: `🏠 **Retour de la visite déléguée**\n\n📍 ${selectedVisite.adresse}\n${selectedVisite.offres ? `💰 ${selectedVisite.offres.prix?.toLocaleString()} CHF/mois` : ''}\n\n${recommandationEmoji} **${recommandationText}**\n\n📝 Feedback:\n${feedbackText}${postulationMessage}`,
          payload: feedbackMedias.length > 0 ? { type: 'visite_feedback', visite_id: selectedVisite.id, medias: feedbackMedias } : null
        });
      }

      toast.success('✅ Feedback enregistré et client notifié');
      setFeedbackDialogOpen(false);
      setFeedbackMedias([]);
      await loadVisites();
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('❌ Erreur lors de l\'enregistrement');
    }
  };

  const getRecommandationBadge = (recommandation: string | null) => {
    if (!recommandation) return null;
    
    const config = {
      recommande: { icon: ThumbsUp, label: 'Recommandé', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
      neutre: { icon: Minus, label: 'Neutre', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
      deconseille: { icon: ThumbsDown, label: 'Déconseillé', color: 'bg-red-500/10 text-red-600 border-red-500/30' }
    }[recommandation];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge className={cn("gap-1 border", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const toggleVisiteSelection = (visiteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelection = new Set(selectedVisites);
    if (newSelection.has(visiteId)) {
      newSelection.delete(visiteId);
    } else {
      newSelection.add(visiteId);
    }
    setSelectedVisites(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedVisites.size === visites.length) {
      setSelectedVisites(new Set());
    } else {
      setSelectedVisites(new Set(visites.map(v => v.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const visiteIds = Array.from(selectedVisites);
      const { error } = await supabase.from('visites').delete().in('id', visiteIds);
      if (error) throw error;

      setVisites(visites.filter(v => !selectedVisites.has(v.id)));
      setSelectedVisites(new Set());
      toast.success(`${visiteIds.length} visite(s) supprimée(s)`);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  // Helper pour calculer l'urgence d'une visite
  const getVisiteUrgency = (dateVisite: string) => {
    const now = new Date();
    const visiteDate = new Date(dateVisite);
    const hoursUntil = differenceInHours(visiteDate, now);
    const daysUntil = differenceInDays(visiteDate, now);

    if (hoursUntil < 0) return { level: 'past', label: 'Passée', color: 'bg-muted text-muted-foreground', urgent: false };
    if (hoursUntil < 3) return { level: 'critical', label: 'Imminent', color: 'bg-destructive text-destructive-foreground', urgent: true };
    if (hoursUntil < 24) return { level: 'high', label: `${hoursUntil}h`, color: 'bg-destructive/80 text-destructive-foreground', urgent: true };
    if (daysUntil === 0) return { level: 'high', label: "Aujourd'hui", color: 'bg-warning text-warning-foreground', urgent: true };
    if (daysUntil === 1) return { level: 'medium', label: 'Demain', color: 'bg-amber-500 text-white', urgent: false };
    if (daysUntil <= 3) return { level: 'normal', label: `${daysUntil}j`, color: 'bg-primary text-primary-foreground', urgent: false };
    return { level: 'normal', label: `${daysUntil}j`, color: 'bg-muted text-muted-foreground', urgent: false };
  };

  const now = new Date();
  const visitesDelegueesPending = visites.filter(v => v.est_deleguee && v.statut === 'planifiee' && !v.feedback_agent);
  const visitesDeleguees = visites.filter(v => v.est_deleguee && v.statut === 'confirmee' && new Date(v.date_visite) >= now);
  const visitesAVenir = visites.filter(v => (v.statut === 'planifiee' || v.statut === 'confirmee') && new Date(v.date_visite) >= now && !v.est_deleguee);
  const visitesPassees = visites.filter(v => v.statut === 'effectuee' || v.statut === 'refusee' || ((v.statut === 'planifiee' || v.statut === 'confirmee') && new Date(v.date_visite) < now));
  
  const toutesVisitesAVenir = [...visitesAVenir, ...visitesDeleguees];
  const visitesAVenirTriees = [...toutesVisitesAVenir].sort((a, b) => 
    new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime()
  );
  
  const visitesUrgentes = visitesAVenirTriees.filter(v => {
    const urgency = getVisiteUrgency(v.date_visite);
    return urgency.urgent;
  });

  const stats = {
    total: visites.length,
    aVenir: toutesVisitesAVenir.length,
    urgentes: visitesUrgentes.length,
    effectuees: visites.filter(v => v.statut === 'effectuee').length,
    delegueesPending: visitesDelegueesPending.length,
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
        <div className="p-4 md:p-8 space-y-6">
          {/* Skeleton Header */}
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 md:p-8 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          {/* Skeleton Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <VisiteSkeletonCard key={i} index={i} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Premium visite card component
  const renderPremiumVisiteCard = (visite: any, index: number, showCheckbox = true) => {
    const urgency = getVisiteUrgency(visite.date_visite);
    const isVisiteDatePassed = new Date(visite.date_visite) <= now;
    const visiteDate = new Date(visite.date_visite);
    
    return (
      <div 
        key={visite.id}
        className={cn(
          "group relative overflow-hidden rounded-xl cursor-pointer",
          "bg-gradient-to-br from-card via-card to-muted/20",
          "border border-border/50 hover:border-primary/30",
          "hover:shadow-xl hover:shadow-primary/10",
          "transform hover:scale-[1.02] hover:-translate-y-0.5",
          "transition-all duration-500 ease-out",
          "animate-fade-in",
          selectedVisites.has(visite.id) && "ring-2 ring-primary",
          urgency.urgent && "border-destructive/50"
        )}
        onClick={() => handleOpenDetail(visite)}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Status bar */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          urgency.urgent ? "bg-destructive" : visite.est_deleguee ? "bg-primary" : "bg-border"
        )} />
        
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        </div>
        
        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {showCheckbox && (
                <Checkbox 
                  checked={selectedVisites.has(visite.id)}
                  onCheckedChange={() => toggleVisiteSelection(visite.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5"
                />
              )}
              <div className={cn(
                "relative p-3 rounded-xl transition-all duration-300",
                urgency.urgent 
                  ? "bg-gradient-to-br from-destructive/20 to-warning/20 group-hover:shadow-lg group-hover:shadow-destructive/20"
                  : "bg-gradient-to-br from-primary/10 to-accent/10 group-hover:shadow-lg group-hover:shadow-primary/20"
              )}>
                <Calendar className={cn(
                  "w-5 h-5 transition-all duration-300 group-hover:scale-110",
                  urgency.urgent ? "text-destructive" : "text-primary"
                )} />
                {urgency.urgent && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-ping" />
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {visite.est_deleguee && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  Déléguée
                </Badge>
              )}
              <Badge className={cn("font-semibold shadow-lg", urgency.color, urgency.urgent && "animate-pulse")}>
                {urgency.label}
              </Badge>
            </div>
          </div>
          
          {/* Address */}
          <div className="mb-3">
            <AddressLink 
              address={visite.adresse}
              className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300"
              truncate
            />
          </div>

          {/* Client info */}
          {visite.client_profile && (
            <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-bold">
                {visite.client_profile.prenom?.[0]}{visite.client_profile.nom?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {visite.est_deleguee && <span className="text-muted-foreground">Pour </span>}
                  {visite.client_profile.prenom} {visite.client_profile.nom}
                </p>
              </div>
            </div>
          )}
          
          {/* Property details grid */}
          {visite.offres && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {visite.offres.pieces && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5 transition-colors duration-300">
                  <Home className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium">{visite.offres.pieces}p</span>
                </div>
              )}
              {visite.offres.surface && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5 transition-colors duration-300">
                  <Maximize2 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium">{visite.offres.surface}m²</span>
                </div>
              )}
              {visite.offres.prix && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/5 transition-colors duration-300">
                  <Banknote className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium">{visite.offres.prix.toLocaleString('fr-CH')}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {visite.notes && (
            <p className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 p-2 rounded-lg mb-4 line-clamp-2">
              💡 {visite.notes}
            </p>
          )}
          
          {/* Date/time footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-medium">
                {format(visiteDate, "EEE dd MMM", { locale: fr })} à {format(visiteDate, "HH:mm")}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-xs font-medium">Détails</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
            </div>
          </div>

          {/* Action button */}
          {isVisiteDatePassed && (
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleMarquerEffectuee(visite);
              }}
              className={cn(
                "w-full mt-4 shadow-lg transition-all duration-300",
                urgency.urgent && "bg-destructive hover:bg-destructive/90"
              )}
              size="lg"
            >
              {visite.est_deleguee ? (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Donner mon feedback
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marquer comme effectuée
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Premium pending request card
  const renderPendingRequestCard = (visite: any, index: number) => {
    const visiteDate = new Date(visite.date_visite);
    
    return (
      <div 
        key={visite.id}
        className={cn(
          "group relative overflow-hidden rounded-xl cursor-pointer",
          "bg-gradient-to-br from-amber-500/5 via-card to-amber-500/5",
          "border-2 border-amber-500/30 hover:border-amber-500/50",
          "hover:shadow-xl hover:shadow-amber-500/10",
          "transform hover:scale-[1.02]",
          "transition-all duration-500 ease-out",
          "animate-fade-in"
        )}
        onClick={() => handleOpenDetail(visite)}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
        
        <div className="relative p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 animate-pulse">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <Badge className="bg-amber-500/20 text-amber-700 border border-amber-500/30 animate-pulse">
              En attente
            </Badge>
          </div>
          
          <div className="mb-3">
            <AddressLink 
              address={visite.adresse}
              className="font-semibold text-foreground"
              truncate
            />
          </div>

          {visite.client_profile && (
            <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-amber-500/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                {visite.client_profile.prenom?.[0]}{visite.client_profile.nom?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium">Demandé par {visite.client_profile.prenom} {visite.client_profile.nom}</p>
              </div>
            </div>
          )}

          {visite.offres && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <Home className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">{visite.offres.pieces}p</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">{visite.offres.surface}m²</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                <Banknote className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">{visite.offres.prix?.toLocaleString('fr-CH')}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 pt-3 border-t border-border/50">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {format(visiteDate, "EEEE dd MMM 'à' HH:mm", { locale: fr })}
            </span>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenConfirmDialog(visite);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg"
              size="lg"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accepter
            </Button>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleRefuseDelegatedVisit(visite);
              }}
              variant="outline"
              size="lg"
              className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Refuser
            </Button>
          </div>
          <Button 
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await supabase.from('visites').update({ statut_coursier: 'en_attente' }).eq('id', visite.id);
                toast.success('Visite déléguée au pool coursier');
                await loadVisites();
              } catch { toast.error('Erreur'); }
            }}
            variant="outline"
            size="sm"
            className="w-full mt-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            🏍️ Déléguer à un coursier (5.-)
          </Button>
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5 relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-4 md:p-8 space-y-6">
        {/* Premium Header */}
        <PremiumPageHeader
          title="Visites clients"
          subtitle="Gérez et suivez toutes vos visites planifiées et déléguées"
          badge="Agenda"
          icon={Calendar}
          action={
            stats.delegueesPending > 0 && (
              <Badge className="bg-amber-500 text-white animate-pulse gap-1 shadow-lg">
                <Bell className="h-3 w-3" />
                {stats.delegueesPending} demande{stats.delegueesPending > 1 ? 's' : ''}
              </Badge>
            )
          }
        />

        {/* Premium Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              icon: Calendar, 
              value: stats.total, 
              label: 'Total', 
              gradient: 'from-blue-500/20 to-blue-600/10',
              iconBg: 'bg-blue-500/20',
              iconColor: 'text-blue-600 dark:text-blue-400'
            },
            { 
              icon: Bell, 
              value: stats.aVenir, 
              label: 'À venir', 
              gradient: 'from-cyan-500/20 to-cyan-600/10',
              iconBg: 'bg-cyan-500/20',
              iconColor: 'text-cyan-600 dark:text-cyan-400'
            },
            { 
              icon: AlertTriangle, 
              value: stats.urgentes, 
              label: 'Urgentes', 
              gradient: 'from-red-500/20 to-red-600/10',
              iconBg: 'bg-red-500/20',
              iconColor: 'text-red-600 dark:text-red-400'
            },
            { 
              icon: CheckCircle, 
              value: stats.effectuees, 
              label: 'Effectuées', 
              gradient: 'from-green-500/20 to-green-600/10',
              iconBg: 'bg-green-500/20',
              iconColor: 'text-green-600 dark:text-green-400'
            },
          ].map((stat, index) => (
            <Card 
              key={index} 
              className={cn(
                "group relative overflow-hidden border-border/50 bg-gradient-to-br",
                stat.gradient,
                "hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              
              <CardContent className="pt-6 relative">
                <div className="flex items-center gap-3">
                  <div className={cn("p-3 rounded-xl", stat.iconBg)}>
                    <stat.icon className={cn("h-6 w-6", stat.iconColor)} />
                  </div>
                  <div>
                    <div className="text-3xl font-bold">
                      <AnimatedValue value={stat.value} />
                    </div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bulk Selection Bar */}
        {visites.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedVisites.size === visites.length && visites.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedVisites.size > 0 
                      ? `${selectedVisites.size} sélectionnée(s)` 
                      : 'Tout sélectionner'}
                  </span>
                </div>
                {selectedVisites.size > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="shadow-lg"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer ({selectedVisites.size})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Urgent Visits Alert */}
        {visitesUrgentes.length > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-destructive/10 via-destructive/5 to-warning/10 border border-destructive/30 p-4">
            <div className="absolute top-2 right-4">
              <div className="w-12 h-12 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-destructive/20 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">
                  {visitesUrgentes.length} visite{visitesUrgentes.length > 1 ? 's' : ''} urgente{visitesUrgentes.length > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-muted-foreground">Nécessitent votre attention immédiate</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {visitesUrgentes.map((visite, index) => renderPremiumVisiteCard(visite, index, false))}
            </div>
          </div>
        )}

        {/* Pending Delegated Visits */}
        {visitesDelegueesPending.length > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-500/30 p-4">
            <div className="absolute top-2 right-4">
              <Sparkles className="h-6 w-6 text-amber-500/40 animate-pulse" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/20 animate-pulse">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                  Demandes de visites déléguées
                </h3>
                <p className="text-sm text-muted-foreground">Vos clients vous demandent d'effectuer ces visites</p>
              </div>
              <Badge className="ml-auto bg-amber-500/20 text-amber-700 border-amber-500/30">
                {visitesDelegueesPending.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {visitesDelegueesPending.map((visite, index) => renderPendingRequestCard(visite, index))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="a-venir" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="a-venir" className="gap-2 data-[state=active]:bg-background">
              <Bell className="h-4 w-4" />
              À venir ({visitesAVenirTriees.filter(v => !getVisiteUrgency(v.date_visite).urgent).length})
            </TabsTrigger>
            <TabsTrigger value="passees" className="gap-2 data-[state=active]:bg-background">
              <History className="h-4 w-4" />
              Passées ({visitesPassees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="a-venir" className="mt-6 space-y-6">
            {/* Confirmed delegated visits */}
            {visitesDeleguees.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🤝 Visites déléguées confirmées</span>
                  <Badge variant="secondary">{visitesDeleguees.length}</Badge>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visitesDeleguees.map((visite, index) => renderPremiumVisiteCard(visite, index))}
                </div>
              </div>
            )}

            {/* Normal planned visits */}
            {visitesAVenir.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📅 Visites planifiées</span>
                  <Badge variant="secondary">{visitesAVenir.length}</Badge>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visitesAVenir
                    .filter(v => !getVisiteUrgency(v.date_visite).urgent)
                    .map((visite, index) => renderPremiumVisiteCard(visite, index))}
                </div>
              </div>
            )}

            {toutesVisitesAVenir.length === 0 && visitesDelegueesPending.length === 0 && (
              <Card className="border-dashed border-2 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="py-20 text-center">
                  <div className="relative mx-auto w-20 h-20 mb-6">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Aucune visite à venir
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Vos visites planifiées apparaîtront ici
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="passees" className="mt-6">
            {visitesPassees.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {visitesPassees.map((visite, index) => (
                  <div 
                    key={visite.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl cursor-pointer opacity-80 hover:opacity-100",
                      "bg-card border border-border/50 hover:border-primary/30",
                      "hover:shadow-lg transition-all duration-300",
                      "animate-fade-in",
                      selectedVisites.has(visite.id) && "ring-2 ring-primary opacity-100"
                    )}
                    onClick={() => handleOpenDetail(visite)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={selectedVisites.has(visite.id)}
                            onCheckedChange={() => toggleVisiteSelection(visite.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="p-2 rounded-lg bg-muted">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {visite.est_deleguee && (
                            <Badge variant="outline" className="text-xs">Déléguée</Badge>
                          )}
                          <Badge variant={visite.statut === 'effectuee' ? 'secondary' : 'destructive'}>
                            {visite.statut === 'effectuee' ? 'Effectuée' : 'Manquée'}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="font-medium mb-2 line-clamp-1">{visite.adresse}</p>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(visite.date_visite), "dd MMM yyyy", { locale: fr })}</span>
                        {visite.recommandation_agent && getRecommandationBadge(visite.recommandation_agent)}
                      </div>

                      {visite.client_profile && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{visite.client_profile.prenom} {visite.client_profile.nom}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-border/50 bg-card/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>Aucune visite passée</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Feedback de la visite déléguée
            </DialogTitle>
            <DialogDescription>
              Partagez votre avis sur le bien visité avec votre client
            </DialogDescription>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                <h4 className="font-semibold">{selectedVisite.adresse}</h4>
                {selectedVisite.offres && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedVisite.offres.pieces} pièces • {selectedVisite.offres.surface}m² • {selectedVisite.offres.prix} CHF/mois
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Votre recommandation *</Label>
                <RadioGroup value={recommandation} onValueChange={(v: any) => setRecommandation(v)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-xl hover:bg-green-500/5 cursor-pointer transition-colors">
                    <RadioGroupItem value="recommande" id="recommande" />
                    <Label htmlFor="recommande" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">Je recommande ce bien</p>
                        <p className="text-xs text-muted-foreground">Le bien correspond aux attentes du client</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-xl hover:bg-amber-500/5 cursor-pointer transition-colors">
                    <RadioGroupItem value="neutre" id="neutre" />
                    <Label htmlFor="neutre" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Minus className="h-4 w-4 text-amber-600" />
                      <div>
                        <p className="font-medium">Avis neutre</p>
                        <p className="text-xs text-muted-foreground">Le bien a des points positifs et négatifs</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-xl hover:bg-red-500/5 cursor-pointer transition-colors">
                    <RadioGroupItem value="deconseille" id="deconseille" />
                    <Label htmlFor="deconseille" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium">Je ne recommande pas ce bien</p>
                        <p className="text-xs text-muted-foreground">Le bien ne convient pas au client</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Votre feedback détaillé *</Label>
                <Textarea
                  id="feedback"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Décrivez l'état du bien, l'ambiance, les points positifs/négatifs, vos impressions générales..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Photos / Vidéos de la visite
                </Label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                  disabled={uploadingMedia}
                />
                {feedbackMedias.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {feedbackMedias.map((media, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border">
                        {media.type.startsWith('image/') ? (
                          <img src={media.url} alt={media.name} className="w-full h-20 object-cover" />
                        ) : (
                          <div className="w-full h-20 bg-muted flex items-center justify-center">
                            <Video className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMedia(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveFeedback} disabled={!feedbackText.trim()} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Premium Header */}
          <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6 border-b border-border/50">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-4 right-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-pulse" />
            </div>
            <DialogHeader className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {selectedVisite?.est_deleguee ? 'Visite déléguée' : 'Visite'}
                </Badge>
                {selectedVisite?.statut && (
                  <Badge variant={selectedVisite.statut === 'effectuee' ? 'default' : 'secondary'}>
                    {selectedVisite.statut === 'effectuee' ? 'Effectuée' : 
                     selectedVisite.statut === 'confirmee' ? 'Confirmée' : 'Planifiée'}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-bold">
                {selectedVisite?.adresse}
              </DialogTitle>
              {selectedVisite && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(selectedVisite.date_visite), "EEEE dd MMMM yyyy", { locale: fr })}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{format(new Date(selectedVisite.date_visite), "HH:mm")}</span>
                  </div>
                </div>
              )}
            </DialogHeader>
          </div>

          {selectedVisite && (
            <div className="p-6 space-y-6">
              {/* Client */}
              {selectedVisite.client_profile && (
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                    {selectedVisite.client_profile.prenom?.[0]}{selectedVisite.client_profile.nom?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {selectedVisite.est_deleguee ? 'Visite pour ' : ''}
                      {selectedVisite.client_profile.prenom} {selectedVisite.client_profile.nom}
                    </p>
                    {selectedVisite.client_profile.email && (
                      <p className="text-sm text-muted-foreground">{selectedVisite.client_profile.email}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Property details */}
              {selectedVisite.offres && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    Détails du bien
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 text-center">
                      <div className="text-xl font-bold text-blue-600">{selectedVisite.offres.pieces}</div>
                      <div className="text-xs text-muted-foreground">pièces</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 text-center">
                      <div className="text-xl font-bold text-green-600">{selectedVisite.offres.surface}m²</div>
                      <div className="text-xs text-muted-foreground">surface</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-center">
                      <div className="text-xl font-bold text-primary">{selectedVisite.offres.prix?.toLocaleString('fr-CH')}</div>
                      <div className="text-xs text-muted-foreground">CHF/mois</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedVisite.notes && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <h4 className="text-sm font-semibold mb-2 text-amber-700 dark:text-amber-400">💬 Notes du client</h4>
                  <p className="text-sm">{selectedVisite.notes}</p>
                </div>
              )}

              {/* Feedback if done */}
              {selectedVisite.statut === 'effectuee' && selectedVisite.feedback_agent && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    📝 Mon feedback
                    {selectedVisite.recommandation_agent && getRecommandationBadge(selectedVisite.recommandation_agent)}
                  </h4>
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                    <p className="text-sm whitespace-pre-wrap">{selectedVisite.feedback_agent}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 bg-muted/30 border-t border-border/50 gap-2">
            {selectedVisite?.est_deleguee && selectedVisite?.statut === 'planifiee' && (
              <>
                <Button 
                  onClick={() => {
                    handleAcceptDelegatedVisit();
                    setDetailDialogOpen(false);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accepter
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    handleRefuseDelegatedVisit(selectedVisite);
                    setDetailDialogOpen(false);
                  }}
                  className="flex-1 text-red-600 border-red-500/30 hover:bg-red-500/10"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Refuser
                </Button>
              </>
            )}
            {new Date(selectedVisite?.date_visite) <= now && selectedVisite?.statut !== 'effectuee' && (
              <Button 
                onClick={() => {
                  handleMarquerEffectuee(selectedVisite);
                  setDetailDialogOpen(false);
                }}
                className="flex-1"
              >
                {selectedVisite?.est_deleguee ? 'Donner mon feedback' : 'Marquer comme effectuée'}
              </Button>
            )}
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => handleDeleteVisite(selectedVisite?.id, true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirmer la visite déléguée
            </DialogTitle>
            <DialogDescription>
              Confirmez que vous acceptez d'effectuer cette visite pour votre client
            </DialogDescription>
          </DialogHeader>
          
          {selectedVisite && (
            <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20">
              <p className="font-semibold">{selectedVisite.adresse}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(selectedVisite.date_visite), "EEEE dd MMMM 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAcceptDelegatedVisit} className="bg-green-600 hover:bg-green-700 gap-2">
              <CheckCircle className="h-4 w-4" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedVisites.size} visite(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement les visites sélectionnées.
              <br /><br />
              <span className="text-destructive font-medium">Cette action est irréversible.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
