import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Receipt, Clock, Mail, Phone, CheckCircle, Search,
  RefreshCw, Eye, CreditCard, Building2, Home, Loader2,
  Send, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface DemandeMandat {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  statut: string;
  created_at: string;
  type_recherche: string;
  montant_acompte: number;
  date_paiement: string | null;
  abaninja_invoice_id: string | null;
  abaninja_invoice_ref: string | null;
  abaninja_client_uuid: string | null;
}

export default function FacturesAbaNinja() {
  const [demandes, setDemandes] = useState<DemandeMandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resendingInvoice, setResendingInvoice] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all demandes that have AbaNinja invoice info
      const { data, error } = await supabase
        .from('demandes_mandat')
        .select('*')
        .not('abaninja_invoice_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDemandes((data as DemandeMandat[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvoice = async (demande: DemandeMandat) => {
    if (!demande.abaninja_invoice_id) {
      toast.error('Pas de facture à renvoyer');
      return;
    }

    try {
      setResendingInvoice(demande.id);

      const { data, error } = await supabase.functions.invoke('resend-abaninja-invoice', {
        body: {
          invoice_uuid: demande.abaninja_invoice_id,
          email: demande.email
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Facture renvoyée par email !');
    } catch (error: any) {
      console.error('Error resending invoice:', error);
      toast.error(error.message || 'Erreur lors du renvoi');
    } finally {
      setResendingInvoice(null);
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

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return <Badge variant="destructive">En attente</Badge>;
      case 'facture_envoyee':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Facture envoyée</Badge>;
      case 'paye':
        return <Badge variant="default" className="bg-green-600">Payé</Badge>;
      case 'active':
        return <Badge variant="secondary">Activé</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const getMontant = (demande: DemandeMandat) => {
    return demande.type_recherche === 'Acheter' ? 2500 : (demande.montant_acompte || 300);
  };

  const pendingInvoices = demandes.filter(d => d.statut === 'facture_envoyee');
  const paidInvoices = demandes.filter(d => d.statut === 'paye' || d.statut === 'active');

  const filteredDemandes = demandes.filter(demande => 
    `${demande.prenom} ${demande.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    demande.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (demande.abaninja_invoice_ref || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = pendingInvoices.reduce((sum, d) => sum + getMontant(d), 0);
  const totalPaid = paidInvoices.reduce((sum, d) => sum + getMontant(d), 0);

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
              <Receipt className="h-7 w-7" />
              Factures AbaNinja
            </h1>
            <p className="text-muted-foreground">Suivi des factures et paiements</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demandes.length}</p>
                <p className="text-xs text-muted-foreground">Total factures</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-950">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvoices.length}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidInvoices.length}</p>
                <p className="text-xs text-muted-foreground">Payées</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">CHF encaissés</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              Toutes ({demandes.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              En attente ({pendingInvoices.length})
            </TabsTrigger>
            <TabsTrigger value="paid">
              Payées ({paidInvoices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <InvoiceList 
              demandes={filteredDemandes}
              resendingInvoice={resendingInvoice}
              onResend={handleResendInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              getStatusBadge={getStatusBadge}
              getMontant={getMontant}
              navigate={navigate}
            />
          </TabsContent>

          <TabsContent value="pending">
            <InvoiceList 
              demandes={filteredDemandes.filter(d => d.statut === 'facture_envoyee')}
              resendingInvoice={resendingInvoice}
              onResend={handleResendInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              getStatusBadge={getStatusBadge}
              getMontant={getMontant}
              navigate={navigate}
            />
          </TabsContent>

          <TabsContent value="paid">
            <InvoiceList 
              demandes={filteredDemandes.filter(d => d.statut === 'paye' || d.statut === 'active')}
              resendingInvoice={resendingInvoice}
              onResend={handleResendInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              getStatusBadge={getStatusBadge}
              getMontant={getMontant}
              navigate={navigate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface InvoiceListProps {
  demandes: DemandeMandat[];
  resendingInvoice: string | null;
  onResend: (demande: DemandeMandat) => void;
  onMarkAsPaid: (demande: DemandeMandat) => void;
  getStatusBadge: (statut: string) => JSX.Element;
  getMontant: (demande: DemandeMandat) => number;
  navigate: (path: string) => void;
}

function InvoiceList({ 
  demandes, 
  resendingInvoice, 
  onResend, 
  onMarkAsPaid, 
  getStatusBadge,
  getMontant,
  navigate 
}: InvoiceListProps) {
  if (demandes.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Aucune facture</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {demandes.map((demande) => (
            <div
              key={demande.id}
              className={`p-4 rounded-lg border ${
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
                    {demande.type_recherche === 'Acheter' ? (
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        <Building2 className="h-3 w-3 mr-1" />
                        Achat
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Home className="h-3 w-3 mr-1" />
                        Location
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />{demande.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />{demande.telephone}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <CreditCard className="h-3 w-3" />
                      {getMontant(demande).toLocaleString()} CHF
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-blue-600 font-medium">
                      <Receipt className="h-3 w-3 inline mr-1" />
                      {demande.abaninja_invoice_ref || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Créée le {format(new Date(demande.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    {demande.date_paiement && (
                      <span className="text-green-600">
                        {' '}• Payée le {format(new Date(demande.date_paiement), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/admin/demandes-activation')}
                  >
                    <Eye className="h-4 w-4 mr-1" />Détails
                  </Button>
                  
                  {demande.statut === 'facture_envoyee' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onResend(demande)}
                        disabled={resendingInvoice === demande.id}
                      >
                        {resendingInvoice === demande.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Send className="h-4 w-4 mr-1" />Renvoyer</>
                        )}
                      </Button>
                      <Button size="sm" onClick={() => onMarkAsPaid(demande)}>
                        <CheckCircle className="h-4 w-4 mr-1" />Payé
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
