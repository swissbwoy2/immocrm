import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, FileText, Shield, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Calculates the target month_year string.
 * If day >= 25, it's next month. If day <= 5, it's current month.
 */
function getTargetMonthYear(): string {
  const now = new Date();
  const day = now.getDate();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed

  if (day >= 25) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function isUpdatePeriod(): boolean {
  const day = new Date().getDate();
  return day >= 25 || day <= 5;
}

interface Confirmation {
  id?: string;
  fiches_salaire_ok: boolean;
  poursuites_ok: boolean;
  permis_ok: boolean;
}

export function DocumentUpdateReminder() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>({
    fiches_salaire_ok: false,
    poursuites_ok: false,
    permis_ok: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const monthYear = getTargetMonthYear();
  const showReminder = isUpdatePeriod();

  const allConfirmed = confirmation.fiches_salaire_ok && confirmation.poursuites_ok && confirmation.permis_ok;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get client id
    const { data: clientData } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!clientData) {
      setLoading(false);
      return;
    }
    setClientId(clientData.id);

    // Get existing confirmation for this month
    const { data: confData } = await supabase
      .from('document_update_confirmations')
      .select('*')
      .eq('client_id', clientData.id)
      .eq('month_year', monthYear)
      .maybeSingle();

    if (confData) {
      setConfirmation({
        id: confData.id,
        fiches_salaire_ok: confData.fiches_salaire_ok,
        poursuites_ok: confData.poursuites_ok,
        permis_ok: confData.permis_ok,
      });
    }

    setLoading(false);
  }, [user, monthYear]);

  useEffect(() => {
    if (showReminder) loadData();
    else setLoading(false);
  }, [showReminder, loadData]);

  const handleConfirm = async (field: 'fiches_salaire_ok' | 'poursuites_ok' | 'permis_ok') => {
    if (!clientId || !user) return;
    setSaving(field);

    const newValue = !confirmation[field];
    const updatedConfirmation = { ...confirmation, [field]: newValue };
    const allOk = updatedConfirmation.fiches_salaire_ok && updatedConfirmation.poursuites_ok && updatedConfirmation.permis_ok;

    try {
      if (confirmation.id) {
        // Update existing
        const { error } = await supabase
          .from('document_update_confirmations')
          .update({
            [field]: newValue,
            confirmed_at: allOk ? new Date().toISOString() : null,
          })
          .eq('id', confirmation.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('document_update_confirmations')
          .insert({
            client_id: clientId,
            month_year: monthYear,
            [field]: newValue,
            confirmed_at: allOk ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) updatedConfirmation.id = data.id;
      }

      setConfirmation(updatedConfirmation as Confirmation);

      if (allOk) {
        toast.success('Dossier confirmé à jour ! ✅');
      } else {
        toast.success(newValue ? 'Confirmé ✅' : 'Confirmation retirée');
      }
    } catch (err: any) {
      console.error('Error saving confirmation:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  if (!showReminder || loading) return null;

  const items = [
    {
      key: 'fiches_salaire_ok' as const,
      icon: CreditCard,
      label: '3 dernières fiches de salaire',
      confirmed: confirmation.fiches_salaire_ok,
      buttonLabel: confirmation.fiches_salaire_ok ? 'Fiches de salaire ✅' : 'Confirmer fiches de salaire',
    },
    {
      key: 'poursuites_ok' as const,
      icon: Shield,
      label: 'Extrait de poursuites (validité min. 2-3 mois)',
      confirmed: confirmation.poursuites_ok,
      buttonLabel: confirmation.poursuites_ok ? 'Poursuites valides ✅' : 'Confirmer poursuites',
    },
    {
      key: 'permis_ok' as const,
      icon: FileText,
      label: 'Permis de séjour (vérifier la validité)',
      confirmed: confirmation.permis_ok,
      buttonLabel: confirmation.permis_ok ? 'Permis valide ✅' : 'Confirmer permis',
    },
  ];

  return (
    <div
      className={`rounded-xl border p-4 md:p-5 transition-all duration-300 ${
        allConfirmed
          ? 'border-green-500/30 bg-green-500/10'
          : 'border-amber-500/30 bg-amber-500/10'
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className={`p-2 rounded-full shrink-0 ${allConfirmed ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
          {allConfirmed ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          )}
        </div>
        <div>
          <p className={`font-semibold ${allConfirmed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {allConfirmed ? '✅ Dossier à jour pour ce mois' : '📋 Mettez à jour votre dossier'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {allConfirmed
              ? 'Merci ! Toutes vos confirmations ont été enregistrées.'
              : 'Vérifiez et confirmez la validité de vos documents pour ce mois.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-all ${
              item.confirmed
                ? 'border-green-500/20 bg-green-500/5'
                : 'border-amber-500/20 bg-background/50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <item.icon className={`w-4 h-4 shrink-0 ${item.confirmed ? 'text-green-600' : 'text-amber-600'}`} />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </div>
            <Button
              size="sm"
              variant={item.confirmed ? 'outline' : 'default'}
              className={
                item.confirmed
                  ? 'border-green-500/30 text-green-600 hover:bg-green-500/10 shrink-0'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shrink-0'
              }
              onClick={() => handleConfirm(item.key)}
              disabled={saving === item.key}
            >
              {saving === item.key ? '...' : item.buttonLabel}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
