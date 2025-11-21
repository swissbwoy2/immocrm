import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
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
          <Route path="/admin" element={<AppLayout><AdminDashboard /></AppLayout>} />
          <Route path="/admin/agents" element={<AppLayout><AdminAgents /></AppLayout>} />
          <Route path="/admin/clients" element={<AppLayout><AdminClients /></AppLayout>} />
          <Route path="/admin/assignations" element={<AppLayout><AdminAssignations /></AppLayout>} />
          <Route path="/admin/mandats" element={<AppLayout><AdminMandats /></AppLayout>} />
          <Route path="/admin/transactions" element={<AppLayout><AdminTransactions /></AppLayout>} />
          <Route path="/admin/messagerie" element={<AppLayout><AdminMessagerie /></AppLayout>} />
          <Route path="/agent" element={<AppLayout><AgentDashboard /></AppLayout>} />
          <Route path="/agent/mes-clients" element={<AppLayout><AgentMesClients /></AppLayout>} />
          <Route path="/agent/clients/:id" element={<AppLayout><AgentClientDetail /></AppLayout>} />
          <Route path="/agent/envoyer-offre" element={<AppLayout><AgentEnvoyerOffre /></AppLayout>} />
          <Route path="/agent/offres-envoyees" element={<AppLayout><AgentOffresEnvoyees /></AppLayout>} />
          <Route path="/agent/messagerie" element={<AppLayout><AgentMessagerie /></AppLayout>} />
          <Route path="/client" element={<AppLayout><ClientDashboard /></AppLayout>} />
          <Route path="/client/dossier" element={<AppLayout><ClientDossier /></AppLayout>} />
          <Route path="/client/offres-recues" element={<AppLayout><ClientOffresRecues /></AppLayout>} />
          <Route path="/client/visites" element={<AppLayout><ClientVisites /></AppLayout>} />
          <Route path="/client/mes-candidatures" element={<AppLayout><ClientMesCandidatures /></AppLayout>} />
          <Route path="/client/messagerie" element={<AppLayout><ClientMessagerie /></AppLayout>} />
          <Route path="/client/documents" element={<AppLayout><ClientDocuments /></AppLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
