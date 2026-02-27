import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PreviewAppBar } from "@/components/viewer/PreviewBars";

interface CertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHEET_ANIMATION_MS = 280;
const CERT_SRC = `${import.meta.env.BASE_URL}@confirm3.html`;
const VIEWPORT_META_CONTENT =
  "width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover";

const patchConfirmDocument = (doc: Document) => {
  let viewportMeta = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');

  if (!viewportMeta && doc.head) {
    viewportMeta = doc.createElement("meta");
    viewportMeta.name = "viewport";
    doc.head.appendChild(viewportMeta);
  }

  if (viewportMeta) {
    viewportMeta.content = VIEWPORT_META_CONTENT;
  }

  const viewport = doc.getElementById("viewport") as HTMLElement | null;
  if (viewport) {
    viewport.style.touchAction = "pan-x pan-y";
  }

  const controls = doc.querySelector<HTMLElement>(".controls-pill");
  if (controls) {
    controls.style.bottom = "max(20px, env(safe-area-inset-bottom, 0px))";
  }
};

export default function CertModal({ isOpen, onClose }: CertModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const keepAliveRef = useRef(false);
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [frameError, setFrameError] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "document";
    link.href = CERT_SRC;
    document.head.appendChild(link);
    return () => {
      link.parentNode?.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setFrameReady(keepAliveRef.current);
      setFrameError(false);
      const raf = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(raf);
    }

    setVisible(false);
    if (!keepAliveRef.current) {
      const timer = window.setTimeout(() => setMounted(false), SHEET_ANIMATION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onClose]);

  const handleIframeLoad = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;

      patchConfirmDocument(doc);
      doc.body?.classList.add("iframe-mode");
      keepAliveRef.current = true;
      setFrameError(false);
      setFrameReady(true);
    } catch {
      setFrameReady(false);
      setFrameError(true);
    }
  }, []);

  const clickInnerButton = useCallback((buttonId: string) => {
    const doc = iframeRef.current?.contentDocument;
    const win = iframeRef.current?.contentWindow as any;
    const target = doc?.getElementById(buttonId) as HTMLButtonElement | null;
    if (!target) {
      toast.error("내부 버튼을 찾지 못했습니다.");
      return;
    }
    target.click();
  }, []);

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[3000] bg-black/45 transition-opacity duration-200 ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <section
        className={`fixed inset-0 left-1/2 z-[3100] flex w-full max-w-app -translate-x-1/2 flex-col overflow-hidden bg-black shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          visible ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <PreviewAppBar
          title="작업완료확인서"
          onBack={onClose}
          onClose={onClose}
          onReset={() => clickInnerButton("btnReset")}
          onSave={() => clickInnerButton("btnDownload")}
          resetDisabled={!frameReady}
          saveDisabled={!frameReady}
          backAriaLabel="이전"
          resetAriaLabel="확인서 초기화"
          saveAriaLabel="확인서 저장"
          closeAriaLabel="확인서 닫기"
          className="h-[60px] min-h-[60px]"
        />

        <div className="relative flex-1 bg-black">
          <iframe
            ref={iframeRef}
            title="작업완료확인서"
            src={CERT_SRC}
            onLoad={handleIframeLoad}
            onError={() => {
              setFrameReady(false);
              setFrameError(true);
            }}
            className="h-full w-full border-0 bg-black"
            allow="fullscreen"
            loading="eager"
          />

          {!frameReady && !frameError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm-app font-semibold text-white/70">
              확인서를 불러오는 중입니다...
            </div>
          )}

          {frameError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
              <p className="text-sm-app font-semibold text-white">확인서를 불러오지 못했습니다.</p>
              <button
                onClick={() => {
                  setFrameError(false);
                  setFrameReady(false);
                  iframeRef.current?.contentWindow?.location.reload();
                }}
                className="rounded-lg border border-white/40 px-3 py-1.5 text-xs font-bold text-white"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
