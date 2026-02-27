import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Search, Plus, X, FileText, MapPin, Trash2, ArrowLeft, Check, Upload, FileUp, Calendar, User, Building, Wrench, Eye, Edit3, ChevronDown, ChevronUp, Download, Share2, Camera, RefreshCw, Lock, MapPinIcon, Info
} from "lucide-react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PreviewAppBar, PreviewControlBar } from "@/components/viewer/PreviewBars";
// PATCH START: shared site list + repo facade (no direct localStorage in UI)
import { useSiteList } from "@/hooks/useSiteList";
import { searchSites, type SiteListItem } from "@/lib/siteList";
import { addPhotosToWorklog } from "@/lib/inopnc_repo_v1";
// PATCH END
import {
  usePunchGroups, useAddPunchItem, useUpdatePunchItem,
  useDeletePunchItem, useSavePunchGroups,
} from "@/hooks/useSupabasePunch";
import type { PunchGroup, PunchItem, PunchFile } from "@/lib/punchStore";

// Blueprint Management Types
interface BlueprintHistoryItem {
  id: string;
  date: string;
  time: string;
  author: string;
  affiliation: string;
  contractor: string;
  component: string; // 부재명
  process: string; // 작업공정
  files: DocFile[];
  version: number;
}

type BlueprintSiteSource = "system" | "custom";

interface BlueprintSiteData {
  id: string; // storage key (prevents name collisions)
  siteName: string;
  siteSource: BlueprintSiteSource;
  affiliation: string;
  contractor: string;
  totalDrawings: number;
  currentVersion: number;
  lastUpdated: string;
  history: BlueprintHistoryItem[];
}

const IMG_CONCRETE = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=400&auto=format&fit=crop";
const IMG_CRACK = "https://images.unsplash.com/photo-1581094271901-8022df4466f9?q=80&w=400&auto=format&fit=crop";
const IMG_WALL = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=400&auto=format&fit=crop";

// Global Blueprint Storage (sample data for UI)
const blueprintStorage: Record<string, BlueprintSiteData> = {
  "sys:서울 신축현장": {
    id: "sys:서울 신축현장",
    siteName: "서울 신축현장",
    siteSource: "system",
    affiliation: "협력업체",
    contractor: "포스코건설",
    totalDrawings: 2,
    currentVersion: 1,
    lastUpdated: "2026-02-10",
    history: [
      {
        id: "bp_hist_1",
        date: "2026-02-10",
        time: "14:30",
        author: "관리자",
        affiliation: "협력업체",
        contractor: "포스코건설",
        component: "기둥",
        process: "마감",
        files: [
          { id: "bp_f1", name: "기둥_상세도.pdf", type: "file", url: "", size: "2.1MB", ext: "PDF", version: "v1" },
          { id: "bp_f2", name: "현장사진.jpg", type: "img", url: IMG_WALL, size: "1.2MB", ext: "JPG", version: "v1" },
        ],
        version: 1,
      },
    ],
  },
  "custom:리모델링 B현장": {
    id: "custom:리모델링 B현장",
    siteName: "리모델링 B현장",
    siteSource: "custom",
    affiliation: "직접입력",
    contractor: "GS건설",
    totalDrawings: 1,
    currentVersion: 1,
    lastUpdated: "2026-02-12",
    history: [
      {
        id: "bp_hist_2",
        date: "2026-02-12",
        time: "09:15",
        author: "현장소장",
        affiliation: "직접입력",
        contractor: "GS건설",
        component: "슬라브",
        process: "형틀",
        files: [
          { id: "bp_f3", name: "슬라브_배근도.pdf", type: "file", url: "", size: "3.4MB", ext: "PDF", version: "v1" },
        ],
        version: 1,
      },
    ],
  },
};

const DOC_TABS = ["내문서함", "회사서류", "도면함", "사진함", "조치"];

// Home(작업일지)와 동일한 부재명/작업공정 옵션 (도면 등록에도 동일 기준 적용)
const MEMBER_CHIPS = ["슬라브", "거더", "기둥", "기타"];
const PROCESS_CHIPS = ["철근", "형틀", "마감", "기타"];
type DocFile = {
  id: string;
  name: string;
  type: 'img' | 'file';
  url: string;
  size: string;
  ext: string;
  version?: string;
  drawingState?: string;
  url_before?: string;
  url_after?: string;
  currentView?: string;
};
type Doc = {
  id: string;
  title: string;
  author: string;
  date: string;
  time: string;
  files: DocFile[];
  version?: string;
  contractor?: string;
  affiliation?: string;
  status?: string;
};

const MOCK_DOCS: Record<string, Doc[]> = {
  "내문서함": [
    {
      id: "md1",
      title: "기초 안전점검 보고서",
      author: "박현우",
      date: "2026-02-15",
      time: "09:10",
      files: [
        { id: "md1f1", name: "현장사진_1.jpg", type: "img", url: IMG_WALL, size: "1.2MB", ext: "JPG", version: "v1" },
      ],
    },
    {
      id: "md2",
      title: "공정 회의록",
      author: "박현우",
      date: "2026-02-16",
      time: "13:30",
      files: [],
    },
  ],
  "회사서류": [
    {
      id: "co1",
      title: "협력업체 계약서",
      author: "관리자",
      date: "2026-01-05",
      time: "10:00",
      files: [
        { id: "co1f1", name: "계약서.hwp", type: "file", url: "", size: "54KB", ext: "HWP", version: "v1" },
      ],
    },
  ],
  "도면함": [],
  "사진함": [
    {
      id: "ph1",
      title: "서울 신축현장",
      contractor: "포스코건설",
      affiliation: "협력업체",
      author: "김민수",
      date: "2026-02-18",
      time: "16:45",
      files: [
        { id: "ph1f1", name: "현장사진_2.jpg", type: "img", url: IMG_CONCRETE, size: "2.5MB", ext: "JPG", version: "v1" },
      ],
    },
  ],
  "조치": [],
};

const formatDateShort = (d: string) => {
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[0].slice(2)}.${parts[1]}.${parts[2]}` : d;
};

// ─── Korean 초성 검색 유틸 (소속 검색용) ───
const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'] as const;
const CHOSUNG_SET = new Set<string>(CHOSUNG as unknown as string[]);

function toChosung(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const idx = Math.floor((code - 0xac00) / 588);
      out += CHOSUNG[idx] ?? ch;
      continue;
    }
    out += ch.toLowerCase();
  }
  return out;
}

function isChosungQuery(q: string): boolean {
  const t = q.replace(/\s+/g, '');
  if (!t) return false;
  for (const ch of t) if (!CHOSUNG_SET.has(ch)) return false;
  return true;
}

function matchKo(option: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (isChosungQuery(q)) {
    return toChosung(option).replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
  }
  return option.toLowerCase().includes(q.toLowerCase());
}

type ZoomPanPoint = { x: number; y: number };
type UseZoomPanOptions = {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  autoFit?: boolean;
};

function useZoomPan<T extends HTMLElement>(options: UseZoomPanOptions = {}) {
  const { minScale = 0.5, maxScale = 4, initialScale = 1, autoFit = true } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<T | null>(null);
  const [scale, setScale] = useState(initialScale);
  const [fitScale, setFitScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const scaleRef = useRef(scale);
  const positionRef = useRef(position);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const getSizes = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return null;
    const cw = container.clientWidth || 1;
    const ch = container.clientHeight || 1;
    const ew = (content as HTMLElement).offsetWidth || 1;
    const eh = (content as HTMLElement).offsetHeight || 1;
    return { cw, ch, ew, eh };
  }, []);

  const clampPosition = useCallback((pos: ZoomPanPoint, s: number) => {
    const sizes = getSizes();
    if (!sizes) return pos;
    const maxX = Math.max(0, (sizes.ew * s - sizes.cw) / 2);
    const maxY = Math.max(0, (sizes.eh * s - sizes.ch) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, pos.x)),
      y: Math.min(maxY, Math.max(-maxY, pos.y)),
    };
  }, [getSizes]);

  const applyScale = useCallback((nextScale: number, center?: ZoomPanPoint) => {
    const container = containerRef.current;
    const prevScale = scaleRef.current || 1;
    const prevPos = positionRef.current;
    const min = Math.max(minScale, fitScale || minScale);
    const clamped = Math.max(min, Math.min(maxScale, nextScale));
    if (!container || !Number.isFinite(clamped)) {
      setScale(clamped);
      return;
    }
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const px = center ? center.x - cx : 0;
    const py = center ? center.y - cy : 0;
    const ratio = clamped / prevScale;
    const nextPos = clampPosition(
      {
        x: prevPos.x * ratio + px * (1 - ratio),
        y: prevPos.y * ratio + py * (1 - ratio),
      },
      clamped
    );
    setScale(clamped);
    setPosition(nextPos);
  }, [clampPosition, fitScale, maxScale, minScale]);

  const reset = useCallback((nextScale?: number) => {
    const target = nextScale ?? fitScale;
    const min = Math.max(minScale, fitScale || minScale);
    const clamped = Math.max(min, Math.min(maxScale, target));
    setScale(clamped);
    setPosition({ x: 0, y: 0 });
  }, [fitScale, maxScale, minScale]);

  const recalcFit = useCallback(() => {
    const sizes = getSizes();
    if (!sizes) return;
    const fit = Math.min(sizes.cw / sizes.ew, sizes.ch / sizes.eh);
    if (!Number.isFinite(fit) || fit <= 0) return;
    setFitScale(fit);
    if (autoFit) {
      setScale(fit);
      setPosition({ x: 0, y: 0 });
      return;
    }
    const min = Math.max(minScale, fit);
    setScale(prev => Math.max(min, Math.min(maxScale, prev)));
    setPosition(prev => clampPosition(prev, scaleRef.current));
  }, [autoFit, clampPosition, getSizes, maxScale, minScale]);

  useEffect(() => {
    recalcFit();
    const ro = new ResizeObserver(() => recalcFit());
    if (containerRef.current) ro.observe(containerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [recalcFit]);

  const canPan = scale > fitScale + 0.01;

  const shouldIgnoreTarget = useCallback((target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el.closest("[data-no-pan='1']")) return true;
    if (el.isContentEditable || el.closest("[contenteditable='true']")) return true;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return true;
    return false;
  }, []);

  const dragState = useRef({ active: false, start: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } });
  const pinchState = useRef({
    active: false,
    initialDistance: 0,
    initialScale: 1,
    center: { x: 0, y: 0 },
  });
  const lastTapRef = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (shouldIgnoreTarget(e.target)) return;
    if (!canPan) return;
    dragState.current = { active: true, start: { x: e.clientX, y: e.clientY }, startPos: positionRef.current };
    setIsDragging(true);
  }, [canPan, shouldIgnoreTarget]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.start.x;
    const dy = e.clientY - dragState.current.start.y;
    const nextPos = clampPosition(
      { x: dragState.current.startPos.x + dx, y: dragState.current.startPos.y + dy },
      scaleRef.current
    );
    setPosition(nextPos);
  }, [clampPosition]);

  const endDrag = useCallback(() => {
    dragState.current.active = false;
    setIsDragging(false);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (shouldIgnoreTarget(e.target)) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      pinchState.current = {
        active: true,
        initialDistance: Math.hypot(dx, dy),
        initialScale: scaleRef.current,
        center: { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 },
      };
      return;
    }
    if (e.touches.length === 1 && canPan) {
      const t = e.touches[0];
      dragState.current = { active: true, start: { x: t.clientX, y: t.clientY }, startPos: positionRef.current };
      setIsDragging(true);
    }
  }, [canPan, shouldIgnoreTarget]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (pinchState.current.active && e.touches.length === 2) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.hypot(dx, dy);
      const nextScale = pinchState.current.initialScale * (dist / Math.max(1, pinchState.current.initialDistance));
      const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      applyScale(nextScale, center);
      return;
    }
    if (dragState.current.active && e.touches.length === 1) {
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - dragState.current.start.x;
      const dy = t.clientY - dragState.current.start.y;
      const nextPos = clampPosition(
        { x: dragState.current.startPos.x + dx, y: dragState.current.startPos.y + dy },
        scaleRef.current
      );
      setPosition(nextPos);
    }
  }, [applyScale, clampPosition]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 0) return;
    pinchState.current.active = false;
    dragState.current.active = false;
    setIsDragging(false);
    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      const target = scaleRef.current > fitScale * 1.05 ? fitScale : Math.min(maxScale, fitScale * 2);
      reset(target);
    }
    lastTapRef.current = now;
  }, [fitScale, maxScale, reset]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    applyScale(scaleRef.current * delta, { x: e.clientX, y: e.clientY });
  }, [applyScale]);

  const onDoubleClick = useCallback(() => {
    const target = scaleRef.current > fitScale * 1.05 ? fitScale : Math.min(maxScale, fitScale * 2);
    reset(target);
  }, [fitScale, maxScale, reset]);

  return {
    containerRef,
    contentRef,
    scale,
    fitScale,
    position,
    isDragging,
    canPan,
    setScale: applyScale,
    reset,
    recalcFit,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp: endDrag,
    onMouseLeave: endDrag,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onDoubleClick,
  };
}

export default function DocPage() {
  const { isPartner } = useUserRole();
  // Partners see the same doc page but with restricted tabs (no company-docs tab)
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
  const [batchBusy, setBatchBusy] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; file?: DocFile; title?: string }>({ isOpen: false });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PATCH START: upload sheet site selection (autocomplete + strict selection)
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: siteList = [] } = useSiteList();
  const [uploadSiteQuery, setUploadSiteQuery] = useState("");
  const [uploadSelectedSite, setUploadSelectedSite] = useState<SiteListItem | null>(null);
  const [uploadSiteDropdownOpen, setUploadSiteDropdownOpen] = useState(false);
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [uploadSiteError, setUploadSiteError] = useState<string | null>(null);

  const filteredUploadSites = useMemo(() => searchSites(siteList, uploadSiteQuery, 2).slice(0, 40), [siteList, uploadSiteQuery]);
  const canSubmitUpload = useMemo(() => selectedFiles.length > 0 && !!uploadSelectedSite && !!uploadDate, [selectedFiles.length, uploadSelectedSite, uploadDate]);
  // PATCH END

  // Blueprint-specific state
  const [blueprintDetailModal, setBlueprintDetailModal] = useState<{ isOpen: boolean; blueprintKey?: string }>({ isOpen: false });
  const [blueprintSelectedIds, setBlueprintSelectedIds] = useState<Set<string>>(new Set());
  const blueprintCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightBlueprintKey, setHighlightBlueprintKey] = useState<string | null>(null);
  const [blueprintUploadData, setBlueprintUploadData] = useState({
    siteName: '',
    siteIsCustom: false, // prevents collisions with admin/system sites
    affiliation: '',
    contractorPreset: '',
    contractorCustom: '',
    componentPreset: '',
    componentCustom: '',
    processPreset: '',
    processCustom: ''
  });
  const [bpAffOpen, setBpAffOpen] = useState(false);
  const [bpContractorOpen, setBpContractorOpen] = useState(false);

  // Punch detail state
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);

  // PATCH START: report editor overlay state (no localStorage)
  type PunchReportEdits = Record<string, Record<string, Partial<Pick<PunchItem, "location" | "issue">>>>;
  type PunchReportRow = Pick<PunchItem, "id" | "location" | "issue" | "status" | "beforePhoto" | "afterPhoto">;
  type PunchReportModel = {
    groupId: string;
    title: string;
    siteName: string;
    date: string;
    rows: PunchReportRow[];
  };

  const [reportEditorOpen, setReportEditorOpen] = useState(false);
  const [reportModel, setReportModel] = useState<PunchReportModel | null>(null);
  const [reportEdits, setReportEdits] = useState<PunchReportEdits>({});
  const reportContentRef = useRef<HTMLDivElement | null>(null);
  const reportTableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const reportPhotoInputRef = useRef<HTMLInputElement>(null);
  const [reportPhotoTarget, setReportPhotoTarget] = useState<{ itemId: string; field: "beforePhoto" | "afterPhoto" } | null>(null);
  const reportZoom = useZoomPan<HTMLDivElement>({ minScale: 0.5, maxScale: 4, autoFit: true });
  const [reportEditorRenderKey, setReportEditorRenderKey] = useState(0);
  const [reportPanMode, setReportPanMode] = useState(false);
  const [reportFitMode, setReportFitMode] = useState<"page" | "width">("width");
  const REPORT_HEADER_PX = 60;
  const REPORT_CONTROLBAR_PX = 86;
  // PATCH END

  // Supabase-backed punch data
  const { data: punchGroups = [] } = usePunchGroups();
  const addItemMutation = useAddPunchItem();
  const updateItemMutation = useUpdatePunchItem();
  const deleteItemMutation = useDeletePunchItem();
  const savePunchGroupsMutation = useSavePunchGroups();

  const tabKey = DOC_TABS_FILTERED[activeTab];
  const isPunch = tabKey === '조치';
  const isMyDocs = tabKey === '내문서함';
  const isBlueprint = tabKey === '도면함';

  const bpAffiliationOptions = useMemo(() => {
    const base = ["포스코건설", "GS건설", "현대건설", "대보건설", "기타"];
    const fromBlueprint = Object.values(blueprintStorage).map(s => s.affiliation).filter(Boolean);
    const fromPunch = punchGroups.map(g => g.affiliation).filter(Boolean);
    return Array.from(new Set([...base, ...fromBlueprint, ...fromPunch]));
  }, [punchGroups]);

  const bpContractorOptions = useMemo(() => {
    const base = ["포스코건설", "GS건설", "현대건설", "대보건설", "기타"];
    const fromBlueprint = Object.values(blueprintStorage).map(s => s.contractor).filter(Boolean);
    const fromPunch = punchGroups.map(g => g.contractor).filter(Boolean);
    return Array.from(new Set([...base, ...fromBlueprint, ...fromPunch]));
  }, [punchGroups]);

  // 소속 -> 원청사 추천(기존 데이터 기반)
  const bpAutoContractorByAff = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    const add = (affRaw?: string, contractorRaw?: string) => {
      const aff = (affRaw || "").trim();
      const contractor = (contractorRaw || "").trim();
      if (!aff || !contractor) return;
      if (!counts.has(aff)) counts.set(aff, new Map());
      const m = counts.get(aff)!;
      m.set(contractor, (m.get(contractor) || 0) + 1);
    };

    Object.values(blueprintStorage).forEach(s => add(s.affiliation, s.contractor));
    punchGroups.forEach(g => add(g.affiliation, g.contractor));

    const out: Record<string, string> = {};
    for (const [aff, m] of counts.entries()) {
      let best = "";
      let bestCount = -1;
      for (const [contractor, c] of m.entries()) {
        if (c > bestCount) {
          best = contractor;
          bestCount = c;
        }
      }
      if (best) out[aff] = best;
    }
    return out;
  }, [punchGroups]);

  // 소속 변경 시 원청사 자동 표기/입력 제한
  useEffect(() => {
    const aff = (blueprintUploadData.affiliation || "").trim();
    if (!aff) return;

    const autoContractorByAff: Record<string, string> = {
      "직영": "포스코건설",
      "본사": "포스코건설",
    };

    // "기타"는 직접 입력 모드
    if (aff === "기타") {
      setBlueprintUploadData(prev => (
        prev.contractorPreset === "기타"
          ? prev
          : { ...prev, contractorPreset: "기타", contractorCustom: "" }
      ));
      return;
    }

    const auto = autoContractorByAff[aff];
    if (auto) {
      setBlueprintUploadData(prev => (
        prev.contractorPreset === auto
          ? prev
          : { ...prev, contractorPreset: auto, contractorCustom: "" }
      ));
      return;
    }

    // 데이터 기반 자동 추천: 아직 원청사 선택 전이라면 채워줌
    const inferred = bpAutoContractorByAff[aff];
    if (inferred) {
      setBlueprintUploadData(prev => (
        prev.contractorPreset
          ? prev
          : { ...prev, contractorPreset: inferred, contractorCustom: "" }
      ));
    }
  }, [blueprintUploadData.affiliation, bpAutoContractorByAff]);

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

  const blueprintSitesAll = isBlueprint ? getBlueprintList() : [];
  const filteredBlueprintSites = !isBlueprint
    ? []
    : (() => {
        const q = search.trim().toLowerCase();
        if (!q) return blueprintSitesAll;
        return blueprintSitesAll.filter(s => {
          const hay = [
            s.siteName,
            s.affiliation,
            s.contractor,
            s.history?.[0]?.author,
            s.history?.[0]?.component,
            s.history?.[0]?.process
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        });
      })();

  const displayedDocs = (!isPunch && !isBlueprint) ? filteredDocs.slice(0, visibleCount) : [];
  const displayedPunchGroups = isPunch ? filteredPunchGroups.slice(0, visibleCount) : [];
  const displayedBlueprintSites = isBlueprint ? filteredBlueprintSites.slice(0, visibleCount) : [];
  const hasMore = isPunch
    ? filteredPunchGroups.length > visibleCount
    : isBlueprint
      ? filteredBlueprintSites.length > visibleCount
      : filteredDocs.length > visibleCount;
  const totalDisplayed = isPunch
    ? filteredPunchGroups.length
    : isBlueprint
      ? filteredBlueprintSites.length
      : filteredDocs.length;

  // Blueprint focus/highlight helper (collision guidance, after upload, etc.)
  useEffect(() => {
    if (!highlightBlueprintKey) return;
    if (!isBlueprint) return;

    const el = blueprintCardRefs.current[highlightBlueprintKey];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

    const t = window.setTimeout(() => setHighlightBlueprintKey(null), 1600);
    return () => window.clearTimeout(t);
  }, [highlightBlueprintKey, isBlueprint]);

  // Prevent background scroll when the bottom-sheet is open (mobile usability)
  useEffect(() => {
    if (!uploadSheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [uploadSheetOpen]);

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
    // Match "예정" badge tone for "미조치"
    return { text: '미조치', cls: 'bg-indigo-500 text-white' };
  };

  // ─── Detail overlay ───
  const detailGroup = useMemo(() => {
    if (!detailGroupId) return null;
    return punchGroups.find(g => g.id === detailGroupId) || null;
  }, [detailGroupId, punchGroups]);

  const isApproved = detailGroup?.punchItems?.every(i => i.status === 'done') || false;
  const reportGroup = useMemo(() => {
    if (!reportModel) return null;
    return punchGroups.find(g => g.id === reportModel.groupId) || null;
  }, [reportModel, punchGroups]);
  const reportIsApproved = reportGroup?.punchItems?.every(i => i.status === "done") || false;

  const openDetail = (groupId: string) => {
    setDetailGroupId(groupId);
    setSelectedIds(new Set());
  };

  const closeDetail = () => {
    setDetailGroupId(null);
    setSelectedIds(new Set());
  };

  useEffect(() => {
    if (!reportEditorOpen) return;
    setReportPanMode(false);
    setReportFitMode("width");
    const handle = () => {
      const container = reportZoom.containerRef.current;
      const content = reportZoom.contentRef.current;
      if (!container || !content) return;
      const styles = window.getComputedStyle(container);
      const paddingX = (parseFloat(styles.paddingLeft || "0") || 0) + (parseFloat(styles.paddingRight || "0") || 0);
      const available = Math.max(0, container.clientWidth - paddingX);
      const next = available / content.offsetWidth;
      if (Number.isFinite(next) && next > 0) {
        reportZoom.reset(next);
        setReportFitMode("width");
      }
    };
    const handleOrientation = () => window.setTimeout(handle, 60);
    const raf = window.requestAnimationFrame(handle);
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handleOrientation);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, [reportEditorOpen, reportZoom.reset]);

  // PATCH START: report editor overlay actions
  const statusLabel = (s: PunchItem["status"]) => (s === "done" ? "완료" : s === "ing" ? "진행중" : "미조치");

  const flushReportEditsToState = useCallback(() => {
    const groupId = reportModel?.groupId;
    const tbody = reportTableBodyRef.current;
    if (!groupId || !tbody) return;

    const nodes = Array.from(tbody.querySelectorAll<HTMLElement>("[data-report-edit='1']"));
    const nextEditsForGroup: Record<string, Partial<Pick<PunchItem, "location" | "issue">>> = {};
    for (const el of nodes) {
      const itemId = el.dataset.itemId || "";
      const field = el.dataset.field as "location" | "issue" | undefined;
      if (!itemId || (field !== "location" && field !== "issue")) continue;
      const value = (el.innerText || "").replace(/\u00A0/g, " ").trim();
      if (!nextEditsForGroup[itemId]) nextEditsForGroup[itemId] = {};
      nextEditsForGroup[itemId][field] = value;
    }

    if (nodes.length > 0) {
      setReportEdits(prev => {
        const prevGroup = prev[groupId] || {};
        const mergedGroup: Record<string, Partial<Pick<PunchItem, "location" | "issue">>> = { ...prevGroup };
        for (const [itemId, v] of Object.entries(nextEditsForGroup)) {
          mergedGroup[itemId] = { ...(mergedGroup[itemId] || {}), ...v };
        }
        return { ...prev, [groupId]: mergedGroup };
      });
    }

    const metaNodes = Array.from(
      reportContentRef.current?.querySelectorAll<HTMLElement>("[data-report-meta]") || []
    );
    const nextMeta: Partial<Pick<PunchReportModel, "title" | "siteName" | "date">> = {};
    for (const el of metaNodes) {
      const key = el.dataset.reportMeta as "title" | "siteName" | "date" | undefined;
      if (!key) continue;
      const value = (el.innerText || "").replace(/\u00A0/g, " ").trim();
      nextMeta[key] = value;
    }

    setReportModel(prev => {
      if (!prev || prev.groupId !== groupId) return prev;
      const nextRows =
        nodes.length === 0
          ? prev.rows
          : prev.rows.map(r => ({
              ...r,
              location: nextEditsForGroup[r.id]?.location ?? r.location,
              issue: nextEditsForGroup[r.id]?.issue ?? r.issue,
            }));
      return {
        ...prev,
        ...nextMeta,
        rows: nextRows,
      };
    });
  }, [reportModel?.groupId]);

  const updateReportPhoto = useCallback((itemId: string, field: "beforePhoto" | "afterPhoto", value: string) => {
    setReportModel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map(r => (r.id === itemId ? { ...r, [field]: value } : r)),
      };
    });

    if (!reportModel?.groupId) return;
    updateItemMutation.mutate(
      { groupId: reportModel.groupId, itemId, field, value },
      { onSuccess: () => toast.success(value ? "사진이 업데이트되었습니다." : "사진이 삭제되었습니다.") }
    );
  }, [reportModel?.groupId, updateItemMutation]);

  const openReportPhotoPicker = useCallback((itemId: string, field: "beforePhoto" | "afterPhoto") => {
    if (!reportModel) return;
    if (reportIsApproved) {
      toast.error("승인완료 상태에서는 수정할 수 없습니다.");
      return;
    }
    flushReportEditsToState();
    setReportPhotoTarget({ itemId, field });
    reportPhotoInputRef.current?.click();
  }, [flushReportEditsToState, reportIsApproved, reportModel]);

  const onReportPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reportPhotoTarget) {
      e.currentTarget.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateReportPhoto(reportPhotoTarget.itemId, reportPhotoTarget.field, (ev.target?.result as string) || "");
      setReportPhotoTarget(null);
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  }, [reportPhotoTarget, updateReportPhoto]);

  const clearReportPhoto = useCallback((itemId: string, field: "beforePhoto" | "afterPhoto") => {
    if (reportIsApproved) {
      toast.error("승인완료 상태에서는 수정할 수 없습니다.");
      return;
    }
    flushReportEditsToState();
    updateReportPhoto(itemId, field, "");
  }, [flushReportEditsToState, reportIsApproved, updateReportPhoto]);

  const openReportEditor = useCallback((groupId?: string) => {
    // Determine target group:
    // 1) explicit groupId (detail header report button)
    // 2) currently opened detail group
    // 3) list selection (exactly one)
    const inferred =
      groupId ||
      detailGroupId ||
      (selectedIds.size === 1 ? Array.from(selectedIds)[0] : null);

    if (!inferred || (!groupId && !detailGroupId && selectedIds.size !== 1)) {
      toast.error("한 개의 그룹을 선택해야 합니다");
      return;
    }

    const group = punchGroups.find(g => g.id === inferred);
    if (!group) {
      toast.error("선택된 그룹을 찾을 수 없습니다.");
      return;
    }

    const groupEdits = reportEdits[group.id] || {};
    const rows: PunchReportRow[] = (group.punchItems || []).map((i) => ({
      id: i.id,
      location: groupEdits[i.id]?.location ?? i.location ?? "",
      issue: groupEdits[i.id]?.issue ?? i.issue ?? "",
      status: i.status,
      beforePhoto: i.beforePhoto,
      afterPhoto: i.afterPhoto,
    }));

    setReportModel({
      groupId: group.id,
      title: "조치 사항 점검 보고서",
      siteName: group.title,
      date: group.date,
      rows,
    });
    setReportEditorRenderKey(prev => prev + 1);
    setReportPanMode(false);
    setReportFitMode("width");
    setReportEditorOpen(true);
  }, [detailGroupId, selectedIds, punchGroups, reportEdits]);

  const closeReportEditor = useCallback(() => {
    flushReportEditsToState();
    setReportEditorOpen(false);
    setReportModel(null);
    setReportPhotoTarget(null);
    setReportPanMode(false);
    setReportFitMode("width");
  }, [flushReportEditsToState]);

  const resetReportEditor = useCallback(() => {
    flushReportEditsToState();
    if (!reportModel) return;
    const group = punchGroups.find(g => g.id === reportModel.groupId);
    if (!group) return;

    setReportEdits(prev => {
      const next = { ...prev };
      delete next[reportModel.groupId];
      return next;
    });

    const rows: PunchReportRow[] = (group.punchItems || []).map((item) => ({
      id: item.id,
      location: item.location ?? "",
      issue: item.issue ?? "",
      status: item.status,
      beforePhoto: item.beforePhoto,
      afterPhoto: item.afterPhoto,
    }));

    setReportModel({
      groupId: group.id,
      title: "조치 사항 점검 보고서",
      siteName: group.title,
      date: group.date,
      rows,
    });
    setReportEditorRenderKey(prev => prev + 1);
    setReportPhotoTarget(null);
    setReportPanMode(false);
    setReportFitMode("width");
    toast.success("입력을 초기화했습니다.");
  }, [flushReportEditsToState, punchGroups, reportModel]);

  const fitReportWidth = useCallback(() => {
    const container = reportZoom.containerRef.current;
    const content = reportZoom.contentRef.current;
    if (!container || !content) return;
    const styles = window.getComputedStyle(container);
    const paddingX = (parseFloat(styles.paddingLeft || "0") || 0) + (parseFloat(styles.paddingRight || "0") || 0);
    const available = Math.max(0, container.clientWidth - paddingX);
    const next = available / content.offsetWidth;
    if (Number.isFinite(next) && next > 0) {
      reportZoom.reset(next);
      setReportFitMode("width");
    }
  }, [reportZoom]);

  const fitReportPage = useCallback(() => {
    reportZoom.reset();
    setReportFitMode("page");
  }, [reportZoom]);

  const toggleReportFit = useCallback(() => {
    if (reportFitMode === "width") {
      fitReportPage();
      return;
    }
    fitReportWidth();
  }, [fitReportPage, fitReportWidth, reportFitMode]);

  const toggleReportPan = useCallback(() => {
    setReportPanMode(prev => !prev);
  }, []);

  const onReportWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    reportZoom.onWheel(e);
  }, [reportZoom]);

  const loadScript = useCallback((src: string) => {
    return new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }, []);

  const ensureReportPdfLibs = useCallback(async () => {
    const w = window as typeof window & { html2canvas?: any; jspdf?: any };
    if (!w.html2canvas) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    }
    if (!w.jspdf) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    }
  }, [loadScript]);

  const generateReportPDF = useCallback(async () => {
    flushReportEditsToState();
    if (!reportModel) return;

    const source = reportContentRef.current;
    if (!source) {
      toast.error("보고서 내용을 찾을 수 없습니다.");
      return;
    }

    try {
      await ensureReportPdfLibs();
      const w = window as typeof window & { html2canvas?: any; jspdf?: { jsPDF: any } };
      const html2canvas = w.html2canvas;
      const jsPDF = w.jspdf?.jsPDF;
      if (!html2canvas || !jsPDF) {
        toast.error("PDF 라이브러리가 로드되지 않았습니다.");
        return;
      }

      // Clone & normalize styles for capture (no UI impact)
      const clone = source.cloneNode(true) as HTMLElement;
      clone.style.position = "fixed";
      clone.style.left = "0";
      clone.style.top = "-10000px";
      clone.style.transform = "none";
      clone.style.width = "210mm";
      clone.style.minHeight = "297mm";
      clone.style.background = "#ffffff";
      clone.style.margin = "0";
      clone.style.padding = "20mm 10mm";
      clone.style.boxSizing = "border-box";
      clone.style.fontFamily = "Arial, sans-serif";
      clone.style.pointerEvents = "none";

      document.body.appendChild(clone);

      try {
        clone.querySelectorAll("table").forEach((node) => {
          const table = node as HTMLElement;
          table.style.tableLayout = "fixed";
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
        });

        clone.querySelectorAll("td, th").forEach((node) => {
          const el = node as HTMLElement;
          el.style.verticalAlign = "top";
          el.style.lineHeight = "1.4";
          el.style.paddingTop = "6px";
          el.style.paddingBottom = "10px";
          el.style.paddingLeft = "4px";
          el.style.paddingRight = "4px";
          el.style.whiteSpace = "normal";
          el.style.wordBreak = "break-word";
          el.style.overflowWrap = "anywhere";
          el.style.boxSizing = "border-box";
        });

        clone.querySelectorAll("[contenteditable='true']").forEach((node) => {
          const el = node as HTMLElement;
          el.style.whiteSpace = "pre-wrap";
          el.style.wordBreak = "break-word";
        });

        clone.querySelectorAll("[data-report-remove='1']").forEach((node) => {
          (node as HTMLElement).style.display = "none";
        });

        const centerCols = new Set([0, 5]); // NO, 상태 컬럼
        clone.querySelectorAll("tr").forEach((row) => {
          const cells = row.querySelectorAll("th, td");
          centerCols.forEach((idx) => {
            const cell = cells[idx] as HTMLElement | undefined;
            if (!cell) return;
            cell.style.textAlign = "center";
            cell.style.verticalAlign = "middle";
          });
        });

        clone.querySelectorAll("img").forEach((node) => {
          const img = node as HTMLImageElement;
          img.style.display = "block";
          img.style.maxWidth = "100%";
          img.setAttribute("crossorigin", "anonymous");
        });

        const scale = 2;
        const images = Array.from(clone.querySelectorAll("img"));
        await Promise.all(images.map(img => {
          if ((img as HTMLImageElement).complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          });
        }));

        const cloneRect = clone.getBoundingClientRect();
        const rowBottomsCanvasPx: number[] = Array.from(clone.querySelectorAll("tbody tr")).map((row) => {
          const rect = (row as HTMLElement).getBoundingClientRect();
          return (rect.bottom - cloneRect.top) * scale;
        });

        const canvas = await html2canvas(clone, {
          scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: clone.scrollWidth || 794,
          windowHeight: clone.scrollHeight || clone.getBoundingClientRect().height,
        });

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidthMm = 210;
        const pageHeightMm = 297;
        const marginX = 0;
        const marginY = 0;
        const usableW = pageWidthMm - marginX * 2;
        const usableH = pageHeightMm - marginY * 2;
        const mmPerPx = usableW / canvas.width;
        const pageHeightPx = Math.floor(usableH / mmPerPx);

        let y = 0;
        let pageIndex = 0;

        while (y < canvas.height - 1) {
          if (pageIndex > 0) pdf.addPage();

          const targetEnd = Math.min(y + pageHeightPx, canvas.height);
          let breakY = targetEnd;

          // Avoid cutting through table rows when possible
          for (let i = rowBottomsCanvasPx.length - 1; i >= 0; i--) {
            const rb = rowBottomsCanvasPx[i];
            if (rb > y + 40 && rb <= targetEnd) {
              breakY = rb;
              break;
            }
          }

          if (breakY <= y + 10) {
            breakY = targetEnd;
          }
          if (canvas.height - breakY <= 8 || canvas.height - y <= pageHeightPx + 8) {
            breakY = canvas.height;
          }

          const sliceH = breakY - y;
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d");
          if (ctx) ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

          const sliceHeightMm = sliceH * mmPerPx;
          pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.95), "JPEG", marginX, marginY, usableW, sliceHeightMm);

          pageIndex++;
          y = breakY;
        }

        const datePart = (reportModel.date || new Date().toISOString().split("T")[0]).slice(0, 10);
        const sitePart = (reportModel.siteName || "현장").replace(/[\\/:*?\"<>|]+/g, "_").trim() || "현장";
        pdf.save(`${datePart}-${sitePart}-보고서.pdf`);
      } finally {
        clone.remove();
      }
    } catch (e) {
      console.error(e);
      toast.error("PDF 생성 중 오류가 발생했습니다.");
    }
  }, [ensureReportPdfLibs, flushReportEditsToState, reportModel]);

  const shareReport = useCallback(async () => {
    flushReportEditsToState();
    if (!reportModel) return;

    const source = reportContentRef.current;
    if (!source) {
      toast.error("공유할 보고서 내용을 찾을 수 없습니다.");
      return;
    }

    if (!navigator.share) {
      await generateReportPDF();
      return;
    }

    try {
      await ensureReportPdfLibs();
      const w = window as typeof window & { html2canvas?: any };
      const html2canvas = w.html2canvas;
      if (!html2canvas) {
        await generateReportPDF();
        return;
      }

      const canvas = await html2canvas(source, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
      if (!blob) {
        await generateReportPDF();
        return;
      }

      const datePart = (reportModel.date || new Date().toISOString().split("T")[0]).slice(0, 10);
      const sitePart = (reportModel.siteName || "현장").replace(/[\\/:*?\"<>|]+/g, "_").trim() || "현장";
      const fileName = `${datePart}-${sitePart}-보고서.png`;
      const shareFile = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ title: "조치보고서 공유", files: [shareFile] });
        toast.success("공유했습니다.");
        return;
      }

      await generateReportPDF();
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      await generateReportPDF();
    }
  }, [ensureReportPdfLibs, flushReportEditsToState, generateReportPDF, reportModel]);
  // PATCH END

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

  type BatchFile = { url: string; name: string };

  const normalizeVersion = (v?: string) => {
    const raw = (v || '').trim();
    if (!raw) return 'v1';
    return raw.toLowerCase().startsWith('v') ? raw : `v${raw}`;
  };

  const resolveFileUrl = (file: { url: string; url_before?: string; url_after?: string; currentView?: string }) => {
    const view = file.currentView;
    const chosen = view === 'after' ? file.url_after : view === 'before' ? file.url_before : undefined;
    return (chosen || file.url_after || file.url_before || file.url || '').trim();
  };

  const sanitizeDownloadName = (name: string) => (name || 'file').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'file';

  const ensureExt = (baseName: string, ext: string) => {
    const clean = sanitizeDownloadName(baseName);
    if (!ext) return clean;
    const hasExt = /\.[a-z0-9]{1,6}$/i.test(clean);
    return hasExt ? clean : `${clean}.${ext.toLowerCase()}`;
  };

  const guessMimeFromName = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'hwp') return 'application/x-hwp';
    return 'application/octet-stream';
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const collectSelectedFiles = (): BatchFile[] => {
    if (isPunch) {
      return punchGroups
        .filter(g => selectedIds.has(g.id))
        .flatMap(g =>
          (g.files || []).map(f => ({
            url: resolveFileUrl(f),
            name: ensureExt(f.name || `${g.title}_${f.id}`, f.ext || ''),
          }))
        );
    }

    const docs = (MOCK_DOCS[tabKey] || []).filter(d => selectedIds.has(d.id));
    return docs.flatMap(d =>
      (d.files || []).map(f => ({
        url: resolveFileUrl(f),
        name: ensureExt(f.name || d.title, f.ext || ''),
      }))
    );
  };

  const handleBatchDownload = async () => {
    const files = collectSelectedFiles().filter(f => !!f.url);
    if (files.length === 0) {
      toast.error('저장할 파일이 없습니다.');
      return;
    }

    setBatchBusy(true);
    try {
      for (const f of files) {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error('download_failed');
        const blob = await res.blob();
        downloadBlob(blob, f.name);
        // Avoid browsers blocking multiple auto-downloads too aggressively.
        await new Promise(r => setTimeout(r, 200));
      }
      toast.success(files.length === 1 ? '저장했습니다.' : `${files.length}개 파일을 저장했습니다.`);
    } catch {
      toast.error('파일 저장에 실패했습니다.');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleBatchShare = async () => {
    const files = collectSelectedFiles().filter(f => !!f.url);
    if (files.length === 0) {
      toast.error('공유할 파일이 없습니다.');
      return;
    }

    if (!navigator.share) {
      toast.error('이 기기는 공유 기능을 지원하지 않습니다. (저장을 이용해주세요)');
      return;
    }

    const maxShare = 10;
    const targets = files.slice(0, maxShare);

    setBatchBusy(true);
    try {
      const shareFiles: File[] = [];
      for (const f of targets) {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error('share_fetch_failed');
        const blob = await res.blob();
        shareFiles.push(new File([blob], f.name, { type: blob.type || guessMimeFromName(f.name) }));
      }

      if (navigator.canShare?.({ files: shareFiles })) {
        await navigator.share({ title: '문서 공유', files: shareFiles });
        toast.success('공유했습니다.');
      } else {
        toast.error('이 기기는 파일 공유를 지원하지 않습니다. (저장을 이용해주세요)');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('공유에 실패했습니다.');
    } finally {
      setBatchBusy(false);
    }
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
    setUploadSheetOpen(false);
    setSelectedFiles([]);
    // PATCH START: reset upload autocomplete state
    setUploadSiteQuery("");
    setUploadSelectedSite(null);
    setUploadSiteDropdownOpen(false);
    setUploadDate(today);
    setUploadSiteError(null);
    // PATCH END
    setBpAffOpen(false);
    setBpContractorOpen(false);
    setBlueprintUploadData({
      siteName: '',
      siteIsCustom: false,
      affiliation: '',
      contractorPreset: '',
      contractorCustom: '',
      componentPreset: '',
      componentCustom: '',
      processPreset: '',
      processCustom: ''
    });
  };

  // File handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => {
      const next = [...prev];
      for (const f of files) {
        const exists = next.some(p => p.name === f.name && p.size === f.size && p.lastModified === f.lastModified);
        if (!exists) next.push(f);
      }
      return next;
    });
    if (files.length > 0) toast.success(`${files.length}개 파일이 선택되었습니다.`);
    // Allow selecting the same file again if needed
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    // PATCH START: strict site selection + repo save (site_id + site_name)
    void (async () => {
      if (selectedFiles.length === 0) {
        toast.error("선택된 파일이 없습니다.");
        return;
      }

      if (!uploadSelectedSite) {
        setUploadSiteError("현장명을 선택해주세요");
        toast.error("현장명을 선택해주세요");
        return;
      }

      if (!uploadDate) {
        toast.error("등록일을 선택해주세요");
        return;
      }

      const imageFiles = selectedFiles.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        toast.error("이미지 파일만 업로드할 수 있습니다.");
        return;
      }

      setBatchBusy(true);
      try {
        const res = await addPhotosToWorklog({
          site_id: uploadSelectedSite.site_id,
          site_name: uploadSelectedSite.site_name,
          work_date: uploadDate,
          files: imageFiles,
        });

        toast.success(res.saved === 1 ? "파일을 저장했습니다." : `${res.saved}개 파일을 저장했습니다.`);
        setSelectedFiles([]);
        setUploadSheetOpen(false);
        setUploadSiteQuery("");
        setUploadSelectedSite(null);
        setUploadSiteDropdownOpen(false);
        setUploadSiteError(null);
        setUploadDate(today);
      } catch {
        toast.error("업로드에 실패했습니다.");
      } finally {
        setBatchBusy(false);
      }
    })();
    // PATCH END
  };

  const resetBlueprintUploadForm = () => {
    setSelectedFiles([]);
    setBpAffOpen(false);
    setBpContractorOpen(false);
    setBlueprintUploadData({
      siteName: '',
      siteIsCustom: false,
      affiliation: '',
      contractorPreset: '',
      contractorCustom: '',
      componentPreset: '',
      componentCustom: '',
      processPreset: '',
      processCustom: ''
    });
  };

  const closeUploadSheet = () => {
    resetBlueprintUploadForm();
    // PATCH START: reset non-blueprint upload state
    setUploadSiteQuery("");
    setUploadSelectedSite(null);
    setUploadSiteDropdownOpen(false);
    setUploadSiteError(null);
    setUploadDate(today);
    // PATCH END
    setUploadSheetOpen(false);
  };

  // Blueprint Management Functions
  const handleSaveToBlueprint = (inputData: {
    siteKey: string;
    siteName: string;
    siteSource: BlueprintSiteSource;
    affiliation: string;
    contractor: string;
    author: string;
    component: string;
    process: string;
    files: File[];
  }) => {
    const { siteKey, siteName, siteSource, affiliation, contractor, author, component, process, files } = inputData;
    
    if (!siteName.trim()) {
      toast.error('현장명을 입력해주세요.');
      return;
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].slice(0, 5);
    
    // Convert File objects to DocFile format
    const docFiles: DocFile[] = files.map((file, index) => ({
      id: `${Date.now()}_${index}`,
      name: file.name,
      type: file.type.startsWith('image/') ? 'img' : 'file',
      url: URL.createObjectURL(file),
      size: `${(file.size / 1024).toFixed(1)}KB`,
      ext: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      version: 'v1'
    }));

    const historyItem: BlueprintHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      time,
      author,
      affiliation,
      contractor,
      component,
      process,
      files: docFiles,
      version: 1
    };

    if (blueprintStorage[siteKey]) {
      // Update existing site data
      const existingData = blueprintStorage[siteKey];
      existingData.history.unshift(historyItem);
      existingData.currentVersion += 1;
      existingData.lastUpdated = date;
      existingData.totalDrawings = existingData.history.reduce((sum, item) => sum + item.files.length, 0);
      historyItem.version = existingData.currentVersion;
      
      toast.success(`${siteName} 도면이 업데이트되었습니다. (v${existingData.currentVersion})`);
    } else {
      // Create new site data
      blueprintStorage[siteKey] = {
        id: siteKey,
        siteName,
        siteSource,
        affiliation,
        contractor,
        totalDrawings: docFiles.length,
        currentVersion: 1,
        lastUpdated: date,
        history: [historyItem]
      };
      
      toast.success(`${siteName} 도면함이 새로 생성되었습니다.`);
    }
  };

  function getBlueprintList() {
    return Object.values(blueprintStorage).sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  }

  const deleteBlueprintSite = (siteKey: string) => {
    if (blueprintStorage[siteKey]) {
      delete blueprintStorage[siteKey];
      setBlueprintSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(siteKey);
        return newSet;
      });
      toast.success(`도면함이 삭제되었습니다.`);
    }
  };

  const handleBlueprintUpload = () => {
    if (selectedFiles.length === 0) {
      toast.error('선택된 파일이 없습니다.');
      return;
    }

    const siteName = blueprintUploadData.siteName.trim();
    if (!siteName) {
      toast.error('현장명을 입력해주세요.');
      return;
    }

    const affiliation = blueprintUploadData.affiliation.trim();
    if (!affiliation) {
      toast.error('소속을 선택/입력해주세요.');
      return;
    }

    const contractor =
      blueprintUploadData.contractorPreset === '기타'
        ? blueprintUploadData.contractorCustom.trim()
        : blueprintUploadData.contractorPreset.trim();
    if (!contractor) {
      toast.error(blueprintUploadData.contractorPreset === '기타' ? '원청사를 입력해주세요.' : '원청사를 선택해주세요.');
      return;
    }

    const component =
      blueprintUploadData.componentPreset === '기타'
        ? blueprintUploadData.componentCustom.trim()
        : blueprintUploadData.componentPreset.trim();
    if (!component) {
      toast.error(blueprintUploadData.componentPreset === '기타' ? '부재명을 입력해주세요.' : '부재명을 선택해주세요.');
      return;
    }

    const process =
      blueprintUploadData.processPreset === '기타'
        ? blueprintUploadData.processCustom.trim()
        : blueprintUploadData.processPreset.trim();
    if (!process) {
      toast.error(blueprintUploadData.processPreset === '기타' ? '작업공정을 입력해주세요.' : '작업공정을 선택해주세요.');
      return;
    }

    // Collision-safe site key resolution:
    // - If the same siteName already exists (sys/custom), always upload into that existing bucket.
    // - If it's a brand-new name, treat it as "direct input" (custom) to avoid admin/system collisions.
    const intendedSource: BlueprintSiteSource = blueprintUploadData.siteIsCustom ? "custom" : "system";
    const sysKey = `sys:${siteName}`;
    const customKey = `custom:${siteName}`;
    const hasSys = !!blueprintStorage[sysKey];
    const hasCustom = !!blueprintStorage[customKey];

    let siteSource: BlueprintSiteSource = intendedSource;
    let siteKey = intendedSource === "custom" ? customKey : sysKey;

    if (hasSys) {
      // Same name already exists as system site -> never create a duplicated "custom" bucket.
      if (intendedSource === "custom") {
        toast.warning("동일한 현장명이 이미 등록되어 있습니다. 기존 현장 도면함으로 업로드합니다.");
      }
      siteSource = "system";
      siteKey = sysKey;
    } else if (hasCustom) {
      // Same name already exists as direct-input site -> keep uploading into it.
      if (intendedSource === "system") {
        toast("직접 입력 현장으로 존재합니다. 해당 도면함으로 업로드합니다.");
      }
      siteSource = "custom";
      siteKey = customKey;
    } else if (intendedSource === "system") {
      // Brand-new typed site name -> store as direct-input by default.
      toast("새 현장명입니다. 직접 입력 현장으로 분리 저장합니다.");
      siteSource = "custom";
      siteKey = customKey;
    }

    handleSaveToBlueprint({
      siteKey,
      siteName,
      siteSource,
      affiliation,
      contractor,
      author: '관리자', // TODO: Get from user context
      component,
      process,
      files: selectedFiles
    });

    setHighlightBlueprintKey(siteKey);
    closeUploadSheet();
  };

  const blueprintDetail = blueprintDetailModal.blueprintKey
    ? blueprintStorage[blueprintDetailModal.blueprintKey]
    : null;

  return (
    <div className="animate-fade-in">
      {/* Optimized Preview Modal */}
      {previewModal.isOpen && (
        <PreviewModal
          file={previewModal.file!}
          title={previewModal.title || ''}
          onClose={() => setPreviewModal({ isOpen: false })}
        />
      )}

      {/* Tab Bar */}
      <div className="flex border-b border-border mb-4 -mx-4 px-1 bg-card -mt-6 pt-6 overflow-x-auto scrollbar-none">
        {DOC_TABS_FILTERED.map((tab, i) => (
          <button
            key={tab}
            onClick={() => handleTabChange(i)}
            className={cn(
              "flex-1 min-w-0 h-12 bg-transparent border-none text-[16px] font-semibold cursor-pointer border-b-[3px] transition-all whitespace-nowrap px-1",
              activeTab === i
                ? "text-sky-500 border-b-sky-500 font-bold"
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
            className="w-full h-[50px] bg-card border border-border rounded-2xl px-5 pr-16 text-base font-medium text-foreground placeholder:text-muted-foreground transition-all outline-none hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)]"
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
      {!detailGroupId && DOC_TABS_FILTERED[activeTab] !== "조치" && (
        <div className="relative mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={["도면함", "사진함"].includes(DOC_TABS_FILTERED[activeTab]) ? "현장명을 입력하세요." : "검색어를 입력하세요."}
            className="w-full h-[50px] bg-card border border-border rounded-2xl px-5 pr-12 text-base font-medium text-foreground placeholder:text-muted-foreground transition-all hover:bg-card hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none"
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
            // PATCH START: match card badge tone (indigo) for "미조치"
            { key: 'open' as const, label: '미조치', count: punchStats.open, cls: 'bg-indigo-500' },
            // PATCH END
            { key: 'done' as const, label: '완료', count: punchStats.done, cls: 'bg-slate-500' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setPunchFilter(f.key)}
              className={cn(
                // NOTE: 선택 시 번짐(글로우) 효과는 제거하고 컬러만 변경
                "h-10 px-3.5 rounded-full text-[15px] font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 border shadow-none focus:outline-none",
                punchFilter === f.key
                  ? `${f.cls} text-white border-transparent font-bold shadow-none`
                  : "bg-white border-border text-[#64748b] hover:border-primary/50"
              )}
            >{f.label} {f.count}</button>
          ))}
        </div>
      )}

      {/* ═══════ DETAIL OVERLAY ═══════ */}
      {detailGroupId && detailGroup && (
        <>
          {/* PATCH START: connect report button -> openReportEditor */}
          <PunchDetailView
            group={detailGroup}
            isApproved={isApproved}
            onBack={closeDetail}
            onOpenReport={openReportEditor}
            onUpdateField={handleUpdateField}
            onDeleteItem={handleDeletePunchItem}
            onAddItem={handleAddPunchItem}
            onPhotoUpload={handlePhotoUpload}
          />
          {/* PATCH END */}
        </>
      )}

      {/* ═══════ LIST VIEW ═══════ */}
      {!detailGroupId && (
        <>
          {/* Punch Cards */}
          {isPunch && (
            <div className="space-y-3 max-[640px]:space-y-2.5">
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
                  <div key={group.id} className={cn("bg-card rounded-2xl p-4 max-[640px]:p-3.5 cursor-pointer transition-all shadow-soft relative overflow-hidden", isSelected && "border-2 border-primary bg-sky-50/50")} onClick={() => openDetail(group.id)}>
                    <span className={cn("absolute top-0 right-0 text-[11px] font-bold px-2.5 py-1 text-white rounded-bl-xl z-10", statusBadge.cls)}>{statusBadge.text}</span>
                    <div className="flex gap-3 max-[640px]:gap-2.5 items-center">
                      <div onClick={(e) => { e.stopPropagation(); toggleSelect(group.id); }} className={cn("w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-sky-500 border-sky-500 shadow-[0_2px_8px_rgba(14,165,233,0.3)]" : "bg-card border-muted-foreground/30")}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </div>
                      <div className="w-20 h-20 max-[640px]:w-16 max-[640px]:h-16 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                        {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <FileText className="w-8 h-8 max-[640px]:w-7 max-[640px]:h-7 text-muted-foreground m-auto mt-6 max-[640px]:mt-5" />}
                      </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1 max-[640px]:gap-0.5 pt-0.5 leading-tight">
                          {(group.contractor || group.affiliation) && (
                            <div className="flex gap-1.5 flex-wrap mb-1.5">
                              {group.contractor && <span className="text-[12px] px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 border border-indigo-200 font-semibold">{group.contractor}</span>}
                              {group.affiliation && <span className="text-[12px] px-2.5 py-0.5 rounded-md bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-semibold">{group.affiliation}</span>}
                            </div>
                          )}
                          <div className="text-[16px] font-[800] text-header-navy truncate leading-tight">{group.title}</div>
                        <div className="text-[13px] font-medium text-text-sub leading-tight">
                          {group.author} <span className="text-muted-foreground">|</span> {formatDateShort(group.date)} <span className="text-muted-foreground">{group.time}</span>
                        </div>
                        <div className="text-[13px] font-medium text-muted-foreground truncate leading-tight">
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
          {!isPunch && !isBlueprint && (
            <div className="space-y-3 max-[640px]:space-y-2.5">
              {displayedDocs.length === 0 ? (
                <EmptyState />
              ) : displayedDocs.map(doc => {
                const isSelected = selectedIds.has(doc.id);
                const hasFile = doc.files && doc.files.length > 0;
                const repImg = doc.files?.find(f => f.type === 'img');
                const thumbUrl = repImg ? ((repImg.currentView === 'after' ? repImg.url_after : repImg.url_before) || repImg.url) : null;

                if (isMyDocs) {
                  // Match "예정" badge tone for "미등록"
                  const fileStatus = hasFile ? { text: '완료', cls: 'bg-slate-500 text-white' } : { text: '미등록', cls: 'bg-indigo-500 text-white' };
                  const primary = doc.files?.[0];
                  const fileName = primary?.name || doc.title;
                  const version = normalizeVersion(primary?.version || doc.version);
                  return (
                    <div key={doc.id} className={cn("bg-card rounded-2xl p-3.5 max-[640px]:p-3 cursor-pointer transition-all shadow-soft relative", isSelected && "border-2 border-primary bg-sky-50/50")}>
                      <span className={cn("absolute top-0 right-0 text-[11px] font-bold px-2.5 py-1 text-white rounded-tr-xl rounded-bl-xl z-10", fileStatus.cls)}>
                        {fileStatus.text}
                      </span>
                      <div className="flex gap-2.5 max-[640px]:gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(doc.id)}
                          className={cn(
                            "w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all bg-transparent p-0 cursor-pointer",
                            isSelected ? "bg-sky-500 border-sky-500 shadow-[0_2px_8px_rgba(14,165,233,0.3)]" : "bg-card border-muted-foreground/30"
                          )}
                          aria-label={isSelected ? "선택 해제" : "선택"}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </button>

                        <div className="w-[64px] h-[64px] max-[640px]:w-[60px] max-[640px]:h-[60px] rounded-xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                          {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <FileText className="w-7 h-7 text-muted-foreground" />}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col gap-0.5 max-[640px]:gap-0.5 pt-0.5 leading-tight">
                          <div className="flex items-center gap-2">
                            <div className="text-[16px] font-[800] text-header-navy truncate flex-1 leading-tight">{fileName.replace(/\.[^/.]+$/, "")}</div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-text-sub leading-tight">
                            <span className="font-semibold">{doc.author}</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-muted-foreground">{formatDateShort(doc.date)}</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-muted-foreground">{version}</span>
                          </div>

                          <div className="flex gap-2 max-[640px]:gap-1.5 items-center mt-1.5">
                            <button
                              className={cn(
                                "flex-1 h-[32px] max-[640px]:h-[30px] rounded-[10px] border text-[12px] font-[800] flex items-center justify-center gap-1.5 max-[640px]:gap-1 transition-all duration-200 group",
                                hasFile
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-500 font-bold shadow-[0_2px_4px_rgba(99,102,241,0.1)] hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                  : "bg-muted border-border text-muted-foreground opacity-60 cursor-not-allowed"
                              )}
                              disabled={!hasFile}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasFile && primary) {
                                  setPreviewModal({ isOpen: true, file: primary, title: doc.title });
                                }
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                              미리보기
                            </button>

                            <button 
                              className="flex-1 h-[32px] max-[640px]:h-[30px] rounded-[10px] border border-[#bae6fd] bg-[#e0f2fe] text-[#0284c7] text-[12px] font-[800] flex items-center justify-center gap-1.5 max-[640px]:gap-1 transition-all duration-200 group hover:bg-[#bae6fd] hover:border-[#7dd3fc] hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Create file input for upload/change
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*,.pdf,.doc,.docx,.hwp,.xls,.xlsx,.ppt,.pptx';
                                input.onchange = (event: any) => {
                                  const file = event.target.files?.[0];
                                  if (file) {
                                    // Handle file upload/change
                                    toast.success(`${file.name} 파일을 ${hasFile ? '변경' : '업로드'}합니다.`);
                                    // TODO: Implement actual file upload logic
                                  }
                                };
                                input.click();
                              }}
                            >
                              <Upload className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                              {hasFile ? '변경' : '업로드'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={doc.id} onClick={() => toggleSelect(doc.id)} className={cn("bg-card rounded-2xl p-3.5 max-[640px]:p-3 cursor-pointer transition-all shadow-soft flex gap-2.5 max-[640px]:gap-2 items-center", isSelected && "border-2 border-primary bg-sky-50/50 shadow-[0_0_0_2px_rgba(49,163,250,0.1)]")}>
                    <div className={cn("w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-sky-500 border-sky-500 shadow-[0_2px_8px_rgba(14,165,233,0.3)]" : "bg-card border-muted-foreground/30")}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <div className="w-[64px] h-[64px] max-[640px]:w-[60px] max-[640px]:h-[60px] rounded-xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {thumbUrl ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" /> : <FileText className="w-7 h-7 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 max-[640px]:gap-0.5 pt-0.5 leading-tight">
                      {doc.contractor && (
                        <div className="flex gap-1.5 flex-wrap mb-1.5 items-center">
                          {/* 소속 */}
                          {doc.affiliation && (
                            <span className="text-[12px] px-2.5 py-1 rounded-md bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-bold leading-none">
                              {doc.affiliation}
                            </span>
                          )}
                          {/* 원청사 */}
                          <span className="text-[12px] px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 font-bold leading-none">
                            {doc.contractor}
                          </span>
                        </div>
                      )}
                      {doc.contractor ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-text-sub shrink-0" />
                          <div className="text-[16px] font-[800] text-header-navy truncate flex-1 leading-tight">{doc.files[0]?.name || doc.title}</div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-text-sub shrink-0" />
                          <div className="text-[16px] font-[800] text-header-navy truncate flex-1 leading-tight">{doc.files[0]?.name || doc.title}</div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-text-sub leading-tight">
                        <span className="font-semibold">{doc.author}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{formatDateShort(doc.date)}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{normalizeVersion(doc.files[0]?.version || doc.version)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Blueprint Cards */}
          {isBlueprint && (
            <div className="space-y-3 max-[640px]:space-y-2.5">
              {filteredBlueprintSites.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-[60px] h-[60px] bg-muted rounded-full mb-5 max-[640px]:w-[48px] max-[640px]:h-[48px]">
                    <FileText className="w-6 h-6 max-[640px]:w-5 max-[640px]:h-5 text-muted-foreground opacity-60" />
                  </div>
                  <p className="text-base font-medium text-muted-foreground mb-2">
                    {search.trim() ? "검색 결과가 없습니다" : "등록된 도면이 없습니다"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {search.trim() ? "다른 키워드로 검색해보세요" : "상단 업로드 버튼을 눌러 도면을 추가해보세요"}
                  </p>
                </div>
              ) : displayedBlueprintSites.map(site => {
                const isSelected = blueprintSelectedIds.has(site.id);
                const latestHistory = site.history[0];

                return (
                  <div
                    key={site.id}
                    ref={(el) => { blueprintCardRefs.current[site.id] = el; }}
                    className={cn(
                      "bg-card rounded-2xl p-4 max-[640px]:p-3.5 cursor-pointer transition-all shadow-soft relative",
                      isSelected && "border-2 border-primary bg-sky-50/50",
                      highlightBlueprintKey === site.id && "ring-2 ring-sky-400 shadow-[0_0_0_4px_rgba(49,163,250,0.15)] animate-pulse"
                    )}
                  >
                    <span className="absolute top-0 right-0 text-[11px] font-bold px-2.5 py-1 text-white rounded-tr-xl rounded-bl-xl z-10 bg-blue-500">
                      도면 {site.totalDrawings}건
                    </span>

                    <div className="flex gap-3 max-[640px]:gap-2.5 items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBlueprintSelectedIds(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(site.id)) {
                              newSet.delete(site.id);
                            } else {
                              newSet.add(site.id);
                            }
                            return newSet;
                          });
                        }}
                        className={cn(
                          "w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected ? "bg-sky-500 border-sky-500 shadow-[0_2px_8px_rgba(14,165,233,0.3)]" : "bg-card border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </button>

                      <div className="w-[64px] h-[64px] max-[640px]:w-[60px] max-[640px]:h-[60px] rounded-xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        <FileText className="w-6 h-6 max-[640px]:w-5 max-[640px]:h-5 text-blue-500" />
                      </div>

                      <div
                        className="flex-1 min-w-0 flex flex-col gap-1 max-[640px]:gap-0.5 pt-0.5 leading-tight"
                        onClick={() => setBlueprintDetailModal({ isOpen: true, blueprintKey: site.id })}
                      >
                        {/* Site info badges */}
                        <div className="flex gap-1.5 flex-wrap mb-1.5">
                          {site.siteSource === "custom" && (
                            <span className="text-[12px] px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold inline-flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              직접입력
                            </span>
                          )}
                          {site.affiliation && <span className="text-[12px] px-2.5 py-0.5 rounded-md bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-semibold">{site.affiliation}</span>}
                          {site.contractor && <span className="text-[12px] px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 border border-indigo-200 font-semibold">{site.contractor}</span>}
                        </div>

                        {/* Site name */}
                        <div className="text-[16px] font-[800] text-header-navy truncate leading-tight">{site.siteName}</div>

                        {/* Meta info */}
                        <div className="text-[13px] font-medium text-text-sub leading-tight">
                          {formatDateShort(site.lastUpdated)} <span className="text-muted-foreground">|</span> v{site.currentVersion}
                        </div>

                        {/* Latest summary */}
                        <div className="text-[13px] font-medium text-muted-foreground truncate leading-tight">
                          {latestHistory.author} | {latestHistory.component} | {latestHistory.process}
                        </div>
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
        <div className="fixed bottom-[calc(65px+14px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[5000] w-[calc(100%-32px)] max-w-[420px] animate-fade-in">
          <div className="bg-card rounded-xl px-2 py-2 grid grid-cols-3 gap-2 border border-gray-200">
            <button
              type="button"
              onClick={handleBatchDownload}
              disabled={batchBusy}
              className="flex-1 h-[44px] rounded-lg bg-header-navy text-[14px] font-bold text-white transition-all duration-200 hover:bg-header-navy/90 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              저장
            </button>

            <button
              type="button"
              onClick={handleBatchShare}
              disabled={batchBusy}
              className="flex-1 h-[44px] rounded-lg bg-header-navy text-[14px] font-bold text-white transition-all duration-200 hover:bg-header-navy/90 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              공유
            </button>

            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={batchBusy}
              className="flex-1 h-[44px] rounded-lg bg-red-500 text-[14px] font-bold text-white transition-all duration-200 hover:bg-red-600 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" strokeWidth={2.5} />
              삭제
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      {!detailGroupId && tabKey !== "회사서류" && (
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
          <div className="fixed inset-0 bg-black/40 z-[2100]" onClick={closeUploadSheet} />
          <div className="fixed bottom-0 left-0 right-0 w-full max-w-[600px] mx-auto bg-card border-t border-border z-[2200] rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto overscroll-contain animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] font-bold text-foreground">{isBlueprint ? '도면 등록' : '자료 등록'}</h3>
              <button onClick={closeUploadSheet} className="bg-transparent border-none cursor-pointer text-foreground p-1"><X className="w-6 h-6" /></button>
            </div>
            
            {isBlueprint ? (
              <>
                <div className="mb-4">
                  <label className="block text-[15px] font-semibold text-text-sub mb-2">현장명 *</label>
                  <input 
                    type="text" 
                    placeholder="현장명을 입력하세요" 
                    value={blueprintUploadData.siteName}
                    onChange={(e) => setBlueprintUploadData(prev => ({ ...prev, siteName: e.target.value }))}
                    className="w-full h-[50px] px-4 rounded-xl border border-border bg-card text-[18px] text-foreground placeholder:text-muted-foreground transition-all hover:bg-card hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none" 
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBlueprintUploadData(prev => ({ ...prev, siteIsCustom: !prev.siteIsCustom }))}
                      className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground"
                      aria-pressed={blueprintUploadData.siteIsCustom}
                    >
                      <span
                        className={cn(
                          "relative inline-flex h-6 w-10 items-center rounded-full p-0.5 transition-colors",
                          blueprintUploadData.siteIsCustom ? "bg-sky-500" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full bg-white shadow transition-transform",
                            blueprintUploadData.siteIsCustom ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </span>
                      직접 입력 현장 (기존 현장과 분리 저장)
                    </button>
                  </div>
                  {blueprintUploadData.siteIsCustom && (
                    <div className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
                      신규 현장명만 직접입력으로 분리 저장됩니다.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 max-[520px]:grid-cols-1">
                  <div>
                    <label className="block text-[15px] font-semibold text-text-sub mb-2">소속 *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="선택 또는 직접 입력"
                        value={blueprintUploadData.affiliation}
                        onChange={(e) => {
                          setBlueprintUploadData(prev => ({ ...prev, affiliation: e.target.value }));
                          setBpAffOpen(true);
                        }}
                        onFocus={() => setBpAffOpen(true)}
                        onBlur={() => setTimeout(() => setBpAffOpen(false), 120)}
                        className="w-full h-[50px] px-4 pr-14 rounded-xl border border-border bg-card text-[18px] text-foreground placeholder:text-muted-foreground transition-all hover:bg-card hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none"
                      />
                      {blueprintUploadData.affiliation && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setBlueprintUploadData(prev => ({ ...prev, affiliation: '' }))}
                          className="absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[12px] text-muted-foreground z-10"
                          aria-label="소속 지우기"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setBpAffOpen(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        aria-label="소속 옵션 열기"
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </button>
                      {bpAffOpen && (
                        <ul className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-56 overflow-auto bg-card border border-border rounded-xl shadow-lg">
                          {bpAffiliationOptions
                            .filter(opt => matchKo(opt, blueprintUploadData.affiliation))
                            .map(opt => (
                              <li
                                key={opt}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setBlueprintUploadData(prev => ({ ...prev, affiliation: opt }));
                                  setBpAffOpen(false);
                                }}
                                className="px-4 py-3 cursor-pointer border-b border-border last:border-0 text-[15px] font-medium text-foreground hover:bg-muted"
                              >
                                {opt}
                              </li>
                            ))}
                          {bpAffiliationOptions.filter(opt => matchKo(opt, blueprintUploadData.affiliation)).length === 0 && (
                            <li className="px-4 py-3 text-center text-sm text-muted-foreground">검색 결과가 없습니다</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[15px] font-semibold text-text-sub mb-2">원청사 *</label>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={["직영", "본사"].includes(blueprintUploadData.affiliation.trim())}
                        onClick={() => setBpContractorOpen(v => !v)}
                        className={cn(
                          "w-full h-[50px] px-4 rounded-xl border border-border bg-card text-[18px] text-foreground transition-all hover:bg-card hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none flex items-center justify-between gap-2",
                          ["직영", "본사"].includes(blueprintUploadData.affiliation.trim()) && "opacity-70 cursor-not-allowed hover:border-border"
                        )}
                      >
                        <span className={cn("truncate text-left", !blueprintUploadData.contractorPreset && "text-muted-foreground")}>
                          {blueprintUploadData.contractorPreset || "원청사 선택"}
                        </span>
                        {["직영", "본사"].includes(blueprintUploadData.affiliation.trim()) ? (
                          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      {bpContractorOpen && !["직영", "본사"].includes(blueprintUploadData.affiliation.trim()) && (
                        <ul className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-56 overflow-auto bg-card border border-border rounded-xl shadow-lg">
                          {bpContractorOptions.map(opt => (
                            <li
                              key={opt}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setBlueprintUploadData(prev => ({
                                  ...prev,
                                  contractorPreset: opt,
                                  contractorCustom: opt === "기타" ? prev.contractorCustom : ''
                                }));
                                setBpContractorOpen(false);
                              }}
                              className="px-4 py-3 cursor-pointer border-b border-border last:border-0 text-[15px] font-medium text-foreground hover:bg-muted"
                            >
                              {opt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {blueprintUploadData.contractorPreset === "기타" && (
                      <input
                        type="text"
                        placeholder="원청사를 직접 입력하세요"
                        value={blueprintUploadData.contractorCustom}
                        onChange={(e) => setBlueprintUploadData(prev => ({ ...prev, contractorCustom: e.target.value }))}
                        className="mt-2 w-full h-[50px] px-4 rounded-xl border border-border bg-card text-[18px] text-foreground placeholder:text-muted-foreground transition-all hover:bg-card hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 max-[520px]:grid-cols-1">
                  <div>
                    <label className="block text-[15px] font-semibold text-text-sub mb-2">부재명 *</label>
                    <div className="flex flex-wrap gap-2">
                      {MEMBER_CHIPS.map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setBlueprintUploadData(prev => ({
                            ...prev,
                            componentPreset: chip,
                            componentCustom: chip === "기타" ? prev.componentCustom : ''
                          }))}
                          className={cn(
                            "h-10 px-3.5 rounded-full text-[14px] font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 border shadow-none focus:outline-none",
                            blueprintUploadData.componentPreset === chip
                              ? "bg-header-navy text-white border-transparent"
                              : "bg-white border-border text-[#64748b] hover:border-primary/50"
                          )}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    {blueprintUploadData.componentPreset === "기타" && (
                      <input
                        type="text"
                        placeholder="부재명을 입력하세요"
                        value={blueprintUploadData.componentCustom}
                        onChange={(e) => setBlueprintUploadData(prev => ({ ...prev, componentCustom: e.target.value }))}
                        className="mt-2 w-full h-[50px] px-4 rounded-xl border border-border bg-card text-[18px] text-foreground placeholder:text-muted-foreground transition-all hover:bg-card hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[15px] font-semibold text-text-sub mb-2">작업공정 *</label>
                    <div className="flex flex-wrap gap-2">
                      {PROCESS_CHIPS.map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setBlueprintUploadData(prev => ({
                            ...prev,
                            processPreset: chip,
                            processCustom: chip === "기타" ? prev.processCustom : ''
                          }))}
                          className={cn(
                            "h-10 px-3.5 rounded-full text-[14px] font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 border shadow-none focus:outline-none",
                            blueprintUploadData.processPreset === chip
                              ? "bg-header-navy text-white border-transparent"
                              : "bg-white border-border text-[#64748b] hover:border-primary/50"
                          )}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    {blueprintUploadData.processPreset === "기타" && (
                      <input
                        type="text"
                        placeholder="작업공정을 입력하세요"
                        value={blueprintUploadData.processCustom}
                        onChange={(e) => setBlueprintUploadData(prev => ({ ...prev, processCustom: e.target.value }))}
                        className="mt-2 w-full h-[50px] px-4 rounded-xl border border-border bg-card text-[18px] text-foreground placeholder:text-muted-foreground transition-all hover:bg-card hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none"
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  {/* PATCH START: site autocomplete (must select from list) */}
                  <label className="block text-[15px] font-semibold text-text-sub mb-2">현장명 *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="현장명을 선택해주세요"
                      value={uploadSiteQuery}
                      onChange={(e) => {
                        const next = e.target.value;
                        setUploadSiteQuery(next);
                        setUploadSiteError(null);
                        setUploadSiteDropdownOpen(true);
                        if (uploadSelectedSite && next !== uploadSelectedSite.site_name) {
                          setUploadSelectedSite(null);
                        }
                      }}
                      onFocus={() => setUploadSiteDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setUploadSiteDropdownOpen(false), 120)}
                      className="w-full h-[50px] px-4 pr-14 rounded-xl border border-border bg-card text-[18px] text-foreground placeholder:text-muted-foreground transition-all hover:bg-card hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)] outline-none"
                      aria-invalid={!uploadSelectedSite && !!uploadSiteError}
                    />
                    {uploadSiteQuery && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setUploadSiteQuery("");
                          setUploadSelectedSite(null);
                          setUploadSiteError(null);
                          setUploadSiteDropdownOpen(false);
                        }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[12px] text-muted-foreground z-10"
                        aria-label="현장명 지우기"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setUploadSiteDropdownOpen(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      aria-label="현장 목록 열기"
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </button>

                    {uploadSiteDropdownOpen && uploadSiteQuery.trim().length >= 2 && (
                      <ul className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-60 overflow-auto bg-card border border-border rounded-xl shadow-lg">
                        {filteredUploadSites.map(site => (
                          <li
                            key={site.site_id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setUploadSelectedSite(site);
                              setUploadSiteQuery(site.site_name);
                              setUploadSiteDropdownOpen(false);
                              setUploadSiteError(null);
                            }}
                            className="px-4 py-3.5 cursor-pointer border-b border-border last:border-0 text-[15px] font-medium text-foreground hover:bg-muted"
                          >
                            {site.site_name}
                          </li>
                        ))}
                        {filteredUploadSites.length === 0 && (
                          <li className="px-4 py-3 text-center text-sm text-muted-foreground">
                            검색 결과가 없습니다
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  {/* PATCH START: only show warning after user interaction */}
                  {(!uploadSelectedSite && (uploadSiteQuery.trim().length > 0 || !!uploadSiteError)) && (
                    <div className="mt-2 text-[12px] font-semibold text-red-600">
                      {uploadSiteError || "현장명을 선택해주세요"}
                    </div>
                  )}
                  {/* PATCH END */}
                  {/* PATCH END */}
                </div>
                <div className="mb-4">
                  <label className="block text-[15px] font-semibold text-text-sub mb-2">등록일</label>
                  {/* PATCH START: controlled date input */}
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full h-[50px] px-4 rounded-xl border border-border bg-card text-[18px] text-foreground outline-none transition-all focus:border-sky-500"
                  />
                  {/* PATCH END */}
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.hwp,.xls,.xlsx,.ppt,.pptx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50 text-[15px] font-extrabold text-sky-700 transition-colors hover:bg-sky-100 active:scale-[0.98] mb-4"
            >
              <FileUp className="h-5 w-5" />
              파일 선택 (다중 가능)
            </button>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mb-6">
                <div className="text-sm font-semibold text-text-sub mb-2">선택된 파일 ({selectedFiles.length})</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-card border border-border rounded-lg p-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-text-sub shrink-0" />
                        <span className="text-sm text-foreground truncate">{file.name}</span>
                        <span className="text-xs text-text-sub shrink-0">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors shrink-0"
                      >
                        <X className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={closeUploadSheet} className="flex-1 h-[50px] rounded-xl bg-gray-200 text-[15px] font-bold text-gray-700 transition-all sm:text-base">취소</button>
              {/* PATCH START: disable submit until a site is selected (non-blueprint) */}
              <button
                onClick={isBlueprint ? handleBlueprintUpload : handleUpload}
                disabled={batchBusy || (!isBlueprint && !canSubmitUpload)}
                className={cn(
                  "flex-1 h-[50px] rounded-xl bg-header-navy text-[15px] font-bold text-header-navy-foreground transition-all sm:text-base",
                  (batchBusy || (!isBlueprint && !canSubmitUpload)) && "opacity-50 cursor-not-allowed"
                )}
              >
                등록하기
              </button>
              {/* PATCH END */}
            </div>
          </div>
        </>
      )}

      {/* Blueprint Detail Modal */}
      {blueprintDetailModal.isOpen && blueprintDetailModal.blueprintKey && blueprintDetail && (
        <Drawer.Root
          open={blueprintDetailModal.isOpen}
          onOpenChange={(open) => setBlueprintDetailModal(open ? blueprintDetailModal : { isOpen: false })}
          dismissible
          shouldScaleBackground
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[10000] mx-auto w-full max-w-[600px] rounded-t-3xl bg-card border border-border shadow-[0_-12px_40px_rgba(0,0,0,0.25)] outline-none">
              {/* Drag handle (swipe down to close) */}
              <div className="pt-3 pb-2 flex items-center justify-center">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
                <div className="min-w-0">
                  <h2 className="text-[18px] font-[800] text-foreground truncate">{blueprintDetail.siteName}</h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">도면 히스토리</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBlueprintDetailModal({ isOpen: false })}
                  className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors shrink-0"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Site Info */}
              <div className="px-5 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {blueprintDetail.siteSource === "custom" && (
                      <span className="text-[12px] px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold leading-none inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        직접입력
                      </span>
                    )}
                    {blueprintDetail.affiliation && (
                      <span className="text-[12px] px-2.5 py-1 rounded-md bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-bold leading-none">
                        {blueprintDetail.affiliation}
                      </span>
                    )}
                    {blueprintDetail.contractor && (
                      <span className="text-[12px] px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-500 border border-indigo-200 font-bold leading-none">
                        {blueprintDetail.contractor}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-muted-foreground whitespace-nowrap">
                    총 {blueprintDetail.totalDrawings}건 · v{blueprintDetail.currentVersion}
                  </div>
                </div>
              </div>

              {/* History Timeline */}
              <div className="px-5 pb-6 pt-4 max-h-[70vh] overflow-y-auto">
                {blueprintDetail.history.map((item, index) => (
                  <div key={item.id} className="relative">
                    {/* Timeline line */}
                    {index < blueprintDetail.history.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-full bg-border" />
                    )}

                    <div className="flex gap-4 pb-6">
                      {/* Timeline dot */}
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        v{item.version}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-foreground">{item.author}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">{formatDateShort(item.date)} {item.time}</span>
                        </div>

                        <div className="text-sm text-muted-foreground mb-3">
                          {item.component} · {item.process}
                        </div>

                        {/* Files */}
                        {item.files.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {item.files.map(file => (
                              <div key={file.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm truncate">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-1">
                          <button className="flex items-center gap-1 px-3 py-0.5 text-[14px] rounded-full bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] font-semibold hover:bg-[#bae6fd] hover:border-[#7dd3fc] transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                            마킹
                          </button>
                          <button className="flex items-center gap-1 px-3 py-0.5 text-[14px] rounded-full bg-indigo-50 text-indigo-500 border border-indigo-200 font-semibold hover:bg-indigo-100 hover:border-indigo-300 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                            보기
                          </button>
                          <button className="flex items-center gap-1 px-3 py-0.5 text-[14px] rounded-full bg-red-50 text-red-600 border border-red-200 font-semibold hover:bg-red-100 hover:border-red-300 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

      {/* PATCH START: report editor overlay UI */}
      {reportEditorOpen && reportModel && (
        <div id="reportEditorOverlay" className="fixed inset-0 bg-[#1e1e1e] z-[9999] flex flex-col max-w-[600px] mx-auto">
          <PreviewAppBar
            title={`${reportModel.title} · ${reportModel.siteName}`}
            onBack={closeReportEditor}
            onClose={closeReportEditor}
            onReset={resetReportEditor}
            onSave={generateReportPDF}
            titleClassName="max-w-[220px] truncate sm:max-w-[320px]"
            className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[10010]"
            style={{
              height: `calc(${REPORT_HEADER_PX}px + env(safe-area-inset-top))`,
              paddingTop: "env(safe-area-inset-top)",
              boxSizing: "border-box",
            }}
          />

          <PreviewControlBar
            onZoomOut={() => reportZoom.setScale(reportZoom.scale * 0.9)}
            onFit={toggleReportFit}
            onTogglePan={toggleReportPan}
            onZoomIn={() => reportZoom.setScale(reportZoom.scale * 1.1)}
            onShare={shareReport}
            panActive={reportPanMode}
            fitActive={reportFitMode === "width"}
            zoomOutDisabled={reportZoom.scale <= Math.max(reportZoom.fitScale || 0.5, 0.5) + 0.01}
            zoomInDisabled={reportZoom.scale >= 4}
            className="left-1/2 -translate-x-1/2 max-w-[560px]"
          />

          <input
            ref={reportPhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onReportPhotoChange}
          />

          <div
            className="bg-[#333] relative overflow-hidden flex-1"
            style={{
              paddingTop: `calc(${REPORT_HEADER_PX}px + env(safe-area-inset-top))`,
              paddingBottom: `calc(${REPORT_CONTROLBAR_PX}px + env(safe-area-inset-bottom) + 20px)`,
            }}
          >
            <div
              ref={reportZoom.containerRef}
              className="w-full h-full flex items-start justify-center px-3 py-2"
              style={{
                touchAction: reportPanMode ? "none" : "pan-y",
                cursor: reportPanMode && reportZoom.canPan ? (reportZoom.isDragging ? "grabbing" : "grab") : "default",
              }}
              onWheel={onReportWheel}
              onMouseDown={reportPanMode ? reportZoom.onMouseDown : undefined}
              onMouseMove={reportPanMode ? reportZoom.onMouseMove : undefined}
              onMouseUp={reportPanMode ? reportZoom.onMouseUp : undefined}
              onMouseLeave={reportPanMode ? reportZoom.onMouseLeave : undefined}
              onTouchStart={reportPanMode ? reportZoom.onTouchStart : undefined}
              onTouchMove={reportPanMode ? reportZoom.onTouchMove : undefined}
              onTouchEnd={reportPanMode ? reportZoom.onTouchEnd : undefined}
              onDoubleClick={reportPanMode ? reportZoom.onDoubleClick : undefined}
            >
              <div
                className="w-full h-full flex items-start justify-center"
                style={{
                  transform: `translate(${reportZoom.position.x}px, ${reportZoom.position.y}px) scale(${reportZoom.scale})`,
                  transformOrigin: "top center",
                  willChange: "transform",
                }}
              >
                <div
                  key={`${reportModel.groupId}-${reportEditorRenderKey}`}
                  ref={(node) => {
                    reportContentRef.current = node;
                    reportZoom.contentRef.current = node;
                  }}
                  className="bg-white shadow-lg"
                  style={{
                    width: "210mm",
                    minHeight: "297mm",
                    padding: "20mm 10mm",
                    boxSizing: "border-box",
                  }}
                >
              <div className="text-center border-b-2 border-[#1a254f] pb-3 mb-4">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  data-report-meta="title"
                  onBlur={flushReportEditsToState}
                  className="text-[24px] font-[800] text-[#1a254f] outline-none"
                >
                  {reportModel.title}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  data-report-meta="siteName"
                  onBlur={flushReportEditsToState}
                  className="text-[14px] text-[#666] mt-1 outline-none"
                >
                  {reportModel.siteName}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  data-report-meta="date"
                  onBlur={flushReportEditsToState}
                  className="text-[12px] text-[#666] mt-0.5 outline-none"
                >
                  {reportModel.date}
                </div>
              </div>

              <table className="w-full border-collapse text-[12px] [table-layout:fixed] [&_th]:align-middle [&_td]:align-middle [&_th]:box-border [&_td]:box-border [&_th]:leading-[1.4] [&_td]:leading-[1.4] [&_td]:break-words [&_td]:whitespace-pre-wrap">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 w-10">NO</th>
                    <th className="border border-slate-300 p-2 w-24">위치</th>
                    <th className="border border-slate-300 p-2">지적 내용</th>
                    <th className="border border-slate-300 p-2 w-[88px]">조치 전</th>
                    <th className="border border-slate-300 p-2 w-[88px]">조치 후</th>
                    <th className="border border-slate-300 p-2 w-16">상태</th>
                  </tr>
                </thead>
                <tbody ref={reportTableBodyRef} id="reportTableBody">
                  {reportModel.rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 align-middle">
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          data-report-edit="1"
                          data-item-id={row.id}
                          data-field="location"
                          className="min-h-[18px] outline-none"
                        >
                          {row.location || ""}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2 align-middle">
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          data-report-edit="1"
                          data-item-id={row.id}
                          data-field="issue"
                          className="min-h-[18px] outline-none"
                        >
                          {row.issue || ""}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2 text-center align-middle">
                        <div className="relative">
                          <button
                            type="button"
                            data-no-pan="1"
                            disabled={reportIsApproved}
                            onClick={() => openReportPhotoPicker(row.id, "beforePhoto")}
                            className={cn(
                              "w-full h-[64px] flex items-center justify-center bg-transparent border-none p-0",
                              reportIsApproved ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                            )}
                          >
                            {row.beforePhoto ? (
                              <img src={row.beforePhoto} alt="before" className="w-full max-h-[64px] h-auto object-contain rounded" />
                            ) : (
                              <span className="text-slate-400 text-[11px]">사진 추가</span>
                            )}
                          </button>
                          {row.beforePhoto && !reportIsApproved && (
                            <button
                              type="button"
                              data-no-pan="1"
                              data-report-remove="1"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearReportPhoto(row.id, "beforePhoto");
                              }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2 text-center align-middle">
                        <div className="relative">
                          <button
                            type="button"
                            data-no-pan="1"
                            disabled={reportIsApproved}
                            onClick={() => openReportPhotoPicker(row.id, "afterPhoto")}
                            className={cn(
                              "w-full h-[64px] flex items-center justify-center bg-transparent border-none p-0",
                              reportIsApproved ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                            )}
                          >
                            {row.afterPhoto ? (
                              <img src={row.afterPhoto} alt="after" className="w-full max-h-[64px] h-auto object-contain rounded" />
                            ) : (
                              <span className="text-slate-400 text-[11px]">사진 추가</span>
                            )}
                          </button>
                          {row.afterPhoto && !reportIsApproved && (
                            <button
                              type="button"
                              data-no-pan="1"
                              data-report-remove="1"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearReportPhoto(row.id, "afterPhoto");
                              }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{statusLabel(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
      {/* PATCH END */}
    </div>
  );
}

// ─── Optimized Preview Modal ───
interface PreviewModalProps {
  file: DocFile;
  title: string;
  onClose: () => void;
}

function PreviewModal({ file, title, onClose }: PreviewModalProps) {
  const isImage = file.type === "img";
  const zoom = useZoomPan<HTMLImageElement>({ minScale: 0.5, maxScale: 4, autoFit: true });

  // Handle keyboard events (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isImage) return;
    const handle = () => zoom.recalcFit();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [isImage, zoom.recalcFit]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm">
      {/* Header */}
      <div data-no-pan="1" className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-none">{title}</h3>
              <p className="text-sm text-white/70">{file.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        ref={zoom.containerRef}
        className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-16 overflow-hidden"
        style={{ touchAction: isImage ? "none" : "auto" }}
        onWheel={isImage ? zoom.onWheel : undefined}
        onMouseDown={isImage ? zoom.onMouseDown : undefined}
        onMouseMove={isImage ? zoom.onMouseMove : undefined}
        onMouseUp={isImage ? zoom.onMouseUp : undefined}
        onMouseLeave={isImage ? zoom.onMouseLeave : undefined}
        onTouchStart={isImage ? zoom.onTouchStart : undefined}
        onTouchMove={isImage ? zoom.onTouchMove : undefined}
        onTouchEnd={isImage ? zoom.onTouchEnd : undefined}
        onDoubleClick={isImage ? zoom.onDoubleClick : undefined}
      >
        {isImage ? (
          <img
            ref={zoom.contentRef}
            src={file.url}
            alt={file.name}
            className="select-none max-w-none max-h-none object-contain"
            style={{
              transform: `translate(${zoom.position.x}px, ${zoom.position.y}px) scale(${zoom.scale})`,
              transformOrigin: "center center",
              cursor: zoom.canPan ? (zoom.isDragging ? "grabbing" : "grab") : "default",
            }}
            draggable={false}
            onLoad={() => zoom.recalcFit()}
          />
        ) : (
          <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">{file.name}</p>
              <p className="text-sm text-gray-500 mb-4">이 파일 형식은 미리보기를 지원하지 않습니다</p>
              <button
                onClick={() => window.open(file.url, "_blank", "noopener,noreferrer")}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                외부에서 열기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {isImage && (
        <div data-no-pan="1" className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex items-center justify-center gap-4 text-white">
            <button
              data-no-pan="1"
              onClick={() => zoom.setScale(zoom.scale * 0.85)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              disabled={zoom.scale <= Math.max(zoom.fitScale, 0.5) + 0.01}
            >
              <span className="text-lg font-bold">-</span>
            </button>

            <span className="text-sm font-medium min-w-[60px] text-center">
              {Math.round((zoom.scale / (zoom.fitScale || 1)) * 100)}%
            </span>

            <button
              data-no-pan="1"
              onClick={() => zoom.setScale(zoom.scale * 1.15)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              disabled={zoom.scale >= 4}
            >
              <span className="text-lg font-bold">+</span>
            </button>

            <button
              data-no-pan="1"
              onClick={() => zoom.reset()}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="화면맞춤"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
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
  // PATCH START: report overlay trigger
  onOpenReport: (groupId?: string) => void;
  // PATCH END
  onUpdateField: (itemId: string, field: keyof PunchItem, value: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: () => void;
  onPhotoUpload: (itemId: string, photoType: 'beforePhoto' | 'afterPhoto') => void;
}

function PunchDetailView({ group, isApproved, onBack, onOpenReport, onUpdateField, onDeleteItem, onAddItem, onPhotoUpload }: PunchDetailProps) {
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
        {/* PATCH START: connect report button */}
        <button
          className="bg-muted text-text-sub border border-border rounded-lg px-3 py-1.5 text-[14px] font-bold cursor-pointer hover:bg-card transition-colors whitespace-nowrap"
          onClick={() => onOpenReport(group.id)}
        >
          보고서
        </button>
        {/* PATCH END */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <div className="p-4 rounded-2xl text-center flex flex-col gap-1.5 shadow-soft bg-sky-50 text-sky-600 border border-sky-400">
          <span className="text-[24px] font-[800] leading-tight tracking-tight">{totalCount}</span>
          <span className="text-[14px] font-bold opacity-90 text-sky-700">전체</span>
        </div>
        <div className="p-4 rounded-2xl text-center flex flex-col gap-1.5 shadow-soft bg-red-50 text-red-600 border border-red-400">
          <span className="text-[24px] font-[800] leading-tight tracking-tight">{openCount}</span>
          <span className="text-[14px] font-bold opacity-90 text-red-700">미조치</span>
        </div>
        <div className="p-4 rounded-2xl text-center flex flex-col gap-1.5 shadow-soft bg-slate-50 text-slate-600 border border-slate-400">
          <span className="text-[24px] font-[800] leading-tight tracking-tight">{doneCount}</span>
          <span className="text-[14px] font-bold opacity-90 text-slate-500">완료</span>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <FileText className="w-[20px] h-[20px] text-header-navy" />
        <h3 className="text-[20px] font-bold text-header-navy">조치 내역 ({totalCount})</h3>
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
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50 text-[15px] font-extrabold text-sky-700 transition-colors hover:bg-sky-100 active:scale-[0.98] mt-4"
        >
          <FileUp className="h-5 w-5" />
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
  const issueRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = issueRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [item.issue]);

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
    <div className="bg-white rounded-xl p-5 relative shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all">
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
        <MapPinIcon className="w-4 h-4 text-text-sub shrink-0" />
        <input
          type="text"
          value={item.location || ''}
          placeholder="위치 (예: 101동 302호)"
          onChange={e => onUpdateField(item.id, 'location', e.target.value)}
          readOnly={isApproved}
          className={cn(
            // Same tone as the "A동 1층" style (compact, bold, subdued)
            "text-[17px] font-bold text-text-sub bg-transparent p-0 border-none outline-none flex-1 min-w-0 truncate",
            isApproved && "pointer-events-none opacity-70"
          )}
        />
      </div>

      {/* Issue */}
      <textarea
        ref={issueRef}
        value={item.issue || ''}
        placeholder="지적 내용을 상세히 입력하세요..."
        onChange={e => {
          onUpdateField(item.id, 'issue', e.target.value);
          // Auto-grow to content (keeps 1-line height initially, expands as needed).
          const el = issueRef.current;
          if (el) {
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }
        }}
        readOnly={isApproved}
        rows={1}
        className={cn(
          "w-full text-[15px] font-medium text-foreground bg-transparent border-none outline-none resize-none leading-snug min-h-[28px] p-0 mb-3 overflow-y-auto transition-all",
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
        <div className="flex bg-slate-100 rounded-full p-0.5 shrink-0 w-[calc(50%-4px)] min-w-[120px]">
          {statuses.map(s => (
            <button
              key={s.key}
              onClick={() => !isApproved && onUpdateField(item.id, 'status', s.key)}
              className={cn(
                "py-1 px-2 rounded-full text-[11px] font-bold border-none cursor-pointer transition-all min-h-[28px] flex-1 whitespace-nowrap",
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
