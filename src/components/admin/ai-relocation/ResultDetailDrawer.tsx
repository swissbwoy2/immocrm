import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import {
  DETAIL_SHEET, DetailHeader, DetailBody, KeyFacts, DetailSection, DetailRow, DetailText, DetailContact, DetailActions, chfDetail,
} from '@/components/details/DetailPrimitives';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { ExternalLink, Home, Maximize, Layers, User } from 'lucide-react';

interface Props {
  result: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResultDetailDrawer({ result, open, onOpenChange }: Props) {
  const { data: scores, isLoading } = useQuery({
    queryKey: ['result-scores', result?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_result_scores')
        .select('*')
        .eq('property_result_id', result.id);
      if (error) throw error;
      return data;
    },
    enabled: !!result?.id,
  });

  if (!result) return null;

  const lieu = [result.postal_code, result.city].filter(Boolean).join(' ');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn(DETAIL_SHEET, 'sm:max-w-lg')}>
        <DetailHeader
          titleAs={SheetTitle}
          descriptionAs={SheetDescription}
          className="pt-5 sm:pt-6"
          eyebrow={result.source_name || undefined}
          title={result.title || 'Détail du bien'}
          subtitle={[result.address, lieu].filter(Boolean).join(', ') || undefined}
          badge={
            <>
              <StatusBadge type="result" value={result.result_status} />
              <StatusBadge type="score" value={result.score_label} />
              {result.is_duplicate && <DashBadge tone="warning">Doublon</DashBadge>}
            </>
          }
        />

        <DetailBody>
          <KeyFacts
            items={[
              result.rent != null ? { label: 'Loyer', value: chfDetail(result.rent), emphasis: true } : null,
              result.total_score != null ? { label: 'Score', value: result.total_score } : null,
              result.rooms != null ? { label: 'Pièces', value: result.rooms, icon: Home } : null,
              result.surface != null ? { label: 'Surface', value: `${result.surface} m²`, icon: Maximize } : null,
              result.floor != null ? { label: 'Étage', value: result.floor, icon: Layers } : null,
              result.available_from ? { label: 'Disponible', value: result.available_from } : null,
            ]}
          />

          {(result.address || result.city || result.postal_code || result.source_name) && (
            <DetailSection title="Bien">
              <DetailRow label="Adresse" value={result.address} />
              <DetailRow label="Ville" value={result.city} />
              <DetailRow label="NPA" value={result.postal_code} />
              <DetailRow label="Source" value={result.source_name} />
            </DetailSection>
          )}

          {result.description && (
            <DetailSection title="Description">
              <DetailText>{result.description}</DetailText>
            </DetailSection>
          )}

          {(result.contact_name || result.contact_email || result.contact_phone) && (
            <DetailSection title="Contact">
              <DetailContact
                icon={User}
                role="Annonceur"
                name={result.contact_name}
                phone={result.contact_phone}
                email={result.contact_email}
              />
            </DetailSection>
          )}

          <DetailSection title="Détail du score">
            {isLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : !scores?.length ? (
              <p className="text-sm text-muted-foreground">Aucun détail de score</p>
            ) : (
              <div className="divide-y divide-border/50">
                {scores.map((s: any) => (
                  <div key={s.id} className="flex min-h-[44px] items-center justify-between gap-3 py-2 text-[15px]">
                    <span className="capitalize text-foreground">{s.criterion?.replace(/_/g, ' ') || '—'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.score ?? 0}/{s.max_score ?? 10}</span>
                      {s.weight != null && <span className="text-xs text-muted-foreground">×{s.weight}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailSection>
        </DetailBody>

        {result.source_url && (
          <DetailActions>
            <Button asChild>
              <a href={result.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Voir l'annonce originale
              </a>
            </Button>
          </DetailActions>
        )}
      </SheetContent>
    </Sheet>
  );
}
