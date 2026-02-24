// PATCH START: Common repository facade (no direct localStorage usage in UI layers)
import { addToQueue, saveMediaOffline, processSyncQueue } from "@/lib/offlineStore";

export type AddPhotosToWorklogInput = {
  site_id: string;
  site_name: string;
  work_date: string; // YYYY-MM-DD
  files: File[];
  badge?: string; // e.g. "사진"
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

// NOTE: This matches the legacy HomePage.legacy offline queue schema so other pages can reuse the same stores.
export async function addPhotosToWorklog(input: AddPhotosToWorklogInput): Promise<{ saved: number }> {
  const { site_id, site_name, work_date, files, badge = "사진" } = input;
  const createdAt = new Date().toISOString();

  let saved = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f.type.startsWith("image/")) continue;

    const dataUrl = await fileToDataUrl(f);

    await saveMediaOffline({
      type: "photo",
      dataUrl,
      siteValue: site_id,
      siteName: site_name,
      workDate: work_date,
      badge,
      createdAt,
    });

    await addToQueue({
      action: "upload_photo",
      payload: {
        siteValue: site_id,
        workDate: work_date,
        data: {
          id: Date.now() + i,
          url: dataUrl,
          badge,
          type: "photo",
          version: 1,
          timestamp: createdAt,
          siteName: site_name,
          workDate: work_date,
        },
      },
      createdAt,
      retryCount: 0,
      status: "pending",
    });

    saved++;
  }

  // If online, sync immediately (offlineStore handles localStorage writes internally).
  if (saved > 0 && navigator.onLine) {
    try {
      await processSyncQueue();
    } catch {
      // best-effort; items remain queued
    }
  }

  return { saved };
}
// PATCH END

