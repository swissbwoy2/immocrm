import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  // Filtered and sorted contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

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
    <div className="flex flex-col h-full">
      <PremiumPageHeader
        title="Mes Contacts"
        subtitle="Gérez votre carnet d'adresses professionnel"
        icon={Users}
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contact
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
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

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun contact trouvé</p>
            <p className="text-sm">
              {search || typeFilter !== "all"
                ? "Essayez de modifier vos filtres"
                : "Commencez par ajouter un nouveau contact"}
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
