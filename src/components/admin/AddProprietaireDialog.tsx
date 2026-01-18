import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Agent {
  id: string;
  profiles: {
    prenom: string;
    nom: string;
  };
}

interface AddProprietaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddProprietaireDialog = ({ open, onOpenChange, onSuccess }: AddProprietaireDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    prenom: "",
    nom: "",
    telephone: "",
    civilite: "",
    adresse: "",
    code_postal: "",
    ville: "",
    canton: "",
    agent_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open]);

  const fetchAgents = async () => {
    const { data: agentsData } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('statut', 'actif');

    if (agentsData) {
      const userIds = agentsData.map(a => a.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, prenom, nom')
        .in('id', userIds);

      const merged = agentsData.map(agent => ({
        id: agent.id,
        profiles: profilesData?.find(p => p.id === agent.user_id) || { prenom: '', nom: '' }
      }));

      setAgents(merged);
    }
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.prenom || !formData.nom) {
      toast({
        title: "Erreur",
        description: "Email, prénom et nom sont requis",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('invite-proprietaire', {
        body: {
          email: formData.email,
          prenom: formData.prenom,
          nom: formData.nom,
          telephone: formData.telephone || undefined,
          civilite: formData.civilite || undefined,
          adresse: formData.adresse || undefined,
          code_postal: formData.code_postal || undefined,
          ville: formData.ville || undefined,
          canton: formData.canton || undefined,
          agent_id: formData.agent_id && formData.agent_id !== 'none' ? formData.agent_id : undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Invitation envoyée à ${formData.email}`,
      });

      setFormData({
        email: "",
        prenom: "",
        nom: "",
        telephone: "",
        civilite: "",
        adresse: "",
        code_postal: "",
        ville: "",
        canton: "",
        agent_id: "",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'envoi de l'invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cantons = [
    "Genève", "Vaud", "Valais", "Neuchâtel", "Fribourg", "Jura", 
    "Berne", "Zurich", "Bâle-Ville", "Bâle-Campagne", "Argovie", "Autre"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inviter un propriétaire</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Civilité + Prénom + Nom */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Civilité</Label>
              <Select
                value={formData.civilite}
                onValueChange={(value) => setFormData({ ...formData, civilite: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M.">M.</SelectItem>
                  <SelectItem value="Mme">Mme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prénom *</Label>
              <Input
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Jean"
              />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Dupont"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jean.dupont@email.com"
            />
          </div>

          {/* Téléphone */}
          <div>
            <Label>Téléphone</Label>
            <Input
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              placeholder="+41 79 123 45 67"
            />
          </div>

          {/* Adresse */}
          <div>
            <Label>Adresse</Label>
            <Input
              value={formData.adresse}
              onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              placeholder="Rue du Marché 15"
            />
          </div>

          {/* Code postal + Ville */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Code postal</Label>
              <Input
                value={formData.code_postal}
                onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                placeholder="1000"
              />
            </div>
            <div>
              <Label>Ville</Label>
              <Input
                value={formData.ville}
                onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                placeholder="Lausanne"
              />
            </div>
          </div>

          {/* Canton */}
          <div>
            <Label>Canton</Label>
            <Select
              value={formData.canton}
              onValueChange={(value) => setFormData({ ...formData, canton: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un canton" />
              </SelectTrigger>
              <SelectContent>
                {cantons.map((canton) => (
                  <SelectItem key={canton} value={canton}>{canton}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent assigné */}
          <div>
            <Label>Agent assigné</Label>
            <Select
              value={formData.agent_id}
              onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun agent</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.profiles.prenom} {agent.profiles.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Envoyer l'invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddProprietaireDialog;
