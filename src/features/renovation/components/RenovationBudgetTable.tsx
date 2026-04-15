import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useRenovationBudget } from '../hooks/useRenovationBudget';

interface Props {
  projectId: string;
  canManage: boolean;
}

export function RenovationBudgetTable({ projectId, canManage }: Props) {
  const { budget, updateLine } = useRenovationBudget(projectId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  if (budget.isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;
  }

  const lines = budget.data || [];
  const totalEstimated = lines.reduce((sum, l) => sum + (l.estimated || 0), 0);
  const totalCommitted = lines.reduce((sum, l) => sum + (l.committed || 0), 0);
  const totalInvoiced = lines.reduce((sum, l) => sum + (l.invoiced || 0), 0);
  const totalPaid = lines.reduce((sum, l) => sum + (l.paid || 0), 0);

  const startEdit = (line: any) => {
    setEditingId(line.id);
    setEditValues({
      estimated: line.estimated || 0,
      committed: line.committed || 0,
      invoiced: line.invoiced || 0,
      paid: line.paid || 0,
    });
  };

  const saveEdit = async (id: string) => {
    await updateLine.mutateAsync({ id, updates: editValues });
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Catégorie</th>
                <th className="text-right py-2 px-2">Estimé</th>
                <th className="text-right py-2 px-2">Engagé</th>
                <th className="text-right py-2 px-2">Facturé</th>
                <th className="text-right py-2 px-2">Payé</th>
                <th className="text-right py-2 px-2">Variance</th>
                {canManage && <th className="py-2 px-2 w-10" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any) => {
                const isEditing = editingId === line.id;
                const variance = (line.estimated || 0) - (line.committed || 0);
                const varianceClass = variance < 0 ? 'text-destructive' : variance > 0 ? 'text-green-600' : '';

                return (
                  <tr key={line.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-xs font-medium">{line.label}</td>
                    {isEditing ? (
                      <>
                        {['estimated', 'committed', 'invoiced', 'paid'].map(field => (
                          <td key={field} className="py-1 px-1">
                            <Input
                              type="number"
                              value={editValues[field]}
                              onChange={e => setEditValues(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
                              className="h-7 text-xs text-right w-24"
                            />
                          </td>
                        ))}
                        <td className="py-1 px-2 text-right text-xs tabular-nums">—</td>
                        <td className="py-1 px-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveEdit(line.id)}
                            disabled={updateLine.isPending}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="text-right py-2 px-2 text-xs tabular-nums">
                          {(line.estimated || 0).toLocaleString('fr-CH')}
                        </td>
                        <td className="text-right py-2 px-2 text-xs tabular-nums">
                          {(line.committed || 0).toLocaleString('fr-CH')}
                        </td>
                        <td className="text-right py-2 px-2 text-xs tabular-nums">
                          {(line.invoiced || 0).toLocaleString('fr-CH')}
                        </td>
                        <td className="text-right py-2 px-2 text-xs tabular-nums">
                          {(line.paid || 0).toLocaleString('fr-CH')}
                        </td>
                        <td className={`text-right py-2 px-2 text-xs tabular-nums font-medium ${varianceClass}`}>
                          {variance > 0 ? '+' : ''}{variance.toLocaleString('fr-CH')}
                        </td>
                        {canManage && (
                          <td className="py-2 px-1">
                            <Button size="sm" variant="ghost" onClick={() => startEdit(line)} className="h-6 text-xs">
                              ✏️
                            </Button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="font-semibold bg-muted/30">
                <td className="py-2 pr-4 text-xs">Total</td>
                <td className="text-right py-2 px-2 text-xs tabular-nums">
                  {totalEstimated.toLocaleString('fr-CH')}
                </td>
                <td className="text-right py-2 px-2 text-xs tabular-nums">
                  {totalCommitted.toLocaleString('fr-CH')}
                </td>
                <td className="text-right py-2 px-2 text-xs tabular-nums">
                  {totalInvoiced.toLocaleString('fr-CH')}
                </td>
                <td className="text-right py-2 px-2 text-xs tabular-nums">
                  {totalPaid.toLocaleString('fr-CH')}
                </td>
                <td className={`text-right py-2 px-2 text-xs tabular-nums font-medium ${
                  (totalEstimated - totalCommitted) < 0 ? 'text-destructive' : 'text-green-600'
                }`}>
                  {(totalEstimated - totalCommitted) > 0 ? '+' : ''}
                  {(totalEstimated - totalCommitted).toLocaleString('fr-CH')}
                </td>
                {canManage && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
