import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MandatV3FormData, initialMandatV3Data, LEGAL_CHECKBOXES } from '@/components/mandat-v3/types';
import MandatV3Step6Legal from '@/components/mandat-v3/MandatV3Step6Legal';
import MandatV3Step7Signature from '@/components/mandat-v3/MandatV3Step7Signature';

function getEdgeFunctionUrl(name: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/${name}`;
}

export default function MandatV3SignOnly() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<MandatV3FormData>(initialMandatV3Data);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('Lien invalide');
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('mandates')
          .select('*')
          .eq('access_token', token)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setError('Mandat introuvable ou lien expiré');
          setLoading(false);
          return;
        }
        if ((data as any).signed_at) {
          setIsSubmitted(true);
        }
        setMandateId((data as any).id);
        setAccessToken(token);

        const next: MandatV3FormData = { ...initialMandatV3Data };
        Object.keys(initialMandatV3Data).forEach((k) => {
          const v = (data as any)[k];
          if (v !== undefined && v !== null) (next as any)[k] = v;
        });
        // Default state for legal checkboxes — client must re-confirm
        LEGAL_CHECKBOXES.forEach((cb) => { (next as any)[cb.key] = (data as any)[cb.key] ?? false; });
        setFormData(next);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const updateForm = (partial: Partial<MandatV3FormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const saveLegalCheckboxes = async () => {
    const legalData: Record<string, boolean> = {};
    LEGAL_CHECKBOXES.forEach((cb) => {
      legalData[cb.key] = formData[cb.key as keyof MandatV3FormData] as boolean;
    });
    await fetch(getEdgeFunctionUrl('mandate-update-draft'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mandate_id: mandateId, access_token: accessToken,
        action: 'update_legal_checkboxes', data: legalData,
      }),
    });
  };

  const handleSubmitSignature = async () => {
    if (!mandateId || !accessToken || !formData.signature_data) return;
    setIsSubmitting(true);
    try {
      await saveLegalCheckboxes();
      const response = await fetch(getEdgeFunctionUrl('mandate-submit-signature'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandate_id: mandateId, access_token: accessToken,
          signature_data: formData.signature_data, email: formData.email,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la signature');
        return;
      }
      setIsSubmitted(true);
      toast.success('Mandat signé avec succès !');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 text-center">
        <div>
          <h1 className="text-xl font-bold mb-2">Lien invalide</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Signature de votre mandat</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Votre mandat a été pré-rempli par votre agent. Vérifiez, acceptez les clauses et signez.
          </p>
        </div>

        {!isSubmitted && (
          <div className="bg-card rounded-2xl border shadow-sm p-4 sm:p-6 md:p-8 space-y-8">
            <MandatV3Step6Legal data={formData} mandateId={mandateId} onChange={updateForm} />
            <div className="border-t pt-6">
              <MandatV3Step7Signature
                data={formData} mandateId={mandateId} onChange={updateForm}
                onSubmitSignature={handleSubmitSignature}
                isSubmitting={isSubmitting} isSubmitted={isSubmitted}
              />
            </div>
          </div>
        )}

        {isSubmitted && (
          <div className="bg-card rounded-2xl border shadow-sm p-6 sm:p-8">
            <MandatV3Step7Signature
              data={formData} mandateId={mandateId} onChange={updateForm}
              onSubmitSignature={handleSubmitSignature}
              isSubmitting={false} isSubmitted={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
