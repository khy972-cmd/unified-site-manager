import { useState, useMemo } from "react";
import { Search, MapPin, Calendar, ChevronDown, X, Edit2, Trash2, Check, RotateCcw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWorklogs, useUpdateWorklogStatus, useDeleteWorklog } from "@/hooks/useSupabaseWorklogs";
import { useUserRole } from "@/hooks/useUserRole";
import PartnerWorklogPage from "@/components/partner/PartnerWorklogPage";
import type { WorklogEntry, WorklogStatus } from "@/lib/worklogStore";
import DocumentViewer, { WorklogDocument } from "@/components/viewer/DocumentViewer";

const STATUS_CONFIG: Record<WorklogStatus, { label: string; className: string; next?: WorklogStatus }> = {
  draft: { label: "작성중", className: "bg-blue-50 text-blue-500 border-blue-200", next: "pending" },
  pending: { label: "요청", className: "bg-indigo-50 text-indigo-500 border-indigo-200", next: "approved" },
  approved: { label: "승인", className: "bg-muted text-muted-foreground border-border" },
  rejected: { label: "반려", className: "bg-red-50 text-red-600 border-red-200", next: "draft" },
};

type FilterStatus = "all" | WorklogStatus;

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "draft", label: "작성중" },
  { key: "pending", label: "요청" },
  { key: "approved", label: "승인" },
  { key: "rejected", label: "반려" },
];

export default function WorklogPage() {
  const { isPartner } = useUserRole();
  if (isPartner) return <PartnerWorklogPage />;
  return <WorkerWorklogPage />;
}

function WorkerWorklogPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewerLog, setViewerLog] = useState<WorklogEntry | null>(null);

  const { data: logs = [], isLoading } = useWorklogs();
  const updateStatus = useUpdateWorklogStatus();
  const deleteWl = useDeleteWorklog();

  const filtered = useMemo(() =>
    logs
      .filter(l => filter === "all" || l.status === filter)
      .filter(l =>
        l.siteName.toLowerCase().includes(search.toLowerCase()) ||
        l.workDate.includes(search) ||
        l.workSets?.some(ws => {
          const m = ws.member === "기타" ? ws.customMemberValue : ws.member;
          const p = ws.process === "기타" ? ws.customProcessValue : ws.process;
          return (m && m.includes(search)) || (p && p.includes(search));
        })
      )
      .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt.localeCompare(a.createdAt)),
    [logs, filter, search]
  );

  const statusCounts = useMemo(() => ({
    all: logs.length,
    draft: logs.filter(l => l.status === "draft").length,
    pending: logs.filter(l => l.status === "pending").length,
    approved: logs.filter(l => l.status === "approved").length,
    rejected: logs.filter(l => l.status === "rejected").length,
  }), [logs]);

  const handleStatusChange = (id: string, newStatus: WorklogStatus) => {
    updateStatus.mutate({ id, status: newStatus }, {
      onSuccess: () => toast.success(`상태가 "${STATUS_CONFIG[newStatus].label}"(으)로 변경되었습니다`),
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("이 작업일지를 삭제하시겠습니까?")) return;
    deleteWl.mutate(id, {
      onSuccess: () => {
        setExpandedId(null);
        toast.success("작업일지가 삭제되었습니다");
      },
    });
  };

  const getTotalHours = (entry: WorklogEntry) =>
    entry.manpower?.reduce((s, m) => s + (m.workHours || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Search */}
      <div className="relative mb-3 mt-1">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="현장 또는 작업 내용 검색"
          className="w-full h-[50px] bg-card border border-border rounded-xl px-4 pr-12 text-base-app font-medium text-foreground placeholder:text-muted-foreground transition-all hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none"
        />
        {search ? (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        ) : (
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "h-10 px-3.5 rounded-full text-sm-app font-medium whitespace-nowrap flex-shrink-0 border transition-all cursor-pointer flex items-center gap-1.5",
              filter === f.key
                ? "bg-header-navy text-header-navy-foreground border-transparent shadow-none"
                : "bg-card text-muted-foreground border-border hover:bg-muted/40 hover:border-border"
            )}
          >
            {f.label}
            {statusCounts[f.key] > 0 && (
              <span className={cn(
                "min-w-[18px] h-[18px] rounded-full text-[10px] font-[900] flex items-center justify-center",
                filter === f.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {statusCounts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-5">
            <Calendar className="w-8 h-8 text-muted-foreground opacity-60" />
          </div>
          <p className="text-base-app font-medium text-muted-foreground mb-2">
            {logs.length === 0 ? "저장된 작업일지가 없습니다" : "검색 결과가 없습니다"}
          </p>
          {logs.length === 0 && (
            <p className="text-sm-app text-muted-foreground">홈 화면에서 일지를 작성하면 여기에 표시됩니다</p>
          )}
        </div>
      )}

      {/* Worklog Cards */}
      <div className="space-y-3">
        {filtered.map(log => {
          const status = STATUS_CONFIG[log.status];
          const expanded = expandedId === log.id;
          const totalHours = getTotalHours(log);
          const workerCount = log.manpower?.length || 0;
          const firstWorkSet = log.workSets?.[0];
          const memberLabel = firstWorkSet ? (firstWorkSet.member === "기타" ? firstWorkSet.customMemberValue : firstWorkSet.member) : "";
          const processLabel = firstWorkSet ? (firstWorkSet.process === "기타" ? firstWorkSet.customProcessValue : firstWorkSet.process) : "";
          const contentSummary = [memberLabel, processLabel].filter(Boolean).join(" · ") || "작업내용 없음";

          return (
            <div key={log.id} className="bg-card rounded-2xl shadow-soft overflow-hidden transition-all">
              <div
                className="p-5 cursor-pointer active:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expanded ? null : log.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm-app text-text-sub font-medium">{log.workDate}</span>
                    {log.version > 1 && (
                      <>
                        <span className="text-sm-app text-text-sub">·</span>
                        <span className="text-tiny text-muted-foreground font-medium">v{log.version}</span>
                      </>
                    )}
                  </div>
                  <span className={cn("text-tiny font-bold px-2.5 py-1 rounded-full border", status.className)}>
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm-app text-primary font-bold truncate">{log.siteName}</span>
                </div>
                <p className="text-base-app font-bold text-foreground mb-2 truncate">{contentSummary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm-app text-text-sub font-medium">투입 {workerCount}명</span>
                    <span className="text-sm-app text-text-sub">·</span>
                    <span className="text-sm-app text-text-sub font-medium">{totalHours.toFixed(1)}공수</span>
                    {log.photoCount > 0 && (
                      <>
                        <span className="text-sm-app text-text-sub">·</span>
                        <span className="text-sm-app text-text-sub font-medium">📷 {log.photoCount}</span>
                      </>
                    )}
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </div>
              </div>

              {expanded && (
                <div className="px-5 pb-5 border-t border-border animate-slide-down">
                  <div className="py-3 border-b border-dashed border-border">
                    <div className="text-sm-app font-bold text-text-sub mb-2">투입 인원</div>
                    <div className="flex flex-wrap gap-2">
                      {log.manpower?.map((m, i) => (
                        <span key={i} className="text-sm-app bg-muted px-3 py-1.5 rounded-lg font-medium">
                          {m.worker} <span className="text-primary font-bold">{m.workHours.toFixed(1)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="py-3 border-b border-dashed border-border">
                    <div className="text-sm-app font-bold text-text-sub mb-2">작업 내용</div>
                    {log.workSets?.map((ws, i) => {
                      const m = ws.member === "기타" ? ws.customMemberValue : ws.member;
                      const p = ws.process === "기타" ? ws.customProcessValue : ws.process;
                      const t = ws.type === "기타" ? ws.customTypeValue : ws.type;
                      const loc = [ws.location?.block, ws.location?.dong, ws.location?.floor].filter(Boolean).join("/");
                      return (
                        <div key={i} className="text-sm-app mb-1.5">
                          <span className="font-bold text-foreground">{m}</span>
                          {p && <span className="text-text-sub"> · {p}</span>}
                          {t && <span className="text-text-sub"> · {t}</span>}
                          {loc && <span className="text-muted-foreground ml-1">({loc})</span>}
                        </div>
                      );
                    })}
                  </div>
                  {log.materials && log.materials.length > 0 && (
                    <div className="py-3 border-b border-dashed border-border">
                      <div className="text-sm-app font-bold text-text-sub mb-2">자재 사용</div>
                      {log.materials.map((m, i) => (
                        <div key={i} className="text-sm-app flex justify-between">
                          <span>{m.name}</span>
                          <span className="text-primary font-bold">{m.qty}말</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="py-3 border-b border-dashed border-border text-tiny text-muted-foreground">
                    <div>작성: {new Date(log.createdAt).toLocaleString("ko-KR")}</div>
                    {log.updatedAt && <div>수정: {new Date(log.updatedAt).toLocaleString("ko-KR")}</div>}
                  </div>
                  <div className="flex gap-2 pt-3">
                    {log.status === "draft" && (
                      <button
                        onClick={() => handleStatusChange(log.id, "pending")}
                        className="flex-1 h-11 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl font-bold text-sm-app flex items-center justify-center gap-1.5"
                      >
                        <ChevronRight className="w-4 h-4" /> 승인요청
                      </button>
                    )}
                    {log.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(log.id, "approved")}
                          className="flex-1 h-11 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-sm-app flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> 승인
                        </button>
                        <button
                          onClick={() => handleStatusChange(log.id, "rejected")}
                          className="flex-1 h-11 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-sm-app flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-4 h-4" /> 반려
                        </button>
                      </>
                    )}
                    {log.status === "rejected" && (
                      <button
                        onClick={() => handleStatusChange(log.id, "draft")}
                        className="flex-1 h-11 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold text-sm-app flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-4 h-4" /> 재작성
                      </button>
                    )}
                    <button
                      onClick={() => setViewerLog(log)}
                      className="h-11 px-4 bg-primary-bg text-primary border border-primary/30 rounded-xl font-bold text-sm-app flex items-center justify-center gap-1.5"
                    >
                      일지양식
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="h-11 px-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl font-bold text-sm-app flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DocumentViewer
        open={!!viewerLog}
        onClose={() => setViewerLog(null)}
        title={viewerLog ? `${viewerLog.siteName} · 작업일지` : ""}
      >
        {viewerLog && <WorklogDocument entry={viewerLog} />}
      </DocumentViewer>
    </div>
  );
}
