import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import RequestNew from "./pages/RequestNew";
import Approvals from "./pages/Approvals";
import Inventory from "./pages/Inventory";
import FinanceRealization from "./pages/FinanceRealization";
import PettyCash from "./pages/PettyCash";
import Reports from "./pages/Reports";
import AuditTrail from "./pages/AuditTrail";
import Users from "./pages/Users";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => {
  // initialize theme from localStorage on first load
  useEffect(() => {
    const t = localStorage.getItem("finapp:theme");
    const dark = t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster richColors position="bottom-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/requests" element={<RequireAuth><Requests /></RequireAuth>} />
            <Route path="/requests/new" element={<RequireAuth><RequestNew /></RequireAuth>} />
            <Route path="/requests/:id" element={<RequireAuth><RequestDetail /></RequireAuth>} />
            <Route path="/requests/:id/edit" element={<RequireAuth><RequestNew /></RequireAuth>} />
            <Route path="/approvals" element={<RequireAuth><Approvals /></RequireAuth>} />
            <Route path="/inventory" element={<RequireAuth><Inventory /></RequireAuth>} />
            <Route path="/finance" element={<RequireAuth><FinanceRealization /></RequireAuth>} />
            <Route path="/petty-cash" element={<RequireAuth><PettyCash /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
            <Route path="/audit" element={<RequireAuth><AuditTrail /></RequireAuth>} />
            <Route path="/users" element={<RequireAuth><Users /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
