import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import CreateQR from "./pages/dashboard/CreateQR";
import QRDetail from "./pages/dashboard/QRDetail";
import Billing from "./pages/dashboard/Billing";
import Settings from "./pages/dashboard/Settings";
import Trash from "./pages/dashboard/Trash";
import Stats from "./pages/dashboard/Stats";

import ActivatePage from "./pages/ActivatePage";
import RedirectPage from "./pages/RedirectPage";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminQRCodes from "./pages/admin/AdminQRCodes";
import AdminDeletedUsers from "./pages/admin/AdminDeletedUsers";

const queryClient = new QueryClient();

// Handles OAuth redirect after Google sign-in
function OAuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const redirectPath = sessionStorage.getItem("oauth_redirect");
        if (redirectPath) {
          sessionStorage.removeItem("oauth_redirect");
          navigate(redirectPath);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OAuthRedirectHandler>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Dashboard routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="create" element={<CreateQR />} />
              <Route path="qr/:id" element={<QRDetail />} />
              <Route path="billing" element={<Billing />} />
              <Route path="stats" element={<Stats />} />
              <Route path="settings" element={<Settings />} />
              <Route path="trash" element={<Trash />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="deleted-users" element={<AdminDeletedUsers />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="qr-codes" element={<AdminQRCodes />} />
              <Route path="config" element={<AdminConfig />} />
              <Route path="webhooks" element={<AdminWebhooks />} />
            </Route>

            {/* QR Redirect and Activation */}
            <Route path="/r/:slug" element={<RedirectPage />} />
            <Route path="/activate/:slug" element={<ActivatePage />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </OAuthRedirectHandler>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
