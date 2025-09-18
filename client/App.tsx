import "./global.css";

import { Toaster } from "@/components/ui/toaster";
// Removed Sonner toaster to avoid duplicate notifications
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[radial-gradient(1200px_600px_at_50%_-100px,#6366f1_8%,transparent)]">
            <header className="border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50 sticky top-0 z-40">
              <div className="container h-14 flex items-center justify-center" />
            </header>
            <div className="flex-1">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/" element={<Index />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
