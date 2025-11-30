import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  UserPlus, Clock, Mail, Phone, CheckCircle, XCircle, Search,
  RefreshCw, AlertTriangle, Eye, FileText, CreditCard, Calendar,
  User, Briefcase, Home, Receipt, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DemandeMandat {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  statut: string;
  created_at: string;
  type_recherche: string;
  montant_acompte: number;
  revenus_mensuels: number;
  budget_max: number;
  region_recherche: string;
  date_paiement: string | null;
  abaninja_invoice_id: string | null;
  abaninja_invoice_ref: string | null;
  [key: string]: any;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  actif: boolean;
  created_at: string;
}

export default function DemandesActivation() {
  const [demandes, setDemandes] = useState<DemandeMandat[]>([]);
  const [inactiveProfiles, setInactiveProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activating, setActivating] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null);
  const [selectedDemande, setSelectedDemande] = useState<DemandeMandat | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: demandesData, error: demandesError } = await supabase
        .from('demandes_mandat')
        .select('*')
        .order('created_at', { ascending: false });

      if (demandesError) throw demandesError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('actif', false)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setDemandes((demandesData as DemandeMandat[]) || []);
      setInactiveProfiles(profilesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbaNinjaInvoice = async (demande: DemandeMandat) => {
    try {
      setCreatingInvoice(demande.id);

      // Step 1: Create client in AbaNinja
      console.log('Creating AbaNinja client...');
      const { data: clientResult, error: clientError } = await supabase.functions.invoke('create-abaninja-client', {
        body: {
          prenom: demande.prenom,
          nom: demande.nom,
          email: demande.email,
          telephone: demande.telephone,
          adresse: demande.adresse
        }
      });

      if (clientError) throw clientError;
      if (!clientResult.success) throw new Error(clientResult.error);

      console.log('AbaNinja client created:', clientResult.client_uuid);

      // Step 2: Create invoice in AbaNinja
      console.log('Creating AbaNinja invoice...');
      const { data: invoiceResult, error: invoiceError } = await supabase.functions.invoke('create-abaninja-invoice', {
        body: {
          client_uuid: clientResult.client_uuid,
          type_recherche: demande.type_recherche,
          prenom: demande.prenom,
          nom: demande.nom,
          email: demande.email,
          demande_id: demande.id
        }
      });

      if (invoiceError) throw invoiceError;
      if (!invoiceResult.success) throw new Error(invoiceResult.error);

      console.log('AbaNinja invoice created:', invoiceResult.invoice_id);

      // Step 3: Update demande with AbaNinja references
      const { error: updateError } = await supabase
        .from('demandes_mandat')
        .update({
          statut: 'facture_envoyee',
          abaninja_invoice_id: invoiceResult.invoice_id,
          abaninja_invoice_ref: invoiceResult.invoice_number
        })
        .eq('id', demande.id);

      if (updateError) throw updateError;

      toast.success('Client et facture créés dans AbaNinja ! Facture envoyée par email.');
      await loadData();
    } catch (error: any) {
      console.error('Error creating AbaNinja invoice:', error);
      toast.error(error.message || 'Erreur lors de la création de la facture');
    } finally {
      setCreatingInvoice(null);
    }
  };

  const handleMarkAsPaid = async (demande: DemandeMandat) => {
    try {
      const { error } = await supabase
        .from('demandes_mandat')
        .update({ 
          statut: 'paye',
          date_paiement: new Date().toISOString()
        })
        .eq('id', demande.id);

      if (error) throw error;
      toast.success('Paiement enregistré');
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur');
    }
  };

  const handleActivateMandat = async (demande: DemandeMandat) => {
    try {
      setActivating(demande.id);

      // Préparer les données complètes du mandat pour le transfert
      const demandeMandat = {
        adresse: demande.adresse,
        date_naissance: demande.date_naissance,
        nationalite: demande.nationalite,
        type_permis: demande.type_permis,
        etat_civil: demande.etat_civil,
        gerance_actuelle: demande.gerance_actuelle,
        contact_gerance: demande.contact_gerance,
        loyer_actuel: demande.loyer_actuel,
        depuis_le: demande.depuis_le,
        pieces_actuel: demande.pieces_actuel,
        charges_extraordinaires: demande.charges_extraordinaires,
        montant_charges_extra: demande.montant_charges_extra,
        poursuites: demande.poursuites,
        curatelle: demande.curatelle,
        motif_changement: demande.motif_changement,
        profession: demande.profession,
        employeur: demande.employeur,
        revenus_mensuels: demande.revenus_mensuels,
        date_engagement: demande.date_engagement,
        utilisation_logement: demande.utilisation_logement,
        animaux: demande.animaux,
        instrument_musique: demande.instrument_musique,
        vehicules: demande.vehicules,
        numero_plaques: demande.numero_plaques,
        decouverte_agence: demande.decouverte_agence,
        type_recherche: demande.type_recherche,
        nombre_occupants: demande.nombre_occupants,
        type_bien: demande.type_bien,
        pieces_recherche: demande.pieces_recherche,
        region_recherche: demande.region_recherche,
        budget_max: demande.budget_max,
        souhaits_particuliers: demande.souhaits_particuliers,
        candidats: demande.candidats || [],
        documents_uploades: demande.documents_uploades || []
      };

      // Créer le client avec TOUTES les données du mandat
      const { error: inviteError } = await supabase.functions.invoke('invite-client', {
        body: {
          email: demande.email,
          prenom: demande.prenom,
          nom: demande.nom,
          telephone: demande.telephone,
          demandeMandat: demandeMandat
        }
      });

      if (inviteError) throw inviteError;

      // Mettre à jour le statut
      await supabase
        .from('demandes_mandat')
        .update({ statut: 'active' })
        .eq('id', demande.id);

      toast.success('Compte activé avec toutes les données ! Invitation envoyée.');
      await loadData();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur');
    } finally {
      setActivating(null);
    }
  };

  const handleActivateProfile = async (profileId: string) => {
    try {
      setActivating(profileId);
      const { error } = await supabase
        .from('profiles')
        .update({ actif: true })
        .eq('id', profileId);

      if (error) throw error;
      toast.success('Compte activé');
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur');
    } finally {
      setActivating(null);
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return <Badge variant="destructive">En attente</Badge>;
      case 'facture_envoyee':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Facture envoyée</Badge>;
      case 'paye':
        return <Badge variant="default" className="bg-green-600">Payé - À activer</Badge>;
      case 'active':
        return <Badge variant="secondary">Activé</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const newDemandes = demandes.filter(d => d.statut === 'en_attente');
  const invoicedDemandes = demandes.filter(d => d.statut === 'facture_envoyee');
  const paidDemandes = demandes.filter(d => d.statut === 'paye');
  const activeDemandes = demandes.filter(d => d.statut === 'active');

  const filteredProfiles = inactiveProfiles.filter(profile => 
    `${profile.prenom} ${profile.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <UserPlus className="h-7 w-7" />
              Demandes d'activation
            </h1>
            <p className="text-muted-foreground">Gérez les demandes de mandat et comptes</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-950">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{newDemandes.length}</p>
                <p className="text-xs text-muted-foreground">Nouvelles</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoicedDemandes.length}</p>
                <p className="text-xs text-muted-foreground">Facturées</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidDemandes.length}</p>
                <p className="text-xs text-muted-foreground">Payées</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeDemandes.length}</p>
                <p className="text-xs text-muted-foreground">Activées</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-950">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveProfiles.length}</p>
                <p className="text-xs text-muted-foreground">Inactifs</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="demandes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="demandes">
              Demandes de mandat {newDemandes.length + invoicedDemandes.length + paidDemandes.length > 0 && (
                <Badge variant="destructive" className="ml-2">{newDemandes.length + invoicedDemandes.length + paidDemandes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="comptes">Comptes inactifs</TabsTrigger>
          </TabsList>

          <TabsContent value="demandes">
            <Card className="p-4">
              <ScrollArea className="h-[500px]">
                {demandes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune demande de mandat</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {demandes.map((demande) => (
                      <div
                        key={demande.id}
                        className={`p-4 rounded-lg border ${
                          demande.statut === 'en_attente' ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20' :
                          demande.statut === 'facture_envoyee' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20' :
                          demande.statut === 'paye' ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20' :
                          'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{demande.prenom} {demande.nom}</p>
                              {getStatusBadge(demande.statut)}
                              <Badge variant="outline">{demande.type_recherche}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />{demande.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />{demande.telephone}
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />{demande.montant_acompte} CHF
                              </span>
                            </div>
                            {demande.abaninja_invoice_ref && (
                              <p className="text-xs text-blue-600 mt-1">
                                <Receipt className="h-3 w-3 inline mr-1" />
                                Facture AbaNinja: {demande.abaninja_invoice_ref}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Soumis le {format(new Date(demande.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                              {demande.date_paiement && (
                                <> • Payé le {format(new Date(demande.date_paiement), 'dd MMM yyyy', { locale: fr })}</>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setSelectedDemande(demande)}>
                                  <Eye className="h-4 w-4 mr-1" />Voir
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>{demande.prenom} {demande.nom}</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 py-4 text-sm">
                                  <div><strong>Email:</strong> {demande.email}</div>
                                  <div><strong>Téléphone:</strong> {demande.telephone}</div>
                                  <div><strong>Adresse:</strong> {demande.adresse}</div>
                                  <div><strong>Nationalité:</strong> {demande.nationalite}</div>
                                  <div><strong>Permis:</strong> {demande.type_permis}</div>
                                  <div><strong>État civil:</strong> {demande.etat_civil}</div>
                                  <div className="col-span-2 border-t pt-2 mt-2">
                                    <strong>Situation financière</strong>
                                  </div>
                                  <div><strong>Profession:</strong> {demande.profession}</div>
                                  <div><strong>Employeur:</strong> {demande.employeur}</div>
                                  <div><strong>Revenus:</strong> {demande.revenus_mensuels?.toLocaleString()} CHF/mois</div>
                                  <div><strong>Budget max:</strong> {demande.budget_max?.toLocaleString()} CHF</div>
                                  <div className="col-span-2 border-t pt-2 mt-2">
                                    <strong>Recherche</strong>
                                  </div>
                                  <div><strong>Type:</strong> {demande.type_recherche}</div>
                                  <div><strong>Type de bien:</strong> {demande.type_bien}</div>
                                  <div><strong>Pièces:</strong> {demande.pieces_recherche}</div>
                                  <div><strong>Région:</strong> {demande.region_recherche}</div>
                                  {demande.souhaits_particuliers && (
                                    <div className="col-span-2">
                                      <strong>Souhaits:</strong> {demande.souhaits_particuliers}
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {demande.statut === 'en_attente' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCreateAbaNinjaInvoice(demande)}
                                disabled={creatingInvoice === demande.id}
                              >
                                {creatingInvoice === demande.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <><Receipt className="h-4 w-4 mr-1" />Facturer</>
                                )}
                              </Button>
                            )}
                            {(demande.statut === 'en_attente' || demande.statut === 'facture_envoyee') && (
                              <Button size="sm" onClick={() => handleMarkAsPaid(demande)}>
                                <CreditCard className="h-4 w-4 mr-1" />Payé
                              </Button>
                            )}
                            {demande.statut === 'paye' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleActivateMandat(demande)}
                                disabled={activating === demande.id}
                              >
                                {activating === demande.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <><CheckCircle className="h-4 w-4 mr-1" />Activer</>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="comptes">
            <Card className="p-4">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-[400px]">
                {filteredProfiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Tous les comptes sont activés</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProfiles.map((profile) => (
                      <div key={profile.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium">{profile.prenom} {profile.nom}</p>
                            <p className="text-xs text-muted-foreground">{profile.email}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleActivateProfile(profile.id)}
                            disabled={activating === profile.id}
                          >
                            {activating === profile.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <><CheckCircle className="h-3 w-3 mr-1" />Activer</>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
