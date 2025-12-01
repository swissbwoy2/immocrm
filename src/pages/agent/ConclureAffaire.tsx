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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, User, Building2, Banknote, Building, Calendar, FileText, Home, Key } from 'lucide-react';
import { ClientTypeBadge } from '@/components/ClientTypeBadge';

const TYPES_BIEN = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison' },
  { value: 'studio', label: 'Studio' },
  { value: 'villa', label: 'Villa' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'loft', label: 'Loft' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'attique', label: 'Attique' },
];

const TAUX_COMMISSION_ACHAT = 0.03; // 3% du prix de vente par défaut

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
    // Client
    clientId: '',
    // Type de transaction
    typeTransaction: 'location' as 'location' | 'achat',
    // Informations du bien
    adresse: '',
    typeBien: '',
    surface: '',
    pieces: '',
    etage: '',
    // Informations financières
    loyerMensuel: '',
    prixVente: '',
    tauxCommission: '3',
    dateConclusion: new Date().toISOString().split('T')[0],
    // Informations de la régie
    regieNom: '',
    regieContact: '',
    regieTelephone: '',
    regieEmail: '',
    // Dates du bail
    dateDebutBail: '',
    dateEtatLieux: '',
    etatLieuxADefinir: false,
    // Notes
    notesInternes: '',
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

      const isAchat = formData.typeTransaction === 'achat';
      
      let montantTotal: number;
      let commissionTotale: number;
      
      if (isAchat) {
        const prixVente = parseFloat(formData.prixVente);
        const tauxCommission = parseFloat(formData.tauxCommission) / 100;
        montantTotal = prixVente;
        commissionTotale = Math.round(prixVente * tauxCommission);
      } else {
        const loyerMensuel = parseFloat(formData.loyerMensuel);
        montantTotal = loyerMensuel * 12; // Loyer annuel
        commissionTotale = loyerMensuel; // 1 mois de loyer
      }

      const splitAgent = client.commission_split || 50;
      const partAgent = Math.round(commissionTotale * (splitAgent / 100));
      const partAgence = commissionTotale - partAgent;

      // Insérer la transaction avec toutes les nouvelles colonnes
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
          // Nouvelles colonnes
          adresse: formData.adresse,
          surface: formData.surface ? parseFloat(formData.surface) : null,
          pieces: formData.pieces ? parseFloat(formData.pieces) : null,
          type_bien: formData.typeBien || null,
          etage: formData.etage || null,
          regie_nom: formData.regieNom || null,
          regie_contact: formData.regieContact || null,
          regie_telephone: formData.regieTelephone || null,
          regie_email: formData.regieEmail || null,
          date_debut_bail: formData.dateDebutBail || null,
          date_etat_lieux: formData.etatLieuxADefinir ? null : (formData.dateEtatLieux || null),
          etat_lieux_confirme: !formData.etatLieuxADefinir && !!formData.dateEtatLieux,
          notes_internes: formData.notesInternes || null,
        });

      if (error) throw error;

      // Optionnellement créer une offre pour tracer l'historique
      await supabase
        .from('offres')
        .insert({
          client_id: formData.clientId,
          agent_id: agent.id,
          adresse: formData.adresse,
          prix: isAchat ? parseFloat(formData.prixVente) : parseFloat(formData.loyerMensuel),
          surface: parseFloat(formData.surface) || null,
          pieces: parseFloat(formData.pieces) || null,
          type_bien: formData.typeBien || null,
          etage: formData.etage || null,
          commentaires: formData.notesInternes,
          statut: 'acceptee',
          date_envoi: formData.dateConclusion,
        });

      toast({
        title: "Affaire conclue !",
        description: `Transaction ${isAchat ? 'd\'achat' : 'de location'} enregistrée. Votre commission: ${partAgent.toLocaleString()} CHF`,
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

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const isAchat = formData.typeTransaction === 'achat';

  // Auto-set transaction type based on client
  useEffect(() => {
    if (selectedClient) {
      const clientIsAcheteur = selectedClient.type_recherche === 'Acheter';
      setFormData(prev => ({
        ...prev,
        typeTransaction: clientIsAcheteur ? 'achat' : 'location'
      }));
    }
  }, [selectedClient]);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/agent')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Conclure une affaire</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Enregistrez une transaction conclue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section Client */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-primary" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Sélectionner un client *</Label>
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
                      const isClientAcheteur = client.type_recherche === 'Acheter';
                      return (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            {isClientAcheteur ? <Home className="w-4 h-4 text-emerald-600" /> : <Key className="w-4 h-4 text-blue-600" />}
                            {clientName} - {client.commission_split || 50}% split
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun client actif assigné</p>
                )}
              </div>

              {selectedClient && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <ClientTypeBadge typeRecherche={selectedClient.type_recherche} />
                  <span className="text-sm text-muted-foreground">
                    {isAchat ? 'Transaction d\'achat immobilier' : 'Transaction de location'}
                  </span>
                </div>
              )}

              {/* Type de transaction */}
              <div className="space-y-2">
                <Label>Type de transaction *</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={!isAchat ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, typeTransaction: 'location' })}
                    className={`flex-1 ${!isAchat ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Location
                  </Button>
                  <Button
                    type="button"
                    variant={isAchat ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, typeTransaction: 'achat' })}
                    className={`flex-1 ${isAchat ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Achat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Informations du bien */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-primary" />
                Informations du bien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse du bien *</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="Rue de la Paix 12, 1202 Genève"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="typeBien">Type de bien</Label>
                  <Select
                    value={formData.typeBien}
                    onValueChange={(value) => setFormData({ ...formData, typeBien: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_BIEN.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="etage">Étage</Label>
                  <Input
                    id="etage"
                    value={formData.etage}
                    onChange={(e) => setFormData({ ...formData, etage: e.target.value })}
                    placeholder="3ème étage"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          {/* Section Informations financières */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="w-5 h-5 text-primary" />
                Informations financières
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAchat ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="prixVente">Prix de vente (CHF) *</Label>
                      <Input
                        id="prixVente"
                        type="number"
                        step="1000"
                        value={formData.prixVente}
                        onChange={(e) => setFormData({ ...formData, prixVente: e.target.value })}
                        placeholder="850000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tauxCommission">Taux de commission (%)</Label>
                      <Input
                        id="tauxCommission"
                        type="number"
                        step="0.1"
                        value={formData.tauxCommission}
                        onChange={(e) => setFormData({ ...formData, tauxCommission: e.target.value })}
                        placeholder="3"
                      />
                    </div>
                  </>
                ) : (
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
                )}

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
              </div>

              {/* Aperçu des commissions */}
              {formData.clientId && (isAchat ? formData.prixVente : formData.loyerMensuel) && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-sm">Aperçu des commissions</h4>
                  {(() => {
                    let montantTotal: number;
                    let commissionTotale: number;
                    let commissionLabel: string;

                    if (isAchat) {
                      const prixVente = parseFloat(formData.prixVente);
                      const tauxCommission = parseFloat(formData.tauxCommission || '3') / 100;
                      montantTotal = prixVente;
                      commissionTotale = Math.round(prixVente * tauxCommission);
                      commissionLabel = `Commission (${formData.tauxCommission || 3}% du prix)`;
                    } else {
                      const loyerMensuel = parseFloat(formData.loyerMensuel);
                      montantTotal = loyerMensuel * 12;
                      commissionTotale = loyerMensuel;
                      commissionLabel = 'Commission totale (1 mois)';
                    }
                    
                    const splitAgent = selectedClient?.commission_split || 50;
                    const partAgent = Math.round(commissionTotale * (splitAgent / 100));
                    const partAgence = commissionTotale - partAgent;

                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {isAchat ? 'Prix de vente:' : 'Loyer annuel:'}
                          </span>
                          <span className="font-semibold">{montantTotal.toLocaleString()} CHF</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{commissionLabel}:</span>
                          <span className="font-semibold">{commissionTotale.toLocaleString()} CHF</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Votre part ({splitAgent}%):</span>
                          <span className="font-bold">{partAgent.toLocaleString()} CHF</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Part agence ({100 - splitAgent}%):</span>
                          <span>{partAgence.toLocaleString()} CHF</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Informations de la régie */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="w-5 h-5 text-primary" />
                Informations de la régie
              </CardTitle>
              <CardDescription>Coordonnées de la régie immobilière (optionnel)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regieNom">Nom de la régie</Label>
                  <Input
                    id="regieNom"
                    value={formData.regieNom}
                    onChange={(e) => setFormData({ ...formData, regieNom: e.target.value })}
                    placeholder="Régie du Lac SA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regieContact">Personne de contact</Label>
                  <Input
                    id="regieContact"
                    value={formData.regieContact}
                    onChange={(e) => setFormData({ ...formData, regieContact: e.target.value })}
                    placeholder="Marie Dupont"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regieTelephone">Téléphone</Label>
                  <Input
                    id="regieTelephone"
                    type="tel"
                    value={formData.regieTelephone}
                    onChange={(e) => setFormData({ ...formData, regieTelephone: e.target.value })}
                    placeholder="+41 22 123 45 67"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regieEmail">Email</Label>
                  <Input
                    id="regieEmail"
                    type="email"
                    value={formData.regieEmail}
                    onChange={(e) => setFormData({ ...formData, regieEmail: e.target.value })}
                    placeholder="contact@regie.ch"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Dates du bail */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                Dates du bail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateDebutBail">Date de début du bail</Label>
                  <Input
                    id="dateDebutBail"
                    type="date"
                    value={formData.dateDebutBail}
                    onChange={(e) => setFormData({ ...formData, dateDebutBail: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateEtatLieux">Date et heure de l'état des lieux</Label>
                  <Input
                    id="dateEtatLieux"
                    type="datetime-local"
                    value={formData.dateEtatLieux}
                    onChange={(e) => setFormData({ ...formData, dateEtatLieux: e.target.value })}
                    disabled={formData.etatLieuxADefinir}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="etatLieuxADefinir"
                  checked={formData.etatLieuxADefinir}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    etatLieuxADefinir: checked as boolean,
                    dateEtatLieux: checked ? '' : formData.dateEtatLieux
                  })}
                />
                <Label htmlFor="etatLieuxADefinir" className="text-sm font-normal cursor-pointer">
                  Date d'état des lieux à confirmer ultérieurement
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Section Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Notes internes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notesInternes">Commentaires et notes</Label>
                <Textarea
                  id="notesInternes"
                  value={formData.notesInternes}
                  onChange={(e) => setFormData({ ...formData, notesInternes: e.target.value })}
                  placeholder="Notes additionnelles sur la transaction, conditions particulières, remarques..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Boutons d'action */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/agent')}
              disabled={submitting}
              className="w-full sm:w-auto sm:flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.clientId || !(isAchat ? formData.prixVente : formData.loyerMensuel) || !formData.adresse}
              className={`w-full sm:w-auto sm:flex-1 gap-2 ${isAchat ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Enregistrement...' : `Conclure ${isAchat ? 'la vente' : 'la location'}`}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
