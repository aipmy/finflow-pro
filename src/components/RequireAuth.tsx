import { Navigate } from "react-router-dom";
import { useAuth } from "@/stores/authStore";
import { AppLayout } from "@/components/AppLayout";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}
