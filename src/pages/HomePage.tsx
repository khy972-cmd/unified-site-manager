import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PartnerHomePage from "@/components/partner/PartnerHomePage";
import { useUserRole } from "@/hooks/useUserRole";
import LegacyHomePage from "@/pages/HomePage.legacy";

const HOME_VER =
  import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ??
  import.meta.env.VERCEL_GIT_COMMIT_SHA ??
  Date.now().toString();
const APP_BASE = import.meta.env.BASE_URL || "/";
const BASE_PREFIX = APP_BASE.endsWith("/") ? APP_BASE : `${APP_BASE}/`;
const HOME_MAIN_URL = `${BASE_PREFIX}home-v2/main-v2-app/index.html?v=${HOME_VER}`;
const HOME_FALLBACK_URL = `${BASE_PREFIX}home-v2/main-v2-app/index.html`;
const HOME_ALLOWED_ROUTES = new Set(["/", "/output", "/worklog", "/site", "/doc", "/request"]);

export default function HomePage() {
  const { isPartner } = useUserRole();
  const navigate = useNavigate();
  const [homeLoadFailed, setHomeLoadFailed] = useState(false);
  const [homeSrc, setHomeSrc] = useState(HOME_MAIN_URL);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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

  if (homeLoadFailed) {
    return <LegacyHomePage />;
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
        ref={iframeRef}
        title="INOPNC Home Main"
        src={homeSrc}
        className="block w-full border-0 bg-background"
        style={{ height: "calc(100dvh - var(--app-header-height, 114px))" }}
        onLoad={() => {
          window.setTimeout(() => {
            try {
              const doc = iframeRef.current?.contentDocument;
              const root = doc?.getElementById("root");
              const hasRendered = !!root && root.childElementCount > 0;
              if (hasRendered) return;
              if (homeSrc !== HOME_FALLBACK_URL) {
                setHomeSrc(HOME_FALLBACK_URL);
                return;
              }
              setHomeLoadFailed(true);
            } catch {
              if (homeSrc !== HOME_FALLBACK_URL) {
                setHomeSrc(HOME_FALLBACK_URL);
                return;
              }
              setHomeLoadFailed(true);
            }
          }, 1200);
        }}
        onError={() => {
          if (homeSrc !== HOME_FALLBACK_URL) {
            setHomeSrc(HOME_FALLBACK_URL);
            return;
          }
          setHomeLoadFailed(true);
        }}
      />
    </section>
  );
}
