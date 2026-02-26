/**
 * Supabase-backed worklog hooks with React Query + Realtime
 * Falls back to localStorage in test mode (no auth)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getAllWorklogs, saveWorklog as localSaveWorklog,
  updateWorklogStatus as localUpdateStatus,
  deleteWorklog as localDeleteWorklog,
  migrateOldWorklogs,
  type WorklogEntry, type WorklogStatus, type ManpowerItem, type WorkSet, type MaterialItem,
} from "@/lib/worklogStore";

// ─── Map Supabase row → WorklogEntry ───
function mapToWorklogEntry(row: any): WorklogEntry {
  return {
    id: row.id,
    siteValue: row.site_id,
    siteName: row.site_name,
    dept: row.dept || "",
    workDate: row.work_date,
    manpower: (row.worklog_manpower || []).map((m: any) => ({
      id: m.id,
      worker: m.worker_name,
      workHours: Number(m.work_hours),
      isCustom: m.is_custom || false,
      locked: m.locked || false,
    })),
    workSets: (row.worklog_worksets || []).map((ws: any) => ({
      id: ws.id,
      member: ws.member || "",
      process: ws.process || "",
      type: ws.work_type || "",
      location: { block: ws.block || "", dong: ws.dong || "", floor: ws.floor || "" },
      customMemberValue: "",
      customProcessValue: "",
      customTypeValue: "",
    })),
    materials: (row.worklog_materials || []).map((mt: any) => ({
      id: mt.id,
      name: mt.name,
      qty: Number(mt.qty),
    })),
    photoCount: 0, // will be enriched later if needed
    drawingCount: 0,
    status: row.status as WorklogStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    weather: row.weather || "",
  };
}

// ─── Find or create site ───
async function canCreateSite(userId: string, allowCreate: boolean) {
  if (allowCreate) return true;
  const { data, error } = await supabase.rpc("has_role", { _role: "admin", _user_id: userId });
  if (!error) return !!data;
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return roleRow?.role === "admin";
}

async function findOrCreateSite(siteName: string, userId: string, allowCreate: boolean): Promise<string> {
  // Try to find existing site
  const { data: existing } = await supabase
    .from("sites")
    .select("id")
    .eq("name", siteName)
    .limit(1)
    .single();

  if (existing) return existing.id;

  const isAdmin = await canCreateSite(userId, allowCreate);
  if (!isAdmin) {
    throw new Error("현장 등록은 본사관리자만 가능합니다. 기존 현장을 선택하세요.");
  }

  // Create new site
  const { data: newSite, error } = await supabase
    .from("sites")
    .insert({ name: siteName, created_by: userId, status: "진행중" })
    .select("id")
    .single();

  if (error) {
    // If insert fails (RLS), try to find again (race condition)
    const { data: retry } = await supabase
      .from("sites")
      .select("id")
      .eq("name", siteName)
      .limit(1)
      .single();
    if (retry) return retry.id;
    throw error;
  }

  // Also add user as site member
  await supabase.from("site_members").insert({
    site_id: newSite.id,
    user_id: userId,
    role: "worker",
  });

  return newSite.id;
}

// ─── Hooks ───

export function useWorklogs() {
  const { user, isTestMode } = useAuth();
  const queryClient = useQueryClient();
  const isAuthenticated = !!user;

  const query = useQuery({
    queryKey: ["worklogs"],
    queryFn: async (): Promise<WorklogEntry[]> => {
      if (!isAuthenticated) {
        migrateOldWorklogs();
        return getAllWorklogs();
      }

      const { data, error } = await supabase
        .from("worklogs")
        .select(`
          *,
          worklog_manpower(*),
          worklog_worksets(*),
          worklog_materials(*)
        `)
        .order("work_date", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapToWorklogEntry);
    },
    enabled: isAuthenticated || isTestMode,
    refetchInterval: isAuthenticated ? false : 2000, // localStorage polling fallback
  });

  // Realtime subscription
  useEffect(() => {
    if (!isAuthenticated) return;
    const channel = supabase
      .channel("worklogs-changes")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "worklogs" },
        () => queryClient.invalidateQueries({ queryKey: ["worklogs"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, queryClient]);

  return query;
}

export function useSaveWorklog() {
  const { user, isTestMode, testRole } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      siteName: string;
      siteValue?: string;
      dept: string;
      workDate: string;
      manpower: ManpowerItem[];
      workSets: WorkSet[];
      materials: MaterialItem[];
      photoCount: number;
      drawingCount: number;
      status: WorklogStatus;
      version: number;
      weather?: string;
    }) => {
      if (!user) {
        if (isTestMode && testRole !== "admin" && !entry.siteValue) {
          toast.error("현장 등록은 본사관리자만 가능합니다. 기존 현장을 선택하세요.");
          throw new Error("현장 등록은 본사관리자만 가능합니다. 기존 현장을 선택하세요.");
        }
        // Fallback to localStorage
        return localSaveWorklog({
          ...entry,
          siteValue: entry.siteValue || entry.siteName,
          createdAt: new Date().toISOString(),
        });
      }

      let siteId: string;
      try {
        const allowCreate = isTestMode && testRole === "admin";
        siteId = await findOrCreateSite(entry.siteName, user.id, allowCreate);
      } catch (err: any) {
        const message = err?.message || "현장 등록 중 오류가 발생했습니다.";
        if (message.includes("현장 등록은 본사관리자만 가능합니다")) {
          toast.error(message);
        }
        throw err;
      }

      // Insert worklog
      const { data: worklog, error: wlError } = await supabase
        .from("worklogs")
        .insert({
          site_id: siteId,
          site_name: entry.siteName,
          dept: entry.dept,
          work_date: entry.workDate,
          status: entry.status,
          version: entry.version,
          weather: entry.weather || "",
          created_by: user.id,
        })
        .select()
        .single();

      if (wlError) throw wlError;

      // Insert manpower
      if (entry.manpower.length > 0) {
        const { error: mpError } = await supabase
          .from("worklog_manpower")
          .insert(entry.manpower.map(m => ({
            worklog_id: worklog.id,
            worker_name: m.worker,
            work_hours: m.workHours,
            is_custom: m.isCustom,
            locked: m.locked,
          })));
        if (mpError) console.error("Manpower insert error:", mpError);
      }

      // Insert worksets
      if (entry.workSets.length > 0) {
        const { error: wsError } = await supabase
          .from("worklog_worksets")
          .insert(entry.workSets.map(ws => ({
            worklog_id: worklog.id,
            member: ws.member === "기타" ? ws.customMemberValue : ws.member,
            process: ws.process === "기타" ? ws.customProcessValue : ws.process,
            work_type: ws.type === "기타" ? ws.customTypeValue : ws.type,
            block: ws.location?.block || "",
            dong: ws.location?.dong || "",
            floor: ws.location?.floor || "",
          })));
        if (wsError) console.error("Worksets insert error:", wsError);
      }

      // Insert materials
      if (entry.materials.length > 0) {
        const { error: mtError } = await supabase
          .from("worklog_materials")
          .insert(entry.materials.map(mt => ({
            worklog_id: worklog.id,
            name: mt.name,
            qty: mt.qty,
          })));
        if (mtError) console.error("Materials insert error:", mtError);
      }

      return mapToWorklogEntry({ ...worklog, worklog_manpower: [], worklog_worksets: [], worklog_materials: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklogs"] });
    },
  });
}

export function useUpdateWorklogStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorklogStatus }) => {
      if (!user) {
        localUpdateStatus(id, status);
        return;
      }
      const { error } = await supabase
        .from("worklogs")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklogs"] });
    },
  });
}

export function useDeleteWorklog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        localDeleteWorklog(id);
        return;
      }
      // Delete related records first
      await supabase.from("worklog_manpower").delete().eq("worklog_id", id);
      await supabase.from("worklog_worksets").delete().eq("worklog_id", id);
      await supabase.from("worklog_materials").delete().eq("worklog_id", id);
      const { error } = await supabase.from("worklogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklogs"] });
    },
  });
}
