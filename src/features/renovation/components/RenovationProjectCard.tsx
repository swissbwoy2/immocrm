import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RenovationProject } from '../types/renovation';
import { RenovationStatusBadge } from './RenovationStatusBadge';
import { Building2, Calendar, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  project: RenovationProject;
}

export function RenovationProjectCard({ project }: Props) {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const basePath = userRole === 'admin' ? '/admin' : userRole === 'agent' ? '/agent' : '/proprietaire';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`${basePath}/renovation/${project.id}`)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold line-clamp-1">{project.title}</CardTitle>
        <RenovationStatusBadge status={project.status} />
      </CardHeader>
      <CardContent className="space-y-2">
        {project.immeubles && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{project.immeubles.nom || project.immeubles.adresse}</span>
          </div>
        )}
        {project.start_date_planned && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {new Date(project.start_date_planned).toLocaleDateString('fr-CH')}
              {project.end_date_planned && ` → ${new Date(project.end_date_planned).toLocaleDateString('fr-CH')}`}
            </span>
          </div>
        )}
        {project.budget_estimated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 flex-shrink-0" />
            <span>Budget: CHF {project.budget_estimated.toLocaleString('fr-CH')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
