import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PreviewModal from "@/components/preview/PreviewModal";
import { usePreviewZoomPan } from "@/hooks/usePreviewZoomPan";

export interface FilePreviewFile {
  id: string;
  name: string;
  url: string;
  mime?: string;
  ext?: string;
  size?: string;
  createdAt?: string;
  previewUrl?: string;
}

interface FilePreviewModalProps {
  file?: FilePreviewFile;
  open: boolean;
  title?: string;
  onClose: () => void;
}

type PreviewKind = "pdf" | "image" | "text" | "video" | "audio" | "office" | "unsupported";
type ActionState = "idle" | "download" | "share";

const TEXT_LIMIT_BYTES = 5 * 1024 * 1024;
const TEXT_PREVIEW_LIMIT_CHARS = 250_000;
const FETCH_TIMEOUT_MS = 15_000;
const PDFJS_MODULE_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  txt: "text/plain",
  log: "text/plain",
  csv: "text/csv",
  json: "application/json",
  md: "text/markdown",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  hwp: "application/x-hwp",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
};

const OFFICE_EXTS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "hwp"]);
const TEXT_EXTS = new Set(["txt", "csv", "json", "log", "md"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "aac"]);

const sanitizeFileName = (name: string) =>
  (name || "file").replace(/[\\/:*?"<>|]+/g, "_").trim() || "file";

const getExtFromName = (name: string) => {
  const m = /\.([a-zA-Z0-9]{1,8})$/.exec(name || "");
  return (m?.[1] || "").toLowerCase();
};

const getExtFromUrl = (url: string) => {
  const clean = (url || "").split("?")[0].split("#")[0];
  return getExtFromName(clean);
};

const inferExt = (file: FilePreviewFile) =>
  (file.ext || "").toLowerCase() || getExtFromName(file.name || "") || getExtFromUrl(file.url || "");

const inferMime = (file: FilePreviewFile, ext: string) =>
  (file.mime || "").toLowerCase() || MIME_BY_EXT[ext] || "application/octet-stream";

const inferKind = (mime: string, ext: string): PreviewKind => {
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || IMAGE_EXTS.has(ext)) return "image";
  if (mime.startsWith("text/") || mime.includes("json") || TEXT_EXTS.has(ext)) return "text";
  if (mime.startsWith("video/") || VIDEO_EXTS.has(ext)) return "video";
  if (mime.startsWith("audio/") || AUDIO_EXTS.has(ext)) return "audio";
  if (OFFICE_EXTS.has(ext)) return "office";
  return "unsupported";
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const ctrl = new AbortController();
  const externalSignal = options.signal;
  const onAbort = () => ctrl.abort();

  if (externalSignal) {
    if (externalSignal.aborted) ctrl.abort();
    externalSignal.addEventListener("abort", onAbort, { once: true });
  }

  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    window.clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener("abort", onAbort);
  }
};

export default function FilePreviewModal({ file, open, title, onClose }: FilePreviewModalProps) {
  const zoom = usePreviewZoomPan({ open });
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textTruncated, setTextTruncated] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfPageImage, setPdfPageImage] = useState<string>("");
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const taskAbortRef = useRef<AbortController | null>(null);
  const pdfDocRef = useRef<any>(null);
  const pdfApiRef = useRef<any>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  const resolved = useMemo(() => {
    if (!file) return null;
    const baseExt = inferExt(file);
    const baseMime = inferMime(file, baseExt);
    const baseKind = inferKind(baseMime, baseExt);

    let viewUrl = (file.url || "").trim();
    let viewExt = baseExt;
    let viewMime = baseMime;
    let previewLabel = "";

    if (baseKind === "office" && file.previewUrl) {
      const previewExt = getExtFromUrl(file.previewUrl);
      if (previewExt) {
        viewUrl = file.previewUrl.trim();
        viewExt = previewExt;
        viewMime = MIME_BY_EXT[previewExt] || viewMime;
        previewLabel = "변환본 미리보기";
      }
    }

    return {
      id: file.id,
      name: sanitizeFileName(file.name || "file"),
      sourceUrl: (file.url || "").trim(),
      viewUrl,
      mime: viewMime,
      ext: viewExt,
      kind: inferKind(viewMime, viewExt),
      baseKind,
      previewLabel,
    };
  }, [file]);

  const abortActiveTask = useCallback(() => {
    if (taskAbortRef.current) {
      taskAbortRef.current.abort();
      taskAbortRef.current = null;
    }
  }, []);

  const openExternal = useCallback(() => {
    const target = resolved?.viewUrl || resolved?.sourceUrl;
    if (!target) {
      toast.error("파일 주소가 없습니다.");
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  }, [resolved]);

  const downloadFile = useCallback(async () => {
    const target = resolved?.sourceUrl || resolved?.viewUrl;
    if (!target || !resolved) {
      toast.error("다운로드할 파일이 없습니다.");
      return;
    }

    setActionState("download");
    const ctrl = new AbortController();
    taskAbortRef.current = ctrl;
    try {
      const response = await fetchWithTimeout(target, { signal: ctrl.signal, cache: "no-store" });
      if (!response.ok) throw new Error("download_failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolved.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1200);
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast.error("다운로드 실패, 새 창 열기로 전환합니다.");
        openExternal();
      }
    } finally {
      setActionState("idle");
      taskAbortRef.current = null;
    }
  }, [openExternal, resolved]);

  const shareFile = useCallback(async () => {
    if (!resolved) return;
    const target = resolved.sourceUrl || resolved.viewUrl;
    if (!target) {
      toast.error("공유할 파일 주소가 없습니다.");
      return;
    }

    setActionState("share");
    const ctrl = new AbortController();
    taskAbortRef.current = ctrl;

    try {
      if (!navigator.share) {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(target);
          toast.success("링크를 복사했습니다.");
        } else {
          openExternal();
        }
        return;
      }

      try {
        const response = await fetchWithTimeout(target, { signal: ctrl.signal, cache: "no-store" });
        if (response.ok) {
          const blob = await response.blob();
          const shareFileObject = new File([blob], resolved.name, {
            type: blob.type || resolved.mime || "application/octet-stream",
          });
          if (navigator.canShare?.({ files: [shareFileObject] })) {
            await navigator.share({ title: resolved.name, files: [shareFileObject] });
            return;
          }
        }
      } catch {
        // noop
      }

      await navigator.share({ title: resolved.name, url: target });
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(target);
          toast.success("공유 실패, 링크를 복사했습니다.");
          return;
        } catch {
          // noop
        }
      }
      toast.error("공유에 실패했습니다.");
    } finally {
      setActionState("idle");
      taskAbortRef.current = null;
    }
  }, [openExternal, resolved]);

  const loadTextPreview = useCallback(async () => {
    if (!resolved?.viewUrl || resolved.kind !== "text") return;
    setTextLoading(true);
    setTextContent("");
    setTextTruncated(false);
    setRenderError(null);
    const ctrl = new AbortController();
    taskAbortRef.current = ctrl;

    try {
      const response = await fetchWithTimeout(resolved.viewUrl, { signal: ctrl.signal, cache: "no-store" });
      if (!response.ok) throw new Error("text_fetch_failed");
      const lengthHeader = Number(response.headers.get("content-length") || "0");
      if (Number.isFinite(lengthHeader) && lengthHeader > TEXT_LIMIT_BYTES) throw new Error("text_too_large");
      const blob = await response.blob();
      if (blob.size > TEXT_LIMIT_BYTES) throw new Error("text_too_large");
      const text = await blob.text();
      setTextTruncated(text.length > TEXT_PREVIEW_LIMIT_CHARS);
      setTextContent(text.slice(0, TEXT_PREVIEW_LIMIT_CHARS));
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setRenderError(
        error?.message === "text_too_large"
          ? "텍스트 파일이 커서 미리보기를 제한했습니다."
          : "텍스트 미리보기에 실패했습니다. 다운로드를 이용해주세요.",
      );
    } finally {
      setTextLoading(false);
      taskAbortRef.current = null;
    }
  }, [resolved]);

  const ensurePdfApi = useCallback(async () => {
    if (pdfApiRef.current) return pdfApiRef.current;
    const imported = await import(/* @vite-ignore */ PDFJS_MODULE_URL);
    const pdfApi = (imported as any).default ?? imported;
    if (pdfApi?.GlobalWorkerOptions) pdfApi.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    pdfApiRef.current = pdfApi;
    return pdfApi;
  }, []);

  const renderPdfPage = useCallback(async (pageNo: number) => {
    if (!pdfDocRef.current) return;
    const page = await pdfDocRef.current.getPage(pageNo);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, Math.max(1, 1100 / Math.max(1, baseViewport.width)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_context_unavailable");
    await page.render({ canvasContext: ctx, viewport }).promise;
    setPdfPageImage(canvas.toDataURL("image/png"));
    setPdfPage(pageNo);
  }, []);

  const loadPdfPreview = useCallback(async () => {
    if (!resolved?.viewUrl || resolved.kind !== "pdf") return;
    setPdfLoading(true);
    setPdfError(null);
    setRenderError(null);
    setPdfPage(1);
    setPdfTotalPages(0);
    setPdfPageImage("");
    const ctrl = new AbortController();
    taskAbortRef.current = ctrl;

    try {
      const pdfApi = await ensurePdfApi();
      const task = pdfApi.getDocument({ url: resolved.viewUrl, withCredentials: false });
      const pdfDoc = await task.promise;
      pdfDocRef.current = pdfDoc;
      setPdfTotalPages(Number(pdfDoc.numPages || 0));
      await renderPdfPage(1);
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setPdfError("PDF 미리보기에 실패했습니다.");
      setRenderError("PDF 미리보기에 실패했습니다. 새 창 열기 또는 다운로드를 이용해주세요.");
    } finally {
      setPdfLoading(false);
      taskAbortRef.current = null;
    }
  }, [ensurePdfApi, renderPdfPage, resolved]);

  const movePdfPage = useCallback(
    async (delta: number) => {
      if (!pdfDocRef.current) return;
      const next = pdfPage + delta;
      if (next < 1 || next > pdfTotalPages) return;
      setPdfLoading(true);
      try {
        await renderPdfPage(next);
      } catch {
        setPdfError("PDF 페이지 이동에 실패했습니다.");
      } finally {
        setPdfLoading(false);
      }
    },
    [pdfPage, pdfTotalPages, renderPdfPage],
  );

  useEffect(() => {
    if (!open || !resolved) return;
    if (resolved.kind === "text") void loadTextPreview();
    if (resolved.kind === "pdf") void loadPdfPreview();
  }, [loadPdfPreview, loadTextPreview, open, resolved]);

  useEffect(() => () => abortActiveTask(), [abortActiveTask]);

  useEffect(() => {
    if (!open) {
      abortActiveTask();
      setActionState("idle");
      setRenderError(null);
      setTextLoading(false);
      setTextContent("");
      setTextTruncated(false);
      setPdfLoading(false);
      setPdfError(null);
      setPdfPageImage("");
      setPdfPage(1);
      setPdfTotalPages(0);
      setMediaError(null);
      pdfDocRef.current = null;
    }
  }, [abortActiveTask, open]);

  if (!open || !resolved) return null;

  const isBusy = actionState !== "idle";
  const zoomEnabled = resolved.kind === "image" || resolved.kind === "pdf";
  const renderUnsupported = resolved.baseKind === "office" && !resolved.previewLabel;

  const fallbackPanel = (
    <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-white/15 bg-black/30 p-6 text-center">
      <FileText className="mx-auto mb-3 h-10 w-10 text-white/70" />
      <p className="text-base font-semibold text-white">해당 파일은 직접 미리보기를 지원하지 않습니다.</p>
      <p className="mt-1 text-sm text-white/70">새 창 열기 또는 다운로드를 이용해주세요.</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={openExternal}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white"
        >
          <ExternalLink className="h-4 w-4" />
          새 창 열기
        </button>
        <button
          type="button"
          onClick={downloadFile}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          다운로드
        </button>
      </div>
    </div>
  );

  return (
    <PreviewModal
      open={open}
      title={title || resolved.name}
      onBack={onClose}
      onClose={onClose}
      onSave={downloadFile}
      onShare={() => {
        if (!isBusy) void shareFile();
      }}
      zoom={zoom}
      zoomEnabled={zoomEnabled}
      contentRef={contentRef}
    >
      <div className="px-4 pb-6">
        {resolved.previewLabel && (
          <div className="mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
            {resolved.previewLabel}
          </div>
        )}

        {renderUnsupported && fallbackPanel}

        {!renderUnsupported && resolved.kind === "image" && (
          <div className="flex min-h-full items-center justify-center py-4">
            {renderError ? (
              fallbackPanel
            ) : (
              <img
                src={resolved.viewUrl}
                alt={resolved.name}
                className="max-h-[calc(100dvh-220px)] w-auto max-w-none rounded-xl object-contain"
                onError={() => setRenderError("이미지 로딩에 실패했습니다.")}
              />
            )}
          </div>
        )}

        {!renderUnsupported && resolved.kind === "pdf" && (
          <div className="py-4">
            {(pdfLoading || !pdfPageImage) && !pdfError && (
              <div className="mx-auto flex h-[260px] w-full max-w-xl items-center justify-center rounded-xl border border-white/10 bg-black/20">
                <Loader2 className="h-6 w-6 animate-spin text-white/70" />
              </div>
            )}

            {pdfPageImage && !pdfError && (
              <img src={pdfPageImage} alt={`${resolved.name} page ${pdfPage}`} className="mx-auto w-auto max-w-none rounded-xl bg-white shadow-lg" />
            )}

            {(pdfError || renderError) && fallbackPanel}

            {!pdfError && pdfTotalPages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void movePdfPage(-1)}
                  disabled={pdfLoading || pdfPage <= 1}
                  className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  이전
                </button>
                <span className="text-sm font-medium text-white/80">
                  {pdfPage} / {pdfTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => void movePdfPage(1)}
                  disabled={pdfLoading || pdfPage >= pdfTotalPages}
                  className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}

        {!renderUnsupported && resolved.kind === "text" && (
          <div className="py-4">
            {textLoading ? (
              <div className="mx-auto flex h-[220px] w-full max-w-3xl items-center justify-center rounded-xl border border-white/10 bg-black/20">
                <Loader2 className="h-6 w-6 animate-spin text-white/70" />
              </div>
            ) : renderError ? (
              fallbackPanel
            ) : (
              <div className="mx-auto w-full max-w-3xl rounded-xl border border-white/15 bg-black/30 p-4">
                <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-white/90">{textContent}</pre>
                {textTruncated && <p className="mt-3 text-xs text-amber-300">미리보기 용량 제한으로 일부만 표시됩니다.</p>}
              </div>
            )}
          </div>
        )}

        {!renderUnsupported && resolved.kind === "video" && (
          <div className="flex min-h-full items-center justify-center py-4">
            {mediaError ? (
              fallbackPanel
            ) : (
              <video
                src={resolved.viewUrl}
                controls
                className="h-auto max-h-[calc(100dvh-220px)] w-full rounded-xl bg-black"
                onError={() => setMediaError("video_failed")}
              />
            )}
          </div>
        )}

        {!renderUnsupported && resolved.kind === "audio" && (
          <div className="mx-auto mt-12 w-full max-w-xl rounded-xl border border-white/15 bg-black/30 p-6">
            {mediaError ? (
              fallbackPanel
            ) : (
              <audio src={resolved.viewUrl} controls className="w-full" onError={() => setMediaError("audio_failed")} />
            )}
          </div>
        )}

        {!renderUnsupported && resolved.kind === "unsupported" && fallbackPanel}
      </div>
    </PreviewModal>
  );
}
