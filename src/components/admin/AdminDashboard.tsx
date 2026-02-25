import { useMemo } from "react";
import {
  MapPin, Users, Handshake, ClipboardList, FileCheck, AlertTriangle,
  ArrowRight, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onNavigate: (tab: string) => void;
}

const MOCK_STATS = {
  sites: 5,
  workers: 12,
  partners: 3,
  pending: 4,
  totalWorklogs: 28,
  docs: 15,
  recentWorklogs: [
    { id: "m1", site_name: "강남 오피스텔 신축", status: "submitted", work_date: "2026-02-23", created_at: "" },
    { id: "m2", site_name: "판교 데이터센터", status: "approved", work_date: "2026-02-22", created_at: "" },
    { id: "m3", site_name: "송도 물류센터", status: "rejected", work_date: "2026-02-21", created_at: "" },
    { id: "m4", site_name: "여의도 리모델링", status: "submitted", work_date: "2026-02-21", created_at: "" },
    { id: "m5", site_name: "인천공항 T2 확장", status: "draft", work_date: "2026-02-20", created_at: "" },
  ],
};

export default function AdminDashboard({ onNavigate }: Props) {
  const { isTestMode } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats", isTestMode],
    queryFn: async () => {
      if (isTestMode) return MOCK_STATS;

      const [
        { count: siteCount },
        { count: workerCount },
        { count: partnerCount },
        { count: pendingCount },
        { count: totalWorklogs },
        { count: docCount },
        { data: recentWorklogs },
      ] = await Promise.all([
        supabase.from("sites").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "worker"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "partner"),
        supabase.from("worklogs").select("*", { count: "exact", head: true }).in("status", ["submitted", "pending", "draft"]),
        supabase.from("worklogs").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("worklogs").select("id, site_name, status, work_date, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      return {
        sites: siteCount || 0,
        workers: workerCount || 0,
        partners: partnerCount || 0,
        pending: pendingCount || 0,
        totalWorklogs: totalWorklogs || 0,
        docs: docCount || 0,
        recentWorklogs: recentWorklogs || [],
      };
    },
  });

  const STAT_CARDS = useMemo(() => [
    { key: "site", label: "등록 현장", value: stats?.sites ?? 0, icon: MapPin, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", tab: "site" },
    { key: "worker", label: "작업자", value: stats?.workers ?? 0, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", tab: "user" },
    { key: "partner", label: "파트너사", value: stats?.partners ?? 0, icon: Handshake, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", tab: "partner" },
    { key: "pending", label: "승인대기", value: stats?.pending ?? 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", tab: "worklog" },
    { key: "worklogs", label: "전체 일지", value: stats?.totalWorklogs ?? 0, icon: ClipboardList, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20", tab: "worklog" },
    { key: "docs", label: "문서", value: stats?.docs ?? 0, icon: FileCheck, color: "text-text-sub", bg: "bg-muted", border: "border-border", tab: "doc" },
  ], [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl-app font-[800] text-header-navy mb-1">대시보드</h1>
        <p className="text-[15px] text-text-sub font-medium">본사 관리자 통합 현황</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {STAT_CARDS.map(card => (
          <button
            key={card.key}
            onClick={() => onNavigate(card.tab)}
            className={cn(
              "p-4 rounded-2xl border flex flex-col gap-2 cursor-pointer transition-all active:scale-[0.98] hover:shadow-md text-left",
              card.bg, card.border
            )}
          >
            <div className="flex items-center justify-between">
              <card.icon className={cn("w-5 h-5", card.color)} />
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className={cn("text-[28px] font-[800] leading-tight", card.color)}>{card.value}</span>
            <span className="text-[13px] font-bold text-text-sub">{card.label}</span>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl shadow-soft p-5 mb-6">
        <h3 className="text-[17px] font-[800] text-header-navy mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> 빠른 작업
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { label: "일지 승인", tab: "worklog", icon: ClipboardList, cls: "bg-indigo-50 text-indigo-600 border-indigo-200" },
            { label: "현장 등록", tab: "site", icon: MapPin, cls: "bg-blue-50 text-blue-600 border-blue-200" },
            { label: "파트너 배정", tab: "partner", icon: Handshake, cls: "bg-violet-50 text-violet-600 border-violet-200" },
            { label: "인력 현황", tab: "user", icon: Users, cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
            { label: "문서 관리", tab: "doc", icon: FileCheck, cls: "bg-muted text-text-sub border-border" },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.tab)}
              className={cn(
                "h-[52px] rounded-xl border flex items-center justify-center gap-2 text-[14px] font-bold cursor-pointer transition-all active:scale-[0.98]",
                action.cls
              )}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Worklogs */}
      <div className="bg-card rounded-2xl shadow-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-[800] text-header-navy flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> 최근 일지
          </h3>
          <button
            onClick={() => onNavigate("worklog")}
            className="text-[13px] font-bold text-primary bg-transparent border-none cursor-pointer flex items-center gap-1"
          >
            전체보기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {(stats?.recentWorklogs || []).length === 0 ? (
          <p className="text-[14px] text-muted-foreground text-center py-6">최근 일지가 없습니다</p>
        ) : (
          <div className="space-y-2">
            {(stats?.recentWorklogs || []).map((wl: any) => (
              <div key={wl.id} className="flex items-center justify-between py-3 border-b border-dashed border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-foreground truncate">{wl.site_name}</div>
                  <div className="text-[13px] text-text-sub font-medium">{wl.work_date}</div>
                </div>
                <span className={cn(
                  "text-[12px] font-bold px-2.5 py-1 rounded-full",
                  wl.status === "approved" ? "bg-muted text-muted-foreground" :
                  wl.status === "rejected" ? "bg-red-50 text-red-600" :
                  "bg-indigo-50 text-indigo-600"
                )}>
                  {wl.status === "approved" ? "승인" : wl.status === "rejected" ? "반려" : "대기"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
