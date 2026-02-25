/**
 * Shared worklog data store - localStorage based
 * Used by HomePage (write), WorklogPage (read/manage), OutputPage (read), SitePage (read)
 */

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
  dept: string;
  workDate: string;
  manpower: ManpowerItem[];
  workSets: WorkSet[];
  materials: MaterialItem[];
  photoCount: number;
  drawingCount: number;
  status: WorklogStatus;
  createdAt: string;
  updatedAt?: string;
  version: number;
  weather?: string;
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

// ─── Read ───
export function getAllWorklogs(): WorklogEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(WORKLOGS_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function getWorklogsBySite(siteValue: string): WorklogEntry[] {
  return getAllWorklogs().filter(w => w.siteValue === siteValue);
}

export function getWorklogsBySiteName(siteName: string): WorklogEntry[] {
  return getAllWorklogs().filter(w => w.siteName === siteName);
}

export function getWorklogsByDate(date: string): WorklogEntry[] {
  return getAllWorklogs().filter(w => w.workDate === date);
}

export function getWorklogsByMonth(year: number, month: number): WorklogEntry[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return getAllWorklogs().filter(w => w.workDate.startsWith(prefix));
}

export function getWorklogById(id: string): WorklogEntry | undefined {
  return getAllWorklogs().find(w => w.id === id);
}

// ─── Write ───
export function saveWorklog(entry: Omit<WorklogEntry, "id"> & { id?: string }): WorklogEntry {
  const logs = getAllWorklogs();
  const now = new Date().toISOString();

  if (entry.id) {
    // Update existing
    const idx = logs.findIndex(l => l.id === entry.id);
    if (idx >= 0) {
      logs[idx] = { ...logs[idx], ...entry, id: entry.id, updatedAt: now };
      localStorage.setItem(WORKLOGS_KEY, JSON.stringify(logs));
      return logs[idx];
    }
  }

  // Create new
  const newEntry: WorklogEntry = {
    ...entry,
    id: entry.id || `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: entry.status || "draft",
    createdAt: entry.createdAt || now,
    version: entry.version || 1,
  } as WorklogEntry;

  logs.unshift(newEntry);
  localStorage.setItem(WORKLOGS_KEY, JSON.stringify(logs));
  return newEntry;
}

export function updateWorklogStatus(id: string, status: WorklogStatus): boolean {
  const logs = getAllWorklogs();
  const idx = logs.findIndex(l => l.id === id);
  if (idx < 0) return false;
  logs[idx].status = status;
  logs[idx].updatedAt = new Date().toISOString();
  localStorage.setItem(WORKLOGS_KEY, JSON.stringify(logs));
  return true;
}

export function deleteWorklog(id: string): boolean {
  const logs = getAllWorklogs();
  const filtered = logs.filter(l => l.id !== id);
  if (filtered.length === logs.length) return false;
  localStorage.setItem(WORKLOGS_KEY, JSON.stringify(filtered));
  return true;
}

// ─── Photos ───
export function getPhotosForSite(siteValue: string, date?: string): PhotoEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(PHOTOS_KEY) || "{}");
    if (!data[siteValue]) return [];
    if (date) return data[siteValue][date] || [];
    return Object.values(data[siteValue]).flat() as PhotoEntry[];
  } catch {
    return [];
  }
}

// ─── Drawings ───
export function getDrawingsForSite(siteValue: string, date?: string): DrawingEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(DRAWINGS_KEY) || "{}");
    if (!data[siteValue]) return [];
    if (date) return data[siteValue][date] || [];
    return Object.values(data[siteValue]).flat() as DrawingEntry[];
  } catch {
    return [];
  }
}

// ─── Migration: Convert old format to new unified format ───
export function migrateOldWorklogs(): void {
  const unified = getAllWorklogs();
  if (unified.length > 0) return; // Already migrated

  try {
    // Try old siteWorklogs format
    const oldData = JSON.parse(localStorage.getItem("siteWorklogs") || "{}");
    const entries: WorklogEntry[] = [];

    Object.entries(oldData).forEach(([siteValue, dates]: [string, any]) => {
      Object.entries(dates).forEach(([dateKey, data]: [string, any]) => {
        if (data.baseInfo) {
          entries.push({
            id: `wl_migrated_${siteValue}_${dateKey}`,
            siteValue: data.baseInfo.siteValue || siteValue,
            siteName: data.baseInfo.siteName || "",
            dept: data.baseInfo.dept || "",
            workDate: data.baseInfo.workDate || dateKey,
            manpower: data.baseInfo.manpower || [],
            workSets: data.baseInfo.workSets || [],
            materials: data.versions?.[data.versions.length - 1]?.materials || [],
            photoCount: data.versions?.[data.versions.length - 1]?.photoCount || 0,
            drawingCount: data.versions?.[data.versions.length - 1]?.drawingCount || 0,
            status: "draft",
            createdAt: data.baseInfo.createdAt || new Date().toISOString(),
            updatedAt: data.baseInfo.updatedAt,
            version: data.versions?.length || 1,
          });
        }
      });
    });

    if (entries.length > 0) {
      localStorage.setItem(WORKLOGS_KEY, JSON.stringify(entries));
    }

    // Also try v4 format
    const v4Data = JSON.parse(localStorage.getItem("inopnc_worklogs_v4_site_based") || "{}");
    Object.entries(v4Data).forEach(([siteValue, logs]: [string, any]) => {
      if (Array.isArray(logs)) {
        logs.forEach((log: any) => {
          const existing = entries.find(e => e.siteValue === siteValue && e.workDate === log.workDate);
          if (!existing) {
            entries.push({
              id: `wl_v4_${siteValue}_${log.workDate}`,
              siteValue: log.siteValue || siteValue,
              siteName: log.site || "",
              dept: log.dept || "",
              workDate: log.workDate || "",
              manpower: log.manpower || [],
              workSets: log.workSets || [],
              materials: log.materials || [],
              photoCount: log.photoCount || 0,
              drawingCount: 0,
              status: "draft",
              createdAt: log.savedAt || new Date().toISOString(),
              version: 1,
            });
          }
        });
      }
    });

    if (entries.length > 0) {
      localStorage.setItem(WORKLOGS_KEY, JSON.stringify(entries));
    }
  } catch (e) {
    console.error("Migration failed:", e);
  }
}
