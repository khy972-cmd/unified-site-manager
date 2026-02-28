import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ensureKakao, getKakaoConfig } from "@/lib/kakaoSdk";
import { toast } from "sonner";

const OFFLINE_TOAST_MESSAGE = "\uC624\uD504\uB77C\uC778\uC5D0\uC11C\uB294 \uCE74\uCE74\uC624 \uBB38\uC758 \uBD88\uAC00(\uC5F0\uACB0 \uC2DC \uC0AC\uC6A9)";
const DEFAULT_CHANNEL_URL = "https://pf.kakao.com/_xfgxdqX";
const DEFAULT_CHAT_URL = "https://pf.kakao.com/_xfgxdqX/chat";
const PAGE_TITLE = "\uBCF8\uC0AC\uC694\uCCAD";
const PAGE_DESCRIPTION = "카카오톡으로 본사 문의 (오프라인 사용 불가)";
const FOLLOW_BUTTON_LABEL = "\uCC44\uB110 \uCD94\uAC00(\uAC04\uD3B8)";
const CHAT_BUTTON_LABEL = "1:1 \uCC44\uD305";
const FOLLOW_SUCCESS_MESSAGE = "\uCC44\uB110 \uCD94\uAC00 \uC644\uB8CC";
const FOLLOW_FAIL_MESSAGE = "\uCC44\uB110 \uCD94\uAC00\uAC00 \uCDE8\uC18C\uB418\uC5C8\uAC70\uB098 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4";
const FOLLOW_ERROR_MESSAGE = "\uCC44\uB110 \uCD94\uAC00 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4";
const CHAT_MOVE_MESSAGE = "\uCE74\uCE74\uC624\uD1A1\uC73C\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4";

function openFallback(url: string) {
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    window.location.href = url;
  }
}

function getChatUrl(channelUrl?: string) {
  if (!channelUrl) return DEFAULT_CHAT_URL;
  return `${channelUrl.replace(/\/$/, "")}/chat`;
}

export default function RequestPage() {
  const { isOnline } = useNetworkStatus();
  const { channelPublicId, channelUrl } = getKakaoConfig();

  const handleOfflineClick = () => {
    if (!isOnline) {
      toast.warning(OFFLINE_TOAST_MESSAGE);
    }
  };

  const handleFollowChannel = async () => {
    if (!isOnline) {
      toast.warning(OFFLINE_TOAST_MESSAGE);
      return;
    }

    const fallbackUrl = channelUrl || DEFAULT_CHANNEL_URL;
    if (!channelPublicId) {
      openFallback(fallbackUrl);
      return;
    }

    const kakao = await ensureKakao();
    if (!kakao) {
      openFallback(fallbackUrl);
      return;
    }

    try {
      const response = await kakao.Channel.followChannel({ channelPublicId });

      if (response?.status === "success") {
        toast.success(FOLLOW_SUCCESS_MESSAGE);
        return;
      }

      toast.error(FOLLOW_FAIL_MESSAGE);
    } catch (error) {
      const errorMsg =
        typeof error === "object" &&
        error !== null &&
        "error_msg" in error &&
        typeof (error as { error_msg?: unknown }).error_msg === "string"
          ? (error as { error_msg: string }).error_msg
          : FOLLOW_ERROR_MESSAGE;

      toast.error(errorMsg);
      openFallback(fallbackUrl);
    }
  };

  const handleChat = async () => {
    if (!isOnline) {
      toast.warning(OFFLINE_TOAST_MESSAGE);
      return;
    }

    const fallbackChatUrl = getChatUrl(channelUrl);
    if (!channelPublicId) {
      openFallback(fallbackChatUrl);
      return;
    }

    const kakao = await ensureKakao();
    if (!kakao) {
      openFallback(fallbackChatUrl);
      return;
    }

    try {
      kakao.Channel.chat({ channelPublicId });
      toast.message(CHAT_MOVE_MESSAGE);
    } catch {
      openFallback(fallbackChatUrl);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mt-3 mb-2">
        <Card className="rounded-2xl shadow-soft mb-0">
          <CardHeader className="space-y-2 pb-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-phone-call text-header-navy"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path><path d="M14.05 2a9 9 0 0 1 8 7.94"></path></svg>
              <CardTitle className="text-xl font-bold text-header-navy">{PAGE_TITLE}</CardTitle>
            </div>
            <CardDescription className="text-base font-medium leading-relaxed text-text-sub">{PAGE_DESCRIPTION}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="w-full" onClick={handleOfflineClick}>
              <Button
                type="button"
                variant="outline"
                className="h-[50px] w-full text-base font-semibold border-[#FEE500] text-[#3C1E1E] bg-[#FEE500]/10 hover:bg-[#FEE500]/20 transition-all"
                disabled={!isOnline}
                onClick={handleFollowChannel}
              >
                {FOLLOW_BUTTON_LABEL}
              </Button>
            </div>

            <div className="w-full" onClick={handleOfflineClick}>
              <Button
                type="button"
                className="h-[50px] w-full text-base font-semibold bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FEE500]/90 transition-all shadow-sm"
                disabled={!isOnline}
                onClick={handleChat}
              >
                {CHAT_BUTTON_LABEL}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
