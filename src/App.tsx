import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isValidInternalPath } from "@/lib/validateRedirectPath";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ActivatePage from "./pages/ActivatePage";
import RedirectPage from "./pages/RedirectPage";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Lazy-loaded dashboard routes
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const CreateQR = lazy(() => import("./pages/dashboard/CreateQR"));
const QRDetail = lazy(() => import("./pages/dashboard/QRDetail"));
const Billing = lazy(() => import("./pages/dashboard/Billing"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const Trash = lazy(() => import("./pages/dashboard/Trash"));
const Stats = lazy(() => import("./pages/dashboard/Stats"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Lazy-loaded admin routes
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminRoute = lazy(() => import("./components/admin/AdminRoute"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminConfig = lazy(() => import("./pages/admin/AdminConfig"));
const AdminWebhooks = lazy(() => import("./pages/admin/AdminWebhooks"));
const AdminQRCodes = lazy(() => import("./pages/admin/AdminQRCodes"));
const AdminDeletedUsers = lazy(() => import("./pages/admin/AdminDeletedUsers"));

const queryClient = new QueryClient();

// Handles OAuth redirect after Google sign-in
function OAuthRedirectHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const redirectPath = sessionStorage.getItem("oauth_redirect");
        sessionStorage.removeItem("oauth_redirect");
        if (redirectPath) {
          navigate(isValidInternalPath(redirectPath) ? redirectPath : "/dashboard");
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
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }>
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
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="deleted-users" element={<AdminDeletedUsers />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="qr-codes" element={<AdminQRCodes />} />
                <Route path="config" element={<AdminConfig />} />
                <Route path="webhooks" element={<AdminWebhooks />} />
              </Route>

              {/* Static pages */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* QR Redirect and Activation */}
              <Route path="/r/:slug" element={<RedirectPage />} />
              <Route path="/activate/:slug" element={<ActivatePage />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </OAuthRedirectHandler>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
