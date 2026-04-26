import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Status = 'idle' | 'confirming' | 'processing' | 'success' | 'already_used' | 'error';

export default function MandatRenouvellement() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const action = params.get('action') as 'renew' | 'cancel' | null;

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [previousAction, setPreviousAction] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !action || !['renew', 'cancel'].includes(action)) {
      setStatus('error');
      setErrorMsg('Lien invalide.');
    } else {
      setStatus('confirming');
    }
  }, [token, action]);

  const handleConfirm = async () => {
    if (!token || !action) return;
    setStatus('processing');
    try {
      const { data, error } = await supabase.functions.invoke('mandate-renewal-action', {
        body: { token, action },
      });
      if (error) throw error;
      if (data?.already_used) {
        setPreviousAction(data.previous_action ?? null);
        setStatus('already_used');
        return;
      }
      if (data?.ok) {
        setStatus('success');
      } else {
        throw new Error(data?.error ?? 'Erreur inconnue');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  };

  const isRenew = action === 'renew';
  const Icon = isRenew ? RefreshCw : Ban;
  const accentColor = isRenew ? 'text-primary' : 'text-destructive';

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
            {status === 'success' && (isRenew ? 'Mandat renouvelé !' : 'Recherche annulée')}
            {status === 'already_used' && 'Lien déjà utilisé'}
            {status === 'error' && 'Erreur'}
            {status === 'processing' && 'Traitement en cours…'}
            {status === 'confirming' && (isRenew ? 'Renouveler mon mandat' : 'Annuler ma recherche')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === 'confirming' && (
            <>
              <p className="text-sm text-muted-foreground">
                {isRenew
                  ? 'Confirmez-vous le renouvellement de votre mandat de recherche pour 90 jours supplémentaires ?'
                  : 'Confirmez-vous l\'annulation de votre mandat de recherche immobilière ? Vous pouvez nous recontacter à tout moment.'}
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
                  Retour
                </Button>
                <Button
                  className="flex-1"
                  variant={isRenew ? 'default' : 'destructive'}
                  onClick={handleConfirm}
                >
                  Confirmer
                </Button>
              </div>
            </>
          )}
          {status === 'success' && (
            <>
              <p className="text-sm text-muted-foreground">
                {isRenew
                  ? 'Votre mandat est actif pour 90 jours supplémentaires. Nous continuons les recherches !'
                  : 'Votre recherche a bien été annulée. Merci de nous avoir fait confiance.'}
              </p>
              <Button className="w-full" onClick={() => navigate('/client/mon-contrat')}>
                Accéder à mon espace
              </Button>
            </>
          )}
          {status === 'already_used' && (
            <>
              <p className="text-sm text-muted-foreground">
                Ce lien a déjà été utilisé{previousAction ? ` (${previousAction === 'renewed' ? 'renouvellement' : 'annulation'})` : ''}.
              </p>
              <Button className="w-full" onClick={() => navigate('/client/mon-contrat')}>
                Accéder à mon espace
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </>
          )}
          {status === 'processing' && (
            <p className="text-sm text-muted-foreground">Veuillez patienter…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
