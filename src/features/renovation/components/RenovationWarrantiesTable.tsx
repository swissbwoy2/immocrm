import { useState } from 'react';
import { useRenovationWarranties } from '../hooks/useRenovationWarranties';
import { RenovationWarrantyForm } from './RenovationWarrantyForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Plus, ShieldOff } from 'lucide-react';

interface Props {
  projectId: string;
  canManage: boolean;
  warrantiesNotApplicable?: boolean;
}

export function RenovationWarrantiesTable({ projectId, canManage, warrantiesNotApplicable }: Props) {
  const { warranties, create } = useRenovationWarranties(projectId);
  const [showForm, setShowForm] = useState(false);

  if (warranties.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const data = warranties.data || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Garanties ({data.length})
        </CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {warrantiesNotApplicable && (
          <div className="bg-muted/50 border rounded-md p-3 mb-4 text-sm text-muted-foreground">
            ⚠️ Garanties marquées comme non applicables pour ce projet.
          </div>
        )}
        {data.length === 0 && !warrantiesNotApplicable ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShieldOff className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Aucune garantie enregistrée</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Ajoutez les garanties des équipements et travaux réalisés.
            </p>
          </div>
        ) : data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Équipement</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Durée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((w) => {
                const isExpiring = w.end_date && new Date(w.end_date) < new Date(Date.now() + 90 * 86400000);
                return (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.warranty_type || '-'}</TableCell>
                    <TableCell>{w.equipment || '-'}</TableCell>
                    <TableCell>{w.brand || '-'}</TableCell>
                    <TableCell className="text-sm">{w.start_date || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {w.end_date || '-'}
                      {isExpiring && <Badge variant="destructive" className="ml-1 text-xs">Expire bientôt</Badge>}
                    </TableCell>
                    <TableCell>{w.duration_months ? `${w.duration_months} mois` : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>

      {showForm && (
        <RenovationWarrantyForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={(v) => create.mutate(v, { onSuccess: () => setShowForm(false) })}
          isLoading={create.isPending}
        />
      )}
    </Card>
  );
}
