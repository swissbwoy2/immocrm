import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'idle' | 'success' | 'error'>('validating');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMessage('Lien de désinscription invalide ou expiré.');
      return;
    }

    const validate = async () => {
      try {
        const response = await fetch(
          `${VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          {
            headers: {
              apikey: VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setStatus('invalid');
          setErrorMessage(data.error || 'Ce lien de désinscription est invalide ou a déjà été utilisé.');
          return;
        }

        setStatus('valid');
      } catch (e) {
        console.error('Unsubscribe validation error:', e);
        setStatus('invalid');
        setErrorMessage('Impossible de vérifier ce lien. Veuillez réessayer plus tard.');
      }
    };

    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });

      if (error || data?.success === false || data?.reason === 'already_unsubscribed') {
        if (data?.reason === 'already_unsubscribed') {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(error?.message || 'La désinscription a échoué.');
        }
        return;
      }

      setStatus('success');
    } catch (e) {
      console.error('Unsubscribe error:', e);
      setStatus('error');
      setErrorMessage('Une erreur est survenue lors de la désinscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#E8F6F3] flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-[#2A9D8F]" />
          </div>
          <CardTitle className="text-xl font-bold text-[#0F172A]">
            Gestion des emails
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'validating' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#2A9D8F]" />
              <p className="text-sm text-muted-foreground">Vérification du lien en cours...</p>
            </div>
          )}

          {status === 'valid' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vous êtes sur le point de vous désinscrire de nos emails. Vous pouvez toujours revenir sur cette décision en contactant le support.
              </p>
              <Button
                onClick={handleUnsubscribe}
                disabled={isSubmitting}
                className="w-full bg-[#2A9D8F] hover:bg-[#218678] text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirmer la désinscription
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-10 h-10 text-[#2A9D8F]" />
              <p className="text-sm font-medium text-[#0F172A]">
                Vous êtes désinscrit(e) avec succès.
              </p>
              <p className="text-xs text-muted-foreground">
                Vous ne recevrez plus d'emails de notre part sur cette adresse.
              </p>
            </div>
          )}

          {(status === 'invalid' || status === 'error') && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="w-10 h-10 text-red-500" />
              <p className="text-sm font-medium text-[#0F172A]">
                {status === 'invalid' ? 'Lien invalide' : 'Erreur'}
              </p>
              <p className="text-xs text-muted-foreground">{errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
