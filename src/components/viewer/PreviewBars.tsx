import type { CSSProperties } from "react";
import { ChevronLeft, Download, Hand, Minus, Plus, RefreshCw, RotateCcw, Share2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewAppBarProps {
  title: string;
  onBack: () => void;
  onClose: () => void;
  onReset?: () => void;
  onSave?: () => void;
  resetDisabled?: boolean;
  saveDisabled?: boolean;
  backAriaLabel?: string;
  resetAriaLabel?: string;
  saveAriaLabel?: string;
  closeAriaLabel?: string;
  titleClassName?: string;
  className?: string;
  style?: CSSProperties;
}

export function PreviewAppBar({
  title,
  onBack,
  onClose,
  onReset,
  onSave,
  resetDisabled,
  saveDisabled,
  backAriaLabel = "이전",
  resetAriaLabel = "입력 초기화",
  saveAriaLabel = "저장 또는 다운로드",
  closeAriaLabel = "닫기",
  titleClassName,
  className,
  style,
}: PreviewAppBarProps) {
  return (
    <header className={cn("flex items-center justify-between border-b border-white/15 bg-black px-2", className)} style={style}>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onBack} className="rounded-full p-2 text-white transition active:bg-white/15" aria-label={backAriaLabel}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className={cn("text-lg-app font-bold text-white", titleClassName)}>{title}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={resetDisabled}
            className="rounded-full p-2 text-white transition active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={resetAriaLabel}
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        )}

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="rounded-full p-2 text-white transition active:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={saveAriaLabel}
          >
            <Download className="h-5 w-5" />
          </button>
        )}

        <button type="button" onClick={onClose} className="rounded-full p-2 text-white transition active:bg-white/15" aria-label={closeAriaLabel}>
          <X className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
}

interface PreviewControlBarProps {
  onZoomOut: () => void;
  onFit: () => void;
  onTogglePan: () => void;
  onZoomIn: () => void;
  onShare: () => void;
  panActive?: boolean;
  fitActive?: boolean;
  zoomOutDisabled?: boolean;
  zoomInDisabled?: boolean;
  className?: string;
}

export function PreviewControlBar({
  onZoomOut,
  onFit,
  onTogglePan,
  onZoomIn,
  onShare,
  panActive = false,
  fitActive = false,
  zoomOutDisabled = false,
  zoomInDisabled = false,
  className,
}: PreviewControlBarProps) {
  return (
    <div
      data-no-pan="1"
      className={cn(
        "fixed bottom-[max(10px,env(safe-area-inset-bottom,0px))] left-1/2 z-[10020] flex w-[calc(100%-20px)] max-w-[560px] -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-[rgba(30,30,30,0.92)] px-5 py-2 shadow-xl backdrop-blur-lg",
        className,
      )}
    >
      <button
        data-no-pan="1"
        type="button"
        onClick={onZoomOut}
        disabled={zoomOutDisabled}
        className="min-w-10 bg-transparent border-none text-white flex flex-col items-center gap-1 text-[11px] font-medium opacity-80 hover:opacity-100 disabled:opacity-40 cursor-pointer"
      >
        <Minus className="w-5 h-5" />
        축소
      </button>

      <button
        data-no-pan="1"
        type="button"
        onClick={onFit}
        className={cn(
          "min-w-10 bg-transparent border-none flex flex-col items-center gap-1 text-[11px] font-medium cursor-pointer",
          fitActive ? "text-primary opacity-100 font-bold" : "text-white opacity-80 hover:opacity-100",
        )}
      >
        <RefreshCw className="w-5 h-5" />
        맞춤
      </button>

      <button
        data-no-pan="1"
        type="button"
        onClick={onTogglePan}
        className={cn(
          "min-w-10 bg-transparent border-none flex flex-col items-center gap-1 text-[11px] font-medium cursor-pointer",
          panActive ? "text-primary opacity-100 font-bold" : "text-white opacity-80 hover:opacity-100",
        )}
      >
        <Hand className="w-5 h-5" />
        이동
      </button>

      <button
        data-no-pan="1"
        type="button"
        onClick={onZoomIn}
        disabled={zoomInDisabled}
        className="min-w-10 bg-transparent border-none text-white flex flex-col items-center gap-1 text-[11px] font-medium opacity-80 hover:opacity-100 disabled:opacity-40 cursor-pointer"
      >
        <Plus className="w-5 h-5" />
        확대
      </button>

      <button
        data-no-pan="1"
        type="button"
        onClick={onShare}
        className="min-w-10 bg-transparent border-none text-white flex flex-col items-center gap-1 text-[11px] font-medium opacity-80 hover:opacity-100 cursor-pointer"
      >
        <Share2 className="w-5 h-5" />
        공유
      </button>
    </div>
  );
}
