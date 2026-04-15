import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Building2, Phone, Mail, BarChart3 } from 'lucide-react';
import { useRenovationCompanies } from '../hooks/useRenovationCompanies';
import { RenovationAddCompanyDialog } from './RenovationAddCompanyDialog';

interface Props {
  projectId: string;
  canManage: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  contractor: 'Entrepreneur',
  architect: 'Architecte',
  engineer: 'Ingénieur',
  consultant: 'Consultant',
  subcontractor: 'Sous-traitant',
  supplier: 'Fournisseur',
  inspector: 'Inspecteur',
  project_manager: 'Chef de projet',
};

export function RenovationCompaniesList({ projectId, canManage }: Props) {
  const { companies, scoreCompany } = useRenovationCompanies(projectId);
  const [showAdd, setShowAdd] = useState(false);

  if (companies.isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;
  }

  const list = companies.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">Entreprises ({list.length})</CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucune entreprise liée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((pc: any) => {
            const company = pc.renovation_companies;
            return (
              <Card key={pc.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{company?.name || '—'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[pc.role] || pc.role}
                        </Badge>
                        {pc.lot_name && (
                          <span className="text-xs text-muted-foreground">{pc.lot_name}</span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => scoreCompany.mutate({ companyId: pc.company_id })}
                        disabled={scoreCompany.isPending}
                        title="Calculer le score"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {company?.contact_name && (
                      <p>{company.contact_name}</p>
                    )}
                    {company?.contact_phone && (
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {company.contact_phone}
                      </p>
                    )}
                    {company?.contact_email && (
                      <p className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {company.contact_email}
                      </p>
                    )}
                    {company?.city && <p>{company.city}</p>}
                  </div>
                  {pc.contract_amount && (
                    <p className="mt-2 text-sm font-medium">
                      CHF {pc.contract_amount.toLocaleString('fr-CH')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showAdd && (
        <RenovationAddCompanyDialog
          projectId={projectId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
