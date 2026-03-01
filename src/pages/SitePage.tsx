import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search, MapPin, ChevronDown, ChevronUp, Pin, PinOff, Phone, Ruler,
  Camera, FileCheck2, ClipboardList, CheckCircle2, X, Map as MapIcon, Copy, Pencil, Upload, Eye, Download, Share2, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWorklogs } from "@/hooks/useSupabaseWorklogs";
import { usePunchGroups } from "@/hooks/useSupabasePunch";
import { useUserRole } from "@/hooks/useUserRole";
import { useSiteLodging } from "@/hooks/useSiteLodging";
import PartnerSitePage from "@/components/partner/PartnerSitePage";
import { getPhotosForSite, getDrawingsForSite } from "@/lib/worklogStore";
import type { WorklogEntry } from "@/lib/worklogStore";
import type { PunchGroup } from "@/lib/punchStore";
import DocumentViewer, { WorklogDocument, PhotoGrid, A4Page } from "@/components/viewer/DocumentViewer";
import { copyText, openAddressInMaps } from "@/lib/mapLinks";

type SiteStatus = "all" | "ing" | "wait" | "done";
type SortType = "latest" | "name";

interface SiteData {
  id: number;
  siteDbId?: string | null;
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
  {
    id: 1,
    name: "SITE A",
    addr: "Daegu 149",
    lodge: "Daegu 123-45",
    status: "ing",
    affil: "Daegu",
    manager: "Manager A",
    safety: "Safety A",
    phoneM: "010-1234-5678",
    phoneS: "010-9876-5432",
    days: 245,
    mp: 3,
    pinned: true,
    lastDate: "2025-12-09",
    lastTime: "10:30",
    hasDraw: true,
    hasPhoto: true,
    hasPTW: true,
    hasLog: true,
    hasPunch: true,
    ptw: { title: "PTW", status: "approved", pages: 2 },
    workLog: { title: "Worklog", status: "saved", pages: 3 },
    punch: { title: "Punch", status: "in_progress", pages: 1 },
    images: ["sample1.jpg", "sample2.jpg"],
    drawings: {
      construction: [{ name: "floor1.pdf" }, { name: "floor2.pdf" }],
      progress: [{ name: "progress_01.jpg", type: "img" }],
      completion: [{ name: "final.pdf" }],
    },
  },
  {
    id: 2,
    name: "SITE B",
    addr: "Pyeongtaek 1",
    lodge: "Pyeongtaek 123",
    status: "done",
    affil: "Pyeongtaek",
    manager: "Manager B",
    safety: "Safety B",
    phoneM: "010-1111-2222",
    phoneS: "010-3333-4444",
    days: 120,
    mp: 1,
    pinned: false,
    lastDate: "2025-12-05",
    lastTime: "18:20",
    hasDraw: true,
    hasPhoto: true,
    hasPTW: true,
    hasLog: true,
    hasPunch: true,
    ptw: { title: "PTW", status: "approved", pages: 2 },
    workLog: { title: "Worklog", status: "saved", pages: 3 },
    punch: { title: "Punch", status: "in_progress", pages: 1 },
    images: ["sample1.jpg"],
    drawings: {
      construction: [{ name: "layout.pdf" }],
      progress: [],
      completion: [{ name: "final.pdf" }],
    },
  },
  {
    id: 3,
    name: "SITE C",
    addr: "",
    lodge: "",
    status: "wait",
    affil: "HQ",
    manager: "Manager C",
    safety: "Safety C",
    phoneM: "010-5555-6666",
    phoneS: "010-7777-8888",
    days: 15,
    mp: 0,
    pinned: false,
    lastDate: "2025-12-03",
    lastTime: "14:00",
    hasDraw: false,
    hasPhoto: false,
    hasPTW: false,
    hasLog: false,
    hasPunch: false,
    images: [],
    drawings: { construction: [], progress: [], completion: [] },
  },
  {
    id: 4,
    name: "TEST SITE 4",
    addr: "",
    lodge: "",
    status: "ing",
    affil: "direct",
    manager: "",
    safety: "",
    phoneM: "",
    phoneS: "",
    days: 10,
    mp: 0,
    pinned: false,
    lastDate: "2025-12-01",
    lastTime: "09:00",
    hasDraw: false,
    hasPhoto: false,
    hasPTW: false,
    hasLog: false,
    hasPunch: false,
    images: [],
    drawings: { construction: [], progress: [], completion: [] },
  },
  {
    id: 5,
    name: "TEST SITE 5",
    addr: "",
    lodge: "",
    status: "ing",
    affil: "direct",
    manager: "",
    safety: "",
    phoneM: "",
    phoneS: "",
    days: 11,
    mp: 0,
    pinned: false,
    lastDate: "2025-12-01",
    lastTime: "09:00",
    hasDraw: false,
    hasPhoto: false,
    hasPTW: false,
    hasLog: false,
    hasPunch: false,
    images: [],
    drawings: { construction: [], progress: [], completion: [] },
  },
];
const STATUS_CONFIG = {
  ing: { label: "In Progress", className: "bg-blue-500 text-white" },
  wait: { label: "Planned", className: "bg-indigo-500 text-white" },
  done: { label: "Done", className: "bg-muted-foreground text-white" },
};

const FILTERS: { key: SiteStatus; label: string; chipClass: string }[] = [
  { key: "all", label: "All", chipClass: "status-all" },
  { key: "ing", label: "In Progress", chipClass: "status-ing" },
  { key: "wait", label: "Planned", chipClass: "status-wait" },
  { key: "done", label: "Done", chipClass: "status-done" },
];
type SiteDrawingKind = "original" | "marked" | "final";
type SiteDrawingSource = "linked" | "upload" | "approved";

interface SiteDrawingAsset {
  id: string;
  name: string;
  url: string;
  kind: SiteDrawingKind;
  source: SiteDrawingSource;
  createdAt: string;
}

interface SitePhotoAsset {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

type SiteDrawingStore = Record<string, SiteDrawingAsset[]>;
const SITE_DRAWING_STORE_KEY = "inopnc_site_drawings_v1";

declare global {
  interface Window {
    daum?: any;
  }
}

let postcodeLoader: Promise<void> | null = null;

function loadDaumPostcode(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.daum?.Postcode) return Promise.resolve();
  if (postcodeLoader) return postcodeLoader;
  postcodeLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("postcode load failed"));
    document.head.appendChild(script);
  });
  return postcodeLoader;
}

async function openDaumPostcode(): Promise<string> {
  await loadDaumPostcode();
  return await new Promise((resolve) => {
    if (!window.daum?.Postcode) return resolve("");
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        resolve(data?.roadAddress || data?.address || data?.jibunAddress || "");
      },
      onclose: () => resolve(""),
    }).open();
  });
}

function readSiteDrawingStore(): SiteDrawingStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(SITE_DRAWING_STORE_KEY) || "{}");
    if (!raw || typeof raw !== "object") return {};
    return raw as SiteDrawingStore;
  } catch {
    return {};
  }
}

function writeSiteDrawingStore(store: SiteDrawingStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SITE_DRAWING_STORE_KEY, JSON.stringify(store));
}

function siteDrawingKey(site: SiteData) {
  return site.siteDbId || site.name;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(String(ev.target?.result || ""));
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

function buildDrawingPlaceholder(name: string) {
  const safe = encodeURIComponent(name || "?⑤벊沅?袁ⓦ늺 ?癒?궚");
  return `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='700'%3E%3Crect width='1000' height='700' fill='%23ffffff'/%3E%3Crect x='18' y='18' width='964' height='664' fill='none' stroke='%231a254f' stroke-width='4'/%3E%3Ctext x='500' y='350' text-anchor='middle' font-family='sans-serif' font-size='32' fill='%231a254f'%3E${safe}%3C/text%3E%3C/svg%3E`;
}

function buildPhotoPlaceholder(name: string) {
  const safe = encodeURIComponent(name || "PHOTO");
  return `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='700'%3E%3Crect width='900' height='700' fill='%23f3f4f6'/%3E%3Crect x='18' y='18' width='864' height='664' fill='none' stroke='%231a254f' stroke-width='3'/%3E%3Ctext x='450' y='350' text-anchor='middle' font-family='sans-serif' font-size='30' fill='%231a254f'%3E${safe}%3C/text%3E%3C/svg%3E`;
}

function sanitizeFileName(name: string, fallback: string) {
  const trimmed = String(name || "").trim();
  const base = (trimmed || fallback || "file").replace(/[\\/:*?"<>|]+/g, "_");
  return base || "file";
}

function extFromMime(mime: string) {
  const value = (mime || "").toLowerCase();
  if (!value) return "";
  if (value.includes("png")) return "png";
  if (value.includes("jpeg") || value.includes("jpg")) return "jpg";
  if (value.includes("webp")) return "webp";
  if (value.includes("gif")) return "gif";
  if (value.includes("bmp")) return "bmp";
  if (value.includes("svg")) return "svg";
  if (value.includes("pdf")) return "pdf";
  return "";
}

async function blobFromUrl(url: string): Promise<Blob | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

function downloadBlobAsFile(blob: Blob, name: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
}

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
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerContent, setViewerContent] = useState<React.ReactNode>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSiteId, setSheetSiteId] = useState<number | null>(null);
  const drawingInputRef = useRef<HTMLInputElement | null>(null);
  const [drawingStore, setDrawingStore] = useState<SiteDrawingStore>(() => readSiteDrawingStore());
  const [drawingSelectMode, setDrawingSelectMode] = useState(false);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<Set<string>>(new Set());
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [photoSheetSiteId, setPhotoSheetSiteId] = useState<number | null>(null);
  const [photoSelectMode, setPhotoSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Search dropdown
  const [showDropdown, setShowDropdown] = useState(false);

  // Live worklog & punch data from Supabase
  const { data: worklogs = [] } = useWorklogs();
  const { data: allPunchGroups = [] } = usePunchGroups();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

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
      const siteDbId = siteLogs[0]?.siteValue || null;
      return {
        ...site,
        siteDbId,
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
  const sheetSite = useMemo(() => (sheetSiteId ? enrichedSites.find((s) => s.id === sheetSiteId) || null : null), [enrichedSites, sheetSiteId]);
  const sheetSiteKey = useMemo(() => (sheetSite ? siteDrawingKey(sheetSite) : ""), [sheetSite]);
  const sheetDrawings = useMemo(() => (sheetSiteKey ? (drawingStore[sheetSiteKey] || []) : []), [drawingStore, sheetSiteKey]);
  const markedDrawings = useMemo(() => sheetDrawings.filter((d) => d.kind === "marked"), [sheetDrawings]);
  const finalDrawings = useMemo(() => sheetDrawings.filter((d) => d.kind === "final"), [sheetDrawings]);
  const selectedDrawingAssets = useMemo(
    () => sheetDrawings.filter((asset) => selectedDrawingIds.has(asset.id)),
    [sheetDrawings, selectedDrawingIds],
  );
  const buildSitePhotoAssets = useCallback((site: SiteData): SitePhotoAsset[] => {
    const linked = site.siteDbId ? getPhotosForSite(site.siteDbId) : [];
    const linkedAssets = linked
      .filter((row) => !!row?.url)
      .map((row, idx) => ({
        id: `photo_${row.timestamp || Date.now()}_${idx}_${row.id}`,
        name: `??彛?${idx + 1}`,
        url: row.url,
        createdAt: row.timestamp || new Date().toISOString(),
      }));

    if (linkedAssets.length > 0) return linkedAssets;

    return (site.images || []).map((img, idx) => ({
      id: `photo_fallback_${site.id}_${idx}`,
      name: img || `??彛?${idx + 1}`,
      url: buildPhotoPlaceholder(img || `PHOTO ${idx + 1}`),
      createdAt: new Date().toISOString(),
    }));
  }, []);
  const photoSheetSite = useMemo(
    () => (photoSheetSiteId ? enrichedSites.find((s) => s.id === photoSheetSiteId) || null : null),
    [enrichedSites, photoSheetSiteId],
  );
  const photoSheetAssets = useMemo(
    () => (photoSheetSite ? buildSitePhotoAssets(photoSheetSite) : []),
    [photoSheetSite, buildSitePhotoAssets],
  );
  const selectedPhotoAssets = useMemo(
    () => photoSheetAssets.filter((asset) => selectedPhotoIds.has(asset.id)),
    [photoSheetAssets, selectedPhotoIds],
  );

  useEffect(() => {
    if (!sheetOpen) {
      setDrawingSelectMode(false);
      setSelectedDrawingIds(new Set());
    }
  }, [sheetOpen]);

  useEffect(() => {
    if (!photoSheetOpen) {
      setPhotoSelectMode(false);
      setSelectedPhotoIds(new Set());
    }
  }, [photoSheetOpen]);

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
    toast.success(sites.find(s => s.id === id)?.pinned ? "怨좎젙???댁젣?덉뒿?덈떎." : "?곷떒??怨좎젙?덉뒿?덈떎.");
  };

  const handlePhone = (num: string) => {
    if (!num || num.length < 5) { toast.error("?袁れ넅甕곕뜇?뉐첎? ??곷뮸??덈뼄"); return; }
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
    setDrawingSelectMode(false);
    setSelectedDrawingIds(new Set());
    setSheetOpen(true);
  };

  const openPhotoSheet = useCallback((siteId: number) => {
    setPhotoSheetSiteId(siteId);
    setPhotoSelectMode(false);
    setSelectedPhotoIds(new Set());
    setPhotoSheetOpen(true);
  }, []);

  const toggleDrawingSelect = useCallback((id: string) => {
    setSelectedDrawingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePhotoSelect = useCallback((id: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllDrawings = useCallback(() => {
    const ids = sheetDrawings.map((row) => row.id);
    if (ids.length === 0) return;
    setSelectedDrawingIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }, [sheetDrawings]);

  const toggleSelectAllPhotos = useCallback(() => {
    const ids = photoSheetAssets.map((row) => row.id);
    if (ids.length === 0) return;
    setSelectedPhotoIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }, [photoSheetAssets]);

  const prepareFiles = useCallback(async (assets: Array<{ name: string; url: string }>) => {
    const files: File[] = [];
    let skipped = 0;

    for (let idx = 0; idx < assets.length; idx += 1) {
      const asset = assets[idx];
      const blob = await blobFromUrl(asset.url);
      if (!blob) {
        skipped += 1;
        continue;
      }

      const safeName = sanitizeFileName(asset.name, `asset_${idx + 1}`);
      const hasExt = /\.[a-z0-9]{2,5}$/i.test(safeName);
      const ext = extFromMime(blob.type);
      const fileName = hasExt ? safeName : `${safeName}.${ext || "bin"}`;
      files.push(new File([blob], fileName, { type: blob.type || "application/octet-stream" }));
    }

    return { files, skipped };
  }, []);

  const downloadPreparedFiles = useCallback((files: File[]) => {
    files.forEach((file, idx) => {
      window.setTimeout(() => downloadBlobAsFile(file, file.name), idx * 140);
    });
  }, []);

  const sharePreparedFiles = useCallback(async (files: File[], title: string) => {
    if (files.length === 0) return false;
    const shareApi = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data?: ShareData) => boolean;
    };

    if (shareApi.share && shareApi.canShare?.({ files })) {
      try {
        await shareApi.share({ title, files });
        return true;
      } catch (error: any) {
        if (error?.name === "AbortError") return false;
        toast.error("공유에 실패했습니다. 저장으로 전환합니다.");
        downloadPreparedFiles(files);
        return false;
      }
    }

    toast("공유 미지원 환경입니다. 저장으로 전환합니다.");
    downloadPreparedFiles(files);
    return false;
  }, [downloadPreparedFiles]);
  const handleSaveSelectedDrawings = useCallback(async () => {
    if (selectedDrawingAssets.length === 0) return;
    const { files, skipped } = await prepareFiles(selectedDrawingAssets);
    if (files.length === 0) {
      toast.error("No drawable files to save.");
      return;
    }
    downloadPreparedFiles(files);
    toast.success(`${files.length} file(s) saved`);
    if (skipped > 0) toast.error(`${skipped} file(s) skipped`);
  }, [downloadPreparedFiles, prepareFiles, selectedDrawingAssets]);

  const handleShareSelectedDrawings = useCallback(async () => {
    if (selectedDrawingAssets.length === 0) return;
    const { files, skipped } = await prepareFiles(selectedDrawingAssets);
    if (files.length === 0) {
      toast.error("No drawable files to share.");
      return;
    }
    const shared = await sharePreparedFiles(files, `${sheetSite?.name || "Site"} Drawings`);
    toast.success(shared ? `${files.length} file(s) ready to share` : `${files.length} file(s) saved`);
    if (skipped > 0) toast.error(`${skipped} file(s) skipped`);
  }, [prepareFiles, selectedDrawingAssets, sharePreparedFiles, sheetSite?.name]);

  const handleSaveSelectedPhotos = useCallback(async () => {
    if (selectedPhotoAssets.length === 0) return;
    const { files, skipped } = await prepareFiles(selectedPhotoAssets);
    if (files.length === 0) {
      toast.error("No photo files to save.");
      return;
    }
    downloadPreparedFiles(files);
    toast.success(`${files.length} file(s) saved`);
    if (skipped > 0) toast.error(`${skipped} file(s) skipped`);
  }, [downloadPreparedFiles, prepareFiles, selectedPhotoAssets]);

  const handleShareSelectedPhotos = useCallback(async () => {
    if (selectedPhotoAssets.length === 0) return;
    const { files, skipped } = await prepareFiles(selectedPhotoAssets);
    if (files.length === 0) {
      toast.error("No photo files to share.");
      return;
    }
    const shared = await sharePreparedFiles(files, `${photoSheetSite?.name || "Site"} Photos`);
    toast.success(shared ? `${files.length} file(s) ready to share` : `${files.length} file(s) saved`);
    if (skipped > 0) toast.error(`${skipped} file(s) skipped`);
  }, [photoSheetSite?.name, prepareFiles, selectedPhotoAssets, sharePreparedFiles]);
  const openA3Preview = (title: string) => {
    setViewerTitle(title);
    setViewerContent(
      <img
        src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='850' height='600'%3E%3Crect width='850' height='600' fill='%23fff'/%3E%3Crect x='12' y='12' width='826' height='576' fill='none' stroke='%231a254f' stroke-width='6'/%3E%3Ctext x='425' y='300' font-family='sans-serif' font-size='34' text-anchor='middle'%3EA3 Sample Drawing%3C/text%3E%3C/svg%3E"
        style={{ width: 850, height: "auto", display: "block" }}
        alt="?袁ⓦ늺 沃섎챶?곮퉪?용┛"
      />
    );
    setViewerOpen(true);
    setSheetOpen(false);
  };

  const updateSiteDrawings = useCallback((key: string, updater: (prev: SiteDrawingAsset[]) => SiteDrawingAsset[]) => {
    setDrawingStore((prev) => {
      const nextSiteItems = updater(prev[key] || []);
      const nextStore = { ...prev, [key]: nextSiteItems };
      writeSiteDrawingStore(nextStore);
      return nextStore;
    });
  }, []);

  const openDrawingAssetPreview = useCallback((asset: SiteDrawingAsset) => {
    if (!sheetSite) return;
    const kindLabel = asset.kind === "original" ? "?⑤벊沅?袁ⓦ늺(?癒?궚)" : asset.kind === "final" ? "?袁⑥┷?袁ⓦ늺(筌ㅼ뮇伊?" : "筌띾뜇沅?袁ⓦ늺";
    setViewerTitle(`${sheetSite.name} 夷?${kindLabel}`);
    setViewerContent(
      <img
        src={asset.url}
        style={{ width: 850, height: "auto", display: "block" }}
        alt={asset.name || "?袁ⓦ늺 沃섎챶?곮퉪?용┛"}
      />
    );
    setViewerOpen(true);
    setSheetOpen(false);
  }, [sheetSite]);

  const onDrawingUploadChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.currentTarget.value = "";
    if (!sheetSite || !sheetSiteKey || files.length === 0) return;

    try {
      const urls = await Promise.all(files.map((f) => fileToDataUrl(f)));
      const now = new Date().toISOString();
      const assets: SiteDrawingAsset[] = urls.map((url, idx) => ({
        id: `marked_${Date.now()}_${idx}`,
        name: files[idx]?.name || `筌띾뜇沅?袁ⓦ늺 ${idx + 1}`,
        url,
        kind: "marked",
        source: "upload",
        createdAt: now,
      }));
      updateSiteDrawings(sheetSiteKey, (prev) => [...assets, ...prev]);
      toast.success(`${assets.length}揶?筌띾뜇沅?袁ⓦ늺?????館六??щ빍??`);
    } catch {
      toast.error("?袁ⓦ늺 ??낆쨮??뽯퓠 ??쎈솭??됰뮸??덈뼄.");
    }
  }, [sheetSite, sheetSiteKey, updateSiteDrawings]);

  const loadLinkedOriginalDrawings = useCallback(() => {
    if (!sheetSite || !sheetSiteKey) return;

    const linked = sheetSite.siteDbId ? getDrawingsForSite(sheetSite.siteDbId) : [];
    const now = new Date().toISOString();
    let assets: SiteDrawingAsset[] = linked
      .filter((d) => !!d.img)
      .map((d, idx) => ({
        id: `origin_${Date.now()}_${idx}`,
        name: `?⑤벊沅?袁ⓦ늺 ?癒?궚 ${idx + 1}`,
        url: d.img,
        kind: "original",
        source: "linked",
        createdAt: d.timestamp || now,
      }));

    if (assets.length === 0 && (sheetSite.drawings?.construction || []).length > 0) {
      assets = (sheetSite.drawings.construction || []).map((d: any, idx: number) => ({
        id: `origin_fallback_${Date.now()}_${idx}`,
        name: d?.name || `?⑤벊沅?袁ⓦ늺 ?癒?궚 ${idx + 1}`,
        url: buildDrawingPlaceholder(d?.name || `?⑤벊沅?袁ⓦ늺 ?癒?궚 ${idx + 1}`),
        kind: "original",
        source: "linked",
        createdAt: now,
      }));
    }

    if (assets.length === 0) {
      toast.error("?怨뺣짗???⑤벊沅?袁ⓦ늺 ?癒?궚????곷뮸??덈뼄.");
      return;
    }

    updateSiteDrawings(sheetSiteKey, (prev) => {
      const existingKeys = new Set(prev.map((p) => `${p.kind}:${p.url}`));
      const merged = assets.filter((a) => !existingKeys.has(`${a.kind}:${a.url}`));
      if (merged.length === 0) return prev;
      return [...merged, ...prev];
    });
    toast.success(`?怨뺣짗 ?癒?궚 ?袁ⓦ늺 ${assets.length}揶쏆뮆? ?븍뜄??遺용뮸??덈뼄.`);
  }, [sheetSite, sheetSiteKey, updateSiteDrawings]);

  const approveAsFinalDrawing = useCallback((asset: SiteDrawingAsset) => {
    if (!sheetSite || !sheetSiteKey) return;
    const approved: SiteDrawingAsset = {
      ...asset,
      id: `final_${Date.now()}`,
      kind: "final",
      source: "approved",
      name: `${asset.name.replace(/\s*\(Final\)$/, "")} (Final)`,
      createdAt: new Date().toISOString(),
    };
    updateSiteDrawings(sheetSiteKey, (prev) => [approved, ...prev]);
    toast.success("Saved as final drawing.");
  }, [sheetSite, sheetSiteKey, updateSiteDrawings]);
  const openCumulativeMarkedDrawings = useCallback(() => {
    if (!sheetSite) return;
    if (markedDrawings.length === 0) {
      toast.error("???貫留?筌띾뜇沅?袁ⓦ늺????곷뮸??덈뼄.");
      return;
    }
    setViewerTitle(`${sheetSite.name} 夷??袁⑹읅 筌띾뜇沅?袁ⓦ늺`);
    setViewerContent(
      <PhotoGrid
        photos={markedDrawings.map((d) => ({ url: d.url, date: d.createdAt.slice(0, 10) }))}
        siteName={sheetSite.name}
      />
    );
    setViewerOpen(true);
    setSheetOpen(false);
  }, [markedDrawings, sheetSite]);

  const openLatestFinalDrawing = useCallback(() => {
    const latest = [...finalDrawings].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latest) {
      toast.error("筌ㅼ뮇伊??諭????袁⑥┷?袁ⓦ늺????곷뮸??덈뼄.");
      return;
    }
    openDrawingAssetPreview(latest);
  }, [finalDrawings, openDrawingAssetPreview]);

  const openPhotoAssetPreview = useCallback((asset: SitePhotoAsset, siteName: string) => {
    setViewerTitle(`${siteName} ?ъ쭊 誘몃━蹂닿린`);
    setViewerContent(
      <img
        src={asset.url}
        style={{ width: 850, height: "auto", display: "block" }}
        alt={asset.name || "?ъ쭊 誘몃━蹂닿린"}
      />
    );
    setViewerOpen(true);
    setPhotoSheetOpen(false);
  }, []);

  const openPhotoViewer = useCallback((site: SiteData) => {
    const photos = buildSitePhotoAssets(site).map((item) => ({
      url: item.url,
      date: item.createdAt?.slice(0, 10),
    }));
    if (photos.length === 0) {
      toast.error("?깅줉???ъ쭊???놁뒿?덈떎.");
      return;
    }
    setViewerTitle(`${site.name} 쨌 ?ъ쭊?吏`);
    setViewerContent(<PhotoGrid photos={photos} siteName={site.name} />);
    setViewerOpen(true);
    setPhotoSheetOpen(false);
  }, [buildSitePhotoAssets]);

  const openDocViewer = (site: typeof enrichedSites[0], docType: "ptw" | "workLog" | "punch") => {
    const doc = site[docType];
    if (!doc) {
      toast.error("No document available.");
      return;
    }

    const typeLabels = {
      ptw: "PTW",
      workLog: "Worklog",
      punch: "Punch Report",
    } as const;

    if (docType === "workLog" && site.approvedLogs.length > 0) {
      const log = site.approvedLogs[0];
      setViewerTitle(`${site.name} · Worklog`);
      setViewerContent(<WorklogDocument entry={log} />);
      setViewerOpen(true);
      return;
    }

    if (docType === "punch" && site.sitePunchGroups && site.sitePunchGroups.length > 0) {
      const punchItems = site.sitePunchGroups.flatMap((g: PunchGroup) => g.punchItems || []);
      const openCount = punchItems.filter((i: any) => i.status !== "done").length;
      const doneCount = punchItems.filter((i: any) => i.status === "done").length;
      setViewerTitle(`${site.name} · Punch Report`);
      setViewerContent(
        <A4Page pageNum={1} totalPages={1}>
          <div className="text-center border-b-2 border-[#1a254f] pb-3 mb-4">
            <div className="text-[24px] font-[800] text-[#1a254f]">Punch Summary Report</div>
            <div className="text-[14px] text-[#666] mt-1">{site.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-sky-50 border border-sky-400 p-3 rounded-lg text-center">
              <div className="text-[20px] font-[900] text-sky-600">{punchItems.length}</div>
              <div className="text-[11px] font-bold text-sky-700">Total</div>
            </div>
            <div className="bg-red-50 border border-red-400 p-3 rounded-lg text-center">
              <div className="text-[20px] font-[900] text-red-600">{openCount}</div>
              <div className="text-[11px] font-bold text-red-700">Open</div>
            </div>
            <div className="bg-slate-50 border border-slate-400 p-3 rounded-lg text-center">
              <div className="text-[20px] font-[900] text-slate-600">{doneCount}</div>
              <div className="text-[11px] font-bold text-slate-500">Done</div>
            </div>
          </div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 w-10">NO</th>
                <th className="border border-slate-300 p-2 w-20">Location</th>
                <th className="border border-slate-300 p-2">Issue</th>
                <th className="border border-slate-300 p-2 w-16">Priority</th>
                <th className="border border-slate-300 p-2 w-16">Status</th>
              </tr>
            </thead>
            <tbody>
              {punchItems.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center">{item.location || "-"}</td>
                  <td className="border border-slate-300 p-2">{item.issue || "-"}</td>
                  <td className="border border-slate-300 p-2 text-center">{item.priority || "-"}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold">
                    {item.status === "done" ? "Done" : item.status === "ing" ? "In Progress" : "Open"}
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
          <div className="font-bold text-[#1a254f]">Document No</div>
          <div className="border-b border-[#ddd] py-1">DOC-2025-0001</div>
          <div className="font-bold text-[#1a254f]">Status</div>
          <div className="border-b border-[#ddd] py-1">{doc.status}</div>
          <div className="font-bold text-[#1a254f]">Site</div>
          <div className="border-b border-[#ddd] py-1">{site.name}</div>
        </div>
        <div className="flex-1 p-4 bg-[#f8fafc] rounded-lg flex items-center justify-center" style={{ minHeight: "100mm" }}>
          <span className="text-[#666]">Document preview</span>
        </div>
      </A4Page>
    );
    setViewerOpen(true);
  };
  const checkData = (site: typeof enrichedSites[0], type: string) => {
    if (type === "images") { openPhotoSheet(site.id); return; }
    if (type === "ptw" || type === "workLog" || type === "punch") {
      openDocViewer(site, type as "ptw" | "workLog" | "punch");
      return;
    }
    toast.error("?怨쀬뵠?怨? ??곷뮸??덈뼄");
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
            placeholder="Select site or search"
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
                <li className="p-4 text-muted-foreground text-center text-sm-app">野꺜??野껉퀗?드첎? ??곷뮸??덈뼄</li>
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
          <option value="latest">Latest</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Status Filters */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setVisibleCount(5); }}
            className={cn(
              "h-10 px-3.5 rounded-full text-sm-app font-medium whitespace-nowrap flex-shrink-0 border transition-all cursor-pointer flex items-center justify-center",
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
          <p className="text-base-app font-medium text-muted-foreground">野꺜??野껉퀗?드첎? ??곷뮸??덈뼄</p>
        </div>
      )}

      {/* Site Cards */}
      <div className="space-y-4">
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
              <div className="p-5 max-[640px]:p-4 border-b border-border relative">
                <span className={cn("absolute top-0 right-0 text-[11px] font-bold px-2.5 py-1 rounded-bl-xl z-10", statusConf.className)}>
                  {statusConf.label}
                </span>

                {site.lastDate && (
                  <div className="text-sm-app text-text-sub font-medium mb-1 max-[640px]:mb-0.5">
                    {site.lastDate} {site.lastTime ? `(筌ㅼ뮇伊?${site.lastTime})` : ""}
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[20px] max-[640px]:text-[18px] font-[800] text-header-navy flex-1 leading-snug" style={{ wordBreak: "keep-all" }}>{site.name}</h3>
                  <button onClick={e => togglePin(site.id, e)} className="bg-transparent border-none p-1 cursor-pointer ml-2">
                    {site.pinned ? <PinOff className="w-[22px] h-[22px] text-primary" /> : <Pin className="w-[22px] h-[22px] text-border" />}
                  </button>
                </div>

                {/* Sub info */}
                <div className="flex items-center justify-between mb-3 max-[640px]:mb-2">
                  <div className="flex gap-2 max-[640px]:gap-1.5 items-center flex-wrap min-w-0">
                    {/* only show contractor/company tag when not a direct-registration entry */}
                    {site.affil !== "direct" && (
                      <span className="text-[14px] max-[640px]:text-[13px] px-3 max-[640px]:px-2.5 h-[34px] max-[640px]:h-[30px] rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-500 font-semibold flex items-center">Contractor</span>
                    )}
                    <span className={cn(
                      "text-[14px] max-[640px]:text-[13px] px-3 max-[640px]:px-2.5 h-[34px] max-[640px]:h-[30px] rounded-lg border font-semibold flex items-center",
                      site.affil === "direct"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-sky-50 text-sky-600 border-sky-200"
                    )}>{site.affil}</span>
                  </div>
                  <div className="flex gap-1.5 max-[640px]:gap-1 items-center pl-2 border-l border-border ml-1">
                    <MapIcon className={cn("w-4 h-4 max-[640px]:w-[15px] max-[640px]:h-[15px] transition-colors", hasDraw ? "text-header-navy" : "text-border")} />
                    <Camera className={cn("w-4 h-4 max-[640px]:w-[15px] max-[640px]:h-[15px] transition-colors", hasPhoto ? "text-header-navy" : "text-border")} />
                    <FileCheck2 className={cn("w-4 h-4 max-[640px]:w-[15px] max-[640px]:h-[15px] transition-colors", hasPTW ? "text-header-navy" : "text-border")} />
                    <ClipboardList className={cn("w-4 h-4 max-[640px]:w-[15px] max-[640px]:h-[15px] transition-colors", hasLog ? "text-header-navy" : "text-border")} />
                    <CheckCircle2 className={cn("w-4 h-4 max-[640px]:w-[15px] max-[640px]:h-[15px] transition-colors", hasPunch ? "text-header-navy" : "text-border")} />
                  </div>
                </div>
                {/* Address */}
                <div className="flex items-center justify-between pt-1">
                  <div
                    className="flex items-center gap-1.5 flex-1 overflow-hidden cursor-pointer"
                    onClick={() => openAddressInMaps(site.addr, { label: "Site Address" })}
                  >
                    <MapPin className="w-4 h-4 text-text-sub flex-shrink-0" />
                    <span className={cn("text-base-app font-bold truncate", hasAddr ? "text-text-sub" : "text-muted-foreground")}>
                      {hasAddr ? site.addr : "No address"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      disabled={!hasAddr}
                      className={cn(
                        "w-9 h-9 max-[640px]:w-8 max-[640px]:h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-95",
                        hasAddr
                          ? "bg-muted border border-border text-text-sub"
                          : "border border-dashed border-muted-foreground/40 text-muted-foreground bg-transparent opacity-60 cursor-not-allowed"
                      )}
                      onClick={() => copyText(site.addr, "Site Address")}
                    >
                      <Copy className="w-[16px] h-[16px]" />
                    </button>
                    <button
                      disabled={!hasAddr}
                      className={cn(
                        "w-9 h-9 max-[640px]:w-8 max-[640px]:h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-95",
                        hasAddr
                          ? "bg-[hsl(219_100%_95%)] border border-[hsl(219_100%_90%)] text-[hsl(230_60%_30%)]"
                          : "border border-dashed border-muted-foreground/40 text-muted-foreground bg-transparent opacity-60 cursor-not-allowed"
                      )}
                      onClick={() => openAddressInMaps(site.addr, { label: "Site Address" })}
                    >
                      <MapPin className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {expanded && (
                <div className="p-5 max-[640px]:p-4 animate-slide-down bg-card">
                  {/* Manager + Safety */}
                  {[
                    { label: "Manager", value: site.manager, phone: site.phoneM },
                    { label: "Safety", value: site.safety, phone: site.phoneS },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-3 max-[640px]:py-2.5 border-b border-dashed border-border">
                      <span className="text-base-app text-text-sub font-bold w-20">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-right text-base-app font-semibold text-foreground truncate pr-3">{row.value || "Input"}</span>
                        <button
                          className={cn(
                            "w-9 h-9 max-[640px]:w-8 max-[640px]:h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-all active:scale-95",
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
                  <LodgeRow site={site} isOnline={isOnline} />

                  {/* Stats */}
                  <div className="flex py-3 max-[640px]:py-2.5">
                    <div className="flex-1 text-center relative">
                      <span className="block text-base-app text-text-sub font-bold mb-2">Work Days</span>
                      <span className="text-lg-app font-[800] text-header-navy">{site.days}d</span>
                      <div className="absolute right-0 top-[10%] h-[80%] w-px bg-border" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="block text-base-app text-text-sub font-bold mb-2">Open Punch</span>
                      <span className={cn("text-lg-app font-[800]", site.mp > 0 ? "text-destructive" : "text-header-navy")}>{site.mp}</span>
                    </div>
                  </div>
                  {/* Action Grid */}
                  <div className="grid grid-cols-5 gap-1.5 max-[640px]:gap-1 mt-0">
                    {[
                      { icon: Ruler, label: "Drawings", active: hasDraw, color: "bg-primary-bg text-primary border-sky-200", onClick: () => hasDraw ? openDrawSheet(site.id) : toast.error("No drawing found") },
                      { icon: Camera, label: "Photos", active: hasPhoto, color: "bg-indigo-50 text-indigo-500 border-indigo-200", onClick: () => checkData(site, "images") },
                      { icon: FileCheck2, label: "PTW", active: hasPTW, color: "bg-blue-50 text-blue-600 border-blue-200", onClick: () => checkData(site, "ptw") },
                      { icon: ClipboardList, label: "Worklog", active: hasLog, color: "bg-emerald-50 text-emerald-700 border-emerald-200", onClick: () => checkData(site, "workLog") },
                      { icon: CheckCircle2, label: "Punch", active: hasPunch, color: "bg-red-50 text-red-600 border-red-200", onClick: () => checkData(site, "punch") },
                    ].map(({ icon: Icon, label, active, color, onClick }) => (
                      <button
                        key={label}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 max-[640px]:gap-1 h-[74px] max-[640px]:h-[64px] rounded-xl border cursor-pointer transition-all active:scale-95",
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
                {!expanded && <span>Show Details</span>}
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
          <span>{visibleCount >= filtered.length ? "Fold" : "Load More"}</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", visibleCount >= filtered.length && "rotate-180")} />
        </button>
      )}

      {/* Drawing Bottom Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-[2000]" onClick={() => setSheetOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[600px] rounded-t-2xl bg-card p-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-bold text-header-navy">Drawings</div>
              <button type="button" onClick={() => setSheetOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDrawingSelectMode((prev) => !prev);
                  setSelectedDrawingIds(new Set());
                }}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm-app font-semibold",
                  drawingSelectMode
                    ? "border-primary bg-primary-bg text-primary"
                    : "border-border bg-card text-text-sub hover:border-primary/50"
                )}
              >
                <Check className="h-4 w-4" /> {drawingSelectMode ? "Cancel Select" : "Select"}
              </button>
              {drawingSelectMode && (
                <>
                  <button
                    type="button"
                    onClick={toggleSelectAllDrawings}
                    className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm-app font-semibold text-text-sub hover:border-primary/50"
                  >
                    {sheetDrawings.length > 0 && selectedDrawingIds.size === sheetDrawings.length ? "Unselect All" : "Select All"}
                  </button>
                  <span className="text-xs font-semibold text-text-sub">{selectedDrawingIds.size} selected</span>
                </>
              )}
            </div>

            {drawingSelectMode && (
              <div className="mb-3 rounded-xl border border-border bg-bg-input px-3 py-2 text-sm-app font-semibold text-text-sub">
                Select files then save or share.
              </div>
            )}

            <input ref={drawingInputRef} type="file" multiple accept="image/*" className="hidden" onChange={onDrawingUploadChange} />

            <button
              type="button"
              onClick={() => drawingInputRef.current?.click()}
              className="mb-2 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/10 text-[14px] font-bold text-primary hover:bg-primary/15"
            >
              <Upload className="h-4 w-4" /> Upload Drawings
            </button>

            <button
              type="button"
              onClick={loadLinkedOriginalDrawings}
              className="mb-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg-input text-[14px] font-bold text-foreground hover:bg-accent"
            >
              <MapIcon className="h-4 w-4" /> Load Linked Drawings
            </button>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openCumulativeMarkedDrawings}
                className="h-[40px] rounded-lg border border-sky-200 bg-sky-50 text-[12px] font-bold text-sky-700 hover:bg-sky-100"
              >
                View Marked
              </button>
              <button
                type="button"
                onClick={openLatestFinalDrawing}
                className="h-[40px] rounded-lg border border-emerald-200 bg-emerald-50 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                View Final
              </button>
            </div>

            <div className="max-h-[54vh] overflow-y-auto">
              {sheetDrawings.length === 0 ? (
                <div className="rounded-xl border border-border bg-bg-input px-4 py-10 text-center text-sm text-muted-foreground">
                  No drawings.
                </div>
              ) : (
                <div className="space-y-2">
                  {sheetDrawings
                    .slice()
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((asset) => {
                      const selected = selectedDrawingIds.has(asset.id);
                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            "rounded-xl border border-border bg-bg-input p-2.5",
                            drawingSelectMode && selected && "border-primary/50 bg-primary/10",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-bold",
                                asset.kind === "original"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : asset.kind === "final"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-indigo-50 text-indigo-700 border border-indigo-200",
                              )}
                            >
                              {asset.kind === "original" ? "Original" : asset.kind === "final" ? "Final" : "Marked"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-semibold text-foreground">{asset.name}</div>
                              <div className="text-[11px] text-muted-foreground">{asset.createdAt.slice(0, 10)}</div>
                            </div>

                            {drawingSelectMode ? (
                              <button
                                type="button"
                                onClick={() => toggleDrawingSelect(asset.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card"
                              >
                                <span className={cn(
                                  "inline-flex h-4 w-4 items-center justify-center rounded-sm border",
                                  selected
                                    ? "border-primary bg-primary text-white"
                                    : "border-border bg-card text-transparent"
                                )}>
                                  <Check className="h-3 w-3" />
                                </span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openDrawingAssetPreview(asset)}
                                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-bold text-text-sub hover:bg-muted"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </button>
                                {asset.kind !== "final" && (
                                  <button
                                    type="button"
                                    onClick={() => approveAsFinalDrawing(asset)}
                                    className="inline-flex h-7 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                                  >
                                    Finalize
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {drawingSelectMode && selectedDrawingIds.size > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2">
                <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-sub">{selectedDrawingIds.size} selected</div>
                <button
                  type="button"
                  onClick={handleSaveSelectedDrawings}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm-app font-semibold text-text-sub hover:border-primary/50"
                >
                  <Download className="h-4 w-4" /> Save
                </button>
                <button
                  type="button"
                  onClick={handleShareSelectedDrawings}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-primary/40 bg-primary-bg px-3 text-sm-app font-bold text-primary"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Bottom Sheet */}
      {photoSheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-[2000]" onClick={() => setPhotoSheetOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[600px] rounded-t-2xl bg-card p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-bold text-header-navy">Photos</div>
              <button type="button" onClick={() => setPhotoSheetOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPhotoSelectMode((prev) => !prev);
                  setSelectedPhotoIds(new Set());
                }}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm-app font-semibold",
                  photoSelectMode
                    ? "border-primary bg-primary-bg text-primary"
                    : "border-border bg-card text-text-sub hover:border-primary/50"
                )}
              >
                <Check className="h-4 w-4" /> {photoSelectMode ? "Cancel Select" : "Select"}
              </button>
              {photoSelectMode && (
                <>
                  <button
                    type="button"
                    onClick={toggleSelectAllPhotos}
                    className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm-app font-semibold text-text-sub hover:border-primary/50"
                  >
                    {photoSheetAssets.length > 0 && selectedPhotoIds.size === photoSheetAssets.length ? "Unselect All" : "Select All"}
                  </button>
                  <span className="text-xs font-semibold text-text-sub">{selectedPhotoIds.size} selected</span>
                </>
              )}
            </div>

            {photoSelectMode && (
              <div className="mb-3 rounded-xl border border-border bg-bg-input px-3 py-2 text-sm-app font-semibold text-text-sub">
                Select files then save or share.
              </div>
            )}

            {photoSheetSite && (
              <button
                type="button"
                onClick={() => openPhotoViewer(photoSheetSite)}
                className="mb-3 flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-input text-[13px] font-bold text-text-sub hover:bg-accent"
              >
                <Eye className="h-4 w-4" /> View All
              </button>
            )}

            <div className="max-h-[54vh] overflow-y-auto">
              {photoSheetAssets.length === 0 ? (
                <div className="rounded-xl border border-border bg-bg-input px-4 py-10 text-center text-sm text-muted-foreground">
                  No photos.
                </div>
              ) : (
                <div className="space-y-2">
                  {photoSheetAssets
                    .slice()
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((asset) => {
                      const selected = selectedPhotoIds.has(asset.id);
                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            "rounded-xl border border-border bg-bg-input p-2.5",
                            photoSelectMode && selected && "border-primary/50 bg-primary/10",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="h-12 w-12 rounded-lg border border-border bg-card object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-semibold text-foreground">{asset.name}</div>
                              <div className="text-[11px] text-muted-foreground">{asset.createdAt.slice(0, 10)}</div>
                            </div>

                            {photoSelectMode ? (
                              <button
                                type="button"
                                onClick={() => togglePhotoSelect(asset.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card"
                              >
                                <span className={cn(
                                  "inline-flex h-4 w-4 items-center justify-center rounded-sm border",
                                  selected
                                    ? "border-primary bg-primary text-white"
                                    : "border-border bg-card text-transparent"
                                )}>
                                  <Check className="h-3 w-3" />
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => photoSheetSite && openPhotoAssetPreview(asset, photoSheetSite.name)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-bold text-text-sub hover:bg-muted"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {photoSelectMode && selectedPhotoIds.size > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2">
                <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-sub">{selectedPhotoIds.size} selected</div>
                <button
                  type="button"
                  onClick={handleSaveSelectedPhotos}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm-app font-semibold text-text-sub hover:border-primary/50"
                >
                  <Download className="h-4 w-4" /> Save
                </button>
                <button
                  type="button"
                  onClick={handleShareSelectedPhotos}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-primary/40 bg-primary-bg px-3 text-sm-app font-bold text-primary"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            )}
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

function LodgeRow({ site, isOnline }: { site: SiteData; isOnline: boolean }) {
  const { lodge, canView, canEdit, isSaving, saveLodge } = useSiteLodging(site.siteDbId);
  const canFallbackRender = !site.siteDbId;
  if (!canView && !canFallbackRender) return null;

  const [localLodge, setLocalLodge] = useState(site.lodge || "");
  useEffect(() => {
    setLocalLodge(site.lodge || "");
  }, [site.id, site.lodge]);

  const canPersistEdit = canEdit && !!site.siteDbId;
  const canEditInUi = canPersistEdit || canFallbackRender;
  const lodgeValue = (lodge || localLodge || "").trim();
  const hasLodge = !!lodgeValue.trim();

  const commitLodge = async (value: string) => {
    const next = value.trim();
    if (!next) return;
    if (canPersistEdit) {
      await saveLodge(next);
      return;
    }
    setLocalLodge(next);
  };

  const handleSearch = async () => {
    if (!isOnline) {
      toast.error("Address search is available online only.");
      return;
    }
    if (!canEditInUi || (canPersistEdit && isSaving)) return;
    try {
      const addr = await openDaumPostcode();
      if (!addr) return;
      try {
        await commitLodge(addr);
        toast.success("Lodge address saved.");
      } catch {
        // handled in hook
      }
    } catch {
      toast.error("Address search failed.");
    }
  };

  return (
    <div className="flex justify-between items-center py-3 max-[640px]:py-2.5 border-b border-dashed border-border">
      <span className="text-base-app text-text-sub font-bold w-20 shrink-0 whitespace-nowrap">Lodge</span>
      <div className="flex items-center gap-1.5 max-[640px]:gap-1 flex-1 min-w-0 justify-end">
        <button
          type="button"
          disabled={!hasLodge}
          onClick={() => hasLodge && openAddressInMaps(lodgeValue, { label: "Lodge Address" })}
          className={cn(
            "flex-1 min-w-0 text-base-app font-semibold truncate pr-1 text-right bg-transparent border-none outline-none",
            hasLodge ? "text-foreground cursor-pointer" : "text-muted-foreground cursor-default"
          )}
        >
          {hasLodge ? lodgeValue : "Find address"}
        </button>

        {hasLodge && (
          <button
            className="w-9 h-9 max-[640px]:w-8 max-[640px]:h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-all active:scale-95 bg-muted border border-border text-text-sub"
            onClick={() => copyText(lodgeValue, "Lodge Address")}
          >
            <Copy className="w-[16px] h-[16px]" />
          </button>
        )}

        <button
          disabled={(!isOnline && !hasLodge) || !canEditInUi || (canPersistEdit && isSaving)}
          className={cn(
            "w-9 h-9 max-[640px]:w-8 max-[640px]:h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-all active:scale-95",
            hasLodge ? "bg-[hsl(219_100%_95%)] border border-[hsl(219_100%_90%)] text-[hsl(230_60%_30%)]" : "border border-dashed border-primary text-primary bg-transparent",
            ((!isOnline && !hasLodge) || !canEditInUi || (canPersistEdit && isSaving)) && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => hasLodge ? openAddressInMaps(lodgeValue, { label: "Lodge Address" }) : handleSearch()}
        >
          <MapPin className="w-[18px] h-[18px]" />
        </button>

        {canEditInUi && (
          <button
            type="button"
            disabled={canPersistEdit && isSaving}
            onClick={handleSearch}
            aria-label="Edit lodge address"
            className={cn(
              "w-9 h-9 max-[640px]:w-8 max-[640px]:h-8 rounded-[10px] flex items-center justify-center border",
              (canPersistEdit && isSaving) ? "opacity-50 cursor-not-allowed border-border text-muted-foreground" : "border-border text-text-sub bg-muted"
            )}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}