import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import {
  LayoutDashboard, ClipboardList, MapPin, Users, Handshake, FileText,
  ArrowLeft, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminWorklogManager from "@/components/admin/AdminWorklogManager";
import AdminSiteManager from "@/components/admin/AdminSiteManager";
import AdminUserManager from "@/components/admin/AdminUserManager";
import AdminPartnerManager from "@/components/admin/AdminPartnerManager";
import AdminDocManager from "@/components/admin/AdminDocManager";

const ADMIN_TABS = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { key: "worklog", label: "일지관리", icon: ClipboardList },
  { key: "site", label: "현장관리", icon: MapPin },
  { key: "user", label: "인력관리", icon: Users },
  { key: "partner", label: "파트너", icon: Handshake },
  { key: "doc", label: "문서관리", icon: FileText },
] as const;

type AdminTab = typeof ADMIN_TABS[number]["key"];

export default function AdminPage() {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-6">
        <div className="text-[48px]">🔒</div>
        <h2 className="text-xl-app font-[800] text-header-navy">접근 권한 없음</h2>
        <p className="text-text-sub text-center">본사관리자 권한이 필요합니다.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 h-12 px-6 bg-primary text-primary-foreground rounded-xl font-bold cursor-pointer"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <AdminDashboard onNavigate={(tab: string) => setActiveTab(tab as AdminTab)} />;
      case "worklog": return <AdminWorklogManager />;
      case "site": return <AdminSiteManager />;
      case "user": return <AdminUserManager />;
      case "partner": return <AdminPartnerManager />;
      case "doc": return <AdminDocManager />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Desktop Sidebar (≥768px) ─── */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[240px] bg-card border-r border-border flex-col z-50">
        <div className="h-[60px] px-5 flex items-center border-b border-border">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 bg-transparent border-none cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-text-sub" />
          </button>
          <span className="text-lg-app font-[800] text-header-navy ml-2">관리자 콘솔</span>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {ADMIN_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "w-full h-[46px] flex items-center gap-3 px-4 rounded-xl text-[15px] font-semibold border-none cursor-pointer transition-all",
                activeTab === tab.key
                  ? "bg-primary/10 text-primary font-[800]"
                  : "bg-transparent text-text-sub hover:bg-muted"
              )}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-[12px] text-muted-foreground text-center">INOPNC 관리자 v1.0</div>
        </div>
      </aside>

      {/* ─── Mobile Header ─── */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-50">
        <div className="h-[56px] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="bg-transparent border-none cursor-pointer p-1">
              <ArrowLeft className="w-5 h-5 text-text-sub" />
            </button>
            <span className="text-lg-app font-[800] text-header-navy">관리자 콘솔</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-transparent border-none cursor-pointer p-1"
          >
            {sidebarOpen ? <X className="w-6 h-6 text-text-sub" /> : <Menu className="w-6 h-6 text-text-sub" />}
          </button>
        </div>
        {/* Mobile Tab Scroll */}
        <nav className="h-[48px] flex items-center gap-0 overflow-x-auto no-scrollbar border-t border-border/50 px-2">
          {ADMIN_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
              className={cn(
                "h-full flex items-center gap-1.5 px-3 whitespace-nowrap text-[14px] font-bold border-none bg-transparent cursor-pointer transition-colors border-b-2 flex-shrink-0",
                activeTab === tab.key
                  ? "text-primary border-b-primary"
                  : "text-text-sub border-b-transparent"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ─── Mobile Sidebar Overlay ─── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute top-0 right-0 w-[260px] h-full bg-card shadow-lg animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-[56px] px-5 flex items-center justify-between border-b border-border">
              <span className="text-lg-app font-[800] text-header-navy">메뉴</span>
              <button onClick={() => setSidebarOpen(false)} className="bg-transparent border-none cursor-pointer">
                <X className="w-5 h-5 text-text-sub" />
              </button>
            </div>
            <nav className="py-3 px-3 space-y-1">
              {ADMIN_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
                  className={cn(
                    "w-full h-[46px] flex items-center gap-3 px-4 rounded-xl text-[15px] font-semibold border-none cursor-pointer transition-all",
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary font-[800]"
                      : "bg-transparent text-text-sub hover:bg-muted"
                  )}
                >
                  <tab.icon className="w-5 h-5 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ─── Content Area ─── */}
      <main className={cn(
        "min-h-screen pt-[104px] md:pt-0 md:ml-[240px]",
        "px-4 md:px-8 pb-8 md:py-8"
      )}>
        <div className="max-w-[960px] mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
