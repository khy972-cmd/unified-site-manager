import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PartnerHomePage from "@/components/partner/PartnerHomePage";
import { useUserRole } from "@/hooks/useUserRole";

const HOME_VER =
  import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ??
  import.meta.env.VERCEL_GIT_COMMIT_SHA ??
  Date.now().toString();
const HOME_MAIN_URL = `/home-v2/main-v2-app/index.html?v=${HOME_VER}`;
const HOME_ALLOWED_ROUTES = new Set(["/", "/output", "/worklog", "/site", "/doc", "/request"]);

export default function HomePage() {
  const { isPartner } = useUserRole();
  const navigate = useNavigate();
  const [homeLoadFailed, setHomeLoadFailed] = useState(false);

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
      {homeLoadFailed ? (
        <div
          className="mx-4 rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
          style={{ minHeight: "calc(100dvh - var(--app-header-height, 114px))" }}
        >
          <p className="text-base font-semibold text-foreground">홈 화면을 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            홈 다시불러오기
          </button>
        </div>
      ) : (
        <iframe
          title="INOPNC Home Main"
          src={HOME_MAIN_URL}
          className="block w-full border-0 bg-background"
          style={{ height: "calc(100dvh - var(--app-header-height, 114px))" }}
          onError={() => setHomeLoadFailed(true)}
        />
      )}
    </section>
  );
}

