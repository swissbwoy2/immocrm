import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Users, Home, Mail, CheckCircle } from "lucide-react";
import { ClientMultiSelect } from "@/components/ClientMultiSelect";
import { useAuth } from "@/contexts/AuthContext";

interface Client {
  id: string;
  user_id: string;
  profiles?: {
    prenom: string;
    nom: string;
    email: string;
  } | null;
}

interface Offre {
  id: string;
  adresse: string;
  prix: number;
  pieces?: number | null;
  type_bien?: string | null;
}

export default function DeposerCandidature() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedOffreId, setSelectedOffreId] = useState<string>("");
  const [deposerCandidature, setDeposerCandidature] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (agentData) {
        setAgentId(agentData.id);

        // Load clients assigned to this agent
        const { data: clientsData } = await supabase
          .from('clients')
          .select(`
            id,
            user_id,
            profiles:user_id (
              prenom,
              nom,
              email
            )
          `)
          .eq('agent_id', agentData.id)
          .eq('statut', 'actif');

        if (clientsData) {
          setClients(clientsData as Client[]);
        }

        // Load offers sent by this agent
        const { data: offresData } = await supabase
          .from('offres')
          .select('id, adresse, prix, pieces, type_bien')
          .eq('agent_id', agentData.id)
          .order('created_at', { ascending: false });

        if (offresData) {
          setOffres(offresData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update subject when offer is selected
  useEffect(() => {
    if (selectedOffreId && selectedClientIds.length > 0) {
      const offre = offres.find(o => o.id === selectedOffreId);
      const clientNames = selectedClientIds
        .map(id => {
          const client = clients.find(c => c.id === id);
          return client?.profiles ? `${client.profiles.prenom} ${client.profiles.nom}` : '';
        })
        .filter(Boolean)
        .join(', ');
      
      if (offre) {
        setSubject(`Candidature${selectedClientIds.length > 1 ? 's' : ''} - ${offre.adresse} - ${clientNames}`);
      }
    }
  }, [selectedOffreId, selectedClientIds, offres, clients]);

  const handleSubmit = async () => {
    if (!deposerCandidature) {
      toast({
        title: "Erreur",
        description: "Veuillez cocher 'Déposer une candidature'",
        variant: "destructive",
      });
      return;
    }

    if (selectedClientIds.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un client",
        variant: "destructive",
      });
      return;
    }

    if (!selectedOffreId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une offre",
        variant: "destructive",
      });
      return;
    }

    if (!recipientEmail || !subject || !bodyHtml) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs de l'email",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Send email first
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: subject,
          body_html: bodyHtml,
        },
      });

      if (emailError) throw emailError;
      if (!emailResult?.success) throw new Error(emailResult?.error || "Erreur d'envoi");

      // Create candidature for each selected client
      let successCount = 0;
      for (const clientId of selectedClientIds) {
        const { error: candidatureError } = await supabase
          .from('candidatures')
          .insert({
            offre_id: selectedOffreId,
            client_id: clientId,
            statut: 'en_attente',
            dossier_complet: true,
            date_depot: new Date().toISOString(),
            message_client: bodyHtml,
          });

        if (!candidatureError) {
          successCount++;
          
          // Get client user_id for notification
          const client = clients.find(c => c.id === clientId);
          if (client) {
            // Create notification for the client
            await supabase.from('notifications').insert({
              user_id: client.user_id,
              type: 'candidature_deposee',
              title: 'Dossier déposé',
              message: `Votre agent a déposé votre dossier à la régie pour l'offre.`,
              link: '/client/mes-candidatures',
            });
          }
        } else {
          console.error('Error creating candidature for client:', clientId, candidatureError);
        }
      }

      toast({
        title: "Candidatures déposées",
        description: `${successCount} dossier(s) déposé(s) avec succès. Email envoyé à ${recipientEmail}.`,
      });

      // Reset form
      setSelectedClientIds([]);
      setSelectedOffreId("");
      setRecipientEmail("");
      setRecipientName("");
      setSubject("");
      setBodyHtml("");
    } catch (error: any) {
      console.error('Error submitting candidatures:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de déposer les candidatures",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedOffre = offres.find(o => o.id === selectedOffreId);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Déposer une candidature</h1>
        <p className="text-muted-foreground">
          Envoyez les dossiers de vos clients à la régie
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Confirm deposit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deposer"
                checked={deposerCandidature}
                onCheckedChange={(checked) => setDeposerCandidature(checked === true)}
              />
              <Label htmlFor="deposer" className="font-medium">
                Je souhaite déposer une candidature à la régie
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sélectionner les clients
            </CardTitle>
            <CardDescription>
              Sélectionnez un ou plusieurs clients pour cette candidature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientMultiSelect
              clients={clients}
              selectedClientIds={selectedClientIds}
              onSelectionChange={setSelectedClientIds}
            />
            {selectedClientIds.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedClientIds.length} client(s) sélectionné(s)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Select offer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Sélectionner l'offre
            </CardTitle>
            <CardDescription>
              Choisissez l'offre pour laquelle déposer la candidature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedOffreId} onValueChange={setSelectedOffreId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une offre" />
              </SelectTrigger>
              <SelectContent>
                {offres.map((offre) => (
                  <SelectItem key={offre.id} value={offre.id}>
                    {offre.adresse} - {offre.pieces} pièces - CHF {offre.prix.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOffre && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedOffre.adresse}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOffre.type_bien} • {selectedOffre.pieces} pièces • CHF {selectedOffre.prix.toLocaleString()}/mois
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Email to régie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email à la régie
            </CardTitle>
            <CardDescription>
              Composez l'email qui sera envoyé à la régie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_email">Email de la régie *</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  placeholder="regie@example.ch"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient_name">Nom de la régie</Label>
                <Input
                  id="recipient_name"
                  placeholder="Régie XYZ"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Objet *</Label>
              <Input
                id="subject"
                placeholder="Candidature - [Adresse] - [Client]"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                placeholder="Madame, Monsieur,&#10;&#10;Je me permets de vous transmettre le dossier de candidature de mon/ma client(e)..."
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={8}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !deposerCandidature || selectedClientIds.length === 0 || !selectedOffreId}
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer et créer {selectedClientIds.length} candidature(s)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
