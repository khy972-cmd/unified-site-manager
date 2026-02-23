import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, X, Search, ChevronDown, ChevronUp } from "lucide-react";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  desc: string;
  category: string;
  link?: string;
}

const APP_DATA: SearchResult[] = [
  { id: "page_main", title: "홈", desc: "메인 페이지", category: "페이지", link: "/" },
  { id: "page_money", title: "출력현황", desc: "급여/출력 관리", category: "페이지", link: "/output" },
  { id: "page_worklog", title: "현장기록", desc: "작업일지 작성", category: "페이지", link: "/worklog" },
  { id: "page_site", title: "현장정보", desc: "현장 관리", category: "페이지", link: "/site" },
  { id: "page_doc", title: "문서함", desc: "내문서/회사서류/사진/도면", category: "페이지", link: "/doc" },
  { id: "section_photos", title: "사진대지 관리", desc: "현장 사진 업로드 및 분류", category: "현장" },
  { id: "section_drawings", title: "도면 마킹", desc: "실시간 도면 수정 사항 체크", category: "현장" },
  { id: "section_cert", title: "작업완료확인서", desc: "관리자 승인 요청", category: "현장" },
];

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
      try {
        const saved = JSON.parse(localStorage.getItem("INOPNC_RECENT_SEARCHES_v1") || "[]");
        setRecentSearches(saved);
      } catch { setRecentSearches([]); }
    } else {
      setQuery("");
      setShowResults(false);
      setVisibleCount(5);
    }
  }, [isOpen]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setShowResults(false);
      return;
    }
    setShowResults(true);
    const lower = q.toLowerCase();
    const filtered = APP_DATA.filter(
      item => item.title.toLowerCase().includes(lower) || item.desc.toLowerCase().includes(lower)
    );
    setResults(filtered);
  }, []);

  const saveRecentSearch = (term: string) => {
    if (term.trim().length < 2) return;
    try {
      let recent = JSON.parse(localStorage.getItem("INOPNC_RECENT_SEARCHES_v1") || "[]");
      recent = recent.filter((r: string) => r !== term);
      recent.unshift(term);
      recent = recent.slice(0, 5);
      localStorage.setItem("INOPNC_RECENT_SEARCHES_v1", JSON.stringify(recent));
      setRecentSearches(recent);
    } catch {}
  };

  const removeRecentSearch = (term: string) => {
    try {
      let recent = JSON.parse(localStorage.getItem("INOPNC_RECENT_SEARCHES_v1") || "[]");
      recent = recent.filter((r: string) => r !== term);
      localStorage.setItem("INOPNC_RECENT_SEARCHES_v1", JSON.stringify(recent));
      setRecentSearches(recent);
    } catch {}
  };

  const performSearch = () => {
    if (!query.trim()) return;
    setVisibleCount(5);
    saveRecentSearch(query.trim());
    handleSearch(query);
  };

  const setSearchFromTag = (term: string) => {
    setQuery(term);
    handleSearch(term);
    saveRecentSearch(term);
  };

  return (
    <div
      className={`fixed inset-0 left-0 right-0 mx-auto max-w-app bg-background z-[2000] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
        isOpen ? "translate-y-0 visible" : "translate-y-full invisible"
      }`}
    >
      {/* Search Header */}
      <div className="flex items-center gap-2.5 h-[70px] px-4 bg-card border-b border-border shrink-0">
        <button onClick={onClose} className="bg-transparent border-none p-1">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && performSearch()}
            placeholder="검색어를 입력하세요."
            className="w-full h-[50px] rounded-full bg-[hsl(var(--bg-input))] border border-border px-5 pr-[76px] text-base-app font-medium text-foreground outline-none transition-all focus:bg-card focus:border-primary focus:shadow-input-focus"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button
                onClick={() => { setQuery(""); handleSearch(""); inputRef.current?.focus(); }}
                className="w-6 h-6 rounded-full bg-muted-foreground/40 text-card flex items-center justify-center border-none cursor-pointer transition-transform hover:scale-110"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={performSearch}
          className="bg-transparent border-none text-primary font-bold text-base-app cursor-pointer whitespace-nowrap pl-3"
        >
          검색
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {!showResults ? (
          /* Default View - Recent Searches */
          <div>
            <span className="text-base-app font-bold text-text-sub block mb-3">최근 검색어</span>
            <div className="flex gap-2 flex-wrap mb-5">
              {recentSearches.length === 0 ? (
                <div className="text-sm-app text-muted-foreground">최근 검색어가 없습니다.</div>
              ) : (
                recentSearches.map((term) => (
                  <div key={term} className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setSearchFromTag(term)}
                      className="bg-card border border-border px-3.5 py-2 rounded-[20px] text-sm-app text-text-sub font-bold cursor-pointer transition-colors active:bg-background"
                    >
                      {term}
                    </button>
                    <button
                      onClick={() => removeRecentSearch(term)}
                      className="bg-muted-foreground/60 text-card border-none rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {/* Quick Actions */}
            <span className="text-base-app font-bold text-text-sub block mb-3">빠른 이동</span>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "작업일지", icon: "📋", highlight: true },
                { label: "현장정보", icon: "📍" },
                { label: "문서함", icon: "📁" },
                { label: "출력현황", icon: "💰" },
                { label: "확인서", icon: "✅", isCert: true },
                { label: "본사요청", icon: "📨" },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`h-[50px] flex items-center justify-center gap-1.5 rounded-xl border text-sm-app font-bold cursor-pointer transition-all active:scale-[0.98] ${
                    item.highlight
                      ? "text-primary border-primary/30 bg-[#f0f9ff]"
                      : item.isCert
                      ? "text-emerald-600 bg-emerald-50 border-emerald-300"
                      : "text-text-sub bg-[hsl(var(--bg-input))] border-border"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Results View */
          <div>
            <span className="text-base-app font-bold text-text-sub block mb-3">
              검색 결과 {results.length}건
            </span>
            {results.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-[hsl(var(--bg-input))] flex items-center justify-center mb-5">
                  <Search className="w-8 h-8 opacity-60" />
                </div>
                <p className="text-base font-medium mb-2">검색 결과가 없습니다</p>
              </div>
            ) : (
              <>
                {results.slice(0, visibleCount).map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-card rounded-2xl p-5 mb-3.5 shadow-soft cursor-pointer transition-transform active:scale-[0.98]"
                    onClick={() => { onClose(); }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="text-[calc(var(--fs-lg)+1px)] font-[800] text-foreground leading-tight mb-0.5">
                          {item.title}
                        </div>
                        <div className="text-[calc(var(--fs-sm)+1px)] text-text-sub font-medium">
                          {item.desc}
                        </div>
                      </div>
                      <span className="bg-primary-bg text-primary text-tiny font-bold px-2.5 py-1 rounded-md whitespace-nowrap">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
                {results.length > 5 && (
                  <button
                    onClick={() => setVisibleCount(v => v >= results.length ? 5 : v + 5)}
                    className="w-full h-[50px] bg-card border border-border rounded-full text-text-sub font-semibold text-sm-app cursor-pointer flex items-center justify-center gap-1.5 mt-2.5 transition-colors active:bg-background"
                  >
                    {visibleCount >= results.length ? "접기" : "더 보기"}
                    {visibleCount >= results.length ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
