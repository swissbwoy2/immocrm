import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import FirstLogin from "./pages/FirstLogin";
import Setup from "./pages/Setup";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAgents from "./pages/admin/Agents";
import AdminAgentDetail from "./pages/admin/AgentDetail";
import AdminClients from "./pages/admin/Clients";
import AdminClientDetail from "./pages/admin/ClientDetail";
import AdminAssignations from "./pages/admin/Assignations";
import AdminMandats from "./pages/admin/Mandats";
import AdminTransactions from "./pages/admin/Transactions";
import AdminOffresEnvoyees from "./pages/admin/OffresEnvoyees";
import AdminDocuments from "./pages/admin/Documents";
import AdminMessagerie from "./pages/admin/Messagerie";
import AdminMigrateDocuments from "./pages/admin/MigrateDocuments";
import AdminNotifications from "./pages/admin/Notifications";
import AdminParametres from "./pages/admin/Parametres";
import AdminEnvoyerEmail from "./pages/admin/EnvoyerEmail";
import AdminHistoriqueEmails from "./pages/admin/HistoriqueEmails";
import AdminBoiteReception from "./pages/admin/BoiteReception";
import AdminCalendrier from "./pages/admin/Calendrier";
import AgentDashboard from "./pages/agent/Dashboard";
import AgentMesClients from "./pages/agent/MesClients";
import AgentClientDetail from "./pages/agent/ClientDetail";
import AgentEnvoyerOffre from "./pages/agent/EnvoyerOffre";
import AgentOffresEnvoyees from "./pages/agent/OffresEnvoyees";
import AgentMessagerie from "./pages/agent/Messagerie";
import AgentVisites from "./pages/agent/Visites";
import AgentCalendrier from "./pages/agent/Calendrier";
import AgentDocuments from "./pages/agent/Documents";
import AgentConclureAffaire from "./pages/agent/ConclureAffaire";
import AgentNotifications from "./pages/agent/Notifications";
import AgentParametres from "./pages/agent/Parametres";
import AgentEnvoyerEmail from "./pages/agent/EnvoyerEmail";
import AgentHistoriqueEmails from "./pages/agent/HistoriqueEmails";
import AgentBoiteReception from "./pages/agent/BoiteReception";
import AgentCandidatures from "./pages/agent/Candidatures";
import ClientDashboard from "./pages/client/Dashboard";
import ClientDossier from "./pages/client/Dossier";
import ClientOffresRecues from "./pages/client/OffresRecues";
import ClientVisites from "./pages/client/Visites";
import ClientCalendrier from "./pages/client/Calendrier";
import ClientMesCandidatures from "./pages/client/MesCandidatures";
import ClientMessagerie from "./pages/client/Messagerie";
import ClientDocuments from "./pages/client/Documents";
import ClientVisitesDeleguees from "./pages/client/VisitesDeleguees";
import ClientNotifications from "./pages/client/Notifications";
import DownloadFiles from "./pages/DownloadFiles";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/first-login" element={<FirstLogin />} />

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
            <Route path="/admin/historique-emails" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminHistoriqueEmails /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/boite-reception" element={<ProtectedRoute allowedRoles={['admin']}><AdminBoiteReception /></ProtectedRoute>} />
            <Route path="/admin/calendrier" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><AdminCalendrier /></AppLayout></ProtectedRoute>} />

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
            <Route path="/agent/notifications" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentNotifications /></AppLayout></ProtectedRoute>} />
            <Route path="/agent/parametres" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentParametres /></AppLayout></ProtectedRoute>} />
            <Route path="/agent/envoyer-email" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentEnvoyerEmail /></AppLayout></ProtectedRoute>} />
            <Route path="/agent/historique-emails" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentHistoriqueEmails /></AppLayout></ProtectedRoute>} />
            <Route path="/agent/boite-reception" element={<ProtectedRoute allowedRoles={['agent']}><AgentBoiteReception /></ProtectedRoute>} />
            <Route path="/agent/candidatures" element={<ProtectedRoute allowedRoles={['agent']}><AppLayout><AgentCandidatures /></AppLayout></ProtectedRoute>} />

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

            {/* Public Routes */}
            <Route path="/download/:token" element={<DownloadFiles />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
