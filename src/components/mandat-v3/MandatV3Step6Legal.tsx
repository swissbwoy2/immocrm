import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MandatV3FormData, LEGAL_CHECKBOXES } from './types';
import { recordCheckpoint } from './useMandateAudit';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  data: MandatV3FormData;
  mandateId: string | null;
  onChange: (data: Partial<MandatV3FormData>) => void;
}

export default function MandatV3Step6Legal({ data, mandateId, onChange }: Props) {
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
        .single();
      setContractText((ct as any)?.content || '');
      setLoading(false);
    };
    fetchContract();
  }, []);

  const handleCheckboxChange = async (key: string, checked: boolean) => {
    onChange({ [key]: checked });
    if (checked && mandateId) {
      await recordCheckpoint(mandateId, key);
    }
  };

  const checkedCount = LEGAL_CHECKBOXES.filter((cb) => data[cb.key as keyof MandatV3FormData] === true).length;
  const allChecked = checkedCount === LEGAL_CHECKBOXES.length;

  const handleAcceptAll = async () => {
    const updates: Partial<MandatV3FormData> = {};
    for (const cb of LEGAL_CHECKBOXES) {
      (updates as any)[cb.key] = true;
      if (mandateId) await recordCheckpoint(mandateId, cb.key);
    }
    onChange(updates);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Conditions juridiques</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Lisez attentivement le contrat puis acceptez les clauses.
        </p>
      </div>

      {/* Contract text display */}
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-muted/50 px-3 sm:px-4 py-2.5 border-b">
          <h3 className="font-semibold text-xs sm:text-sm">Contrat de mandat de recherche immobilière</h3>
        </div>
        <ScrollArea className="h-[250px] sm:h-[350px]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-3 sm:p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {contractText}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Legal checkboxes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm sm:text-base text-foreground">
            Clauses ({checkedCount}/{LEGAL_CHECKBOXES.length})
          </h3>
          {!allChecked && (
            <Button type="button" variant="outline" size="sm" onClick={handleAcceptAll} className="text-xs min-h-[36px]">
              Tout accepter
            </Button>
          )}
        </div>

        {LEGAL_CHECKBOXES.map((cb) => (
          <div key={cb.key} className="flex items-start gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-muted/30 transition-colors">
            <Checkbox
              id={cb.key}
              checked={data[cb.key as keyof MandatV3FormData] as boolean}
              onCheckedChange={(checked) => handleCheckboxChange(cb.key, checked as boolean)}
              className="mt-0.5 min-w-[20px] min-h-[20px]"
            />
            <Label htmlFor={cb.key} className="text-xs sm:text-sm leading-relaxed cursor-pointer">
              {cb.label}
            </Label>
          </div>
        ))}
      </div>

      {allChecked && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Toutes les clauses ont été acceptées. Vous pouvez passer à la signature.
        </div>
      )}
    </div>
  );
}
