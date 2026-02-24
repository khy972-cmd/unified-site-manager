import PartnerHomePage from "@/components/partner/PartnerHomePage";
import { useUserRole } from "@/hooks/useUserRole";

const HOME_MAIN_URL = "/home-v2/main-v2-app/index.html?v=github-khy972-20260223";

export default function HomePage() {
  const { isPartner } = useUserRole();

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
