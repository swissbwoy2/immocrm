import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LEGAL_CHECKBOXES } from '@/components/mandat-v3/types';
import { MandatFormData } from './types';
import { Loader2, CheckCircle2, FileText } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatLegalConsents({ data, onChange }: Props) {
  const [contractText, setContractText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      const { data: ct } = await supabase
        .from('mandate_contract_texts' as any)
        .select('content')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setContractText((ct as any)?.content || '');
      setLoading(false);
    };
    fetchContract();
  }, []);

  const checkedCount = LEGAL_CHECKBOXES.filter(
    (cb) => (data as any)[cb.key] === true
  ).length;
  const allChecked = checkedCount === LEGAL_CHECKBOXES.length;

  const handleChange = (key: string, checked: boolean) => {
    const at = { ...(data.legal_consents_at || {}) };
    if (checked) at[key] = new Date().toISOString();
    else delete at[key];

    const nextCount = LEGAL_CHECKBOXES.filter((cb) =>
      cb.key === key ? checked : (data as any)[cb.key] === true
    ).length;

    onChange({
      [key]: checked,
      legal_consents_at: at,
      cgv_acceptees: nextCount === LEGAL_CHECKBOXES.length,
    } as Partial<MandatFormData>);
  };

  return (
    <div className="space-y-4">
      {/* Contrat de mandat (source active en base) */}
      <div className="rounded-xl border border-border overflow-hidden bg-muted/40">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <FileText size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Contrat de mandat de recherche immobilière
          </h3>
        </div>
        <ScrollArea className="h-[260px] sm:h-[340px]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {contractText}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 12 consentements */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Consentements ({checkedCount}/{LEGAL_CHECKBOXES.length})
        </h3>

        {LEGAL_CHECKBOXES.map((cb, index) => {
          const checked = (data as any)[cb.key] === true;
          return (
            <div
              key={cb.key}
              className={`rounded-xl border p-3 sm:p-4 transition-colors ${
                checked
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-border bg-muted/40'
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                <h4 className="text-sm font-semibold text-foreground">{cb.title}</h4>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {cb.question}
              </p>
              {cb.note && (
                <p className="text-[11px] text-muted-foreground mt-1 italic">{cb.note}</p>
              )}
              {cb.linkHref && (
                <a
                  href={cb.linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-primary underline mt-1.5"
                >
                  {cb.linkLabel}
                </a>
              )}
              <div className="mt-3 flex items-start gap-3">
                <Checkbox
                  id={`mandat-${cb.key}`}
                  checked={checked}
                  onCheckedChange={(v) => handleChange(cb.key, v as boolean)}
                  className="mt-0.5 min-w-[20px] min-h-[20px]"
                />
                <Label
                  htmlFor={`mandat-${cb.key}`}
                  className="text-xs sm:text-sm font-medium leading-relaxed cursor-pointer text-foreground"
                >
                  {cb.cta}
                </Label>
              </div>
            </div>
          );
        })}
      </div>

      {allChecked && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700">
            Toutes les dispositions ont été acceptées. Vous pouvez signer votre mandat.
          </p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Questions ? info@immo-rama.ch — +41 21 634 31 61
      </p>
    </div>
  );
}
