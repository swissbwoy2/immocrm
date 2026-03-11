import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Bot, Users, Search, FileText, Shield, CheckCircle, XCircle, Clock,
  Activity, Eye, AlertTriangle, Pencil
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

// Helper to cast from DB
function castRows<T>(data: unknown): T[] {
  return (data as T[]) || [];
}

function castRow<T>(data: unknown): T | null {
  return (data as T) || null;
}

export default function AdminOpenClaw() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAction, setSelectedAction] = useState<Record<string, unknown> | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Fetch AI agent
  const { data: aiAgent } = useQuery({
    queryKey: ['ai-agent'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agents' as never)
        .select('*')
        .limit(1)
        .single();
      return castRow<Record<string, unknown>>(data);
    },
  });

  // Fetch assignments
  const { data: assignments } = useQuery({
    queryKey: ['ai-assignments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agent_assignments' as never)
        .select('*, clients:client_id(id, user_id, statut, priorite, profiles:user_id(prenom, nom, email))')
        .order('created_at', { ascending: false });
      return castRows<Record<string, unknown>>(data);
    },
    enabled: !!aiAgent,
  });

  // Fetch pending actions
  const { data: pendingActions } = useQuery({
    queryKey: ['ai-pending-actions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agent_actions' as never)
        .select('*')
        .eq('requires_approval', true)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return castRows<Record<string, unknown>>(data);
    },
  });

  // Fetch all actions (journal)
  const { data: allActions } = useQuery({
    queryKey: ['ai-all-actions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agent_actions' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return castRows<Record<string, unknown>>(data);
    },
  });

  // Fetch matches
  const { data: matches } = useQuery({
    queryKey: ['ai-property-matches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agent_property_matches' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return castRows<Record<string, unknown>>(data);
    },
  });

  // Fetch drafts
  const { data: drafts } = useQuery({
    queryKey: ['ai-drafts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agent_drafts' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return castRows<Record<string, unknown>>(data);
    },
  });

  // Approve action
  const approveMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ai_agent_actions' as never)
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        } as never)
        .eq('id', actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Action approuvée');
      queryClient.invalidateQueries({ queryKey: ['ai-pending-actions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-all-actions'] });
    },
    onError: () => toast.error('Erreur lors de l\'approbation'),
  });

  // Reject action
  const rejectMutation = useMutation({
    mutationFn: async ({ actionId, reason }: { actionId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ai_agent_actions' as never)
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejected_reason: reason,
        } as never)
        .eq('id', actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Action refusée');
      setShowRejectDialog(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['ai-pending-actions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-all-actions'] });
    },
  });

  const statusBadge = (status: ActionStatus) => {
    const config: Record<ActionStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: '⏳ En attente' },
      approved: { variant: 'default', label: '✅ Approuvé' },
      rejected: { variant: 'destructive', label: '❌ Refusé' },
      executed: { variant: 'outline', label: '✔️ Exécuté' },
      failed: { variant: 'destructive', label: '⚠️ Échoué' },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try {
      return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return d;
    }
  };

  const pendingCount = pendingActions?.length || 0;
  const assignedCount = assignments?.length || 0;
  const matchesCount = matches?.length || 0;
  const draftsCount = drafts?.filter((d: Record<string, unknown>) => d.status === 'pending_approval' || d.status === 'ready')?.length || 0;

  return (
    <ScrollArea className="h-[calc(100vh-3.5rem)] lg:h-screen">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Agent IA OpenClaw</h1>
              <p className="text-muted-foreground text-sm">
                Gestion et contrôle de l'agent IA de relocation
              </p>
            </div>
          </div>
          {aiAgent && (
            <Badge variant={aiAgent.status === 'active' ? 'default' : 'destructive'} className="text-sm px-3 py-1">
              {aiAgent.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}
            </Badge>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{assignedCount}</p>
                  <p className="text-xs text-muted-foreground">Clients assignés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{matchesCount}</p>
                  <p className="text-xs text-muted-foreground">Annonces trouvées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{draftsCount}</p>
                  <p className="text-xs text-muted-foreground">Brouillons en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={pendingCount > 0 ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className={`h-5 w-5 ${pendingCount > 0 ? 'text-amber-600' : 'text-primary'}`} />
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Validations requises</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-1">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Vue générale</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-1 relative">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Validation</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="journal" className="gap-1">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Journal</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dernières actions</CardTitle>
                <CardDescription>Actions récentes de l'agent IA</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Canal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allActions || []).slice(0, 10).map((action: Record<string, unknown>) => (
                      <TableRow key={action.id as string}>
                        <TableCell className="text-sm">{formatDate(action.created_at as string)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{action.action_type as string}</Badge>
                        </TableCell>
                        <TableCell>{statusBadge(action.status as ActionStatus)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{(action.channel as string) || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {(!allActions || allActions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Aucune action enregistrée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clients assignés à OpenClaw</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Assigné le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(assignments || []).map((a: Record<string, unknown>) => {
                      const client = a.clients as Record<string, unknown> | null;
                      const profile = client?.profiles as Record<string, unknown> | null;
                      return (
                        <TableRow key={a.id as string}>
                          <TableCell className="font-medium">
                            {profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || (profile.email as string) : 'Inconnu'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{a.status as string}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={a.priority === 'urgente' ? 'destructive' : a.priority === 'haute' ? 'default' : 'secondary'}>
                              {a.priority as string}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(a.assigned_at as string)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(!assignments || assignments.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Aucun client assigné
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-4">
            {pendingCount === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Tout est à jour</p>
                  <p className="text-muted-foreground">Aucune action en attente de validation</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente de votre validation
                  </p>
                </div>
                {(pendingActions || []).map((action: Record<string, unknown>) => (
                  <Card key={action.id as string} className="border-amber-200">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{action.action_type as string}</Badge>
                            {action.channel && <Badge variant="secondary">{action.channel as string}</Badge>}
                            <span className="text-xs text-muted-foreground">{formatDate(action.created_at as string)}</span>
                          </div>
                          {action.draft_content && (
                            <div className="p-3 bg-muted rounded-md text-sm max-h-32 overflow-auto whitespace-pre-wrap">
                              {action.draft_content as string}
                            </div>
                          )}
                          {action.action_payload && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground">Détails du payload</summary>
                              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-24">
                                {JSON.stringify(action.action_payload, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(action.id as string)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAction(action);
                              setEditContent((action.draft_content as string) || '');
                              setShowEditDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedAction(action);
                              setShowRejectDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Journal Tab */}
          <TabsContent value="journal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Journal complet des actions</CardTitle>
                <CardDescription>Toutes les actions de l'agent IA, triées par date</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allActions || []).map((action: Record<string, unknown>) => (
                      <TableRow key={action.id as string}>
                        <TableCell className="text-sm">{formatDate(action.created_at as string)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{action.action_type as string}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{(action.channel as string) || '-'}</TableCell>
                        <TableCell className="text-sm">{(action.source_type as string) || '-'}</TableCell>
                        <TableCell>{statusBadge(action.status as ActionStatus)}</TableCell>
                        <TableCell className="text-sm">
                          {action.requires_approval ? (
                            action.approved_by ? '✅ Validé' : '⏳ Requis'
                          ) : (
                            <span className="text-muted-foreground">Non requis</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!allActions || allActions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Aucune action enregistrée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refuser l'action</DialogTitle>
              <DialogDescription>Indiquez la raison du refus</DialogDescription>
            </DialogHeader>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison du refus..."
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Annuler</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedAction) {
                    rejectMutation.mutate({ actionId: selectedAction.id as string, reason: rejectReason });
                  }
                }}
                disabled={rejectMutation.isPending}
              >
                Confirmer le refus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifier avant approbation</DialogTitle>
              <DialogDescription>Modifiez le contenu puis approuvez</DialogDescription>
            </DialogHeader>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
              <Button
                onClick={async () => {
                  if (selectedAction) {
                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase
                      .from('ai_agent_actions' as never)
                      .update({
                        draft_content: editContent,
                        status: 'approved',
                        approved_by: user?.id,
                        approved_at: new Date().toISOString(),
                      } as never)
                      .eq('id', selectedAction.id as string);
                    toast.success('Action modifiée et approuvée');
                    setShowEditDialog(false);
                    queryClient.invalidateQueries({ queryKey: ['ai-pending-actions'] });
                    queryClient.invalidateQueries({ queryKey: ['ai-all-actions'] });
                  }
                }}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Modifier & Approuver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
