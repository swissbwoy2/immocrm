import { useParams, useNavigate } from 'react-router-dom';
import { useRenovationProject } from '../hooks/useRenovationProject';
import { RenovationStatusBadge } from '../components/RenovationStatusBadge';
import { RenovationFilesList } from '../components/RenovationFilesList';
import { RenovationQuotesList } from '../components/RenovationQuotesList';
import { RenovationBudgetTable } from '../components/RenovationBudgetTable';
import { RenovationMilestoneEditor } from '../components/RenovationMilestoneEditor';
import { RenovationCompaniesList } from '../components/RenovationCompaniesList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Calendar, Wallet, Loader2, FileText, BarChart3, Clock, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function RenovationProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { project: projectQuery, milestones: milestonesQuery } = useRenovationProject(id);

  const project = projectQuery.data;
  const milestones = milestonesQuery.data;
  const basePath = userRole === 'admin' ? '/admin' : userRole === 'agent' ? '/agent' : '/proprietaire';
  const canUpload = userRole === 'admin' || userRole === 'agent' || userRole === 'proprietaire';
  const canManage = userRole === 'admin' || userRole === 'agent';

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Projet non trouvé.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`${basePath}/renovation`)}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/renovation`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <RenovationStatusBadge status={project.status} />
          </div>
          {project.immeubles && (
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">{project.immeubles.nom || project.immeubles.adresse}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Planning
            </div>
            <p className="text-sm">
              {project.start_date_planned
                ? `${new Date(project.start_date_planned).toLocaleDateString('fr-CH')} → ${project.end_date_planned ? new Date(project.end_date_planned).toLocaleDateString('fr-CH') : '?'}`
                : 'Non défini'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Wallet className="h-4 w-4" />
              Budget
            </div>
            <p className="text-sm font-medium">
              {project.budget_estimated
                ? `CHF ${project.budget_estimated.toLocaleString('fr-CH')}`
                : 'Non défini'}
            </p>
            {project.budget_actual > 0 && (
              <p className="text-xs text-muted-foreground">
                Réel: CHF {project.budget_actual.toLocaleString('fr-CH')}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Avancement</div>
            <div className="text-sm">
              {milestones ? (
                <span>
                  {milestones.filter(m => m.status === 'completed').length}/{milestones.length} jalons
                </span>
              ) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList className="flex-wrap">
          <TabsTrigger value="documents" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            Devis
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="planning" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            Entreprises
          </TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <RenovationFilesList projectId={project.id} canUpload={canUpload} />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <RenovationQuotesList projectId={project.id} canManage={canManage} />
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <RenovationBudgetTable projectId={project.id} canManage={canManage} />
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          <RenovationMilestoneEditor projectId={project.id} canManage={canManage} />
        </TabsContent>

        <TabsContent value="companies" className="mt-4">
          <RenovationCompaniesList projectId={project.id} canManage={canManage} />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails du projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{project.description}</p>
                </div>
              )}
              {project.objective && (
                <div>
                  <p className="text-sm text-muted-foreground">Objectif</p>
                  <p className="text-sm mt-1">{project.objective}</p>
                </div>
              )}
              {project.quality_target && (
                <div>
                  <p className="text-sm text-muted-foreground">Cible qualité</p>
                  <p className="text-sm mt-1">{project.quality_target}</p>
                </div>
              )}
              {project.timeline_constraint && (
                <div>
                  <p className="text-sm text-muted-foreground">Contraintes délai</p>
                  <p className="text-sm mt-1">{project.timeline_constraint}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
