import { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Clock, CheckCircle2, User, MapPin, DollarSign, Home, Sparkles, AlertCircle, RefreshCw, Ban, Pause, Play, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { CancellationReasonForm, type CancellationReason } from '@/components/mandat/CancellationReasonForm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MANDAT_DURATION_DAYS = 90;
const REFUND_ELIGIBILITY_DAY = 82;

interface ClientData {
  id: string;
  user_id: string;
  mandat_pdf_url: string | null;
  mandat_signature_data: string | null;
  mandat_date_signature: string | null;
  demande_mandat_id: string | null;
  date_ajout: string | null;
  budget_max: number | null;
  type_recherche: string | null;
  type_bien: string | null;
  pieces: number | null;
  region_recherche: string | null;
  created_at: string | null;
  statut: string | null;
  cancellation_reason: string | null;
  refund_eligible: boolean | null;
  refund_status: string | null;
  refund_requested_at: string | null;
  mandate_paused_at: string | null;
  mandate_pause_days: number | null;
  mandate_official_end_date: string | null;
}

interface ProfileData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
}

interface DemandeMandat {
  id: string;
  signature_data: string | null;
  cgv_acceptees_at: string | null;
  created_at: string | null;
}

export default function MonContrat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [demandeMandat, setDemandeMandat] = useState<DemandeMandat | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientError) throw clientError;
      setClient(clientData);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nom, prenom, email, telephone')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // If client has demande_mandat_id, load the original demande
      if (clientData?.demande_mandat_id) {
        const { data: demandeData, error: demandeError } = await supabase
          .from('demandes_mandat')
          .select('id, signature_data, cgv_acceptees_at, created_at')
          .eq('id', clientData.demande_mandat_id)
          .single();

        if (!demandeError && demandeData) {
          setDemandeMandat(demandeData);
        }
      }
    } catch (error) {
      console.error('Error loading contract data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du contrat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!client?.id) {
      toast({
        title: 'Contrat non disponible',
        description: 'Votre contrat n\'est pas encore disponible',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(true);
    try {
      // Toujours régénérer le mandat COMPLET (texte juridique intégral),
      // au lieu de télécharger un éventuel ancien PDF "résumé" stocké.
      const { data, error } = await supabase.functions.invoke('generate-full-mandat-pdf', {
        body: { client_id: client.id },
      });

      if (error) throw error;
      if (!data?.pdf_base64) throw new Error('Aucun PDF retourné');

      const bytes = Uint8Array.from(atob(data.pdf_base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || `Mandat_Complet_${profile?.nom || 'client'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Téléchargement réussi',
        description: 'Votre mandat complet a été téléchargé',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le contrat complet',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  // Mandate management state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'cancel' | 'cancel_with_refund' | null>(null);

  const handleMandateAction = async (action: 'renew' | 'pause' | 'resume', extra: Record<string, unknown> = {}) => {
    if (!client) return;
    setActionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('mandate-renewal-action', {
        body: { action, client_id: client.id, ...extra },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Erreur');
      toast({ title: 'Action effectuée', description: 'Votre mandat a été mis à jour.' });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message ?? 'Action impossible', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const openCancelDialog = (withRefund: boolean) => {
    setPendingAction(withRefund ? 'cancel_with_refund' : 'cancel');
    setReasonDialogOpen(true);
  };

  const handleCancelSubmit = async (reason: CancellationReason) => {
    if (!client || !pendingAction) return;
    setActionLoading(pendingAction);
    try {
      const { data, error } = await supabase.functions.invoke('mandate-renewal-action', {
        body: { action: pendingAction, client_id: client.id, cancellation_reason: reason },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Erreur');
      toast({ title: 'Mandat annulé', description: data?.refund_eligible ? 'Votre demande de remboursement a été enregistrée.' : 'Votre mandat a été annulé.' });
      setReasonDialogOpen(false);
      await loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message ?? 'Action impossible', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate mandate dates (uses real signature date when available + pause days)
  const getMandatDates = () => {
    const startDate = client?.mandat_date_signature || client?.date_ajout || client?.created_at;
    if (!startDate) return { start: null, end: null, daysRemaining: 0, daysSinceSignature: 0 };

    const start = new Date(startDate);
    const pauseDays = client?.mandate_pause_days ?? 0;
    const end = new Date(start);
    end.setDate(end.getDate() + MANDAT_DURATION_DAYS + pauseDays);

    const now = new Date();
    const rawDaysSince = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceSignature = Math.max(0, rawDaysSince - pauseDays);
    const daysRemaining = Math.max(0, MANDAT_DURATION_DAYS - daysSinceSignature);

    return { start, end, daysRemaining, daysSinceSignature };
  };

  const { start: mandatStart, end: mandatEnd, daysRemaining, daysSinceSignature } = getMandatDates();
  const signatureDate = client?.mandat_date_signature || demandeMandat?.cgv_acceptees_at || demandeMandat?.created_at;
  const signatureData = client?.mandat_signature_data || demandeMandat?.signature_data;
  const hasPdf = !!client?.id;
  const isPaused = !!client?.mandate_paused_at;
  const isInactif = client?.statut === 'inactif';
  const refundEligibleNow = (daysSinceSignature ?? 0) >= REFUND_ELIGIBILITY_DAY;
  const inReminderWindow = daysRemaining <= 30 && daysRemaining >= 0 && !isPaused && !isInactif;
  const showRefundRequested = client?.refund_status === 'pending';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">Chargement du contrat...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Contrat non disponible</h2>
            <p className="text-muted-foreground">
              Votre contrat de mandat n'est pas encore disponible. Veuillez contacter votre agent.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/10 animate-float"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${5 + i}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 md:p-8 space-y-6">
        {/* Header */}
        <PremiumPageHeader
          title="Mon contrat de mandat"
          subtitle="Votre mandat de recherche exclusif"
          icon={FileText}
          className="mb-6"
        />

        {/* Status Card */}
        <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                Contrat de mandat exclusif
              </CardTitle>
              <Badge 
                className={`${
                  daysRemaining > 30 
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' 
                    : daysRemaining > 0 
                    ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' 
                    : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                } backdrop-blur-sm`}
              >
                {daysRemaining > 0 ? (
                  <>
                    <Clock className="w-3 h-3 mr-1" />
                    {daysRemaining} jours restants
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Mandat expiré
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Date de début</span>
                </div>
                <p className="font-semibold text-lg">
                  {mandatStart ? format(mandatStart, 'd MMMM yyyy', { locale: fr }) : 'Non définie'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Date de fin</span>
                </div>
                <p className="font-semibold text-lg">
                  {mandatEnd ? format(mandatEnd, 'd MMMM yyyy', { locale: fr }) : 'Non définie'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progression du mandat</span>
                <span className="font-medium">{Math.round((90 - daysRemaining) / 90 * 100)}%</span>
              </div>
              <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    daysRemaining > 30 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                      : daysRemaining > 0 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-400' 
                      : 'bg-gradient-to-r from-red-500 to-rose-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((90 - daysRemaining) / 90 * 100))}%` }}
                />
              </div>
            </div>

            <Separator />

            {/* Download Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              {hasPdf ? (
                <Button 
                  onClick={handleDownloadPDF} 
                  disabled={downloading}
                  className="flex-1 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {downloading ? (
                    <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Télécharger le contrat PDF
                </Button>
              ) : (
                <div className="flex-1 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center">
                  <AlertCircle className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Le PDF du contrat sera disponible prochainement
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* === Mandate Management Card === */}
        {!isInactif && (
          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  Gestion de mon mandat
                </CardTitle>
                <Badge
                  className={refundEligibleNow
                    ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
                    : 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30'}
                >
                  {refundEligibleNow
                    ? '🟢 Éligible au remboursement'
                    : `🔴 Non éligible (J${daysSinceSignature ?? 0}/${REFUND_ELIGIBILITY_DAY})`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Paused banner */}
              {isPaused && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-3">
                    <Pause className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-700 dark:text-blue-400">Mandat en pause</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Depuis le {client?.mandate_paused_at ? format(new Date(client.mandate_paused_at), 'd MMMM yyyy', { locale: fr }) : ''}.
                        Aucune relance ne vous est envoyée.
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleMandateAction('resume')}
                      disabled={actionLoading === 'resume'}
                    >
                      <Play className="w-4 h-4 mr-1" /> Reprendre
                    </Button>
                  </div>
                </div>
              )}

              {/* Refund pending banner */}
              {showRefundRequested && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-sm">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">Remboursement en attente</p>
                      <p className="text-muted-foreground mt-1">
                        Demande enregistrée le {client?.refund_requested_at ? format(new Date(client.refund_requested_at), 'd MMMM yyyy', { locale: fr }) : ''}.
                        Traitement sous 30 jours après la fin officielle du mandat.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reminder window banner */}
              {inReminderWindow && (
                <div className={`p-4 rounded-xl border ${
                  refundEligibleNow
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-orange-500/10 border-orange-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-5 h-5 mt-0.5 ${refundEligibleNow ? 'text-green-600' : 'text-orange-600'}`} />
                    <div>
                      <p className="font-semibold">Votre mandat se termine dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sans action de votre part, il sera renouvelé automatiquement le {mandatEnd ? format(mandatEnd, 'd MMMM yyyy', { locale: fr }) : ''}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!isPaused && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Renouveler — only visible in reminder window */}
                  {inReminderWindow && (
                    <Button
                      onClick={() => handleMandateAction('renew')}
                      disabled={actionLoading === 'renew'}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Renouveler
                    </Button>
                  )}

                  {/* Annuler simple — masqué après J82 */}
                  {!refundEligibleNow && (
                    <Button
                      variant="outline"
                      onClick={() => openCancelDialog(false)}
                      disabled={actionLoading !== null}
                      className="w-full"
                    >
                      <Ban className="w-4 h-4 mr-2" /> Annuler mon mandat
                    </Button>
                  )}

                  {/* Annuler + Remboursement — visible toujours, désactivé avant J82 */}
                  <Button
                    variant={refundEligibleNow ? 'default' : 'outline'}
                    onClick={() => openCancelDialog(true)}
                    disabled={!refundEligibleNow || actionLoading !== null}
                    className="w-full"
                    title={!refundEligibleNow ? `Disponible à partir du ${REFUND_ELIGIBILITY_DAY}ème jour` : undefined}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Annuler + Remboursement
                  </Button>

                  {/* Pause */}
                  <Button
                    variant="ghost"
                    onClick={() => handleMandateAction('pause')}
                    disabled={actionLoading !== null}
                    className="w-full sm:col-span-2"
                  >
                    <Pause className="w-4 h-4 mr-2" /> Mettre en pause
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancel reason dialog */}
        <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {pendingAction === 'cancel_with_refund' ? 'Annuler + Demander mon remboursement' : 'Annuler mon mandat'}
              </DialogTitle>
              <DialogDescription>
                Aidez-nous à comprendre votre choix. Cette information est confidentielle.
              </DialogDescription>
            </DialogHeader>
            <CancellationReasonForm
              withRefund={pendingAction === 'cancel_with_refund'}
              daysSinceSignature={daysSinceSignature ?? 0}
              loading={actionLoading !== null}
              onSubmit={handleCancelSubmit}
              onCancel={() => setReasonDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Criteria */}
          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Home className="w-5 h-5 text-blue-500" />
                </div>
                Critères de recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Type de recherche</p>
                  <p className="font-medium">{client.type_recherche || 'Non défini'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Type de bien</p>
                  <p className="font-medium">{client.type_bien || 'Non défini'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Nombre de pièces</p>
                  <p className="font-medium">{client.pieces ? `${client.pieces} pièces` : 'Non défini'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Budget maximum</p>
                  <p className="font-medium">
                    {client.budget_max ? `${client.budget_max.toLocaleString('fr-CH')} CHF` : 'Non défini'}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                <p className="text-xs text-muted-foreground mb-1">Région de recherche</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {client.region_recherche || 'Non définie'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                Signature électronique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {signatureData ? (
                <>
                  <div className="p-4 bg-white rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center">
                    <img 
                      src={signatureData} 
                      alt="Signature" 
                      className="max-h-24 object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Contrat signé électroniquement</span>
                  </div>
                  {signatureDate && (
                    <p className="text-sm text-muted-foreground">
                      Signé le {format(new Date(signatureDate), 'd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  )}
                </>
              ) : (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Aucune signature enregistrée
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client Info */}
        {profile && (
          <Card className="backdrop-blur-xl bg-card/80 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <User className="w-5 h-5 text-purple-500" />
                </div>
                Titulaire du contrat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Nom complet</p>
                  <p className="font-medium">{profile.prenom} {profile.nom}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-medium truncate">{profile.email}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Téléphone</p>
                  <p className="font-medium">{profile.telephone || 'Non renseigné'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">N° de client</p>
                  <p className="font-medium text-xs font-mono">{client.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
