import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import logoImg from "@/assets/logo_b.png";
import { toast } from "sonner";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { setTestMode, setTestRole } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Password strength
  const getStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = getStrength(password);
  const strengthLabel = strength === 0 ? '입력 필요' : strength === 1 ? '약함' : strength <= 3 ? '보통' : '강함';
  const strengthColor = strength === 0 ? 'bg-border' : strength === 1 ? 'bg-destructive' : strength <= 3 ? 'bg-amber-500' : 'bg-emerald-500';

  const handleLogin = async () => {
    if (!email || !password) { toast.error("이메일과 비밀번호를 입력하세요."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "이메일 또는 비밀번호가 올바르지 않습니다." : error.message);
    } else {
      toast.success("로그인 성공!");
      navigate("/");
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !affiliation) { toast.error("필수 항목을 모두 입력하세요."); return; }
    if (password.length < 8) { toast.error("비밀번호는 8자 이상이어야 합니다."); return; }
    if (password !== confirmPassword) { toast.error("비밀번호가 일치하지 않습니다."); return; }
    if (!agreeTerms) { toast.error("이용약관에 동의해주세요."); return; }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name, phone, affiliation },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("회원가입 완료! 이메일을 확인해주세요.");
      setIsLogin(true);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error("이메일을 입력하세요."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); }
    else { toast.success("비밀번호 재설정 링크가 이메일로 전송되었습니다."); setShowForgot(false); }
  };

  const handleTestMode = (role: "worker" | "admin" | "partner" = "worker", redirectTo = "/") => {
    setTestRole(role);
    setTestMode(true);
    navigate(redirectTo);
  };

  const handleSubmit = () => {
    if (showForgot) handleForgotPassword();
    else if (isLogin) handleLogin();
    else handleSignup();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-5">
      <div className="w-full max-w-app">
        <div className="bg-card rounded-xl shadow-md p-8 max-[640px]:p-6 w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-3 flex items-center justify-center gap-3 max-[640px]:gap-2 max-[420px]:gap-1.5">
              <img
                src={logoImg}
                alt="INOPNC 로고"
                className="h-auto w-[188px] max-[640px]:w-[138px] max-[420px]:w-[124px] shrink-0 object-contain"
              />
              <h1 className="whitespace-nowrap text-[26px] max-[640px]:text-[20px] max-[420px]:text-[18px] leading-none font-bold text-header-navy">
                {showForgot ? '비밀번호 찾기' : isLogin ? '로그인' : '회원가입'}
              </h1>
            </div>
            <p className="text-[14px] text-text-sub">
              {showForgot ? '가입한 이메일을 입력하세요' : isLogin ? '계정에 로그인하세요' : '필요한 정보를 입력하여 회원가입을 완료하세요'}
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Signup-only fields */}
            {!isLogin && !showForgot && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-semibold text-text-sub flex items-center gap-1">소속 <span className="text-destructive text-[16px]">*</span></label>
                  <select value={affiliation} onChange={e => setAffiliation(e.target.value)} className="h-12 max-[640px]:h-11 rounded-lg border border-border px-4 text-[16px] bg-card text-foreground appearance-none outline-none focus:border-primary bg-[length:16px] bg-[right_12px_center] bg-no-repeat" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")` }}>
                    <option value="">소속을 선택하세요</option>
                    <option value="worker_inopnc">작업자 (이노피앤씨)</option>
                    <option value="manager_inopnc">현장관리자 (이노피앤씨)</option>
                    <option value="partner_company">파트너사</option>
                  </select>
                </div>
                <div className="flex gap-3 max-[640px]:flex-col max-[640px]:gap-5">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[14px] font-semibold text-text-sub flex items-center gap-1">이름 <span className="text-destructive text-[16px]">*</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력하세요" className="h-12 max-[640px]:h-11 rounded-lg border border-border px-4 text-[16px] bg-card text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[14px] font-semibold text-text-sub flex items-center gap-1">연락처</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-1234-5678" className="h-12 max-[640px]:h-11 rounded-lg border border-border px-4 text-[16px] bg-card text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-text-sub flex items-center gap-1">이메일 <span className="text-destructive text-[16px]">*</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" className="h-12 max-[640px]:h-11 rounded-lg border border-border px-4 text-[16px] bg-card text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            </div>

            {/* Password (not shown in forgot mode) */}
            {!showForgot && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-text-sub flex items-center gap-1">비밀번호 <span className="text-destructive text-[16px]">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isLogin ? "비밀번호를 입력하세요" : "영문, 숫자, 특수문자 조합 8자 이상"}
                    className="w-full h-12 max-[640px]:h-11 rounded-lg border border-border px-4 pr-12 text-[16px] bg-card text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-muted-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isLogin && (
                  <>
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={cn("h-1 flex-1 rounded-sm transition-colors", i < strength ? strengthColor : "bg-border")} />
                      ))}
                    </div>
                    <span className="text-[12px] text-text-sub mt-1">비밀번호 강도: {strengthLabel}</span>
                  </>
                )}
                {isLogin && (
                  <button onClick={() => setShowForgot(true)} className="self-end text-[13px] text-primary bg-transparent border-none cursor-pointer hover:underline mt-1">비밀번호를 잊으셨나요?</button>
                )}
              </div>
            )}

            {/* Confirm password (signup only) */}
            {!isLogin && !showForgot && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-semibold text-text-sub flex items-center gap-1">비밀번호 확인 <span className="text-destructive text-[16px]">*</span></label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="비밀번호를 다시 입력하세요" className="w-full h-12 max-[640px]:h-11 rounded-lg border border-border px-4 pr-12 text-[16px] bg-card text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
                    <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-muted-foreground">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="w-[18px] h-[18px] accent-primary" />
                    <span className="text-[14px] max-[640px]:text-[13px] text-text-sub whitespace-nowrap">이용약관·개인정보 동의 <span className="text-destructive">*</span></span>
                  </label>
                </div>
              </>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-12 max-[640px]:h-11 bg-header-navy text-white rounded-lg border-none text-[16px] font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {showForgot ? '재설정 링크 전송' : isLogin ? '로그인' : '회원가입'}
            </button>

            {/* Toggle */}
            <div className="text-center mt-4 text-[14px] text-text-sub">
              {showForgot ? (
                <button onClick={() => setShowForgot(false)} className="text-primary font-semibold bg-transparent border-none cursor-pointer hover:underline">← 로그인으로 돌아가기</button>
              ) : isLogin ? (
                <>계정이 없으신가요? <button onClick={() => setIsLogin(false)} className="text-primary font-semibold bg-transparent border-none cursor-pointer hover:underline">회원가입하기</button></>
              ) : (
                <>이미 계정이 있으신가요? <button onClick={() => setIsLogin(true)} className="text-primary font-semibold bg-transparent border-none cursor-pointer hover:underline">로그인하기</button></>
              )}
            </div>

            {/* Test bypass */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handleTestMode("worker")}
                  className="flex-1 h-10 bg-transparent border border-primary text-primary rounded-lg text-[14px] font-semibold cursor-pointer transition-all hover:bg-primary/5"
                >
                  🔧 작업자
                </button>
                <button
                  onClick={() => handleTestMode("admin")}
                  className="flex-1 h-10 bg-transparent border border-header-navy text-header-navy rounded-lg text-[14px] font-semibold cursor-pointer transition-all hover:bg-header-navy/5"
                >
                  👔 관리자
                </button>
                <button
                  onClick={() => handleTestMode("partner")}
                  className="flex-1 h-10 bg-transparent border border-accent text-accent-foreground rounded-lg text-[14px] font-semibold cursor-pointer transition-all hover:bg-accent/10"
                >
                  🏢 파트너
                </button>
              </div>
              <button
                onClick={() => handleTestMode("admin", "/admin")}
                className="w-full h-10 bg-header-navy text-white rounded-lg text-[14px] font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                🏛️ 본사 관리자 콘솔
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


