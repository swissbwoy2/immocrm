import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PageLoader } from "./components/PageLoader";

// Eager load critical pages
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";

// Lazy load all other pages
const NouveauMandat = lazy(() => import("./pages/NouveauMandat"));
const FirstLogin = lazy(() => import("./pages/FirstLogin"));
const Setup = lazy(() => import("./pages/Setup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DownloadFiles = lazy(() => import("./pages/DownloadFiles"));

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

// Agent pages
const AgentDashboard = lazy(() => import("./pages/agent/Dashboard"));
const AgentMesClients = lazy(() => import("./pages/agent/MesClients"));
const AgentClientDetail = lazy(() => import("./pages/agent/ClientDetail"));
const AgentEnvoyerOffre = lazy(() => import("./pages/agent/EnvoyerOffre"));
const AgentOffresEnvoyees = lazy(() => import("./pages/agent/OffresEnvoyees"));
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

// Client pages
const ClientDashboard = lazy(() => import("./pages/client/Dashboard"));
const ClientDossier = lazy(() => import("./pages/client/Dossier"));
const ClientOffresRecues = lazy(() => import("./pages/client/OffresRecues"));
const ClientVisites = lazy(() => import("./pages/client/Visites"));
const ClientCalendrier = lazy(() => import("./pages/client/Calendrier"));
const ClientMesCandidatures = lazy(() => import("./pages/client/MesCandidatures"));
const ClientMessagerie = lazy(() => import("./pages/client/Messagerie"));
const ClientDocuments = lazy(() => import("./pages/client/Documents"));
const ClientVisitesDeleguees = lazy(() => import("./pages/client/VisitesDeleguees"));
const ClientNotifications = lazy(() => import("./pages/client/Notifications"));
const ClientParametres = lazy(() => import("./pages/client/Parametres"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/nouveau-mandat" element={<NouveauMandat />} />
              <Route path="/first-login" element={<FirstLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/agents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAgents /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/agents/:agentId" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAgentDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminClients /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/clients/:id" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminClientDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/assignations" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminAssignations /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/mandats" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMandats /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/transactions" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminTransactions /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/offres-envoyees" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminOffresEnvoyees /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/documents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/migrate-documents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMigrateDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/messagerie" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminMessagerie /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/parametres" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminParametres /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/envoyer-email" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminEnvoyerEmail /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/envoyer-offre" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminEnvoyerOffre /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/historique-emails" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminHistoriqueEmails /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/boite-reception" element={<ProtectedRoute allowedRoles={['admin']}><AdminBoiteReception /></ProtectedRoute>} />
              <Route path="/admin/calendrier" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/rappels" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminRappels /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/candidatures" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/demandes-activation" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminDemandesActivation /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/factures-abaninja" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminFacturesAbaNinja /></AppLayout></ProtectedRoute>} />
              <Route path="/admin/statistiques-agents" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminStatistiquesAgents /></AppLayout></ProtectedRoute>} />

              {/* Agent Routes */}
              <Route path="/agent" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/mes-clients" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentMesClients /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/clients/:id" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentClientDetail /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/envoyer-offre" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentEnvoyerOffre /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/offres-envoyees" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentOffresEnvoyees /></AppLayout></ProtectedRoute>} />
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
              <Route path="/agent/boite-reception" element={<ProtectedRoute allowedRoles={['agent']}><AgentBoiteReception /></ProtectedRoute>} />
              <Route path="/agent/candidatures" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/agent/deposer-candidature" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentDeposerCandidature /></AppLayout></ProtectedRoute>} />

              {/* Client Routes */}
              <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/client/dossier" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDossier /></AppLayout></ProtectedRoute>} />
              <Route path="/client/offres-recues" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientOffresRecues /></AppLayout></ProtectedRoute>} />
              <Route path="/client/visites" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientVisites /></AppLayout></ProtectedRoute>} />
              <Route path="/client/calendrier" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientCalendrier /></AppLayout></ProtectedRoute>} />
              <Route path="/client/visites-deleguees" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientVisitesDeleguees /></AppLayout></ProtectedRoute>} />
              <Route path="/client/mes-candidatures" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientMesCandidatures /></AppLayout></ProtectedRoute>} />
              <Route path="/client/messagerie" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientMessagerie /></AppLayout></ProtectedRoute>} />
              <Route path="/client/documents" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientDocuments /></AppLayout></ProtectedRoute>} />
              <Route path="/client/notifications" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientNotifications /></AppLayout></ProtectedRoute>} />
              <Route path="/client/parametres" element={<ProtectedRoute allowedRoles={['client']}><AppLayout><ClientParametres /></AppLayout></ProtectedRoute>} />

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

              {/* Public Routes */}
              <Route path="/download/:token" element={<DownloadFiles />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
