import { useState, useMemo } from "react";
import { Search, X, Plus, MapPin, Users, ChevronDown, Edit2, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface SiteRow {
  id: string;
  name: string;
  address: string | null;
  status: string;
  manager_name: string | null;
  manager_phone: string | null;
  created_at: string;
  memberCount?: number;
}

export default function AdminSiteManager() {
  const { user, isTestMode } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "진행중" | "예정" | "완료">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editSite, setEditSite] = useState<SiteRow | null>(null);
  const [assignSiteId, setAssignSiteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formAddr, setFormAddr] = useState("");
  const [formStatus, setFormStatus] = useState("진행중");
  const [formManager, setFormManager] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const MOCK_SITES: SiteRow[] = [
    { id: "s1", name: "강남 오피스텔 신축", address: "서울시 강남구 역삼동 123", status: "진행중", manager_name: "최영진", manager_phone: "010-1111-2222", created_at: "2026-01-15", memberCount: 8 },
    { id: "s2", name: "판교 데이터센터", address: "경기도 성남시 분당구 판교로 456", status: "진행중", manager_name: "송유나", manager_phone: "010-9999-0000", created_at: "2026-01-20", memberCount: 12 },
    { id: "s3", name: "송도 물류센터", address: "인천시 연수구 송도동 789", status: "예정", manager_name: null, manager_phone: null, created_at: "2026-02-01", memberCount: 0 },
    { id: "s4", name: "여의도 리모델링", address: "서울시 영등포구 여의도동 101", status: "진행중", manager_name: "김태우", manager_phone: "010-9876-5432", created_at: "2025-11-01", memberCount: 6 },
    { id: "s5", name: "인천공항 T2 확장", address: "인천시 중구 운서동 공항로 272", status: "진행중", manager_name: "정하늘", manager_phone: "010-3333-4444", created_at: "2025-10-15", memberCount: 15 },
  ];

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["admin-sites", isTestMode],
    queryFn: async () => {
      if (isTestMode) return MOCK_SITES;

      const { data, error } = await supabase.from("sites").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      // Get member counts
      const { data: members } = await supabase.from("site_members").select("site_id");
      const countMap: Record<string, number> = {};
      members?.forEach(m => { countMap[m.site_id] = (countMap[m.site_id] || 0) + 1; });

      return (data || []).map(s => ({ ...s, memberCount: countMap[s.id] || 0 })) as SiteRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (site: { name: string; address: string; status: string; manager_name: string; manager_phone: string }) => {
      const { error } = await supabase.from("sites").insert({ ...site, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      setShowCreateModal(false);
      resetForm();
      toast.success("현장이 등록되었습니다");
    },
    onError: () => toast.error("등록에 실패했습니다"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; address: string; status: string; manager_name: string; manager_phone: string }) => {
      const { error } = await supabase.from("sites").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      setEditSite(null);
      resetForm();
      toast.success("현장 정보가 수정되었습니다");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      toast.success("현장이 삭제되었습니다");
    },
  });

  const resetForm = () => {
    setFormName(""); setFormAddr(""); setFormStatus("진행중"); setFormManager(""); setFormPhone("");
  };

  const openEdit = (site: SiteRow) => {
    setEditSite(site);
    setFormName(site.name);
    setFormAddr(site.address || "");
    setFormStatus(site.status);
    setFormManager(site.manager_name || "");
    setFormPhone(site.manager_phone || "");
  };

  const filtered = useMemo(() => {
    return sites.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.address || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sites, search, statusFilter]);

  const stats = useMemo(() => ({
    total: sites.length,
    ing: sites.filter(s => s.status === "진행중").length,
    wait: sites.filter(s => s.status === "예정").length,
    done: sites.filter(s => s.status === "완료").length,
  }), [sites]);

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl-app font-[800] text-header-navy mb-1">현장 관리</h1>
          <p className="text-[15px] text-text-sub font-medium">현장 등록, 수정, 인원 배정</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="h-10 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-[14px] flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> 현장등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { key: "all" as const, label: "전체", val: stats.total, cls: "bg-blue-50 text-blue-500 border-blue-200" },
          { key: "진행중" as const, label: "진행", val: stats.ing, cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
          { key: "예정" as const, label: "예정", val: stats.wait, cls: "bg-violet-50 text-violet-600 border-violet-200" },
          { key: "완료" as const, label: "완료", val: stats.done, cls: "bg-muted text-text-sub border-border" },
        ].map(c => (
          <button
            key={c.key}
            onClick={() => setStatusFilter(c.key)}
            className={cn("p-2.5 rounded-xl text-center border cursor-pointer transition-all active:scale-[0.98]", c.cls, statusFilter === c.key && "ring-2 ring-primary/30")}
          >
            <div className="text-[18px] font-[800]">{c.val}</div>
            <div className="text-[11px] font-bold">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="현장명 또는 주소 검색"
          className="w-full h-[48px] bg-card border border-border rounded-xl pl-4 pr-10 text-[15px] font-medium outline-none focus:border-primary focus:shadow-input-focus" />
        {search ? <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>
          : <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
      </div>

      {/* Site List */}
      <div className="space-y-3">
        {filtered.map(site => (
          <div key={site.id} className="bg-card rounded-2xl shadow-soft p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-[17px] font-[800] text-header-navy truncate">{site.name}</div>
                {site.address && <div className="text-[13px] text-text-sub mt-0.5 truncate">{site.address}</div>}
              </div>
              <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full text-white ml-2 flex-shrink-0",
                site.status === "진행중" ? "bg-blue-500" : site.status === "예정" ? "bg-violet-500" : "bg-muted-foreground"
              )}>{site.status}</span>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-text-sub font-medium mb-3">
              {site.manager_name && <span>📋 {site.manager_name}</span>}
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {site.memberCount}명</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(site)} className="flex-1 h-9 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg font-bold text-[13px] flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]">
                <Edit2 className="w-3.5 h-3.5" /> 수정
              </button>
              <button onClick={() => setAssignSiteId(site.id)} className="flex-1 h-9 bg-violet-50 text-violet-600 border border-violet-200 rounded-lg font-bold text-[13px] flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]">
                <UserPlus className="w-3.5 h-3.5" /> 인원배정
              </button>
              <button onClick={() => { if (confirm("정말 삭제하시겠습니까?")) deleteMutation.mutate(site.id); }} className="h-9 px-3 bg-red-50 text-red-600 border border-red-200 rounded-lg cursor-pointer active:scale-[0.98]">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editSite) && (
        <SiteFormModal
          title={editSite ? "현장 수정" : "현장 등록"}
          name={formName} setName={setFormName}
          addr={formAddr} setAddr={setFormAddr}
          status={formStatus} setStatus={setFormStatus}
          manager={formManager} setManager={setFormManager}
          phone={formPhone} setPhone={setFormPhone}
          onClose={() => { setShowCreateModal(false); setEditSite(null); resetForm(); }}
          onSubmit={() => {
            if (!formName.trim()) { toast.error("현장명을 입력하세요"); return; }
            if (editSite) {
              updateMutation.mutate({ id: editSite.id, name: formName, address: formAddr, status: formStatus, manager_name: formManager, manager_phone: formPhone });
            } else {
              createMutation.mutate({ name: formName, address: formAddr, status: formStatus, manager_name: formManager, manager_phone: formPhone });
            }
          }}
          isEdit={!!editSite}
        />
      )}

      {/* Member Assignment Modal */}
      {assignSiteId && (
        <MemberAssignModal siteId={assignSiteId} onClose={() => setAssignSiteId(null)} />
      )}
    </div>
  );
}

/* ─── Site Form Modal ─── */
function SiteFormModal({ title, name, setName, addr, setAddr, status, setStatus, manager, setManager, phone, setPhone, onClose, onSubmit, isEdit }: {
  title: string; name: string; setName: (v: string) => void; addr: string; setAddr: (v: string) => void; status: string; setStatus: (v: string) => void;
  manager: string; setManager: (v: string) => void; phone: string; setPhone: (v: string) => void; onClose: () => void; onSubmit: () => void; isEdit: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-[500px] bg-card rounded-t-[20px] md:rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[18px] font-[800] text-header-navy">{title}</h3>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer"><X className="w-5 h-5 text-text-sub" /></button>
        </div>
        <div className="space-y-3">
          <FormField label="현장명 *" value={name} onChange={setName} placeholder="현장명을 입력하세요" />
          <FormField label="주소" value={addr} onChange={setAddr} placeholder="주소를 입력하세요" />
          <div>
            <label className="block text-[13px] font-bold text-text-sub mb-1">상태</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-[44px] bg-card border border-border rounded-xl px-3 text-[14px] font-medium outline-none">
              <option value="진행중">진행중</option>
              <option value="예정">예정</option>
              <option value="완료">완료</option>
            </select>
          </div>
          <FormField label="현장소장" value={manager} onChange={setManager} placeholder="소장명" />
          <FormField label="연락처" value={phone} onChange={setPhone} placeholder="010-0000-0000" />
        </div>
        <button onClick={onSubmit} className="w-full h-12 mt-5 bg-primary text-primary-foreground rounded-xl font-bold text-[15px] cursor-pointer active:scale-[0.98]">
          {isEdit ? "수정 완료" : "등록하기"}
        </button>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-text-sub mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-[44px] bg-card border border-border rounded-xl px-3 text-[14px] font-medium outline-none focus:border-primary" />
    </div>
  );
}

/* ─── Member Assignment Modal ─── */
function MemberAssignModal({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["site-members", siteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_members").select("*, profiles:user_id(name, affiliation, phone)").eq("site_id", siteId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, name, affiliation, phone");
      if (error) throw error;
      return data || [];
    },
  });

  const memberUserIds = new Set(members.map((m: any) => m.user_id));
  const availableUsers = allUsers.filter(u => !memberUserIds.has(u.user_id) && (
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.affiliation || "").toLowerCase().includes(search.toLowerCase())
  ));

  const assignMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("site_members").insert({ site_id: siteId, user_id: userId, role: "worker" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-members", siteId] });
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      toast.success("인원이 배정되었습니다");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("site_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-members", siteId] });
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      toast.success("인원이 제외되었습니다");
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-[500px] bg-card rounded-t-[20px] md:rounded-2xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-[800] text-header-navy">인원 배정</h3>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer"><X className="w-5 h-5 text-text-sub" /></button>
        </div>

        {/* Current Members */}
        <div className="mb-4">
          <div className="text-[14px] font-bold text-text-sub mb-2">현재 배정 인원 ({members.length}명)</div>
          {members.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">배정된 인원이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                  <div>
                    <span className="text-[14px] font-bold text-foreground">{(m as any).profiles?.name || "미지정"}</span>
                    <span className="text-[12px] text-text-sub ml-2">{(m as any).profiles?.affiliation || ""}</span>
                  </div>
                  <button onClick={() => removeMutation.mutate(m.id)} className="text-destructive bg-transparent border-none cursor-pointer p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Members */}
        <div className="border-t border-border pt-4">
          <div className="text-[14px] font-bold text-text-sub mb-2">인원 추가</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 또는 소속 검색"
            className="w-full h-[44px] bg-card border border-border rounded-xl px-3 text-[14px] font-medium outline-none focus:border-primary mb-3" />
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {availableUsers.slice(0, 20).map(u => (
              <div key={u.user_id} className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
                <div>
                  <span className="text-[14px] font-bold text-foreground">{u.name}</span>
                  <span className="text-[12px] text-text-sub ml-2">{u.affiliation || ""}</span>
                </div>
                <button onClick={() => assignMutation.mutate(u.user_id)} className="h-8 px-3 bg-primary/10 text-primary rounded-lg font-bold text-[12px] cursor-pointer active:scale-[0.98]">
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
