// PATCH START: Site list hook (Supabase-first, fallback to shared static list)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_SITE_LIST, type SiteListItem } from "@/lib/siteList";

export function useSiteList() {
  const { user, isTestMode } = useAuth();
  const isAuthenticated = !!user;

  return useQuery({
    queryKey: ["sites"],
    queryFn: async (): Promise<SiteListItem[]> => {
      if (!isAuthenticated) return DEFAULT_SITE_LIST;

      const { data, error } = await supabase
        .from("sites")
        .select("id, name")
        .order("name", { ascending: true });

      // If RLS blocks, gracefully fall back to local list (still enforces "select from list").
      if (error) return DEFAULT_SITE_LIST;

      const rows = (data || [])
        .map((s: any) => ({
          site_id: String(s.id),
          site_name: String(s.name || ""),
        }))
        .filter((s) => !!s.site_id && !!s.site_name);

      return rows.length > 0 ? rows : DEFAULT_SITE_LIST;
    },
    enabled: isAuthenticated || isTestMode,
    staleTime: 1000 * 60 * 5,
  });
}
// PATCH END

