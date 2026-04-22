import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { Bot, LayoutDashboard, Users, Search, FileText, Send, CalendarCheck, Shield, Activity } from 'lucide-react';
import { AgentIADashboard } from '@/components/admin/ai-relocation/AgentIADashboard';
import { AssignedClientsTab } from '@/components/admin/ai-relocation/AssignedClientsTab';
import { MissionsTab } from '@/components/admin/ai-relocation/MissionsTab';
import { SearchResultsTab } from '@/components/admin/ai-relocation/SearchResultsTab';
import { OffersTab } from '@/components/admin/ai-relocation/OffersTab';
import { VisitsTab } from '@/components/admin/ai-relocation/VisitsTab';
import { ApprovalsTab } from '@/components/admin/ai-relocation/ApprovalsTab';
import { ActivityLogTab } from '@/components/admin/ai-relocation/ActivityLogTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function AdminAgentIA() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch the active AI agent. Uses status='active' to select intentionally.
  // Fallback: if no active agent exists, the UI shows an empty state.
  const { data: aiAgent, isLoading: agentLoading, isError: agentError } = useQuery({
    queryKey: ['ai-agent-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('status', 'active')
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (agentLoading) {
    return (
      <div className="relative space-y-6 p-4 md:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full max-w-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (agentError || !aiAgent) {
    return (
      <div className="p-4 md:p-6">
        <PremiumPageHeader
          title="Agent IA Relocation"
          subtitle="Aucun agent IA actif trouvé"
          icon={Bot}
        />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bot className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun agent IA avec le statut « active » n'a été trouvé dans la base.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PremiumPageHeader
        title="Agent IA Relocation"
        subtitle={`Agent: ${aiAgent.display_name}`}
        icon={Bot}
        action={
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            {aiAgent.status}
          </Badge>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Clients
          </TabsTrigger>
          <TabsTrigger value="missions" className="gap-1.5 text-xs">
            <Search className="w-3.5 h-3.5" /> Missions
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> Résultats
          </TabsTrigger>
          <TabsTrigger value="offers" className="gap-1.5 text-xs">
            <Send className="w-3.5 h-3.5" /> Offres
          </TabsTrigger>
          <TabsTrigger value="visits" className="gap-1.5 text-xs">
            <CalendarCheck className="w-3.5 h-3.5" /> Visites
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Validations
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs">
            <Activity className="w-3.5 h-3.5" /> Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AgentIADashboard agentId={aiAgent.id} />
        </TabsContent>
        <TabsContent value="clients">
          <AssignedClientsTab agentId={aiAgent.id} />
        </TabsContent>
        <TabsContent value="missions">
          <MissionsTab agentId={aiAgent.id} />
        </TabsContent>
        <TabsContent value="results">
          <SearchResultsTab agentId={aiAgent.id} />
        </TabsContent>
        <TabsContent value="offers">
          <OffersTab agentId={aiAgent.id} />
        </TabsContent>
        <TabsContent value="visits">
          <VisitsTab agentId={aiAgent.id} />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalsTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityLogTab agentId={aiAgent.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
