import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function ConclureAffaire() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [agent, setAgent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: '',
    adresse: '',
    loyerMensuel: '',
    surface: '',
    pieces: '',
    dateConclusion: new Date().toISOString().split('T')[0],
    commentaires: '',
  });

  useEffect(() => {
    if (!user || userRole !== 'agent') {
      navigate('/login');
      return;
    }
    
    loadData();
  }, [user, userRole, navigate]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Récupérer l'agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!agentData) {
        toast({
          title: "Erreur",
          description: "Profil agent non trouvé",
          variant: "destructive",
        });
        navigate('/agent');
        return;
      }
      
      setAgent(agentData);

      // Récupérer les clients assignés à cet agent
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('agent_id', agentData.id)
        .eq('statut', 'actif');
      
      setClients(clientsData || []);

      // Récupérer les profils des clients
      if (clientsData && clientsData.length > 0) {
        const clientUserIds = clientsData.map(c => c.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, prenom, nom')
          .in('id', clientUserIds);
        
        if (profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p]));
          setProfiles(profilesMap);
        }
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const client = clients.find(c => c.id === formData.clientId);
      if (!client) {
        throw new Error('Client non trouvé');
      }

      const loyerMensuel = parseFloat(formData.loyerMensuel);
      const montantTotal = loyerMensuel * 12; // Loyer annuel
      const commissionTotale = loyerMensuel; // 1 mois de loyer
      const splitAgent = client.commission_split || 50;
      const partAgent = Math.round(commissionTotale * (splitAgent / 100));
      const partAgence = commissionTotale - partAgent;

      // Insérer la transaction
      const { error } = await supabase
        .from('transactions')
        .insert({
          client_id: formData.clientId,
          agent_id: agent.id,
          montant_total: montantTotal,
          commission_totale: commissionTotale,
          part_agent: partAgent,
          part_agence: partAgence,
          statut: 'conclue',
          date_transaction: formData.dateConclusion,
        });

      if (error) throw error;

      // Optionnellement créer une offre pour tracer l'historique
      await supabase
        .from('offres')
        .insert({
          client_id: formData.clientId,
          agent_id: agent.id,
          adresse: formData.adresse,
          prix: loyerMensuel,
          surface: parseFloat(formData.surface) || null,
          pieces: parseFloat(formData.pieces) || null,
          commentaires: formData.commentaires,
          statut: 'acceptee',
          date_envoi: formData.dateConclusion,
        });

      toast({
        title: "Affaire conclue !",
        description: `Transaction enregistrée. Votre commission: ${partAgent.toLocaleString()} CHF`,
      });

      navigate('/agent');
    } catch (error: any) {
      console.error('Erreur création transaction:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la transaction",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/agent')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Conclure une affaire</h1>
            <p className="text-muted-foreground mt-1">Enregistrez une transaction conclue</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Détails de la transaction</CardTitle>
            <CardDescription>
              Remplissez les informations du bien trouvé pour le client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sélection du client */}
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => {
                      const profile = profiles.get(client.user_id);
                      const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client';
                      return (
                        <SelectItem key={client.id} value={client.id}>
                          {clientName} - {client.commission_split || 50}% split
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Détails du bien */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="adresse">Adresse du bien *</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Rue de la Paix 12, 1202 Genève"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loyerMensuel">Loyer mensuel brut (CHF) *</Label>
                  <Input
                    id="loyerMensuel"
                    type="number"
                    step="0.01"
                    value={formData.loyerMensuel}
                    onChange={(e) => setFormData({ ...formData, loyerMensuel: e.target.value })}
                    placeholder="2500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateConclusion">Date de conclusion *</Label>
                  <Input
                    id="dateConclusion"
                    type="date"
                    value={formData.dateConclusion}
                    onChange={(e) => setFormData({ ...formData, dateConclusion: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surface">Surface (m²)</Label>
                  <Input
                    id="surface"
                    type="number"
                    step="0.1"
                    value={formData.surface}
                    onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                    placeholder="75"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pieces">Nombre de pièces</Label>
                  <Input
                    id="pieces"
                    type="number"
                    step="0.5"
                    value={formData.pieces}
                    onChange={(e) => setFormData({ ...formData, pieces: e.target.value })}
                    placeholder="3.5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commentaires">Commentaires</Label>
                <Textarea
                  id="commentaires"
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                  placeholder="Notes additionnelles sur la transaction..."
                  rows={4}
                />
              </div>

              {/* Aperçu des commissions */}
              {formData.clientId && formData.loyerMensuel && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4">Aperçu des commissions</h3>
                    <div className="space-y-3">
                      {(() => {
                        const client = clients.find(c => c.id === formData.clientId);
                        const loyerMensuel = parseFloat(formData.loyerMensuel);
                        const montantTotal = loyerMensuel * 12;
                        const commissionTotale = loyerMensuel;
                        const splitAgent = client?.commission_split || 50;
                        const partAgent = Math.round(commissionTotale * (splitAgent / 100));
                        const partAgence = commissionTotale - partAgent;

                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Loyer annuel:</span>
                              <span className="font-semibold">{montantTotal.toLocaleString()} CHF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commission totale (1 mois):</span>
                              <span className="font-semibold">{commissionTotale.toLocaleString()} CHF</span>
                            </div>
                            <div className="flex justify-between text-success">
                              <span>Votre part ({splitAgent}%):</span>
                              <span className="font-bold">{partAgent.toLocaleString()} CHF</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Part agence ({100 - splitAgent}%):</span>
                              <span>{partAgence.toLocaleString()} CHF</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/agent')}
                  disabled={submitting}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Enregistrement...' : 'Conclure l\'affaire'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
