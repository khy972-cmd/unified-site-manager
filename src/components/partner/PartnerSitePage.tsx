import { useState, useMemo } from "react";
import { Search, X, ChevronDown, ChevronUp, Phone, MapPin, Camera, Map as MapIcon, FileCheck2, ClipboardList, CheckCircle2, Pin, PinOff, Sun, Cloud, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SiteStatus = "all" | "ing" | "wait" | "done";

const MOCK_SITES = [
  { id: 1, name: "자이 아파트 101동 신축공사", status: "ing" as const, affil: "대구지사", addr: "대구광역시 동구 동부로 149", manager: "이현수 소장", safety: "김안전 과장", phoneM: "010-1234-5678", phoneS: "010-9876-5432", days: 245, mp: 3, pinned: true, lastDate: "2025-12-09", hasDraw: true, hasPhoto: true, hasLog: true, hasPunch: true },
  { id: 2, name: "삼성 반도체 P3 배관설치", status: "done" as const, affil: "평택지사", addr: "경기도 평택시 고덕면 1", manager: "최관리 프로", safety: "박감시 대리", phoneM: "010-1111-2222", phoneS: "010-3333-4444", days: 120, mp: 1, pinned: false, lastDate: "2025-12-05", hasDraw: true, hasPhoto: false, hasLog: true, hasPunch: false },
  { id: 3, name: "현대 오피스텔 리모델링", status: "wait" as const, affil: "본사", addr: "", manager: "박현장 차장", safety: "최안전 대리", phoneM: "010-5555-6666", phoneS: "010-7777-8888", days: 15, mp: 0, pinned: false, lastDate: "2025-12-03", hasDraw: false, hasPhoto: false, hasLog: false, hasPunch: false },
];

const STATUS_CONFIG = {
  ing: { label: "진행중", cls: "bg-blue-500" },
  wait: { label: "예정", cls: "bg-indigo-500" },
  done: { label: "완료", cls: "bg-muted-foreground" },
};

const FILTERS: { key: SiteStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "ing", label: "진행중" },
  { key: "wait", label: "예정" },
  { key: "done", label: "완료" },
];

export default function PartnerSitePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SiteStatus>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    return MOCK_SITES.filter(s => {
      if (filter !== "all" && s.status !== filter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.id - a.id;
    });
  }, [search, filter]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2 mb-3 mt-1">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="현장 선택 또는 검색"
            className="w-full h-[50px] bg-card border border-border rounded-xl px-4 pr-10 text-base-app font-medium text-foreground placeholder:text-muted-foreground outline-none transition-all hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)]"
          />
          {search ? (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>
          ) : (
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "h-10 rounded-full text-[14px] font-medium border cursor-pointer transition-all",
              filter === f.key
                ? f.key === "all" ? "bg-primary text-white border-primary font-bold" :
                  f.key === "ing" ? "bg-blue-500 text-white border-blue-500 font-bold" :
                  f.key === "wait" ? "bg-indigo-500 text-white border-indigo-500 font-bold" :
                  "bg-muted-foreground text-white border-muted-foreground font-bold"
                : "bg-card text-muted-foreground border-border"
            )}
          >{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">검색 결과가 없습니다</div>
      ) : (
        <div className="space-y-5">
          {filtered.map(site => {
            const expanded = expandedIds.has(site.id);
            const st = STATUS_CONFIG[site.status];
            return (
              <div key={site.id} className={cn("bg-card rounded-2xl shadow-soft overflow-hidden", site.pinned && "border-2 border-primary")}>
                <span className={cn("text-[11px] font-bold px-3 py-1 text-white rounded-bl-xl", st.cls)} style={{ float: "right" }}>{st.label}</span>
                <div className="p-5 border-b border-border">
                  <div className="text-[15px] text-text-sub font-medium mb-1">{site.lastDate}</div>
                  <div className="text-[20px] font-[800] text-header-navy mb-3 w-[85%]">{site.name}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 items-center">
                      <span className="text-[14px] font-semibold px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30">{site.affil}</span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <MapIcon className={cn("w-4 h-4", site.hasDraw ? "text-header-navy" : "text-border")} />
                      <Camera className={cn("w-4 h-4", site.hasPhoto ? "text-header-navy" : "text-border")} />
                      <ClipboardList className={cn("w-4 h-4", site.hasLog ? "text-header-navy" : "text-border")} />
                      <CheckCircle2 className={cn("w-4 h-4", site.hasPunch ? "text-header-navy" : "text-border")} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleExpand(site.id)}
                  className="w-full h-12 flex items-center justify-center gap-1.5 text-text-sub text-[14px] font-semibold bg-transparent border-none cursor-pointer"
                >
                  {expanded ? "접기" : "상세보기"}
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expanded && (
                  <div className="p-[22px] border-t border-border animate-slide-down">
                    <div className="flex mb-5 border-b border-dashed border-border pb-3.5">
                      <div className="flex-1 text-center relative">
                        <span className="block text-[17px] text-text-sub font-bold mb-2">누적 일수</span>
                        <span className="text-[20px] font-[800] text-header-navy">{site.days}일</span>
                        <div className="absolute right-0 top-[10%] h-[80%] w-px bg-border" />
                      </div>
                      <div className="flex-1 text-center">
                        <span className="block text-[17px] text-text-sub font-bold mb-2">금일 투입</span>
                        <span className="text-[20px] font-[800] text-header-navy">{site.mp}명</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3.5 border-b border-dashed border-border">
                      <span className="font-bold text-text-sub w-20 text-[17px]">현장소장</span>
                      <span className="flex-1 font-semibold text-foreground text-right pr-3 truncate text-[17px]">{site.manager}</span>
                      <button onClick={() => window.location.href = `tel:${site.phoneM}`} className="w-9 h-9 rounded-[10px] bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center cursor-pointer">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center py-3.5 border-b border-dashed border-border">
                      <span className="font-bold text-text-sub w-20 text-[17px]">안전담당</span>
                      <span className="flex-1 font-semibold text-foreground text-right pr-3 truncate text-[17px]">{site.safety}</span>
                      <button onClick={() => window.location.href = `tel:${site.phoneS}`} className="w-9 h-9 rounded-[10px] bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center cursor-pointer">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                    {site.addr && (
                      <div className="flex justify-between items-center py-3.5">
                        <span className="font-bold text-text-sub w-20 text-[17px]">주소</span>
                        <span className="flex-1 font-semibold text-foreground text-right pr-3 truncate text-[17px]">{site.addr}</span>
                        <button className="w-9 h-9 rounded-[10px] bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center cursor-pointer">
                          <MapPin className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-5 gap-1.5 mt-4">
                      {[
                        { label: "도면", icon: MapIcon, cls: "bg-primary/10 border-primary/30 text-primary" },
                        { label: "사진", icon: Camera, cls: "bg-indigo-50 border-indigo-200 text-indigo-500" },
                        { label: "문서", icon: ClipboardList, cls: "bg-blue-50 border-blue-200 text-blue-600" },
                        { label: "일지", icon: ClipboardList, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                        { label: "조치", icon: CheckCircle2, cls: "bg-red-50 border-red-200 text-red-700" },
                      ].map(a => (
                        <button key={a.label} className={cn("flex flex-col items-center justify-center gap-1.5 h-[74px] rounded-xl border cursor-pointer transition-all active:scale-[0.98]", a.cls)}>
                          <a.icon className="w-6 h-6" />
                          <span className="text-[14px] font-bold">{a.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
