import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Users, Phone, Camera, Map as MapIcon, FileText, ClipboardList, CheckCircle2, Cloud, Sun, CloudRain, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import iconFlash from "@/assets/icons/flash.png";
import iconSiteInfo from "@/assets/icons/site-info.png";
import iconWorklog from "@/assets/icons/worklog.png";
import iconOutput from "@/assets/icons/output.png";
import iconDocs from "@/assets/icons/docs.png";
import iconRequest from "@/assets/icons/request.png";

const MOCK_SITES = [
  {
    id: 1, name: "성수자이 아파트 101동", status: "ing" as const, days: 120, mp: 450,
    address: "서울 성동구 성수동 1가 12-3", worker: 8, manager: "이현수",
    safety: "김안전", affil: "수도권지사", lastUpdate: "2025-12-24 08:30",
    hasDraw: true, hasPhoto: true, hasPTW: true, hasLog: true, hasAction: false,
  },
  {
    id: 2, name: "강남 타워 리모델링", status: "wait" as const, days: 45, mp: 120,
    address: "서울 강남구 역삼동 123-45", worker: 3, manager: "박현장",
    safety: "최안전", affil: "본사관리실", lastUpdate: "2025-12-24 09:00",
    hasDraw: true, hasPhoto: false, hasPTW: false, hasLog: true, hasAction: true,
  },
];

const WEATHER_MAP: Record<string, { text: string; icon: typeof Sun }> = {
  서울: { text: "흐림 2°C", icon: Cloud },
  경기: { text: "비 4°C", icon: CloudRain },
  부산: { text: "맑음 8°C", icon: Sun },
  강남: { text: "맑음 3°C", icon: Sun },
  성동: { text: "흐림 2°C", icon: Cloud },
};

function getWeather(addr: string) {
  const r = Object.keys(WEATHER_MAP).find(k => addr.includes(k));
  return r ? WEATHER_MAP[r] : { text: "맑음 3°C", icon: Sun };
}

const QUICK_MENU = [
  { label: "현장정보", path: "/site", icon: iconSiteInfo },
  { label: "작업일지", path: "/worklog", icon: iconWorklog, badge: 3, badgeColor: "bg-green-600" },
  { label: "출력현황", path: "/output", icon: iconOutput },
  { label: "문서함", path: "/doc", icon: iconDocs },
  { label: "본사요청", path: "/request", icon: iconRequest, badge: 2, badgeColor: "bg-violet-500" },
];

const NOTICES = [
  { type: "공지", text: "동절기 현장 안전 관리 지침이 업데이트 되었습니다.", badgeCls: "bg-header-navy" },
  { type: "업데이트", text: "작업완료확인서 PDF 저장 기능이 개선되었습니다.", badgeCls: "bg-primary" },
  { type: "안내", text: "금일 전국 현장 강추위 주의 바랍니다.", badgeCls: "bg-header-navy" },
];

export default function PartnerHomePage() {
  const navigate = useNavigate();
  const today = new Date();
  const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")} (${["일", "월", "화", "수", "목", "금", "토"][today.getDay()]})`;

  // Notice slider
  const [noticeIdx, setNoticeIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNoticeIdx(prev => (prev + 1) % NOTICES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Quick Menu */}
      <div className="mb-5 pt-2.5">
        <div className="flex items-center gap-1.5 mb-4 px-1">
          <img src={iconFlash} alt="빠른메뉴" className="w-5 h-5 object-contain" />
          <span className="text-[20px] font-bold text-header-navy tracking-tight">빠른메뉴</span>
        </div>
        <div className="grid grid-cols-5 gap-0.5">
          {QUICK_MENU.map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 py-1 cursor-pointer bg-transparent border-none active:scale-95 transition-transform"
            >
              <div className="relative inline-block">
                <img src={item.icon} alt={item.label} className="w-[46px] h-[46px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]" />
                {item.badge && (
                  <span className={cn(
                    "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-[5px] rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.25)] border-2 border-background z-10 leading-none",
                    item.badgeColor,
                    item.badgeColor === "bg-violet-500" && "animate-pulse",
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[13px] font-bold text-foreground text-center whitespace-nowrap tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notice Slider */}
      <div className="bg-card rounded-xl border border-border shadow-soft h-14 mb-5 flex items-center px-4 gap-3 relative overflow-hidden">
        {NOTICES.map((n, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 flex items-center px-4 gap-3 transition-all duration-500",
              i === noticeIdx ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
            )}
          >
            <span className={cn("text-[12px] font-bold px-2.5 py-1.5 rounded-md text-white whitespace-nowrap", n.badgeCls)}>{n.type}</span>
            <span className="text-[15px] font-medium text-foreground flex-1 truncate">{n.text}</span>
          </div>
        ))}
        <ChevronRight className="w-[18px] h-[18px] text-text-sub relative z-10 ml-auto" />
      </div>

      {/* Summary */}
      <div className="bg-card rounded-2xl p-[22px] mb-6 shadow-soft">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-header-navy" />
            <span className="text-[19px] font-[800] text-header-navy">최근 현장 투입현황</span>
          </div>
          <span className="text-[14px] text-primary bg-primary/10 px-3 py-1.5 rounded-full font-bold">{dateStr}</span>
        </div>
        <div className="flex flex-col gap-3">
          {MOCK_SITES.map(s => (
            <div key={s.id} className="flex justify-between items-center bg-muted/50 p-3.5 px-[18px] rounded-xl">
              <span className="text-[16px] font-bold text-foreground flex-1 truncate pr-2">{s.name}</span>
              <span className="text-[16px] font-bold text-primary flex items-center gap-1">
                <Users className="w-[18px] h-[18px]" /> {s.worker}명
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Site Cards */}
      {MOCK_SITES.map(s => {
        const w = getWeather(s.address);
        const WeatherIcon = w.icon;
        return (
          <div key={s.id} className="bg-card rounded-2xl shadow-soft mb-5 overflow-hidden relative">
            <span className={cn(
              "absolute top-0 right-0 text-[11px] font-bold px-3 py-1 text-white rounded-bl-xl z-10",
              s.status === "ing" ? "bg-blue-500" : "bg-violet-500"
            )}>
              {s.status === "ing" ? "진행중" : "예정"}
            </span>
            <div className="p-5 border-b border-border">
              <span className="text-[15px] font-medium text-text-sub block mb-1">{s.lastUpdate}</span>
              <div className="text-[20px] font-[800] text-header-navy mb-4 w-[85%]">{s.name}</div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  <span className="text-[13px] font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-500 border border-indigo-200">현대건설</span>
                  <span className="text-[13px] font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/30">{s.affil}</span>
                  <span className="text-[13px] font-bold px-2.5 py-1 rounded-md bg-muted text-text-sub border border-border flex items-center gap-1">
                    <WeatherIcon className="w-3.5 h-3.5" />{w.text}
                  </span>
                </div>
                <div className="flex gap-1.5 items-center pl-2 border-l border-border ml-1">
                  <MapIcon className={cn("w-4 h-4", s.hasDraw ? "text-header-navy" : "text-border")} />
                  <Camera className={cn("w-4 h-4", s.hasPhoto ? "text-header-navy" : "text-border")} />
                  <FileText className={cn("w-4 h-4", s.hasPTW ? "text-header-navy" : "text-border")} />
                  <ClipboardList className={cn("w-4 h-4", s.hasLog ? "text-header-navy" : "text-border")} />
                  <CheckCircle2 className={cn("w-4 h-4", s.hasAction ? "text-header-navy" : "text-border")} />
                </div>
              </div>
            </div>
            <div className="p-[22px]">
              <div className="grid grid-cols-2 gap-3.5 mb-5">
                <div className="bg-muted/50 rounded-xl p-3.5 text-center border border-muted">
                  <span className="block text-[15px] text-text-sub font-bold mb-1.5">작업일 누계</span>
                  <span className="text-[20px] font-[800] text-foreground">{s.days}일</span>
                </div>
                <div className="bg-muted/50 rounded-xl p-3.5 text-center border border-muted">
                  <span className="block text-[15px] text-text-sub font-bold mb-1.5">누적 출력</span>
                  <span className="text-[20px] font-[800] text-primary">{s.mp}명</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-dashed border-border text-[15px] text-text-sub">
                <span className="font-bold text-[17px] w-20">현장소장</span>
                <span className="flex-1 font-semibold text-foreground text-right pr-3 text-[17px] truncate">{s.manager} 소장</span>
                <button onClick={() => window.location.href = "tel:01000000000"} className="w-9 h-9 rounded-[10px] bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center cursor-pointer">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-dashed border-border text-[15px] text-text-sub">
                <span className="font-bold text-[17px] w-20">안전담당</span>
                <span className="flex-1 font-semibold text-foreground text-right pr-3 text-[17px] truncate">{s.safety} 과장</span>
                <button onClick={() => window.location.href = "tel:01000000000"} className="w-9 h-9 rounded-[10px] bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center cursor-pointer">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-dashed border-border text-[15px] text-text-sub">
                <span className="font-bold text-[17px] w-20">주소</span>
                <span className="flex-1 font-semibold text-foreground text-right pr-3 text-[17px] truncate">{s.address}</span>
                <button className="w-9 h-9 rounded-[10px] bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center cursor-pointer">
                  <MapPin className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mt-5">
                {[
                  { label: "도면", icon: MapIcon, cls: "bg-primary/10 border-primary/30 text-primary" },
                  { label: "사진", icon: Camera, cls: "bg-indigo-50 border-indigo-200 text-indigo-500" },
                  { label: "문서", icon: FileText, cls: "bg-blue-50 border-blue-200 text-blue-600" },
                  { label: "일지", icon: ClipboardList, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                  { label: "조치", icon: CheckCircle2, cls: "bg-red-50 border-red-200 text-red-700" },
                ].map(a => (
                  <button key={a.label} className={cn("flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98]", a.cls)}>
                    <a.icon className="w-6 h-6" />
                    <span className="text-[14px] font-bold">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
