import { useState, useMemo } from "react";
import { Search, X, Users, Phone, MapPin, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  user_id: string;
  name: string;
  phone: string | null;
  affiliation: string | null;
  role: string;
  siteCount: number;
  worklogCount: number;
}

type RoleFilter = "all" | "worker" | "admin" | "partner";

export default function AdminUserManager() {
  const { isTestMode } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const MOCK_USERS: UserProfile[] = [
    { user_id: "u1", name: "이현수", phone: "010-1234-5678", affiliation: "이노피앤씨", role: "worker", siteCount: 3, worklogCount: 15 },
    { user_id: "u2", name: "박민호", phone: "010-5678-1234", affiliation: "이노피앤씨", role: "worker", siteCount: 2, worklogCount: 22 },
    { user_id: "u3", name: "김태우", phone: "010-9876-5432", affiliation: "이노피앤씨", role: "worker", siteCount: 1, worklogCount: 8 },
    { user_id: "u4", name: "최영진", phone: "010-1111-2222", affiliation: "이노피앤씨", role: "admin", siteCount: 5, worklogCount: 0 },
    { user_id: "u5", name: "정하늘", phone: "010-3333-4444", affiliation: "이노피앤씨", role: "worker", siteCount: 4, worklogCount: 45 },
    { user_id: "u6", name: "한지민", phone: "010-5555-6666", affiliation: "대한건설", role: "partner", siteCount: 2, worklogCount: 0 },
    { user_id: "u7", name: "오세훈", phone: "010-7777-8888", affiliation: "미래종합건설", role: "partner", siteCount: 3, worklogCount: 0 },
    { user_id: "u8", name: "송유나", phone: "010-9999-0000", affiliation: "이노피앤씨", role: "admin", siteCount: 5, worklogCount: 0 },
  ];

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", isTestMode],
    queryFn: async () => {
      if (isTestMode) return MOCK_USERS;

      // Get profiles
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("user_id, name, phone, affiliation");
      if (pErr) throw pErr;

      // Get roles
      const { data: roles, error: rErr } = await supabase.from("user_roles").select("user_id, role");
      if (rErr) throw rErr;

      // Get site memberships count
      const { data: members } = await supabase.from("site_members").select("user_id");
      const memberCount: Record<string, number> = {};
      members?.forEach(m => { memberCount[m.user_id] = (memberCount[m.user_id] || 0) + 1; });

      // Get worklog counts
      const { data: worklogs } = await supabase.from("worklogs").select("created_by");
      const wlCount: Record<string, number> = {};
      worklogs?.forEach(w => { wlCount[w.created_by] = (wlCount[w.created_by] || 0) + 1; });

      const roleMap: Record<string, string> = {};
      roles?.forEach(r => { roleMap[r.user_id] = r.role; });

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        name: p.name || "미지정",
        phone: p.phone,
        affiliation: p.affiliation,
        role: roleMap[p.user_id] || "worker",
        siteCount: memberCount[p.user_id] || 0,
        worklogCount: wlCount[p.user_id] || 0,
      })) as UserProfile[];
    },
  });

  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || (u.affiliation || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    worker: users.filter(u => u.role === "worker").length,
    admin: users.filter(u => u.role === "admin").length,
    partner: users.filter(u => u.role === "partner").length,
  }), [users]);

  const ROLE_LABEL: Record<string, string> = { admin: "관리자", worker: "작업자", partner: "파트너" };
  const ROLE_CLS: Record<string, string> = {
    admin: "bg-amber-50 text-amber-700 border-amber-200",
    worker: "bg-blue-50 text-blue-600 border-blue-200",
    partner: "bg-violet-50 text-violet-600 border-violet-200",
  };

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl-app font-[800] text-header-navy mb-1">인력 관리</h1>
      <p className="text-[15px] text-text-sub font-medium mb-5">전체 사용자 현황 및 역할 조회</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { key: "all" as const, label: "전체", val: stats.total, cls: "bg-blue-50 text-blue-500 border-blue-200" },
          { key: "worker" as const, label: "작업자", val: stats.worker, cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
          { key: "admin" as const, label: "관리자", val: stats.admin, cls: "bg-amber-50 text-amber-700 border-amber-200" },
          { key: "partner" as const, label: "파트너", val: stats.partner, cls: "bg-violet-50 text-violet-600 border-violet-200" },
        ].map(c => (
          <button
            key={c.key}
            onClick={() => setRoleFilter(c.key)}
            className={cn("p-2.5 rounded-xl text-center border cursor-pointer transition-all active:scale-[0.98]", c.cls, roleFilter === c.key && "ring-2 ring-primary/30")}
          >
            <div className="text-[18px] font-[800]">{c.val}</div>
            <div className="text-[11px] font-bold">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 또는 소속 검색"
          className="w-full h-[48px] bg-card border border-border rounded-xl pl-4 pr-10 text-[15px] font-medium outline-none focus:border-primary focus:shadow-input-focus" />
        {search ? <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>
          : <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
      </div>

      {/* User List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">결과가 없습니다</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.user_id} className="bg-card rounded-2xl shadow-soft p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[16px] font-[800] text-primary">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[16px] font-[800] text-header-navy">{u.name}</div>
                    <div className="text-[13px] text-text-sub font-medium">{u.affiliation || "소속 없음"}</div>
                  </div>
                </div>
                <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full border", ROLE_CLS[u.role] || ROLE_CLS.worker)}>
                  {ROLE_LABEL[u.role] || u.role}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[13px] text-text-sub font-medium">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> 현장 {u.siteCount}개</span>
                <span>일지 {u.worklogCount}건</span>
                {u.phone && (
                  <a href={`tel:${u.phone}`} className="flex items-center gap-1 text-blue-500 no-underline ml-auto">
                    <Phone className="w-3.5 h-3.5" /> {u.phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
