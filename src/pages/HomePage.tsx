import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PartnerHomePage from "@/components/partner/PartnerHomePage";
import { useUserRole } from "@/hooks/useUserRole";

const HOME_MAIN_URL = "/home-v2/main-v2-app/index.html?v=github-khy972-20260223";
const HOME_ALLOWED_ROUTES = new Set(["/", "/output", "/worklog", "/site", "/doc", "/request"]);

export default function HomePage() {
  const { isPartner } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; path?: string } | null;
      if (!data || data.type !== "inopnc:navigate") return;
      const path = typeof data.path === "string" ? data.path : "";
      if (!HOME_ALLOWED_ROUTES.has(path)) {
        console.warn("[inopnc] invalid path", path);
        return;
      }
      navigate(path);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  if (isPartner) {
    return <PartnerHomePage />;
  }

  return (
    <section
      className="-mx-4"
      style={{
        marginTop: "var(--home-section-mt, -0.5rem)",
        marginBottom: "var(--home-section-mb, -1.5rem)",
      }}
    >
      <iframe
        title="INOPNC Home Main"
        src={HOME_MAIN_URL}
        className="block w-full border-0 bg-background"
        style={{ height: "calc(100dvh - var(--app-header-height, 114px))" }}
      />
    </section>
  );
}

