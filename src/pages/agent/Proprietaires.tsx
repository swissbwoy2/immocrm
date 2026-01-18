import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Phone, Building2, Home, MapPin, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PremiumPageHeader, PremiumCard, PremiumKPICard, PremiumEmptyState } from "@/components/premium";
import { useAuth } from '@/contexts/AuthContext';

interface ProprietaireWithProfile {
  id: string;
  user_id: string;
  statut: string;
  civilite: string | null;
  adresse: string | null;
  ville: string | null;
  canton: string | null;
  telephone: string | null;
  agent_id: string | null;
  created_at: string;
  profile: {
    nom: string;
    prenom: string;
    email: string;
    avatar_url: string | null;
  } | null;
  immeubles_count: number;
}

export default function AgentProprietaires() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [proprietaires, setProprietaires] = useState<ProprietaireWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAgentId();
    }
  }, [user]);

  useEffect(() => {
    if (agentId) {
      loadProprietaires();
    }
  }, [agentId]);

  const loadAgentId = async () => {
    const { data } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user?.id)
      .single();
    
    if (data) {
      setAgentId(data.id);
    }
  };

  const loadProprietaires = async () => {
    try {
      // Fetch proprietaires assigned to this agent
      const { data: proprietairesData, error } = await supabase
        .from('proprietaires')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with profiles and immeubles count
      const enrichedData = await Promise.all(
        (proprietairesData || []).map(async (prop) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nom, prenom, email, avatar_url')
            .eq('id', prop.user_id)
            .single();

          const { count } = await supabase
            .from('immeubles')
            .select('*', { count: 'exact', head: true })
            .eq('proprietaire_id', prop.id);

          return {
            ...prop,
            profile,
            immeubles_count: count || 0
          };
        })
      );

      setProprietaires(enrichedData);
    } catch (error) {
      console.error('Error loading proprietaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProprietaires = proprietaires.filter(prop => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      prop.profile?.nom?.toLowerCase().includes(searchLower) ||
      prop.profile?.prenom?.toLowerCase().includes(searchLower) ||
      prop.profile?.email?.toLowerCase().includes(searchLower) ||
      prop.ville?.toLowerCase().includes(searchLower)
    );
  });

  const activeCount = proprietaires.filter(p => p.statut === 'actif').length;
  const pendingCount = proprietaires.filter(p => p.statut === 'en_attente').length;
  const totalImmeubles = proprietaires.reduce((sum, p) => sum + p.immeubles_count, 0);

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    actif: { label: 'Actif', variant: 'default' },
    en_attente: { label: 'En attente', variant: 'secondary' },
    inactif: { label: 'Inactif', variant: 'outline' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          title="Mes Propriétaires"
          subtitle={`${proprietaires.length} propriétaires assignés`}
          icon={Home}
          badge="Gestion"
        />

        {/* KPIs */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <PremiumKPICard
            title="Total"
            value={proprietaires.length}
            icon={Home}
            delay={0}
          />
          <PremiumKPICard
            title="Actifs"
            value={activeCount}
            icon={UserCog}
            variant="success"
            delay={50}
          />
          <PremiumKPICard
            title="En attente"
            value={pendingCount}
            icon={Mail}
            variant="warning"
            delay={100}
          />
          <PremiumKPICard
            title="Immeubles"
            value={totalImmeubles}
            icon={Building2}
            delay={150}
          />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un propriétaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {filteredProprietaires.length === 0 ? (
          <PremiumEmptyState
            icon={Home}
            title="Aucun propriétaire"
            description="Vous n'avez pas encore de propriétaires assignés"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProprietaires.map((prop, index) => (
              <div
                key={prop.id}
                className="cursor-pointer animate-fade-in"
                onClick={() => navigate(`/agent/proprietaires/${prop.id}`)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PremiumCard className="hover:shadow-lg transition-all duration-300">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={prop.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {prop.profile?.prenom?.[0]}{prop.profile?.nom?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">
                            {prop.civilite} {prop.profile?.prenom} {prop.profile?.nom}
                          </h3>
                          <Badge variant={statusConfig[prop.statut]?.variant || 'secondary'} className="text-xs">
                            {statusConfig[prop.statut]?.label || prop.statut}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {prop.profile?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {prop.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {prop.telephone}
                        </span>
                      )}
                      {prop.ville && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {prop.ville} {prop.canton && `(${prop.canton})`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{prop.immeubles_count} immeuble(s)</span>
                    </div>
                  </div>
                </PremiumCard>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
