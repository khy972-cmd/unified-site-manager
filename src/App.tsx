import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import HomePage from "@/pages/HomePage";
import SitePage from "@/pages/SitePage";
import WorklogPage from "@/pages/WorklogPage";
import OutputPage from "@/pages/OutputPage";
import DocPage from "@/pages/DocPage";
import RequestPage from "@/pages/RequestPage";
import RequestExternalPage from "@/pages/RequestExternalPage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";
import AdminPage from "@/pages/AdminPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/home/*" element={<Navigate to="/" replace />} />
            <Route path="/home.html" element={<Navigate to="/" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<HomePage />} />
              <Route path="/site" element={<SitePage />} />
              <Route path="/worklog" element={<WorklogPage />} />
              <Route path="/output" element={<OutputPage />} />
              <Route path="/doc" element={<DocPage />} />
              <Route path="/request" element={<RequestPage />} />
              <Route path="/request/external" element={<RequestExternalPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
