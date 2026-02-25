import { useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { toast } from "sonner";

interface AccountOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountOverlay({ isOpen, onClose }: AccountOverlayProps) {
  const [name, setName] = useState("이현수");
  const [phone, setPhone] = useState("010-1234-5678");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const handleSave = () => {
    toast.success("계정 정보가 저장되었습니다.");
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 left-0 right-0 mx-auto max-w-app bg-background z-[2000] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
        isOpen ? "translate-y-0 visible" : "translate-y-full invisible"
      }`}
    >
      {/* Header */}
      <div className="h-[60px] px-4 flex items-center justify-between bg-card border-b border-border shrink-0">
        <button onClick={onClose} className="bg-transparent border-none p-1">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <span className="text-lg-app font-bold text-foreground">계정 관리</span>
        <button onClick={handleSave} className="text-base-app font-bold text-primary bg-transparent border-none cursor-pointer">
          저장
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-6 overflow-y-auto">
        {/* Profile Photo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-[100px] h-[100px] rounded-full bg-border relative flex items-center justify-center text-[36px] font-bold text-muted-foreground border-4 border-card shadow-lg">
            <span>이</span>
            <button className="absolute bottom-0 right-0 w-[34px] h-[34px] rounded-full bg-header-navy text-white border-[3px] border-card flex items-center justify-center cursor-pointer z-10 shadow-md">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <section className="mb-8">
          <span className="text-sm-app font-bold text-text-sub block mb-3">기본 정보</span>
          <div className="mb-4">
            <label className="block text-base-app text-text-sub mb-1.5 font-bold">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-3.5 border border-border rounded-xl text-base-app text-foreground bg-[hsl(var(--bg-input))] font-medium outline-none transition-all focus:border-primary focus:shadow-input-focus"
            />
          </div>
          <div className="mb-4">
            <label className="block text-base-app text-text-sub mb-1.5 font-bold">이메일</label>
            <input
              type="email"
              value="manager@inopnc.com"
              disabled
              className="w-full h-12 px-3.5 border border-border rounded-xl text-base-app text-foreground bg-[hsl(var(--bg-input))] font-medium opacity-70"
            />
          </div>
          <div className="mb-4">
            <label className="block text-base-app text-text-sub mb-1.5 font-bold">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 px-3.5 border border-border rounded-xl text-base-app text-foreground bg-[hsl(var(--bg-input))] font-medium outline-none transition-all focus:border-primary focus:shadow-input-focus"
            />
          </div>
        </section>

        {/* Security */}
        <section className="mb-8">
          <span className="text-sm-app font-bold text-text-sub block mb-3">보안 설정</span>
          <div className="mb-4">
            <label className="block text-base-app text-text-sub mb-1.5 font-bold">비밀번호 변경</label>
            <input
              type="password"
              placeholder="새 비밀번호 입력"
              className="w-full h-12 px-3.5 border border-border rounded-xl text-base-app text-foreground bg-[hsl(var(--bg-input))] font-medium outline-none transition-all focus:border-primary focus:shadow-input-focus placeholder:text-muted-foreground"
            />
          </div>
        </section>

        {/* Notification Settings */}
        <section className="mb-8">
          <span className="text-sm-app font-bold text-text-sub block mb-3">알림 설정</span>
          <div className="flex justify-between items-center py-4 border-b border-border">
            <span className="text-base-app text-foreground">푸시 알림</span>
            <label className="relative inline-block w-12 h-[26px]">
              <input type="checkbox" checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} className="opacity-0 w-0 h-0 peer" />
              <span className="absolute cursor-pointer inset-0 bg-border rounded-full transition-colors peer-checked:bg-primary before:content-[''] before:absolute before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-transform peer-checked:before:translate-x-[22px]" />
            </label>
          </div>
          <div className="flex justify-between items-center py-4">
            <span className="text-base-app text-foreground">이메일 수신</span>
            <label className="relative inline-block w-12 h-[26px]">
              <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} className="opacity-0 w-0 h-0 peer" />
              <span className="absolute cursor-pointer inset-0 bg-border rounded-full transition-colors peer-checked:bg-primary before:content-[''] before:absolute before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-transform peer-checked:before:translate-x-[22px]" />
            </label>
          </div>
        </section>

        {/* Misc */}
        <section className="mb-8">
          <span className="text-sm-app font-bold text-text-sub block mb-3">기타</span>
          <div className="flex justify-between mb-5">
            <span className="text-sm-app text-text-sub">앱 버전</span>
            <span className="text-sm-app text-foreground font-semibold">v1.2.0</span>
          </div>
          <button
            onClick={() => alert("회원 탈퇴")}
            className="text-destructive text-sm-app font-bold bg-transparent border-none p-0 cursor-pointer underline"
          >
            회원 탈퇴
          </button>
        </section>
      </div>
    </div>
  );
}
