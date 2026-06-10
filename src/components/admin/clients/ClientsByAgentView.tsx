import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Crown, Briefcase, Handshake, UserX, Search, ChevronRight, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PremiumKPICard } from "@/components/premium/PremiumKPICard";
import { cn } from "@/lib/utils";
import { formatSwissShortDate } from "@/lib/dateUtils";

type ClientAgent = {
  client_id: string;
  agent_id: string;
  is_primary: boolean;
  created_at: string | null;
};

type ClientLite = {
  id: string;
  user_id?: string | null;
  agent_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [k: string]: any;
};

type ProfileLite = {
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  [k: string]: any;
};

type AgentLite = {
  id: string;
  profile?: ProfileLite;
  [k: string]: any;
};

interface ClientsByAgentViewProps {
  clients: ClientLite[];
  clientProfiles: Map<string, ProfileLite>;
  agents: AgentLite[];
  clientAgents: ClientAgent[];
}

type Assignment = {
  clientId: string;
  agentId: string;
  isPrimary: boolean;
  assignedAt: string | null;
};

type ResponsibilityFilter = "all" | "primary" | "co";
type SortOrder = "desc" | "asc";
type AgentSort = "principalDesc" | "totalDesc" | "alpha";

const UNASSIGNED_INITIAL_LIMIT = 10;
const AGENT_INITIAL_LIMIT = 10;

const pickLatestDate = (a: string | null, b: string | null): string | null => {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

export function ClientsByAgentView({
  clients,
  clientProfiles,
  agents,
  clientAgents,
}: ClientsByAgentViewProps) {
  const navigate = useNavigate();

  const [selectedAgent, setSelectedAgent] = useState<"all" | string>("all");
  const [responsibilityFilter, setResponsibilityFilter] =
    useState<ResponsibilityFilter>("all");
  const [clientSortOrder, setClientSortOrder] = useState<SortOrder>("desc");
  const [agentSort, setAgentSort] = useState<AgentSort>("principalDesc");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [unassignedExpanded, setUnassignedExpanded] = useState(false);

  // ---------- Helpers profil ----------
  const getClientProfile = (c: ClientLite): ProfileLite | undefined =>
    c.user_id ? clientProfiles.get(c.user_id) : undefined;

  const getClientDisplayName = (c: ClientLite): string => {
    const p = getClientProfile(c);
    const full = [
      p?.prenom ?? (c as any).prenom,
      p?.nom ?? (c as any).nom,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    return full || "Client sans profil";
  };

  const getClientDisplayEmail = (c: ClientLite): string | null => {
    const p = getClientProfile(c);
    return p?.email ?? (c as any).email ?? null;
  };

  const getAgentDisplayName = (a: AgentLite | null | undefined): string => {
    if (!a) return "Agent inconnu";
    const full = [a.profile?.prenom, a.profile?.nom]
      .filter(Boolean)
      .join(" ")
      .trim();
    return full || "Agent inconnu";
  };

  const getAgentFirstName = (a: AgentLite | null | undefined): string => {
    if (!a) return "Agent inconnu";
    return a.profile?.prenom?.trim() || getAgentDisplayName(a);
  };

  // ---------- Index ----------
  const agentsById = useMemo(() => {
    const m = new Map<string, AgentLite>();
    agents.forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);

  const clientById = useMemo(() => {
    const m = new Map<string, ClientLite>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const clientAgentsByClient = useMemo(() => {
    const m = new Map<string, ClientAgent[]>();
    clientAgents.forEach((ca) => {
      const arr = m.get(ca.client_id) ?? [];
      arr.push(ca);
      m.set(ca.client_id, arr);
    });
    return m;
  }, [clientAgents]);

  // ---------- Assignments (anti-doublons) ----------
  const assignments = useMemo<Assignment[]>(() => {
    const key = (cid: string, aid: string) => `${cid}::${aid}`;
    const merged = new Map<string, Assignment>();

    clients.forEach((client) => {
      const links = clientAgentsByClient.get(client.id);
      if (links && links.length > 0) {
        links.forEach((ca) => {
          if (!ca.agent_id) return;
          const k = key(client.id, ca.agent_id);
          const existing = merged.get(k);
          if (!existing) {
            merged.set(k, {
              clientId: client.id,
              agentId: ca.agent_id,
              isPrimary: !!ca.is_primary,
              assignedAt: ca.created_at ?? null,
            });
          } else {
            merged.set(k, {
              ...existing,
              isPrimary: existing.isPrimary || !!ca.is_primary,
              assignedAt: pickLatestDate(existing.assignedAt, ca.created_at ?? null),
            });
          }
        });
      } else if (client.agent_id) {
        const k = key(client.id, client.agent_id);
        merged.set(k, {
          clientId: client.id,
          agentId: client.agent_id,
          isPrimary: true,
          assignedAt: client.created_at ?? null,
        });
      }
    });

    return Array.from(merged.values());
  }, [clients, clientAgentsByClient]);

  // ---------- Clients sans agent ----------
  const clientsWithoutAgent = useMemo(
    () =>
      clients.filter(
        (c) => !clientAgentsByClient.has(c.id) && !c.agent_id,
      ),
    [clients, clientAgentsByClient],
  );

  // ---------- Recherche ----------
  const matchesClientSearch = (c: ClientLite, term: string): boolean => {
    const n = term.trim().toLowerCase();
    if (!n) return true;
    const p = getClientProfile(c);
    const values = [
      p?.prenom,
      p?.nom,
      p?.email,
      p?.telephone,
      (c as any).prenom,
      (c as any).nom,
      (c as any).email,
      (c as any).telephone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return values.includes(n);
  };

  const matchesAgentSearch = (a: AgentLite | null | undefined, term: string): boolean => {
    const n = term.trim().toLowerCase();
    if (!n) return true;
    if (!a) return false;
    const values = [a.profile?.prenom, a.profile?.nom, a.profile?.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return values.includes(n);
  };

  // ---------- Agent buckets ----------
  type Bucket = {
    agentId: string;
    agent: AgentLite | null;
    isUnknown: boolean;
    primary: ClientLite[];
    co: ClientLite[];
    /** assignedAt per (clientId, agentId) for sorting */
    dates: Map<string, string | null>;
  };

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, Bucket>();
    assignments.forEach((a) => {
      let b = map.get(a.agentId);
      if (!b) {
        const agent = agentsById.get(a.agentId) ?? null;
        b = {
          agentId: a.agentId,
          agent,
          isUnknown: !agent,
          primary: [],
          co: [],
          dates: new Map(),
        };
        map.set(a.agentId, b);
      }
      const client = clientById.get(a.clientId);
      if (!client) return;
      const bucket: ClientLite[] = a.isPrimary ? b.primary : b.co;
      if (!bucket.find((c) => c.id === client.id)) {
        bucket.push(client);
      }
      b.dates.set(client.id, a.assignedAt);
    });
    return Array.from(map.values());
  }, [assignments, agentsById, clientById]);

  // ---------- KPI ----------
  const uniqueClientCount = useMemo(
    () => new Set(clients.map((c) => c.id)).size,
    [clients],
  );

  const activeAgentsCount = useMemo(
    () => buckets.filter((b) => b.primary.length + b.co.length > 0).length,
    [buckets],
  );

  const primaryAssignmentsCount = useMemo(
    () => assignments.filter((a) => a.isPrimary).length,
    [assignments],
  );

  const coAssignmentsCount = useMemo(
    () => assignments.filter((a) => !a.isPrimary).length,
    [assignments],
  );

  // ---------- Tri clients dans un bucket ----------
  const getClientSortDate = (client: ClientLite, assignedAt: string | null): number => {
    const candidates = [assignedAt, client.updated_at ?? null, client.created_at ?? null].filter(Boolean) as string[];
    if (candidates.length === 0) return 0;
    return new Date(candidates[0]!).getTime();
  };

  const sortClientList = (list: ClientLite[], dates: Map<string, string | null>): ClientLite[] => {
    const arr = [...list];
    arr.sort((a, b) => {
      const da = getClientSortDate(a, dates.get(a.id) ?? null);
      const db = getClientSortDate(b, dates.get(b.id) ?? null);
      return clientSortOrder === "desc" ? db - da : da - db;
    });
    return arr;
  };

  // ---------- Filtre par responsabilité + recherche ----------
  const filterBucketClients = (b: Bucket): { primary: ClientLite[]; co: ClientLite[] } => {
    const agentMatches = matchesAgentSearch(b.agent, searchTerm);

    const filterList = (list: ClientLite[]): ClientLite[] =>
      list.filter((c) => agentMatches || matchesClientSearch(c, searchTerm));

    const primary = responsibilityFilter === "co" ? [] : filterList(b.primary);
    const co = responsibilityFilter === "primary" ? [] : filterList(b.co);

    return {
      primary: sortClientList(primary, b.dates),
      co: sortClientList(co, b.dates),
    };
  };

  // ---------- Tri des buckets ----------
  const visibleBuckets = useMemo(() => {
    let list = buckets;
    if (selectedAgent !== "all") {
      list = list.filter((b) => b.agentId === selectedAgent);
    }

    // Appliquer filtres au préalable pour pouvoir masquer les buckets vides
    const enriched = list
      .map((b) => {
        const { primary, co } = filterBucketClients(b);
        return { bucket: b, primary, co };
      })
      .filter((x) => x.primary.length + x.co.length > 0);

    enriched.sort((a, b) => {
      // Buckets isUnknown toujours à la fin
      if (a.bucket.isUnknown !== b.bucket.isUnknown) {
        return a.bucket.isUnknown ? 1 : -1;
      }
      if (agentSort === "alpha") {
        return getAgentDisplayName(a.bucket.agent).localeCompare(
          getAgentDisplayName(b.bucket.agent),
          "fr",
        );
      }
      if (agentSort === "totalDesc") {
        const ta = a.bucket.primary.length + a.bucket.co.length;
        const tb = b.bucket.primary.length + b.bucket.co.length;
        if (tb !== ta) return tb - ta;
        return getAgentDisplayName(a.bucket.agent).localeCompare(
          getAgentDisplayName(b.bucket.agent),
          "fr",
        );
      }
      // principalDesc (défaut)
      if (b.bucket.primary.length !== a.bucket.primary.length) {
        return b.bucket.primary.length - a.bucket.primary.length;
      }
      const ta = a.bucket.primary.length + a.bucket.co.length;
      const tb = b.bucket.primary.length + b.bucket.co.length;
      if (tb !== ta) return tb - ta;
      return getAgentDisplayName(a.bucket.agent).localeCompare(
        getAgentDisplayName(b.bucket.agent),
        "fr",
      );
    });

    return enriched;
  }, [
    buckets,
    selectedAgent,
    responsibilityFilter,
    searchTerm,
    clientSortOrder,
    agentSort,
  ]);

  // ---------- Section "Sans agent" ----------
  const filteredClientsWithoutAgent = useMemo(
    () => clientsWithoutAgent.filter((c) => matchesClientSearch(c, searchTerm)),
    [clientsWithoutAgent, searchTerm],
  );

  const showWithoutAgentSection =
    filteredClientsWithoutAgent.length > 0 &&
    selectedAgent === "all" &&
    responsibilityFilter === "all";

  const sortedWithoutAgent = useMemo(
    () => sortClientList(filteredClientsWithoutAgent, new Map()),
    [filteredClientsWithoutAgent, clientSortOrder],
  );

  // ---------- Helpers ----------
  const goToClient = (clientId: string) => {
    navigate(`/admin/clients/${clientId}`);
  };

  const toggleAgentExpanded = (agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const formatDate = (d?: string | null) => (d ? formatSwissShortDate(d) : "—");

  // ---------- Rendu ----------
  const isEmpty =
    visibleBuckets.length === 0 && !showWithoutAgentSection;

  const hasFilters =
    selectedAgent !== "all" ||
    responsibilityFilter !== "all" ||
    searchTerm.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <PremiumKPICard
          title="Clients actifs"
          value={uniqueClientCount}
          icon={Users}
          subtitle="Tous agents confondus"
        />
        <PremiumKPICard
          title="Agents actifs"
          value={activeAgentsCount}
          icon={Briefcase}
          subtitle="Portefeuille en cours"
        />
        <PremiumKPICard
          title="Assignations principales"
          value={primaryAssignmentsCount}
          icon={Crown}
          variant="success"
          subtitle="Responsabilité directe"
        />
        <PremiumKPICard
          title="Co-assignations"
          value={coAssignmentsCount}
          icon={Handshake}
          subtitle="Support équipe"
        />
        {clientsWithoutAgent.length > 0 && (
          <PremiumKPICard
            title="Sans agent"
            value={clientsWithoutAgent.length}
            icon={UserX}
            variant="warning"
            subtitle="À traiter"
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Clients actifs = clients uniques. Assignations principales et co-assignations = relations agent-client.
      </p>

      {/* Filtres */}
      <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher client (nom, email, téléphone) ou agent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={selectedAgent} onValueChange={(v) => setSelectedAgent(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {getAgentDisplayName(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={clientSortOrder}
              onValueChange={(v) => setClientSortOrder(v as SortOrder)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Plus récent d'abord</SelectItem>
                <SelectItem value="asc">Plus ancien d'abord</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentSort} onValueChange={(v) => setAgentSort(v as AgentSort)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Ordre agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principalDesc">Plus de principaux</SelectItem>
                <SelectItem value="totalDesc">Plus grand portefeuille</SelectItem>
                <SelectItem value="alpha">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "all", label: "Tous" },
              { key: "primary", label: "Principaux" },
              { key: "co", label: "Co-assignés" },
            ] as { key: ResponsibilityFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setResponsibilityFilter(opt.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                responsibilityFilter === opt.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section sans agent */}
      {showWithoutAgentSection && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-warning/15 text-warning">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Clients sans agent assigné</h3>
                <p className="text-xs text-muted-foreground">
                  {filteredClientsWithoutAgent.length} client
                  {filteredClientsWithoutAgent.length > 1 ? "s" : ""} à traiter
                </p>
              </div>
            </div>
            {filteredClientsWithoutAgent.length > UNASSIGNED_INITIAL_LIMIT && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnassignedExpanded((v) => !v)}
              >
                {unassignedExpanded
                  ? "Réduire"
                  : `Voir tous (${filteredClientsWithoutAgent.length})`}
              </Button>
            )}
          </div>

          <ul className="divide-y divide-border/40">
            {(unassignedExpanded
              ? sortedWithoutAgent
              : sortedWithoutAgent.slice(0, UNASSIGNED_INITIAL_LIMIT)
            ).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-2.5 cursor-pointer hover:bg-warning/5 px-2 rounded-lg"
                onClick={() => goToClient(c.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {getClientDisplayName(c)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getClientDisplayEmail(c) ?? "—"}
                  </p>
                </div>
                <Badge variant="outline" className="border-warning/40 text-warning text-[10px]">
                  <UserX className="w-3 h-3 mr-1" />
                  Sans agent
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                  {formatDate(c.created_at)}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cartes agent */}
      {visibleBuckets.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibleBuckets.map(({ bucket, primary, co }) => {
            const total = primary.length + co.length;
            const expanded = expandedAgents.has(bucket.agentId);
            const merged: { client: ClientLite; isPrimary: boolean }[] = [
              ...primary.map((c) => ({ client: c, isPrimary: true })),
              ...co.map((c) => ({ client: c, isPrimary: false })),
            ];
            // Re-sort merged list by date
            merged.sort((a, b) => {
              const da = getClientSortDate(a.client, bucket.dates.get(a.client.id) ?? null);
              const db = getClientSortDate(b.client, bucket.dates.get(b.client.id) ?? null);
              return clientSortOrder === "desc" ? db - da : da - db;
            });
            const visibleClients = expanded
              ? merged
              : merged.slice(0, AGENT_INITIAL_LIMIT);

            // Determine primary agent for co-assigned clients display
            const primaryForClient = (clientId: string): AgentLite | null => {
              const links = clientAgentsByClient.get(clientId);
              if (links) {
                const p = links.find((l) => l.is_primary);
                if (p) return agentsById.get(p.agent_id) ?? null;
              }
              const c = clientById.get(clientId);
              if (c?.agent_id) return agentsById.get(c.agent_id) ?? null;
              return null;
            };

            return (
              <div
                key={bucket.agentId}
                className={cn(
                  "rounded-2xl border bg-card/80 backdrop-blur-xl p-4 md:p-5",
                  bucket.isUnknown
                    ? "border-dashed border-muted-foreground/30"
                    : "border-border/50",
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        "text-base font-semibold truncate",
                        bucket.isUnknown && "text-muted-foreground italic",
                      )}
                    >
                      {getAgentDisplayName(bucket.agent)}
                    </h3>
                    {bucket.agent?.profile?.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {bucket.agent.profile.email}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-foreground">
                        <strong className="tabular-nums">{primary.length}</strong> principaux
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground">
                        <strong className="tabular-nums">{co.length}</strong> co-assignés
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground">
                        <strong className="tabular-nums">{total}</strong> total
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="divide-y divide-border/40">
                  {visibleClients.map(({ client, isPrimary }) => {
                    const principal = !isPrimary ? primaryForClient(client.id) : null;
                    const date =
                      bucket.dates.get(client.id) ??
                      client.updated_at ??
                      client.created_at ??
                      null;
                    return (
                      <li
                        key={`${client.id}-${isPrimary ? "p" : "c"}`}
                        className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/40 px-2 rounded-lg"
                        onClick={() => goToClient(client.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {getClientDisplayName(client)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {!isPrimary && principal && (
                              <>Co-assigné avec {getAgentFirstName(principal)}</>
                            )}
                            {!isPrimary && !principal && <>Co-assigné</>}
                            {isPrimary && (getClientDisplayEmail(client) ?? "—")}
                          </p>
                        </div>
                        {isPrimary ? (
                          <Badge className="bg-primary/15 text-primary border-0 text-[10px]">
                            <Crown className="w-3 h-3 mr-1" />
                            Principal
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <Users className="w-3 h-3 mr-1" />
                            Co-assigné
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                          {formatDate(date)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </li>
                    );
                  })}
                </ul>

                {merged.length > AGENT_INITIAL_LIMIT && (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => toggleAgentExpanded(bucket.agentId)}
                    >
                      {expanded
                        ? "Réduire"
                        : `Voir tous (${merged.length})`}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty states */}
      {isEmpty && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
          {hasFilters ? (
            <>
              <h3 className="text-sm font-semibold">
                Aucun client ne correspond à ces filtres.
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Modifiez l'agent, le type d'assignation ou la recherche.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold">
                Aucun client assigné pour le moment.
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Les portefeuilles agents apparaîtront ici dès qu'un client sera assigné.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ClientsByAgentView;
