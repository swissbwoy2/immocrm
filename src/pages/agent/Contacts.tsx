import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Users, Home, Briefcase, HardHat, UserCheck, Contact as ContactIcon } from "lucide-react";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumKPICard } from "@/components/premium/PremiumKPICard";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";
import { PremiumContactCard } from "@/components/contacts/PremiumContactCard";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { ContactFilters, SortOption } from "@/components/contacts/ContactFilters";
import { Contact, ContactType } from "@/components/contacts/contactTypes";
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
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("nom_asc");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Fetch agent ID
  useEffect(() => {
    const fetchAgentId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (data) setAgentId(data.id);
    };
    fetchAgentId();
  }, [user]);

  // Fetch contacts
  const fetchContacts = async () => {
    if (!agentId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("agent_id", agentId)
      .order("nom", { ascending: true });

    if (error) {
      toast.error("Erreur lors du chargement des contacts");
    } else {
      setContacts((data as Contact[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (agentId) fetchContacts();
  }, [agentId]);

  // KPI stats
  const stats = useMemo(() => {
    return {
      total: contacts.length,
      proprietaires: contacts.filter((c) => c.contact_type === "proprietaire").length,
      gerants: contacts.filter((c) => c.contact_type === "gerant_regie").length,
      concierges: contacts.filter((c) => c.contact_type === "concierge").length,
      clients: contacts.filter((c) => c.contact_type === "client_potentiel").length,
    };
  }, [contacts]);

  // Filtered and sorted contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

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
  }, [contacts, search, typeFilter, sortBy, showFavoritesOnly]);

  // Create or update contact
  const handleSubmit = async (data: Partial<Contact>) => {
    if (!agentId) return;
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
        const { error } = await supabase.from("contacts").insert({
          agent_id: agentId,
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

  return (
    <div className="relative flex flex-col h-full">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <PremiumPageHeader
        title="Mes Contacts"
        subtitle="Gérez votre carnet d'adresses professionnel"
        icon={Users}
        action={
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau contact
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <PremiumKPICard
            title="Total"
            value={stats.total}
            icon={Users}
            delay={0}
          />
          <PremiumKPICard
            title="Propriétaires"
            value={stats.proprietaires}
            icon={Home}
            variant="success"
            delay={50}
          />
          <PremiumKPICard
            title="Gérants"
            value={stats.gerants}
            icon={Briefcase}
            delay={100}
          />
          <PremiumKPICard
            title="Concierges"
            value={stats.concierges}
            icon={HardHat}
            variant="warning"
            delay={150}
          />
          <PremiumKPICard
            title="Clients potentiels"
            value={stats.clients}
            icon={UserCheck}
            variant="danger"
            delay={200}
          />
        </div>

        {/* Filters */}
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
              search || typeFilter !== "all" || showFavoritesOnly
                ? "Essayez de modifier vos filtres de recherche"
                : "Commencez par ajouter votre premier contact professionnel"
            }
            action={
              !search && typeFilter === "all" && !showFavoritesOnly && (
                <Button onClick={() => setFormOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter un contact
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact, index) => (
              <PremiumContactCard
                key={contact.id}
                contact={contact}
                onEdit={handleEdit}
                onDelete={setDeleteContact}
                onToggleFavorite={handleToggleFavorite}
                delay={index * 50}
              />
            ))}
          </div>
        )}
      </div>

      <ContactFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingContact(null);
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
