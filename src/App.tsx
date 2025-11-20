import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAgents from "./pages/admin/Agents";
import AdminClients from "./pages/admin/Clients";
import AdminAssignations from "./pages/admin/Assignations";
import AdminMandats from "./pages/admin/Mandats";
import AdminTransactions from "./pages/admin/Transactions";
import AdminMessagerie from "./pages/admin/Messagerie";
import AgentDashboard from "./pages/agent/Dashboard";
import AgentMesClients from "./pages/agent/MesClients";
import AgentClientDetail from "./pages/agent/ClientDetail";
import AgentEnvoyerOffre from "./pages/agent/EnvoyerOffre";
import AgentOffresEnvoyees from "./pages/agent/OffresEnvoyees";
import AgentMessagerie from "./pages/agent/Messagerie";
import ClientDashboard from "./pages/client/Dashboard";
import ClientDossier from "./pages/client/Dossier";
import ClientOffresRecues from "./pages/client/OffresRecues";
import ClientVisites from "./pages/client/Visites";
import ClientMesCandidatures from "./pages/client/MesCandidatures";
import ClientMessagerie from "./pages/client/Messagerie";
import ClientDocuments from "./pages/client/Documents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/agents" element={<AdminAgents />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/assignations" element={<AdminAssignations />} />
          <Route path="/admin/mandats" element={<AdminMandats />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/messagerie" element={<AdminMessagerie />} />
          <Route path="/agent" element={<AgentDashboard />} />
          <Route path="/agent/mes-clients" element={<AgentMesClients />} />
          <Route path="/agent/clients/:id" element={<AgentClientDetail />} />
          <Route path="/agent/envoyer-offre" element={<AgentEnvoyerOffre />} />
          <Route path="/agent/offres-envoyees" element={<AgentOffresEnvoyees />} />
          <Route path="/agent/messagerie" element={<AgentMessagerie />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/client/dossier" element={<ClientDossier />} />
          <Route path="/client/offres-recues" element={<ClientOffresRecues />} />
          <Route path="/client/visites" element={<ClientVisites />} />
          <Route path="/client/mes-candidatures" element={<ClientMesCandidatures />} />
          <Route path="/client/messagerie" element={<ClientMessagerie />} />
          <Route path="/client/documents" element={<ClientDocuments />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
