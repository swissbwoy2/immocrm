import { Suspense, lazy, useEffect } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { SearchTypeProvider } from "./contexts/SearchTypeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PageLoader } from "./components/PageLoader";
import { ScrollToTop } from "./components/ScrollToTop";
import { TikTokPixelProvider } from "./components/TikTokPixelProvider";
import { useAppVersionCheck } from "./hooks/useAppVersionCheck";

// Eager load critical pages
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
const HomePage = lazy(() => import("./pages/public-site/HomePage"));
const DemoPage = lazy(() => import("./pages/Demo"));

// Lazy load all other pages
const NouveauMandat = lazy(() => import("./pages/NouveauMandat"));
const MandatV3 = lazy(() => import("./pages/MandatV3"));
const MandatV3Suivi = lazy(() => import("./pages/MandatV3Suivi"));
const MandatRenouvellement = lazy(() => import("./pages/MandatRenouvellement"));
const VendreMonBien = lazy(() => import("./pages/VendreMonBien"));
const FormulaireVendeurComplet = lazy(() => import("./pages/FormulaireVendeurComplet"));
const RelouerMonAppartement = lazy(() => import("./pages/RelouerMonAppartement"));
const FormulaireRelouer = lazy(() => import("./pages/FormulaireRelouer"));
const ConstruireRenover = lazy(() => import("./pages/ConstruireRenover"));
const FormulaireConstruireRenover = lazy(() => import("./pages/FormulaireConstruireRenover"));
const FirstLogin = lazy(() => import("./pages/FirstLogin"));

const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Public portal pages
const PublicAnnonces = lazy(() => import("./pages/public/Annonces"));
const RechercheAnnonces = lazy(() => import("./pages/public/RechercheAnnonces"));
const AnnonceDetail = lazy(() => import("./pages/public/AnnonceDetail"));
const InscriptionAnnonceur = lazy(() => import("./pages/public/InscriptionAnnonceur"));
const ConnexionAnnonceur = lazy(() => import("./pages/public/ConnexionAnnonceur"));
const DownloadFiles = lazy(() => import("./pages/DownloadFiles"));
const InscriptionValidee = lazy(() => import("./pages/InscriptionValidee"));
const Test24hActive = lazy(() => import("./pages/Test24hActive"));

// Annonceur pages
const AnnonceurDashboard = lazy(() => import("./pages/annonceur/Dashboard"));
const AnnonceurMesAnnonces = lazy(() => import("./pages/annonceur/MesAnnonces"));
const AnnonceurNouvelleAnnonce = lazy(() => import("./pages/annonceur/NouvelleAnnonce"));
const AnnonceurMessages = lazy(() => import("./pages/annonceur/Messages"));
const AnnonceurProfil = lazy(() => import("./pages/annonceur/Profil"));
const AnnonceurParametres = lazy(() => import("./pages/annonceur/Parametres"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminAgents = lazy(() => import("./pages/admin/Agents"));
const AdminAgentDetail = lazy(() => import("./pages/admin/AgentDetail"));
const AdminClients = lazy(() => import("./pages/admin/Clients"));
const AdminClientDetail = lazy(() => import("./pages/admin/ClientDetail"));
const AdminAssignations = lazy(() => import("./pages/admin/Assignations"));
const AdminMandats = lazy(() => import("./pages/admin/Mandats"));
const AdminTransactions = lazy(() => import("./pages/admin/Transactions"));
const AdminOffresEnvoyees = lazy(() => import("./pages/admin/OffresEnvoyees"));
const AdminDocuments = lazy(() => import("./pages/admin/Documents"));
const AdminMessagerie = lazy(() => import("./pages/admin/Messagerie"));
const AdminMigrateDocuments = lazy(() => import("./pages/admin/MigrateDocuments"));
const AdminSuiviExtraits = lazy(() => import("./pages/admin/SuiviExtraitsPoursuites"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const AdminParametres = lazy(() => import("./pages/admin/Parametres"));
const AdminEnvoyerEmail = lazy(() => import("./pages/admin/EnvoyerEmail"));
const AdminEnvoyerOffre = lazy(() => import("./pages/admin/EnvoyerOffre"));
const AdminHistoriqueEmails = lazy(() => import("./pages/admin/HistoriqueEmails"));
const AdminBoiteReception = lazy(() => import("./pages/admin/BoiteReception"));
const AdminCalendrier = lazy(() => import("./pages/admin/Calendrier"));
const AdminRappels = lazy(() => import("./pages/admin/Rappels"));
const AdminCandidatures = lazy(() => import("./pages/admin/Candidatures"));
const AdminDemandesActivation = lazy(() => import("./pages/admin/DemandesActivation"));
const AdminFacturesAbaNinja = lazy(() => import("./pages/admin/FacturesAbaNinja"));
const AdminStatistiquesAgents = lazy(() => import("./pages/admin/StatistiquesAgents"));
const AdminRemplirPDF = lazy(() => import("./pages/admin/RemplirPDF"));
const AdminRemplirDemandeIA = lazy(() => import("./pages/admin/RemplirDemandeIA"));
const AdminLeads = lazy(() => import("./pages/admin/Leads"));
const AdminContacts = lazy(() => import("./pages/admin/Contacts"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const AdminSalaires = lazy(() => import("./pages/admin/Salaires"));
const AdminMetaLeads = lazy(() => import("./pages/admin/MetaLeads"));
const AdminAgentIA = lazy(() => import("./pages/admin/AgentIA"));
const StaffMandatPrefill = lazy(() => import("./pages/staff/MandatPrefill"));
const MandatV3SignOnly = lazy(() => import("./pages/mandat-v3/SignOnly"));

// Agent pages
const AgentDashboard = lazy(() => import("./pages/agent/Dashboard"));
const AgentMesClients = lazy(() => import("./pages/agent/MesClients"));
const AgentSuiviExtraits = lazy(() => import("./pages/agent/SuiviExtraitsPoursuites"));
const AgentClientDetail = lazy(() => import("./pages/agent/ClientDetail"));
const AgentEnvoyerOffre = lazy(() => import("./pages/agent/EnvoyerOffre"));
const AgentOffresEnvoyees = lazy(() => import("./pages/agent/OffresEnvoyees"));
const Wishlist = lazy(() => import("./pages/shared/Wishlist"));
const AgentMessagerie = lazy(() => import("./pages/agent/Messagerie"));
const AgentVisites = lazy(() => import("./pages/agent/Visites"));
const AgentCalendrier = lazy(() => import("./pages/agent/Calendrier"));
const AgentDocuments = lazy(() => import("./pages/agent/Documents"));
const AgentConclureAffaire = lazy(() => import("./pages/agent/ConclureAffaire"));
const AgentTransactions = lazy(() => import("./pages/agent/Transactions"));
const AgentNotifications = lazy(() => import("./pages/agent/Notifications"));
const AgentParametres = lazy(() => import("./pages/agent/Parametres"));
const AgentEnvoyerEmail = lazy(() => import("./pages/agent/EnvoyerEmail"));
const AgentHistoriqueEmails = lazy(() => import("./pages/agent/HistoriqueEmails"));
const AgentBoiteReception = lazy(() => import("./pages/agent/BoiteReception"));
const AgentCandidatures = lazy(() => import("./pages/agent/Candidatures"));
const AgentDeposerCandidature = lazy(() => import("./pages/agent/DeposerCandidature"));
const AgentRemplirPDF = lazy(() => import("./pages/agent/RemplirPDF"));
const AgentRemplirDemande = lazy(() => import("./pages/agent/RemplirDemande"));
const AgentContacts = lazy(() => import("./pages/agent/Contacts"));
const AgentBiensEnVente = lazy(() => import("./pages/agent/BiensEnVente"));
const AgentBienVenteDetail = lazy(() => import("./pages/agent/BienVenteDetail"));
const AgentProprietaires = lazy(() => import("./pages/agent/Proprietaires"));
const AgentProprietaireDetail = lazy(() => import("./pages/agent/ProprietaireDetail"));
const AgentCarte = lazy(() => import("./pages/agent/Carte"));
const AgentFormation = lazy(() => import("./pages/agent/Formation"));
const AgentFormationChapitre = lazy(() => import("./pages/agent/FormationChapitre"));

// Coursier pages
const CoursierDashboard = lazy(() => import("./pages/coursier/Dashboard"));
const CoursierMissions = lazy(() => import("./pages/coursier/Missions"));
const CoursierCarte = lazy(() => import("./pages/coursier/Carte"));
const CoursierCalendrier = lazy(() => import("./pages/coursier/Calendrier"));
const CoursierHistorique = lazy(() => import("./pages/coursier/Historique"));
const CoursierParametres = lazy(() => import("./pages/coursier/Parametres"));

// Closeur pages
const CloseurDashboard = lazy(() => import("./pages/closeur/Dashboard"));

// Client pages
const ClientDashboard = lazy(() => import("./pages/client/Dashboard"));
const ClientDossier = lazy(() => import("./pages/client/Dossier"));
const ClientMonContrat = lazy(() => import("./pages/client/MonContrat"));
const ClientOffresRecues = lazy(() => import("./pages/client/OffresRecues"));
const ClientVisites = lazy(() => import("./pages/client/Visites"));
const ClientCalendrier = lazy(() => import("./pages/client/Calendrier"));
const ClientMesCandidatures = lazy(() => import("./pages/client/MesCandidatures"));
const ClientMessagerie = lazy(() => import("./pages/client/Messagerie"));
const ClientDocuments = lazy(() => import("./pages/client/Documents"));
const ClientVisitesDeleguees = lazy(() => import("./pages/client/VisitesDeleguees"));
const ClientNotifications = lazy(() => import("./pages/client/Notifications"));
const ClientParametres = lazy(() => import("./pages/client/Parametres"));
const ClientAnnonces = lazy(() => import("./pages/client/Annonces"));
const ClientCarte = lazy(() => import("./pages/client/Carte"));

// Apporteur pages
const ApporteurDashboard = lazy(() => import("./pages/apporteur/Dashboard"));
const ApporteurSoumettreClient = lazy(() => import("./pages/apporteur/SoumettreClient"));
const ApporteurMesReferrals = lazy(() => import("./pages/apporteur/MesReferrals"));
const ApporteurCommissions = lazy(() => import("./pages/apporteur/Commissions"));
const ApporteurMonContrat = lazy(() => import("./pages/apporteur/MonContrat"));
const ApporteurMonProfil = lazy(() => import("./pages/apporteur/MonProfil"));
const ApporteurNotifications = lazy(() => import("./pages/apporteur/Notifications"));
const ApporteurParametres = lazy(() => import("./pages/apporteur/Parametres"));

// Admin Apporteurs pages
const AdminApporteurs = lazy(() => import("./pages/admin/Apporteurs"));
const AdminApporteurDetail = lazy(() => import("./pages/admin/ApporteurDetail"));
const AdminReferrals = lazy(() => import("./pages/admin/Referrals"));
const AdminBiensEnVente = lazy(() => import("./pages/admin/BiensEnVente"));
const AdminBienVenteDetail = lazy(() => import("./pages/admin/BienVenteDetail"));
const AdminInteretsAcheteurs = lazy(() => import("./pages/admin/InteretsAcheteurs"));

// Admin Projets Développement pages
const AdminProjetsDeveloppement = lazy(() => import("./pages/admin/ProjetsDeveloppement"));
const AdminProjetDeveloppementDetail = lazy(() => import("./pages/admin/ProjetDeveloppementDetail"));

// Renovation pages
const RenovationProjectsPage = lazy(() => import("./features/renovation/pages/RenovationProjectsPage"));
const RenovationProjectPage = lazy(() => import("./features/renovation/pages/RenovationProjectPage"));

// Admin Proprietaires page
const AdminProprietaires = lazy(() => import("./pages/admin/Proprietaires"));
const AdminProprietaireDetail = lazy(() => import("./pages/admin/ProprietaireDetail"));

// Admin Annonces Publiques & Annonceurs pages
const AdminAnnoncesPubliques = lazy(() => import("./pages/admin/AnnoncesPubliques"));
const AdminAnnonceurs = lazy(() => import("./pages/admin/Annonceurs"));
const AdminAnnonceurDetail = lazy(() => import("./pages/admin/AnnonceurDetail"));

// Admin Coursiers page
const AdminCoursiers = lazy(() => import("./pages/admin/Coursiers"));

// Proprietaire pages
const ProprietaireDashboard = lazy(() => import("./pages/proprietaire/Dashboard"));
const ProprietaireMesImmeubles = lazy(() => import("./pages/proprietaire/MesImmeubles"));
const ProprietaireImmeubleDetail = lazy(() => import("./pages/proprietaire/ImmeubleDetail"));
const ProprietaireLocataires = lazy(() => import("./pages/proprietaire/Locataires"));
const ProprietaireComptabilite = lazy(() => import("./pages/proprietaire/Comptabilite"));
const ProprietaireTickets = lazy(() => import("./pages/proprietaire/Tickets"));
const ProprietaireDocuments = lazy(() => import("./pages/proprietaire/Documents"));
const ProprietaireBaux = lazy(() => import("./pages/proprietaire/Baux"));
const ProprietaireHypotheques = lazy(() => import("./pages/proprietaire/Hypotheques"));
const ProprietaireAssurances = lazy(() => import("./pages/proprietaire/Assurances"));
const ProprietaireCalendrier = lazy(() => import("./pages/proprietaire/Calendrier"));
const ProprietaireMessagerie = lazy(() => import("./pages/proprietaire/Messagerie"));
const ProprietaireNotifications = lazy(() => import("./pages/proprietaire/Notifications"));
const ProprietaireParametres = lazy(() => import("./pages/proprietaire/Parametres"));
const ProprietaireProjetsDeveloppement = lazy(() => import("./pages/proprietaire/ProjetsDeveloppement"));
const ProprietaireProjetDetail = lazy(() => import("./pages/proprietaire/ProjetDetail"));
const ProprietaireVendreMonBien = lazy(() => import("./pages/proprietaire/VendreMonBienProprietaire"));
const ProprietaireBailDetail = lazy(() => import("./pages/proprietaire/BailDetail"));
const ProprietaireHypothequeDetail = lazy(() => import("./pages/proprietaire/HypothequeDetail"));
const ProprietaireAssuranceDetail = lazy(() => import("./pages/proprietaire/AssuranceDetail"));
// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Component to use hooks inside providers
const AppContent = () => {
  const location = useLocation();
  useAppVersionCheck();

  // Track SPA page views for Meta Pixel
  useEffect(() => {
    if ((window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <ScrollToTop />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <TikTokPixelProvider>
          <AuthProvider>
            <AppContent />
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<HomePage />} />
              
              <Route path="/login" element={<Login />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/nouveau-mandat" element={<NouveauMandat />} />
              <Route path="/mandat-v3" element={<MandatV3 />} />
              <Route path="/mandat-v3/suivi" element={<MandatV3Suivi />} />
              <Route path="/mandat-v3/sign/:token" element={<MandatV3SignOnly />} />
              <Route path="/mandat/renouvellement" element={<MandatRenouvellement />} />
              <Route path="/vendre-mon-bien" element={<VendreMonBien />} />
              <Route path="/formulaire-vendeur" element={<FormulaireVendeurComplet />} />
              <Route path="/relouer-mon-appartement" element={<RelouerMonAppartement />} />
              <Route path="/formulaire-relouer" element={<FormulaireRelouer />} />
              <Route path="/construire-renover" element={<ConstruireRenover />} />
              <Route path="/formulaire-construire-renover" element={<FormulaireConstruireRenover />} />
              <Route path="/first-login" element={<FirstLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public Portal Routes */}
              <Route path="/annonces" element={<PublicAnnonces />} />
              <Route path="/annonces/recherche" element={<RechercheAnnonces />} />
              <Route path="/annonces/:slug" element={<AnnonceDetail />} />
              <Route path="/inscription-annonceur" element={<InscriptionAnnonceur />} />
              <Route path="/connexion-annonceur" element={<ConnexionAnnonceur />} />
              
              {/* Annonceur Routes - Protected */}
              <Route path="/espace-annonceur" element={<AnnonceurDashboard />} />
              <Route path="/espace-annonceur/mes-annonces" element={<AnnonceurMesAnnonces />} />
              <Route path="/espace-annonceur/mes-annonces/:id" element={<AnnonceurNouvelleAnnonce />} />
              <Route path="/espace-annonceur/nouvelle-annonce" element={<AnnonceurNouvelleAnnonce />} />
              <Route path="/espace-annonceur/messages" element={<AnnonceurMessages />} />
              <Route path="/espace-annonceur/messages/:conversationId" element={<AnnonceurMessages />} />
              <Route path="/espace-annonceur/profil" element={<AnnonceurProfil />} />
              <Route path="/espace-annonceur/parametres" element={<AnnonceurParametres />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/agents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAgents /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/agents/:agentId" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAgentDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminClients /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/clients/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminClientDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/clients/:id/mandat-prefill" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><StaffMandatPrefill /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/assignations" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAssignations /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/mandats" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMandats /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/transactions" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminTransactions /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/offres-envoyees" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminOffresEnvoyees /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/wishlist" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><Wishlist /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/documents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/migrate-documents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMigrateDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/suivi-extraits" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminSuiviExtraits /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/messagerie" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMessagerie /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/parametres" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminParametres /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/envoyer-email" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminEnvoyerEmail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/envoyer-offre" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminEnvoyerOffre /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/historique-emails" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminHistoriqueEmails /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/boite-reception" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminBoiteReception /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/calendrier" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/rappels" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRappels /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/candidatures" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/demandes-activation" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminDemandesActivation /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/factures-abaninja" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminFacturesAbaNinja /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/statistiques-agents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminStatistiquesAgents /></AppLayout></ProtectedRoute>} />
<Route path="/admin/remplir-pdf" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRemplirPDF /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/remplir-demande-ia" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRemplirDemandeIA /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/leads" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminLeads /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/contacts" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminContacts /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/salaires" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminSalaires /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAnalytics /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/meta-leads" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMetaLeads /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/agent-ia" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAgentIA /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/proprietaires" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminProprietaires /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/proprietaires/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminProprietaireDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/biens-vente" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminBiensEnVente /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/biens-vente/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminBienVenteDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/interets-acheteurs" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminInteretsAcheteurs /></AppLayout></ProtectedRoute>} />
              <Route path="/agent" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/mes-clients" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentMesClients /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/suivi-extraits" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentSuiviExtraits /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/clients/:id" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentClientDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/clients/:id/mandat-prefill" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><StaffMandatPrefill /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/envoyer-offre" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentEnvoyerOffre /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/offres-envoyees" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentOffresEnvoyees /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/wishlist" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><Wishlist /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/visites" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentVisites /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/calendrier" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/documents" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/messagerie" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentMessagerie /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/conclure-affaire" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentConclureAffaire /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/transactions" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentTransactions /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/notifications" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/parametres" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentParametres /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/envoyer-email" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentEnvoyerEmail /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/historique-emails" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentHistoriqueEmails /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/boite-reception" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentBoiteReception /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/candidatures" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/deposer-candidature" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentDeposerCandidature /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/remplir-pdf" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentRemplirPDF /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/remplir-demande" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentRemplirDemande /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/contacts" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentContacts /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/formation" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentFormation /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/formation/:chapitreId" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentFormationChapitre /></AppLayout></ProtectedRoute>} />
              
              <Route path="/agent/biens-vente" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentBiensEnVente /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/biens-vente/:id" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentBienVenteDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/proprietaires" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentProprietaires /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/proprietaires/:id" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentProprietaireDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/carte" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><AppLayout><AgentCarte /></AppLayout></ProtectedRoute>} />

              {/* Agent Renovation Routes */}
              <Route path="/agent/renovation" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><RenovationProjectsPage /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/renovation/:id" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><RenovationProjectPage /></AppLayout></ProtectedRoute>} />

              {/* Client Routes */}
              <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/client/dossier" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDossier /></AppLayout></ProtectedRoute>} />
              <Route path="/client/mon-contrat" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientMonContrat /></AppLayout></ProtectedRoute>} />
              <Route path="/client/offres-recues" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientOffresRecues /></AppLayout></ProtectedRoute>} />
              <Route path="/client/visites" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientVisites /></AppLayout></ProtectedRoute>} />
              <Route path="/client/calendrier" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/client/visites-deleguees" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientVisitesDeleguees /></AppLayout></ProtectedRoute>} />
              <Route path="/client/mes-candidatures" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientMesCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/client/messagerie" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientMessagerie /></AppLayout></ProtectedRoute>} />
              <Route path="/client/documents" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/client/notifications" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/client/parametres" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientParametres /></AppLayout></ProtectedRoute>} />
              <Route path="/client/annonces" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientAnnonces /></AppLayout></ProtectedRoute>} />
              <Route path="/client/carte" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientCarte /></AppLayout></ProtectedRoute>} />
              <Route path="/client/renovation" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><RenovationProjectsPage /></AppLayout></ProtectedRoute>} />
              <Route path="/client/renovation/:id" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><RenovationProjectPage /></AppLayout></ProtectedRoute>} />

              {/* Apporteur Routes */}
              <Route path="/apporteur" element={<ProtectedRoute allowedRoles={['apporteur']}><AppLayout><ApporteurDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/apporteur/soumettre-client" element={<ProtectedRoute allowedRoles={['apporteur']}><AppLayout><ApporteurSoumettreClient /></AppLayout></ProtectedRoute>} />
              <Route path="/apporteur/mes-referrals" element={<ProtectedRoute allowedRoles={['apporteur']}><AppLayout><ApporteurMesReferrals /></AppLayout></ProtectedRoute>} />
              <Route path="/apporteur/commissions" element={<ProtectedRoute allowedRoles={['apporteur']}><AppLayout><ApporteurCommissions /></AppLayout></ProtectedRoute>} />
              <Route path="/apporteur/mon-contrat" element={<ProtectedRoute allowedRoles={['apporteur']}><AppLayout><ApporteurMonContrat /></AppLayout></ProtectedRoute>} />
              <Route path="/apporteur/profil" element={<ProtectedRoute allowedRoles={['apporteur']}><AppLayout><ApporteurMonProfil /></AppLayout></ProtectedRoute>} />
              <Route path="/apporteur/notifications" element={<ProtectedRoute allowedRoles={['apporteur']}><AppLayout><ApporteurNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/apporteur/parametres" element={<ProtectedRoute allowedRoles={['apporteur']}><AppLayout><ApporteurParametres /></AppLayout></ProtectedRoute>} />

              {/* Admin Apporteurs Routes */}
              <Route path="/admin/apporteurs" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminApporteurs /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/apporteurs/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminApporteurDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/referrals" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminReferrals /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/biens-vente" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminBiensEnVente /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/interets-acheteurs" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminInteretsAcheteurs /></AppLayout></ProtectedRoute>} />
              
              {/* Admin Projets Développement Routes */}
              <Route path="/admin/projets-developpement" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminProjetsDeveloppement /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/projets-developpement/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminProjetDeveloppementDetail /></AppLayout></ProtectedRoute>} />

              {/* Admin Renovation Routes */}
              <Route path="/admin/renovation" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><RenovationProjectsPage /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/renovation/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><RenovationProjectPage /></AppLayout></ProtectedRoute>} />

              {/* Admin Annonces Publiques & Annonceurs Routes */}
              <Route path="/admin/annonces-publiques" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAnnoncesPubliques /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/annonceurs" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAnnonceurs /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/annonceurs/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAnnonceurDetail /></AppLayout></ProtectedRoute>} />

              {/* Admin Coursiers Routes */}
              <Route path="/admin/coursiers" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCoursiers /></AppLayout></ProtectedRoute>} />

              {/* Coursier Routes */}
              <Route path="/coursier" element={<ProtectedRoute allowedRoles={['coursier']}><AppLayout><CoursierDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/coursier/missions" element={<ProtectedRoute allowedRoles={['coursier']}><AppLayout><CoursierMissions /></AppLayout></ProtectedRoute>} />
              <Route path="/coursier/carte" element={<ProtectedRoute allowedRoles={['coursier']}><AppLayout><CoursierCarte /></AppLayout></ProtectedRoute>} />
              <Route path="/coursier/calendrier" element={<ProtectedRoute allowedRoles={['coursier']}><AppLayout><CoursierCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/coursier/historique" element={<ProtectedRoute allowedRoles={['coursier']}><AppLayout><CoursierHistorique /></AppLayout></ProtectedRoute>} />
              <Route path="/coursier/parametres" element={<ProtectedRoute allowedRoles={['coursier']}><AppLayout><CoursierParametres /></AppLayout></ProtectedRoute>} />

              {/* Closeur Routes */}
              <Route path="/closeur" element={<ProtectedRoute allowedRoles={['closeur']}><AppLayout><CloseurDashboard /></AppLayout></ProtectedRoute>} />
              {/* Proprietaire Routes */}
              <Route path="/proprietaire" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/immeubles" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireMesImmeubles /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/immeubles/:id" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireImmeubleDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/locataires" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireLocataires /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/comptabilite" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireComptabilite /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/tickets" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireTickets /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/documents" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/baux" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireBaux /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/baux/:id" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireBailDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/hypotheques" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireHypotheques /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/hypotheques/:id" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireHypothequeDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/assurances" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireAssurances /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/assurances/:id" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireAssuranceDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/calendrier" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/messagerie" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireMessagerie /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/notifications" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/parametres" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireParametres /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/projets-developpement" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireProjetsDeveloppement /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/projets-developpement/:id" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireProjetDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/renovation" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><RenovationProjectsPage /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/renovation/:id" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><RenovationProjectPage /></AppLayout></ProtectedRoute>} />
              <Route path="/proprietaire/vente" element={<ProtectedRoute allowedRoles={['proprietaire']}><AppLayout><ProprietaireVendreMonBien /></AppLayout></ProtectedRoute>} />

              {/* Public Routes */}
              <Route path="/download/:token" element={<DownloadFiles />} />
              <Route path="/inscription-validee" element={<InscriptionValidee />} />
              <Route path="/test-24h-active" element={<Test24hActive />} />

              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </TikTokPixelProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
