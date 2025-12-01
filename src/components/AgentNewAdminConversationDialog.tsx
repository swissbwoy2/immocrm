import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, MessageSquarePlus, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Admin {
  id: string;
  prenom: string;
  nom: string;
  email: string;
}

interface AgentNewAdminConversationDialogProps {
  agentId: string;
  onConversationCreated: (conversationId: string) => void;
}

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export function AgentNewAdminConversationDialog({ agentId, onConversationCreated }: AgentNewAdminConversationDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAdmins();
    }
  }, [open]);

  const loadAdmins = async () => {
    try {
      setLoading(true);

      // Get all admin user_ids from user_roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = adminRoles?.map(r => r.user_id) || [];

      if (adminUserIds.length === 0) {
        setAdmins([]);
        return;
      }

      // Get profiles for admins
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', adminUserIds);

      if (profilesError) throw profilesError;

      setAdmins(profilesData || []);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les administrateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async (admin: Admin) => {
    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('agent_id', agentId)
        .eq('admin_user_id', admin.id)
        .eq('conversation_type', 'admin-agent')
        .single();

      if (existingConv) {
        toast({
          title: "Conversation existante",
          description: "Une conversation existe déjà avec cet administrateur",
          variant: "default",
        });
        setOpen(false);
        onConversationCreated(existingConv.id);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentId,
          client_id: null,
          admin_user_id: admin.id,
          subject: `Discussion avec ${admin.prenom} ${admin.nom}`,
          last_message_at: new Date().toISOString(),
          conversation_type: 'admin-agent',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Conversation créée",
        description: `Conversation avec ${admin.prenom} ${admin.nom} créée avec succès`,
      });

      setOpen(false);
      onConversationCreated(data.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la conversation",
        variant: "destructive",
      });
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const searchTerm = removeAccents(searchQuery.toLowerCase());
    const fullName = removeAccents(`${admin.prenom} ${admin.nom}`.toLowerCase());
    return fullName.includes(searchTerm);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Shield className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Contacter Admin</span>
          <span className="sm:hidden">Admin</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contacter un administrateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un administrateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <ScrollArea className="h-[350px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun administrateur trouvé
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAdmins.map((admin) => (
                  <Button
                    key={admin.id}
                    variant="outline"
                    className="w-full justify-start flex-col items-start h-auto py-3"
                    onClick={() => handleCreateConversation(admin)}
                  >
                    <span className="font-medium">{admin.prenom} {admin.nom}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Administrateur
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}