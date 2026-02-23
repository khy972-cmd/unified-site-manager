import { useState, useMemo, useRef, useCallback } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Search, FileText, MapPin, Plus, Check, ChevronDown, ChevronUp, X,
  Download, Share2, Trash2, ArrowLeft, Upload, Eye, Camera, RefreshCw,
  Lock, MapPinIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  usePunchGroups, useAddPunchItem, useUpdatePunchItem,
  useDeletePunchItem, useSavePunchGroups,
} from "@/hooks/useSupabasePunch";
import type { PunchGroup, PunchItem, PunchFile } from "@/lib/punchStore";

const DOC_TABS = ["내문서함", "회사서류", "도면함", "사진함", "조치"];

const IMG_CONCRETE = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=400&auto=format&fit=crop";
const IMG_CRACK = "https://images.unsplash.com/photo-1581094271901-8022df4466f9?q=80&w=400&auto=format&fit=crop";
const IMG_WALL = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=400&auto=format&fit=crop";

type DocFile = { id: string; name: string; type: 'img' | 'file'; url: string; size: string; ext: string; drawingState?: string; url_before?: string; url_after?: string; currentView?: string };
type Doc = { id: string; title: string; author: string; date: string; time: string; files: DocFile[]; contractor?: string; affiliation?: string; status?: string };

const MOCK_DOCS: Record<string, Doc[]> = {
  '내문서함': [
    { id: 'md1', title: '기초안전보건교육이수증', author: '박작업', date: '2025-12-28', time: '09:10', files: [{ id: 'md1f1', name: '기초안전교육이수증.jpg', type: 'img', url: IMG_WALL, size: '1.2MB', ext: 'JPG' }] },
    { id: 'md2', title: '통장사본', author: '박작업', date: '2025-12-28', time: '09:10', files: [] },
    { id: 'md3', title: '신분증', author: '박작업', date: '2025-12-28', time: '09:10', files: [] },
    { id: 'md4', title: '배치전 검진서', author: '박작업', date: '2025-12-28', time: '09:10', files: [] },
    { id: 'md5', title: '차량등록증', author: '박작업', date: '2025-12-28', time: '09:10', files: [] },
    { id: 'md6', title: '차량보험증', author: '박작업', date: '2025-12-28', time: '09:10', files: [] },
    { id: 'md7', title: '고령자서류', author: '박작업', date: '2025-12-28', time: '09:10', files: [] },
  ],
  '회사서류': [
    { id: 'g2', title: '표준계약서', author: '관리자', date: '2025-01-01', time: '10:00', files: [{ id: 'f2', name: '계약서.hwp', type: 'file', url: '', size: '54KB', ext: 'HWP' }] },
  ],
  '도면함': [
    { id: 'g3', title: '송파 B현장', contractor: 'GS건설', affiliation: '협력업체', author: '김설계', date: '2025-12-08', time: '14:20', files: [{ id: 'f3', name: '1F 배관도면.pdf', type: 'file', url: '', size: '5MB', ext: 'PDF', drawingState: 'ing' }] },
  ],
  '사진함': [
    { id: 'g4', title: '송파 B현장', contractor: 'GS건설', affiliation: '협력업체', author: '이시공', date: '2025-12-09', time: '16:45', files: [{ id: 'f4', name: '시공사진1', type: 'img', url: IMG_CONCRETE, size: '2.5MB', ext: 'JPG', url_before: IMG_CONCRETE, url_after: IMG_CONCRETE, currentView: 'after' }] },
  ],
};

const formatDateShort = (d: string) => {
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[0].slice(2)}.${parts[1]}.${parts[2]}` : d;
};

export default function DocPage() {
  const { isPartner } = useUserRole();
  // Partners see the same doc page but with restricted tabs (no 회사서류)
  return <DocPageInner restrictCompanyDocs={isPartner} />;
}

function DocPageInner({ restrictCompanyDocs }: { restrictCompanyDocs: boolean }) {
  const DOC_TABS_FILTERED = restrictCompanyDocs ? ["내문서함", "도면함", "사진함", "조치"] : DOC_TABS;
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(5);
  const [punchFilter, setPunchFilter] = useState<'all' | 'open' | 'done'>('all');
  const [siteFilter, setSiteFilter] = useState('');
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  // Punch detail state
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);

  // Supabase-backed punch data
  const { data: punchGroups = [] } = usePunchGroups();
  const addItemMutation = useAddPunchItem();
  const updateItemMutation = useUpdatePunchItem();
  const deleteItemMutation = useDeletePunchItem();
  const savePunchGroupsMutation = useSavePunchGroups();

  const tabKey = DOC_TABS_FILTERED[activeTab];
  const isPunch = tabKey === '조치';
  const isMyDocs = tabKey === '내문서함';

  // Punch stats from live data
  const punchStats = useMemo(() => {
    const items = punchGroups.flatMap(g => g.punchItems || []);
    return {
      total: items.length,
      open: items.filter(i => i.status !== 'done').length,
      done: items.filter(i => i.status === 'done').length,
    };
  }, [punchGroups]);

  // Filtered docs (for non-punch tabs)
  const filteredDocs = useMemo(() => {
    if (isPunch) return [];
    const q = search.toLowerCase();
    return (MOCK_DOCS[tabKey] || []).filter(doc => {
      return doc.title.toLowerCase().includes(q) || (doc.contractor || '').toLowerCase().includes(q);
    });
  }, [activeTab, search, tabKey, isPunch]);

  // Filtered punch groups
  const filteredPunchGroups = useMemo(() => {
    if (!isPunch) return [];
    const q = search.toLowerCase();
    return punchGroups.filter(g => {
      if (siteFilter && g.title !== siteFilter) return false;
      const matchSearch = g.title.toLowerCase().includes(q) || g.contractor.toLowerCase().includes(q);
      if (punchFilter === 'all') return matchSearch;
      if (punchFilter === 'open') return matchSearch && g.punchItems?.some(i => i.status !== 'done');
      if (punchFilter === 'done') return matchSearch && g.punchItems?.every(i => i.status === 'done');
      return matchSearch;
    });
  }, [isPunch, search, punchFilter, siteFilter, punchGroups]);

  const displayedDocs = isPunch ? [] : filteredDocs.slice(0, visibleCount);
  const displayedPunchGroups = isPunch ? filteredPunchGroups.slice(0, visibleCount) : [];
  const hasMore = isPunch ? filteredPunchGroups.length > visibleCount : filteredDocs.length > visibleCount;
  const totalDisplayed = isPunch ? filteredPunchGroups.length : filteredDocs.length;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const punchSites = useMemo(() => punchGroups.map(g => g.title), [punchGroups]);

  const getPriorityStyle = (p: string) => {
    if (p === '높음') return 'bg-red-50 text-red-600 border-red-300';
    if (p === '중간') return 'bg-amber-50 text-amber-600 border-amber-300';
    return 'bg-emerald-50 text-emerald-600 border-emerald-300';
  };

  const getStatusBadge = (group: PunchGroup) => {
    const hasOpen = group.punchItems?.some(i => i.status !== 'done');
    if (!hasOpen) return { text: '완료', cls: 'bg-slate-500 text-white' };
    return { text: '미조치', cls: 'bg-destructive text-white' };
  };

  // ─── Detail overlay ───
  const detailGroup = useMemo(() => {
    if (!detailGroupId) return null;
    return punchGroups.find(g => g.id === detailGroupId) || null;
  }, [detailGroupId, punchGroups]);

  const isApproved = detailGroup?.punchItems?.every(i => i.status === 'done') || false;

  const openDetail = (groupId: string) => {
    setDetailGroupId(groupId);
    setSelectedIds(new Set());
  };

  const closeDetail = () => {
    setDetailGroupId(null);
    setSelectedIds(new Set());
  };

  // Punch item actions
  const handleUpdateField = (itemId: string, field: keyof PunchItem, value: string) => {
    if (!detailGroupId) return;
    updateItemMutation.mutate({ groupId: detailGroupId, itemId, field: field as string, value });
  };

  const handleDeletePunchItem = (itemId: string) => {
    if (!detailGroupId) return;
    if (!confirm('이 조치 항목을 삭제하시겠습니까?')) return;
    deleteItemMutation.mutate({ groupId: detailGroupId, itemId }, {
      onSuccess: () => toast.success("항목이 삭제되었습니다."),
    });
  };

  const handleAddPunchItem = () => {
    if (!detailGroupId) return;
    const newItem: PunchItem = {
      id: `pi_${Date.now()}`,
      location: '',
      issue: '',
      priority: '중간',
      status: 'open',
      assignee: '',
      dueDate: '',
      date: new Date().toISOString().split('T')[0],
      beforePhoto: '',
      afterPhoto: '',
    };
    addItemMutation.mutate({ groupId: detailGroupId, item: newItem }, {
      onSuccess: () => toast.success("새 항목이 추가되었습니다."),
    });
  };

  const handlePhotoUpload = (itemId: string, photoType: 'beforePhoto' | 'afterPhoto') => {
    if (isApproved) {
      toast.error("승인완료 상태에서는 수정할 수 없습니다.");
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file || !detailGroupId) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateItemMutation.mutate({
          groupId: detailGroupId,
          itemId,
          field: photoType,
          value: ev.target?.result as string,
        }, {
          onSuccess: () => toast.success("사진이 업로드되었습니다."),
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}개 항목을 삭제하시겠습니까?`)) return;
    if (isPunch && !detailGroupId) {
      const updated = punchGroups.filter(g => !selectedIds.has(g.id));
      savePunchGroupsMutation.mutate(updated);
    }
    setSelectedIds(new Set());
    toast.success("삭제 완료");
  };

  // ─── Reset on tab change ───
  const handleTabChange = (i: number) => {
    setActiveTab(i);
    setSearch('');
    setSelectedIds(new Set());
    setVisibleCount(5);
    setPunchFilter('all');
    setSiteFilter('');
    setDetailGroupId(null);
    setShowSiteDropdown(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Tab Bar */}
      <div className="flex border-b border-border mb-4 -mx-4 px-1 bg-card -mt-6 pt-6 overflow-x-auto scrollbar-none">
        {DOC_TABS_FILTERED.map((tab, i) => (
          <button
            key={tab}
            onClick={() => handleTabChange(i)}
            className={cn(
              "flex-1 min-w-0 h-12 bg-transparent border-none text-[16px] font-bold cursor-pointer border-b-[3px] transition-all whitespace-nowrap px-1",
              activeTab === i
                ? "text-sky-500 border-b-sky-500 font-[800]"
                : "text-muted-foreground border-b-transparent"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Punch Site Filter */}
      {isPunch && !detailGroupId && (
        <div className="relative mb-4">
          <input
            value={siteFilter}
            onChange={e => { setSiteFilter(e.target.value); setShowSiteDropdown(true); }}
            onFocus={() => setShowSiteDropdown(true)}
            placeholder="현장 선택 또는 검색"
            className="w-full h-[54px] bg-card border border-border rounded-2xl px-5 pr-16 text-base font-medium text-foreground placeholder:text-muted-foreground shadow-soft transition-all outline-none hover:border-primary/50 focus:shadow-[0_0_0_2px_hsl(var(--primary))] focus:border-transparent"
          />
          {siteFilter && (
            <button onClick={() => { setSiteFilter(''); setShowSiteDropdown(false); }} className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[12px] text-muted-foreground z-10">✕</button>
          )}
          <button onClick={() => setShowSiteDropdown(!showSiteDropdown)} className="absolute right-4 top-1/2 -translate-y-1/2">
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </button>
          {showSiteDropdown && (
            <ul className="absolute z-50 w-full mt-1.5 max-h-60 overflow-auto bg-card border border-border rounded-xl shadow-lg">
              {punchSites.filter(s => s.toLowerCase().includes(siteFilter.toLowerCase())).map(site => (
                <li key={site} onClick={() => { setSiteFilter(site); setShowSiteDropdown(false); }} className="px-4 py-3.5 cursor-pointer border-b border-border last:border-0 text-[15px] font-medium text-foreground hover:bg-muted">{site}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Search */}
      {!detailGroupId && (
        <div className="relative mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="현장명 검색..."
            className="w-full h-[54px] bg-card border border-transparent rounded-2xl px-5 pr-12 text-base font-medium text-foreground placeholder:text-muted-foreground shadow-soft transition-all hover:bg-card hover:border-border focus:shadow-[0_0_0_2px_hsl(var(--primary))] focus:border-transparent outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[12px] text-muted-foreground z-10">✕</button>
          )}
          <Search className="absolute right-[18px] top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        </div>
      )}

      {/* Punch Summary */}
      {isPunch && !detailGroupId && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { key: 'all' as const, label: '전체', count: punchStats.total, cls: 'bg-header-navy' },
            { key: 'open' as const, label: '미조치', count: punchStats.open, cls: 'bg-destructive' },
            { key: 'done' as const, label: '완료', count: punchStats.done, cls: 'bg-slate-500' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setPunchFilter(f.key)}
              className={cn(
                "h-10 px-3.5 rounded-full text-[15px] font-medium cursor-pointer transition-all whitespace-nowrap shrink-0 border",
                punchFilter === f.key
                  ? `${f.cls} text-white border-transparent font-bold shadow-[0_0_0_3px_rgba(49,163,250,0.15)]`
                  : "bg-white border-border text-[#64748b] hover:border-primary/50"
              )}
            >{f.label} {f.count}</button>
          ))}
        </div>
      )}

      {/* ═══════ DETAIL OVERLAY ═══════ */}
      {detailGroupId && detailGroup && (
        <PunchDetailView
          group={detailGroup}
          isApproved={isApproved}
          onBack={closeDetail}
          onUpdateField={handleUpdateField}
          onDeleteItem={handleDeletePunchItem}
          onAddItem={handleAddPunchItem}
          onPhotoUpload={handlePhotoUpload}
        />
      )}

      {/* ═══════ LIST VIEW ═══════ */}
      {!detailGroupId && (
        <>
          {/* Punch Cards */}
          {isPunch && (
            <div className="space-y-3">
              {displayedPunchGroups.length === 0 ? (
                <EmptyState />
              ) : displayedPunchGroups.map(group => {
                const isSelected = selectedIds.has(group.id);
                const statusBadge = getStatusBadge(group);
                const repImg = group.files?.find(f => f.type === 'img');
                const thumbUrl = repImg ? ((repImg.currentView === 'after' ? repImg.url_after : repImg.url_before) || repImg.url) : null;
                const openCount = group.punchItems?.filter(i => i.status !== 'done').length || 0;
                const doneCount = group.punchItems?.filter(i => i.status === 'done').length || 0;
                const totalCount = group.punchItems?.length || 0;

                return (
                  <div key={group.id} className={cn("bg-card rounded-2xl p-4 cursor-pointer transition-all shadow-soft relative overflow-hidden", isSelected && "border-2 border-primary bg-sky-50/50")} onClick={() => openDetail(group.id)}>
                    <span className={cn("absolute top-0 right-0 text-[13px] font-bold px-3.5 py-1.5 text-white rounded-bl-xl z-10", statusBadge.cls)}>{statusBadge.text}</span>
                    <div className="flex gap-3 items-center">
                      <div onClick={(e) => { e.stopPropagation(); toggleSelect(group.id); }} className={cn("w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-sky-500 border-sky-500 shadow-[0_2px_8px_rgba(14,165,233,0.3)]" : "bg-card border-muted-foreground/30")}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </div>
                      <div className="w-20 h-20 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                        {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <FileText className="w-8 h-8 text-muted-foreground m-auto mt-6" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        {(group.contractor || group.affiliation) && (
                          <div className="flex gap-1.5 flex-wrap">
                            {group.contractor && <span className="text-[14px] px-3 py-0.5 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-200 font-semibold">{group.contractor}</span>}
                            {group.affiliation && <span className="text-[14px] px-3 py-0.5 rounded-lg bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-semibold">{group.affiliation}</span>}
                          </div>
                        )}
                        <div className="text-[20px] font-[800] text-header-navy truncate">{group.title}</div>
                        <div className="text-[15px] font-medium text-text-sub">
                          {group.author} <span className="text-muted-foreground">|</span> {formatDateShort(group.date)} <span className="text-muted-foreground">{group.time}</span>
                        </div>
                        <div className="text-[17px] font-bold text-foreground truncate">
                          총 {totalCount}건 (미조치 {openCount}, 완료 {doneCount})
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Non-punch cards */}
          {!isPunch && (
            <div className="space-y-3">
              {displayedDocs.length === 0 ? (
                <EmptyState />
              ) : displayedDocs.map(doc => {
                const isSelected = selectedIds.has(doc.id);
                const hasFile = doc.files && doc.files.length > 0;
                const repImg = doc.files?.find(f => f.type === 'img');
                const thumbUrl = repImg ? ((repImg.currentView === 'after' ? repImg.url_after : repImg.url_before) || repImg.url) : null;

                if (isMyDocs) {
                  const fileStatus = hasFile ? { text: '등록완료', cls: 'bg-slate-400/10 text-text-sub border-slate-400/30' } : { text: '미등록', cls: 'bg-destructive/10 text-destructive border-destructive/30' };
                  return (
                    <div key={doc.id} className={cn("bg-card rounded-2xl p-4 cursor-pointer transition-all shadow-soft", isSelected && "border-2 border-primary bg-sky-50/50")}>
                      <div className="flex gap-3 items-center">
                        <div onClick={() => toggleSelect(doc.id)} className={cn("w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-sky-500 border-sky-500 shadow-[0_2px_8px_rgba(14,165,233,0.3)]" : "bg-card border-muted-foreground/30")}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </div>
                        <div className="w-20 h-20 rounded-xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                          {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <FileText className="w-8 h-8 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <div className="flex items-center gap-2.5 mb-1">
                            <span className="text-[20px] font-[800] text-header-navy truncate">{doc.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[15px] font-medium text-text-sub mb-2">
                            <span className="font-semibold">{doc.author}</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-muted-foreground">{formatDateShort(doc.date)}</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-muted-foreground">{doc.time}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <button className={cn(
                              "flex-1 h-[34px] rounded-[10px] border text-[13px] font-[800] flex items-center justify-center gap-1.5 transition-all",
                              hasFile
                                ? "bg-indigo-50 border-indigo-200 text-indigo-500 font-bold shadow-[0_2px_4px_rgba(99,102,241,0.1)]"
                                : "bg-muted border-border text-muted-foreground opacity-60"
                            )} disabled={!hasFile}>
                              <Eye className="w-3.5 h-3.5" />
                              미리보기
                            </button>
                            <button className="flex-1 h-[34px] rounded-[10px] border border-[#bae6fd] bg-[#e0f2fe] text-[#0284c7] text-[13px] font-[800] flex items-center justify-center gap-1.5 transition-all hover:-translate-y-px">
                              <Upload className="w-3.5 h-3.5" />
                              {hasFile ? '변경' : '업로드'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={doc.id} onClick={() => toggleSelect(doc.id)} className={cn("bg-card rounded-2xl p-4 cursor-pointer transition-all shadow-soft flex gap-3 items-center", isSelected && "border-2 border-primary bg-sky-50/50 shadow-[0_0_0_2px_rgba(49,163,250,0.1)]")}>
                    <div className={cn("w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-sky-500 border-sky-500 shadow-[0_2px_8px_rgba(14,165,233,0.3)]" : "bg-card border-muted-foreground/30")}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <div className="w-20 h-20 rounded-xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <FileText className="w-8 h-8 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      {doc.contractor && (
                        <div className="flex gap-1.5 flex-wrap mb-1">
                          {doc.affiliation && <span className="text-[14px] px-3 py-0.5 rounded-lg bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-semibold">{doc.affiliation}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-text-sub shrink-0" />
                        <span className="text-[15px] text-text-sub font-bold truncate">{doc.title}</span>
                      </div>
                      <div className="text-[20px] font-[800] text-header-navy truncate">{doc.files[0]?.name || doc.title}</div>
                      <div className="text-[15px] text-text-sub font-medium">
                        {formatDateShort(doc.date)} · {doc.files[0]?.size || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More / Collapse */}
          {hasMore && (
            <button onClick={() => setVisibleCount(v => v + 5)} className="w-full h-12 flex items-center justify-center gap-1.5 text-text-sub text-[14px] font-semibold border border-border rounded-3xl bg-card shadow-soft mt-4 cursor-pointer hover:bg-muted transition-all">
              <span>더보기</span>
              <ChevronDown className="w-[18px] h-[18px]" />
            </button>
          )}
          {!hasMore && visibleCount > 5 && totalDisplayed > 5 && (
            <button onClick={() => setVisibleCount(5)} className="w-full h-12 flex items-center justify-center gap-1.5 text-text-sub text-[14px] font-semibold border border-border rounded-3xl bg-card shadow-soft mt-4 cursor-pointer hover:bg-muted transition-all">
              <span>접기</span>
              <ChevronUp className="w-[18px] h-[18px]" />
            </button>
          )}
        </>
      )}

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && !detailGroupId && (
        <div className="fixed bottom-[calc(65px+16px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 bg-header-navy text-white rounded-3xl p-3 flex items-center justify-around shadow-[0_8px_24px_rgba(0,0,0,0.2)] z-[5000] border border-white/10 backdrop-blur-lg w-[calc(100%-144px)] max-w-[420px] animate-fade-in">
          <button className="flex flex-col items-center gap-1.5 px-4 py-1.5 rounded-xl bg-transparent border-none text-white cursor-pointer transition-all hover:bg-white/10">
            <Download className="w-6 h-6" />
            <span className="text-[14px] font-[800]">저장</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 px-4 py-1.5 rounded-xl bg-transparent border-none text-white cursor-pointer transition-all hover:bg-white/10">
            <Share2 className="w-6 h-6" />
            <span className="text-[14px] font-[800]">공유</span>
          </button>
          <button onClick={handleBatchDelete} className="flex flex-col items-center gap-1.5 px-4 py-1.5 rounded-xl bg-transparent border-none text-destructive cursor-pointer transition-all hover:bg-destructive/15">
            <Trash2 className="w-6 h-6" strokeWidth={3} />
            <span className="text-[14px] font-[800]">삭제</span>
          </button>
        </div>
      )}

      {/* FAB */}
      {!detailGroupId && (
        <button
          onClick={() => setUploadSheetOpen(true)}
          className="fixed bottom-6 right-[calc(50%-280px)] w-14 h-14 rounded-full bg-header-navy text-white shadow-lg flex items-center justify-center cursor-pointer z-30 active:scale-90 transition-transform max-[600px]:right-4"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Upload Bottom Sheet */}
      {uploadSheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[2100]" onClick={() => setUploadSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 w-full max-w-[600px] mx-auto bg-card border-t border-border z-[2200] rounded-t-3xl p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] font-bold text-foreground">자료 등록</h3>
              <button onClick={() => setUploadSheetOpen(false)} className="bg-transparent border-none cursor-pointer text-foreground p-1"><X className="w-6 h-6" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-[15px] font-semibold text-text-sub mb-2">현장명</label>
              <input type="text" placeholder="현장명을 입력하세요" className="w-full h-[50px] px-4 rounded-xl border border-border bg-card text-[18px] text-foreground outline-none transition-all focus:border-sky-500" />
            </div>
            <div className="mb-4">
              <label className="block text-[15px] font-semibold text-text-sub mb-2">등록일</label>
              <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full h-[50px] px-4 rounded-xl border border-border bg-card text-[18px] text-foreground outline-none transition-all focus:border-sky-500" />
            </div>
            <div className="w-full h-16 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-muted hover:bg-card transition-all mb-8">
              <Upload className="w-6 h-6 text-text-sub" />
              <span className="font-bold text-text-sub">파일 선택 (다중 가능)</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setUploadSheetOpen(false)} className="flex-1 h-16 rounded-2xl border-2 border-border bg-muted text-foreground font-bold text-[18px] cursor-pointer transition-colors hover:bg-border">취소</button>
              <button className="flex-1 h-16 rounded-2xl bg-header-navy text-white font-bold text-[18px] border-none cursor-pointer shadow-lg transition-all hover:opacity-90 active:scale-[0.98]">등록하기</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Empty State ───
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-5">
        <Search className="w-8 h-8 text-muted-foreground opacity-60" />
      </div>
      <p className="text-[16px] font-medium text-foreground mb-2">검색 결과가 없습니다</p>
    </div>
  );
}

// ─── Punch Detail View Component ───
interface PunchDetailProps {
  group: PunchGroup;
  isApproved: boolean;
  onBack: () => void;
  onUpdateField: (itemId: string, field: keyof PunchItem, value: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
  onPhotoUpload: (itemId: string, photoType: 'beforePhoto' | 'afterPhoto') => void;
}

function PunchDetailView({ group, isApproved, onBack, onUpdateField, onDeleteItem, onAddItem, onPhotoUpload }: PunchDetailProps) {
  const items = group.punchItems || [];
  const totalCount = items.length;
  const openCount = items.filter(i => i.status !== 'done').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  return (
    <div className="animate-fade-in">
      {/* Detail Header */}
      <div className="flex items-center justify-between mb-4 -mx-4 px-4 pb-3 border-b border-border">
        <button onClick={onBack} className="flex items-center gap-2 text-foreground font-semibold text-[16px] bg-transparent border-none cursor-pointer rounded-lg p-2 -ml-2 hover:bg-muted transition-colors">
          <ArrowLeft className="w-6 h-6" />
          <span>이전</span>
        </button>
        <h2 className="text-[18px] font-bold text-foreground flex-1 text-center px-4 truncate">{group.title}</h2>
        <button className="bg-muted text-text-sub border border-border rounded-lg px-3 py-1.5 text-[14px] font-bold cursor-pointer hover:bg-card transition-colors whitespace-nowrap">
          보고서
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-sky-50 border border-sky-400 p-4 rounded-2xl text-center">
          <div className="text-[28px] font-[900] text-sky-600 mb-1">{totalCount}</div>
          <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">전체</div>
        </div>
        <div className="bg-red-50 border border-red-400 p-4 rounded-2xl text-center">
          <div className="text-[28px] font-[900] text-red-600 mb-1">{openCount}</div>
          <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider">미조치</div>
        </div>
        <div className="bg-slate-50 border border-slate-400 p-4 rounded-2xl text-center">
          <div className="text-[28px] font-[900] text-slate-600 mb-1">{doneCount}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">완료</div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-[18px] font-[900] text-foreground">조치 내역 ({totalCount})</h3>
      </div>

      {/* Punch Items */}
      {items.length === 0 ? (
        <div className="p-10 text-center text-text-sub bg-card rounded-2xl border-2 border-dashed border-border">
          등록된 조치 정보가 없습니다.
          <br /><small className="text-[13px] mt-2 block">아래 버튼을 눌러 새로운 하자 내용을 추가하세요.</small>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <PunchItemCard
              key={item.id}
              item={item}
              isApproved={isApproved}
              onUpdateField={onUpdateField}
              onDelete={onDeleteItem}
              onPhotoUpload={onPhotoUpload}
            />
          ))}
        </div>
      )}

      {/* Add Button */}
      {!isApproved ? (
        <button
          onClick={onAddItem}
          className="w-full h-[50px] px-5 border border-dashed border-sky-300 rounded-xl bg-sky-50 text-sky-500 text-[16px] font-[800] cursor-pointer flex items-center justify-center gap-2.5 transition-all mt-4 hover:bg-sky-100 hover:border-sky-400"
        >
          <Plus className="w-6 h-6" />
          <span>새로운 하자 내용 추가</span>
        </button>
      ) : (
        <div className="w-full h-[50px] px-5 border border-dashed border-border rounded-xl bg-muted text-muted-foreground text-[16px] font-[800] flex items-center justify-center gap-2.5 mt-4 opacity-60">
          <Lock className="w-6 h-6" />
          <span>승인완료 - 조회만 가능</span>
        </div>
      )}
    </div>
  );
}

// ─── Single Punch Item Card ───
interface PunchItemCardProps {
  item: PunchItem;
  isApproved: boolean;
  onUpdateField: (itemId: string, field: keyof PunchItem, value: string) => void;
  onDelete: (itemId: string) => void;
  onPhotoUpload: (itemId: string, photoType: 'beforePhoto' | 'afterPhoto') => void;
}

function PunchItemCard({ item, isApproved, onUpdateField, onDelete, onPhotoUpload }: PunchItemCardProps) {
  const priorities = [
    { key: '높음' as const, activeBg: 'bg-red-100', activeText: 'text-red-600', inactiveBg: 'bg-slate-50', inactiveText: 'text-slate-400' },
    { key: '중간' as const, activeBg: 'bg-amber-100', activeText: 'text-amber-600', inactiveBg: 'bg-slate-50', inactiveText: 'text-slate-400' },
    { key: '낮음' as const, activeBg: 'bg-emerald-100', activeText: 'text-emerald-600', inactiveBg: 'bg-slate-50', inactiveText: 'text-slate-400' },
  ];

  const statuses = [
    { key: 'open' as const, label: '미조치', activeText: 'text-red-500' },
    { key: 'ing' as const, label: '진행중', activeText: 'text-blue-500' },
    { key: 'done' as const, label: '완료', activeText: 'text-slate-800' },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 relative shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all">
      {/* Delete button */}
      {!isApproved && (
        <button
          onClick={() => onDelete(item.id)}
          className="absolute top-4 right-4 bg-transparent border-none text-slate-300 cursor-pointer p-1 transition-colors hover:text-destructive"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      {/* Location */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
        <MapPinIcon className="w-[18px] h-[18px] text-primary shrink-0" />
        <input
          type="text"
          value={item.location || ''}
          placeholder="위치 (예: 101동 302호)"
          onChange={e => onUpdateField(item.id, 'location', e.target.value)}
          readOnly={isApproved}
          className={cn(
            "text-[16px] font-[800] text-foreground bg-transparent p-0 border-none outline-none flex-1 min-w-0",
            isApproved && "pointer-events-none opacity-70"
          )}
        />
      </div>

      {/* Issue */}
      <textarea
        value={item.issue || ''}
        placeholder="지적 내용을 상세히 입력하세요..."
        onChange={e => onUpdateField(item.id, 'issue', e.target.value)}
        readOnly={isApproved}
        className={cn(
          "w-full text-[17px] font-bold text-foreground bg-transparent border-none outline-none resize-none leading-relaxed min-h-[48px] p-0 mb-3",
          isApproved && "pointer-events-none opacity-70"
        )}
      />

      {/* Priority & Status */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        {/* Priority buttons */}
        <div className="flex gap-1 flex-wrap w-[calc(50%-4px)] min-w-[120px]">
          {priorities.map(p => (
            <button
              key={p.key}
              onClick={() => !isApproved && onUpdateField(item.id, 'priority', p.key)}
              className={cn(
                "py-1.5 px-3 rounded-md text-[12px] font-bold border-none cursor-pointer transition-all min-h-[32px] flex-1",
                item.priority === p.key ? `${p.activeBg} ${p.activeText}` : `${p.inactiveBg} ${p.inactiveText}`,
                isApproved && "pointer-events-none opacity-60"
              )}
            >{p.key}</button>
          ))}
        </div>

        {/* Status toggle */}
        <div className="flex bg-slate-100 rounded-full p-0.5 shrink-0 w-[calc(50%-4px)] min-w-[120px] justify-center">
          {statuses.map(s => (
            <button
              key={s.key}
              onClick={() => !isApproved && onUpdateField(item.id, 'status', s.key)}
              className={cn(
                "py-1 px-2.5 rounded-full text-[11px] font-bold border-none cursor-pointer transition-all min-h-[28px] flex-1",
                item.status === s.key ? `bg-white ${s.activeText} shadow-sm` : "bg-transparent text-slate-400",
                isApproved && "pointer-events-none opacity-60"
              )}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* Photo Upload */}
      <div className="flex gap-3 mt-3 w-full">
        {(['beforePhoto', 'afterPhoto'] as const).map(photoType => (
          <div
            key={photoType}
            onClick={() => onPhotoUpload(item.id, photoType)}
            className={cn(
              "flex-1 aspect-square bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative hover:bg-slate-100 hover:border-slate-400",
              isApproved && "pointer-events-none opacity-60"
            )}
          >
            {item[photoType] ? (
              <>
                <img src={item[photoType]} className="w-full h-full object-cover absolute inset-0" alt="" />
                <div className={cn(
                  "absolute top-2 left-2 text-white text-[11px] font-[800] px-2.5 py-1 rounded-md",
                  photoType === 'beforePhoto' ? "bg-slate-800" : "bg-sky-500"
                )}>
                  {photoType === 'beforePhoto' ? '보수전' : '보수후'}
                </div>
              </>
            ) : (
              <>
                <Camera className="w-7 h-7 text-slate-300 mb-1" />
                <span className="text-[11px] font-[900] text-slate-400">
                  {photoType === 'beforePhoto' ? '보수전' : '보수후'}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
