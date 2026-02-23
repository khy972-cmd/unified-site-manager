import { useState, useMemo } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// Mock deployment data for partner (투입인원 기준)
const MOCK_DEPLOYMENTS: Record<string, { site: string; people: number; note: string }[]> = {
  '2026-01-02': [{ site: '광주첨단센트럴', people: 2, note: '새김질 작업' }],
  '2026-01-03': [
    { site: '삼표 용인Y1CUB', people: 1, note: '신규교육' },
    { site: '광주첨단센트럴', people: 3, note: '보양' },
  ],
  '2026-01-04': [{ site: '대전도안리버파크', people: 1, note: '협의회 미팅' }],
  '2026-01-05': [
    { site: '푸르지오수원', people: 1, note: '균열보수 작업완료' },
    { site: '광주첨단센트럴', people: 2, note: '보양' },
  ],
  '2026-01-06': [{ site: '인천 공항 제2터미널', people: 2, note: '정리 및 마감' }],
  '2026-02-03': [{ site: '자이 아파트 101동', people: 3, note: '면처리' }],
  '2026-02-05': [{ site: '삼성 반도체 P3', people: 2, note: '배관' }],
  '2026-02-10': [
    { site: '자이 아파트 101동', people: 4, note: '청소' },
    { site: '힐스테이트 센트럴', people: 1, note: '균열보수' },
  ],
  '2026-02-12': [{ site: '부산 해운대 엘시티', people: 5, note: '로비 타일' }],
  '2026-02-18': [{ site: '판교 알파돔시티', people: 3, note: '용접 작업' }],
  '2026-02-20': [{ site: '인천공항 4단계', people: 6, note: '바닥 타일' }],
  '2026-02-23': [{ site: '자이 아파트 101동', people: 2, note: '마감' }],
};

export default function PartnerOutputPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [filterSite, setFilterSite] = useState("");
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [detailModal, setDetailModal] = useState<{ date: string; entries: { site: string; people: number; note: string }[] } | null>(null);

  const workData = MOCK_DEPLOYMENTS;

  // Calendar rendering
  const calendarData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth, 0).getDate();
    const cells: { day: number; isToday: boolean; entries: { site: string; people: number; note: string }[] }[] = [];

    for (let d = 1; d <= lastDate; d++) {
      const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let entries = workData[dateKey] || [];
      if (filterSite) {
        entries = entries.filter(e => e.site === filterSite);
      }
      const isToday = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth && today.getDate() === d;
      cells.push({ day: d, isToday, entries });
    }

    return { firstDay, cells };
  }, [currentYear, currentMonth, filterSite, workData]);

  const summaryStats = useMemo(() => {
    const sites = new Set<string>();
    let totalPeople = 0;
    let workedDays = 0;

    calendarData.cells.forEach(cell => {
      if (cell.entries.length > 0) {
        workedDays++;
        cell.entries.forEach(e => {
          sites.add(e.site);
          totalPeople += e.people;
        });
      }
    });

    return { totalSites: sites.size, totalPeople, workedDays };
  }, [calendarData]);

  const uniqueSites = useMemo(() => {
    const sites = new Set<string>();
    Object.values(workData).forEach(entries => entries.forEach(e => sites.add(e.site)));
    return Array.from(sites).sort();
  }, [workData]);

  const filteredDropdownSites = uniqueSites.filter(s => s.toLowerCase().includes(filterSite.toLowerCase()));

  const changeMonth = (delta: number) => {
    let m = currentMonth + delta;
    let y = currentYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  return (
    <div className="animate-fade-in">
      {/* Site Search + Month Filter */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={filterSite}
            onChange={e => { setFilterSite(e.target.value); setShowSiteDropdown(true); }}
            onFocus={() => setShowSiteDropdown(true)}
            placeholder="현장 선택 또는 검색"
            className="w-full h-[54px] bg-card border border-border rounded-xl px-4 pr-12 text-[17px] font-medium text-foreground placeholder:text-muted-foreground outline-none transition-all hover:border-primary/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(49,163,250,0.15)]"
          />
          {filterSite && (
            <button
              onClick={() => { setFilterSite(''); setShowSiteDropdown(false); }}
              className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[12px] text-muted-foreground z-10"
            >✕</button>
          )}
          <button
            onClick={() => setShowSiteDropdown(!showSiteDropdown)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          {showSiteDropdown && (
            <ul className="absolute z-50 w-full mt-1.5 max-h-60 overflow-auto bg-card border border-border rounded-xl shadow-lg animate-fade-in">
              {filteredDropdownSites.length === 0 ? (
                <li className="p-4 text-muted-foreground text-center text-sm-app">검색 결과가 없습니다</li>
              ) : filteredDropdownSites.map(site => (
                <li
                  key={site}
                  onClick={() => { setFilterSite(site); setShowSiteDropdown(false); }}
                  className="px-4 py-3.5 cursor-pointer border-b border-border last:border-0 text-[16px] font-medium text-foreground hover:bg-muted transition-colors"
                >{site}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setPickerYear(currentYear); setShowMonthPicker(!showMonthPicker); }}
            className={cn(
              "flex items-center justify-between min-w-[145px] h-[54px] px-4 bg-card border border-border rounded-xl text-[17px] font-bold text-foreground cursor-pointer transition-all hover:border-primary/50",
              showMonthPicker && "border-primary shadow-[0_0_0_3px_rgba(49,163,250,0.15)]"
            )}
          >
            <span>{currentYear}년 {currentMonth}월</span>
            <Calendar className="w-[18px] h-[18px] text-muted-foreground ml-2" />
          </button>

          {showMonthPicker && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-[280px] bg-card border border-border rounded-2xl shadow-lg p-4 z-[1000] animate-fade-in">
              <div className="flex justify-between items-center mb-4 px-1">
                <button onClick={() => setPickerYear(p => p - 1)} className="p-1 hover:bg-muted rounded"><ChevronLeft className="w-[18px] h-[18px]" /></button>
                <span className="font-bold text-lg-app">{pickerYear}년</span>
                <button onClick={() => setPickerYear(p => p + 1)} className="p-1 hover:bg-muted rounded"><ChevronRight className="w-[18px] h-[18px]" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <button
                    key={m}
                    onClick={() => { setCurrentYear(pickerYear); setCurrentMonth(m); setShowMonthPicker(false); }}
                    className={cn(
                      "h-11 rounded-lg text-[15px] font-semibold cursor-pointer transition-all border-none",
                      pickerYear === currentYear && m === currentMonth
                        ? "bg-primary/10 text-primary font-[800]"
                        : "text-text-sub hover:bg-muted hover:text-primary"
                    )}
                  >{m}월</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl overflow-hidden mb-4 bg-card shadow-soft">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <button onClick={() => changeMonth(-1)} className="bg-transparent border-none cursor-pointer text-text-sub p-2 hover:bg-muted rounded-full">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <span className="text-[22px] font-[800] text-foreground">{currentYear}년 {currentMonth}월</span>
          <button onClick={() => changeMonth(1)} className="bg-transparent border-none cursor-pointer text-text-sub p-2 hover:bg-muted rounded-full">
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>

        <div className="grid grid-cols-7">
          {WEEK_DAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "h-9 flex items-center justify-center text-[14px] font-bold border-b border-border bg-muted/50",
                i === 0 ? "text-destructive" : i === 6 ? "text-primary" : "text-text-sub"
              )}
            >{d}</div>
          ))}

          {Array.from({ length: calendarData.firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[96px] border-b border-r border-border bg-card" />
          ))}

          {calendarData.cells.map(cell => {
            const dayOfWeek = (calendarData.firstDay + cell.day - 1) % 7;
            const totalPeople = cell.entries.reduce((s, e) => s + e.people, 0);

            return (
              <div
                key={cell.day}
                onClick={() => cell.entries.length > 0 && setDetailModal({
                  date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`,
                  entries: cell.entries,
                })}
                className={cn(
                  "min-h-[96px] p-1.5 flex flex-col items-center gap-0.5 cursor-pointer border-b border-border bg-card hover:bg-muted transition-colors",
                  dayOfWeek < 6 && "border-r"
                )}
              >
                <span className={cn(
                  "text-[15px] font-bold w-[26px] h-[26px] rounded-full flex items-center justify-center mb-1",
                  cell.isToday ? "bg-header-navy text-white font-[800]" : dayOfWeek === 0 ? "text-destructive" : dayOfWeek === 6 ? "text-primary" : "text-foreground"
                )}>{cell.day}</span>

                {cell.entries.length > 0 && (
                  <div className="w-full flex flex-col items-center">
                    <span className="text-[13px] font-[800] text-primary">{totalPeople}명</span>
                    <span className="text-[11px] font-bold text-text-sub truncate max-w-full text-center">
                      {cell.entries.length === 1
                        ? cell.entries[0].site.replace(/\s+/g, '').slice(0, 4)
                        : `${cell.entries[0].site.replace(/\s+/g, '').slice(0, 4)}외${cell.entries.length - 1}`
                      }
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <div className="p-4 rounded-2xl text-center flex flex-col gap-1.5 shadow-soft bg-[hsl(201_100%_94%)] text-[#0284c7] border border-[#0284c7]">
          <span className="text-[24px] font-[800] leading-tight tracking-tight">{summaryStats.totalSites}</span>
          <span className="text-[14px] font-bold opacity-90">현장수</span>
        </div>
        <div className="p-4 rounded-2xl text-center flex flex-col gap-1.5 shadow-soft bg-[hsl(225_33%_95%)] text-[#1e3a8a] border border-[#1e3a8a]">
          <span className="text-[24px] font-[800] leading-tight tracking-tight">{summaryStats.totalPeople}</span>
          <span className="text-[14px] font-bold opacity-90">투입인원</span>
        </div>
        <div className="p-4 rounded-2xl text-center flex flex-col gap-1.5 shadow-soft bg-muted text-text-sub border border-text-sub">
          <span className="text-[24px] font-[800] leading-tight tracking-tight">{summaryStats.workedDays}</span>
          <span className="text-[14px] font-bold opacity-90">투입일</span>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-5" onClick={() => setDetailModal(null)}>
          <div className="bg-card w-full max-w-[440px] rounded-[20px] p-6 shadow-lg max-h-[80vh] overflow-y-auto border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[20px] font-[800] text-foreground">작업 상세 정보</span>
              <button onClick={() => setDetailModal(null)} className="bg-transparent border-none text-text-sub p-1 cursor-pointer"><X className="w-6 h-6" /></button>
            </div>
            <div className="text-sm-app text-text-sub mb-3 font-medium">{detailModal.date}</div>
            <div className="mt-2">
              {detailModal.entries.map((entry, i) => (
                <div key={i} className="flex justify-between items-start py-2.5 border-b border-border gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-foreground truncate">{entry.site}</div>
                    {entry.note && <div className="text-[13px] text-muted-foreground mt-0.5">{entry.note}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[15px] font-[800] text-primary">{entry.people}명</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
              <span className="text-[15px] font-bold text-text-sub">합계</span>
              <span className="text-[18px] font-[800] text-primary">
                {detailModal.entries.reduce((s, e) => s + e.people, 0)}명
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
