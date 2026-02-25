import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Download, Minus, Plus, Hand, Share2, X } from "lucide-react";

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function DocumentViewer({ open, onClose, title, children }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const isDragging = useRef(false);

  // Pinch zoom state
  const lastDistance = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      // Auto-fit to viewport width
      const screenW = window.innerWidth;
      const initialZoom = screenW < 800 ? screenW / 850 : 0.7;
      setZoom(Math.max(0.2, Math.min(initialZoom, 1)));
      setPan({ x: 0, y: 0 });

      // Fit after render
      requestAnimationFrame(() => {
        if (viewportRef.current && contentRef.current) {
          const vpRect = viewportRef.current.getBoundingClientRect();
          const first = contentRef.current.firstElementChild as HTMLElement;
          if (!first) return;

          // Temporarily reset transform to measure
          contentRef.current.style.transform = "translate(0px, 0px) scale(1)";
          const tRect = first.getBoundingClientRect();
          const maxW = vpRect.width - 36;
          const maxH = vpRect.height - 36;
          const sW = maxW / Math.max(1, tRect.width);
          const sH = maxH / Math.max(1, tRect.height);
          const s = Math.min(sW, sH, 1);
          setZoom(Math.max(0.15, s));
          setPan({ x: 0, y: 0 });
        }
      });
    }
  }, [open]);

  const adjustZoom = useCallback((delta: number) => {
    setZoom(z => Math.max(0.2, Math.min(3, z + delta)));
  }, []);

  // Mouse/Touch pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    isDragging.current = true;
    startRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isPanning, pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !isPanning) return;
    setPan({
      x: startRef.current.panX + (e.clientX - startRef.current.x),
      y: startRef.current.panY + (e.clientY - startRef.current.y),
    });
  }, [isPanning]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Pinch-to-zoom for touch
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastDistance.current !== null) {
        const delta = (dist - lastDistance.current) * 0.005;
        setZoom(z => Math.max(0.2, Math.min(3, z + delta)));
      }
      lastDistance.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDistance.current = null;
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(z => Math.max(0.2, Math.min(3, z + delta)));
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} - INOPNC` });
      } catch { /* user cancelled */ }
    }
  }, [title]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[#1e1e1e] z-[9999] flex flex-col max-w-[600px] mx-auto">
      {/* Header */}
      <div className="h-14 px-4 border-b border-[#333] flex justify-between items-center bg-black shrink-0">
        <button onClick={onClose} className="bg-transparent border-none text-white cursor-pointer p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-white font-bold text-[17px] max-w-[70%] truncate">{title}</span>
        <button onClick={() => {/* PDF download placeholder */}} className="bg-transparent border-none text-white cursor-pointer p-1">
          <Download className="w-6 h-6" />
        </button>
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        className={`flex-1 bg-[#333] overflow-hidden relative flex justify-center items-center ${isPanning ? "cursor-grabbing" : ""}`}
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchMove={handleTouchMove as any}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div
          ref={contentRef}
          className="flex flex-col items-center gap-5 p-5"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging.current ? "none" : "transform 0.1s ease-out",
          }}
        >
          {children}
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[rgba(30,30,30,0.9)] backdrop-blur-lg px-8 py-2.5 rounded-full flex gap-8 z-[10000] shadow-xl">
        <button onClick={() => adjustZoom(-0.1)} className="bg-transparent border-none text-white flex flex-col items-center gap-1 text-[11px] font-medium opacity-70 hover:opacity-100 cursor-pointer min-w-10">
          <Minus className="w-5 h-5" />축소
        </button>
        <button
          onClick={() => setIsPanning(!isPanning)}
          className={`bg-transparent border-none flex flex-col items-center gap-1 text-[11px] font-medium cursor-pointer min-w-10 ${isPanning ? "text-primary opacity-100 font-bold" : "text-white opacity-70 hover:opacity-100"}`}
        >
          <Hand className="w-5 h-5" />이동
        </button>
        <button onClick={() => adjustZoom(0.1)} className="bg-transparent border-none text-white flex flex-col items-center gap-1 text-[11px] font-medium opacity-70 hover:opacity-100 cursor-pointer min-w-10">
          <Plus className="w-5 h-5" />확대
        </button>
        <button onClick={handleShare} className="bg-transparent border-none text-white flex flex-col items-center gap-1 text-[11px] font-medium opacity-70 hover:opacity-100 cursor-pointer min-w-10">
          <Share2 className="w-5 h-5" />공유
        </button>
      </div>
    </div>
  );
}

/* ─── A4 Page Templates ─── */
export function A4Page({ children, pageNum, totalPages }: { children: React.ReactNode; pageNum: number; totalPages: number }) {
  return (
    <div className="bg-white shadow-lg" style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box" }}>
      <div style={{ border: "2px solid #1a254f", height: "100%", padding: "15mm", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        {children}
        <div className="mt-auto pt-4 flex justify-between text-[12px] text-[#999] border-t border-[#ddd]">
          <span>INOPNC Safety Management System</span>
          <span>{pageNum} / {totalPages}</span>
        </div>
      </div>
    </div>
  );
}

export function PhotoGrid({ photos, siteName }: { photos: { url: string; date?: string }[]; siteName: string }) {
  const totalPages = Math.ceil(photos.length / 4);
  return (
    <>
      {Array.from({ length: totalPages }, (_, page) => {
        const start = page * 4;
        const pagePhotos = photos.slice(start, start + 4);
        return (
          <A4Page key={page} pageNum={page + 1} totalPages={totalPages}>
            <div className="text-center border-b-2 border-[#1a254f] pb-3 mb-4">
              <div className="text-[24px] font-[800] text-[#1a254f]">공사 사진대지</div>
              <div className="text-[14px] text-[#666] mt-1">{siteName}</div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {pagePhotos.map((photo, idx) => (
                <div key={idx} className="border border-[#ddd] rounded-lg overflow-hidden flex flex-col bg-white">
                  <div className="flex-1 bg-[#f8fafc] flex items-center justify-center" style={{ minHeight: "80mm" }}>
                    <img src={photo.url} className="max-w-full max-h-full object-contain" alt={`사진 ${start + idx + 1}`} />
                  </div>
                  <div className="p-2 border-t border-[#ddd] bg-white">
                    <div className="text-[12px] font-bold text-[#1a254f]">사진 {start + idx + 1}</div>
                    <div className="text-[11px] text-[#666]">촬영일시: {photo.date || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          </A4Page>
        );
      })}
    </>
  );
}

export function WorklogDocument({ entry }: { entry: { siteName: string; workDate: string; manpower: any[]; workSets: any[]; materials?: any[] } }) {
  const totalWorkers = entry.manpower?.length || 0;
  const totalHours = entry.manpower?.reduce((s: number, m: any) => s + (m.workHours || 0), 0) || 0;

  return (
    <A4Page pageNum={1} totalPages={1}>
      <div className="text-center border-b-2 border-[#1a254f] pb-3 mb-4">
        <div className="text-[24px] font-[800] text-[#1a254f]">작업일지</div>
        <div className="text-[14px] text-[#666] mt-1">{entry.siteName}</div>
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-2 text-[14px] mb-6">
        <div className="font-bold text-[#1a254f]">작업일자</div>
        <div className="border-b border-[#ddd] py-1">{entry.workDate}</div>
        <div className="font-bold text-[#1a254f]">현장명</div>
        <div className="border-b border-[#ddd] py-1">{entry.siteName}</div>
        <div className="font-bold text-[#1a254f]">투입인원</div>
        <div className="border-b border-[#ddd] py-1">{totalWorkers}명 ({totalHours.toFixed(1)}공수)</div>
      </div>

      {entry.workSets?.map((ws: any, i: number) => (
        <div key={i} className="mb-4 p-3 bg-[#f8fafc] rounded-lg">
          <div className="text-[13px] font-bold text-[#1a254f] mb-1">작업 세트 {i + 1}</div>
          <div className="grid grid-cols-[80px_1fr] gap-1 text-[12px]">
            <span className="text-[#666]">부재명</span>
            <span>{ws.member === "기타" ? ws.customMemberValue : ws.member}</span>
            <span className="text-[#666]">공정</span>
            <span>{ws.process === "기타" ? ws.customProcessValue : ws.process}</span>
            <span className="text-[#666]">유형</span>
            <span>{ws.type === "기타" ? ws.customTypeValue : ws.type}</span>
            <span className="text-[#666]">위치</span>
            <span>{[ws.location?.block, ws.location?.dong, ws.location?.floor].filter(Boolean).join(" / ") || "-"}</span>
          </div>
        </div>
      ))}

      {entry.materials && entry.materials.length > 0 && (
        <div className="mt-4">
          <div className="text-[13px] font-bold text-[#1a254f] mb-2">자재 사용 내역</div>
          {entry.materials.map((m: any, i: number) => (
            <div key={i} className="flex justify-between text-[12px] py-1 border-b border-[#eee]">
              <span>{m.name}</span>
              <span>{m.qty}말</span>
            </div>
          ))}
        </div>
      )}
    </A4Page>
  );
}
