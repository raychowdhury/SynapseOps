import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import ApiIntegrationPage from "./pages/services/ApiIntegrationPage";
import ApiIntegrationUseCasePage from "./pages/services/ApiIntegrationUseCasePage";
import SaasNotificationsPage from "./pages/services/SaasNotificationsPage";
import WorkflowBuilderPage from "./pages/services/WorkflowBuilderPage";
import ChannelConfigPage from "./pages/services/ChannelConfigPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/api-integration" element={<ApiIntegrationPage />} />
          <Route path="/services/api-integration/:useCaseSlug" element={<ApiIntegrationUseCasePage />} />
          <Route path="/services/saas-notifications" element={<SaasNotificationsPage />} />
          <Route path="/services/saas-notifications/workflow-builder" element={<WorkflowBuilderPage />} />
          <Route path="/services/saas-notifications/channels" element={<ChannelConfigPage />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
