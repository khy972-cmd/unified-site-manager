import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DrawingMarkingOverlayProps = {
  isOpen: boolean;
  imageSrc: string;
  onPrev?: () => void;
  onDeleteSelected?: () => void;
  onSave?: () => void;
};

export default function DrawingMarkingOverlay({
  isOpen,
  imageSrc,
  onPrev,
  onDeleteSelected,
  onSave,
}: DrawingMarkingOverlayProps) {
  const [mounted, setMounted] = useState(isOpen);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(frame);
    }

    setActive(false);
    const timeout = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-[2000] flex flex-col bg-black/70 text-white transition-transform duration-300 ease-out",
        active ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] font-bold sm:text-xs"
          >
            이전
          </button>
          <span className="text-sm font-bold sm:text-lg">도면마킹</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onDeleteSelected}
            className="flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] font-bold sm:text-xs"
          >
            선택삭제
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground sm:text-xs"
          >
            저장
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <img src={imageSrc} alt="도면" className="h-full w-full object-contain" />
      </div>
    </div>
  );
}
