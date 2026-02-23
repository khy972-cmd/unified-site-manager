import { Building2, ChevronRight } from "lucide-react";

export default function RequestPage() {
  return (
    <div className="animate-fade-in">
      <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg-app font-[800] text-header-navy mb-2">본사요청</h2>
        <p className="text-sm-app text-text-sub font-medium leading-relaxed">
          본사요청 기능은 준비 중입니다.<br />
          곧 이용하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
