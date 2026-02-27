import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
} from "react";

type Point = { x: number; y: number };

interface UsePreviewZoomPanOptions {
  open: boolean;
  defaultMinScale?: number;
  defaultMaxScale?: number;
}

const touchDistance = (touches: TouchList) => {
  if (touches.length < 2) return 0;
  const dx = touches[1].clientX - touches[0].clientX;
  const dy = touches[1].clientY - touches[0].clientY;
  return Math.hypot(dx, dy);
};

export function usePreviewZoomPan({
  open,
  defaultMinScale = 0.5,
  defaultMaxScale = 4,
}: UsePreviewZoomPanOptions) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  const [scale, setScaleState] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [minScale, setMinScale] = useState(defaultMinScale);
  const [maxScale] = useState(defaultMaxScale);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPinchDist, setLastPinchDist] = useState<number | null>(null);

  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);

  const clampScale = useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) return scale;
      return Math.min(maxScale, Math.max(minScale, next));
    },
    [maxScale, minScale, scale],
  );

  const setScale = useCallback(
    (next: number) => {
      setScaleState(clampScale(next));
    },
    [clampScale],
  );

  const resetPan = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  const fitToWidth = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const viewportW = Math.max(1, viewport.clientWidth - 24);
    const contentW = Math.max(1, content.offsetWidth || content.scrollWidth || 1);
    const nextFit = viewportW / contentW;
    const safeFit = Number.isFinite(nextFit) && nextFit > 0 ? nextFit : 1;
    const nextMin = Math.min(defaultMinScale, safeFit);

    setFitScale(safeFit);
    setMinScale(nextMin);
    setScaleState(Math.min(maxScale, Math.max(nextMin, safeFit)));
    resetPan();
  }, [defaultMinScale, maxScale, resetPan]);

  const zoomIn = useCallback(() => {
    setScaleState((prev) => clampScale(prev * 1.1));
  }, [clampScale]);

  const zoomOut = useCallback(() => {
    setScaleState((prev) => clampScale(prev * 0.9));
  }, [clampScale]);

  const togglePan = useCallback(() => {
    setIsPanning((prev) => !prev);
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isPanning) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [isPanning, pan.x, pan.y],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isPanning || !isDragging || !dragStartRef.current) return;
      setPan({
        x: dragStartRef.current.panX + (event.clientX - dragStartRef.current.x),
        y: dragStartRef.current.panY + (event.clientY - dragStartRef.current.y),
      });
    },
    [isDragging, isPanning],
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const onMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isPanning) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [isPanning, pan.x, pan.y],
  );

  const onMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isPanning || !isDragging || !dragStartRef.current) return;
      setPan({
        x: dragStartRef.current.panX + (event.clientX - dragStartRef.current.x),
        y: dragStartRef.current.panY + (event.clientY - dragStartRef.current.y),
      });
    },
    [isDragging, isPanning],
  );

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const onWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      const zoomIntent = event.ctrlKey || event.metaKey;
      if (!zoomIntent) return;
      event.preventDefault();
      setScaleState((prev) => clampScale(prev * (event.deltaY > 0 ? 0.9 : 1.1)));
    },
    [clampScale],
  );

  const onTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2) {
        const dist = touchDistance(event.touches);
        pinchStartRef.current = { dist, scale };
        setLastPinchDist(dist);
        return;
      }
      if (isPanning && event.touches.length === 1) {
        dragStartRef.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
          panX: pan.x,
          panY: pan.y,
        };
        setIsDragging(true);
      }
    },
    [isPanning, pan.x, pan.y, scale],
  );

  const onTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (event.touches.length === 2 && pinchStartRef.current) {
        event.preventDefault();
        const dist = touchDistance(event.touches);
        setLastPinchDist(dist);
        if (dist > 0 && pinchStartRef.current.dist > 0) {
          const ratio = dist / pinchStartRef.current.dist;
          setScaleState(clampScale(pinchStartRef.current.scale * ratio));
        }
        return;
      }

      if (isPanning && isDragging && dragStartRef.current && event.touches.length === 1) {
        setPan({
          x: dragStartRef.current.panX + (event.touches[0].clientX - dragStartRef.current.x),
          y: dragStartRef.current.panY + (event.touches[0].clientY - dragStartRef.current.y),
        });
      }
    },
    [clampScale, isDragging, isPanning],
  );

  const onTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
    dragStartRef.current = null;
    setLastPinchDist(null);
    setIsDragging(false);
  }, []);

  const reset = useCallback(
    (nextScale?: number) => {
      if (typeof nextScale === "number") {
        setScaleState(clampScale(nextScale));
      } else {
        setScaleState(clampScale(fitScale || 1));
      }
      resetPan();
    },
    [clampScale, fitScale, resetPan],
  );

  const onDoubleClick = useCallback(() => {
    const target = Math.abs(scale - fitScale) < 0.02 ? clampScale((fitScale || 1) * 1.8) : fitScale || 1;
    setScaleState(target);
    resetPan();
  }, [clampScale, fitScale, resetPan, scale]);

  useEffect(() => {
    if (!open) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        fitToWidth();
      });
    });
    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [fitToWidth, open]);

  useEffect(() => {
    if (!open) return;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const ro = new ResizeObserver(() => fitToWidth());
    ro.observe(viewport);
    ro.observe(content);
    return () => ro.disconnect();
  }, [fitToWidth, open]);

  useEffect(() => {
    if (!open) {
      setScaleState(1);
      setFitScale(1);
      setMinScale(defaultMinScale);
      setPan({ x: 0, y: 0 });
      setIsPanning(false);
      setIsDragging(false);
      setLastPinchDist(null);
      dragStartRef.current = null;
      pinchStartRef.current = null;
    }
  }, [defaultMinScale, open]);

  return {
    scale,
    fitScale,
    minScale,
    maxScale,
    pan,
    isPanning,
    isDragging,
    lastPinchDist,
    viewportRef,
    containerRef: viewportRef,
    contentRef,
    position: pan,
    canPan: scale > minScale + 0.01,
    setScale,
    fitToWidth,
    recalcFit: fitToWidth,
    zoomIn,
    zoomOut,
    togglePan,
    resetPan,
    reset,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onDoubleClick,
  };
}

export type PreviewZoomPan = ReturnType<typeof usePreviewZoomPan>;
