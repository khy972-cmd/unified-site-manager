import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DrawingMarkingOverlayProps = {
  isOpen: boolean;
  imageSrc: string;
  onPrev?: () => void;
  onDeleteSelected?: () => void;
  onSave?: () => void;
};

const LABEL_PREV = "\uC774\uC804";
const LABEL_TITLE = "\uB3C4\uBA74\uB9C8\uD0B9";
const LABEL_DELETE = "\uC120\uD0DD\uC0AD\uC81C";
const LABEL_SAVE = "\uC800\uC7A5";
const ALT_DRAWING = "\uB3C4\uBA74";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.postMessage({ type: "inopnc-drawing", open: isOpen }, window.location.origin);
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-[2000] flex flex-col bg-black/70 text-white transition-transform duration-300 ease-out",
        active ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] font-bold sm:text-xs"
          >
            {LABEL_PREV}
          </button>
          <span className="text-sm font-bold sm:text-lg">{LABEL_TITLE}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onDeleteSelected}
            className="flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] font-bold sm:text-xs"
          >
            {LABEL_DELETE}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-[11px] font-bold text-primary-foreground sm:text-xs"
          >
            {LABEL_SAVE}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <img src={imageSrc} alt={ALT_DRAWING} className="h-full w-full object-contain" />
      </div>
    </div>
  );
}
