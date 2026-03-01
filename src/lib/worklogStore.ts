/**
 * Shared worklog data store - localStorage based
 * Used by HomePage (write), WorklogPage (read/manage), OutputPage (read), SitePage (read)
 */
import type { AttachmentRef, AttachmentType } from "@/lib/attachmentStore";
import { isAttachmentRef } from "@/lib/attachmentStore";

export type WorklogStatus = "draft" | "pending" | "approved" | "rejected";

export interface ManpowerItem {
  id: number;
  worker: string;
  workHours: number;
  isCustom: boolean;
  locked: boolean;
}

export interface WorkSet {
  id: number;
  member: string;
  process: string;
  type: string;
  location: { block: string; dong: string; floor: string };
  customMemberValue: string;
  customProcessValue: string;
  customTypeValue: string;
}

export interface MaterialItem {
  id: number;
  name: string;
  qty: number;
}

export interface WorklogEntry {
  id: string;
  siteValue: string;
  siteName: string;
  createdBy?: string;
  dept: string;
  workDate: string;
  manpower: ManpowerItem[];
  workSets: WorkSet[];
  materials: MaterialItem[];
  photos: AttachmentRef[];
  drawings: AttachmentRef[];
  photoCount: number;
  drawingCount: number;
  status: WorklogStatus;
  createdAt: string;
  updatedAt?: string;
  version: number;
  weather?: string;
}

export interface SaveWorklogInput
  extends Omit<WorklogEntry, "id" | "createdAt" | "updatedAt" | "version" | "photoCount" | "drawingCount"> {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  photoCount?: number;
  drawingCount?: number;
  status?: WorklogStatus;
}

export interface PhotoEntry {
  id: number;
  url: string;
  badge: "사진" | "보수" | "완료";
  type: "photo" | "drawing";
  version: number;
  timestamp: string;
  siteName: string;
  workDate: string;
}

export interface DrawingEntry {
  img: string;
  version: number;
  timestamp: string;
  siteName: string;
  workDate: string;
}

const WORKLOGS_KEY = "inopnc_worklogs_unified";
const PHOTOS_KEY = "sitePhotos";
const DRAWINGS_KEY = "siteDrawings";

function toStatus(raw: unknown): WorklogStatus {
  const value = String(raw || "").toLowerCase();
  if (value === "pending" || value === "approved" || value === "rejected" || value === "draft") {
    return value;
  }
  if (value === "submitted") return "pending";
  if (value === "reject") return "rejected";
  return "draft";
}

function defaultMediaStatus(type: AttachmentType) {
  return type === "photo" ? "after" : "progress";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function normalizeAttachmentList(raw: unknown, type: AttachmentType, seed: string): AttachmentRef[] {
  if (!Array.isArray(raw)) return [];
  const now = new Date().toISOString();

  return raw
    .map((row, index) => {
      if (isAttachmentRef(row)) {
        return { ...row, type };
      }
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;

      if (typeof item.id === "string") {
        const normalized: AttachmentRef & { url?: string } = {
          id: item.id,
          type,
          status: String(item.status || defaultMediaStatus(type)),
          timestamp: typeof item.timestamp === "string" ? item.timestamp : now,
        };
        if (typeof item.url === "string" && item.url.trim()) {
          normalized.url = item.url;
        }
        return normalized;
      }

      // Legacy URL payload fallback (render only, no new URL save)
      if (typeof item.url === "string") {
        return {
          id: `legacy_${seed}_${type}_${index}`,
          type,
          status: String(item.status || defaultMediaStatus(type)),
          timestamp: typeof item.timestamp === "string" ? item.timestamp : now,
          url: item.url,
        } as AttachmentRef;
      }
      return null;
    })
    .filter(Boolean) as AttachmentRef[];
}

function normalizeWorklogEntry(raw: unknown): WorklogEntry | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = typeof row.id === "string" ? row.id : `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const photos = normalizeAttachmentList(row.photos, "photo", id);
  const drawings = normalizeAttachmentList(row.drawings, "drawing", id);

  const photoCount = Math.max(Number(row.photoCount || 0), photos.length);
  const drawingCount = Math.max(Number(row.drawingCount || 0), drawings.length);

  return {
    id,
    siteValue: String(row.siteValue || row.site_id || row.siteName || row.site_name || ""),
    siteName: String(row.siteName || row.site_name || ""),
    createdBy: typeof row.createdBy === "string" ? row.createdBy : undefined,
    dept: String(row.dept || ""),
    workDate: String(row.workDate || row.work_date || ""),
    manpower: Array.isArray(row.manpower) ? (row.manpower as ManpowerItem[]) : [],
    workSets: Array.isArray(row.workSets) ? (row.workSets as WorkSet[]) : [],
    materials: Array.isArray(row.materials) ? (row.materials as MaterialItem[]) : [],
    photos,
    drawings,
    photoCount,
    drawingCount,
    status: toStatus(row.status),
    createdAt: String(row.createdAt || row.created_at || new Date().toISOString()),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
    version: Math.max(1, Number(row.version || 1)),
    weather: typeof row.weather === "string" ? row.weather : "",
  };
}

function toSiteKey(siteValue: string, siteName: string) {
  return (siteValue || siteName || "").trim().toLowerCase();
}

function readStorageEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(WORKLOGS_KEY) || "[]");
    if (!Array.isArray(raw)) return [] as WorklogEntry[];
    return raw.map(normalizeWorklogEntry).filter(Boolean) as WorklogEntry[];
  } catch {
    return [] as WorklogEntry[];
  }
}

function writeStorageEntries(entries: WorklogEntry[]) {
  localStorage.setItem(WORKLOGS_KEY, JSON.stringify(entries));
}

function legacyUrlFromUnknown(item: unknown) {
  const row = asRecord(item);
  if (!row) return "";
  return typeof row.url === "string" ? row.url : "";
}

function timestampFromUnknown(item: unknown, fallback: string) {
  const row = asRecord(item);
  if (!row) return fallback;
  return typeof row.timestamp === "string" ? row.timestamp : fallback;
}

// Read
export function getAllWorklogs(): WorklogEntry[] {
  return readStorageEntries();
}

export function getWorklogsBySite(siteValue: string): WorklogEntry[] {
  const key = toSiteKey(siteValue, "");
  return getAllWorklogs().filter((w) => toSiteKey(w.siteValue, w.siteName) === key);
}

export function getWorklogsBySiteName(siteName: string): WorklogEntry[] {
  const key = toSiteKey("", siteName);
  return getAllWorklogs().filter((w) => toSiteKey(w.siteValue, w.siteName) === key);
}

export function getWorklogsByDate(date: string): WorklogEntry[] {
  return getAllWorklogs().filter((w) => w.workDate === date);
}

export function getWorklogsByMonth(year: number, month: number): WorklogEntry[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return getAllWorklogs().filter((w) => w.workDate.startsWith(prefix));
}

export function getWorklogById(id: string): WorklogEntry | undefined {
  return getAllWorklogs().find((w) => w.id === id);
}

// Write
export function saveWorklog(entry: SaveWorklogInput): WorklogEntry {
  const logs = getAllWorklogs();
  const now = new Date().toISOString();
  const incomingSiteKey = toSiteKey(entry.siteValue, entry.siteName);

  const photos = normalizeAttachmentList(entry.photos || [], "photo", entry.id || "new");
  const drawings = normalizeAttachmentList(entry.drawings || [], "drawing", entry.id || "new");

  const nextPhotoCount = Math.max(Number(entry.photoCount || 0), photos.length);
  const nextDrawingCount = Math.max(Number(entry.drawingCount || 0), drawings.length);

  let index = -1;
  if (entry.id) {
    index = logs.findIndex((log) => log.id === entry.id);
  }

  if (index < 0) {
    index = logs.findIndex(
      (log) => toSiteKey(log.siteValue, log.siteName) === incomingSiteKey && log.workDate === entry.workDate,
    );
  }

  if (index >= 0) {
    const existing = logs[index];
    const nextVersion = Math.max(existing.version + 1, Number(entry.version || 0) || existing.version + 1);
    const updated: WorklogEntry = {
      ...existing,
      ...entry,
      id: existing.id,
      siteValue: entry.siteValue || existing.siteValue,
      siteName: entry.siteName || existing.siteName,
      createdAt: existing.createdAt,
      updatedAt: now,
      version: nextVersion,
      status: toStatus(entry.status || existing.status),
      photos: photos.length > 0 ? photos : existing.photos,
      drawings: drawings.length > 0 ? drawings : existing.drawings,
      photoCount: nextPhotoCount > 0 ? nextPhotoCount : existing.photoCount,
      drawingCount: nextDrawingCount > 0 ? nextDrawingCount : existing.drawingCount,
      weather: entry.weather || "",
    };
    logs[index] = updated;
    writeStorageEntries(logs);
    return updated;
  }

  const created: WorklogEntry = {
    ...entry,
    id: entry.id || `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: toStatus(entry.status || "draft"),
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt,
    version: Math.max(1, Number(entry.version || 1)),
    photos,
    drawings,
    photoCount: nextPhotoCount,
    drawingCount: nextDrawingCount,
    weather: entry.weather || "",
  };

  logs.unshift(created);
  writeStorageEntries(logs);
  return created;
}

export function updateWorklogStatus(id: string, status: WorklogStatus): boolean {
  const logs = getAllWorklogs();
  const idx = logs.findIndex((log) => log.id === id);
  if (idx < 0) return false;
  logs[idx].status = toStatus(status);
  logs[idx].updatedAt = new Date().toISOString();
  writeStorageEntries(logs);
  return true;
}

export function deleteWorklog(id: string): boolean {
  const logs = getAllWorklogs();
  const filtered = logs.filter((log) => log.id !== id);
  if (filtered.length === logs.length) return false;
  writeStorageEntries(filtered);
  return true;
}

// Legacy Photos
export function getPhotosForSite(siteValue: string, date?: string): PhotoEntry[] {
  const fromLegacy = (() => {
    try {
      const data = JSON.parse(localStorage.getItem(PHOTOS_KEY) || "{}");
      if (!data[siteValue]) return [];
      if (date) return data[siteValue][date] || [];
      return Object.values(data[siteValue]).flat() as PhotoEntry[];
    } catch {
      return [] as PhotoEntry[];
    }
  })();

  const fromWorklogs = getWorklogsBySite(siteValue)
    .filter((log) => !date || log.workDate === date)
    .flatMap((log) =>
      (log.photos || [])
        .map((item, index) => {
          const url = legacyUrlFromUnknown(item);
          if (!url) return null;
          return {
            id: index,
            url,
            badge: "사진" as const,
            type: "photo" as const,
            version: log.version,
            timestamp: timestampFromUnknown(item, log.createdAt),
            siteName: log.siteName,
            workDate: log.workDate,
          };
        })
        .filter(Boolean) as PhotoEntry[],
    );

  return [...fromLegacy, ...fromWorklogs];
}

// Legacy Drawings
export function getDrawingsForSite(siteValue: string, date?: string): DrawingEntry[] {
  const fromLegacy = (() => {
    try {
      const data = JSON.parse(localStorage.getItem(DRAWINGS_KEY) || "{}");
      if (!data[siteValue]) return [];
      if (date) return data[siteValue][date] || [];
      return Object.values(data[siteValue]).flat() as DrawingEntry[];
    } catch {
      return [] as DrawingEntry[];
    }
  })();

  const fromWorklogs = getWorklogsBySite(siteValue)
    .filter((log) => !date || log.workDate === date)
    .flatMap((log) =>
      (log.drawings || [])
        .map((item) => {
          const img = legacyUrlFromUnknown(item);
          if (!img) return null;
          return {
            img,
            version: log.version,
            timestamp: timestampFromUnknown(item, log.createdAt),
            siteName: log.siteName,
            workDate: log.workDate,
          };
        })
        .filter(Boolean) as DrawingEntry[],
    );

  return [...fromLegacy, ...fromWorklogs];
}

// Migration: Convert old format to new unified format
export function migrateOldWorklogs(): void {
  const unified = getAllWorklogs();
  if (unified.length > 0) return;

  try {
    const oldDataRaw = JSON.parse(localStorage.getItem("siteWorklogs") || "{}") as unknown;
    const entries: WorklogEntry[] = [];

    const oldData = asRecord(oldDataRaw) || {};
    Object.entries(oldData).forEach(([siteValue, dates]) => {
      const dateRows = asRecord(dates);
      if (!dateRows) return;

      Object.entries(dateRows).forEach(([dateKey, data]) => {
        const dataRow = asRecord(data);
        const baseInfo = asRecord(dataRow?.baseInfo);
        if (!dataRow || !baseInfo) return;

        const versions = Array.isArray(dataRow.versions) ? (dataRow.versions as unknown[]) : [];
        const lastVersion = asRecord(versions[versions.length - 1]);
        entries.push({
          id: `wl_migrated_${siteValue}_${dateKey}`,
          siteValue: typeof baseInfo.siteValue === "string" ? baseInfo.siteValue : siteValue,
          siteName: typeof baseInfo.siteName === "string" ? baseInfo.siteName : "",
          dept: typeof baseInfo.dept === "string" ? baseInfo.dept : "",
          workDate: typeof baseInfo.workDate === "string" ? baseInfo.workDate : dateKey,
          manpower: Array.isArray(baseInfo.manpower) ? (baseInfo.manpower as ManpowerItem[]) : [],
          workSets: Array.isArray(baseInfo.workSets) ? (baseInfo.workSets as WorkSet[]) : [],
          materials: Array.isArray(lastVersion?.materials) ? (lastVersion.materials as MaterialItem[]) : [],
          photos: [],
          drawings: [],
          photoCount: Number(lastVersion?.photoCount || 0),
          drawingCount: Number(lastVersion?.drawingCount || 0),
          status: "draft",
          createdAt: typeof baseInfo.createdAt === "string" ? baseInfo.createdAt : new Date().toISOString(),
          updatedAt: typeof baseInfo.updatedAt === "string" ? baseInfo.updatedAt : undefined,
          version: Math.max(1, versions.length || 1),
          weather: "",
        });
      });
    });

    const v4DataRaw = JSON.parse(localStorage.getItem("inopnc_worklogs_v4_site_based") || "{}") as unknown;
    const v4Data = asRecord(v4DataRaw) || {};
    Object.entries(v4Data).forEach(([siteValue, logs]) => {
      if (!Array.isArray(logs)) return;
      logs.forEach((log) => {
        const row = asRecord(log);
        if (!row) return;

        const workDate = typeof row.workDate === "string" ? row.workDate : "";
        const exists = entries.find((entry) => entry.siteValue === siteValue && entry.workDate === workDate);
        if (exists) return;

        entries.push({
          id: `wl_v4_${siteValue}_${workDate}`,
          siteValue: typeof row.siteValue === "string" ? row.siteValue : siteValue,
          siteName: typeof row.site === "string" ? row.site : "",
          dept: typeof row.dept === "string" ? row.dept : "",
          workDate,
          manpower: Array.isArray(row.manpower) ? (row.manpower as ManpowerItem[]) : [],
          workSets: Array.isArray(row.workSets) ? (row.workSets as WorkSet[]) : [],
          materials: Array.isArray(row.materials) ? (row.materials as MaterialItem[]) : [],
          photos: [],
          drawings: [],
          photoCount: Number(row.photoCount || 0),
          drawingCount: 0,
          status: "draft",
          createdAt: typeof row.savedAt === "string" ? row.savedAt : new Date().toISOString(),
          version: 1,
          weather: "",
        });
      });
    });

    if (entries.length > 0) {
      writeStorageEntries(entries);
    }
  } catch {
    // no-op
  }
}
