import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MandatV3FormData, LEGAL_CHECKBOXES } from './types';
import { recordCheckpoint } from './useMandateAudit';
import { Loader2 } from 'lucide-react';

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

  const allChecked = LEGAL_CHECKBOXES.every((cb) => data[cb.key as keyof MandatV3FormData] === true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Conditions juridiques</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Lisez attentivement le contrat intégral puis cochez chaque clause.
        </p>
      </div>

      {/* Contract text display */}
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Contrat de mandat de recherche immobilière</h3>
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {contractText}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Legal checkboxes */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">
          Acceptation des clauses ({LEGAL_CHECKBOXES.filter((cb) => data[cb.key as keyof MandatV3FormData] === true).length}/{LEGAL_CHECKBOXES.length})
        </h3>
        {LEGAL_CHECKBOXES.map((cb) => (
          <div key={cb.key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
            <Checkbox
              id={cb.key}
              checked={data[cb.key as keyof MandatV3FormData] as boolean}
              onCheckedChange={(checked) => handleCheckboxChange(cb.key, checked as boolean)}
            />
            <Label htmlFor={cb.key} className="text-sm leading-relaxed cursor-pointer">
              {cb.label}
            </Label>
          </div>
        ))}
      </div>

      {allChecked && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-200">
          ✅ Toutes les clauses ont été acceptées. Vous pouvez passer à la signature.
        </div>
      )}
    </div>
  );
}
