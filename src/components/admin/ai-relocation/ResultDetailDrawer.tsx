import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './statusBadges';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink } from 'lucide-react';

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="truncate">{result.title || 'Détail du bien'}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Status & Score */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge type="result" value={result.result_status} />
              {result.total_score != null && (
                <span className="text-sm font-medium">Score: {result.total_score}</span>
              )}
              <StatusBadge type="score" value={result.score_label} />
              {result.is_duplicate && (
                <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">Doublon</span>
              )}
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {result.address && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Adresse:</span>
                  <span className="block font-medium">{result.address}</span>
                </div>
              )}
              {result.city && (
                <div>
                  <span className="text-muted-foreground">Ville:</span>
                  <span className="block">{result.city}</span>
                </div>
              )}
              {result.postal_code && (
                <div>
                  <span className="text-muted-foreground">NPA:</span>
                  <span className="block">{result.postal_code}</span>
                </div>
              )}
              {result.rent != null && (
                <div>
                  <span className="text-muted-foreground">Loyer:</span>
                  <span className="block font-medium">{result.rent} CHF</span>
                </div>
              )}
              {result.rooms != null && (
                <div>
                  <span className="text-muted-foreground">Pièces:</span>
                  <span className="block">{result.rooms}</span>
                </div>
              )}
              {result.surface != null && (
                <div>
                  <span className="text-muted-foreground">Surface:</span>
                  <span className="block">{result.surface} m²</span>
                </div>
              )}
              {result.floor != null && (
                <div>
                  <span className="text-muted-foreground">Étage:</span>
                  <span className="block">{result.floor}</span>
                </div>
              )}
              {result.source_name && (
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <span className="block">{result.source_name}</span>
                </div>
              )}
              {result.available_from && (
                <div>
                  <span className="text-muted-foreground">Disponible:</span>
                  <span className="block">{result.available_from}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {result.description && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.description}</p>
              </div>
            )}

            {/* Contact Info */}
            {(result.contact_name || result.contact_email || result.contact_phone) && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Contact</h4>
                <div className="text-sm space-y-0.5">
                  {result.contact_name && <div>{result.contact_name}</div>}
                  {result.contact_email && <div className="text-primary">{result.contact_email}</div>}
                  {result.contact_phone && <div>{result.contact_phone}</div>}
                </div>
              </div>
            )}

            {/* Source URL */}
            {result.source_url && (
              <a
                href={result.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Voir l'annonce originale
              </a>
            )}

            {/* Score Breakdown */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Détail du score</h4>
              {isLoading ? (
                <Skeleton className="h-20" />
              ) : !scores?.length ? (
                <p className="text-muted-foreground text-sm">Aucun détail de score</p>
              ) : (
                <div className="space-y-1">
                  {scores.map((s: any) => (
                    <div key={s.id} className="flex justify-between items-center text-sm bg-muted/50 rounded px-3 py-1.5">
                      <span className="capitalize">{s.criterion?.replace(/_/g, ' ') || '—'}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.score ?? 0}/{s.max_score ?? 10}</span>
                        {s.weight != null && <span className="text-xs text-muted-foreground">×{s.weight}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
