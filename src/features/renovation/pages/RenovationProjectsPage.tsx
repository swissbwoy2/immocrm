import { useRenovationProjects } from '../hooks/useRenovationProjects';
import { RenovationProjectCard } from '../components/RenovationProjectCard';
import { CreateProjectDialog } from '../components/CreateProjectDialog';
import { Loader2, HardHat } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function RenovationProjectsPage() {
  const { data: projects, isLoading } = useRenovationProjects();
  const { userRole } = useAuth();
  const canCreate = userRole === 'admin' || userRole === 'agent';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardHat className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Rénovation</h1>
            <p className="text-sm text-muted-foreground">Projets de rénovation et travaux</p>
          </div>
        </div>
        {canCreate && <CreateProjectDialog />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !projects?.length ? (
        <div className="text-center py-16">
          <HardHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Aucun projet de rénovation</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {canCreate ? 'Créez votre premier projet pour commencer.' : 'Aucun projet ne vous a encore été attribué.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <RenovationProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
