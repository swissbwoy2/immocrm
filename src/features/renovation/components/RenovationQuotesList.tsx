import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileSearch, GitCompare, Plus, AlertCircle } from 'lucide-react';
import { useRenovationQuotes } from '../hooks/useRenovationQuotes';
import { RenovationQuoteComparison } from './RenovationQuoteComparison';
import { RenovationCreateQuoteDialog } from './RenovationCreateQuoteDialog';

interface Props {
  projectId: string;
  canManage: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  received: 'Reçu',
  analyzed: 'Analysé',
  accepted: 'Accepté',
  rejected: 'Refusé',
};

export function RenovationQuotesList({ projectId, canManage }: Props) {
  const { quotes, analyzeQuote, compareQuotes } = useRenovationQuotes(projectId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    const result = await compareQuotes.mutateAsync({ quoteIds: selectedIds });
    setComparisonResult(result);
  };

  if (quotes.isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;
  }

  const quoteList = quotes.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">Devis ({quoteList.length})</CardTitle>
        <div className="flex gap-2">
          {selectedIds.length >= 2 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCompare}
              disabled={compareQuotes.isPending}
            >
              {compareQuotes.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <GitCompare className="h-4 w-4 mr-1" />
              )}
              Comparer ({selectedIds.length})
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nouveau devis
            </Button>
          )}
        </div>
      </div>

      {quoteList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun devis pour ce projet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {quoteList.map((q: any) => (
            <Card
              key={q.id}
              className={`cursor-pointer transition-colors ${
                selectedIds.includes(q.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => toggleSelect(q.id)}
            >
              <CardContent className="py-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{q.title}</span>
                    <Badge variant={q.status === 'analyzed' ? 'default' : 'outline'} className="text-xs">
                      {STATUS_LABELS[q.status] || q.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{(q as any).renovation_companies?.name || '—'}</span>
                    {q.amount_ttc && (
                      <span className="font-medium">
                        CHF {q.amount_ttc.toLocaleString('fr-CH')}
                      </span>
                    )}
                    {q.reference && <span>Réf: {q.reference}</span>}
                  </div>
                </div>
                {canManage && q.status === 'received' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      analyzeQuote.mutate(q.id);
                    }}
                    disabled={analyzeQuote.isPending}
                  >
                    {analyzeQuote.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSearch className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {comparisonResult && (
        <RenovationQuoteComparison
          result={comparisonResult}
          onClose={() => setComparisonResult(null)}
        />
      )}

      {showCreate && (
        <RenovationCreateQuoteDialog
          projectId={projectId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
