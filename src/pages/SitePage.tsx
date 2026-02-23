import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, MapPin, ChevronDown, ChevronUp, Pin, PinOff, Phone, Ruler,
  Camera, FileCheck2, ClipboardList, CheckCircle2, X, Plus, Map as MapIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWorklogs } from "@/hooks/useSupabaseWorklogs";
import { usePunchGroups } from "@/hooks/useSupabasePunch";
import { useUserRole } from "@/hooks/useUserRole";
import PartnerSitePage from "@/components/partner/PartnerSitePage";
import { getPhotosForSite, getDrawingsForSite } from "@/lib/worklogStore";
import type { WorklogEntry } from "@/lib/worklogStore";
import type { PunchGroup } from "@/lib/punchStore";
import DocumentViewer, { WorklogDocument, PhotoGrid, A4Page } from "@/components/viewer/DocumentViewer";

type SiteStatus = "all" | "ing" | "wait" | "done";
type SortType = "latest" | "name";

interface SiteData {
  id: number;
  name: string;
  addr: string;
  lodge: string;
  status: "ing" | "wait" | "done";
  affil: string;
  manager: string;
  safety: string;
  phoneM: string;
  phoneS: string;
  days: number;
  mp: number;
  pinned: boolean;
  lastDate: string;
  lastTime: string;
  hasDraw: boolean;
  hasPhoto: boolean;
  hasPTW: boolean;
  hasLog: boolean;
  hasPunch: boolean;
  ptw?: { title: string; status: string; pages: number };
  workLog?: { title: string; status: string; pages: number };
  punch?: { title: string; status: string; pages: number };
  images: string[];
  drawings: { construction: any[]; progress: any[]; completion: any[] };
}


const INITIAL_SITES: SiteData[] = [
  { id: 1, name: "자이 아파트 101동 신축공사", addr: "대구광역시 동구 동부로 149", lodge: "대구광역시 동구 신암동 123-45", status: "ing", affil: "대구지사", manager: "이현수 소장", safety: "김안전 과장", phoneM: "010-1234-5678", phoneS: "010-9876-5432", days: 245, mp: 3, pinned: true, lastDate: "2025-12-09", lastTime: "10:30", hasDraw: true, hasPhoto: true, hasPTW: true, hasLog: true, hasPunch: true, ptw: { title: "작업허가서", status: "승인완료", pages: 2 }, workLog: { title: "작업일지", status: "작성완료", pages: 3 }, punch: { title: "하자목록", status: "조치중", pages: 1 }, images: ["sample1.jpg", "sample2.jpg"], drawings: { construction: [{ name: "1층 평면도.pdf" }, { name: "2층 평면도.pdf" }], progress: [{ name: "현장사진_01.jpg", type: "img" }], completion: [{ name: "완료도면.pdf" }] } },
  { id: 2, name: "삼성 반도체 P3 배관설치", addr: "경기도 평택시 고덕면 1", lodge: "경기도 평택시 고덕면 고덕로 123", status: "done", affil: "평택지사", manager: "최관리 프로", safety: "박감시 대리", phoneM: "010-1111-2222", phoneS: "010-3333-4444", days: 120, mp: 1, pinned: false, lastDate: "2025-12-05", lastTime: "18:20", hasDraw: true, hasPhoto: true, hasPTW: true, hasLog: true, hasPunch: true, ptw: { title: "작업허가서", status: "승인완료", pages: 2 }, workLog: { title: "작업일지", status: "작성완료", pages: 3 }, punch: { title: "하자목록", status: "조치중", pages: 1 }, images: ["sample1.jpg"], drawings: { construction: [{ name: "1층 배관도.pdf" }], progress: [], completion: [{ name: "완료도면.pdf" }] } },
  { id: 3, name: "현대 오피스텔 리모델링", addr: "", lodge: "", status: "wait", affil: "본사", manager: "박현장 차장", safety: "최안전 대리", phoneM: "010-5555-6666", phoneS: "010-7777-8888", days: 15, mp: 0, pinned: false, lastDate: "2025-12-03", lastTime: "14:00", hasDraw: false, hasPhoto: false, hasPTW: false, hasLog: false, hasPunch: false, images: [], drawings: { construction: [], progress: [], completion: [] } },
  { id: 4, name: "테스트 현장 4구역", addr: "", lodge: "", status: "ing", affil: "직접등록", manager: "", safety: "", phoneM: "", phoneS: "", days: 10, mp: 0, pinned: false, lastDate: "2025-12-01", lastTime: "09:00", hasDraw: false, hasPhoto: false, hasPTW: false, hasLog: false, hasPunch: false, images: [], drawings: { construction: [], progress: [], completion: [] } },
  { id: 5, name: "테스트 현장 5구역", addr: "", lodge: "", status: "ing", affil: "직접등록", manager: "", safety: "", phoneM: "", phoneS: "", days: 11, mp: 0, pinned: false, lastDate: "2025-12-01", lastTime: "09:00", hasDraw: false, hasPhoto: false, hasPTW: false, hasLog: false, hasPunch: false, images: [], drawings: { construction: [], progress: [], completion: [] } },
];

const STATUS_CONFIG = {
  ing: { label: "진행중", className: "bg-blue-500 text-white" },
  wait: { label: "예정", className: "bg-indigo-500 text-white" },
  done: { label: "완료", className: "bg-muted-foreground text-white" },
};

const FILTERS: { key: SiteStatus; label: string; chipClass: string }[] = [
  { key: "all", label: "전체", chipClass: "status-all" },
  { key: "ing", label: "진행중", chipClass: "status-ing" },
  { key: "wait", label: "예정", chipClass: "status-wait" },
  { key: "done", label: "완료", chipClass: "status-done" },
];

export default function SitePage() {
  const { isPartner } = useUserRole();
  if (isPartner) return <PartnerSitePage />;
  return <WorkerSitePage />;
}

function WorkerSitePage() {
  const [sites, setSites] = useState<SiteData[]>(INITIAL_SITES);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SiteStatus>("all");
  const [sort, setSort] = useState<SortType>("latest");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(5);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerContent, setViewerContent] = useState<React.ReactNode>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSiteId, setSheetSiteId] = useState<number | null>(null);

  // Search dropdown
  const [showDropdown, setShowDropdown] = useState(false);

  // Live worklog & punch data from Supabase
  const { data: worklogs = [] } = useWorklogs();
  const { data: allPunchGroups = [] } = usePunchGroups();

  // Enrich sites with live worklog data
  const enrichedSites = useMemo(() => {
    return sites.map(site => {
      const siteName = site.name || "";
      const siteKey = siteName.split(" ")[0] || siteName;
      const siteLogs = worklogs.filter(w => {
        const logSiteName = (w.siteName || "").trim();
        if (!logSiteName) return false;
        return logSiteName === siteName || logSiteName.includes(siteKey) || siteName.includes(logSiteName);
      });
      const approvedLogs = siteLogs.filter(w => w.status === "approved");
      const sitePunch = allPunchGroups.filter(g => {
        const groupTitle = (g.title || "").trim();
        if (!groupTitle) return false;
        return groupTitle === siteName || groupTitle.includes(siteKey) || siteName.includes(groupTitle);
      });
      const punchItems = sitePunch.flatMap(g => g.punchItems || []);
      const openPunch = punchItems.filter(i => i.status !== 'done').length;
      return {
        ...site,
        hasLog: site.hasLog || siteLogs.length > 0,
        hasPhoto: site.hasPhoto || siteLogs.some(l => l.photoCount > 0),
        hasDraw: site.hasDraw || siteLogs.some(l => l.drawingCount > 0),
        hasPunch: site.hasPunch || sitePunch.length > 0,
        mp: openPunch || site.mp,
        liveLogs: siteLogs,
        approvedLogs,
        sitePunchGroups: sitePunch,
      };
    });
  }, [sites, worklogs, allPunchGroups]);

  const filtered = enrichedSites
    .filter(s => filter === "all" || s.status === filter)
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.addr.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sort === "name") return a.name.localeCompare(b.name, "ko");
      return b.id - a.id;
    });

  const displayed = filtered.slice(0, visibleCount);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePin = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSites(prev => prev.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s));
    toast.success(sites.find(s => s.id === id)?.pinned ? "고정이 해제되었습니다" : "상단에 고정되었습니다");
  };

  const handlePhone = (num: string) => {
    if (!num || num.length < 5) { toast.error("전화번호가 없습니다"); return; }
    window.location.href = `tel:${num.replace(/[^0-9+]/g, "")}`;
  };

  const handleLoadMore = () => {
    if (visibleCount >= filtered.length) {
      setVisibleCount(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setVisibleCount(v => v + 5);
    }
  };

  // Viewer handlers
  const openDrawSheet = (siteId: number) => {
    setSheetSiteId(siteId);
    setSheetOpen(true);
  };

  const openA3Preview = (title: string) => {
    setViewerTitle(title);
    setViewerContent(
      <img
        src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='850' height='600'%3E%3Crect width='850' height='600' fill='%23fff'/%3E%3Crect x='12' y='12' width='826' height='576' fill='none' stroke='%231a254f' stroke-width='6'/%3E%3Ctext x='425' y='300' font-family='sans-serif' font-size='34' text-anchor='middle'%3EA3 Sample Drawing%3C/text%3E%3C/svg%3E"
        style={{ width: 850, height: "auto", display: "block" }}
        alt="도면 미리보기"
      />
    );
    setViewerOpen(true);
    setSheetOpen(false);
  };

  const openPhotoViewer = (site: typeof enrichedSites[0]) => {
    const samplePhotos = site.images.map(img => ({
      url: `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='.3em'%3ESample%3C/text%3E%3C/svg%3E`,
      date: site.lastDate,
    }));
    if (samplePhotos.length === 0) { toast.error("등록된 사진이 없습니다"); return; }
    setViewerTitle(`${site.name} · 사진대지`);
    setViewerContent(<PhotoGrid photos={samplePhotos} siteName={site.name} />);
    setViewerOpen(true);
  };

  const openDocViewer = (site: typeof enrichedSites[0], docType: "ptw" | "workLog" | "punch") => {
    const doc = site[docType];
    if (!doc) { toast.error("등록된 문서가 없습니다"); return; }
    const typeLabels = { ptw: "PTW 작업허가서", workLog: "작업일지", punch: "조치보고서" };

    // If it's workLog and we have live approved logs, show them
    if (docType === "workLog" && site.approvedLogs.length > 0) {
      const log = site.approvedLogs[0];
      setViewerTitle(`${site.name} · 작업일지`);
      setViewerContent(<WorklogDocument entry={log} />);
      setViewerOpen(true);
      return;
    }

    // For punch type, show live punch data from shared store
    if (docType === "punch" && site.sitePunchGroups && site.sitePunchGroups.length > 0) {
      const punchItems = site.sitePunchGroups.flatMap((g: PunchGroup) => g.punchItems || []);
      const openCount = punchItems.filter((i: any) => i.status !== 'done').length;
      const doneCount = punchItems.filter((i: any) => i.status === 'done').length;
      setViewerTitle(`${site.name} · 조치보고서`);
      setViewerContent(
        <A4Page pageNum={1} totalPages={1}>
          <div className="text-center border-b-2 border-[#1a254f] pb-3 mb-4">
            <div className="text-[24px] font-[800] text-[#1a254f]">조치 사항 점검 보고서</div>
            <div className="text-[14px] text-[#666] mt-1">{site.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-sky-50 border border-sky-400 p-3 rounded-lg text-center">
              <div className="text-[20px] font-[900] text-sky-600">{punchItems.length}</div>
              <div className="text-[11px] font-bold text-sky-700">전체</div>
            </div>
            <div className="bg-red-50 border border-red-400 p-3 rounded-lg text-center">
              <div className="text-[20px] font-[900] text-red-600">{openCount}</div>
              <div className="text-[11px] font-bold text-red-700">미조치</div>
            </div>
            <div className="bg-slate-50 border border-slate-400 p-3 rounded-lg text-center">
              <div className="text-[20px] font-[900] text-slate-600">{doneCount}</div>
              <div className="text-[11px] font-bold text-slate-500">완료</div>
            </div>
          </div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 w-10">NO</th>
                <th className="border border-slate-300 p-2 w-20">위치</th>
                <th className="border border-slate-300 p-2">지적 내용</th>
                <th className="border border-slate-300 p-2 w-16">우선순위</th>
                <th className="border border-slate-300 p-2 w-16">상태</th>
              </tr>
            </thead>
            <tbody>
              {punchItems.map((item: any, idx: number) => (
                <tr key={item.id}>
                  <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center">{item.location || '-'}</td>
                  <td className="border border-slate-300 p-2">{item.issue || '-'}</td>
                  <td className="border border-slate-300 p-2 text-center">{item.priority}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold">
                    {item.status === 'done' ? '완료' : item.status === 'ing' ? '진행중' : '미조치'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </A4Page>
      );
      setViewerOpen(true);
      return;
    }

    setViewerTitle(`${site.name} · ${typeLabels[docType]}`);
    setViewerContent(
      <A4Page pageNum={1} totalPages={doc.pages || 1}>
        <div className="text-center border-b-2 border-[#1a254f] pb-3 mb-4">
          <div className="text-[24px] font-[800] text-[#1a254f]">{typeLabels[docType]}</div>
          <div className="text-[14px] text-[#666] mt-1">{site.name}</div>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-2 text-[14px] mb-6">
          <div className="font-bold text-[#1a254f]">문서번호</div>
          <div className="border-b border-[#ddd] py-1">DOC-2025-0001</div>
          <div className="font-bold text-[#1a254f]">상태</div>
          <div className="border-b border-[#ddd] py-1">{doc.status}</div>
          <div className="font-bold text-[#1a254f]">현장명</div>
          <div className="border-b border-[#ddd] py-1">{site.name}</div>
        </div>
        <div className="flex-1 p-4 bg-[#f8fafc] rounded-lg flex items-center justify-center" style={{ minHeight: "100mm" }}>
          <span className="text-[#666]">문서 내용 영역</span>
        </div>
      </A4Page>
    );
    setViewerOpen(true);
  };

  const checkData = (site: typeof enrichedSites[0], type: string) => {
    if (type === "images") { openPhotoViewer(site); return; }
    if (type === "ptw" || type === "workLog" || type === "punch") {
      openDocViewer(site, type as "ptw" | "workLog" | "punch");
      return;
    }
    toast.error("데이터가 없습니다");
  };

  const uniqueSiteNames = sites.map(s => s.name);
  const filteredDropdown = uniqueSiteNames.filter(n => n.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      {/* Search + Sort */}
      <div className="flex gap-2 mb-3 mt-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="현장 선택 또는 검색"
            className="w-full h-[50px] bg-card border border-border rounded-xl px-4 pr-12 text-base-app font-medium text-foreground placeholder:text-muted-foreground outline-none transition-all hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)]"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setShowDropdown(false); }}
              className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground z-10"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground bg-transparent border-none cursor-pointer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          {showDropdown && search && (
            <ul className="absolute z-50 w-full mt-1.5 max-h-60 overflow-auto bg-card border border-border rounded-xl shadow-lg animate-[dropdownSlide_0.2s_ease-out]">
              {filteredDropdown.length === 0 ? (
                <li className="p-4 text-muted-foreground text-center text-sm-app">검색 결과가 없습니다</li>
              ) : filteredDropdown.map(name => (
                <li
                  key={name}
                  onClick={() => { setSearch(name); setShowDropdown(false); }}
                  className="px-4 py-3.5 cursor-pointer border-b border-border last:border-0 text-sm-app font-medium text-foreground hover:bg-muted transition-colors"
                >{name}</li>
              ))}
            </ul>
          )}
        </div>

        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortType)}
          className="w-[95px] h-[50px] rounded-xl px-3 text-sm-app font-semibold bg-card border border-border text-foreground appearance-none cursor-pointer outline-none transition-all hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: "36px",
          }}
        >
          <option value="latest">최신순</option>
          <option value="name">이름순</option>
        </select>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setVisibleCount(5); }}
            className={cn(
              "flex-1 h-10 rounded-full text-sm-app font-medium border transition-all cursor-pointer flex items-center justify-center",
              filter === f.key
                ? f.key === "all" ? "bg-primary text-white border-primary font-bold shadow-sm"
                : f.key === "ing" ? "bg-blue-500 text-white border-blue-500 font-bold shadow-sm"
                : f.key === "wait" ? "bg-indigo-500 text-white border-indigo-500 font-bold shadow-sm"
                : "bg-muted-foreground text-white border-muted-foreground font-bold shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {displayed.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-5">
            <Search className="w-8 h-8 text-muted-foreground opacity-60" />
          </div>
          <p className="text-base-app font-medium text-muted-foreground">검색 결과가 없습니다</p>
        </div>
      )}

      {/* Site Cards */}
      <div className="space-y-5">
        {displayed.map(site => {
          const expanded = expandedIds.has(site.id);
          const statusConf = STATUS_CONFIG[site.status];
          const hasAddr = !!site.addr?.trim();
          const hasDraw = site.hasDraw;
          const hasPhoto = site.hasPhoto;
          const hasPTW = !!site.ptw;
          const hasLog = site.hasLog;
          const hasPunch = !!site.punch;

          return (
            <div
              key={site.id}
              className={cn(
                "bg-card rounded-2xl shadow-soft overflow-hidden transition-all",
                site.pinned && "border-2 border-primary shadow-[0_4px_12px_rgba(49,163,250,0.2)]"
              )}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-border relative">
                <span className={cn("absolute top-0 right-0 text-[13px] font-bold px-3.5 py-1.5 rounded-bl-xl z-10", statusConf.className)}>
                  {statusConf.label}
                </span>

                {site.lastDate && (
                  <div className="text-sm-app text-text-sub font-medium mb-1">
                    {site.lastDate} {site.lastTime ? `(최종 ${site.lastTime})` : ""}
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[20px] font-[800] text-header-navy flex-1 leading-tight" style={{ wordBreak: "keep-all" }}>{site.name}</h3>
                  <button onClick={e => togglePin(site.id, e)} className="bg-transparent border-none p-1 cursor-pointer ml-2">
                    {site.pinned ? <PinOff className="w-[22px] h-[22px] text-primary" /> : <Pin className="w-[22px] h-[22px] text-border" />}
                  </button>
                </div>

                {/* Sub info */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2 items-center flex-wrap min-w-0">
                    <span className="text-[14px] px-3 h-[34px] rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-500 font-semibold flex items-center">현대건설</span>
                    <span className={cn(
                      "text-[14px] px-3 h-[34px] rounded-lg border font-semibold flex items-center",
                      site.affil === "직접등록"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-sky-50 text-sky-600 border-sky-200"
                    )}>{site.affil}</span>
                  </div>
                  <div className="flex gap-1.5 items-center pl-2 border-l border-border ml-1">
                    <MapIcon className={cn("w-4 h-4 transition-colors", hasDraw ? "text-header-navy" : "text-border")} />
                    <Camera className={cn("w-4 h-4 transition-colors", hasPhoto ? "text-header-navy" : "text-border")} />
                    <FileCheck2 className={cn("w-4 h-4 transition-colors", hasPTW ? "text-header-navy" : "text-border")} />
                    <ClipboardList className={cn("w-4 h-4 transition-colors", hasLog ? "text-header-navy" : "text-border")} />
                    <CheckCircle2 className={cn("w-4 h-4 transition-colors", hasPunch ? "text-header-navy" : "text-border")} />
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center justify-between pt-1">
                  <div
                    className="flex items-center gap-1.5 flex-1 overflow-hidden cursor-pointer"
                    onClick={() => hasAddr ? window.open(`https://www.tmap.co.kr/`) : toast.error("현장 주소 데이터가 없습니다")}
                  >
                    <MapPin className="w-4 h-4 text-text-sub flex-shrink-0" />
                    <span className={cn("text-base-app font-bold truncate", hasAddr ? "text-text-sub" : "text-muted-foreground")}>
                      {hasAddr ? site.addr : "데이터 없음"}
                    </span>
                  </div>
                  <button
                    className={cn(
                      "w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ml-2 transition-all active:scale-95",
                      hasAddr
                        ? "bg-[hsl(219_100%_95%)] border border-[hsl(219_100%_90%)] text-[hsl(230_60%_30%)]"
                        : "border border-dashed border-muted-foreground/40 text-muted-foreground bg-transparent opacity-90"
                    )}
                    onClick={() => hasAddr ? window.open(`https://www.tmap.co.kr/`) : toast.error("유효한 주소가 없습니다")}
                  >
                    <MapPin className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>

              {/* Expanded Detail */}
              {expanded && (
                <div className="p-5 animate-slide-down bg-card">
                  {/* Manager + Safety */}
                  {[
                    { label: "현장소장", value: site.manager, phone: site.phoneM },
                    { label: "안전담당", value: site.safety, phone: site.phoneS },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-3.5 border-b border-dashed border-border">
                      <span className="text-base-app text-text-sub font-bold w-20">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-right text-base-app font-semibold text-foreground truncate pr-3">{row.value || "입력"}</span>
                        <button
                          className={cn(
                            "w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all active:scale-95",
                            row.phone ? "bg-[hsl(219_100%_95%)] border border-[hsl(219_100%_90%)] text-[hsl(230_60%_30%)]" : "border border-dashed border-border bg-transparent text-muted-foreground"
                          )}
                          onClick={() => handlePhone(row.phone)}
                        >
                          <Phone className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Lodge */}
                  <div className="flex justify-between items-center py-3.5 border-b border-dashed border-border">
                    <span className="text-base-app text-text-sub font-bold w-20">숙소</span>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="text-base-app font-semibold text-foreground truncate pr-3 text-right cursor-pointer" style={{ maxWidth: "60%" }}>
                        {site.lodge || <span className="text-primary underline">주소 찾기</span>}
                      </span>
                      <button
                        className={cn(
                          "w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all active:scale-95",
                          site.lodge ? "bg-[hsl(219_100%_95%)] border border-[hsl(219_100%_90%)] text-[hsl(230_60%_30%)]" : "border border-dashed border-primary text-primary bg-transparent"
                        )}
                        onClick={() => site.lodge ? window.open(`https://www.tmap.co.kr/`) : toast("주소 찾기 (준비 중)")}
                      >
                        <MapPin className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex py-3.5">
                    <div className="flex-1 text-center relative">
                      <span className="block text-base-app text-text-sub font-bold mb-2">작업일 누계</span>
                      <span className="text-lg-app font-[800] text-header-navy">{site.days}일</span>
                      <div className="absolute right-0 top-[10%] h-[80%] w-px bg-border" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="block text-base-app text-text-sub font-bold mb-2">하자(미조치)</span>
                      <span className={cn("text-lg-app font-[800]", site.mp > 0 ? "text-destructive" : "text-header-navy")}>{site.mp}건</span>
                    </div>
                  </div>

                  {/* Action Grid */}
                  <div className="grid grid-cols-5 gap-1.5 mt-0">
                    {[
                      { icon: Ruler, label: "도면", active: hasDraw, color: "bg-primary-bg text-primary border-sky-200", onClick: () => hasDraw ? openDrawSheet(site.id) : toast.error("등록된 도면이 없습니다") },
                      { icon: Camera, label: "사진", active: hasPhoto, color: "bg-indigo-50 text-indigo-500 border-indigo-200", onClick: () => checkData(site, "images") },
                      { icon: FileCheck2, label: "PTW", active: hasPTW, color: "bg-blue-50 text-blue-600 border-blue-200", onClick: () => checkData(site, "ptw") },
                      { icon: ClipboardList, label: "일지", active: hasLog, color: "bg-emerald-50 text-emerald-700 border-emerald-200", onClick: () => checkData(site, "workLog") },
                      { icon: CheckCircle2, label: "조치", active: hasPunch, color: "bg-red-50 text-red-600 border-red-200", onClick: () => checkData(site, "punch") },
                    ].map(({ icon: Icon, label, active, color, onClick }) => (
                      <button
                        key={label}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 h-[74px] rounded-xl border cursor-pointer transition-all active:scale-95",
                          active ? color : "bg-muted border-border text-border opacity-60 cursor-not-allowed"
                        )}
                        onClick={onClick}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-[14px] font-bold tracking-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggle */}
              <button
                onClick={() => toggleExpand(site.id)}
                className={cn(
                  "w-full h-12 flex items-center justify-center gap-1.5 text-text-sub text-[14px] font-semibold cursor-pointer bg-transparent border-none transition-colors",
                  expanded && "bg-background border-t border-border"
                )}
              >
                {!expanded && <span>상세 정보 보기</span>}
                {expanded ? <ChevronUp className="w-[18px] h-[18px]" /> : <ChevronDown className="w-[18px] h-[18px]" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {filtered.length > 5 && (
        <button
          onClick={handleLoadMore}
          className="w-full h-[50px] bg-card border border-border rounded-full text-text-sub font-semibold text-sm-app cursor-pointer mt-3 flex items-center justify-center gap-1.5 transition-all hover:bg-muted"
        >
          <span>{visibleCount >= filtered.length ? "접기" : "더 보기"}</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", visibleCount >= filtered.length && "rotate-180")} />
        </button>
      )}

      {/* Drawing Bottom Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-[2000]" onClick={() => setSheetOpen(false)}>
          <div
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl p-6 z-[2100] max-w-[600px] mx-auto animate-slide-down"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center font-bold text-lg mb-5 text-foreground">도면 선택</div>
            <button onClick={() => openA3Preview(`${sites.find(s => s.id === sheetSiteId)?.name} · 공사도면(조회)`)}
              className="w-full h-[54px] bg-primary/5 text-primary border border-primary/30 rounded-xl font-bold flex items-center justify-center gap-2 mb-2.5 cursor-pointer hover:bg-primary/10 transition-colors">
              <MapIcon className="w-[18px] h-[18px]" /> 공사 도면 (조회)
            </button>
            <button onClick={() => toast("진행 도면 관리 (준비 중)")}
              className="w-full h-[54px] bg-muted text-foreground border border-border rounded-xl font-bold flex items-center justify-center gap-2 mb-2.5 cursor-pointer hover:bg-background transition-colors">
              진행 도면 (관리)
            </button>
            <button onClick={() => openA3Preview(`${sites.find(s => s.id === sheetSiteId)?.name} · 완료도면(확인)`)}
              className="w-full h-[54px] bg-muted text-foreground border border-border rounded-xl font-bold flex items-center justify-center gap-2 mb-2.5 cursor-pointer hover:bg-background transition-colors">
              완료 도면 (확인)
            </button>
            <button onClick={() => setSheetOpen(false)}
              className="w-full h-[54px] bg-header-navy text-white rounded-xl font-bold mt-2 cursor-pointer hover:opacity-90 transition-opacity">
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Document Viewer */}
      <DocumentViewer open={viewerOpen} onClose={() => setViewerOpen(false)} title={viewerTitle}>
        {viewerContent}
      </DocumentViewer>
    </div>
  );
}
