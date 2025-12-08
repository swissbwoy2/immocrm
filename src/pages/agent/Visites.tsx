import { useEffect, useState } from 'react';
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
import { Calendar, Clock, User, MessageSquare, ThumbsUp, ThumbsDown, Minus, AlertTriangle, Bell, History, CheckCircle, XCircle, Trash2, Upload, X, Image, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


export default function AgentVisites() {
  const { user } = useAuth();
  const { markTypeAsRead } = useNotifications();
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
      // 1. Récupérer les infos de la visite
      const { data: visite } = await supabase
        .from('visites')
        .select('offre_id, client_id, adresse')
        .eq('id', visiteId)
        .single();

      if (!visite) throw new Error('Visite non trouvée');

      if (cascade && visite.offre_id && visite.client_id) {
        // 2. Supprimer la transaction liée
        await supabase
          .from('transactions')
          .delete()
          .eq('offre_id', visite.offre_id)
          .eq('client_id', visite.client_id);

        // 3. Réinitialiser la candidature liée
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

      // 4. Supprimer la visite
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
    // Mark visit notifications as read when visiting this page
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

      // Charger les profils des clients
      const clientUserIds = visitesData?.map(v => v.clients?.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Charger les candidatures liées
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

  // Accepter une visite déléguée
  const handleAcceptDelegatedVisit = async () => {
    if (!selectedVisite || !agentId || !user) {
      toast.error('Erreur: visite non sélectionnée');
      return;
    }

    try {
      const dateTime = new Date(selectedVisite.date_visite);
      
      // Mettre à jour la visite avec le statut confirmé
      const { error: updateError } = await supabase
        .from('visites')
        .update({ statut: 'confirmee' })
        .eq('id', selectedVisite.id);

      if (updateError) throw updateError;

      // Créer un événement dans le calendrier de l'agent
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

      // Notifier le client via la messagerie
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

      // Notification handled by database trigger (notify_on_visite_status_change)

      toast.success('✅ Visite confirmée et ajoutée au calendrier');
      setConfirmDialogOpen(false);
      await loadVisites();
    } catch (error) {
      console.error('Error accepting visit:', error);
      toast.error('❌ Erreur lors de la confirmation');
    }
  };

  // Refuser une visite déléguée
  const handleRefuseDelegatedVisit = async (visite: any) => {
    if (!agentId || !user) return;

    try {
      // Mettre à jour la visite avec le statut refusé
      await supabase
        .from('visites')
        .update({ statut: 'refusee' })
        .eq('id', visite.id);

      // Notifier le client
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

      // Notification handled by database trigger (notify_on_visite_status_change)

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
      // Pour les visites déléguées, ouvrir le dialog de feedback
      setSelectedVisite(visite);
      setFeedbackText(visite.feedback_agent || '');
      setRecommandation(visite.recommandation_agent || 'neutre');
      setFeedbackMedias((visite.medias as any[]) || []);
      setFeedbackDialogOpen(true);
    } else {
      // Pour les visites normales, juste marquer comme effectuée
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

      // Mettre à jour le statut de l'offre
      if (selectedVisite.offre_id) {
        await supabase
          .from('offres')
          .update({ statut: 'visite_effectuee' })
          .eq('id', selectedVisite.offre_id);
      }

      // Notifier le client
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

        // Message de feedback + invitation à postuler
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
      recommande: { icon: ThumbsUp, label: 'Recommandé', variant: 'default' as const },
      neutre: { icon: Minus, label: 'Neutre', variant: 'secondary' as const },
      deconseille: { icon: ThumbsDown, label: 'Déconseillé', variant: 'destructive' as const }
    }[recommandation];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const now = new Date();
  
  // Helper pour calculer l'urgence d'une visite
  const getVisiteUrgency = (dateVisite: string) => {
    const visiteDate = new Date(dateVisite);
    const timeDiff = visiteDate.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (minutesDiff <= 30 && minutesDiff > 0) {
      return { level: 'critical', label: '30 min!', color: 'destructive' as const };
    } else if (minutesDiff <= 60) {
      return { level: 'critical', label: '1h', color: 'destructive' as const };
    } else if (hoursDiff <= 3) {
      return { level: 'critical', label: `${hoursDiff}h`, color: 'destructive' as const };
    } else if (daysDiff === 0) {
      return { level: 'high', label: "Aujourd'hui", color: 'default' as const };
    } else if (daysDiff === 1) {
      return { level: 'high', label: 'Demain', color: 'secondary' as const };
    } else if (daysDiff <= 7) {
      return { level: 'normal', label: `${daysDiff}j`, color: 'outline' as const };
    }
    return { level: 'normal', label: `${daysDiff}j`, color: 'outline' as const };
  };

  // Séparer les visites
  // Visites déléguées en attente de confirmation (statut = planifiee mais pas encore confirmée)
  const visitesDelegueesPending = visites.filter(v => v.est_deleguee && v.statut === 'planifiee' && !v.feedback_agent);
  // Visites déléguées confirmées à venir
  const visitesDeleguees = visites.filter(v => v.est_deleguee && v.statut === 'confirmee' && new Date(v.date_visite) >= now);
  // Toutes les visites à venir (normales + déléguées confirmées)
  const visitesAVenir = visites.filter(v => (v.statut === 'planifiee' || v.statut === 'confirmee') && new Date(v.date_visite) >= now && !v.est_deleguee);
  const visitesPassees = visites.filter(v => v.statut === 'effectuee' || v.statut === 'refusee' || ((v.statut === 'planifiee' || v.statut === 'confirmee') && new Date(v.date_visite) < now));
  
  // Combiner pour le tri par urgence (inclure les visites déléguées confirmées)
  const toutesVisitesAVenir = [...visitesAVenir, ...visitesDeleguees];
  
  // Trier par urgence
  const visitesAVenirTriees = [...toutesVisitesAVenir].sort((a, b) => 
    new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime()
  );
  
  // Visites urgentes (aujourd'hui ou dans les 3h)
  const visitesUrgentes = visitesAVenirTriees.filter(v => {
    const urgency = getVisiteUrgency(v.date_visite);
    return urgency.level === 'critical' || urgency.level === 'high';
  });

  // Visites à venir non urgentes
  const visitesNormales = visitesAVenirTriees.filter(v => {
    const urgency = getVisiteUrgency(v.date_visite);
    return urgency.level === 'normal';
  });

  const renderVisiteCard = (visite: any, showUrgency = true, showCheckbox = false) => {
    const urgency = getVisiteUrgency(visite.date_visite);
    const isUrgent = urgency.level === 'critical';
    const isVisiteDatePassed = new Date(visite.date_visite) <= new Date();
    
    return (
      <Card 
        key={visite.id} 
        className={`cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
          isUrgent ? 'border-destructive/50 bg-destructive/5' : 
          visite.est_deleguee ? 'border-primary/50' : ''
        } ${selectedVisites.has(visite.id) ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleOpenDetail(visite)}
      >
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0 order-2 sm:order-1">
              {showCheckbox && (
                <Checkbox 
                  checked={selectedVisites.has(visite.id)}
                  onCheckedChange={() => toggleVisiteSelection(visite.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
              )}
              <CardTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
                <span className="truncate">{visite.adresse}</span>
                {visite.est_deleguee && (
                  <Badge variant="outline" className="shrink-0 text-xs">Déléguée</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{new Date(visite.date_visite).toLocaleDateString('fr-CH', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 order-1 sm:order-2">
              {showUrgency && (
                <Badge variant={urgency.color} className={isUrgent ? 'animate-pulse' : ''}>
                  {isUrgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {urgency.label}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visite.client_profile && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
              <User className="h-4 w-4 shrink-0" />
              <span className="font-medium truncate">
                {visite.est_deleguee && <span className="text-muted-foreground">Pour </span>}
                {visite.client_profile.prenom} {visite.client_profile.nom}
              </span>
            </div>
          )}
          {visite.offres && (
            <div className="text-xs sm:text-sm text-muted-foreground break-words">
              {visite.offres.pieces} pièces • {visite.offres.surface}m² • {visite.offres.prix} CHF/mois
            </div>
          )}
          {visite.notes && (
            <p className="text-xs sm:text-sm bg-yellow-50 dark:bg-yellow-950 p-2 rounded-lg break-words">
              💡 {visite.notes}
            </p>
          )}
          {isVisiteDatePassed ? (
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleMarquerEffectuee(visite);
              }}
              className="w-full touch-target"
              size="lg"
              variant={isUrgent ? "destructive" : "default"}
            >
              {visite.est_deleguee ? (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Donner mon feedback
                </>
              ) : (
                'Marquer comme effectuée'
              )}
            </Button>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                ⏳ Actions disponibles après la visite
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden smooth-scroll pb-safe">
      <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Visites clients</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {visitesDelegueesPending.length > 0 && `${visitesDelegueesPending.length} demande${visitesDelegueesPending.length > 1 ? 's' : ''} en attente • `}
              {toutesVisitesAVenir.length} à venir • {visitesPassees.length} passée{visitesPassees.length > 1 ? 's' : ''}
            </p>
          </div>
          {visites.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedVisites.size === visites.length && visites.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedVisites.size > 0 ? `${selectedVisites.size} sélectionnée(s)` : 'Tout sélectionner'}
                </span>
              </div>
              {selectedVisites.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer ({selectedVisites.size})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Alerte visites urgentes */}
        {visitesUrgentes.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <h2 className="font-semibold text-destructive text-sm sm:text-base">
                {visitesUrgentes.length} visite{visitesUrgentes.length > 1 ? 's' : ''} urgente{visitesUrgentes.length > 1 ? 's' : ''}
              </h2>
            </div>
            <div className="grid gap-3">
              {visitesUrgentes.map(visite => renderVisiteCard(visite, true))}
            </div>
          </div>
        )}

        <Tabs defaultValue="a-venir" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="a-venir" className="flex items-center gap-2 text-xs sm:text-sm">
              <Bell className="h-4 w-4 hidden xs:inline shrink-0" />
              <span>À venir ({visitesNormales.length})</span>
            </TabsTrigger>
            <TabsTrigger value="passees" className="flex items-center gap-2 text-xs sm:text-sm">
              <History className="h-4 w-4 hidden xs:inline shrink-0" />
              <span>Passées ({visitesPassees.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="a-venir" className="space-y-6 mt-4">
            {/* Visites normales à venir */}
            {visitesNormales.length > 0 && (
              <div className="grid gap-3">
                {visitesNormales.map(visite => renderVisiteCard(visite, true, true))}
              </div>
            )}

            {/* Visites déléguées en attente de confirmation */}
            {visitesDelegueesPending.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2 flex-wrap text-amber-800 dark:text-amber-200">
                  <span>⏳ Demandes de visites déléguées</span>
                  <Badge variant="secondary">{visitesDelegueesPending.length}</Badge>
                </h3>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mb-4">
                  Vos clients vous demandent d'effectuer ces visites pour eux
                </p>
                <div className="grid gap-3">
                  {visitesDelegueesPending.map(visite => (
                    <Card 
                      key={visite.id} 
                      className="border-amber-300 dark:border-amber-700 cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                      onClick={() => handleOpenDetail(visite)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
                              <span className="truncate">{visite.adresse}</span>
                              <Badge variant="outline" className="shrink-0 bg-amber-100 text-amber-800 border-amber-300 text-xs">
                                En attente
                              </Badge>
                            </CardTitle>
                            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span className="whitespace-nowrap">{new Date(visite.date_visite).toLocaleDateString('fr-CH', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 shrink-0" />
                                <span className="whitespace-nowrap">{new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {visite.client_profile && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                            <User className="h-4 w-4 shrink-0" />
                            <span className="font-medium truncate">
                              Demandé par {visite.client_profile.prenom} {visite.client_profile.nom}
                            </span>
                          </div>
                        )}
                        {visite.offres && (
                          <div className="text-xs sm:text-sm text-muted-foreground break-words">
                            {visite.offres.pieces} pièces • {visite.offres.surface}m² • {visite.offres.prix} CHF/mois
                          </div>
                        )}
                        {visite.notes && (
                          <p className="text-xs sm:text-sm bg-yellow-50 dark:bg-yellow-950 p-2 rounded-lg break-words">
                            💡 {visite.notes}
                          </p>
                        )}
                        <div className="flex flex-col xs:flex-row gap-3">
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenConfirmDialog(visite);
                            }}
                            className="flex-1 touch-target"
                            size="lg"
                            variant="default"
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
                            className="flex-1 touch-target"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Refuser
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Visites déléguées confirmées */}
            {visitesDeleguees.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  🤝 Visites déléguées confirmées
                  <Badge variant="secondary">{visitesDeleguees.length}</Badge>
                </h3>
                <div className="grid gap-3">
                  {visitesDeleguees.map(visite => renderVisiteCard(visite, true, true))}
                </div>
              </div>
            )}

            {/* Visites planifiées normales */}
            {visitesNormales.filter(v => !v.est_deleguee).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  📅 Visites planifiées
                  <Badge variant="secondary">{visitesNormales.filter(v => !v.est_deleguee).length}</Badge>
                </h3>
                <div className="grid gap-3">
                  {visitesNormales.filter(v => !v.est_deleguee).map(visite => renderVisiteCard(visite, true, true))}
                </div>
              </div>
            )}

            {visitesNormales.length === 0 && visitesDeleguees.length === 0 && visitesDelegueesPending.length === 0 && visitesUrgentes.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucune visite à venir
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="passees" className="mt-4">
            {visitesPassees.length > 0 ? (
              <div className="grid gap-3">
                {visitesPassees.map(visite => (
                  <Card 
                    key={visite.id} 
                    className={`opacity-75 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${selectedVisites.has(visite.id) ? 'ring-2 ring-primary opacity-100' : ''}`}
                    onClick={() => handleOpenDetail(visite)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Checkbox 
                            checked={selectedVisites.has(visite.id)}
                            onCheckedChange={() => toggleVisiteSelection(visite.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
                              <span className="truncate">{visite.adresse}</span>
                              {visite.est_deleguee && (
                                <Badge variant="outline" className="text-xs shrink-0">Déléguée</Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span className="whitespace-nowrap">{new Date(visite.date_visite).toLocaleDateString('fr-CH')}</span>
                              </div>
                              {visite.recommandation_agent && (
                                <div className="flex items-center gap-1">
                                  {getRecommandationBadge(visite.recommandation_agent)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={visite.statut === 'effectuee' ? 'secondary' : 'destructive'} className="self-start shrink-0">
                          {visite.statut === 'effectuee' ? 'Effectuée' : 'Manquée'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {visite.client_profile && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4" />
                          <span>
                            {visite.est_deleguee && <span className="text-muted-foreground">Visite effectuée pour </span>}
                            <span className="font-medium">{visite.client_profile.prenom} {visite.client_profile.nom}</span>
                          </span>
                        </div>
                      )}
                      {visite.feedback_agent && (
                        <div className="text-sm bg-muted p-3 rounded-lg">
                          <p className="font-medium mb-1">📝 Feedback:</p>
                          <p className="text-muted-foreground">{visite.feedback_agent}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucune visite passée
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de feedback */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback de la visite déléguée</DialogTitle>
            <DialogDescription>
              Partagez votre avis sur le bien visité avec votre client
            </DialogDescription>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-4">
              <div className="p-3 sm:p-4 bg-muted rounded-lg break-words">
                <h4 className="font-semibold break-words">{selectedVisite.adresse}</h4>
                {selectedVisite.offres && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {selectedVisite.offres.pieces} pièces • {selectedVisite.offres.surface}m² • {selectedVisite.offres.prix} CHF/mois
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Votre recommandation *</Label>
                <RadioGroup value={recommandation} onValueChange={(v: any) => setRecommandation(v)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="recommande" id="recommande" />
                    <Label htmlFor="recommande" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">Je recommande ce bien</p>
                        <p className="text-xs text-muted-foreground">Le bien correspond aux attentes du client</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="neutre" id="neutre" />
                    <Label htmlFor="neutre" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Minus className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-medium">Avis neutre</p>
                        <p className="text-xs text-muted-foreground">Le bien a des points positifs et négatifs</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
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
                <p className="text-xs text-muted-foreground">
                  Ce feedback sera partagé avec votre client pour l'aider dans sa décision
                </p>
              </div>

              {/* Upload de médias */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Photos / Vidéos de la visite
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                    disabled={uploadingMedia}
                    className="flex-1"
                  />
                  {uploadingMedia && (
                    <span className="text-xs text-muted-foreground">Upload...</span>
                  )}
                </div>
                {feedbackMedias.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {feedbackMedias.map((media, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border">
                        {media.type.startsWith('image/') ? (
                          <img src={media.url} alt={media.name} className="w-full h-24 object-cover" />
                        ) : (
                          <div className="w-full h-24 bg-muted flex items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMedia(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                          {media.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Ces médias seront visibles par le client pour l'aider à prendre sa décision
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col xs:flex-row gap-3">
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)} className="w-full xs:w-auto touch-target">
              Annuler
            </Button>
            <Button onClick={handleSaveFeedback} disabled={!feedbackText.trim()} className="w-full xs:w-auto touch-target">
              Enregistrer et notifier le client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de détail de visite */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Détails de la visite
              {selectedVisite?.est_deleguee && (
                <Badge variant="outline">Déléguée</Badge>
              )}
              {selectedVisite?.statut === 'effectuee' && (
                <Badge variant="secondary">Effectuée</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-4">
              {/* Adresse */}
              <div className="p-3 sm:p-4 bg-muted rounded-lg break-words">
                <h4 className="font-semibold text-base sm:text-lg break-words">{selectedVisite.adresse}</h4>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedVisite.date_visite).toLocaleDateString('fr-CH')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(selectedVisite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Client */}
              {selectedVisite.client_profile && (
                <div className="space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedVisite.est_deleguee ? 'Visite déléguée pour' : 'Client'}
                  </h5>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">
                      {selectedVisite.client_profile.prenom} {selectedVisite.client_profile.nom}
                    </p>
                    {selectedVisite.client_profile.email && (
                      <p className="text-sm text-muted-foreground">{selectedVisite.client_profile.email}</p>
                    )}
                    {selectedVisite.client_profile.telephone && (
                      <p className="text-sm text-muted-foreground">{selectedVisite.client_profile.telephone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Détails de l'offre */}
              {selectedVisite.offres && (
                <div className="space-y-2">
                  <h5 className="font-medium">📋 Détails du bien</h5>
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Pièces:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.pieces}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Surface:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.surface}m²</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prix:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.prix} CHF/mois</span>
                      </div>
                    </div>
                    {selectedVisite.offres.etage && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Étage:</span>
                        <span className="ml-1">{selectedVisite.offres.etage}</span>
                      </p>
                    )}
                    {selectedVisite.offres.disponibilite && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Disponibilité:</span>
                        <span className="ml-1">{selectedVisite.offres.disponibilite}</span>
                      </p>
                    )}
                    {selectedVisite.offres.description && (
                      <p className="text-sm text-muted-foreground mt-2">{selectedVisite.offres.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes du client (pour visites déléguées) */}
              {selectedVisite.notes && (
                <div className="space-y-2">
                  <h5 className="font-medium">💬 Notes du client</h5>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm">{selectedVisite.notes}</p>
                  </div>
                </div>
              )}

              {/* Feedback agent (si visite effectuée) */}
              {selectedVisite.statut === 'effectuee' && selectedVisite.feedback_agent && (
                <div className="space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    📝 Mon feedback
                    {selectedVisite.recommandation_agent && getRecommandationBadge(selectedVisite.recommandation_agent)}
                  </h5>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedVisite.feedback_agent}</p>
                  </div>
                </div>
              )}

              {/* Infos pratiques */}
              {selectedVisite.offres && (selectedVisite.offres.code_immeuble || selectedVisite.offres.concierge_nom || selectedVisite.offres.locataire_nom) && (
                <div className="space-y-2">
                  <h5 className="font-medium">🔑 Informations pratiques</h5>
                  <div className="p-3 border rounded-lg space-y-2 text-sm">
                    {selectedVisite.offres.code_immeuble && (
                      <p>
                        <span className="text-muted-foreground">Code immeuble:</span>
                        <span className="ml-1 font-mono bg-muted px-2 py-0.5 rounded">{selectedVisite.offres.code_immeuble}</span>
                      </p>
                    )}
                    {selectedVisite.offres.concierge_nom && (
                      <p>
                        <span className="text-muted-foreground">Concierge:</span>
                        <span className="ml-1">{selectedVisite.offres.concierge_nom}</span>
                        {selectedVisite.offres.concierge_tel && <span className="ml-1">({selectedVisite.offres.concierge_tel})</span>}
                      </p>
                    )}
                    {selectedVisite.offres.locataire_nom && (
                      <p>
                        <span className="text-muted-foreground">Locataire actuel:</span>
                        <span className="ml-1">{selectedVisite.offres.locataire_nom}</span>
                        {selectedVisite.offres.locataire_tel && <span className="ml-1">({selectedVisite.offres.locataire_tel})</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col xs:flex-row gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full xs:w-auto touch-target text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette visite ?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div>
                      {selectedVisite?.candidature?.statut === 'cles_remises' || selectedVisite?.candidature?.cles_remises ? (
                        <>
                          <span className="flex items-center gap-2 text-destructive font-medium mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            Cette visite est liée à une candidature terminée (clés remises).
                          </span>
                          <p>Voulez-vous aussi supprimer la transaction associée et réinitialiser le workflow de la candidature ?</p>
                        </>
                      ) : (
                        <p>Cette action supprimera la visite à {selectedVisite?.adresse}. Cette action est irréversible.</p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={selectedVisite?.candidature?.statut === 'cles_remises' || selectedVisite?.candidature?.cles_remises ? "flex-col sm:flex-row gap-2" : ""}>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  {selectedVisite?.candidature?.statut === 'cles_remises' || selectedVisite?.candidature?.cles_remises ? (
                    <>
                      <AlertDialogAction
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        onClick={() => selectedVisite && handleDeleteVisite(selectedVisite.id, false)}
                      >
                        Visite seule
                      </AlertDialogAction>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => selectedVisite && handleDeleteVisite(selectedVisite.id, true)}
                      >
                        Tout supprimer
                      </AlertDialogAction>
                    </>
                  ) : (
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => selectedVisite && handleDeleteVisite(selectedVisite.id, false)}
                    >
                      Supprimer
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} className="w-full xs:w-auto touch-target">
              Fermer
            </Button>
            {selectedVisite?.statut === 'planifiee' && !selectedVisite?.est_deleguee && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                handleMarquerEffectuee(selectedVisite);
              }} className="w-full xs:w-auto touch-target">
                Marquer effectuée
              </Button>
            )}
            {selectedVisite?.statut === 'planifiee' && selectedVisite?.est_deleguee && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                handleOpenConfirmDialog(selectedVisite);
              }} className="w-full xs:w-auto touch-target">
                Accepter la demande
              </Button>
            )}
            {selectedVisite?.statut === 'confirmee' && selectedVisite?.est_deleguee && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                handleMarquerEffectuee(selectedVisite);
              }} className="w-full xs:w-auto touch-target">
                Donner mon feedback
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de visite déléguée */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la visite déléguée</DialogTitle>
            <DialogDescription>
              Confirmez la date et l'heure pour cette visite. Un événement sera automatiquement ajouté à votre calendrier.
            </DialogDescription>
          </DialogHeader>

          {selectedVisite && (
              <div className="space-y-4 max-w-full overflow-hidden">
              <div className="p-3 sm:p-4 bg-muted rounded-lg break-words">
                <h4 className="font-semibold break-words">{selectedVisite.adresse}</h4>
                {selectedVisite.client_profile && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    Pour {selectedVisite.client_profile.prenom} {selectedVisite.client_profile.nom}
                  </p>
                )}
                {selectedVisite.offres && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {selectedVisite.offres.pieces} pièces • {selectedVisite.offres.surface}m² • {selectedVisite.offres.prix} CHF/mois
                  </p>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">📅 Date et heure prévues</p>
                <p className="text-lg font-semibold mt-1">
                  {new Date(selectedVisite.date_visite).toLocaleDateString('fr-CH', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })} à {new Date(selectedVisite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                ℹ️ Le client sera automatiquement notifié et la visite sera ajoutée à votre calendrier.
              </p>
            </div>
          )}

          <DialogFooter className="flex-col xs:flex-row gap-3">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} className="w-full xs:w-auto touch-target">
              Annuler
            </Button>
            <Button onClick={handleAcceptDelegatedVisit} className="w-full xs:w-auto touch-target">
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmer la visite
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
    </div>
  );
}