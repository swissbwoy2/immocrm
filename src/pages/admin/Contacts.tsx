import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { ContactCard } from "@/components/contacts/ContactCard";
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

  // Filtered and sorted contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Filter by agent
    if (agentFilter !== "all") {
      result = result.filter((c) => c.agent_id === agentFilter);
    }

    // Filter by search
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

    // Filter by type
    if (typeFilter !== "all") {
      result = result.filter((c) => c.contact_type === typeFilter);
    }

    // Filter favorites
    if (showFavoritesOnly) {
      result = result.filter((c) => c.is_favorite);
    }

    // Sort
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
    setFormOpen(true);
  };

  // Stats
  const totalContacts = contacts.length;
  const contactsByAgent = agents.map((agent) => ({
    agent,
    count: contacts.filter((c) => c.agent_id === agent.id).length,
  }));

  return (
    <div className="flex flex-col h-full">
      <PremiumPageHeader
        title="Tous les Contacts"
        subtitle={`${totalContacts} contact${totalContacts > 1 ? "s" : ""} au total`}
        icon={Users}
        action={
          <Button onClick={handleNewContact}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contact
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[220px]">
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

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun contact trouvé</p>
            <p className="text-sm">
              {search || typeFilter !== "all" || agentFilter !== "all"
                ? "Essayez de modifier vos filtres"
                : "Aucun contact n'a encore été créé"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={handleEdit}
                onDelete={setDeleteContact}
                onToggleFavorite={handleToggleFavorite}
                showAgent
                agentName={getAgentName(contact.agent_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog with agent selection for admin */}
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

      {/* Agent selection dialog for new contact */}
      {formOpen && !editingContact && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Sélectionner l'agent</h3>
            <Select
              value={selectedAgentForCreate}
              onValueChange={setSelectedAgentForCreate}
            >
              <SelectTrigger>
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
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  setSelectedAgentForCreate("");
                }}
              >
                Annuler
              </Button>
              <Button
                disabled={!selectedAgentForCreate}
                onClick={() => {
                  // Keep the form open but close the agent selection
                  // The form will use selectedAgentForCreate
                }}
              >
                Continuer
              </Button>
            </div>
          </div>
        </div>
      )}

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
