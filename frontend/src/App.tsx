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
import PaymentGatewayPage from "./pages/services/PaymentGatewayPage";
import CrmAutomationPage from "./pages/services/CrmAutomationPage";
import DataAggregationPage from "./pages/services/DataAggregationPage";
import StrategyPage from "./pages/StrategyPage";
import SecuritySettingsPage from "./pages/SecuritySettingsPage";
import DLQObserverPage from "./pages/DLQObserverPage";
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
          <Route path="/strategy" element={<StrategyPage />} />
          <Route path="/security" element={<SecuritySettingsPage />} />
          <Route path="/admin/dlq" element={<DLQObserverPage />} />

          <Route path="/services/api-integration" element={<ApiIntegrationPage />} />
          <Route path="/services/api-integration/saas-workflows" element={<SaasNotificationsPage />} />
          <Route path="/services/api-integration/saas-workflows/workflow-builder" element={<WorkflowBuilderPage />} />
          <Route path="/services/api-integration/saas-workflows/channels" element={<ChannelConfigPage />} />
          <Route path="/services/api-integration/payment-gateway" element={<PaymentGatewayPage />} />
          <Route path="/services/api-integration/crm-automation" element={<CrmAutomationPage />} />
          <Route path="/services/api-integration/data-aggregation" element={<DataAggregationPage />} />
          <Route path="/services/api-integration/:useCaseSlug" element={<ApiIntegrationUseCasePage />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
