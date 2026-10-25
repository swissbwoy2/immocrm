import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Download, Calendar, Clock, CheckCircle2, User, MapPin, DollarSign, Home, AlertCircle, RefreshCw, Ban, Pause, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DASH_CARD, DashPage, DashPageHeader, DashSection, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { CancellationReasonForm, type CancellationReason } from '@/components/mandat/CancellationReasonForm';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getMandatDates, MANDAT_DURATION_DAYS, REFUND_ELIGIBILITY_DAY } from '@/utils/mandatDates';
import { isMandatCancelled, MANDAT_RENEWAL_ACOMPTE_WARNING } from '@/lib/mandatCancellation';

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
  const [renewConfirmOpen, setRenewConfirmOpen] = useState(false);
  const [refundNotAvailableOpen, setRefundNotAvailableOpen] = useState(false);


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

  const openCancelDialog = () => {
    setReasonDialogOpen(true);
  };

  const handleCancelSubmit = async (reason: CancellationReason) => {
    if (!client) return;
    // Par défaut : simple cancel. Remboursement uniquement dans la fenêtre J80→J90.
    const action = refundEligibleNow ? 'cancel_with_refund' : 'cancel';
    setActionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('mandate-renewal-action', {
        body: { action, client_id: client.id, cancellation_reason: reason },
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

  const { start: mandatStart, end: mandatEnd, daysRemaining, daysSinceSignature, isAutoRenewed } = getMandatDates(client);
  const signatureDate = client?.mandat_date_signature || demandeMandat?.cgv_acceptees_at || demandeMandat?.created_at;
  const signatureData = client?.mandat_signature_data || demandeMandat?.signature_data;
  const hasPdf = !!client?.id;
  const isPaused = !!client?.mandate_paused_at;
  const isInactif = client?.statut === 'inactif';
  const refundWindowOpen = (daysSinceSignature ?? 0) >= REFUND_ELIGIBILITY_DAY && (daysSinceSignature ?? 0) <= MANDAT_DURATION_DAYS;
  const refundWindowClosed = (daysSinceSignature ?? 0) > MANDAT_DURATION_DAYS;
  const refundEligibleNow = refundWindowOpen;
  const hasCancelled = isMandatCancelled(client);
  const inReminderWindow = daysRemaining <= 30 && daysRemaining >= 0 && !isPaused && !isInactif;
  const showRefundRequested = client?.refund_status === 'pending';

  // Auto-ouverture du dialogue remboursement via ?action=refund
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedRefund = useRef(false);
  useEffect(() => {
    if (autoOpenedRefund.current) return;
    if (loading || !client) return;
    if (searchParams.get('action') !== 'refund') return;
    autoOpenedRefund.current = true;
    if (refundEligibleNow && !showRefundRequested) {
      openCancelDialog();
    } else {
      toast({
        title: refundEligibleNow ? 'Demande déjà enregistrée' : 'Pas encore éligible',
        description: refundEligibleNow
          ? 'Votre demande de remboursement est en cours de traitement.'
          : refundWindowClosed
            ? `La fenêtre de remboursement (jours ${REFUND_ELIGIBILITY_DAY} à ${MANDAT_DURATION_DAYS}) est close. Votre mandat s'est renouvelé automatiquement — prochaine fenêtre lors du cycle suivant.`
            : `Le remboursement sera disponible entre le ${REFUND_ELIGIBILITY_DAY}ème et le ${MANDAT_DURATION_DAYS}ème jour (jour actuel : ${daysSinceSignature}).`,
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    setSearchParams(next, { replace: true });
  }, [loading, client, refundEligibleNow, showRefundRequested, daysSinceSignature, searchParams, setSearchParams]);

  if (loading) {
    return (
      <div className="p-4 md:p-8" role="status" aria-label="Chargement du contrat">
        <div className="h-7 w-44 rounded bg-muted/60" />
        <div className="mt-6 h-24 max-w-xl rounded bg-muted/40" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className={`${DASH_CARD} w-full max-w-md p-6 text-center`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <AlertCircle className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Contrat non disponible</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Votre contrat de mandat n'est pas encore disponible. Veuillez contacter votre agent.
          </p>
        </div>
      </div>
    );
  }

  const progressPct = Math.round((90 - daysRemaining) / 90 * 100);
  const daysTone: 'success' | 'warning' | 'danger' = daysRemaining > 30 ? 'success' : daysRemaining > 0 ? 'warning' : 'danger';
  const refundTone: 'success' | 'warning' | 'danger' = refundEligibleNow ? 'success' : refundWindowClosed ? 'danger' : 'warning';

  return (
    <DashPage className="space-y-8">
      <DashPageHeader
        title="Mon contrat de mandat"
        subtitle="Votre mandat de recherche exclusif"
      />

      {/* Status Card */}
      <div className={`${DASH_CARD} p-4 md:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <h2 className="text-base font-semibold text-foreground">Contrat de mandat exclusif</h2>
          </div>
          <DashBadge tone={daysTone}>
            {daysRemaining > 0 ? (
              <>
                <Clock className="mr-1 h-3 w-3" />
                {daysRemaining} jours restants
              </>
            ) : (
              <>
                <AlertCircle className="mr-1 h-3 w-3" />
                Mandat expiré
              </>
            )}
          </DashBadge>
        </div>

        {/* Dates */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Date de début</span>
            </div>
            <p className="text-base font-semibold text-foreground">
              {mandatStart ? format(mandatStart, 'd MMMM yyyy', { locale: fr }) : 'Non définie'}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Date de fin</span>
            </div>
            <p className="text-base font-semibold text-foreground">
              {mandatEnd ? format(mandatEnd, 'd MMMM yyyy', { locale: fr }) : 'Non définie'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression du mandat</span>
            <span className="font-semibold tabular-nums text-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                daysTone === 'success' ? 'bg-emerald-500' : daysTone === 'warning' ? 'bg-amber-500' : 'bg-destructive'
              }`}
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-5 border-t border-border/70 pt-5">
          {hasPdf ? (
            <Button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="w-full rounded-full sm:w-auto"
            >
              {downloading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Télécharger le contrat PDF
            </Button>
          ) : (
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Le PDF du contrat sera disponible prochainement
              </p>
            </div>
          )}
        </div>
      </div>

      {/* === Mandate Management === */}
      {(!isInactif || hasCancelled) && (
        <DashSection title="Gestion de mon mandat">
          <div className={`${DASH_CARD} space-y-4 p-4 md:p-5`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Settings className="h-[18px] w-[18px]" />
              </span>
              <DashBadge tone={refundTone}>
                {refundEligibleNow
                  ? `Éligible au remboursement (J${daysSinceSignature ?? 0}/${MANDAT_DURATION_DAYS})`
                  : refundWindowClosed
                    ? `Fenêtre close — mandat renouvelé (J${daysSinceSignature ?? 0})`
                    : `Non éligible (J${daysSinceSignature ?? 0}/${REFUND_ELIGIBILITY_DAY})`}
              </DashBadge>
            </div>

            {/* Mandat annulé — avertissement acompte */}
            {hasCancelled && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {MANDAT_RENEWAL_ACOMPTE_WARNING}
                </p>
              </div>
            )}

            {/* Paused banner */}
            {isPaused && (
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 sm:flex-row sm:items-start">
                <div className="flex flex-1 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Pause className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">Mandat en pause</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Depuis le {client?.mandate_paused_at ? format(new Date(client.mandate_paused_at), 'd MMMM yyyy', { locale: fr }) : ''}.
                      Aucune relance ne vous est envoyée.
                    </p>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleMandateAction('resume')}
                  disabled={actionLoading === 'resume'}
                >
                  <Play className="mr-1 h-4 w-4" /> Reprendre
                </Button>
              </div>
            )}

            {/* Refund pending banner */}
            {showRefundRequested && (
              <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm">
                <DollarSign className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Remboursement en attente</p>
                  <p className="mt-1 text-muted-foreground">
                    Demande enregistrée le {client?.refund_requested_at ? format(new Date(client.refund_requested_at), 'd MMMM yyyy', { locale: fr }) : ''}.
                    Traitement sous 30 jours après la fin officielle du mandat.
                  </p>
                </div>
              </div>
            )}

            {/* Reminder window banner */}
            {inReminderWindow && (
              <div className={`flex items-start gap-3 rounded-xl p-4 ${refundEligibleNow ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${refundEligibleNow ? 'text-emerald-600' : 'text-amber-600'}`} />
                <div>
                  <p className="font-semibold text-foreground">Votre mandat se termine dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isAutoRenewed ? 'Renouvelé automatiquement' : 'Sans action de votre part, il sera renouvelé automatiquement'} le {mandatEnd ? format(mandatEnd, 'd MMMM yyyy', { locale: fr }) : ''}.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!isPaused && (
              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                {/* Renouveler — only visible in reminder window */}
                {(inReminderWindow || hasCancelled) && (
                  <Button
                    onClick={() => hasCancelled ? setRenewConfirmOpen(true) : handleMandateAction('renew')}
                    disabled={actionLoading === 'renew'}
                    className="w-full rounded-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Renouveler
                  </Button>
                )}

                {!hasCancelled && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (refundEligibleNow) {
                      openCancelDialog();
                    } else {
                      setRefundNotAvailableOpen(true);
                    }
                  }}
                  disabled={actionLoading !== null}
                  className="h-auto min-h-10 w-full whitespace-normal rounded-full"
                >
                  <Ban className="mr-2 h-4 w-4 shrink-0" /> Annuler mon mandat + remboursement
                </Button>

                )}{/* Pause */}

                <Button
                  variant="ghost"
                  onClick={() => handleMandateAction('pause')}
                  disabled={actionLoading !== null}
                  className="w-full rounded-full sm:col-span-2"
                >
                  <Pause className="mr-2 h-4 w-4" /> Mettre en pause
                </Button>
              </div>
            )}
          </div>
        </DashSection>
      )}

      {/* Cancel reason dialog */}
      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {refundEligibleNow ? 'Annuler + Demander mon remboursement' : 'Annuler mon mandat'}
            </DialogTitle>
            <DialogDescription>
              Aidez-nous à comprendre votre choix. Cette information est confidentielle.
            </DialogDescription>
          </DialogHeader>
          <CancellationReasonForm
            withRefund={refundEligibleNow}
            daysSinceSignature={daysSinceSignature ?? 0}
            loading={actionLoading !== null}
            onSubmit={handleCancelSubmit}
            onCancel={() => setReasonDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Renew confirmation dialog (mandat annulé) */}
      <Dialog open={renewConfirmOpen} onOpenChange={setRenewConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renouveler mon mandat</DialogTitle>
            <DialogDescription>
              Merci de confirmer le renouvellement de votre mandat de recherche.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {MANDAT_RENEWAL_ACOMPTE_WARNING}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setRenewConfirmOpen(false)} disabled={actionLoading !== null}>
              Retour
            </Button>
            <Button
              className="h-auto min-h-10 flex-1 whitespace-normal rounded-full"
              disabled={actionLoading !== null}
              onClick={async () => {
                await handleMandateAction('renew');
                setRenewConfirmOpen(false);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4 shrink-0" /> Confirmer le renouvellement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund not yet available dialog */}
      <Dialog open={refundNotAvailableOpen} onOpenChange={setRefundNotAvailableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remboursement pas encore disponible</DialogTitle>
            <DialogDescription>
              Votre mandat est actif depuis {daysSinceSignature ?? 0} jours. Vous ne pouvez pas encore demander un remboursement — revenez à partir du 80e jour, ou annulez votre mandat sans remboursement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setRefundNotAvailableOpen(false)}
              disabled={actionLoading !== null}
            >
              Continuer
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-full"
              onClick={() => {
                setRefundNotAvailableOpen(false);
                openCancelDialog();
              }}
              disabled={actionLoading !== null}
            >
              <Ban className="mr-2 h-4 w-4" /> Annuler sans remboursement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DashSection title="Détails du contrat">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Search Criteria */}
          <div className={`${DASH_CARD} p-4 md:p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Home className="h-[18px] w-[18px]" />
              </span>
              <h3 className="text-base font-semibold text-foreground">Critères de recherche</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Type de recherche</p>
                  <p className="text-sm font-medium text-foreground">{client.type_recherche || 'Non défini'}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Type de bien</p>
                  <p className="text-sm font-medium text-foreground">{client.type_bien || 'Non défini'}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Nombre de pièces</p>
                  <p className="text-sm font-medium text-foreground">{client.pieces ? `${client.pieces} pièces` : 'Non défini'}</p>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Budget maximum</p>
                  <p className="text-sm font-medium text-foreground">
                    {client.budget_max ? `${client.budget_max.toLocaleString('fr-CH')} CHF` : 'Non défini'}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Région de recherche</p>
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {client.region_recherche || 'Non définie'}
                </p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className={`${DASH_CARD} p-4 md:p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-[18px] w-[18px]" />
              </span>
              <h3 className="text-base font-semibold text-foreground">Signature électronique</h3>
            </div>
            <div className="space-y-3">
              {signatureData ? (
                <>
                  {/* Fond blanc conservé : la signature est tracée à l'encre sombre sur fond transparent. */}
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-white p-4">
                    <img
                      src={signatureData}
                      alt="Signature"
                      className="max-h-24 object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
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
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <AlertCircle className="h-6 w-6" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Aucune signature enregistrée
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Info */}
        {profile && (
          <div className={`${DASH_CARD} p-4 md:p-5`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-[18px] w-[18px]" />
              </span>
              <h3 className="text-base font-semibold text-foreground">Titulaire du contrat</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/70 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Nom complet</p>
                <p className="text-sm font-medium text-foreground">{profile.prenom} {profile.nom}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-border/70 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Email</p>
                <p className="truncate text-sm font-medium text-foreground">{profile.email}</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Téléphone</p>
                <p className="text-sm font-medium text-foreground">{profile.telephone || 'Non renseigné'}</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="mb-1 text-xs text-muted-foreground">N° de client</p>
                <p className="font-mono text-xs font-medium text-foreground">{client.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>
        )}
      </DashSection>
    </DashPage>
  );
}
