import PartnerHomePage from "@/components/partner/PartnerHomePage";
import { useUserRole } from "@/hooks/useUserRole";

const HOME_MAIN_URL = "/home-v2/main-v2-app/index.html?v=github-khy972-20260223";

export default function HomePage() {
  const { isPartner } = useUserRole();

  if (isPartner) {
    return <PartnerHomePage />;
  }

  return (
    <section className="-mx-4 -mt-2 -mb-6">
      <iframe
        title="INOPNC Home Main"
        src={HOME_MAIN_URL}
        className="block h-[calc(100dvh-114px)] w-full border-0 bg-background"
      />
    </section>
  );
}
