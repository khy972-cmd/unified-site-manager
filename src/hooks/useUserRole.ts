import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserRole() {
  const { user, isTestMode, testRole } = useAuth();
  const [role, setRole] = useState<"admin" | "worker" | "partner" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTestMode) {
      setRole(testRole);
      setLoading(false);
      return;
    }

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setRole((data?.role as "admin" | "worker" | "partner") ?? "worker");
      setLoading(false);
    };

    fetchRole();
  }, [user, isTestMode, testRole]);

  return { role, isAdmin: role === "admin", isPartner: role === "partner", isWorker: role === "worker", loading };
}
