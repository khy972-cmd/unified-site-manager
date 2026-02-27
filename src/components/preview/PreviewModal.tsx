import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import { FloatingToolbar, PreviewAppBar, PreviewViewport } from "@/components/viewer/PreviewBars";
import type { PreviewZoomPan } from "@/hooks/usePreviewZoomPan";

interface PreviewModalProps {
  open: boolean;
  title: string;
  onBack: () => void;
  onClose: () => void;
  onSave?: () => void;
  onShare?: () => void;
  children: ReactNode;
  zoom?: PreviewZoomPan;
  zoomEnabled?: boolean;
  contentRef?: RefObject<HTMLElement | null>;
  titleClassName?: string;
  maxWidthClassName?: string;
  overlayClassName?: string;
}

const HEADER_HEIGHT_PX = 56;
const TOOLBAR_HEIGHT_PX = 76;

export default function PreviewModal({
  open,
  title,
  onBack,
  onClose,
  onSave,
  onShare,
  children,
  zoom,
  zoomEnabled = true,
  contentRef,
  titleClassName,
  maxWidthClassName = "max-w-[600px]",
  overlayClassName,
}: PreviewModalProps) {
  const prevFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocusedRef.current = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      prevFocusedRef.current?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const activeZoom = !!zoom && zoomEnabled;
  const currentScale = zoom?.scale ?? 1;
  const currentFitScale = zoom?.fitScale ?? 1;
  const currentMinScale = zoom?.minScale ?? 0.5;
  const currentMaxScale = zoom?.maxScale ?? 4;

  return (
    <div className={cn("fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm", overlayClassName)}>
      <div className="absolute inset-0" onClick={onClose} />

      <section className={cn("relative mx-auto flex h-full w-full flex-col bg-[#101014]", maxWidthClassName)}>
        <PreviewAppBar
          title={title}
          onBack={onBack}
          onClose={onClose}
          onSave={onSave}
          titleClassName={cn("max-w-[180px] truncate sm:max-w-[320px]", titleClassName)}
          className={cn("fixed top-0 left-1/2 z-[10010] w-full -translate-x-1/2", maxWidthClassName)}
          style={{
            minHeight: `calc(${HEADER_HEIGHT_PX}px + env(safe-area-inset-top))`,
            height: `calc(${HEADER_HEIGHT_PX}px + env(safe-area-inset-top))`,
            paddingTop: "env(safe-area-inset-top)",
            boxSizing: "border-box",
          }}
        />

        <FloatingToolbar
          onZoomOut={() => zoom?.zoomOut()}
          onFit={() => zoom?.fitToWidth()}
          onTogglePan={() => zoom?.togglePan()}
          onZoomIn={() => zoom?.zoomIn()}
          onShare={() => onShare?.()}
          panActive={activeZoom ? !!zoom?.isPanning : false}
          fitActive={activeZoom ? Math.abs(currentScale - currentFitScale) < 0.02 : false}
          zoomOutDisabled={!activeZoom || currentScale <= currentMinScale + 0.01}
          zoomInDisabled={!activeZoom || currentScale >= currentMaxScale - 0.01}
          className="z-[10009]"
        />

        <PreviewViewport headerHeightPx={HEADER_HEIGHT_PX} toolbarHeightPx={TOOLBAR_HEIGHT_PX} className="bg-[#101014]">
          <div
            ref={zoom?.viewportRef}
            className={cn(
              "min-h-full px-3 py-2",
              activeZoom && zoom?.isPanning && "cursor-grab active:cursor-grabbing",
            )}
            style={{
              touchAction: activeZoom && zoom?.isPanning ? "none" : "pan-x pan-y pinch-zoom",
            }}
            onWheel={activeZoom ? zoom?.onWheel : undefined}
            onPointerDown={activeZoom ? zoom?.onPointerDown : undefined}
            onPointerMove={activeZoom ? zoom?.onPointerMove : undefined}
            onPointerUp={activeZoom ? zoom?.onPointerUp : undefined}
            onPointerCancel={activeZoom ? zoom?.onPointerUp : undefined}
            onPointerLeave={activeZoom ? zoom?.onPointerUp : undefined}
            onTouchStart={activeZoom ? zoom?.onTouchStart : undefined}
            onTouchMove={activeZoom ? zoom?.onTouchMove : undefined}
            onTouchEnd={activeZoom ? zoom?.onTouchEnd : undefined}
            onTouchCancel={activeZoom ? zoom?.onTouchEnd : undefined}
          >
            <div
              className="w-full min-h-full flex items-start justify-center"
              style={{
                transform: `translate(${zoom?.pan.x ?? 0}px, ${zoom?.pan.y ?? 0}px) scale(${activeZoom ? currentScale : 1})`,
                transformOrigin: "top center",
                willChange: activeZoom ? "transform" : "auto",
              }}
            >
              <div
                ref={(node) => {
                  if (zoom?.contentRef) (zoom.contentRef as { current: HTMLElement | null }).current = node as HTMLElement | null;
                  if (contentRef) (contentRef as { current: HTMLElement | null }).current = node as HTMLElement | null;
                }}
                className="inline-block"
              >
                {children}
              </div>
            </div>
          </div>
        </PreviewViewport>
      </section>
    </div>
  );
}
