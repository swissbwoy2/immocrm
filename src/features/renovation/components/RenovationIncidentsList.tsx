import { useState } from 'react';
import { useRenovationIncidents } from '../hooks/useRenovationIncidents';
import { RenovationIncidentForm } from './RenovationIncidentForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Plus, Loader2 } from 'lucide-react';

const severityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

interface Props {
  projectId: string;
  canManage: boolean;
}

export function RenovationIncidentsList({ projectId, canManage }: Props) {
  const { incidents, create, update } = useRenovationIncidents(projectId);
  const [showForm, setShowForm] = useState(false);

  if (incidents.isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const data = incidents.data || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Incidents ({data.length})
        </CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Signaler
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun incident signalé.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Gravité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Bloquant</TableHead>
                <TableHead>Impact coût</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell className="font-medium">{inc.title}</TableCell>
                  <TableCell>
                    <Badge variant={severityVariant[inc.severity] || 'secondary'}>
                      {inc.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{inc.status}</TableCell>
                  <TableCell>{inc.is_blocking ? '🔴 Oui' : 'Non'}</TableCell>
                  <TableCell>{inc.cost_impact ? `CHF ${inc.cost_impact}` : '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(inc.created_at).toLocaleDateString('fr-CH')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {showForm && (
        <RenovationIncidentForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={(values) => {
            create.mutate(values, { onSuccess: () => setShowForm(false) });
          }}
          isLoading={create.isPending}
        />
      )}
    </Card>
  );
}
