import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Users, Home, Briefcase, HardHat, UserCheck, Contact as ContactIcon, UserCog } from "lucide-react";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumKPICard } from "@/components/premium/PremiumKPICard";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";
import { PremiumContactCard } from "@/components/contacts/PremiumContactCard";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { ContactFilters, SortOption } from "@/components/contacts/ContactFilters";
import { Contact, ContactType } from "@/components/contacts/contactTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  user_id: string;
  profile?: {
    prenom: string;
    nom: string;
    email: string;
  };
}

export default function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAgentForCreate, setSelectedAgentForCreate] = useState<string>("");
  const [agentSelectDialogOpen, setAgentSelectDialogOpen] = useState(false);

  // Delete state
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "all">("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("nom_asc");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      const { data, error } = await supabase
        .from("agents")
        .select(`
          id,
          user_id,
          profiles:user_id (prenom, nom, email)
        `)
        .eq("statut", "actif");

      if (!error && data) {
        const formattedAgents = data.map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          profile: a.profiles,
        }));
        setAgents(formattedAgents);
      }
    };
    fetchAgents();
  }, []);

  // Fetch all contacts
  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("nom", { ascending: true });

    if (error) {
      toast.error("Erreur lors du chargement des contacts");
    } else {
      setContacts((data as Contact[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Get agent name
  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent?.profile) {
      return `${agent.profile.prenom} ${agent.profile.nom}`;
    }
    return "Agent inconnu";
  };

  // KPI stats
  const stats = useMemo(() => {
    return {
      total: contacts.length,
      proprietaires: contacts.filter((c) => c.contact_type === "proprietaire").length,
      gerants: contacts.filter((c) => c.contact_type === "gerant_regie").length,
      concierges: contacts.filter((c) => c.contact_type === "concierge").length,
      clients: contacts.filter((c) => c.contact_type === "client_potentiel").length,
      agentsCount: new Set(contacts.map((c) => c.agent_id)).size,
    };
  }, [contacts]);

  // Filtered and sorted contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    if (agentFilter !== "all") {
      result = result.filter((c) => c.agent_id === agentFilter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.nom.toLowerCase().includes(searchLower) ||
          c.prenom?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.telephone?.includes(search) ||
          c.entreprise?.toLowerCase().includes(searchLower)
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((c) => c.contact_type === typeFilter);
    }

    if (showFavoritesOnly) {
      result = result.filter((c) => c.is_favorite);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "nom_asc":
          return a.nom.localeCompare(b.nom);
        case "nom_desc":
          return b.nom.localeCompare(a.nom);
        case "created_at_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "created_at_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, search, typeFilter, agentFilter, sortBy, showFavoritesOnly]);

  // Create or update contact
  const handleSubmit = async (data: Partial<Contact>) => {
    setSubmitting(true);

    try {
      if (editingContact) {
        const { error } = await supabase
          .from("contacts")
          .update({
            contact_type: data.contact_type,
            civilite: data.civilite,
            prenom: data.prenom,
            nom: data.nom,
            email: data.email,
            telephone: data.telephone,
            telephone_secondaire: data.telephone_secondaire,
            adresse: data.adresse,
            code_postal: data.code_postal,
            ville: data.ville,
            entreprise: data.entreprise,
            fonction: data.fonction,
            notes: data.notes,
            tags: data.tags,
            is_favorite: data.is_favorite,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingContact.id);

        if (error) throw error;
        toast.success("Contact modifié avec succès");
      } else {
        if (!selectedAgentForCreate) {
          toast.error("Veuillez sélectionner un agent");
          setSubmitting(false);
          return;
        }

        const { error } = await supabase.from("contacts").insert({
          agent_id: selectedAgentForCreate,
          contact_type: data.contact_type!,
          civilite: data.civilite,
          prenom: data.prenom,
          nom: data.nom!,
          email: data.email,
          telephone: data.telephone,
          telephone_secondaire: data.telephone_secondaire,
          adresse: data.adresse,
          code_postal: data.code_postal,
          ville: data.ville,
          entreprise: data.entreprise,
          fonction: data.fonction,
          notes: data.notes,
          tags: data.tags,
          is_favorite: data.is_favorite,
        });

        if (error) throw error;
        toast.success("Contact créé avec succès");
      }

      setFormOpen(false);
      setEditingContact(null);
      setSelectedAgentForCreate("");
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete contact
  const handleDelete = async () => {
    if (!deleteContact) return;

    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", deleteContact.id);

      if (error) throw error;
      toast.success("Contact supprimé");
      setDeleteContact(null);
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (contact: Contact) => {
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ is_favorite: !contact.is_favorite })
        .eq("id", contact.id);

      if (error) throw error;
      fetchContacts();
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleNewContact = () => {
    setEditingContact(null);
    setSelectedAgentForCreate("");
    setAgentSelectDialogOpen(true);
  };

  const handleAgentSelected = () => {
    if (selectedAgentForCreate) {
      setAgentSelectDialogOpen(false);
      setFormOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PremiumPageHeader
        title="Tous les Contacts"
        subtitle="Vue globale des contacts de tous les agents"
        icon={Users}
        action={
          <Button onClick={handleNewContact} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau contact
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <PremiumKPICard
            title="Total"
            value={stats.total}
            icon={Users}
            delay={0}
          />
          <PremiumKPICard
            title="Agents actifs"
            value={stats.agentsCount}
            icon={UserCog}
            delay={50}
          />
          <PremiumKPICard
            title="Propriétaires"
            value={stats.proprietaires}
            icon={Home}
            variant="success"
            delay={100}
          />
          <PremiumKPICard
            title="Gérants"
            value={stats.gerants}
            icon={Briefcase}
            delay={150}
          />
          <PremiumKPICard
            title="Concierges"
            value={stats.concierges}
            icon={HardHat}
            variant="warning"
            delay={200}
          />
          <PremiumKPICard
            title="Clients potentiels"
            value={stats.clients}
            icon={UserCheck}
            variant="danger"
            delay={250}
          />
        </div>

        {/* Agent filter + Filters */}
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-card/60 backdrop-blur-xl border border-border/50 p-4 animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Agent :</span>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-[220px] bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Filtrer par agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les agents</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.profile
                        ? `${agent.profile.prenom} ${agent.profile.nom}`
                        : agent.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agentFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAgentFilter("all")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>

          <ContactFilters
            search={search}
            onSearchChange={setSearch}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            showFavoritesOnly={showFavoritesOnly}
            onShowFavoritesOnlyChange={setShowFavoritesOnly}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <PremiumEmptyState
            icon={ContactIcon}
            title="Aucun contact trouvé"
            description={
              search || typeFilter !== "all" || agentFilter !== "all" || showFavoritesOnly
                ? "Essayez de modifier vos filtres de recherche"
                : "Aucun contact n'a encore été créé par les agents"
            }
            action={
              !search && typeFilter === "all" && agentFilter === "all" && !showFavoritesOnly && (
                <Button onClick={handleNewContact} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter un contact
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact, index) => (
              <div key={contact.id} className="relative">
                <PremiumContactCard
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={setDeleteContact}
                  onToggleFavorite={handleToggleFavorite}
                  delay={index * 30}
                />
                {/* Agent badge overlay */}
                <div className="absolute top-2 right-12 px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm">
                  {getAgentName(contact.agent_id)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent selection dialog */}
      <Dialog open={agentSelectDialogOpen} onOpenChange={setAgentSelectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sélectionner l'agent</DialogTitle>
            <DialogDescription>
              Choisissez l'agent auquel ce contact sera associé
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedAgentForCreate}
              onValueChange={setSelectedAgentForCreate}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.profile
                      ? `${agent.profile.prenom} ${agent.profile.nom}`
                      : agent.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAgentSelectDialogOpen(false);
                setSelectedAgentForCreate("");
              }}
            >
              Annuler
            </Button>
            <Button
              disabled={!selectedAgentForCreate}
              onClick={handleAgentSelected}
            >
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContactFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingContact(null);
            setSelectedAgentForCreate("");
          }
        }}
        onSubmit={handleSubmit}
        contact={editingContact}
        isLoading={submitting}
      />

      <AlertDialog
        open={!!deleteContact}
        onOpenChange={(open) => !open && setDeleteContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contact ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contact{" "}
              <strong>{deleteContact?.nom}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
