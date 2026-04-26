import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, Ban, DollarSign, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CancellationReasonForm, type CancellationReason } from '@/components/mandat/CancellationReasonForm';

type Action = 'renew' | 'cancel' | 'cancel_with_refund' | 'pause';
type Status = 'idle' | 'confirming' | 'reason_form' | 'processing' | 'success' | 'already_used' | 'error';

export default function MandatRenouvellement() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const action = params.get('action') as Action | null;

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [previousAction, setPreviousAction] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{ refund_eligible?: boolean; days_since_signature?: number } | null>(null);

  useEffect(() => {
    if (!token || !action || !['renew', 'cancel', 'cancel_with_refund', 'pause'].includes(action)) {
      setStatus('error');
      setErrorMsg('Lien invalide.');
    } else {
      setStatus('confirming');
    }
  }, [token, action]);

  const submit = async (extraBody: Record<string, unknown> = {}) => {
    if (!token || !action) return;
    setStatus('processing');
    try {
      const { data, error } = await supabase.functions.invoke('mandate-renewal-action', {
        body: { token, action, ...extraBody },
      });
      if (error) throw error;
      if (data?.already_used) {
        setPreviousAction(data.previous_action ?? null);
        setStatus('already_used');
        return;
      }
      if (data?.ok) {
        setResultData(data);
        setStatus('success');
      } else {
        throw new Error(data?.error ?? 'Erreur inconnue');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message ?? 'Une erreur est survenue.');
    }
  };

  const handleConfirm = () => {
    if (action === 'cancel' || action === 'cancel_with_refund') {
      setStatus('reason_form');
    } else {
      submit();
    }
  };

  const handleReasonSubmit = (reason: CancellationReason) => {
    submit({ cancellation_reason: reason });
  };

  const Icon = action === 'renew' ? RefreshCw
    : action === 'cancel_with_refund' ? DollarSign
    : action === 'pause' ? Pause
    : Ban;
  const accentColor = action === 'renew' ? 'text-primary'
    : action === 'cancel_with_refund' ? 'text-green-600'
    : action === 'pause' ? 'text-blue-600'
    : 'text-destructive';

  const titleConfirming = action === 'renew' ? 'Renouveler mon mandat'
    : action === 'cancel_with_refund' ? 'Annuler + Demander mon remboursement'
    : action === 'pause' ? 'Mettre mon mandat en pause'
    : 'Annuler ma recherche';

  const descConfirming = action === 'renew'
    ? 'Confirmez-vous le renouvellement de votre mandat de recherche pour 90 jours supplémentaires ?'
    : action === 'cancel_with_refund'
      ? 'Vous êtes sur le point de demander votre remboursement et d\'annuler votre mandat. Vous continuerez de recevoir des offres jusqu\'au 90ème jour. Le remboursement sera traité sous 30 jours après cette date.'
      : action === 'pause'
        ? 'Votre mandat sera mis en pause : aucune relance ne vous sera envoyée. Vous pourrez le reprendre à tout moment depuis votre espace.'
        : 'Confirmez-vous l\'annulation de votre mandat de recherche immobilière ?';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/30">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center bg-muted ${accentColor}`}>
            {status === 'processing' ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : status === 'success' ? (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            ) : status === 'error' ? (
              <XCircle className="w-8 h-8 text-destructive" />
            ) : status === 'already_used' ? (
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            ) : (
              <Icon className="w-8 h-8" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'success' && (action === 'renew' ? 'Mandat renouvelé !'
              : action === 'pause' ? 'Mandat en pause'
              : resultData?.refund_eligible ? 'Remboursement demandé' : 'Recherche annulée')}
            {status === 'already_used' && 'Lien déjà utilisé'}
            {status === 'error' && 'Erreur'}
            {status === 'processing' && 'Traitement en cours…'}
            {(status === 'confirming' || status === 'reason_form') && titleConfirming}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'confirming' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">{descConfirming}</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>Retour</Button>
                <Button
                  className="flex-1"
                  variant={action === 'renew' || action === 'pause' ? 'default' : 'destructive'}
                  onClick={handleConfirm}
                >
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {status === 'reason_form' && (
            <CancellationReasonForm
              withRefund={action === 'cancel_with_refund'}
              daysSinceSignature={0}
              onSubmit={handleReasonSubmit}
              onCancel={() => setStatus('confirming')}
            />
          )}

          {status === 'success' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {action === 'renew'
                  ? 'Votre mandat est actif pour 90 jours supplémentaires. Nous continuons les recherches !'
                  : action === 'pause'
                  ? 'Votre mandat est en pause. Vous pouvez le reprendre à tout moment depuis votre espace.'
                  : resultData?.refund_eligible
                    ? 'Vous avez demandé votre remboursement et annulé votre mandat. Il se terminera officiellement dans 30 jours. Vous recevrez des offres jusqu\'au 90ème jour. Votre remboursement sera traité à partir du 90ème jour sous un délai de 30 jours.'
                    : 'Votre recherche a bien été annulée. Merci de nous avoir fait confiance.'}
              </p>
              <Button className="w-full" onClick={() => navigate('/client/mon-contrat')}>
                Accéder à mon espace
              </Button>
            </div>
          )}

          {status === 'already_used' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ce lien a déjà été utilisé{previousAction ? ` (${previousAction})` : ''}.
              </p>
              <Button className="w-full" onClick={() => navigate('/client/mon-contrat')}>
                Accéder à mon espace
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </div>
          )}

          {status === 'processing' && (
            <p className="text-sm text-muted-foreground text-center">Veuillez patienter…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
