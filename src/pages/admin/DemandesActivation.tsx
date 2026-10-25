import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, FileText, Loader2, RefreshCw, Search, Users, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DashPage, DashPageHeader, DashFilterPills, DashEmptyState } from '@/components/client/dashboard/DashPrimitives';
import { TablePagination, type PageSize } from '@/components/offres-auto/TablePagination';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DemandeActivationCard, CompteInactifCard } from '@/components/admin/activation/DemandeActivationCard';
import { DemandeDetailsDialogBody } from '@/components/admin/activation/DemandeDetailsDialogBody';
import {
  attente, attenteProfil, etapeDemande, nomComplet, rangUrgence, texteRecherche,
  type DemandeMandat, type Etape, type Profile,
} from '@/components/admin/activation/activationModel';

type SortKey = 'urgence' | 'recent' | 'oldest' | 'client_az';
type TypeKey = 'all' | 'location' | 'achat';

const ETAPES: { key: Etape; label: string }[] = [
  { key: 'a_traiter', label: 'À traiter' },
  { key: 'paiement', label: 'Paiement attendu' },
  { key: 'comptes', label: 'Comptes inactifs' },
  { key: 'activees', label: 'Activées' },
  { key: 'autres', label: 'Autres statuts' },
];

/**
 * Demandes d'activation — une file de travail par étape :
 * À traiter (facturer une nouvelle demande, activer une demande payée) → Paiement attendu (facture envoyée)
 * → Comptes inactifs → Activées. Chaque carte porte UNE prochaine action et son bouton principal.
 */
export default function DemandesActivation() {
  const [demandes, setDemandes] = useState<DemandeMandat[]>([]);
  const [inactiveProfiles, setInactiveProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activating, setActivating] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null);
  const [resendingInvoice, setResendingInvoice] = useState<string | null>(null);
  const [selectedDemande, setSelectedDemande] = useState<DemandeMandat | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [demandeToDelete, setDemandeToDelete] = useState<DemandeMandat | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<Etape | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('urgence');
  const [typeFilter, setTypeFilter] = useState<TypeKey>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

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
          address_uuid: clientResult.address_uuid,
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
      // 1. Enregistrer le paiement
      const { error } = await supabase
        .from('demandes_mandat')
        .update({ 
          statut: 'paye',
          date_paiement: new Date().toISOString()
        })
        .eq('id', demande.id);

      if (error) throw error;
      
      toast.success('Paiement enregistré, activation en cours...');
      
      // 2. Déclencher automatiquement l'activation
      await handleActivateMandat({
        ...demande,
        statut: 'paye',
        date_paiement: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du paiement');
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

  const handleActivateMandat = async (demande: DemandeMandat) => {
    try {
      setActivating(demande.id);

      // Préparer les données complètes du mandat pour le transfert
      const demandeMandat = {
        id: demande.id, // Include demande ID for contract reference
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
        apport_personnel: demande.apport_personnel,
        souhaits_particuliers: demande.souhaits_particuliers,
        candidats: demande.candidats || [],
        documents_uploades: demande.documents_uploades || [],
        // Contract signature data
        signature_data: demande.signature_data,
        cgv_acceptees_at: demande.cgv_acceptees_at
      };

      // Créer le client avec TOUTES les données du mandat
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-client', {
        body: {
          email: demande.email,
          prenom: demande.prenom,
          nom: demande.nom,
          telephone: demande.telephone,
          demandeMandat: demandeMandat
        }
      });

      if (inviteError) throw inviteError;

      // Récupérer l'ID du client créé
      const clientId = inviteData?.clientId;

      // Générer le PDF du mandat COMPLET (toutes les dispositions juridiques) si on a l'ID du client
      if (clientId) {
        console.log('Generating FULL mandat PDF for client:', clientId);
        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-full-mandat-pdf', {
          body: { client_id: clientId, core_only: true },
        });

        if (pdfError) {
          console.error('Error generating full mandate PDF:', pdfError);
          // Don't throw, the account is still created
        } else if (pdfData?.pdf_base64) {
          console.log('Full mandate PDF generated successfully');
        }
      }

      // Mettre à jour le statut de la demande
      await supabase
        .from('demandes_mandat')
        .update({ statut: 'active' })
        .eq('id', demande.id);

      // 📱 Envoi WhatsApp de bienvenue (fire-and-forget)
      if (clientId) {
        supabase.functions.invoke('wa-send-welcome', { body: { client_id: clientId } })
          .catch((e) => console.error('wa-send-welcome failed:', e));
      }

      // S'assurer que le profil est bien activé (éviter la désynchronisation)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ actif: true, updated_at: new Date().toISOString() })
        .eq('email', demande.email);

      if (profileError) {
        console.error('Erreur activation profil:', profileError);
      }

      toast.success('Compte activé avec toutes les données ! Contrat PDF généré.');
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

  const handleDeleteDemande = async () => {
    if (!demandeToDelete) return;
    
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('demandes_mandat')
        .delete()
        .eq('id', demandeToDelete.id);

      if (error) throw error;
      
      toast.success('Demande supprimée');
      setDeleteDialogOpen(false);
      setDemandeToDelete(null);
      await loadData();
    } catch (error: any) {
      console.error('Error deleting demande:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Recherche et type s'appliquent à toutes les étapes : les compteurs suivent.
  const q = searchTerm.trim().toLowerCase();
  const demandesVisibles = useMemo(() => demandes.filter((d) => {
    if (typeFilter === 'achat' && d.type_recherche !== 'Acheter') return false;
    if (typeFilter === 'location' && d.type_recherche === 'Acheter') return false;
    return !q || texteRecherche(d).includes(q);
  }), [demandes, q, typeFilter]);

  const filteredProfiles = inactiveProfiles.filter(profile =>
    `${profile.prenom} ${profile.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parEtape = useMemo(() => {
    const m: Record<Etape, DemandeMandat[]> = { a_traiter: [], paiement: [], comptes: [], activees: [], autres: [] };
    for (const d of demandesVisibles) m[etapeDemande(d)].push(d);
    return m;
  }, [demandesVisibles]);

  const counts: Record<Etape, number> = {
    a_traiter: parEtape.a_traiter.length,
    paiement: parEtape.paiement.length,
    comptes: filteredProfiles.length,
    activees: parEtape.activees.length,
    autres: parEtape.autres.length,
  };

  // Onglet par défaut = ce qui attend une action de l'admin (choisi une fois les données chargées).
  const ongletParDefaut: Etape =
    counts.a_traiter > 0 ? 'a_traiter'
      : inactiveProfiles.length > 0 ? 'comptes'
        : counts.paiement > 0 ? 'paiement'
          : 'a_traiter';
  const ongletActif: Etape = tab ?? ongletParDefaut;

  // Résumé (sans filtres) pour l'en-tête.
  const aTraiterTotal = demandes.filter((d) => etapeDemande(d) === 'a_traiter');
  const enRetard = aTraiterTotal.filter((d) => attente(d).enRetard).length
    + inactiveProfiles.filter((p) => attenteProfil(p).enRetard).length;
  const aPayer = demandes.filter((d) => d.statut === 'facture_envoyee').length;
  const totalActions = aTraiterTotal.length + inactiveProfiles.length;

  const sorted = useMemo(() => {
    if (ongletActif === 'comptes') return [];
    const arr = [...parEtape[ongletActif]];
    const t = (d: DemandeMandat) => new Date(d.created_at).getTime();
    if (sortKey === 'client_az') arr.sort((a, b) => nomComplet(a).localeCompare(nomComplet(b), 'fr'));
    else if (sortKey === 'urgence') arr.sort((a, b) => rangUrgence(a) - rangUrgence(b) || t(a) - t(b));
    else arr.sort((a, b) => (sortKey === 'recent' ? t(b) - t(a) : t(a) - t(b)));
    return arr;
  }, [parEtape, ongletActif, sortKey]);

  const profilsTries = useMemo(() => {
    const arr = [...filteredProfiles];
    const t = (p: Profile) => new Date(p.created_at).getTime();
    if (sortKey === 'client_az') arr.sort((a, b) => nomComplet(a).localeCompare(nomComplet(b), 'fr'));
    else if (sortKey === 'recent') arr.sort((a, b) => t(b) - t(a));
    else arr.sort((a, b) => t(a) - t(b));
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inactiveProfiles, searchTerm, sortKey]);

  useEffect(() => { setPage(1); }, [searchTerm, typeFilter, pageSize, ongletActif, sortKey]);
  const liste = ongletActif === 'comptes' ? profilsTries : sorted;
  const pagedDemandes = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);
  const pagedProfils = useMemo(() => profilsTries.slice((page - 1) * pageSize, page * pageSize), [profilsTries, page, pageSize]);

  const filtresActifs = !!q || typeFilter !== 'all';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const etapesVisibles = ETAPES.filter((e) => e.key !== 'autres' || counts.autres > 0 || ongletActif === 'autres');

  return (
    <DashPage className="space-y-5">
      <DashPageHeader
        title="Demandes d'activation"
        subtitle={
          totalActions === 0
            ? `Tout est à jour : aucune demande à traiter${aPayer > 0 ? ` · ${aPayer} facture${aPayer > 1 ? 's' : ''} en attente de paiement` : ''}.`
            : `${totalActions} à traiter${enRetard > 0 ? ` · ${enRetard} depuis plus de 48 h` : ''}${aPayer > 0 ? ` · ${aPayer} facture${aPayer > 1 ? 's' : ''} en attente de paiement` : ''}`
        }
        action={
          <Button onClick={loadData} variant="outline" size="sm" className="h-10 rounded-full" aria-label="Actualiser">
            <RefreshCw className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Actualiser</span>
          </Button>
        }
      />

      {/* Barre d'outils : recherche pleine largeur sur mobile, tri et type côte à côte */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nom, e-mail, téléphone, région, n° de facture…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher une demande ou un compte"
            className="h-11 rounded-full pl-10 pr-10"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-11 rounded-full md:w-[190px]" aria-label="Trier"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="urgence">Urgent d’abord</SelectItem>
              <SelectItem value="recent">Plus récentes</SelectItem>
              <SelectItem value="oldest">Plus anciennes</SelectItem>
              <SelectItem value="client_az">Par client (A–Z)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeKey)}>
            <SelectTrigger className="h-11 rounded-full md:w-[170px]" aria-label="Type de recherche"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Location et achat</SelectItem>
              <SelectItem value="location">Location</SelectItem>
              <SelectItem value="achat">Achat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DashFilterPills
        label="Étapes des demandes d'activation"
        value={ongletActif}
        onChange={(v) => setTab(v as Etape)}
        options={etapesVisibles.map((e) => ({ key: e.key, label: e.label, count: counts[e.key] }))}
      />

      {liste.length === 0 ? (
        <DashEmptyState
          icon={ongletActif === 'comptes' ? CheckCircle : FileText}
          title={
            filtresActifs ? 'Aucun résultat pour ces filtres'
              : ongletActif === 'a_traiter' ? 'Rien à traiter pour le moment'
              : ongletActif === 'paiement' ? 'Aucune facture en attente de paiement'
              : ongletActif === 'comptes' ? 'Tous les comptes sont activés'
              : ongletActif === 'activees' ? 'Aucune demande activée'
              : 'Aucune demande de mandat'
          }
          description={
            ongletActif === 'a_traiter' && !filtresActifs
              ? 'Les nouvelles demandes de mandat et les demandes payées à activer arrivent ici.'
              : undefined
          }
        />
      ) : ongletActif === 'comptes' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pagedProfils.map((profile) => (
            <CompteInactifCard
              key={profile.id}
              p={profile}
              activating={activating === profile.id}
              onActiver={handleActivateProfile}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {pagedDemandes.map((demande) => (
            <DemandeActivationCard
              key={demande.id}
              d={demande}
              creatingInvoice={creatingInvoice === demande.id}
              resendingInvoice={resendingInvoice === demande.id}
              activating={activating === demande.id}
              onVoir={setSelectedDemande}
              onFacturer={handleCreateAbaNinjaInvoice}
              onRenvoyer={handleResendInvoice}
              onPayer={handleMarkAsPaid}
              onActiver={handleActivateMandat}
              onSupprimer={(d) => { setDemandeToDelete(d); setDeleteDialogOpen(true); }}
            />
          ))}
        </div>
      )}

      {liste.length > pageSize && (
        <TablePagination
          total={liste.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label={ongletActif === 'comptes' ? 'comptes' : 'demandes'}
        />
      )}

      {ongletActif === 'activees' && (
        <p className="text-center text-sm text-muted-foreground">
          Les comptes activés se gèrent ensuite depuis{' '}
          <Link to="/admin/clients" className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">
            <Users className="h-3.5 w-3.5" />la liste des clients
          </Link>.
        </p>
      )}

      {/* Fiche de la demande */}
      <Dialog open={!!selectedDemande} onOpenChange={(o) => { if (!o) setSelectedDemande(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          {selectedDemande && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDemande.prenom} {selectedDemande.nom}</DialogTitle>
              </DialogHeader>
              <DemandeDetailsDialogBody demande={selectedDemande} />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la demande de {demandeToDelete?.prenom} {demandeToDelete?.nom} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDemande}
              disabled={deleting}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashPage>
  );
}
