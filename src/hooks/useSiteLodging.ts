import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const lodgeKey = (siteId: string) => `inopnc_site_lodge:${siteId}`;

export function useSiteLodging(siteId?: string | null) {
  const { user } = useAuth();
  const { isAdmin, isPartner } = useUserRole();
  const queryClient = useQueryClient();

  const memberQuery = useQuery({
    queryKey: ["site-member", siteId, user?.id],
    enabled: !!siteId && !!user && !isAdmin && !isPartner,
    queryFn: async () => {
      if (!siteId || !user) return false;
      const { data, error } = await supabase.rpc("is_site_member", { _site_id: siteId, _user_id: user.id });
      if (error) return false;
      return !!data;
    },
  });

  const isMember = !!memberQuery.data;
  const canView = !!siteId && !isPartner && (isAdmin || isMember);
  const canEdit = canView;

  const lodgeQuery = useQuery({
    queryKey: ["site-lodging", siteId],
    enabled: !!siteId && canView,
    queryFn: async () => {
      if (!siteId) return { lodge_address: "" };
      const { data, error } = await supabase
        .from("site_lodgings")
        .select("lodge_address, updated_at, updated_by")
        .eq("site_id", siteId)
        .maybeSingle();
      const cached = typeof window !== "undefined" ? localStorage.getItem(lodgeKey(siteId)) : "";
      if (error) {
        return { lodge_address: cached || "" };
      }
      const lodge = data?.lodge_address || "";
      if (typeof window !== "undefined") {
        localStorage.setItem(lodgeKey(siteId), lodge);
      }
      return data ?? { lodge_address: lodge };
    },
  });

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      if (!user || !siteId) throw new Error("권한이 없습니다.");
      if (isPartner || !canEdit) throw new Error("권한이 없습니다.");
      const lodge_address = value.trim();
      if (!lodge_address) throw new Error("주소가 없습니다.");
      if (lodge_address.length > 200) throw new Error("주소가 너무 깁니다.");
      const { data, error } = await supabase
        .from("site_lodgings")
        .upsert({
          site_id: siteId,
          lodge_address,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "site_id" })
        .select("lodge_address")
        .single();
      if (error) throw error;
      return data?.lodge_address ?? lodge_address;
    },
    onMutate: async (value) => {
      if (!siteId) return;
      await queryClient.cancelQueries({ queryKey: ["site-lodging", siteId] });
      const prev = queryClient.getQueryData(["site-lodging", siteId]);
      queryClient.setQueryData(["site-lodging", siteId], { lodge_address: value });
      return { prev };
    },
    onError: (_err, _value, ctx) => {
      if (ctx?.prev && siteId) {
        queryClient.setQueryData(["site-lodging", siteId], ctx.prev);
      }
      toast.error("숙소 주소 저장에 실패했습니다.");
    },
    onSuccess: (value) => {
      if (siteId && typeof window !== "undefined") {
        localStorage.setItem(lodgeKey(siteId), value);
      }
      if (siteId) {
        queryClient.invalidateQueries({ queryKey: ["site-lodging", siteId] });
      }
    },
  });

  return {
    lodge: lodgeQuery.data?.lodge_address ?? (siteId && typeof window !== "undefined" ? localStorage.getItem(lodgeKey(siteId)) ?? "" : ""),
    isLoading: lodgeQuery.isLoading || memberQuery.isLoading,
    isSaving: mutation.isPending,
    canView,
    canEdit,
    saveLodge: mutation.mutateAsync,
  };
}
