import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Filter, CheckCircle, DollarSign, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Referral {
  id: string;
  apporteur_id: string;
  client_nom: string;
  client_prenom: string | null;
  client_telephone: string | null;
  lieu_situation: string | null;
  type_affaire: string;
  statut: string;
  montant_frais_agence: number | null;
  montant_commission: number | null;
  reference_virement: string | null;
  created_at: string;
  apporteur?: {
    code_parrainage: string;
    profile?: {
      nom: string;
      prenom: string;
    };
  };
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');
  
  // Dialog states
  const [validateDialog, setValidateDialog] = useState<{ open: boolean; referral: Referral | null }>({ open: false, referral: null });
  const [payDialog, setPayDialog] = useState<{ open: boolean; referral: Referral | null }>({ open: false, referral: null });
  const [fraisAgence, setFraisAgence] = useState('');
  const [referenceVirement, setReferenceVirement] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load apporteur info for each referral
      const referralsWithApporteur = await Promise.all(
        (data || []).map(async (referral) => {
          const { data: apporteur } = await supabase
            .from('apporteurs')
            .select('code_parrainage, user_id')
            .eq('id', referral.apporteur_id)
            .single();

          let profile = null;
          if (apporteur?.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nom, prenom')
              .eq('id', apporteur.user_id)
              .single();
            profile = profileData;
          }

          return { 
            ...referral, 
            apporteur: apporteur ? { ...apporteur, profile } : undefined 
          };
        })
      );

      setReferrals(referralsWithApporteur);
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!validateDialog.referral || !fraisAgence) {
      toast.error('Veuillez entrer le montant des frais d\'agence');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('referrals')
        .update({
          statut: 'conclu',
          montant_frais_agence: parseFloat(fraisAgence),
          date_validation: new Date().toISOString(),
        })
        .eq('id', validateDialog.referral.id);

      if (error) throw error;

      toast.success('Referral validé et commission calculée !');
      setValidateDialog({ open: false, referral: null });
      setFraisAgence('');
      loadReferrals();
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!payDialog.referral) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('referrals')
        .update({
          statut: 'paye',
          date_paiement: new Date().toISOString(),
          reference_virement: referenceVirement || null,
        })
        .eq('id', payDialog.referral.id);

      if (error) throw error;

      toast.success('Commission marquée comme payée !');
      setPayDialog({ open: false, referral: null });
      setReferenceVirement('');
      loadReferrals();
    } catch (error) {
      console.error('Error paying:', error);
      toast.error('Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    soumis: { label: 'Soumis', variant: 'secondary' },
    valide: { label: 'Validé', variant: 'default' },
    en_cours: { label: 'En cours', variant: 'outline' },
    conclu: { label: 'Conclu', variant: 'default' },
    paye: { label: 'Payé', variant: 'default' },
    annule: { label: 'Annulé', variant: 'destructive' },
  };

  const typeAffaireLabels: Record<string, string> = {
    vente: 'Vente',
    achat: 'Achat',
    location: 'Location',
    mise_en_location: 'Mise en location',
  };

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch = 
      r.client_nom.toLowerCase().includes(search.toLowerCase()) ||
      r.client_prenom?.toLowerCase().includes(search.toLowerCase()) ||
      r.apporteur?.profile?.nom?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatut = statutFilter === 'all' || r.statut === statutFilter;
    
    return matchesSearch && matchesStatut;
  });

  const stats = {
    total: referrals.length,
    enAttente: referrals.filter(r => r.statut === 'soumis' || r.statut === 'valide').length,
    aPayer: referrals.filter(r => r.statut === 'conclu').reduce((sum, r) => sum + (r.montant_commission || 0), 0),
    totalPaye: referrals.filter(r => r.statut === 'paye').reduce((sum, r) => sum + (r.montant_commission || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Gestion des Referrals</h1>
        <p className="text-muted-foreground">
          Validez et payez les commissions des apporteurs
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enAttente}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">À payer</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">CHF {stats.aPayer.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total payé</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">CHF {stats.totalPaye.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="soumis">Soumis</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="conclu">Conclu (à payer)</SelectItem>
            <SelectItem value="paye">Payé</SelectItem>
            <SelectItem value="annule">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Apporteur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun referral trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {referral.client_prenom} {referral.client_nom}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {referral.lieu_situation}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {referral.apporteur?.profile?.prenom} {referral.apporteur?.profile?.nom}
                        </div>
                        <code className="text-xs">{referral.apporteur?.code_parrainage}</code>
                      </div>
                    </TableCell>
                    <TableCell>{typeAffaireLabels[referral.type_affaire] || referral.type_affaire}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[referral.statut]?.variant || 'secondary'}>
                        {statusConfig[referral.statut]?.label || referral.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {referral.montant_commission 
                        ? `CHF ${referral.montant_commission.toFixed(0)}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(referral.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(referral.statut === 'soumis' || referral.statut === 'valide') && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setValidateDialog({ open: true, referral });
                              setFraisAgence('');
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                        )}
                        {referral.statut === 'conclu' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPayDialog({ open: true, referral });
                              setReferenceVirement('');
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Payer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Validate Dialog */}
      <Dialog open={validateDialog.open} onOpenChange={(open) => setValidateDialog({ open, referral: validateDialog.referral })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider le referral</DialogTitle>
            <DialogDescription>
              Entrez le montant des frais d'agence pour calculer la commission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Client référé:</p>
              <p className="font-medium">
                {validateDialog.referral?.client_prenom} {validateDialog.referral?.client_nom}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Montant des frais d'agence (CHF)</Label>
              <Input
                type="number"
                value={fraisAgence}
                onChange={(e) => setFraisAgence(e.target.value)}
                placeholder="Ex: 2500"
              />
              {fraisAgence && (
                <p className="text-sm text-muted-foreground">
                  Commission estimée (20%): CHF {(parseFloat(fraisAgence) * 0.2).toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateDialog({ open: false, referral: null })}>
              Annuler
            </Button>
            <Button onClick={handleValidate} disabled={processing}>
              {processing ? 'Validation...' : 'Valider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog({ open, referral: payDialog.referral })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme payé</DialogTitle>
            <DialogDescription>
              Confirmez le paiement de la commission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Apporteur:</p>
              <p className="font-medium">
                {payDialog.referral?.apporteur?.profile?.prenom} {payDialog.referral?.apporteur?.profile?.nom}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Montant:</p>
              <p className="text-2xl font-bold">
                CHF {payDialog.referral?.montant_commission?.toFixed(2) || 0}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Référence du virement (optionnel)</Label>
              <Input
                value={referenceVirement}
                onChange={(e) => setReferenceVirement(e.target.value)}
                placeholder="Ex: VIR-2024-001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog({ open: false, referral: null })}>
              Annuler
            </Button>
            <Button onClick={handlePay} disabled={processing}>
              {processing ? 'Traitement...' : 'Confirmer le paiement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
