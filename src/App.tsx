import { Suspense, lazy, useEffect } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { CallProvider } from "./contexts/CallContext";
import { SearchTypeProvider } from "./contexts/SearchTypeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PageLoader } from "./components/PageLoader";
import { ScrollToTop } from "./components/ScrollToTop";
import { TikTokPixelProvider } from "./components/TikTokPixelProvider";
import { useAppVersionCheck } from "./hooks/useAppVersionCheck";
import { IOSAppInterstitial } from "./components/IOSAppInterstitial";
import { RouteSeo } from "./components/RouteSeo";

// Eager load critical pages
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
const HomePage = lazyWithRetry(() => import("./pages/public-site/HomePage"));
const DemoPage = lazyWithRetry(() => import("./pages/Demo"));

// Lazy load all other pages
const NouveauMandat = lazyWithRetry(() => import("./pages/NouveauMandat"));
const MandatV3Suivi = lazyWithRetry(() => import("./pages/MandatV3Suivi"));
const MandatRenouvellement = lazyWithRetry(() => import("./pages/MandatRenouvellement"));
// Parcours propriétaires retirés du frontend public (redirigés vers Immo-rama.ch)
import { ExternalRedirect } from "./components/ExternalRedirect";
const PortailMaintenance = lazyWithRetry(() => import("./pages/PortailMaintenance"));
const ChasseurAppartement = lazyWithRetry(() => import("./pages/ChasseurAppartement"));
const RendezVousBureau = lazyWithRetry(() => import("./pages/RendezVousBureau"));
const RelouerMonAppartement = lazyWithRetry(() => import("./pages/RelouerMonAppartement"));
const FormulaireRelouer = lazyWithRetry(() => import("./pages/FormulaireRelouer"));
const AccompagnementAchat = lazyWithRetry(() => import("./pages/AccompagnementAchat"));
const FirstLogin = lazyWithRetry(() => import("./pages/FirstLogin"));
const MentionsLegales = lazyWithRetry(() => import("./pages/legal/MentionsLegales"));
const PolitiqueConfidentialite = lazyWithRetry(() => import("./pages/legal/PolitiqueConfidentialite"));
const ConditionsGenerales = lazyWithRetry(() => import("./pages/legal/ConditionsGenerales"));
const MentionsLegalesEN = lazyWithRetry(() => import("./pages/legal/MentionsLegales.en"));
const PolitiqueConfidentialiteEN = lazyWithRetry(() => import("./pages/legal/PolitiqueConfidentialite.en"));
const MentionsLegalesDE = lazyWithRetry(() => import("./pages/legal/MentionsLegales.de"));
const PolitiqueConfidentialiteDE = lazyWithRetry(() => import("./pages/legal/PolitiqueConfidentialite.de"));

const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const BotLoginCode = lazyWithRetry(() => import("./pages/BotLoginCode"));
const Appel = lazyWithRetry(() => import("./pages/Appel"));
const OAuthConsent = lazyWithRetry(() => import("./pages/OAuthConsent"));
const Unsubscribe = lazyWithRetry(() => import("./pages/Unsubscribe"));


// Public portal pages
const RechercheAnnonces = lazyWithRetry(() => import("./pages/public/RechercheAnnonces"));
const AnnonceurPublic = lazyWithRetry(() => import("./pages/public/AnnonceurPublic"));

const MesMessagesAnnonces = lazyWithRetry(() => import("./pages/public/MesMessagesAnnonces"));
const MesAlertesAnnonces = lazyWithRetry(() => import("./pages/public/MesAlertesAnnonces"));
const AnnonceDetail = lazyWithRetry(() => import("./pages/public/AnnonceDetail"));
const OffreAnnonceDetail = lazyWithRetry(() => import("./pages/public/OffreAnnonceDetail"));

const InscriptionAnnonceur = lazyWithRetry(() => import("./pages/public/InscriptionAnnonceur"));
const ConnexionAnnonceur = lazyWithRetry(() => import("./pages/public/ConnexionAnnonceur"));
const DownloadFiles = lazyWithRetry(() => import("./pages/DownloadFiles"));
const InscriptionValidee = lazyWithRetry(() => import("./pages/InscriptionValidee"));
const Test24hActive = lazyWithRetry(() => import("./pages/Test24hActive"));

// Annonceur pages
const AnnonceurDashboard = lazyWithRetry(() => import("./pages/annonceur/Dashboard"));
const AnnonceurMesAnnonces = lazyWithRetry(() => import("./pages/annonceur/MesAnnonces"));
const AnnonceurNouvelleAnnonce = lazyWithRetry(() => import("./pages/annonceur/NouvelleAnnonce"));
const AnnonceurMessages = lazyWithRetry(() => import("./pages/annonceur/Messages"));
const AnnonceurProfil = lazyWithRetry(() => import("./pages/annonceur/Profil"));
const AnnonceurParametres = lazyWithRetry(() => import("./pages/annonceur/Parametres"));

// Admin pages
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/Dashboard"));
const AdminAgents = lazyWithRetry(() => import("./pages/admin/Agents"));
const AdminAgentDetail = lazyWithRetry(() => import("./pages/admin/AgentDetail"));
const AdminClients = lazyWithRetry(() => import("./pages/admin/Clients"));
const AdminInscriptionsEchouees = lazyWithRetry(() => import("./pages/admin/InscriptionsEchouees"));
const AdminClientDetail = lazyWithRetry(() => import("./pages/admin/ClientDetail"));
// /admin/relouer (liste) supprimé de la sidebar — la route redirige vers /admin/clients?tab=reloueurs
const AdminRelouerDetail = lazyWithRetry(() => import("./pages/admin/RelouerDetail"));
const ClientDashboardRelouer = lazyWithRetry(() => import("./pages/client/DashboardRelouer"));
const AdminAssignations = lazyWithRetry(() => import("./pages/admin/Assignations"));
const AdminMandats = lazyWithRetry(() => import("./pages/admin/Mandats"));
const AdminTransactions = lazyWithRetry(() => import("./pages/admin/Transactions"));
const AdminOffresEnvoyees = lazyWithRetry(() => import("./pages/admin/OffresEnvoyees"));
const AdminDocuments = lazyWithRetry(() => import("./pages/admin/Documents"));
const AdminMessagerie = lazyWithRetry(() => import("./pages/admin/Messagerie"));
const AdminMigrateDocuments = lazyWithRetry(() => import("./pages/admin/MigrateDocuments"));
const AdminSuiviExtraits = lazyWithRetry(() => import("./pages/admin/SuiviExtraitsPoursuites"));
const AdminNotifications = lazyWithRetry(() => import("./pages/admin/Notifications"));
const SupportClient = lazyWithRetry(() => import("./pages/support/SupportClient"));
const SupportStaff = lazyWithRetry(() => import("./pages/support/SupportStaff"));
const AdminParametres = lazyWithRetry(() => import("./pages/admin/Parametres"));
const AdminWhatsAppNotifications = lazyWithRetry(() => import("./pages/admin/WhatsAppNotifications"));
const AdminEnvoyerEmail = lazyWithRetry(() => import("./pages/admin/EnvoyerEmail"));
const AdminEnvoyerOffre = lazyWithRetry(() => import("./pages/admin/EnvoyerOffre"));
const AdminHistoriqueEmails = lazyWithRetry(() => import("./pages/admin/HistoriqueEmails"));
const AdminBoiteReception = lazyWithRetry(() => import("./pages/admin/BoiteReception"));
const AdminCalendrier = lazyWithRetry(() => import("./pages/admin/Calendrier"));
const AdminVisites = lazyWithRetry(() => import("./pages/admin/Visites"));
const AdminPortailBannieres = lazyWithRetry(() => import("./pages/admin/PortailBannieres"));
const AdminRappels = lazyWithRetry(() => import("./pages/admin/Rappels"));
const AdminCandidatures = lazyWithRetry(() => import("./pages/admin/Candidatures"));
const AdminDeposerCandidature = lazyWithRetry(() => import("./pages/admin/DeposerCandidature"));
const AdminDemandesActivation = lazyWithRetry(() => import("./pages/admin/DemandesActivation"));
const AdminFacturesAbaNinja = lazyWithRetry(() => import("./pages/admin/FacturesAbaNinja"));
const AdminStatistiquesAgents = lazyWithRetry(() => import("./pages/admin/StatistiquesAgents"));
const AdminRemplirPDF = lazyWithRetry(() => import("./pages/admin/RemplirPDF"));
const AdminRemplirDemandeIA = lazyWithRetry(() => import("./pages/admin/RemplirDemandeIA"));
const ModelesDemandeLocation = lazyWithRetry(() => import("./features/postulation-auto/pages/ModelesDemandeLocation"));
const RemplirDemandeLocation = lazyWithRetry(() => import("./features/postulation-auto/pages/RemplirDemandeLocation"));
const AdminLeads = lazyWithRetry(() => import("./pages/admin/Leads"));
const AdminAutoOffres = lazyWithRetry(() => import("./pages/admin/AutoOffres"));
const AdminOffresAuto = lazyWithRetry(() => import("./pages/admin/OffresAuto"));
const AdminPostulations = lazyWithRetry(() => import("./pages/admin/Postulations"));
const AgentPostulations = lazyWithRetry(() => import("./pages/agent/Postulations"));
const AdminContacts = lazyWithRetry(() => import("./pages/admin/Contacts"));
const AdminAnalytics = lazyWithRetry(() => import("./pages/admin/Analytics"));
const AdminSalaires = lazyWithRetry(() => import("./pages/admin/Salaires"));
const AdminRegistreCommissions = lazyWithRetry(() => import("./pages/admin/RegistreCommissions"));
const AdminCandidaturesRelocation = lazyWithRetry(() => import("./pages/admin/CandidaturesRelocation"));
const AdminSalairesAgents = lazyWithRetry(() => import("./pages/admin/SalairesAgents"));
const AdminMetaLeads = lazyWithRetry(() => import("./pages/admin/MetaLeads"));
const AdminNewsletter = lazyWithRetry(() => import("./pages/admin/Newsletter"));
const AdminCampagnesSuivi = lazyWithRetry(() => import("./pages/admin/CampagnesSuivi"));
const AdminAgentIA = lazyWithRetry(() => import("./pages/admin/AgentIA"));
const AdminComptesRendus = lazyWithRetry(() => import("./pages/admin/ComptesRendus"));
const AdminWhatsAppInbox = lazyWithRetry(() => import("./pages/admin/WhatsAppInbox"));
const AdminWhatsAppLogs = lazyWithRetry(() => import("./pages/admin/WhatsAppLogs"));
const AgentWhatsAppInbox = lazyWithRetry(() => import("./pages/agent/WhatsAppInbox"));
const AgentMessageTemplates = lazyWithRetry(() => import("./pages/agent/MessageTemplates"));
const StaffMandatPrefill = lazyWithRetry(() => import("./pages/staff/MandatPrefill"));
const MandatV3SignOnly = lazyWithRetry(() => import("./pages/mandat-v3/SignOnly"));

// Agent pages
const AgentDashboard = lazyWithRetry(() => import("./pages/agent/Dashboard"));
const AgentMesClients = lazyWithRetry(() => import("./pages/agent/MesClients"));
const AgentSuiviExtraits = lazyWithRetry(() => import("./pages/agent/SuiviExtraitsPoursuites"));
const AgentClientDetail = lazyWithRetry(() => import("./pages/agent/ClientDetail"));
const AgentEnvoyerOffre = lazyWithRetry(() => import("./pages/agent/EnvoyerOffre"));
const AgentOffresEnvoyees = lazyWithRetry(() => import("./pages/agent/OffresEnvoyees"));
const AgentOffresAuto = lazyWithRetry(() => import("./pages/agent/OffresAuto"));
const Wishlist = lazyWithRetry(() => import("./pages/shared/Wishlist"));
const AgentMessagerie = lazyWithRetry(() => import("./pages/agent/Messagerie"));
const AgentVisites = lazyWithRetry(() => import("./pages/agent/Visites"));
const AgentCompteRenduVisite = lazyWithRetry(() => import("./pages/agent/CompteRenduVisite"));
const AgentFicheDetailleeBien = lazyWithRetry(() => import("./pages/agent/FicheDetailleeBien"));
const AgentCalendrier = lazyWithRetry(() => import("./pages/agent/Calendrier"));
const AgentDocuments = lazyWithRetry(() => import("./pages/agent/Documents"));
const AgentConclureAffaire = lazyWithRetry(() => import("./pages/agent/ConclureAffaire"));
const AgentTransactions = lazyWithRetry(() => import("./pages/agent/Transactions"));
const AgentNotifications = lazyWithRetry(() => import("./pages/agent/Notifications"));
const AgentParametres = lazyWithRetry(() => import("./pages/agent/Parametres"));
const AgentEnvoyerEmail = lazyWithRetry(() => import("./pages/agent/EnvoyerEmail"));
const AgentHistoriqueEmails = lazyWithRetry(() => import("./pages/agent/HistoriqueEmails"));
const AgentBoiteReception = lazyWithRetry(() => import("./pages/agent/BoiteReception"));
const AgentCandidatures = lazyWithRetry(() => import("./pages/agent/Candidatures"));
const AgentDeposerCandidature = lazyWithRetry(() => import("./pages/agent/DeposerCandidature"));
const AgentRemplirPDF = lazyWithRetry(() => import("./pages/agent/RemplirPDF"));
const AgentRemplirDemande = lazyWithRetry(() => import("./pages/agent/RemplirDemande"));
const AgentContacts = lazyWithRetry(() => import("./pages/agent/Contacts"));
const AgentBiensEnVente = lazyWithRetry(() => import("./pages/agent/BiensEnVente"));
const AgentBienVenteDetail = lazyWithRetry(() => import("./pages/agent/BienVenteDetail"));
const AgentProprietaires = lazyWithRetry(() => import("./pages/agent/Proprietaires"));
const AgentProprietaireDetail = lazyWithRetry(() => import("./pages/agent/ProprietaireDetail"));
const AgentCarte = lazyWithRetry(() => import("./pages/agent/Carte"));
const AgentFormation = lazyWithRetry(() => import("./pages/agent/Formation"));
const AgentFormationChapitre = lazyWithRetry(() => import("./pages/agent/FormationChapitre"));

// Coursier pages
const CoursierDashboard = lazyWithRetry(() => import("./pages/coursier/Dashboard"));
const CandidatDashboard = lazyWithRetry(() => import("./pages/candidat/Dashboard"));
const CandidatCandidatures = lazyWithRetry(() => import("./pages/candidat/Candidatures"));
const CandidatDemande = lazyWithRetry(() => import("./pages/candidat/Demande"));
const CandidatAgenda = lazyWithRetry(() => import("./pages/candidat/Agenda"));
const CandidatMessages = lazyWithRetry(() => import("./pages/candidat/Messages"));
const CoursierMissions = lazyWithRetry(() => import("./pages/coursier/Missions"));
const CoursierCarte = lazyWithRetry(() => import("./pages/coursier/Carte"));
const CoursierCalendrier = lazyWithRetry(() => import("./pages/coursier/Calendrier"));
const CoursierHistorique = lazyWithRetry(() => import("./pages/coursier/Historique"));
const CoursierParametres = lazyWithRetry(() => import("./pages/coursier/Parametres"));
const CoursierCompteRenduVisite = lazyWithRetry(() => import("./pages/coursier/CompteRenduVisite"));

// Closeur pages
const CloseurDashboard = lazyWithRetry(() => import("./pages/closeur/Dashboard"));

// Client pages
const ClientDashboard = lazyWithRetry(() => import("./pages/client/Dashboard"));
const ClientDossier = lazyWithRetry(() => import("./pages/client/Dossier"));
const ClientMonContrat = lazyWithRetry(() => import("./pages/client/MonContrat"));
const ClientOffresRecues = lazyWithRetry(() => import("./pages/client/OffresRecues"));
const ClientVideosRecues = lazyWithRetry(() => import("./pages/client/VideosRecues"));
const ClientVisites = lazyWithRetry(() => import("./pages/client/Visites"));
const ClientCalendrier = lazyWithRetry(() => import("./pages/client/Calendrier"));
const ClientMesCandidatures = lazyWithRetry(() => import("./pages/client/MesCandidatures"));
const ClientMessagerie = lazyWithRetry(() => import("./pages/client/Messagerie"));
const ClientDocuments = lazyWithRetry(() => import("./pages/client/Documents"));
const ClientVisitesDeleguees = lazyWithRetry(() => import("./pages/client/VisitesDeleguees"));
const ClientNotifications = lazyWithRetry(() => import("./pages/client/Notifications"));
const ClientParametres = lazyWithRetry(() => import("./pages/client/Parametres"));
const ClientAnnonces = lazyWithRetry(() => import("./pages/client/Annonces"));
const ClientCarte = lazyWithRetry(() => import("./pages/client/Carte"));
const ClientBiensProposes = lazyWithRetry(() => import("./pages/client/BiensProposes"));
const ClientBiensSelectionnes = lazyWithRetry(() => import("./pages/client/BiensSelectionnes"));
const ClientFinancementAchat = lazyWithRetry(() => import("./pages/client/FinancementAchat"));

// Apporteur pages
const ApporteurDashboard = lazyWithRetry(() => import("./pages/apporteur/Dashboard"));
const ApporteurSoumettreClient = lazyWithRetry(() => import("./pages/apporteur/SoumettreClient"));
const ApporteurMesReferrals = lazyWithRetry(() => import("./pages/apporteur/MesReferrals"));
const ApporteurCommissions = lazyWithRetry(() => import("./pages/apporteur/Commissions"));
const ApporteurMonContrat = lazyWithRetry(() => import("./pages/apporteur/MonContrat"));
const ApporteurMonProfil = lazyWithRetry(() => import("./pages/apporteur/MonProfil"));
const ApporteurNotifications = lazyWithRetry(() => import("./pages/apporteur/Notifications"));
const ApporteurParametres = lazyWithRetry(() => import("./pages/apporteur/Parametres"));

// Admin Apporteurs pages
const AdminApporteurs = lazyWithRetry(() => import("./pages/admin/Apporteurs"));
const AdminApporteurDetail = lazyWithRetry(() => import("./pages/admin/ApporteurDetail"));
const AdminReferrals = lazyWithRetry(() => import("./pages/admin/Referrals"));
const AdminBiensEnVente = lazyWithRetry(() => import("./pages/admin/BiensEnVente"));
const AdminBienVenteDetail = lazyWithRetry(() => import("./pages/admin/BienVenteDetail"));
const AdminInteretsAcheteurs = lazyWithRetry(() => import("./pages/admin/InteretsAcheteurs"));

// Admin Projets Développement pages
const AdminProjetsDeveloppement = lazyWithRetry(() => import("./pages/admin/ProjetsDeveloppement"));
const AdminProjetDeveloppementDetail = lazyWithRetry(() => import("./pages/admin/ProjetDeveloppementDetail"));

// Renovation pages
const RenovationProjectsPage = lazyWithRetry(() => import("./features/renovation/pages/RenovationProjectsPage"));
const RenovationProjectPage = lazyWithRetry(() => import("./features/renovation/pages/RenovationProjectPage"));

// Admin Proprietaires page
const AdminProprietaires = lazyWithRetry(() => import("./pages/admin/Proprietaires"));
const AdminProprietaireDetail = lazyWithRetry(() => import("./pages/admin/ProprietaireDetail"));

// Admin Annonces Publiques & Annonceurs pages
const AdminAnnoncesPubliques = lazyWithRetry(() => import("./pages/admin/AnnoncesPubliques"));
const AdminAnnonceurs = lazyWithRetry(() => import("./pages/admin/Annonceurs"));
const AdminAnnonceurDetail = lazyWithRetry(() => import("./pages/admin/AnnonceurDetail"));

// Admin Coursiers page
const AdminCoursiers = lazyWithRetry(() => import("./pages/admin/Coursiers"));

// Proprietaire pages
const ProprietaireDashboard = lazyWithRetry(() => import("./pages/proprietaire/Dashboard"));
const ProprietaireMesImmeubles = lazyWithRetry(() => import("./pages/proprietaire/MesImmeubles"));
const ProprietaireImmeubleDetail = lazyWithRetry(() => import("./pages/proprietaire/ImmeubleDetail"));
const ProprietaireLocataires = lazyWithRetry(() => import("./pages/proprietaire/Locataires"));
const ProprietaireComptabilite = lazyWithRetry(() => import("./pages/proprietaire/Comptabilite"));
const ProprietaireTickets = lazyWithRetry(() => import("./pages/proprietaire/Tickets"));
const ProprietaireDocuments = lazyWithRetry(() => import("./pages/proprietaire/Documents"));
const ProprietaireBaux = lazyWithRetry(() => import("./pages/proprietaire/Baux"));
const ProprietaireHypotheques = lazyWithRetry(() => import("./pages/proprietaire/Hypotheques"));
const ProprietaireAssurances = lazyWithRetry(() => import("./pages/proprietaire/Assurances"));
const ProprietaireCalendrier = lazyWithRetry(() => import("./pages/proprietaire/Calendrier"));
const ProprietaireMessagerie = lazyWithRetry(() => import("./pages/proprietaire/Messagerie"));
const ProprietaireNotifications = lazyWithRetry(() => import("./pages/proprietaire/Notifications"));
const ProprietaireParametres = lazyWithRetry(() => import("./pages/proprietaire/Parametres"));
const ProprietaireProjetsDeveloppement = lazyWithRetry(() => import("./pages/proprietaire/ProjetsDeveloppement"));
const ProprietaireProjetDetail = lazyWithRetry(() => import("./pages/proprietaire/ProjetDetail"));
const ProprietaireVendreMonBien = lazyWithRetry(() => import("./pages/proprietaire/VendreMonBienProprietaire"));
const ProprietaireBailDetail = lazyWithRetry(() => import("./pages/proprietaire/BailDetail"));
const ProprietaireHypothequeDetail = lazyWithRetry(() => import("./pages/proprietaire/HypothequeDetail"));
const ProprietaireAssuranceDetail = lazyWithRetry(() => import("./pages/proprietaire/AssuranceDetail"));
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

  return <RouteSeo />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <IOSAppInterstitial />
      <ScrollToTop />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <TikTokPixelProvider>
          <AuthProvider>
            <CallProvider>
            <AppContent />
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<HomePage />} />
              
              <Route path="/login" element={<Login />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/nouveau-mandat" element={<NouveauMandat />} />
              <Route path="/mandat-v3" element={<Navigate to="/nouveau-mandat" replace />} />
              <Route path="/mandat-v3/suivi" element={<MandatV3Suivi />} />
              <Route path="/mandat-v3/sign/:token" element={<MandatV3SignOnly />} />
              <Route path="/mandat/renouvellement" element={<MandatRenouvellement />} />
              {/* Parcours propriétaires (vente / location bailleur / construction) — redirigés vers Immo-rama.ch */}
              <Route path="/vendre-mon-bien" element={<ExternalRedirect to="https://immo-rama.ch/vendre-mon-bien" />} />
              <Route path="/formulaire-vendeur" element={<ExternalRedirect to="https://immo-rama.ch/vendre-mon-bien" />} />
              <Route path="/construire-renover" element={<ExternalRedirect to="https://immo-rama.ch/project-management" />} />
              <Route path="/formulaire-construire-renover" element={<ExternalRedirect to="https://immo-rama.ch/project-management" />} />
              <Route path="/rendez-vous-proprietaire" element={<ExternalRedirect to="https://immo-rama.ch" />} />

              {/* Relouer mon appartement — LOCATAIRE SORTANT uniquement (reste sur Logisorama) */}
              <Route path="/relouer-mon-appartement" element={<RelouerMonAppartement />} />
              <Route path="/formulaire-relouer" element={<FormulaireRelouer />} />

              {/* Accompagnement à l'achat immobilier (ACHETEUR) */}
              <Route path="/accompagnement-achat" element={<AccompagnementAchat />} />

              {/* Parcours chercheurs — Logisorama */}
              <Route path="/chasseur-appartement" element={<ChasseurAppartement />} />
              <Route path="/rendez-vous" element={<RendezVousBureau />} />
              <Route path="/first-login" element={<FirstLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/bot-login-code" element={<BotLoginCode />} />
              {/* Route universelle d'appel (tous rôles) — évite toute 404 depuis une notification */}
              <Route path="/appel" element={<Appel />} />
              <Route path="/appel/:conversationId" element={<Appel />} />
              <Route path="/call" element={<Appel />} />
              <Route path="/call/:conversationId" element={<Appel />} />
              {/* Live de visite (Phase B) — /live/:visiteId */}
              <Route path="/live/:visiteId" element={<Appel />} />

              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />


              {/* Legal Routes */}
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
              <Route path="/conditions-generales" element={<ConditionsGenerales />} />
              <Route path="/en/legal-notice" element={<MentionsLegalesEN />} />
              <Route path="/en/privacy-policy" element={<PolitiqueConfidentialiteEN />} />
              <Route path="/de/impressum" element={<MentionsLegalesDE />} />
              <Route path="/de/datenschutz" element={<PolitiqueConfidentialiteDE />} />


              {/* Portail annonces public */}
              <Route path="/annonces" element={<RechercheAnnonces />} />
              <Route path="/annonces/recherche" element={<RechercheAnnonces />} />
             <Route path="/annonceur/:id" element={<AnnonceurPublic />} />
             <Route path="/annonces/offre/:id" element={<OffreAnnonceDetail />} />

             <Route path="/annonces/:slug" element={<AnnonceDetail />} />

               <Route path="/inscription-annonceur" element={<InscriptionAnnonceur />} />
               <Route path="/connexion-annonceur" element={<ConnexionAnnonceur />} />
               <Route path="/mes-messages-annonces" element={<MesMessagesAnnonces />} />
               <Route path="/mes-messages-annonces/:conversationId" element={<MesMessagesAnnonces />} />
               <Route path="/mes-alertes-annonces" element={<MesAlertesAnnonces />} />
              
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
              <Route path="/admin/inscriptions-echouees" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminInscriptionsEchouees /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/clients/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminClientDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/clients/:id/mandat-prefill" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><StaffMandatPrefill /></AppLayout></ProtectedRoute>} />
             {/* /admin/relouer redirige vers l'onglet Reloueurs de /admin/clients (registre CRM global) */}
             <Route path="/admin/relouer" element={<Navigate to="/admin/clients?tab=reloueurs" replace />} />
             <Route path="/admin/relouer/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRelouerDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/dashboard/relouer" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDashboardRelouer /></AppLayout></ProtectedRoute>} />
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
              <Route path="/admin/whatsapp-notifications" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminWhatsAppNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/envoyer-email" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminEnvoyerEmail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/comptes-rendus" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminComptesRendus /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/whatsapp" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminWhatsAppInbox /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/whatsapp-logs" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminWhatsAppLogs /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/whatsapp" element={<ProtectedRoute allowedRoles={['agent','admin']}><AppLayout><AgentWhatsAppInbox /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/parametres/templates" element={<ProtectedRoute allowedRoles={['agent','admin']}><AppLayout><AgentMessageTemplates /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/envoyer-offre" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminEnvoyerOffre /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/historique-emails" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminHistoriqueEmails /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/boite-reception" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminBoiteReception /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/calendrier" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/portail-bannieres" element={<ProtectedRoute allowedRoles={['admin','agent']}><AppLayout><AdminPortailBannieres /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/visites" element={<ProtectedRoute allowedRoles={['admin','agent']}><AppLayout><AdminVisites /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/rappels" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRappels /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/candidatures" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/deposer-candidature" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminDeposerCandidature /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/demandes-activation" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminDemandesActivation /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/factures-abaninja" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminFacturesAbaNinja /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/statistiques-agents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminStatistiquesAgents /></AppLayout></ProtectedRoute>} />
<Route path="/admin/remplir-pdf" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRemplirPDF /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/remplir-demande-ia" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRemplirDemandeIA /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/modeles-demande-location" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><ModelesDemandeLocation /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/postulation-auto" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><RemplirDemandeLocation /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/leads" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminLeads /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/contacts" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminContacts /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/auto-offres" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAutoOffres /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/offres-auto" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminOffresAuto /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/postulations" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminPostulations /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/postulations" element={<ProtectedRoute allowedRoles={['agent','admin']}><AppLayout><AgentPostulations /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/salaires" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminSalaires /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/candidatures-relocation" element={<ProtectedRoute allowedRoles={['admin','agent']}><AppLayout><AdminCandidaturesRelocation /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/registre-commissions" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRegistreCommissions /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/salaires-agents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminSalairesAgents /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAnalytics /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/meta-leads" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMetaLeads /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/newsletter" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminNewsletter /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/campagnes-suivi" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCampagnesSuivi /></AppLayout></ProtectedRoute>} />
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
              <Route path="/agent/offres-auto" element={<ProtectedRoute allowedRoles={['agent','admin']}><AppLayout><AgentOffresAuto /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/wishlist" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><Wishlist /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/visites" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentVisites /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/visites/:id/compte-rendu" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentCompteRenduVisite /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/offres/:id/fiche-detaillee" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentFicheDetailleeBien /></AppLayout></ProtectedRoute>} />
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
              <Route path="/agent/modeles-demande-location" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><ModelesDemandeLocation /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/postulation-auto" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><RemplirDemandeLocation /></AppLayout></ProtectedRoute>} />
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
              <Route path="/client/dashboard" element={<Navigate to="/client" replace />} />
              <Route path="/client/dossier" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDossier /></AppLayout></ProtectedRoute>} />
              <Route path="/client/mon-contrat" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientMonContrat /></AppLayout></ProtectedRoute>} />
              <Route path="/client/offres-recues" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientOffresRecues /></AppLayout></ProtectedRoute>} />
              <Route path="/client/videos-recues" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientVideosRecues /></AppLayout></ProtectedRoute>} />
              <Route path="/client/visites" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientVisites /></AppLayout></ProtectedRoute>} />
              <Route path="/client/calendrier" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/client/visites-deleguees" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientVisitesDeleguees /></AppLayout></ProtectedRoute>} />
              <Route path="/client/mes-candidatures" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientMesCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/client/messagerie" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientMessagerie /></AppLayout></ProtectedRoute>} />
              <Route path="/client/documents" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/client/notifications" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><SupportClient /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/support" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><SupportStaff /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/support" element={<ProtectedRoute allowedRoles={['agent','admin']}><AppLayout><SupportStaff /></AppLayout></ProtectedRoute>} />
              <Route path="/client/parametres" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientParametres /></AppLayout></ProtectedRoute>} />
              <Route path="/client/annonces" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientAnnonces /></AppLayout></ProtectedRoute>} />
              <Route path="/client/carte" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientCarte /></AppLayout></ProtectedRoute>} />
              <Route path="/client/biens-proposes" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientBiensProposes /></AppLayout></ProtectedRoute>} />
              <Route path="/client/biens-selectionnes" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientBiensSelectionnes /></AppLayout></ProtectedRoute>} />
              <Route path="/client/financement" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientFinancementAchat /></AppLayout></ProtectedRoute>} />
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
              <Route path="/coursier/visites/:id/compte-rendu" element={<ProtectedRoute allowedRoles={['coursier']}><AppLayout><CoursierCompteRenduVisite /></AppLayout></ProtectedRoute>} />


              {/* Candidat Routes */}
              <Route path="/candidat" element={<ProtectedRoute allowedRoles={['candidat']}><AppLayout><CandidatDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/candidat/candidatures" element={<ProtectedRoute allowedRoles={['candidat']}><AppLayout><CandidatCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/candidat/demande" element={<ProtectedRoute allowedRoles={['candidat']}><AppLayout><CandidatDemande /></AppLayout></ProtectedRoute>} />
              <Route path="/candidat/agenda" element={<ProtectedRoute allowedRoles={['candidat']}><AppLayout><CandidatAgenda /></AppLayout></ProtectedRoute>} />
              <Route path="/candidat/messages" element={<ProtectedRoute allowedRoles={['candidat']}><AppLayout><CandidatMessages /></AppLayout></ProtectedRoute>} />
              <Route path="/candidat/support" element={<ProtectedRoute allowedRoles={['candidat']}><AppLayout><SupportClient /></AppLayout></ProtectedRoute>} />

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
            </CallProvider>
          </AuthProvider>
        </TikTokPixelProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
